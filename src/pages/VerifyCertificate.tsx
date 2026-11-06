import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { CertificateVerification } from "@/types/learning";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    AlertCircle,
    Award,
    BadgeCheck,
    CalendarDays,
    SearchX,
    ShieldX,
} from "lucide-react";
import { logError } from "@/lib/errors";

type Result =
    | { status: "found"; certificate: CertificateVerification }
    | { status: "revoked"; certificate: CertificateVerification }
    | { status: "not-found" }
    | { status: "error" };

type Status = "idle" | "checking" | Result["status"];

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
};

function formatIssued(iso: string | null): string | null {
    if (!iso) return null;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString(undefined, DATE_FORMAT);
}

function CertificateResult({ result }: { result: Result }) {
    if (result.status === "not-found") {
        return (
            <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-3">
                <SearchX className="size-10 mx-auto text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">No certificate matches that ID</h2>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Check the ID against the printed certificate — it is case-insensitive, but every
                    character matters. Certificates are only issued once a course is complete.
                </p>
            </div>
        );
    }

    if (result.status === "error") {
        return (
            <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-3">
                <AlertCircle className="size-10 mx-auto text-destructive" />
                <h2 className="text-lg font-semibold text-foreground">Couldn't reach the registry</h2>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    The lookup failed before it could answer. This is usually temporary — try again in a
                    moment.
                </p>
            </div>
        );
    }

    const { certificate } = result;
    const revoked = result.status === "revoked";
    const issued = formatIssued(certificate.issued_at);

    return (
        <div
            className={`rounded-2xl border p-8 space-y-6 ${
                revoked ? "border-destructive/40 bg-card" : "border-emerald-500/30 bg-card"
            }`}
        >
            <div className="flex items-start gap-4">
                {revoked ? (
                    <ShieldX className="size-9 shrink-0 text-destructive" />
                ) : (
                    <BadgeCheck className="size-9 shrink-0 text-emerald-400" />
                )}
                <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-foreground">
                        {revoked ? "Certificate revoked" : "Valid certificate"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {revoked
                            ? "This ID is genuine, but the certificate has been withdrawn. It should not be treated as proof of completion."
                            : "This ID is in our registry and belongs to the student below."}
                    </p>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Awarded to</p>
                    <p className="text-xl font-bold text-foreground">{certificate.student_name || "—"}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Course</p>
                    {certificate.course_slug ? (
                        <Link
                            to={`/learning-hub/course/${certificate.course_slug}`}
                            className="text-xl font-bold text-foreground hover:text-primary underline-offset-4 hover:underline"
                        >
                            {certificate.course_title || "—"}
                        </Link>
                    ) : (
                        <p className="text-xl font-bold text-foreground">{certificate.course_title || "—"}</p>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap gap-6 border-t border-border pt-5 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="size-4" />
                    <span>{issued ? `Issued ${issued}` : "Issue date unavailable"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Award className="size-4" />
                    <span className="font-mono text-foreground/80">{certificate.certificate_code}</span>
                </div>
            </div>
        </div>
    );
}

function VerifyView({ code }: { code?: string }) {
    const navigate = useNavigate();
    // Normalised once per mount; the route key remounts this view when the URL
    // param changes, so `typed` never has to be synced in an effect.
    const value = (code ?? "").trim().toUpperCase();
    const [typed, setTyped] = useState(value);
    const [result, setResult] = useState<Result | null>(null);

    useEffect(() => {
        if (!value) return;

        let cancelled = false;

        void (async () => {
            try {
                const { data, error } = await supabase.rpc("verify_certificate", { p_code: value });
                if (error) throw error;
                if (cancelled) return;

                const certificate = data?.[0];
                setResult(
                    !certificate
                        ? { status: "not-found" }
                        : certificate.revoked_at
                            ? { status: "revoked", certificate }
                            : { status: "found", certificate },
                );
            } catch (err) {
                if (cancelled) return;
                logError(err, "VerifyCertificate.lookup");
                setResult({ status: "error" });
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [value]);

    // `null` means "no answer yet" — the request is in flight whenever a code is.
    const status: Status = !value ? "idle" : result ? result.status : "checking";

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const next = typed.trim().toUpperCase();
        if (!next) return;
        navigate(`/verify/${encodeURIComponent(next)}`);
    };

    return (
        <div className="min-h-screen bg-background">
            <SEOHead
                title="Verify a Certificate | Young Innovators Club"
                description="Confirm a Young Innovators Club course completion certificate by its certificate ID."
                path="/verify"
                noindex
            />
            <Header />
            <main className="pt-24 pb-20">
                <section className="section-padding border-b border-border">
                    <div className="container-custom max-w-3xl">
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                            Certificate registry
                        </p>
                        <h1 className="mt-3 text-3xl md:text-4xl font-black tracking-tight text-foreground">
                            Verify a certificate
                        </h1>
                        <p className="mt-4 text-muted-foreground max-w-xl">
                            Every certificate we issue carries an ID. Enter it exactly as printed to
                            confirm who earned it, for which course, and when.
                        </p>

                        <form onSubmit={submit} className="mt-8 flex flex-col sm:flex-row gap-3 sm:items-end">
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="certificate-code">Certificate ID</Label>
                                <Input
                                    id="certificate-code"
                                    name="certificate-code"
                                    value={typed}
                                    onChange={(event) => setTyped(event.target.value)}
                                    placeholder="YIC-1A2B3C4D5E6F-1026"
                                    autoComplete="off"
                                    autoCapitalize="characters"
                                    spellCheck={false}
                                    maxLength={64}
                                    className="font-mono"
                                    aria-describedby="certificate-code-hint"
                                />
                            </div>
                            <Button type="submit" disabled={!typed.trim() || status === "checking"}>
                                {status === "checking" ? "Checking…" : "Verify"}
                            </Button>
                        </form>
                        <p id="certificate-code-hint" className="mt-2 text-xs text-muted-foreground">
                            Case-insensitive. The format is YIC- followed by 12 characters and the issue
                            month.
                        </p>
                    </div>
                </section>

                <section className="section-padding">
                    <div className="container-custom max-w-3xl" aria-live="polite" role="status">
                        {status === "checking" && (
                            <p className="text-sm text-muted-foreground">Checking the registry…</p>
                        )}
                        {result && <CertificateResult result={result} />}
                        {status === "idle" && (
                            <p className="text-sm text-muted-foreground">
                                Certificates are issued automatically once a student completes every
                                published module of a course.
                            </p>
                        )}
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}

export default function VerifyCertificate() {
    const { code } = useParams<{ code?: string }>();
    // Keying on the param gives each lookup a fresh view: no effect-driven
    // state sync, and a stale result can never linger under a new URL.
    return <VerifyView key={code ?? ""} code={code} />;
}
