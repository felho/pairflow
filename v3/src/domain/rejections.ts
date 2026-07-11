/**
 * The 54-name rejection registry (ledger §3; 85 → 54 at the ch11
 * gate-admission model fix — the definition-static validate family moved
 * to the definition-issue channel), carried in full from day
 * one (plan §1.4): behavior is scoped by chapters, the NAMES are not.
 * `rejectionNames.test.ts` asserts set equality against the ledger at
 * test time; the ch-5 PI-3 drift test formalizes it. A rejection the
 * code needs but the ledger does not name is a model↔code divergence —
 * mandatory stop, never a code-invented name (README §6).
 */
export const REJECTION_NAMES = [
  "action_result_mismatch",
  "action_result_not_auto_action",
  "action_trigger_mismatch",
  "already_purged",
  "child_lifecycle_not_subscribed",
  "child_link_mismatch",
  "child_link_unknown",
  "child_spawn_already_resolved",
  "decision_request_mismatch",
  "default_mode_undeclared",
  "delete_confirmation_required",
  "gate_blocked",
  "gate_evaluator_unavailable",
  "gate_execution_not_supported",
  "help_not_declared",
  "help_request_mismatch",
  "invalid_field_value",
  "invalid_shape",
  "missing_evidence_ref",
  "missing_required_field",
  "missing_role",
  "missing_version",
  "mode_surface_without_modes",
  "mode_tag_on_unsupported_surface",
  "no_mode_selected",
  "no_resume_transition",
  "no_transition",
  "no_workflow_selected",
  "not_active",
  "not_authorized",
  "not_awaiting_action",
  "not_awaiting_decision",
  "not_awaiting_help",
  "not_awaiting_this_child",
  "not_bare_wait",
  "not_waiting",
  "op_id_collision",
  "operator_not_authorized",
  "override_not_applicable",
  "override_required",
  "resume_event_mismatch",
  "role_not_authorized",
  "runtime_context_provider_unavailable",
  "runtime_context_required_for_process_gate",
  "slot_type_mismatch",
  "task_required",
  "unbound_required_slot",
  "undeclared_mode_tag",
  "unknown_decision",
  "unknown_instance",
  "unknown_mode",
  "unknown_slot",
  "unknown_target",
  "workflow_definition_unavailable",
] as const;

export type RejectionName = (typeof REJECTION_NAMES)[number];
