import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { List, ChevronRight, ArrowUp, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TocItem {
  id: string;
  text: string;
  level: number;
  children?: TocItem[];
}

interface TableOfContentsProps {
  content: string;
  className?: string;
  children?: React.ReactNode;
}

// Helper to build nested TOC structure
const buildNestedToc = (items: TocItem[]): TocItem[] => {
  const result: TocItem[] = [];
  const stack: TocItem[] = [];

  items.forEach(item => {
    const newItem = { ...item, children: [] };

    while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      result.push(newItem);
    } else {
      stack[stack.length - 1].children = stack[stack.length - 1].children || [];
      stack[stack.length - 1].children!.push(newItem);
    }

    stack.push(newItem);
  });

  return result;
};

export const useHeadings = (content: string) => {
  const [activeId, setActiveId] = useState<string>('');
  const [readProgress, setReadProgress] = useState(0);

  const headings = useMemo(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');

    const items: TocItem[] = [];
    headingElements.forEach((heading, index) => {
      const id = `heading-${index}`;
      const text = heading.textContent || '';
      const level = parseInt(heading.tagName[1]);

      if (text.trim() && level <= 3) {
        items.push({ id, text, level });
      }
    });

    return items;
  }, [content]);

  // Accurate scroll-based active section tracking
  useEffect(() => {
    if (headings.length === 0) return;

    const HEADER_OFFSET = 140; // px from top — accounts for sticky header

    const getActiveHeading = () => {
      const scrollY = window.scrollY;

      // Collect all heading positions from the live DOM
      const positions = headings
        .map(h => {
          const el = document.getElementById(h.id);
          if (!el) return null;
          return {
            id: h.id,
            top: el.getBoundingClientRect().top + scrollY,
          };
        })
        .filter(Boolean) as { id: string; top: number }[];

      if (positions.length === 0) return;

      // Find the last heading whose top is at or above the scroll trigger line
      const triggerLine = scrollY + HEADER_OFFSET + 8;

      let activeIndex = -1;
      for (let i = 0; i < positions.length; i++) {
        if (positions[i].top <= triggerLine) {
          activeIndex = i;
        } else {
          break;
        }
      }

      // Before any heading — highlight the first one
      if (activeIndex === -1) activeIndex = 0;

      const newId = positions[activeIndex].id;
      setActiveId(prev => (prev !== newId ? newId : prev));
    };

    // Run once on mount (after DOM paints)
    const raf = requestAnimationFrame(getActiveHeading);

    const onScroll = () => {
      requestAnimationFrame(getActiveHeading);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, [headings]);

  // Reading progress tracker
  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setReadProgress(Math.min(100, Math.max(0, progress)));
    };

    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();

    return () => window.removeEventListener('scroll', updateProgress);
  }, []);

  const nestedHeadings = useMemo(() => buildNestedToc(headings), [headings]);

  return { headings, nestedHeadings, activeId, setActiveId, readProgress };
};

// ─── Flat TOC Item ────────────────────────────────────────────────────────────

interface FlatTocItemProps {
  heading: TocItem;
  activeId: string;
  index: number;
  total: number;
  onItemClick: (id: string) => void;
}

