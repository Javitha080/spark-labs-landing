import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Load essential body + display font weights synchronously to prevent mid-animation glyph re-layout
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/space-grotesk/700.css";

import SecurityProvider from "./lib/securityMiddleware";
import { installGlobalErrorHandlers } from "./lib/errors";
import { initCriticalAnimationPreload } from "./lib/animationPreload";
import { BOOT_EVENT, hasBooted } from "./lib/boot";

installGlobalErrorHandlers();
initCriticalAnimationPreload();

// Defer non-critical font weights and easter eggs until after boot/first-paint settles
const loadDeferredAssets = () => {
  // Additional font weights - loaded after critical animation window
  import("@fontsource/inter/300.css");
  import("@fontsource/inter/500.css");
  import("@fontsource/space-grotesk/300.css");
  import("@fontsource/space-grotesk/400.css");
  import("@fontsource/space-grotesk/500.css");
  import("@fontsource/space-grotesk/600.css");

  // 🥚 Initialize hidden surprises for curious visitors (non-critical)
  import("./lib/easterEggs").then(({ initAllEasterEggs }) => {
    initAllEasterEggs();
  });
};

const scheduleDeferredAssets = () => {
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(loadDeferredAssets, { timeout: 4000 });
  } else {
    setTimeout(loadDeferredAssets, 2000);
  }
};

if (typeof window !== "undefined" && window.location.pathname === "/" && !hasBooted() && !window.location.hash) {
  window.addEventListener(BOOT_EVENT, scheduleDeferredAssets, { once: true });
} else {
  scheduleDeferredAssets();
}

createRoot(document.getElementById("root")!).render(
  <SecurityProvider>
    <App />
  </SecurityProvider>
);
