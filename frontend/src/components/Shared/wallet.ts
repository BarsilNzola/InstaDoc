import { ethers } from "ethers";
import EthereumProvider from "@walletconnect/ethereum-provider";

// Keep a reference to the WalletConnect provider
let wcProvider: EthereumProvider | null = null;

export async function initWallet() {
  if (!wcProvider) {
    wcProvider = await EthereumProvider.init({
      projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID!,
      chains: [2484], // U2U testnet chain ID
      optionalChains: [],
      rpcMap: {
        2484: "https://rpc-testnet.u2u.xyz",
      },
      showQrModal: true,
    });

    // Handle disconnects
    wcProvider.on("disconnect", () => {
      wcProvider = null;
    });
  }

  return wcProvider;
}

export async function connectWallet() {
  const provider = await initWallet();
  if (!provider) throw new Error("WalletConnect not initialized");

  // Request connection
  await provider.connect();

  // Wrap in ethers.js
  const ethersProvider = new ethers.BrowserProvider(provider as any);
  const signer = await ethersProvider.getSigner();

  return { provider: ethersProvider, signer };
}
