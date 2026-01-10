import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { List } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
  className?: string;
}

const TableOfContents = ({ content, className }: TableOfContentsProps) => {
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

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (headings.length === 0) {
    return null;
  }

  return (
    <motion.nav 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className={cn(
        "sticky top-24 p-6 rounded-2xl glass-card glow-border max-h-[calc(100vh-120px)] overflow-auto",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/50">
        <List className="h-5 w-5 text-primary" />
        <h4 className="font-semibold text-foreground">Table of Contents</h4>
      </div>
      
      <ul className="space-y-2">
        {headings.map((heading) => (
          <li 
            key={heading.id}
            style={{ paddingLeft: `${(heading.level - 1) * 12}px` }}
          >
            <button
              onClick={() => scrollToHeading(heading.id)}
              className={cn(
                "text-sm text-left w-full py-1.5 px-2 rounded-lg transition-all hover:bg-primary/10",
                activeId === heading.id 
                  ? "text-primary bg-primary/5 font-medium" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {heading.text}
            </button>
          </li>
        ))}
      </ul>
    </motion.nav>
  );
};

export default TableOfContents;
