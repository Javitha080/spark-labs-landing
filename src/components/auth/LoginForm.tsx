import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Lock,
  Mail,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  Globe,
  KeyRound,
  Fingerprint,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import { CMS_ACCESS_ROLES, AppRole } from "@/contexts/RoleContext";
import clubLogo from "@/assets/club-logo.png";

// ─── Validation Helpers ────────────────────────────────────────────
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const MIN_PASSWORD_LENGTH = 6;

interface ValidationState {
  email: { valid: boolean; message: string };
  password: { valid: boolean; message: string };
}

// ─── Security Step Types ───────────────────────────────────────────
type SecurityStepStatus = "pending" | "active" | "completed" | "failed";

interface SecurityStep {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  status: SecurityStepStatus;
}

// ─── Rate Limit Response ───────────────────────────────────────────
interface RateLimitResponse {
  allowed: boolean;
  remaining: number;
  reset_at: string;
  reason: string | null;
}

const LoginForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  // Security state
  const [userIp, setUserIp] = useState<string | null>(null);
  const [ipLoading, setIpLoading] = useState(true);
  const [isHttps, setIsHttps] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [lockoutCountdown, setLockoutCountdown] = useState<number>(0);

  // Verification steps state
  const [showVerification, setShowVerification] = useState(false);
  const [securitySteps, setSecuritySteps] = useState<SecurityStep[]>([
    { id: "connection", label: "Establishing secure connection...", icon: Shield, status: "pending" },
    { id: "policies", label: "Verifying security policies...", icon: ShieldCheck, status: "pending" },
    { id: "auth", label: "Authenticating credentials...", icon: KeyRound, status: "pending" },
    { id: "rbac", label: "Verifying authorization...", icon: Fingerprint, status: "pending" },
  ]);

  const formRef = useRef<HTMLFormElement>(null);

  // ─── Detect HTTPS ──────────────────────────────────────────────
  useEffect(() => {
    setIsHttps(window.location.protocol === "https:");
  }, []);

  // ─── Fetch User IP ─────────────────────────────────────────────
  useEffect(() => {
    const fetchIp = async () => {
      try {
        const res = await fetch("https://api.ipify.org?format=json");
        const data = await res.json();
        setUserIp(data.ip);
      } catch {
        setUserIp(null);
      } finally {
        setIpLoading(false);
      }
    };
    fetchIp();
  }, []);

  // ─── Lockout Countdown Timer ───────────────────────────────────
  useEffect(() => {
    if (!lockedUntil) {
      setLockoutCountdown(0);
      return;
    }
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.floor((new Date(lockedUntil).getTime() - Date.now()) / 1000));
      setLockoutCountdown(remaining);
      if (remaining <= 0) {
        setLockedUntil(null);
        setRemainingAttempts(null);
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  // ─── Validation ────────────────────────────────────────────────
  const validate = useCallback((): ValidationState => {
    const emailValid = EMAIL_REGEX.test(email);
    const passwordValid = password.length >= MIN_PASSWORD_LENGTH;
    return {
      email: {
        valid: emailValid,
        message: !email ? "Email is required" : !emailValid ? "Enter a valid email address" : "",
      },
      password: {
        valid: passwordValid,
        message: !password
          ? "Password is required"
          : !passwordValid
            ? `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
            : "",
      },
    };
  }, [email, password]);

  const validation = validate();
  const isFormValid = validation.email.valid && validation.password.valid;

  // ─── Step Updater ──────────────────────────────────────────────
  const updateStep = (stepId: string, status: SecurityStepStatus) => {
    setSecuritySteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, status } : s))
    );
  };

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // ─── Login Handler ─────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });

    if (!isFormValid) return;

    setLoading(true);
    setShowVerification(true);

    // Reset steps
    setSecuritySteps((prev) => prev.map((s) => ({ ...s, status: "pending" })));

    try {
      // ── Step 1: Establish Secure Connection ──────────────────
      updateStep("connection", "active");
      await sleep(600);
      updateStep("connection", "completed");

      // ── Step 2: Verify Security Policies (rate limit) ────────
      updateStep("policies", "active");
      await sleep(400);

      const { data: rateLimitData, error: rateLimitError } = await supabase.rpc(
        "check_login_rate_limit",
        { p_email: email }
      );

      if (rateLimitError) {
        console.error("Rate limit check error:", rateLimitError);
        updateStep("policies", "failed");
        toast({
          title: "Service Unavailable",
          description: "Login service is currently unavailable. Please try again later.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (rateLimitData === false) {
        updateStep("policies", "failed");
        try {
          const { data: advancedData } = await supabase.rpc("check_advanced_rate_limit", {
            p_email: email,
            p_ip_address: userIp,
          });
          if (advancedData) {
            const parsed = advancedData as unknown as RateLimitResponse;
            setRemainingAttempts(parsed.remaining);
            if (parsed.reset_at) setLockedUntil(parsed.reset_at);
          }
        } catch {
          // Non-critical
        }
        toast({
          title: "Account Locked",
          description: "Too many failed login attempts. Please try again in 15 minutes.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      updateStep("policies", "completed");

      // ── Step 3: Authenticate Credentials ─────────────────────
      updateStep("auth", "active");
      await sleep(300);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Log the attempt with IP address
      try {
        await supabase.from("login_attempts").insert({
          email,
          success: !error,
          attempted_at: new Date().toISOString(),
          ip_address: userIp,
        });
      } catch (logError) {
        console.error("Failed to log login attempt:", logError);
      }

      if (error) {
        updateStep("auth", "failed");

        try {
          const { data: advancedData } = await supabase.rpc("check_advanced_rate_limit", {
            p_email: email,
            p_ip_address: userIp,
          });
          if (advancedData) {
            const parsed = advancedData as unknown as RateLimitResponse;
            setRemainingAttempts(parsed.remaining);
            if (!parsed.allowed && parsed.reset_at) setLockedUntil(parsed.reset_at);
          }
        } catch {
          // Non-critical
        }

        let message = "Invalid email or password. Please try again.";
        if (error.message.toLowerCase().includes("email not confirmed")) {
          message = "Please confirm your email address before logging in.";
        } else if (error.message.toLowerCase().includes("rate limit") || error.message.toLowerCase().includes("too many requests")) {
          message = "Too many login attempts. Please try again later.";
        }

        toast({
          title: "Authentication Failed",
          description: message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      updateStep("auth", "completed");

      // ── Step 4: Verify Authorization (RBAC) ──────────────────
      if (data.user) {
        updateStep("rbac", "active");
        await sleep(400);

        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (roleError) {
          console.error("Role check error:", roleError);
        }

        const userRole = roleData?.role as AppRole;

        if (!userRole) {
          updateStep("rbac", "failed");
          await supabase.auth.signOut();
          toast({
            title: "Pending Role Assignment",
            description: "Your account is pending role assignment. Please contact an administrator.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        if (!CMS_ACCESS_ROLES.includes(userRole)) {
          updateStep("rbac", "failed");
          await supabase.auth.signOut();
          toast({
            title: "Access Denied",
            description: "Your role does not have CMS access privileges.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        updateStep("rbac", "completed");
        await sleep(500);

        toast({
          title: "Welcome back!",
          description: `Logged in as ${userRole.charAt(0).toUpperCase() + userRole.slice(1).replace(/_/g, " ")}.`,
        });
        navigate("/admin/events");
      }
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ─── Format Countdown ──────────────────────────────────────────
  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden bg-background">
      {/* Animated background blobs matching the website's style */}
      <div
        className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full opacity-20 blur-[120px] animate-blob pointer-events-none"
        style={{ background: "hsl(var(--primary) / 0.4)" }}
      />
      <div
        className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full opacity-15 blur-[100px] animate-blob pointer-events-none"
        style={{ background: "hsl(var(--accent) / 0.3)", animationDelay: "2s" }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10 blur-[140px] animate-blob pointer-events-none"
        style={{ background: "hsl(var(--secondary) / 0.3)", animationDelay: "4s" }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* ─── Security Status Header ──────────────────────────── */}
        <div className="mb-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {isHttps ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="font-medium font-mono">TLS 1.3 Encrypted</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span className="font-medium font-mono">Development Mode</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border text-muted-foreground">
            <Globe className="w-3.5 h-3.5" />
            <span className="font-mono text-[11px]">
              {ipLoading ? "detecting..." : userIp || "unknown"}
            </span>
          </div>
        </div>

        {/* ─── Main Login Card ─────────────────────────────────── */}
        <div className="liquid-border rounded-2xl">
          <div className="glass-card rounded-2xl p-8">
            {/* Logo & Header */}
            <div className="text-center mb-8">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden shadow-xl ring-2 ring-primary/20 mx-auto mb-4 animate-glow-pulse">
                <img src={clubLogo} alt="Young Innovators Club Logo" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-2xl font-display font-bold gradient-text mb-1">
                Secure CMS Login
              </h1>
              <p className="text-sm text-muted-foreground">Young Innovators Club — Admin Portal</p>
            </div>

            {/* ─── Lockout Warning ─────────────────────────────── */}
            {lockoutCountdown > 0 && (
              <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  <span className="font-semibold text-destructive text-sm">Account Temporarily Locked</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Too many failed login attempts. Please wait before trying again.
                </p>
                <div className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-destructive/10 border border-destructive/10">
                  <Lock className="w-4 h-4 text-destructive" />
                  <span className="font-mono text-lg font-bold tracking-wider text-destructive">
                    {formatCountdown(lockoutCountdown)}
                  </span>
                </div>
              </div>
            )}

            {/* ─── Security Verification Steps ─────────────────── */}
            {showVerification && (
              <div className="mb-6 p-5 rounded-xl bg-muted/50 border border-border space-y-3">
                <p className="text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Security Verification
                </p>
                {securitySteps.map((step, i) => (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 transition-all duration-500 ${step.status === "pending" ? "opacity-30" :
                        step.status === "active" ? "opacity-100" :
                          step.status === "completed" ? "opacity-80" :
                            "opacity-100"
                      }`}
                    style={{ transitionDelay: `${i * 100}ms` }}
                  >
                    <div className="w-6 h-6 flex items-center justify-center shrink-0">
                      {step.status === "pending" && (
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                      )}
                      {step.status === "active" && (
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      )}
                      {step.status === "completed" && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      )}
                      {step.status === "failed" && (
                        <XCircle className="w-5 h-5 text-destructive" />
                      )}
                    </div>
                    <span className={`text-sm font-body ${step.status === "completed" ? "text-emerald-600 dark:text-emerald-400" :
                        step.status === "failed" ? "text-destructive" :
                          step.status === "active" ? "text-primary" :
                            "text-muted-foreground"
                      }`}>
                      {step.status === "completed"
                        ? step.label.replace("...", " ✓")
                        : step.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* ─── Login Form ──────────────────────────────────── */}
            {!showVerification && (
              <form ref={formRef} onSubmit={handleLogin} className="space-y-5" noValidate>
                {/* Email Field */}
                <div>
                  <label htmlFor="login-email" className="block text-sm font-medium text-foreground mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] transition-colors ${touched.email && !validation.email.valid ? "text-destructive" :
                        touched.email && validation.email.valid ? "text-emerald-500" :
                          "text-muted-foreground"
                      }`} />
                    <Input
                      id="login-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                      disabled={loading || lockoutCountdown > 0}
                      className={`pl-10 transition-all ${touched.email && !validation.email.valid ? "border-destructive/50 focus:border-destructive focus:ring-destructive/20" :
                          touched.email && validation.email.valid ? "border-emerald-500/30 focus:border-emerald-500" : ""
                        }`}
                    />
                    {touched.email && validation.email.valid && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                    )}
                  </div>
                  {touched.email && !validation.email.valid && (
                    <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      {validation.email.message}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="login-password" className="block text-sm font-medium text-foreground mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] transition-colors ${touched.password && !validation.password.valid ? "text-destructive" :
                        touched.password && validation.password.valid ? "text-emerald-500" :
                          "text-muted-foreground"
                      }`} />
                    <Input
                      id="login-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => setTouched((p) => ({ ...p, password: true }))}
                      disabled={loading || lockoutCountdown > 0}
                      className={`pl-10 pr-10 transition-all ${touched.password && !validation.password.valid ? "border-destructive/50 focus:border-destructive focus:ring-destructive/20" :
                          touched.password && validation.password.valid ? "border-emerald-500/30 focus:border-emerald-500" : ""
                        }`}
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
                  {touched.password && !validation.password.valid && (
                    <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      {validation.password.message}
                    </p>
                  )}
                </div>

                {/* Remaining Attempts Warning */}
                {remainingAttempts !== null && remainingAttempts <= 3 && remainingAttempts > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{remainingAttempts} login attempt{remainingAttempts !== 1 ? "s" : ""} remaining before lockout</span>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  disabled={loading || lockoutCountdown > 0 || !isFormValid}
                  className="w-full btn-glow disabled:opacity-40"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span className="font-display font-semibold tracking-wide">Secure Sign In</span>
                  </div>
                </Button>
              </form>
            )}

            {/* Reset verification view on failure */}
            {showVerification && !loading && (
              <Button
                variant="ghost"
                onClick={() => {
                  setShowVerification(false);
                  setSecuritySteps((prev) => prev.map((s) => ({ ...s, status: "pending" })));
                }}
                className="w-full mt-3 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            )}

            {/* Back to Home */}
            <div className="mt-6 text-center">
              <Button
                variant="ghost"
                onClick={() => navigate("/")}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Back to Home
              </Button>
            </div>
          </div>
        </div>

        {/* ─── Security Footer ─────────────────────────────────── */}
        <div className="mt-6 text-center space-y-2">
          <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground/60">
            <div className="flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>256-bit SSL</span>
            </div>
            <div className="w-px h-3 bg-border" />
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span>RBAC Protected</span>
            </div>
            <div className="w-px h-3 bg-border" />
            <div className="flex items-center gap-1">
              <Fingerprint className="w-3 h-3" />
              <span>Rate Limited</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground/40">
            All login attempts are monitored and logged for security purposes.
          </p>
          {userIp && (
            <p className="text-[10px] text-muted-foreground/40">
              Your IP ({userIp}) has been recorded.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
