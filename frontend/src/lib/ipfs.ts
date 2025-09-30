import lighthouse from '@lighthouse-web3/sdk';
import CryptoJS from "crypto-js";

console.log('🔧 IPFS module loading...');

// Initialize Lighthouse client with detailed logging
const getStorageClient = (): string => {
  console.log('🔄 Getting Lighthouse client...');
  
  const apiKey = import.meta.env.VITE_LIGHTHOUSE_STORAGE_TOKEN;
  
  console.log('📋 Environment check:');
  console.log('  - VITE_LIGHTHOUSE_STORAGE_TOKEN exists:', !!apiKey);
  console.log('  - API Key length:', apiKey?.length);
  console.log('  - API Key preview:', apiKey ? `${apiKey.substring(0, 10)}...` : 'undefined');
  
  if (!apiKey) {
    const error = "Lighthouse API key not found in VITE_LIGHTHOUSE_STORAGE_TOKEN environment variable";
    console.error('❌', error);
    throw new Error(error);
  }
  
  console.log('✅ API key format looks valid');
  return apiKey;
};

/**
 * Upload a plain file to Lighthouse Storage
 */
export async function uploadFile(file: File): Promise<string> {
  console.log('🔄 uploadFile called:');
  console.log('  - File name:', file.name);
  console.log('  - File size:', file.size, 'bytes');
  console.log('  - File type:', file.type);
  
  try {
    const apiKey = getStorageClient();
    console.log('📤 Uploading file to Lighthouse...');
    
    const response = await lighthouse.upload(file, apiKey);
    
    console.log('✅ File upload successful!');
    console.log('  - CID:', response.data.Hash);
    console.log('  - View at: https://gateway.lighthouse.storage/ipfs/' + response.data.Hash);
    
    return response.data.Hash;
  } catch (err: any) {
    console.error('❌ File upload failed:');
    console.error('  - Error name:', err.name);
    console.error('  - Error message:', err.message);
    console.error('  - Error stack:', err.stack);
    
    if (err.message.includes('401') || err.message.includes('Unauthorized')) {
      const error = "Invalid Lighthouse API key (401 Unauthorized). Please check your VITE_LIGHTHOUSE_STORAGE_TOKEN in .env file";
      console.error('❌', error);
      throw new Error(error);
    } else if (err.message.includes('network') || err.message.includes('fetch')) {
      const error = "Network error. Please check your internet connection";
      console.error('❌', error);
      throw new Error(error);
    } else {
      const error = `Upload failed: ${err.message}`;
      console.error('❌', error);
      throw new Error(error);
    }
  }
}

/**
 * Upload an AES-encrypted file to Lighthouse Storage
 */
export async function uploadEncryptedFile(file: File, secretKey: string): Promise<string> {
  console.log('🔄 uploadEncryptedFile called:');
  console.log('  - File name:', file.name);
  console.log('  - File size:', file.size, 'bytes');
  console.log('  - Secret key length:', secretKey.length);
  
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        console.log('🔐 Encrypting file...');
        const apiKey = getStorageClient();
        
        // Convert file to WordArray
        const wordArray = CryptoJS.lib.WordArray.create(reader.result as ArrayBuffer);

        // Encrypt
        const encrypted = CryptoJS.AES.encrypt(wordArray, secretKey).toString();
        console.log('  - Encryption successful, encrypted size:', encrypted.length);

        // Upload encrypted text
        console.log('📤 Uploading encrypted file...');
        const response = await lighthouse.uploadText(encrypted, apiKey);
        
        console.log('✅ Encrypted file upload successful!');
        console.log('  - CID:', response.data.Hash);
        console.log('  - View at: https://gateway.lighthouse.storage/ipfs/' + response.data.Hash);
        
        resolve(response.data.Hash);
      } catch (err) {
        console.error('❌ Encrypted upload failed:', err);
        reject(err);
      }
    };

    reader.onerror = () => {
      const error = 'File reading failed';
      console.error('❌', error);
      reject(new Error(error));
    };
    
    console.log('📖 Reading file for encryption...');
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Download a plain file from IPFS
 */
export async function downloadFile(cid: string): Promise<Blob> {
  console.log('🔄 downloadFile called with CID:', cid);
  
  try {
    // Try multiple IPFS gateways
    const gateways = [
      `https://gateway.lighthouse.storage/ipfs/${cid}`, // Lighthouse gateway
      `https://nftstorage.link/ipfs/${cid}`,
      `https://w3s.link/ipfs/${cid}`,
      `https://ipfs.io/ipfs/${cid}`,
      `https://cloudflare-ipfs.com/ipfs/${cid}`,
      `https://dweb.link/ipfs/${cid}`
    ];

    console.log('🔍 Trying IPFS gateways...');
    
    for (const gateway of gateways) {
      try {
        console.log(`  - Trying: ${gateway}`);
        const res = await fetch(gateway);
        console.log(`    - Status: ${res.status} ${res.statusText}`);
        
        if (res.ok) {
          console.log('✅ Download successful from:', gateway);
          const blob = await res.blob();
          console.log(`  - Blob size: ${blob.size} bytes`);
          console.log(`  - Blob type: ${blob.type}`);
          return blob;
        }
      } catch (error) {
        // Fixed: Properly typed error handling
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`    - Gateway failed: ${errorMessage}`);
      }
    }

    throw new Error("All IPFS gateways failed");
  } catch (err: any) {
    console.error('❌ Download failed:', err);
    throw new Error("Download failed: " + err.message);
  }
}

