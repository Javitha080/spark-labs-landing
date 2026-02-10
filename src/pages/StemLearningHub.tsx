import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { BookOpen, Code, Cpu, Globe, Rocket, Search, Sparkles } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";

// Mock data for initial launch - will be replaced by Supabase data later
const RESOURCES = [
    {
        id: 1,
        title: "Getting Started with Robotics in School",
        category: "Robotics",
        level: "Beginner",
        icon: Rocket,
        description: "A complete guide to components, microcontrollers, and your first circuit.",
        gradient: "from-blue-500 to-cyan-500"
    },
    {
        id: 2,
        title: "Top 5 Python Libraries for Data Science",
        category: "Coding",
        level: "Intermediate",
        icon: Code,
        description: "Essential tools every young data scientist needs to know in 2026.",
        gradient: "from-green-500 to-emerald-500"
    },
    {
        id: 3,
        title: "ESP32 vs Arduino: Ultimate Comparison",
        category: "Electronics",
        level: "Beginner",
        icon: Cpu,
        description: "Which microcontroller is best for your school project? We break it down.",
        gradient: "from-orange-500 to-amber-500"
    },
    {
        id: 4,
        title: "Building a Solar Tracker",
        category: "Sustainable Tech",
        level: "Advanced",
        icon: Globe,
        description: "Step-by-step tutorial on maximizing solar panel efficiency with Arduino.",
        gradient: "from-purple-500 to-pink-500"
    }
];

const StemLearningHub = () => {
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const filteredResources = RESOURCES.filter(resource =>
        resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resource.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-background selection:bg-primary/30">
            <Helmet>
                <title>STEM Learning Hub - Free Robotics & Coding Resources | YIC</title>
                <meta name="description" content="Access free tutorials, guides, and project ideas for Robotics, Arduino, and Python. Build your future with the Young Innovators Club." />
                <link rel="canonical" href="https://yic-dharmapala.web.app/blog/stem-learning-hub" />
                <meta property="og:title" content="STEM Learning Hub - Free Robotics & Coding Resources | YIC" />
                <meta property="og:description" content="Access free tutorials, guides, and project ideas for Robotics, Arduino, and Python. Build your future with the Young Innovators Club." />
                <meta property="og:url" content="https://yic-dharmapala.web.app/blog/stem-learning-hub" />
            </Helmet>
            <Header />

            <main className="relative pt-32 pb-24 overflow-hidden">
                {/* Background Elements */}
                <div className="absolute top-0 left-0 w-full h-[500px] -z-10 opacity-30 pointer-events-none">
                    <div className="absolute top-20 right-[20%] w-[25rem] h-[25rem] bg-indigo-500/20 rounded-full blur-[120px] animate-pulse" />
                    <div className="absolute bottom-40 left-[10%] w-[20rem] h-[20rem] bg-teal-500/20 rounded-full blur-[120px] animate-pulse delay-700" />
                </div>

                <div className="container-custom px-4">
                    {/* Hero Section */}
                    <div className="text-center max-w-4xl mx-auto mb-16">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 mb-6"
                        >
                            <BookOpen className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-widest">Knowledge Base</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-4xl md:text-6xl font-black mb-6 tracking-tight"
                        >
                            STEM Learning <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">Hub</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
                        >
                            Free resources, tutorials, and guides created by students, for students.
                            Master the skills of tomorrow, today.
                        </motion.p>

                        {/* Search Bar */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="max-w-xl mx-auto relative group"
                        >
                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
                            <div className="relative flex items-center bg-card border border-border rounded-2xl p-2 shadow-xl">
                                <Search className="ml-3 w-5 h-5 text-muted-foreground" />
                                <Input
                                    placeholder="Search tutorials (e.g., 'Arduino', 'Python')..."
                                    className="border-0 focus-visible:ring-0 bg-transparent text-lg h-12"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </motion.div>
                    </div>

                    {/* Resources Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                        {filteredResources.map((resource, index) => (
                            <motion.div
                                key={resource.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * index }}
                            >
                                <Card className="h-full hover:shadow-lg hover:border-primary/50 transition-all duration-300 group overflow-hidden border-border/50">
                                    <div className={`h-2 w-full bg-gradient-to-r ${resource.gradient}`} />
                                    <CardHeader>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className={`p-3 rounded-xl bg-gradient-to-br ${resource.gradient} bg-opacity-10 text-white shadow-lg`}>
                                                <resource.icon className="w-6 h-6" />
                                            </div>
                                            <Badge variant="outline" className="font-mono text-xs">{resource.level}</Badge>
                                        </div>
                                        <CardTitle className="leading-tight group-hover:text-primary transition-colors">{resource.title}</CardTitle>
                                        <CardDescription className="font-medium text-xs uppercase tracking-wider mt-2 text-muted-foreground/70">{resource.category}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            {resource.description}
                                        </p>
                                    </CardContent>
                                    <CardFooter>
                                        <Button variant="ghost" className="w-full group/btn justify-between hover:bg-primary/5">
                                            Start Learning <Sparkles className="w-4 h-4 ml-2 group-hover/btn:text-primary transition-colors" />
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        ))}
                    </div>

                    {/* Call to Action */}
                    <div className="mt-20 text-center">
                        <p className="text-muted-foreground mb-4">Can't find what you're looking for?</p>
                        <Button variant="outline" className="rounded-full">Request a Tutorial</Button>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default StemLearningHub;
