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
      "export const emit = (): void => { emitDeliveryNotificationAck(); };\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/converged/convergedResult.ts",
      "export const result = { delivery: { status: 'accepted' } };\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/approval/runApprovalFlow.ts",
      "export const emit = (): void => { emitDeliveryNotificationAck(); };\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/reply/replyCommandApi.ts",
      "export const emit = (): void => { emitDeliveryNotificationAck(); };\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/askHuman/runAskHumanFlow.ts",
      "export const emit = (): void => { emitDeliveryNotificationAck(); };\n"
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
      "export const result = { delivery: { status: 'rejected' } };\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/pass/reviewerDelivery.ts",
      "export const emit = (): void => { emitDeliveryNotificationAck(); };\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/converged/convergedResult.ts",
      "export const result = { delivery: { status: 'accepted' } };\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/approval/runApprovalFlow.ts",
      "export const emit = (): void => { emitDeliveryNotificationAck(); };\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/reply/replyCommandApi.ts",
      "export const emit = (): void => { emitDeliveryNotificationAck(); };\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/askHuman/runAskHumanFlow.ts",
      "export const emit = (): void => { emitDeliveryNotificationAck(); };\n"
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
    expect(report.summary).toContain("all 6 command invariant(s) covered");
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

  it("ignores contract-only command files as delivery evidence", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/kickoff/kickoffCommandContract.ts",
      "export interface KickoffCommandContract { delivery: { delivered: boolean } }\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/pass/passCommandContract.ts",
      "export interface PassCommandContract { emitDeliveryNotificationAck: unknown }\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/converged/convergedCommandContract.ts",
      "export interface ConvergedCommandContract { delivery: { delivered: boolean } }\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/approval/approvalCommandContract.ts",
      "export interface ApprovalCommandContract { emitDeliveryNotificationAck: unknown }\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/reply/replyCommandContract.ts",
      "export interface ReplyCommandContract { emitDeliveryNotificationAck: unknown }\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/askHuman/askHumanCommandContract.ts",
      "export interface AskHumanCommandContract { emitDeliveryNotificationAck: unknown }\n"
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
      report.details?.every((detail) =>
        detail.includes("missing delivery invariant evidence")
      )
    ).toBe(true);
  });

  it("does not treat string literal mentions as delivery evidence", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/kickoff/runKickoffFlow.ts",
      "export const note = 'emitDeliveryNotificationAck + delivery:';\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/pass/runPassFlow.ts",
      "export const note = 'emitDeliveryNotificationAck + delivery:';\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/converged/runConvergedFlow.ts",
      "export const note = 'emitDeliveryNotificationAck + delivery:';\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/approval/runApprovalFlow.ts",
      "export const note = 'emitDeliveryNotificationAck + delivery:';\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/reply/runReplyFlow.ts",
      "export const note = 'emitDeliveryNotificationAck + delivery:';\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/askHuman/runAskHumanFlow.ts",
      "export const note = 'emitDeliveryNotificationAck + delivery:';\n"
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
      report.details?.every((detail) =>
        detail.includes("missing delivery invariant evidence")
      )
    ).toBe(true);
  });

  it("treats adapter alias calls as delivery evidence", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/reply/runReplyFlow.ts",
      [
        "const notifier = dependencies.emitDeliveryNotificationAck ?? emitDeliveryNotificationAck;",
        "void notifier({ recipient: 'human', message: 'x' });"
      ].join("\n")
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/kickoff/runKickoffFlow.ts",
      "export const result = { delivery: { status: 'accepted' } };\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/pass/runPassFlow.ts",
      "export const emit = (): void => { emitDeliveryNotificationAck(); };\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/converged/runConvergedFlow.ts",
      "export const result = { delivery: { status: 'accepted' } };\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/approval/runApprovalFlow.ts",
      "export const emit = (): void => { emitDeliveryNotificationAck(); };\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/askHuman/runAskHumanFlow.ts",
      "export const emit = (): void => { emitDeliveryNotificationAck(); };\n"
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
    expect(report.summary).toContain("all 6 command invariant(s) covered");
  });

  it("does not treat weak delivery payloads as explicit result evidence", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/kickoff/runKickoffFlow.ts",
      "export const result = { delivery: {} };\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/pass/runPassFlow.ts",
      "export const result = { delivery: note };\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/converged/runConvergedFlow.ts",
      "const delivery = { status: 'accepted' };\nexport const result = { delivery };\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/approval/runApprovalFlow.ts",
      "export const note = 'missing';\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/reply/runReplyFlow.ts",
      "export const note = 'missing';\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/askHuman/runAskHumanFlow.ts",
      "export const note = 'missing';\n"
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
    expect(
      report.details?.some((detail) =>
        detail.includes("pass: missing delivery invariant evidence")
      )
    ).toBe(true);
    expect(
      report.details?.some((detail) =>
        detail.includes("converged: missing delivery invariant evidence")
      )
    ).toBe(true);
  });

  it("treats explicit delivery outcome shape as result evidence", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/kickoff/runKickoffFlow.ts",
      "export const result = { delivery: { status: 'failed', reasonCode: 'delivery_failed' } };\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/pass/runPassFlow.ts",
      "export const emit = (): void => { emitDeliveryNotificationAck(); };\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/converged/runConvergedFlow.ts",
      "export const result = { delivery: { status: 'accepted' } };\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/approval/runApprovalFlow.ts",
      "export const emit = (): void => { emitDeliveryNotificationAck(); };\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/reply/runReplyFlow.ts",
      "export const emit = (): void => { emitDeliveryNotificationAck(); };\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/askHuman/runAskHumanFlow.ts",
      "export const emit = (): void => { emitDeliveryNotificationAck(); };\n"
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
    expect(report.summary).toContain("all 6 command invariant(s) covered");
  });
});
