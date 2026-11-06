import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLearningNotifications } from "@/hooks/useLearningNotifications";
import type { LearningNotification } from "@/types/learning";

// Udemy-style notification bell for the learning surfaces. Only authenticated
// students see content; guests get a plain icon that routes to sign-in.
export default function NotificationsBell() {
    const { items, unread, ready, markRead, markAllRead } = useLearningNotifications();
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    const openNotification = async (n: LearningNotification) => {
        setOpen(false);
        await markRead(n.id);
        if (n.link && n.link.startsWith("/")) {
            navigate(n.link);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
                    className="relative p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    title="Notifications"
                >
                    <Bell className="size-4" />
                    {unread > 0 && (
                        <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-0.5 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
                            {unread > 9 ? "9+" : unread}
                        </span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <p className="text-sm font-semibold">Notifications</p>
                    {unread > 0 && (
                        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7" onClick={() => void markAllRead()}>
                            <CheckCheck className="size-3.5 mr-1" /> Mark all read
                        </Button>
                    )}
                </div>
                <div className="max-h-[50vh] overflow-y-auto divide-y">
                    {!ready ? (
                        <p className="text-xs text-muted-foreground text-center py-8">Loading…</p>
                    ) : items.length === 0 ? (
                        <div className="py-10 text-center space-y-2">
                            <Inbox className="size-8 mx-auto text-muted-foreground/40" />
                            <p className="text-xs text-muted-foreground">You're all caught up.</p>
                        </div>
                    ) : (
                        items.map(n => (
                            <button
                                key={n.id}
                                type="button"
                                onClick={() => void openNotification(n)}
                                className={cn(
                                    "w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors flex gap-3",
                                    !n.is_read && "bg-primary/5",
                                )}
                            >
                                <span className={cn("mt-1.5 size-2 rounded-full flex-shrink-0", n.is_read ? "bg-transparent" : "bg-primary")} aria-label={n.is_read ? undefined : "Unread"} />
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-medium truncate">{n.title || n.type}</span>
                                    {n.body && <span className="block text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</span>}
                                    <span className="block text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleDateString()}</span>
                                </span>
                            </button>
                        ))
                    )}
                </div>
                {items.length > 0 && (
                    <div className="border-t p-2">
                        <Button asChild variant="ghost" size="sm" className="w-full text-xs text-muted-foreground">
                            <Link to="/learning-hub/my-learning">My learning</Link>
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
