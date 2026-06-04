import { useCallback, useMemo, useState } from "react";

/**
 * useSafeSearch — sanitizes, length-caps, and normalizes search input.
 *
 * Returns:
 *  - raw:        the literal value bound to the <input> (so users see what they type)
 *  - sanitized:  the cleaned version safe for filtering, URL params, and DB queries
 *  - setRaw:     onChange handler accepting either a string or a ChangeEvent
 *  - reset:      clears the input
 *  - encoded:    URL-encoded sanitized value (handy for ?q= params)
 */

export interface UseSafeSearchOptions {
  /** Max characters after sanitization. Default 100. */
  maxLength?: number;
  /** Collapse runs of whitespace into a single space. Default true. */
  collapseWhitespace?: boolean;
  /** Lowercase the sanitized value (useful for case-insensitive matches). Default false. */
  lowercase?: boolean;
}

// Characters we never want in a search query — HTML/script delimiters,
// SQL wildcards from URL contexts, and control chars.
// eslint-disable-next-line no-control-regex
const CONTROL_AND_DANGEROUS = /[\x00-\x1F\x7F<>"'`\\;]/g;

export function sanitizeSearch(value: string, opts: UseSafeSearchOptions = {}): string {
  const { maxLength = 100, collapseWhitespace = true, lowercase = false } = opts;
  if (typeof value !== "string") return "";
  let v = value.normalize("NFKC").replace(CONTROL_AND_DANGEROUS, "");
  if (collapseWhitespace) v = v.replace(/\s+/g, " ");
  v = v.trim();
  if (v.length > maxLength) v = v.slice(0, maxLength);
  if (lowercase) v = v.toLowerCase();
  return v;
}

export function safeEncodeSearch(value: string, opts?: UseSafeSearchOptions): string {
  return encodeURIComponent(sanitizeSearch(value, opts));
}

type ChangeLike = { target: { value: string } } | string;

export function useSafeSearch(initial = "", opts: UseSafeSearchOptions = {}) {
  const [raw, setRawState] = useState<string>(() => {
    // Cap raw too, to prevent huge paste-bombs from re-rendering forever.
    const maxRaw = (opts.maxLength ?? 100) + 50;
    return initial.length > maxRaw ? initial.slice(0, maxRaw) : initial;
  });

  const setRaw = useCallback(
    (next: ChangeLike) => {
      const nextValue = typeof next === "string" ? next : next?.target?.value ?? "";
      const maxRaw = (opts.maxLength ?? 100) + 50;
      setRawState(nextValue.length > maxRaw ? nextValue.slice(0, maxRaw) : nextValue);
    },
    [opts.maxLength]
  );

  const sanitized = useMemo(() => sanitizeSearch(raw, opts), [raw, opts]);
  const encoded = useMemo(() => encodeURIComponent(sanitized), [sanitized]);
  const reset = useCallback(() => setRawState(""), []);

  return { raw, sanitized, encoded, setRaw, reset };
}
