import type {
  GateRunner,
  GateSpec,
  GateVerdict,
  ProcessResult,
  ProcessRunner,
  ProcessSpec,
} from "../ports/gate.js";

/**
 * Deterministic fixtures: scripted verdicts/results, played in order.
 * An exhausted script fails loudly — a fixture never invents a verdict.
 */
export interface ScriptedGateRunner extends GateRunner {
  readonly runs: readonly GateSpec[];
}

export function createScriptedGateRunner(verdicts: readonly GateVerdict[]): ScriptedGateRunner {
  const runs: GateSpec[] = [];
  let next = 0;
  return {
    runs,
    run(gate) {
      runs.push(gate);
      const verdict = verdicts[next];
      next += 1;
      if (verdict === undefined) {
        return Promise.reject(
          new Error(`scripted gate runner exhausted after ${String(verdicts.length)} verdicts`),
        );
      }
      return Promise.resolve(verdict);
    },
  };
}

export interface ScriptedProcessRunner extends ProcessRunner {
  readonly runs: readonly ProcessSpec[];
}

export function createScriptedProcessRunner(
  results: readonly ProcessResult[],
): ScriptedProcessRunner {
  const runs: ProcessSpec[] = [];
  let next = 0;
  return {
    runs,
    run(spec) {
      runs.push(spec);
      const result = results[next];
      next += 1;
      if (result === undefined) {
        return Promise.reject(
          new Error(`scripted process runner exhausted after ${String(results.length)} results`),
        );
      }
      return Promise.resolve(result);
    },
  };
}
