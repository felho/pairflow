import { buildDocumentBubbleSourceEditGuard } from "../../document/documentBubbleSourceEditGuard.js";
import type {
  BubbleCommandsConfig
} from "../../command/commandConfigTypes.js";
import type {
  ReviewArtifactType
} from "../../config/bubbleConfigVocabulary.js";

export type ImplementerDeliveryEvent =
  | "TASK"
  | "PASS"
  | "HUMAN_REPLY"
  | "APPROVAL_DECISION"
  | "APPROVAL_REQUEST"
  | "OTHER";

export type ImplementerReworkOrigin =
  | "meta_review_auto_rework"
  | "unknown";

export function buildImplementerValidationCommandGuidance(
  commands: BubbleCommandsConfig | undefined
): string {
  const required = commands?.validation_required;
  if (required === undefined) {
    return "No bubble-level PASS validation policy is configured; run relevant local validation before handoff.";
  }
  if (required.length === 0 && commands?.validation_required_explicit === true) {
    return "Bubble-level PASS validation explicitly requires no commands; still run any useful local checks before handoff and state what ran.";
  }
  if (required.length === 0) {
    return "Bubble-level PASS validation policy is invalid: commands.validation_required=[] requires commands.validation_required_explicit=true. PASS will fail closed until the bubble config is corrected.";
  }
  const lines = required.flatMap((id) => {
    const command = commands?.[id];
    return typeof command === "string" && command.trim().length > 0
      ? [`${id}: \`${command.trim()}\``]
      : [`${id}: <missing command in bubble config>`];
  });
  return [
    "Required PASS validation commands for this bubble:",
    lines.join("; "),
    "You may run them locally for feedback, but PASS will re-run the configured commands and only PASS-owned evidence logs are authoritative."
  ].join(" ");
}

export function buildImplementerEvidenceHandoffGuidance(
  reviewArtifactType: ReviewArtifactType,
  validationCommands?: BubbleCommandsConfig
): string {
  const validationGuidance =
    buildImplementerValidationCommandGuidance(validationCommands);
  const hasConfiguredValidationPolicy =
    validationCommands?.validation_required !== undefined;
  const localValidationGuidance = hasConfiguredValidationPolicy
    ? "Run the bubble-level validation commands listed above when local feedback is useful, and let PASS produce the authoritative evidence."
    : "Run validation via `pnpm lint`, `pnpm typecheck`, `pnpm test`, or `pnpm check` so evidence logs are written to `.pairflow/evidence/`.";
  if (reviewArtifactType === "document") {
    return [
      validationGuidance,
      "This bubble is docs-only (`review_artifact_type=document`), so runtime checks are not required in this round.",
      buildDocumentBubbleSourceEditGuard(),
      "Primary artifact rule (docs-only): when the task references an existing source document/task file, refine that file directly (in-place) as the main output.",
      "Do not replace primary artifact refinement with a new standalone review/synthesis document unless the task explicitly requests creating a new file path.",
      "Docs-only scope: choose one mode and keep it consistent in the same PASS.",
      "Mode A (skip-claim): summary says runtime checks were intentionally not executed -> attach no `.pairflow/evidence/*.log` refs.",
      `Mode B (checks executed): ${localValidationGuidance} Attach only refs for commands you actually ran, and do not claim checks were intentionally not executed.`
    ].join(" ");
  }

  return [
    validationGuidance,
    localValidationGuidance,
    "If evidence logs exist, include them as `--ref` when running `pairflow agent emit --kind pass`.",
    "If only a subset of validation commands ran, attach refs for the commands that actually ran and state what was intentionally not executed.",
    "Missing expected evidence logs should be treated as incomplete validation packaging."
  ].join(" ");
}

export function buildImplementerDeliveryValidationGuidance(
  commands: BubbleCommandsConfig
): string {
  const required = commands.validation_required;
  if (required === undefined) {
    return "No bubble-level PASS validation policy is configured; run relevant local validation before handoff.";
  }
  if (required.length === 0 && commands.validation_required_explicit === true) {
    return "Bubble-level PASS validation explicitly requires no commands; state any local checks you ran.";
  }
  if (required.length === 0) {
    return "Bubble-level PASS validation policy is invalid: commands.validation_required=[] requires commands.validation_required_explicit=true. PASS will fail closed until the bubble config is corrected.";
  }
  const entries = required.map((id) => {
    const command = commands[id];
    return typeof command === "string" && command.trim().length > 0
      ? `${id}: \`${command.trim()}\``
      : `${id}: <missing command in bubble config>`;
  });
  return `Required PASS validation commands: ${entries.join("; ")}. You may run them locally for feedback, but PASS re-runs them and PASS-owned evidence logs are authoritative.`;
}

