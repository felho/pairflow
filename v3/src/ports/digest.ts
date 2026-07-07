import type { EventEnvelope } from "../domain/index.js";

/**
 * The transcript/collision digest seam (packet ch5-P4; IC-E culture —
 * the kernel never names the emit-lib). Production binds the emit-lib's
 * deriveEmitDigest (ADR-008, the ONE audited implementation); tests may
 * bind a scripted source. Sync: derivation is pure. The kernel computes
 * ONCE per HANDLE, the rung compares, the commit records.
 */
export type DigestSource = (envelope: EventEnvelope) => string;
