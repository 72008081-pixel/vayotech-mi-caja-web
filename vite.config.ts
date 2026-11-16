import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({ plugins: [react()], base: "/vayotech-mi-caja-web/", build: { outDir: "docs", emptyOutDir: true } });
