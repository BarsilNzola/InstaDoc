import ApproveDoctors from "./ApproveDoctors";
import ManagePatients from "./ManagePatients";
import ViewAllRecords from "./ViewAllRecords";

export default function AdminDashboard() {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Admin Dashboard</h2>
      <ApproveDoctors />
      <ManagePatients />
      <ViewAllRecords />
    </div>
  );
}
