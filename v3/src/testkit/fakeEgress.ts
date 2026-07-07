import type { EgressAck, EgressAdapter, EgressEffect, IdempotencyKey } from "../ports/egress.js";

export interface RecordedEgressCall {
  readonly effect: EgressEffect;
  readonly idempotencyKey: IdempotencyKey;
}

/**
 * The first EgressAdapter implementation (IC-A2's enforcement line) and
 * CHK-A2-IDEMKEY's runtime witness: every recorded call carries the key
 * the type system already required.
 */
export interface FakeEgress extends EgressAdapter {
  readonly calls: readonly RecordedEgressCall[];
  /** Queue the ack for a following send; unscripted sends ack confirmed. */
  scriptNextAck(ack: EgressAck): void;
}

export function createFakeEgress(): FakeEgress {
  const calls: RecordedEgressCall[] = [];
  const scripted: EgressAck[] = [];
  return {
    calls,
    scriptNextAck(ack) {
      scripted.push(ack);
    },
    send(effect, idempotencyKey) {
      calls.push({ effect, idempotencyKey });
      return Promise.resolve(scripted.shift() ?? { status: "confirmed" });
    },
  };
}
