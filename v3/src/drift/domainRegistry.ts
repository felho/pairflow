import type {
  ActorId,
  ContextPacket,
  DispatchIntent,
  EventEnvelope,
  LifecycleStatus,
  RejectionName,
  RoleName,
  Step,
  TranscriptEntry,
  WorkflowInstance,
  WorkflowTemplate,
} from "../domain/index.js";

/**
 * The PI-3 domain-registry manifest (packet ch5-P1): every ledger §4
 * entity key → realized / pending / contract-row. The drift test owns
 * the KEY SET (parsed from the ledger at test time); the typecheck owns
 * EXISTENCE — realized rows are bound below via `import type`
 * (RealizedTypeTable) or via `RejectionName` literals, so a vanished or
 * renamed export is a compile error, not a runtime surprise.
 *
 * Classification semantics (LEVEL axis): a row is `realized` when the
 * entity's OWN level is implemented (l0a + l0b today) — a later level's
 * row over an existing type (e.g. `l0c/WorkflowInstance`, run overrides)
 * stays `pending`: the manifest tracks the ladder, not bare name reuse.
 * `pending` carries NO chapter claim — scheduling lives in the plan map.
 * `contract-row` marks §4 prose/contract surfaces that never become a
 * TS type by design.
 *
 * ADR-007: this is a NON-test drift module — `import type` only.
 */

/**
 * Compile-time witnesses for the realized non-rejection rows: the value
 * type after the `:` is the proof. `l0a/Transcript` is witnessed by
 * TranscriptEntry (the append-only history's row type); `l0a/Role` and
 * `l0b/Role` by RoleName (the l0b actor defaults live on
 * WorkflowTemplate.roles); `l0b/Actor` by ActorId.
 */
interface RealizedTypeTable {
  readonly "l0a/WorkflowTemplate": WorkflowTemplate;
  readonly "l0a/Step": Step;
  readonly "l0a/Role": RoleName;
  readonly "l0a/WorkflowInstance": WorkflowInstance;
  readonly "l0a/Transcript": TranscriptEntry;
  readonly "l0a/LifecycleStatus": LifecycleStatus;
  readonly "l0a/EventEnvelope": EventEnvelope;
  readonly "l0b/Role": RoleName;
  readonly "l0b/Step": Step;
  readonly "l0b/Actor": ActorId;
  readonly "l0b/WorkflowInstance": WorkflowInstance;
  readonly "l0b/DispatchIntent": DispatchIntent;
  readonly "l0b/ContextPacket": ContextPacket;
}

export type RegistryEntry =
  | {
      readonly kind: "realized";
      /** The exported name that witnesses the row (RealizedTypeTable). */
      readonly typeName: string;
    }
  | {
      readonly kind: "realized";
      readonly typeName: "RejectionName";
      /**
       * Rejected(...) rows: the union members that witness the row —
       * typed against RejectionName, so a name leaving the union is a
       * compile error (the union carries all 85 from day one, ch 4).
       */
      readonly rejectionNames: readonly RejectionName[];
    }
  | { readonly kind: "pending" }
  | { readonly kind: "contract-row" };

