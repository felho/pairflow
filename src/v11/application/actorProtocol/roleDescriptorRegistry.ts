import type {
  AgentName,
  AgentRole,
  BubbleAgentsConfig,
  BubbleReviewAutoReworkSeverity,
  BubbleExecutionContextAwaitedOutputType,
  BubbleStateSnapshot,
  PairflowCommandProfile,
  ReviewArtifactType
} from "../../../types/bubble.js";
import { resolveConfiguredAgentForRole } from "../../../types/bubble.js";
import {
  getSharedTopologySlotPaneIndex,
  getSharedTopologySlotPaneIndexForRole
} from "../../shared/topology/topologySlotPaneProjection.js";
import type { ActorRuntimePolicyCheckId } from "./actorRuntimeDispatchMatrix.js";
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
  type ReviewerFocusExtractionResult
} from "../../shared/reviewer/reviewerBrief.js";

export type TopologySlotId = "status" | AgentRole;
export type HandoffIdFormatId = "meta_review";

export type PromptConcernId =
  | "pairflow_command_guidance"
  | "canonical_actor_emit_lookup_guidance"
  | "launch_workspace_command_scope_line"
  | "repository_launch_workspace_line"
  | "repo_launch_workspace_task_line"
  | "resume_state_context_line"
  | "transcript_context_line"
  | "kickoff_diagnostic_line"
  | "implementer_start_activation_contract"
  | "implementer_resume_artifact_context"
  | "implementer_evidence_handoff_guidance"
  | "done_package_update_contract"
  | "implementer_emit_handoff_contract"
  | "implementer_resume_role_instruction"
  | "reviewer_start_activation_contract"
  | "reviewer_resume_artifact_context"
  | "reviewer_test_execution_directive"
  | "reviewer_policy_snapshot_contract"
  | "reviewer_resume_role_instruction"
  | "reviewer_severity_ontology_reminder"
  | "reviewer_decision_matrix_reminder"
  | "reviewer_agent_selection_guidance"
  | "reviewer_scout_expansion_workflow_guidance"
  | "reviewer_pass_output_contract_guidance"
  | "reviewer_findings_pass_instruction"
  | "reviewer_canonical_command_gate_lines"
  | "reviewer_no_manual_state_edits"
  | "document_primary_artifact_reviewer_guardrail"
  | "reviewer_brief_overlay"
  | "reviewer_focus_bridge_overlay"
  | "meta_reviewer_idle_contract"
  | "meta_reviewer_task_artifact_context"
  | "meta_review_submit_command_template"
  | "meta_review_submit_approve_parity_note"
  | "meta_review_finding_severity_contract"
  | "meta_review_no_manual_state_edits"
  | "meta_reviewer_resume_activation_contract";

export type ActiveAgentConstraintId = "configured_when_present";

export interface RoleExecutionProjectionDescriptor {
  primary_awaited_output_type: BubbleExecutionContextAwaitedOutputType;
  handoff_id_format_id: HandoffIdFormatId | null;
}

type NonReviewerRole = Exclude<AgentRole, "reviewer">;

export type AgentResolutionDescriptor =
  | {
      kind: "config_bound";
      config_key: AgentRole;
    };

export interface RoleDescriptor {
  id: AgentRole;
  primary_awaited_output_type: BubbleExecutionContextAwaitedOutputType;
  topology_slot_id: TopologySlotId;
  authority_policy_check_id: ActorRuntimePolicyCheckId;
  agent_resolution: AgentResolutionDescriptor;
  startup_prompt_concern_ids: readonly PromptConcernId[];
  resume_prompt_concern_ids: readonly PromptConcernId[];
  handoff_id_format_id: HandoffIdFormatId | null;
  active_agent_constraint_id: ActiveAgentConstraintId | null;
}

export interface TopologySlotDescriptor {
  id: TopologySlotId;
  pane_index: number;
  bound_role_id: AgentRole | null;
}

function freezeTopologySlotDescriptor<T extends TopologySlotDescriptor>(
  descriptor: T
): Readonly<T> {
  return Object.freeze(descriptor);
}

export type RolePromptPhase = "startup" | "resume";

