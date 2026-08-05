import { isAlias, isScalar } from "yaml";
import type { Document } from "yaml";

import { isCanonicalizable } from "../../emit/opId.js";
import type { GateCatalog } from "../../ports/index.js";
import type { ValidationFinding } from "../errors.js";
import type {
  DeclPath,
  EqualsRuleDecl,
  MembershipRule,
  MessageTemplate,
  NodeDecl,
  Selector,
  SurfaceDecl,
} from "./vocabulary.js";

/**
 * ADR-019 D1: THE ENGINE — one validator over declaration DATA, running
 * the SAME declaration on the file-walk and direct-construction channels.
 *
 * The engine consumes a `SurfaceDecl`; it knows the VOCABULARY and knows
 * nothing about any particular rule. A per-rule branch here (a literal
 * `if (rule === X)`) is ADR-019 D9 tripwire #2 — a STOP and a scope
 * review, never a work-around. Where two measured lanes disagree on a
 * grain (path address, lane order, gating), the disagreement is DECLARED
 * (`at:`, `laneOrder:`, `gating:`), which is the same instrument the
 * audit's §5 F3 identified for path grain.
 *
 * Channel symmetry is structural, not argued (D1): attributes that read
 * SOURCE text (`sourceForm`, the deep key-stringness scan) are declared
 * once with `channel: "file"`; the engine runs them where a source exists
 * and skips them where none does.
 *
 * This module VALIDATES and applies plain `default:` materialization. It
 * does NOT derive values — derivation is the separately-named normalizer
 * (D3, `normalizer.ts`).
 */

/** The channel the declaration is being run on. */
export type EngineChannel =
  | { readonly kind: "file"; readonly doc: Document; readonly source: string }
  | { readonly kind: "direct" };

export interface EngineOptions {
  readonly channel: EngineChannel;
  readonly catalog?: GateCatalog;
}

export interface EngineRun {
  readonly findings: readonly ValidationFinding[];
  /** The value with plain defaults materialized and file-channel maps
   * realized as own-property records. Undefined when the root container
   * lane failed (no operand exists). */
  readonly normalized: unknown;
  /** Binding path → the registration's EFFECTIVE config, collected as the
   * `delegate` lanes resolve. The normalizer's `materializeEffectiveConfigs`
   * hook consumes it. */
  readonly effectiveConfigs: ReadonlyMap<string, unknown>;
  /** Every binding whose resolved registration declares
   * `requiresRuntimeContext` — the operand of the R3 residual cross-rule,
   * which stays hand code (audit §4). */
  readonly runtimeContextBindings: readonly string[];
}

// ---------------------------------------------------------------------------
// Value access: ONE accessor over both channels' container forms.
// ---------------------------------------------------------------------------

type AnyMap = ReadonlyMap<unknown, unknown> | Record<string, unknown>;

function isResolvedMap(value: unknown): value is ReadonlyMap<unknown, unknown> {
  return value instanceof Map;
}

/** A container map on EITHER channel: the file channel's `mapAsMap` JS Map
 * or the direct channel's plain object. Arrays are never maps. */
