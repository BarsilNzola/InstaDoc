import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 👇 tell Vite to load .env from project root (../)
  const env = loadEnv(mode, "../");
  
  // Automatically include all VITE_* environment variables
  const envVariables = {};
  Object.keys(env).forEach(key => {
    if (key.startsWith('VITE_')) {
      envVariables[`import.meta.env.${key}`] = JSON.stringify(env[key]);
    }
  });

  return {
    plugins: [react()],
    define: envVariables,
  };
});