import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    ArrowLeft, Sparkles, Eye, Save, Loader2, Wand2, ChevronDown,
    AlertCircle, Clock, FileText, Columns, X, RefreshCw,
    Zap, BookOpen, List, Target, WifiOff, CheckCircle2
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import RichTextEditor from "@/components/blog/RichTextEditor";
import { Separator } from "@/components/ui/separator";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { blogPostSchema, type BlogPostFormValues } from "@/schemas/blog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAutosave } from "@/hooks/useAutosave";

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
    { value: "professional", label: "Professional", description: "Formal and authoritative", icon: "💼" },
    { value: "casual", label: "Casual", description: "Friendly and conversational", icon: "😊" },
    { value: "educational", label: "Educational", description: "Informative and teaching-focused", icon: "📚" },
    { value: "inspiring", label: "Inspiring", description: "Motivational and uplifting", icon: "✨" },
    { value: "technical", label: "Technical", description: "Detailed and precise", icon: "⚙️" },
];

const AI_GENERATION_MODES = [
    { value: "full", label: "Full Post", description: "Complete blog post with all sections", icon: FileText },
    { value: "outline", label: "Outline Only", description: "Structure with headings and bullet points", icon: List },
    { value: "introduction", label: "Introduction", description: "Compelling opening paragraph", icon: Zap },
    { value: "conclusion", label: "Conclusion", description: "Strong closing summary", icon: Target },
];

const AI_CONTENT_LENGTHS = [
    { value: "short", label: "Short", words: "~500 words", description: "Quick read, 2-3 min" },
    { value: "medium", label: "Medium", words: "~1000 words", description: "Standard post, 4-5 min" },
    { value: "long", label: "Long", words: "~2000 words", description: "In-depth article, 8-10 min" },
];

// Word count utility
const countWords = (text: string): number => {
    const strippedHtml = text.replace(/<[^>]*>/g, ' ');
    const words = strippedHtml.trim().split(/\s+/).filter(word => word.length > 0);
    return words.length;
};

// Estimate reading time (avg 200 words per minute)
const estimateReadingTime = (words: number): number => {
    return Math.max(1, Math.ceil(words / 200));
};

// Extract headings for content outline
const extractHeadings = (html: string): { level: number; text: string }[] => {
    const headings: { level: number; text: string }[] = [];
    const regex = /<h([1-6])[^>]*>([^<]+)<\/h[1-6]>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
        headings.push({ level: parseInt(match[1]), text: match[2].trim() });
    }
    return headings;
};

