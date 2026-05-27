/**
 * Client-Side Image Optimizer
 * Converts uploaded File objects into highly compressed WebP files,
 * generates a microscopic 10x10 Base64 placeholder string,
 * and extracts the dominant color for instant background styling.
 */

export interface OptimizedImageResult {
  file: File;
  base64Placeholder: string;
  dominantColor: string | null;
  width: number;
  height: number;
}

export async function optimizeImageFile(
  file: File,
  maxWidth = 1920,
  quality = 0.82
): Promise<OptimizedImageResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          return reject(new Error("Failed to get canvas context"));
        }

        ctx.drawImage(img, 0, 0, width, height);

        // 1. Generate 10x10 Base64 Placeholder
        const thumbCanvas = document.createElement("canvas");
        thumbCanvas.width = 10;
        thumbCanvas.height = 10;
        const thumbCtx = thumbCanvas.getContext("2d");
        let base64Placeholder = "";
        let dominantColor: string | null = null;
        
        if (thumbCtx) {
          thumbCtx.drawImage(img, 0, 0, 10, 10);
          base64Placeholder = thumbCanvas.toDataURL("image/webp", 0.1);
        }

        // 2. Extract Dominant Color using 1x1 canvas
        const colorCanvas = document.createElement("canvas");
        colorCanvas.width = 1;
        colorCanvas.height = 1;
        const colorCtx = colorCanvas.getContext("2d", { willReadFrequently: true });
        if (colorCtx) {
          colorCtx.drawImage(img, 0, 0, 1, 1);
          const data = colorCtx.getImageData(0, 0, 1, 1).data;
          if (data && data.length >= 4) {
            // Convert to hex
            dominantColor = `#${((1 << 24) + (data[0] << 16) + (data[1] << 8) + data[2]).toString(16).slice(1)}`;
          }
        }

        // 3. Export main image as WebP
        // Trying AVIF first is theoretically possible if the browser supports it, 
        // but WebP with 0.82 is much safer and guarantees compatibility.
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Canvas to Blob failed"));
            
            // Create a new File object with the webp extension
            const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
            const optimizedFile = new File([blob], newFileName, {
              type: "image/webp",
            });

            resolve({
              file: optimizedFile,
              base64Placeholder,
              dominantColor,
              width,
              height
            });
          },
          "image/webp",
          quality
        );
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
