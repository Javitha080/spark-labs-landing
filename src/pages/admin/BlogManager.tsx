import { useState, useEffect } from "react";
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
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAdmin, setIsAdmin] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const form = useForm<BlogPostFormValues>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: {
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      author_name: "",
      author_image_url: "",
      cover_image_url: "",
      category: "",
      tags: "",
      tech_stack: "",
      status: "draft",
      is_featured: false,
    },
  });

  useEffect(() => {
    checkUserRole();
    fetchPosts();
  }, []);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.rpc('is_admin', { user_id: user.id });
        setIsAdmin(data || false);
      }
    } catch (err) {
      console.error("Error checking role:", err);
    }
  };

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts((data || []) as BlogPost[]);
    } catch (error) {
      toast.error("Failed to fetch blog posts");
    }
  };

  const onSubmit = async (values: BlogPostFormValues) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const postData = {
        title: values.title,
        slug: values.slug,
        content: values.content,
        author_name: values.author_name,
        category: values.category,
        status: values.status,
        is_featured: values.is_featured,
        excerpt: values.excerpt || null,
        author_image_url: values.author_image_url || null,
        cover_image_url: values.cover_image_url || null,
        tags: values.tags ? values.tags.split(",").map(t => t.trim()).filter(Boolean) : null,
        tech_stack: values.tech_stack ? values.tech_stack.split(",").map(t => t.trim()).filter(Boolean) : null,
        published_at: values.status === 'published' ? new Date().toISOString() : null,
        author_id: user?.id || null,
      };

      if (editingPost) {
        const { error } = await supabase
          .from("blog_posts")
          .update(postData)
          .eq("id", editingPost.id);

        if (error) throw error;
        toast.success("Post updated successfully");
      } else {
        const { error } = await supabase
          .from("blog_posts")
          .insert([postData]);

        if (error) throw error;
        toast.success("Post created successfully");
      }

      setSheetOpen(false);
      fetchPosts();
    } catch (error: any) {
      toast.error(error.message || "Failed to save post");
    } finally {
      setLoading(false);
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
    } catch (error: any) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    } finally {
      setLoading(false);
      setPostToDelete(null);
    }
  };

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    form.reset({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || "",
      content: post.content,
      author_name: post.author_name,
      author_image_url: post.author_image_url || "",
      cover_image_url: post.cover_image_url || "",
      category: post.category || "",
      tags: post.tags ? post.tags.join(", ") : "",
      tech_stack: post.tech_stack ? post.tech_stack.join(", ") : "",
      status: (post.status as BlogPostStatus) || 'draft',
      is_featured: post.is_featured || false,
    });
    setSheetOpen(true);
  };

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  };

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
          onClick={() => {
            setEditingPost(null);
            form.reset({
              title: "",
              slug: "",
              excerpt: "",
              content: "",
              author_name: "",
              author_image_url: "",
              cover_image_url: "",
              category: "",
              tags: "",
              tech_stack: "",
              status: "draft",
              is_featured: false,
            });
            setSheetOpen(true);
          }}
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
                          onClick={() => handleEdit(post)}
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

      {/* Editor Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-4xl p-0 h-[100dvh] flex flex-col border-l border-border/50 bg-background/95 backdrop-blur-xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
              <SheetHeader className="p-6 border-b border-border/50 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <SheetTitle className="text-2xl font-bold flex items-center gap-2">
                      {editingPost ? <Pencil className="w-6 h-6 text-primary" /> : <Plus className="w-6 h-6 text-primary" />}
                      {editingPost ? "Refine Innovation Story" : "Draft New Discovery"}
                    </SheetTitle>
                    <SheetDescription>
                      Document the scientific process and breakthroughs for the community.
                    </SheetDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer transition-all",
                        showPreview ? "bg-primary/20 text-primary border border-primary/30" : "bg-muted hover:bg-muted/80 border border-transparent"
                      )}
                      onClick={() => setShowPreview(!showPreview)}
                    >
                      <Eye className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Preview</span>
                    </div>
                    <Button type="submit" disabled={loading} className="btn-glow px-10">
                      {loading ? "Processing..." : editingPost ? "Save Breakthrough" : "Publish to Lab"}
                    </Button>
                  </div>
                </div>
              </SheetHeader>

              <ScrollArea className="flex-1">
                <div className="p-8 space-y-10">
                  {showPreview ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="max-w-2xl mx-auto space-y-8">
                        <div className="space-y-4">
                          <Badge className="bg-primary/20 text-primary border-primary/20">{form.watch("category") || "Field Research"}</Badge>
                          <h1 className="text-5xl font-black tracking-tight">{form.watch("title") || "Untitled Discovery"}</h1>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 overflow-hidden">
                                {form.watch("author_image_url") && <img src={form.watch("author_image_url")} className="w-full h-full object-cover" />}
                              </div>
                              <span className="font-bold">{form.watch("author_name") || "Lead Scientist"}</span>
                            </div>
                            <span>•</span>
                            <span>{format(new Date(), "MMM dd, yyyy")}</span>
                          </div>
                        </div>

                        <div className="aspect-video rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl">
                          {form.watch("cover_image_url") ? (
                            <img src={form.watch("cover_image_url")} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <ImageIcon className="w-12 h-12 opacity-20" />
                            </div>
                          )}
                        </div>

                        <div className="prose prose-invert max-w-none">
                          <div dangerouslySetInnerHTML={{ __html: form.watch("content") }} />
                        </div>

                        {form.watch("tags") && (
                          <div className="flex flex-wrap gap-2 pt-8 border-t border-border/50">
                            {form.watch("tags").split(",").map(tag => (
                              <Badge key={tag} variant="outline" className="text-[10px] uppercase font-bold">{tag.trim()}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* General Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* ... existing fields ... */}
                        <div className="space-y-6">
                          <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Story Title</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="The Future of Robotics..."
                                    className="text-lg font-medium h-12 bg-background/50"
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      if (!editingPost) form.setValue("slug", generateSlug(e.target.value));
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="slug"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Slug (URL path)</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">/blog/</span>
                                    <Input className="pl-14 h-10 text-xs bg-background/50 font-mono" {...field} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="space-y-6">
                          <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Focus Area</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-12 bg-background/50">
                                      <SelectValue placeholder="Select scientific field" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="status"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Visibility</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value} disabled={!isAdmin && field.value === 'published'}>
                                    <FormControl>
                                      <SelectTrigger className="bg-background/50 h-10 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="draft">Draft</SelectItem>
                                      <SelectItem value="in_review">In Review</SelectItem>
                                      {isAdmin && <SelectItem value="published">Published</SelectItem>}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="is_featured"
                              render={({ field }) => (
                                <FormItem className="flex items-end h-16">
                                  <FormControl>
                                    <div
                                      className={cn(
                                        "flex items-center gap-3 w-full p-2.5 rounded-xl border border-border/50 transition-all cursor-pointer",
                                        field.value ? "bg-primary/10 border-primary/50 text-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                                      )}
                                      onClick={() => field.onChange(!field.value)}
                                    >
                                      <Sparkles className={cn("w-4 h-4", field.value ? "text-primary animate-pulse" : "opacity-30")} />
                                      <span className="text-[10px] font-black tracking-widest uppercase">Pin Story</span>
                                    </div>
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Summary & Tags */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="md:col-span-2 space-y-6">
                          <FormField
                            control={form.control}
                            name="excerpt"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Abstract (Summary)</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Briefly describe the objective and methodology..."
                                    className="min-h-[100px] resize-none bg-background/50 text-sm leading-relaxed"
                                    {...field}
                                    value={field.value || ""}
                                  />
                                </FormControl>
                                <FormDescription>Shown in library listings and search results.</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="space-y-6">
                          <FormField
                            control={form.control}
                            name="tags"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Keywords (Tags)</FormLabel>
                                <FormControl>
                                  <Input placeholder="Energy, Arduino, AI..." className="bg-background/50 h-10 text-xs font-mono" {...field} />
                                </FormControl>
                                <FormDescription className="text-[10px]">Separate with commas.</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="tech_stack"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lab Equipment / Tools</FormLabel>
                                <FormControl>
                                  <Input placeholder="Microscope, Python, CAD..." className="bg-background/50 h-10 text-xs font-mono" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Media Section */}
                      <div className="space-y-6 bg-muted/20 p-6 rounded-2xl border border-border/30">
                        <h3 className="text-sm font-black tracking-widest uppercase text-primary/70">Scientific Documentation (Media)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <FormField
                            control={form.control}
                            name="cover_image_url"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                  <ImageIcon className="h-4 w-4" /> Principal Discovery Image
                                </FormLabel>
                                <div className="space-y-4">
                                  <FormControl>
                                    <Input placeholder="URL to primary visual evidence..." className="bg-background/50 h-10 text-xs" {...field} value={field.value || ""} />
                                  </FormControl>
                                  <div className="aspect-video rounded-xl bg-background/50 border border-border/50 flex items-center justify-center overflow-hidden relative group">
                                    {field.value ? (
                                      <img src={field.value} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                      <div className="text-center space-y-2 opacity-30">
                                        <ImageIcon className="h-10 w-10 mx-auto" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">No documentation found</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="space-y-6">
                            <FormField
                              control={form.control}
                              name="author_name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Primary Researcher</FormLabel>
                                  <FormControl>
                                    <Input className="bg-background/50 h-10 text-sm font-bold" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="author_image_url"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Researcher Profile</FormLabel>
                                  <div className="flex items-center gap-4">
                                    <FormControl>
                                      <Input placeholder="Avatar URL..." className="bg-background/50 h-10 text-xs flex-1" {...field} value={field.value || ""} />
                                    </FormControl>
                                    <div className="h-12 w-12 rounded-full border border-border/50 overflow-hidden bg-background/50">
                                      {field.value ? <img src={field.value} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-primary/10 flex items-center justify-center text-[10px] font-bold">PI</div>}
                                    </div>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Main Content */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-black tracking-widest uppercase text-muted-foreground">Detailed Methodology & Results</h3>
                        <FormField
                          control={form.control}
                          name="content"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <RichTextEditor
                                  content={field.value}
                                  onChange={field.onChange}
                                  className="min-h-[500px]"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
              <SheetFooter className="p-6 border-t border-border/50 bg-muted/30">
                <div className="flex justify-end gap-3 w-full">
                  <Button type="button" variant="outline" onClick={() => setSheetOpen(false)} className="rounded-xl px-8 h-12">Discard Changes</Button>
                  <Button type="submit" disabled={loading} className="btn-glow px-12 h-12 rounded-xl">
                    {loading ? "Syncing..." : "Finalize Story"}
                  </Button>
                </div>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

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

