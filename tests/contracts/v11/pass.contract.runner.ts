import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  emitPassFromWorkspace,
  type EmitPassInput,
  type EmitPassResult
} from "../../../src/core/agent/pass.js";
import { emitPassFromWorkspaceV11 } from "../../../src/v11/application/pass/emitPassV11.js";
import { readStateSnapshot } from "../../../src/core/state/stateStore.js";
import { isPassIntent, type PassIntent } from "../../../src/types/protocol.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";
import type { ContractCase, ContractCaseExpected } from "./schema.js";

export interface PassContractSuccessOutput {
  status: "ok";
  reasonCode: "PASS_ACCEPTED" | "PASS_AUTO_CONVERGED";
  envelopeType: string;
  stateSubset: {
    state: string;
  };
}

export interface PassContractErrorOutput {
  status: "error";
  reasonCode: string | null;
  stateSubset: {
    state: string;
  };
}

export type PassContractOutput =
  | PassContractSuccessOutput
  | PassContractErrorOutput;

export interface PassContractRunResult {
  mode: ContractCase["mode"];
  baseline?: PassContractOutput;
  v11?: PassContractOutput;
}

interface ParsedPassCaseInput {
  passInput: Omit<EmitPassInput, "cwd">;
  seedRoundTwoCleanHistory: boolean;
}

function parsePassCaseInput(input: ContractCase["input"]): ParsedPassCaseInput {
  const summaryRaw = input.summary;
  if (typeof summaryRaw !== "string" || summaryRaw.trim().length === 0) {
    throw new Error("PASS contract input.summary must be a non-empty string.");
  }

  const refsRaw = input.refs;
  let refs: string[] | undefined;
  if (refsRaw !== undefined) {
    if (
      !Array.isArray(refsRaw) ||
      !refsRaw.every((value) => typeof value === "string")
    ) {
      throw new Error("PASS contract input.refs must be a string array.");
    }
    refs = refsRaw;
  }

  const intentRaw = input.intent;
  let intent: PassIntent | undefined;
  if (intentRaw !== undefined) {
    if (!isPassIntent(intentRaw)) {
      throw new Error(
        "PASS contract input.intent must be one of: task, review, fix_request."
      );
    }
    intent = intentRaw;
  }

  const noFindingsRaw = input.noFindings;
  let noFindings: boolean | undefined;
  if (noFindingsRaw !== undefined) {
    if (typeof noFindingsRaw !== "boolean") {
      throw new Error("PASS contract input.noFindings must be a boolean.");
    }
    noFindings = noFindingsRaw;
  }

  const seedRoundTwoCleanHistoryRaw = input.seedRoundTwoCleanHistory;
  let seedRoundTwoCleanHistory = false;
  if (seedRoundTwoCleanHistoryRaw !== undefined) {
    if (typeof seedRoundTwoCleanHistoryRaw !== "boolean") {
      throw new Error(
        "PASS contract input.seedRoundTwoCleanHistory must be a boolean."
      );
    }
    seedRoundTwoCleanHistory = seedRoundTwoCleanHistoryRaw;
  }

  return {
    passInput: {
      summary: summaryRaw.trim(),
      ...(refs !== undefined ? { refs } : {}),
      ...(intent !== undefined ? { intent } : {}),
      ...(noFindings !== undefined ? { noFindings } : {})
    },
    seedRoundTwoCleanHistory
  };
}

function normalizePassResult(result: EmitPassResult): PassContractOutput {
  return {
    status: "ok",
    reasonCode:
      result.transitionDecision === "auto_converge"
        ? "PASS_AUTO_CONVERGED"
        : "PASS_ACCEPTED",
    envelopeType: result.envelope.type,
    stateSubset: {
      state: result.state.state
    }
  };
}

function normalizePassErrorResult(input: {
  error: unknown;
  state: string;
}): PassContractErrorOutput {
  const message = input.error instanceof Error ? input.error.message : String(input.error);
  const reasonMatch = /^([A-Z0-9_]+):/u.exec(message.trim());
  return {
    status: "error",
    reasonCode: reasonMatch?.[1] ?? null,
    stateSubset: {
      state: input.state
    }
  };
}

function assertContractExpectedSubset(input: {
  output: PassContractOutput;
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
  if (
    input.expected.envelopeType !== undefined &&
    (
      input.output.status !== "ok"
      || input.output.envelopeType !== input.expected.envelopeType
    )
  ) {
    throw new Error(
      `${input.label}: envelopeType mismatch (expected=${input.expected.envelopeType}, actual=${input.output.status === "ok" ? input.output.envelopeType : "error-output"})`
    );
  }
  const expectedState = input.expected.stateSubset?.state;
  if (
    typeof expectedState === "string" &&
    input.output.stateSubset.state !== expectedState
  ) {
    throw new Error(
      `${input.label}: stateSubset.state mismatch (expected=${expectedState}, actual=${input.output.stateSubset.state})`
    );
  }
}

function assertParityEquivalent(input: {
  baseline: PassContractOutput;
  v11: PassContractOutput;
  caseId: string;
}): void {
  if (JSON.stringify(input.baseline) !== JSON.stringify(input.v11)) {
    throw new Error(
      `PASS parity mismatch for case=${input.caseId}: baseline=${JSON.stringify(input.baseline)} v11=${JSON.stringify(input.v11)}`
    );
  }
}

async function executePassCase(input: {
  caseDef: ContractCase;
  executor: (passInput: EmitPassInput) => Promise<EmitPassResult>;
}): Promise<PassContractOutput> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-pass-contract-"));
  try {
    await initGitRepository(repoPath);
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: `b_contract_${input.caseDef.id}`,
      task: input.caseDef.description
    });
    const parsedInput = parsePassCaseInput(input.caseDef.input);
    if (parsedInput.seedRoundTwoCleanHistory) {
      await advanceToReviewerRoundTwoWithCleanHistory(bubble.paths.worktreePath);
    }
    try {
      const result = await input.executor({
        ...parsedInput.passInput,
        cwd: bubble.paths.worktreePath
      });
      return normalizePassResult(result);
    } catch (error) {
      const stateSnapshot = await readStateSnapshot(bubble.paths.statePath);
      return normalizePassErrorResult({
        error,
        state: stateSnapshot.state.state
      });
    }
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
}

async function advanceToReviewerRoundTwoWithCleanHistory(
  worktreePath: string
): Promise<void> {
  await emitPassFromWorkspace({
    summary: "Implementer handoff round 1",
    cwd: worktreePath,
    now: new Date("2026-03-01T10:01:00.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Reviewer clean handoff round 1",
    noFindings: true,
    cwd: worktreePath,
    now: new Date("2026-03-01T10:02:00.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Implementer handoff round 2",
    cwd: worktreePath,
    now: new Date("2026-03-01T10:03:00.000Z")
  });
}

export async function runPassContractCase(
  caseDef: ContractCase
): Promise<PassContractRunResult> {
  if (caseDef.command !== "pass") {
    throw new Error(`Unsupported command for PASS contract runner: ${caseDef.command}`);
  }

  if (caseDef.mode === "baseline") {
    const baseline = await executePassCase({
      caseDef,
      executor: emitPassFromWorkspace
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
    const v11 = await executePassCase({
      caseDef,
      executor: emitPassFromWorkspaceV11
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

  const baseline = await executePassCase({
    caseDef,
    executor: emitPassFromWorkspace
  });
  const v11 = await executePassCase({
    caseDef,
    executor: emitPassFromWorkspaceV11
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
