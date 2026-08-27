import type {
  ActivationMode,
  ActorId,
  AdmittedTemplate,
  AgentConfig,
  BlockId,
  CapabilityProfile,
  ContextBlock,
  ContextBlockCatalog,
  ContextPacket,
  DispatchIntent,
  EventEnvelope,
  DecisionMadeEntry,
  HumanDecisionRequest,
  GateBinding,
  GateDecision,
  GatePipeline,
  GateProjection,
  KernelStatus,
  RejectionName,
  RoleName,
  RuntimeContext,
  RuntimeContextProjection,
  RuntimeContextRef,
  RuntimeContextRequirement,
  Step,
  StepType,
  TerminalDisposition,
  TranscriptEntry,
  WaitReason,
  WorkflowInstance,
  WorkflowTemplate,
  WaitResumedEntry,
} from "../domain/index.js";
// ch11-P2a: the registration descriptor lives in ports/ (the injected
// EXTENSION contract). ADR-007 allows type imports from any source in a
// non-test drift module; witnessing `l2/GateRegistration` needs this
// one new `import type` (the file otherwise imports domain/ only).
import type {
  GateInvocation,
  GateRegistration,
  ProcessGateRunner,
  ProcessResult,
} from "../ports/gate.js";
// ch12-p1b D2: the entry classes' witnesses — the typed kernel entry
// family (the operator-intent inputs; the in-process FAIL member) live
// in kernel/, the same ADR-007 type-import allowance.
import type { CancelInput, CreateInput, Kernel, KickoffInput, StartInput } from "../kernel/index.js";
// ch12-p3 D2: the l0e provider port shapes live in ports/ (the injected
// contract) — the same ADR-007 type-import allowance as the l2/l2a witnesses.
import type { ProviderRegistry, RuntimeContextProvider } from "../ports/runtimeContextProvider.js";
// ch14-p2a K13: the arrival's effect record lives in ports/ (the store's
// transition input is what carries it), reached under the SAME ADR-007
// allowance. K13's prose put this witness in `domain/`; the ground it
// gave — "the drift registry imports only from domain/ at this basis" —
// is measurably false (ports/gate.js and kernel/index.js are imported
// above), so the built placement stands and the prose is corrected in
// the packet's Build record rather than the type being moved.
import type { ArrivalEffect } from "../ports/store.js";

