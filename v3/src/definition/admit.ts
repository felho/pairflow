import type { AdmittedTemplate, GateBinding, Step, WorkflowTemplate } from "../domain/index.js";
import type { GateCatalog } from "../ports/index.js";
import type { ValidationFinding } from "./errors.js";

/**
 * `admitTemplate` (packet ch11-P2a, A1–A7): THE single semantic
 * validation + normalization point for gate semantics (C20 realized).
 * The FILE pipeline runs it as the validate stage's SECOND rung; a
 * directly-constructed template enters through the SAME function (the
 * testkit path). Findings ride the SAME load channel under stage
 * `"validate"`.
 *
 * ALL-OR-NOTHING (A2): every binding's lanes report (suppression is
 * LOCAL — a broken container suppresses only its OWN dependent lanes);
 * ANY finding ⇒ no admitted value exists. On success, the EFFECTIVE
 * config materialized by each registration is written into the
 * binding's `config` field — the single downstream config surface (A5)
 * — and the branded value is produced HERE, the ONLY sanctioned
 * `as AdmittedTemplate` site (A6, lint-guarded).
 *
 * NOT here: structural well-formedness (the ch8 validate stage owns it
 * on the file path; the CALLER's precondition on the direct path, A1);
 * the `requires_runtime_context` cross-rule branch and the
 * `validate_gate_config` process body (P3, A7); any re-validation of an
 * already-admitted value.
 */
export type AdmitResult =
  | { readonly ok: true; readonly template: AdmittedTemplate }
  | { readonly ok: false; readonly findings: readonly ValidationFinding[] };

