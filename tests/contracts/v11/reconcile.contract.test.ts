import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import { CONTRACT_TEST_TIMEOUT } from "./contractTestTimeouts.js";
import { runReconcileContractCase } from "./reconcile.contract.runner.js";
import { readContractCase } from "./runner.js";

const execFileAsync = promisify(execFile);
const reconcileCaseSources = [
  "tests/contracts/v11/cases/reconcile/reconcile-basic-v11.case.json",
  "tests/contracts/v11/cases/reconcile/reconcile-mutate-stale-session-v11.case.json",
  "tests/contracts/v11/cases/reconcile/reconcile-mutate-no-stale-session-v11.case.json",
  "tests/contracts/v11/cases/reconcile/reconcile-stale-reason-final-state-v11.case.json",
  "tests/contracts/v11/cases/reconcile/reconcile-stale-reason-non-runtime-state-v11.case.json"
] as const;

const reconcileExpectedSourcesSorted = [...reconcileCaseSources].sort();

function parseReconcileSourcesFromManifest(
  manifestRaw: string
): string[] {
  const manifest = JSON.parse(manifestRaw) as {
    entries?: Array<{ command?: string; source?: string }>;
  };

  return (manifest.entries ?? [])
    .filter((entry) => entry.command === "reconcile")
    .map((entry) => entry.source)
    .filter((source): source is string => typeof source === "string");
}

describe("v11 reconcile contract harness", () => {
  it("loads seed contract case metadata", async () => {
    const casePath = resolve(process.cwd(), reconcileCaseSources[0]);
    const caseDef = await readContractCase(casePath);
    expect(caseDef.command).toBe("reconcile");
    expect(caseDef.mode).toBe("v11");
    expect(caseDef.expected.status).toBe("ok");
  });

  it(
    "executes retained v11 behavior cases via shared runner",
    { timeout: CONTRACT_TEST_TIMEOUT.v11StandardMs },
    async () => {
      const casePaths = reconcileCaseSources.map((source) =>
        resolve(process.cwd(), source)
      );

      for (const casePath of casePaths) {
        const caseDef = await readContractCase(casePath);
        const run = await runReconcileContractCase(caseDef);
        expect(caseDef.mode).toBe("v11");
        expect(run.v11.status).toBe(caseDef.expected.status);
        if (caseDef.expected.reasonCode !== undefined) {
          expect(run.v11.reasonCode).toBe(caseDef.expected.reasonCode);
        }
      }
    }
  );

  it("keeps reconcile manifest sources in canonical scenario order", async () => {
    const manifestPath = resolve(
      process.cwd(),
      "tests/contracts/v11/corpus/manifest.json"
    );
    const manifestRaw = await readFile(manifestPath, "utf8");
    const reconcileSources = parseReconcileSourcesFromManifest(manifestRaw);

    expect(reconcileSources).toEqual([...reconcileCaseSources]);
  });

  it("includes reconcile seed entries in corpus manifest", async () => {
    const manifestPath = resolve(
      process.cwd(),
      "tests/contracts/v11/corpus/manifest.json"
    );
    const manifestRaw = await readFile(manifestPath, "utf8");
    const reconcileSources = parseReconcileSourcesFromManifest(manifestRaw).sort();

    expect(reconcileSources).toEqual(reconcileExpectedSourcesSorted);
  });

  it("builds corpus output manifest with reconcile seed entries", async () => {
    await execFileAsync("pnpm", [
      "exec",
      "tsx",
      "./tests/contracts/v11/corpus/build-corpus.ts"
    ]);

    const outputManifestPath = resolve(
      process.cwd(),
      ".pairflow/evidence/contracts-v11-corpus-manifest.json"
    );
    const outputRaw = await readFile(outputManifestPath, "utf8");
    const reconcileSources = parseReconcileSourcesFromManifest(outputRaw).sort();

    expect(reconcileSources).toEqual(reconcileExpectedSourcesSorted);
  });
});
