import { http, createConfig } from "wagmi";
import { metaMask, walletConnect, injected } from "wagmi/connectors";
import { QueryClient } from "@tanstack/react-query";

// --- U2U chain definition ---
export const u2uChain = {
  id: 2484,
  name: "U2U Testnet",
  nativeCurrency: { name: "U2U", symbol: "U2U", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc-testnet.u2u.xyz"] },
  },
};

// --- WalletConnect project ID ---
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
if (!projectId) {
  throw new Error("VITE_WALLETCONNECT_PROJECT_ID is missing in .env");
}

console.log("WalletConnect projectId:", import.meta.env.VITE_WALLETCONNECT_PROJECT_ID);

// --- Wagmi config ---
export const config = createConfig({
  chains: [u2uChain],
  transports: {
    [u2uChain.id]: http("https://rpc-testnet.u2u.xyz"),
  },
  connectors: [
    injected(),
    metaMask(),
    walletConnect({
      projectId,
      showQrModal: true,
    }),
  ],
});

// --- React Query client ---
export const queryClient = new QueryClient();
