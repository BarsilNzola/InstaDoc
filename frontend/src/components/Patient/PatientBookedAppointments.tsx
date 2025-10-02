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
      case 0: return "Pending Doctor Confirmation";
      case 1: return "Confirmed - Ready for Consultation";
      case 2: return "Completed";
      case 3: return "Cancelled by You";
      case 4: return "Declined by Doctor";
      case 5: return "Disputed";
      default: return "Unknown";
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return { bg: '#fffbeb', text: '#d97706', border: '#fcd34d' }; // Yellow for pending
      case 1: return { bg: '#f0f9f0', text: '#166534', border: '#86efac' }; // Green for confirmed
      case 2: return { bg: '#f0f9ff', text: '#0369a1', border: '#7dd3fc' }; // Blue for completed
      case 3: return { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' }; // Red for cancelled
      case 4: return { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' }; // Red for declined
      case 5: return { bg: '#faf5ff', text: '#7c3aed', border: '#c4b5fd' }; // Purple for disputed
      default: return { bg: '#f9fafb', text: '#6b7280', border: '#d1d5db' }; // Gray for unknown
    }
  };

  const getStatusIcon = (status: number) => {
    switch (status) {
      case 0: return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
      case 1: return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
      case 2: return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
      case 3: case 4: return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
      case 5: return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      );
      default: return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
  };

  const isSubmitting = isCancelling || isConfirming;

  if (!address) {
    return (
      <div 
        className="p-4 border rounded-lg shadow-sm"
        style={{
          backgroundColor: '#fffbeb',
          borderColor: '#fcd34d',
          color: '#d97706'
        }}
      >
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Please connect your wallet to view your appointments</span>
        </div>
      </div>
    );
  }

  if (!escrowAddress) {
    return (
      <div 
        className="p-4 border rounded-lg shadow-sm"
        style={{
          backgroundColor: '#fffbeb',
          borderColor: '#fcd34d',
          color: '#d97706'
        }}
      >
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: '#d97706' }}></div>
          <span>Loading escrow contract...</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 border rounded-xl shadow-md" style={{ backgroundColor: '#f2ead3' }}>
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#344f1f' }}>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold" style={{ color: '#344f1f' }}>My Booked Appointments</h3>
        </div>
        <div className="flex items-center space-x-3" style={{ color: '#344f1f', opacity: 0.8 }}>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: '#344f1f' }}></div>
          <span className="text-lg">Loading appointments...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 border rounded-xl shadow-md" style={{ backgroundColor: '#f2ead3' }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#344f1f' }}>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold" style={{ color: '#344f1f' }}>My Booked Appointments</h3>
        </div>
        <span 
          className="px-4 py-2 rounded-full font-bold text-lg"
          style={{ backgroundColor: '#f9f5f0', color: '#344f1f' }}
        >
          {appointments.length}
        </span>
      </div>
      
      {appointments.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f9f5f0' }}>
            <svg className="w-10 h-10" style={{ color: '#f4991a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-xl mb-3" style={{ color: '#344f1f', opacity: 0.8 }}>No booked appointments</p>
          <p className="text-lg" style={{ color: '#344f1f', opacity: 0.6 }}>
            Your appointments will appear here after booking
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => {
            const statusColors = getStatusColor(appointment.status);
            return (
              <div 
                key={appointment.id} 
                className="border p-6 rounded-xl transition-all duration-300 hover:shadow-md"
                style={{ backgroundColor: '#f9f5f0', borderColor: '#d6d3d1' }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-4">
                      <span className="inline-block w-3 h-3 rounded-full" 
                        style={{ 
                          backgroundColor: statusColors.text 
                        }}></span>
                      <h4 className="font-bold text-xl" style={{ color: '#344f1f' }}>
                        Appointment #{appointment.id}
                      </h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-semibold mb-1" style={{ color: '#344f1f', opacity: 0.8 }}>Doctor</p>
                        <p className="font-mono text-lg" style={{ color: '#344f1f' }}>
                          {appointment.doctor.slice(0, 8)}...{appointment.doctor.slice(-6)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold mb-1" style={{ color: '#344f1f', opacity: 0.8 }}>Amount</p>
                        <p className="text-lg font-bold" style={{ color: '#344f1f' }}>
                          {(Number(appointment.amount) / 1e18).toFixed(4)} U2U
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold mb-1" style={{ color: '#344f1f', opacity: 0.8 }}>Status</p>
                        <div className="flex items-center space-x-2">
                          <span 
                            className="px-3 py-1 rounded-full text-sm font-semibold flex items-center space-x-2"
                            style={{ 
                              backgroundColor: statusColors.bg, 
                              color: statusColors.text,
                              border: `1px solid ${statusColors.border}`
                            }}
                          >
                            {getStatusIcon(appointment.status)}
                            <span>{getStatusText(appointment.status)}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {appointment.status === 0 && (
                    <button 
                      onClick={() => handleCancelAppointment(appointment.id)}
                      disabled={isSubmitting}
                      className="ml-6 px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:shadow-lg disabled:opacity-50 flex items-center space-x-2"
                      style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Cancelling...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span>Cancel</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <div 
        className="mt-6 p-4 border rounded-lg"
        style={{ backgroundColor: '#f9f5f0', borderColor: '#d6d3d1' }}
      >
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold" style={{ color: '#344f1f' }}>
            Active Appointments
          </p>
          <span className="text-lg" style={{ color: '#344f1f', opacity: 0.8 }}>
            {appointments.length} appointment{appointments.length !== 1 ? 's' : ''} found
          </span>
        </div>
      </div>
    </div>
  );
}