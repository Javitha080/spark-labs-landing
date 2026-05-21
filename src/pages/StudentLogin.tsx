import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useStudentAuth } from "@/context/StudentAuthContext";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GraduationCap, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, Sparkles, BookOpen, Trophy, Compass } from "lucide-react";

export default function StudentLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/student/dashboard";
  const { signIn, isAuthenticated, mustChangePassword, loading: authLoading } = useStudentAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      if (mustChangePassword) {
        navigate("/student/change-password", { replace: true });
      } else {
        navigate(redirect, { replace: true });
      }
    }
  }, [authLoading, isAuthenticated, mustChangePassword, navigate, redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Student Login | SPARK Labs"
        description="Login to your SPARK Labs Student Portal to access courses, track progress, and manage your learning journey."
        path="/student/login"
      />
      <Header />
      <main className="min-h-screen bg-background flex relative overflow-hidden">
        {/* Layered Glassmorphic Mesh Gradients */}
        <div className="absolute inset-0 bg-background pointer-events-none -z-20" />
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[70%] rounded-full bg-gradient-to-br from-primary/10 to-accent/5 blur-[130px] pointer-events-none -z-10" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[60%] rounded-full bg-gradient-to-tr from-secondary/15 to-primary/5 blur-[120px] pointer-events-none -z-10" />
        
        {/* Micro-dot matrix background */}
        <div className="absolute inset-0 student-grid-bg opacity-[0.25] pointer-events-none -z-10" />

        {/* 1. Frosted Left Panel — Hidden on mobile, takes 45% width on large screens */}
        <div className="hidden lg:flex w-[45%] bg-card/20 backdrop-blur-xl border-r border-border/10 relative flex-col justify-between p-12 overflow-hidden select-none">
          {/* Inner specular highlight for liquid glass look */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-white/5 to-transparent" />

          {/* Gradient glow blobs inside panel */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-20 right-10 w-72 h-72 bg-accent/8 rounded-full blur-[90px] pointer-events-none" />

          {/* Top Branding Section */}
          <div className="relative z-10">
            <Link to="/" className="inline-flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/10 group-hover:scale-105 transition-transform duration-300">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </Link>
          </div>

          {/* Center Branded / Interactive Illustration */}
          <div className="relative z-10 py-12 flex flex-col items-start justify-center gap-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold tracking-wider text-primary uppercase">
              <GraduationCap className="w-3.5 h-3.5" />
              Interactive Learning Ecosystem
            </div>
            
            <h2 className="text-4xl xl:text-5xl font-display font-black tracking-tight leading-tight">
              UNLEASH YOUR <br />
              <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                CREATIVE POTENTIAL
              </span>
            </h2>
            
            <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
              Step back into your customizable workshop. Build interactive code, level up your developer rank, and claim real-world accomplishments.
            </p>

            {/* Floating Gamified Achievement Badges */}
            <div className="w-full grid grid-cols-2 gap-4 mt-8">
              <div className="float-badge flex items-center gap-3 p-3.5 rounded-2xl bg-card/30 border border-border/10 backdrop-blur-md hover:border-primary/20 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs font-black">Level Up Fast</p>
                  <p className="text-[10px] text-muted-foreground/80">Gain 100+ XP</p>
                </div>
              </div>

              <div className="float-badge flex items-center gap-3 p-3.5 rounded-2xl bg-card/30 border border-border/10 backdrop-blur-md hover:border-primary/20 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-black">20+ STEM Quests</p>
                  <p className="text-[10px] text-muted-foreground/80">Hands-on practice</p>
                </div>
              </div>

              <div className="float-badge flex items-center gap-3 p-3.5 rounded-2xl bg-card/30 border border-border/10 backdrop-blur-md hover:border-primary/20 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Compass className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-xs font-black">Pathfinder</p>
                  <p className="text-[10px] text-muted-foreground/80">Find your track</p>
                </div>
              </div>

              <div className="float-badge flex items-center gap-3 p-3.5 rounded-2xl bg-card/30 border border-border/10 backdrop-blur-md hover:border-primary/20 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs font-black">Claim Badges</p>
                  <p className="text-[10px] text-muted-foreground/80">Show off projects</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer inside Left Panel */}
          <div className="relative z-10 text-[10px] font-medium text-muted-foreground/50 flex justify-between">
            <span>© {new Date().getFullYear()} All rights reserved.</span>
            <span>Est. 2024</span>
          </div>
        </div>

        {/* 2. Login Form Portal — Takes 55% width on large screens, full screen on mobile */}
        <div className="flex-1 flex flex-col justify-center py-20 px-4 md:px-12 lg:px-20 relative">
          <div className="w-full max-w-md mx-auto space-y-8 relative z-10 stagger-in">
            {/* Header elements for mobile view */}
            <div className="lg:hidden text-center space-y-3">
              <Link to="/" className="inline-flex items-center gap-2">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/15">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
              </Link>
            </div>

            {/* Liquid-glass Card container with premium highlights */}
            <Card className="border-white/10 bg-card/25 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden liquid-glass">
              <CardHeader className="text-center pb-3 pt-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/10 border border-white/15">
                  <GraduationCap className="w-7 h-7 text-white" />
                </div>
                <CardTitle className="text-2xl font-display font-black tracking-tight">
                  Student Sign In
                </CardTitle>
                <CardDescription className="text-muted-foreground font-medium pt-1 text-xs">
                  Enter your workshop access credentials
                </CardDescription>
              </CardHeader>

              <CardContent className="px-6 md:px-8 pb-8 pt-2">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs leading-relaxed animate-fade-up">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Email Field with Floating Icon */}
                  <div className="space-y-2">
                    <label htmlFor="student-email" className="text-[10px] font-bold tracking-wider text-muted-foreground/80 uppercase">
                      Email Address
                    </label>
                    <div className="relative rounded-2xl border border-white/10 bg-background/30 hover:border-primary/30 focus-within:border-primary/50 transition-all neon-input">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                        <Mail className="w-4 h-4 text-muted-foreground/60" />
                      </div>
                      <Input
                        id="student-email"
                        type="email"
                        placeholder="your.email@domain.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                        className="w-full bg-transparent border-0 pl-11 py-6 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/30 text-xs font-semibold rounded-2xl"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  {/* Password Field with Toggle and Floating Icon */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label htmlFor="student-password" className="text-[10px] font-bold tracking-wider text-muted-foreground/80 uppercase">
                        Password
                      </label>
                    </div>
                    <div className="relative rounded-2xl border border-white/10 bg-background/30 hover:border-primary/30 focus-within:border-primary/50 transition-all neon-input">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                        <Lock className="w-4 h-4 text-muted-foreground/60" />
                      </div>
                      <Input
                        id="student-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="w-full bg-transparent border-0 pl-11 pr-12 py-6 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/30 text-xs font-semibold rounded-2xl"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors p-1 rounded-lg"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Sign In Button with Sweep Effect */}
                  <Button
                    type="submit"
                    disabled={loading || !email || !password}
                    className="w-full bg-gradient-to-r from-primary via-accent to-secondary hover:brightness-110 text-white font-bold py-6 rounded-2xl shadow-lg shadow-primary/10 transition-all duration-300 btn-shimmer text-xs tracking-wider mt-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Accessing Workshop...
                      </>
                    ) : (
                      "Access Portal"
                    )}
                  </Button>
                </form>

                {/* Bottom Enroll link */}
                <div className="mt-8 text-center">
                  <p className="text-[10px] font-semibold text-muted-foreground/80">
                    Don't have an account?{" "}
                    <Link
                      to="/#join"
                      className="text-primary hover:text-accent font-bold transition-colors underline underline-offset-4 decoration-primary/20 hover:decoration-accent/60"
                    >
                      Request Student Account
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
