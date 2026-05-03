import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Image, X, Play, Instagram, ExternalLink, ChevronLeft, ChevronRight, MapPin, Layers } from "lucide-react";
import ReactPlayer from "react-player";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import React, { useEffect, useState, useCallback } from "react";
import { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import OptimizedImage from "@/components/ui/OptimizedImage";

const LCP_PRIORITY_THRESHOLD = 4;

type GalleryItem = Tables<"gallery_items">;
type GalleryItemWithVideo = GalleryItem;

function extractYouTubeId(url: string): string | null {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([^&?/#\s]{11})/);
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
        autoplay: settings?.autoplay ? "1" : "0", mute: settings?.mute ? "1" : "0",
        controls: settings?.controls ? "1" : "0", loop: settings?.loop ? "1" : "0",
        playlist: settings?.loop ? id : "", rel: "0", modestbranding: "1"
    });
    return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

function getVimeoEmbedUrl(url: string, settings?: { autoplay?: boolean; mute?: boolean; loop?: boolean }): string {
    const match = url.match(/vimeo\.com\/(\d+)/);
    if (!match) return url;
    const params = new URLSearchParams({
        autoplay: settings?.autoplay ? "1" : "0", muted: settings?.mute ? "1" : "0", loop: settings?.loop ? "1" : "0"
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
    if (item.video_url) { const yt = getYouTubeThumbnail(item.video_url); if (yt) return yt; }
    return "";
}

const getBentoSize = (index: number): "large" | "tall" | "wide" | "normal" => {
    const pattern: Array<"large" | "tall" | "wide" | "normal"> = [
        "large", "normal", "normal", "normal", "tall", "normal",
        "wide", "normal", "normal", "normal", "tall", "normal", "large",
    ];
    return pattern[index % pattern.length];
};

const sizeClasses = {
    large: "md:col-span-2 md:row-span-2",
    tall: "md:row-span-2", wide: "md:col-span-2", normal: "col-span-1"
};

const Player = ReactPlayer as any;

// Liquid Glass Card Component
const GlassCard = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn(
        "relative overflow-hidden rounded-3xl",
        "bg-gradient-to-br from-background/50 via-background/30 to-background/50",
        "backdrop-blur-2xl border border-white/10",
        "shadow-[0_8px_32px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]",
        "transition-all duration-500", className
    )} {...props}>
        <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-24 -left-24 w-40 h-40 bg-gradient-to-tr from-secondary/20 via-secondary/5 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(255,255,255,0.08)_0%,transparent_50%)]" />
        </div>
        <div className="absolute inset-0 rounded-3xl border border-white/5 pointer-events-none" />
        {children}
    </div>
);

