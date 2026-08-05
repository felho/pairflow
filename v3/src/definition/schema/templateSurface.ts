import type { GateCatalog } from "../../ports/index.js";
import type { ValidationFinding } from "../errors.js";
import type { EngineChannel } from "./engine.js";
import { astPath, runSurface, sourceLadderFinding } from "./engine.js";
import { normalize } from "./normalizer.js";
import { templateFormat } from "./templateFormat.js";

/**
 * The template surface, composed: ONE engine run over the declaration on
 * whichever channel the caller is on, plus the AUDITED RESIDUAL — the
 * lanes that ADR-019 D1 leaves to prose/code — wired into the SAME finding
 * pipeline so the output is one uniform stream.
 *
 * The residual realized here, by audit family:
 *
 * - **R3** the existential cross-rule over resolved registrations
 *   (ch11-C19 → ch12-C5): "IF any binding resolves to a registration whose
 *   `requiresRuntimeContext` is true THEN `$.runtimeContext` must be a
 *   spec map" is a conditional over a DERIVED property of an injected
 *   object; a `when:` general enough to express it is an expression
 *   language.
 * - **R7** the uses-scoped SOURCE ladder on two gate-config integers
 *   (ch11-C12's source half). Its declaration exists — `[vc-authored-int]`
 *   — but realizing it inside the engine requires the `delegate` hand-off
 *   to carry the CHANNEL into the registration, which is a change to the
 *   ratified `GateRegistration` port shape: out of ADR-019 D2's scope and
 *   exactly the "while we are here" D6 forbids. Under D7's ≥2-row test the
 *   alternative — a construct that scopes a source lane by a sibling's
 *   value, serving this one row — is refused, and the row keeps a code
 *   lane. This is R7's first live member; the family was kept open at the
 *   ratification for precisely this case.
 *
 * Not here, and deliberately: **R5** (the store's declared-ref/filename
 * check) stays the store stage's, and **R6** is library-owned wording.
 */

export interface SurfaceOutcome {
  readonly findings: readonly ValidationFinding[];
  /** The admitted VALUE, unbranded: ch11-P2a A6 keeps `admitTemplate` the
   * ONLY sanctioned producer of the `AdmittedTemplate` brand, and that
   * guard is lint-enforced. The engine computes the value; admission
   * brands it. */
  readonly admitted?: unknown;
}

const RUNTIME_CONTEXT_CODE = "runtime_context_required_for_process_gate";

/** R7: the two uses-scoped integer fields whose SOURCE form is laddered by
 * the walk. The scoping is SYNTACTIC — the authored `uses` string, no
 * catalog resolution — exactly as the measured lane does it. */
const SOURCE_SCOPED_CONFIG_FIELDS: Readonly<Record<string, readonly string[]>> = {
  "declarative.threshold": ["value"],
  "external.process": ["timeoutMs"],
};

function isContainer(value: unknown): value is ReadonlyMap<unknown, unknown> | Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function entriesOf(
  value: ReadonlyMap<unknown, unknown> | Record<string, unknown>,
): readonly (readonly [unknown, unknown])[] {
  if (value instanceof Map) return [...value.entries()];
  return Object.keys(value).map((key) => [key, (value as Record<string, unknown>)[key]] as const);
}

function get(value: unknown, key: string): unknown {
  if (!isContainer(value)) return undefined;
  if (value instanceof Map) return value.get(key);
  return Object.prototype.hasOwnProperty.call(value, key) ? (value as Record<string, unknown>)[key] : undefined;
}

/** R7's walk: `steps.<id>.gates.<event>[<i>].config.<field>` for the two
 * scoped fields, on the file channel only (no source, no lane). */
function sourceScopedFindings(value: unknown, channel: EngineChannel): ValidationFinding[] {
  if (channel.kind !== "file") return [];
  const findings: ValidationFinding[] = [];
  const steps = get(value, "steps");
  if (!isContainer(steps)) return findings;
  for (const [stepId, step] of entriesOf(steps)) {
    if (typeof stepId !== "string" || !isContainer(step)) continue;
    const gates = get(step, "gates");
    if (!isContainer(gates)) continue;
    for (const [eventType, pipeline] of entriesOf(gates)) {
      if (typeof eventType !== "string" || !Array.isArray(pipeline)) continue;
      pipeline.forEach((binding: unknown, index: number) => {
        if (!isContainer(binding)) return;
        const uses = get(binding, "uses");
        const config = get(binding, "config");
        if (typeof uses !== "string" || !isContainer(config)) return;
        for (const field of SOURCE_SCOPED_CONFIG_FIELDS[uses] ?? []) {
          if (get(config, field) === undefined) continue;
          const path = `steps.${stepId}.gates.${eventType}[${String(index)}].config.${field}`;
          const node: unknown = channel.doc.getIn(astPath(path), true);
          const message = sourceLadderFinding(node, channel.source, path);
          if (message !== undefined) findings.push({ path, message });
        }
      });
    }
  }
  return findings;
}

/**
 * R3: exactly ONE template-grain finding when a resolved process gate
 * demands a runtime context the template does not provision. The lane is
 * a DEPENDENT of the `runtimeContext` node: an illegal value fired its own
 * container finding and left the normalized field absent, which suppresses
 * this one (ch8-C21's container-precondition rule).
 */
function runtimeContextCrossRule(
  normalized: unknown,
  bindings: readonly string[],
): ValidationFinding | undefined {
  if (bindings.length === 0) return undefined;
  const requirement = get(normalized, "runtimeContext");
  if (requirement === undefined || isContainer(requirement)) return undefined;
  return {
    path: "runtimeContext",
    code: RUNTIME_CONTEXT_CODE,
    message:
      `template declares process gate(s) requiring runtime context but does not ` +
      `declare a provisionable runtimeContext spec { kind, provider } (gates: ${bindings.join(", ")})`,
  };
}

/**
 * Run the template surface on ONE channel. All-or-nothing: any finding
 * means no admitted value exists (ch8-C22), and the admitted form is
 * produced by the NORMALIZER, never by the validator (D3).
 */
export function runTemplateSurface(
  value: unknown,
  channel: EngineChannel,
  catalog: GateCatalog,
): SurfaceOutcome {
  const run = runSurface(templateFormat, value, { channel, catalog });
  const findings: ValidationFinding[] = [...run.findings];
  findings.push(...sourceScopedFindings(value, channel));
  const crossRule = runtimeContextCrossRule(run.normalized, run.runtimeContextBindings);
  if (crossRule !== undefined) findings.push(crossRule);
  if (findings.length > 0) return { findings };
  return { findings: [], admitted: normalize(templateFormat, run.normalized, run.effectiveConfigs) };
}
