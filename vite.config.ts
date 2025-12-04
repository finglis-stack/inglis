import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(() => ({
  server: {
    host: true, // Écoute sur toutes les adresses, y compris 0.0.0.0
    port: Number(process.env.PORT) || 8080,
  },
  preview: {
    host: true, // Important pour que le conteneur soit accessible
    port: Number(process.env.PORT) || 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));