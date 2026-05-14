import { resolve } from "node:path";

import { buildReviewerAgentSelectionGuidance } from "../../../shared/reviewer/reviewerGuidance.js";
import { buildReviewerSeverityOntologyReminder } from "../../../shared/reviewer/reviewerSeverityOntology.js";
import {
  buildReviewerPassOutputContractGuidance,
  buildReviewerScoutExpansionWorkflowGuidance
} from "../../../shared/reviewer/reviewerScoutExpansionGuidance.js";
import {
  buildReviewerFindingsPassInstruction,
  buildReviewerRoundCommandGateProjection,
  type ReviewerCommandGateProjectionVariant
} from "../../../shared/reviewer/reviewerCommandGateGuidance.js";
import {
  buildReviewerDecisionMatrixReminder,
  formatReviewerTestExecutionDirective,
  type ReviewerTestExecutionDirective
} from "../../../shared/reviewer/testEvidence.js";
import {
  formatReviewerBriefDeliveryReminder,
  formatReviewerFocusDeliveryReminder,
  type ReviewerFocusExtractionResult
} from "../../../shared/reviewer/reviewerBrief.js";
import { buildPairflowCommandGuidance } from "../../../shared/command/pairflowCommandBootstrap.js";
import {
  buildImplementerDeliveryActionGuidance,
  buildImplementerDeliveryValidationGuidance,
  type ImplementerDeliveryEvent
} from "../../../shared/role/prompts/roleActionGuidance.js";
import {
  buildMetaReviewSubmitApproveParityNote,
  buildMetaReviewSubmitCommandTemplate
} from "../../../shared/metaReview/metaReviewSubmitGuidance.js";
import { reviewerPolicySnapshotFileName } from "../../../shared/reviewer/reviewerPolicySnapshot.js";
import type { BubbleConfig } from "../../../shared/config/bubbleConfigTypes.js";
import type { ProtocolParticipant } from "../../../../contracts/kernel/protocol.js";
import type { ProtocolEnvelope } from "../../../shared/protocol/protocolEnvelopeContract.js";

export type DeliveryMessageRecipientRole =
  | ProtocolParticipant
  | "implementer"
  | "reviewer"
  | "meta-reviewer"
  | "status";

function resolveReviewerPolicySnapshotPath(bubbleConfig: BubbleConfig): string {
  return resolve(
    bubbleConfig.repo_path,
    `.pairflow/bubbles/${bubbleConfig.id}/artifacts/${reviewerPolicySnapshotFileName}`
  );
}

function resolvePayloadActor(envelope: ProtocolEnvelope): string | null {
  const metadata = envelope.payload.metadata;
  if (typeof metadata !== "object" || metadata === null) {
    return null;
  }
  const actor = (metadata as { actor?: unknown }).actor;
  return typeof actor === "string" && actor.trim().length > 0 ? actor : null;
}

function resolveImplementerReworkOrigin(
  envelope: ProtocolEnvelope
): "meta_review_auto_rework" | "unknown" {
  const actorLabel = resolvePayloadActor(envelope);
  if (actorLabel === "meta-reviewer" || actorLabel === "meta-review-gate") {
    return "meta_review_auto_rework";
  }
  return "unknown";
}

function toImplementerDeliveryEvent(
  type: ProtocolEnvelope["type"]
): ImplementerDeliveryEvent {
  switch (type) {
    case "TASK":
    case "PASS":
    case "HUMAN_REPLY":
    case "APPROVAL_DECISION":
    case "APPROVAL_REQUEST":
      return type;
    default:
      return "OTHER";
  }
}

function buildImplementerDeliveryAction(input: {
  envelope: ProtocolEnvelope;
  bubbleConfig: BubbleConfig;
  actorLabel: string | null;
}): string {
  const docsOnly = input.bubbleConfig.review_artifact_type === "document";
  const validationGuidance = buildImplementerDeliveryValidationGuidance(
    input.bubbleConfig.commands
  );
  return buildImplementerDeliveryActionGuidance({
    event: toImplementerDeliveryEvent(input.envelope.type),
    docsOnly,
    validationGuidance,
    actorLabel: input.actorLabel,
    ...(input.envelope.type === "APPROVAL_DECISION"
      ? { approvalDecision: input.envelope.payload.decision }
      : {}),
    reworkOrigin: resolveImplementerReworkOrigin(input.envelope)
  });
}

