import type {
  AttemptExecutor,
  AttemptExecutorInput,
  AttemptResult,
} from "../ports/delivery.js";

/**
 * The scripted delivery executor (K3; packet ch9-p3a — the sizing gate's
 * counted testkit-contract change). The `scriptedActor` / `scriptedProcessGate
 * Runner` player culture: it plays a script of `AttemptResult`s and rejections
 * in order, RECORDS every `execute` input for asserts, and runs an optional
 * `observe` hook per call (B1's ordering observability — a test reads the
 * durable budget mid-attempt). ADR-005: deterministic, no I/O, selftest
 * included. REV-B: the record array is testkit surface, NEVER authority.
 */

/** One scripted step: a result to resolve, or a `{ reject }` to reject with. */
export type ScriptedAttemptStep = AttemptResult | { readonly reject: string };

export interface RecordedAttemptCall {
  readonly input: AttemptExecutorInput;
}

export interface ScriptedAttemptExecutorOptions {
  /** Called SYNCHRONOUSLY inside `execute()` BEFORE the scripted result is
   * produced — the B1 ordering observation point (read the durable budget
   * mid-attempt). */
  readonly observe?: (input: AttemptExecutorInput) => void;
}

export interface ScriptedAttemptExecutor extends AttemptExecutor {
  /** The recorded `execute` inputs, in order (live view — REV-B). */
  readonly calls: readonly RecordedAttemptCall[];
}

export function createScriptedAttemptExecutor(
  script: readonly ScriptedAttemptStep[],
  options: ScriptedAttemptExecutorOptions = {},
): ScriptedAttemptExecutor {
  const calls: RecordedAttemptCall[] = [];
  let index = 0;
  return {
    get calls(): readonly RecordedAttemptCall[] {
      return calls;
    },
    execute(input: AttemptExecutorInput): Promise<AttemptResult> {
      // RECORD FIRST — the invocation was received regardless of the step.
      calls.push({ input });
      options.observe?.(input);
      if (index >= script.length) {
        return Promise.reject(
          new Error(
            `scriptedAttemptExecutor: script exhausted after ${String(script.length)} steps`,
          ),
        );
      }
      const step = script[index];
      index += 1;
      if (step !== undefined && "reject" in step) {
        return Promise.reject(new Error(step.reject));
      }
      return Promise.resolve(step as AttemptResult);
    },
  };
}
