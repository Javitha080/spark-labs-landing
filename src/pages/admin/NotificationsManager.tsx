import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Send } from "lucide-react";
import { Loading } from "@/components/ui/loading";

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

const NotificationsManager = () => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [formData, setFormData] = useState({ subject: "", message: "", recipient: "all" });
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
    try {
      const targetEnrollments = formData.recipient === "all" 
        ? enrollments 
        : enrollments.filter(e => e.id === formData.recipient);

      const currentUser = await supabase.auth.getUser();

      // Send emails via edge function
      for (const enrollment of targetEnrollments) {
        await supabase.functions.invoke("send-enrollment-update", {
          body: {
            email: enrollment.email,
            name: enrollment.name,
            subject: formData.subject,
            message: formData.message
          }
        });

        // Log notification
        await supabase.from("enrollment_notifications").insert({
          enrollment_id: enrollment.id,
          subject: formData.subject,
          message: formData.message,
          sent_by: currentUser.data.user?.id
        });
      }

      toast({ 
        title: "Success", 
        description: `Notification sent to ${targetEnrollments.length} recipient(s)` 
      });
      setFormData({ subject: "", message: "", recipient: "all" });
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

      <Card>
        <CardHeader>
          <CardTitle>Send Notification</CardTitle>
          <CardDescription>Send updates to enrolled students</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
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
          <Input
            placeholder="Subject"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          />
          <Textarea
            placeholder="Message"
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            rows={6}
          />
          <Button onClick={handleSendNotification} disabled={sending} className="w-full">
            <Send className="h-4 w-4 mr-2" />
            {sending ? "Sending..." : "Send Notification"}
          </Button>
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
              {notifications.map((notification) => (
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsManager;