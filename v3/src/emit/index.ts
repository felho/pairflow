// emit-lib: op_id derivation in ONE audited implementation (IC-A3).
// Scheme per operation family: ADR-004.
export {
  cryptoNonceSource,
  deriveActorEmitOpId,
  deriveOperatorOpId,
  digestPayload,
  isCanonicalizable,
} from "./opId.js";
export type { ActorEmitIdentity, DerivedActorEmitId, NonceSource, OpId } from "./opId.js";
