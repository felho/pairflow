import { isAlias, isScalar } from "yaml";
import type { Document } from "yaml";

import type {
  ActivationMode,
  AgentConfig,
  RuntimeContextSpec,
  Step,
  WorkflowTemplate,
} from "../domain/index.js";
import type { ValidationFinding } from "./errors.js";

/**
 * Packet ch8-P1: the validate stage — the V1–V17 lane inventory over
 * the RESOLVED value graph (draft C7–C19, C24–C25), with the ONE named
 * exception (V15/draft C5): the version-identity rule (V3/draft C8)
 * inspects the SOURCE DOCUMENT, because the resolved value cannot
 * carry the source-form distinction. Findings accumulate as
 * `{path, message}` in ONE result (E2/draft C21) with dependent-lane
 * suppression: a missing or wrong-kind container yields ITS OWN
 * finding and suppresses the lanes that presuppose it.
 *
 * Packet ch11-P4 (the format extension): the root keyset grows the
 * OPTIONAL `runtimeContext` (F1/C18) and `round` (F1/C37) keys, the
 * step keyset grows the OPTIONAL `gates` key (F2/C1), and three
 * SOURCE-FORM walk lanes join — the gates-subtree key-STRINGNESS rule
 * (F3/GP2), the round source-form lanes (F5/C40), and the C12 integer
 * source ladder for `config.value`/`config.timeoutMs` (F6). Every
 * gate/round/runtimeContext SEMANTIC check stays admission's (C20 —
 * the walk adds no second validation home); the walk's residue is
 * exactly the representability the typed domain slots need. The walk
 * now ALWAYS returns a best-effort template alongside its findings
 * (F7) — the load pipeline runs the admission rung on it and
 * accumulates both stages' findings in one `validate` result.
 */
export interface ValidateOutcome {
  readonly template?: WorkflowTemplate;
  readonly findings: readonly ValidationFinding[];
}

/** The five REQUIRED root keys (ch8-C9) — missing any is a finding. */
const ROOT_KEYS = ["ref", "start", "steps", "terminal", "roles"] as const;
/** F1 (ch11-P4 → ch12-P4): the OPTIONAL root keys the format walk grows
 * to — `runtimeContext` (C18), `round` (C37), and `activation` (ch12-P4,
 * C1). Legal but never required; `gates` at ROOT stays unknown (it is
 * step surface). */
const OPTIONAL_ROOT_KEYS = ["runtimeContext", "round", "activation"] as const;
/** F2 (ch11-P4): the step keyset — the ch8 three required + optional
 * `agentConfig` + optional `gates` (C1). */
const STEP_KEYS = ["role", "instruction", "transitions", "agentConfig", "gates"] as const;
/** F4 (ch12-P4, C6): the roles-entry keyset grows to `defaultActor?` +
 * `defaultAgentConfig?` (both optional). */
const ROLES_ENTRY_KEYS = ["defaultActor", "defaultAgentConfig"] as const;
const REF_ID = /^[a-z0-9][a-z0-9-]*$/;
const VERSION_SOURCE = /^[1-9][0-9]*$/;
/** F2 (ch12-P4, C1): the authored camelCase `activation.mode` values ↔
 * the model's stored snake tokens — the C1/C11 authored↔stored mapping,
 * stated so neither side silently forks. */
const ACTIVATION_MODE_BY_AUTHORED: Readonly<Record<string, ActivationMode>> = {
  immediate: "immediate",
  deferredKickoff: "deferred_kickoff",
};
/** F3 (ch12-P4, C2/C3): the runtimeContext spec-map keyset + the `kind`
 * and dotted `provider` grammars (the ch11-C6 dotted grammar reuse). */
const RUNTIME_CONTEXT_SPEC_KEYS = ["kind", "provider", "config"] as const;
const RUNTIME_CONTEXT_KIND = /^[a-z][a-z0-9_]*$/;
const RUNTIME_CONTEXT_PROVIDER = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

type ResolvedMap = ReadonlyMap<unknown, unknown>;

function isResolvedMap(value: unknown): value is ResolvedMap {
  return value instanceof Map;
}

function mapKeys(map: ResolvedMap): readonly unknown[] {
  return [...map.keys()];
}

function mapEntries(map: ResolvedMap): readonly (readonly [unknown, unknown])[] {
  return [...map.entries()];
}

function mapHas(map: ResolvedMap, key: string): boolean {
  return map.has(key);
}

function mapGet(map: ResolvedMap, key: unknown): unknown {
  return map.get(key);
}

