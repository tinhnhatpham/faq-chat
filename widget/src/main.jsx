import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ChatWidget from "./ChatWidget.jsx";

const businessId = new URLSearchParams(window.location.search).get("business");

if (businessId) {
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <ChatWidget businessId={businessId} />
    </StrictMode>
  );
} else {
  // Someone opened the site root directly: show them the demo instead of an error
  window.location.replace("/demo.html");
}
