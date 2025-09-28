import { useEffect } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

interface ConnectWalletProps {
  onConnect: (address: string) => void;
}

export default function ConnectWallet({ onConnect }: ConnectWalletProps) {
  const { connectors, connect, isPending } = useConnect();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  // Notify parent when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      onConnect(address);
    }
  }, [isConnected, address]);

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="bg-red-500 text-white px-3 py-1 rounded"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {connectors.map((c) => (
        <button
          key={c.id}
          onClick={() => connect({ connector: c })}
          disabled={isPending}
          className="bg-indigo-600 text-white px-3 py-1 rounded disabled:opacity-50"
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}
