// Injected dependency interfaces (ADR-001): IC-D / IC-E as types.
// StorePort content is chapter-4 work.
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
