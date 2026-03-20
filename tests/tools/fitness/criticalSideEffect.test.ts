import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildCriticalSideEffectCheckReport } from "../../../tools/fitness/checks/critical-side-effect.js";

const tempDirs: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-fitness-critical-side-effect-"));
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

describe("critical side-effect fitness check", () => {
  it("fails when kickoff delivery invariant evidence is missing", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/kickoff/runKickoffFlow.ts",
      [
        "export async function runKickoff(): Promise<void> {",
        "  // state + transcript path only",
        "}"
      ].join("\n")
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/pass/reviewerDelivery.ts",
      "export const emit = emitTmuxDeliveryNotification;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/converged/convergedResult.ts",
      "export const result = { delivery: { delivered: true } };\n"
    );

    const report = await buildCriticalSideEffectCheckReport({
      check: {
        id: "critical_side_effect",
        metric: "critical command side-effect invariant coverage",
        mode: "report-only",
        exception_lifecycle_mode: undefined,
        owner: "architecture/runtime",
        scope: ["src/v11/application/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only"
    });

    expect(report.status).toBe("fail");
    expect(
      report.details?.some((detail) =>
        detail.includes("kickoff: missing delivery invariant evidence")
      )
    ).toBe(true);
  });

  it("passes when all critical command invariants are covered", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/kickoff/runKickoffFlow.ts",
      "export const result = { delivery: { delivered: false } };\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/pass/reviewerDelivery.ts",
      "export const emit = emitTmuxDeliveryNotification;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/converged/convergedResult.ts",
      "export const result = { delivery: { delivered: true } };\n"
    );

    const report = await buildCriticalSideEffectCheckReport({
      check: {
        id: "critical_side_effect",
        metric: "critical command side-effect invariant coverage",
        mode: "report-only",
        exception_lifecycle_mode: undefined,
        owner: "architecture/runtime",
        scope: ["src/v11/application/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only"
    });

    expect(report.status).toBe("pass");
    expect(report.summary).toContain("all 3 command invariant(s) covered");
  });

  it("warns when scope is missing", async () => {
    const report = await buildCriticalSideEffectCheckReport({
      check: {
        id: "critical_side_effect",
        metric: "critical command side-effect invariant coverage",
        mode: undefined,
        exception_lifecycle_mode: undefined,
        owner: "architecture/runtime",
        scope: undefined,
        exceptions: undefined
      },
      repoRoot: process.cwd(),
      fallbackMode: "report-only"
    });

    expect(report.status).toBe("warn");
  });
});
