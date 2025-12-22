import React from "react";
import ReactDOM from "react-dom/client";
import { App as AntApp } from "antd";
import App from "./App";
import "./output.css";

// Ant Design v6 requires wrapping with App for message/notification/modal context
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AntApp>
      <App />
    </AntApp>
  </React.StrictMode>
);
