import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { getPatientDetails, getPatientRecordsAddress } from "../../lib/contracts";
import { downloadEncryptedFile, downloadFile } from "../../lib/ipfs";
import { readContract } from "wagmi/actions";
import { config } from "../Shared/wallet";
import patientArtifact from "../../abis/PatientRecords.json";

interface MedicalRecord {
  doctor: string;
  description: string;
  ipfsHash: string;
  timestamp: number;
  encrypted: boolean;
}

export default function ViewRecords() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [secretKey, setSecretKey] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { address } = useAccount();

  const fetchRecords = async () => {
    if (!address) {
      alert("Please connect your wallet first");
      return;
    }

    setLoading(true);
    try {
      // Get patient records address
      const patientRecordsAddress = await getPatientRecordsAddress();
      
      // Get records using readContract
      const data = await readContract(config, {
        address: patientRecordsAddress,
        abi: patientArtifact.abi,
        functionName: "getRecords",
        args: [address],
      });
      
      // Convert BigInt to number and format records
      const formattedRecords: MedicalRecord[] = (data as any[]).map((rec: any) => ({
        doctor: rec.doctor,
        description: rec.description,
        ipfsHash: rec.ipfsHash,
        timestamp: Number(rec.timestamp) * 1000, // Convert to milliseconds
        encrypted: rec.encrypted
      }));
      
      setRecords(formattedRecords);
    } catch (err: any) {
      console.error("Error fetching records:", err);
      // Don't show an error alert for empty records - it's normal for new patients
      if (!err.message.includes("No records")) {
        alert("❌ Failed to fetch records: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (rec: MedicalRecord) => {
    try {
      setDownloading(rec.ipfsHash);

      let blob: Blob;
      if (rec.encrypted) {
        if (!secretKey) {
          alert("⚠️ Secret key required for decryption. Please ask your doctor for the decryption key.");
          return;
        }
        blob = await downloadEncryptedFile(rec.ipfsHash, secretKey);
      } else {
        blob = await downloadFile(rec.ipfsHash);
      }

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      // Create a meaningful filename
      const date = new Date(rec.timestamp).toISOString().split('T')[0];
      const fileExtension = blob.type.includes('pdf') ? 'pdf' : 
                           blob.type.includes('image') ? 'jpg' : 'file';
      a.download = `medical-record-${date}-${rec.description.slice(0, 20)}.${fileExtension}`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert("✅ File downloaded successfully!");
    } catch (err: any) {
      console.error("Download error:", err);
      if (rec.encrypted && err.message.includes("Decryption failed")) {
        alert("❌ Decryption failed. Please check your secret key and try again.");
      } else {
        alert("❌ Download failed: " + err.message);
      }
    } finally {
      setDownloading(null);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDoctorAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  useEffect(() => {
    if (address) {
      fetchRecords();
    }
  }, [address]);

  if (!address) {
    return (
      <div className="p-4 border rounded bg-yellow-50 border-yellow-200">
        <p className="text-yellow-800">Please connect your wallet to view your medical records</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 border rounded bg-white shadow max-w-4xl">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">My Medical Records</h3>
        <button
          onClick={fetchRecords}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded transition-colors"
        >
          {loading ? "Refreshing..." : "Refresh Records"}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading medical records...</span>
        </div>
      ) : (
        <div className="mt-4">
          {records.length > 0 ? (
            <>
              <div className="bg-blue-50 p-3 rounded border border-blue-200 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Encrypted records require a secret key provided by your doctor. 
                  Contact your doctor if you don't have the decryption key.
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Decryption Key (for encrypted records)</label>
                <input
                  type="password"
                  placeholder="Enter secret key provided by your doctor"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  className="border p-2 rounded w-full"
                />
              </div>

              <h4 className="text-lg font-medium mb-3">
                Your Medical Records ({records.length})
              </h4>
              
              <div className="space-y-3">
                {records.map((rec, idx) => (
                  <div
                    key={idx}
                    className="border p-4 rounded bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Description</p>
                        <p className="font-medium">{rec.description}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Doctor</p>
                        <p className="text-sm font-mono">{formatDoctorAddress(rec.doctor)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Date</p>
                        <p className="text-sm">{formatDate(rec.timestamp)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Security</p>
                        <p className={`text-sm ${rec.encrypted ? 'text-green-600' : 'text-gray-600'}`}>
                          {rec.encrypted ? "Encrypted 🔒" : "Unencrypted 🔓"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-500">
                        IPFS CID: {rec.ipfsHash.slice(0, 12)}...{rec.ipfsHash.slice(-8)}
                      </p>
                      
                      <button
                        onClick={() => handleDownload(rec)}
                        disabled={downloading === rec.ipfsHash}
                        className={`px-4 py-2 rounded text-white text-sm ${
                          rec.encrypted 
                            ? "bg-green-600 hover:bg-green-700" 
                            : "bg-blue-600 hover:bg-blue-700"
                        } disabled:bg-gray-400 transition-colors`}
                      >
                        {downloading === rec.ipfsHash
                          ? "Downloading..."
                          : rec.encrypted
                          ? "Download & Decrypt"
                          : "Download File"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-gray-600 mb-2">No Medical Records Yet</h4>
              <p className="text-gray-500 max-w-md mx-auto">
                Your medical records will appear here after your consultations. 
                Doctors will upload your records, prescriptions, and test results after each appointment.
              </p>
              <div className="mt-4 text-sm text-gray-400">
                <p>📋 Records include: Consultation notes, prescriptions, lab results</p>
                <p>🔒 Some records may be encrypted for your privacy</p>
                <p>📤 Doctors upload records after each appointment</p>
              </div>
            </div>
          )}
        </div>
      )}

      {records.length > 0 && (
        <div className="text-xs text-gray-500 mt-4">
          <p>All records are stored securely on IPFS. Encrypted files require the correct secret key to decrypt.</p>
        </div>
      )}
    </div>
  );
}