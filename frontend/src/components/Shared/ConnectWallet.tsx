import { useEffect } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

interface ConnectWalletProps {
  onConnect: (address: string) => void;
  compact?: boolean;
}

export default function ConnectWallet({ onConnect, compact = false }: ConnectWalletProps) {
  const { connectors, connect, isPending } = useConnect();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  // Notify parent when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      onConnect(address);
    }
  }, [isConnected, address, onConnect]);

  if (isConnected && address) {
    return (
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="font-medium text-sm" style={{ color: '#f2ead3' }}>
            {compact ? 'Connected' : `${address.slice(0, 6)}...${address.slice(-4)}`}
          </span>
        </div>
        <button
          onClick={() => disconnect()}
          className="px-3 py-1 text-xs rounded-lg font-medium transition-all duration-300 hover:shadow-md"
          style={{ backgroundColor: '#f4991a', color: '#ffffff' }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#e08a17';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#f4991a';
          }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex space-x-2">
      {connectors.map((c) => (
        <button
          key={c.id}
          onClick={() => connect({ connector: c })}
          disabled={isPending}
          className="flex items-center justify-center space-x-1 px-3 py-2 text-sm rounded-lg font-medium transition-all duration-300 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#f2ead3', color: '#344f1f' }}
          onMouseOver={(e) => {
            if (!isPending) {
              e.currentTarget.style.backgroundColor = '#e8dfc8';
            }
          }}
          onMouseOut={(e) => {
            if (!isPending) {
              e.currentTarget.style.backgroundColor = '#f2ead3';
            }
          }}
        >
          {/* Wallet Icons */}
          {c.name.toLowerCase().includes('metamask') && (
            <svg className="w-4 h-4" viewBox="0 0 32 32" fill="currentColor">
              <path d="M28.5,0h-25C1.6,0,0,1.6,0,3.5v25C0,30.4,1.6,32,3.5,32h25c1.9,0,3.5-1.6,3.5-3.5v-25C32,1.6,30.4,0,28.5,0z M17.9,23.6c0,0.4-0.3,0.7-0.7,0.7h-2.4c-0.4,0-0.7-0.3-0.7-0.7v-7.4h-2.5c-0.4,0-0.7-0.3-0.7-0.7v-2.1c0-0.4,0.3-0.7,0.7-0.7h2.5V8.4c0-0.4,0.3-0.7,0.7-0.7h2.4c0.4,0,0.7,0.3,0.7,0.7v4.3h3.7c0.4,0,0.7,0.3,0.7,0.7v2.1c0,0.4-0.3,0.7-0.7,0.7h-3.7V23.6z"/>
            </svg>
          )}
          {c.name.toLowerCase().includes('walletconnect') && (
            <svg className="w-4 h-4" viewBox="0 0 32 32" fill="currentColor">
              <path d="M16,0C7.2,0,0,7.2,0,16s7.2,16,16,16s16-7.2,16-16S24.8,0,16,0z M22.9,12.6l-6.9,6.9c-0.3,0.3-0.7,0.3-1,0l-3-3c-0.3-0.3-0.3-0.7,0-1l1-1c0.3-0.3,0.7-0.3,1,0l1.5,1.5l5.4-5.4c0.3-0.3,0.7-0.3,1,0l1,1C23.2,11.9,23.2,12.3,22.9,12.6z"/>
            </svg>
          )}
          {!c.name.toLowerCase().includes('metamask') && !c.name.toLowerCase().includes('walletconnect') && (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          )}
          
          {/* Show proper wallet names in compact mode */}
          {compact && (
            <span className="text-xs">
              {c.name.toLowerCase().includes('metamask') && 'MetaMask'}
              {c.name.toLowerCase().includes('walletconnect') && 'WalletConnect'}
              {!c.name.toLowerCase().includes('metamask') && !c.name.toLowerCase().includes('walletconnect') && c.name}
            </span>
          )}
          
          {isPending && (
            <div className="animate-spin rounded-full h-3 w-3 border-b-2" style={{ borderColor: '#344f1f' }}></div>
          )}
        </button>
      ))}
    </div>
  );
}