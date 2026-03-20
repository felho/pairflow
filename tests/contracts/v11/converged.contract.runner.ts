import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  emitConvergedFromWorkspace,
  type EmitConvergedDependencies,
  type EmitConvergedInput,
  type EmitConvergedResult
} from "../../../src/core/agent/converged.js";
import { emitConvergedFromWorkspaceV11 } from "../../../src/v11/application/converged/emitConvergedV11.js";
import { seedConvergedCandidate } from "../../v11/application/converged/convergedSeedFixture.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";
import { deliveryTargetRoleMetadataKey } from "../../../src/types/protocol.js";
import type { ContractCase, ContractCaseExpected } from "./schema.js";

type DeliveryRefKind = "external" | "none" | "transcript";

interface CapturedConvergedDelivery {
  recipient: string;
  targetRole: string | null;
  refKind: DeliveryRefKind;
}

export interface ConvergedContractOutput {
  status: "ok";
  reasonCode: "CONVERGED_EMITTED";
  convergenceSequence: number;
  convergenceEnvelopeType: string;
  convergenceEnvelopeRecipient: string;
  approvalRequestSequence: number;
  approvalRequestEnvelopeType: string;
  approvalRequestRecipient: string;
  approvalRequestSender: string;
  gateRoute: string;
  stateSubset: {
    state: string;
  };
  deliveryCount: number;
  deliveryRecipients: string[];
  deliveryTargetRoles: string[];
  deliveryRefKinds: DeliveryRefKind[];
}

export interface ConvergedContractRunResult {
  mode: ContractCase["mode"];
  legacy?: ConvergedContractOutput;
  v11?: ConvergedContractOutput;
}

interface ParsedConvergedCaseInput {
  convergedInput: Omit<EmitConvergedInput, "cwd">;
  reviewArtifactType?: "code" | "document";
  scenario: "default" | "delivery_partial_failure";
}

function parseConvergedCaseInput(input: ContractCase["input"]): ParsedConvergedCaseInput {
  const summaryRaw = input.summary;
  if (typeof summaryRaw !== "string" || summaryRaw.trim().length === 0) {
    throw new Error("converged contract input.summary must be a non-empty string.");
  }

  const refsRaw = input.refs;
  let refs: string[] | undefined;
  if (refsRaw !== undefined) {
    if (
      !Array.isArray(refsRaw) ||
      !refsRaw.every((value) => typeof value === "string")
    ) {
      throw new Error("converged contract input.refs must be a string array.");
    }
    refs = refsRaw;
  }

  const reviewArtifactTypeRaw = input.reviewArtifactType;
  let reviewArtifactType: "code" | "document" | undefined;
  if (reviewArtifactTypeRaw !== undefined) {
    if (reviewArtifactTypeRaw !== "code" && reviewArtifactTypeRaw !== "document") {
      throw new Error(
        "converged contract input.reviewArtifactType must be one of: code, document."
      );
    }
    reviewArtifactType = reviewArtifactTypeRaw;
  }

  const fixtureRaw = input.fixture;
  let scenario: ParsedConvergedCaseInput["scenario"] = "default";
  if (fixtureRaw !== undefined) {
    if (typeof fixtureRaw !== "object" || fixtureRaw === null) {
      throw new Error("converged contract input.fixture must be an object when provided.");
    }
    const scenarioRaw = (fixtureRaw as Record<string, unknown>).scenario;
    if (
      scenarioRaw !== undefined &&
      scenarioRaw !== "default" &&
      scenarioRaw !== "delivery_partial_failure"
    ) {
      throw new Error(
        "converged contract input.fixture.scenario must be one of: default, delivery_partial_failure."
      );
    }
    scenario = scenarioRaw ?? "default";
  }

  return {
    convergedInput: {
      summary: summaryRaw.trim(),
      ...(refs !== undefined ? { refs } : {})
    },
    scenario,
    ...(reviewArtifactType !== undefined ? { reviewArtifactType } : {})
  };
}

