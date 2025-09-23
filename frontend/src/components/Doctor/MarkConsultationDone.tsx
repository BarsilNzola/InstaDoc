import { getEscrowContract } from "../../lib/contracts";

export default function MarkConsultationDone() {
	const markDone = async (id: number) => {
		const escrow = await getEscrowContract();
		const tx = await escrow.markDone(id);
		await tx.wait();
		alert("Marked as Done");
	};

	return (
		<button onClick={() => markDone(1)} className="bg-yellow-600 text-white px-4 py-2 rounded">
			Mark Consultation Done
		</button>
	);
}