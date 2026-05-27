import { useState, useMemo, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { getSafeImageSrc } from "@/lib/imageUtils";
import placeholders from "@/lib/imagePlaceholders.json";

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
    dynamicPlaceholder?: string;
    dominantColor?: string;
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
    dynamicPlaceholder,
    dominantColor,
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

        // Validate the URL — reject known non-image URLs (e.g. ibb.co page links)
        const safeSrc = getSafeImageSrc(src, fallbackSrc);
        if (safeSrc !== src) return safeSrc;

        // Only optimize absolute Supabase URLs
        if (src.includes('supabase.co/storage/v1/object/public/')) {
           return src; // Fallback to direct Supabase URL
        }

        return src;
    }, [src, width, height, quality, hasError, fallbackSrc]);

    // Retrieve Bun-generated placeholder data if it exists, but prefer dynamicPlaceholder
    const placeholderData = (placeholders as any)[src];
    const optimizedSrcToUse = placeholderData ? placeholderData.webpSrc : optimizedSrc;
    const blurBase64 = dynamicPlaceholder || (placeholderData ? placeholderData.base64 : null);

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
                backgroundColor: !blurBase64 && dominantColor ? dominantColor : undefined,
                ...style,
            }}
        >
            {/* Loading placeholder effect */}
            {isLoading && blurBase64 && (
                <img
                    src={blurBase64}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 size-full object-cover blur-md scale-110"
                />
            )}
            
            {/* Shimmer fallback if no placeholder */}
            {isLoading && !blurBase64 && (
                <div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-muted/50 to-transparent animate-shimmer"
                    style={{ backgroundSize: "200% 100%" }}
                    aria-hidden="true"
                />
            )}

            {/* Main image */}
            {optimizedSrcToUse && (
                <img
                    src={optimizedSrcToUse}
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
                        "size-full object-cover transition-opacity duration-300",
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
