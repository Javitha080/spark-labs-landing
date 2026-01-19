import { Calendar, Clock, MapPin, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { TextReveal, GradientTextReveal } from "@/components/animation/TextReveal";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const Events = () => {
  const [featuredEvent, setFeaturedEvent] = useState<any>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .order('event_date', { ascending: true });

        if (eventsError) throw eventsError;

        const featured = eventsData?.find((e) => e.is_featured);
        const upcoming = eventsData?.filter((e) => !e.is_featured) || [];

        setFeaturedEvent(featured);
        setUpcomingEvents(upcoming);

        const { data: scheduleData, error: scheduleError } = await supabase
          .from('schedule')
          .select('*')
          .eq('is_active', true)
          .order('day_of_week');

        if (scheduleError) throw scheduleError;
        setSchedules(scheduleData || []);
      } catch (error) {
        toast({
          title: "Error loading events",
          description: "Please try again later",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const UpcomingEventItem = ({ event, index }: { event: any; index: number }) => {
    const { ref, isVisible } = useScrollAnimation({
      threshold: 0.3,
      triggerOnce: true,
    });

    return (
      <div
        ref={ref}
        className={`relative ${isVisible ? 'animate-slide-in-left' : 'opacity-0'}`}
        style={{ animationDelay: `${index * 100}ms` }}
      >
        {/* Timeline dot */}
        <div className="absolute -left-[1px] top-6 w-4 h-4 rounded-full bg-primary border-4 border-background hidden md:block" />

        <div className="md:ml-16 glass-card p-6 rounded-2xl hover:scale-[1.02] transition-all duration-300 group">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <h4 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                {event.title}
              </h4>
              {event.description && (
                <p className="text-muted-foreground text-sm mb-3">{event.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>{format(new Date(event.event_date), 'MMM do, yyyy')}</span>
                </div>
                {event.event_time && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-secondary" />
                    <span>{event.event_time}</span>
                  </div>
                )}
                {event.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-accent" />
                    <span>{event.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section id="events" className="section-padding bg-muted/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -z-10" />

      <div className="container-custom">
        <div ref={headerRef} className="text-center mb-16">
          <TextReveal animation="fade-up">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Events & <GradientTextReveal gradient="from-primary via-secondary to-accent">Announcements</GradientTextReveal>
            </h2>
          </TextReveal>
          <TextReveal animation="fade-up" delay={100}>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Stay updated with our latest activities and upcoming events
            </p>
          </TextReveal>
        </div>

        {/* Featured Event */}
        {featuredEvent && (
          <TextReveal animation="scale">
            <div className="glass-card p-8 md:p-12 rounded-3xl mb-12 relative overflow-hidden group">
              {/* Gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5" />

              {/* Featured badge */}
              {/* Featured badge - Responsive positioning */}
              <div className="md:absolute md:top-6 md:right-6 z-20 mb-6 md:mb-0 inline-block">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 md:px-5 md:py-2 rounded-full bg-gradient-to-r from-destructive to-destructive/80 text-destructive-foreground text-xs md:text-sm font-bold animate-pulse shadow-lg">
                  <Bell className="w-3 h-3 md:w-4 md:h-4" />
                  Important Event
                </span>
              </div>

              <div className="relative z-10">
                <h3 className="text-3xl md:text-4xl font-bold mb-6">
                  <GradientTextReveal gradient="from-primary via-secondary to-accent">
                    {featuredEvent.title}
                  </GradientTextReveal>
                </h3>

                <div className="grid md:grid-cols-3 gap-4 md:gap-6 mb-6">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-background/50 backdrop-blur-sm">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0">
                      <Calendar className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground font-medium mb-1">Date</div>
                      <div className="font-bold text-sm md:text-base">
                        {format(new Date(featuredEvent.event_date), 'MMMM do, yyyy')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-xl bg-background/50 backdrop-blur-sm">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-secondary to-secondary/70 flex items-center justify-center shrink-0">
                      <Clock className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground font-medium mb-1">Time</div>
                      <div className="font-bold text-sm md:text-base">
                        {featuredEvent.event_time || 'TBA'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-xl bg-background/50 backdrop-blur-sm">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center shrink-0">
                      <MapPin className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground font-medium mb-1">Location</div>
                      <div className="font-bold text-sm md:text-base">{featuredEvent.location || 'TBA'}</div>
                    </div>
                  </div>
                </div>

                <p className="text-muted-foreground mb-6 text-lg leading-relaxed">
                  {featuredEvent.description}
                </p>

                <Button className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg hover:shadow-primary/50">
                  RSVP Now
                </Button>
              </div>
            </div>
          </TextReveal>
        )}

        {/* Timeline of Upcoming Events */}
        {loading ? (
          <div className="text-center text-muted-foreground animate-pulse">Loading events...</div>
        ) : upcomingEvents.length > 0 ? (
          <div className="mb-12">
            <h3 className="text-2xl font-bold mb-8 text-center md:text-left">Upcoming Events</h3>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-secondary to-accent hidden md:block" />

              <div className="space-y-6">
                {upcomingEvents.map((event, index) => (
                  <UpcomingEventItem key={event.id ?? index} event={event} index={index} />
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* Schedule */}
        <TextReveal animation="fade-up">
          <div className="glass-card p-8 rounded-3xl relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-2xl" />
            <div className="relative z-10">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-6 text-center">Club Schedule</h3>
              {schedules.length > 0 ? (
                <div className="space-y-3 max-w-3xl mx-auto">
                  {schedules.map((schedule) => (
                    <div key={schedule.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-background/50 hover:bg-background/70 transition-colors group">
                      <div className="flex-1 mb-3 md:mb-0">
                        <h4 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">{schedule.title}</h4>
                        {schedule.description && (
                          <p className="text-sm text-muted-foreground">{schedule.description}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        {schedule.day_of_week && (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10">
                            <Calendar className="w-4 h-4 text-primary" />
                            <span className="font-medium">{schedule.day_of_week}</span>
                          </div>
                        )}
                        {(schedule.start_time || schedule.end_time) && (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/10">
                            <Clock className="w-4 h-4 text-secondary" />
                            <span className="font-medium">
                              {schedule.start_time}
                              {schedule.end_time && ` - ${schedule.end_time}`}
                            </span>
                          </div>
                        )}
                        {schedule.location && (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/10">
                            <MapPin className="w-4 h-4 text-accent" />
                            <span className="font-medium">{schedule.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground max-w-2xl mx-auto text-center">
                  Our engaging sessions are typically conducted after school hours to accommodate student schedules.
                  The specific timetable will be provided upon successful enrollment.
                </p>
              )}
            </div>
          </div>
        </TextReveal>
      </div>
    </section>
  );
};

export default Events;
