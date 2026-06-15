import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/App";
import { FocusOverlay } from "@/components/FocusOverlay";
import "@/styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Application root was not found.");
}

const isFocusOverlay = new URLSearchParams(window.location.search).has("overlay");

if (isFocusOverlay) {
  document.documentElement.classList.add("is-focus-overlay");
}

createRoot(root).render(
  <StrictMode>{isFocusOverlay ? <FocusOverlay /> : <App />}</StrictMode>,
);
