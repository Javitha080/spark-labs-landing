// react-doctor-disable no-giant-component
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Calendar, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { z } from "zod";

const eventSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().max(2000, "Description must be less than 2000 characters").transform(val => val || "").optional(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  event_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time format (use HH:MM)").transform(val => val ? val.substring(0, 5) : "").optional().or(z.literal("")),
  location: z.string().max(200, "Location must be less than 200 characters").transform(val => val || "").optional(),
  category: z.string().max(100, "Category must be less than 100 characters").transform(val => val || "").optional(),
  is_featured: z.boolean(),
});

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  location: string;
  is_featured: boolean;
  category: string;
}

type EventInsert = Database["public"]["Tables"]["events"]["Insert"];

const EventsManager = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    event_date: "",
    event_time: "",
    location: "",
    is_featured: false,
    category: "",
  });


  const fetchEvents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEvents();
  }, [fetchEvents]);

  // Realtime: auto-refresh when events table changes externally
  useRealtimeSync(["events"], { onUpdate: fetchEvents });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate input data
      const validationResult = eventSchema.safeParse(formData);
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(err => err.message).join(", ");
        toast({
          title: "Validation Error",
          description: errors,
          variant: "destructive",
        });
        return;
      }

      const dataToSave = validationResult.data as EventInsert;

      if (editingEvent) {
        const { error } = await supabase
          .from("events")
          .update(dataToSave)
          .eq("id", editingEvent.id);

        if (error) throw error;
        toast({ title: "Event updated successfully!" });
      } else {
        const { error } = await supabase
          .from("events")
          .insert([dataToSave]);

        if (error) throw error;
        toast({ title: "Event created successfully!" });
      }

      setDialogOpen(false);
      resetForm();
      fetchEvents();
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Error",
        description: err.message || "Failed to save event. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Event deleted successfully!" });
      fetchEvents();
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || "",
      event_date: event.event_date,
      event_time: event.event_time ? event.event_time.substring(0, 5) : "",
      location: event.location || "",
      is_featured: event.is_featured,
      category: event.category || "",
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      event_date: "",
      event_time: "",
      location: "",
      is_featured: false,
      category: "",
    });
    setEditingEvent(null);
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold gradient-text">Events Manager</h1>
          <p className="text-muted-foreground mt-1">Manage club events and announcements</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button variant="hero" size="lg">
              <Plus className="size-5" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[90vh]">
            <form 
              onSubmit={handleSubmit} 
              className="flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[90vh] overflow-hidden"
            >
              <DialogHeader className="px-6 py-4 border-b border-border/40">
                <DialogTitle>{editingEvent ? "Edit Event" : "Create New Event"}</DialogTitle>
                <DialogDescription>
                  Fill in the details below to {editingEvent ? "update the" : "create a new"} event.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-grow overflow-y-auto px-6 py-4 space-y-4">
                <div>
                  {/* react-doctor-disable label-has-associated-control */}
                  <label htmlFor="evt-title" className="block text-sm font-medium mb-2">Event Title</label>
                  <Input
                    id="evt-title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="Annual General Meeting"
                  />
                </div>

                <div>
                  {/* react-doctor-disable label-has-associated-control */}
                  <label htmlFor="evt-desc" className="block text-sm font-medium mb-2">Description</label>
                  <Textarea
                    id="evt-desc"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Event description..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    {/* react-doctor-disable label-has-associated-control */}
                    <label htmlFor="evt-date" className="block text-sm font-medium mb-2">Date</label>
                    <Input
                      id="evt-date"
                      type="date"
                      value={formData.event_date}
                      onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    {/* react-doctor-disable label-has-associated-control */}
                    <label htmlFor="evt-time" className="block text-sm font-medium mb-2">Time</label>
                    <Input
                      id="evt-time"
                      type="time"
                      value={formData.event_time}
                      onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    {/* react-doctor-disable label-has-associated-control */}
                    <label htmlFor="evt-loc" className="block text-sm font-medium mb-2">Location</label>
                    <Input
                      id="evt-loc"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="School Main Hall"
                    />
                  </div>
                  <div>
                    {/* react-doctor-disable label-has-associated-control */}
                    <label htmlFor="evt-cat" className="block text-sm font-medium mb-2">Category</label>
                    <Input
                      id="evt-cat"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="Workshop, Competition, etc."
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                  />
                  {/* react-doctor-disable label-has-associated-control */}
                  <label className="text-sm font-medium">Featured Event</label>
                </div>
              </div>
              <DialogFooter className="px-6 py-4 border-t border-border/40 flex-row sm:justify-end gap-2 bg-muted/20">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="hero" className="px-6">
                  {editingEvent ? "Update Event" : "Create Event"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-16"><Loader2 className="size-8 animate-spin mx-auto text-primary" /><p className="text-muted-foreground mt-4">Loading events&hellip;</p></div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <Calendar className="size-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold mb-1">No events yet</h3>
          <p className="text-muted-foreground text-sm">Click 'Add Event' to create your first event.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="hidden md:table-cell">Time</TableHead>
                  <TableHead className="hidden lg:table-cell">Location</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{event.title}</TableCell>
                    <TableCell className="hidden sm:table-cell">{new Date(event.event_date).toLocaleDateString()}</TableCell>
                    <TableCell className="hidden md:table-cell">{event.event_time || "-"}</TableCell>
                    <TableCell className="hidden lg:table-cell truncate max-w-[150px]">{event.location || "-"}</TableCell>
                    <TableCell>
                      {event.is_featured && (
                        <span className="px-2 py-1 bg-accent text-accent-foreground rounded-full text-xs">
                          Featured
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="size-8 p-0" onClick={() => handleEdit(event)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="size-8 p-0" onClick={() => setEventToDelete(event.id)}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Mobile card view */}
      <div className="sm:hidden space-y-3">
        {events.map((event) => (
          <Card key={event.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{event.title}</p>
                <p className="text-sm text-muted-foreground">{new Date(event.event_date).toLocaleDateString()} {event.event_time ? `· ${event.event_time}` : ""}</p>
                {event.location && <p className="text-xs text-muted-foreground truncate">{event.location}</p>}
              </div>
              {event.is_featured && <Badge variant="secondary" className="text-[10px] shrink-0">Featured</Badge>}
            </div>
            <div className="flex justify-end gap-1 mt-3 pt-3 border-t">
              <Button variant="outline" size="sm" className="size-8 p-0" onClick={() => handleEdit(event)}>
                <Pencil className="size-4" />
              </Button>
              <Button variant="destructive" size="sm" className="size-8 p-0" onClick={() => setEventToDelete(event.id)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!eventToDelete} onOpenChange={(open) => !open && setEventToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The event will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (eventToDelete) { handleDelete(eventToDelete); setEventToDelete(null); } }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EventsManager;
