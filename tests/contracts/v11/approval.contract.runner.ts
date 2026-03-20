import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  emitApprove,
  emitRequestRework
} from "../../../src/core/human/approval.js";
import {
  emitApproveV11,
  emitRequestReworkV11
} from "../../../src/v11/application/approval/emitApprovalV11.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";
import { applyStateTransition } from "../../../src/core/state/machine.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../../src/core/state/stateStore.js";
import type { ContractCase, ContractCaseExpected } from "./schema.js";

type ApprovalCaseAction = "approve" | "request_rework_queued";

export interface ApprovalContractOutput {
  status: "ok";
  reasonCode: "APPROVAL_APPROVE_EMITTED" | "APPROVAL_REWORK_QUEUED";
  state: string;
  envelopeType: string | null;
  decision: string | null;
  recommendationAtDecision: string | null;
  queueMode: string | null;
  hasIntentId: boolean;
  hasSupersededIntentId: boolean;
}

export interface ApprovalContractRunResult {
  mode: ContractCase["mode"];
  legacy?: ApprovalContractOutput;
  v11?: ApprovalContractOutput;
}

interface ParsedApprovalCaseInput {
  action: ApprovalCaseAction;
  message?: string;
}

function parseApprovalCaseInput(input: ContractCase["input"]): ParsedApprovalCaseInput {
  const actionRaw = input.action;
  if (actionRaw !== "approve" && actionRaw !== "request_rework_queued") {
    throw new Error(
      "approval contract input.action must be one of: approve, request_rework_queued."
    );
  }
  const messageRaw = input.message;
  if (messageRaw !== undefined && typeof messageRaw !== "string") {
    throw new Error("approval contract input.message must be a string.");
  }
  return {
    action: actionRaw,
    ...(messageRaw !== undefined ? { message: messageRaw } : {})
  };
}

function assertContractExpectedSubset(input: {
  output: ApprovalContractOutput;
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
  legacy: ApprovalContractOutput;
  v11: ApprovalContractOutput;
  caseId: string;
}): void {
  if (JSON.stringify(input.legacy) !== JSON.stringify(input.v11)) {
    throw new Error(
      `approval parity mismatch for case=${input.caseId}: legacy=${JSON.stringify(input.legacy)} v11=${JSON.stringify(input.v11)}`
    );
  }
}

async function seedReadyForHumanApprovalState(input: {
  repoPath: string;
  bubbleId: string;
}) {
  const bubble = await setupRunningBubbleFixture({
    repoPath: input.repoPath,
    bubbleId: input.bubbleId,
    task: "Approval contract parity fixture"
  });
  const loaded = await readStateSnapshot(bubble.paths.statePath);
  const transitioned = applyStateTransition(loaded.state, {
    to: "READY_FOR_APPROVAL",
    lastCommandAt: "2026-03-20T11:30:00.000Z"
  });
  const legacyStateWithoutMetaReview = { ...transitioned };
  delete legacyStateWithoutMetaReview.meta_review;
  await writeStateSnapshot(
    bubble.paths.statePath,
    legacyStateWithoutMetaReview,
    {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "RUNNING"
    }
  );
  return bubble;
}

async function seedWaitingHumanState(input: {
  repoPath: string;
  bubbleId: string;
}) {
  const bubble = await setupRunningBubbleFixture({
    repoPath: input.repoPath,
    bubbleId: input.bubbleId,
    task: "Approval contract queued rework fixture"
  });
  const loaded = await readStateSnapshot(bubble.paths.statePath);
  const transitioned = applyStateTransition(loaded.state, {
    to: "WAITING_HUMAN",
    lastCommandAt: "2026-03-20T11:31:00.000Z"
  });
  await writeStateSnapshot(bubble.paths.statePath, transitioned, {
    expectedFingerprint: loaded.fingerprint,
    expectedState: "RUNNING"
  });
  return bubble;
}

function normalizeApproveResult(
  result: Awaited<ReturnType<typeof emitApprove>>
): ApprovalContractOutput {
  const decisionRaw = result.envelope.payload.decision;
  const recommendationAtDecisionRaw =
    result.envelope.payload.metadata?.recommendation_at_decision;
  return {
    status: "ok",
    reasonCode: "APPROVAL_APPROVE_EMITTED",
    state: result.state.state,
    envelopeType: result.envelope.type,
    decision: typeof decisionRaw === "string" ? decisionRaw : null,
    recommendationAtDecision:
      typeof recommendationAtDecisionRaw === "string"
        ? recommendationAtDecisionRaw
        : null,
    queueMode: null,
    hasIntentId: false,
    hasSupersededIntentId: false
  };
}

function normalizeQueuedReworkResult(
  result: Awaited<ReturnType<typeof emitRequestRework>>
): ApprovalContractOutput {
  if (result.mode !== "queued") {
    throw new Error("Expected queued request-rework contract output.");
  }
  return {
    status: "ok",
    reasonCode: "APPROVAL_REWORK_QUEUED",
    state: result.state.state,
    envelopeType: null,
    decision: null,
    recommendationAtDecision: null,
    queueMode: result.mode,
    hasIntentId: result.intentId.startsWith("intent_"),
    hasSupersededIntentId: result.supersededIntentId !== undefined
  };
}

async function executeApprovalCase(input: {
  caseDef: ContractCase;
  action: ParsedApprovalCaseInput;
  emitApproveFn: typeof emitApprove;
  emitRequestReworkFn: typeof emitRequestRework;
}): Promise<ApprovalContractOutput> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-approval-contract-"));
  try {
    await initGitRepository(repoPath);

    if (input.action.action === "approve") {
      const bubble = await seedReadyForHumanApprovalState({
        repoPath,
        bubbleId: `b_contract_${input.caseDef.id}`
      });
      const result = await input.emitApproveFn({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-03-20T11:35:00.000Z")
      });
      return normalizeApproveResult(result);
    }

    const bubble = await seedWaitingHumanState({
      repoPath,
      bubbleId: `b_contract_${input.caseDef.id}`
    });
    const result = await input.emitRequestReworkFn({
      bubbleId: bubble.bubbleId,
      message:
        input.action.message
        ?? "Please restart with updated test matrix.",
      cwd: repoPath,
      now: new Date("2026-03-20T11:36:00.000Z")
    });
    return normalizeQueuedReworkResult(result);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
}

export async function runApprovalContractCase(
  caseDef: ContractCase
): Promise<ApprovalContractRunResult> {
  if (caseDef.command !== "approval") {
    throw new Error(
      `Unsupported command for approval contract runner: ${caseDef.command}`
    );
  }
  const parsedInput = parseApprovalCaseInput(caseDef.input);

  if (caseDef.mode === "legacy") {
    const legacy = await executeApprovalCase({
      caseDef,
      action: parsedInput,
      emitApproveFn: emitApprove,
      emitRequestReworkFn: emitRequestRework
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
    const v11 = await executeApprovalCase({
      caseDef,
      action: parsedInput,
      emitApproveFn: emitApproveV11,
      emitRequestReworkFn: emitRequestReworkV11
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

  const legacy = await executeApprovalCase({
    caseDef,
    action: parsedInput,
    emitApproveFn: emitApprove,
    emitRequestReworkFn: emitRequestRework
  });
  const v11 = await executeApprovalCase({
    caseDef,
    action: parsedInput,
    emitApproveFn: emitApproveV11,
    emitRequestReworkFn: emitRequestReworkV11
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
