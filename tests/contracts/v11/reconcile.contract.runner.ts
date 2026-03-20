import { mkdtemp, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { reconcileRuntimeSessions } from "../../../src/core/runtime/startupReconciler.js";
import {
  reconcileRuntimeSessionsV11
} from "../../../src/v11/application/reconcile/emitReconcileV11.js";
import { upsertRuntimeSession } from "../../../src/core/runtime/sessionsRegistry.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";
import type { ContractCase, ContractCaseExpected } from "./schema.js";

export interface ReconcileContractOutput {
  status: "ok";
  reasonCode: "RECONCILE_COMPLETED";
  dryRun: boolean;
  sessionsBefore: number;
  sessionsAfter: number;
  staleCandidates: number;
  actionReasons: string[];
  actionRemovedFlags: boolean[];
}

export interface ReconcileContractRunResult {
  mode: ContractCase["mode"];
  legacy?: ReconcileContractOutput;
  v11?: ReconcileContractOutput;
}

interface ParsedReconcileCaseInput {
  dryRun: boolean;
}

function buildReconcileContractBubbleId(caseId: string): string {
  const suffix = createHash("sha1").update(caseId).digest("hex").slice(0, 12);
  return `b_contract_${suffix}`;
}

function parseReconcileCaseInput(
  input: ContractCase["input"]
): ParsedReconcileCaseInput {
  const dryRunRaw = input.dryRun;
  if (dryRunRaw !== undefined && typeof dryRunRaw !== "boolean") {
    throw new Error("reconcile contract input.dryRun must be a boolean.");
  }
  return {
    dryRun: dryRunRaw ?? true
  };
}

function normalizeReconcileResult(
  result: Awaited<ReturnType<typeof reconcileRuntimeSessions>>
): ReconcileContractOutput {
  return {
    status: "ok",
    reasonCode: "RECONCILE_COMPLETED",
    dryRun: result.dryRun,
    sessionsBefore: result.sessionsBefore,
    sessionsAfter: result.sessionsAfter,
    staleCandidates: result.staleCandidates,
    actionReasons: result.actions.map((action) => action.reason).sort(),
    actionRemovedFlags: result.actions.map((action) => action.removed)
  };
}

function assertReconcileMutationScenario(input: {
  caseDef: ContractCase;
  parsedInput: ParsedReconcileCaseInput;
  output: ReconcileContractOutput;
}): void {
  if (input.parsedInput.dryRun) {
    return;
  }
  const removedAny = input.output.actionRemovedFlags.some((flag) => flag);
  if (!removedAny) {
    throw new Error(
      `reconcile contract case=${input.caseDef.id}: expected at least one removed runtime session when dryRun=false.`
    );
  }
  if (input.output.sessionsAfter >= input.output.sessionsBefore) {
    throw new Error(
      `reconcile contract case=${input.caseDef.id}: expected sessionsAfter < sessionsBefore when dryRun=false (before=${input.output.sessionsBefore}, after=${input.output.sessionsAfter}).`
    );
  }
}

function assertContractExpectedSubset(input: {
  output: ReconcileContractOutput;
  expected: ContractCaseExpected;
  label: string;
}): void {
  if (input.output.status !== input.expected.status) {
    throw new Error(
      `${input.label}: status mismatch (expected=${input.expected.status}, actual=${input.output.status})`
    );
  }
  if (
    input.expected.reasonCode !== undefined &&
    input.output.reasonCode !== input.expected.reasonCode
  ) {
    throw new Error(
      `${input.label}: reasonCode mismatch (expected=${input.expected.reasonCode}, actual=${input.output.reasonCode})`
    );
  }
}

function assertParityEquivalent(input: {
  legacy: ReconcileContractOutput;
  v11: ReconcileContractOutput;
  caseId: string;
}): void {
  if (JSON.stringify(input.legacy) !== JSON.stringify(input.v11)) {
    throw new Error(
      `reconcile parity mismatch for case=${input.caseId}: legacy=${JSON.stringify(input.legacy)} v11=${JSON.stringify(input.v11)}`
    );
  }
}

async function seedRuntimeSessionsFixture(repoPath: string, bubbleId: string) {
  const bubble = await setupRunningBubbleFixture({
    repoPath,
    bubbleId,
    task: "Reconcile contract parity fixture"
  });

  await upsertRuntimeSession({
    sessionsPath: bubble.paths.sessionsPath,
    bubbleId: bubble.bubbleId,
    repoPath,
    worktreePath: bubble.paths.worktreePath,
    tmuxSessionName: `pf-${bubble.bubbleId}`,
    now: new Date("2026-03-20T10:45:00.000Z")
  });

  await upsertRuntimeSession({
    sessionsPath: bubble.paths.sessionsPath,
    bubbleId: "b_reconcile_contract_missing",
    repoPath,
    worktreePath: "/tmp/missing",
    tmuxSessionName: "pf-b_reconcile_contract_missing",
    now: new Date("2026-03-20T10:45:01.000Z")
  });
}

async function executeReconcileCase(input: {
  caseDef: ContractCase;
  executor: typeof reconcileRuntimeSessions;
}): Promise<ReconcileContractOutput> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-reconcile-contract-"));
  try {
    await initGitRepository(repoPath);
    await seedRuntimeSessionsFixture(repoPath, buildReconcileContractBubbleId(input.caseDef.id));
    const parsedInput = parseReconcileCaseInput(input.caseDef.input);

    const result = await input.executor({
      repoPath,
      dryRun: parsedInput.dryRun,
      isTmuxSessionAlive: (sessionName) =>
        Promise.resolve(sessionName.startsWith("pf-b_contract_"))
    });
    const output = normalizeReconcileResult(result);
    assertReconcileMutationScenario({
      caseDef: input.caseDef,
      parsedInput,
      output
    });
    return output;
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
}

export async function runReconcileContractCase(
  caseDef: ContractCase
): Promise<ReconcileContractRunResult> {
  if (caseDef.command !== "reconcile") {
    throw new Error(
      `Unsupported command for reconcile contract runner: ${caseDef.command}`
    );
  }

  if (caseDef.mode === "legacy") {
    const legacy = await executeReconcileCase({
      caseDef,
      executor: reconcileRuntimeSessions
    });
    assertContractExpectedSubset({
      output: legacy,
      expected: caseDef.expected,
      label: "legacy"
    });
    return {
      mode: caseDef.mode,
      legacy
    };
  }

  if (caseDef.mode === "v11") {
    const v11 = await executeReconcileCase({
      caseDef,
      executor: reconcileRuntimeSessionsV11
    });
    assertContractExpectedSubset({
      output: v11,
      expected: caseDef.expected,
      label: "v11"
    });
    return {
      mode: caseDef.mode,
      v11
    };
  }

  const legacy = await executeReconcileCase({
    caseDef,
    executor: reconcileRuntimeSessions
  });
  const v11 = await executeReconcileCase({
    caseDef,
    executor: reconcileRuntimeSessionsV11
  });
  assertContractExpectedSubset({
    output: legacy,
    expected: caseDef.expected,
    label: "parity/legacy"
  });
  assertContractExpectedSubset({
    output: v11,
    expected: caseDef.expected,
    label: "parity/v11"
  });
  assertParityEquivalent({
    legacy,
    v11,
    caseId: caseDef.id
  });
  return {
    mode: caseDef.mode,
    legacy,
    v11
  };
}
