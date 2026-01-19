import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { List, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
  className?: string;
}

export const useHeadings = (content: string) => {
  const [headings, setHeadings] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    // Parse headings from HTML content
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const headingElements = doc.querySelectorAll('h1, h2, h3');

    const items: TocItem[] = [];
    headingElements.forEach((heading, index) => {
      const id = `heading-${index}`;
      const text = heading.textContent || '';
      const level = parseInt(heading.tagName[1]);

      if (text.trim()) {
        items.push({ id, text, level });
      }
    });

    setHeadings(items);
  }, [content]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-100px 0px -80% 0px' }
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

  return { headings, activeId, setActiveId };
};

const TocList = ({ headings, activeId, onItemClick }: { headings: TocItem[], activeId: string, onItemClick: (id: string) => void }) => {
  if (headings.length === 0) return null;

  return (
    <ul className="space-y-1">
      {headings.map((heading) => (
        <li
          key={heading.id}
          style={{ paddingLeft: `${(heading.level - 1) * 12}px` }}
        >
          <button
            onClick={() => onItemClick(heading.id)}
            className={cn(
              "text-sm text-left w-full py-2 px-3 rounded-lg transition-all duration-200 border border-transparent",
              activeId === heading.id
                ? "text-primary bg-primary/10 font-medium border-primary/10 translate-x-1"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {heading.text}
          </button>
        </li>
      ))}
    </ul>
  );
};

const handleScrollToHeading = (id: string, setActiveId: (id: string) => void, closeMobileMenu?: () => void) => {
  const element = document.getElementById(id);
  if (element) {
    // Offset for fixed header (approx 100px)
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

const TableOfContents = ({ content, className }: TableOfContentsProps) => {
  const { headings, activeId, setActiveId } = useHeadings(content);

  if (headings.length === 0) return null;

  return (
    <motion.nav
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className={cn(
        "sticky top-32 p-6 rounded-2xl glass-card border border-border/50 max-h-[calc(100vh-140px)] overflow-auto custom-scrollbar",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border/50">
        <List className="h-5 w-5 text-primary" />
        <h4 className="font-bold text-lg">Table of Contents</h4>
      </div>

      <TocList headings={headings} activeId={activeId} onItemClick={(id) => handleScrollToHeading(id, setActiveId)} />
    </motion.nav>
  );
};

export const MobileTableOfContents = ({ content }: { content: string }) => {
  const { headings, activeId, setActiveId } = useHeadings(content);
  const [open, setOpen] = useState(false);

  if (headings.length === 0) return null;

  return (
    <div className="lg:hidden fixed bottom-6 right-6 z-40">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button size="icon" className="h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 text-primary-foreground btn-glow">
            <List className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-[2rem] h-[80vh]">
          <SheetHeader className="mb-6 text-left">
            <SheetTitle className="flex items-center gap-2 text-xl">
              <List className="h-5 w-5 text-primary" />
              Table of Contents
            </SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto h-full pb-20 pr-4 custom-scrollbar">
            <TocList
              headings={headings}
              activeId={activeId}
              onItemClick={(id) => handleScrollToHeading(id, setActiveId, () => setOpen(false))}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default TableOfContents;
