import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import hubArtifact from "../../abis/InstaDocHub.json";

interface PatientSignupProps {
  onRegistrationSuccess?: () => void;
}

export default function PatientSignup({ onRegistrationSuccess }: PatientSignupProps) {
  const [status, setStatus] = useState("");
  
  const hubAddress = import.meta.env.VITE_HUB_ADDRESS;
  const hubAbi = hubArtifact.abi;

  const { 
    writeContract: registerPatient, 
    isPending: isRegistering,
    data: txHash 
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    if (isConfirmed) {
      setStatus("✅ Successfully registered as patient!");
      // Refresh the page after a short delay to reload all data
      setTimeout(() => {
        onRegistrationSuccess?.();
        window.location.reload(); // Force refresh to load patient data
      }, 2000);
    }
  }, [isConfirmed, onRegistrationSuccess]);

  const handleSignup = async () => {
    if (!hubAddress) {
      setStatus("Error: Hub contract address not configured");
      return;
    }

    setStatus("Registering...");

    registerPatient({
      address: hubAddress as `0x${string}`,
      abi: hubAbi,
      functionName: "registerPatient",
    }, {
      onSuccess: (txHash) => {
        setStatus("Transaction submitted! Waiting for confirmation...");
      },
      onError: (error) => {
        setStatus(`Error: ${error.message}`);
      },
    });
  };

  const isSubmitting = isRegistering || isConfirming;

  return (
    <div className="space-y-6 p-6 border rounded-xl shadow-md" style={{ backgroundColor: '#f2ead3', maxWidth: '500px' }}>
      <div className="flex items-center space-x-3 mb-2">
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#344f1f' }}>
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold" style={{ color: '#344f1f' }}>Patient Registration</h3>
      </div>
      
      <p className="text-lg" style={{ color: '#344f1f', opacity: 0.8 }}>
        Register as a patient to book appointments, access medical records, and consult with verified doctors.
      </p>

      <div className="space-y-4">
        <div className="p-4 rounded-lg" style={{ backgroundColor: '#f9f5f0' }}>
          <div className="flex items-center space-x-3">
            <svg className="w-5 h-5" style={{ color: '#f4991a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold" style={{ color: '#344f1f' }}>What you get:</p>
              <ul className="text-sm mt-1 space-y-1" style={{ color: '#344f1f', opacity: 0.8 }}>
                <li>• Book appointments with verified doctors</li>
                <li>• Secure access to your medical records</li>
                <li>• Video consultations with healthcare providers</li>
                <li>• Encrypted storage of your health data</li>
              </ul>
            </div>
          </div>
        </div>

        <button 
          onClick={handleSignup} 
          disabled={isSubmitting}
          className="w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
          style={{ 
            backgroundColor: isSubmitting ? '#9ca3af' : '#f4991a', 
            color: '#ffffff'
          }}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>
                {isRegistering ? "Confirming in Wallet..." : "Waiting for Confirmation..."}
              </span>
            </>
          ) : (
            <>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span>Register as Patient</span>
            </>
          )}
        </button>

        {status && (
          <div 
            className={`p-4 rounded-lg border ${
              status.startsWith("✅") 
                ? { backgroundColor: '#f0f9f0', borderColor: '#86efac', color: '#166534' }
                : status.startsWith("Error") 
                ? { backgroundColor: '#fef2f2', borderColor: '#fca5a5', color: '#dc2626' }
                : { backgroundColor: '#eff6ff', borderColor: '#93c5fd', color: '#1e40af' }
            }`}
            style={{
              backgroundColor: status.startsWith("✅") ? '#f0f9f0' : 
                             status.startsWith("Error") ? '#fef2f2' : '#eff6ff',
              borderColor: status.startsWith("✅") ? '#86efac' : 
                          status.startsWith("Error") ? '#fca5a5' : '#93c5fd',
              color: status.startsWith("✅") ? '#166534' : 
                    status.startsWith("Error") ? '#dc2626' : '#1e40af'
            }}
          >
            <div className="flex items-center space-x-2">
              {status.startsWith("✅") ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : status.startsWith("Error") ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="font-medium">{status}</span>
            </div>
          </div>
        )}
      </div>

      <div className="text-center pt-4 border-t" style={{ borderColor: '#d6d3d1' }}>
        <p className="text-sm" style={{ color: '#344f1f', opacity: 0.6 }}>
          Your registration is stored securely on the blockchain
        </p>
      </div>
    </div>
  );
}