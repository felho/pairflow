import type { GateDecision, GateProjection } from "../domain/index.js";

/**
 * The gate EXTENSION contract (packet ch11-P2a, R1–R5; ledger §2 l2).
 * The ch-3 placeholder spec/runner shapes are RETIRED (R5) — this port
 * now carries the ledger's registration/catalog descriptor and nothing
 * else. The registry maps a gate's `uses` id to its registration;
 * composition is STATIC (dynamic loading is Absent), injected through
 * the `GateCatalog`.
 */

/**
 * R4: the config-relative finding a registration emits. `path` is
 * relative to the gate's config object (`""` = the config itself, a
 * dotted key otherwise); admission PREFIXES it with the binding's C7
 * address (`steps.<stepId>.gates.<eventType>[<i>].config…`). The
 * message is unconstrained diagnostic text.
 *
 * `code` (packet ch11-P3a, V4/A9) is the named-lane carrier: present on
 * exactly the registration's CODED lanes (`external.process`'s d/e/h/i/k/l
 * → `invalid_process_gate_config`, o → `gate_config_not_supported`),
 * ABSENT on every uncoded lane. Admission propagates it verbatim into the
 * `ValidationFinding` code field.
 */
export interface GateConfigFinding {
  readonly path: string;
  readonly message: string;
  readonly code?: string;
}

/**
 * R4: the two-arm result of config validation + normalization — the
 * EFFECTIVE config XOR a NONEMPTY finding set (the ledger's
 * `effective | issues`). Defaults materialize on the `ok` arm, once.
 * The failure arm is statically nonempty (arm-gate-2 finding 1): an
 * empty-findings failure would let admission succeed with no effective
 * config — the tuple type forbids it, and admission carries a runtime
 * belt for a cast-forged registration.
 */
export type GateConfigResult =
  | { readonly ok: true; readonly effective: unknown }
  | { readonly ok: false; readonly findings: readonly [GateConfigFinding, ...GateConfigFinding[]] };

/**
 * R1: the shared descriptor axes. `execution` is realized with its
 * domain pinned to the singleton `"inline"` — `"deferred"` is the
 * model's named Absent (a later lifecycle slice), left UNREPRESENTABLE
 * (the `inline-declarative-packaged-only-in-l2-core` invariant's
 * type/schema disposition). `requiresRuntimeContext` is read by
 * admission (its cross-rule branch is P3).
 */
interface GateRegistrationBase {
  readonly execution: "inline";
  readonly requiresRuntimeContext: boolean;
  validateAndNormalizeConfig(raw: unknown): GateConfigResult;
}

/**
 * R2: the inline variant (`declarative` | `packaged`) additionally
 * carries `evaluate`.
 */
export interface InlineGateRegistration extends GateRegistrationBase {
  readonly implementation: "declarative" | "packaged";
  evaluate(effectiveConfig: unknown, projection: GateProjection): GateDecision;
}

/**
 * R2: a process-implementation registration carries NO `evaluate` — its
 * execution path is `run_process_gate` (P3). The type-discriminated
 * union makes the process arm unable to hold an evaluator.
 */
export interface ProcessGateRegistration extends GateRegistrationBase {
  readonly implementation: "process";
}

export type GateRegistration = InlineGateRegistration | ProcessGateRegistration;

/**
 * R3: the injected catalog. `resolve` maps a binding's `uses` VALUE to
 * its registration; `null` = unknown, which ADMISSION maps to the
 * `gate_evaluator_unavailable` definition issue (A3). No mutation API
 * (note 5): the registry is composition, not a lookup table.
 */
export interface GateCatalog {
  resolve(uses: string): GateRegistration | null;
}

/**
 * ch11-P3a R2: `ProcessResult` — the runner's per-invocation outcome
 * (C34's verbatim field list at the TS grain). `exitCode` (an integer)
 * and `stdout` (the UTF-8-decoded text) are present IFF kind=`"ok"` —
 * expressed by the discriminated union (both iff directions are
 * type-level). `logRef` is a nonempty string addressing the durably
 * persisted evidence record; `durationMs` a non-negative integer. `kind`
 * records PROCESS EXECUTION independent of decision classification (a
 * malformed-JSON run is still kind=`"ok"`). `stdout` is process-returned
 * text — classified untrusted-confined (never re-parsed or interpreted at
 * this packet; C25's consumption is P3b's).
 */
