import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
  preview: {
    host: "0.0.0.0",
    port: parseInt(process.env.PORT || "4173"),
    allowedHosts: ["udiyahaloblocks-frontend-1.onrender.com", "localhost", "127.0.0.1"],
  },
});
