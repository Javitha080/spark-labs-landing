import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Load only essential font weights synchronously (3 instead of 10)
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";

import SecurityProvider from "./lib/securityMiddleware";

// Defer non-critical font weights and easter eggs to idle time
const loadDeferredAssets = () => {
  // Additional font weights — loaded after first paint
  import("@fontsource/inter/300.css");
  import("@fontsource/inter/500.css");
  import("@fontsource/space-grotesk/300.css");
  import("@fontsource/space-grotesk/400.css");
  import("@fontsource/space-grotesk/500.css");
  import("@fontsource/space-grotesk/600.css");
  import("@fontsource/space-grotesk/700.css");

  // 🥚 Initialize hidden surprises for curious visitors (non-critical)
  import("./lib/easterEggs").then(({ initAllEasterEggs }) => {
    initAllEasterEggs();
  });
};

if (typeof requestIdleCallback === "function") {
  requestIdleCallback(loadDeferredAssets, { timeout: 4000 });
} else {
  setTimeout(loadDeferredAssets, 2000);
}

createRoot(document.getElementById("root")!).render(
  <SecurityProvider>
    <App />
  </SecurityProvider>
);
