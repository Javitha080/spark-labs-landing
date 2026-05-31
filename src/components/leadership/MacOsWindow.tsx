import { useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Draggable } from "gsap/Draggable";
import { X, Minus, Maximize2, ChevronLeft, ChevronRight, LayoutGrid, List, Folder, FileText, Image as ImageIcon, Globe, Github, Linkedin, Twitter, Calendar, Type, ListTodo, Table, Mic, Paperclip, PenTool, Share, MoreHorizontal, MessageSquare } from "lucide-react";
import OptimizedImage from "@/components/ui/OptimizedImage";
import LiquidGlass from "@/components/ui/LiquidGlass";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  description: string | null;
  image_url: string | null;
  tagline: string | null;
  department: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  twitter_url: string | null;
  website_url: string | null;
  tenure_start: string | null;
  tenure_end: string | null;
  email: string | null;
  display_order?: number;
}

interface MacOsWindowProps {
  id: string;
  type: "finder" | "preview" | "textedit";
  member: TeamMember;
  onClose: () => void;
  onMinimize: () => void;
  onMaximizeToggle: () => void;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  onClick: () => void;
  onOpenFile: (fileType: "photo" | "bio") => void;
}

// Department color map for accents
const deptColors: Record<string, string> = {
  Robotics: "#F97316",
  IoT: "#3B82F6",
  Software: "#8B5CF6",
  Operations: "#EC4899",
  "Solar Energy": "#EAB308",
};

const getDeptColor = (dept: string | null) => deptColors[dept || ""] || "#6B7280";

