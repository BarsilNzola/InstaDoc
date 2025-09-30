import { useState, useEffect } from "react";
import { useReadContract, useAccount } from "wagmi";
import { getEscrowContract } from "../../lib/contracts";
import escrowArtifact from "../../abis/EscrowPayments.json";

interface Appointment {
  id: number;
  patient: string;
  doctor: string;
  amount: string;
  status: number; // 0 = Pending, 1 = Completed, 2 = Cancelled, 3 = Disputed
}

export default function DoctorNotifications() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { address } = useAccount();
  
  const escrowAddress = import.meta.env.VITE_ESCROW_ADDRESS;
  const escrowAbi = escrowArtifact.abi;

  // Get next appointment ID to know how many appointments exist
  const { data: nextAppointmentId } = useReadContract({
    address: escrowAddress as `0x${string}`,
    abi: escrowAbi,
    functionName: "nextAppointmentId",
  });

  // Fetch all appointments and filter for this doctor
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!address || !nextAppointmentId) {
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
            
            // Check if this appointment belongs to the current doctor and is pending
            if (appointmentData && 
                appointmentData.doctor.toLowerCase() === address.toLowerCase() && 
                appointmentData.status === 0) { // 0 = Pending
              doctorAppointments.push({
                id: i,
                patient: appointmentData.patient,
                doctor: appointmentData.doctor,
                amount: appointmentData.amount,
                status: appointmentData.status
              });
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
  }, [address, nextAppointmentId]);

  const getAppointmentDetails = async (appointmentId: number): Promise<any> => {
    try {
      const escrow = await getEscrowContract();
      const appointment = await escrow.appointments(appointmentId);
      
      return {
        patient: appointment[0],
        doctor: appointment[1],
        amount: appointment[2].toString(),
        status: appointment[3]
      };
    } catch (error) {
      console.error(`Error getting appointment ${appointmentId}:`, error);
      return null;
    }
  };

  const acceptAppointment = async (appointmentId: number) => {
    if (!address) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      const escrow = await getEscrowContract();
      const tx = await escrow.completeAppointment(appointmentId);
      await tx.wait();
      
      alert("Appointment accepted and payment released!");
      
      // Remove the accepted appointment from the list
      setAppointments(prev => prev.filter(apt => apt.id !== appointmentId));
    } catch (err: any) {
      console.error("Error accepting appointment:", err);
      alert(`Failed to accept appointment: ${err.message}`);
    }
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return "Pending";
      case 1: return "Completed";
      case 2: return "Cancelled";
      case 3: return "Disputed";
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
                    Amount: {appointment.amount} U2U
                  </p>
                  <p className="text-sm text-gray-600">
                    Status: <span className="text-orange-600">{getStatusText(appointment.status)}</span>
                  </p>
                </div>
                <button
                  onClick={() => acceptAppointment(appointment.id)}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors ml-3"
                >
                  Accept
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