import { useState, useCallback } from "react";
import {
  Share2, Copy, Check, Twitter, Facebook, Linkedin, MessageCircle,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { trackBlogShare } from "@/lib/blogAnalytics";
import { cn } from "@/lib/utils";

interface PostShareProps {
  slug: string;
  title: string;
  /** Excerpt / summary passed to platforms that support text */
  description?: string | null;
  /** "menu" = compact dropdown trigger; "inline" = explicit icon row */
  variant?: "menu" | "inline";
  className?: string;
}

interface ShareTarget {
  name: string;
  icon: React.ElementType;
  tone: string; // icon color class
  hover: string; // hover background class
  getUrl: (url: string, title: string) => string;
}

// One source of truth for targets - menu and inline variants share it.
const TARGETS: ShareTarget[] = [
  {
    name: "WhatsApp",
    icon: MessageCircle,
    tone: "text-emerald-500",
    hover: "hover:bg-emerald-500/10",
    getUrl: (url, title) =>
      `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
  },
  {
    name: "X",
    icon: Twitter,
    tone: "text-sky-400",
    hover: "hover:bg-sky-500/10",
    getUrl: (url, title) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
  },
  {
    name: "Facebook",
    icon: Facebook,
    tone: "text-blue-500",
    hover: "hover:bg-blue-500/10",
    getUrl: (url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    name: "LinkedIn",
    icon: Linkedin,
    tone: "text-blue-400",
    hover: "hover:bg-blue-400/10",
    getUrl: (url) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
];

/** Copy a URL to the clipboard with a legacy fallback for insecure contexts. */
async function copyUrl(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}

export default function PostShare({
  slug,
  title,
  description,
  variant = "menu",
  className,
}: PostShareProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/blog/${slug}`;
  const shareText = description || title;

  const share = useCallback((target: ShareTarget) => {
    trackBlogShare(slug);
    window.open(
      target.getUrl(shareUrl, shareText),
      "_blank",
      "noopener,noreferrer,width=600,height=400",
    );
  }, [slug, shareUrl, shareText]);

  const nativeShare = useCallback(async () => {
    trackBlogShare(slug);
    await navigator.share({ title, text: shareText, url: shareUrl });
  }, [slug, title, shareText, shareUrl]);

  const onCopy = useCallback(async () => {
    trackBlogShare(slug);
    const ok = await copyUrl(shareUrl);
    if (ok) {
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Could not copy the link");
    }
  }, [slug, shareUrl]);

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-1.5 flex-wrap", className)}>
        {TARGETS.map((target) => (
          <Tooltip key={target.name}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => share(target)}
                aria-label={`Share on ${target.name}`}
                className={cn(
                  "size-10 rounded-xl border border-border/50 bg-background/50",
                  target.hover,
                  "transition-all active:scale-95",
                )}
              >
                <target.icon className={cn("size-4", target.tone)} />
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
              onClick={onCopy}
              aria-label="Copy link"
              className="size-10 rounded-xl border border-border/50 bg-background/50 hover:bg-primary/10 transition-all active:scale-95"
            >
              {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{copied ? "Copied" : "Copy link"}</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="size-4" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {TARGETS.map((target) => (
          <DropdownMenuItem
            key={target.name}
            onClick={() => share(target)}
            className="gap-2 cursor-pointer"
          >
            <target.icon className={cn("size-4", target.tone)} />
            {target.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onCopy} className="gap-2 cursor-pointer">
          {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy link"}
        </DropdownMenuItem>
        {navigator.share && (
          <DropdownMenuItem onClick={nativeShare} className="gap-2 cursor-pointer">
            <Send className="size-4" />
            More options&hellip;
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