function isContainer(value: unknown): value is AnyMap {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function entriesOf(value: AnyMap): readonly (readonly [unknown, unknown])[] {
  if (isResolvedMap(value)) return [...value.entries()];
  return Object.keys(value).map((key) => [key, ownGet(value, key)] as const);
}

function ownGet(record: Record<string, unknown>, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

function containerHas(value: AnyMap, key: string): boolean {
  if (isResolvedMap(value)) return value.has(key);
  return Object.prototype.hasOwnProperty.call(value, key);
}

function containerGet(value: AnyMap, key: string): unknown {
  if (isResolvedMap(value)) return value.get(key);
  return ownGet(value, key);
}

/** A PLAIN string-keyed map — a plain object or null-prototype object,
 * never an array, a JS Map, or a class instance (`map.plain`). */
function isPlainMap(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** Own-property WRITE: a step id or event type legally admits `__proto__`;
 * a bracket assignment would set the prototype and drop the own key. */
function defineOwn<T>(target: Record<string, T>, key: string, value: T): void {
  Object.defineProperty(target, key, { configurable: true, enumerable: true, value, writable: true });
}

/** Realize a resolved value graph as own-property records where every map
 * key is a string, preserving aliased identity through one memo. A map
 * with any non-string key stays a JS Map (its identity class is what the
 * key lanes report on). */
function materialize(value: unknown, seen: WeakMap<object, unknown>): unknown {
  if (typeof value !== "object" || value === null) return value;
  const existing = seen.get(value);
  if (existing !== undefined) return existing;
  if (Array.isArray(value)) {
    const result: unknown[] = [];
    seen.set(value, result);
    for (const item of value) result.push(materialize(item, seen));
    return result;
  }
  if (isResolvedMap(value)) {
    const entries = [...value.entries()];
    if (entries.every(([key]) => typeof key === "string")) {
      const record: Record<string, unknown> = {};
      seen.set(value, record);
      for (const [key, item] of entries) defineOwn(record, key as string, materialize(item, seen));
      return record;
    }
    const map = new Map<unknown, unknown>();
    seen.set(value, map);
    for (const [key, item] of entries) map.set(materialize(key, seen), materialize(item, seen));
    return map;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Paths and message interpolation.
// ---------------------------------------------------------------------------

/** `$` is the template root; `""` is a delegated config's own root. Both
 * are addressed by their children's bare key (the measured path grammar). */
function joinPath(parent: string, key: string): string {
  return parent === "$" || parent === "" ? key : `${parent}.${key}`;
}

function indexPath(parent: string, index: number): string {
  return `${parent}[${String(index)}]`;
}

/** The finding-message value rendering: objects are DESCRIBED, never
 * serialized (a cyclic graph reaches the walk). */
function describeValue(value: unknown): string {
  if (typeof value === "object" && value !== null) {
    return Array.isArray(value) ? "a list" : "a map";
  }
  return JSON.stringify(value) ?? String(value);
}

/** A key rendered for a message: a string key verbatim, anything else
 * through the same description ladder values use (a non-string key is a
 * real possibility on the file channel). */
function describeKey(key: unknown): string {
  return typeof key === "string" ? key : describeValue(key);
}

interface Slots {
  readonly path?: string | undefined;
  readonly key?: unknown;
  readonly value?: unknown;
  readonly source?: string | undefined;
  readonly grammar?: string | undefined;
  readonly members?: string | undefined;
  readonly keys?: string | undefined;
  readonly label?: string | undefined;
  readonly ownerKey?: string | undefined;
}

/** Interpolate a declared message template. The slot set is CLOSED and
 * supplied by the engine from the node's own evaluation context — no slot
 * carries rule-specific knowledge. */
function render(template: MessageTemplate, slots: Slots): string {
  return template.replace(/\{(\w+)\}/gu, (whole, name: string): string => {
    switch (name) {
      case "path":
        return slots.path ?? whole;
      case "key":
        return slots.key === undefined ? whole : describeKey(slots.key);
      case "keyJson":
        return JSON.stringify(slots.key) ?? whole;
      case "value":
        return "value" in slots ? describeValue(slots.value) : whole;
      case "valueRaw":
        return "value" in slots ? String(slots.value) : whole;
      case "valueJson":
        return "value" in slots ? (JSON.stringify(slots.value) ?? String(slots.value)) : whole;
      case "source":
        return slots.source ?? whole;
      case "grammar":
        return slots.grammar ?? whole;
      case "members":
        return slots.members ?? whole;
      case "keys":
        return slots.keys ?? whole;
      case "label":
        return slots.label ?? whole;
      case "ownerKey":
        return slots.ownerKey ?? whole;
      default:
        return whole;
    }
  });
}

// ---------------------------------------------------------------------------
// The run state.
// ---------------------------------------------------------------------------

interface Frame {
  /** The declaration path of the node being evaluated (`$.steps.*.role`). */
  readonly decl: DeclPath;
  /** The value path the findings address (`steps.review.role`). */
  readonly path: string;
  readonly value: unknown;
  /** The enclosing container's value — the operand of a `..` selector. */
  readonly parentValue: unknown;
  /** The key of the nearest enclosing OPEN-map entry. */
  readonly ownerKey?: string | undefined;
  readonly label?: string | undefined;
}

/** What a node evaluation reports upward: whether the node produced a
 * value its dependents may rely on (the implicit container precondition
 * plus every DECLARED `gating`). */
interface NodeResult {
  readonly ok: boolean;
  readonly value?: unknown;
}

/** A membership lane whose operand has NOT been evaluated yet. The engine
 * defers it to the end of the walk rather than reading an operand whose
 * reliability is still unknown — a GENERAL property of the `memberOf`
 * construct, not a per-rule placement. */
interface DeferredCheck {
  readonly frame: Frame;
  readonly rule: MembershipRule;
  readonly candidate: unknown;
  readonly slots: Slots;
}

class Run {
  readonly findings: ValidationFinding[] = [];
  readonly effectiveConfigs = new Map<string, unknown>();
  readonly runtimeContextBindings: string[] = [];
  /** Declaration path / tag → whether every instance produced a usable
   * value. A rule naming an unreliable operand is suppressed. */
  readonly declOk = new Map<string, boolean>();
  /** Declaration paths whose evaluation has completed. An operand that is
   * neither reliable nor unreliable but PENDING defers its rule. */
  readonly completed = new Set<DeclPath>();
  readonly deferred: DeferredCheck[] = [];
  readonly memo = new WeakMap<object, unknown>();
  root: unknown;

  constructor(
    readonly channel: EngineChannel,
    readonly catalog: GateCatalog | undefined,
    readonly valueClasses: Readonly<Record<string, NodeDecl>>,
  ) {}

  emit(path: string, message: string, code?: string): void {
    this.findings.push(code === undefined ? { path, message } : { path, message, code });
  }

  mark(key: string, ok: boolean): void {
    if (this.declOk.get(key) === false) return;
    this.declOk.set(key, ok);
  }

  reliable(key: string): boolean {
    return this.declOk.get(key) !== false;
  }
}

// ---------------------------------------------------------------------------
// Selectors.
// ---------------------------------------------------------------------------

type SelectorResult =
  | { readonly status: "ok"; readonly values: readonly string[] }
  | { readonly status: "unreliable" | "pending" };

const UNRELIABLE = { status: "unreliable" } as const;
const PENDING = { status: "pending" } as const;

/** Walk a declaration path over the value graph, expanding `*` over open
 * maps. `..` resolves one level up from the citing frame. A prefix that
 * has not been evaluated yet answers PENDING, not "unreliable". */
function resolvePath(
  run: Run,
  from: Frame,
  path: DeclPath,
): { readonly status: "ok"; readonly nodes: unknown[] } | { readonly status: "unreliable" | "pending" } {
  const segments = path.split(".");
  let nodes: unknown[];
  let declPrefix: string;
  const head = segments.shift();
  if (head === "$") {
    nodes = [run.root];
    declPrefix = "$";
  } else if (head === "^") {
    // Parent-relative: the citing node's own container.
    nodes = [from.parentValue];
    declPrefix = from.decl.split(".").slice(0, -1).join(".");
  } else {
    return UNRELIABLE;
  }
  for (const segment of segments) {
    declPrefix = `${declPrefix}.${segment}`;
    if (!run.reliable(declPrefix)) return UNRELIABLE;
    if (!run.completed.has(declPrefix)) return PENDING;
    const next: unknown[] = [];
    for (const node of nodes) {
      if (!isContainer(node)) return UNRELIABLE;
      if (segment === "*") {
        for (const [key, child] of entriesOf(node)) {
          if (typeof key === "string") next.push(child);
        }
      } else {
        if (!containerHas(node, segment)) return UNRELIABLE;
        next.push(containerGet(node, segment));
      }
    }
    nodes = next;
  }
  return { status: "ok", nodes };
}

function evaluateSelector(run: Run, from: Frame, selector: Selector): SelectorResult {
  if ("injected" in selector) {
    // D8's ADMITTED widening: the selector root is an INJECTED set. A
    // registry resolves rather than enumerates, so membership is asked of
    // it directly (`isMember`); the set itself is never listed.
    return run.catalog === undefined ? UNRELIABLE : { status: "ok", values: [] };
  }
  if ("union" in selector) {
    const parts = selector.union.map((part) => evaluateSelector(run, from, part));
    if (parts.some((part) => part.status === "pending")) return PENDING;
    if (parts.some((part) => part.status === "unreliable")) return UNRELIABLE;
    return {
      status: "ok",
      values: parts.flatMap((part) => (part.status === "ok" ? part.values : [])),
    };
  }
  const target = "keysOf" in selector ? selector.keysOf : "valuesOf" in selector ? selector.valuesOf : selector.collect;
  const resolved = resolvePath(run, from, target);
  if (resolved.status !== "ok") return resolved;
  const values: string[] = [];
  for (const node of resolved.nodes) {
    if ("keysOf" in selector) {
      if (!isContainer(node)) return UNRELIABLE;
      for (const [key] of entriesOf(node)) if (typeof key === "string") values.push(key);
    } else if ("valuesOf" in selector) {
      if (!Array.isArray(node)) return UNRELIABLE;
      for (const item of node) if (typeof item === "string") values.push(item);
    } else {
      if (typeof node !== "string") return UNRELIABLE;
      values.push(node);
    }
  }
  return { status: "ok", values };
}

/** `memberOf` against an INJECTED root asks the registry; against a
 * document root it asks the collected set. */
function isMember(run: Run, selector: Selector, set: SelectorResult, candidate: string): boolean {
  if ("injected" in selector) return run.catalog?.resolve(candidate) != null;
  return set.status === "ok" && set.values.includes(candidate);
}

function checkMembership(
  run: Run,
  frame: Frame,
  rule: MembershipRule,
  candidate: unknown,
  slots: Slots,
  local?: ReadonlyMap<string, boolean>,
): void {
  if (rule.dependsOn?.some((tag) => local?.get(tag) === false || !run.reliable(tag)) === true) return;
  const set = evaluateSelector(run, frame, rule.target);
  if (set.status === "pending") {
    run.deferred.push({ frame, rule, candidate, slots });
    return;
  }
  if (set.status === "unreliable") return;
  const at = rule.at === "container" ? parentPath(frame.path) : frame.path;
  const hit = typeof candidate === "string" && isMember(run, rule.target, set, candidate);
  const violated = rule.relation === "disjointFrom" ? hit : !hit;
  if (violated) {
    run.emit(at, render(rule.message, { ...slots, path: at, value: candidate }), rule.code);
  }
}

function parentPath(path: string): string {
  const bracket = path.lastIndexOf("[");
  const dot = path.lastIndexOf(".");
  if (bracket > dot) return path.slice(0, bracket);
  if (dot < 0) return "$";
  return path.slice(0, dot);
}

// ---------------------------------------------------------------------------
// The source-form ladder (vocabulary #6) — file channel only.
// ---------------------------------------------------------------------------

const PLAIN_DECIMAL = /^[1-9][0-9]*$/;

/**
 * The `plainDecimalInteger` ladder over a YAML node: alias-free,
 * scalar, anchor-free, tag-free, and a `^[1-9][0-9]*$` raw slice, then
 * the resolved safe-integer belt. Its six messages are FIXED by the
 * ladder (they are identical at every measured user), so they live with
 * the construct rather than being restated per node.
 */
const SOURCE_LADDER = {
  alias: "{path} must not be an alias (an alias hides the source form, probe P21)",
  nonScalar: "{path} must be a plain decimal integer scalar",
  anchor: "{path} must not carry an anchor (the anchor token sits outside the range slice)",
  tag: "{path} must not carry a tag (probe P22: a tag can flip the resolved type silently)",
  form: "{path} must be written as a plain decimal integer >= 1; got source form {source}",
  resolved: "{path} must resolve to a safe integer >= 1",
} as const;

export function sourceLadderFinding(node: unknown, source: string, path: string): string | undefined {
  if (node === undefined || node === null) return undefined;
  if (isAlias(node)) return render(SOURCE_LADDER.alias, { path });
  if (!isScalar(node)) return render(SOURCE_LADDER.nonScalar, { path });
  if (node.anchor !== undefined) return render(SOURCE_LADDER.anchor, { path });
  if (node.tag !== undefined) return render(SOURCE_LADDER.tag, { path });
  const range = node.range;
  const slice = range ? source.slice(range[0], range[1]) : "";
  if (!PLAIN_DECIMAL.test(slice)) {
    return render(SOURCE_LADDER.form, { path, source: JSON.stringify(slice) });
  }
  const resolved: unknown = node.value;
  if (typeof resolved !== "number" || !Number.isSafeInteger(resolved) || resolved < 1) {
    return render(SOURCE_LADDER.resolved, { path });
  }
  return undefined;
}

/** The YAML-AST address of a value path, for the source-bearing lanes. */
export function astPath(path: string): (string | number)[] {
  const segments: (string | number)[] = [];
  for (const part of path.split(".")) {
    let rest = part;
    const bracket = rest.indexOf("[");
    if (bracket >= 0) {
      const head = rest.slice(0, bracket);
      if (head !== "") segments.push(head);
      rest = rest.slice(bracket);
      for (const match of rest.matchAll(/\[(\d+)\]/gu)) {
        segments.push(Number(match[1]));
      }
      continue;
    }
    segments.push(rest);
  }
  return segments;
}

// ---------------------------------------------------------------------------
// The acyclic-graph lane (the substrate's `resolve.graph`).
// ---------------------------------------------------------------------------

/** DFS with a PATH-SCOPED ancestor set: shared subtrees (legal anchor
 * reuse) are not cycles; only a back-edge is. */
function findCycle(value: unknown, path: string, ancestors: Set<object>): string | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  if (ancestors.has(value)) return path;
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i += 1) {
        const hit = findCycle(value[i], joinPath(path, String(i)), ancestors);
        if (hit !== undefined) return hit;
      }
      return undefined;
    }
    if (isResolvedMap(value)) {
      for (const [key, child] of value.entries()) {
        const segment = typeof key === "string" ? key : "<map-key>";
        const keyHit = findCycle(key, joinPath(path, `${segment}<key>`), ancestors);
        if (keyHit !== undefined) return keyHit;
        const valueHit = findCycle(child, joinPath(path, segment), ancestors);
        if (valueHit !== undefined) return valueHit;
      }
    }
    return undefined;
  } finally {
    ancestors.delete(value);
  }
}

// ---------------------------------------------------------------------------
// Node evaluation.
// ---------------------------------------------------------------------------

const DEFAULT_MISSING = 'missing required key "{key}"';

/** Sibling reliability inside ONE fixed-map evaluation. `dependsOn` reads
 * it before the global map so a defect in binding #1 cannot suppress a
 * lane in binding #2. */
type LocalOk = Map<string, boolean>;

function baseSlots(frame: Frame): Slots {
  return { path: frame.path, value: frame.value, ownerKey: frame.ownerKey, label: frame.label };
}

function evaluateNode(run: Run, decl: NodeDecl, frame: Frame, local?: LocalOk): NodeResult {
  const result = dispatch(run, decl, frame, local);
  run.completed.add(frame.decl);
  run.mark(frame.decl, result.ok);
  run.mark(decl.tag, result.ok);
  return result;
}

function dispatch(run: Run, decl: NodeDecl, frame: Frame, local?: LocalOk): NodeResult {
  switch (decl.kind) {
    case "map.fixed":
      return evalMapFixed(run, decl, frame);
    case "map.open":
      return evalMapOpen(run, decl, frame);
    case "map.plain":
      return evalMapPlain(run, decl, frame);
    case "list":
      return evalList(run, decl, frame, local);
    case "string":
      return evalString(run, decl, frame, local);
    case "integer":
      return evalInteger(run, decl, frame);
    case "enum":
      return evalEnum(run, decl, frame);
    case "union":
      return evalUnion(run, decl, frame);
    case "raw":
      return evalRaw(run, decl, frame);
    case "valueClass":
      return evalValueClassRef(run, decl, frame, local);
    case "delegate":
      return evalDelegate(run, decl, frame, local);
  }
}

function evalValueClassRef(
  run: Run,
  decl: Extract<NodeDecl, { kind: "valueClass" }>,
  frame: Frame,
  local?: LocalOk,
): NodeResult {
  const target = run.valueClasses[decl.valueClass];
  if (target === undefined) return { ok: true, value: frame.value };
  const merged: Frame = { ...frame, label: decl.label ?? frame.label };
  const result = dispatch(run, target, merged, local);
  // The REFERENCING site's gating decides, not the shared class's.
  if (!result.ok && decl.gating === true) run.mark(frame.decl, false);
  return result;
}

function evalMapFixed(
  run: Run,
  decl: Extract<NodeDecl, { kind: "map.fixed" }>,
  frame: Frame,
): NodeResult {
  const value = frame.value;
  const slots = baseSlots(frame);
  if (!isContainer(value)) {
    run.emit(frame.path, render(decl.containerMessage, slots));
    return { ok: false };
  }
  const container = value;
  const fieldNames = Object.keys(decl.fields);
  // A field declared for ONE channel is legal only there — the same
  // channel scoping D1 applies to source-bearing attributes, applied to
  // keyset membership.
  const legal = new Set(
    fieldNames.filter((name) => {
      const channel = decl.fields[name]?.channel;
      return channel === undefined || channel === "both" || channel === run.channel.kind;
    }),
  );
  const normalized: Record<string, unknown> = {};
  const local: LocalOk = new Map();

  const emitUnknownKeys = (): void => {
    for (const [key] of entriesOf(container)) {
      if (typeof key !== "string") {
        run.emit(
          frame.path,
          render(decl.unknownMessage, { ...slots, key, value: key, keys: fieldNames.join(", ") }),
        );
        continue;
      }
      if (legal.has(key)) continue;
      const at = joinPath(frame.path, key);
      const removed = decl.removedKeys?.[key];
      const keySlots: Slots = { ...slots, path: at, key, value: key, keys: fieldNames.join(", ") };
      run.emit(at, render(removed ?? decl.unknownMessage, keySlots));
    }
  };

  const emitMissing = (name: string): void => {
    const field = decl.fields[name];
    const presence = field?.presence;
    if (field === undefined || presence === undefined) return;
    if (containerHas(container, name)) return;
    if (presence.foldedIntoTypeLane === true) {
      // Absence is this node's OWN type lane (a binding's `uses`).
      evaluateNode(run, field, childFrame(frame, name, undefined, container), local);
      local.set(field.tag, false);
      return;
    }
    const at = presence.at === "self" ? joinPath(frame.path, name) : frame.path;
    run.emit(
      at,
      render(presence.message ?? decl.missingMessage ?? DEFAULT_MISSING, { ...slots, path: at, key: name }),
      presence.code,
    );
    local.set(field.tag, false);
  };

  const evalOneField = (name: string): void => {
    const field = decl.fields[name];
    if (field === undefined) return;
    if (!containerHas(container, name)) {
      // An ABSENT field is where a declared `default:` materializes — the
      // schema-side half of ADR-019 D3.
      if (field.default !== undefined) defineOwn(normalized, name, field.default);
      return;
    }
    const child = childFrame(frame, name, containerGet(container, name), container);
    const result = evaluateNode(run, field, child, local);
    local.set(field.tag, result.ok);
    if (result.ok && result.value !== undefined) defineOwn(normalized, name, result.value);
  };

  const order = decl.laneOrder ?? "unknownThenPerKey";
  if (order === "missingThenUnknown") {
    for (const name of fieldNames) emitMissing(name);
    emitUnknownKeys();
    for (const name of fieldNames) evalOneField(name);
  } else if (order === "unknownThenMissingThenValues") {
    emitUnknownKeys();
    for (const name of fieldNames) emitMissing(name);
    for (const name of fieldNames) evalOneField(name);
  } else {
    emitUnknownKeys();
    for (const name of fieldNames) {
      if (!containerHas(container, name)) {
        emitMissing(name);
        evalOneField(name);
        continue;
      }
      evalOneField(name);
    }
  }
  return { ok: true, value: normalized };
}

function childFrame(parent: Frame, key: string, value: unknown, parentValue: unknown): Frame {
  return {
    decl: `${parent.decl}.${key}`,
    path: joinPath(parent.path, key),
    value,
    parentValue,
    ownerKey: parent.ownerKey,
  };
}

function evalMapOpen(
  run: Run,
  decl: Extract<NodeDecl, { kind: "map.open" }>,
  frame: Frame,
): NodeResult {
  const value = frame.value;
  const slots = baseSlots(frame);
  if (!isContainer(value)) {
    run.emit(frame.path, render(decl.containerMessage, slots));
    return { ok: false };
  }
  const container = value;
  const entries = entriesOf(container);
  let ok = true;
  if (decl.nonempty !== undefined && entries.length === 0) {
    run.emit(frame.path, render(decl.nonempty.message, slots));
    if (decl.nonempty.gating === true) ok = false;
  }
  if (decl.deepKeyStringness !== undefined && run.channel.kind === "file") {
    scanKeyStringness(run, container, frame.path, decl.deepKeyStringness.message, new WeakSet());
  }
  const normalized: Record<string, unknown> = {};
  for (const [key, child] of entries) {
    const keyIsString = typeof key === "string";
    const entryPath = keyIsString ? joinPath(frame.path, key) : frame.path;
    if (decl.keyClass !== undefined) {
      const keyFrame: Frame = {
        decl: `${frame.decl}<key>`,
        path: decl.keyLaneAt === "container" ? frame.path : entryPath,
        value: key,
        parentValue: container,
        ownerKey: frame.ownerKey,
      };
      const keyResult = evaluateNode(run, decl.keyClass, keyFrame);
      if (!keyResult.ok && decl.keyClass.gating === true) ok = false;
    }
    if (decl.keysSubsetOf !== undefined) {
      const before = run.findings.length;
      // The rule is the OPEN MAP's, so a `^`-relative selector resolves
      // from the map's own container — never from the map itself.
      const subsetFrame: Frame = {
        decl: frame.decl,
        path: entryPath,
        value: key,
        parentValue: frame.parentValue,
        ownerKey: frame.ownerKey,
      };
      checkMembership(run, subsetFrame, decl.keysSubsetOf, key, {
        ...slots,
        path: entryPath,
        key,
        ownerKey: frame.ownerKey,
      });
      // A key outside the subset is DEAD config: nothing below it has an
      // operand to be validated against (the measured lane's CONTINUE).
      if (run.findings.length > before) continue;
    }
    const entryFrame: Frame = {
      decl: `${frame.decl}.*`,
      path: entryPath,
      value: child,
      parentValue: container,
      ownerKey: keyIsString ? key : frame.ownerKey,
    };
    const entryResult = evaluateNode(run, decl.entry, entryFrame);
    if (keyIsString && entryResult.ok && entryResult.value !== undefined) {
      defineOwn(normalized, key, entryResult.value);
    }
  }
  run.completed.add(`${frame.decl}.*`);
  return { ok, value: normalized };
}

/** The gates subtree's file-channel key-STRINGNESS scan: a non-string key
 * cannot become an own property and would blind every own-key scan, so it
 * reports at the NEAREST addressable path (the containing map's). */
function scanKeyStringness(
  run: Run,
  value: unknown,
  path: string,
  message: MessageTemplate,
  seen: WeakSet<object>,
): void {
  if (typeof value !== "object" || value === null) return;
  if (seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanKeyStringness(run, item, indexPath(path, index), message, seen));
    return;
  }
  if (!isResolvedMap(value)) return;
  for (const [key, child] of value.entries()) {
    if (typeof key !== "string") {
      run.emit(path, render(message, { path, key, value: key }));
      continue;
    }
    scanKeyStringness(run, child, joinPath(path, key), message, seen);
  }
}

