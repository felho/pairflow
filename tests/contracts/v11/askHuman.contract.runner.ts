import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  emitAskHumanFromWorkspaceV11,
  type EmitAskHumanV11Dependencies as EmitAskHumanDependencies,
  type EmitAskHumanV11Result as EmitAskHumanResult
} from "../../../src/v11/application/askHuman/emitAskHumanV11.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../../src/v11/infrastructure/state/stateStore.js";
import { buildRunningExecutionContext } from "../../../src/v11/shared/state/executionContext.js";
import { buildMetaReviewExecutionContext } from "../../../src/v11/shared/metaReview/metaReviewExecutionContext.js";
import { deliveryTargetRoleMetadataKey } from "../../../src/types/protocol.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";
import type { ContractCase, ContractCaseExpected } from "./schema.js";

type DeliveryRefKind = "external" | "none" | "transcript";

interface CapturedAskHumanDelivery {
  type: string;
  recipient: string;
  targetRole: string | null;
  refKind: DeliveryRefKind;
}

type AskHumanContractScenario =
  | "basic"
  | "state_not_running"
  | "running_round_invalid"
  | "running_role_unsupported";

interface ParsedAskHumanCaseInput {
  question: string;
  refs: string[];
  scenario: AskHumanContractScenario;
}

export interface AskHumanContractOutput {
  status: "ok";
  reasonCode: "ASK_HUMAN_EMITTED";
  envelopeType: string;
  stateSubset: {
    state: string;
  };
  deliveryCount: number;
  deliveryRecipients: string[];
  deliveryTargetRoles: string[];
  deliveryRefKinds: DeliveryRefKind[];
}

export interface AskHumanContractErrorOutput {
  status: "error";
  reasonCode: string | null;
  stateSubset: {
    state: string;
  };
}

export type AskHumanContractResultOutput =
  | AskHumanContractOutput
  | AskHumanContractErrorOutput;

export interface AskHumanContractRunResult {
  mode: ContractCase["mode"];
  v11?: AskHumanContractResultOutput;
}

function parseAskHumanCaseInput(
  input: ContractCase["input"]
): ParsedAskHumanCaseInput {
  const questionRaw = input.question;
  if (typeof questionRaw !== "string" || questionRaw.trim().length === 0) {
    throw new Error("askHuman contract input.question must be a non-empty string.");
  }

  const refsRaw = input.refs;
  if (
    refsRaw !== undefined &&
    (
      !Array.isArray(refsRaw) ||
      !refsRaw.every((value) => typeof value === "string")
    )
  ) {
    throw new Error("askHuman contract input.refs must be a string array.");
  }

  const fixtureRaw = input.fixture;
  let scenario: AskHumanContractScenario = "basic";
  if (fixtureRaw !== undefined) {
    if (typeof fixtureRaw !== "object" || fixtureRaw === null) {
      throw new Error("askHuman contract input.fixture must be an object when provided.");
    }
    const scenarioRaw = (fixtureRaw as Record<string, unknown>).scenario;
    if (
      scenarioRaw !== undefined &&
      scenarioRaw !== "basic" &&
      scenarioRaw !== "state_not_running" &&
      scenarioRaw !== "running_round_invalid" &&
      scenarioRaw !== "running_role_unsupported"
    ) {
      throw new Error(
        "askHuman contract input.fixture.scenario must be one of: basic, state_not_running, running_round_invalid, running_role_unsupported."
      );
    }
    scenario = scenarioRaw ?? "basic";
  }

  return {
    question: questionRaw.trim(),
    refs: refsRaw ?? [],
    scenario
  };
}

