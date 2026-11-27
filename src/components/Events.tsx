// react-doctor-disable no-giant-component
import { Calendar, Clock, MapPin, Bell, ArrowRight, Star, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useRef, useState } from "react";
import { format } from "date-fns";
import { TextReveal, GradientTextReveal } from "@/components/animation/TextReveal";
import { m, AnimatePresence, Variants, useInView } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import SectionSkeleton from "@/components/loading/SectionSkeleton";
import { useQuery } from "@tanstack/react-query";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { fetchWithFallback } from "@/lib/edgeApi";
import { scrollToTarget } from "@/lib/scroll";
import { prefersReducedMotion } from "@/lib/motion";
import Counter from "@/components/reactbits/Counter";
import FadeContent from "@/components/reactbits/FadeContent";

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

const fetchEvents = async (): Promise<EventItem[]> => {
  const { data } = await fetchWithFallback<EventItem>("/api/events", async () => {
    return await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: true });
  });
  // Endpoint returns descending date; keep ascending behavior here.
  return [...data].sort((a, b) =>
    String(a.event_date).localeCompare(String(b.event_date))
  );
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

const AnnouncementTicker = ({ paused }: { paused?: boolean }) => (
  <div
    className="events-blur-card overflow-hidden w-full bg-primary/10 backdrop-blur-md py-3 border-y border-primary/20 mb-12"
    style={{ contain: "layout paint" }}
  >
    <div
      className="flex animate-marquee-smooth whitespace-nowrap"
      style={paused ? { animationPlayState: "paused" } : undefined}
    >
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-8 px-4">
          <span className="flex items-center gap-2 text-primary font-bold text-sm">
            <Bell className="size-4 flex-shrink-0" aria-hidden="true" />
            ANNOUNCEMENT: Registration for the Annual Science Fair is now OPEN!
          </span>
          <span className="size-2 rounded-full bg-primary/30 flex-shrink-0" aria-hidden="true" />
          <span className="flex items-center gap-2 text-secondary font-bold text-sm">
            <Star className="size-4 flex-shrink-0" aria-hidden="true" />
            NEW: YICDVP Innovation Summit coming this April!
          </span>
          <span className="size-2 rounded-full bg-primary/30 flex-shrink-0" aria-hidden="true" />
        </div>
      ))}
    </div>
  </div>
);

