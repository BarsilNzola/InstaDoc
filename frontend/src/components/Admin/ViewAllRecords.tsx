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
    <div className="space-y-6">
      {/* Network Warning */}
      {isWrongNetwork && (
        <div 
          className="p-4 border rounded-lg shadow-sm"
          style={{
            backgroundColor: '#fef2f2',
            borderColor: '#fca5a5',
            color: '#dc2626'
          }}
        >
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>Please switch to U2U Testnet in your wallet</span>
          </div>
        </div>
      )}

      <div className="p-6 border rounded-xl shadow-md" style={{ backgroundColor: '#f2ead3' }}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#344f1f' }}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold" style={{ color: '#344f1f' }}>All Medical Records</h3>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => refetchRecords()}
              disabled={isLoading}
              className="px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:shadow-md disabled:opacity-50 flex items-center space-x-2"
              style={{ backgroundColor: '#344f1f', color: '#ffffff' }}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Refreshing...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Refresh</span>
                </>
              )}
            </button>
            <span 
              className="px-4 py-2 rounded-full font-bold text-lg"
              style={{ backgroundColor: '#f9f5f0', color: '#344f1f' }}
            >
              {records.length} record(s)
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="flex items-center justify-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: '#344f1f' }}></div>
              <p className="text-lg" style={{ color: '#344f1f', opacity: 0.8 }}>Loading records from blockchain...</p>
            </div>
          </div>
        ) : records.length > 0 ? (
          <div className="space-y-6">
            {records.map((record, index) => (
              <div 
                key={`${record.recordCID}-${index}`} 
                className="border p-6 rounded-xl transition-all duration-300 hover:shadow-md"
                style={{ backgroundColor: '#f9f5f0', borderColor: '#d6d3d1' }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  <div>
                    <p className="text-sm font-semibold mb-2" style={{ color: '#344f1f', opacity: 0.8 }}>Patient</p>
                    <p className="font-mono text-lg font-bold" style={{ color: '#344f1f' }}>
                      {formatAddress(record.patient)}
                    </p>
                    {record.patientName && (
                      <p className="text-sm mt-1" style={{ color: '#344f1f', opacity: 0.7 }}>
                        {record.patientName}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-2" style={{ color: '#344f1f', opacity: 0.8 }}>Doctor</p>
                    <p className="font-mono text-lg font-bold" style={{ color: '#344f1f' }}>
                      {formatAddress(record.doctor)}
                    </p>
                    {record.doctorName && (
                      <p className="text-sm mt-1" style={{ color: '#344f1f', opacity: 0.7 }}>
                        {record.doctorName}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm font-semibold mb-2" style={{ color: '#344f1f', opacity: 0.8 }}>Description</p>
                  <p className="text-lg" style={{ color: '#344f1f' }}>{record.description}</p>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-semibold mb-2" style={{ color: '#344f1f', opacity: 0.8 }}>IPFS CID</p>
                  <p className="font-mono text-sm break-all p-3 rounded-lg" style={{ backgroundColor: '#f2ead3', color: '#344f1f' }}>
                    {record.recordCID}
                  </p>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-semibold mb-2" style={{ color: '#344f1f', opacity: 0.8 }}>Date Created</p>
                  <p className="text-lg" style={{ color: '#344f1f' }}>{formatDate(record.timestamp)}</p>
                </div>

                <div className="flex flex-wrap gap-3 mb-4">
                  <span 
                    className="px-3 py-2 rounded-lg text-sm font-semibold flex items-center space-x-2"
                    style={{ 
                      backgroundColor: record.encrypted ? '#f3e8ff' : '#f0fdf4',
                      color: record.encrypted ? '#7c3aed' : '#166534'
                    }}
                  >
                    {record.encrypted ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>Encrypted</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                        </svg>
                        <span>Unencrypted</span>
                      </>
                    )}
                  </span>
                  <span 
                    className="px-3 py-2 rounded-lg text-sm font-semibold flex items-center space-x-2"
                    style={{ backgroundColor: '#fffbeb', color: '#d97706' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{new Date(record.timestamp).toLocaleDateString()}</span>
                  </span>
                </div>

                {/* Record Data Display */}
                {record.recordData && (
                  <div className="mt-4 p-4 border rounded-lg" style={{ backgroundColor: '#f2ead3', borderColor: '#d6d3d1' }}>
                    <p className="text-sm font-semibold mb-3" style={{ color: '#344f1f' }}>Record Content:</p>
                    <pre className="text-sm p-4 rounded-lg overflow-auto max-h-60" style={{ backgroundColor: '#f9f5f0', color: '#344f1f' }}>
                      {JSON.stringify(record.recordData, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 mt-4">
                  <button
                    onClick={() => handleViewRecord(record)}
                    disabled={loadingDetails.includes(record.recordCID) || record.encrypted}
                    className="px-5 py-3 rounded-lg font-semibold transition-all duration-300 hover:shadow-lg disabled:opacity-50 flex items-center space-x-2"
                    style={{ backgroundColor: '#344f1f', color: '#ffffff' }}
                  >
                    {loadingDetails.includes(record.recordCID) ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Loading...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>View Content</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => handleDownloadRecord(record)}
                    disabled={loadingDetails.includes(record.recordCID)}
                    className="px-5 py-3 rounded-lg font-semibold transition-all duration-300 hover:shadow-lg disabled:opacity-50 flex items-center space-x-2"
                    style={{ backgroundColor: '#f4991a', color: '#ffffff' }}
                  >
                    {loadingDetails.includes(record.recordCID) ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Downloading...</span>
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
                  
                  {record.encrypted && (
                    <div className="flex items-center space-x-2 px-4 py-2 rounded-lg" style={{ backgroundColor: '#f3e8ff' }}>
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium" style={{ color: '#7c3aed' }}>
                        Encrypted records require patient consent to view
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f9f5f0' }}>
              <svg className="w-10 h-10" style={{ color: '#f4991a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-xl mb-3" style={{ color: '#344f1f', opacity: 0.8 }}>No medical records found.</p>
            <p className="text-lg" style={{ color: '#344f1f', opacity: 0.6 }}>
              Records will appear here once doctors add them for patients.
            </p>
          </div>
        )}

        <div 
          className="mt-6 p-4 border rounded-lg"
          style={{ backgroundColor: '#f9f5f0', borderColor: '#d6d3d1' }}
        >
          <div className="flex items-center space-x-3">
            <svg className="w-5 h-5" style={{ color: '#344f1f' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-semibold" style={{ color: '#344f1f' }}>
              Note: These are all medical records stored on the blockchain. 
              Encrypted records require patient consent and decryption keys to access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}