function evalList(
  run: Run,
  decl: Extract<NodeDecl, { kind: "list" }>,
  frame: Frame,
  local?: LocalOk,
): NodeResult {
  const value = frame.value;
  const slots = baseSlots(frame);
  if (!Array.isArray(value)) {
    run.emit(frame.path, render(decl.containerMessage, slots));
    return { ok: false };
  }
  let ok = true;
  if (decl.nonempty !== undefined && value.length === 0) {
    run.emit(frame.path, render(decl.nonempty.message, slots));
    if (decl.nonempty.gating === true) ok = false;
  }
  const normalized: unknown[] = [];
  const seen = new Set<unknown>();
  const clean: { readonly member: unknown; readonly path: string }[] = [];
  value.forEach((member, index) => {
    const memberPath = decl.memberLaneAt === "container" ? frame.path : indexPath(frame.path, index);
    const memberFrame: Frame = {
      decl: `${frame.decl}[]`,
      path: memberPath,
      value: member,
      parentValue: value,
      ownerKey: frame.ownerKey,
    };
    const before = run.findings.length;
    const result = evaluateNode(run, decl.member, memberFrame, local);
    if (run.findings.length > before) return;
    if (result.value !== undefined) normalized.push(result.value);
    if (decl.memberOf !== undefined) {
      checkMembership(run, memberFrame, decl.memberOf, member, { ...slots, path: memberPath, value: member });
    }
    if (decl.unique !== undefined) {
      const at = decl.unique.at === "container" ? frame.path : memberPath;
      if (seen.has(member)) {
        run.emit(at, render(decl.unique.message, { ...slots, path: at, value: member }));
      }
      seen.add(member);
    }
    clean.push({ member, path: memberPath });
  });
  if (decl.disjointFrom !== undefined) {
    for (const entry of clean) {
      const memberFrame: Frame = {
        decl: `${frame.decl}[]`,
        path: entry.path,
        value: entry.member,
        parentValue: value,
        ownerKey: frame.ownerKey,
      };
      checkMembership(run, memberFrame, decl.disjointFrom, entry.member, {
        ...slots,
        path: entry.path,
        value: entry.member,
      });
    }
  }
  run.completed.add(`${frame.decl}[]`);
  return { ok, value: normalized };
}

