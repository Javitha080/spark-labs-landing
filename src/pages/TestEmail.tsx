import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";

export default function TestEmail() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [result, setResult] = useState<{ message?: string; error?: string; details?: string } | null>(null);

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) return;

    setStatus("sending");
    setResult(null);

    try {
      const response = await fetch("/api/test/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus("success");
        setResult({
          message: data.message || "Email sent successfully!",
          details: data.messageId ? `Message ID: ${data.messageId}` : undefined,
        });
      } else {
        setStatus("error");
        setResult({ error: data.error || `HTTP ${response.status}` });
      }
    } catch (err) {
      setStatus("error");
      setResult({ error: err instanceof Error ? err.message : "Network error" });
    }
  };

  return (
    <>
      <SEOHead
        title="Email Test | SPARK Labs"
        description="Test email delivery system"
        path="/test-email"
        noindex
      />
      <Header />
      <main className="min-h-screen bg-background pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-lg">
          <Card className="border-primary/20 shadow-xl">
            <CardHeader className="text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Mail className="w-7 h-7 text-primary" />
              </div>
              <CardTitle className="text-2xl font-black">Email Delivery Test</CardTitle>
              <CardDescription>
                Test the Lettermint email system. This will send a sample "Student Welcome" email to the address you enter.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendTest} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Your Name</label>
                  <Input
                    id="test-email-name"
                    type="text"
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={status === "sending"}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Email Address</label>
                  <Input
                    id="test-email-address"
                    type="email"
                    placeholder="e.g. test@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={status === "sending"}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    A test welcome email will be sent to this address via Lettermint.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full font-bold gap-2"
                  size="lg"
                  disabled={status === "sending" || !email || !name}
                >
                  {status === "sending" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Test Email
                    </>
                  )}
                </Button>
              </form>

              {/* Result Display */}
              {result && (
                <div className={`mt-6 p-4 rounded-lg border ${
                  status === "success"
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : "bg-destructive/10 border-destructive/30"
                }`}>
                  <div className="flex items-start gap-3">
                    {status === "success" ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <p className={`font-semibold text-sm ${
                        status === "success" ? "text-emerald-500" : "text-destructive"
                      }`}>
                        {status === "success" ? "Email Sent!" : "Failed to Send"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {result.message || result.error}
                      </p>
                      {result.details && (
                        <p className="text-xs text-muted-foreground font-mono">{result.details}</p>
                      )}
                      {status === "success" && (
                        <p className="text-xs text-muted-foreground mt-2">
                          📬 Check your inbox (and spam folder) at <strong>{email}</strong>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* What this tests */}
              <div className="mt-6 pt-6 border-t space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  What this test verifies:
                </h3>
                <ul className="text-xs text-muted-foreground space-y-1.5">
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">1</Badge>
                    Lettermint API key is configured correctly
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">2</Badge>
                    Email delivery from noreply@dvpyic.dpdns.org works
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">3</Badge>
                    HTML email template renders correctly
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">4</Badge>
                    Student Welcome email format is correct (used for portal accounts)
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}
