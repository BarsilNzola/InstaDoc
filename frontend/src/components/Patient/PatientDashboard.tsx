import PatientSignup from "./PatientSignup";
import ViewRecords from "./ViewRecords";
import BookAppointment from "./BookAppointment";

export default function PatientDashboard() {
	return (
		<div className="space-y-6 p-4">
			<h2 className="text-2xl font-bold">Patient Dashboard</h2>
			<PatientSignup />
			<BookAppointment />
			<ViewRecords />
		</div>
	);
}