import type { ProcessGateEvidence, ProcessGateRunner, ProcessResult } from "../ports/index.js";

/**
 * `ScriptedProcessGateRunner` (packet ch11-P3a, T1): the testkit `run`
 * implementation. FAITHFUL QUEUED PLAYBACK — each call returns EXACTLY the
 * next scripted `ProcessResult`, field-for-field as scripted, in order (no
 * normalizing, defaulting, or altering). Before resolving, it MINTS a
 * deterministic evidence record (R3's persist-before-return guarantee is the
 * kit's own driven contract) and EXPOSES the persisted records for assertion.
 * Script exhaustion is an explicit error (the `scriptedActor` idiom).
 *
 * Kit piece only — the end-to-end six-outcome drive through classification and
 * HANDLE is P3b's. REV-B: the record array is testkit surface, NEVER authority.
 */

/** The kit's deterministic workspace-fact fakes (clearly non-authoritative;
 * the ch9 real runner MEASURES these). Exported so kit self-tests assert them. */
export const SCRIPTED_HEAD_SHA = "scripted-head-sha";
export const SCRIPTED_GIT_STATUS_HASH = "scripted-git-status-hash";

export interface ScriptedProcessGateRunner extends ProcessGateRunner {
  /** The evidence records persisted so far, in call order (live view). */
  readonly records: readonly ProcessGateEvidence[];
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
  let index = 0;
  return {
    get records(): readonly ProcessGateEvidence[] {
      return records;
    },
    // The scripted runner ignores command/options (playback is queued, not
    // computed) — the no-argument form is structurally assignable to the
    // port's `run(command, options)` signature.
    run(): Promise<ProcessResult> {
      if (index >= script.length) {
        throw new Error(
          `ScriptedProcessGateRunner: script exhausted (no scripted ProcessResult for call #${String(index + 1)})`,
        );
      }
      const result = script[index] as ProcessResult;
      index += 1;
      // Persist the evidence record BEFORE resolving (R3): a returned logRef
      // MUST resolve. `records` is appended synchronously, then the (already
      // resolved) result is returned — so any awaiter observes the record.
      records.push(toEvidence(result));
      return Promise.resolve(result);
    },
  };
}
