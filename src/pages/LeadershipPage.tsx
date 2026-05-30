import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import { MacOsMenuBar } from "@/components/leadership/MacOsMenuBar";
import { MacOsFolder } from "@/components/leadership/MacOsFolder";
import { MacOsWindow } from "@/components/leadership/MacOsWindow";
import { MacOsDock } from "@/components/leadership/MacOsDock";
import MacOsBootScreen from "@/components/leadership/MacOsBootScreen";
import { m } from "framer-motion";


export interface LeaderMember {
  id: string;
  name: string;
  role: string;
  description: string | null;
  image_url: string | null;
  email: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  twitter_url: string | null;
  website_url: string | null;
  department: string | null;
  tagline: string | null;
  tenure_start: string | null;
  tenure_end: string | null;
  display_order: number;
}

interface OpenWindow {
  id: string; // e.g. finder-{leaderId}, preview-{leaderId}, textedit-{leaderId}
  type: "finder" | "preview" | "textedit";
  leaderId: string;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
}

// Fallback leaders matching real team names from workspace database
const fallbackLeaders: LeaderMember[] = [
  {
    id: "lead-1",
    name: "Javitha Senon",
    role: "President & Chief Maker",
    description: "Lead roboticist and coordinator. Can automate his bedroom curtains but accidentally locks himself out of his room twice a week.",
    tagline: "If it can be automated, it should be.",
    department: "Robotics",
    image_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300&h=300",
    email: "javitha@sparklabs.com",
    linkedin_url: "https://linkedin.com",
    github_url: "https://github.com",
    twitter_url: null,
    website_url: null,
    tenure_start: "2024-01-01",
    tenure_end: null,
    display_order: 1
  },
  {
    id: "lead-2",
    name: "Shaleesha Hansamal",
    role: "Vice President & IoT Architect",
    description: "Firmly believes that everything, including brewing coffee, can be solved by an Arduino. Once built a robot to pet his cat, but the cat preferred the cardboard box it came in.",
    tagline: "Everything is better with a sensor.",
    department: "IoT",
    image_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300&h=300",
    email: "shaleesha@sparklabs.com",
    linkedin_url: "https://linkedin.com",
    github_url: null,
    twitter_url: null,
    website_url: null,
    tenure_start: "2024-01-01",
    tenure_end: null,
    display_order: 2
  },
  {
    id: "lead-3",
    name: "Sahan Nevinda",
    role: "Technical Director",
    description: "Writes React code in his sleep. His keyboard has no backspace because he believes in absolute commitment. Rumored to survive entirely on caffeine.",
    tagline: "commit -m 'it works' --force",
    department: "Software",
    image_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300&h=300",
    email: "sahan@sparklabs.com",
    linkedin_url: "https://linkedin.com",
    github_url: "https://github.com",
    twitter_url: null,
    website_url: null,
    tenure_start: "2024-03-01",
    tenure_end: null,
    display_order: 3
  },
  {
    id: "lead-4",
    name: "Umira",
    role: "Secretary & Tech Evangelist",
    description: "Keeps the makers from setting the lab on fire. Coordinates all events with absolute precision, but loses her phone while holding it in her hand.",
    tagline: "Order in chaos.",
    department: "Operations",
    image_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=300&h=300",
    email: "umira@sparklabs.com",
    linkedin_url: "https://linkedin.com",
    github_url: null,
    twitter_url: null,
    website_url: null,
    tenure_start: "2024-01-01",
    tenure_end: null,
    display_order: 4
  },
  {
    id: "lead-5",
    name: "Thevinu",
    role: "Solar Systems Head",
    description: "Specializes in solar energy projects and green tech integrations. Once tried to run the club coffee machine off a solar panel, causing a brief black-out.",
    tagline: "Powered by the sun ☀️",
    department: "Solar Energy",
    image_url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=300&h=300",
    email: "thevinu@sparklabs.com",
    linkedin_url: "https://linkedin.com",
    github_url: null,
    twitter_url: null,
    website_url: null,
    tenure_start: "2024-06-01",
    tenure_end: null,
    display_order: 5
  },
  {
    id: "lead-6",
    name: "Bisakya",
    role: "Robotics Core Lead",
    description: "Expert in CAD design and mechanical assemblies. His designs look beautiful in 3D but sometimes require gravity-defying components in real life.",
    tagline: "Design it, print it, break it, repeat.",
    department: "Robotics",
    image_url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=300&h=300",
    email: "bisakya@sparklabs.com",
    linkedin_url: "https://linkedin.com",
    github_url: null,
    twitter_url: null,
    website_url: null,
    tenure_start: "2024-06-01",
    tenure_end: null,
    display_order: 6
  }
];

