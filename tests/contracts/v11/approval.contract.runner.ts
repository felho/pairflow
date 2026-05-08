import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  emitApprove,
  emitRequestRework,
  type EmitApprovalDecisionDependencies
} from "../../../src/v11/application/approval/approvalCommandApi.js";
import { deliveryTargetRoleMetadataKey } from "../../../src/types/protocol.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";
import { applyStateTransition } from "../../../src/v11/domain/state/machine.js";
import { appendProtocolEnvelope } from "../../../src/v11/infrastructure/artifact/transcript/transcriptStore.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../../src/v11/infrastructure/state/stateStore.js";
import type { ContractCase, ContractCaseExpected } from "./schema.js";

type ApprovalCaseAction =
  | "approve"
  | "request_rework_immediate"
  | "request_rework_queued";
type DeliveryRefKind = "external" | "none" | "transcript";

interface CapturedApprovalDelivery {
  type: string;
  recipient: string;
  targetRole: string | null;
  refKind: DeliveryRefKind;
}

export interface ApprovalContractOutput {
  status: "ok";
  reasonCode:
    | "APPROVAL_APPROVE_EMITTED"
    | "APPROVAL_REWORK_IMMEDIATE"
    | "APPROVAL_REWORK_QUEUED";
  state: string;
  envelopeType: string | null;
  decision: string | null;
  recommendationAtDecision: string | null;
  queueMode: string | null;
  hasIntentId: boolean;
  hasSupersededIntentId: boolean;
  deliveryCount: number;
  deliveryRecipients: string[];
  deliveryTargetRoles: string[];
  deliveryRefKinds: DeliveryRefKind[];
}

export interface ApprovalContractRunResult {
  mode: ContractCase["mode"];
  v11?: ApprovalContractOutput;
}

interface ParsedApprovalCaseInput {
  action: ApprovalCaseAction;
  message?: string;
  seedQueuedIntentBeforeAction: boolean;
}