function defineOwn<T>(target: Record<string, T>, key: string, value: T): void {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

function materializeResolvedValue(value: unknown, seen = new WeakMap<object, unknown>()): unknown {
  if (typeof value !== "object" || value === null) return value;
  const existing = seen.get(value);
  if (existing !== undefined) return existing;
  if (Array.isArray(value)) {
    const result: unknown[] = [];
    seen.set(value, result);
    for (const item of value) result.push(materializeResolvedValue(item, seen));
    return result;
  }
  if (isResolvedMap(value)) {
    const entries = mapEntries(value);
    if (entries.every(([key]) => typeof key === "string")) {
      const result: Record<string, unknown> = {};
      seen.set(value, result);
      for (const [key, item] of entries) {
        defineOwn(result, key as string, materializeResolvedValue(item, seen));
      }
      return result;
    }
    const result = new Map<unknown, unknown>();
    seen.set(value, result);
    for (const [key, item] of entries) {
      result.set(materializeResolvedValue(key, seen), materializeResolvedValue(item, seen));
    }
    return result;
  }
  return value;
}

/**
 * CYCLE-SAFE value rendering for finding messages (aftermath round 2,
 * the arm's re-check catch): with V15 accumulating, the walk RUNS on
 * cyclic graphs — `JSON.stringify` on an arbitrary value in a scalar
 * slot (e.g. `role: *a` aliasing a cyclic map) would throw. Objects
 * are described, never serialized; primitives are safe literals.
 */
function describeValue(value: unknown): string {
  if (typeof value === "object" && value !== null) {
    return Array.isArray(value) ? "a list" : "a map";
  }
  return JSON.stringify(value) ?? String(value);
}

/** V5 (draft C10): nonempty, no whitespace (`/\s/u`), no dot — ONE grammar for every id class. */
function idGrammarError(kind: string, id: unknown): string | undefined {
  if (typeof id !== "string" || id.length === 0) {
    return `${kind} must be a nonempty string, got ${describeValue(id)}`;
  }
  if (/[\s.]/u.test(id)) {
    return `invalid ${kind} ${JSON.stringify(id)}: ids contain no whitespace and no "."`;
  }
  return undefined;
}

function joinPath(parent: string, key: string): string {
  return parent === "$" ? key : `${parent}.${key}`;
}

/**
 * V15 (draft C5): the resolved value graph must be acyclic — a cyclic
 * alias structure passes the parser AND the count-only guard (probe
 * P20). DFS with a path-scoped ancestor set: SHARED subtrees (legal
 * anchor reuse) are not cycles; only a back-edge is.
 */
function findCycle(value: unknown, path: string, ancestors: Set<object>): ValidationFinding | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  if (ancestors.has(value)) {
    return { path, message: "cyclic value structure: the resolved template graph must be acyclic" };
  }
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i += 1) {
        const hit = findCycle(value[i], joinPath(path, String(i)), ancestors);
        if (hit) {
          return hit;
        }
      }
      return undefined;
    }
    if (isResolvedMap(value)) {
      for (const [key, child] of mapEntries(value)) {
        const segment = typeof key === "string" ? key : "<map-key>";
        const keyHit = findCycle(key, joinPath(path, `${segment}<key>`), ancestors);
        if (keyHit) {
          return keyHit;
        }
        const valueHit = findCycle(child, joinPath(path, segment), ancestors);
        if (valueHit) {
          return valueHit;
        }
      }
    }
    return undefined;
  } finally {
    ancestors.delete(value);
  }
}

/**
 * V3 (draft C8) / F6 (ch11-P4, draft C12): the SHARED plain-decimal
 * integer SOURCE rule over a YAML node — the range slice / type / tag /
 * anchor, NEVER `.source` (which strips quotes, probe P11). `900.0`,
 * `0x384`, `9e2`, and quoted/anchored/tagged forms all reject on the
 * SOURCE form even where they resolve to an integral value (probe
 * GP4/P11). Emits at most ONE finding for the field; an absent node
 * (never reached for a present field) is nobody's source finding.
 */
function plainIntegerSourceFinding(
  node: unknown,
  source: string,
  path: string,
): ValidationFinding | undefined {
  if (node === undefined || node === null) {
    return undefined;
  }
  if (isAlias(node)) {
    return { path, message: `${path} must not be an alias (an alias hides the source form, probe P21)` };
  }
  if (!isScalar(node)) {
    return { path, message: `${path} must be a plain decimal integer scalar` };
  }
  if (node.anchor !== undefined) {
    return { path, message: `${path} must not carry an anchor (the anchor token sits outside the range slice)` };
  }
  if (node.tag !== undefined) {
    return { path, message: `${path} must not carry a tag (probe P22: a tag can flip the resolved type silently)` };
  }
  const range = node.range;
  const slice = range ? source.slice(range[0], range[1]) : "";
  if (!VERSION_SOURCE.test(slice)) {
    return {
      path,
      message: `${path} must be written as a plain decimal integer >= 1; got source form ${JSON.stringify(slice)}`,
    };
  }
  const resolved = node.value;
  if (typeof resolved !== "number" || !Number.isSafeInteger(resolved) || resolved < 1) {
    return { path, message: `${path} must resolve to a safe integer >= 1` };
  }
  return undefined;
}