export const MacOsWindow = ({
  id,
  type,
  member,
  onClose,
  onMinimize,
  onMaximizeToggle,
  isMinimized,
  isMaximized,
  zIndex,
  onClick,
  onOpenFile
}: MacOsWindowProps) => {
  const windowRef = useRef<HTMLDivElement>(null);
  const titleBarRef = useRef<HTMLDivElement>(null);
  const [finderViewMode, setFinderViewMode] = useState<"grid" | "list">("grid");
  const { theme } = useTheme();

  const isLight = theme === "light";
  const deptColor = getDeptColor(member.department);

  const getInitialDimensions = () => {
    const offset = (id.charCodeAt(0) % 5) * 30;
    let w = 500, h = 450;
    if (type === "finder") { w = 680; h = 450; }
    else if (type === "preview") { w = 500; h = 500; }
    else if (type === "textedit") { w = 500; h = 520; }
    
    // Clamp to window size for mobile responsiveness
    w = Math.min(w, window.innerWidth - 32);
    h = Math.min(h, window.innerHeight - 100);
    
    // Initial center positioning relative to top: 0, left: 0
    const isMobile = window.innerWidth < 640;
    const x = Math.max(16, (window.innerWidth - w) / 2) + (isMobile ? 0 : offset - 60);
    const y = Math.max(40, (window.innerHeight - h) / 2) + (isMobile ? 0 : offset - 60);
    return { w, h, x, y };
  };

  const dim = getInitialDimensions();

  // Handle window focus on click
  const handleMouseDown = () => {
    onClick();
  };

  // Use contextSafe for event handlers to prevent memory leaks
  const { contextSafe } = useGSAP();

  useGSAP(() => {
    if (!windowRef.current) return;

    // Set initial configuration
    gsap.set(windowRef.current, {
      x: dim.x,
      y: dim.y,
      width: dim.w,
      height: dim.h,
      borderRadius: 16
    });

    // Initialize Draggable
    Draggable.create(windowRef.current, {
      type: "x,y",
      bounds: ".macos-desktop",
      edgeResistance: 0.85,
      trigger: titleBarRef.current,
      onPress: () => {
        onClick();
      },
      onDragStart: () => {
        gsap.to(windowRef.current, { scale: 1.02, boxShadow: "0 40px 80px -15px rgba(0,0,0,0.6)", duration: 0.3, ease: "power2.out" });
      },
      onDragEnd: () => {
        gsap.to(windowRef.current, { scale: 1, boxShadow: "0 25px 60px -15px rgba(0,0,0,0.45)", duration: 0.3, ease: "power2.out" });
      }
    });

    // Pop-in entrance animation
    gsap.from(windowRef.current, {
      scale: 0.8,
      opacity: 0,
      duration: 0.4,
      ease: "back.out(1.2)"
    });
  }, []);

  // Maximize / Restore animation
  useGSAP(() => {
    if (!windowRef.current) return;
    
    if (isMinimized) return; // Ignore if it's currently minimized

    const dragInstance = Draggable.get(windowRef.current);

    if (isMaximized) {
      if (dragInstance) dragInstance.disable();
      
      gsap.to(windowRef.current, {
        x: 0,
        y: 28, // Just below menu bar
        width: window.innerWidth,
        height: window.innerHeight - 28,
        borderRadius: 0,
        duration: 0.5,
        ease: "power3.inOut"
      });
    } else {
      if (dragInstance) dragInstance.enable();
      
      gsap.to(windowRef.current, {
        x: dragInstance ? dragInstance.x : dim.x,
        y: dragInstance ? dragInstance.y : dim.y,
        width: dim.w,
        height: dim.h,
        borderRadius: 16,
        duration: 0.5,
        ease: "power3.inOut"
      });
    }
  }, [isMaximized]);

  // Genie Minimize and Restore GSAP animation
  useGSAP(() => {
    if (!windowRef.current) return;

    if (isMinimized) {
      // Genie animation down to the bottom center (Dock)
      gsap.to(windowRef.current, {
        scale: 0.05,
        opacity: 0,
        y: window.innerHeight, // Sucks down to the bottom of the screen
        x: window.innerWidth / 2, // Centered to dock
        skewX: 20,
        duration: 0.5,
        ease: "power2.inOut",
        onComplete: () => {
          if (windowRef.current) windowRef.current.style.pointerEvents = "none";
        }
      });
    } else {
      // Genie Restore animation from Dock
      if (windowRef.current) windowRef.current.style.pointerEvents = "auto";
      
      const dragInstance = Draggable.get(windowRef.current);
      let targetX = dragInstance ? dragInstance.x : dim.x;
      let targetY = dragInstance ? dragInstance.y : dim.y;
      
      if (isMaximized) {
        targetX = 0;
        targetY = 28;
      }

      gsap.to(windowRef.current, {
        scale: 1,
        opacity: 1,
        x: targetX,
        y: targetY,
        skewX: 0,
        duration: 0.5,
        ease: "power2.out"
      });
    }
  }, [isMinimized]);

  // Play close scale animation (context safe)
  const handleCloseClick = contextSafe((e: React.MouseEvent) => {
    e.stopPropagation();
    playClickSound("close");
    if (!windowRef.current) return;
    gsap.to(windowRef.current, {
      scale: 0.8,
      opacity: 0,
      duration: 0.2,
      ease: "power2.in",
      onComplete: onClose
    });
  });

  // App sound system triggers
  const playClickSound = (type: "open" | "close" | "action" | "maximize" | "minimize" = "action") => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {});
      }
      
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      let freq1 = 600, freq2 = 600, dur = 0.08, typeWave = "sine" as OscillatorType;
      
      if (type === "open") {
        freq1 = 400; freq2 = 800; dur = 0.15; typeWave = "sine";
      } else if (type === "close") {
        freq1 = 800; freq2 = 300; dur = 0.15; typeWave = "sine";
      } else if (type === "maximize") {
        freq1 = 300; freq2 = 600; dur = 0.2; typeWave = "triangle";
      } else if (type === "minimize") {
        freq1 = 600; freq2 = 300; dur = 0.2; typeWave = "triangle";
      }

      osc.type = typeWave;
      osc.frequency.setValueAtTime(freq1, now);
      osc.frequency.exponentialRampToValueAtTime(freq2, now + dur);
      
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + dur);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + dur);
    } catch {}
  };

  // Format tenure display
  const formatTenure = () => {
    if (!member.tenure_start) return null;
    const start = new Date(member.tenure_start).toLocaleDateString("en-US", { month: "short", year: "numeric" });
    const end = member.tenure_end
      ? new Date(member.tenure_end).toLocaleDateString("en-US", { month: "short", year: "numeric" })
      : "Present";
    return `${start} — ${end}`;
  };

  // Social links for TextEdit
  const socialLinks = [
    member.linkedin_url && { label: "LinkedIn", url: member.linkedin_url, icon: <Linkedin className="size-3" /> },
    member.github_url && { label: "GitHub", url: member.github_url, icon: <Github className="size-3" /> },
    member.twitter_url && { label: "Twitter / X", url: member.twitter_url, icon: <Twitter className="size-3" /> },
    member.website_url && { label: "Website", url: member.website_url, icon: <Globe className="size-3" /> },
  ].filter(Boolean) as { label: string; url: string; icon: React.ReactNode }[];

  return (
    <div
      ref={windowRef}
      onMouseDown={handleMouseDown}
      className="absolute top-0 left-0 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.45)] overflow-hidden flex flex-col select-none border border-white/10"
      style={{
        zIndex,
        // width, height, x, y, borderRadius are handled by GSAP inline
      }}
    >
      <LiquidGlass
        variant="default"
        rounded={isMaximized ? "none" : "2xl"}
        className="size-full flex flex-col shadow-2xl"
      >
        <div className={cn("relative size-full flex flex-col z-10", isLight ? "bg-white/10" : "bg-black/10")}>
        {/* Title Bar */}
        <div ref={titleBarRef} className={cn("title-bar h-12 border-b flex items-center justify-between px-3 sm:px-4 cursor-grab active:cursor-grabbing shrink-0 select-none transition-colors", isLight ? "bg-black/5 border-black/10" : "bg-white/5 border-white/10")}>
          {/* OS Control Buttons */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleCloseClick}
              className="window-btn size-3 rounded-full bg-[#FF5F56] border border-[#E0443E] flex items-center justify-center group"
            >
              <span className="size-1 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); playClickSound("minimize"); onMinimize(); }}
              className="window-btn size-3 rounded-full bg-[#FFBD2E] border border-[#DEA123] flex items-center justify-center group"
            >
              <span className="size-1 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); playClickSound("maximize"); onMaximizeToggle(); }}
              className="window-btn size-3 rounded-full bg-[#27C93F] border border-[#1AAB29] flex items-center justify-center group"
            >
              <Maximize2 className="size-1.5 text-black/60 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>

          {/* Window Title */}
          <div className="flex-1 flex justify-center items-center gap-2 min-w-0 px-3">
            {member.department && (
              <span
                className="size-2 rounded-full shrink-0"
                style={{ backgroundColor: deptColor }}
              />
            )}
            <span className={cn("text-xs font-semibold tracking-wide transition-colors truncate", isLight ? "text-black/80" : "text-white/95")}>
              {type === "finder" && `${member.name} — Finder`}
              {type === "preview" && `profile_pic.jpg`}
              {type === "textedit" && `${member.name}'s Profile`}
            </span>
          </div>

          <div className={cn("flex justify-end space-x-2 shrink-0", isLight ? "text-black/50" : "text-white/60")}>
            {type === "finder" && (
              <div className={cn("flex rounded-md p-0.5 border", isLight ? "bg-black/5 border-black/5" : "bg-white/5 border-white/5")}>
                <button
                  onClick={(e) => { e.stopPropagation(); playClickSound("action"); setFinderViewMode("grid"); }}
                  className={cn("p-1 rounded transition-colors", finderViewMode === "grid" ? (isLight ? "bg-white shadow-sm text-black" : "bg-black/40 shadow-sm text-white") : "opacity-50 hover:opacity-80")}
                >
                  <LayoutGrid className="size-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); playClickSound("action"); setFinderViewMode("list"); }}
                  className={cn("p-1 rounded transition-colors hidden sm:block", finderViewMode === "list" ? (isLight ? "bg-white shadow-sm text-black" : "bg-black/40 shadow-sm text-white") : "opacity-50 hover:opacity-80")}
                >
                  <List className="size-3.5" />
                </button>
              </div>
            )}
            
            {/* Notes App Toolbar */}
            {type === "textedit" && (
              <div className="flex items-center gap-3 sm:gap-4 text-black/50 pr-1 sm:pr-2">
                <div className="hidden sm:flex items-center gap-3">
                  <Type className="size-3.5" />
                  <ListTodo className="size-3.5" />
                  <Table className="size-3.5" />
                </div>
                <div className={cn("hidden sm:block w-px h-3", isLight ? "bg-black/20" : "bg-white/20")} />
                <div className="hidden md:flex items-center gap-3">
                  <Mic className="size-3.5" />
                  <Paperclip className="size-3.5" />
                  <PenTool className="size-3.5" />
                </div>
                <div className={cn("hidden md:block w-px h-3", isLight ? "bg-black/20" : "bg-white/20")} />
                <div className="flex items-center gap-2 sm:gap-3">
                  <Share className="size-3.5 hidden sm:block" />
                  <MoreHorizontal className="size-3.5" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic App Body Layout */}
        <div className="flex-1 flex overflow-hidden bg-black/10">
          
          {/* FINDER WINDOW */}
          {type === "finder" && (
            <div className="size-full flex">
              {/* Finder Sidebar */}
              <div className={cn(
                "w-44 border-r p-3.5 hidden sm:block shrink-0 transition-colors duration-300",
                isLight ? "bg-black/5 border-black/10" : "bg-black/15 border-white/10"
              )}>
                <div className={cn("text-[10px] font-bold mb-3 uppercase tracking-wider", isLight ? "text-black/40" : "text-white/40")}>Favorites</div>
                <div className={cn(
                  "flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs cursor-default transition-colors",
                  isLight ? "bg-black/5 text-black/90" : "bg-white/5 text-white/90"
                )}>
                  <Folder className="size-4 text-blue-500" />
                  <span>Desktop</span>
                </div>

                {/* Department Info */}
                {member.department && (
                  <div className="mt-6">
                    <div className={cn("text-[10px] font-bold mb-2 uppercase tracking-wider", isLight ? "text-black/40" : "text-white/40")}>Info</div>
                    <div className={cn(
                      "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs",
                      isLight ? "bg-black/5 text-black/70" : "bg-white/5 text-white/70"
                    )}>
                      <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: deptColor }} />
                      <span>{member.department}</span>
                    </div>
                  </div>
                )}

                {/* Tenure Info */}
                {formatTenure() && (
                  <div className={cn(
                    "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs mt-1.5",
                    isLight ? "text-black/50" : "text-white/50"
                  )}>
                    <Calendar className="size-3.5 shrink-0" />
                    <span className="text-[10px]">{formatTenure()}</span>
                  </div>
                )}
              </div>

              {/* Finder Main View */}
              <div className="flex-1 p-6 overflow-y-auto">
                {finderViewMode === "grid" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                    {/* profile_pic.jpg File */}
                    <div
                      className="flex flex-col items-center cursor-pointer group"
                      onClick={() => { playClickSound("open"); onOpenFile("photo"); }}
                    >
                      <div className={cn("w-20 h-24 rounded-xl mb-2.5 p-1 border hover:scale-105 transition-all shadow-lg flex items-center justify-center relative overflow-hidden", isLight ? "bg-black/5 border-black/10 group-hover:bg-black/10" : "bg-white/5 border-white/10 group-hover:bg-white/15")}>
                        {member.image_url ? (
                          <OptimizedImage src={member.image_url} alt="Profile" className="size-full object-cover rounded-lg" />
                        ) : (
                          <ImageIcon className={cn("size-8", isLight ? "text-black/40" : "text-white/40")} />
                        )}
                      </div>
                      <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-md transition-colors text-center line-clamp-1 max-w-[90px]", isLight ? "text-black/80 group-hover:bg-black/5" : "text-white group-hover:bg-primary")}>
                        profile.jpg
                      </span>
                    </div>

                    <div
                      className="flex flex-col items-center cursor-pointer group"
                      onClick={() => { playClickSound("open"); onOpenFile("bio"); }}
                    >
                      <div className={cn("w-20 h-24 rounded-xl mb-2.5 flex items-center justify-center border hover:scale-105 transition-all shadow-lg overflow-hidden relative", isLight ? "bg-[#FFF9CC] border-black/10" : "bg-[#FFF9CC]/90 border-white/10")}>
                         {/* Notes app style icon */}
                         <div className="absolute top-0 w-full h-4 bg-[#F2DC73]" />
                         <div className="w-full px-2 mt-4 space-y-1">
                           <div className="h-0.5 bg-black/20 w-3/4 rounded" />
                           <div className="h-0.5 bg-black/20 w-full rounded" />
                           <div className="h-0.5 bg-black/20 w-5/6 rounded" />
                         </div>
                      </div>
                      <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-md transition-colors text-center line-clamp-1 max-w-[90px]", isLight ? "text-black/80 group-hover:bg-black/5" : "text-white group-hover:bg-primary")}>
                        Profile Note
                      </span>
                    </div>

                    {/* Social links file (only if has social links) */}
                    {socialLinks.length > 0 && (
                      <div className="flex flex-col items-center cursor-default group opacity-70">
                        <div className={cn("w-20 h-24 rounded-xl mb-2.5 flex items-center justify-center border shadow-lg", isLight ? "bg-black/5 border-black/10" : "bg-white/5 border-white/10")}>
                          <div className="flex flex-col items-center gap-1.5">
                            <Globe className={cn("size-6", isLight ? "text-black/40" : "text-white/40")} />
                            <span className={cn("text-[8px] font-mono", isLight ? "text-black/30" : "text-white/30")}>{socialLinks.length} links</span>
                          </div>
                        </div>
                        <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-md text-center line-clamp-1 max-w-[90px]", isLight ? "text-black/60" : "text-white/60")}>
                          links.webloc
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 w-full max-w-full">
                    {/* List view header */}
                    <div className={cn("grid grid-cols-12 gap-2 sm:gap-4 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border-b pb-2 mb-2", isLight ? "text-black/40 border-black/10" : "text-white/40 border-white/10")}>
                      <div className="col-span-8 sm:col-span-6">Name</div>
                      <div className="hidden sm:block sm:col-span-3">Kind</div>
                      <div className="col-span-4 sm:col-span-3 text-right sm:text-left">Size</div>
                    </div>
                    
                    {/* List items */}
                    <div
                      className={cn("grid grid-cols-12 gap-2 sm:gap-4 items-center px-3 py-2 rounded-lg cursor-pointer group transition-colors", isLight ? "hover:bg-black/5" : "hover:bg-white/5")}
                      onClick={() => { playClickSound("open"); onOpenFile("photo"); }}
                    >
                      <div className="col-span-8 sm:col-span-6 flex items-center gap-3 overflow-hidden">
                        <ImageIcon className="size-4 text-blue-400 shrink-0" />
                        <span className={cn("text-[11px] font-medium truncate", isLight ? "text-black/80" : "text-white/90")}>profile.jpg</span>
                      </div>
                      <div className={cn("hidden sm:block sm:col-span-3 text-[10px] truncate", isLight ? "text-black/50" : "text-white/50")}>JPEG Image</div>
                      <div className={cn("col-span-4 sm:col-span-3 text-[10px] text-right sm:text-left truncate", isLight ? "text-black/50" : "text-white/50")}>2.4 MB</div>
                    </div>

                    <div
                      className={cn("grid grid-cols-12 gap-2 sm:gap-4 items-center px-3 py-2 rounded-lg cursor-pointer group transition-colors", isLight ? "hover:bg-black/5" : "hover:bg-white/5")}
                      onClick={() => { playClickSound("open"); onOpenFile("bio"); }}
                    >
                      <div className="col-span-8 sm:col-span-6 flex items-center gap-3 overflow-hidden">
                        <FileText className="size-4 text-[#E6B400] shrink-0" />
                        <span className={cn("text-[11px] font-medium truncate", isLight ? "text-black/80" : "text-white/90")}>Profile Note</span>
                      </div>
                      <div className={cn("hidden sm:block sm:col-span-3 text-[10px] truncate", isLight ? "text-black/50" : "text-white/50")}>Notes Document</div>
                      <div className={cn("col-span-4 sm:col-span-3 text-[10px] text-right sm:text-left truncate", isLight ? "text-black/50" : "text-white/50")}>14 KB</div>
                    </div>

                    {socialLinks.length > 0 && (
                      <div className={cn("grid grid-cols-12 gap-2 sm:gap-4 items-center px-3 py-2 rounded-lg cursor-default opacity-70 transition-colors", isLight ? "hover:bg-black/5" : "hover:bg-white/5")}>
                        <div className="col-span-8 sm:col-span-6 flex items-center gap-3 overflow-hidden">
                          <Globe className="size-4 text-gray-400 shrink-0" />
                          <span className={cn("text-[11px] font-medium truncate", isLight ? "text-black/80" : "text-white/90")}>links.webloc</span>
                        </div>
                        <div className={cn("hidden sm:block sm:col-span-3 text-[10px] truncate", isLight ? "text-black/50" : "text-white/50")}>Web Location</div>
                        <div className={cn("col-span-4 sm:col-span-3 text-[10px] text-right sm:text-left truncate", isLight ? "text-black/50" : "text-white/50")}>4 KB</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PREVIEW WINDOW */}
          {type === "preview" && (
            <div className={cn("size-full flex flex-col p-4 items-center justify-center transition-colors duration-300", isLight ? "bg-black/5" : "bg-black/25")}>
              {member.image_url ? (
                <OptimizedImage
                  src={member.image_url}
                  alt={member.name}
                  className={cn("max-w-full max-h-[70%] object-contain rounded-lg shadow-2xl border", isLight ? "border-black/5" : "border-white/10")}
                />
              ) : (
                <div className={cn("text-xs", isLight ? "text-black/40" : "text-white/40")}>No image file found</div>
              )}
              <h4 className={cn("mt-4 font-bold text-sm", isLight ? "text-black/90" : "text-white")}>{member.name}</h4>
              <p className={cn("text-[11px] uppercase tracking-widest font-semibold mt-0.5", isLight ? "text-black/60" : "text-white/60")}>{member.role}</p>
              
              {/* Department & Tenure below photo */}
              <div className="flex items-center gap-3 mt-3">
                {member.department && (
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", isLight ? "border-black/10 text-black/60" : "border-white/10 text-white/60")} style={{ borderColor: `${deptColor}40`, color: deptColor }}>
                    {member.department}
                  </span>
                )}
                {formatTenure() && (
                  <span className={cn("text-[10px] flex items-center gap-1", isLight ? "text-black/40" : "text-white/40")}>
                    <Calendar className="size-3" />
                    {formatTenure()}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* NOTES WINDOW (Upgraded from TextEdit) */}
          {type === "textedit" && (
            <div className={cn(
              "size-full p-8 flex flex-col font-sans overflow-y-auto leading-relaxed select-text transition-colors duration-300",
              isLight ? "bg-white text-black/90" : "bg-[#1E1E1E] text-white/90"
            )}>
              
              {/* Date Header */}
              <div className={cn("text-center mb-6 text-[10px] font-medium tracking-wide", isLight ? "text-black/40" : "text-white/40")}>
                {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} at {new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </div>

              {/* Title Header */}
              <h1 className={cn("text-2xl font-bold mb-4 tracking-tight", isLight ? "text-black" : "text-white")}>
                {member.name}
              </h1>

              {/* Tagline / Subtitle */}
              {member.tagline && (
                <div className={cn("text-sm font-semibold mb-6", isLight ? "text-[#E6B400]" : "text-[#FFD60A]")}>
                  {member.tagline}
                </div>
              )}

              {/* Body Content */}
              <div className="flex-1 text-[13px] leading-relaxed whitespace-pre-wrap">
                {member.description || (
                  <span className="italic opacity-50">No biography details added yet.</span>
                )}
              </div>

              {/* Info Block mimicking Notes tables/attachments */}
              {(member.department || formatTenure() || socialLinks.length > 0) && (
                <div className={cn("mt-10 rounded-xl p-4 border flex flex-col gap-3", isLight ? "bg-black/5 border-black/5" : "bg-white/5 border-white/5")}>
                  {member.department && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold opacity-60">Department</span>
                    <span className="font-medium">{member.department}</span>
                  </div>
                )}
                {formatTenure() && (
                  <>
                    <div className={cn("h-px w-full", isLight ? "bg-black/5" : "bg-white/5")} />
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold opacity-60">Tenure</span>
                      <span className="font-medium">{formatTenure()}</span>
                    </div>
                  </>
                )}
                {socialLinks.length > 0 && (
                  <>
                    <div className={cn("h-px w-full", isLight ? "bg-black/5" : "bg-white/5")} />
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold opacity-60">Links</span>
                      <div className="flex items-center gap-3">
                        {socialLinks.map(link => (
                          <a
                            key={link.label}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:opacity-70 transition-opacity"
                            title={link.label}
                          >
                            {link.icon}
                          </a>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
              )}
            </div>
          )}

        </div>
      </div>
      </LiquidGlass>
  </div>
  );
};
