import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, File, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { calculateFileHash } from "@/lib/hashing";

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
        'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
        'video/*': ['.mp4', '.webm'],
        'application/pdf': ['.pdf']
    },
    maxSize = 10 * 1024 * 1024, // 10MB default (down from 500MB for security)
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
            // STEP 1: Calculate file hash for duplicate detection
            setProgress(5); // Start progress
            const fileHash = await calculateFileHash(file);
            
            // STEP 2: Check for existing file with the same hash in the same bucket
            const { data: existingAsset, error: checkError } = await supabase
                .from('media_assets' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                .select('*')
                .eq('file_hash', fileHash)
                .eq('bucket_name', bucketName)
                .maybeSingle();

            if (checkError) {
                console.error("Duplicate check failed:", checkError);
                // Non-critical: Proceed with upload if check fails
            }

            if (existingAsset) {
                const asset = existingAsset as any; // eslint-disable-line @typescript-eslint/no-explicit-any
                console.log("[Duplicate Success] Skipping upload, using existing asset:", asset.public_url);
                setProgress(100);
                setTimeout(() => {
                    onUploadComplete(asset.public_url, asset.file_path);
                    toast.success("File detected and reused");
                }, 100);
                return;
            }

            // STEP 3: Proceed with upload if unique
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
            const filePath = `${folderPath}/${fileName}`;

            // Simulating progress
            const progressInterval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) return prev;
                    return prev + 5;
                });
            }, 300);

            const { data, error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            clearInterval(progressInterval);

            if (uploadError) throw uploadError;

            // STEP 4: Record the unique asset in media_assets table
            const { data: { publicUrl } } = supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            const { error: insertError } = await supabase
                .from('media_assets' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                .insert([{
                    file_hash: fileHash,
                    bucket_name: bucketName,
                    file_path: filePath,
                    public_url: publicUrl,
                    file_size: file.size,
                    mime_type: file.type
                }]);

            if (insertError) {
                console.error("Failed to record media asset:", insertError);
                // Non-critical: Storage upload succeeded, just hash tracking failed
            }

            setProgress(100);
            onUploadComplete(publicUrl, filePath);
            toast.success("File uploaded successfully");

        } catch (err: unknown) {
            console.error("Upload failed:", err);
            setError(err instanceof Error ? err.message : "Upload failed");
            toast.error("Upload failed");
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
