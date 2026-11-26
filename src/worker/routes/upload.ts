import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ROLE_PERMISSIONS } from "../../lib/rbac";
import { authMiddleware } from "../middleware/auth";
import { checkRateLimitKV, uploadLimiter } from "../lib/rate-limit";
import { singleLine } from "../lib/sanitize";
import type { AppEnv } from "../lib/types";

const uploadRoutes = new Hono<AppEnv>();

const UPLOAD_EXT_TO_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
  mp4: "video/mp4",
  m4v: "video/x-m4v",
  mov: "video/quicktime",
  webm: "video/webm",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  "3gp": "video/3gpp",
  ogv: "video/ogg",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
  pdf: "application/pdf",
};

const UPLOAD_ALLOWED_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
  "video/x-matroska",
  "video/x-msvideo",
  "video/3gpp",
  "video/ogg",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/ogg",
  "application/pdf",
]);

const UPLOAD_SIZE_LIMITS: Record<string, number> = {
  image: 25 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
  video: 95 * 1024 * 1024,
  pdf: 50 * 1024 * 1024,
};
const UPLOAD_HARD_MAX = 95 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/heic": "heic",
  "image/heif": "heif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-m4v": "m4v",
  "video/x-matroska": "mkv",
  "video/x-msvideo": "avi",
  "video/3gpp": "3gp",
  "video/ogg": "ogv",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/wav": "wav",
  "audio/ogg": "ogg",
  "application/pdf": "pdf",
};

function matchesMagicBytes(category: string, mime: string, bytes: Uint8Array): boolean {
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  const isRiff = hex.startsWith("52494646");
  const hasFtyp = ascii(4, 8) === "ftyp";

  switch (category) {
    case "image":
      return (
        hex.startsWith("FFD8FF") ||
        hex.startsWith("89504E47") ||
        hex.startsWith("47494638") ||
        (isRiff && ascii(8, 12) === "WEBP") ||
        (hasFtyp && /^(heic|heix|hevc|hevx|mif1|msf1|avif|avis)/.test(ascii(8, 12)))
      );
    case "video":
      return (
        hasFtyp ||
        hex.startsWith("1A45DFA3") ||
        (isRiff && ascii(8, 11) === "AVI") ||
        (mime === "video/ogg" && ascii(0, 4) === "OggS")
      );
    case "audio":
      return (
        hex.startsWith("494433") ||
        (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) ||
        hasFtyp ||
        (isRiff && ascii(8, 12) === "WAVE") ||
        ascii(0, 4) === "OggS"
      );
    case "pdf":
      return hex.startsWith("25504446");
    default:
      return false;
  }
}

const UPLOAD_ALLOWED_BUCKETS = ["gallery", "projects", "teachers", "blog", "course-content", "avatars"];

