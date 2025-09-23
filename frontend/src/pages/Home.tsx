import NavBar from "../components/Shared/NavBar";

export default function Home() {
	return (
		<div>
			<NavBar />
			<div className="p-6">
				<h1 className="text-4x1 font-bold">Welcome to InstaDoc</h1>
				<p className="mt-2 text-gray-600">Decentalized Telemedicine powered by BlockChain</p>
			</div>
		</div>
	);
}