function buildImplementerReworkActionText(input: {
  docsOnly: boolean;
  origin: ImplementerReworkOrigin;
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

export function buildImplementerDeliveryActionGuidance(input: {
  event: ImplementerDeliveryEvent;
  docsOnly: boolean;
  validationGuidance: string;
  actorLabel: string | null;
  approvalDecision?: "approve" | "rework" | undefined;
  reworkOrigin: ImplementerReworkOrigin;
}): string {
  const documentSourceEditGuard = buildDocumentBubbleSourceEditGuard();
  if (input.event === "TASK") {
    return input.docsOnly
      ? `Document refinement task received. Refine only task/spec/progress/docs artifacts, then hand off with canonical actor emit (\`pairflow agent emit --kind pass ...\`) directly (no confirmation prompt). ${documentSourceEditGuard} ${input.validationGuidance} Docs-only scope: choose one mode and keep it consistent in the same PASS. Mode A (skip-claim): summary says runtime checks were intentionally not executed -> attach no \`.pairflow/evidence/*.log\` refs. Mode B (checks executed): attach refs only for commands actually run and do not claim checks were intentionally not executed.`
      : `Implementation task received. Continue implementation, then hand off with canonical actor emit (\`pairflow agent emit --kind pass ...\`) directly (no confirmation prompt). ${input.validationGuidance} Include available \`.pairflow/evidence/*.log\` refs on PASS.`;
  }
  if (input.event === "PASS") {
    return input.docsOnly
      ? `Reviewer feedback received for a document bubble. Apply document-scope fixes only, then hand off with canonical actor emit (\`pairflow agent emit --kind pass ...\`) directly (no confirmation prompt). ${documentSourceEditGuard} ${input.validationGuidance} Primary artifact rule (docs-only): when the task references an existing source document/task file, refine that file directly (in-place) as the main output. Do not replace primary artifact refinement with a new standalone review/synthesis document unless the task explicitly requests creating a new file path. Docs-only scope: choose one mode and keep it consistent in the same PASS. Mode A (skip-claim): summary says runtime checks were intentionally not executed -> attach no \`.pairflow/evidence/*.log\` refs. Mode B (checks executed): attach refs only for commands actually run and do not claim checks were intentionally not executed.`
      : `Reviewer feedback received. Implement fixes, then hand off with canonical actor emit (\`pairflow agent emit --kind pass ...\`) directly (no confirmation prompt). ${input.validationGuidance} If \`.pairflow/evidence/*.log\` files exist, include them as \`--ref\` (lint/typecheck/test). If only a subset ran, attach refs for that subset and state what was intentionally not executed.`;
  }
  if (input.event === "HUMAN_REPLY") {
    return input.docsOnly
      ? `Human response received for a document bubble. Continue document/task/spec refinement using this input, then hand off with canonical actor emit (\`pairflow agent emit --kind pass ...\`) directly. ${documentSourceEditGuard} ${input.validationGuidance} Primary artifact rule (docs-only): refine the referenced source task/document file directly, not only a new standalone review note. Docs-only scope: keep summary and refs consistent; skip-claim means no \`.pairflow/evidence/*.log\` refs in that PASS.`
      : `Human response received. Continue implementation using this input, then hand off with canonical actor emit (\`pairflow agent emit --kind pass ...\`) directly. ${input.validationGuidance} Include available \`.pairflow/evidence/*.log\` refs on PASS.`;
  }
  if (input.event === "APPROVAL_DECISION") {
    if (input.approvalDecision === "rework") {
      return buildImplementerReworkActionText({
        docsOnly: input.docsOnly,
        origin: input.reworkOrigin,
        validationGuidance: input.validationGuidance
      });
    }
    return "Human approved this bubble. Wait for commit/merge flow and do not continue new implementation in this round.";
  }
  if (input.event === "APPROVAL_REQUEST") {
    return input.actorLabel === "meta-reviewer"
      ? "Meta-reviewer requested human gate decision. Stop coding and wait for human decision (`bubble approve` or `bubble request-rework`). Do not run canonical pass emit now."
      : "Bubble is READY_FOR_HUMAN_APPROVAL. Stop coding and wait for human decision (`bubble approve` or `bubble request-rework`). Do not run canonical pass emit now.";
  }
  return "Continue protocol from this event.";
}
