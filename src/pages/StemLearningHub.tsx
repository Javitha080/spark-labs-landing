import { useEffect, useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { 
    BookOpen, Code, Cpu, Globe, Rocket, Search, Sparkles, 
    FlaskConical, Calculator, Wrench, Lightbulb, PlayCircle,
    Clock, Users, Star, ChevronRight, Filter, GraduationCap,
    Atom, CircuitBoard, Microscope, Binary, Layers, Zap,
    Target, Award, TrendingUp, ArrowRight, CheckCircle2,
    Download, HelpCircle, MessageCircle
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

// STEM Categories Data
const CATEGORIES = [
    {
        id: "science",
        name: "Science",
        icon: FlaskConical,
        color: "from-emerald-500 to-teal-500",
        bgColor: "bg-emerald-500/10",
        description: "Physics, Chemistry, Biology & more",
        courses: 24,
        students: "1.2K"
    },
    {
        id: "technology",
        name: "Technology",
        icon: Code,
        color: "from-blue-500 to-indigo-500",
        bgColor: "bg-blue-500/10",
        description: "Coding, AI, Web Development & more",
        courses: 42,
        students: "2.5K"
    },
    {
        id: "engineering",
        name: "Engineering",
        icon: Wrench,
        color: "from-orange-500 to-amber-500",
        bgColor: "bg-orange-500/10",
        description: "Robotics, Electronics, CAD & more",
        courses: 18,
        students: "890"
    },
    {
        id: "mathematics",
        name: "Mathematics",
        icon: Calculator,
        color: "from-purple-500 to-pink-500",
        bgColor: "bg-purple-500/10",
        description: "Algebra, Calculus, Statistics & more",
        courses: 15,
        students: "1.8K"
    }
];

// Featured Courses Data
const FEATURED_COURSES = [
    {
        id: 1,
        title: "Arduino Masterclass: From Zero to Hero",
        category: "Engineering",
        level: "Beginner",
        duration: "12 weeks",
        students: 856,
        rating: 4.9,
        image: "arduino",
        icon: Cpu,
        color: "from-orange-500 to-amber-500",
        description: "Learn microcontroller programming, sensor integration, and build real-world projects.",
        modules: 24,
        lessons: 96,
        instructor: "Mr. Perera",
        featured: true
    },
    {
        id: 2,
        title: "Python for Data Science & AI",
        category: "Technology",
        level: "Intermediate",
        duration: "16 weeks",
        students: 1243,
        rating: 4.8,
        image: "python",
        icon: Code,
        color: "from-blue-500 to-cyan-500",
        description: "Master Python, NumPy, Pandas, and build machine learning models from scratch.",
        modules: 32,
        lessons: 128,
        instructor: "Ms. Fernando",
        featured: true
    },
    {
        id: 3,
        title: "IoT: Smart Home Automation",
        category: "Technology",
        level: "Advanced",
        duration: "10 weeks",
        students: 567,
        rating: 4.9,
        image: "iot",
        icon: Globe,
        color: "from-green-500 to-emerald-500",
        description: "Build connected devices, work with ESP32, and create your smart home ecosystem.",
        modules: 20,
        lessons: 80,
        instructor: "Mr. Silva",
        featured: true
    },
    {
        id: 4,
        title: "Physics: Mechanics & Dynamics",
        category: "Science",
        level: "Intermediate",
        duration: "14 weeks",
        students: 923,
        rating: 4.7,
        image: "physics",
        icon: Atom,
        color: "from-violet-500 to-purple-500",
        description: "Understand forces, motion, energy, and apply physics principles to engineering.",
        modules: 28,
        lessons: 112,
        instructor: "Ms. Jayawardena",
        featured: false
    },
    {
        id: 5,
        title: "3D Modeling with Blender",
        category: "Engineering",
        level: "Beginner",
        duration: "8 weeks",
        students: 678,
        rating: 4.8,
        image: "3d",
        icon: Layers,
        color: "from-pink-500 to-rose-500",
        description: "Create stunning 3D models, animations, and prepare for 3D printing projects.",
        modules: 16,
        lessons: 64,
        instructor: "Mr. Bandara",
        featured: false
    },
    {
        id: 6,
        title: "Web Development Bootcamp",
        category: "Technology",
        level: "Beginner",
        duration: "20 weeks",
        students: 2156,
        rating: 4.9,
        image: "web",
        icon: CircuitBoard,
        color: "from-indigo-500 to-blue-500",
        description: "Full-stack web dev: HTML, CSS, JavaScript, React, Node.js, and databases.",
        modules: 40,
        lessons: 160,
        instructor: "Ms. Perera",
        featured: true
    }
];

// Learning Paths Data
const LEARNING_PATHS = [
    {
        id: "robotics",
        title: "Robotics Engineer",
        icon: Rocket,
        color: "from-red-500 to-orange-500",
        description: "Master robotics from basics to advanced automation",
        courses: 8,
        duration: "48 weeks",
        skills: ["Arduino", "Sensors", "Motors", "Programming", "CAD"],
        progress: 0
    },
    {
        id: "datascience",
        title: "Data Scientist",
        icon: Binary,
        color: "from-blue-500 to-indigo-500",
        description: "Analyze data and build AI/ML models",
        courses: 10,
        duration: "60 weeks",
        skills: ["Python", "Statistics", "ML", "Visualization", "SQL"],
        progress: 0
    },
    {
        id: "fullstack",
        title: "Full Stack Developer",
        icon: Layers,
        color: "from-green-500 to-teal-500",
        description: "Build complete web applications",
        courses: 12,
        duration: "72 weeks",
        skills: ["HTML/CSS", "JavaScript", "React", "Node.js", "Database"],
        progress: 0
    },
    {
        id: "scientist",
        title: "Research Scientist",
        icon: Microscope,
        color: "from-purple-500 to-pink-500",
        description: "Conduct experiments and research",
        courses: 6,
        duration: "36 weeks",
        skills: ["Methodology", "Analysis", "Lab Skills", "Writing", "Ethics"],
        progress: 0
    }
];

// Quick Resources Data
const QUICK_RESOURCES = [
    { 
        title: "Circuit Simulator", 
        type: "Tool", 
        icon: Zap, 
        bgColor: "bg-yellow-500/10",
        iconColor: "text-yellow-500",
        borderColor: "group-hover:border-yellow-500/30",
        description: "Simulate circuits online",
        link: "#simulator"
    },
    { 
        title: "Code Playground", 
        type: "Tool", 
        icon: Code, 
        bgColor: "bg-blue-500/10",
        iconColor: "text-blue-500",
        borderColor: "group-hover:border-blue-500/30",
        description: "Write & test code instantly",
        link: "#playground"
    },
    { 
        title: "Formula Sheet", 
        type: "Reference", 
        icon: Calculator, 
        bgColor: "bg-green-500/10",
        iconColor: "text-green-500",
        borderColor: "group-hover:border-green-500/30",
        description: "Essential STEM formulas",
        link: "#formulas"
    },
    { 
        title: "Project Ideas", 
        type: "Guide", 
        icon: Lightbulb, 
        bgColor: "bg-orange-500/10",
        iconColor: "text-orange-500",
        borderColor: "group-hover:border-orange-500/30",
        description: "Inspiring project ideas",
        link: "#ideas"
    },
    { 
        title: "Component Guide", 
        type: "Reference", 
        icon: Wrench, 
        bgColor: "bg-purple-500/10",
        iconColor: "text-purple-500",
        borderColor: "group-hover:border-purple-500/30",
        description: "Electronics reference",
        link: "#components"
    },
    { 
        title: "Video Library", 
        type: "Media", 
        icon: PlayCircle, 
        bgColor: "bg-red-500/10",
        iconColor: "text-red-500",
        borderColor: "group-hover:border-red-500/30",
        description: "Tutorial videos",
        link: "#videos"
    }
];

// Stats Data
const STATS = [
    { value: "50+", label: "Courses", icon: BookOpen },
    { value: "5K+", label: "Students", icon: Users },
    { value: "100+", label: "Projects", icon: Rocket },
    { value: "98%", label: "Success Rate", icon: Award }
];

const StemLearningHub = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const heroRef = useRef<HTMLDivElement>(null);
    const isHeroInView = useInView(heroRef, { once: true });

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const filteredCourses = FEATURED_COURSES.filter(course => {
        const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            course.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === "all" || 
                               course.category.toLowerCase() === selectedCategory.toLowerCase();
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="min-h-screen bg-background selection:bg-primary/30">
            <Helmet>
                <title>STEM Learning Hub - Free Robotics & Coding Resources | YIC</title>
                <meta name="description" content="Access free tutorials, guides, and project ideas for Robotics, Arduino, and Python. Build your future with the Young Innovators Club." />
                <link rel="canonical" href="https://yicdvp.lovable.app/stem-learning-hub" />
            </Helmet>
            <Header />

            <main className="relative overflow-hidden">
                {/* Hero Section */}
                <section ref={heroRef} className="relative pt-32 pb-20 lg:pt-40 lg:pb-32">
                    {/* Background Effects */}
                    <div className="absolute inset-0 -z-10 overflow-hidden">
                        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[150px]" />
                        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px]" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/5 rounded-full blur-[200px]" />
                    </div>

                    <div className="container mx-auto px-4">
                        <div className="max-w-5xl mx-auto text-center">
                            {/* Badge */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 mb-8"
                            >
                                <GraduationCap className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-widest">Free Learning Platform</span>
                            </motion.div>

                            {/* Title */}
                            <motion.h1
                                initial={{ opacity: 0, y: 30 }}
                                animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ delay: 0.1 }}
                                className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 tracking-tight"
                            >
                                STEM Learning{" "}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
                                    Hub
                                </span>
                            </motion.h1>

                            {/* Description */}
                            <motion.p
                                initial={{ opacity: 0, y: 30 }}
                                animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ delay: 0.2 }}
                                className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12"
                            >
                                Master Science, Technology, Engineering, and Mathematics with our 
                                free courses, tutorials, and hands-on projects.
                            </motion.p>

                            {/* Stats Row */}
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ delay: 0.3 }}
                                className="flex flex-wrap justify-center gap-8 md:gap-12 mb-12"
                            >
                                {STATS.map((stat, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                            <stat.icon className="w-6 h-6 text-primary" />
                                        </div>
                                        <div className="text-left">
                                            <div className="text-2xl font-bold">{stat.value}</div>
                                            <div className="text-sm text-muted-foreground">{stat.label}</div>
                                        </div>
                                    </div>
                                ))}
                            </motion.div>

                            {/* Search Bar */}
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ delay: 0.4 }}
                                className="max-w-2xl mx-auto relative group"
                            >
                                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
                                <div className="relative flex items-center bg-card border border-border rounded-2xl p-2 shadow-xl">
                                    <Search className="ml-4 w-5 h-5 text-muted-foreground" />
                                    <Input
                                        placeholder="Search courses, tutorials, topics..."
                                        className="border-0 focus-visible:ring-0 bg-transparent text-lg h-14 px-4"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    <Button className="rounded-xl h-12 px-6">
                                        Search
                                    </Button>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Categories Section */}
                <section className="py-20 bg-muted/30">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-black mb-4">Explore by Category</h2>
                            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                                Choose your path and start learning today
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {CATEGORIES.map((category, index) => (
                                <motion.div
                                    key={category.id}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    viewport={{ once: true }}
                                    onClick={() => setSelectedCategory(category.id)}
                                    className={`group cursor-pointer relative overflow-hidden rounded-3xl p-6 transition-all duration-500 hover:-translate-y-2 ${
                                        selectedCategory === category.id ? 'ring-2 ring-primary' : ''
                                    }`}
                                >
                                    <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                                    <div className="relative">
                                        <div className={`w-14 h-14 rounded-2xl ${category.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                            <category.icon className={`w-7 h-7 bg-gradient-to-br ${category.color} bg-clip-text`} style={{ 
                                                stroke: category.id === 'science' ? '#10b981' : 
                                                       category.id === 'technology' ? '#3b82f6' :
                                                       category.id === 'engineering' ? '#f97316' : '#a855f7'
                                            }} />
                                        </div>
                                        <h3 className="text-xl font-bold mb-2">{category.name}</h3>
                                        <p className="text-sm text-muted-foreground mb-4">{category.description}</p>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">{category.courses} courses</span>
                                            <span className="text-muted-foreground">{category.students} students</span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Featured Courses Section */}
                <section className="py-20">
                    <div className="container mx-auto px-4">
                        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
                            <div>
                                <h2 className="text-3xl md:text-5xl font-black mb-4">Featured Courses</h2>
                                <p className="text-lg text-muted-foreground">
                                    Hand-picked courses to kickstart your STEM journey
                                </p>
                            </div>
                            <Button variant="outline" className="rounded-full group">
                                View All Courses
                                <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </div>

                        <Tabs defaultValue="all" className="w-full">
                            <TabsList className="mb-8 flex-wrap h-auto gap-2">
                                <TabsTrigger value="all" onClick={() => setSelectedCategory("all")}>All Courses</TabsTrigger>
                                <TabsTrigger value="featured" onClick={() => setSelectedCategory("featured")}>Featured</TabsTrigger>
                                <TabsTrigger value="beginner" onClick={() => setSelectedCategory("beginner")}>Beginner</TabsTrigger>
                                <TabsTrigger value="intermediate" onClick={() => setSelectedCategory("intermediate")}>Intermediate</TabsTrigger>
                                <TabsTrigger value="advanced" onClick={() => setSelectedCategory("advanced")}>Advanced</TabsTrigger>
                            </TabsList>

                            <TabsContent value="all" className="mt-0">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <AnimatePresence>
                                        {filteredCourses.map((course, index) => (
                                            <CourseCard key={course.id} course={course} index={index} />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </TabsContent>
                            
                            <TabsContent value="featured" className="mt-0">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredCourses.filter(c => c.featured).map((course, index) => (
                                        <CourseCard key={course.id} course={course} index={index} />
                                    ))}
                                </div>
                            </TabsContent>
                            
                            {['beginner', 'intermediate', 'advanced'].map(level => (
                                <TabsContent key={level} value={level} className="mt-0">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {filteredCourses.filter(c => c.level.toLowerCase() === level).map((course, index) => (
                                            <CourseCard key={course.id} course={course} index={index} />
                                        ))}
                                    </div>
                                </TabsContent>
                            ))}
                        </Tabs>
                    </div>
                </section>

                {/* Learning Paths Section */}
                <section className="py-20 bg-muted/30">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-black mb-4">Learning Paths</h2>
                            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                                Structured curriculums designed to take you from beginner to expert
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
                            {LEARNING_PATHS.map((path, index) => (
                                <motion.div
                                    key={path.id}
                                    initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    viewport={{ once: true }}
                                >
                                    <Card className="group hover:shadow-xl transition-all duration-500 overflow-hidden border-border/50">
                                        <div className={`h-1.5 w-full bg-gradient-to-r ${path.color}`} />
                                        <CardHeader className="pb-4">
                                            <div className="flex items-start justify-between">
                                                <div className={`p-3 rounded-xl bg-gradient-to-br ${path.color} text-white shadow-lg`}>
                                                    <path.icon className="w-6 h-6" />
                                                </div>
                                                <Badge variant="outline" className="font-mono">
                                                    {path.courses} courses
                                                </Badge>
                                            </div>
                                            <CardTitle className="text-2xl mt-4 group-hover:text-primary transition-colors">
                                                {path.title}
                                            </CardTitle>
                                            <CardDescription className="text-base">
                                                {path.description}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-4 h-4" />
                                                    {path.duration}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Target className="w-4 h-4" />
                                                    {path.skills.length} skills
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-wrap gap-2">
                                                {path.skills.map((skill, i) => (
                                                    <span 
                                                        key={i}
                                                        className="px-2 py-1 text-xs rounded-md bg-muted font-medium"
                                                    >
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>

                                            <div className="pt-2">
                                                <div className="flex justify-between text-sm mb-2">
                                                    <span className="text-muted-foreground">Progress</span>
                                                    <span className="font-medium">{path.progress}%</span>
                                                </div>
                                                <Progress value={path.progress} className="h-2" />
                                            </div>
                                        </CardContent>
                                        <CardFooter>
                                            <Button className="w-full group/btn">
                                                Start Learning Path
                                                <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Quick Resources Section */}
                <section className="py-20">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-16">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                            >
                                <Badge variant="outline" className="mb-4 px-4 py-1">
                                    <Sparkles className="w-3 h-3 mr-2" />
                                    Free Tools
                                </Badge>
                                <h2 className="text-3xl md:text-5xl font-black mb-4">Quick Resources</h2>
                                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                                    Essential tools and references to accelerate your STEM learning journey
                                </p>
                            </motion.div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {QUICK_RESOURCES.map((resource, index) => (
                                <motion.a
                                    href={resource.link}
                                    key={resource.title}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.05 }}
                                    viewport={{ once: true }}
                                    whileHover={{ scale: 1.05, y: -5 }}
                                    className="group cursor-pointer"
                                >
                                    <div className={`relative p-6 rounded-2xl bg-card border border-border/50 ${resource.borderColor} hover:shadow-lg transition-all duration-300 text-center h-full`}>
                                        {/* Glow Effect */}
                                        <div className={`absolute inset-0 rounded-2xl ${resource.bgColor} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                                        
                                        <div className="relative">
                                            <div className={`w-14 h-14 mx-auto rounded-2xl ${resource.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                                <resource.icon className={`w-7 h-7 ${resource.iconColor}`} />
                                            </div>
                                            <h3 className="font-bold text-sm mb-1">{resource.title}</h3>
                                            <p className="text-xs text-muted-foreground mb-2">{resource.type}</p>
                                            <p className="text-xs text-muted-foreground/70 line-clamp-2">{resource.description}</p>
                                            
                                            {/* Arrow indicator */}
                                            <div className="mt-3 flex justify-center">
                                                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ChevronRight className={`w-4 h-4 ${resource.iconColor}`} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.a>
                            ))}
                        </div>

                        {/* Additional Resource Links */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="mt-12 flex flex-wrap justify-center gap-3"
                        >
                            <Button variant="outline" size="sm" className="rounded-full">
                                <BookOpen className="w-4 h-4 mr-2" />
                                Documentation
                            </Button>
                            <Button variant="outline" size="sm" className="rounded-full">
                                <Download className="w-4 h-4 mr-2" />
                                Downloads
                            </Button>
                            <Button variant="outline" size="sm" className="rounded-full">
                                <HelpCircle className="w-4 h-4 mr-2" />
                                Help Center
                            </Button>
                            <Button variant="outline" size="sm" className="rounded-full">
                                <MessageCircle className="w-4 h-4 mr-2" />
                                Community
                            </Button>
                        </motion.div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-20">
                    <div className="container mx-auto px-4">
                        <div className="relative rounded-3xl overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                            <div className="absolute inset-0 bg-black/20" />
                            
                            <div className="relative px-8 py-16 md:py-24 text-center text-white">
                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                >
                                    <h2 className="text-3xl md:text-5xl font-black mb-6">
                                        Ready to Start Learning?
                                    </h2>
                                    <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-8">
                                        Join thousands of students mastering STEM skills. 
                                        Get access to all courses, projects, and our community - completely free!
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                        <Button size="lg" variant="secondary" className="rounded-full text-lg px-8">
                                            <Sparkles className="w-5 h-5 mr-2" />
                                            Get Started Now
                                        </Button>
                                        <Button size="lg" variant="outline" className="rounded-full text-lg px-8 border-white/30 text-white hover:bg-white/10">
                                            Browse Courses
                                        </Button>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
};

// Course Card Component
const CourseCard = ({ course, index }: { course: typeof FEATURED_COURSES[0]; index: number }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            layout
        >
            <Card className="group h-full hover:shadow-xl hover:border-primary/30 transition-all duration-500 overflow-hidden border-border/50">
                <div className={`h-1.5 w-full bg-gradient-to-r ${course.color}`} />
                <CardHeader className="pb-3">
                    <div className="flex justify-between items-start mb-3">
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${course.color} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                            <course.icon className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <Badge variant="outline" className="font-mono text-xs">
                                {course.level}
                            </Badge>
                            {course.featured && (
                                <Badge className="bg-primary text-primary-foreground text-xs">
                                    <Star className="w-3 h-3 mr-1 fill-current" />
                                    Featured
                                </Badge>
                            )}
                        </div>
                    </div>
                    <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
                        {course.title}
                    </CardTitle>
                    <CardDescription className="text-xs uppercase tracking-wider mt-1">
                        {course.category} • {course.instructor}
                    </CardDescription>
                </CardHeader>
                <CardContent className="pb-3">
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-4">
                        {course.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {course.duration}
                        </div>
                        <div className="flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5" />
                            {course.modules} modules
                        </div>
                        <div className="flex items-center gap-1">
                            <PlayCircle className="w-3.5 h-3.5" />
                            {course.lessons} lessons
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between pt-0">
                    <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{course.students.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-semibold text-sm">{course.rating}</span>
                    </div>
                </CardFooter>
            </Card>
        </motion.div>
    );
};

export default StemLearningHub;