function normalizeConvergedResult(
  result: EmitConvergedResult,
  deliveries: CapturedConvergedDelivery[]
): ConvergedContractOutput {
  return {
    status: "ok",
    reasonCode: "CONVERGED_EMITTED",
    convergenceSequence: result.convergenceSequence,
    convergenceEnvelopeType: result.convergenceEnvelope.type,
    convergenceEnvelopeRecipient: result.convergenceEnvelope.recipient,
    approvalRequestSequence: result.approvalRequestSequence,
    approvalRequestEnvelopeType: result.approvalRequestEnvelope.type,
    approvalRequestRecipient: result.approvalRequestEnvelope.recipient,
    approvalRequestSender: result.approvalRequestEnvelope.sender,
    gateRoute: result.gateRoute,
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

function classifyDeliveryRefKind(messageRef: string | undefined): DeliveryRefKind {
  if (messageRef === undefined) {
    return "none";
  }
  return messageRef.includes("transcript.ndjson#") ? "transcript" : "external";
}

function assertContractExpectedSubset(input: {
  output: ConvergedContractOutput;
  expected: ContractCaseExpected;
  label: string;
}): void {
  if (input.output.status !== input.expected.status) {
    throw new Error(
      `${input.label}: status mismatch (expected=${input.expected.status}, actual=${input.output.status})`
    );
  }
  if (input.output.convergenceSequence >= input.output.approvalRequestSequence) {
    throw new Error(
      `${input.label}: sequence invariant failed (convergenceSequence=${input.output.convergenceSequence}, approvalRequestSequence=${input.output.approvalRequestSequence})`
    );
  }
  if (input.output.approvalRequestSequence !== input.output.convergenceSequence + 1) {
    throw new Error(
      `${input.label}: sequence adjacency invariant failed (convergenceSequence=${input.output.convergenceSequence}, approvalRequestSequence=${input.output.approvalRequestSequence})`
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
    input.expected.gateRoute !== undefined &&
    input.output.gateRoute !== input.expected.gateRoute
  ) {
    throw new Error(
      `${input.label}: gateRoute mismatch (expected=${input.expected.gateRoute}, actual=${input.output.gateRoute})`
    );
  }
  if (
    input.expected.envelopeType !== undefined &&
    input.output.convergenceEnvelopeType !== input.expected.envelopeType
  ) {
    throw new Error(
      `${input.label}: envelopeType mismatch (expected=${input.expected.envelopeType}, actual=${input.output.convergenceEnvelopeType})`
    );
  }
  if (
    input.expected.convergenceRecipient !== undefined &&
    input.output.convergenceEnvelopeRecipient !== input.expected.convergenceRecipient
  ) {
    throw new Error(
      `${input.label}: convergenceRecipient mismatch (expected=${input.expected.convergenceRecipient}, actual=${input.output.convergenceEnvelopeRecipient})`
    );
  }
  if (
    input.expected.approvalRequestEnvelopeType !== undefined &&
    input.output.approvalRequestEnvelopeType !== input.expected.approvalRequestEnvelopeType
  ) {
    throw new Error(
      `${input.label}: approvalRequestEnvelopeType mismatch (expected=${input.expected.approvalRequestEnvelopeType}, actual=${input.output.approvalRequestEnvelopeType})`
    );
  }
  if (
    input.expected.approvalRequestRecipient !== undefined &&
    input.output.approvalRequestRecipient !== input.expected.approvalRequestRecipient
  ) {
    throw new Error(
      `${input.label}: approvalRequestRecipient mismatch (expected=${input.expected.approvalRequestRecipient}, actual=${input.output.approvalRequestRecipient})`
    );
  }
  if (
    input.expected.approvalRequestSender !== undefined &&
    input.output.approvalRequestSender !== input.expected.approvalRequestSender
  ) {
    throw new Error(
      `${input.label}: approvalRequestSender mismatch (expected=${input.expected.approvalRequestSender}, actual=${input.output.approvalRequestSender})`
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

function assertParityEquivalent(input: {
  legacy: ConvergedContractOutput;
  v11: ConvergedContractOutput;
  caseId: string;
}): void {
  if (JSON.stringify(input.legacy) !== JSON.stringify(input.v11)) {
    throw new Error(
      `converged parity mismatch for case=${input.caseId}: legacy=${JSON.stringify(input.legacy)} v11=${JSON.stringify(input.v11)}`
    );
  }
}

function assertConvergedScenarioInvariant(input: {
  result: EmitConvergedResult;
  scenario: ParsedConvergedCaseInput["scenario"];
  caseId: string;
}): void {
  if (input.scenario !== "delivery_partial_failure") {
    return;
  }
  if (input.result.delivery?.delivered !== false) {
    throw new Error(
      `converged contract case=${input.caseId}: delivery_partial_failure expected delivery.delivered=false.`
    );
  }
  if (input.result.delivery.reason !== "partial_delivery_failed") {
    throw new Error(
      `converged contract case=${input.caseId}: delivery_partial_failure expected reason=partial_delivery_failed (actual=${input.result.delivery.reason ?? "none"}).`
    );
  }
}

async function executeConvergedCase(input: {
  caseDef: ContractCase;
  executor: typeof emitConvergedFromWorkspace;
}): Promise<ConvergedContractOutput> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-converged-contract-"));
  try {
    await initGitRepository(repoPath);
    const parsedInput = parseConvergedCaseInput(input.caseDef.input);
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: `b_contract_${input.caseDef.id}`,
      task: input.caseDef.description,
      ...(parsedInput.reviewArtifactType !== undefined
        ? { reviewArtifactType: parsedInput.reviewArtifactType }
        : {})
    });
    await seedConvergedCandidate(bubble.paths.worktreePath);
    const deliveries: CapturedConvergedDelivery[] = [];
    const emitDelivery: NonNullable<
      EmitConvergedDependencies["emitTmuxDeliveryNotification"]
    > = (deliveryInput) => {
      const targetRoleRaw =
        deliveryInput.envelope.payload.metadata?.[deliveryTargetRoleMetadataKey];
      deliveries.push({
        recipient: deliveryInput.envelope.recipient,
        targetRole: typeof targetRoleRaw === "string" ? targetRoleRaw : null,
        refKind: classifyDeliveryRefKind(deliveryInput.messageRef)
      });
      if (
        parsedInput.scenario === "delivery_partial_failure"
        && deliveryInput.envelope.recipient === bubble.config.agents.reviewer
      ) {
        return Promise.resolve({
          delivered: false,
          message: "delivery failed",
          reason: "delivery_unconfirmed"
        });
      }
      return Promise.resolve({
        delivered: true,
        message: "ok"
      });
    };

    const result = await input.executor({
      ...parsedInput.convergedInput,
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T09:05:00.000Z")
    }, {
      emitTmuxDeliveryNotification: emitDelivery
    });
    assertConvergedScenarioInvariant({
      result,
      scenario: parsedInput.scenario,
      caseId: input.caseDef.id
    });
    return normalizeConvergedResult(result, deliveries);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
}

export async function runConvergedContractCase(
  caseDef: ContractCase
): Promise<ConvergedContractRunResult> {
  if (caseDef.command !== "converged") {
    throw new Error(
      `Unsupported command for converged contract runner: ${caseDef.command}`
    );
  }

  if (caseDef.mode === "legacy") {
    const legacy = await executeConvergedCase({
      caseDef,
      executor: emitConvergedFromWorkspace
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
    const v11 = await executeConvergedCase({
      caseDef,
      executor: emitConvergedFromWorkspaceV11
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

  const legacy = await executeConvergedCase({
    caseDef,
    executor: emitConvergedFromWorkspace
  });
  const v11 = await executeConvergedCase({
    caseDef,
    executor: emitConvergedFromWorkspaceV11
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
