import type {
  EffectiveProcessConfig,
  EventEnvelope,
  GateDecision,
  GateProjection,
  WorkflowInstance,
} from "../domain/index.js";
import type {
  GateInvocation,
  GateInvocationProjection,
  ProcessGateRunner,
  ProcessResult,
} from "../ports/index.js";

/**
 * `l2a-pseudocode/run_process_gate` + `classify_process_result` +
 * `runner_outcome` (packet ch11-P3b, X2/M1/M2/M3/E1). Imports domain + ports
 * ONLY (REV-E): the branch discriminates on the CONTRACT's own fields, never a
 * concrete adapter type. The effective config arrives materialized (admission's
 * output, A5); the classification RE-DEFAULTS nothing — the unit's `??` lines
 * are already resolved upstream.
 */

/** C24: the pure key-rename from the domain projection to the snake_case wire
 * form (same derived snapshot, no field added or dropped). */
function toWireProjection(projection: GateProjection): GateInvocationProjection {
  return {
    round: projection.round,
    current_step: projection.currentStep,
    event_type: projection.eventType,
    history: projection.history.map((entry) => ({
      step_id: entry.stepId,
      event_type: entry.eventType,
      role: entry.role,
    })),
  };
}

/** C23: build the invocation document — snake_case top-level keyset, `config`
 * the effective form VERBATIM (its own camelCase keys), `projection` the
 * compact C24 form. */
export function buildGateInvocation(
  instance: WorkflowInstance,
  effective: EffectiveProcessConfig,
  projection: GateProjection,
  envelope: EventEnvelope,
): GateInvocation {
  // G2 (packet ch12-p1b): process gates run only in ACTIVE execution —
  // a NULL position is integrity drift (the type-level narrow).
  if (instance.currentStep === null) {
    throw new Error(
      `kernel integrity: process-gate invocation for instance '${instance.instanceId}' with a NULL current_step`,
    );
  }
  return {
    instance_id: instance.instanceId,
    template_ref: { id: instance.templateRef.id, version: instance.templateRef.version },
    step_id: instance.currentStep,
    event_type: envelope.type,
    expected_version: instance.version,
    config: effective,
    projection: toWireProjection(projection),
  };
}

/**
 * X2: build the C23 invocation, invoke `processRunner.run` EXACTLY ONCE with
 * the effective command / the instance's ready ref as `cwd` / the serialized
 * invocation on stdin / the effective timeout, then classify (M1). Evidence is
 * persisted by the runner on EVERY run (the runner's own C26 contract).
 */
export async function runProcessGate(
  effective: EffectiveProcessConfig,
  instance: WorkflowInstance,
  cwd: string,
  projection: GateProjection,
  envelope: EventEnvelope,
  processRunner: ProcessGateRunner,
): Promise<GateDecision> {
  const invocation = buildGateInvocation(instance, effective, projection, envelope);
  const result = await processRunner.run(effective.command, {
    cwd,
    stdin: JSON.stringify(invocation),
    timeoutMs: effective.timeoutMs,
  });
  return classifyProcessResult(result, effective);
}

/** `bucket(exitCode)`: `zero` for 0 (`-0 === 0`, so `-0` lands in `zero` at the
 * bucket grain — never `Object.is`, which would invert it), `nonzero` for every
 * other integer. */
function exitBucket(exitCode: number): "zero" | "nonzero" {
  return exitCode === 0 ? "zero" : "nonzero";
}

/**
 * M1: the kind × mode grid over the EFFECTIVE config. `timeout` / `runner_error`
 * kinds route to `runner_outcome`; `ok` + `exitCode` reads `onExit[bucket]` and
 * the total `reason[bucket]` (V1); `ok` + `gateDecisionJson` runs M2's strict
 * parse (a failure is `sys:malformed_gate_decision_json`, never a business block).
 */
export function classifyProcessResult(
  result: ProcessResult,
  effective: EffectiveProcessConfig,
): GateDecision {
  if (result.kind === "timeout") {
    return runnerOutcome(effective.onTimeout, "sys:timeout", result.logRef);
  }
  if (result.kind === "runner_error") {
    return runnerOutcome(effective.onRunnerError, "sys:runner_error", result.logRef);
  }
  // kind === "ok"
  if (effective.output.mode === "exitCode") {
    const bucket = exitBucket(result.exitCode);
    const { onExit, reason } = effective;
    // By-construction belt (C20/C22): exitCode-mode admission ALWAYS populates
    // onExit AND a complete reason — a missing bucket is a forged effective
    // config, a kernel-integrity failure, never a silent default.
    if (onExit === undefined || reason === undefined) {
      throw new Error(
        "kernel integrity: exitCode-mode effective config missing onExit/reason (admission invariant violated)",
      );
    }
    const bucketReason = bucket === "zero" ? reason.zero : reason.nonzero;
    if (bucketReason === undefined) {
      throw new Error(
        `kernel integrity: exitCode-mode reason bucket '${bucket}' missing (admission invariant violated)`,
      );
    }
    return { verdict: onExit[bucket], reason: bucketReason, evidenceRefs: [result.logRef] };
  }
  // gateDecisionJson mode (M2).
  const parsed = tryParseGateDecision(result.stdout);
  if (parsed === null) {
    return runnerOutcome(effective.onRunnerError, "sys:malformed_gate_decision_json", result.logRef);
  }
  return withEvidence(parsed, result.logRef);
}

