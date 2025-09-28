import { useState } from "react";

interface Record {
  patient: string;
  doctor: string;
  description: string;
  cid: string;
}

export default function ViewAllRecords() {
  const [records] = useState<Record[]>([
    {
      patient: "0xaaaa...1111",
      doctor: "0xdddd...3333",
      description: "Blood Test",
      cid: "bafy123...",
    },
  ]);

  return (
    <div className="p-4 border rounded bg-white shadow">
      <h3 className="text-lg font-semibold mb-2">All Records</h3>
      {records.length > 0 ? (
        <ul className="space-y-3">
          {records.map((rec, i) => (
            <li key={i} className="border p-3 rounded bg-gray-100">
              <p><b>Patient:</b> {rec.patient}</p>
              <p><b>Doctor:</b> {rec.doctor}</p>
              <p><b>Description:</b> {rec.description}</p>
              <p><b>CID:</b> {rec.cid}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p>No records found.</p>
      )}
    </div>
  );
}
