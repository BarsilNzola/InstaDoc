import { useState, useEffect } from "react";
import { useReadContract, useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { readContract } from "wagmi/actions";
import { config } from "../Shared/wallet";
import hubArtifact from "../../abis/InstaDocHub.json";
import escrowArtifact from "../../abis/EscrowPayments.json";

interface Consultation {
  id: number;
  patient: string;
  doctor: string;
  amount: string;
  status: number;
}

export default function DoctorVideoConsultation() {
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

  // Fetch CONFIRMED appointments for video consultation
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
            
            // Show appointments that are CONFIRMED (status 1) for this doctor
            if (appointmentData && 
                appointmentData.doctor.toLowerCase() === address.toLowerCase() && 
                appointmentData.status === 1) { // 1 = Confirmed (was Completed/Accepted)
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
  }, [address, nextAppointmentId, escrowAddress]);

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

  // Remove completed appointment after confirmation
  useEffect(() => {
    if (isCompleted) {
      alert("✅ Appointment completed! Payment has been released to you.");
      // Remove the completed appointment from the list
      setActiveConsultations(prev => prev.filter(apt => apt.id !== Number(txHash)));
      setSelectedConsultation(null);
    }
  }, [isCompleted, txHash]);

  const startVideoCall = (consultation: Consultation) => {
    setSelectedConsultation(consultation);
    console.log(`Starting video call for consultation #${consultation.id}`);
  };

  const endVideoCall = () => {
    setSelectedConsultation(null);
    console.log("Video call ended");
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return "Pending";
      case 1: return "Confirmed - Ready for Consultation";
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
        <p className="text-yellow-800">Please connect your wallet to access video consultations</p>
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
        <h3 className="text-lg font-semibold mb-3">Video Consultations</h3>
        <div className="flex items-center space-x-2 text-gray-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Loading consultations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded bg-white shadow">
      <h3 className="text-lg font-semibold mb-3">Video Consultations</h3>
      
      {selectedConsultation ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-md font-semibold">
              Consultation with Patient {selectedConsultation.patient.slice(0, 8)}...
            </h4>
            <button
              onClick={endVideoCall}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
            >
              End Call
            </button>
          </div>
          
          {/* Video Call Interface */}
          <div className="bg-black rounded-lg p-4 min-h-[400px] flex items-center justify-center">
            <div className="text-white text-center">
              <div className="text-2xl mb-4">🎥 Video Consultation Active</div>
              <div className="text-sm text-gray-300">
                <p>Consultation ID: #{selectedConsultation.id}</p>
                <p>Patient: {selectedConsultation.patient.slice(0, 8)}...</p>
                <p>Amount: {(Number(selectedConsultation.amount) / 1e18).toFixed(4)} U2U</p>
                <p className="text-green-400 mt-2">Status: {getStatusText(selectedConsultation.status)}</p>
              </div>
              <div className="mt-6 space-x-4">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                  Mute
                </button>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                  Video Off
                </button>
                <button 
                  onClick={() => handleCompleteAppointment(selectedConsultation.id)}
                  disabled={isCompleting || isConfirming}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  {isCompleting ? "Completing..." : isConfirming ? "Processing..." : "Complete Consultation"}
                </button>
              </div>
            </div>
          </div>
          
          {/* Consultation Notes */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Consultation Notes</label>
            <textarea 
              className="w-full p-2 border rounded h-24"
              placeholder="Enter consultation notes and recommendations..."
            />
            <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded">
              Save Notes
            </button>
          </div>
        </div>
      ) : (
        <>
          {activeConsultations.length === 0 ? (
            <div className="text-gray-500 text-center py-4">
              <p>No active consultations</p>
              <p className="text-sm mt-1">Confirmed appointments will appear here for video consultation</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeConsultations.map((consultation) => (
                <div key={consultation.id} className="border p-3 rounded bg-green-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold">Consultation #{consultation.id}</h4>
                      <p className="text-sm text-gray-600">
                        Patient: {consultation.patient.slice(0, 8)}...{consultation.patient.slice(-6)}
                      </p>
                      <p className="text-sm text-gray-600">
                        Amount: {(Number(consultation.amount) / 1e18).toFixed(4)} U2U
                      </p>
                      <p className="text-sm text-green-600 font-medium">
                        {getStatusText(consultation.status)}
                      </p>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={() => startVideoCall(consultation)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
                      >
                        Start Video Call
                      </button>
                      <button
                        onClick={() => handleCompleteAppointment(consultation.id)}
                        disabled={isCompleting || isConfirming}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors disabled:opacity-50"
                      >
                        {isCompleting ? "Completing..." : "Complete"}
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
        <div className="mt-3 text-xs text-gray-500">
          {activeConsultations.length} confirmed consultation(s) ready for video call
        </div>
      )}
    </div>
  );
}