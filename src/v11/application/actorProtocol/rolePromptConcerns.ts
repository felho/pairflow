import type {
  AgentRole,
  BubbleCommandsConfig,
  BubbleStateSnapshot,
  ReviewArtifactType
} from "../../../types/bubble.js";
import { buildPairflowCommandGuidance } from "../start/startCommandPromptRuntime.js";
import {
  buildLaunchWorkspaceCommandScopeLine,
  buildRepositoryLaunchWorkspaceLine,
  buildRepoLaunchWorkspaceTaskLine
} from "../start/startCommandWorkspacePromptLines.js";
import { buildResumeContextLine } from "../start/startCommandResumePromptShared.js";
import { buildReviewerAgentSelectionGuidance } from "../../shared/reviewer/reviewerGuidance.js";
import { buildReviewerSeverityOntologyReminder } from "../../shared/reviewer/reviewerSeverityOntology.js";
import {
  buildReviewerPassOutputContractGuidance,
  buildReviewerScoutExpansionWorkflowGuidance
} from "../../shared/reviewer/reviewerScoutExpansionGuidance.js";
import {
  buildMetaReviewSubmitApproveParityNote,
  buildMetaReviewSubmitCommandTemplate
} from "../../shared/metaReview/metaReviewSubmitGuidance.js";
import {
  buildReviewerCanonicalCommandGateLines,
  buildReviewerFindingsPassInstruction
} from "../../shared/reviewer/reviewerCommandGateGuidance.js";
import { buildReviewerDecisionMatrixReminder } from "../../shared/reviewer/testEvidence.js";
import {
  formatReviewerFocusBridgeBlock,
  formatReviewerBriefPrompt,
} from "../../shared/reviewer/reviewerBrief.js";
import {
  getResumePromptConcernsForRole,
  getStartupPromptConcernsForRole
} from "./rolePromptConcernIds.js";
import {
  buildImplementerStartActionLine,
  resolveImplementerRoleInstruction
} from "./rolePromptImplementerScope.js";
import {
  buildIdeationPendingImplementerResumeLines,
  buildIdeationPendingImplementerStartupLines,
  isIdeationPendingImplementerResumeContext,
  isIdeationPendingImplementerStartupContext,
  isResumePromptConcernBuildInput,
  isStartupPromptConcernBuildInput
} from "./rolePromptConcernIdeation.js";
import type {
  NonReviewerRole,
  PromptConcernBuildInput,
  PromptConcernId,
  ResumePromptConcernBuildInput,
  ReviewerResumePromptConcernBuildInput,
  ReviewerStartupPromptConcernBuildInput,
  RolePromptPhase,
  StartupPromptConcernBuildInput
} from "./rolePromptConcernTypes.js";

export type {
  NonReviewerRole,
  PromptConcernBuildInput,
  PromptConcernId,
  ResumePromptConcernBuildInput,
  ReviewerResumePromptConcernBuildInput,
  ReviewerStartupPromptConcernBuildInput,
  RolePromptPhase,
  StartupPromptConcernBuildInput
} from "./rolePromptConcernTypes.js";
type PromptConcernOutput = string | readonly string[] | undefined;
type PromptConcernBuilder = (
  input: PromptConcernBuildInput,
  phase: RolePromptPhase
) => PromptConcernOutput;

function requirePromptValue(
  value: string | undefined,
  field: string,
  concernId: PromptConcernId
): string {
  if (value !== undefined && value.length > 0) {
    return value;
  }
  throw new Error(
    `PROMPT_CONCERN_REQUIRED_INPUT: prompt concern ${concernId} requires ${field} input. context: concern_id=${concernId} field=${field}.`
  );
}

function requirePromptState(
  state: BubbleStateSnapshot | undefined,
  concernId: PromptConcernId
): BubbleStateSnapshot {
  if (state !== undefined) {
    return state;
  }
  throw new Error(
    `PROMPT_CONCERN_REQUIRED_STATE: prompt concern ${concernId} requires state input. context: concern_id=${concernId}.`
  );
}

export function buildCanonicalActorEmitLookupGuidance(input: {
  bubbleId: string;
  repoPath: string;
}): string {
  return `Before direct canonical emit, fetch fresh actor authority via \`pairflow bubble status --id ${input.bubbleId} --repo ${input.repoPath} --json\` and copy both \`executionContext.handoffId\` and \`executionContext.executionId\` (plus optional guards) from the JSON output. Repeat this before each emit because authority can change after every successful handoff, convergence, meta-review transition, or human reply. If no explicit authority snapshot is available yet, refresh status and wait for a current handoff instead of falling back to removed aliases.`;
}

