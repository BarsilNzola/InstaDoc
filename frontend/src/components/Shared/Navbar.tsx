import { Link } from "react-router-dom";

export default function NavBar() {
	return (
		<nav className="flex justify-between items-center bg-blue-900 p-4 text-white">
			<h1 className="text-xl font-bold">InstaDoc</h1>
			<div className="space-x-4">
				<Link to="/">Home</Link>
				<Link to="/patient">Patient</Link>
				<Link to="/doctor">Doctor</Link>
			</div>
		</nav>
	);
}