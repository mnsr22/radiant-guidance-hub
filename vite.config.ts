// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // No Cloudflare/Nitro server bundle — emit a plain static build.
  nitro: false,
  // Client-only: ship a static SPA shell, render entirely in the browser.
  // Emit the shell as index.html so any static host serves it by default.
  tanstackStart: {
    spa: { enabled: true, prerender: { outputPath: "/index" } },
  },
});
