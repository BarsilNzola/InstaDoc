import { Web3Storage } from "web3.storage";
import CryptoJS from "crypto-js";

const client = new Web3Storage({
  token: import.meta.env.VITE_WEB3_STORAGE_TOKEN,
});

/**
 * Upload a plain file to Web3.Storage
 */
export async function uploadFile(file: File): Promise<string> {
  try {
    const cid = await client.put([file], { wrapWithDirectory: false });
    return cid;
  } catch (err: any) {
    console.error("Web3.Storage upload failed:", err);
    throw new Error("Upload failed: " + err.message);
  }
}

/**
 * Upload an AES-encrypted file to Web3.Storage
 */
export async function uploadEncryptedFile(file: File, secretKey: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        // Convert file to WordArray
        const wordArray = CryptoJS.lib.WordArray.create(reader.result as ArrayBuffer);

        // Encrypt
        const encrypted = CryptoJS.AES.encrypt(wordArray, secretKey).toString();

        // Store as Blob
        const blob = new Blob([encrypted], { type: "text/plain" });

        // Upload encrypted blob
        const cid = await client.put([new File([blob], file.name)], {
          wrapWithDirectory: false,
        });

        resolve(cid);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Download a plain file from IPFS
 */
export async function downloadFile(cid: string): Promise<Blob> {
  try {
    const res = await fetch(`https://w3s.link/ipfs/${cid}`);
    if (!res.ok) throw new Error("Failed to fetch file from IPFS");
    return await res.blob();
  } catch (err: any) {
    console.error("Download failed:", err);
    throw new Error("Download failed: " + err.message);
  }
}

/**
 * Download and decrypt an AES-encrypted file from IPFS
 */
export async function downloadEncryptedFile(cid: string, secretKey: string): Promise<Blob> {
  try {
    const res = await fetch(`https://w3s.link/ipfs/${cid}`);
    if (!res.ok) throw new Error("Failed to fetch encrypted file");

    const encryptedText = await res.text();

    // Decrypt
    const decrypted = CryptoJS.AES.decrypt(encryptedText, secretKey);

    // Convert WordArray → Uint8Array → Blob
    const typedArray = wordArrayToUint8Array(decrypted);
    const blob = new Blob([typedArray]);

    return blob;
  } catch (err: any) {
    console.error("Decryption failed:", err);
    throw new Error("Decryption failed: " + err.message);
  }
}

/**
 * Helper: Convert WordArray → Uint8Array
 */
function wordArrayToUint8Array(wordArray: CryptoJS.lib.WordArray): Uint8Array {
  const words = wordArray.words;
  const sigBytes = wordArray.sigBytes;
  const u8 = new Uint8Array(sigBytes);
  for (let i = 0; i < sigBytes; i++) {
    u8[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  }
  return u8;
}
