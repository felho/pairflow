// @vitest-environment node

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  bubbleLifecycleStates
} from "@pairflow/ui-contracts";
import type {
  BubbleLifecycleState
} from "@pairflow/ui-contracts";

import { uiContractAlias as viteUiContractAlias } from "../../../vite.config";
import { uiVitestContractAlias } from "../../../vitest.config";

const uiRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../"
);

describe("UI contract entrypoint", () => {
  it("resolves the public contract alias through UI TypeScript and Vite tooling", async () => {
    const tsconfig = JSON.parse(
      await readFile(resolve(uiRoot, "tsconfig.json"), "utf8")
    ) as {
      compilerOptions?: {
        baseUrl?: unknown;
        paths?: Record<string, unknown>;
      };
    };
    const runningState: BubbleLifecycleState = "RUNNING";

    expect(bubbleLifecycleStates).toContain(runningState);
    expect(tsconfig.compilerOptions?.baseUrl).toBe(".");
    expect(tsconfig.compilerOptions?.paths?.["@pairflow/ui-contracts"]).toEqual([
      "../src/contracts/ui/index.ts"
    ]);
    expect(viteUiContractAlias).toEqual({
      find: "@pairflow/ui-contracts",
      replacement: resolve(uiRoot, "../src/contracts/ui/index.ts")
    });
    expect(uiVitestContractAlias).toEqual(viteUiContractAlias);
    expect(uiVitestContractAlias).not.toBe(viteUiContractAlias);
  });
});
