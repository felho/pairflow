import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export const uiContractAlias = {
  find: "@pairflow/ui-contracts",
  replacement: fileURLToPath(new URL("../src/contracts/ui/index.ts", import.meta.url))
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [uiContractAlias]
  },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4173",
        changeOrigin: false
      }
    }
  },
  build: {
    outDir: "dist"
  }
});
