import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  emitHumanReply,
  type EmitHumanReplyDependencies,
  type EmitHumanReplyResult
} from "../../../src/v11/application/reply/replyCommandApi.js";
import { emitAskHumanFromWorkspace } from "../../../src/v11/application/askHuman/askHumanCommandApi.js";
import { readStateSnapshot } from "../../../src/v11/infrastructure/state/stateStore.js";
import { deliveryTargetRoleMetadataKey } from "../../../src/types/protocol.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";
import type { ContractCase, ContractCaseExpected } from "./schema.js";
import { writeStateSnapshotFixture as writeStateSnapshot } from "../../helpers/stateSnapshot.js";
type DeliveryRefKind = "external" | "none" | "transcript";

interface CapturedReplyDelivery {
  type: string;
  recipient: string;
  targetRole: string | null;
  refKind: DeliveryRefKind;
}

type ReplyContractScenario =
  | "basic"
  | "state_not_waiting_human"
  | "waiting_human_round_invalid"
  | "waiting_human_context_incomplete";

interface ParsedReplyCaseInput {
  message: string;
  refs: string[];
  scenario: ReplyContractScenario;
}

export interface ReplyContractOutput {
  status: "ok";
  reasonCode: "HUMAN_REPLY_EMITTED";
  envelopeType: string;
  stateSubset: {
    state: string;
  };
  deliveryCount: number;
  deliveryRecipients: string[];
  deliveryTargetRoles: string[];
  deliveryRefKinds: DeliveryRefKind[];
}

export interface ReplyContractErrorOutput {
  status: "error";
  reasonCode: string | null;
  stateSubset: {
    state: string;
  };
}

export type ReplyContractResultOutput =
  | ReplyContractOutput
  | ReplyContractErrorOutput;

export interface ReplyContractRunResult {
  mode: ContractCase["mode"];
  v11?: ReplyContractResultOutput;
}

function parseReplyCaseInput(
  input: ContractCase["input"]
): ParsedReplyCaseInput {
  const messageRaw = input.message;
  if (typeof messageRaw !== "string" || messageRaw.trim().length === 0) {
    throw new Error("reply contract input.message must be a non-empty string.");
  }

  const refsRaw = input.refs;
  if (
    refsRaw !== undefined &&
    (
      !Array.isArray(refsRaw) ||
      !refsRaw.every((value) => typeof value === "string")
    )
  ) {
    throw new Error("reply contract input.refs must be a string array.");
  }

  const fixtureRaw = input.fixture;
  let scenario: ReplyContractScenario = "basic";
  if (fixtureRaw !== undefined) {
    if (typeof fixtureRaw !== "object" || fixtureRaw === null) {
      throw new Error("reply contract input.fixture must be an object when provided.");
    }
    const scenarioRaw = (fixtureRaw as Record<string, unknown>).scenario;
    if (
      scenarioRaw !== undefined &&
      scenarioRaw !== "basic" &&
      scenarioRaw !== "state_not_waiting_human" &&
      scenarioRaw !== "waiting_human_round_invalid" &&
      scenarioRaw !== "waiting_human_context_incomplete"
    ) {
      throw new Error(
        "reply contract input.fixture.scenario must be one of: basic, state_not_waiting_human, waiting_human_round_invalid, waiting_human_context_incomplete."
      );
    }
    scenario = scenarioRaw ?? "basic";
  }

  return {
    message: messageRaw.trim(),
    refs: refsRaw ?? [],
    scenario
  };
}

function normalizeReplyResult(
  result: EmitHumanReplyResult,
  deliveries: CapturedReplyDelivery[]
): ReplyContractOutput {
  return {
    status: "ok",
    reasonCode: "HUMAN_REPLY_EMITTED",
    envelopeType: result.envelope.type,
    stateSubset: {
      state: result.state.state
    },
    deliveryCount: deliveries.length,
    deliveryRecipients: deliveries.map((delivery) => delivery.recipient),
    deliveryTargetRoles: deliveries
      .map((delivery) => delivery.targetRole)
      .filter((role): role is string => role !== null),
    deliveryRefKinds: deliveries.map((delivery) => delivery.refKind)
  };
}

