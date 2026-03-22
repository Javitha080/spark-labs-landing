import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { List, ChevronRight, ChevronDown, ChevronUp, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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

  useEffect(() => {
    // Intersection Observer for active heading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-80px 0px -70% 0px' }
    );

    // Observe actual DOM headings
    headings.forEach((_, index) => {
      const element = document.getElementById(`heading-${index}`);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
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
    <li className="relative">
      <div className="flex items-start gap-1">
        {hasChildren && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2.5 p-0.5 rounded hover:bg-muted/50 transition-colors shrink-0"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
        )}
        <button
          onClick={() => onItemClick(item.id)}
          className={cn(
            "text-sm text-left w-full py-2 px-3 rounded-lg transition-all duration-300 border border-transparent group",
            isActive
              ? "text-primary bg-primary/10 font-medium border-primary/20 shadow-sm"
              : hasActiveChild
                ? "text-foreground/80 bg-muted/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            !hasChildren && "ml-4"
          )}
        >
          <span className="relative">
            {item.text}
            {isActive && (
              <motion.div
                layoutId="activeIndicator"
                className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-4 bg-primary rounded-full"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </span>
        </button>
      </div>

      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="ml-4 mt-1 space-y-1 overflow-hidden border-l border-border/30 pl-2"
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
      <ul className="space-y-1">
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
    <ul className="space-y-1">
      {headings.map((heading) => (
        <li
          key={heading.id}
          data-toc-id={heading.id}
          style={{ paddingLeft: `${(heading.level - 1) * 12}px` }}
        >
          <button
            onClick={() => onItemClick(heading.id)}
            className={cn(
              "text-sm text-left w-full py-2 px-3 rounded-lg transition-all duration-300 relative overflow-hidden",
              "border-l-[3px]",
              activeId === heading.id
                ? "text-primary bg-primary/10 font-semibold border-l-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border-l-transparent"
            )}
          >
            {activeId === heading.id && (
              <motion.div
                layoutId="tocHighlight"
                className="absolute inset-0 bg-primary/5 rounded-lg"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <span className="relative z-10 block overflow-x-auto whitespace-nowrap toc-scroll">{heading.text}</span>
          </button>
        </li>
      ))}
    </ul>
  );
};

const handleScrollToHeading = (id: string, setActiveId: (id: string) => void, closeMobileMenu?: () => void) => {
  const element = document.getElementById(id);
  if (element) {
    const headerOffset = 100;
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth"
    });

    setActiveId(id);
    if (closeMobileMenu) closeMobileMenu();
  }
};

const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
};

const TableOfContents = ({ content, className, children }: TableOfContentsProps) => {
  const { headings, nestedHeadings, activeId, setActiveId, readProgress } = useHeadings(content);
  const [useNestedView, setUseNestedView] = useState(false);

  // Auto-scroll active TOC item into view
  useEffect(() => {
    if (!activeId) return;
    const tocItem = document.querySelector(`[data-toc-id="${activeId}"]`);
    if (tocItem) {
      tocItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeId]);

  // Scroll-aware positioning: sticky on load, fixed when user scrolls, absolute when reaching bottom
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tocRef = useRef<HTMLElement>(null);
  const [positionState, setPositionState] = useState<'static' | 'fixed' | 'absolute-bottom'>('static');
  const [fixedRight, setFixedRight] = useState(0);
  const [absoluteTop, setAbsoluteTop] = useState<number | undefined>(undefined);
  const { scrollY } = useScroll();

  // Calculate the right offset for fixed positioning based on wrapper's position
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

  // Manage positioning state dynamically based on wrapper height and viewport
  useMotionValueEvent(scrollY, "change", () => {
    if (wrapperRef.current && tocRef.current) {
      const wrapperRect = wrapperRef.current.getBoundingClientRect();
      const tocHeight = Math.max(tocRef.current.offsetHeight, 400); // Fallback height to be safe
      const topOffset = 140; // top-[140px] matches 140px

      // Check if we hit the bottom of the long content area
      const boundaryEl = document.getElementById('content-end-boundary');
      
      if (boundaryEl) {
        const boundaryRect = boundaryEl.getBoundingClientRect();
        
        // If the bottom of the fixed TOC (topOffset + tocHeight) would overlap the boundary top
        if (topOffset + tocHeight >= boundaryRect.top - 32) { 
          if (positionState !== 'absolute-bottom') {
            setPositionState('absolute-bottom');
            // Calculate relative offset: boundary's Y inside the document, minus wrapper's Y in document, minus TOC height
            const boundaryTopInDoc = boundaryRect.top + window.scrollY;
            const wrapperTopInDoc = wrapperRect.top + window.scrollY;
            setAbsoluteTop(boundaryTopInDoc - wrapperTopInDoc - tocHeight - 32);
          }
        } 
        // Check if we scrolled past the top of the wrapper
        else if (wrapperRect.top <= topOffset) {
          if (positionState !== 'fixed') {
            setPositionState('fixed');
            setFixedRight(window.innerWidth - wrapperRect.right);
          }
        } 
        // Otherwise, we are at the top (normal flow)
        else {
          if (positionState !== 'static') setPositionState('static');
        }
      } else {
        // Fallback if boundary not found
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

  // Find current heading index for progress
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
          ref={tocRef as any}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl glass-card border border-border/50 max-h-[calc(100vh-10rem)] overflow-hidden flex flex-col"
          aria-label="Table of Contents"
        >
          {/* Header with Progress */}
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <List className="h-5 w-5 text-primary" />
                <h4 className="font-bold text-base tracking-tight text-foreground">Contents</h4>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black text-primary shadow-sm flex items-center justify-center min-w-[3.5rem]">
                  <span>{currentIndex + 1}</span>
                  <span className="opacity-50 mx-1">/</span>
                  <span>{headings.length}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setUseNestedView(!useNestedView)}
                  title={useNestedView ? "Flat view" : "Nested view"}
                >
                  {useNestedView ? (
                    <List className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>

            {/* Reading Progress Bar Section */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
                <span>Reading Progress</span>
                <span className="text-primary">{Math.round(readProgress)}%</span>
              </div>
              <div className="relative h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-secondary to-accent shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]"
                  style={{ width: `${readProgress}%` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${readProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </div>

          {/* TOC List */}
          <ScrollArea className="flex-1 p-4 pb-2" type="auto">
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
          </ScrollArea>

          {/* Back to Top */}
          <div className="p-3 border-t border-border/50">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center gap-2 text-muted-foreground hover:text-primary"
              onClick={scrollToTop}
            >
              <ArrowUp className="h-4 w-4" />
              <span className="text-xs">Back to Top</span>
            </Button>
          </div>
        </motion.nav>
        {children}
      </motion.div>
    </div>
  );
};

export const MobileTableOfContents = ({ content }: { content: string }) => {
  const { headings, activeId, setActiveId, readProgress } = useHeadings(content);
  const [open, setOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Show back to top button after scrolling
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 500);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (headings.length === 0) return null;

  const currentIndex = Math.max(0, headings.findIndex(h => h.id === activeId));

  return (
    <div className="md:hidden fixed bottom-6 right-6 z-40 flex flex-col gap-3 items-end"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Back to Top Button */}
      <AnimatePresence>
        {showBackToTop && !open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <Button
              size="icon"
              variant="secondary"
              className="h-11 w-11 rounded-full shadow-lg border border-border/50"
              onClick={scrollToTop}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOC Button with Progress Ring */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 text-primary-foreground relative overflow-hidden"
          >
            {/* Progress Ring */}
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle
                cx="50%"
                cy="50%"
                r="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="opacity-20"
              />
              <circle
                cx="50%"
                cy="50%"
                r="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={2 * Math.PI * 24}
                strokeDashoffset={2 * Math.PI * 24 * (1 - readProgress / 100)}
                className="transition-all duration-300"
              />
            </svg>
            <List className="h-6 w-6 relative z-10" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="rounded-t-[2rem] h-[70vh] flex flex-col"
        >
          {/* Drag handle indicator */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>
          <SheetHeader className="text-left shrink-0 pb-6 border-b border-white/5">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2 text-2xl font-black tracking-tighter">
                <div className="p-2 rounded-xl bg-primary/10">
                  <List className="h-6 w-6 text-primary" />
                </div>
                Contents
              </SheetTitle>
              <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-black text-primary">
                {currentIndex + 1} <span className="opacity-50 mx-1">/</span> {headings.length}
              </div>
            </div>

            {/* Mobile Progress Bar */}
            <div className="mt-6 space-y-3">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <span>Reading Progress</span>
                <span className="text-primary">{Math.round(readProgress)}%</span>
              </div>
              <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-secondary to-accent"
                  style={{ width: `${readProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 mt-4">
            <div className="pr-4 pb-4">
              <TocList
                headings={headings}
                activeId={activeId}
                onItemClick={(id) => handleScrollToHeading(id, setActiveId, () => setOpen(false))}
              />
              <div className="h-4" />
            </div>
          </ScrollArea>

          {/* Mobile Back to Top */}
          <div className="shrink-0 pt-4 border-t border-border/50 mt-4">
            <Button
              variant="outline"
              className="w-full justify-center gap-2"
              onClick={() => {
                scrollToTop();
                setOpen(false);
              }}
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
