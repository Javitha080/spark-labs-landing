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

const AnnouncementTicker = () => (
  <div className="overflow-hidden w-full bg-primary/10 backdrop-blur-md py-3 border-y border-primary/20 mb-12">
    <div className="flex animate-marquee-smooth whitespace-nowrap">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-8 px-4">
          <span className="flex items-center gap-2 text-primary font-bold text-sm">
            <Bell className="w-4 h-4 flex-shrink-0" />
            ANNOUNCEMENT: Registration for the Annual Science Fair is now OPEN!
          </span>
          <span className="w-2 h-2 rounded-full bg-primary/30 flex-shrink-0" />
          <span className="flex items-center gap-2 text-secondary font-bold text-sm">
            <Star className="w-4 h-4 flex-shrink-0" />
            NEW: YICDVP Innovation Summit coming this April!
          </span>
          <span className="w-2 h-2 rounded-full bg-primary/30 flex-shrink-0" />
        </div>
      ))}
    </div>
  </div>
);

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

  return (
    <section id="events" className="section-padding bg-muted/30 relative overflow-x-hidden overflow-y-visible">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[120px] -z-10" />

      <div className="container-custom relative z-10 px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-16 px-2 sm:px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-7xl font-black lowercase mb-4 sm:mb-6 tracking-tighter break-words">
              events & <GradientTextReveal gradient="from-primary via-secondary to-accent">updates</GradientTextReveal>
            </h2>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-medium tracking-tight leading-snug text-muted-foreground/90 max-w-2xl mx-auto">
              discover upcoming workshops, seminars, and club activities designed to ignite your passion for innovation.
            </p>
          </motion.div>
        </div>

        <div className="overflow-hidden w-full -mx-4 sm:-mx-6 md:-mx-8">
          <AnnouncementTicker />
        </div>

        {/* Featured Event Card */}
        {featuredEvent && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mb-10 sm:mb-14"
          >
            {/* Liquid glass border wrapper */}
            <div className="relative rounded-3xl p-px overflow-hidden">
              {/* Animated gradient border */}
              <div
                className="absolute inset-0 rounded-3xl"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)/0.7), hsl(var(--secondary)/0.5), hsl(var(--accent)/0.6), hsl(var(--primary)/0.7))",
                  backgroundSize: "300% 300%",
                  animation: "liquid-flow 6s linear infinite",
                }}
              />

              {/* Glass card body */}
              <div className="relative rounded-[calc(1.5rem-1px)] bg-card/60 backdrop-blur-2xl border-0 overflow-hidden">
                {/* Ambient blobs */}
                <div className="absolute -top-20 -right-20 w-56 h-56 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-secondary/15 rounded-full blur-3xl pointer-events-none" />
                {/* Top glass highlight */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                <div className="relative z-10 p-5 sm:p-7 md:p-8">
                  {/* Header row: badge + category */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-primary/15 text-primary border border-primary/25 backdrop-blur-sm">
                      <Bell className="w-3 h-3" />
                      Featured
                    </span>
                    {featuredEvent.category && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-muted/50 text-muted-foreground border border-border/50">
                        {featuredEvent.category}
                      </span>
                    )}
                    {/* Pulsing live dot */}
                    <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-500 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                      Live soon
                    </span>
                  </div>

                  {/* Title — compact, not overwhelming */}
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-black lowercase leading-tight tracking-tighter mb-3 break-words">
                    <GradientTextReveal gradient="from-primary via-secondary to-accent">
                      {featuredEvent.title.toLowerCase()}
                    </GradientTextReveal>
                  </h3>

                  {/* Description */}
                  {featuredEvent.description && (
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-5 line-clamp-2">
                      {featuredEvent.description}
                    </p>
                  )}

                  {/* Metadata strip — inline pills instead of big tiles */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 backdrop-blur-sm text-xs font-semibold text-foreground">
                      <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                      </div>
                      {format(new Date(featuredEvent.event_date), 'MMM d, yyyy')}
                    </div>

                    {featuredEvent.event_time && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/10 border border-secondary/20 backdrop-blur-sm text-xs font-semibold text-foreground">
                        <div className="w-6 h-6 rounded-lg bg-secondary/20 flex items-center justify-center flex-shrink-0">
                          <Clock className="w-3.5 h-3.5 text-secondary" />
                        </div>
                        {featuredEvent.event_time}
                      </div>
                    )}

                    {featuredEvent.location && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-accent/10 border border-accent/20 backdrop-blur-sm text-xs font-semibold text-foreground">
                        <div className="w-6 h-6 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-3.5 h-3.5 text-accent" />
                        </div>
                        <span className="truncate max-w-[140px]">{featuredEvent.location}</span>
                      </div>
                    )}
                  </div>

                  {/* CTA row */}
                  <div className="flex flex-col xs:flex-row gap-2 sm:gap-3">
                    <Button
                      size="sm"
                      className="rounded-full px-6 h-9 text-xs font-bold bg-gradient-to-r from-primary to-secondary shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                    >
                      Register Now <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full px-6 h-9 text-xs font-bold border-border/50 bg-background/30 backdrop-blur-sm hover:bg-muted/50 transition-all"
                    >
                      Learn More
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}


        {/* Tabbed Navigation */}
        <Tabs defaultValue="events" className="w-full max-w-full" onValueChange={setActiveTab}>
          <div className="flex justify-center mb-8 sm:mb-12 px-2">
            <TabsList className="bg-muted/50 p-1.5 rounded-full h-auto glass-card inline-flex flex-col sm:flex-row w-full sm:w-auto max-w-full">
              <TabsTrigger
                value="events"
                className="rounded-full px-4 py-2.5 sm:px-8 sm:py-3 text-sm sm:text-base font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex items-center justify-center gap-2 flex-1 sm:flex-initial"
              >
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Upcoming Events</span>
              </TabsTrigger>
              <TabsTrigger
                value="schedule"
                className="rounded-full px-4 py-2.5 sm:px-8 sm:py-3 text-sm sm:text-base font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex items-center justify-center gap-2 flex-1 sm:flex-initial"
              >
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Club Schedule</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="min-h-[320px] sm:min-h-[400px]">
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
                  <TabsContent value="events" className="mt-0 focus-visible:ring-0 overflow-hidden">
                    <motion.div
                      key="events-content"
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      className="max-w-4xl mx-auto px-3 sm:px-4"
                    >
                      {upcomingEvents.length > 0 ? (
                        <div className="relative pl-10 sm:pl-12 md:pl-0">
                          {/* Timeline vertical line */}
                          <div className="absolute left-0 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary via-secondary to-transparent hidden md:block" />

                          <div className="space-y-8 sm:space-y-12">
                            {upcomingEvents.map((event, index) => (
                              <motion.div
                                key={event.id}
                                variants={itemVariants}
                                className={`relative flex items-center gap-4 sm:gap-8 ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                              >
                                {/* Connector Dot */}
                                <div className="absolute left-0 md:left-1/2 md:-ml-[8px] top-6 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-primary border-2 sm:border-4 border-background z-20 shadow-[0_0_15px_rgba(var(--primary),0.5)]" />

                                <div className="hidden md:block w-1/2 flex-shrink-0" />

                                <div className="w-full md:w-1/2 min-w-0 pl-0 md:pl-0">
                                  {/* Glassmorphism Timeline Card */}
                                  <div className="relative rounded-3xl p-px overflow-hidden group transition-transform duration-500 hover:-translate-y-1 hover:scale-[1.02]">
                                    {/* Subtle gradient border that flows on hover */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-border/50 via-border/10 to-border/30 group-hover:from-primary/50 group-hover:via-secondary/30 group-hover:to-accent/50 transition-colors duration-500" />

                                    <div className="relative h-full rounded-[calc(1.5rem-1px)] bg-card/40 backdrop-blur-xl p-5 sm:p-7 z-10 overflow-hidden flex flex-col">
                                      {/* Inner top highlight */}
                                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                                      {/* Ambient hover glow */}
                                      <div className="absolute -inset-24 bg-gradient-to-r from-primary/0 via-primary/5 to-secondary/0 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-700 pointer-events-none" />

                                      <div className="flex flex-wrap items-center gap-2 mb-3">
                                        <Badge variant="outline" className="border-primary/20 text-primary bg-primary/10 text-[10px] sm:text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                                          {format(new Date(event.event_date), 'MMM d, yyyy')}
                                        </Badge>
                                        {event.category && (
                                          <Badge variant="outline" className="border-border/50 text-muted-foreground bg-muted/30 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
                                            {event.category}
                                          </Badge>
                                        )}
                                      </div>

                                      <h4 className="text-lg sm:text-xl md:text-2xl font-black lowercase tracking-tight mb-2 group-hover:text-primary transition-colors flex-1">
                                        {event.title}
                                      </h4>
                                      <p className="text-sm text-muted-foreground leading-relaxed mb-5 line-clamp-2">
                                        {event.description}
                                      </p>

                                      <div className="flex flex-wrap items-center gap-2 mt-auto">
                                        {event.event_time && (
                                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/10 border border-secondary/20 text-[11px] sm:text-xs font-semibold text-foreground backdrop-blur-sm">
                                            <Clock className="w-3 h-3 text-secondary" />
                                            <span>{event.event_time}</span>
                                          </div>
                                        )}
                                        {event.location && (
                                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/20 text-[11px] sm:text-xs font-semibold text-foreground backdrop-blur-sm">
                                            <MapPin className="w-3 h-3 text-accent" />
                                            <span className="truncate max-w-[120px]">{event.location}</span>
                                          </div>
                                        )}
                                      </div>
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

                  <TabsContent value="schedule" className="mt-0 focus-visible:ring-0 overflow-hidden">
                    <motion.div
                      key="schedule-content"
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 px-3 sm:px-4"
                    >
                      {schedules.length > 0 ? (
                        schedules.map((schedule) => (
                          <motion.div
                            key={schedule.id}
                            variants={itemVariants}
                            className="group relative min-w-0 rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-[0_8px_40px_-12px_hsl(var(--primary)/0.25)] hover:-translate-y-0.5"
                          >
                            {/* Glassmorphism base */}
                            <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white/70 via-white/50 to-white/30 dark:from-white/[0.12] dark:via-white/[0.08] dark:to-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-lg shadow-black/5 dark:shadow-black/20" />
                            {/* Subtle gradient glow */}
                            <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            {/* Top-edge highlight */}
                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/20 rounded-t-2xl" />

                            <div className="relative z-10 p-5 sm:p-6 flex flex-col h-full">
                              {/* Day badge — prominent, scannable */}
                              <div className="inline-flex items-center gap-2 w-fit mb-4">
                                <span className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary/15 dark:bg-primary/20 text-primary border border-primary/20 dark:border-primary/30 shadow-sm">
                                  <Calendar className="w-5 h-5 sm:w-5 sm:h-5" />
                                </span>
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                  {schedule.day_of_week}
                                </span>
                              </div>

                              <h4 className="text-lg sm:text-xl font-bold text-foreground mb-2 break-words leading-tight">
                                {schedule.title}
                              </h4>
                              <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 break-words mb-5 flex-1">
                                {schedule.description}
                              </p>

                              {/* Time & location — clear, readable rows */}
                              <div className="space-y-3 pt-3 border-t border-black/5 dark:border-white/10">
                                <div className="flex items-center gap-3 text-sm text-foreground/90">
                                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 dark:bg-primary/15 flex items-center justify-center text-primary">
                                    <Clock className="w-4 h-4" />
                                  </div>
                                  <span className="font-medium truncate">
                                    {schedule.start_time} – {schedule.end_time}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-secondary/10 dark:bg-secondary/15 flex items-center justify-center text-secondary">
                                    <MapPin className="w-4 h-4" />
                                  </div>
                                  <span className="truncate break-words">
                                    {schedule.location || 'Innovation Hub'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))
                      ) : (
                        <div className="col-span-full text-center py-16 sm:py-20 rounded-2xl sm:rounded-3xl bg-white/50 dark:bg-white/5 backdrop-blur-md border border-white/40 dark:border-white/10 border-dashed">
                          <Info className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                          <h4 className="text-xl font-bold mb-2">No schedule available</h4>
                          <p className="text-muted-foreground text-sm sm:text-base">The club schedule is currently being finalized.</p>
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

