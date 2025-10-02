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

  const isSubmitting = loading || isWriting || isConfirming;
  const isDisabled = isSubmitting || !file || !patientAddr;

  return (
    <div className="space-y-6 p-6 border rounded-xl shadow-md" style={{ backgroundColor: '#f2ead3', maxWidth: '500px' }}>
      <div className="flex items-center space-x-3 mb-2">
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#344f1f' }}>
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold" style={{ color: '#344f1f' }}>Upload Patient Record</h3>
      </div>
      
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: '#344f1f' }}>Patient Address</label>
        <input
          type="text"
          placeholder="0x..."
          value={patientAddr}
          onChange={(e) => setPatientAddr(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-opacity-50 disabled:opacity-50"
          style={{ backgroundColor: '#f9f5f0' }}
          disabled={!!patientAddress}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: '#344f1f' }}>Description</label>
        <input
          type="text"
          placeholder="Record description (e.g., Lab Results, X-Ray Report, Consultation Notes)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-opacity-50"
          style={{ backgroundColor: '#f9f5f0' }}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: '#344f1f' }}>Medical File</label>
        <div className="border-2 border-dashed rounded-lg p-4 transition-all duration-300 hover:border-solid"
          style={{ borderColor: '#d6d3d1', backgroundColor: '#f9f5f0' }}>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full cursor-pointer"
            accept=".pdf,.jpg,.jpeg,.png,.txt,.doc,.docx"
          />
        </div>
        {file && (
          <div className="mt-2 p-3 rounded-lg flex items-center space-x-3" style={{ backgroundColor: '#f0fdf4' }}>
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium" style={{ color: '#166534' }}>Selected: {file.name}</span>
          </div>
        )}
        <p className="text-sm mt-2" style={{ color: '#344f1f', opacity: 0.7 }}>
          Supported formats: PDF, JPG, PNG, TXT, DOC, DOCX
        </p>
      </div>

      <div className="flex items-center space-x-3 p-3 rounded-lg" style={{ backgroundColor: '#f9f5f0' }}>
        <input
          type="checkbox"
          id="encrypt"
          checked={encrypt}
          onChange={() => setEncrypt(!encrypt)}
          className="w-5 h-5 rounded focus:ring-2 focus:ring-opacity-50"
          style={{ accentColor: '#344f1f' }}
        />
        <label htmlFor="encrypt" className="text-sm font-semibold flex items-center space-x-2" style={{ color: '#344f1f' }}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Encrypt file for patient privacy</span>
        </label>
      </div>

      {encrypt && (
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: '#344f1f' }}>Encryption Key</label>
          <input
            type="password"
            placeholder="Enter secret key for encryption"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-opacity-50 font-mono"
            style={{ backgroundColor: '#f9f5f0' }}
          />
          <div className="flex items-center space-x-2 mt-2 p-2 rounded-lg" style={{ backgroundColor: '#fef3c7' }}>
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs" style={{ color: '#92400e' }}>
              Share this key securely with the patient for decryption
            </p>
          </div>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={isDisabled}
        className="w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
        style={{ 
          backgroundColor: isDisabled ? '#9ca3af' : '#f4991a', 
          color: '#ffffff'
        }}
        onMouseOver={(e) => {
          if (!isDisabled) {
            e.currentTarget.style.backgroundColor = '#e08a17';
          }
        }}
        onMouseOut={(e) => {
          if (!isDisabled) {
            e.currentTarget.style.backgroundColor = '#f4991a';
          }
        }}
      >
        {isSubmitting ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>Uploading...</span>
          </>
        ) : (
          <>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span>Upload Patient Record</span>
          </>
        )}
      </button>

      {status && (
        <div 
          className={`p-4 rounded-lg border ${
            status.includes("✅") 
              ? { backgroundColor: '#f0f9f0', borderColor: '#86efac', color: '#166534' }
              : { backgroundColor: '#fef2f2', borderColor: '#fca5a5', color: '#dc2626' }
          }`}
          style={{
            backgroundColor: status.includes("✅") ? '#f0f9f0' : '#fef2f2',
            borderColor: status.includes("✅") ? '#86efac' : '#fca5a5',
            color: status.includes("✅") ? '#166534' : '#dc2626'
          }}
        >
          <div className="flex items-center space-x-2">
            {status.includes("✅") ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            )}
            <span className="font-medium">{status}</span>
          </div>
        </div>
      )}
    </div>
  );
}