function evalString(
  run: Run,
  decl: Extract<NodeDecl, { kind: "string" }>,
  frame: Frame,
  local?: LocalOk,
): NodeResult {
  const value = frame.value;
  const slots: Slots = { ...baseSlots(frame), grammar: decl.grammar?.re };
  if (typeof value !== "string") {
    // A node that declares NO type lane leaves the non-string case to its
    // membership lane, which emits ONE finding for both faults (the
    // measured form of `start` and of a transition target).
    if (decl.typeMessage !== undefined) {
      run.emit(frame.path, render(decl.typeMessage, slots), decl.presence?.code);
      return { ok: false };
    }
  } else {
    if (decl.nonempty !== undefined && value.length === 0) {
      run.emit(frame.path, render(decl.nonempty.message, slots), decl.presence?.code);
      return { ok: false };
    }
    if (decl.grammar !== undefined && !new RegExp(decl.grammar.re, "u").test(value)) {
      run.emit(frame.path, render(decl.grammar.message, slots));
      return { ok: false };
    }
  }
  if (decl.memberOf !== undefined) {
    const before = run.findings.length;
    checkMembership(run, frame, decl.memberOf, value, slots, local);
    if (run.findings.length > before) return { ok: false, value };
  }
  return typeof value === "string" ? { ok: true, value } : { ok: false };
}

