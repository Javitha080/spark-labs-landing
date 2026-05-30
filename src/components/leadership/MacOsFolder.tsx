import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Draggable } from "gsap/Draggable";
import { cn } from "@/lib/utils";

// Register GSAP plugins
gsap.registerPlugin(useGSAP, Draggable);

interface MacOsFolderProps {
  id: string;
  name: string;
  department?: string | null;
  imageUrl?: string | null;
  onClick: () => void;
  defaultPosition?: { x: number; y: number };
  isSelected?: boolean;
  onSelect?: () => void;
}

const deptColors: Record<string, string> = {
  Robotics: "#F97316",
  IoT: "#3B82F6",
  Software: "#8B5CF6",
  Operations: "#EC4899",
  "Solar Energy": "#EAB308",
};

export const MacOsFolder = ({
  id,
  name,
  department,
  imageUrl,
  onClick,
  defaultPosition = { x: 0, y: 0 },
  isSelected = false,
  onSelect
}: MacOsFolderProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const deptColor = deptColors[department || ""] || null;

  // Close folder selection on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (onSelect && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        // Toggle selection off handled by parent
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [onSelect]);

  useGSAP(() => {
    if (!containerRef.current) return;

    // Set initial position
    gsap.set(containerRef.current, {
      x: defaultPosition.x,
      y: defaultPosition.y
    });

    Draggable.create(containerRef.current, {
      type: "x,y",
      bounds: ".macos-desktop",
      edgeResistance: 0.85,
      zIndexBoost: false,
      onPress: () => {
        if (onSelect) onSelect();
      },
      onClick: () => {
        // Play clean desktop folder open audio click
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(340, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + 0.1);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.1);
        } catch {}
        
        onClick();
      }
    });
  }, [defaultPosition]);

  // Hover and Tap animations using GSAP
  const handleMouseEnter = () => {
    if (!containerRef.current) return;
    gsap.to(containerRef.current, { scale: 1.05, duration: 0.2, ease: "power2.out" });
  };

  const handleMouseLeave = () => {
    if (!containerRef.current) return;
    gsap.to(containerRef.current, { scale: 1, duration: 0.2, ease: "power2.out" });
  };

  const handleMouseDown = () => {
    if (!containerRef.current) return;
    gsap.to(containerRef.current, { scale: 0.96, duration: 0.1, ease: "power2.inOut" });
  };

  const handleMouseUp = () => {
    if (!containerRef.current) return;
    gsap.to(containerRef.current, { scale: 1.05, duration: 0.2, ease: "power2.out" });
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      className="absolute flex flex-col items-center justify-center w-24 cursor-default group select-none z-10 py-1 top-0 left-0"
    >
      {/* Folder Icon Section */}
      <div className="relative w-16 h-16 flex items-center justify-center mb-1.5 drop-shadow-md group-hover:drop-shadow-lg transition-all">
        {/* Customized high-quality macOS Sonoma style blue folder */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-full h-full">
          {/* Back flap */}
          <path d="M10,20 L35,20 L45,30 L90,30 C95,30 100,35 100,40 L100,85 C100,90 95,95 90,95 L10,95 C5,95 0,90 0,85 L0,30 C0,25 5,20 10,20 Z" fill="#7ECDFE" opacity="0.9" />
          {/* Paper sheet inside — with avatar if available */}
          {imageUrl ? (
            <foreignObject x="15" y="33" width="70" height="42" clipPath="url(#clipRect)">
              <img
                src={imageUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "2px" }}
              />
            </foreignObject>
          ) : (
            <path d="M15,35 L85,35 L85,75 L15,75 Z" fill="#FFFFFF" opacity="0.8" />
          )}
          {/* Front flap */}
          <path d="M10,32 L40,32 L50,42 L90,42 C95,42 100,47 100,52 L100,85 C100,90 95,95 90,95 L10,95 C5,95 0,90 0,85 L0,42 C0,37 5,32 10,32 Z" fill="#2680F3" opacity="0.95" />
          {/* Department color accent stripe on front flap */}
          {deptColor && (
            <rect x="0" y="90" width="100" height="5" rx="3" fill={deptColor} opacity="0.9" />
          )}
          {/* Clip path for image */}
          <defs>
            <clipPath id="clipRect">
              <rect x="15" y="33" width="70" height="42" rx="2" />
            </clipPath>
          </defs>
        </svg>
      </div>

      {/* Selected highlighted Folder name label */}
      <span 
        className={cn(
          "text-[11px] font-bold text-center px-2 py-0.5 rounded-[5px] line-clamp-2 max-w-[90px] leading-tight select-none transition-colors border border-transparent",
          isSelected 
            ? "bg-[#007AFF] text-white border-[#007AFF] shadow-sm" 
            : "text-white hover:bg-white/10 group-hover:border-white/5"
        )}
        style={{ 
          textShadow: isSelected ? "none" : "0 1px 2px rgba(0,0,0,0.8)",
        }}
      >
        {name}
      </span>
    </div>
  );
};
