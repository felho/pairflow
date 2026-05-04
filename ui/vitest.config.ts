import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

import { uiContractAlias } from "./vite.config";

export const uiVitestContractAlias = {
  ...uiContractAlias
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [uiVitestContractAlias]
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    css: true
  }
});
