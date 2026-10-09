import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    // Bound jsdom worker pressure on the local production/validation machine.
    maxWorkers: 4,
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
});
