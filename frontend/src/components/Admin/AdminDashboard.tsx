import ApproveDoctors from "./ApproveDoctors";
import ManagePatients from "./ManagePatients";
import ViewAllRecords from "./ViewAllRecords";

export default function AdminDashboard() {
  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-4 mb-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#344f1f' }}>
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-4xl font-bold" style={{ color: '#344f1f' }}>Admin Dashboard</h2>
        </div>
        <p className="text-xl max-w-2xl mx-auto" style={{ color: '#344f1f', opacity: 0.8 }}>
          Manage doctors, patients, and medical records across the InstaDoc platform
        </p>
      </div>

      {/* Dashboard Components */}
      <div className="space-y-8">
        <ApproveDoctors />
        <ManagePatients />
        <ViewAllRecords />
      </div>

      {/* Footer Note */}
      <div className="text-center pt-8 border-t" style={{ borderColor: '#d6d3d1' }}>
        <p className="text-sm" style={{ color: '#344f1f', opacity: 0.6 }}>
          InstaDoc Admin Panel • Secure Medical Record Management
        </p>
      </div>
    </div>
  );
}