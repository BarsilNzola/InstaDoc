import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.js";
import "./index.css";

import { WagmiProvider } from "wagmi";
import { config, queryClient } from "./components/Shared/wallet.js";
import { QueryClientProvider } from "@tanstack/react-query";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
