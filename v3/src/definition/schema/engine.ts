import { isAlias, isScalar } from "yaml";
import type { Document } from "yaml";

import { isCanonicalizable } from "../../emit/opId.js";
import type { GateCatalog } from "../../ports/index.js";
import type { ValidationFinding } from "../errors.js";
import type {
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

/** The engine's INTERNAL address for a declaration position
 * (`$.steps.*.role`). It is NOT one of the declaration's three path
 * languages (design review F11) — no declaration ever writes one; the walk
 * builds them to key its reliability and completion bookkeeping. */
type DeclPath = string;

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
  /**
   * Every declared tag that failed ANYWHERE in this run — the set the
   * engine already maintains for its own document-scoped dependent
   * suppression, exposed read-only (the `runtimeContextBindings`
   * precedent: a residual lane's operand, given a surface rather than
   * re-derived by hand).
   *
   * ch13v2-C9's hygiene lane is its first live consumer: a TEMPLATE-WIDE
   * stand-down needs to know whether any lane made a ref list
   * UNREACHABLE, and inferring that from absences in the normalized value
   * answers wrong in silence. A declared rule citing a tag through
   * `dependsOn` already stands down on exactly this condition — this
   * surface gives a HAND rule the treatment every declared one has.
   */
  readonly failedTags: readonly string[];
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

/** An OWN-property lookup in a declared registry keyed by AUTHORED text.
 * A step id, an event type or a scalar value may legally be `constructor`
 * or `toString`, and a bracket read would return the prototype's member —
 * which is not a message, and calling it as one crashes the walk. The G8
 * discipline this codebase already applies to value maps, applied to the
 * declaration's own maps. */
function ownMessage(
  registry: Readonly<Record<string, MessageTemplate>> | undefined,
  key: string,
): MessageTemplate | undefined {
  if (registry === undefined) return undefined;
  return Object.prototype.hasOwnProperty.call(registry, key) ? registry[key] : undefined;
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
// THE DECLARATION RESOLVER — one model of the engine's own addressing.
// ---------------------------------------------------------------------------

/**
 * Three review rounds in a row found the same shape of defect: the load-time
 * gate kept its OWN model of which declaration positions exist and what a
 * selector reaches, and that replica drifted from the walk it was modelling.
 * Every fix closed one divergence and the next round found the next.
 *
 * So the model is here, once, and BOTH readers go through it: the runtime
 * selector walk (`resolvePath`) descends with `descend`, and the gate
 * resolves every declared reference with the same call. The judge and the
 * executor are the same code — the drift class has nowhere left to live.
 */

/** One descent the walk can make. These are the only four; every address
 * `evaluateNode` records is a sequence of them. */
export type DeclStep =
  | { readonly kind: "field"; readonly name: string }
  | { readonly kind: "entry" }
  | { readonly kind: "member" }
  | { readonly kind: "keyClass" };

/** A declaration POSITION: the node the walk evaluates and the address it
 * records for it. They travel together, so a caller cannot hold an address
 * that disagrees with its node. */
export interface DeclCursor {
  readonly node: NodeDecl;
  readonly decl: DeclPath;
}

/** The address language, written in ONE place. */
export function stepAddress(parent: DeclPath, step: DeclStep): DeclPath {
  switch (step.kind) {
    case "field":
      return `${parent}.${step.name}`;
    case "entry":
      return `${parent}.*`;
    case "member":
      return `${parent}[]`;
    case "keyClass":
      return `${parent}<key>`;
  }
}

/** A field of a DECLARED map, read as an own property. A declaration's
 * field names are authored text like any other key. */
function ownField(fields: Readonly<Record<string, NodeDecl>>, name: string): NodeDecl | undefined {
  return Object.prototype.hasOwnProperty.call(fields, name) ? fields[name] : undefined;
}

/** A value-class reference and a union are evaluated AT THEIR REFERRER'S
 * address (`evalValueClassRef` and `evalUnion` dispatch on the same frame),
 * so a step departing from one departs from the node behind it. */
function deref(surface: SurfaceDecl, node: NodeDecl, seen = new Set<string>()): NodeDecl | undefined {
  if (node.kind === "valueClass") {
    if (seen.has(node.valueClass)) return undefined;
    seen.add(node.valueClass);
    const target = surface.valueClasses[node.valueClass];
    return target === undefined ? undefined : deref(surface, target, seen);
  }
  if (node.kind === "union") {
    return node.mapCase === undefined ? undefined : deref(surface, node.mapCase, seen);
  }
  return node;
}

function childDecl(node: NodeDecl, step: DeclStep): NodeDecl | undefined {
  switch (step.kind) {
    case "field":
      // D11: a plain map's TYPED SUBSET fields are declared positions too,
      // so the one descent serves them — the gate resolves references into
      // them and the walk evaluates them through the same call.
      if (node.kind === "map.plain") return ownField(node.fields ?? {}, step.name);
      return node.kind === "map.fixed" ? ownField(node.fields, step.name) : undefined;
    case "entry":
      return node.kind === "map.open" ? node.entry : undefined;
    case "member":
      return node.kind === "list" ? node.member : undefined;
    case "keyClass":
      return node.kind === "map.open" ? node.keyClass : undefined;
  }
}

/** The node behind a position, after the reference and union hops the walk
 * takes transparently. Undefined where the reference does not resolve. */
export function derefNode(surface: SurfaceDecl, node: NodeDecl): NodeDecl | undefined {
  return deref(surface, node);
}

/** THE DESCENT: from position `at`, where a `step` lands — or undefined
 * where the walk does not descend there at all. */
export function descend(surface: SurfaceDecl, at: DeclCursor, step: DeclStep): DeclCursor | undefined {
  const node = deref(surface, at.node);
  if (node === undefined) return undefined;
  const child = childDecl(node, step);
  return child === undefined ? undefined : { node: child, decl: stepAddress(at.decl, step) };
}

/** A SELECTOR segment as a descent: `*` is the open-map wildcard the
 * language reserves, anything else names a declared field. A literal key
 * at an open map is a DOCUMENT key, not a declared position — the walk
 * records no address for it, so no rule can be hung there. */
export function selectorStep(segment: string): DeclStep {
  return segment === "*" ? { kind: "entry" } : { kind: "field", name: segment };
}

/** Where a selector path lands, resolved against the DECLARATION alone —
 * the dry run of `resolvePath`. `visited` runs base-first, target last. */
export interface DeclResolution {
  readonly visited: readonly DeclCursor[];
  /** The address the walk failed to reach, when it did. */
  readonly unreached?: string;
}

export function resolveSelectorPath(
  surface: SurfaceDecl,
  root: DeclCursor,
  parent: DeclCursor | undefined,
  path: string,
): DeclResolution {
  const segments = path.split(".");
  const head = segments.shift();
  const base = head === "$" ? root : parent;
  // The address the path INTENDS, for the message: a reader needs the whole
  // thing, not the segment the walk happened to stop on.
  const intended = base === undefined ? path : [base.decl, ...segments].join(".");
  if (base === undefined) return { visited: [], unreached: intended };
  const visited: DeclCursor[] = [base];
  let cursor = base;
  for (const segment of segments) {
    const next = descend(surface, cursor, selectorStep(segment));
    if (next === undefined) return { visited, unreached: intended };
    cursor = next;
    visited.push(cursor);
  }
  return { visited };
}

/**
 * A value position the declared walk reached: what is there, the record
 * that holds it and under which key, and the VALUE path the engine
 * addresses findings by.
 *
 * The normalizer walks with this. It used to read its operand paths with a
 * reader of its own — one that took `*` for a literal key and assumed a
 * path held exactly one of them — and that reader was the THIRD model of
 * an addressing the gate and the walk had already been made to share. A
 * hook whose declared path the gate certified then wrote nothing at all,
 * in silence. There is no third model now.
 */
export interface Reached {
  readonly value: unknown;
  /** The record holding it, for a hook that must write its result back. */
  readonly owner?: Record<string, unknown> | undefined;
  readonly key?: string | undefined;
  /** The engine's own finding grain (`steps.review.gates.CONVERGED`). */
  readonly path: string;
  /** The STRUCTURAL address, which is what per-binding state is keyed by:
   * a rendered path collapses `["a.b"]` and `["a","b"]` onto one string. */
  readonly segments: readonly (string | number)[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Map);
}

/**
 * Every value position a declared path reaches over a NORMALIZED value
 * graph, expanding `*` over open maps — the same descent the gate resolved
 * that path with. `steps` are further descents to take after the path
 * (only `field` and `entry` address a value; `member` and `keyClass` are
 * positions a path cannot land on, and yield nothing).
 */
export function reachAll(
  surface: SurfaceDecl,
  root: unknown,
  path: string,
  ...steps: readonly DeclStep[]
): readonly Reached[] {
  const segments = path.split(".");
  if (segments.shift() !== "$") return [];
  let cursor: DeclCursor = { node: surface.root, decl: "$" };
  let nodes: readonly Reached[] = [{ value: root, path: "$", segments: [] }];

  const take = (step: DeclStep): boolean => {
    const next = descend(surface, cursor, step);
    if (next === undefined) return false;
    cursor = next;
    const reached: Reached[] = [];
    for (const node of nodes) {
      if (!isRecord(node.value)) continue;
      const keys =
        step.kind === "entry"
          ? Object.keys(node.value)
          : step.kind === "field" && Object.prototype.hasOwnProperty.call(node.value, step.name)
            ? [step.name]
            : [];
      for (const key of keys) {
        reached.push({
          value: ownGet(node.value, key),
          owner: node.value,
          key,
          path: joinPath(node.path, key),
          segments: [...node.segments, key],
        });
      }
    }
    nodes = reached;
    return true;
  };

  for (const segment of segments) {
    if (!take(selectorStep(segment))) return [];
  }
  for (const step of steps) {
    if (!take(step)) return [];
  }
  return nodes;
}

/**
 * The RUNTIME shapes a declared node can legally hold. A selector reads the
 * RAW value, so what decides whether a relation can read a target is not
 * the node's kind name but the shapes a valid value can take — and a node
 * that can hold more than one is readable only for SOME inputs, which is
 * the input-dependent silence a closed declaration must not contain.
 */
export type RuntimeShape = "map" | "list" | "string" | "other";

export function shapesOf(surface: SurfaceDecl, node: NodeDecl, seen = new Set<string>()): ReadonlySet<RuntimeShape> {
  switch (node.kind) {
    case "map.fixed":
    case "map.open":
    case "map.plain":
      return new Set<RuntimeShape>(["map"]);
    case "list":
      return new Set<RuntimeShape>(["list"]);
    case "string":
      return new Set<RuntimeShape>(["string"]);
    case "integer":
    case "delegate":
      return new Set<RuntimeShape>(["other"]);
    case "enum":
      return new Set<RuntimeShape>(node.members.map((member) => (typeof member.value === "string" ? "string" : "other")));
    case "union": {
      const shapes = new Set<RuntimeShape>((node.literals ?? []).map(() => "string" as const));
      if (node.mapCase !== undefined) for (const shape of shapesOf(surface, node.mapCase, seen)) shapes.add(shape);
      return shapes;
    }
    case "valueClass": {
      if (seen.has(node.valueClass)) return new Set<RuntimeShape>(["other"]);
      seen.add(node.valueClass);
      const target = surface.valueClasses[node.valueClass];
      return target === undefined ? new Set<RuntimeShape>(["other"]) : shapesOf(surface, target, seen);
    }
    case "raw":
      // Uninterpreted: the declaration guarantees nothing about the value.
      return new Set<RuntimeShape>(["map", "list", "string", "other"]);
  }
}

/** What each selector relation READS, as one definition: the predicate
 * `evaluateSelector` applies at run time and the shape the gate demands of
 * every legal value. Changing what a relation reads changes both. */
export const RELATION_READS = {
  keysOf: { shape: "map", test: (value: unknown): boolean => isContainer(value) },
  // D10: reads the same shape as `keysOf` — a map — and differs in WHICH
  // of its keys it yields, not in what it can read.
  validKeysOf: { shape: "map", test: (value: unknown): boolean => isContainer(value) },
  valuesOf: { shape: "list", test: (value: unknown): boolean => Array.isArray(value) },
  collect: { shape: "string", test: (value: unknown): boolean => typeof value === "string" },
} as const satisfies Readonly<Record<string, { readonly shape: RuntimeShape; readonly test: (value: unknown) => boolean }>>;

export type SelectorRelation = keyof typeof RELATION_READS;

/** Which relation a selector leaf names, and the path it reads. */
export function selectorRead(
  selector: Extract<
    Selector,
    { keysOf: string } | { validKeysOf: string } | { valuesOf: string } | { collect: string }
  >,
): { readonly relation: SelectorRelation; readonly path: string } {
  if ("keysOf" in selector) return { relation: "keysOf", path: selector.keysOf };
  if ("validKeysOf" in selector) return { relation: "validKeysOf", path: selector.validKeysOf };
  if ("valuesOf" in selector) return { relation: "valuesOf", path: selector.valuesOf };
  return { relation: "collect", path: selector.collect };
}

// ---------------------------------------------------------------------------
// Paths and message interpolation.
// ---------------------------------------------------------------------------

/** `$` is the template root; `""` is a delegated config's own root. Both
 * are addressed by their children's bare key (the measured path grammar). */
function joinPath(parent: string, key: string): string {
  return parent === "$" || parent === "" ? key : `${parent}.${key}`;
}

/** The list-member finding grain. Exported because the normalizer keys
 * per-binding state by it and must not spell it a second way. */
export function indexPath(parent: string, index: number): string {
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

export interface Slots {
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
export function renderMessage(template: MessageTemplate, slots: Slots): string {
  return render(template, slots);
}

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
  /** The declaration position being evaluated: its node and the address the
   * walk records for it (`$.steps.*.role`). One value, so the address and
   * the node it names cannot come apart. */
  readonly at: DeclCursor;
  /** The position of the enclosing container — the declaration operand of a
   * `^` selector, exactly as `parentValue` is its value operand. It is NOT
   * derived by chopping `at.decl`: a list member's address ends in `[]`,
   * which chopping resolves to the wrong container. */
  readonly parentAt?: DeclCursor | undefined;
  /** The enclosing container's INSTANCE address, travelling beside
   * `parentValue` and `parentAt` so all three describe the same
   * container. */
  readonly parentSegments?: readonly (string | number)[] | undefined;
  /** A lane that occupies no position in the value graph and therefore
   * has no segment of its own — an open map's KEY class. Without it the
   * key lane would share the map's address, and one malformed key would
   * mark the whole map unusable, silently suppressing every rule that
   * reads it. */
  readonly lane?: string | undefined;
  /** The value path the findings address (`steps.review.role`). */
  readonly path: string;
  /** The SOURCE-document address, carried segment by segment as the walk
   * descends. It is not derived from `path`: a rendered path is lossy —
   * an authored id may itself contain `[0]` or a dot, and re-parsing one
   * addresses a different node or none (B1 F3). */
  readonly segments: readonly (string | number)[];
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

/**
 * A delegation the registry REFUSED. The engine cannot validate the config
 * it was handed, so the obligation the declaration placed on that instance
 * is UNDISCHARGED — and an undischarged obligation that says nothing is
 * the same defect as a rule that quietly does not run: the config
 * disappeared from the admitted value and no finding recorded it.
 *
 * It travels to the end of the walk rather than reporting on the spot,
 * because a sibling lane may yet fail and become the trace (the measured
 * shape: a binding whose `uses` is itself checked against the same
 * registry). What is owed is per INSTANCE — one binding's unresolvable
 * registration says nothing about another's.
 */
interface Obligation {
  readonly frame: Frame;
  readonly by: string;
  readonly dependsOn: readonly string[];
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

/**
 * The INSTANCE address of a position — the walk's own segment list.
 *
 * It is not `frame.path`: a finding path can be COARSENED by a declared
 * grain (`memberLaneAt: "container"` reports every member at the list's
 * own path), and two positions that report at one path are still two
 * positions. Nor is it `frame.at.decl`: that names the DECLARATION, which
 * every instance of it shares — which is how one open-map entry's broken
 * field came to decide another entry's rule.
 */
export function instanceKey(segments: readonly (string | number)[], lane?: string): string {
  return JSON.stringify([segments, lane ?? null]);
}

/** `tag@scope`, for a status a sibling asks about by name. */
function tagKey(scope: readonly (string | number)[], tag: string): string {
  return `${tag}\u0000${instanceKey(scope)}`;
}

class Run {
  readonly findings: ValidationFinding[] = [];
  readonly effectiveConfigs = new Map<string, unknown>();
  readonly runtimeContextBindings: string[] = [];
  /** INSTANCE address → whether THAT instance produced a usable value. A
   * rule naming an unreliable operand is suppressed; keyed per instance,
   * a sibling's failure cannot suppress a rule that never read it. */
  readonly declOk = new Map<string, boolean>();
  /** Instance addresses whose evaluation has completed. An operand that is
   * neither reliable nor unreliable but PENDING defers its rule. */
  readonly completed = new Set<string>();
  /** `dependsOn` names a TAG, and what the citing instance means by it is
   * "that tag AT MY SCOPE" — its own container's, or the nearest enclosing
   * one. Recorded per scope so the answer is the citing instance's, and
   * looked up outward so a member can still depend on an ancestor's
   * sibling. */
  readonly tagOk = new Map<string, boolean>();
  /** Every tag that failed ANYWHERE. A cross rule is document-scoped, so
   * this is the status it means. */
  readonly tagFailedAnywhere = new Set<string>();
  /** Instances whose OWN evaluation produced no finding. The entry belt's
   * definition of a valid entry, recorded where it is measured rather than
   * restated where it is read. */
  readonly clean = new Set<string>();
  /** True once the node walk has finished and the deferred queue is
   * draining. A belt operand that is still unreached THEN is unreachable,
   * not merely early. */
  walkComplete = false;
  /** Instance address → the value a declared `default:` materialized
   * there. The authored graph does not hold it, and a selector must read
   * what the walk validated rather than the absence it replaced. */
  readonly materialized = new Map<string, unknown>();
  readonly deferred: DeferredCheck[] = [];
  /** Delegations whose registration the registry refused. What is still
   * OWED travels per instance to the end of the walk: a config may not
   * vanish from the admitted value with nothing recording that it was
   * never validated. */
  readonly obligations: Obligation[] = [];
  readonly memo = new WeakMap<object, unknown>();
  root: unknown;

  constructor(
    readonly surface: SurfaceDecl,
    readonly channel: EngineChannel,
    readonly registries: Readonly<Record<string, GateCatalog | undefined>>,
  ) {}

  get valueClasses(): Readonly<Record<string, NodeDecl>> {
    return this.surface.valueClasses;
  }

  /** The document root as a declaration position — the operand of every
   * `$`-rooted selector. */
  get rootAt(): DeclCursor {
    return { node: this.surface.root, decl: "$" };
  }

  /** The injected set a selector root or a delegation names. */
  registry(name: string): GateCatalog | undefined {
    return this.registries[name];
  }

  emit(path: string, message: string, code?: string): void {
    this.findings.push(code === undefined ? { path, message } : { path, message, code });
  }

  mark(key: string, ok: boolean): void {
    if (this.declOk.get(key) === false) return;
    this.declOk.set(key, ok);
  }

  /**
   * Record a tag's status twice: at the node's OWN instance, so a rule
   * nested inside it finds exactly that node's answer, and at its
   * CONTAINER's, so a sibling finds it. Two entries of one open map write
   * different own-keys, which is what stops one entry answering for
   * another.
   */
  markTag(frame: Frame, tag: string, ok: boolean): void {
    for (const scope of [frame.segments, frame.parentSegments ?? []]) {
      const key = tagKey(scope, tag);
      if (this.tagOk.get(key) !== false) this.tagOk.set(key, ok);
    }
    if (!ok) this.tagFailedAnywhere.add(tag);
  }

  /** The status of `tag` as the instance at `scope` means it: the nearest
   * answer walking outward from itself. Silence is not failure — an
   * unrecorded tag suppresses nothing. */
  reliableTag(scope: readonly (string | number)[], tag: string): boolean {
    for (let cut = scope.length; cut >= 0; cut -= 1) {
      const recorded = this.tagOk.get(tagKey(scope.slice(0, cut), tag));
      if (recorded !== undefined) return recorded;
    }
    return true;
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

/** A value the selector walk reached, with the INSTANCE address it sits
 * at — the entry belt needs the address to ask whether that instance's
 * own evaluation was clean. */
interface ReachedNode {
  readonly value: unknown;
  readonly segments: readonly (string | number)[];
}

const UNRELIABLE = { status: "unreliable" } as const;
const PENDING = { status: "pending" } as const;

/** Walk a selector path over the value graph, expanding `*` over open maps.
 * `^` resolves to the citing node's own container. A prefix that has not
 * been evaluated yet answers PENDING, not "unreliable".
 *
 * The DECLARATION side of this walk goes through `descend` — the same call
 * the load-time gate makes — so a path the gate resolved is a path this
 * walk reaches, by construction rather than by two implementations
 * agreeing. */
function resolvePath(
  run: Run,
  from: Frame,
  path: DeclPath,
):
  | { readonly status: "ok"; readonly nodes: readonly ReachedNode[] }
  | { readonly status: "unreliable" | "pending" } {
  const segments = path.split(".");
  // Each node carries its OWN instance address, because reliability and
  // completion are that instance's, not its declaration's.
  let nodes: { readonly value: unknown; readonly segments: readonly (string | number)[] }[];
  let cursor: DeclCursor | undefined;
  const head = segments.shift();
  if (head === "$") {
    nodes = [{ value: run.root, segments: [] }];
    cursor = run.rootAt;
  } else if (head === "^") {
    // Parent-relative: the citing node's own container.
    nodes = [{ value: from.parentValue, segments: from.parentSegments ?? [] }];
    cursor = from.parentAt;
  } else {
    return UNRELIABLE;
  }
  if (cursor === undefined) return UNRELIABLE;
  for (const segment of segments) {
    // Nothing left to walk: an open map with no entries ends the walk
    // here, and the honest answer is the EMPTY set, decided now. Asking
    // whether the positions below it have been evaluated would wait on
    // instances that do not exist — a rule over an empty map would sit
    // undecided forever for want of an operand it can already see is
    // empty.
    if (nodes.length === 0) return { status: "ok", nodes: [] };
    const next = descend(run.surface, cursor, selectorStep(segment));
    if (next === undefined) return UNRELIABLE;
    cursor = next;
    const values: { readonly value: unknown; readonly segments: readonly (string | number)[] }[] = [];
    for (const node of nodes) {
      if (!isContainer(node.value)) return UNRELIABLE;
      const container = node.value;
      const keys =
        segment === "*"
          ? entriesOf(container).map(([key]) => key).filter((key): key is string => typeof key === "string")
          : [segment];
      for (const key of keys) {
        const childSegments = [...node.segments, key];
        const instance = instanceKey(childSegments);
        // Asked of the REACHED INSTANCE, and asked BEFORE the value is
        // read: a sibling instance that failed says nothing about this
        // one, and a key that is simply absent has no instance to be
        // reliable OR unreliable — it is UNDECIDED, which is the answer
        // that gets reported rather than dropped.
        if (!run.reliable(instance)) return UNRELIABLE;
        if (!run.completed.has(instance)) return PENDING;
        values.push({
          // A materialized default lives at its instance, not in the
          // authored graph — the walk validated it, so a selector reads
          // the same value the walk did.
          value: containerHas(container, key) ? containerGet(container, key) : run.materialized.get(instance),
          segments: childSegments,
        });
      }
    }
    nodes = values;
  }
  return { status: "ok", nodes };
}

function evaluateSelector(run: Run, from: Frame, selector: Selector): SelectorResult {
  if ("injected" in selector) {
    // D8's ADMITTED widening: the selector root is an INJECTED set. A
    // registry resolves rather than enumerates, so membership is asked of
    // it directly (`isMember`); the set itself is never listed.
    return run.registry(selector.injected) === undefined ? UNRELIABLE : { status: "ok", values: [] };
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
  const read = selectorRead(selector);
  const resolved = resolvePath(run, from, read.path);

  if (read.relation === "validKeysOf") {
    // ADR-019 D10, the broken-operand semantics that ARE the construct: an
    // operand that is wrong-kind, absent, or otherwise unresolvable cannot
    // let ANY reference resolve, so the answer is the EMPTY SET — never
    // "unreliable", which would suppress the very per-site findings this
    // construct exists to guarantee. PENDING is the one exception, and
    // only while the walk is still running: the catalog may simply not
    // have been reached yet, so the lane defers and is decided at the
    // drain, where "not yet" has become "not at all".
    if (resolved.status === "pending" && !run.walkComplete) return PENDING;
    if (resolved.status !== "ok") return { status: "ok", values: [] };
    const belted: string[] = [];
    for (const node of resolved.nodes) {
      if (!RELATION_READS.validKeysOf.test(node.value)) continue;
      for (const [key] of entriesOf(node.value as AnyMap)) {
        if (typeof key !== "string") continue;
        // Key existence alone is not resolution: the ENTRY at that key
        // must itself have evaluated without a finding. "Valid entry" is
        // the map's own declared `entry:` node, by reference — there is no
        // second definition of it anywhere.
        if (run.clean.has(instanceKey([...node.segments, key]))) belted.push(key);
      }
    }
    return { status: "ok", values: belted };
  }

  if (resolved.status !== "ok") return resolved;
  const values: string[] = [];
  for (const node of resolved.nodes) {
    // The SAME predicate the gate demands every legal value satisfy.
    if (!RELATION_READS[read.relation].test(node.value)) return UNRELIABLE;
    if (read.relation === "keysOf") {
      for (const [key] of entriesOf(node.value as AnyMap)) if (typeof key === "string") values.push(key);
    } else if (read.relation === "valuesOf") {
      for (const item of node.value as readonly unknown[]) if (typeof item === "string") values.push(item);
    } else {
      values.push(node.value as string);
    }
  }
  return { status: "ok", values };
}

/** `memberOf` against an INJECTED root asks the registry; against a
 * document root it asks the collected set. */
function isMember(run: Run, selector: Selector, set: SelectorResult, candidate: string): boolean {
  if ("injected" in selector) return run.registry(selector.injected)?.resolve(candidate) != null;
  return set.status === "ok" && set.values.includes(candidate);
}

function checkMembership(
  run: Run,
  frame: Frame,
  rule: MembershipRule,
  candidate: unknown,
  slots: Slots,
): void {
  // Suppression is the CITING INSTANCE's business, and it is now nothing
  // more than that: `reliableTag` answers from the citing instance
  // outward, so the sibling map this used to need — and the ordering bug
  // that made one open-map entry's failure suppress a different, valid
  // entry's finding — are both gone with the coarse key that caused them.
  const suppressed = rule.dependsOn?.some((tag) => !run.reliableTag(frame.segments, tag));
  if (suppressed === true) return;
  const set = evaluateSelector(run, frame, rule.target);
  if (set.status === "pending") {
    // The decision is taken NOW, while the siblings are in scope: by the
    // time the queue drains they are gone.
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
function baseSlots(frame: Frame): Slots {
  return { path: frame.path, value: frame.value, ownerKey: frame.ownerKey, label: frame.label };
}

function evaluateNode(run: Run, decl: NodeDecl, frame: Frame): NodeResult {
  const emitted = run.findings.length;
  const result = dispatch(run, decl, frame);
  const instance = instanceKey(frame.segments, frame.lane);
  if (run.findings.length === emitted) run.clean.add(instance);
  run.completed.add(instance);
  run.mark(instance, result.ok);
  run.markTag(frame, decl.tag, result.ok);
  return result;
}

function dispatch(run: Run, decl: NodeDecl, frame: Frame): NodeResult {
  switch (decl.kind) {
    case "map.fixed":
      return evalMapFixed(run, decl, frame);
    case "map.open":
      return evalMapOpen(run, decl, frame);
    case "map.plain":
      return evalMapPlain(run, decl, frame);
    case "list":
      return evalList(run, decl, frame);
    case "string":
      return evalString(run, decl, frame);
    case "integer":
      return evalInteger(run, decl, frame);
    case "enum":
      return evalEnum(run, decl, frame);
    case "union":
      return evalUnion(run, decl, frame);
    case "raw":
      return evalRaw(run, decl, frame);
    case "valueClass":
      return evalValueClassRef(run, decl, frame);
    case "delegate":
      return evalDelegate(run, decl, frame);
  }
}

function evalValueClassRef(
  run: Run,
  decl: Extract<NodeDecl, { kind: "valueClass" }>,
  frame: Frame,
): NodeResult {
  const target = run.valueClasses[decl.valueClass];
  if (target === undefined) return { ok: true, value: frame.value };
  const merged: Frame = { ...frame, label: decl.label ?? frame.label };
  const result = dispatch(run, target, merged);
  // The REFERENCING site's gating decides, not the shared class's.
  if (!result.ok && decl.gating === true) run.mark(instanceKey(frame.segments), false);
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
  // Every field position resolved ONCE, through the engine's own descent —
  // the same call the gate makes to resolve a reference TO one of them.
  const fields = new Map<string, DeclCursor>();
  for (const name of Object.keys(decl.fields)) {
    const at = descend(run.surface, frame.at, { kind: "field", name });
    if (at !== undefined) fields.set(name, at);
  }
  const fieldNames = [...fields.keys()];
  // A field declared for ONE channel is legal only there — the same
  // channel scoping D1 applies to source-bearing attributes, applied to
  // keyset membership.
  const inChannel = (name: string): boolean => {
    const channel = fields.get(name)?.node.channel;
    return channel === undefined || channel === "both" || channel === run.channel.kind;
  };
  // A channel-scoped field is scoped WHOLE: out of channel it is neither a
  // legal key, nor a missing one, nor evaluated (design review F7).
  const scoped = fieldNames.filter(inChannel);
  const legal = new Set(scoped);
  const normalized: Record<string, unknown> = {};

  const emitUnknownKeys = (): void => {
    for (const [key] of entriesOf(container)) {
      if (typeof key !== "string") {
        run.emit(
          frame.path,
          render(decl.unknownMessage, { ...slots, key, value: key, keys: scoped.join(", ") }),
        );
        continue;
      }
      if (legal.has(key)) continue;
      const at = joinPath(frame.path, key);
      const removed = ownMessage(decl.removedKeys, key);
      const keySlots: Slots = { ...slots, path: at, key, value: key, keys: scoped.join(", ") };
      run.emit(at, render(removed ?? decl.unknownMessage, keySlots));
    }
  };

  const emitMissing = (name: string): void => {
    const fieldAt = fields.get(name);
    const field = fieldAt?.node;
    const presence = field?.presence;
    if (fieldAt === undefined || field === undefined || presence?.required !== true) return;
    if (containerHas(container, name)) return;
    if (presence.foldedIntoTypeLane === true) {
      // Absence is this node's OWN type lane (a binding's `uses`).
      const folded = childFrame(frame, fieldAt, name, undefined, container);
      evaluateNode(run, field, folded);
      run.markTag(folded, field.tag, false);
      return;
    }
    const at = presence.at === "self" ? joinPath(frame.path, name) : frame.path;
    run.emit(
      at,
      render(presence.message ?? decl.missingMessage ?? DEFAULT_MISSING, { ...slots, path: at, key: name }),
      presence.code,
    );
    // The position is UNRELIABLE, not merely unvisited: a rule reading it
    // is suppressed, and the missing-key finding is the trace that
    // explains why. Without this the lane would instead end the walk
    // UNDECIDED and report a second time for a fault already named.
    const missing = childFrame(frame, fieldAt, name, undefined, container);
    run.mark(instanceKey(missing.segments), false);
    run.markTag(missing, field.tag, false);
  };

  const evalOneField = (name: string): void => {
    const at = fields.get(name);
    if (at === undefined) return;
    const field = at.node;
    const present = containerHas(container, name);
    // An ABSENT field is where a declared `default:` materializes — the
    // schema-side half of ADR-019 D3. It takes the SAME path an authored
    // value takes, because materializing a value is not an exemption from
    // validating it: what reaches the admitted form is the validated
    // result (an enum's STORED token, not its authored spelling), and the
    // position COMPLETES, so a rule watching it is decided against the
    // default rather than left undecided by an absence the declaration
    // itself filled.
    if (!present && field.default === undefined) return;
    const child = childFrame(frame, at, name, present ? containerGet(container, name) : field.default, container);
    const result = evaluateNode(run, field, child);
    // A materialized default is not in the authored graph, so a selector
    // reading this position must be able to find what the walk validated.
    if (!present) run.materialized.set(instanceKey(child.segments), result.value ?? field.default);
    if (result.ok && result.value !== undefined) defineOwn(normalized, name, result.value);
  };

  const order = decl.laneOrder ?? "unknownThenPerKey";
  if (order === "missingThenUnknown") {
    for (const name of scoped) emitMissing(name);
    emitUnknownKeys();
    for (const name of scoped) evalOneField(name);
  } else if (order === "unknownThenMissingThenValues") {
    emitUnknownKeys();
    for (const name of scoped) emitMissing(name);
    for (const name of scoped) evalOneField(name);
  } else {
    emitUnknownKeys();
    for (const name of scoped) {
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

function childFrame(parent: Frame, at: DeclCursor, key: string, value: unknown, parentValue: unknown): Frame {
  return {
    at,
    parentAt: parent.at,
    parentSegments: parent.segments,
    path: joinPath(parent.path, key),
    segments: [...parent.segments, key],
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
  if (decl.deepKeyStringness?.channel === run.channel.kind) {
    scanKeyStringness(run, container, frame.path, decl.deepKeyStringness.message, new Set());
  }
  const keyAt = descend(run.surface, frame.at, { kind: "keyClass" });
  const entryAt = descend(run.surface, frame.at, { kind: "entry" });
  const normalized: Record<string, unknown> = {};
  for (const [key, child] of entries) {
    const keyIsString = typeof key === "string";
    const entryPath = keyIsString ? joinPath(frame.path, key) : frame.path;
    if (decl.keyClass !== undefined && keyAt !== undefined) {
      const keyFrame: Frame = {
        at: keyAt,
        parentAt: frame.at,
        parentSegments: frame.segments,
        // Its own lane, and its own PER-KEY address inside it.
        lane: `key:${String(key)}`,
        path: decl.keyLaneAt === "container" ? frame.path : entryPath,
        segments: frame.segments,
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
        at: frame.at,
        parentAt: frame.parentAt,
        parentSegments: frame.parentSegments,
        path: entryPath,
        segments: frame.segments,
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
      //
      // The skip and the MARKING are one branch, deliberately: removing
      // the entry — and every position beneath it — from evaluation while
      // the container still reports `ok` left a subtree unevaluated with
      // NOTHING recording that anything failed. A rule reading this
      // container's tag to decide whether a value under it is reachable
      // therefore saw a clean document (measured pre-growth: the M1
      // trigger-tag probe's `gates dead-config key` row read `[]`), and
      // would accuse a target whose only mention sat inside the dead key.
      // No later edit can reinstate the skip without the marking.
      if (run.findings.length > before) {
        run.markTag(frame, decl.tag, false);
        continue;
      }
    }
    if (entryAt === undefined) continue;
    const entryFrame: Frame = {
      at: entryAt,
      parentAt: frame.at,
      parentSegments: frame.segments,
      path: entryPath,
      segments: keyIsString ? [...frame.segments, key] : frame.segments,
      value: child,
      parentValue: container,
      ownerKey: keyIsString ? key : frame.ownerKey,
    };
    const entryResult = evaluateNode(run, decl.entry, entryFrame);
    if (keyIsString && entryResult.ok && entryResult.value !== undefined) {
      defineOwn(normalized, key, entryResult.value);
    }
  }
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
  ancestors: Set<object>,
): void {
  if (typeof value !== "object" || value === null) return;
  // A PATH-SCOPED ancestor set, not a visited-once set. The finding
  // describes a DOCUMENT ADDRESS, and one anchored map legitimately sits
  // at several — deduping by object identity reported the first address
  // and stayed silent at the rest. Only a back-edge is a cycle, and it is
  // the only thing that must stop the walk.
  if (ancestors.has(value)) return;
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      value.forEach((item, index) => scanKeyStringness(run, item, indexPath(path, index), message, ancestors));
      return;
    }
    if (!isResolvedMap(value)) return;
    for (const [key, child] of value.entries()) {
      if (typeof key !== "string") {
        run.emit(path, render(message, { path, key, value: key }));
        continue;
      }
      scanKeyStringness(run, child, joinPath(path, key), message, ancestors);
    }
  } finally {
    ancestors.delete(value);
  }
}

function evalList(
  run: Run,
  decl: Extract<NodeDecl, { kind: "list" }>,
  frame: Frame,
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
  const memberAt = descend(run.surface, frame.at, { kind: "member" });
  if (memberAt === undefined) return { ok, value: [] };
  const normalized: unknown[] = [];
  const seen = new Set<unknown>();
  const clean: { readonly member: unknown; readonly path: string; readonly segments: readonly (string | number)[] }[] = [];
  value.forEach((member, index) => {
    const memberPath = decl.memberLaneAt === "container" ? frame.path : indexPath(frame.path, index);
    const memberFrame: Frame = {
      at: memberAt,
      // A list member's `^` operand is the LIST, matching `parentValue`.
      parentAt: frame.at,
      parentSegments: frame.segments,
      path: memberPath,
      segments: [...frame.segments, index],
      value: member,
      parentValue: value,
      ownerKey: frame.ownerKey,
    };
    const before = run.findings.length;
    const result = evaluateNode(run, decl.member, memberFrame);
    if (run.findings.length > before) return;
    if (result.value !== undefined) normalized.push(result.value);
    if (decl.memberOf !== undefined) {
      checkMembership(run, memberFrame, decl.memberOf, member, { ...slots, path: memberPath, value: member });
    }
    if (decl.unique?.grain === "perOccurrence") {
      // `unique.at` is the DUPLICATE lane's own grain; it must not inherit
      // the member lane's, which `memberLaneAt` sets for a different lane.
      const at = decl.unique.at === "container" ? frame.path : indexPath(frame.path, index);
      if (seen.has(member)) {
        run.emit(at, render(decl.unique.message, { ...slots, path: at, value: member }));
      }
      seen.add(member);
    }
    clean.push({ member, path: memberPath, segments: memberFrame.segments });
  });
  if (decl.disjointFrom !== undefined) {
    for (const entry of clean) {
      const memberFrame: Frame = {
        at: memberAt,
        parentAt: frame.at,
      parentSegments: frame.segments,
        path: entry.path,
        // The MEMBER's own address, not the list's. Sharing the list's let
        // one broken member's tag status decide every sibling's rule.
        segments: entry.segments,
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
  return { ok, value: normalized };
}

function evalString(
  run: Run,
  decl: Extract<NodeDecl, { kind: "string" }>,
  frame: Frame,
): NodeResult {
  const value = frame.value;
  const slots: Slots = { ...baseSlots(frame), grammar: decl.grammar?.re };
  if (typeof value !== "string") {
    // A node that declares NO type lane leaves the non-string case to its
    // membership lane, which emits ONE finding for both faults (the
    // measured form of `start` and of a transition target).
    const typeLane = decl.typeMessage ?? (decl.memberOf === undefined ? decl.grammar?.message : undefined);
    if (typeLane !== undefined) {
      run.emit(frame.path, render(typeLane, slots), decl.presence?.code);
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
    checkMembership(run, frame, decl.memberOf, value, slots);
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
  if (decl.sourceForm === "plainDecimalInteger" && run.channel.kind === "file") {
    const node: unknown = run.channel.doc.getIn(frame.segments, true);
    const message = sourceLadderFinding(node, run.channel.source, frame.path);
    if (message !== undefined) {
      run.emit(frame.path, message);
      return { ok: false };
    }
    // The ladder proves the SOURCE form; a declared resolved belt is a
    // separate obligation and still applies (its own bound may be
    // stricter than the ladder's built-in one).
  }
  const belt = decl.resolvedForm;
  if (belt?.safeInteger === true) {
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
    const removed = ownMessage(decl.removedValues, value);
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
  // The DIRECT channel's input contract is the domain type — a plain
  // record. A string-keyed JS Map realizes to a record and would slip
  // the plain gate (arm D11-R1 F2), so the raw value is judged there;
  // the FILE channel's resolved maps ARE Maps (the YAML representation
  // of an authored plain map) and keep realizing.
  if (run.channel.kind === "direct" && isResolvedMap(value)) {
    run.emit(frame.path, render(decl.containerMessage, { ...slots, value }));
    return { ok: false };
  }
  const realized = materialize(value, run.memo);
  if (!isPlainMap(realized)) {
    run.emit(frame.path, render(decl.containerMessage, { ...slots, value: realized }));
    return { ok: false };
  }
  if (!isCanonicalizable(realized)) {
    run.emit(frame.path, render(decl.canonicalJsonSafe.message, slots));
    return { ok: false };
  }
  // D11: the TYPED SUBSET — a declared field is validated WHEN PRESENT;
  // an absent one is legal and produces nothing (absence normalization is
  // the admitted form's business, never this lane's); every undeclared
  // key is legal open data. Validation transforms nothing — the plain
  // map's value is authored data, returned unchanged below.
  for (const name of Object.keys(decl.fields ?? {})) {
    const at = descend(run.surface, frame.at, { kind: "field", name });
    if (at === undefined) continue;
    if (!Object.prototype.hasOwnProperty.call(realized, name)) continue;
    evaluateNode(run, at.node, childFrame(frame, at, name, ownGet(realized, name), realized));
  }
  return { ok: true, value: realized };
}

function evalDelegate(
  run: Run,
  decl: Extract<NodeDecl, { kind: "delegate" }>,
  frame: Frame,
): NodeResult {
  if (decl.dependsOn?.some((tag) => !run.reliableTag(frame.segments, tag)) === true) return { ok: true };
  const owner = frame.parentValue;
  const by = isContainer(owner) ? containerGet(owner, decl.by) : undefined;
  if (typeof by !== "string") return { ok: true };
  const registration = run.registry(decl.registry)?.resolve(by) ?? null;
  if (registration === null) {
    // Nothing to validate the config AGAINST. The obligation stands and
    // travels; it is discharged only if a sibling lane fails and becomes
    // the trace.
    run.obligations.push({ frame, by, dependsOn: decl.dependsOn ?? [] });
    return { ok: false };
  }
  if (registration.requiresRuntimeContext) run.runtimeContextBindings.push(parentPath(frame.path));
  const raw = frame.value === undefined ? undefined : materialize(frame.value, run.memo);
  const result = registration.validateAndNormalizeConfig(raw);
  if (result.ok) {
    run.effectiveConfigs.set(instanceKey(frame.parentSegments ?? []), result.effective);
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
  // A cross rule is DOCUMENT-scoped: it reads the whole document, so the
  // status it means is "did this tag fail anywhere", not "at my instance"
  // — a cross rule has no instance.
  if (rule.dependsOn?.some((tag) => run.tagFailedAnywhere.has(tag)) === true) return;
  const left = evaluateSelector(run, frame, rule.left);
  const right = evaluateSelector(run, frame, rule.right);
  // A cross rule is never queued, so `pending` HERE — after the deferred
  // queue has drained and every position has been visited — means the same
  // thing it means there: an operand nothing ever evaluated.
  if (left.status === "pending" || right.status === "pending") {
    if (rule.whenOperandAbsent !== "skip") {
      const undecided = left.status === "pending" ? rule.left : rule.right;
      reportUndecided(
        run,
        run.surface.substrate.internalFailure.path,
        `the cross rule ${JSON.stringify(rule.tag)} could not be decided — its operand ` +
          `${describeSelector(undecided)} names a position the walk never evaluated`,
      );
    }
    return;
  }
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

/** How a selector reads, in words a finding can carry. */
function describeSelector(selector: Selector): string {
  if ("injected" in selector) return `the injected set ${JSON.stringify(selector.injected)}`;
  if ("union" in selector) return selector.union.map(describeSelector).join(" + ");
  const read = selectorRead(selector);
  return `${read.relation}(${JSON.stringify(read.path)})`;
}

/**
 * A lane still UNDECIDED when the walk ends. Its target position was never
 * evaluated — a field the path runs through is absent — so unlike a
 * SUPPRESSED lane there is no sibling finding anywhere that explains it.
 * It used to be dropped here, which is the exact failure this substrate
 * exists to refuse: a declared rule that quietly does not run.
 *
 * Reported through the substrate's own internal-failure branch, because
 * that is what it is — the validator could not decide something it was
 * told to decide. A declaration that considers the absence legitimate says
 * so with `whenOperandAbsent: "skip"`, in data a reviewer can see.
 */
function reportUndecided(run: Run, path: string, what: string): void {
  const branch = run.surface.substrate.internalFailure;
  run.emit(path, render(branch.message, { path, value: what }));
}

function runDeferred(run: Run): void {
  // A membership lane deferred for a PENDING operand runs once, in the
  // order the walk queued it. The queue is drained, never re-fed: every
  // operand has completed by now, so a second pass could only loop.
  const queued = run.deferred.splice(0, run.deferred.length);
  for (const check of queued) {
    // `dependsOn` re-reads cleanly now: the answer is keyed by the citing
    // INSTANCE, so replaying a queued check later in the walk cannot pick
    // up a different instance's verdict.
    checkMembership(run, check.frame, check.rule, check.candidate, check.slots);
  }
  // What is still OWED, per instance. A sibling that failed is the trace
  // and discharges it; otherwise the config vanished unvalidated and
  // nothing else says so.
  for (const owed of run.obligations.splice(0, run.obligations.length)) {
    if (owed.dependsOn.some((tag) => !run.reliableTag(owed.frame.segments, tag))) continue;
    reportUndecided(
      run,
      owed.frame.path,
      `the delegated config could not be validated — the registry has no registration named ` +
        `${JSON.stringify(owed.by)}, so nothing checked it and it does not reach the admitted value`,
    );
  }
  for (const check of run.deferred.splice(0, run.deferred.length)) {
    if (check.rule.whenOperandAbsent === "skip") continue;
    reportUndecided(
      run,
      check.frame.path,
      `the ${check.rule.relation} lane could not be decided — its operand ` +
        `${describeSelector(check.rule.target)} names a position the walk never evaluated`,
    );
  }
}

// ---------------------------------------------------------------------------
// Entry points.
// ---------------------------------------------------------------------------

/**
 * Evaluate a declared `default:` against the field it defaults, with NO
 * document around it — the load-time half of "no value reaches the
 * admitted form unvalidated". A default that its own field would refuse is
 * a fault in the DECLARATION, and its author should hear about it once, at
 * load, rather than through every template that omits the key.
 *
 * The deferred queue is deliberately left undrained: a lane reading the
 * DOCUMENT cannot be decided without one, and a default that is legal in
 * one template and not another is a template's finding, not a
 * declaration's. What survives here is context-free — a wrong type, a
 * grammar, a value outside an enum.
 */
export function defaultFindings(
  surface: SurfaceDecl,
  field: NodeDecl,
  value: unknown,
): readonly ValidationFinding[] {
  const run = new Run(surface, { kind: "direct" }, {});
  run.root = undefined;
  evaluateNode(run, field, {
    at: { node: field, decl: "$" },
    path: "$",
    segments: [],
    value,
    parentValue: undefined,
  });
  return run.findings;
}

/**
 * Run a surface declaration over a value graph. ONE computation serves
 * both channels (D1): the caller supplies `channel`, and the source-bearing
 * attributes are inert where no source exists.
 */
export function runSurface(surface: SurfaceDecl, value: unknown, opts: EngineOptions): EngineRun {
  const run = new Run(surface, opts.channel, { gateCatalog: opts.catalog });
  run.root = value;
  const rootFrame: Frame = { at: run.rootAt, path: "$", segments: [], value, parentValue: undefined };
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
      failedTags: [...run.tagFailedAnywhere],
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
  run.walkComplete = true;
  runDeferred(run);
  for (const rule of surface.crossRules) {
    if (rule.relation === "equals") evaluateEquals(run, rootFrame, rule);
  }
  return {
    findings: run.findings,
    normalized: result.value,
    effectiveConfigs: run.effectiveConfigs,
    runtimeContextBindings: run.runtimeContextBindings,
    failedTags: [...run.tagFailedAnywhere],
  };
}
