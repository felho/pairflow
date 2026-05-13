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
import { buildDocumentBubbleSourceEditGuard } from "../../../shared/document/documentBubbleSourceEditGuard.js";
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

function buildImplementerReworkActionText(input: {
  docsOnly: boolean;
  origin: "meta_review_auto_rework" | "unknown";
  validationGuidance: string;
}): string {
  const intro =
    input.origin === "meta_review_auto_rework"
      ? "Meta-review auto-rework received."
      : "Rework received.";
  const documentSourceEditGuard = buildDocumentBubbleSourceEditGuard();
  return input.docsOnly
    ? `${intro} Continue document/task/spec refinement now and address only document-scope requested changes, then hand off with canonical actor emit (\`pairflow agent emit --kind pass ...\`) directly. ${documentSourceEditGuard} ${input.validationGuidance} Primary artifact rule (docs-only): apply the rework on the referenced source task/document file directly, not only in a new standalone review note. Docs-only scope: keep summary and refs consistent; skip-claim means no \`.pairflow/evidence/*.log\` refs in that PASS.`
    : `${intro} Continue implementation now and address the requested changes, then hand off with canonical actor emit (\`pairflow agent emit --kind pass ...\`) directly. ${input.validationGuidance} Include available \`.pairflow/evidence/*.log\` refs on PASS.`;
}

function buildImplementerValidationGuidance(bubbleConfig: BubbleConfig): string {
  const required = bubbleConfig.commands.validation_required;
  if (required === undefined) {
    return "No bubble-level PASS validation policy is configured; run relevant local validation before handoff.";
  }
  if (required.length === 0 && bubbleConfig.commands.validation_required_explicit === true) {
    return "Bubble-level PASS validation explicitly requires no commands; state any local checks you ran.";
  }
  if (required.length === 0) {
    return "Bubble-level PASS validation policy is invalid: commands.validation_required=[] requires commands.validation_required_explicit=true. PASS will fail closed until the bubble config is corrected.";
  }
  const entries = required.map((id) => {
    const command = bubbleConfig.commands[id];
    return typeof command === "string" && command.trim().length > 0
      ? `${id}: \`${command.trim()}\``
      : `${id}: <missing command in bubble config>`;
  });
  return `Required PASS validation commands: ${entries.join("; ")}. You may run them locally for feedback, but PASS re-runs them and PASS-owned evidence logs are authoritative.`;
}

function buildImplementerDeliveryAction(input: {
  envelope: ProtocolEnvelope;
  bubbleConfig: BubbleConfig;
  actorLabel: string | null;
}): string {
  const docsOnly = input.bubbleConfig.review_artifact_type === "document";
  const validationGuidance = buildImplementerValidationGuidance(input.bubbleConfig);
  const documentSourceEditGuard = buildDocumentBubbleSourceEditGuard();
  if (input.envelope.type === "TASK") {
    return docsOnly
      ? `Document refinement task received. Refine only task/spec/progress/docs artifacts, then hand off with canonical actor emit (\`pairflow agent emit --kind pass ...\`) directly (no confirmation prompt). ${documentSourceEditGuard} ${validationGuidance} Docs-only scope: choose one mode and keep it consistent in the same PASS. Mode A (skip-claim): summary says runtime checks were intentionally not executed -> attach no \`.pairflow/evidence/*.log\` refs. Mode B (checks executed): attach refs only for commands actually run and do not claim checks were intentionally not executed.`
      : `Implementation task received. Continue implementation, then hand off with canonical actor emit (\`pairflow agent emit --kind pass ...\`) directly (no confirmation prompt). ${validationGuidance} Include available \`.pairflow/evidence/*.log\` refs on PASS.`;
  }
  if (input.envelope.type === "PASS") {
    return docsOnly
      ? `Reviewer feedback received for a document bubble. Apply document-scope fixes only, then hand off with canonical actor emit (\`pairflow agent emit --kind pass ...\`) directly (no confirmation prompt). ${documentSourceEditGuard} ${validationGuidance} Primary artifact rule (docs-only): when the task references an existing source document/task file, refine that file directly (in-place) as the main output. Do not replace primary artifact refinement with a new standalone review/synthesis document unless the task explicitly requests creating a new file path. Docs-only scope: choose one mode and keep it consistent in the same PASS. Mode A (skip-claim): summary says runtime checks were intentionally not executed -> attach no \`.pairflow/evidence/*.log\` refs. Mode B (checks executed): attach refs only for commands actually run and do not claim checks were intentionally not executed.`
      : `Reviewer feedback received. Implement fixes, then hand off with canonical actor emit (\`pairflow agent emit --kind pass ...\`) directly (no confirmation prompt). ${validationGuidance} If \`.pairflow/evidence/*.log\` files exist, include them as \`--ref\` (lint/typecheck/test). If only a subset ran, attach refs for that subset and state what was intentionally not executed.`;
  }
  if (input.envelope.type === "HUMAN_REPLY") {
    return docsOnly
      ? `Human response received for a document bubble. Continue document/task/spec refinement using this input, then hand off with canonical actor emit (\`pairflow agent emit --kind pass ...\`) directly. ${documentSourceEditGuard} ${validationGuidance} Primary artifact rule (docs-only): refine the referenced source task/document file directly, not only a new standalone review note. Docs-only scope: keep summary and refs consistent; skip-claim means no \`.pairflow/evidence/*.log\` refs in that PASS.`
      : `Human response received. Continue implementation using this input, then hand off with canonical actor emit (\`pairflow agent emit --kind pass ...\`) directly. ${validationGuidance} Include available \`.pairflow/evidence/*.log\` refs on PASS.`;
  }
  if (input.envelope.type === "APPROVAL_DECISION") {
    if (input.envelope.payload.decision === "rework") {
      return buildImplementerReworkActionText({
        docsOnly,
        origin: resolveImplementerReworkOrigin(input.envelope),
        validationGuidance
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
