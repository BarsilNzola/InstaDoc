import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { completeAppointment } from "../../lib/contracts";

interface MarkConsultationDoneProps {
  appointmentId: number;
  onConsultationCompleted?: () => void;
}

export default function MarkConsultationDone({ appointmentId, onConsultationCompleted }: MarkConsultationDoneProps) {
  const [loading, setLoading] = useState(false);
  const { address } = useAccount();

  const { writeContract: completeAppointmentTx, data: txHash, isPending: isWriting } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const markDone = async (id: number) => {
    if (!address) {
      alert("Please connect your wallet first");
      return;
    }

    setLoading(true);
    try {
      await completeAppointment(BigInt(id));
    } catch (err: any) {
      console.error("Error marking consultation done:", err);
      alert(`Failed to mark consultation: ${err.message}`);
      setLoading(false);
    }
  };

  // Handle successful completion
  useEffect(() => {
    if (isConfirmed) {
      alert("✅ Consultation marked as completed and payment released!");
      onConsultationCompleted?.();
      setLoading(false);
    }
  }, [isConfirmed, onConsultationCompleted]);

  const isSubmitting = loading || isWriting || isConfirming;

  return (
    <button 
      onClick={() => markDone(appointmentId)} 
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
          <span className="text-lg">Processing...</span>
        </>
      ) : (
        <>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-lg">Complete Consultation #{appointmentId}</span>
        </>
      )}
    </button>
  );
}