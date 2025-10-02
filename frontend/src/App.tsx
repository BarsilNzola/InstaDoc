import { useState, useEffect } from "react";
import { useAccount, useChainId, useWriteContract, useReadContract } from "wagmi";
import ConnectWallet from "./components/Shared/ConnectWallet";
import PatientDashboard from "./components/Patient/PatientDashboard";
import DoctorDashboard from "./components/Doctor/DoctorDashboard";
import AdminDashboard from "./components/Admin/AdminDashboard";
import hubArtifact from "./abis/InstaDocHub.json";

function App() {
  const [role, setRole] = useState<"admin" | "doctor" | "patient" | null>(null);
  const [isPatientRegistered, setIsPatientRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  
  const hubAddress = import.meta.env.VITE_HUB_ADDRESS;
  const hubAbi = hubArtifact.abi;

  // Check if user is the admin of InstaDocHub
  const { data: hubAdmin } = useReadContract({
    address: hubAddress as `0x${string}`,
    abi: hubAbi,
    functionName: "admin",
    query: {
      enabled: !!hubAddress && isConnected && chainId === 2484,
    },
  });

  // Check if user is a verified doctor
  const { data: isDoctor } = useReadContract({
    address: hubAddress as `0x${string}`,
    abi: hubAbi,
    functionName: "isDoctorVerified",
    args: [address],
    query: {
      enabled: !!hubAddress && isConnected && chainId === 2484,
    },
  });

  // Check if patient is registered
  const { data: isRegisteredPatient } = useReadContract({
    address: hubAddress as `0x${string}`,
    abi: hubAbi,
    functionName: "registeredPatients",
    args: [address],
    query: {
      enabled: !!hubAddress && isConnected && chainId === 2484,
    },
  });

  // Detect role based on contract data
  useEffect(() => {
    if (!isConnected || !address) {
      setLoading(false);
      setRole(null);
      return;
    }

    if (chainId !== 2484) {
      setLoading(false);
      return;
    }

    setLoading(true);

    if (hubAdmin !== undefined && isDoctor !== undefined && isRegisteredPatient !== undefined) {
      if (address.toLowerCase() === (hubAdmin as string)?.toLowerCase()) {
        setRole("admin");
      } else if (isDoctor) {
        setRole("doctor");
      } else {
        setRole("patient");
        setIsPatientRegistered(!!isRegisteredPatient);
      }
      setLoading(false);
    }
  }, [isConnected, address, chainId, hubAdmin, isDoctor, isRegisteredPatient]);

  // Patient registration
  const { writeContract: registerPatient, isPending: isRegistering } = useWriteContract();

  const handlePatientRegistration = async () => {
    if (!hubAddress) {
      alert("Hub contract address not configured");
      return;
    }

    registerPatient({
      address: hubAddress as `0x${string}`,
      abi: hubAbi,
      functionName: "registerPatient",
    }, {
      onSuccess: (txHash) => {
        console.log("Transaction submitted:", txHash);
        alert("✅ Registration transaction submitted! Waiting for confirmation...");
      },
      onError: (error) => {
        console.error("Registration failed:", error);
        alert(`❌ Registration failed: ${error.message}`);
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-800">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <p>Detecting your role...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center bg-blue-900 text-white space-y-2 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold">InstaDoc</h1>
          <p className="text-sm mt-1 max-w-md">
            Decentralized Telemedicine Platform
          </p>
        </div>
        <ConnectWallet onConnect={() => {}} />
      </header>

      <main className="p-6">
        {!isConnected ? (
          <div className="text-center max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-4">Welcome to InstaDoc</h2>
            <p className="mb-4 text-gray-600">
              Connect your wallet to access decentralized healthcare services
            </p>
          </div>
        ) : chainId !== 2484 ? (
          <div className="text-center max-w-md mx-auto p-4 border rounded bg-yellow-50 border-yellow-200">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">Wrong Network</h3>
            <p className="text-yellow-700">Please switch to U2U Nebulas Testnet to continue.</p>
          </div>
        ) : role === "admin" ? (
          <AdminDashboard />
        ) : role === "doctor" ? (
          <DoctorDashboard />
        ) : role === "patient" ? (
          !isPatientRegistered ? (
            <div className="space-y-4 p-6 border rounded bg-white shadow max-w-md mx-auto">
              <h3 className="text-xl font-semibold">Patient Registration</h3>
              <p className="text-gray-600">
                Welcome! Register to access your medical dashboard and book appointments.
              </p>
              <button
                onClick={handlePatientRegistration}
                disabled={isRegistering}
                className="w-full bg-green-600 text-white px-4 py-3 rounded hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
              >
                {isRegistering ? "Registering..." : "Register as Patient"}
              </button>
            </div>
          ) : (
            <PatientDashboard />
          )
        ) : (
          <div className="text-center">
            <p>Unable to detect your role. Please try refreshing the page.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;