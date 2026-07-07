import type { TailWait } from "../ports/tail.js";

export interface ScriptedTailWait {
  readonly wait: TailWait;
  /** Waits consumed so far — "never waited" assertions read this. */
  calls(): number;
}

/**
 * Deterministic TailWait (packet ch6-P2): the Nth wait runs the Nth
 * step — a test-side action staged BETWEEN tail rounds (commit a row,
 * drive a rejection, flip terminal, no-op). No real sleep anywhere.
 * Exhausting the script FAILS LOUDLY: a tail that should have
 * completed but waits again becomes a deterministic test error, never
 * a hang.
 */
export function createScriptedTailWait(
  steps: ReadonlyArray<() => void | Promise<void>>,
): ScriptedTailWait {
  let consumed = 0;
  return {
    calls: () => consumed,
    wait: async () => {
      if (consumed >= steps.length) {
        throw new Error(
          `scripted tail wait exhausted after ${String(steps.length)} steps — the tail should have completed`,
        );
      }
      const step = steps[consumed];
      consumed += 1;
      await step?.();
    },
  };
}