function normalizeAskHumanResult(
  result: EmitAskHumanResult,
  deliveries: CapturedAskHumanDelivery[]
): AskHumanContractOutput {
  return {
    status: "ok",
    reasonCode: "ASK_HUMAN_EMITTED",
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

function normalizeAskHumanErrorResult(input: {
  error: unknown;
  state: string;
}): AskHumanContractErrorOutput {
  const message = input.error instanceof Error ? input.error.message : String(input.error);
  const reasonMatch = /^([A-Z0-9_]+):/u.exec(message.trim());
  let reasonCode: string | null = reasonMatch?.[1] ?? null;

  if (
    reasonCode === null &&
    message.includes("can only be used while bubble is RUNNING")
  ) {
    reasonCode = "ASK_HUMAN_STATE_NOT_RUNNING";
  }
  if (
    reasonCode === null &&
    message.includes("RUNNING state must have round >= 1")
  ) {
    reasonCode = "ASK_HUMAN_RUNNING_ROUND_INVALID";
  }
  if (
    reasonCode === null &&
    message.includes("cannot be used from meta_reviewer role")
  ) {
    reasonCode = "ASK_HUMAN_ROLE_UNSUPPORTED";
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

function assertAskHumanDeliveryInvariant(input: {
  deliveries: CapturedAskHumanDelivery[];
  result: EmitAskHumanResult;
  label: string;
}): void {
  if (input.deliveries.length !== 1) {
    throw new Error(
      `${input.label}: askHuman delivery invariant expected exactly 1 notification (actual=${input.deliveries.length}).`
    );
  }
  const delivery = input.deliveries[0];
  if (delivery === undefined) {
    throw new Error(
      `${input.label}: askHuman delivery invariant missing captured delivery after length guard.`
    );
  }
  if (delivery.type !== input.result.envelope.type) {
    throw new Error(
      `${input.label}: askHuman delivery envelope type mismatch (expected=${input.result.envelope.type}, actual=${delivery.type}).`
    );
  }
  if (delivery.recipient !== input.result.envelope.recipient) {
    throw new Error(
      `${input.label}: askHuman delivery recipient mismatch (expected=${input.result.envelope.recipient}, actual=${delivery.recipient}).`
    );
  }
}

function assertContractExpectedSubset(input: {
  output: AskHumanContractResultOutput;
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

async function executeAskHumanCase(input: {
  caseDef: ContractCase;
  executor: typeof emitAskHumanFromWorkspaceV11;
  label: string;
}): Promise<AskHumanContractResultOutput> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-ask-human-contract-"));
  try {
    await initGitRepository(repoPath);
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: `b_contract_${input.caseDef.id}`,
      task: input.caseDef.description
    });
    const askHumanInput = parseAskHumanCaseInput(input.caseDef.input);

    if (askHumanInput.scenario === "state_not_running") {
      const loaded = await readStateSnapshot(bubble.paths.statePath);
      await writeStateSnapshot(
        bubble.paths.statePath,
        {
          ...loaded.state,
          state: "WAITING_HUMAN",
          execution_context: null,
          active_agent: null,
          active_role: null,
          active_since: null,
          last_command_at: "2026-03-19T10:01:00.000Z"
        },
        {
          expectedFingerprint: loaded.fingerprint,
          expectedState: "RUNNING"
        }
      );
    }

    if (askHumanInput.scenario === "running_round_invalid") {
      const loaded = await readStateSnapshot(bubble.paths.statePath);
      await writeStateSnapshot(
        bubble.paths.statePath,
        {
          ...loaded.state,
          round: 0,
          execution_context: null,
          last_command_at: "2026-03-19T10:01:15.000Z"
        },
        {
          expectedFingerprint: loaded.fingerprint,
          expectedState: "RUNNING"
        }
      );
    }

    if (askHumanInput.scenario === "running_role_unsupported") {
      const loaded = await readStateSnapshot(bubble.paths.statePath);
      const metaReviewExecutionContext = buildMetaReviewExecutionContext({
        bubbleId: loaded.state.bubble_id,
        round: loaded.state.round,
        startedAt: "2026-03-19T10:01:45.000Z",
        watchdogTimeoutMinutes: 60,
        attempt: loaded.state.execution_context?.attempt ?? 1
      });
      await writeStateSnapshot(
        bubble.paths.statePath,
        {
          ...loaded.state,
          active_agent: "codex",
          active_role: "meta_reviewer",
          active_since: "2026-03-19T10:01:45.000Z",
          last_command_at: "2026-03-19T10:01:45.000Z",
          execution_context: buildRunningExecutionContext({
            bubbleId: loaded.state.bubble_id,
            round: loaded.state.round,
            activeRole: "meta_reviewer",
            startedAt: "2026-03-19T10:01:45.000Z",
            watchdogTimeoutMinutes: 60,
            attempt: loaded.state.execution_context?.attempt ?? 1
          }),
          meta_review: {
            ...(loaded.state.meta_review ?? {
              execution_context: null,
              runtime_delivery: null,
              auto_rework_count: 0,
              auto_rework_limit: 5,
              sticky_human_gate: false
            }),
            execution_context: metaReviewExecutionContext
          }
        },
        {
          expectedFingerprint: loaded.fingerprint,
          expectedState: "RUNNING"
        }
      );
    }

    const deliveries: CapturedAskHumanDelivery[] = [];
    const emitDelivery: NonNullable<
      EmitAskHumanDependencies["emitTmuxDeliveryNotification"]
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
        delivered: true,
        message: "ok"
      });
    };
    try {
      const result = await input.executor({
        question: askHumanInput.question,
        refs: askHumanInput.refs,
        cwd: bubble.paths.worktreePath
      }, {
        emitTmuxDeliveryNotification: emitDelivery
      });
      assertAskHumanDeliveryInvariant({
        deliveries,
        result,
        label: input.label
      });
      return normalizeAskHumanResult(result, deliveries);
    } catch (error) {
      const stateSnapshot = await readStateSnapshot(bubble.paths.statePath);
      if (deliveries.length > 0) {
        throw new Error(
          `${input.label}: askHuman error path emitted unexpected delivery count=${deliveries.length}.`
        );
      }
      return normalizeAskHumanErrorResult({
        error,
        state: stateSnapshot.state.state
      });
    }
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
}

export async function runAskHumanContractCase(
  caseDef: ContractCase
): Promise<AskHumanContractRunResult> {
  if (caseDef.command !== "askHuman") {
    throw new Error(
      `Unsupported command for askHuman contract runner: ${caseDef.command}`
    );
  }

  const v11 = await executeAskHumanCase({
    caseDef,
    executor: emitAskHumanFromWorkspaceV11,
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
