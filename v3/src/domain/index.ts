// Domain type layer: targets ledger §4 (51 aggregates / 121 entities) + the
// 85-name rejection type; drift-tested against the ledger (PI-3).
// Chapter-4 content: the l0a + l0b registry slice (packet ch4-P1).
export { REJECTION_NAMES } from "./rejections.js";
export type { RejectionName } from "./rejections.js";
export type { ActorId, EventType, InstanceId, OpId, RoleName, StepId } from "./ids.js";
export type { EpochMillis } from "./time.js";
export type {
  AdmittedTemplate,
  CapabilityProfile,
  Step,
  TemplateRef,
  WorkflowTemplate,
} from "./template.js";
export type {
  EffectiveProcessConfig,
  GateBinding,
  GateDecision,
  GatePipeline,
  GateProjection,
  GateProjectionEntry,
  RetainedGateDecision,
} from "./gate.js";
export type { LifecycleStatus, TranscriptEntry, WorkflowInstance } from "./instance.js";
export type { EventEnvelope } from "./envelope.js";
export type { ContextPacket, DispatchIntent } from "./dispatch.js";
export type { Outcome, Started } from "./outcome.js";