function normalizeReplyErrorResult(input: {
  error: unknown;
  state: string;
}): ReplyContractErrorOutput {
  const message = input.error instanceof Error ? input.error.message : String(input.error);
  const reasonMatch = /^([A-Z0-9_]+):/u.exec(message.trim());
  let reasonCode: string | null = reasonMatch?.[1] ?? null;

  if (
    reasonCode === null &&
    message.includes("can only be used while bubble is WAITING_HUMAN")
  ) {
    reasonCode = "REPLY_WAITING_HUMAN_STATE_REQUIRED";
  }
  if (
    reasonCode === null &&
    message.includes("WAITING_HUMAN state must have round >= 1")
  ) {
    reasonCode = "REPLY_WAITING_HUMAN_ROUND_INVALID";
  }
  if (
    reasonCode === null &&
    message.includes("WAITING_HUMAN state is missing active agent context")
  ) {
    reasonCode = "REPLY_WAITING_HUMAN_CONTEXT_INCOMPLETE";
  }

  return {
    status: "error",
    reasonCode,
    stateSubset: {
      state: input.state
    }
  };
}

function classifyDeliveryRefKind(messageRef: string | undefined): DeliveryRefKind {
  if (messageRef === undefined) {
    return "none";
  }
  return messageRef.includes("transcript.ndjson#") ? "transcript" : "external";
}

function assertReplyDeliveryInvariant(input: {
  deliveries: CapturedReplyDelivery[];
  result: EmitHumanReplyResult;
  label: string;
}): void {
  if (input.deliveries.length !== 1) {
    throw new Error(
      `${input.label}: reply delivery invariant expected exactly 1 notification (actual=${input.deliveries.length}).`
    );
  }

  const delivery = input.deliveries[0];
  if (delivery === undefined) {
    throw new Error(
      `${input.label}: reply delivery invariant missing captured delivery after length guard.`
    );
  }
  if (delivery.type !== input.result.envelope.type) {
    throw new Error(
      `${input.label}: reply delivery envelope type mismatch (expected=${input.result.envelope.type}, actual=${delivery.type}).`
    );
  }
  if (delivery.recipient !== input.result.envelope.recipient) {
    throw new Error(
      `${input.label}: reply delivery recipient mismatch (expected=${input.result.envelope.recipient}, actual=${delivery.recipient}).`
    );
  }

  const envelopeTargetRole =
    input.result.envelope.payload.metadata?.[deliveryTargetRoleMetadataKey];
  const expectedTargetRole =
    typeof envelopeTargetRole === "string" ? envelopeTargetRole : null;
  if (delivery.targetRole !== expectedTargetRole) {
    throw new Error(
      `${input.label}: reply delivery target role mismatch (expected=${String(expectedTargetRole)}, actual=${String(delivery.targetRole)}).`
    );
  }
}