/**
 * M3: a runner outcome is ALWAYS a block (`fail_instance` is admission-
 * foreclosed at P3a's lane o, so `blockTransition` is the only reachable
 * disposition — the singleton type states what the model comment states). Never
 * a retained decision, never a business block.
 */
export function runnerOutcome(
  disposition: "blockTransition",
  reason: string,
  logRef: string,
): GateDecision {
  // `disposition` is the "blockTransition" singleton — the MVP realizes only
  // block, so no branch on it exists; it is present for contract fidelity.
  void disposition;
  return { verdict: "block", reason, evidenceRefs: [logRef] };
}

const GATE_DECISION_KEYS = ["verdict", "reason", "message", "evidence_refs"];

function ownGet(record: Record<string, unknown>, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value !== "";
}

/**
 * M2: the strict single-value `GateDecision` stdout parse (C25). `JSON.parse`'s
 * native strictness governs the single-document rule (surrounding whitespace
 * legal; trailing content a parse error — no second parser). The root is an
 * object with the EXACT keyset `{verdict (required), reason?, message?,
 * evidence_refs?}`; `verdict` ∈ {allow, warn, block}; `reason`/`message`
 * NONEMPTY strings; `evidence_refs` a list of NONEMPTY strings (an empty LIST
 * is legal, an empty ELEMENT is not). ALL reads are own-property (G8). Any
 * member of the malformed inventory → `null` (→ `sys:malformed_gate_decision_json`).
 * The wire `evidence_refs` renames to the domain `evidenceRefs`.
 */
function tryParseGateDecision(stdout: string): GateDecision | null {
  let root: unknown;
  try {
    root = JSON.parse(stdout);
  } catch {
    return null; // unparseable text / trailing content
  }
  return validateGateDecisionObject(root);
}

/**
 * The M2 schema/own-property validation over a PARSED root (split out of
 * `tryParseGateDecision` so the own-property discipline is drivable directly:
 * `JSON.parse` always mints own properties, so a prototype-polluted parsed
 * object can only reach this helper through the direct channel — a probe that
 * turns red the instant an own-property read is replaced by an inherited one).
 * ALL member reads are own-property (G8): an inherited/`__proto__` member is
 * never decision data.
 */
export function validateGateDecisionObject(root: unknown): GateDecision | null {
  if (typeof root !== "object" || root === null || Array.isArray(root)) {
    return null; // non-object root (scalar, list, null)
  }
  const record = root as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!GATE_DECISION_KEYS.includes(key)) {
      return null; // unknown top-level key
    }
  }
  const verdict = ownGet(record, "verdict");
  if (verdict !== "allow" && verdict !== "warn" && verdict !== "block") {
    return null; // missing / non-allowlisted verdict (route, non-string included)
  }
  const reason = ownGet(record, "reason");
  if (reason !== undefined && !isNonEmptyString(reason)) {
    return null; // wrong-typed / empty reason
  }
  const message = ownGet(record, "message");
  if (message !== undefined && !isNonEmptyString(message)) {
    return null; // wrong-typed / empty message
  }
  const evidenceRefs = ownGet(record, "evidence_refs");
  if (evidenceRefs !== undefined) {
    if (!Array.isArray(evidenceRefs)) {
      return null; // non-list evidence_refs
    }
    for (const element of evidenceRefs) {
      if (!isNonEmptyString(element)) {
        return null; // an empty / non-string evidence_refs ELEMENT
      }
    }
  }
  return {
    verdict,
    ...(reason !== undefined ? { reason } : {}),
    ...(message !== undefined ? { message } : {}),
    ...(evidenceRefs !== undefined ? { evidenceRefs: evidenceRefs as string[] } : {}),
  };
}

/**
 * E1: the parsed decision carries the PROCESS-returned refs VERBATIM (order
 * preserved) with the runner's `logRef` APPENDED AS THE LAST ELEMENT iff not
 * already present (string-equality dedup). An absent list yields `[logRef]`; an
 * empty list yields `[logRef]` (append on the empty list).
 */
function withEvidence(decision: GateDecision, logRef: string): GateDecision {
  const existing = decision.evidenceRefs ?? [];
  const evidenceRefs = existing.includes(logRef) ? [...existing] : [...existing, logRef];
  return { ...decision, evidenceRefs };
}