function evalInteger(
  run: Run,
  decl: Extract<NodeDecl, { kind: "integer" }>,
  frame: Frame,
): NodeResult {
  const value = frame.value;
  if (decl.sourceForm !== undefined && run.channel.kind === "file") {
    const node: unknown = run.channel.doc.getIn(astPath(frame.path), true);
    const message = sourceLadderFinding(node, run.channel.source, frame.path);
    if (message !== undefined) {
      run.emit(frame.path, message);
      return { ok: false };
    }
    return { ok: true, value };
  }
  const belt = decl.resolvedForm;
  if (belt !== undefined) {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < belt.min) {
      run.emit(frame.path, render(belt.message, baseSlots(frame)), decl.presence?.code);
      return { ok: false };
    }
  }
  return { ok: true, value };
}

function evalEnum(
  run: Run,
  decl: Extract<NodeDecl, { kind: "enum" }>,
  frame: Frame,
): NodeResult {
  const value = frame.value;
  const legal = decl.members.filter(
    (one) => one.channel === undefined || one.channel === "both" || one.channel === run.channel.kind,
  );
  const slots: Slots = {
    ...baseSlots(frame),
    members: legal.map((one) => String(one.value)).join(", "),
  };
  const member = legal.find((one) => one.value === value);
  if (member !== undefined) return { ok: true, value: member.store ?? member.value };
  run.emit(frame.path, render(decl.message, slots), decl.code);
  return { ok: false };
}

