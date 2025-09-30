/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_WALLETCONNECT_PROJECT_ID: string;
    readonly VITE_HUB_ADDRESS: string;
    readonly VITE_LIGHTHOUSE_STORAGE_TOKEN: string;
    readonly VITE_ESCROW_ADDRESS: string;
    // add more env vars here if needed
}
  
interface ImportMeta {
    readonly env: ImportMetaEnv;
}