import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import SecurityProvider from "./lib/securityMiddleware";

createRoot(document.getElementById("root")!).render(
  <SecurityProvider>
    <App />
  </SecurityProvider>
);
