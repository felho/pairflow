import { createHash, randomUUID } from "node:crypto";

/**
 * The emit-lib: op_id derivation in ONE audited implementation (IC-A3),
 * shared by the scripted actor (ch 3) and the operator CLI (ch 6).
 * Scheme per operation family: ADR-004.
 */
export type OpId = string;

export interface ActorEmitIdentity {
  readonly instanceId: string;
  readonly contextPacketId: string;
  readonly opType: string;
  readonly payload: unknown;
}

export interface DerivedActorEmitId {
  readonly opId: OpId;
  /** Canonical payload digest — the CHK-A1-DIGEST input (ch 5). */
  readonly payloadDigest: string;
}

// Domain-separation tags: the two families never share an id space.
const ACTOR_EMIT_TAG = "pairflow-v3/actor-emit/v1";
const OPERATOR_TAG = "pairflow-v3/operator/v1";

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Canonical serialization: JSON with recursively sorted object keys.
 * Arrays keep their order (order is meaning); non-JSON values are an
 * error, never a silent coercion — semantically identical payloads must
 * hash identically, and anything the serialization cannot pin down would
 * break that promise quietly.
 */
function canonicalize(value: unknown): string {
  if (value === null) {
    return "null";
  }
  switch (typeof value) {
    case "boolean":
    case "string":
      return JSON.stringify(value);
    case "number":
      if (!Number.isFinite(value)) {
        throw new Error(`payload is not canonicalizable: non-finite number ${String(value)}`);
      }
      return JSON.stringify(value);
    case "object": {
      if (Array.isArray(value)) {
        return `[${value.map((item) => canonicalize(item)).join(",")}]`;
      }
      const entries = Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`);
      return `{${entries.join(",")}}`;
    }
    default:
      throw new Error(`payload is not canonicalizable: ${typeof value}`);
  }
}

export function digestPayload(payload: unknown): string {
  return sha256Hex(canonicalize(payload));
}

/**
 * Actor-emit family: content-addressed (ADR-004). Retransmission
 * reproduces the same op_id by construction; a refresh after Stale starts
 * from a NEW context packet and therefore derives a new op_id. The
 * identity components are bound as a JSON array — the encoding is
 * unambiguous, so no field can bleed into its neighbor.
 */
export function deriveActorEmitOpId(identity: ActorEmitIdentity): DerivedActorEmitId {
  const payloadDigest = digestPayload(identity.payload);
  const material = JSON.stringify([
    ACTOR_EMIT_TAG,
    identity.instanceId,
    identity.contextPacketId,
    identity.opType,
    payloadDigest,
  ]);
  return { opId: `op_${sha256Hex(material)}`, payloadDigest };
}

/**
 * Operator/CLI verb family: request-scoped nonce (ADR-004). The nonce is
 * generated ONCE per logical invocation (see NonceSource) and reused
 * across retries within it; the op_id is a pure function of the nonce.
 */
export function deriveOperatorOpId(nonce: string): OpId {
  if (nonce.length === 0) {
    throw new Error("operator op_id requires a non-empty nonce");
  }
  return `op_${sha256Hex(JSON.stringify([OPERATOR_TAG, nonce]))}`;
}

/**
 * The nonce source is injected: production binds cryptoNonceSource; tests
 * bind a deterministic source (the testkit no-randomness lint stands
 * because of exactly this seam).
 */
export type NonceSource = () => string;

export const cryptoNonceSource: NonceSource = () => randomUUID();
