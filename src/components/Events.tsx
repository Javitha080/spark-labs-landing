import { Calendar, Clock, MapPin, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

const Events = () => {
  const featuredEvent = {
    title: "Annual General Meeting 2025",
    date: "October 3rd, 2025",
    time: "2:00 PM - 3:00 PM",
    location: "School Main Hall",
    description: "All members are required to attend this crucial annual meeting to discuss club activities, elect new office bearers, and review the year's progress"
  };

  const upcomingEvents = [
    {
      title: "Workshop: Arduino Basics",
      date: "October 15th",
      time: "3:00 PM"
    },
    {
      title: "Innovation Challenge Competition",
      date: "November 5th",
      time: "9:00 AM"
    },
    {
      title: "Field Trip: Tech Museum",
      date: "November 20th",
      time: "8:00 AM"
    },
    {
      title: "Guest Speaker: Industry Expert",
      date: "December 1st",
      time: "2:30 PM"
    }
  ];

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
                  <div className="font-semibold">{featuredEvent.date}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Time</div>
                  <div className="font-semibold">{featuredEvent.time}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Location</div>
                  <div className="font-semibold">{featuredEvent.location}</div>
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

        {/* Upcoming Events Grid */}
        <div>
          <h3 className="text-2xl font-bold mb-6">Upcoming Events</h3>
          <div className="grid md:grid-cols-2 gap-6">
            {upcomingEvents.map((event, index) => (
              <div
                key={index}
                className="glass-card p-6 rounded-xl hover:scale-105 transition-all duration-300 group"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <h4 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">
                  {event.title}
                </h4>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">{event.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">{event.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Schedule Info */}
        <div className="mt-12 glass-card p-8 rounded-2xl text-center animate-fade-up">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold mb-3">Club Schedule</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
            Our engaging sessions are typically conducted after school hours to accommodate student schedules. 
            The specific timetable will be provided upon successful enrollment.
          </p>
          <Button variant="outline">Request Schedule</Button>
        </div>
      </div>
    </section>
  );
};

export default Events;
