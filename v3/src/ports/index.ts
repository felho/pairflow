// Injected dependency interfaces (ADR-001): IC-D / IC-E as types.
export type { EpochMillis, TimeSource } from "./time.js";
export type { EgressAck, EgressAdapter, EgressEffect, IdempotencyKey } from "./egress.js";
export type { ActorAdapter, DispatchIntent } from "./actor.js";
export type {
  GateRunner,
  GateSpec,
  GateVerdict,
  ProcessResult,
  ProcessRunner,
  ProcessSpec,
} from "./gate.js";
export type {
  CommitTransitionInput,
  CommitTransitionResult,
  InstanceDetail,
  StorePort,
} from "./store.js";
export type { DefinitionStore } from "./definition.js";
export type { DigestSource } from "./digest.js";
export type { TailWait } from "./tail.js";