/**
 * The PI-3 domain-registry manifest (packet ch5-P1): every ledger §4
 * entity key → realized / pending / contract-row. The drift test owns
 * the KEY SET (parsed from the ledger at test time); the typecheck owns
 * EXISTENCE — realized rows are bound below via `import type`
 * (RealizedTypeTable) or via `RejectionName` literals, so a vanished or
 * renamed export is a compile error, not a runtime surprise.
 *
 * Classification semantics (LEVEL axis): a row is `realized` when the
 * entity's OWN level is implemented — a later level's row over an
 * existing type (e.g. `l0e/ContextPacket`) stays `pending` until that
 * level is built: the manifest tracks the ladder, not bare name reuse.
 * `pending` carries NO chapter claim — scheduling lives in the plan map.
 * `contract-row` marks §4 prose/contract surfaces that never become a
 * TS type by design. `superseded` (ch12-p1a, additive) marks a row
 * whose realized TS type was RETIRED by a ratified named replacement
 * (C24) — the named successor rows carry the realized witnesses, and
 * the successor keys are compile-checked against the witness table.
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
  readonly "l0a/EventEnvelope": EventEnvelope;
  readonly "l0b/Role": RoleName;
  readonly "l0b/Step": Step;
  readonly "l0b/Actor": ActorId;
  readonly "l0b/WorkflowInstance": WorkflowInstance;
  readonly "l0b/DispatchIntent": DispatchIntent;
  readonly "l0b/ContextPacket": ContextPacket;
  readonly "l1/EventEnvelope": EventEnvelope;
  readonly "l1/ContextPacket": ContextPacket;
  readonly "l1/CapabilityProfile": CapabilityProfile;
  readonly "l2/GateBinding": GateBinding;
  readonly "l2/GatePipeline": GatePipeline;
  readonly "l2/GateRegistration": GateRegistration;
  readonly "l2/GateDecision": GateDecision;
  readonly "l2/AdmittedDefinition": AdmittedTemplate;
  readonly "l2/WorkflowInstance": WorkflowInstance;
  readonly "l2/gate_projection": GateProjection;
  // ch11-P3a T2: the l2a port shapes — the runner and its result value.
  readonly "l2a/ProcessGateRunner": ProcessGateRunner;
  readonly "l2a/ProcessResult": ProcessResult;
  // ch11-P3b T4: the l2a wire value (the C23 invocation document).
  readonly "l2a/GateInvocation": GateInvocation;
  // ch12-p2 D2: the l0c run-profile witnesses — the cascade output type
  // (AgentConfig) + the derived-not-stored effective_agent_config
  // witnessed by the value type it carries; the four name-reuse rows
  // (Role/Step/WorkflowInstance/TranscriptEntry) this packet implements
  // the l0c level over (the l0d-already-realized precedent).
  readonly "l0c/Role": RoleName;
  readonly "l0c/Step": Step;
  readonly "l0c/AgentConfig": AgentConfig;
  readonly "l0c/WorkflowInstance": WorkflowInstance;
  readonly "l0c/TranscriptEntry": TranscriptEntry;
  readonly "l0c/effective_agent_config": AgentConfig;
  // ch12-p1a D3: the l0d lifecycle-axis value objects + the instance
  // aggregate (the axis fields land on WorkflowInstance).
  readonly "l0d/WorkflowInstance": WorkflowInstance;
  readonly "l0d/KernelStatus": KernelStatus;
  readonly "l0d/TerminalDisposition": TerminalDisposition;
  readonly "l0d/WaitReason": WaitReason;
  readonly "l0d/RuntimeContext": RuntimeContext;
  readonly "l0d/RuntimeContextRef": RuntimeContextRef;
  readonly "l0d/ActivationMode": ActivationMode;
  // ch12-p1b D2: the entry classes + the Template activation face.
  readonly "l0d/OperatorIntent": CreateInput | StartInput | KickoffInput | CancelInput;
  readonly "l0d/KernelEvent": Kernel["fail"];
  readonly "l0d/ActorEnvelope": EventEnvelope;
  readonly "l0d/Template": WorkflowTemplate;
  // ch12-p3 D2: the l0e provider-contract witnesses. `Template`/`ContextPacket`
  // /`RuntimeContextRef` are name-reuse rows (the multi-level witness
  // convention — the runtimeContext raw field / the projection field / the
  // l0d ref reused at l0e).
  readonly "l0e/Template": WorkflowTemplate;
  readonly "l0e/ContextPacket": ContextPacket;
  readonly "l0e/RuntimeContextProvider": RuntimeContextProvider;
  readonly "l0e/ProviderRegistry": ProviderRegistry;
  readonly "l0e/RuntimeContextProjection": RuntimeContextProjection;
  readonly "l0e/RuntimeContextRef": RuntimeContextRef;
  readonly "l0e/RuntimeContextRequirement": RuntimeContextRequirement;
  // ch13-p1a (ch13v2-C13): the definition side's two l2b rows.
  readonly "l2b/context_blocks catalog": ContextBlockCatalog;
  readonly "l2b/ContextBlockRef": BlockId;
  // ch13-p1b: the render side's row — its witness is the type the
  // packet's `contextBlocks` members carry.
  readonly "l2b/ContextBlock": ContextBlock;
  // ch14-p1 (ch14-C1): the definition side's l3 row. The witness is the
  // step-class discriminator's own token union at FIELD grain — the
  // shared `Step` interface would be satisfied by every agent step and
  // would witness nothing.
  readonly "l3/human_gate": StepType;
  // ch14-p2a K13, bound at the aftermath fold: the row's VERBATIM pin in
  // the drift test compares a STRING, so on its own it cannot see the
  // type it names disappear. These two bindings are what make "pinned to
  // its realized type name" a compile-checked claim rather than a
  // spelling. The arrival's witness is its EFFECT RECORD, not the
  // function — the record is what the port carries and what the brand
  // protects, so it is the thing a drift check can actually compare.
  readonly "l3/apply_target_entry_effects(...)": ArrivalEffect;
  readonly "l3/HumanDecisionRequest": HumanDecisionRequest;
  // ch14-p2b Q12: the two rows this packet flips, each BOUND here as
  // well as pinned verbatim in the registry — that binding is stated as
  // a REQUIREMENT because the sibling packet's flip landed as a string
  // with no binding and the aftermath had to add it. A renamed or
  // vanished witness is now a COMPILE error rather than a stale string.
  //
  // The DECISION_REQUEST / DECISION_MADE row flips only NOW, when BOTH
  // members have writers: half of it existed after p2a, and a flip on
  // half a pair is the error this care exists to avoid.
  readonly "l3/wait step + RESUME_WAIT": WaitResumedEntry;
  readonly "l3/DECISION_REQUEST / DECISION_MADE": DecisionMadeEntry;
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
  | { readonly kind: "contract-row" }
  | {
      /**
       * ch12-p1a D2: an ADDITIVE extension of the level-axis semantics —
       * a row whose TS type existed and was RETIRED by a ratified named
       * replacement (C24): the type no longer exists BY DESIGN, and the
       * named successor rows carry the realized witnesses. Distinct from
       * `contract-row` (whose definition is "never becomes a TS type by
       * design" — false for a row realized since ch 4) and from a dead
       * witness alias (the surviving parallel path C24 forbids).
       */
      readonly kind: "superseded";
      /**
       * The successor registry keys — typed against RealizedTypeTable
       * so a renamed or vanished successor is a compile error (the
       * referential-integrity obligation, red-on-break).
       */
      readonly successors: readonly (keyof RealizedTypeTable)[];
    };

