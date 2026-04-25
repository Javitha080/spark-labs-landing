import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Image, X, Play, Instagram, ExternalLink, ChevronLeft, ChevronRight, MapPin, ArrowUpRight } from "lucide-react";
import ReactPlayer from "react-player";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import OptimizedImage from "@/components/ui/OptimizedImage";

/* ===========================================
   GALLERY PAGE - Full photo/video/IG gallery with Bento & Advanced Glassmorphism
   =========================================== */

type GalleryItem = Tables<"gallery_items">;
type GalleryItemWithVideo = GalleryItem;

// ─── URL Utilities ────────────────────────────────────────────────────────────

function extractYouTubeId(url: string): string | null {
    if (!url) return null;
    const match = url.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([^&?/#\s]{11})/
    );
    return match?.[1] ?? null;
}

function getYouTubeThumbnail(url: string): string | null {
    const id = extractYouTubeId(url);
    return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : null;
}

function getYouTubeEmbedUrl(url: string, settings?: { autoplay?: boolean; mute?: boolean; loop?: boolean; controls?: boolean }): string {
    const id = extractYouTubeId(url);
    if (!id) return url;
    const params = new URLSearchParams({
        autoplay: settings?.autoplay ? "1" : "0",
        mute: settings?.mute ? "1" : "0",
        controls: settings?.controls ? "1" : "0",
        loop: settings?.loop ? "1" : "0",
        playlist: settings?.loop ? id : "",
        rel: "0",
        modestbranding: "1"
    });
    return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

function getVimeoEmbedUrl(url: string, settings?: { autoplay?: boolean; mute?: boolean; loop?: boolean }): string {
    const match = url.match(/vimeo\.com\/(\d+)/);
    if (!match) return url;
    const params = new URLSearchParams({
        autoplay: settings?.autoplay ? "1" : "0",
        muted: settings?.mute ? "1" : "0",
        loop: settings?.loop ? "1" : "0"
    });
    return `https://player.vimeo.com/video/${match[1]}?${params.toString()}`;
}

function getInstagramEmbedUrl(url: string): string | null {
    if (!url) return null;
    const match = url.match(/instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
    if (!match) return null;
    return `https://www.instagram.com/${match[1]}/${match[2]}/embed/`;
}

type VideoSource = "youtube" | "vimeo" | "instagram" | "direct";

function detectVideoSource(url: string): VideoSource {
    if (!url) return "direct";
    if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
    if (url.includes("vimeo.com")) return "vimeo";
    if (url.includes("instagram.com")) return "instagram";
    return "direct";
}

function resolveThumb(item: GalleryItemWithVideo): string {
    if (item.thumbnail_url) return item.thumbnail_url;
    if (item.image_url) return item.image_url;
    if (item.video_url) {
        const yt = getYouTubeThumbnail(item.video_url);
        if (yt) return yt;
    }
    return "";
}

// ─── Bento Box Pattern Generator ──────────────────────────────────────────────
const getBentoSize = (index: number): "large" | "tall" | "wide" | "normal" => {
    const pattern: Array<"large" | "tall" | "wide" | "normal"> = [
        "large", "normal", "normal",
        "normal", "tall", "normal",
        "wide", "normal",
        "normal", "normal", "tall",
        "normal", "large",
    ];
    return pattern[index % pattern.length];
};

const sizeClasses = {
    large: "md:col-span-2 md:row-span-2",
    tall: "md:row-span-2",
    wide: "md:col-span-2",
    normal: "col-span-1",
};

// ReactPlayer cast
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Player = ReactPlayer as any;

const GalleryPage = () => {
    const [items, setItems] = useState<GalleryItemWithVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [activeCollection, setActiveCollection] = useState<string | null>(null);

    // Group items into collections
    const collectionsMap = items.reduce((acc, item) => {
        const name = item.collection_name || "standalone";
        if (!acc[name]) acc[name] = { name, items: [], cover: null };
        acc[name].items.push(item);
        if (item.collection_cover || (!acc[name].cover && name !== "standalone")) {
            acc[name].cover = item;
        }
        return acc;
    }, {} as Record<string, { name: string; items: GalleryItemWithVideo[]; cover: GalleryItemWithVideo | null }>);

    const collections = Object.values(collectionsMap).filter(c => c.name !== "standalone");
    const standaloneItems = collectionsMap["standalone"]?.items || [];
    const activeItems = activeCollection ? (collectionsMap[activeCollection]?.items || []) : standaloneItems;

    const selectedItem = selectedIndex !== null && activeItems ? activeItems[selectedIndex] : null;

    const closeLightbox = useCallback(() => setSelectedIndex(null), []);

    const goToPrev = useCallback(() => {
        setSelectedIndex((prev) => {
            if (prev === null) return null;
            return prev === 0 ? activeItems.length - 1 : prev - 1;
        });
    }, [activeItems.length]);

    const goToNext = useCallback(() => {
        setSelectedIndex((prev) => {
            if (prev === null) return null;
            return prev === activeItems.length - 1 ? 0 : prev + 1;
        });
    }, [activeItems.length]);

    // Keyboard navigation
    useEffect(() => {
        if (selectedIndex === null) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeLightbox();
            if (e.key === "ArrowLeft") goToPrev();
            if (e.key === "ArrowRight") goToNext();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedIndex, closeLightbox, goToPrev, goToNext]);

    useEffect(() => {
        const fetchGallery = async () => {
            try {
                const { data, error } = await supabase
                    .from("gallery_items")
                    .select("*")
                    .order("display_order", { ascending: true });

                if (error) throw error;
                setItems(data || []);
            } catch (error) {
                console.error("Error loading gallery:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchGallery();
    }, []);

    const renderLightboxMedia = (image: GalleryItemWithVideo) => {
        const isInstagram = image.media_type === "instagram";
        const isVideo = image.media_type === "video";

        if (isInstagram && image.video_url) {
            const embedUrl = getInstagramEmbedUrl(image.video_url);
            if (embedUrl) {
                return (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-full max-w-sm mx-auto rounded-3xl overflow-hidden shadow-2xl bg-black border border-white/10" style={{ minHeight: 500 }}>
                            <iframe src={embedUrl} className="w-full border-0" style={{ height: 560 }} allowFullScreen title={image.title} />
                        </div>
                        <a href={image.video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-white/70 hover:text-pink-400 transition-colors">
                            <ExternalLink className="w-4 h-4" /> View on Instagram
                        </a>
                    </div>
                );
            }
        }

        if (isVideo && image.video_url) {
            const source = detectVideoSource(image.video_url);

            if (source === "youtube") {
                return (
                    <div className="w-full aspect-video rounded-3xl overflow-hidden bg-black shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10">
                        <iframe src={getYouTubeEmbedUrl(image.video_url, { autoplay: image.video_autoplay, mute: image.video_is_muted, loop: image.video_loop, controls: image.video_controls })} className="w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={image.title} />
                    </div>
                );
            }
            if (source === "vimeo") {
                return (
                    <div className="w-full aspect-video rounded-3xl overflow-hidden bg-black shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10">
                        <iframe src={getVimeoEmbedUrl(image.video_url, { autoplay: image.video_autoplay, mute: image.video_is_muted, loop: image.video_loop })} className="w-full h-full border-0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={image.title} />
                    </div>
                );
            }
            return (
                <video src={image.video_url} poster={resolveThumb(image)} controls={image.video_controls ?? true} autoPlay={image.video_autoplay ?? true} loop={image.video_loop ?? true} muted={image.video_is_muted ?? true} className="w-full max-h-[80vh] object-contain rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10" />
            );
        }

        return (
            <OptimizedImage src={image.image_url} alt={image.title} className="max-w-full max-h-[85vh] object-contain rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10" />
        );
    };

    return (
        <div className="min-h-screen bg-background relative overflow-hidden">
            <SEOHead
                title="Innovation Gallery | Young Innovators Club"
                description="Browse photos from workshops, events, and achievements of the Young Innovators Club at Dharmapala Vidyalaya."
                path="/gallery"
            />
            <Header />

            {/* ── Animated Liquid Background ── */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden mix-blend-screen">
                <motion.div
                    animate={{ x: [0, 150, 0], y: [0, -100, 0], scale: [1, 1.3, 1] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/40 blur-[140px] opacity-80"
                />
                <motion.div
                    animate={{ x: [0, -150, 0], y: [0, 100, 0], scale: [1, 1.6, 1] }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full bg-secondary/40 blur-[160px] opacity-70"
                />
                <motion.div
                    animate={{ x: [0, 80, -80, 0], y: [0, 80, -80, 0], rotate: [0, 180, 360] }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[20%] left-[30%] w-[50%] h-[50%] rounded-full bg-accent/30 blur-[120px] opacity-60"
                />
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[50%] left-[50%] w-[40%] h-[40%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[100px]"
                />
                {/* Noise overlay for texture */}
                <div className="absolute inset-0 opacity-[0.05] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            </div>

            <main className="pt-32 pb-24 relative z-10 min-h-screen">
                {/* Page Header */}
                <section className="container-custom mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="relative z-10"
                    >
                        <Link to="/">
                            <Button variant="outline" className="mb-8 rounded-full bg-background/50 backdrop-blur-md border-border/50 hover:bg-background/80 hover:border-primary/50 transition-all text-sm h-10 px-4 group">
                                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                                Back to Home
                            </Button>
                        </Link>

                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold uppercase tracking-wider mb-6">
                            <SparkleIcon /> Our Moments
                        </div>

                        <h1 className="text-5xl md:text-7xl font-display font-black tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-br from-foreground via-foreground to-foreground/50 leading-tight">
                            {activeCollection ? activeCollection : <>Innovation <br/><span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">Gallery</span></>}
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-2xl font-medium">
                            {activeCollection ? `Immerse yourself in our ${activeCollection} collection.` : "A visual journey through our workshops, events, and groundbreaking projects."}
                        </p>
                    </motion.div>
                </section>

                {/* Gallery Grid Area */}
                <section className="container-custom">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-[300px]">
                            {[...Array(12)].map((_, i) => (
                                <div key={i} className={`rounded-[2rem] bg-muted/20 animate-pulse backdrop-blur-md border border-border/30 ${sizeClasses[getBentoSize(i)]}`} />
                            ))}
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-24 bg-card/30 backdrop-blur-xl border border-border/50 rounded-[3rem] shadow-2xl">
                            <Image className="w-16 h-16 mx-auto text-muted-foreground/50 mb-6" />
                            <h3 className="text-2xl font-bold mb-2">No Media Found</h3>
                            <p className="text-muted-foreground">Check back soon for amazing moments!</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-16">
                            {/* Controls */}
                            {activeCollection && (
                                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                                    <Button variant="outline" className="rounded-full bg-background/50 backdrop-blur-xl border-border/50 hover:bg-background/80 hover:border-primary/50 transition-all group h-12 px-6" onClick={() => setActiveCollection(null)}>
                                        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                                        View All Collections
                                    </Button>
                                </motion.div>
                            )}

                            {/* Collections Grid (Bento) */}
                            {!activeCollection && collections.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 auto-rows-[280px] md:auto-rows-[320px]">
                                    {collections.map((col, index) => {
                                        const thumb = col.cover ? resolveThumb(col.cover) : null;
                                        const bentoSize = getBentoSize(index);
                                        const isLarge = bentoSize === "large" || bentoSize === "wide";

                                        return (
                                            <motion.div
                                                key={col.name}
                                                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                                                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                                viewport={{ once: true, margin: "-50px" }}
                                                transition={{ delay: index * 0.1, duration: 0.6, type: "spring", stiffness: 100 }}
                                                className={cn(
                                                    "group relative rounded-[2rem] overflow-hidden cursor-pointer",
                                                    "bg-background/20 backdrop-blur-[40px] border border-white/20 shadow-[inset_0_0_30px_rgba(255,255,255,0.05)]",
                                                    "transition-all duration-500 hover:shadow-[0_0_50px_rgba(var(--primary-rgb),0.3)] hover:bg-background/30",
                                                    "hover:-translate-y-2",
                                                    sizeClasses[bentoSize]
                                                )}
                                                onClick={() => setActiveCollection(col.name)}
                                            >
                                                {/* Animated Border Glow on Hover */}
                                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20 pointer-events-none">
                                                    <div className="absolute inset-0 rounded-[2rem] border-2 border-transparent bg-[linear-gradient(45deg,transparent_20%,rgba(var(--primary-rgb),0.5)_50%,transparent_80%)] border-image-source animate-border-flow" style={{ WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', padding: '2px' }} />
                                                </div>

                                                {/* Image/Background */}
                                                <div className="absolute inset-0 z-0">
                                                    {thumb ? (
                                                        <OptimizedImage src={thumb} alt={col.name} priority={index < 4} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-70 group-hover:opacity-100" />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-primary/20 via-background to-secondary/20" />
                                                    )}
                                                    {/* Deep Glass Overlay */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent pointer-events-none transition-opacity duration-500 group-hover:opacity-80" />
                                                </div>

                                                {/* Content */}
                                                <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8 z-10">
                                                    <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 ease-out">
                                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/50 backdrop-blur-md border border-border/50 mb-3 shadow-lg">
                                                            <Image className="w-4 h-4 text-primary" />
                                                            <span className="text-xs font-bold text-foreground uppercase tracking-wider">{col.items.length} Items</span>
                                                        </div>
                                                        <h3 className={cn("text-foreground font-display font-bold tracking-tight drop-shadow-md", isLarge ? "text-3xl md:text-5xl" : "text-2xl md:text-3xl")}>
                                                            {col.name}
                                                        </h3>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}

                            {(!activeCollection && standaloneItems.length > 0) && collections.length > 0 && (
                                <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="flex items-center gap-6 mt-8">
                                    <h2 className="text-3xl font-display font-bold whitespace-nowrap">Other Media</h2>
                                    <div className="h-px bg-gradient-to-r from-border/80 to-transparent flex-1" />
                                </motion.div>
                            )}

                            {/* Active Items Grid (Bento) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 auto-rows-[280px] md:auto-rows-[320px]">
                                {activeItems.map((item, index) => {
                                    const thumb = resolveThumb(item);
                                    const isInstagram = item.media_type === "instagram";
                                    const isVideo = item.media_type === "video";
                                    const bentoSize = getBentoSize(index);

                                    return (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                                            whileInView={{ opacity: 1, scale: 1, y: 0 }}
                                            viewport={{ once: true, margin: "-50px" }}
                                            transition={{ delay: (index % 10) * 0.05, duration: 0.5, ease: "easeOut" }}
                                            className={cn(
                                                "group relative rounded-[2rem] overflow-hidden cursor-pointer",
                                                "bg-background/20 backdrop-blur-[40px] border border-white/20 shadow-[inset_0_0_30px_rgba(255,255,255,0.05)]",
                                                "hover:shadow-[0_20px_50px_-10px_rgba(var(--primary-rgb),0.4)] hover:bg-background/30",
                                                "transition-all duration-500 hover:scale-[1.02]",
                                                sizeClasses[bentoSize]
                                            )}
                                            onClick={() => setSelectedIndex(index)}
                                        >
                                            {/* Hover Glow Effect */}
                                            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 mix-blend-overlay pointer-events-none" />

                                            {/* Thumbnail */}
                                            <div className="absolute inset-0 z-0">
                                                {thumb ? (
                                                    <OptimizedImage
                                                        src={thumb}
                                                        alt={item.title}
                                                        priority={index < 4}
                                                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                                                    />
                                                ) : (
                                                    <div className={cn(
                                                        "w-full h-full flex items-center justify-center",
                                                        isInstagram ? "bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-orange-400/20" : "bg-muted/30"
                                                    )}>
                                                        {isInstagram ? <Instagram className="w-12 h-12 text-pink-400/50" /> : <Image className="w-12 h-12 text-muted-foreground/30" />}
                                                    </div>
                                                )}

                                                {/* Gradients for readability */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300" />
                                            </div>

                                            {/* Icons (Center) */}
                                            {isVideo && (
                                                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                                                    <div className="w-16 h-16 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center text-foreground shadow-2xl border border-border/50 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300">
                                                        <Play className="w-6 h-6 fill-current ml-1" />
                                                    </div>
                                                </div>
                                            )}

                                            {isInstagram && (
                                                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500/80 to-purple-600/80 backdrop-blur-md flex items-center justify-center shadow-2xl border border-white/20 group-hover:scale-110 transition-all duration-300">
                                                        <Instagram className="w-7 h-7 text-white" />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Top Badges */}
                                            <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-20">
                                                {(isVideo || isInstagram) ? (
                                                    <span className={cn(
                                                        "text-[10px] px-3 py-1 rounded-full text-white font-bold tracking-wider backdrop-blur-md border border-white/20 shadow-lg uppercase",
                                                        isInstagram ? "bg-pink-500/80" : "bg-primary/80"
                                                    )}>
                                                        {isInstagram ? "Instagram" : (item.video_url ? detectVideoSource(item.video_url) : "Video")}
                                                    </span>
                                                ) : <div/>}

                                                <div className="w-10 h-10 rounded-full bg-background/40 backdrop-blur-md border border-border/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300 shadow-lg">
                                                    <ArrowUpRight className="h-4 w-4 text-foreground" />
                                                </div>
                                            </div>

                                            {/* Bottom Content */}
                                            <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
                                                <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 ease-out">
                                                    {item.location_name && (
                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-primary mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 uppercase tracking-wider">
                                                            <MapPin className="w-3 h-3" /> {item.location_name}
                                                        </div>
                                                    )}
                                                    <h3 className="text-foreground font-bold text-xl md:text-2xl leading-tight line-clamp-2 drop-shadow-md">
                                                        {item.title}
                                                    </h3>
                                                    {item.description && (
                                                        <p className="text-muted-foreground/80 text-sm mt-2 line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-150 font-medium">
                                                            {item.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </section>
            </main>
            <Footer />

            {/* ── Immersive Lightbox ── */}
            <AnimatePresence>
                {selectedItem && (
                    <motion.div
                        initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                        animate={{ opacity: 1, backdropFilter: "blur(40px)" }}
                        exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                        className="fixed inset-0 z-[200] bg-background/80 flex items-center justify-center p-4 md:p-8"
                        onClick={closeLightbox}
                    >
                        {/* Subtle ambient light in lightbox */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-accent/10 pointer-events-none" />

                        {/* Top Bar Controls */}
                        <div className="absolute top-0 left-0 right-0 p-6 flex justify-end z-[210]">
                            <Button
                                variant="outline"
                                size="icon"
                                className="rounded-full bg-background/50 backdrop-blur-xl border-border/50 hover:bg-background text-foreground shadow-2xl h-12 w-12"
                                onClick={closeLightbox}
                            >
                                <X className="w-6 h-6" />
                            </Button>
                        </div>

                        {/* Navigation Arrows */}
                        {activeItems.length > 1 && (
                            <button
                                className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-background/50 backdrop-blur-xl border border-border/50 hover:bg-background hover:scale-110 text-foreground flex items-center justify-center transition-all shadow-2xl z-[210]"
                                onClick={(e) => { e.stopPropagation(); goToPrev(); }}
                            >
                                <ChevronLeft className="w-8 h-8" />
                            </button>
                        )}
                        {activeItems.length > 1 && (
                            <button
                                className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-background/50 backdrop-blur-xl border border-border/50 hover:bg-background hover:scale-110 text-foreground flex items-center justify-center transition-all shadow-2xl z-[210]"
                                onClick={(e) => { e.stopPropagation(); goToNext(); }}
                            >
                                <ChevronRight className="w-8 h-8" />
                            </button>
                        )}

                        {/* Media Container */}
                        <motion.div
                            key={selectedItem.id}
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="max-w-6xl w-full relative z-[205] flex flex-col items-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* The actual media */}
                            <div className="w-full relative group">
                                {renderLightboxMedia(selectedItem)}
                            </div>

                            {/* Meta info glass plate */}
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="mt-8 text-center bg-card/30 backdrop-blur-2xl border border-border/50 p-6 md:p-8 rounded-3xl max-w-3xl w-full shadow-2xl"
                            >
                                <h3 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4 flex items-center justify-center gap-3">
                                    {selectedItem.media_type === "instagram" && <Instagram className="w-8 h-8 text-pink-500" />}
                                    {selectedItem.title}
                                </h3>
                                {selectedItem.description && (
                                    <p className="text-muted-foreground text-lg mb-4">{selectedItem.description}</p>
                                )}
                                
                                <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-bold uppercase tracking-wider">
                                    {selectedItem.location_name && (
                                        <span className="flex items-center gap-2 text-primary bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
                                            <MapPin className="h-4 w-4" /> {selectedItem.location_name}
                                        </span>
                                    )}
                                    {selectedItem.video_url && (
                                        <a href={selectedItem.video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-accent bg-accent/10 px-4 py-2 rounded-full border border-accent/20 hover:bg-accent/20 transition-colors">
                                            <ExternalLink className="w-4 h-4" /> 
                                            {selectedItem.media_type === "instagram" ? "Open Instagram" : "Open Original"}
                                        </a>
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Small Sparkle Icon helper
const SparkleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" fill="currentColor" />
    </svg>
);

export default GalleryPage;
