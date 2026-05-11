import type { AgentRole } from "../../../../contracts/kernel/agentIdentity.js";
import type {
  BubbleReviewAutoReworkSeverity
} from "../../reviewPolicy/reviewPolicyTypes.js";
import type { PersistedBubbleStateSnapshot } from "../../../domain/state/snapshot/persistedBubbleStateSnapshot.js";
import type {
  PairflowCommandProfile,
  ReviewArtifactType
} from "../../config/bubbleConfigVocabulary.js";
import type {
  BubbleCommandsConfig
} from "../../command/commandConfigTypes.js";
import type {
  ReviewerFocusExtractionResult
} from "../../reviewer/reviewerBrief.js";

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
  validationCommands?: BubbleCommandsConfig;
}

export interface StartupPromptConcernBuildInput
  extends PromptConcernBuildInputBase {
  ideationPending?: boolean;
  state?: undefined;
  transcriptSummary?: undefined;
}

export interface ResumePromptConcernBuildInput
  extends PromptConcernBuildInputBase {
  state: PersistedBubbleStateSnapshot;
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

export type NonReviewerRole = Exclude<AgentRole, "reviewer">;
