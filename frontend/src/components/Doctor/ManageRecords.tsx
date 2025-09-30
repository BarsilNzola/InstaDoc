import { useEffect, useState } from "react";
import { getPatientRecordsContract } from "../../lib/contracts";
import { downloadEncryptedFile, downloadFile } from "../../lib/ipfs";
import { useAccount } from "wagmi";

interface MedicalRecord {
  doctor: string;
  description: string;
  ipfsHash: string;
  timestamp: number;
  encrypted: boolean;
}

export default function ManageRecords() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [patientAddr, setPatientAddr] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const { address } = useAccount();

  const fetchRecords = async () => {
    if (!patientAddr) {
      alert("Please enter a patient address");
      return;
    }

    setLoading(true);
    try {
      const contract = await getPatientRecordsContract();
      const data = await contract.getRecords(patientAddr);
      
      // Convert BigInt to number for timestamp and format records
      const formattedRecords: MedicalRecord[] = data.map((rec: any) => ({
        doctor: rec.doctor,
        description: rec.description,
        ipfsHash: rec.ipfsHash,
        timestamp: Number(rec.timestamp) * 1000, // Convert to milliseconds
        encrypted: rec.encrypted
      }));
      
      setRecords(formattedRecords);
    } catch (err: any) {
      console.error("Error fetching records:", err);
      alert("❌ Failed to fetch records: " + err.message);
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
          alert("⚠️ Secret key required for decryption");
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
      a.download = `medical-record-${new Date(rec.timestamp).toISOString().split('T')[0]}.${blob.type.includes('pdf') ? 'pdf' : 'file'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Download error:", err);
      alert("❌ " + err.message);
    } finally {
      setDownloading(null);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-4 p-4 border rounded bg-white shadow max-w-4xl">
      <h3 className="text-xl font-semibold">Manage Patient Records</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Patient Wallet Address</label>
          <input
            type="text"
            placeholder="0x..."
            value={patientAddr}
            onChange={(e) => setPatientAddr(e.target.value)}
            className="border p-2 rounded w-full"
          />
        </div>
        
        <div className="flex items-end">
          <button
            onClick={fetchRecords}
            disabled={loading || !patientAddr}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded w-full transition-colors"
          >
            {loading ? "Loading..." : "Load Records"}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Decryption Key (for encrypted records)</label>
        <input
          type="password"
          placeholder="Enter secret key provided by doctor"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          className="border p-2 rounded w-full"
        />
      </div>

      <div className="mt-4">
        <h4 className="text-lg font-medium mb-3">
          Patient Records ({records.length})
        </h4>
        
        {records.length > 0 ? (
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
                    <p className="text-sm font-mono">{rec.doctor.slice(0, 8)}...{rec.doctor.slice(-6)}</p>
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
        ) : (
          <div className="text-center py-8 text-gray-500">
            {loading ? "Loading records..." : "No records found for this patient address"}
          </div>
        )}
      </div>
    </div>
  );
}