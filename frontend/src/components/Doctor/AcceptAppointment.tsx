import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { confirmAppointment } from "../../lib/contracts";

interface AcceptAppointmentProps {
  appointmentId: number;
  onAppointmentAccepted?: () => void;
}

export default function AcceptAppointment({ appointmentId, onAppointmentAccepted }: AcceptAppointmentProps) {
  const [loading, setLoading] = useState(false);
  const { address } = useAccount();

  const { writeContract: confirmAppointmentTx, data: txHash, isPending: isWriting } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const handleAcceptAppointment = async (id: number) => {
    if (!address) {
      alert("Please connect your wallet first");
      return;
    }

    setLoading(true);
    try {
      await confirmAppointment(BigInt(id));
    } catch (err: any) {
      console.error("Error accepting appointment:", err);
      alert(`Failed to accept appointment: ${err.message}`);
      setLoading(false);
    }
  };

  // Handle successful confirmation
  useEffect(() => {
    if (isConfirmed) {
      alert("✅ Appointment confirmed! The patient can now see it in their consultations.");
      onAppointmentAccepted?.();
      setLoading(false);
    }
  }, [isConfirmed, onAppointmentAccepted]);

  const isSubmitting = loading || isWriting || isConfirming;

  return (
    <button 
      onClick={() => handleAcceptAppointment(appointmentId)} 
      disabled={isSubmitting}
      className="px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
      style={{ 
        backgroundColor: isSubmitting ? '#9ca3af' : '#f4991a', 
        color: '#ffffff'
      }}
      onMouseOver={(e) => {
        if (!isSubmitting) {
          e.currentTarget.style.backgroundColor = '#e08a17';
        }
      }}
      onMouseOut={(e) => {
        if (!isSubmitting) {
          e.currentTarget.style.backgroundColor = '#f4991a';
        }
      }}
    >
      {isSubmitting ? (
        <>
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          <span className="text-lg">Confirming Appointment...</span>
        </>
      ) : (
        <>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-lg">Confirm Appointment #{appointmentId}</span>
        </>
      )}
    </button>
  );
}