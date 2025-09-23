import { useState } from "react";
import { getHubContract } from "../../lib/contracts";

export default function PatientSignup() {
	const [status, setStatus] = useState("");

	const handleSignup = async () => {
		try {
			const hub = await getHubContract();
			const tx = await hub.registerPatient();
			await tx.await();
			setStatus("Patient registered");
		} catch (err: any) {
			setStatus("!" + err.message);
		}
	};

	return (
		<div>
			<button onClick={handleSignup} className="bg-blue-600 text-white p-2 rounded">
				Register as Patient
			</button>
			<p>{status}</p>
		</div>
	);
}