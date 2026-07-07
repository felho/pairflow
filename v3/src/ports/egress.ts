/** The idempotency key carried across the egress boundary (IC-A2). */
export type IdempotencyKey = string;

/**
 * Outbound effect. The payload is opaque by design (plan §3.1
 * no-mini-domain rule): concrete effect shapes are ledger-owned and land
 * with their owning chapters.
 */
export interface EgressEffect {
  readonly kind: string;
  readonly payload: unknown;
}

/**
 * IC-A2: a no-error/no-ack outcome is a distinct non-terminal state,
 * never success.
 */
export type EgressAck =
  | { readonly status: "confirmed" }
  | { readonly status: "no_ack" }
  | { readonly status: "failed"; readonly reason: string };

/**
 * CHK-A2-IDEMKEY: the send signature REQUIRES the idempotency key — an
 * adapter cannot be implemented without accepting it.
 */
export interface EgressAdapter {
  send(effect: EgressEffect, idempotencyKey: IdempotencyKey): Promise<EgressAck>;
}