export default function LeadershipPage() {
  const [leaders, setLeaders] = useState<LeaderMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBooting, setIsBooting] = useState(true);
  
  // Draggable coordinates mapping
  const [folderPositions, setFolderPositions] = useState<{ [key: string]: { x: number; y: number } }>({});
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Custom trailing follower cursor
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });
  const [cursorHovered, setCursorHovered] = useState(false);

  // Stacking order manager
  const maxZIndex = useRef(10);

  // Multi-window state manager
  const [openWindows, setOpenWindows] = useState<OpenWindow[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);

  // Calculate folder coordinates synchronously to prevent lifecycle drag offsets
  const calculateFolderPositions = (loadedLeaders: LeaderMember[]) => {
    const w = window.innerWidth;
    const positions: { [key: string]: { x: number; y: number } } = {};
    
    loadedLeaders.forEach((leader, index) => {
      const row = index % 4; // Max 4 rows per column to keep folders fully above the Dock
      const col = Math.floor(index / 4);
      positions[leader.id] = {
        // Arrange columns starting from right to left
        x: w - 120 - (col * 105),
        y: 60 + (row * 110)
      };
    });
    return positions;
  };

  const fetchTeamMembers = useCallback(async () => {
    try {
      // Timeout fallback if Supabase hangs indefinitely
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Supabase timeout")), 4000)
      );

      // Use the leadership_members_public view which filters is_leadership=true
      const queryPromise = supabase
        .from("leadership_members_public" as any)
        .select("*")
        .order("display_order", { ascending: true });

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

      const loaded = (error || !data || data.length === 0) ? fallbackLeaders : (data as unknown as LeaderMember[]);
      setLeaders(loaded);
      setFolderPositions(calculateFolderPositions(loaded));
    } catch (err) {
      console.warn("Supabase fetch failed or timed out:", err);
      setLeaders(fallbackLeaders);
      setFolderPositions(calculateFolderPositions(fallbackLeaders));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  // Handle screen resize by shifting positions
  useEffect(() => {
    const handleResize = () => {
      setFolderPositions(calculateFolderPositions(leaders));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [leaders]);

  // Trailing follower update
  useEffect(() => {
    const updateMousePos = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleHoverStart = () => setCursorHovered(true);
    const handleHoverEnd = () => setCursorHovered(false);

    window.addEventListener("mousemove", updateMousePos);

    const bindHoverListeners = () => {
      const interactives = document.querySelectorAll("a, button, .cursor-pointer, input, select");
      interactives.forEach(el => {
        el.addEventListener("mouseenter", handleHoverStart);
        el.addEventListener("mouseleave", handleHoverEnd);
      });
    };

    const intervalId = setInterval(bindHoverListeners, 1000);

    return () => {
      window.removeEventListener("mousemove", updateMousePos);
      clearInterval(intervalId);
    };
  }, []);

  // System sounds synthesizer
  const playSystemSound = (freq = 440, type: OscillatorType = "sine", duration = 0.05) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch {}
  };

  // Focus tracking
  const focusWindow = (id: string) => {
    maxZIndex.current += 1;
    setOpenWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, zIndex: maxZIndex.current, isMinimized: false } : w))
    );
    setActiveWindowId(id);
  };

  const handleOpenFinder = (leaderId: string) => {
    const finderId = `finder-${leaderId}`;
    const exists = openWindows.find(w => w.id === finderId);

    if (exists) {
      focusWindow(finderId);
    } else {
      maxZIndex.current += 1;
      const newWin: OpenWindow = {
        id: finderId,
        type: "finder",
        leaderId,
        isMinimized: false,
        isMaximized: false,
        zIndex: maxZIndex.current
      };
      setOpenWindows(prev => [...prev, newWin]);
      setActiveWindowId(finderId);
      playSystemSound(600, "triangle", 0.06);
    }
  };

  const handleOpenFile = (leaderId: string, fileType: "photo" | "bio") => {
    const winId = `${fileType}-${leaderId}`;
    const exists = openWindows.find(w => w.id === winId);

    if (exists) {
      focusWindow(winId);
    } else {
      maxZIndex.current += 1;
      const newWin: OpenWindow = {
        id: winId,
        type: fileType === "photo" ? "preview" : "textedit",
        leaderId,
        isMinimized: false,
        isMaximized: false,
        zIndex: maxZIndex.current
      };
      setOpenWindows(prev => [...prev, newWin]);
      setActiveWindowId(winId);
      playSystemSound(700, "sine", 0.08);
    }
  };

  const handleCloseWindow = (id: string) => {
    setOpenWindows(prev => prev.filter(w => w.id !== id));
    if (activeWindowId === id) {
      setActiveWindowId(null);
    }
    playSystemSound(300, "sine", 0.1);
  };

  const handleMinimizeWindow = (id: string) => {
    setOpenWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, isMinimized: true } : w))
    );
    if (activeWindowId === id) {
      setActiveWindowId(null);
    }
  };

  const handleRestoreApp = (id: string) => {
    focusWindow(id);
    playSystemSound(500, "triangle", 0.08);
  };

  const handleMaximizeToggle = (id: string) => {
    setOpenWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, isMaximized: !w.isMaximized } : w))
    );
  };

  const handleRestart = () => {
    setIsBooting(true);
    setOpenWindows([]);
  };

  return (
    <div 
      className="macos-desktop w-full h-screen overflow-hidden relative select-none bg-black flex flex-col"
      onClick={() => setSelectedFolderId(null)}
    >
      {/* Base64 macOS Custom Pointer Cursor Overrides */}
      <style>{`
        .macos-desktop {
          cursor: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 20 20'><path fill='black' stroke='white' stroke-width='1.5' d='M3,2 L3,17 L7.8,12.2 L14,12.2 Z'/></svg>") 3 2, auto !important;
        }
        .macos-desktop a, 
        .macos-desktop button, 
        .macos-desktop .window-btn,
        .macos-desktop .cursor-pointer {
          cursor: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 20 20'><path fill='black' stroke='white' stroke-width='1.5' d='M3,2 L3,17 L7.8,12.2 L14,12.2 Z'/></svg>") 3 2, auto !important;
        }
      `}</style>

      <SEOHead
        title="Leadership Desktop | Young Innovators Club"
        description="Meet the YICDVP leadership panel in a fully featured macOS liquid-glass dashboard workspace."
        path="/leadership"
      />

      {/* 1. Loading/Booting Animation Screen */}
      {isBooting && <MacOsBootScreen onComplete={() => setIsBooting(false)} />}

      {/* 2. Custom Liquid Glass Cursor Follower trailing behind real pointer */}
      <m.div
        className="hidden md:block pointer-events-none fixed size-4 rounded-full border border-white/40 bg-white/5 mix-blend-difference z-[999999] will-change-transform"
        animate={{
          x: mousePos.x - 8,
          y: mousePos.y - 8,
          scale: cursorHovered ? 1.6 : 1
        }}
        transition={{ type: "spring", damping: 30, stiffness: 450, mass: 0.1 }}
      />

      {/* 3. Wallpaper Background (Sonoma Waves) */}
      <div
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{
          backgroundImage: 'url("/assets/mac-wallpaper.jpg")',
          filter: "brightness(0.9) contrast(1.02)"
        }}
      />
      {/* Soft overlay grids */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5 z-0" />

      {/* 4. Menu bar */}
      <MacOsMenuBar onRestart={handleRestart} />

      {/* 5. Desktop Workspace Area */}
      <div className="flex-1 pt-7 pb-20 relative w-full h-full overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full text-white/50 text-xs">
            Initializing system drivers...
          </div>
        ) : (
          <>
            {/* Desktop Folders (Absolutely Positioned synchronously and Draggable) */}
            {leaders.map((leader, index) => {
              const pos = folderPositions[leader.id] || { x: 40, y: 80 + index * 105 };
              return (
                <MacOsFolder
                  key={leader.id}
                  id={leader.id}
                  name={leader.name}
                  department={leader.department}
                  imageUrl={leader.image_url}
                  defaultPosition={pos}
                  isSelected={selectedFolderId === leader.id}
                  onSelect={() => {
                    setSelectedFolderId(leader.id);
                    playSystemSound(400, "sine", 0.04);
                  }}
                  onClick={() => {
                    setSelectedFolderId(leader.id);
                    handleOpenFinder(leader.id);
                  }}
                />
              );
            })}

            {/* Dynamic Interactive Windows */}
            {openWindows.map(win => {
              const member = leaders.find(l => l.id === win.leaderId);
              if (!member) return null;

              return (
                <MacOsWindow
                  key={win.id}
                  id={win.id}
                  type={win.type}
                  member={member}
                  onClose={() => handleCloseWindow(win.id)}
                  onMinimize={() => handleMinimizeWindow(win.id)}
                  onMaximizeToggle={() => handleMaximizeToggle(win.id)}
                  isMinimized={win.isMinimized}
                  isMaximized={win.isMaximized}
                  zIndex={win.zIndex}
                  onClick={() => focusWindow(win.id)}
                  onOpenFile={(fileType) => handleOpenFile(win.leaderId, fileType)}
                />
              );
            })}
          </>
        )}
      </div>

      {/* 6. macOS Bottom Dock */}
      <MacOsDock
        openApps={openWindows.map(w => {
          const m = leaders.find(l => l.id === w.leaderId);
          return {
            id: w.id,
            name: m ? m.name : "App",
            type: w.type,
            isMinimized: w.isMinimized
          };
        })}
        onRestoreApp={handleRestoreApp}
        onOpenFinder={() => {
          if (leaders.length > 0) {
            handleOpenFinder(leaders[0].id);
          }
        }}
        activeAppId={activeWindowId}
      />
    </div>
  );
}