function buildImplementerStartActivationContract(
  input: PromptConcernBuildInput
): readonly string[] {
  return [
    `Pairflow implementer start for bubble ${input.bubbleId}.`,
    `Read task: ${requirePromptValue(input.taskArtifactPath, "taskArtifactPath", "implementer_start_activation_contract")}.`,
    buildImplementerStartActionLine(input.reviewArtifactType)
  ];
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

function buildImplementerResumeArtifactContext(
  input: PromptConcernBuildInput
): readonly string[] {
  return [
    `Pairflow implementer resume for bubble ${input.bubbleId}.`,
    `Task: ${requirePromptValue(input.taskArtifactPath, "taskArtifactPath", "implementer_resume_artifact_context")}.`
  ];
}

function buildReviewerStartActivationContract(
  input: PromptConcernBuildInput
): readonly string[] {
  return [
    `Pairflow reviewer start for bubble ${input.bubbleId}.`,
    "Stand by first. Do not start reviewing until implementer handoff (`PASS`) arrives.",
    "When PASS arrives, run a fresh review."
  ];
}

function buildReviewerResumeArtifactContext(
  input: PromptConcernBuildInput
): readonly string[] {
  return [
    `Pairflow reviewer resume for bubble ${input.bubbleId}.`,
    `Task: ${requirePromptValue(input.taskArtifactPath, "taskArtifactPath", "reviewer_resume_artifact_context")}.`
  ];
}

export function buildDocumentPrimaryArtifactReviewerGuardrail(
  reviewArtifactType: ReviewArtifactType
): string | undefined {
  if (reviewArtifactType !== "document") {
    return undefined;
  }
  return [
    "Primary artifact review rule (docs-only): treat a PASS as out-of-scope if it only adds a new standalone review/synthesis document while the referenced source task/document file is unchanged.",
    "In that case, request rework so the primary referenced artifact is refined directly."
  ].join(" ");
}

function buildReviewerResumeRoleInstruction(
  state: BubbleStateSnapshot
): string {
  return state.state === "RUNNING" && state.active_role === "reviewer"
    ? "You are currently active. Continue review now."
    : "Stand by unless you are active or receive a handoff.";
}

function buildMetaReviewerIdleContract(
  input: PromptConcernBuildInput
): readonly string[] {
  return [
    `Pairflow meta-reviewer start for bubble ${input.bubbleId}.`,
    "This is a dedicated static worker pane for autonomous meta-review tasks.",
    "Stay idle until orchestration signals a meta-review run."
  ];
}

function buildMetaReviewerResumeActivationContract(
  input: PromptConcernBuildInput
): readonly string[] {
  return [
    `Pairflow meta-reviewer resume for bubble ${input.bubbleId}.`,
    "This pane is static across rounds; do not restart unless explicitly instructed.",
    "Stay idle until orchestration signals a meta-review run.",
    "When signaled, return result only through structured Pairflow submit command (no pane marker output parsing)."
  ];
}

const promptConcernCatalog: Readonly<
  Record<PromptConcernId, PromptConcernBuilder>
> = {
  pairflow_command_guidance: (input) =>
    buildPairflowCommandGuidance(
      input.workspacePath,
      input.pairflowCommandProfile
    ),
  canonical_actor_emit_lookup_guidance: (input) =>
    buildCanonicalActorEmitLookupGuidance({
      bubbleId: input.bubbleId,
      repoPath: input.repoPath
    }),
  launch_workspace_command_scope_line: (input) =>
    buildLaunchWorkspaceCommandScopeLine(input.workspacePath),
  repository_launch_workspace_line: (input) =>
    buildRepositoryLaunchWorkspaceLine({
      repoPath: input.repoPath,
      workspacePath: input.workspacePath
    }),
  repo_launch_workspace_task_line: (input) =>
    buildRepoLaunchWorkspaceTaskLine({
      repoPath: input.repoPath,
      workspacePath: input.workspacePath,
      taskArtifactPath: requirePromptValue(
        input.taskArtifactPath,
        "taskArtifactPath",
        "repo_launch_workspace_task_line"
      )
    }),
  resume_state_context_line: (input) => {
    const state = requirePromptState(
      input.state,
      "resume_state_context_line"
    );
    return `State snapshot: ${buildResumeContextLine(state)}.`;
  },
  transcript_context_line: (input) =>
    `Transcript context: ${requirePromptValue(input.transcriptSummary, "transcriptSummary", "transcript_context_line")}`,
  kickoff_diagnostic_line: (input) =>
    input.kickoffDiagnostic?.trim().length
      ? `Kickoff diagnostic: ${input.kickoffDiagnostic}`
      : undefined,
  implementer_start_activation_contract: (input) =>
    buildImplementerStartActivationContract(input),
  implementer_resume_artifact_context: (input) =>
    buildImplementerResumeArtifactContext(input),
  implementer_evidence_handoff_guidance: (input) =>
    [
      ...(isResumePromptConcernBuildInput(input)
        ? [
            "Use transcript state, the PASS summary, and evidence refs as the handoff boundary; do not create or depend on a prose handoff artifact."
          ]
        : []),
      buildImplementerEvidenceHandoffGuidance(
        input.reviewArtifactType ?? "code",
        input.validationCommands
      )
    ],
  done_package_update_contract: () =>
    "Use the PASS summary plus evidence refs as the handoff package; do not create or depend on a prose handoff artifact.",
  implementer_emit_handoff_contract: () => [
    "When done, run `pairflow agent emit --kind pass --repo <repo> --bubble-id <id> --handoff-id <handoff-id> --execution-id <execution-id> --summary \"<what changed + validation>\"` with available evidence `--ref` attachments.",
    "Use `pairflow agent emit --kind human_question --repo <repo> --bubble-id <id> --handoff-id <handoff-id> --execution-id <execution-id> --question \"...\"` only for blockers."
  ],
  implementer_resume_role_instruction: (input) =>
    resolveImplementerRoleInstruction({
      reviewArtifactType: input.reviewArtifactType,
      state: requirePromptState(input.state, "implementer_resume_role_instruction")
    }),
  reviewer_start_activation_contract: (input) =>
    buildReviewerStartActivationContract(input),
  reviewer_resume_artifact_context: (input) =>
    buildReviewerResumeArtifactContext(input),
  reviewer_test_execution_directive: (_input, phase) =>
    phase === "startup"
      ? "When PASS arrives, follow the orchestrator test-evidence skip/run directive for test execution."
      : "Follow orchestrator test-evidence skip/run directive for test execution.",
  reviewer_policy_snapshot_contract: (input) => [
    `Reviewer policy file: ${requirePromptValue(input.policySnapshotPathAbs, "policySnapshotPathAbs", "reviewer_policy_snapshot_contract")}`,
    "Read this file before first review action."
  ],
  reviewer_resume_role_instruction: (input) =>
    buildReviewerResumeRoleInstruction(
      requirePromptState(input.state, "reviewer_resume_role_instruction")
    ),
  reviewer_severity_ontology_reminder: () =>
    buildReviewerSeverityOntologyReminder(),
  reviewer_decision_matrix_reminder: (input, phase) => [
    buildReviewerDecisionMatrixReminder(),
    ...(phase === "resume" && input.reviewerTestDirectiveLine !== undefined
      ? [`Current directive: ${input.reviewerTestDirectiveLine}`]
      : [])
  ],
  reviewer_agent_selection_guidance: (input) =>
    buildReviewerAgentSelectionGuidance(
      input.reviewArtifactType ?? "code"
    ),
  reviewer_scout_expansion_workflow_guidance: () =>
    buildReviewerScoutExpansionWorkflowGuidance(),
  reviewer_pass_output_contract_guidance: () =>
    buildReviewerPassOutputContractGuidance(),
  reviewer_findings_pass_instruction: (input) =>
    buildReviewerFindingsPassInstruction(
      input.reviewArtifactType ?? "code",
      input.reviewerBlockingMinSeverity !== undefined
        ? {
            reviewerBlockingMinSeverity: input.reviewerBlockingMinSeverity
          }
        : {}
    ),
  reviewer_canonical_command_gate_lines: (input) =>
    buildReviewerCanonicalCommandGateLines(
      input.reviewerBlockingMinSeverity !== undefined
        ? {
            reviewerBlockingMinSeverity: input.reviewerBlockingMinSeverity
          }
        : {}
    ),
  reviewer_no_manual_state_edits: () =>
    "Never edit transcript/inbox/state files manually.",
  document_primary_artifact_reviewer_guardrail: (input) =>
    buildDocumentPrimaryArtifactReviewerGuardrail(
      input.reviewArtifactType ?? "code"
    ),
  reviewer_brief_overlay: (input) =>
    input.reviewerBriefText !== undefined
      ? formatReviewerBriefPrompt(input.reviewerBriefText)
      : undefined,
  reviewer_focus_bridge_overlay: (input) =>
    input.reviewerFocus?.status === "present"
      ? formatReviewerFocusBridgeBlock(input.reviewerFocus)
      : undefined,
  meta_reviewer_idle_contract: (input) =>
    buildMetaReviewerIdleContract(input),
  meta_reviewer_task_artifact_context: (input) =>
    `Task: ${requirePromptValue(input.taskArtifactPath, "taskArtifactPath", "meta_reviewer_task_artifact_context")}.`,
  meta_review_submit_command_template: () =>
    `When signaled, submit only through structured Pairflow CLI and always include required report-json parity fields: \`${buildMetaReviewSubmitCommandTemplate()}\`.`,
  meta_review_submit_approve_parity_note: () =>
    buildMetaReviewSubmitApproveParityNote(),
  meta_review_finding_severity_contract: () => [
    "In findings artifacts, use canonical finding severity/priority values only: `P0`, `P1`, `P2`, `P3`.",
    "Do not emit alias severities such as `blocking` or `advisory` in findings artifact entries."
  ],
  meta_review_no_manual_state_edits: () =>
    "Do not modify transcript/inbox/state files manually.",
  meta_reviewer_resume_activation_contract: (input) =>
    buildMetaReviewerResumeActivationContract(input)
};

export function buildTranscriptContextLine(
  input: ResumePromptConcernBuildInput
): string {
  return promptConcernCatalog.transcript_context_line(input, "resume") as string;
}

export function buildReviewerPolicySnapshotContractLines(
  input:
    | ReviewerStartupPromptConcernBuildInput
    | ReviewerResumePromptConcernBuildInput
): string[] {
  return promptConcernCatalog.reviewer_policy_snapshot_contract(
    input,
    input.state === undefined ? "startup" : "resume"
  ) as string[];
}

export { getResumePromptConcernsForRole, getStartupPromptConcernsForRole };

export function buildRolePromptConcernLines(input: {
  role: "reviewer";
  phase: "startup";
  context: ReviewerStartupPromptConcernBuildInput;
}): string[];
export function buildRolePromptConcernLines(input: {
  role: "reviewer";
  phase: "resume";
  context: ReviewerResumePromptConcernBuildInput;
}): string[];
export function buildRolePromptConcernLines(input: {
  role: NonReviewerRole;
  phase: "startup";
  context: StartupPromptConcernBuildInput;
}): string[];
export function buildRolePromptConcernLines(input: {
  role: NonReviewerRole;
  phase: "resume";
  context: ResumePromptConcernBuildInput;
}): string[];
export function buildRolePromptConcernLines(input: {
  role: AgentRole;
  phase: RolePromptPhase;
  context: PromptConcernBuildInput;
}): string[] {
  if (
    input.role === "implementer"
    && input.phase === "startup"
    && isStartupPromptConcernBuildInput(input.context)
    && isIdeationPendingImplementerStartupContext(input.context)
  ) {
    return buildIdeationPendingImplementerStartupLines(input.context);
  }

  if (
    input.role === "implementer"
    && input.phase === "resume"
    && isResumePromptConcernBuildInput(input.context)
    && isIdeationPendingImplementerResumeContext(input.context)
  ) {
    return buildIdeationPendingImplementerResumeLines(input.context);
  }

  const concernIds =
    input.phase === "startup"
      ? getStartupPromptConcernsForRole(input.role)
      : getResumePromptConcernsForRole(input.role);

  const lines: string[] = [];
  for (const concernId of concernIds) {
    const output = promptConcernCatalog[concernId](
      input.context,
      input.phase
    );
    if (typeof output === "string") {
      const trimmed = output.trim();
      if (trimmed.length > 0) {
        lines.push(trimmed);
      }
      continue;
    }
    if (Array.isArray(output)) {
      for (const line of output) {
        if (typeof line !== "string") {
          continue;
        }
        const trimmed = line.trim();
        if (trimmed.length > 0) {
          lines.push(trimmed);
        }
      }
    }
  }

  return lines;
}
