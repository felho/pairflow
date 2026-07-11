import { isAlias, isScalar } from "yaml";
import type { Document } from "yaml";

import type { Step, WorkflowTemplate } from "../domain/index.js";
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
 */
export interface ValidateOutcome {
  readonly template?: WorkflowTemplate;
  readonly findings: readonly ValidationFinding[];
}

const ROOT_KEYS = ["ref", "start", "steps", "terminal", "roles"] as const;
const REF_ID = /^[a-z0-9][a-z0-9-]*$/;
const VERSION_SOURCE = /^[1-9][0-9]*$/;

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
 * V3 (draft C8): the version rule's node-level half. Uses the node's
 * range slice / type / tag / anchor — NEVER `.source`, which strips
 * quotes (probe P11). Emits at most ONE finding for the field.
 */
function versionFinding(doc: Document, source: string, resolved: unknown): ValidationFinding | undefined {
  const path = "ref.version";
  const node: unknown = doc.getIn(["ref", "version"], true);
  if (isAlias(node)) {
    return { path, message: "version must not be an alias (probe P21: an alias hides the source form)" };
  }
  if (!isScalar(node)) {
    return { path, message: "version must be a plain decimal integer scalar" };
  }
  if (node.anchor !== undefined) {
    return { path, message: "version must not carry an anchor (the anchor token sits outside the range slice)" };
  }
  if (node.tag !== undefined) {
    return { path, message: "version must not carry a tag (probe P22: a tag can flip the resolved type silently)" };
  }
  const range = node.range;
  const slice = range ? source.slice(range[0], range[1]) : "";
  if (!VERSION_SOURCE.test(slice)) {
    return {
      path,
      message: `version must be written as a plain decimal integer >= 1; got source form ${JSON.stringify(slice)}`,
    };
  }
  if (typeof resolved !== "number" || !Number.isSafeInteger(resolved) || resolved < 1) {
    return { path, message: "version must resolve to a safe integer >= 1" };
  }
  return undefined;
}

export function validateTemplate(value: unknown, doc: Document, source: string): ValidateOutcome {
  // V1: the root container precondition — ONE finding for a non-map root.
  if (!isResolvedMap(value)) {
    return {
      findings: [{ path: "$", message: "the template root must be a map with exactly ref, start, steps, terminal, roles" }],
    };
  }

  const findings: ValidationFinding[] = [];
  const root = value;

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

  // V1: exact top-level keyset (missing at "$", unknown at its own path).
  for (const key of ROOT_KEYS) {
    if (!mapHas(root, key)) {
      findings.push({ path: "$", message: `missing required key "${key}"` });
    }
  }
  for (const key of mapKeys(root)) {
    if (typeof key !== "string" || !(ROOT_KEYS as readonly string[]).includes(key)) {
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
        const finding = versionFinding(doc, source, version);
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
  const builtSteps: Record<string, Step> = {};
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
          findings.push({ path: stepPath, message: "a step must be a map with exactly role, instruction, transitions (+ optional agentConfig)" });
          usedRolesReliable = false;
          continue;
        }
        for (const key of mapKeys(step)) {
          if (typeof key !== "string" || !["role", "instruction", "transitions", "agentConfig"].includes(key)) {
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
  let declaredRoles: string[] | undefined;
  let declaredRolesReliable = true;
  const builtRoles: Record<string, { readonly defaultActor?: string }> = {};
  if (mapHas(root, "roles")) {
    const roles = mapGet(root, "roles");
    if (!isResolvedMap(roles)) {
      findings.push({ path: "roles", message: "roles must be a map of role-name -> { defaultActor? }" });
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
          findings.push({ path: entryPath, message: "a roles entry must be a map whose only legal key is the optional defaultActor" });
          continue;
        }
        for (const key of mapKeys(entry)) {
          if (key !== "defaultActor") {
            findings.push({
              path: typeof key === "string" ? `${entryPath}.${key}` : entryPath,
              message: `unknown key ${describeValue(key)}`,
            });
          }
        }
        if (mapHas(entry, "defaultActor")) {
          const actor = mapGet(entry, "defaultActor");
          if (typeof actor !== "string" || actor.length === 0) {
            findings.push({ path: `${entryPath}.defaultActor`, message: "defaultActor must be a nonempty string when present" });
          } else if (typeof name === "string") {
            defineOwn(builtRoles, name, { defaultActor: actor });
            continue;
          }
        }
        if (typeof name === "string") {
          defineOwn(builtRoles, name, {});
        }
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

  if (findings.length > 0) {
    return { findings };
  }

  // E3: only a COMPLETE valid template escapes — built here, after zero findings.
  // ONE materialization memo per template build: a cross-step aliased
  // graph (two steps sharing one anchored agentConfig) must keep its
  // referential identity in the returned domain — a per-step memo
  // duplicated it (the integration re-check's catch; lossless/raw V9).
  const materializeMemo = new WeakMap<object, unknown>();
  const steps = mapGet(root, "steps") as ResolvedMap;
  for (const [id, stepValue] of mapEntries(steps)) {
    const step = stepValue as ResolvedMap;
    const transitionValues = mapGet(step, "transitions") as ResolvedMap;
    const transitions: Record<string, string> = {};
    for (const [eventType, target] of mapEntries(transitionValues)) {
      defineOwn(transitions, eventType as string, target as string);
    }
    const builtStep: Step = {
      role: mapGet(step, "role") as string,
      instruction: mapGet(step, "instruction") as string,
      transitions,
      ...(mapHas(step, "agentConfig")
        ? { agentConfig: materializeResolvedValue(mapGet(step, "agentConfig"), materializeMemo) }
        : {}),
    };
    defineOwn(builtSteps, id as string, builtStep);
  }
  const template: WorkflowTemplate = {
    ref: { id: refId as string, version: refVersion as number },
    start: mapGet(root, "start") as string,
    steps: builtSteps,
    terminal: terminalIds as string[],
    roles: builtRoles,
  };
  return { template, findings: [] };
}
