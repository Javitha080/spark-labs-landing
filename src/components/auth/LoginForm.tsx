import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Lock, Mail, Loader2 } from "lucide-react";
import { CMS_ACCESS_ROLES, AppRole } from "@/contexts/RoleContext";
import clubLogo from "@/assets/club-logo.png";

const LoginForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check rate limit before attempting login
      const { data: rateLimitData, error: rateLimitError } = await supabase
        .rpc('check_login_rate_limit', { p_email: email });

      if (rateLimitError) {
        console.error('Rate limit check error:', rateLimitError);
        // Fail securely: if we can't check rate limit, we shouldn't allow login
        toast({
          title: "Service Unavailable",
          description: "Login service is currently unavailable. Please try again later.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (rateLimitData === false) {
        toast({
          title: "Too Many Attempts",
          description: "Your account has been temporarily locked due to multiple failed login attempts. Please try again in 15 minutes.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Log the attempt (fire and forget - don't block login)
      try {
        await supabase.from('login_attempts').insert({
          email,
          success: !error,
          attempted_at: new Date().toISOString()
        });
      } catch (logError) {
        // Non-critical: Log failure shouldn't break login
        console.error('Failed to log login attempt:', logError);
      }

      if (error) throw error;

      if (data.user) {
        // Check if user has ANY CMS access role (not just admin)
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (roleError) {
          console.error('Role check error:', roleError);
        }

        // Check if user has a valid CMS role
        const userRole = roleData?.role as AppRole;

        if (!userRole) {
          // No role assigned - show friendly message
          await supabase.auth.signOut();
          toast({
            title: "Pending Role Assignment",
            description: "Your account is pending role assignment. Please contact an administrator.",
            variant: "destructive",
          });
          return;
        }

        if (!CMS_ACCESS_ROLES.includes(userRole)) {
          // User has a role but it's not a CMS access role
          await supabase.auth.signOut();
          toast({
            title: "Access Denied",
            description: "Your role does not have CMS access privileges.",
            variant: "destructive",
          });
          return;
        }

        // Success! User has a valid CMS role
        toast({
          title: "Welcome back!",
          description: `Logged in as ${userRole.charAt(0).toUpperCase() + userRole.slice(1).replace(/_/g, ' ')}.`,
        });
        navigate("/admin/events");
      }
    } catch (error) {
      // Handle Supabase auth errors with user-friendly messages
      let message = "Invalid email or password. Please try again.";

      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        if (errorMsg.includes("email not confirmed")) {
          message = "Please confirm your email address before logging in.";
        } else if (errorMsg.includes("rate limit") || errorMsg.includes("too many requests")) {
          message = "Too many login attempts. Please try again later.";
        }
        // Purposely defaulting to "Invalid email or password" for "user not found", "invalid credentials"
        // etc. to prevent user enumeration attacks.
      }

      toast({
        title: "Login Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20 px-4">
      <div className="w-full max-w-md">
        <div className="glass-card p-8 rounded-2xl">
          <div className="text-center mb-8">
            <div className="relative w-16 h-16 rounded-xl overflow-hidden shadow-xl ring-2 ring-primary/20 mx-auto mb-4">
              <img
                src={clubLogo}
                alt="Young Innovators Club Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-3xl font-bold gradient-text mb-2">CMS Login</h1>
            <p className="text-muted-foreground">Young Innovators Club</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground text-center">
              CMS access requires an assigned role.
              <br />
              <span className="font-medium">Roles: Admin, Editor, Content Creator, Coordinator</span>
            </p>
          </div>

          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="text-sm"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
