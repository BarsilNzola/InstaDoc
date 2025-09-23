import { Web3Storage } from "web3.storage";
import CryptoJS from "crypto-js";

const client = new Web3Storage({ token: import.meta.env.VITE_WEB3_STORAGE_TOKEN });

export async function uploadEncryptedFile(file: File, secretKey: string) {
	const reader = new fileReader();
	return new Promise<string>((resolve, reject) => {
		reader.onload = async () => {
			try {
				const wordArray = CryptoJS.lib.wordArray.create(reader.result as ArrayBuffer);
				const encrypted = CryptoJS.AES.encrypt(wordArray, secretKey).toString();
				const blob = new Blob([encrypted], { type: "text/plain" });

				const cid = await client.put([new File([blob], file.name)]);
				resolve(cid);
			} catch (err) {
				reject(err);
			}
		};
		reader.readAsArrayBuffer(file);
	});
}