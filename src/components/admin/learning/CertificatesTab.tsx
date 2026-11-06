import { useCallback, useEffect, useMemo, useState } from "react";
import { Award, Search, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { logError } from "@/lib/errors";
import type { Course, LearningCertificate } from "@/types/learning";

type LearnerName = { id: string; full_name: string | null; email: string | null };

// Admin certificate ledger — read comes from the "Content admins can view all
// certificates" policy and revoke from the UPDATE policy (both in the
// 20261106 migration). Revocation writes revoked_at; the student view and the
// public /verify page turn invalid immediately.
const CertificatesTab = () => {
    const { toast } = useToast();
    const [certs, setCerts] = useState<LearningCertificate[]>([]);
    const [students, setStudents] = useState<Record<string, LearnerName>>({});
    const [courses, setCourses] = useState<Record<string, Course>>({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "valid" | "revoked">("all");
    const [revokeId, setRevokeId] = useState<string | null>(null);
    const [restoring, setRestoring] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            // Certificates are the base query; names/courses are batch-matched
            // client-side (two small lookups instead of FK joins on profiles).
            const [{ data: certData, error: certErr }, { data: studentRows }, { data: courseRows }] = await Promise.all([
                supabase.from("learning_certificates").select("*").order("issued_at", { ascending: false }).limit(500),
                supabase.from("profiles").select("id, full_name, email").limit(2000),
                supabase.from("learning_courses").select("id, title, slug").order("title"),
            ]);
            if (certErr) throw certErr;
            setCerts((certData as LearningCertificate[]) || []);
            setStudents(Object.fromEntries(((studentRows || []) as LearnerName[]).map(s => [s.id, s])));
            setCourses(Object.fromEntries(((courseRows || []) as Course[]).map(c => [c.id, c])));
        } catch (err: unknown) {
            logError(err, "CertificatesTab.fetch");
            toast({ title: "Couldn't load certificates", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { void fetchAll(); }, [fetchAll]);

    useRealtimeSync(["learning_certificates"], { onUpdate: () => void fetchAll(), debounceMs: 1000 });

    const learnerLabel = useCallback((uid: string | null) => {
        if (!uid) return "Unknown learner";
        const s = students[uid];
        return s?.full_name || s?.email || uid.slice(0, 8);
    }, [students]);

    const courseTitle = useCallback((cid: string) => courses[cid]?.title || "Course", [courses]);

    const filtered = useMemo(() => {
        return certs.filter(c => {
            if (statusFilter === "valid" && c.revoked_at) return false;
            if (statusFilter === "revoked" && !c.revoked_at) return false;
            if (!search.trim()) return true;
            const q = search.toLowerCase();
            return (
                c.certificate_code.toLowerCase().includes(q) ||
                learnerLabel(c.user_id).toLowerCase().includes(q) ||
                courseTitle(c.course_id).toLowerCase().includes(q)
            );
        });
    }, [certs, statusFilter, search, learnerLabel, courseTitle]);

    const validCount = certs.filter(c => !c.revoked_at).length;

    const revokeCertificate = async () => {
        if (!revokeId) return;
        const { error } = await supabase
            .from("learning_certificates")
            .update({ revoked_at: new Date().toISOString() })
            .eq("id", revokeId);
        if (error) {
            logError(error, "CertificatesTab.revoke");
            toast({ title: "Revoke failed", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Certificate revoked", description: "The student's certificate page and the public verify link now show it as invalid." });
            setCerts(prev => {
                const target = prev.find(c => c.id === revokeId);
                return prev.map(c => (c.id === revokeId && target ? { ...c, revoked_at: new Date().toISOString() } : c));
            });
        }
        setRevokeId(null);
        void fetchAll();
    };

    const reinstate = async (id: string) => {
        setRestoring(id);
        try {
            const { error } = await supabase
                .from("learning_certificates")
                .update({ revoked_at: null })
                .eq("id", id);
            if (error) throw error;
            toast({ title: "Certificate reinstated", description: "It is valid again everywhere." });
        } catch (err: unknown) {
            logError(err, "CertificatesTab.reinstate");
            toast({ title: "Restore failed", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
        } finally {
            setRestoring(null);
            void fetchAll();
        }
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Award className="size-4 text-amber-400" /> Certificates
                    </CardTitle>
                    <CardDescription>
                        {loading ? "Loading…" : `${certs.length} issued · ${validCount} valid`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <div className="relative flex-1 min-w-[220px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input
                                placeholder="Search learner, course, or certificate code…"
                                className="pl-10"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                            <SelectTrigger className="w-[140px]" aria-label="Filter by status">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="valid">Valid</SelectItem>
                                <SelectItem value="revoked">Revoked</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="border rounded-lg overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Learner</TableHead>
                                    <TableHead>Course</TableHead>
                                    <TableHead>Issued</TableHead>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                                            {loading ? "Loading…" : "No certificates match."}
                                        </TableCell>
                                    </TableRow>
                                )}
                                {filtered.map(c => (
                                    <TableRow key={c.id}>
                                        <TableCell className="font-medium">{learnerLabel(c.user_id)}</TableCell>
                                        <TableCell>
                                            <a
                                                href={`/learning-hub/course/${courses[c.course_id]?.slug || ""}`}
                                                className="text-primary hover:underline"
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                {courseTitle(c.course_id)}
                                            </a>
                                        </TableCell>
                                        <TableCell>{new Date(c.issued_at).toLocaleDateString()}</TableCell>
                                        <TableCell className="font-mono text-xs">{c.certificate_code}</TableCell>
                                        <TableCell>
                                            {c.revoked_at
                                                ? <Badge variant="destructive" className="text-[10px]">Revoked {new Date(c.revoked_at).toLocaleDateString()}</Badge>
                                                : <Badge className="bg-emerald-600 text-[10px] text-white">Valid</Badge>}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {c.revoked_at ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8"
                                                    disabled={restoring === c.id}
                                                    onClick={() => void reinstate(c.id)}
                                                >
                                                    <RotateCcw className="size-3.5 mr-1.5" /> Reinstate
                                                </Button>
                                            ) : (
                                                <Button variant="outline" size="sm" className="h-8 text-destructive hover:text-destructive" onClick={() => setRevokeId(c.id)}>
                                                    Revoke
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={!!revokeId} onOpenChange={(open) => !open && setRevokeId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Revoke this certificate?</AlertDialogTitle>
                        <AlertDialogDescription>
                            The student's certificate page degrades to a revoked notice and the public
                            verification link reports it as invalid. You can reinstate it later.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void revokeCertificate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Revoke
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default CertificatesTab;
