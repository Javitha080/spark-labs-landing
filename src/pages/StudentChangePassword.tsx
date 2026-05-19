import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStudentAuth } from "@/context/StudentAuthContext";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from "lucide-react";

export default function StudentChangePassword() {
  const navigate = useNavigate();
  const { changePassword, student } = useStudentAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      await changePassword(newPassword);
      navigate("/student/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const StrengthItem = ({ met, label }: { met: boolean; label: string }) => (
    <div className={`flex items-center gap-2 text-xs transition-colors ${met ? "text-emerald-500" : "text-muted-foreground"}`}>
      <CheckCircle className={`w-3.5 h-3.5 ${met ? "text-emerald-500" : "text-muted-foreground/50"}`} />
      <span>{label}</span>
    </div>
  );

  return (
    <>
      <SEOHead
        title="Change Password | SPARK Labs"
        description="Set your new password for the SPARK Labs Student Portal."
        path="/student/change-password"
        noindex
      />
      <Header />
      <main className="min-h-screen bg-background flex items-center justify-center py-24 px-4">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-20 right-20 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <Card className="w-full max-w-md border-amber-500/20 shadow-2xl shadow-amber-500/5 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-black tracking-tight">
              Change Your Password
            </CardTitle>
            <CardDescription>
              {student?.name ? `Hi ${student.name}! ` : ""}For security, please set a new password before continuing.
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

              <div className="space-y-2">
                <label htmlFor="new-password" className="text-sm font-medium">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="pl-10 pr-10 rounded-xl border-amber-500/20 focus:border-amber-500"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirm-password" className="text-sm font-medium">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="pl-10 rounded-xl border-amber-500/20 focus:border-amber-500"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {/* Password strength indicator */}
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Password Requirements:</p>
                <StrengthItem met={hasMinLength} label="At least 8 characters" />
                <StrengthItem met={hasLetter} label="At least one letter" />
                <StrengthItem met={hasNumber} label="At least one number" />
                <StrengthItem met={passwordsMatch} label="Passwords match" />
              </div>

              <Button
                type="submit"
                disabled={loading || !isValid}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-500/90 hover:to-orange-500/90 text-base py-5 rounded-xl shadow-lg hover:shadow-amber-500/30 transition-all font-bold text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating password...
                  </>
                ) : (
                  "Set New Password & Continue"
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
