import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, Eye, Save, Loader2, Image as ImageIcon, Wand2, ChevronDown, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import RichTextEditor from "@/components/blog/RichTextEditor";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { blogPostSchema, type BlogPostFormValues } from "@/schemas/blog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";

type BlogPostStatus = 'draft' | 'in_review' | 'published';

const CATEGORIES = [
    "Invention",
    "Innovator Profile",
    "News",
    "Tutorial",
    "Project Showcase",
    "Competition",
    "Research"
];

const AI_TONES = [
    { value: "professional", label: "Professional", description: "Formal and authoritative" },
    { value: "casual", label: "Casual", description: "Friendly and conversational" },
    { value: "educational", label: "Educational", description: "Informative and teaching-focused" },
    { value: "inspiring", label: "Inspiring", description: "Motivational and uplifting" },
    { value: "technical", label: "Technical", description: "Detailed and precise" },
];

const BlogEditor = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get("id");

    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [aiPrompt, setAiPrompt] = useState("");
    const [aiTone, setAiTone] = useState("professional");
    const [aiSectionOpen, setAiSectionOpen] = useState(true);

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
        if (editId) {
            fetchPost(editId);
        }
    }, [editId]);

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

    const fetchPost = async (id: string) => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("blog_posts")
                .select("*")
                .eq("id", id)
                .single();

            if (error) throw error;
            if (data) {
                form.reset({
                    title: data.title,
                    slug: data.slug,
                    excerpt: data.excerpt || "",
                    content: data.content,
                    author_name: data.author_name,
                    author_image_url: data.author_image_url || "",
                    cover_image_url: data.cover_image_url || "",
                    category: data.category || "",
                    tags: data.tags ? data.tags.join(", ") : "",
                    tech_stack: data.tech_stack ? data.tech_stack.join(", ") : "",
                    status: (data.status as BlogPostStatus) || 'draft',
                    is_featured: data.is_featured || false,
                });
            }
        } catch (error) {
            console.error("Failed to fetch post", error);
            toast.error("Failed to fetch post");
            navigate("/admin/blog");
        } finally {
            setLoading(false);
        }
    };

    const generateSlug = (title: string) => {
        return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
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

            if (editId) {
                const { error } = await supabase
                    .from("blog_posts")
                    .update(postData)
                    .eq("id", editId);

                if (error) throw error;
                toast.success("Post updated successfully");
            } else {
                const { error } = await supabase
                    .from("blog_posts")
                    .insert([postData]);

                if (error) throw error;
                toast.success("Post created successfully");
            }

            navigate("/admin/blog");
        } catch (error) {
            console.error("Error saving post:", error);
            const message = error instanceof Error ? error.message : "Failed to save post";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const generateWithAI = async () => {
        if (!aiPrompt.trim()) {
            toast.error("Please enter a topic or description for AI to write about");
            return;
        }

        setAiLoading(true);
        try {
            let session = (await supabase.auth.getSession()).data.session;
            let token = session?.access_token;

            if (!token) {
                const { data, error } = await supabase.auth.refreshSession();
                if (error || !data.session) {
                    toast.error("You must be logged in to use the AI assistant");
                    return;
                }
                token = data.session.access_token;
            }

            // Function to make the request
            const makeRequest = async (authToken: string) => {
                return fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/blog-ai-assistant`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                    },
                    body: JSON.stringify({
                        action: 'generate_content',
                        prompt: aiPrompt,
                        tone: aiTone,
                    }),
                });
            };

            let response = await makeRequest(token);

            // Handle 401 (Unauthorized) by refreshing token and retrying
            if (response.status === 401) {
                console.log("AI Assistant: Token expired, refreshing...");
                const { data, error } = await supabase.auth.refreshSession();

                if (!error && data.session) {
                    token = data.session.access_token;
                    response = await makeRequest(token);
                }
            }

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error("Rate limit exceeded. Please wait a moment and try again.");
                }
                if (response.status === 403) {
                    throw new Error("You don't have permission to use the AI assistant.");
                }
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to generate content");
            }

            // Handle Streaming Response
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let generatedContent = "";

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split("\n");

                    for (const line of lines) {
                        if (line.startsWith("data: ")) {
                            const data = line.slice(6);
                            if (data === "[DONE]") continue;

                            try {
                                const parsed = JSON.parse(data);
                                const content = parsed.choices?.[0]?.delta?.content;
                                if (content) {
                                    generatedContent += content;
                                }
                            } catch {
                                // Skip parsing errors for partial chunks
                            }
                        }
                    }
                }
            }

            if (!generatedContent) {
                throw new Error("No content generated");
            }

            form.setValue("content", generatedContent);

            // Generate title if empty
            if (!form.getValues("title")) {
                const titleMatch = generatedContent.match(/<h[12][^>]*>([^<]+)<\/h[12]>/);
                if (titleMatch) {
                    form.setValue("title", titleMatch[1].trim());
                    form.setValue("slug", generateSlug(titleMatch[1].trim()));
                }
            }

            // Generate excerpt from first paragraph
            if (!form.getValues("excerpt")) {
                const pMatch = generatedContent.match(/<p[^>]*>([^<]+)<\/p>/);
                if (pMatch) {
                    const excerpt = pMatch[1].trim().substring(0, 200);
                    form.setValue("excerpt", excerpt + (pMatch[1].length > 200 ? "..." : ""));
                }
            }

            toast.success("Content generated successfully!");
            setAiSectionOpen(false);
        } catch (error) {
            console.error("AI generation error:", error);
            const message = error instanceof Error ? error.message : "Failed to generate content with AI";
            toast.error(message);
        } finally {
            setAiLoading(false);
        }
    };

    if (loading && editId) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/admin/blog")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            {editId ? "Edit Story" : "Create New Story"}
                        </h1>
                        <p className="text-muted-foreground">Write and publish your innovation story</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setShowPreview(!showPreview)}
                        className={cn(showPreview && "bg-primary/10 border-primary/30")}
                    >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                    </Button>
                    <Button
                        onClick={form.handleSubmit(onSubmit)}
                        disabled={loading}
                        className="btn-glow"
                    >
                        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        {editId ? "Update" : "Publish"}
                    </Button>
                </div>
            </div>

            {/* AI Writing Assistant */}
            <Card className="glass-card border-primary/30 overflow-hidden">
                <Collapsible open={aiSectionOpen} onOpenChange={setAiSectionOpen}>
                    <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20">
                                        <Sparkles className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">AI Writing Assistant</CardTitle>
                                        <CardDescription>Let AI help you write your blog post</CardDescription>
                                    </div>
                                </div>
                                <ChevronDown className={cn("h-5 w-5 transition-transform", aiSectionOpen && "rotate-180")} />
                            </div>
                        </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <CardContent className="border-t border-border/50 pt-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2">
                                    <Label className="text-sm font-medium mb-2 block">What should the blog be about?</Label>
                                    <Textarea
                                        placeholder="e.g., How AI is revolutionizing education in Sri Lanka, or The future of renewable energy innovations..."
                                        value={aiPrompt}
                                        onChange={(e) => setAiPrompt(e.target.value)}
                                        rows={3}
                                        className="resize-none"
                                    />
                                </div>
                                <div>
                                    <Label className="text-sm font-medium mb-2 block">Writing Tone</Label>
                                    <Select value={aiTone} onValueChange={setAiTone}>
                                        <SelectTrigger className="mb-2">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {AI_TONES.map(tone => (
                                                <SelectItem key={tone.value} value={tone.value}>
                                                    <div>
                                                        <span className="font-medium">{tone.label}</span>
                                                        <span className="text-xs text-muted-foreground ml-2">- {tone.description}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        onClick={generateWithAI}
                                        disabled={aiLoading || !aiPrompt.trim()}
                                        className="w-full btn-glow"
                                    >
                                        {aiLoading ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Wand2 className="h-4 w-4 mr-2" />
                                                Generate Content
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                💡 Tip: Be specific about your topic. The more detail you provide, the better the generated content will be.
                            </p>
                        </CardContent>
                    </CollapsibleContent>
                </Collapsible>
            </Card>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    {showPreview ? (
                        /* Preview Mode */
                        <Card className="glass-card overflow-hidden">
                            <CardContent className="p-8">
                                <div className="max-w-3xl mx-auto space-y-8">
                                    <div className="space-y-4">
                                        <Badge className="bg-primary/20 text-primary border-primary/20">
                                            {form.watch("category") || "Uncategorized"}
                                        </Badge>
                                        <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                                            {form.watch("title") || "Untitled Story"}
                                        </h1>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 overflow-hidden">
                                                    {form.watch("author_image_url") && (
                                                        <img src={form.watch("author_image_url")} className="w-full h-full object-cover" />
                                                    )}
                                                </div>
                                                <span className="font-bold">{form.watch("author_name") || "Author"}</span>
                                            </div>
                                            <span>•</span>
                                            <span>{format(new Date(), "MMM dd, yyyy")}</span>
                                        </div>
                                    </div>

                                    {form.watch("cover_image_url") && (
                                        <div className="aspect-video rounded-2xl overflow-hidden border border-border/50">
                                            <img src={form.watch("cover_image_url")} className="w-full h-full object-cover" />
                                        </div>
                                    )}

                                    <div
                                        className="prose prose-invert max-w-none"
                                        dangerouslySetInnerHTML={{ __html: form.watch("content") }}
                                    />

                                    {form.watch("tags") && (
                                        <div className="flex flex-wrap gap-2 pt-8 border-t border-border/50">
                                            {form.watch("tags").split(",").filter(Boolean).map(tag => (
                                                <Badge key={tag} variant="outline" className="text-xs">
                                                    {tag.trim()}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        /* Editor Mode */
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Main Content */}
                            <div className="lg:col-span-2 space-y-6">
                                <Card className="glass-card">
                                    <CardHeader>
                                        <CardTitle>Content</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <FormField
                                            control={form.control}
                                            name="title"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Title</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="Enter your story title..."
                                                            className="text-xl font-bold h-12"
                                                            {...field}
                                                            onChange={(e) => {
                                                                field.onChange(e);
                                                                if (!editId) form.setValue("slug", generateSlug(e.target.value));
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="excerpt"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Excerpt</FormLabel>
                                                    <FormControl>
                                                        <Textarea
                                                            placeholder="Brief summary of your story..."
                                                            className="resize-none"
                                                            rows={3}
                                                            {...field}
                                                            value={field.value || ""}
                                                        />
                                                    </FormControl>
                                                    <FormDescription>Shown in listings and search results</FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="content"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Content</FormLabel>
                                                    <FormControl>
                                                        <RichTextEditor
                                                            content={field.value}
                                                            onChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Sidebar */}
                            <div className="space-y-6">
                                {/* Publish Settings */}
                                <Card className="glass-card">
                                    <CardHeader>
                                        <CardTitle className="text-base">Publish Settings</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="slug"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs">URL Slug</FormLabel>
                                                    <FormControl>
                                                        <div className="flex items-center">
                                                            <span className="text-xs text-muted-foreground mr-1">/blog/</span>
                                                            <Input className="text-xs font-mono" {...field} />
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="status"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs">Status</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
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
                                                <FormItem className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                                                    <div>
                                                        <FormLabel className="text-sm">Featured</FormLabel>
                                                        <FormDescription className="text-xs">Pin to homepage</FormDescription>
                                                    </div>
                                                    <FormControl>
                                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </CardContent>
                                </Card>

                                {/* Category & Tags */}
                                <Card className="glass-card">
                                    <CardHeader>
                                        <CardTitle className="text-base">Organization</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="category"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs">Category</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select category" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {CATEGORIES.map(cat => (
                                                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="tags"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs">Tags</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="AI, Innovation, Tech..." {...field} />
                                                    </FormControl>
                                                    <FormDescription className="text-xs">Separate with commas</FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="tech_stack"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs">Tools/Technologies</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Python, Arduino..." {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </CardContent>
                                </Card>

                                {/* Media */}
                                <Card className="glass-card">
                                    <CardHeader>
                                        <CardTitle className="text-base">Media</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="cover_image_url"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs">Cover Image URL</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="https://..." {...field} value={field.value || ""} />
                                                    </FormControl>
                                                    {field.value && (
                                                        <div className="aspect-video rounded-lg overflow-hidden bg-muted/30 mt-2">
                                                            <img src={field.value} className="w-full h-full object-cover" />
                                                        </div>
                                                    )}
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <Separator />

                                        <FormField
                                            control={form.control}
                                            name="author_name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs">Author Name</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} />
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
                                                    <FormLabel className="text-xs">Author Image URL</FormLabel>
                                                    <div className="flex items-center gap-3">
                                                        <FormControl>
                                                            <Input placeholder="https://..." {...field} value={field.value || ""} className="flex-1" />
                                                        </FormControl>
                                                        {field.value && (
                                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-muted/30 shrink-0">
                                                                <img src={field.value} className="w-full h-full object-cover" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}
                </form>
            </Form>
        </div>
    );
};

export default BlogEditor;