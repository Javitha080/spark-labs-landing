/**
 * Generate a browser fingerprint for learner identity.
 * Uses non-sensitive browser properties to create a semi-unique identifier.
 */
export function generateFingerprint(): string {
  const components = [
    navigator.userAgent,
    `${screen.width}x${screen.height}`,
    `${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
    navigator.hardwareConcurrency?.toString() || "unknown",
  ];

  const raw = components.join("|");

  // Simple hash (djb2)
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash + raw.charCodeAt(i)) & 0xffffffff;
  }

  return `fp_${Math.abs(hash).toString(36)}`;
}
