import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 👇 tell Vite to load .env from project root (../)
  const env = loadEnv(mode, "../");

  return {
    plugins: [react()],
    define: {
      "import.meta.env.VITE_WALLETCONNECT_PROJECT_ID": JSON.stringify(env.VITE_WALLETCONNECT_PROJECT_ID),
    },
  };
});
