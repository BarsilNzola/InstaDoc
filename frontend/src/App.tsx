import { useState, useEffect } from "react";
import { useAccount, useChainId, useWriteContract, useReadContract } from "wagmi";
import ConnectWallet from "./components/Shared/ConnectWallet";
import PatientDashboard from "./components/Patient/PatientDashboard";
import DoctorDashboard from "./components/Doctor/DoctorDashboard";
import AdminDashboard from "./components/Admin/AdminDashboard";
import hubArtifact from "./abis/InstaDocHub.json";
import doctorRegistryArtifact from "./abis/DoctorRegistry.json";

function App() {
  const [role, setRole] = useState<"admin" | "doctor" | "patient" | null>(null);
  const [isPatientRegistered, setIsPatientRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [devAdminMode, setDevAdminMode] = useState(false);
  
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  
  const hubAddress = import.meta.env.VITE_HUB_ADDRESS;
  const hubAbi = hubArtifact.abi;
  const doctorRegistryAbi = doctorRegistryArtifact.abi;

  // Read doctorRegistry address from Hub
  const { data: doctorRegistryAddr } = useReadContract({
    address: hubAddress as `0x${string}`,
    abi: hubAbi,
    functionName: "doctorRegistry",
    query: {
      enabled: !!hubAddress && isConnected && chainId === 2484,
    },
  });

  // Read admin address from DoctorRegistry
  const { data: adminAddr } = useReadContract({
    address: doctorRegistryAddr as `0x${string}`,
    abi: doctorRegistryAbi,
    functionName: "admin",
    query: {
      enabled: !!doctorRegistryAddr && isConnected,
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

    if (adminAddr !== undefined && isDoctor !== undefined && isRegisteredPatient !== undefined) {
      if (address.toLowerCase() === (adminAddr as string)?.toLowerCase()) {
        setRole("admin");
      } else if (isDoctor) {
        setRole("doctor");
      } else {
        setRole("patient");
        setIsPatientRegistered(!!isRegisteredPatient);
      }
      setLoading(false);
    }
  }, [isConnected, address, chainId, adminAddr, isDoctor, isRegisteredPatient]);

  // Development Admin Access Component
  const DevelopmentAdminAccess = () => {
    const enableAdminMode = () => {
      setDevAdminMode(true);
    };

    const disableAdminMode = () => {
      setDevAdminMode(false);
    };

    if (devAdminMode) {
      return (
        <div>
          <div className="mb-4 p-3 bg-green-100 border border-green-400 rounded">
            <div className="flex justify-between items-center">
              <p className="text-green-800 font-semibold">
                🛠️ Development Admin Mode Active
              </p>
              <button
                onClick={disableAdminMode}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
              >
                Exit Admin Mode
              </button>
            </div>
            <p className="text-green-700 text-sm mt-1">
              You can now test admin functions. Your actual wallet role: {role}
            </p>
          </div>
          <AdminDashboard />
        </div>
      );
    }

    // Only show the development admin access if user is NOT actually an admin
    if (role !== "admin") {
      return (
        <div className="mb-6 p-4 bg-orange-100 border border-orange-400 rounded">
          <h3 className="text-lg font-semibold text-orange-800 mb-2">
            Development Admin Access
          </h3>
          <p className="text-orange-700 mb-3">
            Your wallet ({address}) is currently detected as: <strong>{role}</strong>
            {role === "patient" && isPatientRegistered && " (registered)"}
            {role === "patient" && !isPatientRegistered && " (not registered)"}
          </p>
          <p className="text-orange-700 mb-3">
            Contract Admin: {adminAddr ? (adminAddr as string) : "Loading..."}
          </p>
          <div className="space-y-2">
            <button
              onClick={enableAdminMode}
              className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 mr-2"
            >
              Enable Admin Mode (Development)
            </button>
            <p className="text-xs text-orange-600">
              This allows you to test admin functions without being the actual contract admin.
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

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
        <p>Loading… ⏳</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center bg-blue-900 text-white space-y-2 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold">InstaDoc</h1>
          <p className="text-sm mt-1 max-w-md">
            InstaDoc - Decentralized Telemedicine Platform
          </p>
        </div>
        <ConnectWallet onConnect={() => {}} />
      </header>

      <main className="p-6">
        {!isConnected ? (
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4">Welcome to InstaDoc</h2>
            <p className="mb-4">Please connect your wallet to continue.</p>
          </div>
        ) : chainId !== 2484 ? (
          <div className="text-center">
            <p>Please switch to U2U Testnet to continue.</p>
          </div>
        ) : devAdminMode ? (
          // DEVELOPMENT ADMIN MODE - Highest priority
          <DevelopmentAdminAccess />
        ) : role === "admin" ? (
          // ACTUAL ADMIN
          <AdminDashboard />
        ) : role === "doctor" ? (
          <DoctorDashboard />
        ) : role === "patient" ? (
          !isPatientRegistered ? (
            <div className="space-y-4 p-4 border rounded bg-white shadow max-w-md mx-auto">
              <h3 className="text-xl font-semibold">Patient Registration</h3>
              <p>Welcome! Please register to access your medical dashboard.</p>
              <button
                onClick={handlePatientRegistration}
                disabled={isRegistering}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isRegistering ? "Registering..." : "Register as Patient"}
              </button>
            </div>
          ) : (
            <div>
              {/* Show development admin access above patient dashboard */}
              <DevelopmentAdminAccess />
              <PatientDashboard />
            </div>
          )
        ) : (
          <div className="text-center">
            <p>Detecting your role...</p>
            {/* Show development admin access while detecting */}
            <DevelopmentAdminAccess />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;