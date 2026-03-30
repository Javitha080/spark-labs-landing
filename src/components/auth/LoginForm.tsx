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
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden"
      style={{
        background: "radial-gradient(circle at 50% 50%, #f1f5fd 0%, #e2eaf6 50%, #cedcf1 100%)",
      }}
    >
      {/* ─── Premium Fluid Background Orbs (Under the liquid glass) ─── */}
      <div
        className="absolute top-1/4 left-1/4 w-[35rem] h-[35rem] rounded-full mix-blend-multiply opacity-60 animate-blob pointer-events-none"
        style={{
          background: "radial-gradient(circle, #93c5fd 0%, transparent 60%)",
          filter: "blur(60px)",
        }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-[40rem] h-[40rem] rounded-full mix-blend-multiply opacity-50 animate-blob pointer-events-none"
        style={{
          background: "radial-gradient(circle, #c4b5fd 0%, transparent 60%)",
          filter: "blur(70px)",
          animationDelay: "3s"
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[45rem] h-[45rem] rounded-full mix-blend-overlay opacity-50 animate-blob pointer-events-none"
        style={{
          background: "radial-gradient(circle, #fbcfe8 0%, transparent 60%)",
          filter: "blur(80px)",
          animationDelay: "5s"
        }}
      />

      {/* ─── LIQUID GLASS CONTAINER ──────────────────────── */}
      <div
        className="w-full max-w-sm sm:max-w-[440px] relative z-10 rounded-[2.5rem] p-8 md:p-10 transition-all duration-500 hover:shadow-2xl"
        style={{
          // Liquid Glass Core: Highly transparent gradient with low blur
          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.15) 100%)",
          backdropFilter: "blur(12px) saturate(140%)",
          WebkitBackdropFilter: "blur(12px) saturate(140%)",
          
          // Outer gel-like borders and inner reflective highlights
          border: "1px solid rgba(255, 255, 255, 0.5)",
          boxShadow: `
            0 30px 60px rgba(0, 0, 0, 0.08), 
            0 10px 20px rgba(0, 0, 0, 0.04),
            inset 0 1px 1px rgba(255, 255, 255, 0.9),
            inset 0 -1px 2px rgba(255, 255, 255, 0.3),
            inset 2px 0 2px rgba(255, 255, 255, 0.3),
            inset -2px 0 2px rgba(255, 255, 255, 0.2)
          `,
        }}
      >

        {/* ─── Liquid Gel Icon ────────────────────────────────────── */}
        <div className="flex justify-center mb-7">
          <div
            className="w-[4.8rem] h-[4.8rem] rounded-[1.4rem] flex items-center justify-center relative group"
            style={{
              background: "linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.4) 100%)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.8)",
              boxShadow: `
                0 15px 35px rgba(124, 58, 237, 0.2), 
                inset 0 2px 4px rgba(255, 255, 255, 1),
                inset 0 -2px 4px rgba(0, 0, 0, 0.05)
              `,
            }}
          >
            {/* Glossy inner reflex */}
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/70 to-transparent rounded-t-[1.3rem] opacity-80" />
            <img src={clubLogo} alt="Club Logo" className="w-[38px] h-[38px] relative z-10 transition-transform group-hover:scale-110 duration-500 drop-shadow-sm object-contain" />
          </div>
        </div>

        {/* ─── Title ──────────────────────────────────────────── */}
        <div className="text-center mb-8 relative z-20">
          <h1
            className="text-[1.85rem] font-bold tracking-tight mb-2 uppercase drop-shadow-sm"
            style={{ color: "#1e293b", fontFamily: "Inter, sans-serif" }}
          >
            SECURE CMS LOGIN
          </h1>
          <div className="flex items-center justify-center gap-2 text-[13px] font-medium" style={{ color: "#475569" }}>
            <Lock className="w-[14px] h-[14px]" />
            <span>End-to-end encrypted connection</span>
          </div>
        </div>

        {/* ─── Verification Steps ───────────────────────────── */}
        {showVerification && (
          <div
            className="mb-6 p-5 rounded-[1.25rem] space-y-3"
            style={{
              background: "rgba(255, 255, 255, 0.5)",
              border: "1px solid rgba(255, 255, 255, 0.7)",
              boxShadow: "inset 0 1px 2px rgba(255, 255, 255, 0.8), 0 4px 15px rgba(0, 0, 0, 0.03)",
            }}
          >
            <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "#6d28d9" }}>
              Security Verification
            </p>
            {securitySteps.map((step, i) => (
              <div
                key={step.id}
                className={`flex items-center gap-3 transition-opacity duration-500 ${step.status === "pending" ? "opacity-30" : "opacity-100"}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  {step.status === "pending" && <div className="w-2 h-2 rounded-full" style={{ background: "#94a3b8" }} />}
                  {step.status === "active" && <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#7c3aed" }} />}
                  {step.status === "completed" && <CheckCircle2 className="w-4 h-4" style={{ color: "#059669" }} />}
                  {step.status === "failed" && <XCircle className="w-4 h-4" style={{ color: "#dc2626" }} />}
                </div>
                <span className="text-[14px] font-medium" style={{
                  color: step.status === "completed" ? "#059669" : step.status === "failed" ? "#dc2626" : step.status === "active" ? "#7c3aed" : "#334155",
                }}>
                  {step.status === "completed" ? step.label.replace("...", " ✓") : step.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ─── Login Form ────────────────────────────────────────── */}
        {!showVerification && (
          <form ref={formRef} onSubmit={handleLogin} className="space-y-6" noValidate>
            {/* Email */}
            <div className="group/field relative z-20">
              <label htmlFor="login-email" className="block text-[11px] font-extrabold uppercase tracking-wider mb-2 ml-[2px]" style={{ color: "#334155", textShadow: "0 1px 1px rgba(255, 255, 255, 0.8)" }}>
                AUTHORIZED EMAIL
              </label>
              <div className="relative">
                <Mail className="absolute left-[1.125rem] top-1/2 -translate-y-1/2 w-[18px] h-[18px] transition-colors group-focus-within/field:text-purple-600 z-10" style={{ color: "#64748b" }} />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@yicdvp.edu.lk"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                  disabled={loading || lockoutCountdown > 0}
                  className="w-full pl-[3.25rem] pr-4 py-[14px] rounded-[1.2rem] text-[15px] font-medium transition-all outline-none placeholder:text-slate-400"
                  style={{
                    // Inset shadow liquid inputs
                    background: "rgba(255, 255, 255, 0.35)",
                    border: touched.email && !validation.email.valid
                      ? "1px solid rgba(239, 68, 68, 0.6)"
                      : "1px solid rgba(255, 255, 255, 0.6)",
                    color: "#0f172a",
                    boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.04), 0 1px 1px rgba(255, 255, 255, 0.8)",
                    fontFamily: "Inter, sans-serif",
                  }}
                  onFocus={(e) => {
                    if (!touched.email || validation.email.valid) {
                      e.target.style.background = "rgba(255, 255, 255, 0.6)";
                      e.target.style.borderColor = "rgba(139, 92, 246, 0.4)";
                      e.target.style.boxShadow = "inset 0 1px 2px rgba(139, 92, 246, 0.05), 0 0 0 3px rgba(139, 92, 246, 0.1), 0 1px 1px rgba(255, 255, 255, 0.8)";
                    }
                  }}
                  onBlurCapture={(e) => {
                    if (!touched.email || validation.email.valid) {
                      e.target.style.background = "rgba(255, 255, 255, 0.35)";
                      e.target.style.borderColor = "rgba(255, 255, 255, 0.6)";
                      e.target.style.boxShadow = "inset 0 2px 4px rgba(0, 0, 0, 0.04), 0 1px 1px rgba(255, 255, 255, 0.8)";
                    }
                  }}
                />
                {touched.email && validation.email.valid && (
                  <CheckCircle2 className="absolute right-[1.125rem] top-1/2 -translate-y-1/2 w-[18px] h-[18px] z-10" style={{ color: "#059669" }} />
                )}
              </div>
              {touched.email && !validation.email.valid && (
                <p className="mt-1.5 ml-1 text-[12px] font-medium flex items-center gap-1 drop-shadow-[0_1px_1px_rgba(255,255,255,1)]" style={{ color: "#dc2626" }}>
                  <XCircle className="w-3.5 h-3.5" /> {validation.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="group/field relative z-20">
              <label htmlFor="login-password" className="block text-[11px] font-extrabold uppercase tracking-wider mb-2 ml-[2px]" style={{ color: "#334155", textShadow: "0 1px 1px rgba(255, 255, 255, 0.8)" }}>
                SECURITY KEY / PASSWORD
              </label>
              <div className="relative">
                <Fingerprint className="absolute left-[1.125rem] top-1/2 -translate-y-1/2 w-[18px] h-[18px] transition-colors group-focus-within/field:text-purple-600 z-10" style={{ color: "#64748b" }} />
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, password: true }))}
                  disabled={loading || lockoutCountdown > 0}
                  className="w-full pl-[3.25rem] pr-12 py-[14px] rounded-[1.2rem] text-[15px] font-medium transition-all outline-none placeholder:text-slate-400"
                  style={{
                    background: "rgba(255, 255, 255, 0.35)",
                    border: touched.password && !validation.password.valid
                      ? "1px solid rgba(239, 68, 68, 0.6)"
                      : "1px solid rgba(255, 255, 255, 0.6)",
                    color: "#0f172a",
                    boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.04), 0 1px 1px rgba(255, 255, 255, 0.8)",
                    fontFamily: "Inter, sans-serif",
                    letterSpacing: !showPassword && password ? "0.15em" : "normal",
                  }}
                  onFocus={(e) => {
                    if (!touched.password || validation.password.valid) {
                      e.target.style.background = "rgba(255, 255, 255, 0.6)";
                      e.target.style.borderColor = "rgba(139, 92, 246, 0.4)";
                      e.target.style.boxShadow = "inset 0 1px 2px rgba(139, 92, 246, 0.05), 0 0 0 3px rgba(139, 92, 246, 0.1), 0 1px 1px rgba(255, 255, 255, 0.8)";
                    }
                  }}
                  onBlurCapture={(e) => {
                    if (!touched.password || validation.password.valid) {
                      e.target.style.background = "rgba(255, 255, 255, 0.35)";
                      e.target.style.borderColor = "rgba(255, 255, 255, 0.6)";
                      e.target.style.boxShadow = "inset 0 2px 4px rgba(0, 0, 0, 0.04), 0 1px 1px rgba(255, 255, 255, 0.8)";
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-[1.125rem] top-1/2 -translate-y-1/2 transition-colors hover:opacity-80 p-1 z-10 hover:text-purple-600"
                  style={{ color: "#64748b" }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
              {touched.password && !validation.password.valid && (
                <p className="mt-1.5 ml-1 text-[12px] font-medium flex items-center gap-1 drop-shadow-[0_1px_1px_rgba(255,255,255,1)]" style={{ color: "#dc2626" }}>
                  <XCircle className="w-3.5 h-3.5" /> {validation.password.message}
                </p>
              )}
            </div>

            {/* Remaining Attempts */}
            {remainingAttempts !== null && remainingAttempts <= 3 && remainingAttempts > 0 && (
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-[1rem] text-xs font-semibold relative z-20"
                style={{
                  background: "rgba(253, 230, 138, 0.7)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(251, 191, 36, 0.6)",
                  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.5)",
                  color: "#92400e"
                }}
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{remainingAttempts} fail attempt{remainingAttempts !== 1 ? "s" : ""} left before lockout</span>
              </div>
            )}

            {/* Premium Submit Button */}
            <button
              type="submit"
              disabled={loading || lockoutCountdown > 0 || !isFormValid}
              className={`w-full py-4 rounded-[1.2rem] font-extrabold text-[15px] flex items-center justify-center gap-2 transition-all duration-500 active:scale-[0.98] group relative overflow-hidden z-20 ${
                isFormValid && !loading && lockoutCountdown === 0
                  ? "text-[#1e293b] hover:-translate-y-1 hover:shadow-2xl"
                  : "text-slate-500 cursor-not-allowed drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]"
              }`}
              style={{
                // Flat Clear Liquid Glass Effect
                background: isFormValid && !loading && lockoutCountdown === 0
                  ? "linear-gradient(135deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.15) 100%)"
                  : "linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.1) 100%)",
                boxShadow: isFormValid && !loading && lockoutCountdown === 0
                  ? "0 15px 35px rgba(0, 0, 0, 0.05), inset 0 1px 1px rgba(255, 255, 255, 0.9), inset 0 -2px 6px rgba(0, 0, 0, 0.05), inset 2px 0 3px rgba(255, 255, 255, 0.4)"
                  : "inset 0 1px 1px rgba(255, 255, 255, 0.9), 0 4px 15px rgba(0,0,0,0.03)",
                border: "1px solid rgba(255, 255, 255, 0.8)",
                backdropFilter: "blur(16px) saturate(180%)",
                WebkitBackdropFilter: "blur(16px) saturate(180%)",
                fontFamily: "Inter, sans-serif",
                letterSpacing: "0.03em",
                textShadow: isFormValid && !loading && lockoutCountdown === 0 ? "0 1px 1px rgba(255, 255, 255, 0.8)" : "none"
              }}
            >
              {isFormValid && !loading && lockoutCountdown === 0 && (
                <>
                  {/* Glossy top highlight */}
                  <div className="absolute top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-white/20 to-transparent rounded-t-[1.1rem] pointer-events-none" />
                  {/* Hover brightness */}
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300 pointer-events-none" />
                </>
              )}
              
              <div className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <Loader2 className="w-[18px] h-[18px] animate-spin text-[#1e293b]" />
                    <span className="text-[#1e293b]">Processing Secure Login...</span>
                  </>
                ) : (
                  <>
                    <Lock className={`w-[18px] h-[18px] ${!isFormValid || lockoutCountdown > 0 ? "text-slate-400" : ""}`} />
                    <span>{lockoutCountdown > 0 ? "Account Locked" : "Authenticate & Access"}</span>
                  </>
                )}
              </div>
            </button>
          </form>
        )}

        {/* Back button after verification */}
        {showVerification && !loading && (
          <button
            onClick={() => { setShowVerification(false); setSecuritySteps((p) => p.map((s) => ({ ...s, status: "pending" }))); }}
            className="w-full mt-5 py-3.5 rounded-[1.2rem] text-[15px] font-bold flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
            style={{
              color: "#6d28d9",
              background: "linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(255,255,255,0.6))",
              boxShadow: "0 8px 20px rgba(0,0,0,0.06), inset 0 1px 1px rgba(255,255,255,1)",
              border: "1px solid rgba(255, 255, 255, 0.9)",
            }}
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        )}

        {/* Restricted Area Warning Liquid Block */}
        <div
          className="mt-8 p-4 rounded-[1.25rem] relative z-20"
          style={{
            background: "linear-gradient(135deg, rgba(254, 226, 226, 0.7) 0%, rgba(254, 226, 226, 0.3) 100%)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(252, 165, 165, 0.6)",
            boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.6), 0 4px 15px rgba(220, 38, 38, 0.05)",
          }}
        >
          <p className="text-[13px] leading-relaxed" style={{ color: "#7f1d1d" }}>
            <AlertTriangle className="w-[15px] h-[15px] inline-block mr-1.5 -mt-0.5" style={{ color: "#dc2626" }} />
            <strong className="font-bold text-[#991b1b]">Restricted Area.</strong> Unauthorized access is strictly prohibited. All authentication attempts are logged and monitored.
          </p>
        </div>

        {/* Footer: IP & TLS */}
        <div className="mt-7 flex items-center justify-between text-[11px] font-bold uppercase tracking-widest relative z-20" style={{ color: "#475569", textShadow: "0 1px 1px rgba(255, 255, 255, 0.8)" }}>
          <span>
            IP: {ipLoading ? "DETECTING..." : userIp || "HIDDEN"}
          </span>
          <span className="flex items-center gap-1.5">
            {isHttps ? (
              <><ShieldCheck className="w-[14px] h-[14px]" style={{ color: "#059669" }} /> TLS 1.3 SECURED</>
            ) : (
              <>DEVELOPMENT MODE</>
            )}
          </span>
        </div>
      </div>

      {/* ─── Return to Public Site (Liquid Gel Button) ──────────────────────────── */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
        <button
          onClick={() => navigate("/")}
          className="px-6 py-3.5 rounded-full text-[13px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl active:scale-[0.98] group relative overflow-hidden"
          style={{
            background: "linear-gradient(to bottom, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.2))",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.6)",
            boxShadow: "0 15px 35px rgba(0, 0, 0, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.9), inset 0 -1px 2px rgba(255, 255, 255, 0.2)",
            color: "#334155",
            textShadow: "0 1px 1px rgba(255, 255, 255, 0.9)",
          }}
        >
          {/* Top gloss highlight */}
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/60 to-transparent rounded-t-full pointer-events-none" />
          
          <ArrowLeft className="w-4 h-4 relative z-10 transition-transform group-hover:-translate-x-1" style={{ color: "#475569" }} />
          <span className="relative z-10">Return to Public Site</span>
        </button>
      </div>
    </div>
  );
};

export default LoginForm;