/** V3 (draft C8): the version rule's node-level half, over the shared
 * source rule at the `ref.version` node. */
function versionFinding(doc: Document, source: string): ValidationFinding | undefined {
  const node: unknown = doc.getIn(["ref", "version"], true);
  return plainIntegerSourceFinding(node, source, "ref.version");
}

/**
 * F6 (ch11-P4, draft C12): the C12 integer source ladder at a gate
 * config field, addressed through the YAML AST (`doc.getIn` with the
 * numeric list index) so the SOURCE form is inspected, not the resolved
 * value. Presence-conditional at the caller (an absent field is
 * admission's missing lane, never a source finding).
 */
function configIntegerSourceFinding(
  doc: Document,
  source: string,
  nodePath: readonly (string | number)[],
  fieldPath: string,
): ValidationFinding | undefined {
  const node: unknown = doc.getIn(nodePath, true);
  return plainIntegerSourceFinding(node, source, fieldPath);
}

/**
 * F3 (ch11-P4, GP2): the gates subtree's ONE walk rule — every map KEY
 * anywhere under `gates` must be a STRING. A non-string key (the GP2
 * node-level numeric-key identity class) cannot become an own-property
 * record and would blind admission's own-key scans (the silent-drop /
 * silent-typo class), so it is a validate finding at the NEAREST
 * addressable path (the containing map's path). `agentConfig` is
 * EXEMPT (ch8-C14 raw pass-through) and is never scanned here. A
 * permanent visited set keeps the scan finite on aliased/cyclic graphs
 * without re-reporting shared subtrees.
 */
function scanGatesStringness(
  value: unknown,
  path: string,
  findings: ValidationFinding[],
  seen: WeakSet<object>,
): void {
  if (typeof value !== "object" || value === null) {
    return;
  }
  if (seen.has(value)) {
    return;
  }
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanGatesStringness(item, `${path}[${String(index)}]`, findings, seen));
    return;
  }
  if (isResolvedMap(value)) {
    for (const [key, child] of mapEntries(value)) {
      if (typeof key !== "string") {
        findings.push({
          path,
          message: `map keys in the gates subtree must be strings; got ${describeValue(key)}`,
        });
        continue;
      }
      scanGatesStringness(child, joinPath(path, key), findings, seen);
    }
  }
}