function parseApprovalCaseInput(input: ContractCase["input"]): ParsedApprovalCaseInput {
  const actionRaw = input.action;
  if (
    actionRaw !== "approve"
    && actionRaw !== "request_rework_immediate"
    && actionRaw !== "request_rework_queued"
  ) {
    throw new Error(
      "approval contract input.action must be one of: approve, request_rework_immediate, request_rework_queued."
    );
  }
  const messageRaw = input.message;
  if (messageRaw !== undefined && typeof messageRaw !== "string") {
    throw new Error("approval contract input.message must be a string.");
  }
  const seedQueuedIntentBeforeActionRaw = input.seedQueuedIntentBeforeAction;
  if (
    seedQueuedIntentBeforeActionRaw !== undefined
    && typeof seedQueuedIntentBeforeActionRaw !== "boolean"
  ) {
    throw new Error(
      "approval contract input.seedQueuedIntentBeforeAction must be a boolean."
    );
  }
  return {
    action: actionRaw,
    seedQueuedIntentBeforeAction: seedQueuedIntentBeforeActionRaw ?? false,
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
  if (
    input.expected.deliveryCount !== undefined &&
    input.output.deliveryCount !== input.expected.deliveryCount
  ) {
    throw new Error(
      `${input.label}: deliveryCount mismatch (expected=${input.expected.deliveryCount}, actual=${input.output.deliveryCount})`
    );
  }
  if (
    input.expected.deliveryRecipients !== undefined &&
    JSON.stringify(input.output.deliveryRecipients)
      !== JSON.stringify(input.expected.deliveryRecipients)
  ) {
    throw new Error(
      `${input.label}: deliveryRecipients mismatch (expected=${JSON.stringify(input.expected.deliveryRecipients)}, actual=${JSON.stringify(input.output.deliveryRecipients)})`
    );
  }
  if (
    input.expected.deliveryTargetRoles !== undefined &&
    JSON.stringify(input.output.deliveryTargetRoles)
      !== JSON.stringify(input.expected.deliveryTargetRoles)
  ) {
    throw new Error(
      `${input.label}: deliveryTargetRoles mismatch (expected=${JSON.stringify(input.expected.deliveryTargetRoles)}, actual=${JSON.stringify(input.output.deliveryTargetRoles)})`
    );
  }
  if (
    input.expected.deliveryRefKinds !== undefined &&
    JSON.stringify(input.output.deliveryRefKinds)
      !== JSON.stringify(input.expected.deliveryRefKinds)
  ) {
    throw new Error(
      `${input.label}: deliveryRefKinds mismatch (expected=${JSON.stringify(input.expected.deliveryRefKinds)}, actual=${JSON.stringify(input.output.deliveryRefKinds)})`
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
    to: "READY_FOR_HUMAN_APPROVAL",
    lastCommandAt: "2026-03-20T11:30:00.000Z"
  });
  await writeStateSnapshot(
    bubble.paths.statePath,
    {
      ...transitioned,
      meta_review: {
        ...(transitioned.meta_review ?? {
          execution_context: null,
          runtime_delivery: null,
          auto_rework_count: 0,
          auto_rework_limit: 5,
          sticky_human_gate: false,
          consecutive_clean_runs: 0,
        }),
        execution_context: null,
        runtime_delivery: null,
      }
    },
    {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "RUNNING"
    }
  );
  await appendProtocolEnvelope({
    transcriptPath: bubble.paths.transcriptPath,
    mirrorPaths: [bubble.paths.inboxPath],
    lockPath: join(bubble.paths.locksDir, `${bubble.bubbleId}.lock`),
    now: new Date("2026-03-20T11:29:30.000Z"),
    envelope: {
      bubble_id: bubble.bubbleId,
      sender: "orchestrator",
      recipient: "human",
      type: "APPROVAL_REQUEST",
      round: transitioned.round,
      payload: {
        summary: "Autonomous approval recommendation is ready.",
        metadata: {
          [deliveryTargetRoleMetadataKey]: "status",
          actor: "meta-reviewer",
          actor_agent: "codex",
          latest_recommendation: "approve"
        }
      },
      refs: []
    }
  });
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

function classifyDeliveryRefKind(messageRef: string | undefined): DeliveryRefKind {
  if (messageRef === undefined) {
    return "none";
  }
  return messageRef.includes("transcript.ndjson#") ? "transcript" : "external";
}

function buildDeliverySummary(deliveries: CapturedApprovalDelivery[]) {
  return {
    deliveryCount: deliveries.length,
    deliveryRecipients: deliveries.map((delivery) => delivery.recipient),
    deliveryTargetRoles: deliveries
      .map((delivery) => delivery.targetRole)
      .filter((role): role is string => role !== null),
    deliveryRefKinds: deliveries.map((delivery) => delivery.refKind)
  };
}

function assertApprovalDeliveryInvariant(input: {
  action: ApprovalCaseAction;
  deliveries: CapturedApprovalDelivery[];
  implementerAgent: string;
  label: string;
}): void {
  if (input.action === "approve") {
    if (input.deliveries.length !== 1) {
      throw new Error(
        `${input.label}: approval approve invariant expected exactly 1 delivery (actual=${input.deliveries.length}).`
      );
    }
    if (input.deliveries[0]?.recipient !== "orchestrator") {
      throw new Error(
        `${input.label}: approval approve invariant expected recipient=orchestrator (actual=${input.deliveries[0]?.recipient ?? "none"}).`
      );
    }
    return;
  }

  if (input.action === "request_rework_queued") {
    if (input.deliveries.length !== 0) {
      throw new Error(
        `${input.label}: approval queued rework invariant expected 0 deliveries (actual=${input.deliveries.length}).`
      );
    }
    return;
  }

  if (input.deliveries.length !== 2) {
    throw new Error(
      `${input.label}: approval immediate rework invariant expected 2 deliveries (actual=${input.deliveries.length}).`
    );
  }
  const first = input.deliveries[0];
  const second = input.deliveries[1];
  if (first === undefined || second === undefined) {
    throw new Error(
      `${input.label}: approval immediate rework invariant missing captured deliveries after length guard.`
    );
  }
  if (first.recipient !== "orchestrator") {
    throw new Error(
      `${input.label}: approval immediate rework first delivery recipient mismatch (expected=orchestrator, actual=${first.recipient}).`
    );
  }
  if (second.recipient !== input.implementerAgent) {
    throw new Error(
      `${input.label}: approval immediate rework second delivery recipient mismatch (expected=${input.implementerAgent}, actual=${second.recipient}).`
    );
  }
  if (second.targetRole !== "implementer") {
    throw new Error(
      `${input.label}: approval immediate rework expected second delivery targetRole=implementer (actual=${String(second.targetRole)}).`
    );
  }
}

function normalizeApproveResult(
  result: Awaited<ReturnType<typeof emitApprove>>,
  deliveries: CapturedApprovalDelivery[]
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
    hasSupersededIntentId: false,
    ...buildDeliverySummary(deliveries)
  };
}

function normalizeImmediateReworkResult(
  result: Awaited<ReturnType<typeof emitRequestRework>>,
  deliveries: CapturedApprovalDelivery[]
): ApprovalContractOutput {
  if (result.mode !== "immediate") {
    throw new Error("Expected immediate request-rework contract output.");
  }
  const decisionRaw = result.envelope.payload.decision;
  const recommendationAtDecisionRaw =
    result.envelope.payload.metadata?.recommendation_at_decision;
  return {
    status: "ok",
    reasonCode: "APPROVAL_REWORK_IMMEDIATE",
    state: result.state.state,
    envelopeType: result.envelope.type,
    decision: typeof decisionRaw === "string" ? decisionRaw : null,
    recommendationAtDecision:
      typeof recommendationAtDecisionRaw === "string"
        ? recommendationAtDecisionRaw
        : null,
    queueMode: result.mode,
    hasIntentId: false,
    hasSupersededIntentId: false,
    ...buildDeliverySummary(deliveries)
  };
}

function normalizeQueuedReworkResult(
  result: Awaited<ReturnType<typeof emitRequestRework>>,
  deliveries: CapturedApprovalDelivery[]
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
    hasSupersededIntentId: result.supersededIntentId !== undefined,
    ...buildDeliverySummary(deliveries)
  };
}