interface PromptConcernBuildInputBase {
  bubbleId: string;
  repoPath: string;
  workspacePath: string;
  pairflowCommandProfile: PairflowCommandProfile;
  taskArtifactPath: string;
  reviewArtifactType?: ReviewArtifactType;
  reviewerBlockingMinSeverity?: BubbleReviewAutoReworkSeverity;
  policySnapshotPathAbs?: string;
  kickoffDiagnostic?: string;
  reviewerTestDirectiveLine?: string;
  reviewerBriefText?: string;
  reviewerFocus?: ReviewerFocusExtractionResult;
}

export interface StartupPromptConcernBuildInput
  extends PromptConcernBuildInputBase {
  ideationPending?: boolean;
  state?: undefined;
  transcriptSummary?: undefined;
}

export interface ResumePromptConcernBuildInput
  extends PromptConcernBuildInputBase {
  state: BubbleStateSnapshot;
  transcriptSummary: string;
}

export interface ReviewerStartupPromptConcernBuildInput
  extends StartupPromptConcernBuildInput {
  policySnapshotPathAbs: string;
}

export interface ReviewerResumePromptConcernBuildInput
  extends ResumePromptConcernBuildInput {
  policySnapshotPathAbs: string;
}

export type PromptConcernBuildInput =
  | StartupPromptConcernBuildInput
  | ResumePromptConcernBuildInput
  | ReviewerStartupPromptConcernBuildInput
  | ReviewerResumePromptConcernBuildInput;

type PromptConcernOutput = string | readonly string[] | undefined;
type PromptConcernBuilder = (
  input: PromptConcernBuildInput,
  phase: RolePromptPhase
) => PromptConcernOutput;

type RoleDescriptorDefinition = Omit<
  RoleDescriptor,
  "id"
>;

const implementerStartupPromptConcernIds = [
  "implementer_start_activation_contract",
  "launch_workspace_command_scope_line",
  "pairflow_command_guidance",
  "implementer_evidence_handoff_guidance",
  "done_package_update_contract",
  "repository_launch_workspace_line",
  "canonical_actor_emit_lookup_guidance",
  "implementer_emit_handoff_contract"
] as const satisfies readonly PromptConcernId[];

const implementerResumePromptConcernIds = [
  "implementer_resume_artifact_context",
  "launch_workspace_command_scope_line",
  "pairflow_command_guidance",
  "repository_launch_workspace_line",
  "resume_state_context_line",
  "transcript_context_line",
  "implementer_evidence_handoff_guidance",
  "implementer_resume_role_instruction",
  "kickoff_diagnostic_line"
] as const satisfies readonly PromptConcernId[];

const reviewerStartupPromptConcernIds = [
  "reviewer_start_activation_contract",
  "reviewer_test_execution_directive",
  "reviewer_severity_ontology_reminder",
  "reviewer_policy_snapshot_contract",
  "reviewer_decision_matrix_reminder",
  "reviewer_agent_selection_guidance",
  "document_primary_artifact_reviewer_guardrail",
  "reviewer_scout_expansion_workflow_guidance",
  "reviewer_pass_output_contract_guidance",
  "reviewer_brief_overlay",
  "reviewer_focus_bridge_overlay",
  "canonical_actor_emit_lookup_guidance",
  "reviewer_findings_pass_instruction",
  "reviewer_canonical_command_gate_lines",
  "launch_workspace_command_scope_line",
  "pairflow_command_guidance",
  "reviewer_no_manual_state_edits",
  "repo_launch_workspace_task_line"
] as const satisfies readonly PromptConcernId[];

const reviewerResumePromptConcernIds = [
  "reviewer_resume_artifact_context",
  "repository_launch_workspace_line",
  "launch_workspace_command_scope_line",
  "pairflow_command_guidance",
  "resume_state_context_line",
  "transcript_context_line",
  "reviewer_test_execution_directive",
  "reviewer_severity_ontology_reminder",
  "reviewer_policy_snapshot_contract",
  "reviewer_decision_matrix_reminder",
  "reviewer_agent_selection_guidance",
  "document_primary_artifact_reviewer_guardrail",
  "reviewer_scout_expansion_workflow_guidance",
  "reviewer_pass_output_contract_guidance",
  "reviewer_brief_overlay",
  "reviewer_focus_bridge_overlay",
  "reviewer_canonical_command_gate_lines",
  "reviewer_resume_role_instruction",
  "kickoff_diagnostic_line"
] as const satisfies readonly PromptConcernId[];

