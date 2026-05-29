import { parse } from "path";
// @ts-ignore - Bun types are intentionally omitted as this is a standalone script
import { Glob, file, write } from "bun";
import sharp from "sharp";

// Configuration
const DIRECTORIES = ["public", "src/assets"];
const EXTENSIONS = ["png", "jpg", "jpeg"];
const OUT_JSON = "src/lib/imagePlaceholders.json";

interface PlaceholderData {
  webpSrc: string;
  avifSrc?: string;
  base64: string;
}

async function optimizeImages() {
  const placeholders: Record<string, PlaceholderData> = {};

  console.log("🚀 Starting Image Optimization Pipeline (Sharp)...");

  for (const dir of DIRECTORIES) {
    for (const ext of EXTENSIONS) {
      const glob = new Glob(`**/*.${ext}`);
      
      for await (const relativePath of glob.scan(dir)) {
        const filePath = `${dir}/${relativePath}`;
        
        // Skip webp and avif if matched accidentally
        if (filePath.toLowerCase().endsWith(".webp") || filePath.toLowerCase().endsWith(".avif")) continue;

        try {
          const inputFile = file(filePath);
          const buffer = Buffer.from(await inputFile.arrayBuffer());
          
          const parsedPath = parse(filePath);
          const webpPath = `${parsedPath.dir}/${parsedPath.name}.webp`;
          const avifPath = `${parsedPath.dir}/${parsedPath.name}.avif`;
          
          // Generate high-res WebP
          const webpData = await sharp(buffer)
            .webp({ quality: 80 })
            .toBuffer();
          await write(webpPath, webpData);
          
          // Generate high-res AVIF
          let avifData: Buffer | null = null;
          try {
             avifData = await sharp(buffer)
               .avif({ quality: 75 })
               .toBuffer();
             await write(avifPath, avifData);
          } catch (e) {
             console.log(`⚠️ AVIF encoding not supported for ${filePath}, skipping AVIF variant.`);
          }
          
          // Generate ultra-small inline Base64 placeholder (20x20 for better blur)
          const placeholderData = await sharp(buffer)
            .resize(20, 20, { fit: 'inside' })
            .webp({ quality: 20 })
            .toBuffer();
          const base64 = "data:image/webp;base64," + placeholderData.toString("base64");
          
          // The public URL mapping (if in public/, path starts from root)
          let publicOriginalPath = filePath;
          let publicWebpPath = webpPath;
          let publicAvifPath = avifPath;
          
          if (filePath.startsWith("public")) {
            publicOriginalPath = filePath.replace(/^public/, "");
            publicWebpPath = webpPath.replace(/^public/, "");
            publicAvifPath = avifPath.replace(/^public/, "");
          } else {
            // For src/assets, we map them as absolute paths or relative
            publicOriginalPath = `/${filePath}`;
            publicWebpPath = `/${webpPath}`;
            publicAvifPath = `/${avifPath}`;
          }

          // Use forward slashes
          publicOriginalPath = publicOriginalPath.replace(/\\/g, '/');
          publicWebpPath = publicWebpPath.replace(/\\/g, '/');
          publicAvifPath = publicAvifPath.replace(/\\/g, '/');
          
          placeholders[publicOriginalPath] = {
            webpSrc: publicWebpPath,
            ...(avifData && { avifSrc: publicAvifPath }),
            base64
          };
          
          console.log(`✅ Optimized: ${publicOriginalPath}`);
        } catch (e) {
          console.error(`❌ Failed to process ${filePath}`, e);
        }
      }
    }
  }

  await write(OUT_JSON, JSON.stringify(placeholders, null, 2));
  console.log(`\n🎉 Generated ${Object.keys(placeholders).length} placeholders to ${OUT_JSON}`);
}

optimizeImages();
