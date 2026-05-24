/**
 * Utility to calculate SHA-256 hash of a file for duplicate detection
 */
export async function calculateFileHash(input: File | Blob | ArrayBuffer): Promise<string> {
    const arrayBuffer = input instanceof ArrayBuffer ? input : await input.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}
