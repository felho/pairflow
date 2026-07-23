import type { GateDecision, GateProjection } from "../domain/index.js";
import type { GateConfigFinding, GateConfigResult, InlineGateRegistration } from "../ports/index.js";

/**
 * `declarative.threshold` (packet ch11-P2a, G3/G4): the tiny declarative
 * DSL over one allowlisted `gate_projection` path. Config is REQUIRED
 * (C5); the exact own-key set is {metric, op, value}, all three
 * required; `metric` ∈ {round}, `op` ∈ {">="}, `value` a safe integer
 * ≥ 1 (the C12 VALUE half). Every violation is an UNCODED admission
 * finding at the config's C7 path (C21 assigns this lane no code).
 *
 * Own-property discipline (G8): member reads and the unknown-key scan
 * run over the value's OWN enumerable string keys only — a `__proto__`
 * or inherited member is never read as config.
 */

const ALLOWED_KEYS = ["metric", "op", "value"];

function isConfigMap(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ownGet(record: Record<string, unknown>, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

interface ThresholdConfig {
  readonly metric: "round";
  readonly op: ">=";
  readonly value: number;
}

function validateAndNormalizeConfig(raw: unknown): GateConfigResult {
  if (raw === undefined) {
    return { ok: false, findings: [{ path: "", message: "declarative.threshold requires a config" }] };
  }
  // Container precondition (C21 / note 3): a non-map config is ONE
  // finding, dependent lanes suppressed — no per-key loop over it.
  if (!isConfigMap(raw)) {
    return { ok: false, findings: [{ path: "", message: "config must be a map" }] };
  }
  const findings: GateConfigFinding[] = [];
  for (const key of Object.keys(raw)) {
    if (!ALLOWED_KEYS.includes(key)) {
      findings.push({ path: key, message: `unknown config key '${key}' (allowed: metric, op, value)` });
    }
  }
  const metric = ownGet(raw, "metric");
  if (metric === undefined) {
    findings.push({ path: "metric", message: "metric is required" });
  } else if (metric !== "round") {
    findings.push({ path: "metric", message: "metric must be 'round' (the only allowlisted projection path)" });
  }
  const op = ownGet(raw, "op");
  if (op === undefined) {
    findings.push({ path: "op", message: "op is required" });
  } else if (op !== ">=") {
    findings.push({ path: "op", message: "op must be '>='" });
  }
  const value = ownGet(raw, "value");
  if (value === undefined) {
    findings.push({ path: "value", message: "value is required" });
  } else if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    // The numeric-identity rung is satisfied by the range check: `-0`,
    // NaN, Infinity, non-integers, unsafe integers, and non-numbers all
    // fail `Number.isSafeInteger(...) && value >= 1`.
    findings.push({ path: "value", message: "value must be a safe integer >= 1" });
  }
  const [first, ...rest] = findings;
  if (first !== undefined) {
    // Nonempty by construction — the tuple type carries it (R4).
    return { ok: false, findings: [first, ...rest] };
  }
  const effective: ThresholdConfig = { metric: "round", op: ">=", value: value as number };
  return { ok: true, effective };
}

function evaluate(effectiveConfig: unknown, projection: GateProjection): GateDecision {
  const { value } = effectiveConfig as ThresholdConfig;
  if (projection.round < value) {
    return { verdict: "block", reason: "sys:round_below_min" };
  }
  return { verdict: "allow" };
}

export const thresholdRegistration: InlineGateRegistration = {
  implementation: "declarative",
  execution: "inline",
  requiresRuntimeContext: false,
  validateAndNormalizeConfig,
  evaluate,
};
