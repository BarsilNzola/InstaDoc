import { useState } from "react";
import { uploadEncryptedFile } from "../../lib/ipfs";
import { getPatientRecordsContract } from "../../lib/contracts";

export default function UploadRecord() {
	const [file, setFile] = useState<File | null>(null);
	const [patientAddr, setPatientAddr] = useState("");
	const [status, setStatus] = useState("");

	const handleUpload = async () => {
		if (!file || !patientAddr) return;
		try {
			const cid = await uploadEncryptedFile(file, "secret-key");
			const contract = await getPatientRecordsContract();
			const tx = await contract.addRecord(
				patientAddr,
				"Doctor Note",
				cid
			);
			await tx.wait();
			setStatus("Record uploaded for patient: " + patientAddr);
		} catch (err: any) {
			setStatus("!" + err.message);
		}
	};

	return (
		<div className="space-y-2">
			<input
				type="text"
				placeholder="Patient wallet address"
				value={patientAddr}
				onChange={(e) => setPatientAddr(e.target.value)}
				className="border p-2 rounded w-full"
			/>
			<input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
			<button onClick={handleUpload} className="bg-green-600 text-white px-4 py-2 rounded">
				Upload Patient Record
			</button>
			<p>{status}</p>
		</div>
	);
}