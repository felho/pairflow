import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { CONTRACT_TEST_TIMEOUT } from "./contractTestTimeouts.js";
import { runReplyContractCase } from "./reply.contract.runner.js";
import { readContractCase } from "./runner.js";
import type { ContractCase } from "./schema.js";

const execFileAsync = promisify(execFile);
const replyCaseSources = [
  "tests/contracts/v11/cases/reply/reply-basic.case.json",
  "tests/contracts/v11/cases/reply/reply-basic-v11.case.json",
  "tests/contracts/v11/cases/reply/reply-basic-parity.case.json",
  "tests/contracts/v11/cases/reply/reply-no-refs.case.json",
  "tests/contracts/v11/cases/reply/reply-no-refs-v11.case.json",
  "tests/contracts/v11/cases/reply/reply-no-refs-parity.case.json",
  "tests/contracts/v11/cases/reply/reply-state-not-waiting-human.case.json",
  "tests/contracts/v11/cases/reply/reply-state-not-waiting-human-v11.case.json",
  "tests/contracts/v11/cases/reply/reply-state-not-waiting-human-parity.case.json",
  "tests/contracts/v11/cases/reply/reply-waiting-human-round-invalid.case.json",
  "tests/contracts/v11/cases/reply/reply-waiting-human-round-invalid-v11.case.json",
  "tests/contracts/v11/cases/reply/reply-waiting-human-round-invalid-parity.case.json",
  "tests/contracts/v11/cases/reply/reply-waiting-human-context-incomplete.case.json",
  "tests/contracts/v11/cases/reply/reply-waiting-human-context-incomplete-v11.case.json",
  "tests/contracts/v11/cases/reply/reply-waiting-human-context-incomplete-parity.case.json"
] as const;
const replyExpectedSourcesSorted = [...replyCaseSources].sort();

function parseReplySourcesFromManifest(
  manifestRaw: string
): string[] {
  const manifest = JSON.parse(manifestRaw) as {
    entries?: Array<{ command?: string; source?: string }>;
  };

  return (manifest.entries ?? [])
    .filter((entry) => entry.command === "reply")
    .map((entry) => entry.source)
    .filter((source): source is string => typeof source === "string")
    .sort();
}

const replyInvalidInputCases: Array<{
  name: string;
  caseDef: ContractCase;
  expectedErrorMessage: string;
}> = [
  {
    name: "rejects invalid reply contract input when message is empty",
    caseDef: {
      id: "reply-invalid-empty-message",
      command: "reply",
      mode: "baseline",
      description: "invalid empty message validation",
      input: {
        message: "   ",
        refs: []
      },
      expected: {
        status: "ok"
      }
    },
    expectedErrorMessage: "reply contract input.message must be a non-empty string."
  },
  {
    name: "rejects invalid reply contract input when refs is not string array",
    caseDef: {
      id: "reply-invalid-refs",
      command: "reply",
      mode: "baseline",
      description: "invalid refs validation",
      input: {
        message: "Valid reply message",
        refs: ["ok-ref", 42]
      },
      expected: {
        status: "ok"
      }
    },
    expectedErrorMessage: "reply contract input.refs must be a string array."
  },
  {
    name: "rejects invalid reply contract input in v11 mode when refs is not string array",
    caseDef: {
      id: "reply-invalid-refs-v11",
      command: "reply",
      mode: "v11",
      description: "invalid refs validation for v11 mode",
      input: {
        message: "Valid reply message",
        refs: ["ok-ref", 42]
      },
      expected: {
        status: "ok"
      }
    },
    expectedErrorMessage: "reply contract input.refs must be a string array."
  }
];

describe("v11 reply contract harness skeleton", () => {
  it("loads seed contract case metadata", async () => {
    const casePath = resolve(process.cwd(), replyCaseSources[0]);
    const caseDef = await readContractCase(casePath);
    expect(caseDef.command).toBe("reply");
    expect(caseDef.mode).toBe("baseline");
    expect(caseDef.expected.status).toBe("ok");
  });

  it(
    "executes baseline and parity assertions via shared runner",
    { timeout: CONTRACT_TEST_TIMEOUT.parityGitHeavyMs },
    async () => {
    const casePaths = replyCaseSources.map((source) =>
      resolve(process.cwd(), source)
    );

    for (const casePath of casePaths) {
      const caseDef = await readContractCase(casePath);
      const run = await runReplyContractCase(caseDef);
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

  it("includes reply seed entries in corpus manifest", async () => {
    const manifestPath = resolve(
      process.cwd(),
      "tests/contracts/v11/corpus/manifest.json"
    );
    const manifestRaw = await readFile(manifestPath, "utf8");
    const replySources = parseReplySourcesFromManifest(manifestRaw);

    expect(replySources).toEqual(replyExpectedSourcesSorted);
  });

  it("builds corpus output manifest with reply seed entries", async () => {
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
    const replySources = parseReplySourcesFromManifest(outputRaw);

    expect(replySources).toEqual(replyExpectedSourcesSorted);
  });

  for (const testCase of replyInvalidInputCases) {
    it(testCase.name, async () => {
      await expect(runReplyContractCase(testCase.caseDef)).rejects.toThrow(
        testCase.expectedErrorMessage
      );
    });
  }
});
