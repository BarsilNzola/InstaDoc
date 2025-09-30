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
    <div className="space-y-4">
      {/* Transaction Status */}
      {transactionStatus !== 'idle' && (
        <div className={`p-4 border rounded ${
          transactionStatus === 'success' ? 'bg-green-100 border-green-400 text-green-800' :
          transactionStatus === 'error' ? 'bg-red-100 border-red-400 text-red-800' :
          'bg-yellow-100 border-yellow-400 text-yellow-800'
        }`}>
          <div className="flex justify-between items-center">
            <span className="font-semibold">
              {transactionStatus === 'success' ? '✅ Patient removed successfully' :
               transactionStatus === 'error' ? '❌ Failed to remove patient' :
               '🔄 Removing patient...'}
            </span>
            <button
              onClick={() => setTransactionStatus('idle')}
              className="text-sm underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Network Warning */}
      {isWrongNetwork && (
        <div className="p-4 border border-red-400 bg-red-100 text-red-800 rounded">
          ⚠️ Please switch to U2U Testnet in your wallet
        </div>
      )}

      <div className="p-6 border rounded bg-white shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Manage Patients</h3>
          <button
            onClick={() => refetchPatients()}
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? "Refreshing..." : "Refresh List"}
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading patients from blockchain...</p>
          </div>
        ) : patients.length > 0 ? (
          <div className="space-y-3">
            {patients.map((patient, index) => (
              <div
                key={`${patient.address}-${index}`}
                className="flex items-center justify-between border p-4 rounded hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                  <div>
                    <p className="font-mono text-sm">{formatAddress(patient.address)}</p>
                    <p className="text-xs text-gray-500">Registered Patient</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(patient.address)}
                  disabled={isSubmitting || isWrongNetwork}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Removing..." : "Remove"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-2">No registered patients found.</p>
            <p className="text-sm text-gray-500">
              Patients will appear here once they register through the system.
            </p>
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800">
            <strong>Total Patients:</strong> {patients.length} registered patient(s)
          </p>
        </div>
      </div>
    </div>
  );
}