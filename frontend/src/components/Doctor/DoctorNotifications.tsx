import { useState, useEffect } from "react";
import { useReadContract, useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { readContract } from "wagmi/actions";
import { config } from "../Shared/wallet";
import hubArtifact from "../../abis/InstaDocHub.json";
import escrowArtifact from "../../abis/EscrowPayments.json";

interface Appointment {
  id: number;
  patient: string;
  doctor: string;
  amount: string;
  status: number;
}

interface DoctorNotificationsProps {
  refreshTrigger?: number;
  onRefresh?: () => void;
}

export default function DoctorNotifications({ refreshTrigger = 0, onRefresh }: DoctorNotificationsProps) {
  const [pendingAppointments, setPendingAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmedAppointmentId, setConfirmedAppointmentId] = useState<number | null>(null);
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

  const { writeContract: confirmAppointment, data: txHash, isPending: isConfirming } = useWriteContract();
  const { isLoading: isWaiting, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Fetch PENDING appointments
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!address || !nextAppointmentId || !escrowAddress) {
        setLoading(false);
        return;
      }

      try {
        const totalAppointments = Number(nextAppointmentId);
        const appointments: Appointment[] = [];

        for (let i = 0; i < totalAppointments; i++) {
          try {
            const appointmentData = await getAppointmentDetails(i);
            
            // Show appointments that are PENDING (status 0) for this doctor
            if (appointmentData && 
                appointmentData.doctor.toLowerCase() === address.toLowerCase() && 
                appointmentData.status === 0) {
              appointments.push({
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

        setPendingAppointments(appointments);
      } catch (error) {
        console.error("Error fetching appointments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [address, nextAppointmentId, escrowAddress, refreshTrigger]);

  const getAppointmentDetails = async (appointmentId: number): Promise<any> => {
    if (!escrowAddress) {
      console.error("Escrow address not available");
      return null;
    }

    try {
      const appointment = await readContract(config, {
        address: escrowAddress as `0x${string}`,
        abi: escrowAbi,
        functionName: "appointments",
        args: [BigInt(appointmentId)],
      });

      const [patient, doctor, amount, status] = appointment as [`0x${string}`, `0x${string}`, bigint, number];
      
      return {
        id: appointmentId,
        patient,
        doctor,
        amount: amount.toString(),
        status
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

    setConfirmedAppointmentId(appointmentId);

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
          setConfirmedAppointmentId(null);
        },
      });
    } catch (err: any) {
      console.error("Error confirming appointment:", err);
      alert(`Failed to confirm appointment: ${err.message}`);
      setConfirmedAppointmentId(null);
    }
  };

  // Handle confirmed appointment - FIXED: No more constant loop
  useEffect(() => {
    if (isConfirmed && confirmedAppointmentId !== null) {
      console.log("Appointment confirmed, removing from list:", confirmedAppointmentId);
      
      // Remove the specific appointment that was confirmed
      setPendingAppointments(prev => prev.filter(apt => apt.id !== confirmedAppointmentId));
      
      // Show success message
      alert("✅ Appointment confirmed! It will now appear in Video Consultations.");
      
      // Trigger parent refresh to update other components
      onRefresh?.();
      
      // Reset the tracking
      setConfirmedAppointmentId(null);
    }
  }, [isConfirmed, confirmedAppointmentId, onRefresh]);

  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return "Pending";
      case 1: return "Confirmed";
      case 2: return "Completed";
      case 3: return "Cancelled by Patient";
      case 4: return "Cancelled by Doctor";
      case 5: return "Disputed";
      default: return "Unknown";
    }
  };

  const isSubmitting = isConfirming || isWaiting;

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
          <span>Please connect your wallet to view appointments</span>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold" style={{ color: '#344f1f' }}>Appointment Requests</h3>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold" style={{ color: '#344f1f' }}>Appointment Requests</h3>
        </div>
        <span 
          className="px-4 py-2 rounded-full font-bold text-lg"
          style={{ backgroundColor: '#f9f5f0', color: '#344f1f' }}
        >
          {pendingAppointments.length}
        </span>
      </div>
      
      {pendingAppointments.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f9f5f0' }}>
            <svg className="w-10 h-10" style={{ color: '#f4991a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-xl mb-3" style={{ color: '#344f1f', opacity: 0.8 }}>No pending appointments</p>
          <p className="text-lg" style={{ color: '#344f1f', opacity: 0.6 }}>
            New appointment requests from patients will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingAppointments.map((appointment) => (
            <div 
              key={appointment.id} 
              className="border p-6 rounded-xl transition-all duration-300 hover:shadow-md"
              style={{ backgroundColor: '#f9f5f0', borderColor: '#d6d3d1' }}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full"></span>
                    <h4 className="font-bold text-xl" style={{ color: '#344f1f' }}>
                      Appointment #{appointment.id}
                    </h4>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-lg" style={{ color: '#344f1f', opacity: 0.8 }}>
                      <strong>Patient:</strong> {appointment.patient.slice(0, 8)}...{appointment.patient.slice(-6)}
                    </p>
                    <p className="text-lg" style={{ color: '#344f1f', opacity: 0.8 }}>
                      <strong>Amount:</strong> {(Number(appointment.amount) / 1e18).toFixed(4)} U2U
                    </p>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold" style={{ color: '#344f1f', opacity: 0.8 }}>Status:</span>
                      <span 
                        className="px-3 py-1 rounded-full text-sm font-semibold"
                        style={{ backgroundColor: '#fffbeb', color: '#d97706' }}
                      >
                        {getStatusText(appointment.status)}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleConfirmAppointment(appointment.id)}
                  disabled={isSubmitting}
                  className="ml-6 px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:shadow-lg disabled:opacity-50 flex items-center space-x-2"
                  style={{ backgroundColor: '#f4991a', color: '#ffffff' }}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Confirming...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Confirm</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div 
        className="mt-6 p-4 border rounded-lg"
        style={{ backgroundColor: '#f9f5f0', borderColor: '#d6d3d1' }}
      >
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold" style={{ color: '#344f1f' }}>
            Pending Requests
          </p>
          <span className="text-lg" style={{ color: '#344f1f', opacity: 0.8 }}>
            {pendingAppointments.length} request{pendingAppointments.length !== 1 ? 's' : ''} awaiting confirmation
          </span>
        </div>
      </div>
    </div>
  );
}