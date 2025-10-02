import { useState, useEffect } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import hubArtifact from "../../abis/InstaDocHub.json";

interface Patient {
  address: string;
  isRegistered: boolean;
}

export default function ManagePatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  
  const { chain, address: currentUserAddress } = useAccount();
  const hubAddress = import.meta.env.VITE_HUB_ADDRESS;
  const hubAbi = hubArtifact.abi;

  // Get all registered patients from contract
  const { data: patientAddresses, refetch: refetchPatients, isLoading: isLoadingPatients } = useReadContract({
    address: hubAddress as `0x${string}`,
    abi: hubAbi,
    functionName: "getAllPatients",
  });

  const { 
    writeContract: removePatient, 
    isPending: isRemoving,
    data: removeTxHash,
    reset: resetRemove
  } = useWriteContract();

  const { 
    isLoading: isConfirmingRemove, 
    isSuccess: isRemoved,
    error: removeError 
  } = useWaitForTransactionReceipt({
    hash: removeTxHash,
  });

  // Reset transaction states
  useEffect(() => {
    resetRemove();
    setTransactionStatus('idle');
  }, [chain?.id, resetRemove]);

  // Handle removal success
  useEffect(() => {
    if (isRemoved) {
      console.log('✅ Patient removal confirmed');
      setTransactionStatus('success');
      refetchPatients();
      
      setTimeout(() => {
        setTransactionStatus('idle');
        resetRemove();
      }, 3000);
    }
  }, [isRemoved, refetchPatients, resetRemove]);

  // Handle removal errors
  useEffect(() => {
    if (removeError) {
      console.error('❌ Patient removal failed:', removeError);
      setTransactionStatus('error');
    }
  }, [removeError]);

  // Load patients from contract data
  useEffect(() => {
    if (patientAddresses && Array.isArray(patientAddresses)) {
      console.log('🔄 Loading patients from contract:', patientAddresses);
      const patientsData: Patient[] = patientAddresses.map(addr => ({
        address: addr,
        isRegistered: true
      }));
      setPatients(patientsData);
    } else {
      setPatients([]);
    }
  }, [patientAddresses]);

  const handleRemove = async (patientAddr: string) => {
    if (!hubAddress) {
      alert("Hub contract not configured");
      return;
    }

    if (!confirm(`Are you sure you want to remove patient ${patientAddr}? This will revoke their access to the system.`)) {
      return;
    }

    setTransactionStatus('pending');

    // Remove patient through contract
    removePatient({
      address: hubAddress as `0x${string}`,
      abi: hubAbi,
      functionName: "removePatient",
      args: [patientAddr],
      gas: BigInt(300000),
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const isWrongNetwork = chain?.id !== 2484;
  const isSubmitting = isRemoving || isConfirmingRemove;
  const isLoading = isLoadingPatients || loading;

  return (
    <div className="space-y-6">
      {/* Transaction Status */}
      {transactionStatus !== 'idle' && (
        <div 
          className="p-4 border rounded-lg shadow-sm"
          style={{
            backgroundColor: transactionStatus === 'success' ? '#f0f9f0' : 
                           transactionStatus === 'error' ? '#fef2f2' : '#fffbeb',
            borderColor: transactionStatus === 'success' ? '#86efac' : 
                        transactionStatus === 'error' ? '#fca5a5' : '#fcd34d',
            color: transactionStatus === 'success' ? '#166534' : 
                  transactionStatus === 'error' ? '#dc2626' : '#d97706'
          }}
        >
          <div className="flex justify-between items-center">
            <span className="font-semibold">
              {transactionStatus === 'success' ? '✅ Patient removed successfully' :
               transactionStatus === 'error' ? '❌ Failed to remove patient' :
               '🔄 Removing patient...'}
            </span>
            <button
              onClick={() => setTransactionStatus('idle')}
              className="text-sm underline hover:no-underline transition-all"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold" style={{ color: '#344f1f' }}>Manage Patients</h3>
          </div>
          <button
            onClick={() => refetchPatients()}
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
                <span>Refresh List</span>
              </>
            )}
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="flex items-center justify-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: '#344f1f' }}></div>
              <p className="text-lg" style={{ color: '#344f1f', opacity: 0.8 }}>Loading patients from blockchain...</p>
            </div>
          </div>
        ) : patients.length > 0 ? (
          <div className="space-y-4">
            {patients.map((patient, index) => (
              <div
                key={`${patient.address}-${index}`}
                className="flex items-center justify-between p-6 rounded-xl transition-all duration-300 hover:shadow-md"
                style={{ backgroundColor: '#f9f5f0', border: '1px solid #d6d3d1' }}
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="inline-block w-3 h-3 bg-green-500 rounded-full"></span>
                    <div>
                      <p className="font-mono text-lg font-semibold" style={{ color: '#344f1f' }}>
                        {formatAddress(patient.address)}
                      </p>
                      <p className="text-sm" style={{ color: '#344f1f', opacity: 0.7 }}>
                        Registered Patient
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(patient.address)}
                  disabled={isSubmitting || isWrongNetwork}
                  className="px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:shadow-lg disabled:opacity-50 flex items-center space-x-2"
                  style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Removing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Remove</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f9f5f0' }}>
              <svg className="w-10 h-10" style={{ color: '#f4991a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-xl mb-3" style={{ color: '#344f1f', opacity: 0.8 }}>No registered patients found.</p>
            <p className="text-lg" style={{ color: '#344f1f', opacity: 0.6 }}>
              Patients will appear here once they register through the system.
            </p>
          </div>
        )}

        <div 
          className="mt-6 p-4 border rounded-lg"
          style={{ backgroundColor: '#f9f5f0', borderColor: '#d6d3d1' }}
        >
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold" style={{ color: '#344f1f' }}>
              Total Patients
            </p>
            <span 
              className="px-4 py-2 rounded-full font-bold text-lg"
              style={{ backgroundColor: '#344f1f', color: '#ffffff' }}
            >
              {patients.length}
            </span>
          </div>
          <p className="text-sm mt-2" style={{ color: '#344f1f', opacity: 0.7 }}>
            {patients.length === 1 ? '1 registered patient' : `${patients.length} registered patients`}
          </p>
        </div>
      </div>
    </div>
  );
}