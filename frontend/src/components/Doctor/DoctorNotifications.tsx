import { useState, useEffect } from "react";
import { useReadContract, useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { readContract } from "wagmi/actions";
import escrowArtifact from "../../abis/EscrowPayments.json";
import hubArtifact from "../../abis/InstaDocHub.json";
import { config } from "../Shared/wallet";

interface Appointment {
  id: number;
  patient: string;
  doctor: string;
  amount: string;
  status: number;
}

// The contract returns a tuple, not an object with named properties
type ContractAppointment = [
  patient: `0x${string}`,
  doctor: `0x${string}`,
  amount: bigint,
  status: number
];

export default function DoctorNotifications() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { address } = useAccount();
  
  const hubAddress = import.meta.env.VITE_HUB_ADDRESS;
  const hubAbi = hubArtifact.abi;
  const escrowAbi = escrowArtifact.abi;

  // Get escrow address from Hub contract
  const { data: escrowAddress } = useReadContract({
    address: hubAddress as `0x${string}`,
    abi: hubAbi,
    functionName: "escrow",
  });

  // Get next appointment ID
  const { data: nextAppointmentId } = useReadContract({
    address: escrowAddress as `0x${string}`,
    abi: escrowAbi,
    functionName: "nextAppointmentId",
    query: {
      enabled: !!escrowAddress,
    }
  });

  const { writeContract: confirmAppointment, data: txHash, isPending: isConfirming } = useWriteContract();
  const { isLoading: isConfirmingTx, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Fetch all appointments and filter for this doctor
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!address || !nextAppointmentId || !escrowAddress) {
        setLoading(false);
        return;
      }

      try {
        const totalAppointments = Number(nextAppointmentId);
        console.log(`🔄 Fetching ${totalAppointments} appointments for doctor ${address}`);
        
        const doctorAppointments: Appointment[] = [];

        for (let i = 0; i < totalAppointments; i++) {
          try {
            const appointmentData = await getAppointmentDetails(i);
            
            if (appointmentData && 
                appointmentData.doctor.toLowerCase() === address.toLowerCase() && 
                appointmentData.status === 0) { // Status 0 = Pending
              doctorAppointments.push(appointmentData);
            }
          } catch (error) {
            console.error(`Error fetching appointment ${i}:`, error);
          }
        }

        console.log(`✅ Found ${doctorAppointments.length} pending appointments`);
        setAppointments(doctorAppointments);
      } catch (error) {
        console.error("Error fetching appointments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [address, nextAppointmentId, escrowAddress]);

  const getAppointmentDetails = async (appointmentId: number): Promise<Appointment | null> => {
    if (!escrowAddress) {
      console.error("Escrow address not available");
      return null;
    }

    try {
      console.log(`📋 Fetching appointment ${appointmentId} from escrow: ${escrowAddress}`);
      
      const appointment = await readContract(config, {
        address: escrowAddress as `0x${string}`,
        abi: escrowAbi,
        functionName: "appointments",
        args: [BigInt(appointmentId)],
      });

      console.log(`✅ Appointment ${appointmentId} data:`, appointment);

      // The contract returns a tuple: [patient, doctor, amount, status]
      const contractAppointment = appointment as ContractAppointment;
      
      return {
        id: appointmentId,
        patient: contractAppointment[0], // patient is at index 0
        doctor: contractAppointment[1],  // doctor is at index 1
        amount: contractAppointment[2].toString(), // amount is at index 2
        status: contractAppointment[3]   // status is at index 3
      };
    } catch (error) {
      console.error(`Error getting appointment ${appointmentId}:`, error);
      return null;
    }
  };

  const handleConfirmAppointment = async (appointmentId: number) => {
    if (!address || !escrowAddress) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      confirmAppointment({
        address: escrowAddress as `0x${string}`,
        abi: escrowAbi,
        functionName: "confirmAppointment",
        args: [BigInt(appointmentId)],
      }, {
        onSuccess: (txHash) => {
          console.log("Appointment confirmation submitted:", txHash);
        },
        onError: (error) => {
          console.error("Appointment confirmation failed:", error);
          alert(`❌ Failed to confirm appointment: ${error.message}`);
        },
      });
    } catch (err: any) {
      console.error("Error confirming appointment:", err);
      alert(`Failed to confirm appointment: ${err.message}`);
    }
  };

  // Remove confirmed appointment after confirmation
  useEffect(() => {
    if (isConfirmed) {
      alert("✅ Appointment confirmed! The patient can now see it in their consultations.");
      // Remove the confirmed appointment from the list
      setAppointments(prev => prev.filter(apt => apt.id !== Number(txHash)));
      setLoading(false);
    }
  }, [isConfirmed, txHash]);

  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return "Pending Confirmation";
      case 1: return "Confirmed";
      case 2: return "Completed";
      case 3: return "Cancelled by Patient";
      case 4: return "Cancelled by Doctor";
      case 5: return "Disputed";
      default: return "Unknown";
    }
  };

  if (!address) {
    return (
      <div className="p-4 border rounded bg-yellow-50 border-yellow-200">
        <p className="text-yellow-800">Please connect your wallet to see appointments</p>
      </div>
    );
  }

  if (!escrowAddress) {
    return (
      <div className="p-4 border rounded bg-yellow-50 border-yellow-200">
        <p className="text-yellow-800">Loading escrow contract...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 border rounded bg-white">
        <h3 className="text-lg font-semibold mb-3">Appointment Notifications</h3>
        <div className="flex items-center space-x-2 text-gray-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Loading appointments...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded bg-white shadow">
      <h3 className="text-lg font-semibold mb-3">Appointment Notifications</h3>
      
      {appointments.length === 0 ? (
        <div className="text-gray-500 text-center py-4">
          <p>No pending appointments</p>
          <p className="text-sm mt-1">Patients will appear here when they book appointments with you</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appointment) => (
            <div key={appointment.id} className="border p-3 rounded bg-blue-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-semibold">Appointment #{appointment.id}</h4>
                  <p className="text-sm text-gray-600">
                    Patient: {appointment.patient.slice(0, 8)}...{appointment.patient.slice(-6)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Amount: {(Number(appointment.amount) / 1e18).toFixed(4)} U2U
                  </p>
                  <p className="text-sm text-gray-600">
                    Status: <span className="text-orange-600">{getStatusText(appointment.status)}</span>
                  </p>
                </div>
                <button
                  onClick={() => handleConfirmAppointment(appointment.id)}
                  disabled={isConfirming || isConfirmingTx}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors ml-3 disabled:opacity-50"
                >
                  {isConfirming ? "Confirming..." : isConfirmingTx ? "Processing..." : "Confirm"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-3 text-xs text-gray-500">
        Found {appointments.length} pending appointment(s)
      </div>
    </div>
  );
}