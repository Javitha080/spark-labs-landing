import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Send, AlertCircle, CheckCircle, XCircle, RefreshCw, Info } from "lucide-react";
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

const NotificationsManager = () => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [formData, setFormData] = useState({ subject: "", message: "", recipient: "all" });
  const [sendResults, setSendResults] = useState<SendResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
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
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
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
          const { data, error } = await supabase.functions.invoke("send-enrollment-update", {
            body: {
              email: enrollment.email,
              name: enrollment.name,
              subject: formData.subject,
              message: formData.message
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
              message: formData.message,
              sent_by: currentUser.data.user?.id
            });
            results.push({ email: enrollment.email, name: enrollment.name, success: true });
          }
        } catch (err: any) {
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
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  if (loading) return <Loading size="lg" className="h-64" />;

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <Mail className="h-8 w-8" />
        Email Notifications
      </h1>

      {/* Resend Domain Setup Notice */}
      <Alert className="border-primary/30 bg-primary/5">
        <Info className="h-4 w-4" />
        <AlertTitle>Email Configuration</AlertTitle>
        <AlertDescription>
          To send emails to external recipients, you need a verified domain on{" "}
          <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="text-primary underline">
            Resend.com
          </a>. Without a verified domain, emails can only be sent to the account owner's email address.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Send Notification</CardTitle>
          <CardDescription>Send updates to enrolled students</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={formData.recipient} onValueChange={(value) => setFormData({ ...formData, recipient: value })}>
              <SelectTrigger className="flex-1 min-w-[200px]">
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
          <Input
            placeholder="Subject"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          />
          <Textarea
            placeholder="Message (supports basic HTML formatting)"
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            rows={6}
          />
          <Button onClick={handleSendNotification} disabled={sending} className="w-full">
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

          {/* Send Results */}
          {showResults && sendResults.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="font-medium text-sm">Send Results:</h4>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {sendResults.map((result, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                      <span className="text-sm">{result.name}</span>
                      <span className="text-xs text-muted-foreground">({result.email})</span>
                    </div>
                    {result.success ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">Sent</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">{result.error || "Failed"}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification History</CardTitle>
          <CardDescription>Recent sent notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Sent At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No notifications sent yet
                  </TableCell>
                </TableRow>
              ) : (
                notifications.map((notification) => (
                  <TableRow key={notification.id}>
                    <TableCell>
                      {notification.enrollment_submissions?.name || "N/A"}<br />
                      <span className="text-sm text-muted-foreground">
                        {notification.enrollment_submissions?.email || "N/A"}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{notification.subject}</TableCell>
                    <TableCell className="max-w-xs truncate">{notification.message}</TableCell>
                    <TableCell>{new Date(notification.sent_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsManager;