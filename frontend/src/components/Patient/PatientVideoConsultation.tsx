import { useState, useEffect } from "react";
import { useReadContract, useAccount } from "wagmi";
import { getEscrowContract } from "../../lib/contracts";
import escrowArtifact from "../../abis/EscrowPayments.json";

interface Consultation {
  id: number;
  patient: string;
  doctor: string;
  amount: string;
  status: number;
}

export default function PatientVideoConsultation() {
  const [activeConsultations, setActiveConsultations] = useState<Consultation[]>([]);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const { address } = useAccount();
  
  const escrowAddress = import.meta.env.VITE_ESCROW_ADDRESS;
  const escrowAbi = escrowArtifact.abi;

  // Get next appointment ID
  const { data: nextAppointmentId } = useReadContract({
    address: escrowAddress as `0x${string}`,
    abi: escrowAbi,
    functionName: "nextAppointmentId",
  });

  // Fetch accepted appointments for video consultation
  useEffect(() => {
    const fetchConsultations = async () => {
      if (!address || !nextAppointmentId) {
        setLoading(false);
        return;
      }

      try {
        const totalAppointments = Number(nextAppointmentId);
        const consultations: Consultation[] = [];

        for (let i = 0; i < totalAppointments; i++) {
          try {
            const appointmentData = await getAppointmentDetails(i);
            
            // Show appointments that are accepted (completed status) for this patient
            if (appointmentData && 
                appointmentData.patient.toLowerCase() === address.toLowerCase() && 
                appointmentData.status === 1) { // 1 = Completed/Accepted
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

  const joinVideoCall = (consultation: Consultation) => {
    setSelectedConsultation(consultation);
    console.log(`Joining video call for consultation #${consultation.id}`);
  };

  const leaveVideoCall = () => {
    setSelectedConsultation(null);
    console.log("Left video call");
  };

  if (!address) {
    return (
      <div className="p-4 border rounded bg-yellow-50 border-yellow-200">
        <p className="text-yellow-800">Please connect your wallet to access video consultations</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 border rounded bg-white">
        <h3 className="text-lg font-semibold mb-3">My Video Consultations</h3>
        <div className="flex items-center space-x-2 text-gray-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Loading consultations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded bg-white shadow">
      <h3 className="text-lg font-semibold mb-3">My Video Consultations</h3>
      
      {selectedConsultation ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-md font-semibold">
              Consultation with Doctor
            </h4>
            <button
              onClick={leaveVideoCall}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
            >
              Leave Call
            </button>
          </div>
          
          {/* Video Call Interface */}
          <div className="bg-black rounded-lg p-4 min-h-[400px] flex items-center justify-center">
            <div className="text-white text-center">
              <div className="text-2xl mb-4">🎥 Video Consultation Active</div>
              <div className="text-sm text-gray-300">
                <p>Consultation ID: #{selectedConsultation.id}</p>
                <p>Doctor: {selectedConsultation.doctor.slice(0, 8)}...</p>
                <p>Amount: {selectedConsultation.amount} U2U</p>
              </div>
              <div className="mt-6 space-x-4">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                  Mute
                </button>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                  Video Off
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {activeConsultations.length === 0 ? (
            <div className="text-gray-500 text-center py-4">
              <p>No scheduled video consultations</p>
              <p className="text-sm mt-1">When doctors accept your appointments, they will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeConsultations.map((consultation) => (
                <div key={consultation.id} className="border p-3 rounded bg-green-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold">Consultation #{consultation.id}</h4>
                      <p className="text-sm text-gray-600">
                        Doctor: {consultation.doctor.slice(0, 8)}...{consultation.doctor.slice(-6)}
                      </p>
                      <p className="text-sm text-gray-600">
                        Amount: {consultation.amount} U2U
                      </p>
                    </div>
                    <button
                      onClick={() => joinVideoCall(consultation)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
                    >
                      Join Video Call
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      
      {!selectedConsultation && (
        <div className="mt-3 text-xs text-gray-500">
          {activeConsultations.length} scheduled consultation(s)
        </div>
      )}
    </div>
  );
}