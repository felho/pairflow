import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildContractTimeoutPolicyCheckReport } from "../../../tools/fitness/checks/contract-timeout-policy.js";

const tempDirs: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-fitness-contract-timeout-policy-"));
  tempDirs.push(root);
  return root;
}

async function writeRepoFile(
  repoRoot: string,
  relativePath: string,
  content: string
): Promise<void> {
  const absolutePath = join(repoRoot, relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("contract timeout policy fitness check", () => {
  it("fails when contract tests use raw numeric timeout literals", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "tests/contracts/v11/sample.contract.test.ts",
      [
        "import { it } from 'vitest';",
        "it('legacy style', async () => {}, 10_000);"
      ].join("\n")
    );

    const report = await buildContractTimeoutPolicyCheckReport({
      check: {
        id: "contract_timeout_policy",
        metric:
          "v11 contract tests must use shared timeout constants (no raw timeout literals)",
        mode: "report-only",
        owner: "architecture/runtime",
        scope: ["tests/contracts/v11/*.contract.test.ts"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only"
    });

    expect(report.status).toBe("fail");
    expect(
      report.details?.some((detail) =>
        detail.includes("raw numeric timeout argument detected")
      )
    ).toBe(true);
  });

  it("fails when timeout option does not reference CONTRACT_TEST_TIMEOUT", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "tests/contracts/v11/sample.contract.test.ts",
      [
        "import { it } from 'vitest';",
        "const timeout = 12_000;",
        "it('non-standard timeout ref', { timeout }, async () => {});"
      ].join("\n")
    );

    const report = await buildContractTimeoutPolicyCheckReport({
      check: {
        id: "contract_timeout_policy",
        metric:
          "v11 contract tests must use shared timeout constants (no raw timeout literals)",
        mode: "report-only",
        owner: "architecture/runtime",
        scope: ["tests/contracts/v11/*.contract.test.ts"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only"
    });

    expect(report.status).toBe("fail");
    expect(
      report.details?.some((detail) =>
        detail.includes("timeout option must reference CONTRACT_TEST_TIMEOUT.*")
      )
    ).toBe(true);
  });

  it("passes when timeout options use shared contract timeout constants", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "tests/contracts/v11/sample.contract.test.ts",
      [
        "import { it } from 'vitest';",
        "import { CONTRACT_TEST_TIMEOUT } from './contractTestTimeouts.js';",
        "it('object timeout style', { timeout: CONTRACT_TEST_TIMEOUT.parityStandardMs }, async () => {});",
        "it('no timeout also allowed', async () => {});"
      ].join("\n")
    );

    const report = await buildContractTimeoutPolicyCheckReport({
      check: {
        id: "contract_timeout_policy",
        metric:
          "v11 contract tests must use shared timeout constants (no raw timeout literals)",
        mode: "report-only",
        owner: "architecture/runtime",
        scope: ["tests/contracts/v11/*.contract.test.ts"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only"
    });

    expect(report.status).toBe("pass");
  });

  it("warns when scope is missing", async () => {
    const repoRoot = await createTempRoot();
    const report = await buildContractTimeoutPolicyCheckReport({
      check: {
        id: "contract_timeout_policy",
        metric:
          "v11 contract tests must use shared timeout constants (no raw timeout literals)",
        mode: "report-only",
        owner: "architecture/runtime",
        scope: undefined,
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only"
    });

    expect(report.status).toBe("warn");
  });
});
