import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { LotsProvider } from "./contexts/LotsContext";
import { ProjectSettingsProvider } from "./contexts/ProjectSettingsContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <ProjectSettingsProvider>
          <LotsProvider>
            <App />
          </LotsProvider>
        </ProjectSettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
