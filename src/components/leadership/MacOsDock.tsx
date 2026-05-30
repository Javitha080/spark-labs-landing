import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Folder, Image as ImageIcon, FileText, Trash2, Globe, GraduationCap, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

interface DockApp {
  id: string;
  name: string;
  icon: React.ReactNode;
  onClick: () => void;
  isActive?: boolean;
  isMinimized?: boolean;
}

interface MacOsDockProps {
  openApps: { id: string; name: string; type: "finder" | "preview" | "textedit"; isMinimized: boolean }[];
  onRestoreApp: (id: string) => void;
  onOpenFinder: () => void;
  activeAppId: string | null;
}

export const MacOsDock = ({ openApps, onRestoreApp, onOpenFinder, activeAppId }: MacOsDockProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const navigate = useNavigate();
  
  const dockItemsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Standard System Apps
  const systemApps = [
    {
      id: "finder",
      name: "Finder",
      icon: (
        <div className="size-full flex items-center justify-center bg-gradient-to-b from-[#7ECDFE] to-[#2680F3] rounded-2xl relative shadow-md">
          {/* Smiley Finder Face */}
          <svg className="size-8 text-white filter drop-shadow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 0 0-10 10c0 5.523 4.477 10 10 10s10-4.477 10-10A10 10 0 0 0 12 2z" fill="rgba(255,255,255,0.15)" />
            <path d="M12 2v20" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H7" />
          </svg>
          <div className="absolute bottom-1.5 size-1.5 rounded-full bg-white/70" />
        </div>
      ),
      onClick: onOpenFinder,
      isActive: true
    },
    {
      id: "safari",
      name: "Safari — Home",
      icon: (
        <div className="size-full flex items-center justify-center bg-gradient-to-b from-[#4FC3F7] to-[#0288D1] rounded-2xl relative shadow-md overflow-hidden">
          <Compass className="size-7 text-white" />
          <div className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-red-400" />
        </div>
      ),
      onClick: () => navigate("/"),
      isActive: false
    },
    {
      id: "preview",
      name: "Preview",
      icon: (
        <div className="size-full flex items-center justify-center bg-gradient-to-b from-[#8BDD39] to-[#48991D] rounded-2xl relative shadow-md">
          <ImageIcon className="size-7 text-white" />
        </div>
      ),
      onClick: () => {
        const previewApp = openApps.find(app => app.type === "preview" && app.isMinimized);
        if (previewApp) onRestoreApp(previewApp.id);
      },
      isActive: openApps.some(app => app.type === "preview")
    },
    {
      id: "textedit",
      name: "TextEdit",
      icon: (
        <div className="size-full flex items-center justify-center bg-gradient-to-b from-[#FCDE64] to-[#F1AC17] rounded-2xl relative shadow-md">
          <FileText className="size-7 text-white" />
        </div>
      ),
      onClick: () => {
        const textApp = openApps.find(app => app.type === "textedit" && app.isMinimized);
        if (textApp) onRestoreApp(textApp.id);
      },
      isActive: openApps.some(app => app.type === "textedit")
    },
    {
      id: "appstore",
      name: "Learning Hub",
      icon: (
        <div className="size-full flex items-center justify-center bg-gradient-to-b from-[#AB47BC] to-[#7B1FA2] rounded-2xl relative shadow-md">
          <GraduationCap className="size-7 text-white" />
        </div>
      ),
      onClick: () => navigate("/learning-hub"),
      isActive: false
    },
  ];

  const minimizedApps = openApps.filter(app => app.isMinimized);
  const totalItems = systemApps.length + minimizedApps.length + 1; // +1 for Trash

  // Update dockItemsRef length
  if (dockItemsRef.current.length !== totalItems) {
    dockItemsRef.current = Array(totalItems).fill(null);
  }

  const getScale = (index: number) => {
    if (hoveredIndex === null) return 1;
    const distance = Math.abs(index - hoveredIndex);
    if (distance === 0) return 1.35;
    if (distance === 1) return 1.18;
    if (distance === 2) return 1.06;
    return 1;
  };

  const getMarginY = (index: number) => {
    if (hoveredIndex === null) return 0;
    const distance = Math.abs(index - hoveredIndex);
    if (distance === 0) return -14;
    if (distance === 1) return -7;
    if (distance === 2) return -2;
    return 0;
  };

  // GSAP animation for hover states
  useGSAP(() => {
    dockItemsRef.current.forEach((el, idx) => {
      if (el) {
        gsap.to(el, {
          scale: getScale(idx),
          y: getMarginY(idx),
          duration: 0.2,
          ease: "back.out(1.5)"
        });
      }
    });
  }, [hoveredIndex]);

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    gsap.to(e.currentTarget, { scale: 0.9, duration: 0.1 });
  };
  
  const handleMouseUp = (e: React.MouseEvent<HTMLButtonElement>) => {
    gsap.to(e.currentTarget, { scale: 1, duration: 0.2 });
  };

  return (
    <div className="fixed bottom-3 inset-x-0 flex justify-center z-50 pointer-events-none select-none">
      <div 
        className="flex items-end px-4 py-2.5 bg-black/15 backdrop-blur-3xl border border-white/10 rounded-[1.8rem] shadow-2xl relative pointer-events-auto max-w-[90%] overflow-visible gap-2.5"
        style={{
          boxShadow: "0 20px 50px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.2)"
        }}
      >
        {/* System Apps */}
        {systemApps.map((app, index) => {
          const hasOpenInstance = openApps.some(oa => oa.type === app.id);
          return (
            <div
              key={app.id}
              ref={el => { dockItemsRef.current[index] = el; }}
              className="flex flex-col items-center relative group"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => app.onClick()}
              style={{ position: "relative" }}
            >
              <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-all duration-200 bg-black/80 backdrop-blur-md text-[10px] text-white px-2.5 py-1 rounded-md border border-white/10 shadow-lg pointer-events-none whitespace-nowrap z-50">
                {app.name}
              </div>

              <button
                className="size-12 rounded-2xl flex items-center justify-center relative cursor-pointer transition-colors overflow-visible"
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {app.icon}
              </button>

              {hasOpenInstance && (
                <div className="absolute -bottom-1 size-1 rounded-full bg-white/80" />
              )}
            </div>
          );
        })}

        {/* Separator line if there are minimized apps */}
        {minimizedApps.length > 0 && (
          <div className="h-10 w-px bg-white/30 mx-1 shrink-0 self-center" />
        )}

        {/* Minimized / Active Window Previews in Dock */}
        <div className="flex items-end gap-2.5">
          {minimizedApps.map((app, index) => {
            const idx = systemApps.length + index;
            return (
              <div
                key={app.id}
                ref={el => { dockItemsRef.current[idx] = el; }}
                className="flex flex-col items-center relative group"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => onRestoreApp(app.id)}
                style={{ position: "relative" }}
              >
                <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-all duration-200 bg-black/80 backdrop-blur-md text-[10px] text-white px-2.5 py-1 rounded-md border border-white/10 shadow-lg pointer-events-none whitespace-nowrap z-50">
                  {app.name} (minimized)
                </div>

                <button
                  className="size-12 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white cursor-pointer select-none"
                  onMouseDown={handleMouseDown}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  {app.type === "finder" && <Folder className="size-6 text-blue-300" />}
                  {app.type === "preview" && <ImageIcon className="size-6 text-green-300" />}
                  {app.type === "textedit" && <FileText className="size-6 text-yellow-300" />}
                </button>
                <div className="absolute -bottom-1 size-1 rounded-full bg-white/50" />
              </div>
            );
          })}
        </div>

        {/* Trash Can */}
        <div 
          ref={el => { dockItemsRef.current[systemApps.length + minimizedApps.length] = el; }}
          className="flex flex-col items-center relative group ml-2"
          onMouseEnter={() => setHoveredIndex(systemApps.length + minimizedApps.length)}
          onMouseLeave={() => setHoveredIndex(null)}
          style={{ position: "relative" }}
        >
          <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-all duration-200 bg-black/80 backdrop-blur-md text-[10px] text-white px-2.5 py-1 rounded-md border border-white/10 shadow-lg pointer-events-none whitespace-nowrap z-50">
            Trash
          </div>
          <button
            className="size-12 rounded-2xl flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={() => {
              const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc.type = "sine";
              osc.frequency.setValueAtTime(150, audioCtx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.3);
              gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
              osc.connect(gain);
              gain.connect(audioCtx.destination);
              osc.start();
              osc.stop(audioCtx.currentTime + 0.3);
            }}
          >
            <Trash2 className="size-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
