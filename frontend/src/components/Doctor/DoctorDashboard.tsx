import AcceptAppointment from "./AcceptAppointment";
import MarkConsultationDone from "./MarkConsultationDone";

export default function DoctorDashboard() {
	return (
		<div className="space-y-6 p-4">
			<h2 className="text-2xl font-bold">Doctor Dashboard</h2>
			<AcceptAppointment />
			<MarkConsultationDone />
			<UploadRecord />
		</div>
	);
}