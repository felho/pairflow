import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { runConvergedContractCase } from "./converged.contract.runner.js";
import { readContractCase } from "./runner.js";

async function listConvergedCasePaths(): Promise<string[]> {
  const casesDir = resolve(process.cwd(), "tests/contracts/v11/cases/converged");
  const entries = await readdir(casesDir);
  return entries
    .filter((entry) => entry.endsWith(".case.json"))
    .sort((left, right) => left.localeCompare(right))
    .map((entry) => resolve(casesDir, entry));
}

describe("v11 converged contract harness skeleton", () => {
  it("loads seed contract case metadata", async () => {
    const casePath = resolve(
      process.cwd(),
      "tests/contracts/v11/cases/converged/converged-basic.case.json"
    );
    const caseDef = await readContractCase(casePath);
    expect(caseDef.command).toBe("converged");
    expect(caseDef.mode).toBe("legacy");
    expect(caseDef.expected.status).toBe("ok");
  });

  it("executes legacy, v11 and parity assertions via shared runner", async () => {
    const casePaths = await listConvergedCasePaths();
    expect(casePaths.length).toBeGreaterThan(0);
    const seenModes = new Set<string>();

    for (const casePath of casePaths) {
      const caseDef = await readContractCase(casePath);
      seenModes.add(caseDef.mode);
      const run = await runConvergedContractCase(caseDef);
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
    expect(seenModes.has("legacy")).toBe(true);
    expect(seenModes.has("v11")).toBe(true);
    expect(seenModes.has("parity")).toBe(true);
  }, 30_000);

  it("rejects invalid converged contract input.reviewArtifactType", async () => {
    await expect(
      runConvergedContractCase({
        id: "converged-invalid-review-artifact-type",
        command: "converged",
        mode: "legacy",
        description: "Invalid converged contract input shape",
        input: {
          summary: "Invalid case",
          reviewArtifactType: "auto"
        },
        expected: {
          status: "ok"
        }
      })
    ).rejects.toThrow(/reviewArtifactType must be one of: code, document/u);
  });

  it("rejects converged contract input.summary when empty", async () => {
    await expect(
      runConvergedContractCase({
        id: "converged-invalid-empty-summary",
        command: "converged",
        mode: "legacy",
        description: "Invalid converged contract summary",
        input: {
          summary: "   "
        },
        expected: {
          status: "ok"
        }
      })
    ).rejects.toThrow(/input\.summary must be a non-empty string/u);
  });

  it("rejects converged contract input.refs when non-string array", async () => {
    await expect(
      runConvergedContractCase({
        id: "converged-invalid-refs",
        command: "converged",
        mode: "legacy",
        description: "Invalid converged contract refs input",
        input: {
          summary: "Valid summary",
          refs: ["ok-ref", 42]
        },
        expected: {
          status: "ok"
        }
      })
    ).rejects.toThrow(/input\.refs must be a string array/u);
  });

  it("rejects unsupported command for converged contract runner", async () => {
    await expect(
      runConvergedContractCase({
        id: "converged-unsupported-command",
        command: "pass",
        mode: "legacy",
        description: "Wrong command routed to converged runner",
        input: {
          summary: "Should not execute"
        },
        expected: {
          status: "ok"
        }
      })
    ).rejects.toThrow(/Unsupported command for converged contract runner/u);
  });
});
