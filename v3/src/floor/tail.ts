import type { InstanceId, TranscriptEntry } from "../domain/index.js";
import type { DiagnosticEvent, DiagnosticsReader } from "../ports/diagnostics.js";
import type { StorePort } from "../ports/store.js";
import type { TailWait } from "../ports/tail.js";

/**
 * The committed floor-tail seed (plan §6.3, packet ch6-P2) plus its
 * diagnostic layer (plan §7.4, packet ch7-P3): the single-instance seed
 * of the observe seam's history-plus-tail primitive — replay from the
 * cursor, then new committed rows as they land, complete when the
 * instance is terminal and fully drained. Deliberately NOT the observe
 * seam: live push media, addressed streams, backpressure, and
 * terminal/gap marker semantics stay deferred to the seam's own
 * chapter.
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
 * non-terminal POST-drain state read. Once terminal is observed the
 * engine drains until an empty batch and completes — a terminal commit
 * landing between the drain and the state read is picked up by the
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
    // The completion predicate re-based onto the axis (packet ch12-p1a,
    // W3): terminal IS `kernel_status = TERMINAL` (DONE ≡ TERMINAL(done)).
    if (instance.kernelStatus === "TERMINAL") {
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

// ---------------------------------------------------------------------------
// The diagnostic layer (plan §7.4, packet ch7-P3): the seed EXTENDED in
// place, not a parallel module. The exported ch6-P2 surfaces above are
// untouched.
// ---------------------------------------------------------------------------

/**
 * The two-lane row union (T1): exact keysets per variant — `lane` plus
 * the ONE payload key, nothing else. The diag variant carries the FULL
 * read-face event (`at`/`ordinal` included — every row carries its own
 * cursor, T4): the tail is a LOCAL surface (§7.4), `error.message`
 * rides. NO cross-lane total order is claimed — each lane in its OWN
 * cursor order, the interleave is polling-incidental.
 */
export type DiagTailRow =
  | { readonly lane: "committed"; readonly row: TranscriptEntry }
  | { readonly lane: "diag"; readonly event: DiagnosticEvent };

/**
 * The diag tail (T2). Error contract (the E matrix): the factory and
 * `tailWithDiagnostics` never throw synchronously — every failure
 * surfaces on iteration, and the engine carries NO try/catch ANYWHERE,
 * so propagation is uniform by construction. The tail is fail-LOUD
 * (§7.3 matrix, tail row): a `DiagUnavailableError` propagates AS-IS —
 * matched by nothing, wrapped by nothing — and non-typed reader
 * failures propagate the same way (E8); unlike the bundle it has no
 * succeed-anyway obligation.
 */
export interface DiagTail {
  tailWithDiagnostics(
    instanceId: InstanceId,
    fromSeq: number,
    fromOrdinal: number,
  ): AsyncIterable<DiagTailRow>;
}

export function createDiagTail(
  store: StorePort,
  diag: DiagnosticsReader,
  wait: TailWait,
): DiagTail {
  return {
    tailWithDiagnostics: (instanceId, fromSeq, fromOrdinal) =>
      diagTailLoop(store, diag, wait, instanceId, fromSeq, fromOrdinal),
  };
}

/**
 * Engine round order (T3): fetch committed batch → fetch diag batch →
 * yield committed rows → yield diag rows. A round's fetch failures fire
 * BEFORE any of that round's yields — this is what makes the error
 * lanes deterministic and the stream losslessly resumable (T4) — and
 * the committed fetch runs FIRST, so existence/seq-cursor errors take
 * precedence over diag errors within a round (E3). Do not "optimize"
 * into yield-as-you-fetch.
 *
 * Stop rule (T5): completion anchors to the COMMITTED terminal —
 * terminal observed (post-yield state read) → committed
 * drain-till-empty (bounded by the terminal-sink invariant) → ONE final
 * diag read → complete. The final diag read is ONE read by design: a
 * stray submit against a TERMINAL instance can mint diag events forever, so
 * a till-empty diag drain would unbound the tail; post-close visibility
 * is the query surface's recourse. `wait()` runs ONLY after a
 * non-terminal post-drain state read (T6).
 */
async function* diagTailLoop(
  store: StorePort,
  diag: DiagnosticsReader,
  wait: TailWait,
  instanceId: InstanceId,
  fromSeq: number,
  fromOrdinal: number,
): AsyncGenerator<DiagTailRow, void, undefined> {
  let seqCursor = fromSeq;
  let ordinalCursor = fromOrdinal;
  let first = true;
  for (;;) {
    const batch = await store.getTimeline(instanceId, seqCursor);
    if (batch === null) {
      throw first
        ? new TailUnknownInstanceError(instanceId)
        : new TailIntegrityError(`tail: instance '${instanceId}' vanished mid-stream`);
    }
    first = false;
    const events = await diag.getDiagnostics(instanceId, ordinalCursor);
    for (const row of batch) {
      yield { lane: "committed", row };
      seqCursor = row.seq;
    }
    for (const event of events) {
      yield { lane: "diag", event };
      ordinalCursor = event.ordinal;
    }

    const instance = await store.loadInstance(instanceId);
    if (instance === null) {
      throw new TailIntegrityError(`tail: instance '${instanceId}' vanished mid-stream`);
    }
    // W3 (packet ch12-p1a): the same axis completion predicate as tailLoop.
    if (instance.kernelStatus === "TERMINAL") {
      for (;;) {
        const rest = await store.getTimeline(instanceId, seqCursor);
        if (rest === null) {
          throw new TailIntegrityError(
            `tail: instance '${instanceId}' vanished mid-stream`,
          );
        }
        if (rest.length === 0) {
          break;
        }
        for (const row of rest) {
          yield { lane: "committed", row };
          seqCursor = row.seq;
        }
      }
      // No cursor advance after the ONE final read — the tail is done,
      // and every yielded row carries its own cursor (T4).
      const finalEvents = await diag.getDiagnostics(instanceId, ordinalCursor);
      for (const event of finalEvents) {
        yield { lane: "diag", event };
      }
      return;
    }
    await wait();
  }
}
