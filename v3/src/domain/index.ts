// Domain type layer: targets ledger §4 (51 aggregates / 121 entities) + the
// 85-name rejection type; drift-tested against the ledger (PI-3).
// Chapter-4 content: the l0a + l0b registry slice (packet ch4-P1).
export { REJECTION_NAMES } from "./rejections.js";
export type { RejectionName } from "./rejections.js";
export type { ActorId, EventType, InstanceId, OpId, RoleName, StepId } from "./ids.js";
export type { EpochMillis } from "./time.js";
export type {
  AdmittedTemplate,
  AgentConfig,
  CapabilityProfile,
  RuntimeContextRequirement,
  RuntimeContextSpec,
  Step,
  TemplateRef,
  WorkflowTemplate,
} from "./template.js";
export { resolveRuntimeContextRequirement } from "./template.js";
export { PROVISIONING_FAILURE_REASONS } from "./instance.js";
export type {
  EffectiveProcessConfig,
  GateBinding,
  GateDecision,
  GatePipeline,
  GateProjection,
  GateProjectionEntry,
  RetainedGateDecision,
} from "./gate.js";
export type {
  ActivationMode,
  KernelStatus,
  LifecycleFactEntry,
  LifecycleFactKind,
  ProvisioningFailureReason,
  RuntimeContext,
  RuntimeContextCompletion,
  RuntimeContextRef,
  TerminalDisposition,
  TranscriptEntry,
  TransitionEntry,
  WaitReason,
  WorkflowInstance,
} from "./instance.js";
export type { EventEnvelope } from "./envelope.js";
export type { ContextPacket, DispatchIntent, RuntimeContextProjection } from "./dispatch.js";
export type {
  Accepted,
  Activated,
  CancelOutcome,
  CreateOutcome,
  Created,
  FailOutcome,
  KickoffOutcome,
  Outcome,
  RuntimeContextCompletionOutcome,
  RuntimeContextFailedOutcome,
  RuntimeContextReadyOutcome,
  StartOutcome,
  Terminated,
} from "./outcome.js";
