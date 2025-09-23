import { useEffect, useState } from "react";
import { ethers } from "ethers";
import Web3Modal from "web3modal";

export default function ConnectWallet({ onConnect }: { onConnect: (address: string) => void}) {
	const [address, setAddress] = useState("");

	const ConnectWallet = async () => {
		const Web3Modal = new Web3Modal();
		const connection = await Web3Modal.connect();
		const provider = new.ethers.BrowserProvider(connection);
		const signer = await provider.getSigner();
		const addr = await signer.getAddress();
		setAddress(addr);
		onConnect(addr);
	};

	return (
		<button onClick={ConnectWallet} className="bg-indigo-600 text-white px-4 py-2 rounded">
			{address ? `Connected: ${address.slice(0, 6)}...` : "Connect Wallet"}
		</button>
	);
}