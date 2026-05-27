import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, File as FileIcon, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { optimizeImageFile } from "@/lib/image-optimizer";


interface FileUploadProps {
    onUploadComplete: (url: string, path: string, base64Placeholder?: string, dominantColor?: string) => void;
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
    label = "Video & Photo Upload — drag & drop or click to browse"
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
            mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', ogg: 'audio/ogg'
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

        // Per-upload correlation ID for tracing
        const correlationId =
            (globalThis.crypto as Crypto | undefined)?.randomUUID?.() ??
            `cid_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

        let fileToSend = (file.type || '') === resolvedMime
            ? file
            : new File([file], file.name, { type: resolvedMime });
            
        let base64Placeholder: string | undefined = undefined;
        let dominantColor: string | undefined = undefined;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("You must be logged in to upload files.");
            
            if (category === 'image' && !resolvedMime.includes('svg')) {
                try {
                    setProgress(5);
                    const optimized = await optimizeImageFile(file);
                    fileToSend = optimized.file;
                    base64Placeholder = optimized.base64Placeholder;
                    dominantColor = optimized.dominantColor || undefined;
                    resolvedMime = "image/webp";
                } catch (optErr) {
                    console.warn('[FileUpload] Image optimization failed, falling back to original', optErr);
                }
            }

            console.info('[FileUpload] start', {
                correlationId, bucket: bucketName, folder: folderPath,
                name: file.name, browserType: file.type, resolvedMime, sizeBytes: file.size,
            });

            // --- Client-Side Magic Byte Check ---
            // Early failure before network roundtrip
            const headerBytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
            const hex = Array.from(headerBytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
            let magicMatch = false;

            if (category === 'image') {
                if (hex.startsWith('FFD8FF')) magicMatch = true;
                else if (hex.startsWith('89504E47')) magicMatch = true;
                else if (hex.startsWith('47494638')) magicMatch = true;
                else if (hex.startsWith('52494646') && hex.substring(16, 24) === '57454250') magicMatch = true;
                else if (hex.includes('6674797068656963')) magicMatch = true;
                else if (hex.startsWith('3C3F786D6C') || hex.startsWith('3C737667')) magicMatch = true;
            } else if (category === 'video') {
                if (hex.includes('66747970')) magicMatch = true;
                else if (hex.startsWith('1A45DFA3')) magicMatch = true;
            } else if (category === 'audio') {
                if (hex.startsWith('494433') || hex.startsWith('FFFB')) magicMatch = true;
                else if (hex.includes('66747970')) magicMatch = true;
                else if (hex.startsWith('52494646') && hex.substring(16, 24) === '57415645') magicMatch = true;
                else if (hex.startsWith('4F676753')) magicMatch = true;
            } else if (category === 'pdf') {
                if (hex.startsWith('25504446')) magicMatch = true;
            }

            if (!magicMatch) {
                throw new Error("File content does not match its extension or type. Upload rejected for security reasons.");
            }

            // Generate a unique file path - sanitization happens server-side, but good to be safe client-side too
            const fileExt = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || '';
            const safeBaseName = file.name.replace(`.${fileExt}`, '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
            const fileName = `${safeBaseName}_${Math.random().toString(36).substring(2, 10)}_${Date.now()}.${fileExt}`;
            const filePath = `${folderPath}/${fileName}`;

            // Upload directly to Supabase Storage using the user's session
            // This uses the anon key + user JWT — no service_role key needed
            setProgress(10);

            // Retry logic with AbortController for timeouts
            let uploadError;
            const maxRetries = 2;
            const timeoutMs = category === 'video' ? 90000 : 30000; // 90s for video, 30s for images/other

            for (let attempt = 0; attempt <= maxRetries; attempt++) {
                try {
                    // Start progress bar animation
                    setProgress(10 + (attempt * 10));

                    const { error: attemptError } = await supabase.storage
                        .from(bucketName)
                        .upload(filePath, fileToSend, {
                            contentType: resolvedMime,
                            cacheControl: '3600',
                            upsert: false,
                        });

                    if (attemptError) {
                        throw attemptError;
                    }

                    // Success, exit retry loop
                    uploadError = null;
                    break;
                } catch (err) {
                    const error = err as Error;
                    console.warn(`[FileUpload] attempt ${attempt + 1} failed`, error);
                    uploadError = error;

                    // Don't retry if it's an auth or validation error
                    if (error.message?.includes('JWT') || error.message?.includes('Unauthorized') || error.message?.includes('Extension')) {
                        break;
                    }

                    if (attempt < maxRetries) {
                        // Exponential backoff
                        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
                    }
                }
            }

            if (uploadError) {
                throw new Error(`Storage upload failed after retries: ${uploadError.message || 'Unknown error'}`);
            }

            setProgress(90);

            // Get the public URL
            const { data: { publicUrl } } = supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            setProgress(100);
            console.info('[FileUpload] success', { correlationId, url: publicUrl, path: filePath });

            toast.success("File uploaded successfully", { description: `ID: ${correlationId.slice(0, 8)}` });
            onUploadComplete(publicUrl, filePath, base64Placeholder, dominantColor);
        } catch (err: unknown) {
            const e = err as Error & { code?: string; status?: number; correlationId?: string };
            const msg = e?.message || "Upload failed";
            console.error('[FileUpload] failed', { correlationId, msg });
            setError(`${msg} (ID: ${correlationId.slice(0, 8)})`);
            const title =
                /unsupported media|MIME_UNSUPPORTED|invalid file type/i.test(msg) ? "Unsupported media type" :
                    /too large|FILE_TOO_LARGE|exceeds/i.test(msg) ? "File too large" :
                        /unauthorized|forbidden|ROLE_FORBIDDEN|AUTH_|permission|logged in/i.test(msg) ? "Permission denied" :
                            /network|timeout/i.test(msg) ? "Network error" :
                                /bucket|not found|policy/i.test(msg) ? "Storage configuration error" :
                                    "Upload failed";
            toast.error(title, { description: `${msg} · ID: ${correlationId.slice(0, 8)}` });
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
                    <Upload className="size-8 text-muted-foreground" />
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
                        <span>Uploading&hellip;</span>
                        <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>
            )}

            {error && (
                <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md flex items-center gap-2 text-sm">
                    <AlertCircle className="size-4" />
                    {error}
                </div>
            )}
        </div>
    );
}
