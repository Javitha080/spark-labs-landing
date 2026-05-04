import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Share2,
  Twitter,
  Facebook,
  Linkedin,
  Link2,
  Check,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SocialShareProps {
  /** Full URL to share (e.g. https://dvpyic.dpdns.org/blog/my-post) */
  url: string;
  /** Title/headline text used in share dialogs */
  title: string;
  /** Optional short description for platforms that support it */
  description?: string;
  /** Visual variant */
  variant?: "inline" | "floating";
  /** Additional CSS classes */
  className?: string;
}

interface ShareTarget {
  name: string;
  icon: React.ElementType;
  color: string;
  hoverBg: string;
  getUrl: (url: string, title: string, desc: string) => string;
}

const shareTargets: ShareTarget[] = [
  {
    name: "Twitter / X",
    icon: Twitter,
    color: "text-sky-400",
    hoverBg: "hover:bg-sky-500/10",
    getUrl: (url, title) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
  },
  {
    name: "Facebook",
    icon: Facebook,
    color: "text-blue-500",
    hoverBg: "hover:bg-blue-500/10",
    getUrl: (url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    name: "LinkedIn",
    icon: Linkedin,
    color: "text-blue-400",
    hoverBg: "hover:bg-blue-400/10",
    getUrl: (url, title, desc) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    name: "WhatsApp",
    icon: MessageCircle,
    color: "text-green-500",
    hoverBg: "hover:bg-green-500/10",
    getUrl: (url, title) =>
      `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
  },
];

export default function SocialShare({
  url,
  title,
  description = "",
  variant = "inline",
  className = "",
}: SocialShareProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(variant === "inline");

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openShare = (target: ShareTarget) => {
    const shareUrl = target.getUrl(url, title, description);
    window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=400");
  };

  // Floating pill style — single button that expands on click
  if (variant === "floating") {
    return (
      <div className={`fixed bottom-24 right-6 z-40 ${className}`}>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="absolute bottom-16 right-0 flex flex-col gap-2 items-end"
            >
              {shareTargets.map((target, i) => (
                <motion.div
                  key={target.name}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openShare(target)}
                        className={`w-11 h-11 rounded-xl border-border/50 bg-background/80 backdrop-blur-lg ${target.hoverBg} transition-all shadow-lg`}
                        aria-label={`Share on ${target.name}`}
                      >
                        <target.icon className={`w-5 h-5 ${target.color}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">{target.name}</TooltipContent>
                  </Tooltip>
                </motion.div>
              ))}

              {/* Copy link button */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: shareTargets.length * 0.05 }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copyLink}
                      className="w-11 h-11 rounded-xl border-border/50 bg-background/80 backdrop-blur-lg hover:bg-primary/10 transition-all shadow-lg"
                      aria-label="Copy link"
                    >
                      {copied ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <Link2 className="w-5 h-5 text-muted-foreground" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    {copied ? "Copied!" : "Copy link"}
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          onClick={() => setExpanded(!expanded)}
          size="icon"
          className="w-12 h-12 rounded-xl bg-primary text-primary-foreground shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
          aria-label="Share"
        >
          <Share2 className={`w-5 h-5 transition-transform ${expanded ? "rotate-45" : ""}`} />
        </Button>
      </div>
    );
  }

  // Inline horizontal bar style
  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mr-1 select-none">
        Share
      </span>

      {shareTargets.map((target) => (
        <Tooltip key={target.name}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openShare(target)}
              className={`w-9 h-9 rounded-xl ${target.hoverBg} transition-all`}
              aria-label={`Share on ${target.name}`}
            >
              <target.icon className={`w-4 h-4 ${target.color}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{target.name}</TooltipContent>
        </Tooltip>
      ))}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={copyLink}
            className="w-9 h-9 rounded-xl hover:bg-primary/10 transition-all"
            aria-label="Copy link"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Link2 className="w-4 h-4 text-muted-foreground" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{copied ? "Copied!" : "Copy link"}</TooltipContent>
      </Tooltip>
    </div>
  );
}
