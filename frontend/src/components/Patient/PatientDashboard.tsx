import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import PatientSignup from "./PatientSignup";
import ViewRecords from "./ViewRecords";
import PatientVideoConsultation from "./PatientVideoConsultation";
import BookAppointment from "./BookAppointment";
import hubArtifact from "../../abis/InstaDocHub.json";

export default function PatientDashboard() {
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const { address } = useAccount();
  const hubAddress = import.meta.env.VITE_HUB_ADDRESS;
  const hubAbi = hubArtifact.abi;

  // Check if patient is already registered
  const { data: isPatientRegistered, refetch: checkRegistration } = useReadContract({
    address: hubAddress as `0x${string}`,
    abi: hubAbi,
    functionName: "isPatientRegistered",
    args: [address],
    query: {
      enabled: !!address,
    },
  });

  useEffect(() => {
    if (isPatientRegistered !== undefined) {
      setIsRegistered(!!isPatientRegistered);
    }
  }, [isPatientRegistered]);

  const handleRegistrationSuccess = () => {
    setIsRegistered(true);
    checkRegistration(); // Re-check registration status
  };

  if (!address) {
    return (
      <div className="p-4 border rounded bg-yellow-50 border-yellow-200">
        <p className="text-yellow-800">Please connect your wallet to access the patient dashboard</p>
      </div>
    );
  }

  if (isRegistered === null) {
    return (
      <div className="p-4 border rounded bg-white">
        <div className="flex items-center space-x-2 text-gray-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Checking registration status...</span>
        </div>
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className="space-y-6 p-4">
        <h2 className="text-2xl font-bold">Patient Dashboard</h2>
        <PatientSignup onRegistrationSuccess={handleRegistrationSuccess} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-2xl font-bold">Patient Dashboard</h2>
      <BookAppointment />
      <PatientVideoConsultation />
      <ViewRecords />
    </div>
  );
}