import { useState } from "react";

export default function ManagePatients() {
  const [patients, setPatients] = useState<string[]>([
    "0xaaaa...1111",
    "0xbbbb...2222",
  ]);

  const handleRemove = (addr: string) => {
    console.log("🗑️ Remove patient:", addr);
    // TODO: call contract here
  };

  return (
    <div className="p-4 border rounded bg-white shadow">
      <h3 className="text-lg font-semibold mb-2">Manage Patients</h3>
      {patients.length > 0 ? (
        <ul className="space-y-2">
          {patients.map((addr, i) => (
            <li
              key={i}
              className="flex items-center justify-between border p-2 rounded"
            >
              <span>{addr}</span>
              <button
                onClick={() => handleRemove(addr)}
                className="bg-red-600 text-white px-3 py-1 rounded"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No registered patients.</p>
      )}
    </div>
  );
}
