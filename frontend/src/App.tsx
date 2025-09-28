import { useState, useEffect } from "react";
import ConnectWallet from "./components/Shared/ConnectWallet";
import PatientDashboard from "./components/Patient/PatientDashboard";
import DoctorDashboard from "./components/Doctor/DoctorDashboard";
import AdminDashboard from "./components/Admin/AdminDashboard";
import { getHubContract } from "./lib/contracts";

function App() {
  const [role, setRole] = useState<"admin" | "doctor" | "patient" | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isPatientRegistered, setIsPatientRegistered] = useState(false);
  const [loading, setLoading] = useState(true);

  // Detect user role based on wallet
  useEffect(() => {
    if (!walletAddress) return;

    const detectRole = async () => {
      setLoading(true);
      try {
        const hub = await getHubContract();

        // Check if wallet is admin (contract deployer)
        const adminAddr = await hub.admin(); // assuming you added admin() getter in your contract
        if (walletAddress.toLowerCase() === adminAddr.toLowerCase()) {
          setRole("admin");
          return;
        }

        // Check if wallet is a verified doctor
        const isDoctor = await hub.isDoctorVerified(walletAddress);
        if (isDoctor) {
          setRole("doctor");
          return;
        }

        // Otherwise, treat as patient
        const isRegistered = await hub.registeredPatients(walletAddress);
        setIsPatientRegistered(isRegistered);
        setRole("patient");
      } catch (err) {
        console.error("Error detecting role:", err);
        alert("❌ Failed to detect role");
      } finally {
        setLoading(false);
      }
    };

    detectRole();
  }, [walletAddress]);

  // Handle wallet connection
  const handleWalletConnect = async (address: string) => {
    setWalletAddress(address);
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
            InstaDoc is a decentralized telemedicine platform. Connect your wallet to securely manage
            your medical records, appointments, and consultations.
          </p>
        </div>
        <ConnectWallet onConnect={handleWalletConnect} />
      </header>

      <main className="p-6">
        {!walletAddress ? (
          <p>Please connect your wallet to continue.</p>
        ) : role === "admin" ? (
          <AdminDashboard />
        ) : role === "doctor" ? (
          <DoctorDashboard />
        ) : role === "patient" ? (
          !isPatientRegistered ? (
            <div className="space-y-4 p-4 border rounded bg-white shadow max-w-md">
              <h3 className="text-xl font-semibold">Patient Registration</h3>
              <p>Welcome! Please register to access your medical dashboard.</p>
              <button
                onClick={async () => {
                  try {
                    const hub = await getHubContract();
                    const tx = await hub.registerPatient();
                    await tx.wait();
                    setIsPatientRegistered(true);
                  } catch (err) {
                    console.error(err);
                    alert("❌ Registration failed");
                  }
                }}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Register as Patient
              </button>
            </div>
          ) : (
            <PatientDashboard />
          )
        ) : (
          <p>Unknown role.</p>
        )}
      </main>
    </div>
  );
}

export default App;