uploadRoutes.post("/api/upload-media", authMiddleware, async (c) => {
  const rawCorrelationId = c.req.header("x-correlation-id") || "";
  const correlationId = /^[a-zA-Z0-9_-]{1,64}$/.test(rawCorrelationId)
    ? rawCorrelationId
    : crypto.randomUUID();
  const t0 = Date.now();
  const logCtx = (message: string, extra: Record<string, unknown> = {}) =>
    JSON.stringify({ message, correlationId, elapsedMs: Date.now() - t0, ...extra });

  const reply = (status: ContentfulStatusCode, body: Record<string, unknown>) =>
    c.json({ ...body, correlationId }, status);

  try {
    console.log(logCtx("[upload-media] start", { level: "info", method: c.req.method }));

    const user = c.get("user");
    const supabase = c.get("supabase");

    const uploadRateResult = await checkRateLimitKV(
      c.env,
      `upload:${user.id}`,
      10,
      300_000,
      uploadLimiter
    );

    c.header("X-RateLimit-Remaining", String(uploadRateResult.remaining));
    c.header("X-RateLimit-Reset", String(Math.ceil(uploadRateResult.resetMs / 1000)));

    if (!uploadRateResult.allowed) {
      c.header("Retry-After", String(Math.ceil(uploadRateResult.resetMs / 1000)));
      return reply(429, { error: "Too many uploads. Please try again later.", code: "UPLOAD_RATE_LIMITED" });
    }

    let formData: FormData;
    try {
      formData = await c.req.raw.formData();
    } catch (e) {
      console.error(logCtx("[upload-media] formdata-parse-failed", { level: "error", err: (e as Error).message }));
      return reply(400, { error: "Could not parse upload payload. Please retry.", code: "FORMDATA_PARSE" });
    }

    const fileField = formData.get("file");
    const file = fileField && typeof fileField !== "string" ? (fileField as File) : null;
    const bucketField = formData.get("bucketName");
    const folderField = formData.get("folderPath");
    const rawBucket = typeof bucketField === "string" && bucketField ? bucketField : "gallery";
    const rawFolder = typeof folderField === "string" && folderField ? folderField : "uploads";

    if (!UPLOAD_ALLOWED_BUCKETS.includes(rawBucket)) {
      return reply(400, {
        error: `Invalid bucket "${singleLine(rawBucket, 40)}". Allowed: ${UPLOAD_ALLOWED_BUCKETS.join(", ")}`,
        code: "BUCKET_INVALID",
      });
    }

    let requiredPermission = "gallery";
    if (rawBucket === "teachers") requiredPermission = "team";
    if (rawBucket === "course-content") requiredPermission = "learning_hub";
    if (rawBucket === "avatars") requiredPermission = "home";
    if (rawBucket === "projects") requiredPermission = "projects";
    if (rawBucket === "blog") requiredPermission = "blog";

    const role = c.get("role");
    const permissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || [];
    if (!permissions.includes("all") && !permissions.includes(requiredPermission)) {
      console.warn(logCtx("[upload-media] forbidden bucket", { level: "warn", role, requiredPermission }));
      return reply(403, {
        error: `Forbidden: Requires '${requiredPermission}' permission to upload to ${rawBucket}`,
        code: "FORBIDDEN",
      });
    }

    const bucketName = rawBucket;
    const folderPath =
      rawFolder
        .replace(/\.\./g, "")
        .replace(/[^a-zA-Z0-9_\-/]/g, "")
        .replace(/\/{2,}/g, "/")
        .replace(/^\/+|\/+$/g, "") || "uploads";

    if (!file) {
      return reply(400, { error: "No file provided", code: "FILE_MISSING" });
    }

    const ext = (file.name.split(".").pop() || "").toLowerCase();
    let mime = (file.type || "").toLowerCase();
    if (!mime || mime === "application/octet-stream") {
      mime = UPLOAD_EXT_TO_MIME[ext] || mime;
    }
    const category = mime.startsWith("image/")
      ? "image"
      : mime.startsWith("video/")
        ? "video"
        : mime.startsWith("audio/")
          ? "audio"
          : mime === "application/pdf"
            ? "pdf"
            : "other";

    console.log(
      logCtx("[upload-media] file-info", {
        level: "info",
        userId: user.id,
        bucket: bucketName,
        folder: folderPath,
        name: singleLine(file.name, 120),
        ext,
        browserType: file.type,
        resolvedMime: mime,
        sizeBytes: file.size,
      })
    );

    if (!UPLOAD_ALLOWED_MIMES.has(mime)) {
      return reply(415, {
        error: `Unsupported media type${ext ? ` ".${ext}"` : ""}${mime ? ` (${mime})` : ""}. Allowed: images, videos, audio, and PDF.`,
        code: "MIME_UNSUPPORTED",
        detected: { mime, ext },
      });
    }

    const limit = UPLOAD_SIZE_LIMITS[category] ?? UPLOAD_HARD_MAX;
    if (file.size > limit) {
      const sizeMb = (file.size / 1024 / 1024).toFixed(1);
      const limitMb = Math.round(limit / 1024 / 1024);
      return reply(413, {
        error: `File too large: ${sizeMb} MB. Limit for ${category} files is ${limitMb} MB.`,
        code: "FILE_TOO_LARGE",
      });
    }

    if (file.size === 0) {
      return reply(400, { error: "Uploaded file is empty", code: "FILE_EMPTY" });
    }

    const headerBytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const hex = Array.from(headerBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    const magicMatch = matchesMagicBytes(category, mime, headerBytes);

    if (!magicMatch) {
      console.warn(logCtx("[upload-media] magic-byte-mismatch", { level: "warn", hex: hex.substring(0, 16), mime, category }));
      return reply(415, {
        error: "File content does not match its extension or type. Upload rejected for security reasons.",
        code: "MAGIC_BYTE_MISMATCH",
      });
    }

    const fileExt = MIME_TO_EXT[mime] || "bin";
    const originalBase = file.name.includes(".") ? file.name.slice(0, file.name.lastIndexOf(".")) : file.name;
    const safeBaseName = originalBase.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100) || "file";
    const fileName = `${safeBaseName}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}_${Date.now()}.${fileExt}`;
    const filePath = `${folderPath}/${fileName}`;

    const { error: uploadError } = await supabase.storage.from(bucketName).upload(filePath, file, {
      contentType: mime,
      cacheControl: "31536000, immutable",
      upsert: false,
    });

    if (uploadError) {
      console.error(
        logCtx("[upload-media] storage-upload-failed", {
          level: "error",
          err: "Storage upload failed",
          bucket: bucketName,
          path: filePath,
        })
      );
      return reply(500, { error: "Storage upload failed. Please try again.", code: "STORAGE_UPLOAD" });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucketName).getPublicUrl(filePath);

    console.log(logCtx("[upload-media] success", { level: "info", url: publicUrl, path: filePath }));

    c.header("x-correlation-id", correlationId);
    return reply(200, {
      message: "File uploaded successfully",
      url: publicUrl,
      path: filePath,
      reused: false,
      code: "OK",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    console.error(logCtx("[upload-media] unhandled", { level: "error", err: msg }));
    c.header("x-correlation-id", correlationId);
    return reply(500, { error: "An internal error occurred. Please try again later.", code: "INTERNAL" });
  }
});

export default uploadRoutes;
