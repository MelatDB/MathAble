import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// App.jsx owns the single HashRouter plus all accessibility, announcement,
// auth and theme providers, so the entry point only needs to mount it.
const root = createRoot(document.getElementById("root"));
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
