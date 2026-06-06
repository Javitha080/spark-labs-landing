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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, ClipboardList, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
import { z } from "zod";

const scheduleSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().max(1000, "Description must be less than 1000 characters").transform(val => val || "").optional(),
  day_of_week: z.string().min(1, "Day of week is required"),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (use HH:MM)").transform(val => val || "").optional().or(z.literal("")),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (use HH:MM)").transform(val => val || "").optional().or(z.literal("")),
  location: z.string().max(200, "Location must be less than 200 characters").transform(val => val || "").optional(),
  is_active: z.boolean(),
});

interface Schedule {
  id: string;
  title: string;
  description: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  location: string;
  is_active: boolean;
}

type ScheduleInsert = Database["public"]["Tables"]["schedule"]["Insert"];

const ScheduleManager = () => {
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    day_of_week: "",
    start_time: "",
    end_time: "",
    location: "",
    is_active: true,
  });

  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];


  const fetchSchedules = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("schedule")
        .select("*")
        .order("day_of_week", { ascending: true });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Error",
        description: err.message || "Failed to fetch schedules",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSchedules();
  }, [fetchSchedules]);

  useRealtimeSync(["schedule"], { onUpdate: fetchSchedules });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate input data
      const validationResult = scheduleSchema.safeParse(formData);
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(err => err.message).join(", ");
        toast({
          title: "Validation Error",
          description: errors,
          variant: "destructive",
        });
        return;
      }

      const dataToSave = validationResult.data as ScheduleInsert;

      if (editingSchedule) {
        const { error } = await supabase
          .from("schedule")
          .update(dataToSave)
          .eq("id", editingSchedule.id);

        if (error) throw error;
        toast({ title: "Schedule updated successfully!" });
      } else {
        const { error } = await supabase
          .from("schedule")
          .insert([dataToSave]);

        if (error) throw error;
        toast({ title: "Schedule created successfully!" });
      }

      setDialogOpen(false);
      resetForm();
      fetchSchedules();
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Error",
        description: err.message || "Failed to save schedule. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("schedule")
        .delete()
        .eq("id", id);
        
      if (error) throw error;
      toast({ title: "Schedule deleted successfully!" });
      fetchSchedules();
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      title: schedule.title,
      description: schedule.description || "",
      day_of_week: schedule.day_of_week || "",
      start_time: schedule.start_time || "",
      end_time: schedule.end_time || "",
      location: schedule.location || "",
      is_active: schedule.is_active,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      day_of_week: "",
      start_time: "",
      end_time: "",
      location: "",
      is_active: true,
    });
    setEditingSchedule(null);
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold gradient-text">Schedule Manager</h1>
          <p className="text-muted-foreground mt-1">Manage club meeting schedules</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button variant="hero" size="lg">
              <Plus className="size-5" />
              Add Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[90vh]">
            <form 
              onSubmit={handleSubmit} 
              className="flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[90vh] overflow-hidden"
            >
              <DialogHeader className="px-6 py-4 border-b border-border/40">
                <DialogTitle>{editingSchedule ? "Edit Schedule" : "Create New Schedule"}</DialogTitle>
                <DialogDescription>
                  Set up the schedule details below.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-grow overflow-y-auto px-6 py-4 space-y-4">
                <div>
                  {/* react-doctor-disable label-has-associated-control */}
                  <label htmlFor="sched-title" className="block text-sm font-medium mb-2">Title</label>
                  <Input
                    id="sched-title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="Innovation Workshop"
                  />
                </div>

                <div>
                  {/* react-doctor-disable label-has-associated-control */}
                  <label htmlFor="sched-desc" className="block text-sm font-medium mb-2">Description</label>
                  <Textarea
                    id="sched-desc"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Activity description..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    {/* react-doctor-disable label-has-associated-control */}
                    <label className="block text-sm font-medium mb-2">Day</label>
                    <Select
                      value={formData.day_of_week}
                      onValueChange={(value) => setFormData({ ...formData, day_of_week: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        {daysOfWeek.map((day) => (
                          <SelectItem key={day} value={day}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    {/* react-doctor-disable label-has-associated-control */}
                    <label htmlFor="sched-start" className="block text-sm font-medium mb-2">Start Time</label>
                    <Input
                      id="sched-start"
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    />
                  </div>
                  <div>
                    {/* react-doctor-disable label-has-associated-control */}
                    <label htmlFor="sched-end" className="block text-sm font-medium mb-2">End Time</label>
                    <Input
                      id="sched-end"
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  {/* react-doctor-disable label-has-associated-control */}
                  <label htmlFor="sched-loc" className="block text-sm font-medium mb-2">Location</label>
                  <Input
                    id="sched-loc"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Innovation Lab"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  {/* react-doctor-disable label-has-associated-control */}
                  <label className="text-sm font-medium">Active Schedule</label>
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
                  {editingSchedule ? "Update Schedule" : "Create Schedule"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-16"><Loader2 className="size-8 animate-spin mx-auto text-primary" /><p className="text-muted-foreground mt-4">Loading schedules&hellip;</p></div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <ClipboardList className="size-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold mb-1">No schedules yet</h3>
          <p className="text-muted-foreground text-sm">Click 'Add Schedule' to create your first schedule.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead className="hidden sm:table-cell">Time</TableHead>
                  <TableHead className="hidden md:table-cell">Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium max-w-[150px] truncate">{schedule.title}</TableCell>
                    <TableCell>{schedule.day_of_week || "-"}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {schedule.start_time && schedule.end_time
                        ? `${schedule.start_time} - ${schedule.end_time}`
                        : "-"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell truncate max-w-[150px]">{schedule.location || "-"}</TableCell>
                    <TableCell>
                      {schedule.is_active ? (
                        <Badge variant="secondary" className="text-xs">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="size-8 p-0" onClick={() => handleEdit(schedule)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="size-8 p-0" onClick={() => setScheduleToDelete(schedule.id)}>
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
        {schedules.map((schedule) => (
          <Card key={schedule.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{schedule.title}</p>
                <p className="text-sm text-muted-foreground">{schedule.day_of_week} {schedule.start_time && schedule.end_time ? `· ${schedule.start_time} - ${schedule.end_time}` : ""}</p>
                {schedule.location && <p className="text-xs text-muted-foreground truncate">{schedule.location}</p>}
              </div>
              <Badge variant={schedule.is_active ? "secondary" : "outline"} className="text-[10px] shrink-0">{schedule.is_active ? "Active" : "Inactive"}</Badge>
            </div>
            <div className="flex justify-end gap-1 mt-3 pt-3 border-t">
              <Button variant="outline" size="sm" className="size-8 p-0" onClick={() => handleEdit(schedule)}>
                <Pencil className="size-4" />
              </Button>
              <Button variant="destructive" size="sm" className="size-8 p-0" onClick={() => setScheduleToDelete(schedule.id)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <AlertDialog open={!!scheduleToDelete} onOpenChange={(open) => !open && setScheduleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule Entry?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (scheduleToDelete) { handleDelete(scheduleToDelete); setScheduleToDelete(null); } }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ScheduleManager;
