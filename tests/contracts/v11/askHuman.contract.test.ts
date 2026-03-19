import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { runAskHumanContractCase } from "./askHuman.contract.runner.js";
import { readContractCase } from "./runner.js";

describe("v11 askHuman contract harness skeleton", () => {
  it("loads seed contract case metadata", async () => {
    const casePath = resolve(
      process.cwd(),
      "tests/contracts/v11/cases/ask-human/ask-human-basic.case.json"
    );
    const caseDef = await readContractCase(casePath);
    expect(caseDef.command).toBe("askHuman");
    expect(caseDef.mode).toBe("legacy");
    expect(caseDef.expected.status).toBe("ok");
  });

  it("executes legacy and parity assertions via shared runner", async () => {
    const casePaths = [
      resolve(
        process.cwd(),
        "tests/contracts/v11/cases/ask-human/ask-human-basic.case.json"
      ),
      resolve(
        process.cwd(),
        "tests/contracts/v11/cases/ask-human/ask-human-basic-v11.case.json"
      ),
      resolve(
        process.cwd(),
        "tests/contracts/v11/cases/ask-human/ask-human-basic-parity.case.json"
      )
    ];

    for (const casePath of casePaths) {
      const caseDef = await readContractCase(casePath);
      const run = await runAskHumanContractCase(caseDef);
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
  });

  it("includes ask-human seed entries in corpus manifest", async () => {
    const manifestPath = resolve(
      process.cwd(),
      "tests/contracts/v11/corpus/manifest.json"
    );
    const manifestRaw = await readFile(manifestPath, "utf8");
    const manifest = JSON.parse(manifestRaw) as {
      entries?: Array<{ command?: string; source?: string }>;
    };

    const askHumanSources = (manifest.entries ?? [])
      .filter((entry) => entry.command === "askHuman")
      .map((entry) => entry.source)
      .filter((source): source is string => typeof source === "string");

    expect(askHumanSources.sort()).toEqual([
      "tests/contracts/v11/cases/ask-human/ask-human-basic-parity.case.json",
      "tests/contracts/v11/cases/ask-human/ask-human-basic-v11.case.json",
      "tests/contracts/v11/cases/ask-human/ask-human-basic.case.json"
    ]);
  });
});
