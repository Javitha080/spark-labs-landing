import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { ArrowLeft, Image as ImageIcon, X, ChevronLeft, ChevronRight, MapPin, ArrowUpRight, Search, Sparkles, Film, Instagram, Layers } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LiquidGlass from "@/components/ui/LiquidGlass";
import MediaTile, { resolveThumb, detectMediaSource, type MediaTileItem } from "@/components/media/MediaTile";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { logError } from "@/lib/errors";

type GalleryItem = Tables<"gallery_items"> & MediaTileItem;

// Bento sizing pattern
const BENTO_PATTERN: Array<"large" | "tall" | "wide" | "normal"> = [
  "large", "normal", "tall",
  "normal", "wide", "normal",
  "tall", "normal", "normal",
  "large", "normal", "wide",
];
const sizeClasses = {
  large: "md:col-span-2 md:row-span-2",
  tall: "md:row-span-2",
  wide: "md:col-span-2",
  normal: "col-span-1",
};

type Filter = "all" | "image" | "video" | "instagram";

const FILTERS: { id: Filter; label: string; icon: typeof ImageIcon }[] = [
  { id: "all", label: "All", icon: Layers },
  { id: "image", label: "Photos", icon: ImageIcon },
  { id: "video", label: "Videos", icon: Film },
  { id: "instagram", label: "Instagram", icon: Instagram },
];

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
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  // Fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("gallery_items")
          .select("*")
          .order("display_order", { ascending: true });
        if (error) throw error;
        if (!cancelled) setItems((data || []) as GalleryItem[]);
      } catch (e) {
        logError(e, "GalleryPage.fetch");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Group into collections
  const { collections, standaloneItems } = useMemo(() => {
    const map = new Map<string, { name: string; items: GalleryItem[]; cover: GalleryItem | null }>();
    for (const it of items) {
      const name = it.collection_name || "__standalone__";
      if (!map.has(name)) map.set(name, { name, items: [], cover: null });
      const bucket = map.get(name)!;
      bucket.items.push(it);
      if (it.collection_cover || (!bucket.cover && name !== "__standalone__")) bucket.cover = it;
    }
    const standalone = map.get("__standalone__")?.items || [];
    map.delete("__standalone__");
    return { collections: Array.from(map.values()), standaloneItems: standalone };
  }, [items]);

  // Filter + search
  const isFilteringOrSearching = filter !== "all" || search.trim() !== "";

  const sourceItems = activeCollection
    ? collections.find((c) => c.name === activeCollection)?.items || []
    : filter === "all" ? []
    : items;

  const activeItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sourceItems.filter((it) => {
      if (filter !== "all") {
        const src = detectMediaSource(it.media_type, it.video_url);
        if (filter === "image" && src !== "image") return false;
        if (filter === "video" && !(src === "youtube" || src === "vimeo" || src === "direct-video")) return false;
        if (filter === "instagram" && src !== "instagram") return false;
      }
      if (!q) return true;
      return (
        it.title?.toLowerCase().includes(q) ||
        (it.description || "").toLowerCase().includes(q) ||
        (it.location_name || "").toLowerCase().includes(q)
      );
    });
  }, [sourceItems, filter, search]);

  const selectedItem = selectedIndex !== null ? activeItems[selectedIndex] : null;
  const closeLightbox = useCallback(() => setSelectedIndex(null), []);
  const goToPrev = useCallback(() => {
    setSelectedIndex((p) => (p === null ? null : p === 0 ? activeItems.length - 1 : p - 1));
  }, [activeItems.length]);
  const goToNext = useCallback(() => {
    setSelectedIndex((p) => (p === null ? null : p === activeItems.length - 1 ? 0 : p + 1));
  }, [activeItems.length]);

  useEffect(() => {
    if (selectedIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") goToPrev();
      else if (e.key === "ArrowRight") goToNext();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [selectedIndex, closeLightbox, goToPrev, goToNext]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <SEOHead
        title="Innovation Gallery | Young Innovators Club"
        description="Explore photos, videos, and Instagram highlights from workshops, events, and innovations at Dharmapala Vidyalaya."
        path="/gallery"
      />
      <Header />

      {/* Static, GPU-friendly ambient orbs (no animated filters) */}
      <div aria-hidden className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-15%] left-[-10%] w-[55%] h-[55%] rounded-full bg-primary/30 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-secondary/30 blur-[140px]" />
        <div className="absolute top-1/3 left-1/3 w-[40%] h-[40%] rounded-full bg-accent/20 blur-[100px]" />
      </div>

      <main className="pt-32 pb-24 relative z-10">
        {/* Header */}
        <section className="container-custom mb-12">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Link to="/">
              <Button variant="outline" className="mb-6 rounded-full bg-background/50 backdrop-blur-md border-border/50 group">
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                Back to Home
              </Button>
            </Link>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold uppercase tracking-wider mb-6">
              <Sparkles className="w-4 h-4" /> Our Moments
            </div>

            <h1 className="text-5xl md:text-7xl font-display font-black tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-br from-foreground via-foreground to-foreground/60 leading-[1.05]">
              {activeCollection ? activeCollection : (
                <>Innovation <br /><span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-secondary">Gallery</span></>
              )}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
              {activeCollection
                ? `Immerse yourself in our ${activeCollection} collection.`
                : "A visual journey through workshops, events, and groundbreaking projects."}
            </p>
          </motion.div>

          {/* Filters + Search */}
          <LiquidGlass variant="default" rounded="3xl" className="mt-10 p-3 md:p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <LayoutGroup>
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((f) => {
                  const Icon = f.icon;
                  const active = filter === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setFilter(f.id)}
                      className={cn(
                        "relative px-4 py-2 rounded-full text-sm font-semibold transition-colors flex items-center gap-2",
                        active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {active && (
                        <motion.div
                          layoutId="filter-pill"
                          className="absolute inset-0 rounded-full bg-primary shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.6)]"
                          transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        />
                      )}
                      <span className="relative flex items-center gap-2">
                        <Icon className="w-4 h-4" /> {f.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </LayoutGroup>
            <div className="relative md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, place..."
                className="pl-9 bg-background/50 border-border/50 rounded-full"
              />
            </div>
          </LiquidGlass>
        </section>

        <section className="container-custom">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-[280px]">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className={cn("rounded-[2rem] bg-muted/20 animate-pulse border border-border/30", sizeClasses[BENTO_PATTERN[i % BENTO_PATTERN.length]])} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <LiquidGlass variant="intense" rounded="3xl" className="text-center py-24">
              <ImageIcon className="w-16 h-16 mx-auto text-muted-foreground/50 mb-6" />
              <h3 className="text-2xl font-bold mb-2">No Media Found</h3>
              <p className="text-muted-foreground">Check back soon for amazing moments!</p>
            </LiquidGlass>
          ) : (
            <div className="flex flex-col gap-12">
              {activeCollection && (
                <Button variant="outline" className="self-start rounded-full bg-background/50 backdrop-blur-xl border-border/50 group h-11 px-5" onClick={() => { setActiveCollection(null); setSelectedIndex(null); }}>
                  <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                  All Collections
                </Button>
              )}

              {/* Collections grid */}
              {!activeCollection && collections.length > 0 && !isFilteringOrSearching && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 auto-rows-[280px] md:auto-rows-[320px]">
                    {collections.map((col, index) => {
                      const thumb = col.cover ? resolveThumb(col.cover) : "";
                      const size = BENTO_PATTERN[index % BENTO_PATTERN.length];
                      const isLarge = size === "large" || size === "wide";
                      return (
                        <motion.button
                          key={col.name}
                          initial={{ opacity: 0, y: 30 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, margin: "-50px" }}
                          transition={{ delay: Math.min(index * 0.05, 0.3), duration: 0.5 }}
                          onClick={() => setActiveCollection(col.name)}
                          className={cn(
                            "group relative rounded-[2rem] overflow-hidden text-left",
                            "bg-background/20 backdrop-blur-2xl border border-white/15",
                            "shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]",
                            "transition-all duration-500 hover:border-primary/40 hover:-translate-y-1 hover:shadow-[0_30px_80px_-20px_hsl(var(--primary)/0.4)]",
                            sizeClasses[size]
                          )}
                        >
                          <div className="absolute inset-0">
                            {thumb ? (
                              <MediaTile item={{ ...col.cover!, image_url: thumb, media_type: "image" }} priority={index < 4} hoverPreview={false} />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary/20 via-background to-secondary/20" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent" />
                          </div>
                          <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
                            <div className="inline-flex w-fit items-center gap-2 px-3 py-1.5 rounded-full bg-background/60 backdrop-blur-md border border-white/15 mb-3">
                              <ImageIcon className="w-3.5 h-3.5 text-primary" />
                              <span className="text-[11px] font-bold uppercase tracking-wider">{col.items.length} items</span>
                            </div>
                            <h3 className={cn("font-display font-bold tracking-tight drop-shadow", isLarge ? "text-3xl md:text-4xl" : "text-2xl")}>
                              {col.name}
                            </h3>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Items grid */}
              {activeItems.length === 0 && !(filter === "all" && !activeCollection && collections.length > 0) ? (
                <LiquidGlass variant="default" rounded="3xl" className="text-center py-16">
                  <p className="text-muted-foreground">No items match your filters.</p>
                </LiquidGlass>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[260px] md:auto-rows-[300px]">
                  {activeItems.map((item, index) => {
                    const size = BENTO_PATTERN[index % BENTO_PATTERN.length];
                    return (
                      <motion.button
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        whileInView={{ opacity: 1, scale: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ delay: Math.min((index % 10) * 0.04, 0.4), duration: 0.4 }}
                        onClick={() => setSelectedIndex(index)}
                        className={cn(
                          "group relative rounded-[2rem] overflow-hidden text-left",
                          "bg-background/20 backdrop-blur-2xl border border-white/15",
                          "shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]",
                          "transition-all duration-500 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_30px_80px_-20px_hsl(var(--primary)/0.4)]",
                          sizeClasses[size]
                        )}
                      >
                        <MediaTile item={item} priority={index < 4} />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent pointer-events-none" />
                        <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-background/40 backdrop-blur-md border border-white/15 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <ArrowUpRight className="h-4 w-4" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
                          {item.location_name && (
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary mb-1.5 uppercase tracking-wider">
                              <MapPin className="w-3 h-3" /> {item.location_name}
                            </div>
                          )}
                          <h3 className="font-bold text-lg md:text-xl leading-tight line-clamp-2 drop-shadow">{item.title}</h3>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
      <Footer />

      {/* Lightbox - Half-Screen Card / Bottom Sheet */}
      <AnimatePresence>
        {selectedItem && (
          <>
            {/* Desktop: Semi-transparent overlay on left side (click to close, does not block scroll) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[190] bg-background/40 backdrop-blur-[2px] hidden md:block"
              style={{ width: '50%' }}
              onClick={closeLightbox}
            />
            {/* Mobile: Top overlay (click to close) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[190] bg-background/60 backdrop-blur-[2px] md:hidden"
              onClick={closeLightbox}
            />

            <motion.div
              key={selectedItem.id}
              initial={{ x: "100%", y: 0, opacity: 0 }}
              animate={{ x: 0, y: 0, opacity: 1 }}
              exit={{ x: "100%", y: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 250 }}
              // Override mobile animation to come from bottom
              className="fixed z-[200] bg-background/95 backdrop-blur-3xl border-t md:border-t-0 md:border-l border-white/10 shadow-2xl flex flex-col p-4 md:p-8 
                         bottom-0 left-0 right-0 h-[75vh] rounded-t-[2.5rem] md:rounded-t-none
                         md:top-0 md:bottom-0 md:left-auto md:right-0 md:h-auto md:w-[50vw] md:rounded-l-[2.5rem] overflow-hidden"
              role="dialog"
              aria-modal="false" // intentionally false so background is still "active"
            >
              {/* Mobile Drag Indicator */}
              <div className="w-16 h-1.5 bg-white/20 rounded-full mx-auto mb-6 md:hidden" />

              <div className="absolute top-4 right-4 md:top-8 md:right-8 flex items-center gap-2 z-[210]">
                {activeItems.length > 1 && (
                  <div className="flex bg-background/50 backdrop-blur-xl border border-white/15 rounded-full overflow-hidden mr-2">
                    <button
                      aria-label="Previous"
                      onClick={(e) => { e.stopPropagation(); goToPrev(); }}
                      className="p-2.5 hover:bg-white/10 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="w-px bg-white/10" />
                    <button
                      aria-label="Next"
                      onClick={(e) => { e.stopPropagation(); goToNext(); }}
                      className="p-2.5 hover:bg-white/10 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
                <button
                  aria-label="Close"
                  onClick={closeLightbox}
                  className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-xl border border-white/15 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="w-full mt-4 md:mt-12 flex-1 flex flex-col overflow-y-auto">
                <div className="w-full relative border border-white/5 bg-black">
                  <MediaTile item={selectedItem} inline autoplaySettings />
                </div>

                <div className="mt-8 px-2 pb-8">
                  <h3 className="text-2xl md:text-3xl font-display font-bold mb-3 flex items-center gap-3">
                    {selectedItem.media_type === "instagram" && <Instagram className="w-7 h-7 text-pink-500" />}
                    {selectedItem.title}
                  </h3>
                  
                  {selectedItem.location_name && (
                    <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 mb-4">
                      <MapPin className="h-3.5 w-3.5" /> {selectedItem.location_name}
                    </span>
                  )}

                  {selectedItem.description && (
                    <p className="text-muted-foreground text-base md:text-lg leading-relaxed">{selectedItem.description}</p>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GalleryPage;
