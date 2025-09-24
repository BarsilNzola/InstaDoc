import { useState, useEffect } from "react";
import { getPatientRecordsContract } from "../../lib/contracts";

export default function ViewRecords() {
	const [records, setRecords] = useState<any[]>([]);

	useEffect(() => {
		const fetchRecords = async () => {
			try {
				const contract = await getPatientRecordsContract();
				const patientAddr = (window as any).ethereum.selectedAddress;
				const data = await contract.getRecords(patientAddr);
				setRecords(data);
			} catch (err) {
				console.error(err);
			}
		};
		fetchRecords();
	}, []);

	return (
		<div>
			<h3 className="text-xl font-semibold mb-2">My Records</h3>
			<ul className="space-y-2">
				{records.length > 0 ? (
					records.map((rec, idx) => (
						<li key={idx} className="border p-2 rounded bg-gray-100">
							<p><b>Title:</b> {rec.title}</p>
							<p><b>CID:</b> {rec.cid}</p>
						</li>
					))
				) : (
					<p>No Records Found.</p>
				)}
			</ul>
		</div>
	);
}