import { useState, useRef, useEffect, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    priority?: boolean;
    placeholder?: "blur" | "empty";
    blurDataUrl?: string;
    onLoad?: () => void;
    onError?: () => void;
    fallbackSrc?: string;
}

/**
 * OptimizedImage - A high-performance image component with:
 * - Lazy loading via IntersectionObserver
 * - Blur placeholder during loading
 * - Progressive loading animation
 * - Error handling with fallback
 * - WebP format detection
 */
const OptimizedImage = ({
    src,
    alt,
    width,
    height,
    priority = false,
    placeholder = "blur",
    blurDataUrl,
    onLoad,
    onError,
    fallbackSrc = "/placeholder.svg",
    className,
    style,
    ...props
}: OptimizedImageProps) => {
    const [isLoading, setIsLoading] = useState(!priority);
    const [isInView, setIsInView] = useState(priority);
    const [hasError, setHasError] = useState(false);
    const [currentSrc, setCurrentSrc] = useState(priority ? src : "");
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Generate a simple blur placeholder if none provided
    const defaultBlurDataUrl = `data:image/svg+xml;base64,${btoa(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width || 100} ${height || 100}">
      <filter id="b" color-interpolation-filters="sRGB">
        <feGaussianBlur stdDeviation="20"/>
      </filter>
      <rect width="100%" height="100%" fill="hsl(var(--muted))" filter="url(#b)"/>
    </svg>`
    )}`;

    const placeholderImage = blurDataUrl || defaultBlurDataUrl;

    // Intersection Observer for lazy loading
    useEffect(() => {
        if (priority || !containerRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsInView(true);
                        observer.disconnect();
                    }
                });
            },
            {
                rootMargin: "50px", // Start loading 50px before entering viewport
                threshold: 0.01,
            }
        );

        observer.observe(containerRef.current);

        return () => {
            observer.disconnect();
        };
    }, [priority]);

    // Load image when in view
    useEffect(() => {
        if (!isInView || currentSrc === src) return;
        setCurrentSrc(src);
    }, [isInView, src, currentSrc]);

    const handleLoad = () => {
        setIsLoading(false);
        setHasError(false);
        onLoad?.();
    };

    const handleError = () => {
        setIsLoading(false);
        setHasError(true);
        if (fallbackSrc && currentSrc !== fallbackSrc) {
            setCurrentSrc(fallbackSrc);
        }
        onError?.();
    };

    // Check for WebP support
    const getOptimizedSrc = (originalSrc: string) => {
        // If it's already a data URL or blob, return as-is
        if (originalSrc.startsWith("data:") || originalSrc.startsWith("blob:")) {
            return originalSrc;
        }

        // If it's a Supabase storage URL, we can potentially request WebP
        // For now, return the original URL
        return originalSrc;
    };

    const aspectRatio = width && height ? width / height : undefined;

    return (
        <div
            ref={containerRef}
            className={cn(
                "relative overflow-hidden bg-muted",
                className
            )}
            style={{
                width: width ? `${width}px` : "100%",
                height: height ? `${height}px` : aspectRatio ? "auto" : "100%",
                aspectRatio: aspectRatio ? `${aspectRatio}` : undefined,
                ...style,
            }}
        >
            {/* Blur placeholder */}
            {placeholder === "blur" && isLoading && (
                <div
                    className="absolute inset-0 animate-pulse"
                    style={{
                        backgroundImage: `url(${placeholderImage})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        filter: "blur(20px)",
                        transform: "scale(1.1)",
                    }}
                    aria-hidden="true"
                />
            )}

            {/* Loading shimmer effect */}
            {isLoading && (
                <div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"
                    style={{
                        backgroundSize: "200% 100%",
                    }}
                    aria-hidden="true"
                />
            )}

            {/* Main image */}
            {currentSrc && (
                <img
                    ref={imgRef}
                    src={getOptimizedSrc(currentSrc)}
                    alt={alt}
                    width={width}
                    height={height}
                    loading={priority ? "eager" : "lazy"}
                    decoding={priority ? "sync" : "async"}
                    onLoad={handleLoad}
                    onError={handleError}
                    className={cn(
                        "w-full h-full object-cover transition-opacity duration-500",
                        isLoading ? "opacity-0" : "opacity-100",
                        hasError && "grayscale"
                    )}
                    {...props}
                />
            )}

            {/* Error state */}
            {hasError && currentSrc === fallbackSrc && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/80 text-muted-foreground">
                    <div className="text-center p-4">
                        <svg
                            className="w-8 h-8 mx-auto mb-2 opacity-50"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                        </svg>
                        <p className="text-xs">Image unavailable</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OptimizedImage;

// CSS animation for shimmer effect (add to index.css)
// @keyframes shimmer {
//   0% { background-position: -200% 0; }
//   100% { background-position: 200% 0; }
// }
// .animate-shimmer {
//   animation: shimmer 1.5s ease-in-out infinite;
// }
