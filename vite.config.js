import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        entryFileNames: "static/firefly-animation.js",
      },
    },
  },
  envDir: "env",
  envPrefix: "FF_",
});
