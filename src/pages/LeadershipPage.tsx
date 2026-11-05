import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import { useNavigate } from "react-router-dom";
import { MacOsMenuBar } from "@/components/leadership/MacOsMenuBar";
import { MacOsFolder } from "@/components/leadership/MacOsFolder";
import { MacOsWindow } from "@/components/leadership/MacOsWindow";
import MacOsBootScreen from "@/components/leadership/MacOsBootScreen";
import Dock, { type DockItemData } from "@/components/reactbits/Dock";
import {
  FolderOpen,
  FileText,
  Image as ImageIcon,
  FolderKanban,
  Calendar,
  BookOpen,
  Mail,
  Home,
  RefreshCw,
  Loader2,
  FolderX
} from "lucide-react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Draggable } from "gsap/Draggable";

// Register plugins once
gsap.registerPlugin(useGSAP, Draggable);

// Department accents shared with the folder/window label dots. Real rgba
// strings because the dock icon tiles also use these as canvas-safe fills.
const deptHex: Record<string, string> = {
  Robotics: "#F97316",
  IoT: "#3B82F6",
  Software: "#C2410C",
  Operations: "#EC4899",
  "Solar Energy": "#EAB308"
};
const getDeptColor = (dept: string | null) => deptHex[dept || ""] || "#7C3AED";
const getInitials = (name: string) =>
  name
    .split(" ")
    .map(w => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();


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
  const navigate = useNavigate();
  const [leaders, setLeaders] = useState<LeaderMember[]>([]);
  const [loading, setLoading] = useState(true);
  // True when the fetch itself failed (timeout, network, RLS). A successful
  // but empty roster is a different case and gets different copy.
  const [fetchFailed, setFetchFailed] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [isWide, setIsWide] = useState(() => window.innerWidth >= 900);
  
  // Draggable coordinates mapping
  const [folderPositions, setFolderPositions] = useState<{ [key: string]: { x: number; y: number } }>({});
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Custom trailing follower cursor
  // Custom trailing follower cursor using GSAP quickTo
  const containerRef = useRef<HTMLDivElement>(null);
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
      // Desktop grid (right-to-left, top-to-bottom). The vertical reserve keeps
      // the lowest folder row clear of the dock band so magnified dock items
      // never tuck a folder behind them.
      const maxRows = Math.max(4, Math.floor((h - 250) / folderHeight));
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
      setLoading(true);
      setFetchFailed(false);

      // Timeout fallback if Supabase hangs indefinitely
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Supabase timeout")), 4000)
      );

      // Use the leadership_members_public view which filters is_leadership=true.
      // (The view isn't in the generated DB types yet - cast the name only.)
      type FromTableArg = Parameters<typeof supabase.from>[0];
      const queryPromise = supabase
        .from("leadership_members_public" as unknown as FromTableArg)
        .select("*")
        .order("display_order", { ascending: true });

      const race = (await Promise.race([queryPromise, timeoutPromise])) as {
        data: LeaderMember[] | null;
        error: { message: string } | null;
      };
      const error = race.error;
      let data = race.data;

      // Temporary fix: If all members in DB have is_leadership=false, leadership_members_public is empty.
      // Fallback to team_members_public to ensure the real members show up.
      if (!error && (!data || data.length === 0)) {
        const fallbackRes = await supabase
          .from("team_members_public" as unknown as FromTableArg)
          .select("*")
          .order("display_order", { ascending: true });
        if (fallbackRes.data && fallbackRes.data.length > 0) {
          data = fallbackRes.data as unknown as LeaderMember[];
        }
      }

      const loaded = (error || !data) ? [] : data;
      setFetchFailed(Boolean(error));
      setLeaders(loaded);
      setFolderPositions(calculateFolderPositions(loaded));
    } catch (err) {
      console.warn("Supabase fetch failed or timed out:", err);
      setFetchFailed(true);
      setLeaders([]);
      setFolderPositions(calculateFolderPositions([]));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Deferred to a macrotask so the effect body itself stays setState-free.
    const t = setTimeout(fetchTeamMembers, 0);
    return () => clearTimeout(t);
  }, [fetchTeamMembers]);

  // Handle screen resize by shifting positions
  useEffect(() => {
    const handleResize = () => {
      setFolderPositions(calculateFolderPositions(leaders));
      setIsWide(window.innerWidth >= 900);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [leaders]);

  // Dock shortcut: navigate home first, then scroll to the section
  const goHomeSection = (section: string) => {
    navigate("/");
    setTimeout(() => {
      const el = document.getElementById(section);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }, 200);
  };

  // GSAP quickTo for highly performant custom trailing cursor
  // Skipped on reduced-motion and coarse-pointer (touch) devices
  useGSAP(() => {
    if (!cursorRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

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
  }, { scope: containerRef });

  // Animate cursor scale on hover changes
  useGSAP(() => {
    if (!cursorRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    gsap.to(cursorRef.current, {
      scale: cursorHovered ? 1.6 : 1,
      duration: 0.3,
      ease: "power2.out"
    });
  }, { dependencies: [cursorHovered], scope: containerRef });

  // System sounds synthesizer
  const playSystemSound = (freq = 440, type: OscillatorType = "sine", duration = 0.05) => {
    try {
      const AudioContextClass =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioContextClass();
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
    } catch { /* audio context may be unavailable or blocked */ }
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

  // Dock: one tile per member (badge = open windows, dot = running), then
  // curated system + site shortcuts. Windows genie-minimize into this dock.
  const openWindowCount = (leaderId: string) => openWindows.filter(w => w.leaderId === leaderId).length;

  const dockItems: DockItemData[] = [
    // Loading stand-in: one honest tile while the roster fetch races; it goes
    // away the moment real member tiles (or the empty state) take over.
    ...(loading
      ? [{ icon: <Loader2 className="size-5 text-white/60" />, label: "Loading members" }]
      : []),
    ...leaders.map<DockItemData>(leader => {
      const count = openWindowCount(leader.id);
      return {
        icon: leader.image_url ? (
          <img
            src={leader.image_url}
            alt=""
            draggable={false}
            className="size-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid size-full place-items-center font-display font-bold text-white overflow-hidden"
            style={{
              backgroundColor: getDeptColor(leader.department),
              fontSize: "calc(var(--dock-base) * 0.34)"
            }}
          >
            {getInitials(leader.name)}
          </span>
        ),
        label: leader.name,
        active: count > 0,
        badge: count > 0 ? count : undefined,
        onClick: () => handleOpenFinder(leader.id),
        menu: [
          { label: "Profile Finder", icon: <FolderOpen className="size-3.5 text-blue-400" />, onClick: () => handleOpenFinder(leader.id) },
          { label: "profile_pic.jpg", icon: <ImageIcon className="size-3.5 text-blue-400" />, onClick: () => handleOpenFile(leader.id, "photo") },
          { label: "Profile Note", icon: <FileText className="size-3.5 text-amber-300" />, onClick: () => handleOpenFile(leader.id, "bio") }
        ]
      };
    }),
    { separator: true },
    { icon: <Home className="size-5" />, label: "Home", onClick: () => navigate("/") },
    { icon: <RefreshCw className="size-5" />, label: "Restart", onClick: handleRestart }
  ];

  // The site shortcuts only earn dock space on roomy screens; on compact
  // breakpoints the Control Center drawer carries them instead.
  if (isWide) {
    dockItems.push(
      { separator: true },
      { icon: <FolderKanban className="size-5 text-blue-500" />, label: "Projects", onClick: () => goHomeSection("projects") },
      { icon: <Calendar className="size-5 text-green-500" />, label: "Events", onClick: () => goHomeSection("events") },
      { icon: <BookOpen className="size-5 text-yellow-500" />, label: "Blog", onClick: () => navigate("/blog") },
      { icon: <ImageIcon className="size-5 text-primary" />, label: "Gallery", onClick: () => goHomeSection("gallery") },
      { icon: <Mail className="size-5 text-red-500" />, label: "Contact", onClick: () => goHomeSection("contact") }
    );
  }

  return (
    <div 
      ref={containerRef}
      className="macos-desktop w-full h-screen overflow-hidden relative select-none bg-black flex flex-col"
      onClick={() => setSelectedFolderId(null)}
    >
      {/* Visually hidden H1 for accessibility/SEO - page UI is a desktop simulation */}
      <h1 className="sr-only">YICDVP Leadership - Committee Members & Coordinators</h1>

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
        description="Meet the YICDVP leadership panel in a fully featured macOS-style glass dashboard workspace."
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

      {/* 3. Wallpaper background: "YIC Desktop Dusk" from the FeralUI Gradient
          Builder (style flow, colours #070B13 #232059 #7C3AED #D946EF,
          soften 42, grain 7), exported once to WebP so it ships as ~12 KB
          and never re-renders on the client. The palette is the desktop's
          brand tie-in: the club's dusk accent colours, one step deeper. */}
      <div
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{
          backgroundImage: 'url("/assets/yic-dusk-wallpaper.webp")',
          filter: "brightness(0.95)"
        }}
      />
      {/* Soft overlay grids */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5 z-0" />

      {/* 4. Menu bar */}
      <MacOsMenuBar onRestart={handleRestart} />

      {/* 5. Desktop Workspace Area */}
      <main aria-label="Leadership desktop" className="flex-1 pt-7 pb-32 relative w-full h-full overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full gap-2 text-white/50 text-xs">
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            Connecting to the committee registry
          </div>
        ) : leaders.length === 0 ? (
          <EmptyDesktopHint
            fetchFailed={fetchFailed}
            onRetry={() => {
              if (loading) return;
              fetchTeamMembers();
            }}
          />
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
                  allMembers={leaders}
                  onOpenMember={handleOpenFinder}
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

        {/* 6. Dock: member launcher with windows-count badges, genie restore
            targets, and system + site shortcuts (long-press/right-click
            opens per-member file menus). Mounted outside the content
            branches so Home and Restart stay reachable while loading or
            after an empty fetch. */}
        <Dock
          items={dockItems}
          theme="dark"
          baseItemSize={44}
          magnification={62}
          distance={170}
          panelHeight={64}
          gap={isWide ? 10 : 6}
          roundness={0.55}
          className="z-[9998]"
        />
      </main>
    </div>
  );
}

// Finder-style empty state for a settled fetch with zero members. The card is
// a real informational surface (retry affordance, aria-live) rather than a
// silent blank desktop; styling stays inside the desktop fiction.
function EmptyDesktopHint({
  fetchFailed,
  onRetry
}: {
  fetchFailed: boolean;
  onRetry: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute inset-0 z-10 grid place-items-center px-4"
    >
      <div className="w-full max-w-sm overflow-hidden rounded-xl border border-white/10 bg-black/40 shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-300">
        <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/5 px-3 py-2.5">
          <span aria-hidden="true" className="size-3 rounded-full border border-[#E0443E] bg-[#FF5F56]" />
          <span aria-hidden="true" className="size-3 rounded-full border border-[#DEA123] bg-[#FFBD2E]" />
          <span aria-hidden="true" className="size-3 rounded-full border border-[#1AAB29] bg-[#27C93F]" />
          <span className="ml-2 truncate text-[11px] font-medium text-white/50">Finder</span>
        </div>
        <div className="px-5 py-6 text-center">
          <FolderX aria-hidden="true" className="mx-auto mb-3 size-10 text-white/25" />
          <p className="font-display text-sm font-semibold text-white/85">
            {fetchFailed ? "The committee registry didn't respond" : "No members on this desktop"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-white/50">
            {fetchFailed
              ? "Member folders couldn't load over this connection."
              : "Member folders appear here once the committee registry publishes them."}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="window-btn cursor-pointer mt-4 inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 transition-colors hover:bg-white/20"
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