/**
 * Download and decrypt an AES-encrypted file from IPFS
 */
export async function downloadEncryptedFile(cid: string, secretKey: string): Promise<Blob> {
  console.log('🔄 downloadEncryptedFile called:');
  console.log('  - CID:', cid);
  console.log('  - Secret key length:', secretKey.length);
  
  try {
    console.log('📥 Downloading encrypted file...');
    const encryptedText = await (await downloadFile(cid)).text();
    console.log('  - Encrypted text size:', encryptedText.length, 'characters');

    console.log('🔓 Decrypting file...');
    const decrypted = CryptoJS.AES.decrypt(encryptedText, secretKey);
    console.log('  - Decryption successful');

    // Convert WordArray → Uint8Array → Blob
    const typedArray = wordArrayToUint8Array(decrypted);
    const blob = new Blob([typedArray]);
    
    console.log('✅ Decryption successful!');
    console.log('  - Decrypted blob size:', blob.size, 'bytes');
    
    return blob;
  } catch (err: any) {
    console.error('❌ Decryption failed:', err);
    throw new Error("Decryption failed: " + err.message);
  }
}

/**
 * Store JSON data directly (useful for doctor profiles)
 */
export async function storeJSON(data: any): Promise<string> {
  console.log('🔄 storeJSON called with data:', data);
  
  try {
    const apiKey = getStorageClient();
    console.log('📤 Uploading JSON to Lighthouse...');
    
    const jsonString = JSON.stringify(data);
    console.log('  - JSON size:', jsonString.length, 'bytes');
    console.log('  - JSON preview:', jsonString.substring(0, 100) + '...');
    
    console.log('  - Calling lighthouse.uploadText()...');
    const response = await lighthouse.uploadText(jsonString, apiKey);
    
    console.log('✅ JSON upload successful!');
    console.log('  - CID:', response.data.Hash);
    console.log('  - View at: https://gateway.lighthouse.storage/ipfs/' + response.data.Hash);
    
    return response.data.Hash;
  } catch (err: any) {
    console.error('❌ JSON upload failed:');
    console.error('  - Error name:', err.name);
    console.error('  - Error message:', err.message);
    console.error('  - Error stack:', err.stack);
    
    if (err.message.includes('401') || err.message.includes('Unauthorized')) {
      const error = "Invalid Lighthouse API key (401 Unauthorized). Please check your VITE_LIGHTHOUSE_STORAGE_TOKEN in .env file";
      console.error('❌', error);
      throw new Error(error);
    } else if (err.message.includes('network') || err.message.includes('fetch')) {
      const error = "Network error. Please check your internet connection";
      console.error('❌', error);
      throw new Error(error);
    } else {
      const error = `JSON upload failed: ${err.message}`;
      console.error('❌', error);
      throw new Error(error);
    }
  }
}

/**
 * Retrieve and parse JSON data from IPFS
 */
export async function retrieveJSON(cid: string): Promise<any> {
  console.log('🔄 retrieveJSON called with CID:', cid);
  
  try {
    const url = `https://gateway.lighthouse.storage/ipfs/${cid}`;
    console.log('📥 Fetching from:', url);
    
    const response = await fetch(url);
    console.log('  - Response status:', response.status);
    console.log('  - Response ok:', response.ok);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ JSON retrieval successful!');
    console.log('  - Data type:', typeof data);
    console.log('  - Data:', data);
    
    return data;
  } catch (err: any) {
    console.error('❌ JSON retrieval failed:');
    console.error('  - Error:', err.message);
    throw new Error("JSON retrieval failed: " + err.message);
  }
}

/**
 * Helper: Convert WordArray → Uint8Array
 */
function wordArrayToUint8Array(wordArray: CryptoJS.lib.WordArray): Uint8Array {
  console.log('🔄 Converting WordArray to Uint8Array...');
  console.log('  - WordArray sigBytes:', wordArray.sigBytes);
  
  const words = wordArray.words;
  const sigBytes = wordArray.sigBytes;
  const u8 = new Uint8Array(sigBytes);
  
  for (let i = 0; i < sigBytes; i++) {
    u8[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  }
  
  console.log('✅ Conversion successful');
  console.log('  - Uint8Array length:', u8.length);
  
  return u8;
}

/**
 * Test function to verify IPFS connectivity
 */
export async function testIPFSConnection(): Promise<boolean> {
  console.log('🧪 Testing IPFS connection...');
  
  try {
    const testData = { 
      test: true, 
      message: "IPFS connection test",
      timestamp: Date.now(),
      version: "1.0.0"
    };
    
    console.log('📤 Testing upload...');
    const cid = await storeJSON(testData);
    
    console.log('📥 Testing download...');
    const retrievedData = await retrieveJSON(cid);
    
    console.log('🔍 Verifying data integrity...');
    const isValid = retrievedData.test === true && 
                   retrievedData.message === testData.message;
    
    if (isValid) {
      console.log('✅ IPFS connection test PASSED!');
      console.log('  - Upload: ✓');
      console.log('  - Download: ✓');
      console.log('  - Integrity: ✓');
      return true;
    } else {
      console.error('❌ IPFS connection test FAILED - data integrity issue');
      return false;
    }
  } catch (error: any) {
    console.error('❌ IPFS connection test FAILED:', error.message);
    return false;
  }
}

console.log('✅ IPFS module loaded successfully');