function assertContractExpectedSubset(input: {
  output: ReplyContractResultOutput;
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
    const actualEnvelopeType =
      input.output.status === "ok" ? input.output.envelopeType : "<error>";
    throw new Error(
      `${input.label}: envelopeType mismatch (expected=${input.expected.envelopeType}, actual=${actualEnvelopeType})`
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
  if (
    input.expected.deliveryCount !== undefined &&
    (
      input.output.status !== "ok"
      || input.output.deliveryCount !== input.expected.deliveryCount
    )
  ) {
    const actualDeliveryCount =
      input.output.status === "ok" ? String(input.output.deliveryCount) : "<error>";
    throw new Error(
      `${input.label}: deliveryCount mismatch (expected=${input.expected.deliveryCount}, actual=${actualDeliveryCount})`
    );
  }
  if (
    input.expected.deliveryRecipients !== undefined &&
    (
      input.output.status !== "ok"
      || JSON.stringify(input.output.deliveryRecipients)
      !== JSON.stringify(input.expected.deliveryRecipients)
    )
  ) {
    const actualRecipients = JSON.stringify(
      input.output.status === "ok" ? input.output.deliveryRecipients : []
    );
    throw new Error(
      `${input.label}: deliveryRecipients mismatch (expected=${JSON.stringify(input.expected.deliveryRecipients)}, actual=${actualRecipients})`
    );
  }
  if (
    input.expected.deliveryTargetRoles !== undefined &&
    (
      input.output.status !== "ok"
      || JSON.stringify(input.output.deliveryTargetRoles)
      !== JSON.stringify(input.expected.deliveryTargetRoles)
    )
  ) {
    const actualTargetRoles = JSON.stringify(
      input.output.status === "ok" ? input.output.deliveryTargetRoles : []
    );
    throw new Error(
      `${input.label}: deliveryTargetRoles mismatch (expected=${JSON.stringify(input.expected.deliveryTargetRoles)}, actual=${actualTargetRoles})`
    );
  }
  if (
    input.expected.deliveryRefKinds !== undefined &&
    (
      input.output.status !== "ok"
      || JSON.stringify(input.output.deliveryRefKinds)
      !== JSON.stringify(input.expected.deliveryRefKinds)
    )
  ) {
    const actualRefKinds = JSON.stringify(
      input.output.status === "ok" ? input.output.deliveryRefKinds : []
    );
    throw new Error(
      `${input.label}: deliveryRefKinds mismatch (expected=${JSON.stringify(input.expected.deliveryRefKinds)}, actual=${actualRefKinds})`
    );
  }
}

async function executeReplyCase(input: {
  caseDef: ContractCase;
  executor: typeof emitHumanReply;
  label: string;
}): Promise<ReplyContractResultOutput> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-reply-contract-"));
  try {
    await initGitRepository(repoPath);
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: `b_contract_${input.caseDef.id}`,
      task: input.caseDef.description
    });

    const replyInput = parseReplyCaseInput(input.caseDef.input);
    if (replyInput.scenario !== "state_not_waiting_human") {
      await emitAskHumanFromWorkspace({
        question: "Seed WAITING_HUMAN state for reply contract run.",
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-03-19T10:01:00.000Z")
      });
    }

    if (replyInput.scenario === "waiting_human_round_invalid") {
      const loaded = await readStateSnapshot(bubble.paths.statePath);
      await writeStateSnapshot(
        bubble.paths.statePath,
        {
          ...loaded.state,
          round: 0,
          last_command_at: "2026-03-19T10:01:30.000Z"
        },
        {
          expectedFingerprint: loaded.fingerprint,
          expectedState: "WAITING_HUMAN"
        }
      );
    }

    if (replyInput.scenario === "waiting_human_context_incomplete") {
      const loaded = await readStateSnapshot(bubble.paths.statePath);
      await writeStateSnapshot(
        bubble.paths.statePath,
        {
          ...loaded.state,
          active_agent: null,
          active_role: null,
          active_since: null,
          last_command_at: "2026-03-19T10:01:45.000Z"
        },
        {
          expectedFingerprint: loaded.fingerprint,
          expectedState: "WAITING_HUMAN"
        }
      );
    }

    const deliveries: CapturedReplyDelivery[] = [];
    const emitDelivery: NonNullable<
      EmitHumanReplyDependencies["emitDeliveryNotificationAck"]
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
        status: "accepted",
        message: "ok"
      });
    };

    try {
      const result = await input.executor({
        message: replyInput.message,
        refs: replyInput.refs,
        bubbleId: bubble.bubbleId,
        repoPath,
        now: new Date("2026-03-19T10:02:00.000Z")
      }, {
        emitDeliveryNotificationAck: emitDelivery
      });
      assertReplyDeliveryInvariant({
        deliveries,
        result,
        label: input.label
      });
      return normalizeReplyResult(result, deliveries);
    } catch (error) {
      const stateSnapshot = await readStateSnapshot(bubble.paths.statePath);
      if (deliveries.length > 0) {
        throw new Error(
          `${input.label}: reply error path emitted unexpected delivery count=${deliveries.length}.`
        );
      }
      return normalizeReplyErrorResult({
        error,
        state: stateSnapshot.state.state
      });
    }
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
}

export async function runReplyContractCase(
  caseDef: ContractCase
): Promise<ReplyContractRunResult> {
  if (caseDef.command !== "reply") {
    throw new Error(`Unsupported command for reply contract runner: ${caseDef.command}`);
  }

  const v11 = await executeReplyCase({
    caseDef,
    executor: emitHumanReply,
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