export const DOMAIN_REGISTRY: Readonly<Record<string, RegistryEntry>> = {
  // ── l0a (7) ────────────────────────────────────────────────────────
  "l0a/WorkflowTemplate": { kind: "realized", typeName: "WorkflowTemplate" },
  "l0a/Step": { kind: "realized", typeName: "Step" },
  "l0a/Role": { kind: "realized", typeName: "RoleName" },
  "l0a/WorkflowInstance": { kind: "realized", typeName: "WorkflowInstance" },
  "l0a/Transcript": { kind: "realized", typeName: "TranscriptEntry" },
  "l0a/LifecycleStatus": { kind: "realized", typeName: "LifecycleStatus" },
  "l0a/EventEnvelope": { kind: "realized", typeName: "EventEnvelope" },
  // ── l0b (6) ────────────────────────────────────────────────────────
  "l0b/Role": { kind: "realized", typeName: "RoleName" },
  "l0b/Step": { kind: "realized", typeName: "Step" },
  "l0b/Actor": { kind: "realized", typeName: "ActorId" },
  "l0b/WorkflowInstance": { kind: "realized", typeName: "WorkflowInstance" },
  "l0b/DispatchIntent": { kind: "realized", typeName: "DispatchIntent" },
  "l0b/ContextPacket": { kind: "realized", typeName: "ContextPacket" },
  // ── l0c (6) — run profile / overrides: the level is unbuilt ───────
  "l0c/Role": { kind: "pending" },
  "l0c/Step": { kind: "pending" },
  "l0c/AgentConfig": { kind: "pending" },
  "l0c/WorkflowInstance": { kind: "pending" },
  "l0c/TranscriptEntry": { kind: "pending" },
  "l0c/effective_agent_config": { kind: "pending" },
  // ── l0d (13) ───────────────────────────────────────────────────────
  "l0d/WorkflowInstance": { kind: "pending" },
  "l0d/Template": { kind: "pending" },
  "l0d/KernelStatus": { kind: "pending" },
  "l0d/TerminalDisposition": { kind: "pending" },
  "l0d/WaitReason": { kind: "pending" },
  "l0d/RuntimeContext": { kind: "pending" },
  "l0d/RuntimeContextRef": { kind: "pending" },
  "l0d/ActivationMode": { kind: "pending" },
  "l0d/OperatorIntent": { kind: "pending" },
  "l0d/KernelEvent": { kind: "pending" },
  "l0d/ActorEnvelope": { kind: "pending" },
  "l0d/Rejected(not_active)": {
    kind: "realized",
    typeName: "RejectionName",
    rejectionNames: ["not_active"],
  },
  "l0d/Rejected(task_required)": {
    kind: "realized",
    typeName: "RejectionName",
    rejectionNames: ["task_required"],
  },
  // ── l0e (8) ────────────────────────────────────────────────────────
  "l0e/Template": { kind: "pending" },
  "l0e/ContextPacket": { kind: "pending" },
  "l0e/RuntimeContextProvider": { kind: "pending" },
  "l0e/ProviderRegistry": { kind: "pending" },
  "l0e/RuntimeContextProjection": { kind: "pending" },
  "l0e/RuntimeContextRef": { kind: "pending" },
  "l0e/RuntimeContextRequirement": { kind: "pending" },
  "l0e/Rejected(runtime_context_provider_unavailable)": {
    kind: "realized",
    typeName: "RejectionName",
    rejectionNames: ["runtime_context_provider_unavailable"],
  },
  // ── l0f (13) ───────────────────────────────────────────────────────
  "l0f/Template": { kind: "pending" },
  "l0f/SlotDeclaration": { kind: "pending" },
  "l0f/ProjectConfig": { kind: "pending" },
  "l0f/WorkflowSource": { kind: "pending" },
  "l0f/StartCommand": { kind: "pending" },
  "l0f/ResolvedDefinition": { kind: "pending" },
  "l0f/ResolvedStartRequest": { kind: "pending" },
  "l0f/Rejected(no_workflow_selected)": {
    kind: "realized",
    typeName: "RejectionName",
    rejectionNames: ["no_workflow_selected"],
  },
  "l0f/Rejected(workflow_definition_unavailable)": {
    kind: "realized",
    typeName: "RejectionName",
    rejectionNames: ["workflow_definition_unavailable"],
  },
  "l0f/Rejected(unknown_target(t))": {
    kind: "realized",
    typeName: "RejectionName",
    rejectionNames: ["unknown_target"],
  },
  "l0f/Rejected(unknown_slot(key))": {
    kind: "realized",
    typeName: "RejectionName",
    rejectionNames: ["unknown_slot"],
  },
  "l0f/Rejected(unbound_required_slot(id))": {
    kind: "realized",
    typeName: "RejectionName",
    rejectionNames: ["unbound_required_slot"],
  },
  "l0f/Rejected(slot_type_mismatch(id))": {
    kind: "realized",
    typeName: "RejectionName",
    rejectionNames: ["slot_type_mismatch"],
  },
  // ── l1 (6) ─────────────────────────────────────────────────────────
  "l1/EventEnvelope": { kind: "pending" },
  "l1/ContextPacket": { kind: "pending" },
  "l1/CapabilityProfile": { kind: "pending" },
  "l1/Rejected(missing_role)": {
    kind: "realized",
    typeName: "RejectionName",
    rejectionNames: ["missing_role"],
  },
  "l1/Rejected(role_not_authorized)": {
    kind: "realized",
    typeName: "RejectionName",
    rejectionNames: ["role_not_authorized"],
  },
  "l1/Rejected(not_authorized)": {
    kind: "realized",
    typeName: "RejectionName",
    rejectionNames: ["not_authorized"],
  },
  // ── l2 (9) ─────────────────────────────────────────────────────────
  "l2/GateBinding": { kind: "pending" },
  "l2/GatePipeline": { kind: "pending" },
  "l2/GateEvaluator": { kind: "pending" },
  "l2/GateDecision": { kind: "pending" },
  "l2/WorkflowInstance": { kind: "pending" },
  "l2/gate_projection": { kind: "pending" },
  "l2/Rejected(gate_blocked(reason))": {
    kind: "realized",
    typeName: "RejectionName",
    rejectionNames: ["gate_blocked"],
  },
  "l2/Rejected(gate_evaluator_unavailable)": {
    kind: "realized",
    typeName: "RejectionName",
    rejectionNames: ["gate_evaluator_unavailable"],
  },
  "l2/Rejected(gate_execution_not_supported)": {
    kind: "realized",
    typeName: "RejectionName",
    rejectionNames: ["gate_execution_not_supported"],
  },
  // ── l2a (3) ────────────────────────────────────────────────────────
  "l2a/ProcessGateRunner": { kind: "pending" },
  "l2a/GateInvocation": { kind: "pending" },
  "l2a/ProcessResult": { kind: "pending" },
  // ── l2b (3) ────────────────────────────────────────────────────────
  "l2b/context_blocks catalog": { kind: "pending" },
  "l2b/ContextBlockRef": { kind: "pending" },
  "l2b/ContextBlock": { kind: "pending" },
  // ── l3 (5) ─────────────────────────────────────────────────────────
  "l3/wait step + RESUME_WAIT": { kind: "pending" },
  "l3/human_gate": { kind: "pending" },
  "l3/apply_target_entry_effects(...)": { kind: "pending" },
  "l3/HumanDecisionRequest": { kind: "pending" },
  "l3/DECISION_REQUEST / DECISION_MADE": { kind: "pending" },
  // ── storage-scope (2) — the sealed-projection contract's rows ─────
  "storage-scope/shape": { kind: "contract-row" },
  "storage-scope/constraints": { kind: "contract-row" },
  // ── runtime-teardown (8) ───────────────────────────────────────────
  // The three policy values will realize as members of a future policy
  // union (the RejectionName pattern) — pending, not contract-row.
  "runtime-teardown/policy: required": { kind: "pending" },
  "runtime-teardown/policy: retained": { kind: "pending" },
  "runtime-teardown/policy: external": { kind: "pending" },
  "runtime-teardown/load-time rule": { kind: "contract-row" },
  "runtime-teardown/declared, per policy": { kind: "contract-row" },
  "runtime-teardown/terminal is an event, not a default": { kind: "contract-row" },
  "runtime-teardown/deferred": { kind: "contract-row" },
  "runtime-teardown/not the API": { kind: "contract-row" },
  // ── workflow-actions (3) ───────────────────────────────────────────
  "workflow-actions/routing map": { kind: "pending" },
  "workflow-actions/selector": { kind: "contract-row" },
  "workflow-actions/ActionRequest": { kind: "pending" },
  // ── l0f-mode (9) ───────────────────────────────────────────────────
  "l0f-mode/modes / default_mode": { kind: "pending" },
  "l0f-mode/modes: membership tag": { kind: "pending" },
  "l0f-mode/mode-specific gate binding": { kind: "pending" },
  "l0f-mode/Rejected(no_mode_selected)": {
    kind: "realized",
    typeName: "RejectionName",
    rejectionNames: ["no_mode_selected"],
  },
  "l0f-mode/Rejected(unknown_mode(m))": {
    kind: "realized",
    typeName: "RejectionName",
    rejectionNames: ["unknown_mode"],
  },
  "l0f-mode/Rejected(default_mode_undeclared)": {
    kind: "realized",
    typeName: "RejectionName",
    rejectionNames: ["default_mode_undeclared"],
  },
  "l0f-mode/Rejected(undeclared_mode_tag(t))": {
    kind: "realized",
    typeName: "RejectionName",
    rejectionNames: ["undeclared_mode_tag"],
  },
  "l0f-mode/Rejected(mode_tag_on_unsupported_surface)": {
    kind: "realized",
    typeName: "RejectionName",
    rejectionNames: ["mode_tag_on_unsupported_surface"],
  },
  "l0f-mode/Rejected(mode_surface_without_modes)": {
    kind: "realized",
    typeName: "RejectionName",
    rejectionNames: ["mode_surface_without_modes"],
  },
  // ── l4-child (10) ──────────────────────────────────────────────────
  "l4-child/SpawnIntent": { kind: "pending" },
  "l4-child/CHILD_SPAWNED": { kind: "pending" },
  "l4-child/CHILD_SPAWN_FAILED": { kind: "pending" },
  "l4-child/CHILD_LIFECYCLE": { kind: "pending" },
  "l4-child/Rejected(child_link_unknown)": {
    kind: "realized",
    typeName: "RejectionName",
    rejectionNames: ["child_link_unknown"],
  },
  "l4-child/Rejected(child_link_mismatch)": {
    kind: "realized",
    typeName: "RejectionName",
    rejectionNames: ["child_link_mismatch"],
  },
  "l4-child/Rejected(not_awaiting_this_child)": {
    kind: "realized",
    typeName: "RejectionName",
    rejectionNames: ["not_awaiting_this_child"],
  },
  "l4-child/Rejected(child_lifecycle_not_subscribed)": {
    kind: "realized",
    typeName: "RejectionName",
    rejectionNames: ["child_lifecycle_not_subscribed"],
  },
  "l4-child/Rejected(child_template_ref_unresolved / child_key_missing / child_wait_for_empty / child_wait_for_incomplete / child_wait_target_unresolved)":
    {
      kind: "realized",
      typeName: "RejectionName",
      rejectionNames: [
        "child_template_ref_unresolved",
        "child_key_missing",
        "child_wait_for_empty",
        "child_wait_for_incomplete",
        "child_wait_target_unresolved",
      ],
    },
  "l4-child/Rejected(child_spawn_already_resolved)": {
    kind: "realized",
    typeName: "RejectionName",
    rejectionNames: ["child_spawn_already_resolved"],
  },
  // ── l5 (5) ─────────────────────────────────────────────────────────
  "l5/help_pending": { kind: "pending" },
  "l5/HELP_REQUEST / HELP_REPLIED": { kind: "pending" },
  "l5/HelpRequest": { kind: "pending" },
  "l5/step.help": { kind: "pending" },
  "l5/stay": { kind: "pending" },
  // ── emit-contract (5) ──────────────────────────────────────────────
  "emit-contract/EmitContract": { kind: "pending" },
  "emit-contract/vocabularies": { kind: "pending" },
  "emit-contract/gate family": { kind: "pending" },
  "emit-contract/payload_digest": { kind: "pending" },
  "emit-contract/op_contracts": { kind: "pending" },
};

/**
 * Every RealizedTypeTable key must appear in the registry as a realized
 * row, and vice versa for non-rejection realized rows — kept in sync by
 * this exported witness list: each element must BE a table key
 * (satisfies), and the Exclude assert below fails compilation if a table
 * key is missing from the list.
 */
export const REALIZED_TYPE_TABLE_KEYS = [
  "l0a/WorkflowTemplate",
  "l0a/Step",
  "l0a/Role",
  "l0a/WorkflowInstance",
  "l0a/Transcript",
  "l0a/LifecycleStatus",
  "l0a/EventEnvelope",
  "l0b/Role",
  "l0b/Step",
  "l0b/Actor",
  "l0b/WorkflowInstance",
  "l0b/DispatchIntent",
  "l0b/ContextPacket",
] as const satisfies readonly (keyof RealizedTypeTable)[];

type TypeTableFullyListed =
  Exclude<keyof RealizedTypeTable, (typeof REALIZED_TYPE_TABLE_KEYS)[number]> extends never
    ? true
    : never;
export const typeTableFullyListed: TypeTableFullyListed = true;
