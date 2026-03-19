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
});