async function executeApprovalCase(input: {
  caseDef: ContractCase;
  action: ParsedApprovalCaseInput;
  emitApproveFn: typeof emitApprove;
  emitRequestReworkFn: typeof emitRequestRework;
  label: string;
}): Promise<ApprovalContractOutput> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-approval-contract-"));
  try {
    await initGitRepository(repoPath);
    const deliveries: CapturedApprovalDelivery[] = [];
    const emitDelivery: NonNullable<
      EmitApprovalDecisionDependencies["emitDeliveryNotificationAck"]
    > = (deliveryInput) => {
      const targetRoleRaw =
        deliveryInput.envelope.payload.metadata?.[deliveryTargetRoleMetadataKey];
      deliveries.push({
        type: deliveryInput.envelope.type,
        recipient: deliveryInput.envelope.recipient,
        targetRole: typeof targetRoleRaw === "string" ? targetRoleRaw : null,
        refKind: classifyDeliveryRefKind(deliveryInput.messageRef)
      });
      return Promise.resolve({
        status: "accepted" as const,
        message: "ok",
        sessionName: "pf_bubble",
        targetPaneIndex: 1
      });
    };

    if (input.action.action === "approve") {
      const bubble = await seedReadyForHumanApprovalState({
        repoPath,
        bubbleId: `b_contract_${input.caseDef.id}`
      });
      const result = await input.emitApproveFn({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-03-20T11:35:00.000Z")
      }, {
        emitDeliveryNotificationAck: emitDelivery
      });
      assertApprovalDeliveryInvariant({
        action: input.action.action,
        deliveries,
        implementerAgent: bubble.config.agents.implementer,
        label: input.label
      });
      return normalizeApproveResult(result, deliveries);
    }

    if (input.action.action === "request_rework_immediate") {
      const bubble = await seedReadyForHumanApprovalState({
        repoPath,
        bubbleId: `b_contract_${input.caseDef.id}`
      });
      const result = await input.emitRequestReworkFn({
        bubbleId: bubble.bubbleId,
        message:
          input.action.message
          ?? "Please rework the current implementation with the updated test matrix.",
        cwd: repoPath,
        now: new Date("2026-03-20T11:36:00.000Z")
      }, {
        emitDeliveryNotificationAck: emitDelivery
      });
      assertApprovalDeliveryInvariant({
        action: input.action.action,
        deliveries,
        implementerAgent: bubble.config.agents.implementer,
        label: input.label
      });
      return normalizeImmediateReworkResult(result, deliveries);
    }

    const bubble = await seedWaitingHumanState({
      repoPath,
      bubbleId: `b_contract_${input.caseDef.id}`
    });
    if (input.action.seedQueuedIntentBeforeAction) {
      await input.emitRequestReworkFn({
        bubbleId: bubble.bubbleId,
        message: "Pre-seeded queued rework intent for supersede contract scenario.",
        cwd: repoPath,
        now: new Date("2026-03-20T11:35:30.000Z")
      }, {
        emitDeliveryNotificationAck: emitDelivery
      });
      deliveries.length = 0;
    }
    const result = await input.emitRequestReworkFn({
      bubbleId: bubble.bubbleId,
      message:
        input.action.message
        ?? "Please restart with updated test matrix.",
      cwd: repoPath,
      now: new Date("2026-03-20T11:36:00.000Z")
    }, {
      emitDeliveryNotificationAck: emitDelivery
    });
    assertApprovalDeliveryInvariant({
      action: input.action.action,
      deliveries,
      implementerAgent: bubble.config.agents.implementer,
      label: input.label
    });
    const output = normalizeQueuedReworkResult(result, deliveries);
    if (input.action.seedQueuedIntentBeforeAction && !output.hasSupersededIntentId) {
      throw new Error(
        `${input.label}: approval queued rework supersede invariant expected hasSupersededIntentId=true.`
      );
    }
    return output;
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
  const v11 = await executeApprovalCase({
    caseDef,
    action: parsedInput,
    emitApproveFn: emitApprove,
    emitRequestReworkFn: emitRequestRework,
    label: "v11"
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
