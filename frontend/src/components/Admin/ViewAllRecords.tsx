import { useState, useEffect } from "react";
import { useReadContract, useAccount } from "wagmi";
import hubArtifact from "../../abis/InstaDocHub.json";
import { retrieveJSON, downloadFile } from "../../lib/ipfs";

interface Record {
  patient: string;
  doctor: string;
  description: string;
  recordCID: string;
  encrypted: boolean;
  timestamp: number;
}

interface RecordWithDetails extends Record {
  patientName?: string;
  doctorName?: string;
  recordData?: any;
}

export default function ViewAllRecords() {
  const [records, setRecords] = useState<RecordWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState<string[]>([]);
  
  const { chain } = useAccount();
  const hubAddress = import.meta.env.VITE_HUB_ADDRESS;
  const hubAbi = hubArtifact.abi;

  // Get all records from contract
  const { data: contractRecords, refetch: refetchRecords, isLoading: isLoadingRecords } = useReadContract({
    address: hubAddress as `0x${string}`,
    abi: hubAbi,
    functionName: "getAllRecords",
  });

  // Load records from contract data
  useEffect(() => {
    const loadRecords = async () => {
      setLoading(true);
      try {
        if (contractRecords && Array.isArray(contractRecords)) {
          console.log('🔄 Loading records from contract:', contractRecords);
          
          const recordsWithDetails: RecordWithDetails[] = await Promise.all(
            contractRecords.map(async (record: any) => {
              const recordWithDetails: RecordWithDetails = {
                patient: record.patient,
                doctor: record.doctor,
                description: record.description,
                recordCID: record.recordCID,
                encrypted: record.encrypted,
                timestamp: Number(record.timestamp) * 1000, // Convert to milliseconds
                patientName: `Patient ${record.patient.slice(0, 6)}...${record.patient.slice(-4)}`,
                doctorName: `Dr. ${record.doctor.slice(0, 6)}...${record.doctor.slice(-4)}`,
              };

              return recordWithDetails;
            })
          );

          setRecords(recordsWithDetails);
        } else {
          setRecords([]);
        }
      } catch (error) {
        console.error('Error loading records:', error);
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };

    loadRecords();
  }, [contractRecords]);

  const handleViewRecord = async (record: RecordWithDetails) => {
    if (!record.recordCID) {
      alert("No record CID available");
      return;
    }

    setLoadingDetails(prev => [...prev, record.recordCID]);

    try {
      console.log('📥 Fetching record from IPFS:', record.recordCID);
      
      if (record.encrypted) {
        alert('This record is encrypted and requires patient consent and decryption keys to view.');
        return;
      }

      const recordData = await retrieveJSON(record.recordCID);
      console.log('✅ Record data retrieved:', recordData);

      // Update the record with the fetched data
      setRecords(prev => prev.map(r => 
        r.recordCID === record.recordCID ? { ...r, recordData } : r
      ));

    } catch (error) {
      console.error('❌ Failed to fetch record:', error);
      alert('Failed to load record data from IPFS. The record may not exist or IPFS may be unavailable.');
    } finally {
      setLoadingDetails(prev => prev.filter(cid => cid !== record.recordCID));
    }
  };

  const handleDownloadRecord = async (record: RecordWithDetails) => {
    if (!record.recordCID) {
      alert("No record CID available");
      return;
    }

    setLoadingDetails(prev => [...prev, record.recordCID]);

    try {
      console.log('📥 Downloading record file:', record.recordCID);
      const blob = await downloadFile(record.recordCID);
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `medical-record-${record.recordCID.slice(0, 8)}-${new Date(record.timestamp).toISOString().split('T')[0]}.${blob.type.includes('json') ? 'json' : 'bin'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('✅ Record downloaded successfully');
    } catch (error) {
      console.error('❌ Failed to download record:', error);
      alert('Failed to download record file from IPFS.');
    } finally {
      setLoadingDetails(prev => prev.filter(cid => cid !== record.recordCID));
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const isWrongNetwork = chain?.id !== 2484;
  const isLoading = isLoadingRecords || loading;

  return (
    <div className="space-y-4">
      {/* Network Warning */}
      {isWrongNetwork && (
        <div className="p-4 border border-red-400 bg-red-100 text-red-800 rounded">
          ⚠️ Please switch to U2U Testnet in your wallet
        </div>
      )}

      <div className="p-6 border rounded bg-white shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">All Medical Records</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => refetchRecords()}
              disabled={isLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? "Refreshing..." : "Refresh"}
            </button>
            <span className="bg-gray-100 px-2 py-1 rounded text-sm">
              {records.length} record(s)
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading records from blockchain...</p>
          </div>
        ) : records.length > 0 ? (
          <div className="space-y-4">
            {records.map((record, index) => (
              <div key={`${record.recordCID}-${index}`} className="border p-4 rounded bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Patient</p>
                    <p className="font-mono text-sm">{formatAddress(record.patient)}</p>
                    {record.patientName && (
                      <p className="text-xs text-gray-500">{record.patientName}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Doctor</p>
                    <p className="font-mono text-sm">{formatAddress(record.doctor)}</p>
                    {record.doctorName && (
                      <p className="text-xs text-gray-500">{record.doctorName}</p>
                    )}
                  </div>
                </div>
                
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-700">Description</p>
                  <p>{record.description}</p>
                </div>

                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-700">IPFS CID</p>
                  <p className="font-mono text-sm break-all">{record.recordCID}</p>
                </div>

                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-700">Date Created</p>
                  <p className="text-sm">{formatDate(record.timestamp)}</p>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    record.encrypted 
                      ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                      : 'bg-green-100 text-green-800 border border-green-200'
                  }`}>
                    {record.encrypted ? '🔒 Encrypted' : '🔓 Unencrypted'}
                  </span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs border border-blue-200">
                    📅 {new Date(record.timestamp).toLocaleDateString()}
                  </span>
                </div>

                {/* Record Data Display */}
                {record.recordData && (
                  <div className="mt-3 p-3 bg-white border rounded">
                    <p className="text-sm font-medium text-gray-700 mb-2">Record Content:</p>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                      {JSON.stringify(record.recordData, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    onClick={() => handleViewRecord(record)}
                    disabled={loadingDetails.includes(record.recordCID) || record.encrypted}
                    className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {loadingDetails.includes(record.recordCID) ? "Loading..." : "View Content"}
                  </button>
                  
                  <button
                    onClick={() => handleDownloadRecord(record)}
                    disabled={loadingDetails.includes(record.recordCID)}
                    className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {loadingDetails.includes(record.recordCID) ? "Downloading..." : "Download File"}
                  </button>
                  
                  {record.encrypted && (
                    <span className="text-xs text-gray-500 self-center">
                      Encrypted records require patient consent to view
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-2">No medical records found.</p>
            <p className="text-sm text-gray-500">
              Records will appear here once doctors add them for patients.
            </p>
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> These are all medical records stored on the blockchain. 
            Encrypted records require patient consent and decryption keys to access.
          </p>
        </div>
      </div>
    </div>
  );
}