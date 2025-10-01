import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { uploadEncryptedFile, uploadFile } from "../../lib/ipfs";
import { getPatientRecordsAddress } from "../../lib/contracts";
import patientArtifact from "../../abis/PatientRecords.json";

interface UploadRecordProps {
  patientAddress?: string;
  onRecordUploaded?: () => void;
}

export default function UploadRecord({ patientAddress, onRecordUploaded }: UploadRecordProps) {
  const [file, setFile] = useState<File | null>(null);
  const [patientAddr, setPatientAddr] = useState(patientAddress || "");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [encrypt, setEncrypt] = useState(true);
  const [secretKey, setSecretKey] = useState("");
  const { address } = useAccount();

  const { writeContract: addRecord, data: txHash, isPending: isWriting } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Handle successful transaction
  useEffect(() => {
    if (isConfirmed) {
      setStatus(`✅ Record uploaded successfully for patient: ${patientAddr}`);
      setFile(null);
      setDescription("");
      setSecretKey("");
      setLoading(false);
      onRecordUploaded?.();
    }
  }, [isConfirmed, patientAddr, onRecordUploaded]);

  const handleUpload = async () => {
    if (!file || !patientAddr) {
      setStatus("⚠️ Please provide patient address and select a file.");
      return;
    }

    if (encrypt && !secretKey) {
      setStatus("⚠️ Secret key is required for encrypted upload.");
      return;
    }

    if (!address) {
      setStatus("⚠️ Please connect your wallet first.");
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      let cid: string;

      if (encrypt) {
        cid = await uploadEncryptedFile(file, secretKey);
      } else {
        cid = await uploadFile(file);
      }

      const patientRecordsAddress = await getPatientRecordsAddress();
      
      addRecord({
        address: patientRecordsAddress,
        abi: patientArtifact.abi,
        functionName: "addRecord",
        args: [
          patientAddr,        // patient address
          address,           // doctor address (msg.sender)
          description || "Medical Record",
          cid,
          encrypt
        ],
      });

    } catch (err: any) {
      console.error("Upload error:", err);
      setStatus("❌ " + (err.message || "Failed to upload record"));
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded shadow bg-white max-w-md">
      <h3 className="text-lg font-semibold">Upload Patient Record</h3>
      
      <div>
        <label className="block text-sm font-medium mb-1">Patient Address</label>
        <input
          type="text"
          placeholder="0x..."
          value={patientAddr}
          onChange={(e) => setPatientAddr(e.target.value)}
          className="border p-2 rounded w-full"
          disabled={!!patientAddress}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <input
          type="text"
          placeholder="Record description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="border p-2 rounded w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Medical File</label>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full border p-2 rounded"
          accept=".pdf,.jpg,.jpeg,.png,.txt,.doc,.docx"
        />
        {file && <p className="text-sm text-gray-600 mt-1">Selected: {file.name}</p>}
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="encrypt"
          checked={encrypt}
          onChange={() => setEncrypt(!encrypt)}
          className="rounded"
        />
        <label htmlFor="encrypt" className="text-sm font-medium">
          Encrypt file for privacy
        </label>
      </div>

      {encrypt && (
        <div>
          <label className="block text-sm font-medium mb-1">Encryption Key</label>
          <input
            type="password"
            placeholder="Enter secret key for encryption"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            className="border p-2 rounded w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            Share this key securely with the patient for decryption
          </p>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={loading || isWriting || isConfirming || !file || !patientAddr}
        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded w-full transition-colors"
      >
        {loading || isWriting || isConfirming ? "Uploading..." : "Upload Patient Record"}
      </button>

      {status && (
        <p className={`text-sm p-2 rounded ${
          status.includes("✅") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
        }`}>
          {status}
        </p>
      )}
    </div>
  );
}