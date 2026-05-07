import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildBoundaryCheckReport } from "../../../tools/fitness/checks/boundary.js";

const tempDirs: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-fitness-boundary-"));
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

describe("boundary fitness check", () => {
  it("returns warn when scope is missing", async () => {
    const report = await buildBoundaryCheckReport({
      check: {
        id: "boundary",
        metric: "forbidden direct state/transcript write",
        mode: undefined,
        owner: "architecture",
        scope: undefined,
        exceptions: undefined
      },
      repoRoot: process.cwd(),
      fallbackMode: "report-only"
    });

    expect(report.status).toBe("warn");
  });

  it("fails on direct write patterns in scoped files", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/use-case.ts",
      [
        "export async function run(): Promise<void> {",
        "  await writeStateSnapshot('x');",
        "  await appendProtocolEnvelope({});",
        "}"
      ].join("\n")
    );

    const report = await buildBoundaryCheckReport({
      check: {
        id: "boundary",
        metric: "forbidden direct state/transcript write",
        mode: "report-only",
        owner: "architecture",
        scope: ["src/v11/application/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only"
    });

    expect(report.status).toBe("fail");
    expect(report.details?.some((detail) => detail.includes("direct state write"))).toBe(
      true
    );
    expect(
      report.details?.some((detail) => detail.includes("direct transcript write"))
    ).toBe(true);
  });

  it("allows application mutation execution directory boundaries", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/reply/mutation/replyMutationExecution.ts",
      [
        "export async function executeReplyMutation(): Promise<void> {",
        "  await appendProtocolEnvelope({});",
        "  await writeStateSnapshot('x');",
        "}"
      ].join("\n")
    );

    const report = await buildBoundaryCheckReport({
      check: {
        id: "boundary",
        metric: "forbidden direct state/transcript write",
        mode: "hard-fail",
        owner: "architecture",
        scope: ["src/v11/application/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("pass");
    expect(report.details).toContain("mutation_execution_convention_files=1");
  });

  it("allows typed mutation_executor exceptions for non-standard paths", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/reply/replyMutationExecution.ts",
      [
        "export async function executeReplyMutation(): Promise<void> {",
        "  await appendProtocolEnvelope({});",
        "  await writeStateSnapshot('x');",
        "}"
      ].join("\n")
    );

    const report = await buildBoundaryCheckReport({
      check: {
        id: "boundary",
        metric: "forbidden direct state/transcript write",
        mode: "hard-fail",
        owner: "architecture",
        scope: ["src/v11/application/**"],
        exceptions: [
          {
            id: "reply-mutation-executor",
            kind: "mutation_executor",
            owner: "architecture",
            reason: "reply mutation executor owns transcript-first state mutation",
            from: undefined,
            to: undefined,
            paths: ["src/v11/application/reply/replyMutationExecution.ts"]
          }
        ]
      },
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("pass");
    expect(report.details).toContain("mutation_executor_exceptions_applied=1");
    expect(report.details).toContain(
      "mutation_executor_exceptions_applied_ids=reply-mutation-executor"
    );
  });
});
