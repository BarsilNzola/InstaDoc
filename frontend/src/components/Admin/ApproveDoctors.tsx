import { useState } from "react";

export default function ApproveDoctors() {
  const [pending, setPending] = useState<string[]>([
    "0x1234...abcd",
    "0xabcd...9876",
  ]);

  const handleApprove = (addr: string) => {
    console.log("✅ Approve doctor:", addr);
    // TODO: call contract here
  };

  const handleReject = (addr: string) => {
    console.log("❌ Reject doctor:", addr);
    // TODO: call contract here
  };

  return (
    <div className="p-4 border rounded bg-white shadow">
      <h3 className="text-lg font-semibold mb-2">Approve Doctors</h3>
      {pending.length > 0 ? (
        <ul className="space-y-2">
          {pending.map((addr, i) => (
            <li
              key={i}
              className="flex items-center justify-between border p-2 rounded"
            >
              <span>{addr}</span>
              <div className="space-x-2">
                <button
                  onClick={() => handleApprove(addr)}
                  className="bg-green-600 text-white px-3 py-1 rounded"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReject(addr)}
                  className="bg-red-600 text-white px-3 py-1 rounded"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>No pending requests.</p>
      )}
    </div>
  );
}
