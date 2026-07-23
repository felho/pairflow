import type { EffectiveProcessConfig } from "../domain/index.js";
import type {
  GateConfigFinding,
  GateConfigResult,
  ProcessGateRegistration,
} from "../ports/index.js";

/**
 * `external.process` (packet ch11-P3a, G2/V1–V4): the process-gate
 * registration. It carries NO `evaluate` — a process gate runs via the
 * `ProcessGateRunner` port (P3b), not an in-process evaluator. Its
 * `validateAndNormalizeConfig` body IS the model's `validate_gate_config`
 * unit: invoked by ADMISSION (`admitTemplate`) at definition load, never by
 * CREATE and never mid-run. Failures are DEFINITION ISSUES; defaults
 * MATERIALIZE here into the effective config (resolved once — downstream,
 * including the P3b process wire, reads only the effective form).
 *
 * The BUILD TARGET is the canonical V-matrix, not the model skeleton: the
 * o/p disposition lanes are DISTINCT single-code lanes (a `failInstance`
 * value yields exactly one `gate_config_not_supported` finding, never the
 * o+p double), and the `reason` grammar / exitCode-mode materialization /
 * unknown-key + container-kind checks that the skeleton omits ARE realized.
 *
 * Own-property discipline (G8, `threshold.ts` pattern): every config read and
 * every unknown-key scan runs over OWN enumerable string keys only — a
 * `__proto__` or inherited member is never read as config.
 */

/** The definition-issue codes this registration assigns (V4 / the operative
 * material's data line). The tokens reuse the former rejection names but ride
 * ch8's load channel as ISSUE codes. */
const CODE_INVALID = "invalid_process_gate_config";
const CODE_NOT_SUPPORTED = "gate_config_not_supported";

/** The `reason` token grammar (V2 lane q). */
const TOKEN_RE = /^[a-z][a-z0-9_]*$/;

/** The C17 exitCode-mode default reason tokens, per bucket. */
const DEFAULT_REASON_ZERO = "sys:exit_zero";
const DEFAULT_REASON_NONZERO = "sys:exit_nonzero";

const TOP_KEYS = ["command", "timeoutMs", "output", "onExit", "onRunnerError", "onTimeout", "reason"];
const OUTPUT_MODES = ["exitCode", "gateDecisionJson"] as const;
const VERDICTS = ["allow", "warn", "block"] as const;
const DISPOSITION_KEYS = ["onRunnerError", "onTimeout"] as const;
const BUCKETS = ["zero", "nonzero"] as const;

type OutputMode = (typeof OUTPUT_MODES)[number];
type Verdict = (typeof VERDICTS)[number];

// `EffectiveProcessConfig` HOME is `domain/gate.ts` (ch11-P3b): the kernel
// branch and this validator share ONE shape. This module remains its sole
// producer (materialize-once at admission); the kernel is a typed reader.

