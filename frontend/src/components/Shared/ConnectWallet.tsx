import { useEffect, useState } from "react";
import { connectWallet } from "./wallet";

export default function ConnectWallet({ onConnect }: { onConnect: (address: string) => void}) {
	const [address, setAddress] = useState("");

	const handleConnect = async () => {
		try {
			const { address } = await connectWallet();
			setAddress(address);
			onConnect(address);
		} catch (err) {
			console.error("Wallet connection failed:", err);
		}
	};

	return (
		<button onClick={ConnectWallet} className="bg-indigo-600 text-white px-4 py-2 rounded">
			{address ? `Connected: ${address.slice(0, 6)}...` : "Connect Wallet"}
		</button>
	);
}