import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { readContract } from "wagmi/actions";
import { config } from "../Shared/wallet";
import hubArtifact from "../../abis/InstaDocHub.json";
import escrowArtifact from "../../abis/EscrowPayments.json";

interface BookedAppointment {
  id: number;
  patient: string;
  doctor: string;
  amount: string;
  status: number;
}

export default function PatientBookedAppointments() {
  const [appointments, setAppointments] = useState<BookedAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { address } = useAccount();

  const hubAddress = import.meta.env.VITE_HUB_ADDRESS as `0x${string}`;
  const hubAbi = hubArtifact.abi;
  const escrowAbi = escrowArtifact.abi;

  // Get escrow address from Hub contract
  const { data: escrowAddress } = useReadContract({
    address: hubAddress,
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

  const { writeContract: cancelAppointment, data: txHash, isPending: isCancelling } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isCancelled } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    const fetchBookedAppointments = async () => {
      if (!address || !nextAppointmentId || !escrowAddress) {
        setLoading(false);
        return;
      }

      try {
        const totalAppointments = Number(nextAppointmentId);
        const patientAppointments: BookedAppointment[] = [];

        for (let i = 0; i < totalAppointments; i++) {
          try {
            const appointment = await readContract(config, {
              address: escrowAddress as `0x${string}`,
              abi: escrowAbi,
              functionName: "appointments",
              args: [BigInt(i)],
            });

            const [patient, doctor, amount, status] = appointment as [`0x${string}`, `0x${string}`, bigint, number];
            
            if (patient.toLowerCase() === address.toLowerCase() && 
                (status === 0 || status === 1)) { // Pending or Confirmed
              patientAppointments.push({
                id: i,
                patient,
                doctor,
                amount: amount.toString(),
                status
              });
            }
          } catch (error) {
            console.error(`Error fetching appointment ${i}:`, error);
          }
        }

        setAppointments(patientAppointments);
      } catch (error) {
        console.error("Error fetching booked appointments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookedAppointments();
  }, [address, nextAppointmentId, escrowAddress]);

  const handleCancelAppointment = async (appointmentId: number) => {
    if (!address || !escrowAddress) {
      alert("Please connect your wallet first");
      return;
    }

    if (!confirm("Are you sure you want to cancel this appointment? You will receive a full refund.")) {
      return;
    }

    try {
      cancelAppointment({
        address: escrowAddress as `0x${string}`,
        abi: escrowAbi,
        functionName: "cancelByPatient",
        args: [BigInt(appointmentId)],
      }, {
        onSuccess: (txHash) => {
          console.log("Appointment cancellation submitted:", txHash);
        },
        onError: (error) => {
          console.error("Appointment cancellation failed:", error);
          alert(`❌ Failed to cancel appointment: ${error.message}`);
        },
      });
    } catch (err: any) {
      console.error("Error cancelling appointment:", err);
      alert(`Failed to cancel appointment: ${err.message}`);
    }
  };

  // Remove cancelled appointment after confirmation
  useEffect(() => {
    if (isCancelled) {
      alert("✅ Appointment cancelled! Your refund has been processed.");
      setAppointments(prev => prev.filter(apt => apt.id !== Number(txHash)));
    }
  }, [isCancelled, txHash]);

  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return "🟡 Pending Doctor Confirmation";
      case 1: return "🟢 Confirmed - Ready for Consultation";
      case 2: return "✅ Completed";
      case 3: return "❌ Cancelled by You";
      case 4: return "❌ Declined by Doctor";
      case 5: return "⚖️ Disputed";
      default: return "Unknown";
    }
  };

  if (!address) {
    return (
      <div className="p-4 border rounded bg-yellow-50 border-yellow-200">
        <p className="text-yellow-800">Please connect your wallet to view your appointments</p>
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
        <h3 className="text-lg font-semibold mb-3">My Booked Appointments</h3>
        <div className="flex items-center space-x-2 text-gray-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Loading appointments...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded bg-white shadow">
      <h3 className="text-lg font-semibold mb-3">My Booked Appointments</h3>
      
      {appointments.length === 0 ? (
        <div className="text-gray-500 text-center py-4">
          <p>No booked appointments</p>
          <p className="text-sm mt-1">Your appointments will appear here after booking</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appointment) => (
            <div key={appointment.id} className="border p-3 rounded bg-blue-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-semibold">Appointment #{appointment.id}</h4>
                  <p className="text-sm text-gray-600">
                    Doctor: {appointment.doctor.slice(0, 8)}...{appointment.doctor.slice(-6)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Amount: {(Number(appointment.amount) / 1e18).toFixed(4)} U2U
                  </p>
                  <p className="text-sm font-medium mt-1">
                    {getStatusText(appointment.status)}
                  </p>
                </div>
                {appointment.status === 0 && (
                  <button 
                    onClick={() => handleCancelAppointment(appointment.id)}
                    disabled={isCancelling || isConfirming}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors disabled:opacity-50"
                  >
                    {isCancelling ? "Cancelling..." : isConfirming ? "Processing..." : "Cancel"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-3 text-xs text-gray-500">
        Found {appointments.length} appointment(s)
      </div>
    </div>
  );
}