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
  /**
   * Payload-only canonical digest — an op_id-derivation COMPONENT
   * (ADR-004: the op type rides the op_id material separately). NOT
   * the CHK-A1-DIGEST input — that is the type-inclusive
   * deriveEmitDigest (ADR-008 corrected this comment).
   */
  readonly payloadDigest: string;
}

// Domain-separation tags: the surfaces never share an id/digest space.
const ACTOR_EMIT_TAG = "pairflow-v3/actor-emit/v1";
const OPERATOR_TAG = "pairflow-v3/operator/v1";
const EMIT_DIGEST_TAG = "pairflow-v3/emit-digest/v1";

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Canonical serialization: JSON with recursively sorted object keys.
 * Arrays keep their order (order is meaning); everything the
 * serialization cannot pin down is an ERROR, never a silent coercion —
 * semantically identical payloads must hash identically, and a silently
 * dropped undefined property, symbol key, or non-plain object (Date, Map,
 * Set, class instance — all of which Object.entries flattens toward {})
 * would break that promise quietly.
 *
 * PUBLIC EXPORT (packet ch9-p3b, H2): the ONE canonicalization authority in
 * the tree. The actor adapter materializes the dispatched ContextPacket as
 * canonical `packet.json` through exactly this serializer, so the handoff bytes
 * are byte-identical to the material the op-id identity digests. A new name on
 * the existing implementation — internals untouched.
 */
export function canonicalize(value: unknown): string {
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
      // JSON.stringify flattens -0 to "0": {x: -0} would digest AND
      // persist as {x: 0} — reject, never coerce. (Every other finite
      // double round-trips exactly; JSON.parse("-0") can deliver -0.)
      if (Object.is(value, -0)) {
        throw new Error("payload is not canonicalizable: negative zero (flattens to 0)");
      }
      return JSON.stringify(value);
    case "object": {
      if (Array.isArray(value)) {
        // Pin the prototype: Array.isArray is true across prototypes,
        // and a custom array prototype can smuggle a toJSON that
        // rewrites the persisted value (the object branch's hidden-
        // toJSON attack, one lane over). Null-proto arrays reject too —
        // only standard arrays are pinnable.
        if (Object.getPrototypeOf(value) !== Array.prototype) {
          throw new Error(
            "payload is not canonicalizable: array with a non-standard prototype",
          );
        }
        for (let i = 0; i < value.length; i += 1) {
          // OWN property required: `i in value` would let an inherited
          // index silently fill a hole of the own array.
          if (!Object.prototype.hasOwnProperty.call(value, i)) {
            throw new Error(
              `payload is not canonicalizable: sparse array (hole at index ${String(i)})`,
            );
          }
        }
        if (Object.getOwnPropertySymbols(value).length > 0) {
          throw new Error("payload is not canonicalizable: symbol-keyed property on array");
        }
        for (const key of Object.getOwnPropertyNames(value)) {
          if (key === "length") {
            continue;
          }
          const index = Number(key);
          if (!Number.isInteger(index) || index < 0 || index >= value.length || String(index) !== key) {
            throw new Error(
              `payload is not canonicalizable: non-index array property '${key}'`,
            );
          }
          // Indices must be DATA properties: a getter could answer the
          // digest read and the store's stringify read differently.
          // (Non-enumerable indices are fine — array stringify reads by
          // index, not by enumerability.)
          const descriptor = Object.getOwnPropertyDescriptor(value, key);
          if (descriptor !== undefined && !("value" in descriptor)) {
            throw new Error(
              `payload is not canonicalizable: accessor array index '${key}'`,
            );
          }
        }
        return `[${value.map((item) => canonicalize(item)).join(",")}]`;
      }
      const proto: unknown = Object.getPrototypeOf(value);
      if (proto !== Object.prototype && proto !== null) {
        throw new Error(
          `payload is not canonicalizable: non-plain object (${value.constructor?.name ?? "unknown"})`,
        );
      }
      if (Object.getOwnPropertySymbols(value).length > 0) {
        throw new Error("payload is not canonicalizable: symbol-keyed property");
      }
      // Own string properties must be ENUMERABLE DATA properties:
      // Object.entries (and JSON.stringify) are blind to non-enumerable
      // props — a hidden data prop silently vanishes in the round-trip,
      // and a hidden toJSON REWRITES the persisted value behind the
      // digest's back; an accessor could answer the digest read and the
      // stringify read differently.
      for (const key of Object.getOwnPropertyNames(value)) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (descriptor === undefined) {
          continue;
        }
        if (!descriptor.enumerable) {
          throw new Error(
            `payload is not canonicalizable: non-enumerable own property '${key}'`,
          );
        }
        if (!("value" in descriptor)) {
          throw new Error(`payload is not canonicalizable: accessor property '${key}'`);
        }
      }
      const entries = Object.entries(value as Record<string, unknown>)
        .map(([k, v]) => {
          if (v === undefined) {
            throw new Error(`payload is not canonicalizable: undefined property '${k}'`);
          }
          return [k, v] as const;
        })
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
 * The transcript/collision digest (packet ch5-P4; ADR-008 amends
 * ADR-004) — the model's payload_digest unit, schema-less branch:
 * digest_of(type ⊕ canonical(payload)). Material rule: the third
 * element is ALWAYS canonicalize's output STRING; an ABSENT payload is
 * ARITY ([TAG, type]), never a sentinel — so absent ≠ null by
 * construction. The kernel binds this through the DigestSource port;
 * the rung compares it, the commit records it (CHK-A1-DIGEST).
 */
export function deriveEmitDigest(envelope: {
  readonly type: string;
  readonly payload?: unknown;
}): string {
  const material =
    "payload" in envelope
      ? JSON.stringify([EMIT_DIGEST_TAG, envelope.type, canonicalize(envelope.payload)])
      : JSON.stringify([EMIT_DIGEST_TAG, envelope.type]);
  return sha256Hex(material);
}

/**
 * The admission predicate the ingress binds (plan ch-4 aftermath): a
 * payload is admissible exactly when it is canonicalizable — the same
 * acceptance the digest path enforces. Admitted payloads therefore
 * survive the store's JSON round-trip unchanged, and no committed row
 * can ever hold a payload the emit-lib cannot digest (CHK-A1-DIGEST,
 * ch 5).
 */
export function isCanonicalizable(value: unknown): boolean {
  try {
    canonicalize(value);
    return true;
  } catch {
    return false;
  }
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
