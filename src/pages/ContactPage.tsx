import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Contact from "@/components/Contact";
import JoinUs from "@/components/JoinUs";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

/* ===========================================
   CONTACT PAGE - Full contact information
   =========================================== */

const ContactPage = () => {
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
                                Contact <span className="text-primary">Us</span>
                            </h1>
                            <p className="text-lg text-muted-foreground max-w-2xl mb-8">
                                Have questions? Want to collaborate? We'd love to hear from you!
                            </p>

                            {/* Quick contact info */}
                            <div className="flex flex-wrap gap-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Mail className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Email</p>
                                        <p className="font-medium">yic@dharmapalapannipitiya.lk</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <MapPin className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Location</p>
                                        <p className="font-medium">Dharmapala Vidyalaya, Pannipitiya</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Join Us Section */}
                <JoinUs />

                {/* Contact Form Section */}
                <Contact />
            </main>
            <Footer />
        </div>
    );
};

export default ContactPage;
