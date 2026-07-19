import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { aiCompliancePlugin } from "./vite-plugin-ai";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  if (env.XAI_API_KEY) process.env.XAI_API_KEY = env.XAI_API_KEY;

  return {
    plugins: [react(), aiCompliancePlugin()],
    server: {
      port: 5173,
      open: true,
    },
    optimizeDeps: {
      include: ["pdfjs-dist"],
    },
    worker: {
      format: "es",
    },
  };
});
