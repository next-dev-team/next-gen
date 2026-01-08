import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import VConsole from "vconsole";
import App from "./App";
import GlobalErrorBoundary from "./components/GlobalErrorBoundary";
import "./input.css";
import { initializeStoreSync } from "./stores/syncMiddleware";

// Initialize store synchronization
initializeStoreSync();

const queryClient = new QueryClient();

// Initialize vConsole for debugging
if ((import.meta.env.DEV || window.electronAPI) && !navigator.webdriver) {
  new VConsole({ theme: "dark" });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>
);
