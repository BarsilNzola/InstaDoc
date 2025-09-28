import { useEffect, useState } from "react";
import { getPatientRecordsContract } from "../../lib/contracts";
import { downloadEncryptedFile, downloadFile } from "../../lib/ipfs";

export default function ManageRecords() {
  const [records, setRecords] = useState<any[]>([]);
  const [patientAddr, setPatientAddr] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);

  const fetchRecords = async () => {
    if (!patientAddr) return;
    try {
      const contract = await getPatientRecordsContract();
      const data = await contract.getRecords(patientAddr);
      setRecords(data);
    } catch (err) {
      console.error(err);
      alert("❌ Failed to fetch records");
    }
  };

  const handleDownload = async (rec: any) => {
    try {
      setDownloading(rec.cid);

      let blob: Blob;
      if (rec.encrypted) {
        if (!secretKey) {
          alert("⚠️ Secret key required for decryption");
          return;
        }
        const blob = await downloadEncryptedFile(rec.cid, secretKey);
		const url = URL.createObjectURL(blob);
        return;
      } else {
        blob = await downloadFile(rec.cid);
      }

      // Download for non-encrypted
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${rec.title || "record"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert("❌ " + err.message);
    } finally {
      setDownloading(null);
    }
  };

  useEffect(() => {
    if (patientAddr) fetchRecords();
  }, [patientAddr]);

  return (
    <div className="space-y-4 p-4 border rounded bg-white shadow">
      <h3 className="text-xl font-semibold">Manage Patient Records</h3>

      <input
        type="text"
        placeholder="Patient wallet address"
        value={patientAddr}
        onChange={(e) => setPatientAddr(e.target.value)}
        className="border p-2 rounded w-full"
      />

      <div className="flex items-center space-x-2">
        <input
          type="password"
          placeholder="Enter secret key (if encrypted)"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          className="border p-2 rounded w-full"
        />
        <button
          onClick={fetchRecords}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Load Records
        </button>
      </div>

      <ul className="space-y-3">
        {records.length > 0 ? (
          records.map((rec, idx) => (
            <li
              key={idx}
              className="border p-3 rounded bg-gray-100 flex flex-col space-y-2"
            >
              <p><b>Title:</b> {rec.title}</p>
              <p><b>CID:</b> {rec.cid}</p>
              <p><b>Encrypted:</b> {rec.encrypted ? "Yes 🔒" : "No 🔓"}</p>

              <button
                onClick={() => handleDownload(rec)}
                className={`px-3 py-1 rounded text-white ${
                  rec.encrypted ? "bg-green-600" : "bg-gray-600"
                }`}
                disabled={downloading === rec.cid}
              >
                {downloading === rec.cid
                  ? "Downloading..."
                  : rec.encrypted
                  ? "Download & Decrypt"
                  : "Download"}
              </button>
            </li>
          ))
        ) : (
          <p>No Records found.</p>
        )}
      </ul>
    </div>
  );
}
