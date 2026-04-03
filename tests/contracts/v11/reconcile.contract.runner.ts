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
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../../src/core/state/stateStore.js";
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
  baseline?: ReconcileContractOutput;
  v11?: ReconcileContractOutput;
}

interface ParsedReconcileCaseInput {
  dryRun: boolean;
  scenario:
    | "default"
    | "mutate_no_stale"
    | "stale_reason_final_state"
    | "stale_reason_non_runtime_state";
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
  const fixtureRaw = input.fixture;
  let scenario: ParsedReconcileCaseInput["scenario"] = "default";
  if (fixtureRaw !== undefined) {
    if (typeof fixtureRaw !== "object" || fixtureRaw === null) {
      throw new Error("reconcile contract input.fixture must be an object when provided.");
    }
    const scenarioRaw = (fixtureRaw as Record<string, unknown>).scenario;
    if (
      scenarioRaw !== undefined &&
      scenarioRaw !== "default" &&
      scenarioRaw !== "mutate_no_stale" &&
      scenarioRaw !== "stale_reason_final_state" &&
      scenarioRaw !== "stale_reason_non_runtime_state"
    ) {
      throw new Error(
        "reconcile contract input.fixture.scenario must be one of: default, mutate_no_stale, stale_reason_final_state, stale_reason_non_runtime_state."
      );
    }
    scenario = scenarioRaw ?? "default";
  }
  return {
    dryRun: dryRunRaw ?? true,
    scenario
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
  if (input.parsedInput.scenario === "mutate_no_stale") {
    if (input.output.staleCandidates !== 0) {
      throw new Error(
        `reconcile contract case=${input.caseDef.id}: expected staleCandidates=0 for mutate_no_stale scenario (actual=${input.output.staleCandidates}).`
      );
    }
    if (input.output.sessionsAfter !== input.output.sessionsBefore) {
      throw new Error(
        `reconcile contract case=${input.caseDef.id}: expected no session removal for mutate_no_stale scenario (before=${input.output.sessionsBefore}, after=${input.output.sessionsAfter}).`
      );
    }
    if (input.output.actionRemovedFlags.some((flag) => flag)) {
      throw new Error(
        `reconcile contract case=${input.caseDef.id}: expected no removed flags for mutate_no_stale scenario.`
      );
    }
    return;
  }

  if (input.parsedInput.scenario === "stale_reason_final_state") {
    if (input.output.staleCandidates !== 1) {
      throw new Error(
        `reconcile contract case=${input.caseDef.id}: expected staleCandidates=1 for stale_reason_final_state (actual=${input.output.staleCandidates}).`
      );
    }
    if (input.output.actionReasons.length !== 1 || input.output.actionReasons[0] !== "final_state") {
      throw new Error(
        `reconcile contract case=${input.caseDef.id}: expected only final_state stale reason (actual=${JSON.stringify(input.output.actionReasons)}).`
      );
    }
    return;
  }

  if (input.parsedInput.scenario === "stale_reason_non_runtime_state") {
    if (input.output.staleCandidates !== 1) {
      throw new Error(
        `reconcile contract case=${input.caseDef.id}: expected staleCandidates=1 for stale_reason_non_runtime_state (actual=${input.output.staleCandidates}).`
      );
    }
    if (
      input.output.actionReasons.length !== 1 ||
      input.output.actionReasons[0] !== "non_runtime_state"
    ) {
      throw new Error(
        `reconcile contract case=${input.caseDef.id}: expected only non_runtime_state stale reason (actual=${JSON.stringify(input.output.actionReasons)}).`
      );
    }
    return;
  }

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
  baseline: ReconcileContractOutput;
  v11: ReconcileContractOutput;
  caseId: string;
}): void {
  if (JSON.stringify(input.baseline) !== JSON.stringify(input.v11)) {
    throw new Error(
      `reconcile parity mismatch for case=${input.caseId}: baseline=${JSON.stringify(input.baseline)} v11=${JSON.stringify(input.v11)}`
    );
  }
}

async function seedRuntimeSessionsFixture(input: {
  repoPath: string;
  bubbleId: string;
  scenario: ParsedReconcileCaseInput["scenario"];
}) {
  const bubble = await setupRunningBubbleFixture({
    repoPath: input.repoPath,
    bubbleId: input.bubbleId,
    task: "Reconcile contract parity fixture"
  });

  await upsertRuntimeSession({
    sessionsPath: bubble.paths.sessionsPath,
    bubbleId: bubble.bubbleId,
    repoPath: input.repoPath,
    worktreePath: bubble.paths.worktreePath,
    tmuxSessionName: `pf-${bubble.bubbleId}`,
    now: new Date("2026-03-20T10:45:00.000Z")
  });

  if (input.scenario === "stale_reason_final_state" || input.scenario === "stale_reason_non_runtime_state") {
    const loaded = await readStateSnapshot(bubble.paths.statePath);
    const targetState: typeof loaded.state.state =
      input.scenario === "stale_reason_final_state"
        ? "FAILED"
        : "PREPARING_WORKSPACE";
    const nextState = {
      ...loaded.state,
      state: targetState,
      execution_context: null
    };
    await writeStateSnapshot(bubble.paths.statePath, nextState, {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "RUNNING"
    });
    return;
  }

  if (input.scenario !== "mutate_no_stale") {
    await upsertRuntimeSession({
      sessionsPath: bubble.paths.sessionsPath,
      bubbleId: "b_reconcile_contract_missing",
      repoPath: input.repoPath,
      worktreePath: "/tmp/missing",
      tmuxSessionName: "pf-b_reconcile_contract_missing",
      now: new Date("2026-03-20T10:45:01.000Z")
    });
  }
}

async function executeReconcileCase(input: {
  caseDef: ContractCase;
  executor: typeof reconcileRuntimeSessions;
}): Promise<ReconcileContractOutput> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-reconcile-contract-"));
  try {
    await initGitRepository(repoPath);
    const parsedInput = parseReconcileCaseInput(input.caseDef.input);
    await seedRuntimeSessionsFixture({
      repoPath,
      bubbleId: buildReconcileContractBubbleId(input.caseDef.id),
      scenario: parsedInput.scenario
    });

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

  if (caseDef.mode === "baseline") {
    const baseline = await executeReconcileCase({
      caseDef,
      executor: reconcileRuntimeSessions
    });
    assertContractExpectedSubset({
      output: baseline,
      expected: caseDef.expected,
      label: "baseline"
    });
    return {
      mode: caseDef.mode,
      baseline
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

  const baseline = await executeReconcileCase({
    caseDef,
    executor: reconcileRuntimeSessions
  });
  const v11 = await executeReconcileCase({
    caseDef,
    executor: reconcileRuntimeSessionsV11
  });
  assertContractExpectedSubset({
    output: baseline,
    expected: caseDef.expected,
    label: "parity/baseline"
  });
  assertContractExpectedSubset({
    output: v11,
    expected: caseDef.expected,
    label: "parity/v11"
  });
  assertParityEquivalent({
    baseline,
    v11,
    caseId: caseDef.id
  });
  return {
    mode: caseDef.mode,
    baseline,
    v11
  };
}
