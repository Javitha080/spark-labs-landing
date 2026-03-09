import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, FolderOpen, Star, StarOff, Search, Image as ImageIcon, X, LayoutGrid, List, Upload } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

const projectSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().trim().max(1000, "Description must be less than 1000 characters").optional(),
  image_url: z.string().trim().url("Must be a valid URL").max(500, "URL must be less than 500 characters").optional().or(z.literal("")),
  category: z.string().trim().max(100, "Category must be less than 100 characters").optional(),
  display_order: z.number().int().min(0).max(999),
  is_featured: z.boolean(),
});

interface Project {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  category: string | null;
  display_order: number;
  is_featured: boolean;
  created_at: string;
}

const CATEGORIES = [
  "Robotics",
  "AI & Machine Learning",
  "IoT",
  "Sustainability",
  "Healthcare",
  "Education",
  "Mobile Apps",
  "Web Development",
  "Hardware",
  "Other"
];

const ProjectsManager = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image_url: "",
    category: "",
    display_order: 0,
    is_featured: false,
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Error loading projects",
        description: err.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const dataToValidate = {
        ...formData,
        image_url: formData.image_url || undefined,
      };

      const validationResult = projectSchema.safeParse(dataToValidate);
      if (!validationResult.success) {
        toast({
          title: "Validation Error",
          description: validationResult.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }

      const dataToSubmit = {
        title: validationResult.data.title,
        description: validationResult.data.description || null,
        category: validationResult.data.category || null,
        display_order: validationResult.data.display_order,
        is_featured: validationResult.data.is_featured,
        image_url: validationResult.data.image_url || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("projects")
          .update(dataToSubmit)
          .eq("id", editingId);

        if (error) throw error;
        toast({ title: "Project updated successfully" });
      } else {
        const { error } = await supabase.from("projects").insert([dataToSubmit]);

        if (error) throw error;
        toast({ title: "Project created successfully" });
      }

      fetchProjects();
      resetForm();
      setShowForm(false);
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Error saving project",
        description: err.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("projects").delete().eq("id", id);

      if (error) throw error;
      toast({ title: "Project deleted successfully" });
      fetchProjects();
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Error deleting project",
        description: err.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (project: Project) => {
    setEditingId(project.id);
    setFormData({
      title: project.title,
      description: project.description || "",
      image_url: project.image_url || "",
      category: project.category || "",
      display_order: project.display_order,
      is_featured: project.is_featured,
    });
    setShowForm(true);
  };

  const toggleFeatured = async (project: Project) => {
    try {
      const { error } = await supabase
        .from("projects")
        .update({ is_featured: !project.is_featured })
        .eq("id", project.id);

      if (error) throw error;
      toast({ title: project.is_featured ? "Removed from featured" : "Added to featured" });
      fetchProjects();
    } catch (error) {
      toast({ title: "Error updating project", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      image_url: "",
      category: "",
      display_order: projects.length,
      is_featured: false,
    });
    setEditingId(null);
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || project.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const uniqueCategories = [...new Set(projects.map(p => p.category).filter(Boolean))];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Projects Manager
          </h1>
          <p className="text-muted-foreground text-lg">Showcase your innovation projects</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          size="lg"
          className="btn-glow px-8 rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-all"
        >
          <Plus className="mr-2 h-5 w-5" />
          Add Project
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Projects", value: projects.length, icon: FolderOpen, color: "text-primary" },
          { label: "Featured", value: projects.filter(p => p.is_featured).length, icon: Star, color: "text-yellow-500" },
          { label: "Categories", value: uniqueCategories.length, icon: LayoutGrid, color: "text-green-500" },
        ].map((stat, i) => (
          <Card key={i} className="glass-card hover:border-primary/50 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className={cn("text-3xl font-bold mb-1", stat.color)}>{stat.value}</div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                </div>
                <stat.icon className={cn("h-8 w-8 opacity-20", stat.color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              className="pl-10 w-full sm:w-80 bg-background/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-background/50">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {uniqueCategories.map(cat => (
                <SelectItem key={cat} value={cat!}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Form Card */}
      {showForm && (
        <Card className="glass-card border-primary/30 animate-in slide-in-from-top-4 duration-300">
          <CardHeader className="border-b border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  {editingId ? <Pencil className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                  {editingId ? "Edit Project" : "Add New Project"}
                </CardTitle>
                <CardDescription>Fill in the project details</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column - Image */}
                <div className="space-y-4">
                  <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Project Image</Label>
                  <div className="aspect-video rounded-xl bg-muted/30 border-2 border-dashed border-border/50 flex items-center justify-center overflow-hidden relative group">
                    {formData.image_url ? (
                      <>
                        <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setFormData({ ...formData, image_url: "" })}
                          >
                            Change Image
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center space-y-2 p-8">
                        <Upload className="h-10 w-10 mx-auto text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">Enter image URL below</p>
                      </div>
                    )}
                  </div>
                  <Input
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://example.com/project-image.jpg"
                    maxLength={500}
                  />
                </div>

                {/* Right Column - Details */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      maxLength={200}
                      className="mt-1.5 text-lg font-medium"
                      placeholder="Smart Irrigation System"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                      maxLength={1000}
                      className="mt-1.5"
                      placeholder="Describe your project..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                      >
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="display_order">Display Order</Label>
                      <Input
                        id="display_order"
                        type="number"
                        value={formData.display_order}
                        onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                        min={0}
                        max={999}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-3">
                      <Star className={cn("h-5 w-5", formData.is_featured ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground")} />
                      <div>
                        <Label htmlFor="is_featured" className="text-sm font-medium">Featured Project</Label>
                        <p className="text-xs text-muted-foreground">Show on homepage</p>
                      </div>
                    </div>
                    <Switch
                      id="is_featured"
                      checked={formData.is_featured}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border/50">
                <Button type="submit" className="btn-glow flex-1">
                  {editingId ? "Update Project" : "Create Project"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="aspect-video bg-muted/30 animate-pulse" />
              <CardContent className="p-4 space-y-2">
                <div className="h-6 bg-muted/30 rounded animate-pulse" />
                <div className="h-4 bg-muted/30 rounded w-2/3 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredProjects.length > 0 ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="group overflow-hidden hover:border-primary/50 transition-all duration-300">
                <div className="aspect-video relative overflow-hidden bg-muted/30">
                  {project.image_url ? (
                    <img
                      src={project.image_url}
                      alt={project.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                  {project.is_featured && (
                    <Badge className="absolute top-3 left-3 bg-yellow-500/90 text-yellow-950 hover:bg-yellow-500">
                      <Star className="h-3 w-3 mr-1 fill-current" /> Featured
                    </Badge>
                  )}
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 bg-black/50 backdrop-blur-sm hover:bg-primary/80"
                      onClick={() => toggleFeatured(project)}
                    >
                      {project.is_featured ? <StarOff className="h-3 w-3" /> : <Star className="h-3 w-3" />}
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 bg-black/50 backdrop-blur-sm hover:bg-primary/80"
                      onClick={() => handleEdit(project)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 bg-black/50 backdrop-blur-sm hover:bg-destructive/80"
                      onClick={() => setProjectToDelete(project.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-lg line-clamp-1">{project.title}</h3>
                    <Badge variant="outline" className="text-[10px] shrink-0">#{project.display_order}</Badge>
                  </div>
                  {project.category && (
                    <Badge variant="secondary" className="text-xs">{project.category}</Badge>
                  )}
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="glass-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project) => (
                  <TableRow key={project.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-10 rounded-lg bg-muted/30 overflow-hidden shrink-0">
                          {project.image_url ? (
                            <img src={project.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{project.title}</p>
                          {project.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 max-w-xs">{project.description}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {project.category ? (
                        <Badge variant="secondary">{project.category}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{project.display_order}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleFeatured(project)}
                      >
                        <Star className={cn("h-4 w-4", project.is_featured ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground")} />
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEdit(project)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive" onClick={() => setProjectToDelete(project.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )
      ) : (
        <Card className="glass-card py-20">
          <div className="text-center space-y-4">
            <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground/30" />
            <div>
              <p className="text-lg font-medium text-muted-foreground">No projects found</p>
              <p className="text-sm text-muted-foreground/70">Start by adding your first project</p>
            </div>
            <Button onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Add First Project
            </Button>
          </div>
        </Card>
      )}

      <AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The project will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (projectToDelete) { handleDelete(projectToDelete); setProjectToDelete(null); } }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProjectsManager;
