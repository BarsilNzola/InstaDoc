import { ethers } from "ethers";
import { getEscrowContract } from "../../lib/contracts";

export default function BookAppointment() {
	const handleBook = async () => {
		const escrow = await getEscrowContract();
		const tx = await escrow.deposit(
			"0xDoctorAddressHere",
			{ value: ethers.parseEther("0.1") }
		);
		await tx.wait();
		alert("Appointment booked!");
	};
	return (
		<button onClick={handleBook} className="bg-purple-600 text-white px-4 py-2 rounded">
			Book Appointment
		</button>
	);
}