function buildReviewerDeliveryAction(input: {
  envelope: ProtocolEnvelope;
  bubbleConfig: BubbleConfig;
  actorLabel: string | null;
  reviewerTestDirective?: ReviewerTestExecutionDirective;
  reviewerBrief?: string;
  reviewerFocus?: ReviewerFocusExtractionResult;
}): string {
  if (input.envelope.type === "PASS") {
    const reviewerPolicySnapshotPath = resolveReviewerPolicySnapshotPath(
      input.bubbleConfig
    );
    const includeFallbackDecisionMatrixReminder =
      input.bubbleConfig.reviewer_context_mode === "fresh";
    const testDirective =
      input.reviewerTestDirective === undefined
        ? [
            "Run required checks before final judgment. Reason: reviewer test verification directive was unavailable.",
            ...(includeFallbackDecisionMatrixReminder
              ? [buildReviewerDecisionMatrixReminder()]
              : [])
          ].join(" ")
        : formatReviewerTestExecutionDirective(input.reviewerTestDirective);
    const projectionVariant: ReviewerCommandGateProjectionVariant =
      Array.isArray(input.envelope.payload.findings) && input.envelope.payload.findings.length > 0
        ? "findings"
        : "clean";
    const thresholdInput =
      input.bubbleConfig.review_policy?.reviewer_blocking_min_severity
        !== undefined
        ? {
            reviewerBlockingMinSeverity:
              input.bubbleConfig.review_policy.reviewer_blocking_min_severity
          }
        : {};
    const convergenceInstruction = buildReviewerRoundCommandGateProjection({
      round: input.envelope.round,
      ...thresholdInput,
      variant: projectionVariant
    });
    const findingsDetailInstruction =
      input.envelope.round <= 1
        ? "In round 1, use canonical pass emit (`pairflow agent emit --kind pass ...`) and declare findings explicitly (`--finding` when findings exist, `--no-findings` only when truly clean)."
        : buildReviewerFindingsPassInstruction(
            input.bubbleConfig.review_artifact_type,
            thresholdInput
          );
    const reviewerFocusReminder =
      input.reviewerFocus === undefined
        ? ""
        : formatReviewerFocusDeliveryReminder(input.reviewerFocus);
    return [
      "Implementer handoff received. Run a fresh review now.",
      buildReviewerAgentSelectionGuidance(input.bubbleConfig.review_artifact_type),
      buildReviewerSeverityOntologyReminder(),
      `Reviewer policy file: ${reviewerPolicySnapshotPath}`,
      "Read this file before first review action.",
      testDirective,
      buildReviewerScoutExpansionWorkflowGuidance(),
      buildReviewerPassOutputContractGuidance(),
      convergenceInstruction,
      findingsDetailInstruction,
      input.reviewerBrief !== undefined
        ? formatReviewerBriefDeliveryReminder(input.reviewerBrief)
        : "",
      reviewerFocusReminder,
      "Execute pairflow commands directly (no confirmation prompt)."
    ]
      .filter((part) => part.trim().length > 0)
      .join(" ");
  }
  if (input.envelope.type === "HUMAN_REPLY") {
    return "Human response received. Continue review workflow from this update.";
  }
  if (input.envelope.type === "APPROVAL_REQUEST") {
    return input.actorLabel === "meta-reviewer"
      ? "Meta-reviewer requested human gate decision. Wait for human decision (`bubble approve` or `bubble request-rework`). Do not run canonical pass emit now."
      : "Bubble is READY_FOR_HUMAN_APPROVAL. Review is complete; wait for human decision (`bubble approve` or `bubble request-rework`). Do not run canonical pass emit now.";
  }
  return "Continue protocol from this event.";
}

export function buildTmuxDeliveryMessage(input: {
  envelope: ProtocolEnvelope;
  messageRef: string;
  bubbleConfig: BubbleConfig;
  workspacePath?: string;
  reviewerTestDirective?: ReviewerTestExecutionDirective;
  reviewerBrief?: string;
  reviewerFocus?: ReviewerFocusExtractionResult;
  recipientRole: DeliveryMessageRecipientRole;
}): string {
  const actorLabel = resolvePayloadActor(input.envelope);
  const workspaceHint =
    input.workspacePath === undefined
      ? "Run pairflow commands from the active workspace root."
      : `Run pairflow commands from workspace root: ${input.workspacePath}. ${buildPairflowCommandGuidance(input.workspacePath, input.bubbleConfig.pairflow_command_profile)}`;

  let action = "Continue protocol from this event.";
  if (input.recipientRole === "implementer") {
    action = buildImplementerDeliveryAction({
      envelope: input.envelope,
      bubbleConfig: input.bubbleConfig,
      actorLabel
    });
  } else if (input.recipientRole === "reviewer") {
    action = buildReviewerDeliveryAction({
      envelope: input.envelope,
      bubbleConfig: input.bubbleConfig,
      actorLabel,
      ...(input.reviewerTestDirective !== undefined
        ? { reviewerTestDirective: input.reviewerTestDirective }
        : {}),
      ...(input.reviewerBrief !== undefined
        ? { reviewerBrief: input.reviewerBrief }
        : {}),
      ...(input.reviewerFocus !== undefined
        ? { reviewerFocus: input.reviewerFocus }
        : {})
    });
  } else if (input.recipientRole === "meta-reviewer") {
    action =
      `Meta-review task received. Produce autonomous meta-review output and return only through structured submit with required report-json parity fields: \`${buildMetaReviewSubmitCommandTemplate()}\`. ${buildMetaReviewSubmitApproveParityNote()}`;
  } else if (
    input.recipientRole === "human" ||
    input.recipientRole === "orchestrator" ||
    input.recipientRole === "status"
  ) {
    action = "Check inbox/status and continue human orchestration flow.";
  }

  return `# [pairflow] r${input.envelope.round} ${input.envelope.type} ${input.envelope.sender}->${input.envelope.recipient} msg=${input.envelope.id} ref=${input.messageRef}. Action: ${action} ${workspaceHint}`;
}
