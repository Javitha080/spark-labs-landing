import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from "lucide-react";

const StrengthItem = ({ met, label }: { met: boolean; label: string }) => (
  <div className={`flex items-center gap-2 text-xs transition-colors ${met ? "text-emerald-500" : "text-muted-foreground"}`}>
    <CheckCircle className={`size-3.5 ${met ? "text-emerald-500" : "text-muted-foreground/50"}`} />
    <span>{label}</span>
  </div>
);

export default function StudentResetPassword() {
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if we have an active session (user should be logged in via magic link)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setError("Invalid or expired password reset link. Please request a new one.");
      }
    });
  }, []);

  // Password strength checks
  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;
  const isValid = hasMinLength && hasLetter && hasNumber && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      
      // Navigate to login after successful reset
      await supabase.auth.signOut();
      navigate("/student/login?reset=success", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };



  return (
    <>
      <SEOHead
        title="Reset Password | SPARK Labs"
        description="Set your new password for the SPARK Labs Student Portal."
        path="/student/reset-password"
        noindex
      />
      <Header />
      <main className="min-h-screen bg-background flex items-center justify-center py-24 px-4">
        <div className="absolute top-0 left-0 size-full overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-20 right-20 size-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-20 size-80 bg-accent/5 rounded-full blur-3xl" />
        </div>

        <Card className="w-full max-w-md border-white/10 shadow-2xl bg-card/25 backdrop-blur-xl liquid-glass">
          <CardHeader className="text-center pb-2 pt-8">
            <div className="size-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20 border border-white/10">
              <Shield className="size-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-display font-black tracking-tight">
              Create New Password
            </CardTitle>
            <CardDescription className="text-xs">
              Please set a strong password to secure your account.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4 pb-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                  <AlertCircle className="size-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="new-password" className="text-[10px] font-bold tracking-wider text-muted-foreground/80 uppercase">
                  New Password
                </label>
                <div className="relative rounded-2xl border border-white/10 bg-background/30 hover:border-primary/30 focus-within:border-primary/50 transition-all neon-input">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full bg-transparent border-0 pl-11 pr-12 py-6 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/30 text-xs font-semibold rounded-2xl"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors p-1"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirm-password" className="text-[10px] font-bold tracking-wider text-muted-foreground/80 uppercase">
                  Confirm Password
                </label>
                <div className="relative rounded-2xl border border-white/10 bg-background/30 hover:border-primary/30 focus-within:border-primary/50 transition-all neon-input">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full bg-transparent border-0 pl-11 pr-12 py-6 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/30 text-xs font-semibold rounded-2xl"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {/* Password strength indicator */}
              <div className="p-4 rounded-xl bg-muted/30 border border-white/5 space-y-2 mt-2">
                <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase mb-2">Password Requirements:</p>
                <StrengthItem met={hasMinLength} label="At least 8 characters" />
                <StrengthItem met={hasLetter} label="At least one letter" />
                <StrengthItem met={hasNumber} label="At least one number" />
                <StrengthItem met={passwordsMatch} label="Passwords match" />
              </div>

              <Button
                type="submit"
                disabled={loading || !isValid}
                className="w-full bg-gradient-to-r from-primary via-accent to-secondary hover:brightness-110 text-white font-bold py-6 rounded-2xl shadow-lg shadow-primary/10 transition-all duration-300 btn-shimmer text-xs tracking-wider mt-4"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Resetting password&hellip;
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </>
  );
}