export type ProcessResult =
  | {
      readonly kind: "ok";
      readonly exitCode: number;
      readonly stdout: string;
      readonly logRef: string;
      readonly durationMs: number;
    }
  | { readonly kind: "timeout"; readonly logRef: string; readonly durationMs: number }
  | { readonly kind: "runner_error"; readonly logRef: string; readonly durationMs: number };

/**
 * ch11-P3a R1: the `ProcessGateRunner` port — the executor that spawns an
 * external gate process. The kernel owns the CONTRACT; the runner owns the
 * spawn (ch9's realization; this packet declares the port and scripts it in
 * the kit). `command` is C13's one POSIX shell line; `cwd` is the workspace
 * root; `stdin` carries the invocation document (no argv payload); `timeoutMs`
 * is the C13/C16/C18 rename culture over the model's `timeout_ms`. `run()`
 * resolves only after its evidence record is durably persisted (R3).
 */
export interface ProcessGateRunner {
  run(
    command: string,
    options: { readonly cwd: string; readonly stdin: string; readonly timeoutMs: number },
  ): Promise<ProcessResult>;
}

/**
 * ch11-P3a R3: the evidence record (C26's complete field list, realized IN
 * FULL — only the measurement is ch9's). Addressed by the `ProcessResult`'s
 * `logRef` (the ref addresses the WHOLE record); the record itself carries no
 * back-ref. `exitCode` is present IFF kind=`"ok"` (the discriminated union).
 * `durationMs` a non-negative integer; `headSha`/`gitStatusHash` are the
 * runner's DECLARED workspace facts (the kit mints deterministic fakes; ch9
 * measures them). `log` is captured output text — untrusted-confined, retained
 * verbatim, never re-parsed nor policy/path input. PERSISTENCE GUARANTEE:
 * `run()` has durably persisted this record BEFORE returning; timeout and
 * runner_error runs are evidenced equally.
 */
export type ProcessGateEvidence =
  | {
      readonly log: string;
      readonly kind: "ok";
      readonly exitCode: number;
      readonly durationMs: number;
      readonly headSha: string;
      readonly gitStatusHash: string;
    }
  | {
      readonly log: string;
      readonly kind: "timeout";
      readonly durationMs: number;
      readonly headSha: string;
      readonly gitStatusHash: string;
    }
  | {
      readonly log: string;
      readonly kind: "runner_error";
      readonly durationMs: number;
      readonly headSha: string;
      readonly gitStatusHash: string;
    };

/**
 * ch11-P3b C24: the wire projection — the compact snake_case rendering of the
 * domain `GateProjection` the in-process evaluators read. A PURE key-rename
 * projection over the SAME derived snapshot (no field added or dropped); each
 * `history` entry's `step_id` is the step its transition was emitted FROM.
 */
export interface GateInvocationHistoryEntry {
  readonly step_id: string;
  readonly event_type: string;
  readonly role: string;
}
export interface GateInvocationProjection {
  readonly round: number;
  readonly current_step: string;
  readonly event_type: string;
  readonly history: readonly GateInvocationHistoryEntry[];
}

/**
 * ch11-P3b C23: the `GateInvocation` wire document — ONE UTF-8-encoded JSON
 * value on the runner's stdin. The top-level keyset is snake_case
 * model-verbatim `{instance_id, template_ref, step_id, event_type,
 * expected_version, config, projection}`; `step_id` is the instance's current
 * step, `event_type` the envelope's type, `expected_version` the instance's CAS
 * version at evaluation. `config` is the admitted EFFECTIVE config VERBATIM —
 * it rides with ITS OWN (camelCase) keys, deep-equal to the admitted binding's
 * config (wire ≡ effective, the one-downstream-form rule; the envelope keyset
 * snake_case, the config payload the effective form's — C23's letter).
 * `projection` is the C24 compact form. The runner passes NOTHING else (no
 * argv payload; C13's one-command-line + stdin contract).
 */
export interface GateInvocation {
  readonly instance_id: string;
  readonly template_ref: { readonly id: string; readonly version: number };
  readonly step_id: string;
  readonly event_type: string;
  readonly expected_version: number;
  readonly config: unknown;
  readonly projection: GateInvocationProjection;
}
