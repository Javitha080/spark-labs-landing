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

        // Strict Server-Side-like validation on the client
        if (file.size > maxSize) {
            setError(`File size too large. Max size is ${Math.round(maxSize / 1024 / 1024)}MB`);
            return;
        }

        // Validate MIME type against accepted groups
        const allowedTypes = Object.keys(accept);
        const isAllowedType = allowedTypes.some(type => {
            if (type.endsWith('/*')) {
                const baseType = type.split('/')[0];
                return file.type.startsWith(`${baseType}/`);
            }
            return file.type === type;
        });

        if (!isAllowedType && allowedTypes.length > 0) {
            setError(`Invalid file type: ${file.type || 'unknown'}. Allowed types: ${allowedTypes.join(', ')}`);
            return;
        }

        setUploading(true);
        setProgress(0);
        setError(null);

        try {
            setProgress(10); // Start progress
            
            // Send file via FormData to the Edge Function
            const formData = new FormData();
            formData.append('file', file);
            formData.append('bucketName', bucketName);
            formData.append('folderPath', folderPath);

            // Simulating progress while uploading to Edge Function
            const progressInterval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) return prev;
                    return prev + 10;
                });
            }, 400);

            // Ensure we have a session to invoke
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                clearInterval(progressInterval);
                throw new Error("You must be logged in to upload files.");
            }

            // Call the secure Edge Function
            const { data, error: uploadError } = await supabase.functions.invoke('upload-media', {
                body: formData,
                headers: {
                    // supabase-js usually sets Authorization automatically, 
                    // but we pass it anyway just in case
                    Authorization: `Bearer ${session.access_token}`
                }
            });

            clearInterval(progressInterval);

            if (uploadError) {
                console.error("Edge function error:", uploadError);
                throw new Error(uploadError.message || "Upload failed");
            }

            if (data?.error) {
                throw new Error(data.error);
            }

            setProgress(100);
            
            if (data?.reused) {
                toast.success("File detected and reused");
            } else {
                toast.success("File uploaded successfully");
            }

            onUploadComplete(data.url, data.path);

        } catch (err: unknown) {
            console.error("Upload failed:", err);
            setError(err instanceof Error ? err.message : "Upload failed");
            toast.error(err instanceof Error ? `Upload failed: ${err.message}` : "Upload failed");
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
