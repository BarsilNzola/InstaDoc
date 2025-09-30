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

  return (
    <div className="space-y-4 p-4 border rounded bg-white shadow">
      <h3 className="text-lg font-semibold">Patient Registration</h3>
      <p className="text-sm text-gray-600">
        Register as a patient to book appointments and access medical records.
      </p>
      <button 
        onClick={handleSignup} 
        disabled={isRegistering || isConfirming}
        className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 w-full"
      >
        {isRegistering ? "Confirming in Wallet..." : 
         isConfirming ? "Waiting for Confirmation..." : 
         "Register as Patient"}
      </button>
      {status && (
        <p className={`text-sm ${
          status.startsWith("✅") ? "text-green-600" : 
          status.startsWith("Error") ? "text-red-600" : 
          "text-blue-600"
        }`}>
          {status}
        </p>
      )}
    </div>
  );
}