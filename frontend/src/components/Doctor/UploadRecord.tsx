import { useState } from "react";
import { uploadEncryptedFile, uploadFile } from "../../lib/ipfs";
import { getPatientRecordsContract } from "../../lib/contracts";

export default function UploadRecord() {
  const [file, setFile] = useState<File | null>(null);
  const [patientAddr, setPatientAddr] = useState("");
  const [status, setStatus] = useState("");
  const [encrypt, setEncrypt] = useState(true);
  const [secretKey, setSecretKey] = useState("");

  const handleUpload = async () => {
    if (!file || !patientAddr) {
      setStatus("⚠️ Please provide patient address and select a file.");
      return;
    }

    if (encrypt && !secretKey) {
      setStatus("⚠️ Secret key is required for encrypted upload.");
      return;
    }

    try {
      let cid: string;

      if (encrypt) {
        cid = await uploadEncryptedFile(file, secretKey);
      } else {
        cid = await uploadFile(file);
      }

      const contract = await getPatientRecordsContract();
      const tx = await contract.addRecord(
        patientAddr,
        "Doctor Note",
        cid
      );
      await tx.wait();

      setStatus(`✅ Record uploaded for patient: ${patientAddr}`);
    } catch (err: any) {
      setStatus("❌ " + err.message);
    }
  };

  return (
    <div className="space-y-3 p-4 border rounded shadow bg-white">
      <input
        type="text"
        placeholder="Patient wallet address"
        value={patientAddr}
        onChange={(e) => setPatientAddr(e.target.value)}
        className="border p-2 rounded w-full"
      />

      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="w-full"
      />

      <div className="flex items-center space-x-3">
        <label className="flex items-center space-x-1">
          <input
            type="checkbox"
            checked={encrypt}
            onChange={() => setEncrypt(!encrypt)}
          />
          <span>Encrypt before upload</span>
        </label>
      </div>

      {encrypt && (
        <input
          type="password"
          placeholder="Enter secret key"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          className="border p-2 rounded w-full"
        />
      )}

      <button
        onClick={handleUpload}
        className="bg-green-600 text-white px-4 py-2 rounded w-full"
      >
        Upload Patient Record
      </button>

      {status && <p className="text-sm">{status}</p>}
    </div>
  );
}
