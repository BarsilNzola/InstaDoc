import DoctorNotifications from "./DoctorNotifications";
import DoctorVideoConsultation from "./DoctorVideoConsultation";

import UploadRecord from "./UploadRecord";

export default function DoctorDashboard() {
	return (
		<div className="space-y-6 p-4">
			<h2 className="text-2xl font-bold">Doctor Dashboard</h2>
			<DoctorNotifications />
			<DoctorVideoConsultation />
			<UploadRecord />
		</div>
	);
}