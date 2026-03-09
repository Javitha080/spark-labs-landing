import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Team from "@/components/Team";
import Teachers from "@/components/Teachers";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

/* ===========================================
   TEAM PAGE - Full team and teachers
   =========================================== */

const TeamPage = () => {
    return (
        <div className="min-h-screen bg-background">
            <SEOHead
                title="Our Team | Young Innovators Club"
                description="Meet the passionate students and dedicated teachers who drive innovation at the Young Innovators Club, Dharmapala Vidyalaya."
                path="/team"
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
                                Our <span className="text-primary">Team</span>
                            </h1>
                            <p className="text-lg text-muted-foreground max-w-2xl">
                                Meet the passionate students and dedicated teachers who make the Young Innovators Club possible.
                            </p>
                        </motion.div>
                    </div>
                </section>

                {/* Team Section */}
                <Team />

                {/* Teachers Section */}
                <Teachers />
            </main>
            <Footer />
        </div>
    );
};

export default TeamPage;
