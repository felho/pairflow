import type { ProcessGateEvidence, ProcessGateRunner, ProcessResult } from "../ports/index.js";

/**
 * `ScriptedProcessGateRunner` (packet ch11-P3a, T1): the testkit `run`
 * implementation. FAITHFUL QUEUED PLAYBACK — each call returns EXACTLY the
 * next scripted `ProcessResult`, field-for-field as scripted, in order (no
 * normalizing, defaulting, or altering). Before resolving, it MINTS a
 * deterministic evidence record (R3's persist-before-return guarantee is the
 * kit's own driven contract), KEYS it by the result's `logRef` so a returned
 * ref resolves to its exact record, and EXPOSES the persisted records for
 * assertion. Script exhaustion is an explicit error (the `scriptedActor`
 * idiom); a scripted result violating R2's scalar refinements throws LOUDLY at
 * play (the kit's scripted-exhaustible-loud culture) rather than persisting a
 * malformed record.
 *
 * Kit piece only — the end-to-end six-outcome drive through classification and
 * HANDLE is P3b's. REV-B: the record array is testkit surface, NEVER authority.
 */

/** The kit's deterministic workspace-fact fakes (clearly non-authoritative;
 * the ch9 real runner MEASURES these). Exported so kit self-tests assert them. */
export const SCRIPTED_HEAD_SHA = "scripted-head-sha";
export const SCRIPTED_GIT_STATUS_HASH = "scripted-git-status-hash";

/** ch11-P3b T1: one faithfully recorded `run()` invocation — the drive surface
 * for the X2/X3 wire-content and runs-in-the-workspace assertions. */
export interface RecordedRunnerCall {
  readonly command: string;
  readonly cwd: string;
  readonly stdin: string;
  readonly timeoutMs: number;
}

export interface ScriptedProcessGateRunner extends ProcessGateRunner {
  /** The evidence records persisted so far, in call order (live view). */
  readonly records: readonly ProcessGateEvidence[];
  /** ch11-P3b T1: the ordered `{command, cwd, stdin, timeoutMs}` received per
   * `run()` invocation (live view) — REV-B: testkit surface, never authority. */
  readonly calls: readonly RecordedRunnerCall[];
  /** Resolve a returned `ProcessResult`'s `logRef` to its exact evidence record
   * (R3: the ref addresses the WHOLE record). `undefined` for an unknown ref. */
  resolve(logRef: string): ProcessGateEvidence | undefined;
}

/**
 * R2's scalar refinements, enforced at play (a scripted violation throws
 * loudly — the kit never persists or returns a malformed result): `logRef` a
 * nonempty string; `durationMs` a non-negative integer; on an `ok` result
 * `exitCode` an integer and `stdout` a string (both present); on a non-`ok`
 * result NEITHER `exitCode` NOR `stdout` (present IFF kind=`"ok"`).
 */
function assertScriptedResultValid(result: ProcessResult, callNumber: number): void {
  const where = `call #${String(callNumber)}`;
  const asRecord = result as Record<string, unknown>;
  if (typeof result.logRef !== "string" || result.logRef === "") {
    throw new Error(`ScriptedProcessGateRunner: scripted result at ${where} has an empty/absent logRef`);
  }
  if (typeof result.durationMs !== "number" || !Number.isInteger(result.durationMs) || result.durationMs < 0) {
    throw new Error(
      `ScriptedProcessGateRunner: scripted result at ${where} has a durationMs that is not a non-negative integer`,
    );
  }
  if (result.kind === "ok") {
    if (typeof result.exitCode !== "number" || !Number.isInteger(result.exitCode)) {
      throw new Error(`ScriptedProcessGateRunner: scripted ok result at ${where} must carry an integer exitCode`);
    }
    if (typeof result.stdout !== "string") {
      throw new Error(`ScriptedProcessGateRunner: scripted ok result at ${where} must carry a string stdout`);
    }
    return;
  }
  if (Object.prototype.hasOwnProperty.call(asRecord, "exitCode")) {
    throw new Error(`ScriptedProcessGateRunner: scripted ${result.kind} result at ${where} must NOT carry exitCode`);
  }
  if (Object.prototype.hasOwnProperty.call(asRecord, "stdout")) {
    throw new Error(`ScriptedProcessGateRunner: scripted ${result.kind} result at ${where} must NOT carry stdout`);
  }
}

/** Mint the deterministic evidence record for a scripted result. `log` is the
 * kit's deterministic captured-output fake (the ok run's `stdout`, a kind
 * marker otherwise); `durationMs`/`kind`/`exitCode` mirror the result. */
function toEvidence(result: ProcessResult): ProcessGateEvidence {
  if (result.kind === "ok") {
    return {
      log: result.stdout,
      kind: "ok",
      exitCode: result.exitCode,
      durationMs: result.durationMs,
      headSha: SCRIPTED_HEAD_SHA,
      gitStatusHash: SCRIPTED_GIT_STATUS_HASH,
    };
  }
  return {
    log: `scripted ${result.kind} run`,
    kind: result.kind,
    durationMs: result.durationMs,
    headSha: SCRIPTED_HEAD_SHA,
    gitStatusHash: SCRIPTED_GIT_STATUS_HASH,
  };
}

export function createScriptedProcessGateRunner(
  script: readonly ProcessResult[],
): ScriptedProcessGateRunner {
  const records: ProcessGateEvidence[] = [];
  const calls: RecordedRunnerCall[] = [];
  const recordByRef = new Map<string, ProcessGateEvidence>();
  let index = 0;
  return {
    get records(): readonly ProcessGateEvidence[] {
      return records;
    },
    get calls(): readonly RecordedRunnerCall[] {
      return calls;
    },
    resolve(logRef: string): ProcessGateEvidence | undefined {
      return recordByRef.get(logRef);
    },
    // Playback is QUEUED (not computed from the args), but the args are now
    // RECORDED faithfully (T1): the call is captured BEFORE the exhaustion
    // check — the invocation was received regardless of whether a result
    // remains to return.
    run(
      command: string,
      options: { readonly cwd: string; readonly stdin: string; readonly timeoutMs: number },
    ): Promise<ProcessResult> {
      calls.push({
        command,
        cwd: options.cwd,
        stdin: options.stdin,
        timeoutMs: options.timeoutMs,
      });
      if (index >= script.length) {
        throw new Error(
          `ScriptedProcessGateRunner: script exhausted (no scripted ProcessResult for call #${String(index + 1)})`,
        );
      }
      const result = script[index] as ProcessResult;
      index += 1;
      // Loud validation BEFORE any persistence: a scripted violation of R2's
      // scalar refinements throws rather than persisting a malformed record.
      assertScriptedResultValid(result, index);
      // Persist the evidence record BEFORE resolving (R3): a returned logRef
      // MUST resolve. `records` and the by-ref index are written synchronously,
      // then the (already resolved) result is returned — so any awaiter observes
      // both the record and its `resolve(logRef)` association.
      const evidence = toEvidence(result);
      records.push(evidence);
      recordByRef.set(result.logRef, evidence);
      return Promise.resolve(result);
    },
  };
}
