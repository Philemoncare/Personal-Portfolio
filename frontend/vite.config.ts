import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import type { Plugin } from "vite";

const PUBLIC_ROUTES: Array<{ path: string; priority: string }> = [
  { path: "/", priority: "1.0" },
  { path: "/work", priority: "0.9" },
  { path: "/articles", priority: "0.8" },
  { path: "/data-lab", priority: "0.8" },
  { path: "/build-lab", priority: "0.7" },
  { path: "/leadership", priority: "0.7" },
  { path: "/experience", priority: "0.6" },
  { path: "/about", priority: "0.8" },
  { path: "/now", priority: "0.6" },
  { path: "/timeline", priority: "0.5" },
  { path: "/resume", priority: "0.6" },
  { path: "/contact", priority: "0.8" },
];

/**
 * Emit sitemap.xml at build time using the configured public site origin.
 * The static public/sitemap.xml was removed because it hardcoded example.com.
 */
function sitemapPlugin(siteUrl: string): Plugin {
  return {
    name: "phill-sitemap",
    apply: "build",
    generateBundle() {
      const base = siteUrl.replace(/\/+$/, "");
      const urls = PUBLIC_ROUTES.map(
        (route) =>
          `  <url><loc>${base}${route.path}</loc><priority>${route.priority}</priority></url>`,
      ).join("\n");
      this.emitFile({
        type: "asset",
        fileName: "sitemap.xml",
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const siteUrl = env.VITE_SITE_URL || "http://localhost:5173";
  return {
    plugins: [react(), tailwindcss(), sitemapPlugin(siteUrl)],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true,
        },
        "/health": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true,
        },
        "/media": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true,
        },
      },
    },
  };
});
