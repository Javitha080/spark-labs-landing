/**
 * Utility to calculate SHA-256 hash of a file for duplicate detection.
 * Used by the Worker upload-media endpoint.
 */
export async function calculateFileHash(arrayBuffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