const BlogEditor = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get("id");

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(!!editId);
    const [aiLoading, setAiLoading] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [splitView, setSplitView] = useState(false);

    // AI Assistant State
    const [aiPrompt, setAiPrompt] = useState("");
    const [aiTone, setAiTone] = useState("professional");
    const [aiMode, setAiMode] = useState("full");
    const [aiLength, setAiLength] = useState("medium");
    const [aiKeywords, setAiKeywords] = useState("");
    const [aiSectionOpen, setAiSectionOpen] = useState(true);
    const [aiProgress, setAiProgress] = useState(0);
    const [aiStreamedContent, setAiStreamedContent] = useState("");
    const [aiRetryCount, setAiRetryCount] = useState(0);

    // Network state
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // Content outline state
    const [showOutline, setShowOutline] = useState(false);

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

    // Watch form values for autosave and stats
    const formValues = useWatch({ control: form.control });
    const content = form.watch("content");
    const title = form.watch("title");

    // Autosave hook
    const {
        lastSaved,
        hasUnsavedChanges,
        showRecoveryPrompt,
        acceptRecovery,
        declineRecovery,
        clearSavedData,
        saveNow,
    } = useAutosave({
        key: 'blog_editor_draft',
        data: formValues,
        postId: editId || 'new',
        debounceMs: 30000,
        onRecover: (data) => {
            form.reset(data as BlogPostFormValues);
        },
        enabled: !initialLoading,
    });

    // Content statistics
    const contentStats = useMemo(() => {
        const wordCount = countWords(content || '');
        const readingTime = estimateReadingTime(wordCount);
        const headings = extractHeadings(content || '');
        return { wordCount, readingTime, headings };
    }, [content]);

    // Network status listener
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

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
            toast.error("Failed to verify permissions");
        }
    };

    const fetchPost = async (id: string) => {
        try {
            setInitialLoading(true);
            const { data, error } = await supabase
                .from("blog_posts")
                .select("*")
                .eq("id", id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    toast.error("Post not found");
                    navigate("/admin/blog");
                    return;
                }
                throw error;
            }

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
            toast.error("Failed to load post. Please try again.");
            navigate("/admin/blog");
        } finally {
            setInitialLoading(false);
        }
    };

    const generateSlug = (title: string) => {
        return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    };

    const onSubmit = async (values: BlogPostFormValues) => {
        if (!isOnline) {
            toast.error("You're offline. Please check your internet connection.");
            return;
        }

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
                reading_time_minutes: contentStats.readingTime,
            };

            if (editId) {
                const { error } = await supabase
                    .from("blog_posts")
                    .update(postData)
                    .eq("id", editId);

                if (error) {
                    if (error.code === '23505') {
                        toast.error("A post with this slug already exists. Please use a different slug.");
                        return;
                    }
                    throw error;
                }
                toast.success("Post updated successfully!");
            } else {
                const { error } = await supabase
                    .from("blog_posts")
                    .insert([postData]);

                if (error) {
                    if (error.code === '23505') {
                        toast.error("A post with this slug already exists. Please use a different slug.");
                        return;
                    }
                    throw error;
                }
                toast.success("Post created successfully!");
            }

            clearSavedData();
            navigate("/admin/blog");
        } catch (error) {
            console.error("Error saving post:", error);
            const message = error instanceof Error ? error.message : "Failed to save post. Please try again.";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const generateWithAI = async (retryAttempt = 0) => {
        if (!aiPrompt.trim()) {
            toast.error("Please enter a topic or description for AI to write about");
            return;
        }

        if (!isOnline) {
            toast.error("You're offline. Please check your internet connection.");
            return;
        }

        setAiLoading(true);
        setAiProgress(0);
        setAiStreamedContent("");
        setAiRetryCount(retryAttempt);

        try {
            let session = (await supabase.auth.getSession()).data.session;
            let token = session?.access_token;

            if (!token) {
                const { data, error } = await supabase.auth.refreshSession();
                if (error || !data.session) {
                    toast.error("Session expired. Please log in again.");
                    return;
                }
                token = data.session.access_token;
            }

            // Build enhanced prompt based on options
            const lengthGuide = aiLength === 'short' ? '500' : aiLength === 'medium' ? '1000' : '2000';
            const modeInstructions = {
                full: `Write a complete, well-structured blog post with introduction, main sections, and conclusion.`,
                outline: `Create a detailed outline with main headings, subheadings, and bullet points for key ideas.`,
                introduction: `Write only a compelling introduction paragraph that hooks the reader.`,
                conclusion: `Write only a strong conclusion that summarizes key points and includes a call to action.`,
            };

            const enhancedPrompt = `
${modeInstructions[aiMode as keyof typeof modeInstructions]}

Topic: ${aiPrompt}
Tone: ${aiTone}
Target length: approximately ${lengthGuide} words
${aiKeywords ? `Focus keywords to include: ${aiKeywords}` : ''}

Please format the content with appropriate HTML tags (h2, h3, p, ul, li, strong, em) for a blog post.
            `.trim();

            const makeRequest = async (authToken: string) => {
                return fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/blog-ai-assistant`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                        "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                    },
                    body: JSON.stringify({
                        action: 'generate_content',
                        prompt: enhancedPrompt,
                        tone: aiTone,
                    }),
                });
            };

            let response = await makeRequest(token);

            if (response.status === 401) {
                console.log("AI Assistant: Token expired, refreshing...");
                const { data, error } = await supabase.auth.refreshSession();

                if (!error && data.session) {
                    token = data.session.access_token;
                    response = await makeRequest(token);
                } else {
                    throw new Error("Session expired. Please log in again.");
                }
            }

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error("Rate limit exceeded. Please wait a moment and try again.");
                }
                if (response.status === 403) {
                    throw new Error("You don't have permission to use the AI assistant.");
                }
                if (response.status >= 500 && retryAttempt < 3) {
                    // Server error - retry with exponential backoff
                    const delay = Math.pow(2, retryAttempt) * 1000;
                    toast.info(`Server error. Retrying in ${delay / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return generateWithAI(retryAttempt + 1);
                }
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to generate content");
            }

            // Handle Streaming Response with progress
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let generatedContent = "";
            const estimatedChunks = aiLength === 'short' ? 50 : aiLength === 'medium' ? 100 : 200;
            let chunkCount = 0;

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
                                    chunkCount++;
                                    setAiProgress(Math.min(95, (chunkCount / estimatedChunks) * 100));
                                    setAiStreamedContent(generatedContent);
                                }
                            } catch {
                                // Skip parsing errors for partial chunks
                            }
                        }
                    }
                }
            }

            setAiProgress(100);

            if (!generatedContent) {
                throw new Error("No content generated. Please try a different prompt.");
            }

            // Apply content based on mode
            if (aiMode === 'full' || aiMode === 'outline') {
                form.setValue("content", generatedContent);
            } else {
                // For intro/conclusion, append to existing content
                const existingContent = form.getValues("content");
                if (aiMode === 'introduction') {
                    form.setValue("content", generatedContent + (existingContent ? `\n\n${existingContent}` : ''));
                } else {
                    form.setValue("content", (existingContent ? `${existingContent}\n\n` : '') + generatedContent);
                }
            }

            // Generate title if empty and full mode
            if (!form.getValues("title") && aiMode === 'full') {
                const titleMatch = generatedContent.match(/<h[12][^>]*>([^<]+)<\/h[12]>/);
                if (titleMatch) {
                    const extractedTitle = titleMatch[1].trim();
                    form.setValue("title", extractedTitle);
                    form.setValue("slug", generateSlug(extractedTitle));
                }
            }

            // Generate excerpt from first paragraph if empty
            if (!form.getValues("excerpt") && aiMode === 'full') {
                const pMatch = generatedContent.match(/<p[^>]*>([^<]+)<\/p>/);
                if (pMatch) {
                    const excerpt = pMatch[1].trim().substring(0, 200);
                    form.setValue("excerpt", excerpt + (pMatch[1].length > 200 ? "..." : ""));
                }
            }

            toast.success(`${AI_GENERATION_MODES.find(m => m.value === aiMode)?.label} generated successfully!`);
            setAiSectionOpen(false);
            setAiRetryCount(0);
        } catch (error) {
            console.error("AI generation error:", error);
            const message = error instanceof Error ? error.message : "Failed to generate content with AI";
            toast.error(message, {
                action: retryAttempt < 3 ? {
                    label: "Retry",
                    onClick: () => generateWithAI(retryAttempt + 1),
                } : undefined,
            });
        } finally {
            setAiLoading(false);
            setAiStreamedContent("");
        }
    };

    if (initialLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    <p className="text-muted-foreground">Loading post...</p>
                </div>
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Recovery Dialog */}
                <Dialog open={showRecoveryPrompt} onOpenChange={() => { }}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <RefreshCw className="h-5 w-5 text-primary" />
                                Recover Unsaved Content?
                            </DialogTitle>
                            <DialogDescription>
                                We found an autosaved draft from your previous session.
                                Would you like to restore it?
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" onClick={declineRecovery}>
                                Start Fresh
                            </Button>
                            <Button onClick={acceptRecovery} className="btn-glow">
                                Recover Content
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Offline Alert */}
                {!isOnline && (
                    <Alert variant="destructive" className="animate-in slide-in-from-top">
                        <WifiOff className="h-4 w-4" />
                        <AlertTitle>You're offline</AlertTitle>
                        <AlertDescription>
                            Changes will be saved locally but won't sync until you're back online.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Header */}
                <div className="flex items-center justify-between sticky top-0 z-20 bg-background/95 backdrop-blur-md py-4 -mx-4 px-4 border-b border-border/50">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/blog")}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">
                                {editId ? "Edit Story" : "Create New Story"}
                            </h1>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <span>Write and publish your innovation story</span>
                                {hasUnsavedChanges && (
                                    <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
                                        Unsaved changes
                                    </Badge>
                                )}
                                {lastSaved && !hasUnsavedChanges && (
                                    <Badge variant="outline" className="text-green-500 border-green-500/30">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Saved {format(lastSaved, "HH:mm")}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Content Stats */}
                        <div className="hidden md:flex items-center gap-4 mr-4 text-sm text-muted-foreground">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1.5">
                                        <FileText className="h-4 w-4" />
                                        <span>{contentStats.wordCount} words</span>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>Word count</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="h-4 w-4" />
                                        <span>{contentStats.readingTime} min read</span>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>Estimated reading time</TooltipContent>
                            </Tooltip>
                        </div>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={saveNow}
                                    disabled={!hasUnsavedChanges}
                                >
                                    <Save className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Save draft (Ctrl+S)</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowOutline(!showOutline)}
                                    className={cn(showOutline && "bg-primary/10")}
                                >
                                    <List className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Content outline</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        setSplitView(!splitView);
                                        if (splitView) setShowPreview(false);
                                    }}
                                    className={cn(splitView && "bg-primary/10")}
                                >
                                    <Columns className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Split view</TooltipContent>
                        </Tooltip>

                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowPreview(!showPreview);
                                if (showPreview) setSplitView(false);
                            }}
                            className={cn(showPreview && "bg-primary/10 border-primary/30")}
                        >
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                        </Button>

                        <Button
                            onClick={form.handleSubmit(onSubmit)}
                            disabled={loading || !isOnline}
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
                                            <CardDescription>Generate content with customizable options</CardDescription>
                                        </div>
                                    </div>
                                    <ChevronDown className={cn("h-5 w-5 transition-transform", aiSectionOpen && "rotate-180")} />
                                </div>
                            </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <CardContent className="border-t border-border/50 pt-6 space-y-6">
                                {/* Generation Mode Tabs */}
                                <div>
                                    <Label className="text-sm font-medium mb-3 block">Generation Mode</Label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {AI_GENERATION_MODES.map((mode) => (
                                            <button
                                                key={mode.value}
                                                onClick={() => setAiMode(mode.value)}
                                                className={cn(
                                                    "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                                                    aiMode === mode.value
                                                        ? "border-primary bg-primary/10 text-primary"
                                                        : "border-border/50 hover:border-primary/50 hover:bg-muted/30"
                                                )}
                                            >
                                                <mode.icon className="h-5 w-5" />
                                                <span className="text-sm font-medium">{mode.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {/* Topic Input */}
                                    <div className="md:col-span-2 lg:col-span-2">
                                        <Label className="text-sm font-medium mb-2 block">Topic or Description</Label>
                                        <Textarea
                                            placeholder="e.g., How AI is revolutionizing education in Sri Lanka, focusing on accessibility and personalized learning..."
                                            value={aiPrompt}
                                            onChange={(e) => setAiPrompt(e.target.value)}
                                            rows={3}
                                            className="resize-none"
                                        />
                                    </div>

                                    {/* Keywords */}
                                    <div>
                                        <Label className="text-sm font-medium mb-2 block">Focus Keywords (Optional)</Label>
                                        <Input
                                            placeholder="AI, education, innovation..."
                                            value={aiKeywords}
                                            onChange={(e) => setAiKeywords(e.target.value)}
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">Comma-separated keywords for SEO</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Content Length */}
                                    <div>
                                        <Label className="text-sm font-medium mb-3 block">Content Length</Label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {AI_CONTENT_LENGTHS.map((length) => (
                                                <button
                                                    key={length.value}
                                                    onClick={() => setAiLength(length.value)}
                                                    className={cn(
                                                        "p-3 rounded-lg border text-center transition-all",
                                                        aiLength === length.value
                                                            ? "border-primary bg-primary/10"
                                                            : "border-border/50 hover:border-primary/50"
                                                    )}
                                                >
                                                    <div className="text-sm font-medium">{length.label}</div>
                                                    <div className="text-xs text-muted-foreground">{length.words}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Tone Selection */}
                                    <div>
                                        <Label className="text-sm font-medium mb-3 block">Writing Tone</Label>
                                        <Select value={aiTone} onValueChange={setAiTone}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {AI_TONES.map(tone => (
                                                    <SelectItem key={tone.value} value={tone.value}>
                                                        <div className="flex items-center gap-2">
                                                            <span>{tone.icon}</span>
                                                            <span className="font-medium">{tone.label}</span>
                                                            <span className="text-xs text-muted-foreground">- {tone.description}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                {aiLoading && (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Generating content...</span>
                                            <span className="text-primary font-medium">{Math.round(aiProgress)}%</span>
                                        </div>
                                        <Progress value={aiProgress} className="h-2" />
                                        {aiRetryCount > 0 && (
                                            <p className="text-xs text-muted-foreground">Retry attempt {aiRetryCount}/3</p>
                                        )}
                                    </div>
                                )}

                                {/* Streamed Preview */}
                                {aiStreamedContent && (
                                    <div className="p-4 rounded-lg bg-muted/30 border border-border/50 max-h-48 overflow-y-auto">
                                        <div className="prose prose-sm prose-invert" dangerouslySetInnerHTML={{ __html: aiStreamedContent }} />
                                        <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                                    </div>
                                )}

                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-muted-foreground">
                                        💡 Tip: Be specific about your topic and include target keywords for better results.
                                    </p>
                                    <Button
                                        onClick={() => generateWithAI()}
                                        disabled={aiLoading || !aiPrompt.trim() || !isOnline}
                                        className="btn-glow"
                                        size="lg"
                                    >
                                        {aiLoading ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Wand2 className="h-4 w-4 mr-2" />
                                                Generate {AI_GENERATION_MODES.find(m => m.value === aiMode)?.label}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </CollapsibleContent>
                    </Collapsible>
                </Card>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {showPreview && !splitView ? (
                            /* Full Preview Mode */
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
                                                            <img src={form.watch("author_image_url")} className="w-full h-full object-cover" alt="" />
                                                        )}
                                                    </div>
                                                    <span className="font-bold">{form.watch("author_name") || "Author"}</span>
                                                </div>
                                                <span>•</span>
                                                <span>{format(new Date(), "MMM dd, yyyy")}</span>
                                                <span>•</span>
                                                <span>{contentStats.readingTime} min read</span>
                                            </div>
                                        </div>

                                        {form.watch("cover_image_url") && (
                                            <div className="aspect-video rounded-2xl overflow-hidden border border-border/50">
                                                <img src={form.watch("cover_image_url")} className="w-full h-full object-cover" alt="" />
                                            </div>
                                        )}

                                        <div
                                            className="prose prose-lg prose-invert max-w-none"
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
                            /* Editor Mode (with optional split view) */
                            <div className={cn("grid gap-6", splitView ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1 lg:grid-cols-3")}>
                                {/* Main Content */}
                                <div className={cn(splitView ? "xl:col-span-1" : "lg:col-span-2", "space-y-6")}>
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

                                {/* Split View Preview */}
                                {splitView && (
                                    <div className="hidden xl:block">
                                        <Card className="glass-card sticky top-24 max-h-[calc(100vh-120px)] overflow-hidden">
                                            <CardHeader className="flex flex-row items-center justify-between">
                                                <CardTitle className="text-base">Live Preview</CardTitle>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => setSplitView(false)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </CardHeader>
                                            <ScrollArea className="h-[calc(100vh-220px)]">
                                                <CardContent className="space-y-4">
                                                    <Badge className="bg-primary/20 text-primary border-primary/20">
                                                        {form.watch("category") || "Uncategorized"}
                                                    </Badge>
                                                    <h1 className="text-2xl font-bold">
                                                        {form.watch("title") || "Untitled"}
                                                    </h1>
                                                    <div className="text-sm text-muted-foreground">
                                                        {contentStats.wordCount} words • {contentStats.readingTime} min read
                                                    </div>
                                                    <Separator />
                                                    <div
                                                        className="prose prose-sm prose-invert max-w-none"
                                                        dangerouslySetInnerHTML={{ __html: form.watch("content") }}
                                                    />
                                                </CardContent>
                                            </ScrollArea>
                                        </Card>
                                    </div>
                                )}

                                {/* Sidebar - Only show when not in split view */}
                                {!splitView && (
                                    <div className="space-y-6">
                                        {/* Content Outline */}
                                        {showOutline && contentStats.headings.length > 0 && (
                                            <Card className="glass-card">
                                                <CardHeader className="flex flex-row items-center justify-between py-3">
                                                    <CardTitle className="text-base flex items-center gap-2">
                                                        <BookOpen className="h-4 w-4" />
                                                        Content Outline
                                                    </CardTitle>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => setShowOutline(false)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </CardHeader>
                                                <CardContent className="py-0 pb-4">
                                                    <ul className="space-y-1 text-sm">
                                                        {contentStats.headings.map((heading, i) => (
                                                            <li
                                                                key={i}
                                                                className="text-muted-foreground hover:text-foreground transition-colors"
                                                                style={{ paddingLeft: `${(heading.level - 1) * 12}px` }}
                                                            >
                                                                {heading.text}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </CardContent>
                                            </Card>
                                        )}

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
                                                                    <img src={field.value} className="w-full h-full object-cover" alt="" />
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
                                                                        <img src={field.value} className="w-full h-full object-cover" alt="" />
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
                                )}
                            </div>
                        )}
                    </form>
                </Form>
            </div>
        </TooltipProvider>
    );
};

export default BlogEditor;
