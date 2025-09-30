import { useState } from "react";
import { getEscrowContract } from "../../lib/contracts";
import { useAccount } from "wagmi";

interface MarkConsultationDoneProps {
  appointmentId: number;
  onConsultationCompleted?: () => void;
}

export default function MarkConsultationDone({ appointmentId, onConsultationCompleted }: MarkConsultationDoneProps) {
  const [loading, setLoading] = useState(false);
  const { address } = useAccount();

  const markDone = async (id: number) => {
    if (!address) {
      alert("Please connect your wallet first");
      return;
    }

    setLoading(true);
    try {
      const escrow = await getEscrowContract();
      const tx = await escrow.completeAppointment(id);
      await tx.wait();
      
      alert("Consultation marked as completed and payment released!");
      onConsultationCompleted?.();
    } catch (err: any) {
      console.error("Error marking consultation done:", err);
      alert(`Failed to mark consultation: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={() => markDone(appointmentId)} 
      disabled={loading}
      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded transition-colors"
    >
      {loading ? "Processing..." : `Complete Consultation #${appointmentId}`}
    </button>
  );
}