function evalUnion(
  run: Run,
  decl: Extract<NodeDecl, { kind: "union" }>,
  frame: Frame,
): NodeResult {
  const value = frame.value;
  const slots = baseSlots(frame);
  if (typeof value === "string") {
    const removed = decl.removedValues?.[value];
    if (removed !== undefined) {
      run.emit(frame.path, render(removed, slots));
      return { ok: false };
    }
    if (decl.literals?.includes(value) === true) return { ok: true, value };
  }
  if (isContainer(value) && decl.mapCase !== undefined) {
    return evaluateNode(run, decl.mapCase, frame);
  }
  run.emit(frame.path, render(decl.message, slots));
  return { ok: false };
}

function evalRaw(run: Run, decl: Extract<NodeDecl, { kind: "raw" }>, frame: Frame): NodeResult {
  if (decl.containerMessage !== undefined && !isContainer(frame.value)) {
    run.emit(frame.path, render(decl.containerMessage, baseSlots(frame)));
    return { ok: false };
  }
  return { ok: true, value: materialize(frame.value, run.memo) };
}

function evalMapPlain(
  run: Run,
  decl: Extract<NodeDecl, { kind: "map.plain" }>,
  frame: Frame,
): NodeResult {
  const value = frame.value;
  const slots = baseSlots(frame);
  const realized = materialize(value, run.memo);
  if (!isPlainMap(realized)) {
    run.emit(frame.path, render(decl.containerMessage, { ...slots, value: realized }));
    return { ok: false };
  }
  if (!isCanonicalizable(realized)) {
    run.emit(frame.path, render(decl.canonicalJsonSafe.message, slots));
    return { ok: false };
  }
  return { ok: true, value: realized };
}

