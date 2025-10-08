import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import inject from "@rollup/plugin-inject";

export default defineConfig({
  plugins: [react()],
  define: {
    "process.env": {},
    global: "globalThis",
  },
  build: {
    target: "es2020",
    minify: "esbuild",
    sourcemap: false,
    lib: {
      entry: "./src/index.tsx",
      name: "PrivyFaremeterApp",
      fileName: "app",
      formats: ["es"],
    },
    rollupOptions: {
      output: { inlineDynamicImports: true },
      plugins: [inject({ Buffer: ["buffer", "Buffer"] })],
      onwarn: (warning, warn) =>
        warning.code !== "INVALID_ANNOTATION" && warn(warning),
    },
  },
  optimizeDeps: {
    esbuildOptions: { target: "es2020" },
  },
});
