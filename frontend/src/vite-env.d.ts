/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_WALLETCONNECT_PROJECT_ID: string
    // add more env vars here if needed
}
  
interface ImportMeta {
    readonly env: ImportMetaEnv
}
  