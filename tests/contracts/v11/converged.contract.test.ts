import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { runConvergedContractCase } from "./converged.contract.runner.js";
import { readContractCase } from "./runner.js";

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
    const casePaths = [
      resolve(
        process.cwd(),
        "tests/contracts/v11/cases/converged/converged-basic.case.json"
      ),
      resolve(
        process.cwd(),
        "tests/contracts/v11/cases/converged/converged-basic-v11.case.json"
      ),
      resolve(
        process.cwd(),
        "tests/contracts/v11/cases/converged/converged-basic-parity.case.json"
      ),
      resolve(
        process.cwd(),
        "tests/contracts/v11/cases/converged/converged-document-parity.case.json"
      ),
      resolve(
        process.cwd(),
        "tests/contracts/v11/cases/converged/converged-document.case.json"
      ),
      resolve(
        process.cwd(),
        "tests/contracts/v11/cases/converged/converged-document-v11.case.json"
      )
    ];

    for (const casePath of casePaths) {
      const caseDef = await readContractCase(casePath);
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
  }, 20_000);

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
});
