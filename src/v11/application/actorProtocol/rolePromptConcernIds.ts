import type {
  AgentRole
} from "../../domain/agentIdentity/agentIdentity.js";
import type { PromptConcernId } from "./rolePromptConcernTypes.js";

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

export function getStartupPromptConcernsForRole(
  role: AgentRole
): readonly PromptConcernId[] {
  switch (role) {
    case "implementer":
      return implementerStartupPromptConcernIds;
    case "reviewer":
      return reviewerStartupPromptConcernIds;
    case "meta_reviewer":
      return metaReviewerStartupPromptConcernIds;
  }
}

export function getResumePromptConcernsForRole(
  role: AgentRole
): readonly PromptConcernId[] {
  switch (role) {
    case "implementer":
      return implementerResumePromptConcernIds;
    case "reviewer":
      return reviewerResumePromptConcernIds;
    case "meta_reviewer":
      return metaReviewerResumePromptConcernIds;
  }
}
