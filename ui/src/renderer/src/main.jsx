import React from "react";
import ReactDOM from "react-dom/client";
import { App as AntApp } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./input.css";

const queryClient = new QueryClient();

// Ant Design v6 requires wrapping with App for message/notification/modal context
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AntApp>
        <App />
      </AntApp>
    </QueryClientProvider>
  </React.StrictMode>
);
