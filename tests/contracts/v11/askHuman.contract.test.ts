import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { runAskHumanContractCase } from "./askHuman.contract.runner.js";
import { readContractCase } from "./runner.js";
import type { ContractCase } from "./schema.js";

const execFileAsync = promisify(execFile);

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

  it("builds corpus output manifest with ask-human seed entries", async () => {
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
    const outputManifest = JSON.parse(outputRaw) as {
      entries?: Array<{ command?: string; source?: string }>;
    };

    const askHumanSources = (outputManifest.entries ?? [])
      .filter((entry) => entry.command === "askHuman")
      .map((entry) => entry.source)
      .filter((source): source is string => typeof source === "string");

    expect(askHumanSources.sort()).toEqual([
      "tests/contracts/v11/cases/ask-human/ask-human-basic-parity.case.json",
      "tests/contracts/v11/cases/ask-human/ask-human-basic-v11.case.json",
      "tests/contracts/v11/cases/ask-human/ask-human-basic.case.json"
    ]);
  });

  it("rejects invalid ask-human contract input when question is empty", async () => {
    const invalidCase: ContractCase = {
      id: "ask-human-invalid-empty-question",
      command: "askHuman",
      mode: "legacy",
      description: "invalid question validation",
      input: {
        question: "   ",
        refs: []
      },
      expected: {
        status: "ok"
      }
    };

    await expect(runAskHumanContractCase(invalidCase)).rejects.toThrow(
      "askHuman contract input.question must be a non-empty string."
    );
  });

  it("rejects invalid ask-human contract input when refs is not string array", async () => {
    const invalidCase: ContractCase = {
      id: "ask-human-invalid-refs",
      command: "askHuman",
      mode: "legacy",
      description: "invalid refs validation",
      input: {
        question: "Need clarification",
        refs: ["ok-ref", 42]
      },
      expected: {
        status: "ok"
      }
    };

    await expect(runAskHumanContractCase(invalidCase)).rejects.toThrow(
      "askHuman contract input.refs must be a string array."
    );
  });

  it("rejects invalid ask-human contract input in v11 mode when refs is not string array", async () => {
    const invalidCase: ContractCase = {
      id: "ask-human-invalid-refs-v11",
      command: "askHuman",
      mode: "v11",
      description: "invalid refs validation for v11 mode",
      input: {
        question: "Need clarification",
        refs: ["ok-ref", 42]
      },
      expected: {
        status: "ok"
      }
    };

    await expect(runAskHumanContractCase(invalidCase)).rejects.toThrow(
      "askHuman contract input.refs must be a string array."
    );
  });

  it("rejects invalid ask-human contract input in v11 mode when question is empty", async () => {
    const invalidCase: ContractCase = {
      id: "ask-human-invalid-empty-question-v11",
      command: "askHuman",
      mode: "v11",
      description: "invalid empty question validation for v11 mode",
      input: {
        question: "   ",
        refs: []
      },
      expected: {
        status: "ok"
      }
    };

    await expect(runAskHumanContractCase(invalidCase)).rejects.toThrow(
      "askHuman contract input.question must be a non-empty string."
    );
  });
});
