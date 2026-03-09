import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Eye, Check, Clock, FileText, Search, Image as ImageIcon, Tag, X, ChevronRight, AlertCircle, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import RichTextEditor from "@/components/blog/RichTextEditor";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { blogPostSchema, type BlogPostFormValues } from "@/schemas/blog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
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

type BlogPostStatus = 'draft' | 'in_review' | 'published';

interface BlogPost extends Omit<BlogPostFormValues, 'tags' | 'tech_stack'> {
  id: string;
  tags: string[] | null;
  tech_stack: string[] | null;
  created_at: string;
  author_id: string | null;
}

const CATEGORIES = [
  "Invention",
  "Innovator Profile",
  "News",
  "Tutorial",
  "Project Showcase",
  "Competition",
  "Research"
];

const STATUS_CONFIG = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground", icon: FileText },
  in_review: { label: "In Review", color: "bg-yellow-500/20 text-yellow-400", icon: Clock },
  published: { label: "Published", color: "bg-green-500/20 text-green-400", icon: Check }
};

const BlogManager = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [postToDelete, setPostToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, author_name, author_image_url, cover_image_url, category, status, tags, tech_stack, is_featured, author_id, created_at, updated_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts((data || []) as BlogPost[]);
    } catch (error) {
      toast.error("Failed to fetch blog posts");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("blog_posts")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Post deleted successfully");
      fetchPosts();
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    } finally {
      setLoading(false);
      setPostToDelete(null);
    }
  };

  // ... (keep generateSlug if needed, or remove if unused locally now)
  // Actually generateSlug was used in the form, if we remove the form we don't need it here.

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || post.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Innovation Stories
          </h1>
          <p className="text-muted-foreground text-lg">Manage and publish your club's breakthroughs</p>
        </div>
        <Button
          onClick={() => navigate("/admin/blog/edit")}
          size="lg"
          className="btn-glow px-8 rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-all"
        >
          <Plus className="mr-2 h-5 w-5" />
          Create Story
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Stories", value: posts.length, color: "text-foreground" },
          { label: "Published", value: posts.filter(p => p.status === 'published').length, color: "text-green-500" },
          { label: "In Review", value: posts.filter(p => p.status === 'in_review').length, color: "text-yellow-500" },
          { label: "Drafts", value: posts.filter(p => p.status === 'draft').length, color: "text-muted-foreground" },
        ].map((stat, i) => (
          <Card key={i} className="glass-card hover:border-primary/50 transition-colors">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold mb-1" style={{ color: stat.color.replace('text-', '') }}>{stat.value}</div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Table */}
      <Card className="glass-card overflow-hidden border-border/50">
        <CardHeader className="border-b border-border/50 bg-muted/30 pb-6 pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Story Archives</CardTitle>
                <CardDescription>All innovation posts and scientific documentation</CardDescription>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search stories..."
                  className="pl-10 w-full sm:w-64 bg-background/50"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40 bg-background/50">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stories</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="draft">Drafts</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader className="bg-muted/30 sticky top-0 z-10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[40%] font-semibold py-4">Title & Excerpt</TableHead>
                  <TableHead className="font-semibold">Metadata</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="text-right font-semibold pr-8">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPosts.map((post) => (
                  <TableRow key={post.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell className="py-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {post.is_featured && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/10 border-primary/30 text-primary">
                              <Sparkles className="w-3 h-3 mr-1" /> FEATURED
                            </Badge>
                          )}
                          <span className="font-bold text-base group-hover:text-primary transition-colors line-clamp-1">{post.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 max-w-sm">{post.excerpt || "No excerpt provided..."}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs font-medium text-foreground/80">
                          <ImageIcon className="h-3 w-3" /> {post.category || "Uncategorized"}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Tag className="h-3 w-3" /> {post.author_name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const icon = STATUS_CONFIG[post.status as BlogPostStatus || 'draft'];
                        return (
                          <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider", icon.color)}>
                            <icon.icon className="h-3 w-3" />
                            {icon.label}
                          </div>
                        )
                      })()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(post.created_at), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex justify-end gap-2">
                        {post.status === 'published' && (
                          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" asChild>
                            <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full hover:bg-primary/20 hover:text-primary border-primary/20"
                          onClick={() => navigate(`/admin/blog/edit?id=${post.id}`)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full hover:bg-destructive/20 hover:text-destructive border-destructive/20"
                          onClick={() => setPostToDelete(post.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPosts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <FileText className="h-12 w-12 opacity-20" />
                        <p className="text-lg font-medium">No stories found matching your criteria</p>
                        <Button variant="link" onClick={() => { setSearchQuery(""); setStatusFilter("all") }}>Clear all filters</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>



      <AlertDialog open={!!postToDelete} onOpenChange={(open) => !open && setPostToDelete(null)}>
        <AlertDialogContent className="bg-zinc-950 border-white/10 max-w-md rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tight">Decommission Archival Data?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action will permanently remove the discovery protocol from the Innovation Laboratory archives. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-6">
            <AlertDialogCancel className="bg-white/5 border-white/10 rounded-xl hover:bg-white/10 transition-all">Abort</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => postToDelete && handleDelete(postToDelete)}
              className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-xl transition-all shadow-lg shadow-red-500/20"
            >
              Confirm Decommission
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BlogManager;

