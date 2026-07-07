import type { InstanceId, TranscriptEntry } from "../domain/index.js";
import type { StorePort } from "../ports/store.js";
import type { TailWait } from "../ports/tail.js";

/**
 * The committed floor-tail seed (plan §6.3, packet ch6-P2): the
 * single-instance seed of the observe seam's history-plus-tail
 * primitive — replay from the cursor, then new committed rows as they
 * land, complete when the instance is terminal and fully drained.
 * Deliberately NOT the observe seam: live push media, addressed
 * streams, backpressure, terminal/gap marker semantics, and the
 * diagnostic layer (ch 7) are deferred to the seam's own chapter.
 *
 * Error contract (the P4 CLI maps these to its exit-code classes):
 * the factory and `tailCommittedTimeline` NEVER throw — every failure
 * surfaces on iteration. Invalid cursor = `RangeError` (inherited from
 * §6.2, before any wait); unknown instance at start =
 * `TailUnknownInstanceError` (before any wait); a mid-stream vanish =
 * `TailIntegrityError`; a `wait()` rejection propagates as-is and the
 * tail is terminated (the next `next()` reports done).
 */
export interface Tail {
  tailCommittedTimeline(
    instanceId: InstanceId,
    fromSeq: number,
  ): AsyncIterable<TranscriptEntry>;
}

/** Startup fail-closed lane: "no such run" — never a silent empty stream. */
export class TailUnknownInstanceError extends Error {
  constructor(instanceId: InstanceId) {
    super(`tail: unknown instance '${instanceId}'`);
    this.name = "TailUnknownInstanceError";
  }
}

/** Fail-closed lane for state v1 cannot produce (no purge exists): an
 * instance that vanished mid-tail is an integrity failure, never a
 * silent stream end. */
export class TailIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TailIntegrityError";
  }
}

export function createTail(store: StorePort, wait: TailWait): Tail {
  return {
    tailCommittedTimeline: (instanceId, fromSeq) =>
      tailLoop(store, wait, instanceId, fromSeq),
  };
}

/**
 * Engine invariant (refine finding 1): `wait()` runs ONLY after a
 * non-terminal POST-drain status read. Once terminal is observed the
 * engine drains until an empty batch and completes — a terminal commit
 * landing between the drain and the status read is picked up by the
 * final drain, never followed by a wait. The drain-till-empty loop is
 * bounded by the terminal-sink invariant (no commits after terminal).
 */
async function* tailLoop(
  store: StorePort,
  wait: TailWait,
  instanceId: InstanceId,
  fromSeq: number,
): AsyncGenerator<TranscriptEntry, void, undefined> {
  let cursor = fromSeq;
  let first = true;
  for (;;) {
    const batch = await store.getTimeline(instanceId, cursor);
    if (batch === null) {
      throw first
        ? new TailUnknownInstanceError(instanceId)
        : new TailIntegrityError(`tail: instance '${instanceId}' vanished mid-stream`);
    }
    first = false;
    for (const row of batch) {
      yield row;
      cursor = row.seq;
    }

    const instance = await store.loadInstance(instanceId);
    if (instance === null) {
      throw new TailIntegrityError(`tail: instance '${instanceId}' vanished mid-stream`);
    }
    if (instance.status === "DONE") {
      for (;;) {
        const rest = await store.getTimeline(instanceId, cursor);
        if (rest === null) {
          throw new TailIntegrityError(
            `tail: instance '${instanceId}' vanished mid-stream`,
          );
        }
        if (rest.length === 0) {
          return;
        }
        for (const row of rest) {
          yield row;
          cursor = row.seq;
        }
      }
    }
    await wait();
  }
}
