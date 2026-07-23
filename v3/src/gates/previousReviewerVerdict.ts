import type { GateDecision, GateProjection } from "../domain/index.js";
import type { GateConfigFinding, GateConfigResult, InlineGateRegistration } from "../ports/index.js";

/**
 * `pairflow.previous_reviewer_verdict` (packet ch11-P2a, G5/G6): the
 * packaged pure pairflow policy. Config is OPTIONAL (C5/C11): ABSENT ⇒
 * effective `{required: true}` MATERIALIZED here (the behavior-
 * preserving default, stable per C30). When present the exact own-key
 * set is {required} and the sole legal value is `true` — `required:
 * false` (the reserved future toggle, C11's fail-closed nature) and
 * every other violation are UNCODED admission findings (C21).
 *
 * Own-property discipline (G8): the unknown-key scan and member reads
 * run over the value's OWN enumerable string keys only.
 */

function isConfigMap(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ownGet(record: Record<string, unknown>, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

interface PreviousReviewerVerdictConfig {
  readonly required: true;
}

const EFFECTIVE: PreviousReviewerVerdictConfig = { required: true };

function validateAndNormalizeConfig(raw: unknown): GateConfigResult {
  if (raw === undefined) {
    return { ok: true, effective: EFFECTIVE };
  }
  // Container precondition (C21 / note 3): ONE finding, no key cascade.
  if (!isConfigMap(raw)) {
    return { ok: false, findings: [{ path: "", message: "config must be a map" }] };
  }
  const findings: GateConfigFinding[] = [];
  for (const key of Object.keys(raw)) {
    if (key !== "required") {
      findings.push({ path: key, message: `unknown config key '${key}' (allowed: required)` });
    }
  }
  const required = ownGet(raw, "required");
  if (required === undefined) {
    findings.push({ path: "required", message: "required is required when a config is present" });
  } else if (required !== true) {
    findings.push({
      path: "required",
      message: "required must be true (false is a reserved future toggle)",
    });
  }
  const [first, ...rest] = findings;
  if (first !== undefined) {
    // Nonempty by construction — the tuple type carries it (R4).
    return { ok: false, findings: [first, ...rest] };
  }
  return { ok: true, effective: EFFECTIVE };
}

function evaluate(_effectiveConfig: unknown, projection: GateProjection): GateDecision {
  const hasPriorFromThisStep = projection.history.some(
    (entry) => entry.stepId === projection.currentStep,
  );
  if (hasPriorFromThisStep) {
    return { verdict: "allow" };
  }
  return { verdict: "block", reason: "sys:no_previous_verdict" };
}

export const previousReviewerVerdictRegistration: InlineGateRegistration = {
  implementation: "packaged",
  execution: "inline",
  requiresRuntimeContext: false,
  validateAndNormalizeConfig,
  evaluate,
};
