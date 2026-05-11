import type {
  AgentName,
  AgentRole,
  BubbleAgentsConfig
} from "../../../contracts/kernel/agentIdentity.js";
import {
  resolveConfiguredAgentForRole
} from "../../domain/agentIdentity/agentIdentity.js";
import type { ActorRuntimePolicyCheckId } from "../../shared/actorProtocol/actorRuntimePolicyTypes.js";
import type {
  HandoffIdFormatId,
  RoleExecutionProjectionDescriptor
} from "../../shared/actorProtocol/roleExecutionProjection.js";
import type { SharedTopologySlotId } from "../../shared/topology/topologySlotPaneProjection.js";
import type { PromptConcernId } from "../../shared/role/prompts/rolePromptConcerns.js";

export type ActiveAgentConstraintId = "configured_when_present";

export type AgentResolutionDescriptor =
  | {
      kind: "config_bound";
      config_key: AgentRole;
    };

export interface RoleDescriptor {
  id: AgentRole;
  primary_awaited_output_type: RoleExecutionProjectionDescriptor["primary_awaited_output_type"];
  topology_slot_id: SharedTopologySlotId;
  authority_policy_check_id: ActorRuntimePolicyCheckId;
  agent_resolution: AgentResolutionDescriptor;
  startup_prompt_concern_ids: readonly PromptConcernId[];
  resume_prompt_concern_ids: readonly PromptConcernId[];
  handoff_id_format_id: HandoffIdFormatId | null;
  active_agent_constraint_id: ActiveAgentConstraintId | null;
}

type RoleDescriptorDefinition = Omit<RoleDescriptor, "id">;

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
    startup_prompt_concern_ids: [
      "implementer_start_activation_contract",
      "launch_workspace_command_scope_line",
      "pairflow_command_guidance",
      "implementer_evidence_handoff_guidance",
      "done_package_update_contract",
      "repository_launch_workspace_line",
      "canonical_actor_emit_lookup_guidance",
      "implementer_emit_handoff_contract"
    ],
    resume_prompt_concern_ids: [
      "implementer_resume_artifact_context",
      "launch_workspace_command_scope_line",
      "pairflow_command_guidance",
      "repository_launch_workspace_line",
      "resume_state_context_line",
      "transcript_context_line",
      "implementer_evidence_handoff_guidance",
      "implementer_resume_role_instruction",
      "kickoff_diagnostic_line"
    ],
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
    startup_prompt_concern_ids: [
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
    ],
    resume_prompt_concern_ids: [
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
    ],
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
    startup_prompt_concern_ids: [
      "meta_reviewer_idle_contract",
      "meta_review_submit_command_template",
      "meta_review_submit_approve_parity_note",
      "meta_review_finding_severity_contract",
      "meta_review_no_manual_state_edits",
      "canonical_actor_emit_lookup_guidance",
      "pairflow_command_guidance",
      "meta_reviewer_task_artifact_context",
      "repository_launch_workspace_line"
    ],
    resume_prompt_concern_ids: [
      "meta_reviewer_resume_activation_contract",
      "pairflow_command_guidance",
      "meta_reviewer_task_artifact_context",
      "repository_launch_workspace_line",
      "resume_state_context_line",
      "transcript_context_line",
      "kickoff_diagnostic_line"
    ],
    handoff_id_format_id: "meta_review",
    active_agent_constraint_id: "configured_when_present"
  })
} as const satisfies Readonly<Record<AgentRole, RoleDescriptor>>;

function resolveActiveAgentConstraintPolicyCheckId(
  constraintId: ActiveAgentConstraintId
): ActorRuntimePolicyCheckId {
  switch (constraintId) {
    case "configured_when_present":
      return "meta_reviewer_active_agent_matches_config_when_present";
  }
}

export function getRoleDescriptor(role: AgentRole): RoleDescriptor {
  return roleDescriptorRegistry[role];
}

export function resolveRoleConfiguredAgent(input: {
  role: AgentRole;
  agents: BubbleAgentsConfig;
}): AgentName {
  return resolveConfiguredAgentForRole(input);
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
