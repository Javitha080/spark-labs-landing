/**
 * Upload rules shared by the CMS image pickers (avatar, leadership photo).
 *
 * The `avatars` and `leadership` buckets are public and Supabase serves stored
 * objects verbatim with the MIME type recorded at upload time. A plain
 * `file.type.startsWith("image/")` check therefore admitted `image/svg+xml`,
 * which a browser renders as active content when the object URL is opened
 * directly - the same stored-XSS vector `/api/upload-media` already refuses.
 *
 * The stored extension is derived from the validated MIME rather than the
 * client-supplied file name, so `photo.JPEG` is stored as `.jpg` and
 * `payload.html` (declared `image/png`) is never stored as `.html`.
 */

const ALLOWED_IMAGE_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/heic": "heic",
  "image/heif": "heif",
};

const EXT_TO_IMAGE_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
};

const ALLOWED_LABEL = "PNG, JPG, GIF, WEBP, AVIF or HEIC";

/**
 * Value for a native `<input type="file" accept>`. Narrower than `image/*` so
 * the OS picker does not offer SVG/XML that the validator then rejects.
 */
export const ACCEPT_IMAGE_ATTR =
  "image/png,image/jpeg,image/gif,image/webp,image/avif,image/heic,image/heif";

/**
 * Flat result rather than a discriminated union: the app compiles with
 * `strictNullChecks: false`, under which `if (!result.ok)` does not narrow
 * `result` to the failure branch.
 */
export interface ImageValidation {
  ok: boolean;
  /** User-facing message; empty when `ok` is true. */
  error: string;
  /** Validated MIME type to store the object with; empty when `ok` is false. */
  mime: string;
  /** Canonical extension for `mime`; empty when `ok` is false. */
  ext: string;
}

export function validateImageUpload(
  file: { name: string; type: string; size: number },
  maxBytes: number,
): ImageValidation {
  const fail = (error: string): ImageValidation => ({ ok: false, error, mime: "", ext: "" });

  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const declared = (file.type || "").toLowerCase();

  // Reject SVG/XML on either signal: a caller can rename `evil.svg` to `.png`
  // and still declare `image/svg+xml`, or the reverse.
  if (ext === "svg" || ext === "xml" || declared.includes("svg") || declared.includes("xml")) {
    return fail("SVG/XML images are not allowed. Please use PNG, JPG, WEBP or AVIF.");
  }

  // Mobile and drag-drop sources sometimes report `""` or octet-stream.
  const mime = ALLOWED_IMAGE_EXT[declared] ? declared : EXT_TO_IMAGE_MIME[ext] || declared;

  if (!ALLOWED_IMAGE_EXT[mime]) {
    return fail(`That file type is not supported. Please use ${ALLOWED_LABEL}.`);
  }

  if (file.size > maxBytes) {
    const sizeMb = (file.size / 1024 / 1024).toFixed(1);
    const limitMb = Math.round(maxBytes / 1024 / 1024);
    return fail(`Image is ${sizeMb} MB; the limit is ${limitMb} MB.`);
  }

  return { ok: true, error: "", mime, ext: ALLOWED_IMAGE_EXT[mime] };
}
