import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { getPatientRecordsAddress } from "../../lib/contracts";
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
      <div 
        className="p-4 border rounded-lg shadow-sm"
        style={{
          backgroundColor: '#fffbeb',
          borderColor: '#fcd34d',
          color: '#d97706'
        }}
      >
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Please connect your wallet to view your medical records</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 border rounded-xl shadow-md" style={{ backgroundColor: '#f2ead3', maxWidth: '900px' }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#344f1f' }}>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold" style={{ color: '#344f1f' }}>My Medical Records</h3>
        </div>
        <button
          onClick={fetchRecords}
          disabled={loading}
          className="px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:shadow-md disabled:opacity-50 flex items-center space-x-2"
          style={{ backgroundColor: '#344f1f', color: '#ffffff' }}
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Refreshing...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh Records</span>
            </>
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#344f1f' }}></div>
          <span className="ml-3 text-lg" style={{ color: '#344f1f', opacity: 0.8 }}>Loading medical records...</span>
        </div>
      ) : (
        <div className="mt-4">
          {records.length > 0 ? (
            <>
              <div 
                className="p-4 rounded-lg border mb-6"
                style={{ backgroundColor: '#eff6ff', borderColor: '#93c5fd', color: '#1e40af' }}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium">
                    <strong>Note:</strong> Encrypted records require a secret key provided by your doctor. 
                    Contact your doctor if you don't have the decryption key.
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2" style={{ color: '#344f1f' }}>Decryption Key</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="password"
                    placeholder="Enter secret key provided by your doctor"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    className="flex-1 p-3 border border-gray-300 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-opacity-50 font-mono"
                    style={{ backgroundColor: '#f9f5f0' }}
                  />
                  <div className="flex items-center space-x-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#fef3c7' }}>
                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-xs font-medium" style={{ color: '#92400e' }}>For encrypted records</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-6">
                <h4 className="text-xl font-bold" style={{ color: '#344f1f' }}>
                  Your Medical Records
                </h4>
                <span 
                  className="px-4 py-2 rounded-full font-bold text-lg"
                  style={{ backgroundColor: '#f9f5f0', color: '#344f1f' }}
                >
                  {records.length} record{records.length !== 1 ? 's' : ''}
                </span>
              </div>
              
              <div className="space-y-4">
                {records.map((rec, idx) => (
                  <div
                    key={idx}
                    className="border p-6 rounded-xl transition-all duration-300 hover:shadow-md"
                    style={{ backgroundColor: '#f9f5f0', borderColor: '#d6d3d1' }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
                      <div>
                        <p className="text-sm font-semibold mb-2" style={{ color: '#344f1f', opacity: 0.8 }}>Description</p>
                        <p className="font-bold text-lg" style={{ color: '#344f1f' }}>{rec.description}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold mb-2" style={{ color: '#344f1f', opacity: 0.8 }}>Doctor</p>
                        <p className="font-mono text-lg" style={{ color: '#344f1f' }}>{formatDoctorAddress(rec.doctor)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold mb-2" style={{ color: '#344f1f', opacity: 0.8 }}>Date</p>
                        <p className="text-lg" style={{ color: '#344f1f' }}>{formatDate(rec.timestamp)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold mb-2" style={{ color: '#344f1f', opacity: 0.8 }}>Security</p>
                        <div className="flex items-center space-x-2">
                          {rec.encrypted ? (
                            <span className="px-3 py-1 rounded-full text-sm font-semibold flex items-center space-x-2"
                              style={{ backgroundColor: '#f3e8ff', color: '#7c3aed' }}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              <span>Encrypted</span>
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-sm font-semibold flex items-center space-x-2"
                              style={{ backgroundColor: '#f0fdf4', color: '#166534' }}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                              </svg>
                              <span>Unencrypted</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <p className="text-sm font-mono" style={{ color: '#344f1f', opacity: 0.7 }}>
                          IPFS: {rec.ipfsHash.slice(0, 12)}...{rec.ipfsHash.slice(-8)}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => handleDownload(rec)}
                        disabled={downloading === rec.ipfsHash}
                        className="px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:shadow-lg disabled:opacity-50 flex items-center space-x-2"
                        style={{ 
                          backgroundColor: rec.encrypted ? '#7c3aed' : '#f4991a', 
                          color: '#ffffff'
                        }}
                      >
                        {downloading === rec.ipfsHash ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Downloading...</span>
                          </>
                        ) : rec.encrypted ? (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <span>Download & Decrypt</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span>Download File</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f9f5f0' }}>
                <svg className="w-10 h-10" style={{ color: '#f4991a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 className="text-xl mb-3" style={{ color: '#344f1f', opacity: 0.8 }}>No Medical Records Yet</h4>
              <p className="text-lg mb-6" style={{ color: '#344f1f', opacity: 0.6 }}>
                Your medical records will appear here after your consultations. 
                Doctors will upload your records, prescriptions, and test results after each appointment.
              </p>
              <div className="space-y-2 text-sm" style={{ color: '#344f1f', opacity: 0.7 }}>
                <div className="flex items-center justify-center space-x-2">
                  <span>📋</span>
                  <span>Records include: Consultation notes, prescriptions, lab results</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <span>🔒</span>
                  <span>Some records may be encrypted for your privacy</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <span>📤</span>
                  <span>Doctors upload records after each appointment</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {records.length > 0 && (
        <div 
          className="mt-6 p-4 border rounded-lg"
          style={{ backgroundColor: '#f9f5f0', borderColor: '#d6d3d1' }}
        >
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" style={{ color: '#344f1f' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm" style={{ color: '#344f1f', opacity: 0.7 }}>
              All records are stored securely on IPFS. Encrypted files require the correct secret key to decrypt.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}