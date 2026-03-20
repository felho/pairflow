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
  "tests/contracts/v11/cases/reconcile/reconcile-basic.case.json",
  "tests/contracts/v11/cases/reconcile/reconcile-basic-v11.case.json",
  "tests/contracts/v11/cases/reconcile/reconcile-basic-parity.case.json",
  "tests/contracts/v11/cases/reconcile/reconcile-mutate-stale-session.case.json",
  "tests/contracts/v11/cases/reconcile/reconcile-mutate-stale-session-v11.case.json",
  "tests/contracts/v11/cases/reconcile/reconcile-mutate-stale-session-parity.case.json",
  "tests/contracts/v11/cases/reconcile/reconcile-mutate-no-stale-session.case.json",
  "tests/contracts/v11/cases/reconcile/reconcile-mutate-no-stale-session-v11.case.json",
  "tests/contracts/v11/cases/reconcile/reconcile-mutate-no-stale-session-parity.case.json",
  "tests/contracts/v11/cases/reconcile/reconcile-stale-reason-final-state.case.json",
  "tests/contracts/v11/cases/reconcile/reconcile-stale-reason-final-state-v11.case.json",
  "tests/contracts/v11/cases/reconcile/reconcile-stale-reason-final-state-parity.case.json",
  "tests/contracts/v11/cases/reconcile/reconcile-stale-reason-non-runtime-state.case.json",
  "tests/contracts/v11/cases/reconcile/reconcile-stale-reason-non-runtime-state-v11.case.json",
  "tests/contracts/v11/cases/reconcile/reconcile-stale-reason-non-runtime-state-parity.case.json"
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
    .filter((source): source is string => typeof source === "string")
    .sort();
}

describe("v11 reconcile contract harness skeleton", () => {
  it("loads seed contract case metadata", async () => {
    const casePath = resolve(process.cwd(), reconcileCaseSources[0]);
    const caseDef = await readContractCase(casePath);
    expect(caseDef.command).toBe("reconcile");
    expect(caseDef.mode).toBe("legacy");
    expect(caseDef.expected.status).toBe("ok");
  });

  it(
    "executes legacy and parity assertions via shared runner",
    { timeout: CONTRACT_TEST_TIMEOUT.parityStandardMs },
    async () => {
    const casePaths = reconcileCaseSources.map((source) =>
      resolve(process.cwd(), source)
    );

    for (const casePath of casePaths) {
      const caseDef = await readContractCase(casePath);
      const run = await runReconcileContractCase(caseDef);
      if (caseDef.mode === "legacy") {
        expect(run.legacy?.status).toBe(caseDef.expected.status);
        if (caseDef.expected.reasonCode !== undefined) {
          expect(run.legacy?.reasonCode).toBe(caseDef.expected.reasonCode);
        }
        expect(run.v11).toBeUndefined();
        continue;
      }
      if (caseDef.mode === "v11") {
        expect(run.v11?.status).toBe(caseDef.expected.status);
        if (caseDef.expected.reasonCode !== undefined) {
          expect(run.v11?.reasonCode).toBe(caseDef.expected.reasonCode);
        }
        expect(run.legacy).toBeUndefined();
        continue;
      }

      expect(run.legacy).toBeDefined();
      expect(run.v11).toBeDefined();
      expect(run.legacy).toEqual(run.v11);
    }
    }
  );

  it("includes reconcile seed entries in corpus manifest", async () => {
    const manifestPath = resolve(
      process.cwd(),
      "tests/contracts/v11/corpus/manifest.json"
    );
    const manifestRaw = await readFile(manifestPath, "utf8");
    const reconcileSources = parseReconcileSourcesFromManifest(manifestRaw);

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
    const reconcileSources = parseReconcileSourcesFromManifest(outputRaw);

    expect(reconcileSources).toEqual(reconcileExpectedSourcesSorted);
  });
});