export const DOMAIN_REGISTRY: Readonly<Record<string, RegistryEntry>> = {
  // ── l0a (7) ────────────────────────────────────────────────────────
  "l0a/WorkflowTemplate": { kind: "realized", typeName: "WorkflowTemplate" },
  "l0a/Step": { kind: "realized", typeName: "Step" },
  "l0a/Role": { kind: "realized", typeName: "RoleName" },
  "l0a/WorkflowInstance": { kind: "realized", typeName: "WorkflowInstance" },
  "l0a/Transcript": { kind: "realized", typeName: "TranscriptEntry" },
  // ch12-p1a D2: the LifecycleStatus type RETIRED under C24's named
  // replacement — the two-axis successors carry the realized witnesses.
  "l0a/LifecycleStatus": {
    kind: "superseded",
    successors: ["l0d/KernelStatus", "l0d/TerminalDisposition"],
  },
  "l0a/EventEnvelope": { kind: "realized", typeName: "EventEnvelope" },
  // ── l0b (6) ────────────────────────────────────────────────────────
  "l0b/Role": { kind: "realized", typeName: "RoleName" },
  "l0b/Step": { kind: "realized", typeName: "Step" },
  "l0b/Actor": { kind: "realized", typeName: "ActorId" },
  "l0b/WorkflowInstance": { kind: "realized", typeName: "WorkflowInstance" },
  "l0b/DispatchIntent": { kind: "realized", typeName: "DispatchIntent" },
  "l0b/ContextPacket": { kind: "realized", typeName: "ContextPacket" },
  // ── l0c (6) — the run profile: realized at ch12-p2 (the cascade +
  // the effective/issued provenance over the existing aggregates) ──────
  "l0c/Role": { kind: "realized", typeName: "RoleName" },
  "l0c/Step": { kind: "realized", typeName: "Step" },
  "l0c/AgentConfig": { kind: "realized", typeName: "AgentConfig" },
  "l0c/WorkflowInstance": { kind: "realized", typeName: "WorkflowInstance" },
  "l0c/TranscriptEntry": { kind: "realized", typeName: "TranscriptEntry" },
  // effective_agent_config is derived-not-stored; its faithful witness is
  // AgentConfig, the value type it carries (D2).
  "l0c/effective_agent_config": { kind: "realized", typeName: "AgentConfig" },
  // ── l0d (13) ───────────────────────────────────────────────────────
  // ch12-p1a D3: the lifecycle-axis value objects + the instance
  // aggregate flip realized (the axis fields land on WorkflowInstance).
  // ch12-p1b D2: the entry classes (the wire family + the typed kernel
  // entries; ActorEnvelope's l0d face IS the joins-under-the-
  // discriminator routing) and the Template activation face flip —
  // every ledger §4 l0d row is realized after P1b.
  "l0d/WorkflowInstance": { kind: "realized", typeName: "WorkflowInstance" },
  "l0d/Template": { kind: "realized", typeName: "WorkflowTemplate" },
  "l0d/KernelStatus": { kind: "realized", typeName: "KernelStatus" },
  "l0d/TerminalDisposition": { kind: "realized", typeName: "TerminalDisposition" },
  "l0d/WaitReason": { kind: "realized", typeName: "WaitReason" },
  "l0d/RuntimeContext": { kind: "realized", typeName: "RuntimeContext" },
  "l0d/RuntimeContextRef": { kind: "realized", typeName: "RuntimeContextRef" },
  "l0d/ActivationMode": { kind: "realized", typeName: "ActivationMode" },
  "l0d/OperatorIntent": {
    kind: "realized",
    typeName: "CreateInput | StartInput | KickoffInput | CancelInput",
  },
  "l0d/KernelEvent": { kind: "realized", typeName: "Kernel[\"fail\"]" },
  "l0d/ActorEnvelope": { kind: "realized", typeName: "EventEnvelope" },
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
  // ── l0e (8) — the provider contract: realized at ch12-p3 (the port +
  // registry + projection + requirement types; the runtimeContext raw/
  // projection fields; the l0d ref reused at l0e) ──────────────────────
  "l0e/Template": { kind: "realized", typeName: "WorkflowTemplate" },
  "l0e/ContextPacket": { kind: "realized", typeName: "ContextPacket" },
  "l0e/RuntimeContextProvider": { kind: "realized", typeName: "RuntimeContextProvider" },
  "l0e/ProviderRegistry": { kind: "realized", typeName: "ProviderRegistry" },
  "l0e/RuntimeContextProjection": { kind: "realized", typeName: "RuntimeContextProjection" },
  "l0e/RuntimeContextRef": { kind: "realized", typeName: "RuntimeContextRef" },
  "l0e/RuntimeContextRequirement": { kind: "realized", typeName: "RuntimeContextRequirement" },
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
  "l1/EventEnvelope": { kind: "realized", typeName: "EventEnvelope" },
  "l1/ContextPacket": { kind: "realized", typeName: "ContextPacket" },
  "l1/CapabilityProfile": { kind: "realized", typeName: "CapabilityProfile" },
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
  // ── l2 (10) ─────────────────────────────────────────────────────────
  "l2/GateBinding": { kind: "realized", typeName: "GateBinding" },
  "l2/GatePipeline": { kind: "realized", typeName: "GatePipeline" },
  "l2/GateRegistration": { kind: "realized", typeName: "GateRegistration" },
  "l2/GateDecision": { kind: "realized", typeName: "GateDecision" },
  "l2/AdmittedDefinition": { kind: "realized", typeName: "AdmittedTemplate" },
  // ch11-P2c T4: the load-bearing half (the reconstructable-round claim,
  // deferred by name at P2b) is realized by K1 + the checker (T1).
  "l2/WorkflowInstance": { kind: "realized", typeName: "WorkflowInstance" },
  "l2/gate_projection": { kind: "realized", typeName: "GateProjection" },
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
  // ch11-P3a T2: the port shapes flip with type witnesses. ch11-P3b T4:
  // GateInvocation (the C23 wire value) flips realized with its type witness.
  "l2a/ProcessGateRunner": { kind: "realized", typeName: "ProcessGateRunner" },
  "l2a/GateInvocation": { kind: "realized", typeName: "GateInvocation" },
  "l2a/ProcessResult": { kind: "realized", typeName: "ProcessResult" },
  // ── l2b (3) ────────────────────────────────────────────────────────
  // ch13-p1a: the definition side flips both rows with the type names
  // ch13v2-C13 assigns them. ch13-p1b flips the third with the render
  // side's packet member type.
  "l2b/context_blocks catalog": { kind: "realized", typeName: "ContextBlockCatalog" },
  "l2b/ContextBlockRef": { kind: "realized", typeName: "BlockId" },
  "l2b/ContextBlock": { kind: "realized", typeName: "ContextBlock" },
  // ── l3 (5) ─────────────────────────────────────────────────────────
  "l3/wait step + RESUME_WAIT": { kind: "realized", typeName: "WaitResumedEntry" },
  // ch14-p1: the definition side flips the `human_gate` row with the
  // FIELD-grain type witness ch14-C1 mints — the step-class discriminator
  // union, not the shared `Step` interface every agent step already
  // satisfies (which would make the row vacuous). The other four l3 rows
  // are ch14-P2's by their own C-rows.
  "l3/human_gate": { kind: "realized", typeName: "StepType" },
  // ch14-p2a (K13): the two rows this packet realizes, each pinned
  // VERBATIM to its realized name — the registry test pins KEY SETS and
  // not dispositions, so a wrong-but-existing target would otherwise
  // stay green on the generic lane.
  //
  // The arrival's witness is its EFFECT RECORD rather than the function:
  // the record is what the port carries and what the brand protects, so
  // pinning it is what a drift check can actually compare.
  "l3/apply_target_entry_effects(...)": { kind: "realized", typeName: "ArrivalEffect" },
  "l3/HumanDecisionRequest": { kind: "realized", typeName: "HumanDecisionRequest" },
  "l3/DECISION_REQUEST / DECISION_MADE": { kind: "realized", typeName: "DecisionMadeEntry" },
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
  // the ledger token "Definition issues (child_5-tuple)" normalizes to the
  // space-paren-stripped key (the parser's qualifier rule) — the five names
  // live as admission ISSUE codes now, no RejectionName binding
  "l4-child/Definition issues": { kind: "pending" },
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
  "l0a/EventEnvelope",
  "l0b/Role",
  "l0b/Step",
  "l0b/Actor",
  "l0b/WorkflowInstance",
  "l0b/DispatchIntent",
  "l0b/ContextPacket",
  "l0c/Role",
  "l0c/Step",
  "l0c/AgentConfig",
  "l0c/WorkflowInstance",
  "l0c/TranscriptEntry",
  "l0c/effective_agent_config",
  "l1/EventEnvelope",
  "l1/ContextPacket",
  "l1/CapabilityProfile",
  "l2/GateBinding",
  "l2/GatePipeline",
  "l2/GateRegistration",
  "l2/GateDecision",
  "l2/AdmittedDefinition",
  "l2/WorkflowInstance",
  "l2/gate_projection",
  "l2a/ProcessGateRunner",
  "l2a/ProcessResult",
  "l2a/GateInvocation",
  "l0d/WorkflowInstance",
  "l0d/KernelStatus",
  "l0d/TerminalDisposition",
  "l0d/WaitReason",
  "l0d/RuntimeContext",
  "l0d/RuntimeContextRef",
  "l0d/ActivationMode",
  "l0d/OperatorIntent",
  "l0d/KernelEvent",
  "l0d/ActorEnvelope",
  "l0d/Template",
  "l0e/Template",
  "l0e/ContextPacket",
  "l0e/RuntimeContextProvider",
  "l0e/ProviderRegistry",
  "l0e/RuntimeContextProjection",
  "l0e/RuntimeContextRef",
  "l0e/RuntimeContextRequirement",
  "l2b/context_blocks catalog",
  "l2b/ContextBlockRef",
  "l2b/ContextBlock",
  "l3/human_gate",
  "l3/apply_target_entry_effects(...)",
  "l3/HumanDecisionRequest",
  "l3/wait step + RESUME_WAIT",
  "l3/DECISION_REQUEST / DECISION_MADE",
] as const satisfies readonly (keyof RealizedTypeTable)[];

type TypeTableFullyListed =
  Exclude<keyof RealizedTypeTable, (typeof REALIZED_TYPE_TABLE_KEYS)[number]> extends never
    ? true
    : never;
export const typeTableFullyListed: TypeTableFullyListed = true;