const GalleryPage = () => {
    const [items, setItems] = useState<GalleryItemWithVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [activeCollection, setActiveCollection] = useState<string | null>(null);

    const collectionsMap = items.reduce((acc, item) => {
        const name = item.collection_name || "standalone";
        if (!acc[name]) acc[name] = { name, items: [], cover: null };
        acc[name].items.push(item);
        if (item.collection_cover || (!acc[name].cover && name !== "standalone")) acc[name].cover = item;
        return acc;
    }, {} as Record<string, { name: string; items: GalleryItemWithVideo[]; cover: GalleryItemWithVideo | null }>);

    const collections = Object.values(collectionsMap).filter(c => c.name !== "standalone");
    const standaloneItems = collectionsMap["standalone"]?.items || [];
    const activeItems = activeCollection ? (collectionsMap[activeCollection]?.items || []) : standaloneItems;
    const selectedItem = selectedIndex !== null && activeItems ? activeItems[selectedIndex] : null;

    const closeLightbox = useCallback(() => setSelectedIndex(null), []);
    const goToPrev = useCallback(() => setSelectedIndex((prev) => prev === null ? null : prev === 0 ? activeItems.length - 1 : prev - 1), [activeItems.length]);
    const goToNext = useCallback(() => setSelectedIndex((prev) => prev === null ? null : prev === activeItems.length - 1 ? 0 : prev + 1), [activeItems.length]);

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
                const { data, error } = await supabase.from("gallery_items").select("*").order("display_order", { ascending: true });
                if (error) throw error;
                setItems(data || []);
            } catch (error) { console.error("Error loading gallery:", error); }
            finally { setLoading(false); }
        };
        fetchGallery();
    }, []);

    const renderLightboxMedia = (image: GalleryItemWithVideo) => {
        const isInstagram = image.media_type === "instagram";
        const isVideo = image.media_type === "video";
        if (isInstagram && image.video_url) {
            const embedUrl = getInstagramEmbedUrl(image.video_url);
            if (embedUrl) return (
                <div className="flex flex-col items-center gap-4">
                    <GlassCard className="w-full max-w-md mx-auto overflow-hidden" style={{ minHeight: 500 }}>
                        <iframe src={embedUrl} className="w-full border-0" style={{ height: 560 }} allowFullScreen title={image.title} />
                    </GlassCard>
                    <a href={image.video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-pink-400 transition-colors">
                        <ExternalLink className="w-4 h-4" /> View on Instagram
                    </a>
                </div>
            );
        }
        if (isVideo && image.video_url) {
            const source = detectVideoSource(image.video_url);
            if (source === "youtube") return (
                <GlassCard className="w-full overflow-hidden"><div className="aspect-video"><iframe src={getYouTubeEmbedUrl(image.video_url, { autoplay: image.video_autoplay, mute: image.video_is_muted, loop: image.video_loop, controls: image.video_controls })} className="w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={image.title} /></div></GlassCard>
            );
            if (source === "vimeo") return (
                <GlassCard className="w-full overflow-hidden"><div className="aspect-video"><iframe src={getVimeoEmbedUrl(image.video_url, { autoplay: image.video_autoplay, mute: image.video_is_muted, loop: image.video_loop })} className="w-full h-full border-0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={image.title} /></div></GlassCard>
            );
            return <video src={image.video_url} poster={resolveThumb(image)} controls autoPlay loop muted className="w-full max-h-[80vh] object-contain rounded-3xl border border-white/10 shadow-2xl" />;
        }
        return <OptimizedImage src={image.image_url} alt={image.title} className="max-w-full max-h-[85vh] object-contain rounded-3xl border border-white/10 shadow-2xl" />;
    };

    return (
        <div className="min-h-screen bg-background relative overflow-hidden">
            <SEOHead title="Innovation Gallery | Young Innovators Club" description="Browse photos from workshops, events, and achievements." path="/gallery" />
            <Header />
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <motion.div animate={{ x: [0, 150, 0], y: [0, -100, 0], scale: [1, 1.3, 1] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/30 blur-[140px] opacity-60" />
                <motion.div animate={{ x: [0, -150, 0], y: [0, 100, 0], scale: [1, 1.6, 1] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full bg-secondary/30 blur-[160px] opacity-50" />
                <motion.div animate={{ x: [0, 80, -80, 0], y: [0, 80, -80, 0], rotate: [0, 180, 360] }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} className="absolute top-[20%] left-[30%] w-[50%] h-[50%] rounded-full bg-accent/20 blur-[120px] opacity-40" />
            </div>

            <main className="pt-32 pb-24 relative z-10 min-h-screen">
                <section className="container-custom mb-16">
                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="relative z-10">
                        <Link to="/">
                            <Button variant="ghost" className="mb-8 rounded-full hover:bg-primary/10 hover:border-primary/30 transition-all group">
                                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                                Back to Home
                            </Button>
                        </Link>
                        <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 bg-gradient-to-r from-foreground via-primary to-secondary bg-clip-text text-transparent">
                            Innovation Gallery
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-2xl">
                            Explore our journey through workshops, hackathons, and achievements. Every image tells a story of innovation and creativity.
                        </p>
                    </motion.div>
                </section>

                {loading ? (
                    <div className="container-custom">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="rounded-[2rem] bg-muted/20 animate-pulse backdrop-blur-md border border-white/10 h-[300px]" />
                            ))}
                        </div>
                    </div>
                ) : items.length === 0 ? (
                    <div className="container-custom">
                        <GlassCard className="text-center py-24">
                            <Image className="w-16 h-16 mx-auto text-muted-foreground/50 mb-6" />
                            <h3 className="text-2xl font-bold mb-2">No Media Found</h3>
                            <p className="text-muted-foreground">Check back soon for amazing moments!</p>
                        </GlassCard>
                    </div>
                ) : (
                    <>
                        {collections.length > 0 && (
                            <section className="container-custom mb-12">
                                <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="flex items-center gap-4 mb-8">
                                    <Layers className="w-6 h-6 text-primary" />
                                    <h2 className="text-2xl font-display font-bold">Collections</h2>
                                </motion.div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {collections.map((col, index) => {
                                        const thumb = col.cover ? resolveThumb(col.cover) : null;
                                        const bentoSize = getBentoSize(index);
                                        const isLarge = bentoSize === "large" || bentoSize === "wide";
                                        return (
                                            <motion.div key={col.name} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} whileHover={{ scale: 1.02 }} transition={{ duration: 0.5 }}
                                                className={cn("group relative rounded-[2rem] overflow-hidden cursor-pointer min-h-[300px]", "backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.2)]", "hover:shadow-[0_20px_60px_rgba(var(--primary-rgb),0.25)] transition-all duration-500", sizeClasses[bentoSize])}
                                                onClick={() => setActiveCollection(col.name)}>
                                                <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
                                                    <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-primary/30 to-transparent rounded-full blur-2xl" />
                                                    <div className="absolute -bottom-20 -left-20 w-32 h-32 bg-gradient-to-tr from-secondary/30 to-transparent rounded-full blur-2xl" />
                                                </div>
                                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20 pointer-events-none">
                                                    <div className="absolute inset-0 rounded-[2rem] border-2 border-transparent bg-[linear-gradient(45deg,transparent_20%,rgba(var(--primary-rgb),0.5)_50%,transparent_80%)] animate-border-flow" />
                                                </div>
                                                <div className="absolute inset-0 z-0">
                                                    {thumb ? <OptimizedImage src={thumb} alt={col.name} priority={index < LCP_PRIORITY_THRESHOLD} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-70 group-hover:opacity-100" /> : <div className="w-full h-full bg-gradient-to-br from-primary/30 via-background to-secondary/30" />}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                                                </div>
                                                <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8 z-10">
                                                    <motion.div initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background/60 backdrop-blur-xl border border-white/20 mb-3 shadow-lg">
                                                            <Image className="w-4 h-4 text-primary" />
                                                            <span className="text-xs font-bold uppercase tracking-wider">{col.items.length} Items</span>
                                                        </div>
                                                        <h3 className={cn("font-display font-bold tracking-tight drop-shadow-lg", isLarge ? "text-3xl md:text-5xl" : "text-2xl md:text-3xl")}>{col.name}</h3>
                                                    </motion.div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {activeCollection && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="container-custom mb-8">
                                <Button onClick={() => setActiveCollection(null)} variant="outline" className="rounded-full group">
                                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                                    Back to Collections
                                </Button>
                                <span className="ml-4 text-muted-foreground">{activeCollection}</span>
                            </motion.div>
                        )}

                        <div className="container-custom">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 auto-rows-[280px] md:auto-rows-[320px]">
                                {activeItems.map((item, index) => {
                                    const thumb = resolveThumb(item);
                                    const isInstagram = item.media_type === "instagram";
                                    const isVideo = item.media_type === "video";
                                    const bentoSize = getBentoSize(index);
                                    return (
                                        <motion.div key={item.id} initial={{ opacity: 0, scale: 0.9, y: 30 }} whileInView={{ opacity: 1, scale: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} whileHover={{ scale: 1.03 }} transition={{ delay: (index % 10) * 0.05, duration: 0.5 }}
                                            className={cn("group relative rounded-[2rem] overflow-hidden cursor-pointer", "backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.2)]", "hover:shadow-[0_20px_60px_rgba(var(--primary-rgb),0.25)] transition-all duration-500", sizeClasses[bentoSize])}
                                            onClick={() => setSelectedIndex(index)}>
                                            <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
                                                <div className="absolute -top-16 -right-16 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                                <div className="absolute -bottom-16 -left-16 w-28 h-28 bg-gradient-to-tr from-secondary/20 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                            </div>
                                            <div className="absolute inset-0 z-0">
                                                {thumb ? <OptimizedImage src={thumb} alt={item.title} priority={index < LCP_PRIORITY_THRESHOLD} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" /> : <div className={cn("w-full h-full flex items-center justify-center", isInstagram ? "bg-gradient-to-br from-pink-500/30 via-purple-500/30 to-orange-400/30" : "bg-muted/30")}>{isInstagram ? <Instagram className="w-12 h-12 text-pink-400/70" /> : <Image className="w-12 h-12 text-muted-foreground/50" />}</div>}
                                                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300" />
                                            </div>
                                            {isVideo && <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"><motion.div initial={{ scale: 0.8, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} className="w-16 h-16 rounded-full bg-background/70 backdrop-blur-xl flex items-center justify-center text-foreground shadow-2xl border border-white/20 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300"><Play className="w-6 h-6 fill-current ml-1" /></motion.div></div>}
                                            {isInstagram && <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"><motion.div initial={{ scale: 0.8, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 backdrop-blur-xl flex items-center justify-center shadow-2xl border border-white/30 group-hover:scale-110 transition-all duration-300"><Instagram className="w-7 h-7 text-white" /></motion.div></div>}
                                            <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-20">
                                                {item.location_name && <span className="px-3 py-1 rounded-full bg-background/70 backdrop-blur-xl text-xs font-medium border border-white/20 shadow-lg"><MapPin className="w-3 h-3 inline mr-1" />{item.location_name}</span>}
                                                {isVideo && <span className="px-3 py-1 rounded-full bg-primary/80 backdrop-blur-xl text-xs font-medium text-primary-foreground shadow-lg">Video</span>}
                                            </div>
                                            <div className="absolute bottom-0 left-0 right-0 p-4 z-20"><h3 className="font-semibold text-sm truncate opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg">{item.title}</h3></div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </main>
            <Footer />

            <AnimatePresence>
                {selectedIndex !== null && selectedItem && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8" onClick={closeLightbox}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-2xl" />
                        <button onClick={closeLightbox} className="absolute top-4 right-4 z-[210] w-12 h-12 rounded-full bg-background/50 backdrop-blur-xl border border-white/20 hover:bg-background hover:scale-110 transition-all shadow-lg"><X className="w-6 h-6 mx-auto" /></button>
                        {activeItems.length > 1 && <>
                            <button onClick={(e) => { e.stopPropagation(); goToPrev(); }} className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-[210] w-14 h-14 rounded-full bg-background/50 backdrop-blur-xl border border-white/20 hover:bg-background hover:scale-110 transition-all shadow-lg"><ChevronLeft className="w-8 h-8 mx-auto" /></button>
                            <button onClick={(e) => { e.stopPropagation(); goToNext(); }} className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-[210] w-14 h-14 rounded-full bg-background/50 backdrop-blur-xl border border-white/20 hover:bg-background hover:scale-110 transition-all shadow-lg"><ChevronRight className="w-8 h-8 mx-auto" /></button>
                        </>}
                        <motion.div key={selectedItem.id} initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="max-w-6xl w-full relative z-[205] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                            <GlassCard className="w-full p-2"><div className="w-full relative">{renderLightboxMedia(selectedItem)}</div></GlassCard>
                            <GlassCard className="mt-6 text-center max-w-3xl w-full">
                                <div className="p-6 md:p-8">
                                    <h3 className="text-2xl md:text-3xl font-display font-bold mb-4 flex items-center justify-center gap-3">
                                        {selectedItem.media_type === "instagram" && <Instagram className="w-6 h-6 text-pink-500" />}
                                        {selectedItem.title}
                                    </h3>
                                    {selectedItem.description && <p className="text-muted-foreground text-base mb-4">{selectedItem.description}</p>}
                                    <div className="flex flex-wrap items-center justify-center gap-3">
                                        {selectedItem.location_name && <span className="flex items-center gap-2 text-sm px-4 py-2 rounded-full bg-primary/10 border border-primary/20"><MapPin className="w-4 h-4 text-primary" /> {selectedItem.location_name}</span>}
                                        {selectedItem.video_url && <a href={selectedItem.video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm px-4 py-2 rounded-full bg-accent/10 border border-accent/20 hover:bg-accent/20 transition-colors"><ExternalLink className="w-4 h-4" />{selectedItem.media_type === "instagram" ? "Open Instagram" : "Open Original"}</a>}
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GalleryPage;
