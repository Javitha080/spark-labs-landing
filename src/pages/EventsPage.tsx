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
            <main className="pt-24">
                {/* Page Header */}
                <section className="section-padding bg-background border-b border-border">
                    <div className="container-custom">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <Link to="/">
                                <Button variant="ghost" className="mb-6 -ml-4">
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back to Home
                                </Button>
                            </Link>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-4">
                                <span className="text-primary">Events</span> & Activities
                            </h1>
                            <p className="text-lg text-muted-foreground max-w-2xl mb-8">
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
                <section className="section-padding">
                    <div className="container-custom">
                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="h-64 rounded-2xl glass-card animate-pulse" />
                                ))}
                            </div>
                        ) : filteredEvents.length === 0 ? (
                            <div className="text-center py-16">
                                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">No events found.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {filteredEvents.map((event, index) => (
                                    <motion.article
                                        key={event.id}
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1, duration: 0.5 }}
                                        className="group p-6 rounded-2xl glass-card hover:shadow-xl transition-shadow"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-primary/10 flex flex-col items-center justify-center">
                                                <span className="text-xs font-medium text-primary">
                                                    {new Date(event.event_date).toLocaleDateString('en-US', { month: 'short' })}
                                                </span>
                                                <span className="text-xl font-bold text-primary">
                                                    {new Date(event.event_date).getDate()}
                                                </span>
                                            </div>
                                            <div className="flex-1">
                                                {event.category && (
                                                    <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary mb-2">
                                                        {event.category}
                                                    </span>
                                                )}
                                                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                                                    {event.title}
                                                </h3>
                                                <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                                                    {event.description}
                                                </p>
                                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                    {event.event_time && <span>{event.event_time}</span>}
                                                    {event.location && <span>{event.location}</span>}
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
