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
} from "../../../../v11/shared/reviewer/testEvidence.js";
import {
  formatReviewerBriefDeliveryReminder,
  formatReviewerFocusDeliveryReminder,
  type ReviewerFocusExtractionResult
} from "../../../../v11/shared/reviewer/reviewerBrief.js";
import { buildPairflowCommandGuidance } from "../../executor/command/pairflowCommand.js";
import {
  buildMetaReviewSubmitApproveParityNote,
  buildMetaReviewSubmitCommandTemplate
} from "../../../shared/metaReview/metaReviewSubmitGuidance.js";
import type { BubbleConfig } from "../../../../types/bubble.js";
import type { ProtocolEnvelope, ProtocolParticipant } from "../../../../types/protocol.js";

export type DeliveryMessageRecipientRole =
  | ProtocolParticipant
  | "implementer"
  | "reviewer"
  | "meta-reviewer"
  | "status";

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

function buildImplementerReworkActionText(input: {
  docsOnly: boolean;
  origin: "meta_review_auto_rework" | "unknown";
}): string {
  const intro =
    input.origin === "meta_review_auto_rework"
      ? "Meta-review auto-rework received."
      : "Rework received.";
  return input.docsOnly
    ? `${intro} Continue implementation now and address the requested changes, then hand off with canonical actor emit (\`pairflow agent emit --kind pass ...\`) directly. Primary artifact rule (docs-only): apply the rework on the referenced source task/document file directly, not only in a new standalone review note. Docs-only scope: keep summary and refs consistent; skip-claim means no \`.pairflow/evidence/*.log\` refs in that PASS.`
    : `${intro} Continue implementation now and address the requested changes, then hand off with canonical actor emit (\`pairflow agent emit --kind pass ...\`) directly. Include available \`.pairflow/evidence/*.log\` refs on PASS.`;
}

function buildImplementerDeliveryAction(input: {
  envelope: ProtocolEnvelope;
  bubbleConfig: BubbleConfig;
  actorLabel: string | null;
}): string {
  const docsOnly = input.bubbleConfig.review_artifact_type === "document";
  if (input.envelope.type === "PASS") {
    return docsOnly
      ? "Reviewer feedback received. Implement fixes, then hand off with canonical actor emit (`pairflow agent emit --kind pass ...`) directly (no confirmation prompt). Primary artifact rule (docs-only): when the task references an existing source document/task file, refine that file directly (in-place) as the main output. Do not replace primary artifact refinement with a new standalone review/synthesis document unless the task explicitly requests creating a new file path. Docs-only scope: choose one mode and keep it consistent in the same PASS. Mode A (skip-claim): summary says runtime checks were intentionally not executed -> attach no `.pairflow/evidence/*.log` refs. Mode B (checks executed): attach refs only for commands actually run and do not claim checks were intentionally not executed."
      : "Reviewer feedback received. Implement fixes, then hand off with canonical actor emit (`pairflow agent emit --kind pass ...`) directly (no confirmation prompt). If `.pairflow/evidence/*.log` files exist, include them as `--ref` (lint/typecheck/test). If only a subset ran, attach refs for that subset and state what was intentionally not executed.";
  }
  if (input.envelope.type === "HUMAN_REPLY") {
    return docsOnly
      ? "Human response received. Continue implementation using this input, then hand off with canonical actor emit (`pairflow agent emit --kind pass ...`) directly. Primary artifact rule (docs-only): refine the referenced source task/document file directly, not only a new standalone review note. Docs-only scope: keep summary and refs consistent; skip-claim means no `.pairflow/evidence/*.log` refs in that PASS."
      : "Human response received. Continue implementation using this input, then hand off with canonical actor emit (`pairflow agent emit --kind pass ...`) directly. Include available `.pairflow/evidence/*.log` refs on PASS.";
  }
  if (input.envelope.type === "APPROVAL_DECISION") {
    if (input.envelope.payload.decision === "rework") {
      return buildImplementerReworkActionText({
        docsOnly,
        origin: resolveImplementerReworkOrigin(input.envelope)
      });
    }
    return "Human approved this bubble. Wait for commit/merge flow and do not continue new implementation in this round.";
  }
  if (input.envelope.type === "APPROVAL_REQUEST") {
    return input.actorLabel === "meta-reviewer"
      ? "Meta-reviewer requested human gate decision. Stop coding and wait for human decision (`bubble approve` or `bubble request-rework`). Do not run canonical pass emit now."
      : "Bubble is READY_FOR_HUMAN_APPROVAL. Stop coding and wait for human decision (`bubble approve` or `bubble request-rework`). Do not run canonical pass emit now.";
  }
  return "Continue protocol from this event.";
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
    const useFullReviewerPolicyContext = input.bubbleConfig.reviewer_context_mode === "fresh";
    const testDirective =
      input.reviewerTestDirective === undefined
        ? [
            "Run required checks before final judgment. Reason: reviewer test verification directive was unavailable.",
            ...(useFullReviewerPolicyContext ? [buildReviewerDecisionMatrixReminder()] : [])
          ].join(" ")
        : formatReviewerTestExecutionDirective(input.reviewerTestDirective);
    const projectionVariant: ReviewerCommandGateProjectionVariant =
      Array.isArray(input.envelope.payload.findings) && input.envelope.payload.findings.length > 0
        ? "findings"
        : "clean";
    const convergenceInstruction = buildReviewerRoundCommandGateProjection({
      round: input.envelope.round,
      variant: projectionVariant
    });
    const findingsDetailInstruction =
      input.envelope.round <= 1
        ? "In round 1, use canonical pass emit (`pairflow agent emit --kind pass ...`) and declare findings explicitly (`--finding` when findings exist, `--no-findings` only when truly clean)."
        : buildReviewerFindingsPassInstruction(input.bubbleConfig.review_artifact_type);
    const reviewerFocusReminder =
      input.reviewerFocus === undefined
        ? ""
        : formatReviewerFocusDeliveryReminder(input.reviewerFocus);
    return [
      "Implementer handoff received. Run a fresh review now.",
      buildReviewerAgentSelectionGuidance(input.bubbleConfig.review_artifact_type),
      buildReviewerSeverityOntologyReminder({
        includeFullOntology: useFullReviewerPolicyContext
      }),
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
  worktreePath?: string;
  reviewerTestDirective?: ReviewerTestExecutionDirective;
  reviewerBrief?: string;
  reviewerFocus?: ReviewerFocusExtractionResult;
  recipientRole: DeliveryMessageRecipientRole;
}): string {
  const actorLabel = resolvePayloadActor(input.envelope);
  const worktreeHint =
    input.worktreePath === undefined
      ? "Run pairflow commands from the bubble worktree root."
      : `Run pairflow commands from worktree: ${input.worktreePath}. ${buildPairflowCommandGuidance(input.worktreePath, input.bubbleConfig.pairflow_command_profile)}`;

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

  return `# [pairflow] r${input.envelope.round} ${input.envelope.type} ${input.envelope.sender}->${input.envelope.recipient} msg=${input.envelope.id} ref=${input.messageRef}. Action: ${action} ${worktreeHint}`;
}
