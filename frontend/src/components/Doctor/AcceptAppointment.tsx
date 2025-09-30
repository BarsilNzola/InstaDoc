import { useState } from "react";
import { getEscrowContract } from "../../lib/contracts";
import { useAccount } from "wagmi";

interface AcceptAppointmentProps {
  appointmentId: number;
  onAppointmentAccepted?: () => void;
}

export default function AcceptAppointment({ appointmentId, onAppointmentAccepted }: AcceptAppointmentProps) {
  const [loading, setLoading] = useState(false);
  const { address } = useAccount();

  const acceptAppointment = async (id: number) => {
    if (!address) {
      alert("Please connect your wallet first");
      return;
    }

    setLoading(true);
    try {
      const escrow = await getEscrowContract();
      const tx = await escrow.completeAppointment(id);
      await tx.wait();
      
      alert("Appointment completed and payment released!");
      onAppointmentAccepted?.();
    } catch (err: any) {
      console.error("Error accepting appointment:", err);
      alert(`Failed to accept appointment: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={() => acceptAppointment(appointmentId)} 
      disabled={loading}
      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded transition-colors"
    >
      {loading ? "Processing..." : `Complete Appointment #${appointmentId}`}
    </button>
  );
}