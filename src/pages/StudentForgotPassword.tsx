import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { Helmet } from "react-helmet-async";
import OptimizedImage from "@/components/ui/OptimizedImage";
import { clubLogo } from "@/components/ClubLogo";
import { Turnstile } from "@/components/Turnstile";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "0x4AAAAAADQZzzoTINMH1_WT";

export default function StudentForgotPassword() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState("");
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        if (!turnstileToken) {
            toast({
                title: "Security Check Required",
                description: "Please complete the bot-protection challenge before continuing.",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        // Supabase sends the reset link with a redirect to the actual reset password page
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: `${window.location.origin}/student/reset-password`,
        });

        setLoading(false);

        if (error) {
            toast({
                title: "Error sending link",
                description: error.message,
                variant: "destructive"
            });
        } else {
            setSubmitted(true);
            toast({
                title: "Reset link sent",
                description: "Check your email for the password reset link."
            });
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 size-full bg-grid-white/[0.02] bg-[length:50px_50px]" />
            <div className="absolute top-0 right-1/4 size-[40rem] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 size-[40rem] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

            <Helmet>
                <title>Forgot Password | Spark Labs</title>
                <meta name="description" content="Reset your Spark Labs student account password." />
            </Helmet>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <Link to="/" className="inline-block hover:scale-105 transition-transform duration-300">
                        <OptimizedImage src={clubLogo} alt="Spark Labs" priority className="h-10 mx-auto drop-shadow-lg" />
                    </Link>
                    <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">Reset Password</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>
                </div>

                <div className="bg-card/40 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl p-8">
                    {submitted ? (
                        <div className="text-center space-y-4">
                            <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Mail className="size-8 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold">Check your email</h3>
                            <p className="text-muted-foreground text-sm">
                                We've sent a password reset link to <strong>{email}</strong>. 
                                Please check your inbox and spam folder.
                            </p>
                            <Button 
                                variant="outline" 
                                className="w-full mt-6 bg-white/5 border-white/10 hover:bg-white/10"
                                onClick={() => setSubmitted(false)}
                            >
                                Try another email
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium text-foreground">Email Address</label>
                                <Input 
                                    id="email" 
                                    type="email" 
                                    placeholder="you@example.com" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="h-12 bg-black/20 border-white/10 focus:border-primary/50"
                                    disabled={loading}
                                />
                            </div>

                            <div className="flex justify-center">
                                <Turnstile
                                    siteKey={TURNSTILE_SITE_KEY}
                                    theme="dark"
                                    onSuccess={(token) => setTurnstileToken(token)}
                                    onError={() => setTurnstileToken("")}
                                />
                            </div>

                            <Button 
                                type="submit" 
                                className="w-full h-12 text-base font-semibold shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] transition-all"
                                disabled={loading || !email.trim() || !turnstileToken}
                            >
                                {loading ? <Loader2 className="size-5 animate-spin" /> : "Send Reset Link"}
                            </Button>
                        </form>
                    )}

                    <div className="mt-8 text-center">
                        <Link to="/student/login" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                            <ArrowLeft className="size-4 mr-2" />
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