function isMap(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ownGet(record: Record<string, unknown>, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

/** Own-property WRITE (the G8 discipline applied at write time): a step
 * or event-type key legally admits `__proto__`; a bracket assignment
 * would set the prototype and drop the own key (the ch8 validate stage's
 * `defineOwn` twin). Build the admitted aggregate the same way. */
function defineOwn<T>(target: Record<string, T>, key: string, value: T): void {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

/** Compose a config finding's C7 address from the binding base + the
 * registration's config-relative path (`""` = the config object). */
function configPath(base: string, relative: string): string {
  return relative === "" ? `${base}.config` : `${base}.config.${relative}`;
}

/** A2 (packet ch11-P4, C6): the `uses` grammar — two or more
 * dot-separated lowercase segments. Checked BEFORE `catalog.resolve`
 * so the coded `gate_evaluator_unavailable` lane narrows to
 * unknown-but-GRAMMATICAL (C21's two-lane letter). */
const USES_GRAMMAR = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

/** Cycle-safe value rendering for finding messages (the validate-stage
 * `describeValue` twin): a cast-forged or file-channel raw value may be
 * a map/list — objects are described, never serialized. */
function describeValue(value: unknown): string {
  if (typeof value === "object" && value !== null) {
    return Array.isArray(value) ? "a list" : "a map";
  }
  return JSON.stringify(value) ?? String(value);
}

/**
 * A1 (packet ch11-P2c): expand a step's transitions into the model's
 * COMPLETE per-transition `advancesRound` map — every
 * `eventType ∈ keys(step.transitions)` present with an explicit boolean
 * `(target ∈ advanceOnArrivalAt)`. An empty transitions map yields an
 * empty map; the absent declaration (empty `advanceSet`) yields ALL-FALSE
 * (C38's none-default). No flag is synthesized for activation — it has no
 * incoming edge (the model's clause; `start.ts` owns `round ← 1`). The
 * own-key `defineOwn` write mirrors the gate walk's G8 discipline (an
 * event type named `__proto__` stays an own key). */
function expandAdvancesRound(step: Step, advanceSet: ReadonlySet<string>): Record<string, boolean> {
  const transitions = isMap(step.transitions) ? step.transitions : {};
  const map: Record<string, boolean> = {};
  for (const eventType of Object.keys(transitions)) {
    const target = ownGet(transitions, eventType) as string;
    defineOwn(map, eventType, advanceSet.has(target));
  }
  return map;
}

export function admitTemplate(template: WorkflowTemplate, catalog: GateCatalog): AdmitResult {
  const findings: ValidationFinding[] = [];
  // (stepId → eventType → index) → the effective config to materialize.
  const effectiveConfigs = new Map<string, unknown>();
  const effectiveKey = (stepId: string, eventType: string, index: number): string =>
    `${stepId}\u0000${eventType}\u0000${String(index)}`;

  // A7 (packet ch11-P3a, V5): the C19 cross-rule DETECTION rides the
  // per-binding loop below — a resolved registration's requiresRuntimeContext
  // flag is observed as bindings resolve; each triggering binding's C7 address
  // is collected here. The SINGLE template-grain finding emits ONCE, post-loop.
  const runtimeContextBindings: string[] = [];

  for (const stepId of Object.keys(template.steps)) {
    const step = ownGet(template.steps, stepId) as Step;
    const gates: unknown = step.gates;
    if (gates === undefined) {
      continue;
    }
    const gatesBase = `steps.${stepId}.gates`;
    if (!isMap(gates)) {
      findings.push({ path: gatesBase, message: "gates must be a map of event type to gate pipeline" });
      continue;
    }
    const transitions = isMap(step.transitions) ? step.transitions : {};
    for (const eventType of Object.keys(gates)) {
      const eventBase = `${gatesBase}.${eventType}`;
      // A4/C2: a gates key that is not a transition of the step is dead
      // config — nothing below can be validated against it.
      if (!Object.prototype.hasOwnProperty.call(transitions, eventType)) {
        findings.push({
          path: eventBase,
          message: `dead gate config: '${eventType}' is not a transition of step '${stepId}'`,
        });
        continue;
      }
      const pipeline: unknown = ownGet(gates, eventType);
      if (!Array.isArray(pipeline)) {
        findings.push({ path: eventBase, message: "gate pipeline must be a list" });
        continue;
      }
      // A4/C3: an empty gate list is a finding (admission-owned).
      if (pipeline.length === 0) {
        findings.push({ path: eventBase, message: "gate pipeline must not be empty" });
        continue;
      }
      pipeline.forEach((rawBinding: unknown, index: number) => {
        const bindingBase = `${eventBase}[${String(index)}]`;
        if (!isMap(rawBinding)) {
          findings.push({ path: bindingBase, message: "gate binding must be a map" });
          return;
        }
        // A1 (packet ch11-P4, C4): the gate-binding UNKNOWN-KEY lane —
        // the legal keyset is exactly `uses` + optional `config`; any
        // other own key is an UNCODED finding at its own C7 address (the
        // ch8-C13 fail-closed culture at the binding grain). This closes
        // the silent-drop window; it ACCUMULATES with the lanes below.
        for (const key of Object.keys(rawBinding)) {
          if (key !== "uses" && key !== "config") {
            findings.push({
              path: `${bindingBase}.${key}`,
              message: `unknown gate binding key '${key}' (allowed: uses, config)`,
            });
          }
        }
        const uses = ownGet(rawBinding, "uses");
        if (typeof uses !== "string" || uses === "") {
          findings.push({ path: `${bindingBase}.uses`, message: "uses must be a non-empty string" });
          return;
        }
        // A2 (packet ch11-P4, C6): the `uses` GRAMMAR lane — its OWN
        // UNCODED finding, DISTINCT from resolution; catalog resolution
        // runs only on grammatical ids, so the coded lane below means
        // exactly unknown-but-GRAMMATICAL.
        if (!USES_GRAMMAR.test(uses)) {
          findings.push({
            path: `${bindingBase}.uses`,
            message: `uses must match ${USES_GRAMMAR.source} (two or more dot-separated lowercase segments); got ${JSON.stringify(uses)}`,
          });
          return;
        }
        const registration = catalog.resolve(uses);
        if (registration === null) {
          // A3/C20: the coded definition lane; nothing below dereferences
          // the missing registration (the unit's CONTINUE).
          findings.push({
            path: bindingBase,
            code: "gate_evaluator_unavailable",
            message: `no gate evaluator is registered for '${uses}'`,
          });
          return;
        }
        // A7 (packet ch11-P3a, V5): observe the resolved registration's
        // requiresRuntimeContext flag — a process gate makes the template
        // subject to the C19 cross-rule. Recorded regardless of the gate's
        // config validity (the gate IS declared); the single finding emits
        // post-loop. The config validation below still accumulates its own
        // lanes.
        if (registration.requiresRuntimeContext) {
          runtimeContextBindings.push(bindingBase);
        }
        const rawConfig = ownGet(rawBinding, "config");
        const result = registration.validateAndNormalizeConfig(rawConfig);
        if (!result.ok) {
          // The failure arm is statically nonempty (GateConfigResult);
          // the belt below guards a cast-forged registration — a failure
          // with ZERO findings must still block admission (arm-gate-2
          // finding 1: it would otherwise admit with config undefined).
          if (result.findings.length === 0) {
            findings.push({
              path: configPath(bindingBase, ""),
              message: `gate evaluator '${uses}' reported a config failure without findings`,
            });
            return;
          }
          for (const finding of result.findings) {
            // V4/A9 (packet ch11-P3a): propagate the registration's code
            // carrier verbatim — present only on the named coded lanes, absent
            // (never a spurious `code: undefined`) on every uncoded lane.
            findings.push({
              path: configPath(bindingBase, finding.path),
              message: finding.message,
              ...(finding.code !== undefined ? { code: finding.code } : {}),
            });
          }
          return;
        }
        effectiveConfigs.set(effectiveKey(stepId, eventType, index), result.effective);
      });
    }
  }

  // A7 (packet ch11-P3a, V5): the C19 cross-rule fires post-loop as EXACTLY
  // ONE template-grain finding at the top-level `runtimeContext` path — never
  // per binding, never C7-prefixed. It fires IFF the template declares ≥ 1
  // process gate (a requiresRuntimeContext registration resolved above) AND
  // `template.runtimeContext` is not `"required"`. The message names the
  // triggering bindings (packet freedom — every trigger stays locatable);
  // the single push holds even for N ≥ 2 offending gates (the collapse).
  if (runtimeContextBindings.length > 0 && template.runtimeContext !== "required") {
    findings.push({
      path: "runtimeContext",
      code: "runtime_context_required_for_process_gate",
      message:
        `template declares process gate(s) requiring runtime context but does not set ` +
        `runtimeContext: "required" (gates: ${runtimeContextBindings.join(", ")})`,
    });
  }

  // A3 (packet ch11-P4, C18): the runtimeContext ILLEGAL-VALUE lane — a
  // present value that is not the string "required" is an UNCODED finding
  // at the top-level `runtimeContext` path (type-foreclosed on the
  // well-typed direct channel; the lane guards the file channel and
  // cast-forged direct values). It ACCUMULATES with the C19 cross-rule
  // where both fire (a process-gated template with an illegal value).
  const runtimeContext: unknown = template.runtimeContext;
  if (runtimeContext !== undefined && runtimeContext !== "required") {
    findings.push({
      path: "runtimeContext",
      message: `runtimeContext must be the string "required" when present; got ${describeValue(runtimeContext)}`,
    });
  }

  // A2 (packet ch11-P2c, C40's value-level share): validate the authored
  // `round` declaration — the value-level lanes as ch8-C21 {path, message}
  // findings at C40's paths, ACCUMULATING with the gate findings above
  // (A3, C21's one channel). The source-form lanes (non-map, non-list,
  // non-string member) are the ch11-P4 format walk's (F5) — the TYPED
  // direct input forecloses them here, and the file channel emits them
  // upstream of this rung. Membership is against `keys(steps)`; terminal
  // ids live in `template.terminal`, not `steps`, so a terminal member is
  // caught by the SAME membership lane (C37's exclusion).
  const declaration = template.round;
  if (declaration !== undefined) {
    const listed = declaration.advanceOnArrivalAt;
    if (listed.length === 0) {
      findings.push({ path: "round.advanceOnArrivalAt", message: "round.advanceOnArrivalAt must not be empty" });
    }
    const seen = new Set<string>();
    listed.forEach((member, index) => {
      if (!Object.prototype.hasOwnProperty.call(template.steps, member)) {
        findings.push({
          path: `round.advanceOnArrivalAt[${String(index)}]`,
          message: `round.advanceOnArrivalAt member '${member}' is not a step`,
        });
      }
      if (seen.has(member)) {
        findings.push({
          path: `round.advanceOnArrivalAt[${String(index)}]`,
          message: `round.advanceOnArrivalAt member '${member}' is duplicated`,
        });
      }
      seen.add(member);
    });
  }

  if (findings.length > 0) {
    return { ok: false, findings };
  }

  // All-or-nothing success: rebuild the aggregate with EFFECTIVE configs
  // materialized into each binding's single config surface (A5), and each
  // step's COMPLETE `advancesRound` map expanded from the declaration
  // (A1). PRODUCER MONOPOLY: the map is recomputed from the declaration-
  // or-default and OVERWRITES any input `advancesRound` wholesale (the
  // shared type permits a raw input to carry pre-populated flags); the
  // absent declaration yields all-false maps (C38). The input is never
  // mutated — every step is rebuilt via spread (A4, input purity).
  const advanceSet = new Set<string>(declaration?.advanceOnArrivalAt ?? []);
  const admittedSteps: Record<string, Step> = {};
  for (const stepId of Object.keys(template.steps)) {
    const step = ownGet(template.steps, stepId) as Step;
    const advancesRound = expandAdvancesRound(step, advanceSet);
    if (step.gates === undefined) {
      // The gateless step is otherwise copied verbatim (note 1) — the
      // spread attaches the recomputed map and overwrites any input flags.
      defineOwn(admittedSteps, stepId, { ...step, advancesRound });
      continue;
    }
    const admittedGates: Record<string, readonly GateBinding[]> = {};
    for (const eventType of Object.keys(step.gates)) {
      const pipeline = ownGet(step.gates, eventType) as readonly GateBinding[];
      defineOwn(
        admittedGates,
        eventType,
        pipeline.map((binding, index) => ({
          uses: binding.uses,
          config: effectiveConfigs.get(effectiveKey(stepId, eventType, index)),
        })),
      );
    }
    defineOwn(admittedSteps, stepId, { ...step, gates: admittedGates, advancesRound });
  }
  // G3 (packet ch12-p1b): the C1 activation default MATERIALIZED once
  // at admission — an absent key becomes `{mode: "immediate"}` on the
  // ADMITTED value (the advancesRound expansion pattern; the raw input
  // is never mutated). The FILE key stays unauthorable until P4 (the
  // ch8 unknown-key rejection stands — C25's window); an authored
  // direct-channel value is carried verbatim.
  const admitted = {
    ...template,
    steps: admittedSteps,
    activation: template.activation ?? { mode: "immediate" },
  } as AdmittedTemplate;
  return { ok: true, template: admitted };
}
