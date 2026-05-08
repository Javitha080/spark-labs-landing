import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, File, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";


interface FileUploadProps {
    onUploadComplete: (url: string, path: string) => void;
    bucketName?: string;
    folderPath?: string;
    accept?: Record<string, string[]>;
    maxSize?: number; // in bytes
    label?: string;
}

export function FileUpload({
    onUploadComplete,
    bucketName = "course-content",
    folderPath = "uploads",
    accept = {
        'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif', '.heic'],
        'video/*': ['.mp4', '.webm', '.mov', '.mkv'],
        'application/pdf': ['.pdf']
    },
    maxSize = 500 * 1024 * 1024, // 500MB default
    label = "Drag & drop files here, or click to select"
}: FileUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        const file = acceptedFiles[0];

        // Resolve MIME with extension fallback (iOS / drag-drop sometimes give "")
        const EXT_TO_MIME: Record<string, string> = {
            png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
            webp: 'image/webp', svg: 'image/svg+xml', avif: 'image/avif',
            heic: 'image/heic', heif: 'image/heif',
            mp4: 'video/mp4', m4v: 'video/x-m4v', mov: 'video/quicktime',
            webm: 'video/webm', mkv: 'video/x-matroska', avi: 'video/x-msvideo',
            '3gp': 'video/3gpp', ogv: 'video/ogg',
            mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', ogg: 'audio/ogg',
            pdf: 'application/pdf',
        };
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        let resolvedMime = (file.type || '').toLowerCase();
        if (!resolvedMime || resolvedMime === 'application/octet-stream') {
            resolvedMime = EXT_TO_MIME[ext] || resolvedMime;
        }

        // Tiered size limits matching the server
        const category = resolvedMime.startsWith('image/') ? 'image'
            : resolvedMime.startsWith('video/') ? 'video'
            : resolvedMime.startsWith('audio/') ? 'audio'
            : resolvedMime === 'application/pdf' ? 'pdf'
            : 'other';
        const TIER: Record<string, number> = {
            image: 25 * 1024 * 1024,
            audio: 50 * 1024 * 1024,
            video: 500 * 1024 * 1024,
            pdf: 50 * 1024 * 1024,
            other: maxSize,
        };
        const tierLimit = Math.min(TIER[category] ?? maxSize, maxSize);
        if (file.size > tierLimit) {
            const sizeMb = (file.size / 1024 / 1024).toFixed(1);
            const limitMb = Math.round(tierLimit / 1024 / 1024);
            const msg = `File too large: ${sizeMb} MB. Limit for ${category} files is ${limitMb} MB.`;
            setError(msg);
            toast.error("File too large", { description: msg });
            return;
        }

        // Validate MIME type against accepted groups using resolved MIME
        const allowedTypes = Object.keys(accept);
        const isAllowedType = allowedTypes.some(type => {
            if (type.endsWith('/*')) {
                const baseType = type.split('/')[0];
                return resolvedMime.startsWith(`${baseType}/`);
            }
            return resolvedMime === type;
        });

        if (!isAllowedType && allowedTypes.length > 0) {
            const msg = `Unsupported media type${ext ? ` ".${ext}"` : ''}${resolvedMime ? ` (${resolvedMime})` : ''}. Allowed: ${allowedTypes.join(', ')}`;
            setError(msg);
            toast.error("Unsupported media type", { description: msg });
            return;
        }

        setUploading(true);
        setProgress(0);
        setError(null);

        try {
            setProgress(10);

            const formData = new FormData();
            // Re-wrap so the server sees the resolved MIME type
            const fileToSend = (file.type || '') === resolvedMime
                ? file
                : new File([file], file.name, { type: resolvedMime });
            formData.append('file', fileToSend);
            formData.append('bucketName', bucketName);
            formData.append('folderPath', folderPath);

            const progressInterval = setInterval(() => {
                setProgress(prev => (prev >= 90 ? prev : prev + 10));
            }, 400);

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                clearInterval(progressInterval);
                throw new Error("You must be logged in to upload files.");
            }

            // Helper: extract a useful server message from FunctionsHttpError
            const readServerError = async (errLike: unknown): Promise<string | undefined> => {
                try {
                    const ctx = (errLike as { context?: Response }).context;
                    if (ctx && typeof ctx.text === "function") {
                        const txt = await ctx.text();
                        try {
                            const parsed = JSON.parse(txt);
                            return parsed?.error || parsed?.message || txt;
                        } catch {
                            return txt;
                        }
                    }
                } catch { /* ignore */ }
                return undefined;
            };

            let result: { url: string; path: string; reused?: boolean } | null = null;
            let lastErrorMsg = '';

            // Attempt 1: supabase-js invoke
            const { data, error: uploadError } = await supabase.functions.invoke('upload-media', {
                body: formData,
                headers: { Authorization: `Bearer ${session.access_token}` },
            });

            if (uploadError) {
                lastErrorMsg = (await readServerError(uploadError)) || uploadError.message || 'Upload failed';
                console.warn("[FileUpload] invoke failed, trying direct fetch fallback:", lastErrorMsg);

                // Attempt 2: direct fetch fallback (some networks block functions.invoke)
                const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-media`;
                const resp = await fetch(url, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
                    },
                    body: formData,
                });
                const raw = await resp.text();
                let parsed: { error?: string; url?: string; path?: string; reused?: boolean } = {};
                try { parsed = JSON.parse(raw); } catch { /* keep raw */ }

                if (!resp.ok) {
                    clearInterval(progressInterval);
                    throw new Error(parsed.error || lastErrorMsg || `Upload failed (${resp.status})`);
                }
                result = { url: parsed.url!, path: parsed.path!, reused: parsed.reused };
            } else if (data?.error) {
                clearInterval(progressInterval);
                throw new Error(data.error);
            } else {
                result = data as { url: string; path: string; reused?: boolean };
            }

            clearInterval(progressInterval);
            setProgress(100);

            if (!result?.url) {
                throw new Error("Upload succeeded but no URL was returned.");
            }

            if (result.reused) {
                toast.success("File detected and reused");
            } else {
                toast.success("File uploaded successfully");
            }

            onUploadComplete(result.url, result.path);
        } catch (err: unknown) {
            console.error("Upload failed:", err);
            const msg = err instanceof Error ? err.message : "Upload failed";
            setError(msg);
            // Pick a clearer toast title based on the message
            const title =
                /unsupported media|invalid file type/i.test(msg) ? "Unsupported media type" :
                /too large|exceeds/i.test(msg) ? "File too large" :
                /unauthorized|forbidden|permission|logged in/i.test(msg) ? "Permission denied" :
                "Upload failed";
            toast.error(title, { description: msg });
        } finally {
            setUploading(false);
        }
    }, [bucketName, folderPath, maxSize, onUploadComplete, accept]);

    const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
        onDrop,
        accept,
        maxSize,
        multiple: false
    });

    return (
        <div className="w-full">
            <div
                {...getRootProps()}
                className={cn(
                    "border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer flex flex-col items-center justify-center text-center gap-4",
                    isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
                    isDragReject && "border-destructive bg-destructive/5",
                    uploading && "pointer-events-none opacity-50"
                )}
            >
                <input {...getInputProps()} />

                <div className="p-4 rounded-full bg-muted/50">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                </div>

                <div className="space-y-1">
                    <p className="font-medium text-sm">{isDragActive ? "Drop the file here" : label}</p>
                    <p className="text-xs text-muted-foreground">
                        Max size: {Math.round(maxSize / 1024 / 1024)}MB
                    </p>
                </div>
            </div>

            {uploading && (
                <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs">
                        <span>Uploading...</span>
                        <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>
            )}

            {error && (
                <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}
        </div>
    );
}
