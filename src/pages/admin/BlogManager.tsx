import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author_name: string;
  author_image_url: string | null;
  cover_image_url: string | null;
  category: string | null;
  tags: string[] | null;
  is_published: boolean;
  published_at: string | null;
}

const BlogManager = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
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
    is_published: false,
  });

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      toast.error("Failed to fetch blog posts");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const postData = {
        ...formData,
        tags: formData.tags ? formData.tags.split(",").map(t => t.trim()) : null,
        published_at: formData.is_published ? new Date().toISOString() : null,
        author_image_url: formData.author_image_url || null,
        cover_image_url: formData.cover_image_url || null,
        category: formData.category || null,
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

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      author_name: post.author_name,
      author_image_url: post.author_image_url || "",
      cover_image_url: post.cover_image_url || "",
      category: post.category || "",
      tags: post.tags ? post.tags.join(", ") : "",
      is_published: post.is_published,
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
      is_published: false,
    });
    setEditingPost(null);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Blog Manager</h1>
          <p className="text-muted-foreground">Create and manage blog posts</p>
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
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium">{post.title}</TableCell>
                  <TableCell>{post.category || "-"}</TableCell>
                  <TableCell>{post.author_name}</TableCell>
                  <TableCell>
                    <Badge variant={post.is_published ? "default" : "secondary"}>
                      {post.is_published ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
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
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPost ? "Edit Post" : "Create New Post"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea
                id="excerpt"
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={10}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="author_name">Author Name *</Label>
                <Input
                  id="author_name"
                  value={formData.author_name}
                  onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="innovation, technology, robotics"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cover_image_url">Cover Image URL</Label>
                <Input
                  id="cover_image_url"
                  value={formData.cover_image_url}
                  onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="author_image_url">Author Image URL</Label>
                <Input
                  id="author_image_url"
                  value={formData.author_image_url}
                  onChange={(e) => setFormData({ ...formData, author_image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_published"
                checked={formData.is_published}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_published: checked })
                }
              />
              <Label htmlFor="is_published">Publish immediately</Label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="btn-glow">
                {loading ? "Saving..." : editingPost ? "Update Post" : "Create Post"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BlogManager;
