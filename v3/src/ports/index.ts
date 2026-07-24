// Injected dependency interfaces (ADR-001): IC-D / IC-E as types.
export type { EpochMillis, TimeSource } from "./time.js";
export type { EgressAck, EgressAdapter, EgressEffect, IdempotencyKey } from "./egress.js";
export type { ActorAdapter, DispatchIntent } from "./actor.js";
export type {
  GateCatalog,
  GateConfigFinding,
  GateConfigResult,
  GateInvocation,
  GateInvocationHistoryEntry,
  GateInvocationProjection,
  GateRegistration,
  InlineGateRegistration,
  ProcessGateEvidence,
  ProcessGateRegistration,
  ProcessGateRunner,
  ProcessResult,
} from "./gate.js";
export type {
  CommitTransitionInput,
  CommitTransitionResult,
  InstanceDetail,
  StorePort,
} from "./store.js";
export type { DefinitionStore } from "./definition.js";
export type {
  LocalExecutionCapability,
  ProviderRegistry,
  RuntimeContextCompletionSink,
  RuntimeContextProvider,
} from "./runtimeContextProvider.js";
export { createStaticProviderRegistry } from "./runtimeContextProvider.js";
export type { DigestSource } from "./digest.js";
export type { TailWait } from "./tail.js";
export type { RedactionPolicy } from "./redaction.js";
export type {
  DiagnosticEvent,
  DiagnosticEventBody,
  DiagnosticKind,
  DiagnosticSource,
  DiagnosticsReader,
  DiagnosticsSink,
  DiagUnavailableReason,
  ErrandEdge,
  ErrandState,
  IngressDetailToken,
  SpawnOutcome,
} from "./diagnostics.js";
export {
  ATTEMPT_SCOPED_ERRAND_EDGES,
  ERRAND_BIRTH_EDGES,
  ERRAND_EDGES,
  ERRAND_STATES,
  SPAWN_OUTCOMES,
} from "./diagnostics.js";
export type { AttemptExecutor, AttemptExecutorInput, AttemptResult } from "./delivery.js";
