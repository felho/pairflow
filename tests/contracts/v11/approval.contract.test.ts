import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import { runApprovalContractCase } from "./approval.contract.runner.js";
import { readContractCase } from "./runner.js";

const execFileAsync = promisify(execFile);
const approvalCaseSources = [
  "tests/contracts/v11/cases/approval/approval-approve-basic.case.json",
  "tests/contracts/v11/cases/approval/approval-approve-basic-v11.case.json",
  "tests/contracts/v11/cases/approval/approval-approve-basic-parity.case.json",
  "tests/contracts/v11/cases/approval/approval-rework-immediate.case.json",
  "tests/contracts/v11/cases/approval/approval-rework-immediate-v11.case.json",
  "tests/contracts/v11/cases/approval/approval-rework-immediate-parity.case.json",
  "tests/contracts/v11/cases/approval/approval-rework-queued.case.json",
  "tests/contracts/v11/cases/approval/approval-rework-queued-v11.case.json",
  "tests/contracts/v11/cases/approval/approval-rework-queued-parity.case.json"
] as const;

const approvalExpectedSourcesSorted = [...approvalCaseSources].sort();
const approvalQueuedReworkSources = [
  "tests/contracts/v11/cases/approval/approval-rework-queued.case.json",
  "tests/contracts/v11/cases/approval/approval-rework-queued-v11.case.json",
  "tests/contracts/v11/cases/approval/approval-rework-queued-parity.case.json"
] as const;
const approvalImmediateReworkSources = [
  "tests/contracts/v11/cases/approval/approval-rework-immediate.case.json",
  "tests/contracts/v11/cases/approval/approval-rework-immediate-v11.case.json",
  "tests/contracts/v11/cases/approval/approval-rework-immediate-parity.case.json"
] as const;

function parseApprovalSourcesFromManifest(
  manifestRaw: string
): string[] {
  const manifest = JSON.parse(manifestRaw) as {
    entries?: Array<{ command?: string; source?: string }>;
  };

  return (manifest.entries ?? [])
    .filter((entry) => entry.command === "approval")
    .map((entry) => entry.source)
    .filter((source): source is string => typeof source === "string")
    .sort();
}

function expectManifestContainsSources(input: {
  actualSources: string[];
  expectedSources: readonly string[];
}): void {
  for (const expectedSource of input.expectedSources) {
    expect(input.actualSources).toContain(expectedSource);
  }
}

describe("v11 approval contract harness skeleton", () => {
  it("loads seed contract case metadata", async () => {
    const casePath = resolve(process.cwd(), approvalCaseSources[0]);
    const caseDef = await readContractCase(casePath);
    expect(caseDef.command).toBe("approval");
    expect(caseDef.mode).toBe("legacy");
    expect(caseDef.expected.status).toBe("ok");
  });

  it(
    "executes legacy and parity assertions via shared runner",
    { timeout: 20_000 },
    async () => {
    const casePaths = approvalCaseSources.map((source) =>
      resolve(process.cwd(), source)
    );

    for (const casePath of casePaths) {
      const caseDef = await readContractCase(casePath);
      const run = await runApprovalContractCase(caseDef);
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
    }
  );

  it("includes approval seed entries in corpus manifest", async () => {
    const manifestPath = resolve(
      process.cwd(),
      "tests/contracts/v11/corpus/manifest.json"
    );
    const manifestRaw = await readFile(manifestPath, "utf8");
    const approvalSources = parseApprovalSourcesFromManifest(manifestRaw);

    expect(approvalSources).toEqual(approvalExpectedSourcesSorted);
  });

  it("includes queued-rework approval entries in corpus manifest", async () => {
    const manifestPath = resolve(
      process.cwd(),
      "tests/contracts/v11/corpus/manifest.json"
    );
    const manifestRaw = await readFile(manifestPath, "utf8");
    const approvalSources = parseApprovalSourcesFromManifest(manifestRaw);

    expectManifestContainsSources({
      actualSources: approvalSources,
      expectedSources: approvalQueuedReworkSources
    });
  });

  it("includes immediate-rework approval entries in corpus manifest", async () => {
    const manifestPath = resolve(
      process.cwd(),
      "tests/contracts/v11/corpus/manifest.json"
    );
    const manifestRaw = await readFile(manifestPath, "utf8");
    const approvalSources = parseApprovalSourcesFromManifest(manifestRaw);

    expectManifestContainsSources({
      actualSources: approvalSources,
      expectedSources: approvalImmediateReworkSources
    });
  });

  it("builds corpus output manifest with approval seed entries", async () => {
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
    const approvalSources = parseApprovalSourcesFromManifest(outputRaw);

    expect(approvalSources).toEqual(approvalExpectedSourcesSorted);
  });
});
