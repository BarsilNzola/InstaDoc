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

  return (
    <button 
      onClick={() => handleAcceptAppointment(appointmentId)} 
      disabled={loading || isWriting || isConfirming}
      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded transition-colors"
    >
      {loading || isWriting || isConfirming ? "Confirming..." : `Confirm Appointment #${appointmentId}`}
    </button>
  );
}