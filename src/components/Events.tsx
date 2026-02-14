import { Calendar, Clock, MapPin, Bell, ArrowRight, Star, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { format } from "date-fns";
import { TextReveal, GradientTextReveal } from "@/components/animation/TextReveal";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

interface EventItem {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  location: string | null;
  is_featured: boolean;
  category?: string;
}

interface ScheduleItem {
  id: string;
  title: string;
  description: string | null;
  day_of_week: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  is_active: boolean;
}

const fetchEvents = async () => {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("event_date", { ascending: true });
  if (error) throw error;
  return data || [];
};

const fetchSchedule = async () => {
  const { data, error } = await supabase
    .from("schedule")
    .select("*")
    .eq("is_active", true)
    .order("day_of_week");
  if (error) throw error;
  return data || [];
};

const Events = () => {
  const [activeTab, setActiveTab] = useState("events");

  const { data: eventsData = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["events"],
    queryFn: fetchEvents,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });

  const { data: schedules = [], isLoading: scheduleLoading } = useQuery({
    queryKey: ["schedule"],
    queryFn: fetchSchedule,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });

  const loading = eventsLoading || scheduleLoading;
  const featuredEvent = eventsData.find((e: EventItem) => e.is_featured) || null;
  const upcomingEvents = eventsData.filter((e: EventItem) => !e.is_featured);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  const AnnouncementTicker = () => (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-primary/10 backdrop-blur-md py-3 overflow-hidden border-y border-primary/20 mb-12">
      <div className="flex animate-marquee-smooth whitespace-nowrap">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-8 px-4">
            <span className="flex items-center gap-2 text-primary font-bold">
              <Bell className="w-4 h-4" />
              ANNOUNCEMENT: Registration for the Annual Science Fair is now OPEN!
            </span>
            <span className="w-2 h-2 rounded-full bg-primary/30" />
            <span className="flex items-center gap-2 text-secondary font-bold">
              <Star className="w-4 h-4" />
              NEW: YICDVP Innovation Summit coming this April!
            </span>
            <span className="w-2 h-2 rounded-full bg-primary/30" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <section id="events" className="section-padding bg-muted/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[120px] -z-10" />

      <div className="container-custom relative z-10">
        <div className="text-center mb-16 px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl md:text-7xl font-black lowercase mb-6 tracking-tighter">
              events & <GradientTextReveal gradient="from-primary via-secondary to-accent">updates</GradientTextReveal>
            </h2>
            <p className="text-xl md:text-2xl font-medium tracking-tight leading-snug text-muted-foreground/90 max-w-2xl mx-auto">
              discover upcoming workshops, seminars, and club activities designed to ignite your passion for innovation.
            </p>
          </motion.div>
        </div>

        {/* Announcements Ticker */}
        <AnnouncementTicker />

        {/* Featured Event Card */}
        {featuredEvent && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <div className="glass-card p-1 md:p-2 rounded-[2.5rem] overflow-hidden group">
              <div className="relative bg-card/50 backdrop-blur-xl rounded-[2.2rem] p-8 md:p-12 border border-border/50">
                {/* Decorative gradients */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-colors duration-700" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-secondary/20 rounded-full blur-3xl group-hover:bg-secondary/30 transition-colors duration-700" />

                <div className="relative z-20">
                  <div className="flex flex-wrap items-center gap-4 mb-8">
                    <Badge variant="secondary" className="px-4 py-1.5 bg-primary/20 text-primary border-primary/20 flex items-center gap-2 animate-pulse">
                      <Bell className="w-4 h-4" />
                      FEATURED EVENT
                    </Badge>
                    {featuredEvent.category && (
                      <Badge variant="outline" className="px-4 py-1.5 border-muted-foreground/30">
                        {featuredEvent.category}
                      </Badge>
                    )}
                  </div>

                  <h3 className="text-4xl md:text-6xl lg:text-7xl font-black lowercase mb-8 leading-[0.9] tracking-tighter">
                    <GradientTextReveal gradient="from-primary via-secondary to-accent">
                      {featuredEvent.title.toLowerCase()}
                    </GradientTextReveal>
                  </h3>

                  <div className="grid md:grid-cols-3 gap-6 mb-10">
                    <div className="flex items-center gap-5 p-5 rounded-2xl bg-card/50 border border-border/50 hover:bg-card/80 transition-colors">
                      <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                        <Calendar className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Date</div>
                        <div className="font-bold text-lg">{format(new Date(featuredEvent.event_date), 'MMMM do, yyyy')}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-5 p-5 rounded-2xl bg-card/50 border border-border/50 hover:bg-card/80 transition-colors">
                      <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shadow-lg shadow-secondary/30">
                        <Clock className="w-6 h-6 text-secondary-foreground" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Time</div>
                        <div className="font-bold text-lg">{featuredEvent.event_time || 'TBA'}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-5 p-5 rounded-2xl bg-card/50 border border-border/50 hover:bg-card/80 transition-colors">
                      <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center shadow-lg shadow-accent/30">
                        <MapPin className="w-6 h-6 text-accent-foreground" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Location</div>
                        <div className="font-bold text-lg truncate max-w-[150px]">{featuredEvent.location || 'TBA'}</div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xl text-muted-foreground mb-10 max-w-4xl leading-relaxed">
                    {featuredEvent.description}
                  </p>

                  <div className="flex flex-wrap gap-4">
                    <Button size="lg" className="rounded-full px-8 py-6 h-auto text-lg font-bold bg-gradient-to-r from-primary to-secondary hover:shadow-[0_0_30px_rgba(var(--primary),0.3)] transition-all flex items-center gap-3">
                      Register Now <ArrowRight className="w-5 h-5" />
                    </Button>
                    <Button size="lg" variant="outline" className="rounded-full px-8 py-6 h-auto text-lg font-bold border-border/50 hover:bg-muted/50">
                      Learn More
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tabbed Navigation */}
        <Tabs defaultValue="events" className="w-full" onValueChange={setActiveTab}>
          <div className="flex justify-center mb-12">
            <TabsList className="bg-muted/50 p-1.5 rounded-full h-auto glass-card">
              <TabsTrigger
                value="events"
                className="rounded-full px-8 py-3 text-base font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                Upcoming Events
              </TabsTrigger>
              <TabsTrigger
                value="schedule"
                className="rounded-full px-8 py-3 text-base font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex items-center gap-2"
              >
                <Clock className="w-4 h-4" />
                Club Schedule
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="min-h-[400px]">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-20"
                >
                  <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                  <p className="text-muted-foreground font-medium">Fetching updates...</p>
                </motion.div>
              ) : (
                <>
                  <TabsContent value="events" className="mt-0 focus-visible:ring-0">
                    <motion.div
                      key="events-content"
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      className="max-w-4xl mx-auto px-4"
                    >
                      {upcomingEvents.length > 0 ? (
                        <div className="relative pl-8 md:pl-0">
                          {/* Timeline vertical line */}
                          <div className="absolute left-0 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary via-secondary to-transparent hidden md:block" />

                          <div className="space-y-12">
                            {upcomingEvents.map((event, index) => (
                              <motion.div
                                key={event.id}
                                variants={itemVariants}
                                className={`relative flex items-center gap-8 ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                              >
                                {/* Connector Dot */}
                                <div className="absolute -left-[32px] md:left-1/2 md:-ml-[8px] top-6 w-4 h-4 rounded-full bg-primary border-4 border-background z-20 shadow-[0_0_15px_rgba(var(--primary),0.5)]" />

                                <div className="hidden md:block w-1/2" />

                                <div className="w-full md:w-1/2">
                                  <div className="glass-card p-6 md:p-8 rounded-3xl hover:scale-[1.03] transition-all duration-300 group cursor-default">
                                    <div className="flex items-center gap-3 mb-4">
                                      <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5">
                                        {format(new Date(event.event_date), 'MMM d, yyyy')}
                                      </Badge>
                                      {event.category && (
                                        <Badge variant="outline" className="opacity-70">{event.category}</Badge>
                                      )}
                                    </div>
                                    <h4 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">{event.title}</h4>
                                    <p className="text-muted-foreground mb-6 line-clamp-2">{event.description}</p>

                                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                      {event.event_time && (
                                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 border border-muted-foreground/10">
                                          <Clock className="w-3.5 h-3.5" />
                                          <span>{event.event_time}</span>
                                        </div>
                                      )}
                                      {event.location && (
                                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 border border-muted-foreground/10">
                                          <MapPin className="w-3.5 h-3.5" />
                                          <span className="truncate max-w-[150px]">{event.location}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-20 bg-muted/20 rounded-[2rem] border border-dashed border-muted-foreground/20">
                          <Info className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                          <h4 className="text-xl font-bold mb-2">No upcoming events</h4>
                          <p className="text-muted-foreground">Check back soon for new club activities!</p>
                        </div>
                      )}
                    </motion.div>
                  </TabsContent>

                  <TabsContent value="schedule" className="mt-0 focus-visible:ring-0">
                    <motion.div
                      key="schedule-content"
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 px-4"
                    >
                      {schedules.length > 0 ? (
                        schedules.map((schedule) => (
                          <motion.div
                            key={schedule.id}
                            variants={itemVariants}
                            className="glass-card p-6 rounded-[2rem] relative overflow-hidden group hover:scale-[1.02] transition-transform"
                          >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-[4rem] group-hover:bg-primary/10 transition-colors" />

                            <div className="relative z-10">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                                <Calendar className="w-5 h-5" />
                              </div>
                              <h4 className="text-xl font-bold mb-2">{schedule.title}</h4>
                              <p className="text-muted-foreground text-sm mb-6 line-clamp-2">{schedule.description}</p>

                              <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm font-medium">
                                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                    <Clock className="w-4 h-4" />
                                  </div>
                                  <span>{schedule.day_of_week} • {schedule.start_time} - {schedule.end_time}</span>
                                </div>

                                <div className="flex items-center gap-3 text-sm font-medium">
                                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-secondary group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors">
                                    <MapPin className="w-4 h-4" />
                                  </div>
                                  <span className="truncate">{schedule.location || 'Innovation Hub'}</span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))
                      ) : (
                        <div className="col-span-full text-center py-20 bg-muted/20 rounded-[2rem] border border-dashed border-muted-foreground/20">
                          <Info className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                          <h4 className="text-xl font-bold mb-2">No schedule available</h4>
                          <p className="text-muted-foreground">The club schedule is currently being finalized.</p>
                        </div>
                      )}
                    </motion.div>
                  </TabsContent>
                </>
              )}
            </AnimatePresence>
          </div>
        </Tabs>
      </div>
    </section>
  );
};

export default Events;

