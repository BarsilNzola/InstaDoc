import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { readContract } from "wagmi/actions";
import { config } from "../Shared/wallet";
import hubArtifact from "../../abis/InstaDocHub.json";
import escrowArtifact from "../../abis/EscrowPayments.json";
import VideoCall from "../Shared/VideoCall";

interface Consultation {
  id: number;
  patient: string;
  doctor: string;
  amount: string;
  status: number;
}

interface PatientVideoConsultationProps {
  refreshTrigger?: number;
  onRefresh?: () => void;
}

export default function PatientVideoConsultation({ refreshTrigger = 0, onRefresh }: PatientVideoConsultationProps) {
  const [activeConsultations, setActiveConsultations] = useState<Consultation[]>([]);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
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

  const { writeContract: completeAppointment, data: txHash, isPending: isCompleting } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isCompleted } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Fetch confirmed appointments for video consultation - ADD refreshTrigger TO DEPENDENCIES
  useEffect(() => {
    const fetchConsultations = async () => {
      if (!address || !nextAppointmentId || !escrowAddress) {
        setLoading(false);
        return;
      }

      try {
        const totalAppointments = Number(nextAppointmentId);
        const consultations: Consultation[] = [];

        for (let i = 0; i < totalAppointments; i++) {
          try {
            const appointmentData = await getAppointmentDetails(i);
            
            // Show appointments that are CONFIRMED (status 1) for this patient
            if (appointmentData && 
                appointmentData.patient.toLowerCase() === address.toLowerCase() && 
                appointmentData.status === 1) { // 1 = Confirmed (was Completed)
              consultations.push({
                id: i,
                patient: appointmentData.patient,
                doctor: appointmentData.doctor,
                amount: appointmentData.amount,
                status: appointmentData.status
              });
            }
          } catch (error) {
            console.error(`Error fetching consultation ${i}:`, error);
          }
        }

        setActiveConsultations(consultations);
      } catch (error) {
        console.error("Error fetching consultations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConsultations();
  }, [address, nextAppointmentId, escrowAddress, refreshTrigger]); // ADDED refreshTrigger HERE

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

      // The contract returns a tuple: [patient, doctor, amount, status]
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

  const handleCompleteAppointment = async (appointmentId: number) => {
    if (!address || !escrowAddress) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      completeAppointment({
        address: escrowAddress as `0x${string}`,
        abi: escrowAbi,
        functionName: "completeAppointment",
        args: [BigInt(appointmentId)],
      }, {
        onSuccess: (txHash) => {
          console.log("Appointment completion submitted:", txHash);
        },
        onError: (error) => {
          console.error("Appointment completion failed:", error);
          alert(`❌ Failed to complete appointment: ${error.message}`);
        },
      });
    } catch (err: any) {
      console.error("Error completing appointment:", err);
      alert(`Failed to complete appointment: ${err.message}`);
    }
  };

  // Remove completed appointment after confirmation AND TRIGGER REFRESH
  useEffect(() => {
    if (isCompleted) {
      alert("✅ Appointment completed! Payment has been released to the doctor.");
      // Remove the completed appointment from the list
      setActiveConsultations(prev => prev.filter(apt => apt.id !== Number(txHash)));
      setSelectedConsultation(null);
      // Trigger parent refresh to update other components
      onRefresh?.();
    }
  }, [isCompleted, txHash, onRefresh]);

  const joinVideoCall = (consultation: Consultation) => {
    setSelectedConsultation(consultation);
    console.log(`Joining video call for consultation #${consultation.id}`);
  };

  const leaveVideoCall = () => {
    setSelectedConsultation(null);
    console.log("Left video call");
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return "Pending";
      case 1: return "Confirmed - Ready for Consultation";
      case 2: return "Completed";
      case 3: return "Cancelled by You";
      case 4: return "Cancelled by Doctor";
      case 5: return "Disputed";
      default: return "Unknown";
    }
  };

  const isSubmitting = isCompleting || isConfirming;

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
          <span>Please connect your wallet to access video consultations</span>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold" style={{ color: '#344f1f' }}>My Video Consultations</h3>
        </div>
        <div className="flex items-center space-x-3" style={{ color: '#344f1f', opacity: 0.8 }}>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: '#344f1f' }}></div>
          <span className="text-lg">Loading consultations...</span>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold" style={{ color: '#344f1f' }}>My Video Consultations</h3>
        </div>
        {!selectedConsultation && (
          <span 
            className="px-4 py-2 rounded-full font-bold text-lg"
            style={{ backgroundColor: '#f9f5f0', color: '#344f1f' }}
          >
            {activeConsultations.length}
          </span>
        )}
      </div>
      
      {selectedConsultation ? (
        <div className="space-y-6">
          <VideoCall
            consultationId={selectedConsultation.id}
            patientAddress={selectedConsultation.patient}
            doctorAddress={selectedConsultation.doctor}
            isDoctor={false}
            onEndCall={leaveVideoCall}
          />
          
          {/* Completion Button */}
          <div className="flex justify-center">
            <button 
              onClick={() => handleCompleteAppointment(selectedConsultation.id)}
              disabled={isSubmitting}
              className="px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 hover:shadow-lg disabled:opacity-50 flex items-center space-x-3"
              style={{ backgroundColor: '#f4991a', color: '#ffffff' }}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Complete Consultation</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <>
          {activeConsultations.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f9f5f0' }}>
                <svg className="w-10 h-10" style={{ color: '#f4991a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-xl mb-3" style={{ color: '#344f1f', opacity: 0.8 }}>No scheduled video consultations</p>
              <p className="text-lg" style={{ color: '#344f1f', opacity: 0.6 }}>
                When doctors confirm your appointments, they will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeConsultations.map((consultation) => (
                <div 
                  key={consultation.id} 
                  className="border p-6 rounded-xl transition-all duration-300 hover:shadow-md"
                  style={{ backgroundColor: '#f9f5f0', borderColor: '#d6d3d1' }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <span className="inline-block w-3 h-3 bg-green-500 rounded-full"></span>
                        <h4 className="font-bold text-xl" style={{ color: '#344f1f' }}>
                          Consultation #{consultation.id}
                        </h4>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-lg" style={{ color: '#344f1f', opacity: 0.8 }}>
                          <strong>Doctor:</strong> {consultation.doctor.slice(0, 8)}...{consultation.doctor.slice(-6)}
                        </p>
                        <p className="text-lg" style={{ color: '#344f1f', opacity: 0.8 }}>
                          <strong>Amount:</strong> {(Number(consultation.amount) / 1e18).toFixed(4)} U2U
                        </p>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-semibold" style={{ color: '#344f1f', opacity: 0.8 }}>Status:</span>
                          <span 
                            className="px-3 py-1 rounded-full text-sm font-semibold"
                            style={{ backgroundColor: '#f0fdf4', color: '#166534' }}
                          >
                            {getStatusText(consultation.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-3 ml-6">
                      <button
                        onClick={() => joinVideoCall(consultation)}
                        className="px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:shadow-lg flex items-center space-x-2"
                        style={{ backgroundColor: '#344f1f', color: '#ffffff' }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>Join Video Call</span>
                      </button>
                      <button
                        onClick={() => handleCompleteAppointment(consultation.id)}
                        disabled={isSubmitting}
                        className="px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:shadow-lg disabled:opacity-50 flex items-center space-x-2"
                        style={{ backgroundColor: '#f4991a', color: '#ffffff' }}
                      >
                        {isSubmitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Complete</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      
      {!selectedConsultation && (
        <div 
          className="mt-6 p-4 border rounded-lg"
          style={{ backgroundColor: '#f9f5f0', borderColor: '#d6d3d1' }}
        >
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold" style={{ color: '#344f1f' }}>
              Active Consultations
            </p>
            <span className="text-lg" style={{ color: '#344f1f', opacity: 0.8 }}>
              {activeConsultations.length} consultation{activeConsultations.length !== 1 ? 's' : ''} ready for video call
            </span>
          </div>
        </div>
      )}
    </div>
  );
}