const metaReviewerStartupPromptConcernIds = [
  "meta_reviewer_idle_contract",
  "meta_review_submit_command_template",
  "meta_review_submit_approve_parity_note",
  "meta_review_finding_severity_contract",
  "meta_review_no_manual_state_edits",
  "canonical_actor_emit_lookup_guidance",
  "pairflow_command_guidance",
  "meta_reviewer_task_artifact_context",
  "repository_launch_workspace_line"
] as const satisfies readonly PromptConcernId[];

const metaReviewerResumePromptConcernIds = [
  "meta_reviewer_resume_activation_contract",
  "pairflow_command_guidance",
  "meta_reviewer_task_artifact_context",
  "repository_launch_workspace_line",
  "resume_state_context_line",
  "transcript_context_line",
  "kickoff_diagnostic_line"
] as const satisfies readonly PromptConcernId[];

function buildRoleDescriptor(
  role: AgentRole,
  definition: RoleDescriptorDefinition
): RoleDescriptor {
  return {
    id: role,
    ...definition
  };
}

const roleDescriptorRegistry = {
  implementer: buildRoleDescriptor("implementer", {
    primary_awaited_output_type: "pass_result",
    topology_slot_id: "implementer",
    authority_policy_check_id: "implementer_authority",
    agent_resolution: {
      kind: "config_bound",
      config_key: "implementer"
    },
    startup_prompt_concern_ids: implementerStartupPromptConcernIds,
    resume_prompt_concern_ids: implementerResumePromptConcernIds,
    handoff_id_format_id: null,
    active_agent_constraint_id: null
  }),
  reviewer: buildRoleDescriptor("reviewer", {
    primary_awaited_output_type: "pass_result",
    topology_slot_id: "reviewer",
    authority_policy_check_id: "reviewer_authority",
    agent_resolution: {
      kind: "config_bound",
      config_key: "reviewer"
    },
    startup_prompt_concern_ids: reviewerStartupPromptConcernIds,
    resume_prompt_concern_ids: reviewerResumePromptConcernIds,
    handoff_id_format_id: null,
    active_agent_constraint_id: null
  }),
  meta_reviewer: buildRoleDescriptor("meta_reviewer", {
    primary_awaited_output_type: "meta_review_result",
    topology_slot_id: "meta_reviewer",
    authority_policy_check_id: "meta_reviewer_authority",
    agent_resolution: {
      kind: "config_bound",
      config_key: "meta_reviewer"
    },
    startup_prompt_concern_ids: metaReviewerStartupPromptConcernIds,
    resume_prompt_concern_ids: metaReviewerResumePromptConcernIds,
    handoff_id_format_id: "meta_review",
    active_agent_constraint_id: "configured_when_present"
  })
} as const satisfies Readonly<Record<AgentRole, RoleDescriptor>>;

export const topologySlotCatalog = Object.freeze({
  status: freezeTopologySlotDescriptor({
    id: "status",
    pane_index: getSharedTopologySlotPaneIndex("status"),
    bound_role_id: null
  }),
  implementer: freezeTopologySlotDescriptor({
    id: "implementer",
    pane_index: getSharedTopologySlotPaneIndex("implementer"),
    bound_role_id: "implementer"
  }),
  reviewer: freezeTopologySlotDescriptor({
    id: "reviewer",
    pane_index: getSharedTopologySlotPaneIndex("reviewer"),
    bound_role_id: "reviewer"
  }),
  meta_reviewer: freezeTopologySlotDescriptor({
    id: "meta_reviewer",
    pane_index: getSharedTopologySlotPaneIndex("meta_reviewer"),
    bound_role_id: "meta_reviewer"
  })
} as const satisfies Readonly<Record<TopologySlotId, TopologySlotDescriptor>>);

function requirePromptValue(
  value: string | undefined,
  field: string,
  concernId: PromptConcernId
): string {
  if (value !== undefined && value.length > 0) {
    return value;
  }

  throw new Error(
    `Prompt concern ${concernId} requires ${field} input.`
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
    `Prompt concern ${concernId} requires state input.`
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
    "Implement in this launch workspace and run relevant validation before handoff."
  ];
}

