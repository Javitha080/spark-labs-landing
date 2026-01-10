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
import { Pencil, Trash2, Plus, Eye, Check, Clock, FileText, Search, Image as ImageIcon, Tag } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import RichTextEditor from "@/components/blog/RichTextEditor";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type BlogPostStatus = 'draft' | 'in_review' | 'published';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  author_name: string;
  author_image_url: string | null;
  cover_image_url: string | null;
  category: string | null;
  tags: string[] | null;
  status: BlogPostStatus;
  is_featured: boolean;
  tech_stack: string[] | null;
  reading_time_minutes: number | null;
  published_at: string | null;
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
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
    status: "draft" as BlogPostStatus,
    is_featured: false,
  });

  useEffect(() => {
    checkUserRole();
    fetchPosts();
  }, []);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      const { data } = await supabase.rpc('is_admin', { user_id: user.id });
      setIsAdmin(data || false);
    }
  };

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Map the data to include proper status handling
      const mappedPosts = (data || []).map(post => ({
        ...post,
        status: (post.status as BlogPostStatus) || 'draft',
        is_featured: post.is_featured || false,
        tech_stack: post.tech_stack || null,
        reading_time_minutes: post.reading_time_minutes || null,
      }));
      
      setPosts(mappedPosts);
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      toast.error("Failed to fetch blog posts");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Determine status - non-admins can only create drafts
      let finalStatus = formData.status;
      if (!isAdmin && !editingPost) {
        finalStatus = 'draft';
      }

      const postData = {
        title: formData.title,
        slug: formData.slug,
        excerpt: formData.excerpt || null,
        content: formData.content,
        author_name: formData.author_name,
        author_image_url: formData.author_image_url || null,
        cover_image_url: formData.cover_image_url || null,
        category: formData.category || null,
        tags: formData.tags ? formData.tags.split(",").map(t => t.trim()).filter(Boolean) : null,
        tech_stack: formData.tech_stack ? formData.tech_stack.split(",").map(t => t.trim()).filter(Boolean) : null,
        status: finalStatus,
        is_featured: formData.is_featured,
        published_at: finalStatus === 'published' ? new Date().toISOString() : null,
        author_id: user?.id || null,
      };

      if (editingPost) {
        const { error } = await supabase
          .from("blog_posts")
          .update(postData)
          .eq("id", editingPost.id);

        if (error) throw error;
        toast.success("Blog post updated successfully");
      } else {
        const { error } = await supabase
          .from("blog_posts")
          .insert([postData]);

        if (error) throw error;
        toast.success("Blog post created successfully");
      }

      setDialogOpen(false);
      resetForm();
      fetchPosts();
    } catch (error) {
      console.error("Error saving blog post:", error);
      toast.error("Failed to save blog post");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (post: BlogPost) => {
    if (!isAdmin) {
      toast.error("Only admins can publish posts");
      return;
    }

    try {
      const { error } = await supabase
        .from("blog_posts")
        .update({ 
          status: 'published',
          published_at: new Date().toISOString()
        })
        .eq("id", post.id);

      if (error) throw error;
      toast.success("Post published successfully!");
      fetchPosts();
    } catch (error) {
      console.error("Error publishing post:", error);
      toast.error("Failed to publish post");
    }
  };

  const handleSubmitForReview = async (post: BlogPost) => {
    try {
      const { error } = await supabase
        .from("blog_posts")
        .update({ status: 'in_review' })
        .eq("id", post.id);

      if (error) throw error;
      toast.success("Post submitted for review!");
      fetchPosts();
    } catch (error) {
      console.error("Error submitting for review:", error);
      toast.error("Failed to submit for review");
    }
  };

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
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
      status: post.status,
      is_featured: post.is_featured || false,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      const { error } = await supabase
        .from("blog_posts")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Blog post deleted successfully");
      fetchPosts();
    } catch (error) {
      console.error("Error deleting blog post:", error);
      toast.error("Failed to delete blog post");
    }
  };

  const resetForm = () => {
    setFormData({
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
    setEditingPost(null);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (post.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesStatus = statusFilter === "all" || post.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: BlogPostStatus) => {
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Blog Manager</h1>
          <p className="text-muted-foreground">Create and manage innovation stories</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
          className="btn-glow"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Post
        </Button>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{posts.length}</div>
            <p className="text-sm text-muted-foreground">Total Posts</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-400">
              {posts.filter(p => p.status === 'published').length}
            </div>
            <p className="text-sm text-muted-foreground">Published</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-400">
              {posts.filter(p => p.status === 'in_review').length}
            </div>
            <p className="text-sm text-muted-foreground">In Review</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-muted-foreground">
              {posts.filter(p => p.status === 'draft').length}
            </div>
            <p className="text-sm text-muted-foreground">Drafts</p>
          </CardContent>
        </Card>
      </div>

      {/* Posts Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>All Posts</CardTitle>
          <CardDescription>Manage your blog posts</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPosts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {post.is_featured && (
                        <Badge variant="outline" className="text-primary border-primary">
                          Featured
                        </Badge>
                      )}
                      <span className="font-medium">{post.title}</span>
                    </div>
                    {post.reading_time_minutes && (
                      <span className="text-xs text-muted-foreground">
                        {post.reading_time_minutes} min read
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {post.category ? (
                      <Badge variant="secondary">{post.category}</Badge>
                    ) : "-"}
                  </TableCell>
                  <TableCell>{post.author_name}</TableCell>
                  <TableCell>{getStatusBadge(post.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(post.created_at), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {post.status === 'published' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                        >
                          <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {post.status === 'draft' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSubmitForReview(post)}
                          className="text-yellow-400 hover:text-yellow-300"
                        >
                          Submit
                        </Button>
                      )}
                      {post.status === 'in_review' && isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePublish(post)}
                          className="text-green-400 hover:text-green-300"
                        >
                          Publish
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(post)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(post.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredPosts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No posts found. Create your first innovation story!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
            <DialogTitle className="text-xl">
              {editingPost ? "Edit Post" : "Create New Post"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row h-[calc(95vh-120px)]">
            {/* Main Editor Area */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          title: e.target.value,
                          slug: generateSlug(e.target.value),
                        });
                      }}
                      placeholder="Enter a compelling title..."
                      className="text-lg"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="slug">URL Slug</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="auto-generated-from-title"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="excerpt">Excerpt</Label>
                    <Textarea
                      id="excerpt"
                      value={formData.excerpt}
                      onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                      placeholder="Brief summary for search results and previews..."
                      rows={2}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Content *</Label>
                    <RichTextEditor
                      content={formData.content}
                      onChange={(content) => setFormData({ ...formData, content })}
                      placeholder="Share your innovation story..."
                      className="min-h-[400px]"
                    />
                  </div>
                </div>
              </ScrollArea>
            </div>

            {/* Sidebar Settings */}
            <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-border/50 bg-muted/20">
              <ScrollArea className="h-full">
                <div className="p-6 space-y-6">
                  <Tabs defaultValue="general" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="general">General</TabsTrigger>
                      <TabsTrigger value="media">Media</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="general" className="space-y-4 mt-4">
                      {/* Status */}
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                          value={formData.status}
                          onValueChange={(value: BlogPostStatus) => 
                            setFormData({ ...formData, status: value })
                          }
                          disabled={!isAdmin && formData.status === 'published'}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="in_review">In Review</SelectItem>
                            {isAdmin && <SelectItem value="published">Published</SelectItem>}
                          </SelectContent>
                        </Select>
                        {!isAdmin && (
                          <p className="text-xs text-muted-foreground">
                            Submit for review to request publishing
                          </p>
                        )}
                      </div>

                      {/* Category */}
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => setFormData({ ...formData, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Author */}
                      <div className="space-y-2">
                        <Label htmlFor="author_name">Author Name *</Label>
                        <Input
                          id="author_name"
                          value={formData.author_name}
                          onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                          required
                        />
                      </div>

                      <Separator />

                      {/* Tags */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          Tags
                        </Label>
                        <Input
                          value={formData.tags}
                          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                          placeholder="robotics, AI, arduino"
                        />
                        <p className="text-xs text-muted-foreground">Comma-separated</p>
                      </div>

                      {/* Tech Stack */}
                      <div className="space-y-2">
                        <Label>Tech Stack / Tools Used</Label>
                        <Input
                          value={formData.tech_stack}
                          onChange={(e) => setFormData({ ...formData, tech_stack: e.target.value })}
                          placeholder="Arduino, Python, 3D Printing"
                        />
                        <p className="text-xs text-muted-foreground">
                          List technologies used in this project
                        </p>
                      </div>

                      {/* Featured Toggle */}
                      {isAdmin && (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <Label htmlFor="featured" className="cursor-pointer">
                            Featured Post
                          </Label>
                          <input
                            type="checkbox"
                            id="featured"
                            checked={formData.is_featured}
                            onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                            className="w-4 h-4 accent-primary"
                          />
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="media" className="space-y-4 mt-4">
                      {/* Cover Image */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          Featured Image
                        </Label>
                        <Input
                          value={formData.cover_image_url}
                          onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                          placeholder="https://..."
                        />
                        {formData.cover_image_url && (
                          <div className="mt-2 rounded-lg overflow-hidden border border-border/50">
                            <img 
                              src={formData.cover_image_url} 
                              alt="Cover preview" 
                              className="w-full h-32 object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Author Image */}
                      <div className="space-y-2">
                        <Label>Author Photo</Label>
                        <Input
                          value={formData.author_image_url}
                          onChange={(e) => setFormData({ ...formData, author_image_url: e.target.value })}
                          placeholder="https://..."
                        />
                        {formData.author_image_url && (
                          <div className="mt-2 flex items-center gap-3">
                            <img 
                              src={formData.author_image_url} 
                              alt="Author preview" 
                              className="w-12 h-12 rounded-full object-cover border-2 border-primary/20"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            <span className="text-sm text-muted-foreground">
                              {formData.author_name || "Author"}
                            </span>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>

                  <Separator />

                  {/* Submit Buttons */}
                  <div className="space-y-2">
                    <Button type="submit" disabled={loading} className="w-full btn-glow">
                      {loading ? "Saving..." : editingPost ? "Update Post" : "Create Post"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      className="w-full"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BlogManager;
