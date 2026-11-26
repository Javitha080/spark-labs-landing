import { Keyboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHORTCUT_GROUPS = [
  {
    title: "Navigation & Search",
    items: [
      { keys: ["Ctrl", "K"], altKeys: ["⌘", "K"], label: "Open Command Palette" },
      { keys: ["Tab"], label: "Jump to Skip-to-Content & interactive controls" },
      { keys: ["Esc"], label: "Close active dialog or menu" },
    ],
  },
  {
    title: "Command Palette",
    items: [
      { keys: ["↑", "↓"], label: "Move through search results" },
      { keys: ["Enter"], label: "Open selected page, article, project, or action" },
      { keys: ["Type"], label: "Filter pages, blog posts, news, events & courses" },
    ],
  },
  {
    title: "General",
    items: [
      { keys: ["?"], label: "Show or hide keyboard shortcuts" },
    ],
  },
];

export function KeyboardShortcutsModal({
  open,
  onOpenChange,
}: KeyboardShortcutsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden" data-lenis-prevent>
        <DialogHeader className="p-6 pb-4 border-b border-border/40">
          <DialogTitle className="flex items-center gap-2 text-lg font-display">
            <Keyboard className="size-5 text-primary" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Quick keyboard controls for navigating YICDVP faster.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto overscroll-contain">
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group.title} aria-label={group.title} className="space-y-2.5">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {group.title}
              </h3>
              <ul className="divide-y divide-border/30 rounded-xl border border-border/40 bg-background/40">
                {group.items.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                  >
                    <span className="text-foreground/90">{item.label}</span>
                    <span className="flex items-center gap-1 shrink-0">
                      {item.keys.map((key) => (
                        <kbd
                          key={key}
                          className="inline-flex min-w-[26px] items-center justify-center rounded-md border border-border/60 bg-muted/70 px-2 py-0.5 font-mono text-xs font-semibold text-foreground"
                        >
                          {key}
                        </kbd>
                      ))}
                      {"altKeys" in item && item.altKeys && (
                        <>
                          <span className="text-xs text-muted-foreground mx-0.5">/</span>
                          {item.altKeys.map((key) => (
                            <kbd
                              key={key}
                              className="inline-flex min-w-[26px] items-center justify-center rounded-md border border-border/60 bg-muted/70 px-2 py-0.5 font-mono text-xs font-semibold text-foreground"
                            >
                              {key}
                            </kbd>
                          ))}
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default KeyboardShortcutsModal;
