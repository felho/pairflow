import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  bubbleLifecycleStates,
  uiSseEventNames
} from "@pairflow/ui-contracts";
import type {
  BubbleLifecycleState,
  UiSseEventName
} from "@pairflow/ui-contracts";

import { rootUiContractAlias } from "../../vitest.config.js";

const repoRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../.."
);

describe("UI contract entrypoint resolution", () => {
  it("keeps the root TypeScript alias pointed at the canonical UI contract barrel", async () => {
    const tsconfig = JSON.parse(
      await readFile(resolve(repoRoot, "tsconfig.json"), "utf8")
    ) as {
      compilerOptions?: {
        baseUrl?: unknown;
        paths?: Record<string, unknown>;
      };
    };

    const runningState: BubbleLifecycleState = "RUNNING";
    const snapshotEvent: UiSseEventName = "snapshot";

    expect(bubbleLifecycleStates).toContain(runningState);
    expect(uiSseEventNames).toContain(snapshotEvent);
    expect(tsconfig.compilerOptions?.baseUrl).toBe(".");
    expect(tsconfig.compilerOptions?.paths?.["@pairflow/ui-contracts"]).toEqual([
      "src/contracts/ui/index.ts"
    ]);
    expect(rootUiContractAlias).toEqual({
      find: "@pairflow/ui-contracts",
      replacement: resolve(repoRoot, "src/contracts/ui/index.ts")
    });
  });
});
