import { useState } from "react";
import DoctorNotifications from "./DoctorNotifications";
import DoctorVideoConsultation from "./DoctorVideoConsultation";
import UploadRecord from "./UploadRecord";

export default function DoctorDashboard() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

	return (
		<div className="space-y-8 p-6 max-w-7xl mx-auto">
			{/* Header Section */}
			<div className="text-center mb-8">
				<div className="flex items-center justify-center space-x-4 mb-4">
					<div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#344f1f' }}>
						<svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
						</svg>
					</div>
					<h2 className="text-4xl font-bold" style={{ color: '#344f1f' }}>Doctor Dashboard</h2>
				</div>
				<p className="text-xl max-w-2xl mx-auto" style={{ color: '#344f1f', opacity: 0.8 }}>
					Manage appointments, conduct consultations, and upload patient records
				</p>
			</div>

			{/* Dashboard Components Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* Left Column - Appointments & Notifications */}
				<div className="space-y-8">
					<DoctorNotifications refreshTrigger={refreshTrigger} onRefresh={handleRefresh} />
					<DoctorVideoConsultation refreshTrigger={refreshTrigger} onRefresh={handleRefresh} />
				</div>

				{/* Right Column - Record Management */}
				<div className="space-y-8">
					<UploadRecord />
					
					{/* Quick Stats Card */}
					<div className="p-6 border rounded-xl shadow-md" style={{ backgroundColor: '#f2ead3' }}>
						<div className="flex items-center space-x-3 mb-4">
							<div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#344f1f' }}>
								<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
								</svg>
							</div>
							<h3 className="text-2xl font-bold" style={{ color: '#344f1f' }}>Quick Stats</h3>
						</div>
						
						<div className="grid grid-cols-2 gap-4">
							<div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#f9f5f0' }}>
								<div className="text-2xl font-bold mb-1" style={{ color: '#344f1f' }}>0</div>
								<div className="text-sm" style={{ color: '#344f1f', opacity: 0.7 }}>Pending</div>
							</div>
							<div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#f9f5f0' }}>
								<div className="text-2xl font-bold mb-1" style={{ color: '#344f1f' }}>0</div>
								<div className="text-sm" style={{ color: '#344f1f', opacity: 0.7 }}>Confirmed</div>
							</div>
							<div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#f9f5f0' }}>
								<div className="text-2xl font-bold mb-1" style={{ color: '#344f1f' }}>0</div>
								<div className="text-sm" style={{ color: '#344f1f', opacity: 0.7 }}>Completed</div>
							</div>
							<div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#f9f5f0' }}>
								<div className="text-2xl font-bold mb-1" style={{ color: '#344f1f' }}>0</div>
								<div className="text-sm" style={{ color: '#344f1f', opacity: 0.7 }}>Records</div>
							</div>
						</div>
					</div>

					{/* Quick Actions Card */}
					<div className="p-6 border rounded-xl shadow-md" style={{ backgroundColor: '#f2ead3' }}>
						<div className="flex items-center space-x-3 mb-4">
							<div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#344f1f' }}>
								<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
								</svg>
							</div>
							<h3 className="text-2xl font-bold" style={{ color: '#344f1f' }}>Quick Actions</h3>
						</div>
						
						<div className="space-y-3">
							<button className="w-full p-3 rounded-lg font-semibold transition-all duration-300 hover:shadow-md flex items-center justify-center space-x-2"
								style={{ backgroundColor: '#344f1f', color: '#ffffff' }}>
								<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
								</svg>
								<span>View All Patients</span>
							</button>
							
							<button className="w-full p-3 rounded-lg font-semibold transition-all duration-300 hover:shadow-md flex items-center justify-center space-x-2"
								style={{ backgroundColor: '#f4991a', color: '#ffffff' }}>
								<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
								</svg>
								<span>Manage Records</span>
							</button>
							
							<button className="w-full p-3 rounded-lg font-semibold transition-all duration-300 hover:shadow-md flex items-center justify-center space-x-2"
								style={{ backgroundColor: '#7c3aed', color: '#ffffff' }}>
								<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
								</svg>
								<span>View Analytics</span>
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* Footer Note */}
			<div className="text-center pt-8 border-t" style={{ borderColor: '#d6d3d1' }}>
				<p className="text-sm" style={{ color: '#344f1f', opacity: 0.6 }}>
					InstaDoc Doctor Portal • Secure Patient Management System
				</p>
			</div>
		</div>
	);
}