export function buildImplementerEvidenceHandoffGuidance(
  reviewArtifactType: ReviewArtifactType
): string {
  if (reviewArtifactType === "document") {
    return [
      "This bubble is docs-only (`review_artifact_type=document`), so runtime checks are not required in this round.",
      "Primary artifact rule (docs-only): when the task references an existing source document/task file, refine that file directly (in-place) as the main output.",
      "Do not replace primary artifact refinement with a new standalone review/synthesis document unless the task explicitly requests creating a new file path.",
      "Docs-only scope: choose one mode and keep it consistent in the same PASS.",
      "Mode A (skip-claim): summary says runtime checks were intentionally not executed -> attach no `.pairflow/evidence/*.log` refs.",
      "Mode B (checks executed): if you run validation (for example `pnpm lint`, `pnpm typecheck`, `pnpm test`, or `pnpm check`), make sure evidence logs are written to `.pairflow/evidence/`, attach only refs for commands you actually ran, and do not claim checks were intentionally not executed."
    ].join(" ");
  }

  return [
    "Run validation via `pnpm lint`, `pnpm typecheck`, `pnpm test`, or `pnpm check` so evidence logs are written to `.pairflow/evidence/`.",
    "If evidence logs exist, include them as `--ref` when running `pairflow agent emit --kind pass`.",
    "If only a subset of validation commands ran, attach refs for the commands that actually ran and state what was intentionally not executed.",
    "Missing expected evidence logs should be treated as incomplete validation packaging."
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

function resolveImplementerRoleInstruction(
  state: BubbleStateSnapshot
): string {
  if (state.state === "RUNNING" && state.active_role === "implementer") {
    return "You are currently active. Continue implementation now.";
  }
  return "Continue implementation when you become active; otherwise stand by.";
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

function resolveActiveAgentConstraintPolicyCheckId(
  constraintId: ActiveAgentConstraintId
): ActorRuntimePolicyCheckId {
  switch (constraintId) {
    case "configured_when_present":
      return "meta_reviewer_active_agent_matches_config_when_present";
  }
}

function isResumePromptConcernBuildInput(
  input: PromptConcernBuildInput
): input is ResumePromptConcernBuildInput {
  return input.state !== undefined;
}

function isStartupPromptConcernBuildInput(
  input: PromptConcernBuildInput
): input is StartupPromptConcernBuildInput {
  return input.state === undefined;
}

function isIdeationPendingImplementerResumeContext(
  input: ResumePromptConcernBuildInput
): boolean {
  return input.state.state === "RUNNING" && input.state.round === 0;
}

function isIdeationPendingImplementerStartupContext(
  input: StartupPromptConcernBuildInput
): boolean {
  return input.ideationPending === true;
}

function buildIdeationPendingImplementerStartupLines(
  input: StartupPromptConcernBuildInput
): string[] {
  return [
    `Pairflow implementer start for bubble ${input.bubbleId}.`,
    "This bubble is ideation-pending (`round=0`).",
    "Do nothing now. Stay idle.",
    "Do not read task files, scan the repository, or search for kickoff sources.",
    "Do not run lifecycle/protocol commands (`pairflow bubble kickoff`, `pairflow agent emit`) unless explicit human instruction arrives.",
    "Wait for explicit human instruction that contains a concrete kickoff task.",
    buildRepositoryLaunchWorkspaceLine({
      repoPath: input.repoPath,
      workspacePath: input.workspacePath
    })
  ];
}

function buildIdeationPendingImplementerResumeLines(
  input: ResumePromptConcernBuildInput
): string[] {
  const lines = [
    `Pairflow implementer resume for bubble ${input.bubbleId}.`,
    `State snapshot: ${buildResumeContextLine(input.state)}.`,
    `Transcript context: ${input.transcriptSummary}`,
    "This bubble is ideation-pending (`RUNNING`, `round=0`).",
    "Do nothing now. Stay idle.",
    "Do not read task files, scan the repository, or search for kickoff sources.",
    "Do not run lifecycle/protocol commands (`pairflow bubble kickoff`, `pairflow agent emit`) unless explicit human instruction arrives.",
    "Wait for explicit human instruction that contains a concrete kickoff task.",
    buildRepositoryLaunchWorkspaceLine({
      repoPath: input.repoPath,
      workspacePath: input.workspacePath
    })
  ];

  if (input.kickoffDiagnostic?.trim().length) {
    lines.push(`Kickoff diagnostic: ${input.kickoffDiagnostic}`);
  }

  return lines;
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
        input.reviewArtifactType ?? "code"
      )
    ],
  done_package_update_contract: () =>
    "Use the PASS summary plus evidence refs as the handoff package; do not create or depend on a prose handoff artifact.",
  implementer_emit_handoff_contract: () => [
    "When done, run `pairflow agent emit --kind pass --repo <repo> --bubble-id <id> --handoff-id <handoff-id> --execution-id <execution-id> --summary \"<what changed + validation>\"` with available evidence `--ref` attachments.",
    "Use `pairflow agent emit --kind human_question --repo <repo> --bubble-id <id> --handoff-id <handoff-id> --execution-id <execution-id> --question \"...\"` only for blockers."
  ],
  implementer_resume_role_instruction: (input) =>
    resolveImplementerRoleInstruction(
      requirePromptState(input.state, "implementer_resume_role_instruction")
    ),
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

export function getRoleDescriptor(role: AgentRole): RoleDescriptor {
  return roleDescriptorRegistry[role];
}

export function getTopologySlotIdForRole(role: AgentRole): TopologySlotId {
  return getRoleDescriptor(role).topology_slot_id;
}

export function getTopologySlotDescriptor(
  slotId: TopologySlotId
): TopologySlotDescriptor {
  return topologySlotCatalog[slotId];
}

export function getTopologySlotDescriptorForRole(
  role: AgentRole
): TopologySlotDescriptor {
  return getTopologySlotDescriptor(getTopologySlotIdForRole(role));
}

export function getTopologySlotPaneIndex(slotId: TopologySlotId): number {
  return getSharedTopologySlotPaneIndex(slotId);
}

export function getTopologySlotPaneIndexForRole(role: AgentRole): number {
  return getSharedTopologySlotPaneIndexForRole(role);
}

export function resolveRoleConfiguredAgent(input: {
  role: AgentRole;
  agents: BubbleAgentsConfig;
}): AgentName {
  return resolveConfiguredAgentForRole(input);
}

export function getRoleExecutionProjectionDescriptor(
  role: AgentRole
): RoleExecutionProjectionDescriptor {
  const descriptor = getRoleDescriptor(role);
  return {
    primary_awaited_output_type: descriptor.primary_awaited_output_type,
    handoff_id_format_id: descriptor.handoff_id_format_id
  };
}

export function buildExecutionContextHandoffIdForRole(input: {
  bubbleId: string;
  activeRole: AgentRole;
  round: number;
  attempt: number;
}): string {
  const descriptor = getRoleDescriptor(input.activeRole);
  if (descriptor.handoff_id_format_id === "meta_review") {
    return `meta_review:${input.bubbleId}:round:${input.round}:attempt:${input.attempt}`;
  }

  return `${input.activeRole}:${input.bubbleId}:round:${input.round}:attempt:${input.attempt}`;
}

export function getStartupPromptConcernsForRole(
  role: AgentRole
): readonly PromptConcernId[] {
  return getRoleDescriptor(role).startup_prompt_concern_ids;
}

export function getResumePromptConcernsForRole(
  role: AgentRole
): readonly PromptConcernId[] {
  return getRoleDescriptor(role).resume_prompt_concern_ids;
}

export function getPrimaryRoutePolicyCheckIdsForRole(
  role: AgentRole
): readonly ActorRuntimePolicyCheckId[] {
  const descriptor = getRoleDescriptor(role);
  return [
    "context_snapshot_integrity",
    "input_context_match",
    descriptor.authority_policy_check_id,
    ...(descriptor.active_agent_constraint_id !== null
      ? [
          resolveActiveAgentConstraintPolicyCheckId(
            descriptor.active_agent_constraint_id
          )
        ]
      : [])
  ];
}

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
      lines.push(output);
    } else if (output !== undefined) {
      lines.push(...output);
    }
  }
  return lines;
}
