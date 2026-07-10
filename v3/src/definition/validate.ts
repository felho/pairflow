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

function isPlainMap(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** V5 (draft C10): nonempty, no whitespace (`/\s/u`), no dot — ONE grammar for every id class. */
function idGrammarError(kind: string, id: unknown): string | undefined {
  if (typeof id !== "string" || id.length === 0) {
    return `${kind} must be a nonempty string, got ${JSON.stringify(id)}`;
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
    for (const [key, child] of Object.entries(value)) {
      const hit = findCycle(child, joinPath(path, key), ancestors);
      if (hit) {
        return hit;
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
  // Cycle precondition first — the walk below presupposes an acyclic graph.
  const cycle = findCycle(value, "$", new Set());
  if (cycle) {
    return { findings: [cycle] };
  }

  // V1: the root container precondition — ONE finding for a non-map root.
  if (!isPlainMap(value)) {
    return {
      findings: [{ path: "$", message: "the template root must be a map with exactly ref, start, steps, terminal, roles" }],
    };
  }

  const findings: ValidationFinding[] = [];
  const root = value;

  // V1: exact top-level keyset (missing at "$", unknown at its own path).
  for (const key of ROOT_KEYS) {
    if (!(key in root)) {
      findings.push({ path: "$", message: `missing required key "${key}"` });
    }
  }
  for (const key of Object.keys(root)) {
    if (!(ROOT_KEYS as readonly string[]).includes(key)) {
      findings.push({ path: key, message: `unknown key "${key}" (fixed keysets grow only by ratified additive keys — V16 reserves "kind")` });
    }
  }

  // V2/V3: ref — container precondition, then the field lanes.
  let refId: string | undefined;
  let refVersion: number | undefined;
  if ("ref" in root) {
    const ref = root["ref"];
    if (!isPlainMap(ref)) {
      findings.push({ path: "ref", message: "ref must be a map with exactly id and version" });
    } else {
      for (const key of Object.keys(ref)) {
        if (key !== "id" && key !== "version") {
          findings.push({ path: `ref.${key}`, message: `unknown key "${key}"` });
        }
      }
      if (!("id" in ref)) {
        findings.push({ path: "ref", message: 'missing required key "id"' });
      } else {
        const id = ref["id"];
        if (typeof id !== "string" || !REF_ID.test(id)) {
          findings.push({ path: "ref.id", message: `id must be a string matching ^[a-z0-9][a-z0-9-]*$ (filename-safe); got ${JSON.stringify(id)}` });
        } else {
          refId = id;
        }
      }
      if (!("version" in ref)) {
        findings.push({ path: "ref", message: 'missing required key "version"' });
      } else {
        const finding = versionFinding(doc, source, ref["version"]);
        if (finding) {
          findings.push(finding);
        } else {
          refVersion = ref["version"] as number;
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
  if ("steps" in root) {
    const steps = root["steps"];
    if (!isPlainMap(steps)) {
      findings.push({ path: "steps", message: "steps must be a NONEMPTY map of step-id -> step" });
    } else if (Object.keys(steps).length === 0) {
      findings.push({ path: "steps", message: "steps must be a NONEMPTY map" });
    } else {
      stepIds = Object.keys(steps);
      for (const id of stepIds) {
        const grammar = idGrammarError("step id", id);
        if (grammar) {
          findings.push({ path: "steps", message: grammar });
        }
        const stepPath = `steps.${id}`;
        const step = steps[id];
        if (!isPlainMap(step)) {
          findings.push({ path: stepPath, message: "a step must be a map with exactly role, instruction, transitions (+ optional agentConfig)" });
          usedRolesReliable = false;
          continue;
        }
        for (const key of Object.keys(step)) {
          if (!["role", "instruction", "transitions", "agentConfig"].includes(key)) {
            findings.push({ path: `${stepPath}.${key}`, message: `unknown key "${key}"` });
          }
        }
        for (const key of ["role", "instruction", "transitions"]) {
          if (!(key in step)) {
            findings.push({ path: stepPath, message: `missing required key "${key}"` });
            if (key === "role") {
              usedRolesReliable = false;
            }
          }
        }
        // role (V5's role-name grammar on the reference)
        if ("role" in step) {
          const role = step["role"];
          const roleGrammar = idGrammarError("role name", role);
          if (roleGrammar) {
            findings.push({ path: `${stepPath}.role`, message: roleGrammar });
          }
          if (typeof role === "string" && role.length > 0) {
            usedRoles.add(role);
          } else {
            usedRolesReliable = false;
          }
        }
        // instruction (V6): nonempty string, NO normalization.
        if ("instruction" in step) {
          const instruction = step["instruction"];
          if (typeof instruction !== "string" || instruction.length === 0) {
            findings.push({ path: `${stepPath}.instruction`, message: "instruction must be a nonempty string" });
          }
        }
        // transitions (V7): a map, MAY be empty.
        if ("transitions" in step) {
          const transitions = step["transitions"];
          if (!isPlainMap(transitions)) {
            findings.push({ path: `${stepPath}.transitions`, message: "transitions must be a map of event-type -> target id (it may be empty)" });
          } else {
            for (const [eventType, target] of Object.entries(transitions)) {
              const eventGrammar = idGrammarError("event type", eventType);
              if (eventGrammar) {
                findings.push({ path: `${stepPath}.transitions`, message: eventGrammar });
              }
              transitionTargets.push({ path: `${stepPath}.transitions.${eventType}`, target });
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
  if ("terminal" in root) {
    const terminal = root["terminal"];
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
  const builtRoles: Record<string, { readonly defaultActor?: string }> = {};
  if ("roles" in root) {
    const roles = root["roles"];
    if (!isPlainMap(roles)) {
      findings.push({ path: "roles", message: "roles must be a map of role-name -> { defaultActor? }" });
    } else {
      declaredRoles = Object.keys(roles);
      for (const name of declaredRoles) {
        const grammar = idGrammarError("role name", name);
        if (grammar) {
          findings.push({ path: "roles", message: grammar });
        }
        const entryPath = `roles.${name}`;
        const entry = roles[name];
        if (!isPlainMap(entry)) {
          findings.push({ path: entryPath, message: "a roles entry must be a map whose only legal key is the optional defaultActor" });
          continue;
        }
        for (const key of Object.keys(entry)) {
          if (key !== "defaultActor") {
            findings.push({ path: `${entryPath}.${key}`, message: `unknown key "${key}"` });
          }
        }
        if ("defaultActor" in entry) {
          const actor = entry["defaultActor"];
          if (typeof actor !== "string" || actor.length === 0) {
            findings.push({ path: `${entryPath}.defaultActor`, message: "defaultActor must be a nonempty string when present" });
          } else {
            builtRoles[name] = { defaultActor: actor };
            continue;
          }
        }
        builtRoles[name] = {};
      }
    }
  }

  // V13: start ∈ keys(steps) — suppressed when the steps container failed.
  if ("start" in root && stepIds) {
    const start = root["start"];
    if (typeof start !== "string" || !stepIds.includes(start)) {
      findings.push({ path: "start", message: `start must name an existing step; got ${JSON.stringify(start)}` });
    }
  }

  // V14: every transition target ∈ keys(steps) ∪ terminal — presupposes both containers.
  if (stepIds && terminalIds) {
    for (const { path, target } of transitionTargets) {
      if (typeof target !== "string" || !(stepIds.includes(target) || terminalIds.includes(target))) {
        findings.push({ path, message: `transition target must name a step or a terminal id; got ${JSON.stringify(target)}` });
      }
    }
  }

  // V11: keys(roles) == used roles, both directions — suppressed when
  // the steps side is unreliable or the roles container failed.
  if (declaredRoles && stepIds && usedRolesReliable) {
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
  const steps = root["steps"] as Record<string, Record<string, unknown>>;
  for (const [id, step] of Object.entries(steps)) {
    builtSteps[id] = {
      role: step["role"] as string,
      instruction: step["instruction"] as string,
      transitions: { ...(step["transitions"] as Record<string, string>) },
      ...("agentConfig" in step ? { agentConfig: step["agentConfig"] } : {}),
    };
  }
  const template: WorkflowTemplate = {
    ref: { id: refId as string, version: refVersion as number },
    start: root["start"] as string,
    steps: builtSteps,
    terminal: terminalIds as string[],
    roles: builtRoles,
  };
  return { template, findings: [] };
}