function evalDelegate(
  run: Run,
  decl: Extract<NodeDecl, { kind: "delegate" }>,
  frame: Frame,
  local?: LocalOk,
): NodeResult {
  if (decl.dependsOn?.some((tag) => local?.get(tag) === false) === true) return { ok: true };
  const owner = frame.parentValue;
  const by = isContainer(owner) ? containerGet(owner, decl.by) : undefined;
  if (typeof by !== "string") return { ok: true };
  const registration = run.catalog?.resolve(by) ?? null;
  if (registration === null) return { ok: true };
  if (registration.requiresRuntimeContext) run.runtimeContextBindings.push(parentPath(frame.path));
  const raw = frame.value === undefined ? undefined : materialize(frame.value, run.memo);
  const result = registration.validateAndNormalizeConfig(raw);
  if (result.ok) {
    run.effectiveConfigs.set(parentPath(frame.path), result.effective);
    return { ok: true, value: result.effective };
  }
  if (result.findings.length === 0) {
    run.emit(frame.path, render(decl.beltMessage, { ...baseSlots(frame), key: by, value: by }));
    return { ok: false };
  }
  for (const finding of result.findings) {
    const at = finding.path === "" ? frame.path : `${frame.path}.${finding.path}`;
    run.emit(at, finding.message, finding.code);
  }
  return { ok: false };
}

