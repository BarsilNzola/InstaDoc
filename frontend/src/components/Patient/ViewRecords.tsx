import { useState, useEffect } from "react";
import { getPatientRecordsContract } from "../../lib/contracts";
import { downloadEncryptedFile, downloadFile } from "../../lib/ipfs";

export default function ViewRecords() {
  const [records, setRecords] = useState<any[]>([]);
  const [secretKey, setSecretKey] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);

  const fetchRecords = async () => {
    try {
      const contract = await getPatientRecordsContract();
      const patientAddr = (window as any).ethereum.selectedAddress;
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

      if (rec.encrypted) {
        if (!secretKey) {
          alert("⚠️ Secret key required for decryption");
          return;
        }
        const blob = await downloadEncryptedFile(rec.cid, secretKey);
		const url = URL.createObjectURL(blob);
	    } else {
        const blob = await downloadFile(rec.cid);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${rec.title || "record"}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      console.error(err);
      alert("❌ " + err.message);
    } finally {
      setDownloading(null);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  return (
    <div className="space-y-4 p-4 border rounded bg-white shadow">
      <h3 className="text-xl font-semibold">My Records</h3>

      <input
        type="password"
        placeholder="Enter secret key (if encrypted)"
        value={secretKey}
        onChange={(e) => setSecretKey(e.target.value)}
        className="border p-2 rounded w-full"
      />

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
          <p>No Records Found.</p>
        )}
      </ul>
    </div>
  );
}
