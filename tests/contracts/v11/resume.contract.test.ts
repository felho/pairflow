import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import { CONTRACT_TEST_TIMEOUT } from "./contractTestTimeouts.js";
import { runResumeContractCase } from "./resume.contract.runner.js";
import { readContractCase } from "./runner.js";

const execFileAsync = promisify(execFile);
const resumeCaseSources = [
  "tests/contracts/v11/cases/resume/resume-basic.case.json",
  "tests/contracts/v11/cases/resume/resume-basic-v11.case.json",
  "tests/contracts/v11/cases/resume/resume-basic-parity.case.json",
  "tests/contracts/v11/cases/resume/resume-state-not-waiting-human.case.json",
  "tests/contracts/v11/cases/resume/resume-state-not-waiting-human-v11.case.json",
  "tests/contracts/v11/cases/resume/resume-state-not-waiting-human-parity.case.json",
  "tests/contracts/v11/cases/resume/resume-waiting-human-round-invalid.case.json",
  "tests/contracts/v11/cases/resume/resume-waiting-human-round-invalid-v11.case.json",
  "tests/contracts/v11/cases/resume/resume-waiting-human-round-invalid-parity.case.json",
  "tests/contracts/v11/cases/resume/resume-waiting-human-context-incomplete.case.json",
  "tests/contracts/v11/cases/resume/resume-waiting-human-context-incomplete-v11.case.json",
  "tests/contracts/v11/cases/resume/resume-waiting-human-context-incomplete-parity.case.json",
  "tests/contracts/v11/cases/resume/resume-default-message-invariant.case.json",
  "tests/contracts/v11/cases/resume/resume-default-message-invariant-v11.case.json",
  "tests/contracts/v11/cases/resume/resume-default-message-invariant-parity.case.json"
] as const;

const resumeExpectedSourcesSorted = [...resumeCaseSources].sort();

function parseResumeSourcesFromManifest(
  manifestRaw: string
): string[] {
  const manifest = JSON.parse(manifestRaw) as {
    entries?: Array<{ command?: string; source?: string }>;
  };

  return (manifest.entries ?? [])
    .filter((entry) => entry.command === "resume")
    .map((entry) => entry.source)
    .filter((source): source is string => typeof source === "string")
    .sort();
}

describe("v11 resume contract harness skeleton", () => {
  it("loads seed contract case metadata", async () => {
    const casePath = resolve(process.cwd(), resumeCaseSources[0]);
    const caseDef = await readContractCase(casePath);
    expect(caseDef.command).toBe("resume");
    expect(caseDef.mode).toBe("baseline");
    expect(caseDef.expected.status).toBe("ok");
  });

  it(
    "executes baseline and parity assertions via shared runner",
    { timeout: CONTRACT_TEST_TIMEOUT.parityStandardMs },
    async () => {
    const casePaths = resumeCaseSources.map((source) =>
      resolve(process.cwd(), source)
    );

    for (const casePath of casePaths) {
      const caseDef = await readContractCase(casePath);
      const run = await runResumeContractCase(caseDef);
      if (caseDef.mode === "baseline") {
        expect(run.baseline?.status).toBe(caseDef.expected.status);
        if (caseDef.expected.reasonCode !== undefined) {
          expect(run.baseline?.reasonCode).toBe(caseDef.expected.reasonCode);
        }
        expect(run.v11).toBeUndefined();
        continue;
      }
      if (caseDef.mode === "v11") {
        expect(run.v11?.status).toBe(caseDef.expected.status);
        if (caseDef.expected.reasonCode !== undefined) {
          expect(run.v11?.reasonCode).toBe(caseDef.expected.reasonCode);
        }
        expect(run.baseline).toBeUndefined();
        continue;
      }

      expect(run.baseline).toBeDefined();
      expect(run.v11).toBeDefined();
      expect(run.baseline).toEqual(run.v11);
    }
    }
  );

  it("includes resume seed entries in corpus manifest", async () => {
    const manifestPath = resolve(
      process.cwd(),
      "tests/contracts/v11/corpus/manifest.json"
    );
    const manifestRaw = await readFile(manifestPath, "utf8");
    const resumeSources = parseResumeSourcesFromManifest(manifestRaw);

    expect(resumeSources).toEqual(resumeExpectedSourcesSorted);
  });

  it("builds corpus output manifest with resume seed entries", async () => {
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
    const resumeSources = parseResumeSourcesFromManifest(outputRaw);

    expect(resumeSources).toEqual(resumeExpectedSourcesSorted);
  });
});
