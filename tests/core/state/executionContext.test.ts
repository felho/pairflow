import { describe, expect, it } from "vitest";

import {
  executionContextsEqual,
  buildRestartedExecutionContext,
  buildRunningExecutionContext
} from "../../../src/v11/domain/state/executionContext.js";
import {
  getPrimaryRoutePolicyCheckIdsForRole,
  getRoleDescriptor
} from "../../../src/v11/shared/role/registry/roleDescriptorRegistry.js";
import {
  getTopologySlotDescriptor,
  getTopologySlotDescriptorForRole,
  getTopologySlotIdForRole,
  getTopologySlotPaneIndex,
  getTopologySlotPaneIndexForRole,
  topologySlotCatalog
} from "../../../src/v11/shared/role/registry/topologySlotCatalog.js";
import {
  getResumePromptConcernsForRole,
  getStartupPromptConcernsForRole
} from "../../../src/v11/shared/role/prompts/rolePromptConcernIds.js";
import {
  buildExecutionContextHandoffIdForRole,
  getRoleExecutionProjectionDescriptor
} from "../../../src/v11/shared/actorProtocol/roleExecutionProjection.js";

describe("buildRunningExecutionContext", () => {
  it("keeps the internal role descriptor registry aligned with awaited-output, policy, and prompt projections", () => {
    expect(getRoleDescriptor("implementer")).toMatchObject({
      id: "implementer",
      primary_awaited_output_type: "pass_result",
      topology_slot_id: "implementer",
      authority_policy_check_id: "implementer_authority",
      handoff_id_format_id: null,
      active_agent_constraint_id: null
    });
    expect(getRoleDescriptor("reviewer")).toMatchObject({
      id: "reviewer",
      primary_awaited_output_type: "pass_result",
      topology_slot_id: "reviewer",
      authority_policy_check_id: "reviewer_authority",
      handoff_id_format_id: null,
      active_agent_constraint_id: null
    });
    expect(getRoleDescriptor("meta_reviewer")).toMatchObject({
      id: "meta_reviewer",
      primary_awaited_output_type: "meta_review_result",
      topology_slot_id: "meta_reviewer",
      authority_policy_check_id: "meta_reviewer_authority",
      handoff_id_format_id: "meta_review",
      active_agent_constraint_id: "configured_when_present"
    });
    expect(topologySlotCatalog.status).toEqual({
      id: "status",
      pane_index: 0,
      bound_role_id: null
    });
    expect(topologySlotCatalog.implementer).toEqual({
      id: "implementer",
      pane_index: 1,
      bound_role_id: "implementer"
    });
    expect(topologySlotCatalog.reviewer).toEqual({
      id: "reviewer",
      pane_index: 2,
      bound_role_id: "reviewer"
    });
    expect(topologySlotCatalog.meta_reviewer).toEqual({
      id: "meta_reviewer",
      pane_index: 3,
      bound_role_id: "meta_reviewer"
    });
    expect(Object.keys(topologySlotCatalog).sort()).toEqual([
      "implementer",
      "meta_reviewer",
      "reviewer",
      "status"
    ]);
    expect(Object.isFrozen(topologySlotCatalog)).toBe(true);
    expect(Object.isFrozen(topologySlotCatalog.meta_reviewer)).toBe(true);
    expect(getTopologySlotIdForRole("meta_reviewer")).toBe("meta_reviewer");
    expect(getTopologySlotDescriptor("status")).toEqual(topologySlotCatalog.status);
    expect(getTopologySlotDescriptorForRole("reviewer")).toEqual(
      topologySlotCatalog.reviewer
    );
    expect(getTopologySlotPaneIndex("status")).toBe(0);
    expect(getTopologySlotPaneIndexForRole("implementer")).toBe(1);
    expect(getTopologySlotPaneIndexForRole("reviewer")).toBe(2);
    expect(getTopologySlotPaneIndexForRole("meta_reviewer")).toBe(3);

    expect(getRoleExecutionProjectionDescriptor("implementer")).toEqual({
      primary_awaited_output_type: "pass_result",
      handoff_id_format_id: null
    });
    expect(getRoleExecutionProjectionDescriptor("reviewer")).toEqual({
      primary_awaited_output_type: "pass_result",
      handoff_id_format_id: null
    });
    expect(getRoleExecutionProjectionDescriptor("meta_reviewer")).toEqual({
      primary_awaited_output_type: "meta_review_result",
      handoff_id_format_id: "meta_review"
    });

    expect(
      buildExecutionContextHandoffIdForRole({
        bubbleId: "b_exec_projection_impl_01",
        activeRole: "implementer",
        round: 2,
        attempt: 1
      })
    ).toBe("implementer:b_exec_projection_impl_01:round:2:attempt:1");
    expect(
      buildExecutionContextHandoffIdForRole({
        bubbleId: "b_exec_projection_meta_01",
        activeRole: "meta_reviewer",
        round: 3,
        attempt: 2
      })
    ).toBe("meta_review:b_exec_projection_meta_01:round:3:attempt:2");

    expect(getPrimaryRoutePolicyCheckIdsForRole("implementer")).toEqual([
      "context_snapshot_integrity",
      "input_context_match",
      "implementer_authority"
    ]);
    expect(getPrimaryRoutePolicyCheckIdsForRole("reviewer")).toEqual([
      "context_snapshot_integrity",
      "input_context_match",
      "reviewer_authority"
    ]);
    expect(getPrimaryRoutePolicyCheckIdsForRole("meta_reviewer")).toEqual([
      "context_snapshot_integrity",
      "input_context_match",
      "meta_reviewer_authority",
      "meta_reviewer_active_agent_matches_config_when_present"
    ]);
  });

  it("keeps the startup and resume prompt concern order closed per role", () => {
    expect(getStartupPromptConcernsForRole("implementer")).toEqual([
      "implementer_start_activation_contract",
      "launch_workspace_command_scope_line",
      "pairflow_command_guidance",
      "implementer_evidence_handoff_guidance",
      "done_package_update_contract",
      "repository_launch_workspace_line",
      "canonical_actor_emit_lookup_guidance",
      "implementer_emit_handoff_contract"
    ]);
    expect(getResumePromptConcernsForRole("implementer")).toEqual([
      "implementer_resume_artifact_context",
      "launch_workspace_command_scope_line",
      "pairflow_command_guidance",
      "repository_launch_workspace_line",
      "resume_state_context_line",
      "transcript_context_line",
      "implementer_evidence_handoff_guidance",
      "implementer_resume_role_instruction",
      "kickoff_diagnostic_line"
    ]);

    expect(getStartupPromptConcernsForRole("reviewer")).toEqual([
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
    ]);
    expect(getResumePromptConcernsForRole("reviewer")).toEqual([
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
    ]);

    expect(getStartupPromptConcernsForRole("meta_reviewer")).toEqual([
      "meta_reviewer_idle_contract",
      "meta_review_submit_command_template",
      "meta_review_submit_approve_parity_note",
      "meta_review_finding_severity_contract",
      "meta_review_no_manual_state_edits",
      "canonical_actor_emit_lookup_guidance",
      "pairflow_command_guidance",
      "meta_reviewer_task_artifact_context",
      "repository_launch_workspace_line"
    ]);
    expect(getResumePromptConcernsForRole("meta_reviewer")).toEqual([
      "meta_reviewer_resume_activation_contract",
      "pairflow_command_guidance",
      "meta_reviewer_task_artifact_context",
      "repository_launch_workspace_line",
      "resume_state_context_line",
      "transcript_context_line",
      "kickoff_diagnostic_line"
    ]);
  });

  it("builds canonical running authority for pass actors", () => {
    const executionContext = buildRunningExecutionContext({
      bubbleId: "b_exec_ctx_01",
      round: 2,
      activeRole: "reviewer",
      startedAt: "2026-03-19T12:00:00.000Z",
      watchdogTimeoutMinutes: 45
    });

    expect(executionContext).toMatchObject({
      active_role: "reviewer",
      awaited_output_type: "pass_result",
      handoff_id: "reviewer:b_exec_ctx_01:round:2:attempt:1",
      round: 2,
      started_at: "2026-03-19T12:00:00.000Z",
      deadline_at: "2026-03-19T12:45:00.000Z",
      attempt: 1
    });
    expect(executionContext.execution_id).toMatch(/^exec_[0-9a-f]{24}$/u);
  });

  it("builds canonical running authority for meta-review actors", () => {
    const executionContext = buildRunningExecutionContext({
      bubbleId: "b_exec_ctx_meta_01",
      round: 3,
      activeRole: "meta_reviewer",
      startedAt: "2026-03-19T12:00:00.000Z",
      watchdogTimeoutMinutes: 45
    });

    expect(executionContext).toMatchObject({
      active_role: "meta_reviewer",
      awaited_output_type: "meta_review_result",
      handoff_id: "meta_review:b_exec_ctx_meta_01:round:3:attempt:1",
      round: 3,
      started_at: "2026-03-19T12:00:00.000Z",
      deadline_at: "2026-03-19T12:45:00.000Z",
      attempt: 1
    });
    expect(executionContext.execution_id).toMatch(/^exec_[0-9a-f]{24}$/u);
  });

  it("rejects zero-minute watchdog windows", () => {
    expect(() =>
      buildRunningExecutionContext({
        bubbleId: "b_exec_ctx_02",
        round: 1,
        activeRole: "implementer",
        startedAt: "2026-03-19T12:00:00.000Z",
        watchdogTimeoutMinutes: 0
      })
    ).toThrowError(
      new RangeError(
        "running execution context requires a positive finite watchdog timeout: 0"
      )
    );
  });

  it("rejects round 0 running execution contexts", () => {
    expect(() =>
      buildRunningExecutionContext({
        bubbleId: "b_exec_ctx_03",
        round: 0,
        activeRole: "implementer",
        startedAt: "2026-03-19T12:00:00.000Z",
        watchdogTimeoutMinutes: 30
      })
    ).toThrowError(
      new RangeError("running execution context requires round >= 1: 0")
    );
  });

  it("rejects attempt values below 1", () => {
    expect(() =>
      buildRunningExecutionContext({
        bubbleId: "b_exec_ctx_04",
        round: 1,
        activeRole: "implementer",
        startedAt: "2026-03-19T12:00:00.000Z",
        watchdogTimeoutMinutes: 30,
        attempt: 0
      })
    ).toThrowError(
      new RangeError("running execution context requires attempt >= 1: 0")
    );
  });

  it("builds a restarted execution context with a fresh handoff attempt", () => {
    const previousExecutionContext = buildRunningExecutionContext({
      bubbleId: "b_exec_ctx_05",
      round: 2,
      activeRole: "implementer",
      startedAt: "2026-03-19T12:00:00.000Z",
      watchdogTimeoutMinutes: 30
    });

    const restartedExecutionContext = buildRestartedExecutionContext({
      bubbleId: "b_exec_ctx_05",
      round: 2,
      activeRole: "implementer",
      restartedAt: "2026-03-19T13:00:00.000Z",
      watchdogTimeoutMinutes: 30,
      previousExecutionContext
    });

    expect(restartedExecutionContext).toMatchObject({
      active_role: "implementer",
      awaited_output_type: "pass_result",
      handoff_id: "implementer:b_exec_ctx_05:round:2:attempt:2",
      round: 2,
      started_at: "2026-03-19T13:00:00.000Z",
      deadline_at: "2026-03-19T13:30:00.000Z",
      attempt: 2
    });
    expect(restartedExecutionContext.execution_id).toMatch(/^exec_[0-9a-f]{24}$/u);
    expect(restartedExecutionContext.execution_id).not.toBe(
      previousExecutionContext.execution_id
    );
  });

  it("rejects restarted contexts when the previous role no longer matches", () => {
    expect(() =>
      buildRestartedExecutionContext({
        bubbleId: "b_exec_ctx_06",
        round: 2,
        activeRole: "implementer",
        restartedAt: "2026-03-19T13:00:00.000Z",
        watchdogTimeoutMinutes: 30,
        previousExecutionContext: {
          active_role: "reviewer",
          awaited_output_type: "pass_result",
          handoff_id: "reviewer:b_exec_ctx_06:round:2:attempt:1",
          execution_id: "exec_previous_ctx_06",
          round: 2,
          started_at: "2026-03-19T12:00:00.000Z",
          deadline_at: "2026-03-19T12:30:00.000Z",
          attempt: 1
        }
      })
    ).toThrowError(
      new RangeError(
        "restarted execution context requires matching active role: reviewer !== implementer"
      )
    );
  });

  it("rejects restarted contexts when the previous round no longer matches", () => {
    expect(() =>
      buildRestartedExecutionContext({
        bubbleId: "b_exec_ctx_07",
        round: 3,
        activeRole: "implementer",
        restartedAt: "2026-03-19T13:00:00.000Z",
        watchdogTimeoutMinutes: 30,
        previousExecutionContext: {
          active_role: "implementer",
          awaited_output_type: "pass_result",
          handoff_id: "implementer:b_exec_ctx_07:round:2:attempt:1",
          execution_id: "exec_previous_ctx_07",
          round: 2,
          started_at: "2026-03-19T12:00:00.000Z",
          deadline_at: "2026-03-19T12:30:00.000Z",
          attempt: 1
        }
      })
    ).toThrowError(
      new RangeError(
        "restarted execution context requires matching round: 2 !== 3"
      )
    );
  });

  it("rejects restarted contexts when awaited output type diverges from the active role", () => {
    expect(() =>
      buildRestartedExecutionContext({
        bubbleId: "b_exec_ctx_08",
        round: 2,
        activeRole: "implementer",
        restartedAt: "2026-03-19T13:00:00.000Z",
        watchdogTimeoutMinutes: 30,
        previousExecutionContext: {
          active_role: "implementer",
          awaited_output_type: "meta_review_result",
          handoff_id: "implementer:b_exec_ctx_08:round:2:attempt:1",
          execution_id: "exec_previous_ctx_08",
          round: 2,
          started_at: "2026-03-19T12:00:00.000Z",
          deadline_at: "2026-03-19T12:30:00.000Z",
          attempt: 1
        }
      })
    ).toThrowError(
      "restarted execution context requires matching awaited output type: meta_review_result !== pass_result"
    );
  });

  it("treats execution_id as part of canonical same-authority equality", () => {
    const left = buildRunningExecutionContext({
      bubbleId: "b_exec_ctx_09",
      round: 2,
      activeRole: "implementer",
      startedAt: "2026-03-19T12:00:00.000Z",
      watchdogTimeoutMinutes: 30
    });
    const right = {
      ...left,
      execution_id: "exec_different_ctx_09"
    };

    expect(executionContextsEqual(left, right)).toBe(false);
  });
});
