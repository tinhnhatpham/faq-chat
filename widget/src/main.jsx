import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ChatWidget from "./ChatWidget.jsx";

const businessId = new URLSearchParams(window.location.search).get("business");

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {businessId ? (
      <ChatWidget businessId={businessId} />
    ) : (
      <p style={{ fontFamily: "sans-serif", padding: 16 }}>Missing ?business=&lt;id&gt; in the URL.</p>
    )}
  </StrictMode>
);