export function validateTemplate(value: unknown, doc: Document, source: string): ValidateOutcome {
  // V1: the root container precondition — ONE finding for a non-map root.
  // Disposition (a): with no map operand, no best-effort template exists
  // and the admission rung is fully suppressed (F7).
  if (!isResolvedMap(value)) {
    return {
      findings: [{ path: "$", message: "the template root must be a map with exactly ref, start, steps, terminal, roles" }],
    };
  }

  const findings: ValidationFinding[] = [];
  const root = value;
  // ONE materialization memo per build preserves cross-position aliased
  // value identity (the V9 integration re-check's catch) — shared by the
  // roles `defaultAgentConfig` (F4), the runtimeContext spec map (F3),
  // and the step `agentConfig`/`gates` positions.
  const materializeMemo = new WeakMap<object, unknown>();

  // V15: the cycle finding ACCUMULATES with the structural lanes
  // (E2/C21 accumulation — aftermath fix, the external arm's catch:
  // suppression is a CONTAINER-precondition rule and the cycle is not
  // a container). The walk below is constant-depth (it never recurses
  // into the value graph — agentConfig rides untraversed), so it is
  // hang-safe on a cyclic graph; only findCycle itself recurses, with
  // a path-scoped ancestor set. A cycle guarantees findings.length > 0,
  // so no circular value can ride into a template (E3 holds).
  const cycle = findCycle(value, "$", new Set());
  if (cycle) {
    findings.push(cycle);
  }

  // V1/F1: exact top-level keyset (missing at "$", unknown at its own
  // path) — the five REQUIRED keys plus the two OPTIONAL ch11-P4 keys.
  for (const key of ROOT_KEYS) {
    if (!mapHas(root, key)) {
      findings.push({ path: "$", message: `missing required key "${key}"` });
    }
  }
  const legalRootKeys: readonly string[] = [...ROOT_KEYS, ...OPTIONAL_ROOT_KEYS];
  for (const key of mapKeys(root)) {
    if (typeof key !== "string" || !legalRootKeys.includes(key)) {
      findings.push({
        path: typeof key === "string" ? key : "$",
        message: `unknown key ${describeValue(key)} (fixed keysets grow only by ratified additive keys — V16 reserves "kind")`,
      });
    }
  }

  // V2/V3: ref — container precondition, then the field lanes.
  let refId: string | undefined;
  let refVersion: number | undefined;
  if (mapHas(root, "ref")) {
    const ref = mapGet(root, "ref");
    if (!isResolvedMap(ref)) {
      findings.push({ path: "ref", message: "ref must be a map with exactly id and version" });
    } else {
      for (const key of mapKeys(ref)) {
        if (key !== "id" && key !== "version") {
          findings.push({
            path: typeof key === "string" ? `ref.${key}` : "ref",
            message: `unknown key ${describeValue(key)}`,
          });
        }
      }
      if (!mapHas(ref, "id")) {
        findings.push({ path: "ref", message: 'missing required key "id"' });
      } else {
        const id = mapGet(ref, "id");
        if (typeof id !== "string" || !REF_ID.test(id)) {
          findings.push({ path: "ref.id", message: `id must be a string matching ^[a-z0-9][a-z0-9-]*$ (filename-safe); got ${describeValue(id)}` });
        } else {
          refId = id;
        }
      }
      if (!mapHas(ref, "version")) {
        findings.push({ path: "ref", message: 'missing required key "version"' });
      } else {
        const version = mapGet(ref, "version");
        const finding = versionFinding(doc, source);
        if (finding) {
          findings.push(finding);
        } else {
          refVersion = version as number;
        }
      }
    }
  }

  // V4–V9: steps — container precondition, per-step containers, field lanes.
  let stepIds: string[] | undefined;
  const usedRoles = new Set<string>();
  // V11 presupposes every step container AND role field intact — a broken
  // one makes the used-role set unreliable (suppression, not a cascade).
  let usedRolesReliable = true;
  const transitionTargets: Array<{ readonly path: string; readonly target: unknown }> = [];
  if (mapHas(root, "steps")) {
    const steps = mapGet(root, "steps");
    if (!isResolvedMap(steps)) {
      findings.push({ path: "steps", message: "steps must be a NONEMPTY map of step-id -> step" });
    } else if (steps.size === 0) {
      findings.push({ path: "steps", message: "steps must be a NONEMPTY map" });
    } else {
      const rawStepIds = mapKeys(steps);
      stepIds = rawStepIds.filter((id): id is string => typeof id === "string");
      for (const id of rawStepIds) {
        const grammar = idGrammarError("step id", id);
        if (grammar) {
          findings.push({ path: "steps", message: grammar });
        }
        const stepPath = typeof id === "string" ? `steps.${id}` : "steps";
        const step = mapGet(steps, id);
        if (!isResolvedMap(step)) {
          findings.push({ path: stepPath, message: "a step must be a map with exactly role, instruction, transitions (+ optional agentConfig, gates)" });
          usedRolesReliable = false;
          continue;
        }
        for (const key of mapKeys(step)) {
          if (typeof key !== "string" || !(STEP_KEYS as readonly string[]).includes(key)) {
            findings.push({
              path: typeof key === "string" ? `${stepPath}.${key}` : stepPath,
              message: `unknown key ${describeValue(key)}`,
            });
          }
        }
        for (const key of ["role", "instruction", "transitions"]) {
          if (!mapHas(step, key)) {
            findings.push({ path: stepPath, message: `missing required key "${key}"` });
            if (key === "role") {
              usedRolesReliable = false;
            }
          }
        }
        // role (V5's role-name grammar on the reference)
        if (mapHas(step, "role")) {
          const role = mapGet(step, "role");
          const roleGrammar = idGrammarError("role name", role);
          if (roleGrammar) {
            // A grammar-invalid role (string included) makes the
            // used-set unreliable — running V11 over it would cascade
            // a second finding from the same defect (aftermath fix).
            findings.push({ path: `${stepPath}.role`, message: roleGrammar });
            usedRolesReliable = false;
          } else {
            usedRoles.add(role as string);
          }
        }
        // instruction (V6): nonempty string, NO normalization.
        if (mapHas(step, "instruction")) {
          const instruction = mapGet(step, "instruction");
          if (typeof instruction !== "string" || instruction.length === 0) {
            findings.push({ path: `${stepPath}.instruction`, message: "instruction must be a nonempty string" });
          }
        }
        // transitions (V7): a map, MAY be empty.
        if (mapHas(step, "transitions")) {
          const transitions = mapGet(step, "transitions");
          if (!isResolvedMap(transitions)) {
            findings.push({ path: `${stepPath}.transitions`, message: "transitions must be a map of event-type -> target id (it may be empty)" });
          } else {
            for (const [eventType, target] of mapEntries(transitions)) {
              const eventGrammar = idGrammarError("event type", eventType);
              if (eventGrammar) {
                findings.push({ path: `${stepPath}.transitions`, message: eventGrammar });
              }
              transitionTargets.push({
                path: typeof eventType === "string" ? `${stepPath}.transitions.${eventType}` : `${stepPath}.transitions`,
                target,
              });
            }
          }
        }
        // agentConfig (V9): raw pass-through — no shape checks by contract.
        // gates (F3 + F6): the walk's residue over the gates subtree —
        // the key-STRINGNESS rule and the C12 source ladder. Every
        // SEMANTIC gate check is admission's (C20/C21); the walk performs
        // none. Runs only for a well-typed step id (broken ids skipped).
        if (mapHas(step, "gates") && typeof id === "string") {
          const gatesValue = mapGet(step, "gates");
          const gatesBase = `steps.${id}.gates`;
          scanGatesStringness(gatesValue, gatesBase, findings, new WeakSet());
          if (isResolvedMap(gatesValue)) {
            for (const [eventType, pipeline] of mapEntries(gatesValue)) {
              if (typeof eventType !== "string" || !Array.isArray(pipeline)) {
                continue;
              }
              pipeline.forEach((binding: unknown, index: number) => {
                if (!isResolvedMap(binding)) {
                  return;
                }
                const uses = mapGet(binding, "uses");
                const config = mapGet(binding, "config");
                if (!isResolvedMap(config)) {
                  return;
                }
                // F6: SYNTACTIC uses-scoping — the authored string, no
                // catalog resolution (the walk stays semantics-free). Under
                // any OTHER authored `uses` the key names are admission's
                // keyset business and the source check does NOT fire.
                const checkField = (usesId: string, field: string): void => {
                  if (uses !== usesId || !mapHas(config, field)) {
                    return;
                  }
                  const finding = configIntegerSourceFinding(
                    doc,
                    source,
                    ["steps", id, "gates", eventType, index, "config", field],
                    `${gatesBase}.${eventType}[${String(index)}].config.${field}`,
                  );
                  if (finding) {
                    findings.push(finding);
                  }
                };
                checkField("declarative.threshold", "value");
                checkField("external.process", "timeoutMs");
              });
            }
          }
        }
      }
    }
  } else {
    usedRolesReliable = false;
  }

  // V12: terminal — own rules run without steps; disjointness needs keys(steps).
  let terminalIds: string[] | undefined;
  if (mapHas(root, "terminal")) {
    const terminal = mapGet(root, "terminal");
    if (!Array.isArray(terminal)) {
      findings.push({ path: "terminal", message: "terminal must be a nonempty list of unique ids" });
    } else {
      if (terminal.length === 0) {
        findings.push({ path: "terminal", message: "terminal must be a NONEMPTY list" });
      }
      const seen = new Set<string>();
      const ids: string[] = [];
      for (const entry of terminal) {
        const grammar = idGrammarError("terminal id", entry);
        if (grammar) {
          findings.push({ path: "terminal", message: grammar });
          continue;
        }
        const id = entry as string;
        if (seen.has(id)) {
          findings.push({ path: "terminal", message: `duplicate terminal id ${JSON.stringify(id)}` });
        }
        seen.add(id);
        ids.push(id);
      }
      terminalIds = ids;
      if (stepIds) {
        for (const id of ids) {
          if (stepIds.includes(id)) {
            findings.push({ path: "terminal", message: `terminal id ${JSON.stringify(id)} collides with a step id (terminal is disjoint from keys(steps))` });
          }
        }
      }
    }
  }

  // V10: roles — container precondition, entry keysets, defaultActor rule.
  // F4 (ch12-P4, C6): the roles-entry keyset grows to `defaultActor?` +
  // `defaultAgentConfig?`; the walk delivers the resolved value to the
  // built slot, and the agent-config VALUE-LEVEL gate (map,
  // canonical-JSON-safe) is admission's (A3, P2-built).
  let declaredRoles: string[] | undefined;
  let declaredRolesReliable = true;
  const builtRoles: Record<
    string,
    { readonly defaultActor?: string; readonly defaultAgentConfig?: AgentConfig }
  > = {};
  if (mapHas(root, "roles")) {
    const roles = mapGet(root, "roles");
    if (!isResolvedMap(roles)) {
      findings.push({ path: "roles", message: "roles must be a map of role-name -> { defaultActor?, defaultAgentConfig? }" });
    } else {
      const rawRoleNames = mapKeys(roles);
      declaredRoles = rawRoleNames.filter((name): name is string => typeof name === "string");
      for (const name of rawRoleNames) {
        const grammar = idGrammarError("role name", name);
        if (grammar) {
          // The declared-side twin of the used-set rule: a
          // grammar-invalid declared name suppresses V11 (aftermath).
          findings.push({ path: "roles", message: grammar });
          declaredRolesReliable = false;
        }
        const entryPath = typeof name === "string" ? `roles.${name}` : "roles";
        const entry = mapGet(roles, name);
        if (!isResolvedMap(entry)) {
          findings.push({ path: entryPath, message: "a roles entry must be a map whose legal keys are the optional defaultActor and defaultAgentConfig" });
          continue;
        }
        for (const key of mapKeys(entry)) {
          if (typeof key !== "string" || !(ROLES_ENTRY_KEYS as readonly string[]).includes(key)) {
            findings.push({
              path: typeof key === "string" ? `${entryPath}.${key}` : entryPath,
              message: `unknown key ${describeValue(key)}`,
            });
          }
        }
        if (typeof name !== "string") {
          continue;
        }
        const roleEntry: { defaultActor?: string; defaultAgentConfig?: AgentConfig } = {};
        if (mapHas(entry, "defaultActor")) {
          const actor = mapGet(entry, "defaultActor");
          if (typeof actor !== "string" || actor.length === 0) {
            findings.push({ path: `${entryPath}.defaultActor`, message: "defaultActor must be a nonempty string when present" });
          } else {
            roleEntry.defaultActor = actor;
          }
        }
        // F4: the value rides through RAW (materialized like a step's
        // agentConfig) — the map + canonical-JSON VALUE-LEVEL check is
        // admission's (A3). ONE shared memo preserves aliased identity.
        if (mapHas(entry, "defaultAgentConfig")) {
          roleEntry.defaultAgentConfig = materializeResolvedValue(
            mapGet(entry, "defaultAgentConfig"),
            materializeMemo,
          ) as AgentConfig;
        }
        defineOwn(builtRoles, name, roleEntry);
      }
    }
  }

  // V13: start ∈ keys(steps) — suppressed when the steps container failed.
  if (mapHas(root, "start") && stepIds) {
    const start = mapGet(root, "start");
    if (typeof start !== "string" || !stepIds.includes(start)) {
      findings.push({ path: "start", message: `start must name an existing step; got ${describeValue(start)}` });
    }
  }

  // V14: every transition target ∈ keys(steps) ∪ terminal — presupposes both containers.
  if (stepIds && terminalIds) {
    for (const { path, target } of transitionTargets) {
      if (typeof target !== "string" || !(stepIds.includes(target) || terminalIds.includes(target))) {
        findings.push({ path, message: `transition target must name a step or a terminal id; got ${describeValue(target)}` });
      }
    }
  }

  // V11: keys(roles) == used roles, both directions — suppressed when
  // EITHER role surface is unreliable (a broken step container, a
  // missing or grammar-invalid role field, a grammar-invalid declared
  // name) or the roles container failed.
  if (declaredRoles && stepIds && usedRolesReliable && declaredRolesReliable) {
    for (const role of usedRoles) {
      if (!declaredRoles.includes(role)) {
        findings.push({ path: "roles", message: `role ${JSON.stringify(role)} is used by steps but not declared` });
      }
    }
    for (const role of declaredRoles) {
      if (!usedRoles.has(role)) {
        findings.push({ path: `roles.${role}`, message: `role ${JSON.stringify(role)} is declared but not used by any step` });
      }
    }
  }

  // F5 (ch11-P4, C40's source-form share): the `round` source-form
  // lanes. `round` present-but-not-a-map (scalar/list/present-null)
  // lands HERE, never on C38's absent default; an unknown key, a
  // missing `advanceOnArrivalAt`, a non-list value, and a non-string
  // member are the remaining source-form lanes. A source-form-CLEAN
  // declaration maps onto the typed `round` slot — the VALUE-LEVEL
  // lanes (empty list, membership, duplicates) then run at admission
  // on every channel (F8/P2c). Attached to the best-effort template
  // ONLY when the steps operand exists (disposition b vs b′/d).
  let roundDomain: { readonly advanceOnArrivalAt: readonly string[] } | undefined;
  if (mapHas(root, "round")) {
    const roundFindingsStart = findings.length;
    const round = mapGet(root, "round");
    if (!isResolvedMap(round)) {
      findings.push({ path: "round", message: "round must be a map with the single key advanceOnArrivalAt" });
    } else {
      for (const key of mapKeys(round)) {
        if (key !== "advanceOnArrivalAt") {
          findings.push({
            path: typeof key === "string" ? `round.${key}` : "round",
            message: `unknown key ${describeValue(key)} (round's only key is advanceOnArrivalAt)`,
          });
        }
      }
      if (!mapHas(round, "advanceOnArrivalAt")) {
        findings.push({ path: "round", message: 'missing required key "advanceOnArrivalAt"' });
      } else {
        const listed = mapGet(round, "advanceOnArrivalAt");
        if (!Array.isArray(listed)) {
          findings.push({ path: "round.advanceOnArrivalAt", message: "advanceOnArrivalAt must be a nonempty list of step ids" });
        } else {
          listed.forEach((member: unknown, index: number) => {
            if (typeof member !== "string") {
              findings.push({
                path: `round.advanceOnArrivalAt[${String(index)}]`,
                message: `advanceOnArrivalAt member must be a step id string; got ${describeValue(member)}`,
              });
            }
          });
          if (findings.length === roundFindingsStart) {
            roundDomain = { advanceOnArrivalAt: listed as string[] };
          }
        }
      }
    }
  }

  // F3 (ch12-P4, C2/C3): the `runtimeContext` requirement SOURCE FORM. The
  // walk resolves the value domain { the string `none` (→ `none`); a SPEC
  // MAP (→ `required(spec)`) } and MATERIALIZES a file-channel spec map (a
  // `mapAsMap` JS Map) into an own-property record for the template slot
  // (retiring the P4-deferred admission interception). The spec map is
  // FIXED-KEYSET (`kind` required + `^[a-z][a-z0-9_]*$`; `provider` required
  // + the dotted grammar; `config` OPTIONAL map, RAW pass-through) — each
  // violation a finding at its path. An ILLEGAL value (present-null / list /
  // other-scalar — neither the string `none` NOR a spec map) is NOT
  // materialized: it passes through RAW and admission's A1 container lane
  // emits the ONE finding at `runtimeContext` (the OWNERSHIP ASYMMETRY with
  // F2 — the walk owns only a well-formed spec map's FORM, never a value's
  // MEANING).
  const runtimeContextPresent = mapHas(root, "runtimeContext");
  let runtimeContextField: RuntimeContextSpec | "none" | "required" | undefined;
  if (runtimeContextPresent) {
    const runtimeContext = mapGet(root, "runtimeContext");
    if (isResolvedMap(runtimeContext)) {
      for (const key of mapKeys(runtimeContext)) {
        if (typeof key !== "string" || !(RUNTIME_CONTEXT_SPEC_KEYS as readonly string[]).includes(key)) {
          findings.push({
            path: typeof key === "string" ? `runtimeContext.${key}` : "runtimeContext",
            message: `unknown key ${describeValue(key)} (a runtimeContext spec map's only keys are kind, provider, config?)`,
          });
        }
      }
      if (!mapHas(runtimeContext, "kind")) {
        findings.push({ path: "runtimeContext", message: 'missing required key "kind"' });
      } else {
        const kind = mapGet(runtimeContext, "kind");
        if (typeof kind !== "string" || !RUNTIME_CONTEXT_KIND.test(kind)) {
          findings.push({
            path: "runtimeContext.kind",
            message: `kind must be a string matching ${RUNTIME_CONTEXT_KIND.source}; got ${describeValue(kind)}`,
          });
        }
      }
      if (!mapHas(runtimeContext, "provider")) {
        findings.push({ path: "runtimeContext", message: 'missing required key "provider"' });
      } else {
        const provider = mapGet(runtimeContext, "provider");
        if (typeof provider !== "string" || !RUNTIME_CONTEXT_PROVIDER.test(provider)) {
          findings.push({
            path: "runtimeContext.provider",
            message: `provider must be a string matching ${RUNTIME_CONTEXT_PROVIDER.source} (two or more dot-separated lowercase segments); got ${describeValue(provider)}`,
          });
        }
      }
      if (mapHas(runtimeContext, "config")) {
        const config = mapGet(runtimeContext, "config");
        if (!isResolvedMap(config)) {
          findings.push({
            path: "runtimeContext.config",
            message: `config must be a map when present; got ${describeValue(config)}`,
          });
        }
      }
      // Materialize the spec map (string-keyed → own-property record) for the
      // template slot — a well-formed spec reaches admission as a plain object
      // (never a JS Map), the retired-interception's raison d'être closed. A
      // defective one still materializes (its findings already gate the load).
      runtimeContextField = materializeResolvedValue(
        runtimeContext,
        materializeMemo,
      ) as RuntimeContextSpec;
    } else {
      // The string `none` (→ `none`) or an ILLEGAL value passed RAW to
      // admission's A1 container lane (the walk owns no value MEANING).
      runtimeContextField = runtimeContext as RuntimeContextSpec | "none" | "required";
    }
  }

  // F2 (ch12-P4, C1): the `activation` container + `mode` SOURCE FORM.
  // `activation` is a FIXED-KEYSET map with the single REQUIRED key `mode`
  // (an empty map → the missing-`mode` finding at `activation`); `mode`'s
  // value ∈ { `immediate`, `deferredKickoff` } (authored camelCase ↔ the
  // stored `immediate`/`deferred_kickoff`); a PRESENT non-map value is ONE
  // container-precondition finding at `activation` (dependents suppressed);
  // unknown keys are findings at `activation.<key>`. The walk performs NO
  // default materialization — an ABSENT key leaves the field absent and
  // admission materializes the `immediate` default (G3, P1a-built).
  let activationDomain: { readonly mode: ActivationMode } | undefined;
  if (mapHas(root, "activation")) {
    const activationFindingsStart = findings.length;
    const activation = mapGet(root, "activation");
    if (!isResolvedMap(activation)) {
      findings.push({ path: "activation", message: "activation must be a map with the single key mode" });
    } else {
      for (const key of mapKeys(activation)) {
        if (key !== "mode") {
          findings.push({
            path: typeof key === "string" ? `activation.${key}` : "activation",
            message: `unknown key ${describeValue(key)} (activation's only key is mode)`,
          });
        }
      }
      if (!mapHas(activation, "mode")) {
        findings.push({ path: "activation", message: 'missing required key "mode"' });
      } else {
        const mode = mapGet(activation, "mode");
        const stored = typeof mode === "string" ? ACTIVATION_MODE_BY_AUTHORED[mode] : undefined;
        if (stored === undefined) {
          findings.push({
            path: "activation.mode",
            message: `mode must be one of immediate, deferredKickoff; got ${describeValue(mode)}`,
          });
        } else if (findings.length === activationFindingsStart) {
          activationDomain = { mode: stored };
        }
      }
    }
  }

  // F7 (ch11-P4): build the best-effort template ALWAYS (the root is a
  // map at this point). The admission rung runs on it in the load
  // pipeline and accumulates its findings with the walk's — the
  // external load result stays XOR (only a findings-free walk AND a
  // findings-free admission escape). Broken step containers are SKIPPED
  // (disposition c — their own finding already fired); the round slot is
  // attached only when source-form clean AND the steps operand exists.
  const builtSteps: Record<string, Step> = {};
  const stepsValue = mapGet(root, "steps");
  const stepsIsMap = isResolvedMap(stepsValue);
  if (isResolvedMap(stepsValue)) {
    for (const [id, stepValue] of mapEntries(stepsValue)) {
      if (typeof id !== "string" || !isResolvedMap(stepValue)) {
        continue;
      }
      const step = stepValue;
      const transitions: Record<string, string> = {};
      const transitionValues = mapGet(step, "transitions");
      if (isResolvedMap(transitionValues)) {
        for (const [eventType, target] of mapEntries(transitionValues)) {
          if (typeof eventType === "string") {
            defineOwn(transitions, eventType, target as string);
          }
        }
      }
      const builtStep: Step = {
        role: mapGet(step, "role") as string,
        instruction: mapGet(step, "instruction") as string,
        transitions,
        // A3 (packet ch12-p2): the V9 raw pass-through is UNCHANGED — the
        // materialized value rides through as-is; the map + canonical-JSON
        // VALUE-LEVEL check lives at the admit rung (A1), not here (the
        // source-form walk stays validate's). The cast mirrors `gates`.
        ...(mapHas(step, "agentConfig")
          ? {
              agentConfig: materializeResolvedValue(
                mapGet(step, "agentConfig"),
                materializeMemo,
              ) as AgentConfig,
            }
          : {}),
        ...(mapHas(step, "gates")
          ? {
              gates: materializeResolvedValue(
                mapGet(step, "gates"),
                materializeMemo,
              ) as NonNullable<Step["gates"]>,
            }
          : {}),
      };
      defineOwn(builtSteps, id, builtStep);
    }
  }
  const template: WorkflowTemplate = {
    ref: { id: refId as string, version: refVersion as number },
    start: mapGet(root, "start") as string,
    steps: builtSteps,
    terminal: terminalIds ?? [],
    roles: builtRoles,
    ...(runtimeContextPresent
      ? { runtimeContext: runtimeContextField as RuntimeContextSpec | "none" | "required" }
      : {}),
    ...(roundDomain !== undefined && stepsIsMap ? { round: roundDomain } : {}),
    ...(activationDomain !== undefined ? { activation: activationDomain } : {}),
  };
  return { template, findings };
}
