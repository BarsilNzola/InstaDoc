import { getEscrowContract } from "../../lib/contracts";

export default function AcceptAppointment() {
	const acceptAppointment = async (id: number) => {
		const escrow = await getEscrowContract();
		const tx = await escrow.acceptAppointment(id);
		await tx.wait();
		alert("Appointment accepted");
	};

	return (
		<button onClick={() => acceptAppointment(1)} className="bg-orange-600 text-white px-4 py-2 rounded">
			Accept Appointment #1
		</button>
	);
}