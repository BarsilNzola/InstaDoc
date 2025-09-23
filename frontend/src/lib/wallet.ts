import { ethers } from "ethers";
import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider";

let Web3Modal: Web3Modal;

const providerOptions = {
	walletconnect: {
		package: WalletConnectProvider,
		options: {
			rpc: {
				2484: "https://rpc-testnet.u2u.xyz",
			},
		},
	},
};

export async function initWallet() {
	if (!web3Modal) {
		web3Modal = new Web3Modal({
			cacheProvider: true,
			providerOptions,
		});
	}
}

export async function connectWallet() {
	await initWallet();
	const instance = await web3Modal.connect();
	const provider = new ethers.BrowserProvider(instance);
	const signer = await provider.getSigner();
	return { provider, signer };
}