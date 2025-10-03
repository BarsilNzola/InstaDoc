import { useState, useEffect } from "react";
import { useAccount, useChainId, useWriteContract, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import ConnectWallet from "./components/Shared/ConnectWallet";
import PatientDashboard from "./components/Patient/PatientDashboard";
import DoctorDashboard from "./components/Doctor/DoctorDashboard";
import AdminDashboard from "./components/Admin/AdminDashboard";
import hubArtifact from "./abis/InstaDocHub.json";

function App() {
  const [role, setRole] = useState<"admin" | "doctor" | "patient" | null>(null);
  const [isPatientRegistered, setIsPatientRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
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
      setIsPatientRegistered(false);
      return;
    }

    if (chainId !== 2484) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const detectRole = async () => {
      try {
        if (hubAdmin !== undefined && isDoctor !== undefined && isRegisteredPatient !== undefined) {
          if (address.toLowerCase() === (hubAdmin as string)?.toLowerCase()) {
            setRole("admin");
          } else if (isDoctor) {
            setRole("doctor");
          } else {
            setRole("patient");
            setIsPatientRegistered(!!isRegisteredPatient);
          }
        }
      } catch (error) {
        console.error("Error detecting role:", error);
      } finally {
        setLoading(false);
      }
    };

    detectRole();
  }, [isConnected, address, chainId, hubAdmin, isDoctor, isRegisteredPatient, refreshTrigger]);

  // Patient registration
  const { 
    writeContract: registerPatient, 
    isPending: isRegistering,
    data: txHash 
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Refresh data when registration is confirmed - FIXED: Now properly triggers re-render
  useEffect(() => {
    if (isConfirmed) {
      console.log("Registration confirmed, refreshing data...");
      // Force a complete refresh by incrementing the trigger
      setRefreshTrigger(prev => prev + 1);
      
      // Also force re-check patient registration status
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
      }, 2000);
    }
  }, [isConfirmed]);

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
      },
      onError: (error) => {
        console.error("Registration failed:", error);
        alert(`❌ Registration failed: ${error.message}`);
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f9f5f0', color: '#344f1f' }}>
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: '#f4991a' }}></div>
          <p className="text-lg font-medium">Detecting your role...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9f5f0', color: '#344f1f' }}>
      {/* Header */}
      <header className="p-6 flex justify-between items-center" style={{ backgroundColor: '#344f1f' }}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f4991a' }}>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">InstaDoc</h1>
            <p className="text-sm mt-1 opacity-90" style={{ color: '#f2ead3' }}>
              Decentralized Telemedicine Platform
            </p>
          </div>
        </div>
        
        {/* Wallet Connection - Compact Version */}
        <div className="flex-shrink-0">
          <ConnectWallet onConnect={() => {}} compact={true} />
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 max-w-7xl mx-auto">
        {!isConnected ? (
          <div className="text-center max-w-md mx-auto py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f2ead3' }}>
              <svg className="w-10 h-10" style={{ color: '#f4991a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#344f1f' }}>Welcome to InstaDoc</h2>
            <p className="mb-6 text-lg" style={{ color: '#344f1f', opacity: 0.8 }}>
              Connect your wallet to access decentralized healthcare services
            </p>
          </div>
        ) : chainId !== 2484 ? (
          <div className="text-center max-w-md mx-auto p-6 rounded-lg shadow-md" style={{ backgroundColor: '#f2ead3', border: '2px solid #f4991a' }}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-yellow-100">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3" style={{ color: '#344f1f' }}>Wrong Network</h3>
            <p className="text-lg" style={{ color: '#344f1f', opacity: 0.8 }}>
              Please switch to U2U Nebulas Testnet to continue.
            </p>
          </div>
        ) : role === "admin" ? (
          <AdminDashboard />
        ) : role === "doctor" ? (
          <DoctorDashboard />
        ) : role === "patient" ? (
          !isPatientRegistered ? (
            <div className="space-y-6 p-8 rounded-xl shadow-lg max-w-md mx-auto" style={{ backgroundColor: '#f2ead3' }}>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f9f5f0' }}>
                  <svg className="w-8 h-8" style={{ color: '#f4991a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-3" style={{ color: '#344f1f' }}>Patient Registration</h3>
                <p className="text-lg" style={{ color: '#344f1f', opacity: 0.8 }}>
                  Welcome! Register to access your medical dashboard and book appointments.
                </p>
              </div>
              
              {isConfirmed ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg text-center" style={{ backgroundColor: '#f0f9f0', border: '1px solid #86efac', color: '#166534' }}>
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">✅ Successfully registered! Loading dashboard...</span>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#f4991a' }}></div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handlePatientRegistration}
                  disabled={isRegistering || isConfirming}
                  className="w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
                  style={{ 
                    backgroundColor: (isRegistering || isConfirming) ? '#9ca3af' : '#f4991a', 
                    color: '#ffffff'
                  }}
                >
                  {(isRegistering || isConfirming) ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>
                        {isRegistering ? "Confirming in Wallet..." : "Waiting for Confirmation..."}
                      </span>
                    </>
                  ) : (
                    "Register as Patient"
                  )}
                </button>
              )}
            </div>
          ) : (
            <PatientDashboard />
          )
        ) : (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f2ead3' }}>
              <svg className="w-10 h-10" style={{ color: '#f4991a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3" style={{ color: '#344f1f' }}>Role Detection Issue</h3>
            <p className="text-lg" style={{ color: '#344f1f', opacity: 0.8 }}>
              Unable to detect your role. Please try refreshing the page.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;