const Events = ({ omitSectionId = false }: { omitSectionId?: boolean }) => {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeTab, setActiveTab] = useState("events");
  const [detailsEvent, setDetailsEvent] = useState<EventItem | null>(null);
  const isReduced = prefersReducedMotion();
  const isSectionVisible = useInView(sectionRef, { amount: 0.02 });

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

  // Realtime: invalidate React Query caches on DB change
  useRealtimeSync(["events", "schedule"]);

  const loading = eventsLoading || scheduleLoading;
  const featuredEvent = eventsData.find((e: EventItem) => e.is_featured) || null;
  const upcomingEvents = eventsData.filter((e: EventItem) => !e.is_featured);

  const containerVariants: Variants = {
    hidden: isReduced ? { opacity: 1 } : { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: isReduced ? 0 : 0.1
      }
    }
  };

  const itemVariants: Variants = {
    hidden: isReduced ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: isReduced
        ? { duration: 0 }
        : { type: "spring", stiffness: 100 }
    }
  };

  return (
    <section ref={sectionRef} id={omitSectionId ? undefined : "events"} className="section-padding bg-muted/30 relative overflow-x-hidden overflow-y-visible">
      {/* Background decoration */}
      <div className="events-ambient-orb absolute top-0 left-0 size-[500px] bg-primary/5 rounded-full blur-[120px] -z-10" />
      <div className="events-ambient-orb absolute bottom-0 right-0 size-[500px] bg-secondary/5 rounded-full blur-[120px] -z-10" />

      <div className="container-custom relative z-10 px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-16 px-2 sm:px-4">
          <m.div
            initial={isReduced ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={isReduced ? { duration: 0 } : undefined}
          >
            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black capitalize mb-4 tracking-tighter break-words">
              events & <GradientTextReveal gradient="from-primary to-accent">updates</GradientTextReveal>
            </h2>
            <p className="text-lg sm:text-xl md:text-2xl font-medium tracking-tight leading-snug text-muted-foreground/90 max-w-2xl mx-auto">
              discover upcoming workshops, seminars, and club activities designed to ignite your passion for innovation.
            </p>

            {/* ReactBits Counter + FadeContent: the live session count rolls up
                as its strip fades in on view. */}
            <FadeContent threshold={0.4} once delay={0.25} className="w-full pt-4">
              <div className="flex items-center justify-center gap-3 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <span className="text-lg font-bold tabular-nums text-primary">
                  <Counter value={upcomingEvents.length} duration={1.4} />
                </span>
                upcoming {upcomingEvents.length === 1 ? "session" : "sessions"}
                {featuredEvent ? (
                  <>
                    <span aria-hidden="true">·</span>
                    1 flagship
                  </>
                ) : null}
              </div>
            </FadeContent>
          </m.div>
        </div>

        <div className="overflow-hidden w-[calc(100%+2rem)] sm:w-[calc(100%+3rem)] -mx-4 sm:-mx-6">
          <AnnouncementTicker paused={!isSectionVisible} />
        </div>

        {/* Featured Event Card */}
        {featuredEvent && (
          <m.div
            initial={isReduced ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={isReduced ? { duration: 0 } : { duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
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
                  animation: "liquid-flow 0.8s linear infinite",
                  animationPlayState: isSectionVisible ? "running" : "paused",
                }}
              />

              {/* Glass card body */}
              <div className="events-blur-card relative rounded-[calc(1.5rem-1px)] bg-card/60 backdrop-blur-2xl border-0 overflow-hidden">
                {/* Ambient blobs */}
                <div className="events-ambient-orb absolute -top-20 -right-20 size-56 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
                <div className="events-ambient-orb absolute -bottom-16 -left-16 size-48 bg-secondary/15 rounded-full blur-3xl pointer-events-none" />
                {/* Top glass highlight */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                <div className="relative z-10 p-5 sm:p-7 md:p-8">
                  {/* Header row: badge + category */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-primary/15 text-primary border border-primary/25">
                      <Bell className="size-3" aria-hidden="true" />
                      Featured
                    </span>
                    {featuredEvent.category && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-muted/50 text-muted-foreground border border-border/50">
                        {featuredEvent.category}
                      </span>
                    )}
                    {/* Pulsing live dot */}
                    <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-500 font-semibold">
                      <span className="size-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" aria-hidden="true" />
                      Live soon
                    </span>
                  </div>

                  {/* Title - compact, not overwhelming */}
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-black lowercase leading-tight tracking-tighter mb-3 break-words">
                    <GradientTextReveal gradient="from-primary to-accent">
                      {featuredEvent.title.toLowerCase()}
                    </GradientTextReveal>
                  </h3>

                  {/* Description */}
                  {featuredEvent.description && (
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-5 line-clamp-2">
                      {featuredEvent.description}
                    </p>
                  )}

                  {/* Metadata strip - inline pills instead of big tiles */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-xs font-semibold text-foreground">
                      <div className="size-6 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Calendar className="size-3.5 text-primary" aria-hidden="true" />
                      </div>
                      {format(new Date(featuredEvent.event_date), 'MMM d, yyyy')}
                    </div>

                    {featuredEvent.event_time && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/10 border border-secondary/20 text-xs font-semibold text-foreground">
                        <div className="size-6 rounded-lg bg-secondary/20 flex items-center justify-center flex-shrink-0">
                          <Clock className="size-3.5 text-secondary" aria-hidden="true" />
                        </div>
                        {featuredEvent.event_time}
                      </div>
                    )}

                    {featuredEvent.location && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-accent/10 border border-accent/20 text-xs font-semibold text-foreground">
                        <div className="size-6 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                          <MapPin className="size-3.5 text-accent" aria-hidden="true" />
                        </div>
                        <span className="truncate max-w-[140px]">{featuredEvent.location}</span>
                      </div>
                    )}
                  </div>

                  {/* CTA row */}
                  <div className="flex flex-col xs:flex-row gap-2 sm:gap-3">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => scrollToTarget("join")}
                      className="rounded-full px-6 min-h-[44px] py-2.5 text-xs font-bold bg-gradient-to-r from-primary to-secondary shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      Register Now <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setDetailsEvent(featuredEvent)}
                      className="rounded-full px-6 min-h-[44px] py-2.5 text-xs font-bold border-border/50 bg-background/40 hover:bg-muted/50 transition-all focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      Event Details
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </m.div>
        )}


        {/* Tabbed Navigation */}
        <Tabs value={activeTab} className="w-full max-w-full" onValueChange={setActiveTab}>
          <div className="flex justify-center mb-8 sm:mb-12 px-2">
            <TabsList className="bg-muted/50 p-1.5 rounded-full h-auto glass-card inline-flex flex-col sm:flex-row w-full sm:w-auto max-w-full">
              <TabsTrigger
                value="events"
                className="rounded-full px-4 py-2.5 sm:px-8 sm:py-3 min-h-[44px] text-sm sm:text-base font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex items-center justify-center gap-2 flex-1 sm:flex-initial"
              >
                <Calendar className="size-3.5 sm:w-4 sm:h-4 flex-shrink-0" aria-hidden="true" />
                <span className="truncate">Upcoming Events</span>
              </TabsTrigger>
              <TabsTrigger
                value="schedule"
                className="rounded-full px-4 py-2.5 sm:px-8 sm:py-3 min-h-[44px] text-sm sm:text-base font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex items-center justify-center gap-2 flex-1 sm:flex-initial"
              >
                <Clock className="size-3.5 sm:w-4 sm:h-4 flex-shrink-0" aria-hidden="true" />
                <span className="truncate">Club Schedule</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="min-h-[320px] sm:min-h-[400px]">
            <AnimatePresence mode="wait">
              {loading ? (
                <m.div
                  key="loading"
                  initial={isReduced ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={isReduced ? { duration: 0 } : undefined}
                  className="py-12"
                >
                  <SectionSkeleton variant="timeline" />
                </m.div>
              ) : (
                <>
                  <TabsContent value="events" className="mt-0 focus-visible:ring-0 overflow-hidden">
                    <m.div
                      key="events-content"
                      variants={containerVariants}
                      initial={isReduced ? false : "hidden"}
                      animate="visible"
                      className="max-w-4xl mx-auto px-3 sm:px-4"
                    >
                      {upcomingEvents.length > 0 ? (
                        <div className="relative pl-10 sm:pl-12 md:pl-0">
                          {/* Timeline vertical line (visible on mobile & desktop so dots stay connected) */}
                          <div className="absolute left-[6px] sm:left-[8px] md:left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary to-transparent" aria-hidden="true" />

                          <div className="space-y-8 sm:space-y-12">
                            {upcomingEvents.map((event, index) => (
                              <m.div
                                key={event.id}
                                variants={itemVariants}
                                className={`relative flex items-center gap-4 sm:gap-8 ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                              >
                                {/* Connector Dot */}
                                <div className="absolute -left-[34px] sm:-left-[40px] md:left-1/2 -translate-x-1/2 top-6 size-3 sm:size-4 rounded-full bg-primary border-2 sm:border-4 border-background z-20 shadow-[0_0_15px_rgba(var(--primary),0.5)]" aria-hidden="true" />

                                <div className="hidden md:block w-1/2 flex-shrink-0" />

                                <div className="w-full md:w-1/2 min-w-0 pl-0 md:pl-0">
                                  {/* Glassmorphism Timeline Card */}
                                  <div className="relative rounded-3xl p-px overflow-hidden group transition-transform duration-500 hover:-translate-y-1 hover:scale-[1.02]">
                                    {/* Subtle gradient border that flows on hover */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-border/50 via-border/10 to-border/30 group-hover:from-primary/50 group-hover:via-primary/30 group-hover:to-accent/50 transition-colors duration-500" />

                                    {/* react-doctor-disable jsx-max-depth */}
                                    <div className="events-blur-card relative h-full rounded-[calc(1.5rem-1px)] bg-card/40 backdrop-blur-xl p-5 sm:p-7 z-10 overflow-hidden flex flex-col">
                                      {/* Inner top highlight */}
                                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                                      {/* Ambient hover glow */}
                                      <div className="events-ambient-orb absolute -inset-24 bg-gradient-to-r from-primary/0 via-primary/5 to-secondary/0 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-700 pointer-events-none" />

                                      <div className="flex flex-wrap items-center gap-2 mb-3">
                                        <Badge variant="outline" className="border-primary/20 text-primary bg-primary/10 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
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
                                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/10 border border-secondary/20 text-[11px] sm:text-xs font-semibold text-foreground">
                                            <Clock className="size-3 text-secondary" aria-hidden="true" />
                                            <span>{event.event_time}</span>
                                          </div>
                                        )}
                                        {event.location && (
                                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/20 text-[11px] sm:text-xs font-semibold text-foreground">
                                            <MapPin className="size-3 text-accent" aria-hidden="true" />
                                            <span className="truncate max-w-[120px]">{event.location}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </m.div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-20 bg-muted/20 rounded-[2rem] border border-dashed border-muted-foreground/20">
                          <Info className="size-12 text-muted-foreground/40 mx-auto mb-4" aria-hidden="true" />
                          <h4 className="text-xl font-bold mb-2">No upcoming events</h4>
                          <p className="text-muted-foreground">Check back soon for new club activities!</p>
                        </div>
                      )}
                    </m.div>
                  </TabsContent>

                  <TabsContent value="schedule" className="mt-0 focus-visible:ring-0 overflow-hidden">
                    <m.div
                      key="schedule-content"
                      variants={containerVariants}
                      initial={isReduced ? false : "hidden"}
                      animate="visible"
                      className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 px-3 sm:px-4"
                    >
                      {schedules.length > 0 ? (
                        schedules.map((schedule) => (
                          <m.div
                            key={schedule.id}
                            variants={itemVariants}
                            className="group relative min-w-0 rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-[0_8px_40px_-12px_hsl(var(--primary)/0.25)] hover:-translate-y-0.5"
                          >
                            {/* Glassmorphism base */}
                            <div className="events-blur-card absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white/70 via-white/50 to-white/30 dark:from-white/[0.12] dark:via-white/[0.08] dark:to-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-lg shadow-black/5 dark:shadow-black/20" />
                            {/* Subtle gradient glow */}
                            <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            {/* Top-edge highlight */}
                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/20 rounded-t-2xl" />

                            <div className="relative z-10 p-5 sm:p-6 flex flex-col h-full">
                              {/* Day badge - prominent, scannable */}
                              <div className="inline-flex items-center gap-2 w-fit mb-4">
                                <span className="inline-flex items-center justify-center size-10 sm:w-11 sm:h-11 rounded-xl bg-primary/15 dark:bg-primary/20 text-primary border border-primary/20 dark:border-primary/30 shadow-sm">
                                  <Calendar className="size-5 sm:w-5 sm:h-5" aria-hidden="true" />
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

                              {/* Time & location - clear, readable rows */}
                              <div className="space-y-3 pt-3 border-t border-black/5 dark:border-white/10">
                                <div className="flex items-center gap-3 text-sm text-foreground/90">
                                  <div className="flex-shrink-0 size-8 rounded-lg bg-primary/10 dark:bg-primary/15 flex items-center justify-center text-primary">
                                    <Clock className="size-4" aria-hidden="true" />
                                  </div>
                                  <span className="font-medium truncate">
                                    {schedule.start_time} - {schedule.end_time}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                  <div className="flex-shrink-0 size-8 rounded-lg bg-secondary/10 dark:bg-secondary/15 flex items-center justify-center text-secondary">
                                    <MapPin className="size-4" aria-hidden="true" />
                                  </div>
                                  <span className="truncate break-words">
                                    {schedule.location || 'Innovation Hub'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </m.div>
                        ))
                      ) : (
                        <div className="events-blur-card col-span-full text-center py-16 sm:py-20 rounded-2xl sm:rounded-3xl bg-white/50 dark:bg-white/5 backdrop-blur-md border border-white/40 dark:border-white/10 border-dashed">
                          <Info className="size-12 text-muted-foreground/40 mx-auto mb-4" aria-hidden="true" />
                          <h4 className="text-xl font-bold mb-2">No schedule available</h4>
                          <p className="text-muted-foreground text-sm sm:text-base">The club schedule is currently being finalized.</p>
                        </div>
                      )}
                    </m.div>
                  </TabsContent>
                </>
              )}
            </AnimatePresence>
          </div>
        </Tabs>

        <Dialog open={Boolean(detailsEvent)} onOpenChange={(open) => { if (!open) setDetailsEvent(null); }}>
          <DialogContent className="sm:max-w-lg rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-display font-bold lowercase">
                {detailsEvent?.title}
              </DialogTitle>
              <DialogDescription>
                {detailsEvent ? format(new Date(detailsEvent.event_date), "EEEE, MMMM d, yyyy") : ""}
              </DialogDescription>
            </DialogHeader>
            {detailsEvent && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {detailsEvent.event_time && (
                    <Badge variant="secondary" className="gap-1.5">
                      <Clock className="size-3.5" aria-hidden="true" />
                      {detailsEvent.event_time}
                    </Badge>
                  )}
                  {detailsEvent.location && (
                    <Badge variant="outline" className="gap-1.5">
                      <MapPin className="size-3.5" aria-hidden="true" />
                      {detailsEvent.location}
                    </Badge>
                  )}
                  {detailsEvent.category && (
                    <Badge variant="outline">{detailsEvent.category}</Badge>
                  )}
                </div>
                {detailsEvent.description && (
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-line">
                    {detailsEvent.description}
                  </p>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDetailsEvent(null)}
                    className="min-h-[44px] rounded-full px-5"
                  >
                    Close
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setDetailsEvent(null);
                      scrollToTarget("join");
                    }}
                    className="min-h-[44px] rounded-full px-6 bg-gradient-to-r from-primary to-secondary"
                  >
                    Register Now <ArrowRight className="ml-2 size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
};

export default Events;

