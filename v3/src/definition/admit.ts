import type {
  AdmittedTemplate,
  GateBinding,
  RuntimeContextSpec,
  Step,
  WorkflowTemplate,
} from "../domain/index.js";
import { isCanonicalizable } from "../emit/opId.js";
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
 * A1/A2 (packet ch12-p2, C7): the value-level narrowing for a run-profile
 * position (`steps.<s>.agentConfig`, `roles.<r>.defaultAgentConfig`) — a
 * PRESENT value must be a MAP whose resolved values are
 * canonical-JSON-safe (the `isCanonicalizable` predicate: finite numbers,
 * plain maps/lists/scalars; `.nan`/`.inf` doubles rejected). ONE finding
 * at the position's C7 path — a non-map SUPPRESSES the canonical-safety
 * lane (dependent-lane suppression). Type-foreclosed on the well-typed
 * direct channel; the lane guards the file channel and cast-forged direct
 * values. Absent (the empty layer) is admissible.
 */
function checkAgentConfigValue(
  value: unknown,
  path: string,
  field: string,
  findings: ValidationFinding[],
): void {
  if (value === undefined) {
    return;
  }
  // The container lane: a PLAIN map (a plain object with string keys) —
  // a non-object, an array, or a non-plain object (a JS Map from
  // non-string YAML keys, a class instance) is NOT a plain map. This
  // SUPPRESSES the canonical-safety lane below (dependent-lane
  // suppression); a canonical JSON map has string keys by construction.
  if (!isPlainMap(value)) {
    findings.push({ path, message: `${field} must be a map; got ${describeValue(value)}` });
    return;
  }
  // The value lane: a plain string-keyed map whose RESOLVED values are
  // not canonical-JSON-safe (a `.nan`/`.inf` double, a non-plain nested
  // object, a symbol/undefined member) fails.
  if (!isCanonicalizable(value)) {
    findings.push({
      path,
      message: `${field} must be canonical-JSON-safe (a map of finite numbers and plain values)`,
    });
  }
}

/** A plain string-keyed map: a plain object (Object.prototype or null
 * proto), never an array, a JS Map, or a class instance. Distinct from
 * `isMap` (which admits any non-array object) because a run-profile
 * position must be a canonical-JSON map — string keys by construction. */
function isPlainMap(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
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
    // A1 (packet ch12-p2, C7): the steps.<s>.agentConfig value-level lane
    // — fires on EVERY admission channel (file included, via the validate
    // stage's admit rung; direct-construction, via the same function).
    checkAgentConfigValue(step.agentConfig, `steps.${stepId}.agentConfig`, "agentConfig", findings);
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

  // A2 (packet ch12-p2, C7): the roles.<r>.defaultAgentConfig value-level
  // lane — driven through BOTH channels: the DIRECT-construction channel and
  // (since ch12-P4, F4) the FILE channel's roles source-form walk.
  for (const roleName of Object.keys(template.roles)) {
    const role = ownGet(template.roles, roleName) as {
      readonly defaultAgentConfig?: unknown;
    };
    checkAgentConfigValue(
      role.defaultAgentConfig,
      `roles.${roleName}.defaultAgentConfig`,
      "defaultAgentConfig",
      findings,
    );
  }

  // R2 (packet ch12-p3, C2 → ch12-P4, A1): the runtimeContext ILLEGAL-VALUE
  // lane — detected FIRST (order is load-bearing, R4). The legal authored
  // domain is absent, the string "none", or a spec MAP { kind, provider,
  // config? }. The RETIRED ch11 bare "required" string fails admission LOUD
  // with its migration text; any other non-"none" scalar/list is an uncoded
  // illegal finding (the file-channel / cast-forged guard). An illegal value
  // fires ONLY its own container finding — the C5 cross-rule below is
  // SUPPRESSED as its dependent (ch8-C21).
  //
  // The ch12-P3 P4-deferred JS-Map interception RETIRES at ch12-P4 (C25): the
  // F3 source-form walk now MATERIALIZES a file-channel spec map into a plain
  // own-property record, so a well-formed file spec reaches admission as a
  // plain object (isMap true) and flows through exactly like the
  // direct-construction spec — one authority, no degenerate staging.
  const runtimeContext: unknown = template.runtimeContext;
  let runtimeContextIllegal = false;
  if (runtimeContext === "required") {
    findings.push({
      path: "runtimeContext",
      message:
        `runtimeContext: "required" is retired — author the spec map ` +
        `{ kind, provider, config? } (a directly-constructed RuntimeContextSpec)`,
    });
    runtimeContextIllegal = true;
  } else if (
    runtimeContext !== undefined &&
    runtimeContext !== "none" &&
    !isMap(runtimeContext)
  ) {
    findings.push({
      path: "runtimeContext",
      message: `runtimeContext must be "none" or a spec map { kind, provider, config? } when present; got ${describeValue(runtimeContext)}`,
    });
    runtimeContextIllegal = true;
  }

  // R4 (packet ch12-p3, C5): the process↔workspace cross-rule — a template
  // declaring ≥ 1 process gate needs a PROVISIONABLE runtime context (only a
  // spec MAP provisions; authored "none" or absent resolves to none). Fires
  // as EXACTLY ONE template-grain finding IFF the resolved requirement is not
  // required(spec) AND the value is LEGAL (an illegal value fired only its
  // own container finding above — this dependent lane is suppressed). The
  // message names the triggering bindings (every trigger stays locatable).
  if (runtimeContextBindings.length > 0 && !runtimeContextIllegal && !isMap(runtimeContext)) {
    findings.push({
      path: "runtimeContext",
      code: "runtime_context_required_for_process_gate",
      message:
        `template declares process gate(s) requiring runtime context but does not ` +
        `declare a provisionable runtimeContext spec { kind, provider } (gates: ${runtimeContextBindings.join(", ")})`,
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
  // is never mutated). Since ch12-P4 the FILE key is authorable (the F2
  // source-form walk); an authored value (file or direct) is carried
  // verbatim, an absent key materializes the default.
  //
  // R1 (packet ch12-p3, C4): the runtime-context requirement MATERIALIZED
  // ONCE at admission — the SAME shape-preserving normalize move as
  // activation. An absent key OR the authored string "none" becomes the
  // "none" requirement; a spec map is kept. The bare "required" string and
  // every illegal value were REFUSED above (findings block admission), so a
  // successfully-admitted template's field ∈ { "none", RuntimeContextSpec } —
  // no absent state downstream.
  const admitted = {
    ...template,
    steps: admittedSteps,
    activation: template.activation ?? { mode: "immediate" },
    runtimeContext: normalizeRuntimeContext(template.runtimeContext),
  } as AdmittedTemplate;
  return { ok: true, template: admitted };
}

/**
 * R1 (packet ch12-p3, C4): the admission-normalize move for the runtime-
 * context requirement — absent ≡ authored "none" → "none"; a spec map kept.
 * The bare "required" string is refused upstream (R2), so reaching it here is
 * structurally-dead integrity drift.
 */
function normalizeRuntimeContext(
  field: RuntimeContextSpec | "none" | "required" | undefined,
): RuntimeContextSpec | "none" {
  if (field === undefined || field === "none") {
    return "none";
  }
  if (field === "required") {
    throw new Error(
      "kernel integrity: a bare 'required' runtimeContext reached admission normalization — R2 should have refused it",
    );
  }
  return field;
}
