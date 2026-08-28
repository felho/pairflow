// Domain type layer: targets ledger §4 (51 aggregates / 121 entities) + the
// 85-name rejection type; drift-tested against the ledger (PI-3).
// Chapter-4 content: the l0a + l0b registry slice (packet ch4-P1).
export { REJECTION_NAMES } from "./rejections.js";
export type { RejectionName } from "./rejections.js";
export type { ActorId, BlockId, DecisionKey, EventType, InstanceId, OpId, RoleName, StepId, WaitKind } from "./ids.js";
export type { EpochMillis } from "./time.js";
export type {
  AdmittedTemplate,
  AgentConfig,
  CapabilityProfile,
  ContextBlockCatalog,
  DecisionEntry,
  DecisionPayloadFieldSpec,
  RuntimeContextRequirement,
  RuntimeContextSpec,
  Step,
  StepType,
  TemplateRef,
  WaitDeclaration,
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
  DecisionRecommendationSource,
  DecisionRequestEntry,
  DecisionMadeEntry,
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
  WaitResumedEntry,
  WaitReason,
  WorkflowInstance,
} from "./instance.js";
export type { EventEnvelope } from "./envelope.js";
// ch14-p3a (F4): the Ask derivation and the park record it reads, MOVED
// here from `kernel/` so the floor reaches it without a kernel edge.
// `requiredFields` travels WITH the Ask deliberately: the Ask's
// `decisionRequirements` and the submit path's required-payload guard
// must read ONE function.
export { humanDecisionRequest, requiredFields } from "./humanDecisionRequest.js";
export type { DecisionRequestBody } from "./humanDecisionRequest.js";
export type {
  ContextBlock,
  ContextBlockProvenance,
  ContextBlockSource,
  ContextPacket,
  DispatchIntent,
  HumanDecisionContext,
  HumanDecisionRequest,
  RuntimeContextProjection,
} from "./dispatch.js";
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
  ResumeWaitOutcome,
  StartOutcome,
  SubmitDecisionOutcome,
  Terminated,
} from "./outcome.js";
