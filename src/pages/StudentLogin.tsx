import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useStudentAuth } from "@/context/StudentAuthContext";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GraduationCap, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";

export default function StudentLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/student/dashboard";
  const { signIn, isAuthenticated, loading: authLoading } = useStudentAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already authenticated, redirect
  if (!authLoading && isAuthenticated) {
    navigate(redirect, { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signIn(email, password);
      // Auth state change will trigger redirect via StudentRoute or the effect above
      navigate(redirect, { replace: true });
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
      <main className="min-h-screen bg-background flex items-center justify-center py-24 px-4">
        {/* Background decorations */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-20 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-20 w-80 h-80 bg-secondary/5 rounded-full blur-3xl" />
        </div>

        <Card className="w-full max-w-md border-primary/10 shadow-2xl shadow-primary/5 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-black tracking-tight">
              Student Portal
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Sign in with the credentials sent to your email
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
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
                  <Link 
                    to="/student/forgot-password" 
                    className="text-[10px] font-bold text-primary hover:text-accent transition-colors underline-offset-4 hover:underline"
                  >
                    Forgot Password?
                  </Link>
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
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link
                  to="/#join"
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Enroll Now
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </>
  );
}