// ---------------------------------------------------------------------------
// Cross rules and the deferred queue.
// ---------------------------------------------------------------------------

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

/** vocabulary #12's `equals` — two-direction set equality, each direction
 * carrying its own path grain and wording (ch8-C16's measured form). */
function evaluateEquals(run: Run, frame: Frame, rule: EqualsRuleDecl): void {
  if (rule.dependsOn?.some((tag) => !run.reliable(tag)) === true) return;
  const left = evaluateSelector(run, frame, rule.left);
  const right = evaluateSelector(run, frame, rule.right);
  if (left.status !== "ok" || right.status !== "ok") return;
  const declared = unique(left.values);
  const used = unique(right.values);
  for (const value of used) {
    if (declared.includes(value)) continue;
    const at = render(rule.missingFromLeft.at, { value });
    run.emit(at, render(rule.missingFromLeft.message, { path: at, value }));
  }
  for (const value of declared) {
    if (used.includes(value)) continue;
    const at = render(rule.missingFromRight.at, { value });
    run.emit(at, render(rule.missingFromRight.message, { path: at, value }));
  }
}

function runDeferred(run: Run): void {
  // A membership lane deferred for a PENDING operand runs once, in the
  // order the walk queued it. The queue is drained, never re-fed: every
  // operand has completed by now, so a second pass could only loop.
  const queued = run.deferred.splice(0, run.deferred.length);
  for (const check of queued) {
    checkMembership(run, check.frame, check.rule, check.candidate, check.slots);
  }
  run.deferred.length = 0;
}

// ---------------------------------------------------------------------------
// Entry points.
// ---------------------------------------------------------------------------

/**
 * Run a surface declaration over a value graph. ONE computation serves
 * both channels (D1): the caller supplies `channel`, and the source-bearing
 * attributes are inert where no source exists.
 */
export function runSurface(surface: SurfaceDecl, value: unknown, opts: EngineOptions): EngineRun {
  const run = new Run(opts.channel, opts.catalog, surface.valueClasses);
  run.root = value;
  const rootFrame: Frame = { decl: "$", path: "$", value, parentValue: undefined };
  const rootDecl = surface.root;

  // The root container precondition: with no map operand nothing below has
  // an address, so the ONE finding is the whole result. It applies where
  // the ROOT is declared as a map — a surface whose root is any other
  // kind evaluates through its own node like every other.
  const rootIsMap =
    rootDecl.kind === "map.fixed" || rootDecl.kind === "map.open" || rootDecl.kind === "map.plain";
  if (rootIsMap && !isContainer(value)) {
    run.emit("$", render(rootDecl.containerMessage, { path: "$", value }));
    return {
      findings: run.findings,
      normalized: undefined,
      effectiveConfigs: run.effectiveConfigs,
      runtimeContextBindings: run.runtimeContextBindings,
    };
  }

  // The substrate's `resolve.graph: acyclic` lane. It ACCUMULATES with the
  // structural lanes (a cycle is not a container, so it suppresses
  // nothing), and it has an operand only where a resolved graph exists.
  if (run.channel.kind === "file") {
    const cycle = findCycle(value, "$", new Set());
    if (cycle !== undefined) {
      run.emit(cycle, render(surface.substrate.resolve.graph.message, { path: cycle }));
    }
  }

  const result = evaluateNode(run, rootDecl, rootFrame);
  runDeferred(run);
  for (const rule of surface.crossRules) evaluateEquals(run, rootFrame, rule);
  return {
    findings: run.findings,
    normalized: result.value,
    effectiveConfigs: run.effectiveConfigs,
    runtimeContextBindings: run.runtimeContextBindings,
  };
}

/** The declaration's own tag inventory — the operand of D4's tag-closure
 * check (every tag defined is citable, every tag cited is defined). */
export function collectTags(surface: SurfaceDecl): readonly string[] {
  const tags: string[] = [];
  const visit = (decl: NodeDecl): void => {
    tags.push(decl.tag);
    switch (decl.kind) {
      case "map.fixed":
        for (const field of Object.values(decl.fields)) visit(field);
        return;
      case "map.open": {
        if (decl.keyClass !== undefined) visit(decl.keyClass);
        visit(decl.entry);
        return;
      }
      case "list":
        visit(decl.member);
        return;
      case "union":
        if (decl.mapCase !== undefined) visit(decl.mapCase);
        return;
      default:
        return;
    }
  };
  visit(surface.root);
  for (const [, decl] of Object.entries(surface.valueClasses)) visit(decl);
  for (const rule of surface.crossRules) tags.push(rule.tag);
  for (const hook of surface.normalizers) tags.push(hook.tag);
  return tags;
}
