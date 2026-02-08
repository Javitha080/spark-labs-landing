import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { z } from "zod";

const teacherSchema = z.object({
    name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
    role: z.string().trim().min(1, "Role is required").max(100, "Role must be less than 100 characters"),
    bio: z.string().max(500, "Bio must be less than 500 characters").transform(val => val || "").optional(),
    image_url: z.string().url("Invalid URL format").max(500, "URL too long").transform(val => val || "").optional().or(z.literal("")),
    email: z.string().email("Invalid email format").max(255, "Email too long").transform(val => val || "").optional().or(z.literal("")),
    display_order: z.number().int().min(0, "Display order must be positive"),
});

interface Teacher {
    id: string;
    name: string;
    role: string;
    bio: string;
    image_url: string;
    email: string;
    display_order: number;
}

const TeachersManager = () => {
    const { toast } = useToast();
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        role: "",
        bio: "",
        image_url: "",
        email: "",
        display_order: 0,
    });

     
    useEffect(() => {
        fetchTeachers();
    }, []);

    const fetchTeachers = async () => {
        try {
            const { data, error } = await supabase
                .from("teachers" as any)
                .select("*")
                .order("display_order", { ascending: true });

            if (error) throw error;
            setTeachers((data as any) || []);
        } catch (error) {
            const err = error as Error;
            toast({
                title: "Error",
                description: "Failed to fetch teachers. Make sure the 'teachers' table exists.",
                variant: "destructive",
            });
            console.error("Error fetching teachers:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const validationResult = teacherSchema.safeParse(formData);
            if (!validationResult.success) {
                const errors = validationResult.error.errors.map(err => err.message).join(", ");
                toast({
                    title: "Validation Error",
                    description: errors,
                    variant: "destructive",
                });
                return;
            }

            if (editingTeacher) {
                const { error } = await supabase
                    .from("teachers" as any)
                    .update(formData)
                    .eq("id", editingTeacher.id);
                if (error) throw error;
                toast({ title: "Success", description: "Teacher updated successfully" });
            } else {
                const { error } = await supabase
                    .from("teachers" as any)
                    .insert([formData]);
                if (error) throw error;
                toast({ title: "Success", description: "Teacher added successfully" });
            }

            setDialogOpen(false);
            resetForm();
            fetchTeachers();
        } catch (error) {
            const err = error as Error;
            toast({
                title: "Error",
                description: err.message,
                variant: "destructive",
            });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this teacher?")) return;

        try {
            const { error } = await supabase
                .from("teachers" as any)
                .delete()
                .eq("id", id);

            if (error) throw error;
            toast({ title: "Success", description: "Teacher deleted successfully" });
            fetchTeachers();
        } catch (error) {
            const err = error as Error;
            toast({
                title: "Error",
                description: err.message,
                variant: "destructive",
            });
        }
    };

    const startEdit = (teacher: Teacher) => {
        setEditingTeacher(teacher);
        setFormData({
            name: teacher.name,
            role: teacher.role,
            bio: teacher.bio || "",
            image_url: teacher.image_url || "",
            email: teacher.email || "",
            display_order: teacher.display_order,
        });
        setDialogOpen(true);
    };

    const resetForm = () => {
        setEditingTeacher(null);
        setFormData({
            name: "",
            role: "",
            bio: "",
            image_url: "",
            email: "",
            display_order: 0,
        });
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">Teachers Management</h1>
                    <p className="text-muted-foreground mt-2">Manage the Teachers in Charge section (Limit to 2 recommended)</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button className="gap-2 btn-glow">
                            <Plus className="w-4 h-4" /> Add Teacher
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>{editingTeacher ? "Edit Teacher" : "Add New Teacher"}</DialogTitle>
                            <DialogDescription>
                                Add the details for the Teacher in Charge.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Name</label>
                                <Input
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. John Doe"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Role/Title</label>
                                <Input
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    placeholder="e.g. Teacher in Charge"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Bio (Optional)</label>
                                <Textarea
                                    value={formData.bio}
                                    onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                    placeholder="Short description or message..."
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Image URL (Optional)</label>
                                <Input
                                    value={formData.image_url}
                                    onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Email (Optional)</label>
                                <Input
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="john@example.com"
                                    type="email"
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Display Order</label>
                                <Input
                                    type="number"
                                    value={formData.display_order}
                                    onChange={e => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit">
                                    {editingTeacher ? "Update" : "Add"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-muted/50">
                            <TableHead>Order</TableHead>
                            <TableHead>Image</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {teachers.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    No teachers found. Add one to get started.
                                </TableCell>
                            </TableRow>
                        )}
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : (
                            teachers.map((teacher) => (
                                <TableRow key={teacher.id} className="group hover:bg-muted/50 transition-colors">
                                    <TableCell>{teacher.display_order}</TableCell>
                                    <TableCell>
                                        {teacher.image_url ? (
                                            <img
                                                src={teacher.image_url}
                                                alt={teacher.name}
                                                className="w-10 h-10 rounded-full object-cover border border-border"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs">
                                                No Img
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium">{teacher.name}</TableCell>
                                    <TableCell>{teacher.role}</TableCell>
                                    <TableCell>{teacher.email || "-"}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => startEdit(teacher)}
                                                className="hover:text-primary hover:bg-primary/10"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(teacher.id)}
                                                className="hover:text-destructive hover:bg-destructive/10"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default TeachersManager;
