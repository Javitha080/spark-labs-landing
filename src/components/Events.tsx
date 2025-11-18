import { Calendar, Clock, MapPin, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const Events = () => {
  const [featuredEvent, setFeaturedEvent] = useState<any>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { ref, isVisible } = useScrollAnimation(0.1);

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
    <section id="events" ref={ref} className="section-padding bg-muted/30">
      <div className="container-custom">
        <div 
          className={`text-center mb-16 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">
            Events & <span className="text-primary">Announcements</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-light">
            Stay updated with our latest activities and upcoming events
          </p>
        </div>

        {/* Featured Event */}
        {featuredEvent && (
          <div 
            className={`border border-border/50 bg-card backdrop-blur-sm p-12 rounded-3xl mb-12 relative overflow-hidden transition-all duration-1000 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <div className="absolute top-4 right-4">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive text-destructive-foreground text-sm font-medium">
                <Bell className="w-4 h-4" />
                Important Event
              </span>
            </div>

            <div className="relative z-10">
              <h3 className="text-4xl font-bold mb-6 text-foreground">
                {featuredEvent.title}
              </h3>

              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Date</div>
                    <div className="font-semibold text-foreground">
                      {format(new Date(featuredEvent.event_date), 'MMMM do, yyyy')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Time</div>
                    <div className="font-semibold text-foreground">
                      {featuredEvent.event_time || 'TBA'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Location</div>
                    <div className="font-semibold text-foreground">
                      {featuredEvent.location || 'TBA'}
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-muted-foreground mb-6 leading-relaxed">
                {featuredEvent.description}
              </p>

              <Button size="lg">Register Now</Button>
            </div>
          </div>
        )}

        {/* Timeline of Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div className="space-y-6">
            <h3 className="text-3xl font-bold mb-8 text-foreground">Upcoming Events</h3>
            <div className="relative">
              <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-primary/20" />
              
              <div className="space-y-12">
                {upcomingEvents.map((event, index) => (
                  <div
                    key={event.id}
                    className={`relative transition-all duration-1000 ${
                      isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10"
                    }`}
                    style={{ transitionDelay: `${index * 0.1}s` }}
                  >
                    <div className={`md:grid md:grid-cols-2 md:gap-8 ${index % 2 === 0 ? '' : 'md:grid-flow-dense'}`}>
                      <div className={`${index % 2 === 0 ? 'md:text-right' : 'md:col-start-2'}`}>
                        <div className="border border-border/50 bg-card backdrop-blur-sm p-8 rounded-3xl hover:border-primary/50 transition-colors">
                          <div className="text-sm text-primary font-semibold mb-2">
                            {format(new Date(event.event_date), 'MMMM do, yyyy')}
                          </div>
                          <h4 className="text-2xl font-bold mb-3 text-foreground">{event.title}</h4>
                          <p className="text-muted-foreground mb-4 leading-relaxed">{event.description}</p>
                          <div className="flex flex-wrap gap-3">
                            {event.event_time && (
                              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                                <Clock className="w-3 h-3" />
                                {event.event_time}
                              </span>
                            )}
                            {event.location && (
                              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                                <MapPin className="w-3 h-3" />
                                {event.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="hidden md:flex items-center justify-center">
                        <div className="w-4 h-4 rounded-full bg-primary border-4 border-background" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default Events;
