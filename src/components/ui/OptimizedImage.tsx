import { useState, useMemo, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onLoad' | 'onError'> {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    priority?: boolean;
    quality?: number;
    onLoad?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
    onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
    fallbackSrc?: string;
}

/**
 * OptimizedImage - High-performance Cloudflare-ready image component
 * - Automatic WebP/AVIF via Cloudflare Image Optimization
 * - Native browser lazy loading
 * - fetchPriority hints for LCP images
 * - Blur placeholder during loading
 * - Error handling with fallback
 */
const OptimizedImage = ({
    src,
    alt,
    width,
    height,
    priority = false,
    quality = 80,
    onLoad,
    onError,
    fallbackSrc = "/placeholder.svg",
    className,
    style,
    ...props
}: OptimizedImageProps) => {
    const [isLoading, setIsLoading] = useState(!priority);
    const [hasError, setHasError] = useState(false);

    // Optimize the source URL using Cloudflare Image Resizing
    // Documentation: https://developers.cloudflare.com/images/image-resizing/url-format/
    const optimizedSrc = useMemo(() => {
        if (hasError && fallbackSrc) return fallbackSrc;
        
        // Skip optimization for SVGs, data URIs, or local assets
        if (!src || src.startsWith("data:") || src.startsWith("blob:") || src.endsWith('.svg')) {
            return src;
        }

        // Only optimize absolute Supabase URLs
        if (src.includes('supabase.co/storage/v1/object/public/')) {
            // Transform to Cloudflare Image Optimization URL formatting
            // Format: /cdn-cgi/image/width=X,quality=Y,format=auto/https://origin.com/image.jpg
            
            const params = new URLSearchParams();
            params.append('format', 'auto'); // Auto-serve AVIF/WebP
            params.append('quality', quality.toString());
            
            // If width/height provided, request resized version from Cloudflare edge
            if (width) params.append('width', width.toString());
            if (height) params.append('height', height.toString());
            
            // The Cloudflare worker must have image optimization enabled for this to work
            return `/cdn-cgi/image/${params.toString().replace(/&/g, ',')}/${src}`;
        }

        return src;
    }, [src, width, height, quality, hasError, fallbackSrc]);

    const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        setIsLoading(false);
        setHasError(false);
        if (onLoad) onLoad(e);
    };

    const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
        setIsLoading(false);
        setHasError(true);
        if (onError) onError(e);
    };

    const aspectRatio = width && height ? width / height : undefined;

    return (
        <div
            className={cn(
                "relative overflow-hidden bg-muted/30",
                className
            )}
            style={{
                width: width ? `${width}px` : "100%",
                height: height ? `${height}px` : aspectRatio ? "auto" : "100%",
                aspectRatio: aspectRatio ? `${aspectRatio}` : undefined,
                ...style,
            }}
        >
            {/* Loading shimmer effect */}
            {isLoading && (
                <div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-muted/50 to-transparent animate-shimmer"
                    style={{ backgroundSize: "200% 100%" }}
                    aria-hidden="true"
                />
            )}

            {/* Main image */}
            {optimizedSrc && (
                <img
                    src={optimizedSrc}
                    alt={alt}
                    width={width}
                    height={height}
                    // Native performance attributes
                    loading={priority ? "eager" : "lazy"}
                    decoding={priority ? "sync" : "async"}
                    fetchPriority={priority ? "high" : "low"}
                    onLoad={handleLoad}
                    onError={handleError}
                    className={cn(
                        "w-full h-full object-cover transition-opacity duration-300",
                        isLoading ? "opacity-0" : "opacity-100",
                        hasError && "grayscale"
                    )}
                    {...props}
                />
            )}
        </div>
    );
};

export default OptimizedImage;
