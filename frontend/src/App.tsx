import { useState } from 'react'
import PatientDashboard from "./components/Patient/PatientDashboard";
import DoctorDashboard from "./components/Doctor/DoctorDashboard";
import { ConnectWallet } from "./components/Shared/ConnectWallet";
import './App.css'

function App() {
  const [role, setRole] = useState<"patient" | "doctor" | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="p-4 flex justify-between items-center bg-blue-900 text-white">
        <h1 className="text-xl font-bold">InstaDoc</h1>
        <ConnectWallet />
      </header>

      <main className="p-6">
        {!role ? (
          <div className="space-x-4">
            <button
              className="bg-green-600 text-white px-4 py-2 rounded"
              onClick={() => setRole("patient")}
            >
              Patient
            </button>
            <button
              className="bg-indigo-600 text-white px-4 py-2 rounded"
              onClick={() => setRole("doctor")}
            >
              Doctor
            </button>
          </div>
        ) : role === "patient" ? (
          <PatientDashboard />
        ) : (
          <DoctorDashboard />
        )}
      </main>
    </div>
  );
}

export default App
