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
      alert("Consultation marked as completed and payment released!");
      onConsultationCompleted?.();
      setLoading(false);
    }
  }, [isConfirmed, onConsultationCompleted]);

  return (
    <button 
      onClick={() => markDone(appointmentId)} 
      disabled={loading || isWriting || isConfirming}
      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded transition-colors"
    >
      {loading || isWriting || isConfirming ? "Processing..." : `Complete Consultation #${appointmentId}`}
    </button>
  );
}