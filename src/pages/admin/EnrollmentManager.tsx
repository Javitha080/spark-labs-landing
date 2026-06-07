// react-doctor-disable no-giant-component
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Eye, Filter, Users, UserCheck, UserX, Clock, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";

interface Enrollment {
  id: string;
  name: string;
  grade: string;
  email: string;
  phone: string;
  interest: string;
  reason: string;
  status: string;
  created_at: string;
}

const EnrollmentManager = () => {
  // react-doctor-disable no-derived-state
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [enrollmentToDelete, setEnrollmentToDelete] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { toast } = useToast();

    async function fetchEnrollments() {
    try {
      let query = supabase
        .from("enrollment_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setEnrollments(data || []);
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Error loading enrollments",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // react-doctor-disable no-derived-state
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEnrollments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useRealtimeSync(["enrollment_submissions"], { onUpdate: fetchEnrollments });

  const updateStatus = async (id: string, status: string) => {
    const enrollmentName = enrollments.find((e) => e.id === id)?.name;
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from("enrollment_submissions")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      setEnrollments((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status } : e))
      );

      toast({
        title: "Status updated",
        description: `${enrollmentName} is now ${status}`,
      });
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Error updating status",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteEnrollment = async (id: string) => {
    try {
      const { error } = await supabase
        .from("enrollment_submissions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setEnrollments((prev) => prev.filter((e) => e.id !== id));
      toast({ title: "Enrollment deleted" });
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Error deleting enrollment",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500";
      case "rejected":
        return "bg-red-500";
      case "pending":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const stats = {
    total: enrollments.length,
    pending: enrollments.filter((e) => e.status === "pending").length,
    approved: enrollments.filter((e) => e.status === "approved").length,
    rejected: enrollments.filter((e) => e.status === "rejected").length,
  };

  if (loading) {
    return <Loading size="lg" className="h-64" />;
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Enrollment Submissions</h1>
          <p className="text-muted-foreground mt-1">Review and manage student applications</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="size-4 shrink-0" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center"><Users className="size-5 text-primary" /></div>
            <div><div className="text-2xl font-bold">{stats.total}</div><p className="text-xs text-muted-foreground">Total</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-yellow-500/10 flex items-center justify-center"><Clock className="size-5 text-yellow-500" /></div>
            <div><div className="text-2xl font-bold">{stats.pending}</div><p className="text-xs text-muted-foreground">Pending</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-green-500/10 flex items-center justify-center"><UserCheck className="size-5 text-green-500" /></div>
            <div><div className="text-2xl font-bold">{stats.approved}</div><p className="text-xs text-muted-foreground">Approved</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-red-500/10 flex items-center justify-center"><UserX className="size-5 text-red-500" /></div>
            <div><div className="text-2xl font-bold">{stats.rejected}</div><p className="text-xs text-muted-foreground">Rejected</p></div>
          </CardContent>
        </Card>
      </div>

      {enrollments.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <Users className="size-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold mb-1">No enrollments found</h3>
          <p className="text-muted-foreground text-sm">
            {statusFilter !== "all" ? `No ${statusFilter} enrollments. Try a different filter.` : "Student applications will appear here."}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Grade</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Phone</TableHead>
                  <TableHead className="hidden md:table-cell">Interest</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell className="font-medium">{enrollment.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{enrollment.grade}</TableCell>
                    <TableCell className="hidden sm:table-cell truncate max-w-[150px]">{enrollment.email}</TableCell>
                    <TableCell className="hidden lg:table-cell">{enrollment.phone}</TableCell>
                    <TableCell className="hidden md:table-cell">{enrollment.interest}</TableCell>
                    <TableCell>
                      <Select
                        value={enrollment.status}
                        onValueChange={(value) => updateStatus(enrollment.id, value)}
                        disabled={updatingId === enrollment.id}
                      >
                        <SelectTrigger className="w-28 h-8">
                          {updatingId === enrollment.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Badge className={getStatusBadgeColor(enrollment.status)}>
                              {enrollment.status}
                            </Badge>
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {new Date(enrollment.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="size-8 p-0"
                          onClick={() => setSelectedEnrollment(enrollment)}
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="size-8 p-0"
                          onClick={() => setEnrollmentToDelete(enrollment.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Mobile card view */}
      <div className="sm:hidden space-y-3">
        {enrollments.map((enrollment) => (
          <Card key={enrollment.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{enrollment.name}</p>
                <p className="text-sm text-muted-foreground truncate">{enrollment.email}</p>
                <p className="text-xs text-muted-foreground">{enrollment.grade} · {enrollment.interest}</p>
              </div>
              <Badge className={getStatusBadgeColor(enrollment.status)}>{enrollment.status}</Badge>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <span className="text-xs text-muted-foreground">{new Date(enrollment.created_at).toLocaleDateString()}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="size-8 p-0" onClick={() => setSelectedEnrollment(enrollment)}>
                  <Eye className="size-4" />
                </Button>
                <Button variant="destructive" size="sm" className="size-8 p-0" onClick={() => setEnrollmentToDelete(enrollment.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedEnrollment} onOpenChange={() => setSelectedEnrollment(null)}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden flex flex-col max-h-[calc(100dvh-1rem)] sm:max-h-[90vh]">
          <DialogHeader className="px-6 py-4 border-b border-border/40 shrink-0">
            <DialogTitle>Enrollment Details</DialogTitle>
            <DialogDescription>
              Submitted on {selectedEnrollment && new Date(selectedEnrollment.created_at).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          {selectedEnrollment && (
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  {/* react-doctor-disable label-has-associated-control */}
                  <label className="font-semibold text-sm text-muted-foreground block mb-1">Name</label>
                  <p className="text-base font-medium">{selectedEnrollment.name}</p>
                </div>
                <div>
                  {/* react-doctor-disable label-has-associated-control */}
                  <label className="font-semibold text-sm text-muted-foreground block mb-1">Grade</label>
                  <p className="text-base font-medium">{selectedEnrollment.grade}</p>
                </div>
                <div>
                  {/* react-doctor-disable label-has-associated-control */}
                  <label className="font-semibold text-sm text-muted-foreground block mb-1">Email</label>
                  <p className="text-base font-medium break-all">{selectedEnrollment.email}</p>
                </div>
                <div>
                  {/* react-doctor-disable label-has-associated-control */}
                  <label className="font-semibold text-sm text-muted-foreground block mb-1">Phone</label>
                  <p className="text-base font-medium">{selectedEnrollment.phone}</p>
                </div>
                <div>
                  {/* react-doctor-disable label-has-associated-control */}
                  <label className="font-semibold text-sm text-muted-foreground block mb-1">Interest Area</label>
                  <p className="text-base font-medium">{selectedEnrollment.interest}</p>
                </div>
                <div>
                  {/* react-doctor-disable label-has-associated-control */}
                  <label className="font-semibold text-sm text-muted-foreground block mb-1">Status</label>
                  <div className="mt-1">
                    <Badge className={getStatusBadgeColor(selectedEnrollment.status)}>
                      {selectedEnrollment.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="pt-2">
                {/* react-doctor-disable label-has-associated-control */}
                <label className="font-semibold text-sm text-muted-foreground block mb-1">Reason for Joining</label>
                <p className="mt-1 p-4 bg-muted/40 border rounded-xl text-foreground text-sm leading-relaxed whitespace-pre-wrap">{selectedEnrollment.reason}</p>
              </div>
            </div>
          )}
          <DialogFooter className="px-6 py-4 border-t border-border/40 flex-row sm:justify-end gap-2 bg-muted/20 shrink-0">
            <Button variant="outline" onClick={() => setSelectedEnrollment(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!enrollmentToDelete} onOpenChange={(open) => !open && setEnrollmentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Enrollment?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The enrollment record will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (enrollmentToDelete) { deleteEnrollment(enrollmentToDelete); setEnrollmentToDelete(null); } }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EnrollmentManager;
