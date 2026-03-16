import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Send, CheckCircle, XCircle, RefreshCw, Info, Sparkles, Clock, Users, Search, FileText } from "lucide-react";
import { Loading } from "@/components/ui/loading";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface Enrollment {
  id: string;
  name: string;
  email: string;
  status: string;
}

interface Notification {
  id: string;
  subject: string;
  message: string;
  sent_at: string;
  enrollment_submissions: { name: string; email: string } | null;
}

interface SendResult {
  email: string;
  name: string;
  success: boolean;
  error?: string;
}

// Email templates
const emailTemplates = [
  {
    id: "welcome",
    name: "Welcome Message",
    icon: Sparkles,
    subject: "Welcome to Young Innovators Club! 🎉",
    message: `Dear {name},

Welcome to the Young Innovators Club! We're thrilled to have you join our community of aspiring innovators and engineers.

Your journey towards becoming a future STEM leader starts here. Here's what you can expect:
• Hands-on projects and workshops
• Mentorship from experienced professionals
• Opportunities to participate in competitions
• A supportive community of like-minded peers

Stay tuned for updates about our upcoming events and activities!

Best regards,
The Young Innovators Club Team`
  },
  {
    id: "reminder",
    name: "Event Reminder",
    icon: Clock,
    subject: "Reminder: Upcoming Event at Young Innovators Club",
    message: `Dear {name},

This is a friendly reminder about our upcoming event. We're looking forward to seeing you there!

Please make sure to:
• Arrive 10 minutes early
• Bring any required materials
• Come with an open mind and enthusiasm!

If you have any questions, feel free to reach out to us.

See you soon!
The Young Innovators Club Team`
  },
  {
    id: "update",
    name: "Status Update",
    icon: FileText,
    subject: "Application Status Update",
    message: `Dear {name},

We wanted to update you on the status of your application to the Young Innovators Club.

[Add your update here]

If you have any questions or concerns, please don't hesitate to reach out to us.

Best regards,
The Young Innovators Club Team`
  }
];

const NotificationsManager = () => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [formData, setFormData] = useState({ subject: "", message: "", recipient: "all" });
  const [sendResults, setSendResults] = useState<SendResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const fetchData = async () => {
    try {
      let query = supabase.from("enrollment_submissions").select("id, name, email, status");

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const [enrollmentsRes, notificationsRes] = await Promise.all([
        query,
        supabase
          .from("enrollment_notifications")
          .select("*, enrollment_submissions(name, email)")
          .order("sent_at", { ascending: false })
          .limit(50)
      ]);

      if (enrollmentsRes.error) throw enrollmentsRes.error;
      if (notificationsRes.error) throw notificationsRes.error;

      setEnrollments(enrollmentsRes.data || []);
      setNotifications(notificationsRes.data || []);
    } catch (error) {
      const err = error as Error;
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = (templateId: string) => {
    const template = emailTemplates.find(t => t.id === templateId);
    if (template) {
      setFormData({
        ...formData,
        subject: template.subject,
        message: template.message
      });
    }
  };

  const handleSendNotification = async () => {
    if (!formData.subject || !formData.message) {
      toast({ title: "Error", description: "Subject and message are required", variant: "destructive" });
      return;
    }

    setSending(true);
    setSendResults([]);
    setShowResults(false);

    const results: SendResult[] = [];

    try {
      const targetEnrollments = formData.recipient === "all"
        ? enrollments
        : enrollments.filter(e => e.id === formData.recipient);

      if (targetEnrollments.length === 0) {
        toast({ title: "Error", description: "No recipients selected", variant: "destructive" });
        setSending(false);
        return;
      }

      const currentUser = await supabase.auth.getUser();

      // Send emails via edge function with individual error handling
      for (const enrollment of targetEnrollments) {
        try {
          // Replace {name} placeholder in message
          const personalizedMessage = formData.message.replace(/\{name\}/g, enrollment.name);

          const { data, error } = await supabase.functions.invoke("send-enrollment-update", {
            body: {
              email: enrollment.email,
              name: enrollment.name,
              subject: formData.subject,
              message: personalizedMessage
            }
          });

          if (error) {
            console.error(`Failed to send to ${enrollment.email}:`, error);
            results.push({
              email: enrollment.email,
              name: enrollment.name,
              success: false,
              error: error.message || "Failed to send email"
            });
          } else if (data?.error) {
            results.push({
              email: enrollment.email,
              name: enrollment.name,
              success: false,
              error: data.error
            });
          } else {
            // Log notification only on success
            await supabase.from("enrollment_notifications").insert({
              enrollment_id: enrollment.id,
              subject: formData.subject,
              message: personalizedMessage,
              sent_by: currentUser.data.user?.id
            });
            results.push({ email: enrollment.email, name: enrollment.name, success: true });
          }
        } catch (error) {
          const err = error as Error;
          results.push({
            email: enrollment.email,
            name: enrollment.name,
            success: false,
            error: err.message || "Unknown error"
          });
        }
      }

      setSendResults(results);
      setShowResults(true);

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (successCount > 0 && failCount === 0) {
        toast({
          title: "Success",
          description: `All ${successCount} email(s) sent successfully!`
        });
        setFormData({ subject: "", message: "", recipient: "all" });
      } else if (successCount > 0 && failCount > 0) {
        toast({
          title: "Partial Success",
          description: `${successCount} sent, ${failCount} failed. Check results below.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Failed",
          description: "No emails were sent. Check results below.",
          variant: "destructive"
        });
      }

      fetchData();
    } catch (error) {
      const err = error as Error;
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  // Filter notifications by search
  const filteredNotifications = notifications.filter(n =>
    historySearch === "" ||
    n.subject.toLowerCase().includes(historySearch.toLowerCase()) ||
    n.enrollment_submissions?.name?.toLowerCase().includes(historySearch.toLowerCase()) ||
    n.enrollment_submissions?.email?.toLowerCase().includes(historySearch.toLowerCase())
  );

  if (loading) return <Loading size="lg" className="h-64" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/10">
              <Mail className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
            Email Notifications
          </h1>
          <p className="text-muted-foreground mt-1">Send updates to enrolled students</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Users className="h-3 w-3" />
            {enrollments.length} Recipients
          </Badge>
        </div>
      </div>

      {/* Cloudflare Email Configuration Notice */}
      <Alert className="border-primary/30 bg-gradient-to-r from-primary/5 to-secondary/5">
        <Info className="h-4 w-4" />
        <AlertTitle>Email Configuration</AlertTitle>
        <AlertDescription className="text-sm">
          Email service powered by{" "}
          <a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 transition-colors">
            Cloudflare Email Routing
          </a>.
          Make sure CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are configured in Supabase secrets.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Compose */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-primary/10">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Compose Email</CardTitle>
              <CardDescription>Create and send notifications to students</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick Templates */}
              <div>
                <label className="text-sm font-medium mb-2 block">Quick Templates</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {emailTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => applyTemplate(template.id)}
                      className="flex items-center gap-2 p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group text-left"
                    >
                      <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <template.icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium">{template.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Filter by Status</label>
                  <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Students</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Recipient</label>
                  <Select value={formData.recipient} onValueChange={(value) => setFormData({ ...formData, recipient: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select recipient" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All ({enrollments.length})</SelectItem>
                      {enrollments.map(e => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name} - {e.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="text-sm font-medium mb-2 block">Subject</label>
                <Input
                  placeholder="Enter email subject..."
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="border-primary/20 focus:border-primary"
                />
              </div>

              {/* Message */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Message</label>
                  <span className="text-xs text-muted-foreground">
                    Use {"{name}"} for personalization
                  </span>
                </div>
                <Textarea
                  placeholder="Write your message... Use {name} to personalize for each recipient."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={8}
                  className="border-primary/20 focus:border-primary resize-none"
                />
                <div className="flex justify-end mt-1">
                  <span className="text-xs text-muted-foreground">
                    {formData.message.length} characters
                  </span>
                </div>
              </div>

              {/* Send Button */}
              <Button
                onClick={handleSendNotification}
                disabled={sending || !formData.subject || !formData.message}
                className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg shadow-primary/25"
                size="lg"
              >
                {sending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Notification
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Send Results */}
          {showResults && sendResults.length > 0 && (
            <Card className="border-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  Send Results
                  <Badge variant="outline" className="ml-2">
                    {sendResults.filter(r => r.success).length}/{sendResults.length} Sent
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {sendResults.map((result, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-3 rounded-xl border ${result.success
                        ? 'border-green-500/20 bg-green-500/5'
                        : 'border-destructive/20 bg-destructive/5'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        {result.success ? (
                          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate">{result.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{result.email}</p>
                        </div>
                      </div>
                      {result.success ? (
                        <Badge variant="outline" className="text-green-600 border-green-600 flex-shrink-0">Sent</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs flex-shrink-0 max-w-[120px] truncate">
                          {result.error || "Failed"}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - History */}
        <div className="lg:col-span-1">
          <Card className="border-primary/10 h-fit lg:sticky lg:top-20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Recent History</CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search history..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {filteredNotifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No notifications found</p>
                  </div>
                ) : (
                  filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="p-3 rounded-xl border border-border hover:border-primary/20 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-medium text-sm line-clamp-1">{notification.subject}</p>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {notification.enrollment_submissions?.name || "N/A"}
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(notification.sent_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NotificationsManager;