const FlatTocItem = ({ heading, activeId, index, total, onItemClick }: FlatTocItemProps) => {
  const isActive = activeId === heading.id;
  const indentPx = (heading.level - 1) * 14;

  return (
    <li
      className="relative"
      data-toc-id={heading.id}
    >
      {/* Vertical timeline line */}
      <div
        className="absolute left-0 top-0 bottom-0 w-px"
        style={{ left: `${indentPx + 6}px` }}
      >
        {index < total - 1 && (
          <div className={cn(
            "w-full h-full transition-colors duration-500",
            isActive ? "bg-primary/40" : "bg-border/40"
          )} />
        )}
      </div>

      <button
        onClick={() => onItemClick(heading.id)}
        className={cn(
          "relative group w-full text-left py-1.5 pr-3 rounded-lg transition-all duration-300 text-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        )}
        style={{ paddingLeft: `${indentPx + 20}px` }}
      >
        {/* Timeline dot */}
        <span
          className={cn(
            "absolute top-1/2 -translate-y-1/2 rounded-full transition-all duration-300",
            isActive
              ? "w-2.5 h-2.5 bg-primary shadow-[0_0_8px_2px] shadow-primary/40 ring-2 ring-primary/30"
              : "w-1.5 h-1.5 bg-muted-foreground/30 group-hover:bg-primary/50 group-hover:w-2 group-hover:h-2"
          )}
          style={{ left: `${indentPx + 2}px` }}
        />

        {/* Active pill background — shared layoutId animates between items */}
        {isActive && (
          <motion.span
            layoutId="toc-active-pill"
            className="absolute inset-0 rounded-lg bg-primary/10 border border-primary/20"
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
          />
        )}

        <span className={cn(
          "relative z-10 block leading-snug transition-colors duration-200",
          isActive
            ? "text-primary font-semibold"
            : "text-muted-foreground group-hover:text-foreground",
          heading.level === 1 && "font-semibold",
          heading.level >= 3 && "text-xs"
        )}>
          {heading.text}
        </span>
      </button>
    </li>
  );
};

// ─── Nested TOC Item ──────────────────────────────────────────────────────────

interface TocItemComponentProps {
  item: TocItem;
  activeId: string;
  onItemClick: (id: string) => void;
  isNested?: boolean;
}

const TocItemComponent = ({ item, activeId, onItemClick, isNested = false }: TocItemComponentProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = item.children && item.children.length > 0;
  const isActive = activeId === item.id;
  const hasActiveChild = item.children?.some(child =>
    child.id === activeId || child.children?.some(c => c.id === activeId)
  );

  return (
    <li className="relative" data-toc-id={item.id}>
      <div className="flex items-start gap-1">
        {hasChildren && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 p-0.5 rounded hover:bg-muted/50 transition-colors shrink-0"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            </motion.div>
          </button>
        )}
        <button
          onClick={() => onItemClick(item.id)}
          className={cn(
            "text-sm text-left w-full py-2 px-3 rounded-lg transition-all duration-300 relative group",
            isActive
              ? "text-primary font-semibold"
              : hasActiveChild
                ? "text-foreground/80"
                : "text-muted-foreground hover:text-foreground",
            !hasChildren && "ml-4"
          )}
        >
          {isActive && (
            <motion.span
              layoutId="toc-active-pill"
              className="absolute inset-0 rounded-lg bg-primary/10 border border-primary/20"
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
            />
          )}
          <span className="relative z-10">{item.text}</span>
        </button>
      </div>

      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="ml-4 mt-1 space-y-0.5 overflow-hidden border-l border-border/30 pl-2"
          >
            {item.children!.map((child) => (
              <TocItemComponent
                key={child.id}
                item={child}
                activeId={activeId}
                onItemClick={onItemClick}
                isNested
              />
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  );
};

// ─── Flat/Nested List ─────────────────────────────────────────────────────────

const TocList = ({
  headings,
  activeId,
  onItemClick,
  nested = false
}: {
  headings: TocItem[],
  activeId: string,
  onItemClick: (id: string) => void,
  nested?: boolean
}) => {
  if (headings.length === 0) return null;

  if (nested) {
    return (
      <ul className="space-y-0.5">
        {headings.map((item) => (
          <TocItemComponent
            key={item.id}
            item={item}
            activeId={activeId}
            onItemClick={onItemClick}
          />
        ))}
      </ul>
    );
  }

  return (
    <ul className="space-y-0.5 relative">
      {headings.map((heading, index) => (
        <FlatTocItem
          key={heading.id}
          heading={heading}
          activeId={activeId}
          index={index}
          total={headings.length}
          onItemClick={onItemClick}
        />
      ))}
    </ul>
  );
};

// ─── Scroll helpers ───────────────────────────────────────────────────────────

const handleScrollToHeading = (id: string, setActiveId: (id: string) => void, closeMobileMenu?: () => void) => {
  const element = document.getElementById(id);
  if (element) {
    const headerOffset = 120;
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

    window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    setActiveId(id);
    if (closeMobileMenu) closeMobileMenu();
  }
};

const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });


// ─── Auto-scroll the TOC list to the active item ─────────────────────────────

const useTocAutoScroll = (activeId: string, containerRef: React.RefObject<HTMLDivElement>) => {
  useEffect(() => {
    if (!activeId || !containerRef.current) return;
    const item = containerRef.current.querySelector(`[data-toc-id="${activeId}"]`);
    if (item) {
      item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeId, containerRef]);
};

// ─── Desktop TableOfContents ──────────────────────────────────────────────────

const TableOfContents = ({ content, className, children }: TableOfContentsProps) => {
  const { headings, nestedHeadings, activeId, setActiveId, readProgress } = useHeadings(content);
  const [useNestedView, setUseNestedView] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  useTocAutoScroll(activeId, scrollAreaRef);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const tocRef = useRef<HTMLElement | null>(null);
  const [positionState, setPositionState] = useState<'static' | 'fixed' | 'absolute-bottom'>('static');
  const [fixedRight, setFixedRight] = useState(0);
  const [absoluteTop, setAbsoluteTop] = useState<number | undefined>(undefined);
  const { scrollY } = useScroll();

  useEffect(() => {
    const updatePosition = () => {
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        setFixedRight(window.innerWidth - rect.right);
      }
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [headings]);

  useMotionValueEvent(scrollY, "change", () => {
    if (wrapperRef.current && tocRef.current) {
      const wrapperRect = wrapperRef.current.getBoundingClientRect();
      const tocHeight = Math.max(tocRef.current.offsetHeight, 400);
      const topOffset = 140;

      const boundaryEl = document.getElementById('content-end-boundary');

      if (boundaryEl) {
        const boundaryRect = boundaryEl.getBoundingClientRect();

        if (topOffset + tocHeight >= boundaryRect.top - 32) {
          if (positionState !== 'absolute-bottom') {
            setPositionState('absolute-bottom');
            const boundaryTopInDoc = boundaryRect.top + window.scrollY;
            const wrapperTopInDoc = wrapperRect.top + window.scrollY;
            setAbsoluteTop(boundaryTopInDoc - wrapperTopInDoc - tocHeight - 32);
          }
        } else if (wrapperRect.top <= topOffset) {
          if (positionState !== 'fixed') {
            setPositionState('fixed');
            setFixedRight(window.innerWidth - wrapperRect.right);
          }
        } else {
          if (positionState !== 'static') setPositionState('static');
        }
      } else {
        if (wrapperRect.bottom <= topOffset + tocHeight) {
          if (positionState !== 'absolute-bottom') setPositionState('absolute-bottom');
        } else if (wrapperRect.top <= topOffset) {
          if (positionState !== 'fixed') {
            setPositionState('fixed');
            setFixedRight(window.innerWidth - wrapperRect.right);
          }
        } else {
          if (positionState !== 'static') setPositionState('static');
        }
      }
    }
  });

  if (headings.length === 0) return null;

  const currentIndex = Math.max(0, headings.findIndex(h => h.id === activeId));

  return (
    <div ref={wrapperRef} className="w-full h-full relative">
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={cn(
          "flex flex-col gap-4 w-72",
          positionState === 'fixed' ? "fixed top-[140px] z-30" :
          positionState === 'absolute-bottom' ? "absolute z-30" :
          "sticky top-[140px]",
          className
        )}
        style={{
          ...(positionState === 'fixed' ? { right: `${fixedRight}px` } : {}),
          ...(positionState === 'absolute-bottom' ? { top: `${absoluteTop}px` } : {})
        }}
      >
        <motion.nav
          ref={tocRef}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 260, damping: 28 }}
          className="rounded-2xl glass-card border border-border/50 max-h-[calc(100vh-10rem)] overflow-hidden flex flex-col"
          aria-label="Table of Contents"
        >
          {/* ── Header ── */}
          <div className="p-4 border-b border-border/50 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <BookOpen className="h-4 w-4 text-primary" />
                </div>
                <h4 className="font-bold text-sm tracking-tight text-foreground">Contents</h4>
              </div>
              <div className="flex items-center gap-2">
                {/* Section counter */}
                <motion.div
                  key={currentIndex}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black text-primary flex items-center gap-0.5 min-w-[3.5rem] justify-center"
                >
                  <span>{currentIndex + 1}</span>
                  <span className="opacity-40">/</span>
                  <span>{headings.length}</span>
                </motion.div>
                {/* View toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setUseNestedView(!useNestedView)}
                  title={useNestedView ? "Flat view" : "Nested view"}
                >
                  <motion.div
                    animate={{ rotate: useNestedView ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </motion.div>
                </Button>
              </div>
            </div>

            {/* ── Reading Progress bar ── */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                <span>Progress</span>
                <motion.span
                  key={Math.round(readProgress)}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-primary tabular-nums"
                >
                  {Math.round(readProgress)}%
                </motion.span>
              </div>
              <div className="relative h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-secondary to-accent"
                  style={{ width: `${readProgress}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
                {/* Shimmer */}
                <motion.div
                  className="absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full"
                  animate={{ left: [`-10%`, `110%`] }}
                  transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
                />
              </div>
            </div>
          </div>

          {/* ── TOC list ── */}
          <ScrollArea className="flex-1 p-3 pb-2" type="auto">
            <div ref={scrollAreaRef}>
              {useNestedView ? (
                <TocList
                  headings={nestedHeadings}
                  activeId={activeId}
                  onItemClick={(id) => handleScrollToHeading(id, setActiveId)}
                  nested
                />
              ) : (
                <TocList
                  headings={headings}
                  activeId={activeId}
                  onItemClick={(id) => handleScrollToHeading(id, setActiveId)}
                />
              )}
              <div className="h-4" />
            </div>
          </ScrollArea>

          {/* ── Back to Top ── */}
          <div className="p-3 border-t border-border/50 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center gap-2 text-muted-foreground hover:text-primary text-xs"
              onClick={scrollToTop}
            >
              <ArrowUp className="h-3.5 w-3.5" />
              Back to Top
            </Button>
          </div>
        </motion.nav>
        {children}
      </motion.div>
    </div>
  );
};

// ─── Mobile TableOfContents ───────────────────────────────────────────────────

export const MobileTableOfContents = ({ content }: { content: string }) => {
  const { headings, activeId, setActiveId, readProgress } = useHeadings(content);
  const [open, setOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 500);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (headings.length === 0) return null;

  const currentIndex = Math.max(0, headings.findIndex(h => h.id === activeId));
  const circumference = 2 * Math.PI * 22;

  return (
    <div
      className="md:hidden fixed bottom-6 right-6 z-40 flex flex-col gap-3 items-end"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Back to Top */}
      <AnimatePresence>
        {showBackToTop && !open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 12 }}
            transition={{ type: "spring", stiffness: 340, damping: 26 }}
          >
            <Button
              size="icon"
              variant="secondary"
              className="h-11 w-11 rounded-full shadow-lg border border-border/50 backdrop-blur-md"
              onClick={scrollToTop}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOC FAB with animated progress ring */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <motion.button
            whileHover={{ scale: 1.07 }}
            whileTap={{ scale: 0.94 }}
            className="relative h-14 w-14 rounded-full shadow-xl bg-primary text-primary-foreground flex items-center justify-center overflow-visible"
          >
            {/* SVG progress ring */}
            <svg
              className="absolute inset-0 w-full h-full -rotate-90 overflow-visible"
              viewBox="0 0 56 56"
            >
              {/* Track */}
              <circle cx="28" cy="28" r="22" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-20" />
              {/* Progress */}
              <motion.circle
                cx="28" cy="28" r="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                animate={{ strokeDashoffset: circumference * (1 - readProgress / 100) }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </svg>
            <List className="h-5 w-5 relative z-10" />
          </motion.button>
        </SheetTrigger>

        <SheetContent side="bottom" className="rounded-t-[2rem] h-[72vh] flex flex-col p-0 overflow-hidden">
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/25" />
          </div>

          <SheetHeader className="text-left shrink-0 px-6 pb-4 border-b border-border/30">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2.5 text-xl font-black tracking-tighter">
                <div className="p-1.5 rounded-xl bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                Contents
              </SheetTitle>
              <motion.div
                key={currentIndex}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-black text-primary"
              >
                {currentIndex + 1} <span className="opacity-40 mx-0.5">/</span> {headings.length}
              </motion.div>
            </div>

            {/* Progress */}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <span>Reading Progress</span>
                <span className="text-primary">{Math.round(readProgress)}%</span>
              </div>
              <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-secondary to-accent"
                  style={{ width: `${readProgress}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 px-4 pt-2">
            <div className="pb-4">
              <TocList
                headings={headings}
                activeId={activeId}
                onItemClick={(id) => handleScrollToHeading(id, setActiveId, () => setOpen(false))}
              />
              <div className="h-4" />
            </div>
          </ScrollArea>

          <div className="shrink-0 px-4 pt-3 pb-5 border-t border-border/30">
            <Button
              variant="outline"
              className="w-full justify-center gap-2"
              onClick={() => { scrollToTop(); setOpen(false); }}
            >
              <ArrowUp className="h-4 w-4" />
              Back to Top
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default TableOfContents;
