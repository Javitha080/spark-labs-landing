import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Events from "@/components/Events";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Tables } from "@/integrations/supabase/types";

/* ===========================================
   EVENTS PAGE - All events with upcoming/past
   =========================================== */

type Event = Tables<"events">;

const EventsPage = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const { data, error } = await supabase
                    .from("events")
                    .select("*")
                    .order("event_date", { ascending: false });

                if (error) throw error;
                setEvents(data || []);
            } catch (error) {
                console.error("Error loading events:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    const now = new Date();
    const filteredEvents = events.filter(event => {
        const eventDate = new Date(event.event_date);
        if (filter === "upcoming") return eventDate >= now;
        if (filter === "past") return eventDate < now;
        return true;
    });

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="pt-24 overflow-x-hidden">
                {/* Page Header */}
                <section className="section-padding bg-background border-b border-border">
                    <div className="container-custom px-4 sm:px-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <Link to="/">
                                <Button variant="ghost" className="mb-4 sm:mb-6 -ml-2 sm:-ml-4">
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back to Home
                                </Button>
                            </Link>
                            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-3 sm:mb-4 break-words">
                                <span className="text-primary">Events</span> & Activities
                            </h1>
                            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mb-6 sm:mb-8">
                                Stay updated with our workshops, competitions, and community activities.
                            </p>

                            {/* Filters */}
                            <div className="flex flex-wrap gap-2">
                                {(["all", "upcoming", "past"] as const).map((f) => (
                                    <Button
                                        key={f}
                                        variant={filter === f ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setFilter(f)}
                                        className="rounded-full capitalize"
                                    >
                                        {f === "all" ? "All Events" : f}
                                    </Button>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Events Grid */}
                <section className="section-padding px-4 sm:px-6">
                    <div className="container-custom max-w-full">
                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="h-48 sm:h-64 rounded-xl sm:rounded-2xl glass-card animate-pulse" />
                                ))}
                            </div>
                        ) : filteredEvents.length === 0 ? (
                            <div className="text-center py-12 sm:py-16">
                                <Calendar className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground mb-4" />
                                <p className="text-muted-foreground text-sm sm:text-base">No events found.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
                                {filteredEvents.map((event, index) => (
                                    <motion.article
                                        key={event.id}
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1, duration: 0.5 }}
                                        className="group p-4 sm:p-6 rounded-xl sm:rounded-2xl glass-card hover:shadow-xl transition-shadow min-w-0"
                                    >
                                        <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                                            <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-primary/10 flex flex-col items-center justify-center">
                                                <span className="text-[10px] sm:text-xs font-medium text-primary">
                                                    {new Date(event.event_date).toLocaleDateString('en-US', { month: 'short' })}
                                                </span>
                                                <span className="text-lg sm:text-xl font-bold text-primary">
                                                    {new Date(event.event_date).getDate()}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                {event.category && (
                                                    <span className="inline-block px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full bg-primary/10 text-primary mb-1.5 sm:mb-2">
                                                        {event.category}
                                                    </span>
                                                )}
                                                <h3 className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2 group-hover:text-primary transition-colors break-words line-clamp-2">
                                                    {event.title}
                                                </h3>
                                                <p className="text-muted-foreground text-xs sm:text-sm line-clamp-2 mb-2 sm:mb-3 break-words">
                                                    {event.description}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] sm:text-xs text-muted-foreground">
                                                    {event.event_time && <span className="truncate">{event.event_time}</span>}
                                                    {event.location && <span className="truncate">{event.location}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.article>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
};

export default EventsPage;
