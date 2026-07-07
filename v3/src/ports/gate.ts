/**
 * Gate and process specs are ledger-owned shapes; opaque here (plan §3.1
 * no-mini-domain rule). Timeout semantics integrate with TimeSource when
 * the first time-dependent contract test lands (ch 5).
 */
export type GateSpec = unknown;
export type ProcessSpec = unknown;

export type GateVerdict =
  | { readonly outcome: "pass" }
  | { readonly outcome: "fail"; readonly reason?: string };

export interface GateRunner {
  run(gate: GateSpec): Promise<GateVerdict>;
}

export interface ProcessResult {
  readonly exitCode: number;
  readonly output: unknown;
}

export interface ProcessRunner {
  run(spec: ProcessSpec): Promise<ProcessResult>;
}
