import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { m, AnimatePresence } from "framer-motion";
import { Folder, Image as ImageIcon, FileText, Trash2, Globe, GraduationCap, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

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
          {/* Safari compass needle accent */}
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
        // Find first minimized preview and restore
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

  const handleAppClick = (app: typeof systemApps[0]) => {
    app.onClick();
  };

  // Fisheye scale calculation based on hovered index — enhanced curve
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
          const scale = getScale(index);
          const marginY = getMarginY(index);
          const hasOpenInstance = openApps.some(oa => oa.type === app.id);
          const isMin = openApps.some(oa => oa.type === app.id && oa.isMinimized);

          return (
            <m.div
              key={app.id}
              className="flex flex-col items-center relative group"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => handleAppClick(app)}
              style={{ position: "relative" }}
              animate={{
                scale,
                y: marginY,
              }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 25,
              }}
            >
              {/* App Tooltip */}
              <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-all duration-200 bg-black/80 backdrop-blur-md text-[10px] text-white px-2.5 py-1 rounded-md border border-white/10 shadow-lg pointer-events-none whitespace-nowrap z-50">
                {app.name}
              </div>

              {/* App Icon Container */}
              <m.button
                className={cn(
                  "size-12 rounded-2xl flex items-center justify-center relative cursor-pointer active:brightness-90 transition-all duration-150 overflow-visible"
                )}
                whileTap={{ scale: 0.9 }}
              >
                {app.icon}
              </m.button>

              {/* App Active Indicator Dot */}
              {hasOpenInstance && (
                <div className="absolute -bottom-1 size-1 rounded-full bg-white/80" />
              )}
            </m.div>
          );
        })}

        {/* Separator line if there are minimized apps */}
        <AnimatePresence>
          {openApps.some(app => app.isMinimized) && (
            <m.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 1, opacity: 0.3 }}
              exit={{ width: 0, opacity: 0 }}
              className="h-10 w-px bg-white mx-1 shrink-0 self-center"
            />
          )}
        </AnimatePresence>

        {/* Minimized / Active Window Previews in Dock */}
        <div className="flex items-end gap-2.5">
          <AnimatePresence>
            {openApps
              .filter(app => app.isMinimized)
              .map((app, index) => {
                const totalSysApps = systemApps.length;
                const idx = totalSysApps + index;
                const scale = getScale(idx);
                const marginY = getMarginY(idx);

                return (
                  <m.div
                    key={app.id}
                    initial={{ scale: 0, opacity: 0, width: 0 }}
                    className="flex flex-col items-center relative group"
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onClick={() => onRestoreApp(app.id)}
                    style={{ position: "relative" }}
                    animate={{
                      scale: scale,
                      y: marginY,
                      opacity: 1,
                      width: "auto"
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 25,
                    }}
                  >
                    <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-all duration-200 bg-black/80 backdrop-blur-md text-[10px] text-white px-2.5 py-1 rounded-md border border-white/10 shadow-lg pointer-events-none whitespace-nowrap z-50">
                      {app.name} (minimized)
                    </div>

                    <m.button
                      className="size-12 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white cursor-pointer select-none"
                      whileTap={{ scale: 0.9 }}
                    >
                      {app.type === "finder" && <Folder className="size-6 text-blue-300" />}
                      {app.type === "preview" && <ImageIcon className="size-6 text-green-300" />}
                      {app.type === "textedit" && <FileText className="size-6 text-yellow-300" />}
                    </m.button>

                    <div className="absolute -bottom-1 size-1 rounded-full bg-white/50" />
                  </m.div>
                );
              })}
          </AnimatePresence>
        </div>

        {/* Trash Can */}
        <m.div 
          className="flex flex-col items-center relative group"
          onMouseEnter={() => setHoveredIndex(systemApps.length + openApps.filter(app => app.isMinimized).length)}
          onMouseLeave={() => setHoveredIndex(null)}
          style={{ position: "relative" }}
          animate={{
            scale: getScale(systemApps.length + openApps.filter(app => app.isMinimized).length),
            y: getMarginY(systemApps.length + openApps.filter(app => app.isMinimized).length),
          }}
        >
          <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-all duration-200 bg-black/80 backdrop-blur-md text-[10px] text-white px-2.5 py-1 rounded-md border border-white/10 shadow-lg pointer-events-none whitespace-nowrap z-50">
            Trash
          </div>
          <m.button
            className="size-12 rounded-2xl flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              // Empty trash sound / effect
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
          </m.button>
        </m.div>
      </div>
    </div>
  );
};
