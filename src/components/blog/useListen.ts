import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

export type ListenStatus = "idle" | "playing" | "paused";

export interface ListenApi {
  supported: boolean;
  status: ListenStatus;
  rate: number;
  index: number;
  total: number;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  stop: () => void;
  setRate: (r: number) => void;
}

const BLOCKS = ":scope > p, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > ul, :scope > ol, :scope > blockquote";

/**
 * Listen mode: reads the article aloud with the browser's Web Speech API,
 * paragraph by paragraph, highlighting and scrolling to the block being read.
 * Zero dependencies, works offline on most devices.
 */
export function useListen(proseRef: RefObject<HTMLElement | null>): ListenApi {
  // A static browser capability - probe it once, never update it later.
  const [supported] = useState(
    () => typeof window !== "undefined" && "speechSynthesis" in window,
  );
  const [status, setStatus] = useState<ListenStatus>("idle");
  const [rate, setRateState] = useState(1);
  const [index, setIndex] = useState(0);
  const [total, setTotal] = useState(0);

  const statusRef = useRef<ListenStatus>("idle");
  const indexRef = useRef(0);
  const rateRef = useRef(1);
  const blocksRef = useRef<HTMLElement[]>([]);

  // Stable pointer to the current speak() so queued utterances can recurse
  // without holding a reference into their own initialiser.
  const speakRef = useRef<(i: number) => void>(() => {});
  // Spoken text can finish after the reader leaves the page; cancel then.
  const unmountRef = useRef(false);

  useEffect(() => {
    const mark = (i: number | null) => {
      blocksRef.current.forEach((b, k) => b.classList.toggle("is-speaking", k === i));
    };

    const speak = (i: number) => {
      if (unmountRef.current) return;
      const synth = window.speechSynthesis;
      const blocks = blocksRef.current;
      if (i < 0 || i >= blocks.length) {
        synth.cancel();
        mark(null);
        statusRef.current = "idle";
        setStatus("idle");
        indexRef.current = 0;
        setIndex(0);
        return;
      }
      synth.cancel();
      indexRef.current = i;
      setIndex(i);
      mark(i);
      const el = blocks[i];
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      if (!text) {
        speak(i + 1);
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      u.rate = rateRef.current;
      const voices = synth.getVoices();
      const voice =
        voices.find((v) => v.lang.toLowerCase().startsWith("en") && v.localService) ??
        voices.find((v) => v.lang.toLowerCase().startsWith("en"));
      if (voice) u.voice = voice;
      u.onend = () => {
        if (statusRef.current === "playing" && indexRef.current === i) speakRef.current(i + 1);
      };
      u.onerror = (e) => {
        if (e.error !== "interrupted" && e.error !== "canceled") {
          statusRef.current = "idle";
          setStatus("idle");
        }
      };
      synth.speak(u);
    };

    speakRef.current = speak;

    return () => {
      unmountRef.current = true;
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const collect = () => {
    const root = proseRef.current;
    blocksRef.current = root ? (Array.from(root.querySelectorAll(BLOCKS)) as HTMLElement[]) : [];
    setTotal(blocksRef.current.length);
  };

  const toggle = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    let start = 0;
    const root = proseRef.current;
    if (statusRef.current === "playing") {
      synth.pause();
      statusRef.current = "paused";
      setStatus("paused");
    } else if (statusRef.current === "paused") {
      synth.resume();
      statusRef.current = "playing";
      setStatus("playing");
    } else {
      // Start from the first block that is on screen.
      if (root) {
        blocksRef.current = Array.from(root.querySelectorAll(BLOCKS)) as HTMLElement[];
        setTotal(blocksRef.current.length);
        const visible = blocksRef.current.findIndex((b) => b.getBoundingClientRect().bottom > 120);
        start = Math.max(0, visible);
      }
      statusRef.current = "playing";
      setStatus("playing");
      speakRef.current(start);
    }
  }, [proseRef]);

  const stop = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    blocksRef.current.forEach((b) => b.classList.remove("is-speaking"));
    statusRef.current = "idle";
    setStatus("idle");
  }, []);

  const jump = useCallback((delta: number) => {
    if (statusRef.current === "idle") return;
    statusRef.current = "playing";
    setStatus("playing");
    speakRef.current(indexRef.current + delta);
  }, []);

  const setRate = useCallback((r: number) => {
    rateRef.current = r;
    setRateState(r);
    if (statusRef.current === "playing") speakRef.current(indexRef.current);
  }, []);

  return {
    supported,
    status,
    rate,
    index,
    total,
    toggle,
    next: () => jump(1),
    prev: () => jump(-1),
    stop,
    setRate,
  };
}
