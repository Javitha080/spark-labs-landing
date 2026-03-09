import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loading } from "@/components/ui/loading";
import { ArrowLeft, Calendar, Clock, MapPin, Users, User, ExternalLink, Wrench } from "lucide-react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

type Workshop = {
    id: string; title: string; slug: string; description: string | null;
    workshop_date: string | null; workshop_time: string | null; location: string | null;
    max_capacity: number | null; materials: string | null; instructor: string | null;
    category: string | null; is_featured: boolean | null; is_published: boolean | null;
    registration_url: string | null; created_at: string;
};

const WorkshopDetail = () => {
    const { id } = useParams<{ id: string }>();
    const [workshop, setWorkshop] = useState<Workshop | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        (async () => {
            const { data } = await supabase.from("learning_workshops").select("*").eq("id", id).eq("is_published", true).maybeSingle();
            setWorkshop(data); setLoading(false);
        })();
    }, [id]);

    if (loading) return <><Header /><div className="min-h-screen flex items-center justify-center"><Loading size="lg" /></div></>;
    if (!workshop) return <><Header /><div className="min-h-screen flex items-center justify-center"><div className="text-center"><h2 className="text-2xl font-bold">Workshop Not Found</h2><Link to="/learning-hub"><Button className="mt-4"><ArrowLeft className="w-4 h-4 mr-2" />Back to Hub</Button></Link></div></div></>;

    return (
        <>
            <SEOHead
                title={`${workshop.title} | Young Innovators Club Learning Hub`}
                description={workshop.description || `${workshop.title} — A workshop from the Young Innovators Club Learning Hub.`}
                path={`/learning-hub/workshop/${id}`}
            />
            <Header />
            <main className="min-h-screen bg-background pt-20 pb-16">
                <div className="container mx-auto px-4 max-w-3xl">
                    <Link to="/learning-hub" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
                        <ArrowLeft className="w-4 h-4" />Back to Learning Hub
                    </Link>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {workshop.category && <Badge variant="secondary">{workshop.category}</Badge>}
                            {workshop.is_featured && <Badge className="bg-amber-500/20 text-amber-600">Featured</Badge>}
                        </div>
                        <h1 className="text-3xl md:text-5xl font-bold mb-6">{workshop.title}</h1>

                        <div className="grid sm:grid-cols-2 gap-4 mb-8">
                            <Card><CardContent className="p-4 flex items-center gap-3">
                                <Calendar className="w-5 h-5 text-primary" />
                                <div><p className="text-sm text-muted-foreground">Date</p><p className="font-semibold">{workshop.workshop_date || "TBD"}</p></div>
                            </CardContent></Card>
                            <Card><CardContent className="p-4 flex items-center gap-3">
                                <Clock className="w-5 h-5 text-primary" />
                                <div><p className="text-sm text-muted-foreground">Time</p><p className="font-semibold">{workshop.workshop_time || "TBD"}</p></div>
                            </CardContent></Card>
                            <Card><CardContent className="p-4 flex items-center gap-3">
                                <MapPin className="w-5 h-5 text-primary" />
                                <div><p className="text-sm text-muted-foreground">Location</p><p className="font-semibold">{workshop.location || "TBD"}</p></div>
                            </CardContent></Card>
                            <Card><CardContent className="p-4 flex items-center gap-3">
                                <Users className="w-5 h-5 text-primary" />
                                <div><p className="text-sm text-muted-foreground">Capacity</p><p className="font-semibold">{workshop.max_capacity || "Unlimited"} seats</p></div>
                            </CardContent></Card>
                        </div>

                        {workshop.instructor && (
                            <div className="flex items-center gap-2 mb-4 text-muted-foreground">
                                <User className="w-4 h-4" /><span>Instructor: <strong className="text-foreground">{workshop.instructor}</strong></span>
                            </div>
                        )}

                        <Separator className="my-6" />

                        {workshop.description && (
                            <div className="prose prose-lg dark:prose-invert max-w-none mb-8">
                                <h2>About This Workshop</h2>
                                <p className="whitespace-pre-wrap">{workshop.description}</p>
                            </div>
                        )}

                        {workshop.materials && (
                            <div className="mb-8">
                                <h2 className="text-xl font-bold mb-3 flex items-center gap-2"><Wrench className="w-5 h-5 text-primary" />Materials Needed</h2>
                                <Card><CardContent className="p-4 whitespace-pre-wrap text-sm">{workshop.materials}</CardContent></Card>
                            </div>
                        )}

                        {workshop.registration_url && (
                            <Button size="lg" asChild className="w-full sm:w-auto">
                                <a href={workshop.registration_url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-4 h-4 mr-2" />Register for Workshop
                                </a>
                            </Button>
                        )}
                    </motion.div>
                </div>
            </main>
            <Footer />
        </>
    );
};

export default WorkshopDetail;
