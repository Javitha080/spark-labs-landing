import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Image, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Tables } from "@/integrations/supabase/types";

/* ===========================================
   GALLERY PAGE - Full photo gallery with lightbox
   =========================================== */

type GalleryItem = Tables<"gallery_items">;

const GalleryPage = () => {
    const [items, setItems] = useState<GalleryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);

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

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="pt-24">
                {/* Page Header */}
                <section className="section-padding bg-background border-b border-border">
                    <div className="container-custom">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <Link to="/">
                                <Button variant="ghost" className="mb-6 -ml-4">
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back to Home
                                </Button>
                            </Link>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-4">
                                Photo <span className="text-primary">Gallery</span>
                            </h1>
                            <p className="text-lg text-muted-foreground max-w-2xl">
                                Captured moments from our workshops, events, and achievements.
                            </p>
                        </motion.div>
                    </div>
                </section>

                {/* Gallery Grid */}
                <section className="section-padding">
                    <div className="container-custom">
                        {loading ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {[...Array(12)].map((_, i) => (
                                    <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
                                ))}
                            </div>
                        ) : items.length === 0 ? (
                            <div className="text-center py-16">
                                <Image className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">No gallery items yet.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {items.map((item, index) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: index * 0.05, duration: 0.4 }}
                                        className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer"
                                        onClick={() => setSelectedItem(item)}
                                    >
                                        <img
                                            src={item.image_url}
                                            alt={item.title}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="absolute bottom-0 left-0 right-0 p-4">
                                                <h3 className="text-white font-semibold text-sm line-clamp-1">
                                                    {item.title}
                                                </h3>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </main>
            <Footer />

            {/* Lightbox */}
            <AnimatePresence>
                {selectedItem && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4"
                        onClick={() => setSelectedItem(null)}
                    >
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-4 right-4 text-white hover:bg-white/10"
                            onClick={() => setSelectedItem(null)}
                        >
                            <X className="w-6 h-6" />
                        </Button>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="max-w-4xl max-h-[80vh] relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img
                                src={selectedItem.image_url}
                                alt={selectedItem.title}
                                className="max-w-full max-h-[80vh] object-contain rounded-lg"
                            />
                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent rounded-b-lg">
                                <h3 className="text-white font-semibold">{selectedItem.title}</h3>
                                {selectedItem.description && (
                                    <p className="text-white/70 text-sm mt-1">{selectedItem.description}</p>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GalleryPage;
