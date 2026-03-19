import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

import { runMetaReviewGateContractCase } from "./metaReviewGate.contract.runner.js";
import { readContractCase } from "./runner.js";

const execFileAsync = promisify(execFile);
const metaReviewGateCaseSources = [
  "tests/contracts/v11/cases/meta-review-gate/gate-apply-basic-parity.case.json",
  "tests/contracts/v11/cases/meta-review-gate/gate-recover-approve-parity.case.json",
  "tests/contracts/v11/cases/meta-review-gate/meta-review-gate-apply-basic.case.json",
  "tests/contracts/v11/cases/meta-review-gate/meta-review-gate-apply-basic-v11.case.json",
  "tests/contracts/v11/cases/meta-review-gate/meta-review-gate-apply-basic-parity.case.json",
  "tests/contracts/v11/cases/meta-review-gate/meta-review-gate-apply-running-parity.case.json",
  "tests/contracts/v11/cases/meta-review-gate/meta-review-gate-apply-sticky-bypass-parity.case.json",
  "tests/contracts/v11/cases/meta-review-gate/meta-review-gate-recover-basic.case.json",
  "tests/contracts/v11/cases/meta-review-gate/meta-review-gate-recover-basic-v11.case.json",
  "tests/contracts/v11/cases/meta-review-gate/meta-review-gate-recover-basic-parity.case.json",
  "tests/contracts/v11/cases/meta-review-gate/meta-review-gate-recover-auto-rework-parity.case.json",
  "tests/contracts/v11/cases/meta-review-gate/meta-review-gate-recover-approve-parity.case.json",
  "tests/contracts/v11/cases/meta-review-gate/meta-review-gate-recover-dispatch-failed-parity.case.json",
  "tests/contracts/v11/cases/meta-review-gate/meta-review-gate-recover-inconclusive-parity.case.json",
  "tests/contracts/v11/cases/meta-review-gate/meta-review-gate-recover-rework-budget-exhausted-parity.case.json"
] as const;
const metaReviewGateExpectedSourcesSorted = metaReviewGateCaseSources.filter(
  (source) => !source.includes("/gate-")
).sort();
const gateAliasExpectedSourcesSorted = metaReviewGateCaseSources.filter((source) =>
  source.includes("/gate-")
).sort();

function parseMetaReviewGateSourcesFromManifest(
  manifestRaw: string
): string[] {
  const manifest = JSON.parse(manifestRaw) as {
    entries?: Array<{ command?: string; source?: string }>;
  };

  return (manifest.entries ?? [])
    .filter((entry) => entry.command === "metaReviewGate")
    .map((entry) => entry.source)
    .filter((source): source is string => typeof source === "string")
    .sort();
}

function parseGateAliasSourcesFromManifest(manifestRaw: string): string[] {
  const manifest = JSON.parse(manifestRaw) as {
    entries?: Array<{ command?: string; source?: string }>;
  };

  return (manifest.entries ?? [])
    .filter((entry) => entry.command === "gate")
    .map((entry) => entry.source)
    .filter((source): source is string => typeof source === "string")
    .sort();
}

describe("v11 metaReviewGate contract harness", () => {
  it("loads seed contract case metadata", async () => {
    const casePath = resolve(
      process.cwd(),
      "tests/contracts/v11/cases/meta-review-gate/meta-review-gate-apply-basic.case.json"
    );
    const caseDef = await readContractCase(casePath);
    expect(caseDef.command).toBe("metaReviewGate");
    expect(caseDef.mode).toBe("legacy");
    expect(caseDef.expected.status).toBe("ok");
  });

  it("executes legacy and parity assertions via shared runner", async () => {
    const casePaths = metaReviewGateCaseSources.map((source) =>
      resolve(process.cwd(), source)
    );

    for (const casePath of casePaths) {
      const caseDef = await readContractCase(casePath);
      const run = await runMetaReviewGateContractCase(caseDef);
      if (caseDef.mode === "legacy") {
        expect(run.legacy?.status).toBe("ok");
        expect(run.v11).toBeUndefined();
        continue;
      }
      if (caseDef.mode === "v11") {
        expect(run.v11?.status).toBe("ok");
        expect(run.legacy).toBeUndefined();
        continue;
      }

      expect(run.legacy).toBeDefined();
      expect(run.v11).toBeDefined();
      expect(run.legacy).toEqual(run.v11);
    }
  }, 20_000);

  it("includes metaReviewGate seed entries in corpus manifest", async () => {
    const manifestPath = resolve(
      process.cwd(),
      "tests/contracts/v11/corpus/manifest.json"
    );
    const manifestRaw = await readFile(manifestPath, "utf8");
    const metaReviewGateSources = parseMetaReviewGateSourcesFromManifest(
      manifestRaw
    );

    expect(metaReviewGateSources).toEqual(metaReviewGateExpectedSourcesSorted);
  });

  it("includes gate alias seed entries in corpus manifest", async () => {
    const manifestPath = resolve(
      process.cwd(),
      "tests/contracts/v11/corpus/manifest.json"
    );
    const manifestRaw = await readFile(manifestPath, "utf8");
    const gateAliasSources = parseGateAliasSourcesFromManifest(manifestRaw);

    expect(gateAliasSources).toEqual(gateAliasExpectedSourcesSorted);
  });

  it("builds corpus output manifest with metaReviewGate seed entries", async () => {
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
    const metaReviewGateSources = parseMetaReviewGateSourcesFromManifest(outputRaw);
    const gateAliasSources = parseGateAliasSourcesFromManifest(outputRaw);

    expect(metaReviewGateSources).toEqual(metaReviewGateExpectedSourcesSorted);
    expect(gateAliasSources).toEqual(gateAliasExpectedSourcesSorted);
  });
});
