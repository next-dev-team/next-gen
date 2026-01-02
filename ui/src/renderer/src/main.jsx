import React from "react";
import ReactDOM from "react-dom/client";
import { App as AntApp } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import VConsole from "vconsole";
import App from "./App";
import GlobalErrorBoundary from "./components/GlobalErrorBoundary";
import "./input.css";

const queryClient = new QueryClient();

// Initialize vConsole for debugging
if (import.meta.env.DEV || window.electronAPI) {
  new VConsole({ theme: "dark" });
}

// Ant Design v6 requires wrapping with App for message/notification/modal context
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AntApp>
          <App />
        </AntApp>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>
);
