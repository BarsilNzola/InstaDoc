import { useEffect, useState } from "react";
import { getPatientRecordsContract } from "../../lib/contracts";

export default function ManageRecords() {
	const [records, setRecords] = useState<any[]>([]);
	const [patientAddr, setPatientAddr] = useState("");

	const fetchRecords = async () => {
		if (!patientAddr) return;
		try {
			const contract = await getPatientRecordsContract();
			const data = await contract.getRecords(patientAddr);
			setRecords(data);
		} catch (err) {
			console.error(err);
		}
	};

	useEffect(() => {
		if (patientAddr) fetchRecords();
	}, [patientAddr]);

	return (
		<div>
			<h3 className="text-xl font-semibold mb-2">Manage Patient Records</h3>
			<input
				type="text"
				placeholder="Patient wallet address"
				value={patientAddr}
				onChange={(e) => setPatientAddr(e.target.value)}
				className="border p-2 rounded w-full mb-2"
			/>
			<button
				onClick={fetchRecords}
				className="bg-blue-600 text-white px-4 py-2 rounded"
			>
				Load Records
			</button>
			<ul className="space-y-2 mt-3">
				{records.length > 0 ? (
					records.map((rec, idx) => (
						<li key={idx} className="border p-2 rounded bg-gray-100">
							<p><b>Title:</b> {rec.title}</p>
							<p><b>CID:</b> {rec.cid}</p>
						</li>
					))
				) : (
					<p>No Records found.</p>
				)}
			</ul>
		</div>
	);
}