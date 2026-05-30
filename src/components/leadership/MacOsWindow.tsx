import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { X, Minus, Maximize2, ChevronLeft, ChevronRight, LayoutGrid, List, Folder, FileText, Image as ImageIcon, Globe, Github, Linkedin, Twitter, Calendar } from "lucide-react";
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
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const { theme } = useTheme();

  const isLight = theme === "light";
  const deptColor = getDeptColor(member.department);

  // 1. Stacking click handler
  const handleMouseDown = (e: React.MouseEvent) => {
    onClick();
    // Start drag on title bar
    const target = e.target as HTMLElement;
    if (target.closest(".title-bar") && !target.closest(".window-btn") && !isMaximized) {
      isDragging.current = true;
      dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return;
    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  // Clean up global drag listeners
  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Set default centered position on load
  useEffect(() => {
    // Generate slight offset based on id to prevent complete overlap
    const offset = (id.charCodeAt(0) % 5) * 20;
    setPosition({
      x: (window.innerWidth - (type === "finder" ? 680 : 500)) / 2 + offset - window.innerWidth / 2,
      y: (window.innerHeight - 450) / 2 + offset - window.innerHeight / 2
    });
  }, [id, type]);

  // 2. Genie Minimize and Restore GSAP animation
  useEffect(() => {
    if (!windowRef.current) return;

    if (isMinimized) {
      // Genie animation down to the bottom center (Dock)
      gsap.to(windowRef.current, {
        scale: 0.05,
        opacity: 0,
        x: 0,
        y: window.innerHeight / 2 - 40, // Towards bottom dock
        skewX: 25,
        rotate: 8,
        duration: 0.5,
        ease: "power2.inOut",
        onComplete: () => {
          if (windowRef.current) windowRef.current.style.display = "none";
        }
      });
    } else {
      // Genie Restore animation from Dock
      windowRef.current.style.display = "flex";
      gsap.fromTo(
        windowRef.current,
        {
          scale: 0.05,
          opacity: 0,
          x: 0,
          y: window.innerHeight / 2 - 40,
          skewX: 25,
          rotate: 8
        },
        {
          scale: 1,
          opacity: 1,
          x: isMaximized ? 0 : position.x,
          y: isMaximized ? 14 : position.y, // Align to menu bar height if maximized
          skewX: 0,
          rotate: 0,
          duration: 0.5,
          ease: "power2.out"
        }
      );
    }
  }, [isMinimized]);

  // Play close scale animation
  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!windowRef.current) return;
    gsap.to(windowRef.current, {
      scale: 0.8,
      opacity: 0,
      duration: 0.2,
      ease: "power2.in",
      onComplete: onClose
    });
  };

  const getWindowDimensions = () => {
    if (isMaximized) {
      return {
        width: "100vw",
        height: "calc(100vh - 28px)", // minus Menu bar
        borderRadius: 0,
        x: 0,
        y: 14, // just below Menu bar
        numWidth: window.innerWidth,
        numHeight: window.innerHeight - 28
      };
    }
    switch (type) {
      case "finder":
        return { width: 680, height: 450, borderRadius: 16, x: position.x, y: position.y, numWidth: 680, numHeight: 450 };
      case "preview":
        return { width: 500, height: 500, borderRadius: 16, x: position.x, y: position.y, numWidth: 500, numHeight: 500 };
      case "textedit":
        return { width: 500, height: 520, borderRadius: 16, x: position.x, y: position.y, numWidth: 500, numHeight: 520 };
    }
  };

  const dim = getWindowDimensions();

  // App sound system triggers
  const playClickSound = (freq = 600, duration = 0.08) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
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
      className="absolute shadow-[0_25px_60px_-15px_rgba(0,0,0,0.45)] overflow-hidden flex flex-col transition-all duration-300 ease-out select-none border border-white/10"
      style={{
        zIndex,
        width: dim.width,
        height: dim.height,
        borderRadius: dim.borderRadius,
        transform: `translate(calc(-50% + ${isMaximized ? "50vw" : `50% + ${dim.x}px`}), calc(-50% + ${isMaximized ? "50vh" : `50% + ${dim.y}px`}))`,
        top: isMaximized ? 0 : "50%",
        left: isMaximized ? 0 : "50%"
      }}
    >
      <LiquidGlass
        variant="default"
        rounded={isMaximized ? "none" : "2xl"}
        className="size-full flex flex-col shadow-2xl"
      >
        {/* Content Container Layer */}
        <div className={cn("relative size-full flex flex-col transition-all duration-300 z-10", isLight ? "bg-white/10" : "bg-black/10")}>
        {/* Title Bar */}
        <div className={cn("title-bar h-12 border-b flex items-center justify-between px-4 cursor-grab active:cursor-grabbing shrink-0 select-none transition-colors", isLight ? "bg-black/5 border-black/10" : "bg-white/5 border-white/10")}>
          {/* OS Control Buttons */}
          <div className="flex items-center space-x-2 w-1/3">
            <button
              onClick={handleCloseClick}
              className="window-btn size-3 rounded-full bg-[#FF5F56] border border-[#E0443E] flex items-center justify-center group"
            >
              <span className="size-1 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); playClickSound(400); onMinimize(); }}
              className="window-btn size-3 rounded-full bg-[#FFBD2E] border border-[#DEA123] flex items-center justify-center group"
            >
              <span className="size-1 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); playClickSound(500); onMaximizeToggle(); }}
              className="window-btn size-3 rounded-full bg-[#27C93F] border border-[#1AAB29] flex items-center justify-center group"
            >
              <Maximize2 className="size-1.5 text-black/60 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>

          {/* Window Title */}
          <div className="flex-1 flex justify-center items-center gap-2">
            {member.department && (
              <span
                className="size-2 rounded-full shrink-0"
                style={{ backgroundColor: deptColor }}
              />
            )}
            <span className={cn("text-xs font-semibold tracking-wide transition-colors", isLight ? "text-black/80" : "text-white/95")}>
              {type === "finder" && `${member.name} — Finder`}
              {type === "preview" && `profile_pic.jpg (Preview)`}
              {type === "textedit" && `${member.name.toLowerCase().replace(/\s+/g, "_")}_bio.txt (TextEdit)`}
            </span>
          </div>

          <div className={cn("w-1/3 flex justify-end space-x-2", isLight ? "text-black/50" : "text-white/60")}>
            <div className={cn("flex rounded-md p-1 border", isLight ? "bg-black/5 border-black/5" : "bg-white/5 border-white/5")}>
              <LayoutGrid className="size-3.5 mx-1" />
              <List className="size-3.5 mx-1 opacity-50" />
            </div>
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
                <div className={cn(
                  "flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs cursor-default mt-1.5 transition-colors",
                  isLight ? "hover:bg-black/5 text-black/70" : "hover:bg-white/5 text-white/70"
                )}>
                  <Folder className="size-4 text-primary" />
                  <span>Spark Drive</span>
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                  {/* profile_pic.jpg File */}
                  <div
                    className="flex flex-col items-center cursor-pointer group"
                    onClick={() => { playClickSound(700); onOpenFile("photo"); }}
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

                  {/* bio.txt File */}
                  <div
                    className="flex flex-col items-center cursor-pointer group"
                    onClick={() => { playClickSound(700); onOpenFile("bio"); }}
                  >
                    <div className={cn("w-20 h-24 rounded-xl mb-2.5 flex items-center justify-center border hover:scale-105 transition-all shadow-lg", isLight ? "bg-black/5 border-black/10 group-hover:bg-black/10" : "bg-white/5 border-white/10 group-hover:bg-white/15")}>
                      <div className="w-11 h-14 bg-white rounded border border-gray-300 flex flex-col pt-2.5 px-2 relative">
                        <div className="h-0.5 bg-gray-300 w-full mb-0.5 rounded" />
                        <div className="h-0.5 bg-gray-300 w-3/4 mb-0.5 rounded" />
                        <div className="h-0.5 bg-gray-300 w-full mb-0.5 rounded" />
                        <div className="h-0.5 bg-gray-300 w-1/2 rounded" />
                      </div>
                    </div>
                    <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-md transition-colors text-center line-clamp-1 max-w-[90px]", isLight ? "text-black/80 group-hover:bg-black/5" : "text-white group-hover:bg-primary")}>
                      bio.txt
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

          {/* TEXTEDIT WINDOW */}
          {type === "textedit" && (
            <div className={cn(
              "size-full p-6 flex flex-col font-mono text-xs overflow-y-auto leading-relaxed border-t select-text transition-colors duration-300",
              isLight ? "bg-[#F9F9FB] text-black border-black/5" : "bg-[#1e1e1e] text-white border-white/5"
            )}>
              <div className={cn(
                "flex items-center justify-between border-b pb-2 mb-4 text-[10px] transition-colors",
                isLight ? "border-black/10 text-black/40" : "border-white/10 text-white/40"
              )}>
                <span>Spark Labs TextEdit Workspace v2.0</span>
                <span>UTF-8 // Read Only</span>
              </div>

              {/* Tagline header */}
              {member.tagline && (
                <div className={cn("mb-4 pb-3 border-b italic text-sm", isLight ? "border-black/5 text-black/60" : "border-white/5 text-white/50")}>
                  "{member.tagline}"
                </div>
              )}

              {/* Bio content */}
              <div className={cn("flex-1 whitespace-pre-wrap transition-colors", isLight ? "text-black/95" : "text-white/95")}>
                {member.description || "Warning: Biography data decrypted as empty. Re-verify team records."}
              </div>

              {/* Social Links Section */}
              {socialLinks.length > 0 && (
                <div className={cn("mt-4 pt-3 border-t", isLight ? "border-black/10" : "border-white/10")}>
                  <div className={cn("text-[10px] font-bold uppercase tracking-wider mb-2", isLight ? "text-black/40" : "text-white/40")}>
                    Social Links
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {socialLinks.map(link => (
                      <a
                        key={link.label}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium border transition-colors",
                          isLight
                            ? "border-black/10 text-black/70 hover:bg-black/5 hover:text-black"
                            : "border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        {link.icon}
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* File metadata */}
              <div className={cn("mt-4 pt-3 border-t text-[9px] space-y-0.5 transition-colors", isLight ? "border-black/10 text-black/30" : "border-white/10 text-white/30")}>
                <div>File: {member.name.toLowerCase().replace(/\s+/g, "_")}_bio.txt</div>
                {member.department && <div>Department: {member.department}</div>}
                {formatTenure() && <div>Tenure: {formatTenure()}</div>}
                <div>Last Modified: {new Date().toLocaleDateString()}</div>
              </div>
            </div>
          )}

        </div>
      </div>
      </LiquidGlass>
  </div>
  );
};
