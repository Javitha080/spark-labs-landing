import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Wifi, WifiOff, Battery, Search, Home, FolderKanban, Calendar, BookOpen, Image as ImageIcon, Mail, Cpu, RefreshCw, Power, Sliders, Volume2, VolumeX, Sun, Moon, Crown } from "lucide-react";
import LiquidGlass from "@/components/ui/LiquidGlass";
import { cn } from "@/lib/utils";

interface MacOsMenuBarProps {
  onRestart: () => void;
}

export const MacOsMenuBar = ({ onRestart }: MacOsMenuBarProps) => {
  const [time, setTime] = useState(new Date());
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const [isWifiOn, setIsWifiOn] = useState(true);
  const [brightness, setBrightness] = useState(80);
  const [volume, setVolume] = useState(60);

  const isLight = theme === "light";

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formattedTime = time.toLocaleTimeString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });

  const toggleMenu = (menuName: string) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
  };

  const handlePowerAction = (action: "shutdown" | "restart") => {
    setActiveMenu(null);
    if (action === "restart") {
      onRestart();
    } else {
      navigate("/");
    }
  };

  // Website sections mapping
  const shortcuts = [
    { name: "Projects", icon: <FolderKanban className="size-4 text-blue-500" />, path: "/#projects" },
    { name: "Events", icon: <Calendar className="size-4 text-green-500" />, path: "/#events" },
    { name: "Blog", icon: <BookOpen className="size-4 text-yellow-500" />, path: "/blog" },
    { name: "Gallery", icon: <ImageIcon className="size-4 text-purple-500" />, path: "/#gallery" },
    { name: "Contact", icon: <Mail className="size-4 text-red-500" />, path: "/#contact" },
    { name: "Leadership", icon: <Crown className="size-4 text-amber-500" />, path: "/leadership" }
  ];

  return (
    <LiquidGlass
      variant="subtle"
      rounded="none"
      className="fixed top-0 left-0 right-0 h-[28px] z-[9999] select-none !border-x-0 !border-t-0 border-b border-black/10 dark:border-white/10 shadow-[0_1px_2px_rgba(0,0,0,0.15)] !overflow-visible"
    >
      {/* Content Container Layer */}
      <div 
        ref={dropdownRef}
        className={cn(
          "relative w-full h-full flex items-center justify-between px-4 text-[13px] font-semibold font-sans transition-all duration-300 z-10",
          isLight 
            ? "text-[#1D1D1F]" 
            : "text-white"
        )}
      >
      {/* Left side: Apple Logo, Finder, system menus */}
      <div className="flex items-center space-x-4">
        {/* Apple Dropdown Trigger */}
        <div className="relative">
          <button
            onClick={() => toggleMenu("apple")}
            className={cn(
              "flex items-center justify-center rounded px-2 h-6 transition-colors",
              isLight ? "hover:bg-black/5 active:bg-black/10" : "hover:bg-white/10 active:bg-white/15"
            )}
          >
            {/* dynamic dark/light themed Apple logo SVG */}
            <img
              src={isLight ? "/assets/Apple_logo_black.svg" : "/assets/Apple_logo_white.svg"}
              alt="Apple Menu"
              className="size-[14px] object-contain select-none opacity-90 hover:opacity-100 transition-opacity"
            />
          </button>

          {/* Apple Dropdown Menu */}
          {activeMenu === "apple" && (
            <div className={cn(
              "absolute top-[26px] left-0 w-56 border rounded-lg shadow-2xl p-1 flex flex-col gap-0.5 z-[99999] transition-all duration-200",
              isLight 
                ? "bg-[#F5F5F7]/95 backdrop-blur-2xl border-black/10 text-[#1D1D1F]" 
                : "bg-[#1A1A1A]/85 backdrop-blur-2xl border-white/10 text-white"
            )}>
              <div className={cn(
                "px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider border-b mb-1 flex items-center gap-1.5",
                isLight ? "text-black/40 border-black/5" : "text-white/40 border-white/5"
              )}>
                <Cpu className="size-3 text-primary" /> Spark OS Sonoma
              </div>
              <button 
                onClick={() => { setActiveMenu(null); navigate("/about"); }}
                className={cn(
                  "w-full text-left px-3 py-1 rounded text-xs transition-colors",
                  isLight ? "hover:bg-black/5" : "hover:bg-primary"
                )}
              >
                About This Mac
              </button>
              <button 
                onClick={() => { setActiveMenu(null); navigate("/learning-hub"); }}
                className={cn(
                  "w-full text-left px-3 py-1 rounded text-xs transition-colors",
                  isLight ? "hover:bg-black/5" : "hover:bg-primary"
                )}
              >
                System Settings...
              </button>
              <div className={cn("h-px my-1", isLight ? "bg-black/5" : "bg-white/5")} />
              <button 
                onClick={() => handlePowerAction("restart")}
                className={cn(
                  "w-full text-left px-3 py-1 rounded text-xs transition-colors flex items-center justify-between",
                  isLight ? "hover:bg-black/5" : "hover:bg-primary"
                )}
              >
                <span>Restart...</span>
                <RefreshCw className={cn("size-3", isLight ? "text-black/40" : "text-white/40")} />
              </button>
              <button 
                onClick={() => handlePowerAction("shutdown")}
                className="w-full text-left px-3 py-1 rounded hover:bg-destructive hover:text-white text-xs transition-colors flex items-center justify-between"
              >
                <span>Shut Down...</span>
                <Power className="size-3 text-red-400" />
              </button>
            </div>
          )}
        </div>

        {/* System Options */}
        <div className="flex items-center space-x-1 font-semibold relative">
          {["Finder", "File", "Edit", "View", "Go", "Window", "Help"].map((item, idx) => {
            type MenuItem = { label?: string; shortcut?: string; divider?: boolean };
            const menus: Record<string, MenuItem[]> = {
              Finder: [
                { label: "About Finder" },
                { divider: true },
                { label: "Preferences...", shortcut: "⌘," },
                { divider: true },
                { label: "Empty Trash", shortcut: "⇧⌘⌫" }
              ],
              File: [
                { label: "New Window", shortcut: "⌘N" },
                { label: "New Folder", shortcut: "⇧⌘N" },
                { divider: true },
                { label: "Close Window", shortcut: "⌘W" },
                { divider: true },
                { label: "Get Info", shortcut: "⌘I" }
              ],
              Edit: [
                { label: "Undo", shortcut: "⌘Z" },
                { label: "Redo", shortcut: "⇧⌘Z" },
                { divider: true },
                { label: "Cut", shortcut: "⌘X" },
                { label: "Copy", shortcut: "⌘C" },
                { label: "Paste", shortcut: "⌘V" },
                { divider: true },
                { label: "Select All", shortcut: "⌘A" }
              ],
              View: [
                { label: "as Icons", shortcut: "⌘1" },
                { label: "as List", shortcut: "⌘2" },
                { divider: true },
                { label: "Show View Options", shortcut: "⌘J" }
              ],
              Go: [
                { label: "Back", shortcut: "⌘[" },
                { label: "Forward", shortcut: "⌘]" },
                { divider: true },
                { label: "Desktop", shortcut: "⇧⌘D" },
                { label: "Downloads", shortcut: "⌥⌘L" },
                { label: "Home", shortcut: "⇧⌘H" }
              ],
              Window: [
                { label: "Minimize", shortcut: "⌘M" },
                { label: "Zoom" },
                { divider: true },
                { label: "Bring All to Front" }
              ],
              Help: [
                { label: "Search", shortcut: "⇧⌘/" },
                { divider: true },
                { label: "Spark Labs Help" }
              ]
            };

            return (
              <div key={item} className="relative">
                <button
                  onClick={() => toggleMenu(item)}
                  className={cn(
                    "cursor-pointer px-2 py-0.5 rounded transition-colors select-none",
                    isLight ? "hover:bg-black/5" : "hover:bg-white/10",
                    activeMenu === item ? (isLight ? "bg-black/10" : "bg-white/15") : "",
                    idx > 0 && "hidden sm:inline",
                    idx > 2 && "hidden md:inline",
                    idx > 4 && "hidden lg:inline"
                  )}
                >
                  {item}
                </button>
                
                {activeMenu === item && (
                  <div className={cn(
                    "absolute top-[26px] left-0 min-w-[220px] border rounded-lg shadow-2xl p-1 flex flex-col z-[99999] transition-all duration-200",
                    isLight 
                      ? "bg-[#F5F5F7]/95 backdrop-blur-2xl border-black/10 text-[#1D1D1F]" 
                      : "bg-[#1A1A1A]/85 backdrop-blur-2xl border-white/10 text-white"
                  )}>
                    {menus[item].map((menuItem, i) => (
                      menuItem.divider ? (
                        <div key={`div-${i}`} className={cn("h-[1px] my-1 mx-2", isLight ? "bg-black/10" : "bg-white/10")} />
                      ) : (
                        <button
                          key={menuItem.label}
                          onClick={() => setActiveMenu(null)}
                          className={cn(
                            "group w-full flex items-center justify-between px-3 py-1 rounded-md text-[13px] font-medium transition-colors",
                            "hover:bg-blue-500 hover:text-white"
                          )}
                        >
                          <span>{menuItem.label}</span>
                          {menuItem.shortcut && (
                            <span className={cn(
                              "text-[12px] tracking-widest font-sans ml-4 transition-colors",
                              isLight ? "text-black/50 group-hover:text-white/90" : "text-white/50 group-hover:text-white/90"
                            )}>
                              {menuItem.shortcut}
                            </span>
                          )}
                        </button>
                      )
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right side: system status & Control Center */}
      <div className="flex items-center space-x-3.5">
        <button onClick={() => setIsWifiOn(!isWifiOn)} className="flex items-center justify-center">
          {isWifiOn ? <Wifi className="size-3.5 cursor-pointer opacity-90 hover:opacity-100" /> : <WifiOff className="size-3.5 cursor-pointer opacity-50 hover:opacity-100" />}
        </button>
        {/* Battery Menu */}
        <div className="relative">
          <button 
            onClick={() => toggleMenu("battery")}
            className="flex items-center justify-center h-6"
          >
            <Battery className={cn("size-4 cursor-pointer transition-opacity", activeMenu === "battery" ? "opacity-100" : "opacity-90 hover:opacity-100", "rotate-90")} />
          </button>
          
          {activeMenu === "battery" && (
            <div className={cn(
              "absolute top-[26px] -right-4 w-48 border rounded-lg shadow-2xl p-1.5 flex flex-col gap-0.5 z-[99999] transition-all duration-200 text-xs",
              isLight 
                ? "bg-[#F5F5F7]/95 backdrop-blur-2xl border-black/10 text-[#1D1D1F]" 
                : "bg-[#1A1A1A]/85 backdrop-blur-2xl border-white/10 text-white"
            )}>
              <div className="flex justify-between items-center px-2 py-1 font-semibold">
                <span className={isLight ? "text-black/50" : "text-white/50"}>Battery</span>
                <span>100%</span>
              </div>
              <div className={cn("h-px my-0.5", isLight ? "bg-black/5" : "bg-white/5")} />
              <div className={cn("px-2 py-1 text-[11px]", isLight ? "text-black/70" : "text-white/70")}>
                Power Source: Battery
              </div>
            </div>
          )}
        </div>
        
        {/* Control Center Toggle */}
        <div className="relative">
          <button 
            onClick={() => toggleMenu("controlCenter")}
            className={cn(
              "flex items-center justify-center rounded px-2 h-6 transition-colors",
              isLight ? "hover:bg-black/5 active:bg-black/10" : "hover:bg-white/10 active:bg-white/15"
            )}
          >
            <Sliders className="size-3.5" />
          </button>

          {/* Control Center Drawer */}
          {activeMenu === "controlCenter" && (
            <div className={cn(
              "absolute top-[26px] right-0 w-72 border rounded-2xl shadow-2xl p-3 flex flex-col gap-3 z-[99999] transition-all duration-200",
              isLight 
                ? "bg-[#F5F5F7]/95 backdrop-blur-2xl border-black/10 text-[#1D1D1F]" 
                : "bg-[#1A1A1A]/85 backdrop-blur-2xl border-white/10 text-white"
            )}>
              
              {/* Top Panels */}
              <div className="grid grid-cols-2 gap-2">
                {/* WiFi Panel */}
                <button
                  onClick={() => setIsWifiOn(!isWifiOn)}
                  className={cn(
                    "rounded-xl p-2.5 border flex items-center space-x-2.5 text-left transition-colors cursor-pointer",
                    isWifiOn ? (isLight ? "bg-black/5 border-black/10" : "bg-white/10 border-white/20") : (isLight ? "bg-black/5 border-black/5 opacity-60" : "bg-white/5 border-white/5 opacity-60")
                  )}
                >
                  <div className={cn("size-7 rounded-full flex items-center justify-center shrink-0 transition-colors", isWifiOn ? "bg-blue-500" : "bg-gray-400/50")}>
                    {isWifiOn ? <Wifi className="size-4 text-white" /> : <WifiOff className="size-4 text-white" />}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold">Wi-Fi</span>
                    <span className={cn("text-[9px] truncate", isLight ? "text-black/50" : "text-white/50")}>
                      {isWifiOn ? "Spark_Labs_5G" : "Off"}
                    </span>
                  </div>
                </button>

                {/* YIC Panel */}
                <div className={cn(
                  "rounded-xl p-2.5 border flex items-center space-x-2.5",
                  isLight ? "bg-black/5 border-black/5" : "bg-white/5 border-white/5"
                )}>
                  <div className="size-7 rounded-full bg-purple-500 flex items-center justify-center shrink-0">
                    <Home className="size-4 text-white" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold">Workspace</span>
                    <span className={cn("text-[9px] truncate", isLight ? "text-black/50" : "text-white/50")}>YIC-Desktop</span>
                  </div>
                </div>
              </div>

              {/* Sliders Panel */}
              <div className={cn(
                "rounded-xl p-3 border flex flex-col gap-3",
                isLight ? "bg-black/5 border-black/5" : "bg-white/5 border-white/5"
              )}>
                {/* Brightness Slider */}
                <div className="flex items-center space-x-3 group">
                  <Sun className={cn("size-4 shrink-0 transition-colors", isLight ? "text-black/60 group-hover:text-black/90" : "text-white/60 group-hover:text-white/90")} />
                  <div className="relative flex-1 h-5 flex items-center">
                    {/* Background track */}
                    <div className={cn("absolute inset-0 rounded-full pointer-events-none", isLight ? "bg-black/10" : "bg-white/10")} />
                    {/* Fill track */}
                    <div className={cn("absolute left-0 top-0 bottom-0 rounded-full pointer-events-none", isLight ? "bg-black/80" : "bg-white/80")} style={{ width: `${brightness}%` }} />
                    {/* Invisible native range input for interaction */}
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={brightness}
                      onChange={(e) => {
                        setBrightness(Number(e.target.value));
                        // Example hook to change actual brightness using filter
                        const htmlEl = document.documentElement;
                        const brightnessVal = 0.5 + (Number(e.target.value) / 100) * 0.7; // 50% to 120%
                        htmlEl.style.filter = `brightness(${brightnessVal})`;
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Volume Slider */}
                <div className="flex items-center space-x-3 group">
                  {volume === 0 ? (
                    <VolumeX className={cn("size-4 shrink-0 transition-colors", isLight ? "text-black/60 group-hover:text-black/90" : "text-white/60 group-hover:text-white/90")} />
                  ) : (
                    <Volume2 className={cn("size-4 shrink-0 transition-colors", isLight ? "text-black/60 group-hover:text-black/90" : "text-white/60 group-hover:text-white/90")} />
                  )}
                  <div className="relative flex-1 h-5 flex items-center">
                    {/* Background track */}
                    <div className={cn("absolute inset-0 rounded-full pointer-events-none", isLight ? "bg-black/10" : "bg-white/10")} />
                    {/* Fill track */}
                    <div className={cn("absolute left-0 top-0 bottom-0 rounded-full pointer-events-none", isLight ? "bg-black/80" : "bg-white/80")} style={{ width: `${volume}%` }} />
                    {/* Invisible native range input for interaction */}
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Theme Toggle */}
              <div className={cn(
                "rounded-xl p-2.5 border flex items-center justify-between",
                isLight ? "bg-black/5 border-black/5" : "bg-white/5 border-white/5"
              )}>
                <div className="flex items-center gap-2">
                  {isLight ? <Sun className="size-4 text-amber-500" /> : <Moon className="size-4 text-blue-400" />}
                  <span className="text-[11px] font-semibold">Appearance</span>
                </div>
                <button
                  onClick={() => {
                    const newTheme = isLight ? "dark" : "light";
                    if (setTheme) {
                      setTheme(newTheme);
                    } else {
                      // Fallback if next-themes is not mounted properly
                      const root = document.documentElement;
                      if (newTheme === "dark") {
                        root.classList.add("dark");
                        root.setAttribute("data-theme", "dark");
                      } else {
                        root.classList.remove("dark");
                        root.setAttribute("data-theme", "light");
                      }
                      localStorage.setItem("theme", newTheme);
                    }
                  }}
                  className={cn(
                    "px-2 py-1 rounded-md text-[10px] font-medium border transition-colors",
                    isLight ? "bg-black/5 border-black/10 hover:bg-black/10" : "bg-white/10 border-white/10 hover:bg-white/20"
                  )}
                >
                  {isLight ? "Dark" : "Light"}
                </button>
              </div>

              {/* Website Section Shortcuts Panel */}
              <div className={cn(
                "rounded-xl p-2.5 border flex flex-col gap-1.5",
                isLight ? "bg-black/5 border-black/5" : "bg-white/5 border-white/5"
              )}>
                <div className={cn("text-[9px] uppercase font-bold mb-1 tracking-wider", isLight ? "text-black/40" : "text-white/40")}>Spark Links</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {shortcuts.map(s => (
                    <button
                      key={s.name}
                      onClick={() => {
                        setActiveMenu(null);
                        if (s.path.startsWith("/#")) {
                          navigate("/");
                          setTimeout(() => {
                            const el = document.getElementById(s.path.substring(2));
                            if (el) el.scrollIntoView({ behavior: "smooth" });
                          }, 200);
                        } else {
                          navigate(s.path);
                        }
                      }}
                      className={cn(
                        "flex items-center space-x-2 p-1.5 rounded-lg border text-[11px] text-left transition-colors",
                        isLight ? "bg-white border-black/5 hover:bg-black/5" : "bg-white/5 border-white/5 hover:bg-white/10"
                      )}
                    >
                      <div className={cn("size-5 rounded flex items-center justify-center", isLight ? "bg-black/5" : "bg-black/30")}>
                        {s.icon}
                      </div>
                      <span className={cn("font-semibold", isLight ? "text-black/80" : "text-white/80")}>{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>

        <span className="font-semibold">{formattedTime}</span>
      </div>
      </div>
    </LiquidGlass>
  );
};
