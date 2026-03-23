import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import About from "@/components/About";
import Impact from "@/components/Impact";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

/* ===========================================
   ABOUT PAGE - Full page about section
   =========================================== */

const AboutPage = () => {
    return (
        <div className="min-h-screen bg-background">
            <SEOHead
                title="About Us | Young Innovators Club — School Invention Club"
                description="Learn about the Young Innovators Club — a leading school invention club at Dharmapala Vidyalaya. Discover our mission, values, and commitment to empowering students through STEM education and inventions."
                path="/about"
            />
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
                                About <span className="text-primary">Us</span>
                            </h1>
                            <p className="text-lg text-muted-foreground max-w-2xl">
                                Learn more about the Young Innovators Club, our mission, values, and what drives us to empower the next generation of innovators.
                            </p>
                        </motion.div>
                    </div>
                </section>

                {/* About Section */}
                <About />

                {/* Impact Section */}
                <Impact />
            </main>
            <Footer />
        </div>
    );
};

export default AboutPage;
