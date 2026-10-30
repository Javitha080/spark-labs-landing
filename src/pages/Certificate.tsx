import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useStudentAuth } from "@/context/StudentAuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Course, LearningCertificate } from "@/types/learning";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Award, ArrowLeft, Printer, ShieldCheck } from "lucide-react";
import { Loading } from "@/components/common/loading";
import SEOHead from "@/components/SEOHead";
import { sanitizeUUID } from "@/lib/sanitize";
import { logError } from "@/lib/errors";

type Status = "loading" | "not-enrolled" | "not-complete" | "cert-disabled" | "ready" | "error";

// Print isolation: only the certificate itself lands on paper/PDF.
const PRINT_STYLES = `
@media print {
  body * { visibility: hidden !important; }
  .certificate-sheet, .certificate-sheet * { visibility: visible !important; }
  .certificate-sheet {
    position: fixed !important;
    inset: 0 !important;
    margin: auto !important;
    width: 100% !important;
    max-width: 100% !important;
    box-shadow: none !important;
  }
}
`;

export default function Certificate() {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const { student } = useStudentAuth();
    const [status, setStatus] = useState<Status>("loading");
    const [course, setCourse] = useState<Course | null>(null);
    const [certificate, setCertificate] = useState<LearningCertificate | null>(null);
    const [progressPct, setProgressPct] = useState(0);

    const issue = useCallback(async (c: Course) => {
        const id = c.id;
        if (!student) return;
        try {
            // Upsert is idempotent (UNIQUE(user_id, course_id)): the first visit
            // mints the certificate, later visits return the same one. The INSERT
            // policy additionally requires progress >= 100, so the client cannot
            // mint a certificate for an unfinished course.
            const { data, error } = await supabase
                .from("learning_certificates")
                .upsert({ user_id: student.authUserId, course_id: id }, { onConflict: "user_id,course_id" })
                .select()
                .maybeSingle();
            if (error) throw error;
            if (data) {
                setCertificate(data);
                setStatus("ready");
            } else {
                logError(new Error("certificate upsert returned no row"), "Certificate.issue");
                setStatus("error");
            }
        } catch (err) {
            logError(err, "Certificate.issue");
            setStatus("error");
        }
    }, [student]);

    useEffect(() => {
        const load = async () => {
            if (!courseId || !sanitizeUUID(courseId)) {
                navigate("/learning-hub/my-learning");
                return;
            }
            try {
                const { data: courseData, error: courseErr } = await supabase
                    .from("learning_courses")
                    .select("*")
                    .eq("id", courseId)
                    .single();
                if (courseErr) throw courseErr;
                const c = courseData as Course;
                setCourse(c);

                const { data: enrollRow } = await supabase
                    .from("learning_enrollments")
                    .select("progress")
                    .eq("course_id", courseId)
                    .maybeSingle();

                if (!enrollRow) {
                    // Not enrolled — bounce to the public course page so the
                    // visitor can enroll there (no certificate without progress).
                    navigate(`/learning-hub/course/${c.slug}`);
                    return;
                }
                setProgressPct(enrollRow.progress || 0);
                if (enrollRow.progress < 100) {
                    setStatus("not-complete");
                    return;
                }
                if (c.certificate_enabled === false) {
                    setStatus("cert-disabled");
                    return;
                }
                await issue(c);
            } catch (err) {
                logError(err, "Certificate.load");
                setStatus("error");
            }
        };
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [courseId]);

    const issued = certificate ? new Date(certificate.issued_at) : null;
    const verifyUrl = `${window.location.origin}/learning-hub/certificate/${courseId}`;

    if (status === "loading") {
        return <div className="min-h-screen flex items-center justify-center bg-zinc-950"><Loading /></div>;
    }

    if (status !== "ready" || !course) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 p-4">
                <SEOHead
                    title="Certificate | Young Innovators Club"
                    description="Your course completion certificate status."
                    path={`/learning-hub/certificate/${courseId}`}
                    noindex
                />
                <style>{PRINT_STYLES}</style>
                <div className="max-w-md w-full rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center space-y-5">
                    <Award className="size-12 mx-auto text-amber-400" />
                    {status === "not-complete" && (
                        <>
                            <h1 className="text-xl font-bold">Not there yet!</h1>
                            <p className="text-sm text-zinc-400">
                                You've finished <span className="text-zinc-200">{progressPct}%</span> of this course.
                                Complete all modules to unlock your certificate.
                            </p>
                            <Progress value={progressPct} className="h-2" />
                            <Button className="w-full bg-primary hover:bg-primary/90" onClick={() => navigate(`/learning-hub/classroom/${courseId}`)}>
                                Back to Classroom
                            </Button>
                        </>
                    )}
                    {status === "cert-disabled" && (
                        <>
                            <h1 className="text-xl font-bold">No certificate for this course</h1>
                            <p className="text-sm text-zinc-400">This course doesn't issue certificates of completion.</p>
                            <Button variant="outline" className="w-full border-zinc-700" onClick={() => navigate("/learning-hub/my-learning")}>
                                Back to My Learning
                            </Button>
                        </>
                    )}
                    {status === "error" && (
                        <>
                            <h1 className="text-xl font-bold">Couldn't load your certificate</h1>
                            <p className="text-sm text-zinc-400">Something went wrong. Try again in a moment.</p>
                            <Button variant="outline" className="w-full border-zinc-700" onClick={() => navigate("/learning-hub/my-learning")}>
                                Back to My Learning
                            </Button>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100">
            <SEOHead
                title={`Certificate - ${course.title} | Young Innovators Club`}
                description={`Certificate of completion for ${course.title}.`}
                path={`/learning-hub/certificate/${courseId}`}
                noindex
            />
            <style>{PRINT_STYLES}</style>
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between gap-3 mb-6 print:hidden">
                    <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white" onClick={() => navigate("/learning-hub/my-learning")}>
                        <ArrowLeft className="size-4 mr-2" /> My Learning
                    </Button>
                    <Button size="sm" onClick={() => window.print()}>
                        <Printer className="size-4 mr-2" /> Print / Save as PDF
                    </Button>
                </div>

                {/* Certificate sheet */}
                <div className="certificate-sheet relative mx-auto max-w-3xl bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
                    {/* Corner accents */}
                    <div className="absolute inset-0 border-[6px] border-transparent rounded-xl pointer-events-none" style={{
                        borderImage: "linear-gradient(135deg, #f59e0b, #7c3aed, #f59e0b) 1",
                        borderRadius: "12px",
                        opacity: 0.35,
                    }} />
                    <div className="px-8 py-12 space-y-10 text-center">
                        <div className="space-y-2">
                            <p className="text-xs tracking-[0.3em] uppercase text-zinc-500">Young Innovators Club</p>
                            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-purple-400">
                                Certificate of Completion
                            </h1>
                        </div>

                        <p className="text-sm text-zinc-400">This certifies that</p>
                        <p className="text-3xl md:text-4xl font-bold text-white">{student?.name || "Student"}</p>

                        <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
                            has successfully completed all modules of the
                        </p>
                        <div className="space-y-1">
                            <p className="text-2xl md:text-3xl font-semibold text-amber-300">{course.title}</p>
                            <p className="text-xs text-zinc-500 uppercase tracking-widest">
                                {course.category || "Learning"}{course.level ? ` · ${course.level}` : ""}
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 pt-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 justify-center text-amber-400">
                                    <Award className="size-5" />
                                    <span className="text-xs uppercase tracking-widest">Earned</span>
                                </div>
                                <p className="text-sm text-zinc-300">{issued ? issued.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : null}</p>
                            </div>
                            <div className="hidden sm:block h-10 w-px bg-zinc-700" />
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 justify-center text-purple-400">
                                    <ShieldCheck className="size-5" />
                                    <span className="text-xs uppercase tracking-widest">Certificate ID</span>
                                </div>
                                <p className="text-sm font-mono text-zinc-300">{certificate?.certificate_code}</p>
                            </div>
                        </div>

                        <p className="text-[10px] text-zinc-600 max-w-lg mx-auto leading-relaxed">
                            Verify this certificate at <span className="text-zinc-500 font-mono">{verifyUrl}</span> · Issued by the
                            Young Innovators Club learning platform on completion of all published course modules.
                        </p>
                    </div>
                </div>

                <div className="mt-6 flex justify-center gap-3 print:hidden">
                    <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800" onClick={() => navigate(`/learning-hub/classroom/${courseId}`)}>
                        Back to Classroom
                    </Button>
                    <Button onClick={() => window.print()}>
                        <Printer className="size-4 mr-2" /> Print / Save as PDF
                    </Button>
                </div>
            </div>
        </div>
    );
}
