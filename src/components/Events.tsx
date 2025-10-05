import { Calendar, Clock, MapPin, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const Events = () => {
  const [featuredEvent, setFeaturedEvent] = useState<any>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .order('event_date', { ascending: true });

        if (eventsError) throw eventsError;

        const featured = eventsData?.find(e => e.is_featured);
        const upcoming = eventsData?.filter(e => !e.is_featured) || [];

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

  return (
    <section id="events" className="section-padding">
      <div className="container-custom">
        <div className="text-center mb-16 animate-fade-up">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Events & <span className="gradient-text">Announcements</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Stay updated with our latest activities and upcoming events
          </p>
        </div>

        {/* Featured Event */}
        {featuredEvent && (
          <div className="glass-card p-8 md:p-12 rounded-2xl mb-12 relative overflow-hidden group animate-fade-up">
            <div className="absolute top-4 right-4">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive text-destructive-foreground text-sm font-medium animate-pulse">
                <Bell className="w-4 h-4" />
                Important Event
              </span>
            </div>

            <div className="relative z-10">
              <h3 className="text-3xl md:text-4xl font-bold mb-6 gradient-text">
                {featuredEvent.title}
              </h3>

              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Date</div>
                    <div className="font-semibold">
                      {format(new Date(featuredEvent.event_date), 'MMMM do, yyyy')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Time</div>
                    <div className="font-semibold">
                      {featuredEvent.event_time || 'TBA'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Location</div>
                    <div className="font-semibold">{featuredEvent.location || 'TBA'}</div>
                  </div>
                </div>
              </div>

              <p className="text-muted-foreground mb-6 text-lg leading-relaxed">
                {featuredEvent.description}
              </p>

              <Button variant="hero" size="lg">
                RSVP Now
              </Button>
            </div>
          </div>
        )}

        {/* Upcoming Events Grid */}
        {loading ? (
          <div className="text-center text-muted-foreground">Loading events...</div>
        ) : upcomingEvents.length > 0 ? (
          <div>
            <h3 className="text-2xl font-bold mb-6">Upcoming Events</h3>
            <div className="grid md:grid-cols-2 gap-6">
              {upcomingEvents.map((event, index) => (
                <div
                  key={event.id}
                  className="glass-card p-6 rounded-xl hover:scale-105 transition-all duration-300 group"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <h4 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">
                    {event.title}
                  </h4>
                  {event.description && (
                    <p className="text-muted-foreground text-sm mb-3">{event.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">
                        {format(new Date(event.event_date), 'MMM do')}
                      </span>
                    </div>
                    {event.event_time && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">{event.event_time}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Schedule Info */}
        <div className="mt-12 glass-card p-8 rounded-2xl animate-fade-up">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold mb-6 text-center">Club Schedule</h3>
          {schedules.length > 0 ? (
            <div className="space-y-4 max-w-3xl mx-auto">
              {schedules.map((schedule) => (
                <div key={schedule.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg bg-background/50 hover:bg-background/70 transition-colors">
                  <div className="flex-1">
                    <h4 className="font-bold text-lg mb-1">{schedule.title}</h4>
                    {schedule.description && (
                      <p className="text-sm text-muted-foreground mb-2">{schedule.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    {schedule.day_of_week && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{schedule.day_of_week}</span>
                      </div>
                    )}
                    {(schedule.start_time || schedule.end_time) && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>
                          {schedule.start_time}
                          {schedule.end_time && ` - ${schedule.end_time}`}
                        </span>
                      </div>
                    )}
                    {schedule.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{schedule.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground max-w-2xl mx-auto mb-6 text-center">
              Our engaging sessions are typically conducted after school hours to accommodate student schedules. 
              The specific timetable will be provided upon successful enrollment.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default Events;
