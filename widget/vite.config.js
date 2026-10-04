import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Fixed port so it matches ALLOWED_ORIGINS in the backend .env
  server: { port: 5173, strictPort: true },
  // Two pages: the chat (loaded in the iframe) and the admin page.
  // embed-test.html is left out on purpose: dev only.
  build: { rollupOptions: { input: { main: "index.html", admin: "admin.html" } } },
});
