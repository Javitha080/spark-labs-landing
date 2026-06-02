import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import { MacOsMenuBar } from "@/components/leadership/MacOsMenuBar";
import { MacOsFolder } from "@/components/leadership/MacOsFolder";
import { MacOsWindow } from "@/components/leadership/MacOsWindow";
import MacOsBootScreen from "@/components/leadership/MacOsBootScreen";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Draggable } from "gsap/Draggable";

// Register plugins once
gsap.registerPlugin(useGSAP, Draggable);


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


export default function LeadershipPage() {
  const [leaders, setLeaders] = useState<LeaderMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBooting, setIsBooting] = useState(true);
  
  // Draggable coordinates mapping
  const [folderPositions, setFolderPositions] = useState<{ [key: string]: { x: number; y: number } }>({});
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Custom trailing follower cursor
  // Custom trailing follower cursor using GSAP quickTo
  const cursorRef = useRef<HTMLDivElement>(null);
  const [cursorHovered, setCursorHovered] = useState(false);

  // Stacking order manager
  const maxZIndex = useRef(10);

  // Multi-window state manager
  const [openWindows, setOpenWindows] = useState<OpenWindow[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);

  // Calculate folder coordinates synchronously to prevent lifecycle drag offsets
  const calculateFolderPositions = (loadedLeaders: LeaderMember[]) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const positions: { [key: string]: { x: number; y: number } } = {};
    
    const isMobile = w < 640;
    const folderWidth = 100;
    const folderHeight = 110;
    
    if (isMobile) {
      // Mobile iOS-style grid (top-to-bottom, left-to-right)
      const cols = Math.max(3, Math.floor(w / folderWidth));
      const padding = (w - (cols * folderWidth)) / 2;
      
      loadedLeaders.forEach((leader, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        positions[leader.id] = {
          x: padding + (col * folderWidth),
          y: 35 + (row * folderHeight)
        };
      });
    } else {
      // Desktop grid (right-to-left, top-to-bottom)
      const maxRows = Math.max(4, Math.floor((h - 150) / folderHeight));
      loadedLeaders.forEach((leader, index) => {
        const row = index % maxRows;
        const col = Math.floor(index / maxRows);
        positions[leader.id] = {
          x: w - 120 - (col * 105),
          y: 60 + (row * folderHeight)
        };
      });
    }
    
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

      let { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

      // Temporary fix: If all members in DB have is_leadership=false, leadership_members_public is empty.
      // Fallback to team_members_public to ensure the real members show up.
      if (!error && (!data || data.length === 0)) {
        const fallbackRes = await supabase.from("team_members_public" as any).select("*").order("display_order", { ascending: true });
        if (fallbackRes.data && fallbackRes.data.length > 0) {
          data = fallbackRes.data;
        }
      }

      const loaded = (error || !data) ? [] : (data as unknown as LeaderMember[]);
      setLeaders(loaded);
      setFolderPositions(calculateFolderPositions(loaded));
    } catch (err) {
      console.warn("Supabase fetch failed or timed out:", err);
      setLeaders([]);
      setFolderPositions(calculateFolderPositions([]));
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

  // GSAP quickTo for highly performant custom trailing cursor
  useGSAP(() => {
    if (!cursorRef.current) return;

    // quickTo creates highly optimized setter functions for properties
    const xTo = gsap.quickTo(cursorRef.current, "x", { duration: 0.4, ease: "power3" });
    const yTo = gsap.quickTo(cursorRef.current, "y", { duration: 0.4, ease: "power3" });

    const updateMousePos = (e: MouseEvent) => {
      // Offset by 8px to center the 16x16 cursor
      xTo(e.clientX - 8);
      yTo(e.clientY - 8);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.closest && target.closest("a, button, .cursor-pointer, input, select, .window-btn")) {
        setCursorHovered(true);
      } else {
        setCursorHovered(false);
      }
    };

    window.addEventListener("mousemove", updateMousePos);
    window.addEventListener("mouseover", handleMouseOver);

    return () => {
      window.removeEventListener("mousemove", updateMousePos);
      window.removeEventListener("mouseover", handleMouseOver);
    };
  }, []);

  // Animate cursor scale on hover changes
  useGSAP(() => {
    if (!cursorRef.current) return;
    gsap.to(cursorRef.current, {
      scale: cursorHovered ? 1.6 : 1,
      duration: 0.3,
      ease: "power2.out"
    });
  }, [cursorHovered]);

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
    
    setOpenWindows(prev => {
      if (prev.find(w => w.id === finderId)) {
        maxZIndex.current += 1;
        return prev.map(w => w.id === finderId ? { ...w, zIndex: maxZIndex.current, isMinimized: false } : w);
      }
      maxZIndex.current += 1;
      return [...prev, {
        id: finderId,
        type: "finder",
        leaderId,
        isMinimized: false,
        isMaximized: false,
        zIndex: maxZIndex.current
      }];
    });
    
    setActiveWindowId(finderId);
    playSystemSound(600, "triangle", 0.06);
  };

  const handleOpenFile = (leaderId: string, fileType: "photo" | "bio") => {
    const winId = `${fileType}-${leaderId}`;
    
    setOpenWindows(prev => {
      if (prev.find(w => w.id === winId)) {
        maxZIndex.current += 1;
        return prev.map(w => w.id === winId ? { ...w, zIndex: maxZIndex.current, isMinimized: false } : w);
      }
      maxZIndex.current += 1;
      return [...prev, {
        id: winId,
        type: fileType === "photo" ? "preview" : "textedit",
        leaderId,
        isMinimized: false,
        isMaximized: false,
        zIndex: maxZIndex.current
      }];
    });

    setActiveWindowId(winId);
    playSystemSound(700, "sine", 0.08);
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
      {/* Visually hidden H1 for accessibility/SEO — page UI is a desktop simulation */}
      <h1 className="sr-only">YICDVP Leadership — Committee Members & Coordinators</h1>

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
        title="Leadership Desktop | YICDVP"
        description="Meet the YICDVP leadership panel in a fully featured macOS liquid-glass dashboard workspace."
        path="/leadership"
      />

      {/* 1. Loading/Booting Animation Screen */}
      {isBooting && <MacOsBootScreen onComplete={() => setIsBooting(false)} />}

      {/* 2. Custom Liquid Glass Cursor Follower trailing behind real pointer */}
      <div
        ref={cursorRef}
        className="hidden md:block pointer-events-none fixed top-0 left-0 size-4 rounded-full border border-white/40 bg-white/5 mix-blend-difference z-[999999] will-change-transform"
        style={{ transform: "translate(-100px, -100px)" }}
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
      <main aria-label="Leadership desktop" className="flex-1 pt-7 pb-20 relative w-full h-full overflow-hidden">
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
      </main>
    </div>
  );
}