function isConfigMap(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ownGet(record: Record<string, unknown>, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

/** Read an own string token from a validated `reason` map (success path). */
function reasonToken(reason: Record<string, unknown>, bucket: string): string | undefined {
  const value = ownGet(reason, bucket);
  return typeof value === "string" ? value : undefined;
}

function validateAndNormalizeConfig(raw: unknown): GateConfigResult {
  // Lane a: config is REQUIRED (C5) — uncoded, at the config path.
  if (raw === undefined) {
    return { ok: false, findings: [{ path: "", message: "external.process requires a config" }] };
  }
  // Lane b: container precondition — a non-map config is ONE finding, its
  // dependent lanes suppressed (no per-key cascade). Uncoded.
  if (!isConfigMap(raw)) {
    return { ok: false, findings: [{ path: "", message: "config must be a map" }] };
  }

  const findings: GateConfigFinding[] = [];

  // Lane c: unknown top-level process-config key — uncoded.
  for (const key of Object.keys(raw)) {
    if (!TOP_KEYS.includes(key)) {
      findings.push({ path: key, message: `unknown config key '${key}' (allowed: ${TOP_KEYS.join(", ")})` });
    }
  }

  // Lane d: `command` missing / empty / non-string → coded.
  const command = ownGet(raw, "command");
  if (command === undefined) {
    findings.push({ path: "command", code: CODE_INVALID, message: "command is required" });
  } else if (typeof command !== "string" || command === "") {
    findings.push({ path: "command", code: CODE_INVALID, message: "command must be a non-empty string" });
  }

  // Lane e: `timeoutMs` missing or value-invalid per V3 (safe integer ≥ 1;
  // the full numeric ladder — `-0`, NaN, Infinity, non-integer, unsafe,
  // boxed, non-number all fail `Number.isSafeInteger(...) && >= 1`) → coded.
  const timeoutMs = ownGet(raw, "timeoutMs");
  if (timeoutMs === undefined) {
    findings.push({ path: "timeoutMs", code: CODE_INVALID, message: "timeoutMs is required" });
  } else if (typeof timeoutMs !== "number" || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1) {
    findings.push({ path: "timeoutMs", code: CODE_INVALID, message: "timeoutMs must be a safe integer >= 1" });
  }

  // `output` — the mode is `exitCode` by default (C14); an unknown-value mode
  // is the only invalid form. `mode` stays `undefined` (unresolved) when the
  // container or value is bad, suppressing the mode-conditional onExit lanes.
  const output = ownGet(raw, "output");
  let mode: OutputMode | undefined;
  if (output === undefined) {
    mode = "exitCode";
  } else if (!isConfigMap(output)) {
    // Lane f: container precondition — suppress g/h and the onExit lanes.
    findings.push({ path: "output", message: "output must be a map" });
  } else {
    // Lane g: unknown inner key — uncoded.
    for (const key of Object.keys(output)) {
      if (key !== "mode") {
        findings.push({ path: `output.${key}`, message: `unknown output key '${key}' (allowed: mode)` });
      }
    }
    const rawMode = ownGet(output, "mode");
    if (rawMode === undefined) {
      mode = "exitCode"; // the defaulted form
    } else if (rawMode === "exitCode" || rawMode === "gateDecisionJson") {
      mode = rawMode;
    } else {
      // Lane h: `output.mode` not in the allowlist (non-string included) → coded.
      findings.push({
        path: "output.mode",
        code: CODE_INVALID,
        message: `output.mode must be one of ${OUTPUT_MODES.join(", ")}`,
      });
    }
  }

  // `onExit` — mode-conditional. In exitCode mode it is REQUIRED and its
  // buckets are validated (lanes i/j/k/l/m). In gateDecisionJson mode its
  // mere presence is UNCONSUMED config (lane n, uncoded). When `mode` is
  // unresolved the lanes are suppressed (the container/value fault already
  // fired).
  const onExit = ownGet(raw, "onExit");
  if (mode === "exitCode") {
    if (onExit === undefined) {
      // Lane i: missing in exitCode mode (the defaulted form included) → coded.
      findings.push({ path: "onExit", code: CODE_INVALID, message: "onExit is required in exitCode mode" });
    } else if (!isConfigMap(onExit)) {
      // Lane j: container precondition — suppress k/l/m.
      findings.push({ path: "onExit", message: "onExit must be a map" });
    } else {
      // Lane m: surplus key — uncoded.
      for (const key of Object.keys(onExit)) {
        if (key !== "zero" && key !== "nonzero") {
          findings.push({ path: `onExit.${key}`, message: `unknown onExit key '${key}' (allowed: zero, nonzero)` });
        }
      }
      for (const bucket of BUCKETS) {
        const value = ownGet(onExit, bucket);
        if (value === undefined) {
          // Lane k: bucket missing → coded.
          findings.push({ path: `onExit.${bucket}`, code: CODE_INVALID, message: `onExit.${bucket} is required` });
        } else if (value !== "allow" && value !== "warn" && value !== "block") {
          // Lane l: bucket value outside the verdict allowlist (`route` included) → coded.
          findings.push({
            path: `onExit.${bucket}`,
            code: CODE_INVALID,
            message: `onExit.${bucket} must be one of ${VERDICTS.join(", ")}`,
          });
        }
      }
    }
  } else if (mode === "gateDecisionJson" && onExit !== undefined) {
    // Lane n: onExit present in gateDecisionJson mode (unconsumed config) — uncoded.
    findings.push({ path: "onExit", message: "onExit is not consumed in gateDecisionJson mode" });
  }

  // Dispositions (lanes o/p). DISTINCT single-code lanes: `failInstance` is
  // the reserved-disposition lane (o, `gate_config_not_supported`); any OTHER
  // non-`blockTransition` value is lane p (`invalid_process_gate_config`).
  // The if/else-if forecloses the o+p double the skeleton's fall-through
  // would produce (the operative-material authority note).
  for (const key of DISPOSITION_KEYS) {
    const disposition = ownGet(raw, key);
    if (disposition === undefined) {
      continue; // absent ⇒ blockTransition materializes into the effective config
    }
    if (disposition === "failInstance") {
      findings.push({
        path: key,
        code: CODE_NOT_SUPPORTED,
        message: `${key}: failInstance is a reserved future disposition`,
      });
    } else if (disposition !== "blockTransition") {
      findings.push({ path: key, code: CODE_INVALID, message: `${key} must be blockTransition` });
    }
  }

  // Lane q: `reason` — a non-map value is a CONTAINER PRECONDITION (one
  // finding, sub-lanes suppressed, symmetric with b/f/j); on a map, an
  // unknown key or a token failing the grammar is uncoded.
  const reason = ownGet(raw, "reason");
  if (reason !== undefined) {
    if (!isConfigMap(reason)) {
      findings.push({ path: "reason", message: "reason must be a map" });
    } else {
      for (const key of Object.keys(reason)) {
        if (key !== "zero" && key !== "nonzero") {
          findings.push({ path: `reason.${key}`, message: `unknown reason key '${key}' (allowed: zero, nonzero)` });
          continue;
        }
        const token = ownGet(reason, key);
        if (typeof token !== "string" || !TOKEN_RE.test(token)) {
          findings.push({ path: `reason.${key}`, message: `reason.${key} must match ${TOKEN_RE.source}` });
        }
      }
    }
  }

  const [first, ...rest] = findings;
  if (first !== undefined) {
    // Nonempty by construction — the tuple type carries it (R4).
    return { ok: false, findings: [first, ...rest] };
  }

  // Success: materialize the effective config ONCE. Every read below is
  // known-valid (a finding would have returned above); `mode` is resolved.
  const effectiveMode: OutputMode = mode ?? "exitCode";
  const base = {
    command: command as string,
    timeoutMs: timeoutMs as number,
    output: { mode: effectiveMode },
    onRunnerError: "blockTransition" as const,
    onTimeout: "blockTransition" as const,
  };
  const reasonMap = isConfigMap(reason) ? reason : undefined;

  if (effectiveMode === "exitCode") {
    const onExitMap = onExit as Record<string, unknown>;
    // `reason` is ALWAYS present and COMPLETE — both buckets, authored-or-default (C17).
    const effective: EffectiveProcessConfig = {
      ...base,
      onExit: {
        zero: ownGet(onExitMap, "zero") as Verdict,
        nonzero: ownGet(onExitMap, "nonzero") as Verdict,
      },
      reason: {
        zero: reasonMap ? (reasonToken(reasonMap, "zero") ?? DEFAULT_REASON_ZERO) : DEFAULT_REASON_ZERO,
        nonzero: reasonMap
          ? (reasonToken(reasonMap, "nonzero") ?? DEFAULT_REASON_NONZERO)
          : DEFAULT_REASON_NONZERO,
      },
    };
    return { ok: true, effective };
  }

  // gateDecisionJson mode: `onExit` is absent from the effective config;
  // `reason` is present IFF AUTHORED and carried VERBATIM (a partial map
  // stays partial — C17's exit-bucket defaults never apply in this mode).
  if (reasonMap === undefined) {
    const effective: EffectiveProcessConfig = { ...base };
    return { ok: true, effective };
  }
  const zero = reasonToken(reasonMap, "zero");
  const nonzero = reasonToken(reasonMap, "nonzero");
  const carriedReason = {
    ...(zero !== undefined ? { zero } : {}),
    ...(nonzero !== undefined ? { nonzero } : {}),
  };
  const effective: EffectiveProcessConfig = { ...base, reason: carriedReason };
  return { ok: true, effective };
}

export const processRegistration: ProcessGateRegistration = {
  implementation: "process",
  execution: "inline",
  requiresRuntimeContext: true,
  validateAndNormalizeConfig,
};
