import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register the service worker for PWA install + offline scene image cache.
// Only in production builds — in dev we want fresh assets every reload.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker.register(swUrl).catch((err) => {
      // Non-fatal: app still works fully online without the SW.
      console.warn("SW registration failed:", err);
    });
  });
}
