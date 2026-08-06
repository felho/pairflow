import type {
  EqualsRuleDecl,
  MessageTemplate,
  NodeDecl,
  NormalizerHookDecl,
  Selector,
  SubstrateBranch,
  SurfaceDecl,
} from "./vocabulary.js";

/**
 * THE DECLARATION GATE — closure, then immutability.
 *
 * A surface declaration is a LANGUAGE, and until this gate existed its
 * shapes were checked by the type system while its NAMES AND PATHS were
 * resolved at run time with nothing checking them. Every silent-failure
 * finding of the 2026-08-06 design review was one unresolved reference:
 * a value-class name that did not exist (the engine returned the value
 * unvalidated), a selector path written in the documented-but-inert form
 * (the rule never fired), a `channel` mark at a site nothing reads.
 *
 * So: a declaration that is not CLOSED does not become a surface. Every
 * reference is resolved here, once, at load; an unresolved one throws
 * before any document is ever validated. Fail-closed, loudly, at startup —
 * never a no-op at validation time, which is the failure mode that hides.
 *
 * The second half is `deepFreeze`: ADR-019 D4 calls the declaration "a
 * frozen declaration object", and `Object.freeze` alone froze only the
 * outermost object — the review mutated a live finding message through it.
 * The whole tree is frozen here, so the claim and the bytes agree.
 */

/** A declaration that is not closed. Carries every problem, not the first
 * — a maintainer fixing one reference should see the rest in the same
 * breath rather than one per run. */
export class SurfaceDeclarationError extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(
      `the surface declaration is not closed (${String(problems.length)} unresolved reference(s)):\n` +
        problems.map((problem) => `  - ${problem}`).join("\n"),
    );
    this.name = "SurfaceDeclarationError";
    this.problems = problems;
  }
}

/** The placeholder slots a message or a finding-path template may use —
 * the engine's closed set (`renderMessage`). */
const SLOTS = new Set([
  "path",
  "key",
  "keyJson",
  "value",
  "valueRaw",
  "valueJson",
  "source",
  "grammar",
  "members",
  "keys",
  "label",
  "ownerKey",
]);

const SELECTOR_HEADS = new Set(["$", "^"]);

function slotProblems(template: MessageTemplate, where: string): string[] {
  const problems: string[] = [];
  for (const match of template.matchAll(/\{(\w+)\}/gu)) {
    const slot = match[1] ?? "";
    if (!SLOTS.has(slot)) {
      problems.push(`${where}: unknown placeholder {${slot}} (the slot set is closed)`);
    }
  }
  return problems;
}

/** A SELECTOR path: head `$` or `^`, dot-separated nonempty segments, `*`
 * legal only as a whole segment. This is the check that kills the
 * documented-but-inert `..` form — it now throws instead of resolving to
 * nothing. */
function selectorPathProblems(path: string, where: string): string[] {
  const segments = path.split(".");
  const head = segments[0] ?? "";
  if (!SELECTOR_HEADS.has(head)) {
    return [
      `${where}: selector path ${JSON.stringify(path)} must start with "$" (the document root) ` +
        `or "^" (the citing node's container); got ${JSON.stringify(head)}`,
    ];
  }
  const problems: string[] = [];
  for (const segment of segments.slice(1)) {
    if (segment === "") {
      problems.push(`${where}: selector path ${JSON.stringify(path)} has an empty segment`);
    } else if (segment.includes("*") && segment !== "*") {
      problems.push(
        `${where}: selector path ${JSON.stringify(path)} uses "*" inside a segment; ` +
          `"*" is legal only as a whole segment`,
      );
    }
  }
  return problems;
}

/** A NORMALIZER operand path: `$`-rooted, dot-separated, with `*` legal as
 * a whole segment (the `.*.` wildcard the hook resolver splits on). */
function normalizerPathProblems(path: string, where: string): string[] {
  const segments = path.split(".");
  if (segments[0] !== "$") {
    return [`${where}: normalizer path ${JSON.stringify(path)} must start with "$"`];
  }
  const problems: string[] = [];
  for (const segment of segments.slice(1)) {
    if (segment === "") {
      problems.push(`${where}: normalizer path ${JSON.stringify(path)} has an empty segment`);
    } else if (segment.includes("*") && segment !== "*") {
      problems.push(
        `${where}: normalizer path ${JSON.stringify(path)} uses "*" inside a segment; ` +
          `"*" is legal only as a whole segment`,
      );
    }
  }
  return problems;
}

/** A FINDING-PATH template is RENDERED, never walked: it may carry closed
 * placeholder slots and must not carry selector syntax. */
function findingPathProblems(path: string, where: string): string[] {
  const problems = slotProblems(path, where);
  const literal = path.replace(/\{\w+\}/gu, "");
  if (literal.startsWith("$") || literal.startsWith("^") || literal.includes("*")) {
    problems.push(
      `${where}: finding path ${JSON.stringify(path)} uses selector syntax; ` +
        `a finding path is rendered, not walked`,
    );
  }
  return problems;
}

/** A reference whose target can only be resolved once the whole tree has
 * been walked. Collected in pass one, resolved in pass two. */
interface PendingRef {
  readonly path: string;
  readonly relation: "keysOf" | "valuesOf" | "collect";
  /** The declaration path of the node that CITED it — the operand of `^`. */
  readonly from: string;
  readonly where: string;
}

interface Context {
  readonly valueClasses: Readonly<Record<string, NodeDecl>>;
  readonly codes: ReadonlySet<string>;
  readonly tags: string[];
  /** Tags the ENGINE records reliability for — only these can satisfy a
   * `dependsOn` (F4: a substrate or cross-rule tag never gets a status, so
   * depending on one suppresses nothing, forever). */
  readonly nodeTags: Set<string>;
  /** Declaration path → the node at it, for operands addressed in the
   * ENGINE's internal walk language (the normalizer resolves this way). */
  readonly positions: Map<string, NodeDecl>;
  /** The subset a SELECTOR can actually reach. A list member lives at the
   * engine-internal `…[]`, a key class at `…<key>`, and a declared field
   * name containing a dot is walked as two segments — a selector naming
   * any of them addresses something else or nothing, so none of them is a
   * legal selector target. Keeping the two maps apart is what stops the
   * gate calling such a path "resolved" while the rule stays inert. */
  readonly selectorPositions: Map<string, NodeDecl>;
  readonly pending: PendingRef[];
  /** Hook tags whose operand paths are syntactically clean. A path that
   * failed its grammar is NOT resolved a second time — one broken
   * reference must yield one problem, or a maintainer cannot tell how many
   * things are actually wrong. */
  readonly resolvableHooks: Set<string>;
  readonly problems: string[];
}

/** Syntax now; the TARGET's existence and kind are resolved in pass two. */
function selectorProblems(selector: Selector, where: string, from: string, ctx: Context): string[] {
  if ("injected" in selector) return [];
  if ("union" in selector) return selector.union.flatMap((part) => selectorProblems(part, where, from, ctx));
  const relation = "keysOf" in selector ? "keysOf" : "valuesOf" in selector ? "valuesOf" : "collect";
  const path = "keysOf" in selector ? selector.keysOf : "valuesOf" in selector ? selector.valuesOf : selector.collect;
  const syntax = selectorPathProblems(path, where);
  if (syntax.length === 0) ctx.pending.push({ path, relation, from, where });
  return syntax;
}

function checkMembership(
  rule: { readonly target: Selector; readonly message: MessageTemplate; readonly code?: string },
  where: string,
  from: string,
  ctx: Context,
): void {
  ctx.problems.push(...selectorProblems(rule.target, where, from, ctx));
  ctx.problems.push(...slotProblems(rule.message, where));
  if (rule.code !== undefined && !ctx.codes.has(rule.code)) {
    ctx.problems.push(`${where}: issue code ${JSON.stringify(rule.code)} is outside the declared namespace`);
  }
}

/**
 * Walk one node. `channelHonoured` says whether a `channel` mark at THIS
 * position is read by the engine — true only for a field of a `map.fixed`.
 */
function checkNode(
  decl: NodeDecl,
  where: string,
  channelHonoured: boolean,
  ctx: Context,
  siblings: readonly string[] = [],
  selectorAddressable = true,
): void {
  ctx.tags.push(decl.tag);
  ctx.nodeTags.add(decl.tag);
  // FIRST writer wins: a union and its `mapCase` share one address in the
  // engine's walk, and the UNION is what a selector meets there. Letting
  // the case overwrite it hid one of the union's shapes from the check.
  if (!ctx.positions.has(where)) ctx.positions.set(where, decl);
  if (selectorAddressable && !ctx.selectorPositions.has(where)) {
    ctx.selectorPositions.set(where, decl);
  }
  if (decl.rows.length === 0) ctx.problems.push(`${where}: node "${decl.tag}" cites no ratified row`);
  if (decl.channel !== undefined && !channelHonoured) {
    ctx.problems.push(
      `${where}: node "${decl.tag}" carries channel ${JSON.stringify(decl.channel)}, ` +
        `which is read only on a field of a map.fixed`,
    );
  }
  if (decl.presence?.code !== undefined && !ctx.codes.has(decl.presence.code)) {
    ctx.problems.push(
      `${where}: issue code ${JSON.stringify(decl.presence.code)} is outside the declared namespace`,
    );
  }
  if (decl.presence?.message !== undefined) ctx.problems.push(...slotProblems(decl.presence.message, where));

  switch (decl.kind) {
    case "map.fixed": {
      ctx.problems.push(...slotProblems(decl.containerMessage, where), ...slotProblems(decl.unknownMessage, where));
      if (decl.missingMessage !== undefined) ctx.problems.push(...slotProblems(decl.missingMessage, where));
      const fieldNames = Object.keys(decl.fields);
      for (const [name, field] of Object.entries(decl.fields)) {
        // A field name containing a dot is ONE declared key that the
        // selector language reads as two segments; its subtree is not
        // selector-addressable under that text.
        checkNode(field, `${where}.${name}`, true, ctx, fieldNames, selectorAddressable && !name.includes("."));
      }
      for (const [key, message] of Object.entries(decl.removedKeys ?? {})) {
        ctx.problems.push(...slotProblems(message, `${where}.removedKeys.${key}`));
      }
      return;
    }
    case "map.open": {
      ctx.problems.push(...slotProblems(decl.containerMessage, where));
      if (decl.nonempty !== undefined) ctx.problems.push(...slotProblems(decl.nonempty.message, where));
      if (decl.deepKeyStringness !== undefined) {
        ctx.problems.push(...slotProblems(decl.deepKeyStringness.message, where));
      }
      if (decl.keysSubsetOf !== undefined) checkMembership(decl.keysSubsetOf, `${where}.keysSubsetOf`, where, ctx);
      if (decl.keyClass !== undefined) checkNode(decl.keyClass, `${where}<key>`, false, ctx, [], false);
      checkNode(decl.entry, `${where}.*`, false, ctx, [], selectorAddressable);
      return;
    }
    case "list": {
      ctx.problems.push(...slotProblems(decl.containerMessage, where));
      if (decl.nonempty !== undefined) ctx.problems.push(...slotProblems(decl.nonempty.message, where));
      if (decl.unique !== undefined) ctx.problems.push(...slotProblems(decl.unique.message, where));
      if (decl.memberOf !== undefined) checkMembership(decl.memberOf, `${where}.memberOf`, where, ctx);
      if (decl.disjointFrom !== undefined) checkMembership(decl.disjointFrom, `${where}.disjointFrom`, where, ctx);
      checkNode(decl.member, `${where}[]`, false, ctx, [], false);
      return;
    }
    case "string": {
      if (decl.typeMessage !== undefined) ctx.problems.push(...slotProblems(decl.typeMessage, where));
      if (decl.nonempty !== undefined) ctx.problems.push(...slotProblems(decl.nonempty.message, where));
      if (decl.grammar !== undefined) {
        ctx.problems.push(...slotProblems(decl.grammar.message, where));
        try {
          new RegExp(decl.grammar.re, "u");
        } catch {
          ctx.problems.push(`${where}: grammar ${JSON.stringify(decl.grammar.re)} is not a valid regular expression`);
        }
      }
      if (decl.memberOf !== undefined) checkMembership(decl.memberOf, `${where}.memberOf`, where, ctx);
      return;
    }
    case "integer":
      if (decl.resolvedForm !== undefined) ctx.problems.push(...slotProblems(decl.resolvedForm.message, where));
      return;
    case "enum": {
      ctx.problems.push(...slotProblems(decl.message, where));
      if (decl.code !== undefined && !ctx.codes.has(decl.code)) {
        ctx.problems.push(`${where}: issue code ${JSON.stringify(decl.code)} is outside the declared namespace`);
      }
      return;
    }
    case "union": {
      ctx.problems.push(...slotProblems(decl.message, where));
      for (const [value, message] of Object.entries(decl.removedValues ?? {})) {
        ctx.problems.push(...slotProblems(message, `${where}.removedValues.${value}`));
      }
      if (decl.mapCase !== undefined) checkNode(decl.mapCase, where, false, ctx, [], selectorAddressable);
      return;
    }
    case "raw":
      if (decl.containerMessage !== undefined) ctx.problems.push(...slotProblems(decl.containerMessage, where));
      return;
    case "map.plain":
      ctx.problems.push(
        ...slotProblems(decl.containerMessage, where),
        ...slotProblems(decl.canonicalJsonSafe.message, where),
      );
      return;
    case "valueClass": {
      // The measured shame case: an unknown name made the engine return the
      // value unvalidated, so a mistyped class silently switched a rule off.
      if (!(decl.valueClass in ctx.valueClasses)) {
        ctx.problems.push(
          `${where}: value class ${JSON.stringify(decl.valueClass)} is not declared ` +
            `(declared: ${Object.keys(ctx.valueClasses).join(", ")})`,
        );
      }
      return;
    }
    case "delegate": {
      ctx.problems.push(...slotProblems(decl.beltMessage, where));
      // The hand-off reads a SIBLING field to name the registration. A
      // typo there makes the engine read `undefined`, skip the registry
      // and treat the delegation as satisfied.
      if (!siblings.includes(decl.by)) {
        ctx.problems.push(
          `${where}: delegate reads sibling field ${JSON.stringify(decl.by)}, ` +
            `which the enclosing map does not declare (siblings: ${siblings.join(", ")})`,
        );
      }
      return;
    }
  }
}

function checkCrossRule(rule: EqualsRuleDecl, ctx: Context): void {
  const where = `crossRule "${rule.tag}"`;
  ctx.tags.push(rule.tag);
  if (rule.rows.length === 0) ctx.problems.push(`${where}: cites no ratified row`);
  // A cross rule cites from the ROOT: it has no citing node, so `^` has no
  // operand and every path it writes must be document-rooted.
  ctx.problems.push(...selectorProblems(rule.left, `${where}.left`, "$", ctx));
  ctx.problems.push(...selectorProblems(rule.right, `${where}.right`, "$", ctx));
  ctx.problems.push(...findingPathProblems(rule.missingFromLeft.at, `${where}.missingFromLeft.at`));
  ctx.problems.push(...findingPathProblems(rule.missingFromRight.at, `${where}.missingFromRight.at`));
  ctx.problems.push(...slotProblems(rule.missingFromLeft.message, `${where}.missingFromLeft`));
  ctx.problems.push(...slotProblems(rule.missingFromRight.message, `${where}.missingFromRight`));
}

function checkHook(hook: NormalizerHookDecl, ctx: Context): void {
  const where = `normalizer "${hook.tag}"`;
  ctx.tags.push(hook.tag);
  if (hook.rows.length === 0) ctx.problems.push(`${where}: cites no ratified row`);
  const pathProblems = [...normalizerPathProblems(hook.over, `${where}.over`)];
  if (hook.hook === "expandAdvancesRound") {
    pathProblems.push(...normalizerPathProblems(hook.advanceSet, `${where}.advanceSet`));
  }
  ctx.problems.push(...pathProblems);
  if (pathProblems.length === 0) ctx.resolvableHooks.add(hook.tag);
}

/** The node a declaration path addresses, following a value-class
 * reference to the class it names — the node a selector actually meets. */
function nodeAt(path: string, ctx: Context): NodeDecl | undefined {
  const node = ctx.selectorPositions.get(path);
  if (node?.kind !== "valueClass") return node;
  return ctx.valueClasses[node.valueClass];
}

/**
 * The RUNTIME shapes a declared node can legally hold. A selector reads
 * the RAW value, so what decides whether a relation can read a target is
 * not the node's kind name but the shapes a valid value can take — and a
 * node that can hold more than one shape is readable only for SOME
 * inputs, which is the input-dependent silence the gate exists to refuse.
 */
type RuntimeShape = "map" | "list" | "string" | "other";

function shapesOf(node: NodeDecl, ctx: Context, seen = new Set<string>()): ReadonlySet<RuntimeShape> {
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
      return new Set<RuntimeShape>(
        node.members.map((member) => (typeof member.value === "string" ? "string" : "other")),
      );
    case "union": {
      const shapes = new Set<RuntimeShape>((node.literals ?? []).map(() => "string" as const));
      if (node.mapCase !== undefined) for (const shape of shapesOf(node.mapCase, ctx, seen)) shapes.add(shape);
      return shapes;
    }
    case "valueClass": {
      if (seen.has(node.valueClass)) return new Set<RuntimeShape>(["other"]);
      seen.add(node.valueClass);
      const target = ctx.valueClasses[node.valueClass];
      return target === undefined ? new Set<RuntimeShape>(["other"]) : shapesOf(target, ctx, seen);
    }
    case "raw":
      // Uninterpreted: the declaration guarantees nothing about the value.
      return new Set<RuntimeShape>(["map", "list", "string", "other"]);
  }
}

/** Pass two for selectors: does the target POSITION exist, and is its kind
 * one the relation can read? A syntactically perfect path to a node that
 * does not exist made the rule vanish without a word. */
function resolveSelectors(ctx: Context): void {
  for (const ref of ctx.pending) {
    const segments = ref.path.split(".");
    const head = segments.shift();
    const base = head === "$" ? "$" : ref.from.split(".").slice(0, -1).join(".");
    const target = segments.length === 0 ? base : `${base}.${segments.join(".")}`;
    const node = nodeAt(target, ctx);
    if (node === undefined) {
      ctx.problems.push(
        `${ref.where}: selector path ${JSON.stringify(ref.path)} addresses ${JSON.stringify(target)}, ` +
          `which the declaration does not declare`,
      );
      continue;
    }
    const needed: RuntimeShape = ref.relation === "keysOf" ? "map" : ref.relation === "valuesOf" ? "list" : "string";
    const shapes = shapesOf(node, ctx);
    // EVERY legal value must be readable. One that is readable for some
    // inputs and silently skipped for others is what "closed" must not
    // mean.
    const unreadable = [...shapes].filter((shape) => shape !== needed);
    if (unreadable.length > 0) {
      ctx.problems.push(
        `${ref.where}: ${ref.relation}(${JSON.stringify(ref.path)}) addresses a ${node.kind} whose value can be ` +
          `${[...shapes].sort().join(" | ")}; ${ref.relation} reads only ${needed}, so the rule would be ` +
          `skipped for ${unreadable.sort().join(" | ")} values`,
      );
    }
  }
}

/** Pass two for the normalizer: its operand paths address declared
 * positions, and its dynamic FIELD names are fields of the node it lands
 * on. An unresolved `edges` produced an empty flag map in silence. */
function resolveHooks(surface: SurfaceDecl, ctx: Context): void {
  for (const hook of surface.normalizers) {
    if (!ctx.resolvableHooks.has(hook.tag)) continue;
    const where = `normalizer "${hook.tag}"`;
    const over = ctx.positions.get(hook.over);
    if (over === undefined) {
      ctx.problems.push(`${where}.over: ${JSON.stringify(hook.over)} is not a declared position`);
      continue;
    }
    if (over.kind !== "map.open") {
      ctx.problems.push(`${where}.over: ${JSON.stringify(hook.over)} is a ${over.kind}; the hook walks a map.open`);
      continue;
    }
    const fieldsOf = (path: string): { readonly node: NodeDecl | undefined; readonly names: readonly string[] } => {
      const node = ctx.positions.get(path);
      return { node, names: node?.kind === "map.fixed" ? Object.keys(node.fields) : [] };
    };
    if (hook.hook === "expandAdvancesRound") {
      if (ctx.positions.get(hook.advanceSet) === undefined) {
        ctx.problems.push(
          `${where}.advanceSet: ${JSON.stringify(hook.advanceSet)} is not a declared position`,
        );
      }
      const entry = fieldsOf(`${hook.over}.*`);
      for (const [label, name] of [["edges", hook.edges], ["into", hook.into]] as const) {
        if (!entry.names.includes(name)) {
          ctx.problems.push(
            `${where}.${label}: ${JSON.stringify(name)} is not a field of ${JSON.stringify(`${hook.over}.*`)} ` +
              `(fields: ${entry.names.join(", ")})`,
          );
        }
      }
      continue;
    }
    const member = fieldsOf(`${hook.over}.*[]`);
    for (const name of [...hook.carry, hook.into]) {
      if (!member.names.includes(name)) {
        ctx.problems.push(
          `${where}: ${JSON.stringify(name)} is not a field of ${JSON.stringify(`${hook.over}.*[]`)} ` +
            `(fields: ${member.names.join(", ")})`,
        );
      }
    }
  }
}

function checkBranch(
  branch: SubstrateBranch,
  where: string,
  ctx: Context,
  messages: readonly MessageTemplate[] = [],
): void {
  ctx.tags.push(branch.tag);
  if (branch.rows.length === 0) ctx.problems.push(`${where}: cites no ratified row`);
  for (const message of messages) ctx.problems.push(...slotProblems(message, where));
}

/** Every `dependsOn` tag any rule names, with the site that named it. */
function collectDependsOn(decl: NodeDecl, where: string, into: { tag: string; where: string }[]): void {
  const add = (tags: readonly string[] | undefined, site: string): void => {
    for (const tag of tags ?? []) into.push({ tag, where: site });
  };
  switch (decl.kind) {
    case "map.fixed":
      for (const [name, field] of Object.entries(decl.fields)) collectDependsOn(field, `${where}.${name}`, into);
      return;
    case "map.open":
      add(decl.keysSubsetOf?.dependsOn, `${where}.keysSubsetOf`);
      if (decl.keyClass !== undefined) collectDependsOn(decl.keyClass, `${where}<key>`, into);
      collectDependsOn(decl.entry, `${where}.*`, into);
      return;
    case "list":
      add(decl.memberOf?.dependsOn, `${where}.memberOf`);
      add(decl.disjointFrom?.dependsOn, `${where}.disjointFrom`);
      collectDependsOn(decl.member, `${where}[]`, into);
      return;
    case "string":
      add(decl.memberOf?.dependsOn, `${where}.memberOf`);
      return;
    case "union":
      if (decl.mapCase !== undefined) collectDependsOn(decl.mapCase, where, into);
      return;
    case "delegate":
      add(decl.dependsOn, where);
      return;
    default:
      return;
  }
}

/**
 * Every unresolved reference in a declaration, as a list of problems.
 * Exported so the guard's own fixtures can assert WHICH reference failed
 * rather than only that something did.
 */
export function closureProblems(surface: SurfaceDecl): readonly string[] {
  const ctx: Context = {
    valueClasses: surface.valueClasses,
    codes: new Set(surface.substrate.codes.values),
    tags: [],
    nodeTags: new Set(),
    positions: new Map(),
    selectorPositions: new Map(),
    pending: [],
    resolvableHooks: new Set(),
    problems: [],
  };

  const substrate = surface.substrate;
  checkBranch(substrate.read, "substrate.read", ctx, [substrate.read.message]);
  checkBranch(substrate.parse.directive, "substrate.parse.directive", ctx, [substrate.parse.directive.message]);
  checkBranch(substrate.parse.duplicateKeys, "substrate.parse.duplicateKeys", ctx, [
    substrate.parse.duplicateKeys.message,
  ]);
  checkBranch(substrate.resolve.graph, "substrate.resolve.graph", ctx, [substrate.resolve.graph.message]);
  checkBranch(substrate.codes, "substrate.codes", ctx);
  checkBranch(substrate.internalFailure, "substrate.internalFailure", ctx, [substrate.internalFailure.message]);

  checkNode(surface.root, "$", false, ctx);
  for (const [name, decl] of Object.entries(surface.valueClasses)) {
    checkNode(decl, `valueClass "${name}"`, false, ctx);
    // A value-class definition's tag is never STATUSED by the engine (the
    // reference's tag is), so it must not count as a dependsOn target.
    ctx.nodeTags.delete(decl.tag);
  }
  for (const rule of surface.crossRules) checkCrossRule(rule, ctx);
  for (const hook of surface.normalizers) checkHook(hook, ctx);

  // Tags must be unique, or a contract pointer is ambiguous.
  const seen = new Set<string>();
  for (const tag of ctx.tags) {
    if (seen.has(tag)) ctx.problems.push(`declaration tag ${JSON.stringify(tag)} is declared more than once`);
    seen.add(tag);
  }

  // `dependsOn` names a tag the ENGINE gives a reliability status to.
  // Any other declared tag resolves by name and suppresses nothing.
  const dependencies: { tag: string; where: string }[] = [];
  collectDependsOn(surface.root, "$", dependencies);
  for (const [name, decl] of Object.entries(surface.valueClasses)) {
    collectDependsOn(decl, `valueClass "${name}"`, dependencies);
  }
  for (const rule of surface.crossRules) {
    for (const tag of rule.dependsOn ?? []) dependencies.push({ tag, where: `crossRule "${rule.tag}"` });
  }
  for (const dependency of dependencies) {
    if (ctx.nodeTags.has(dependency.tag)) continue;
    ctx.problems.push(
      seen.has(dependency.tag)
        ? `${dependency.where}: dependsOn names ${JSON.stringify(dependency.tag)}, which is declared but is ` +
          `not a node the engine records a status for — depending on it suppresses nothing`
        : `${dependency.where}: dependsOn names ${JSON.stringify(dependency.tag)}, which is not a declared tag`,
    );
  }

  resolveSelectors(ctx);
  resolveHooks(surface, ctx);
  return ctx.problems;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const key of Object.getOwnPropertyNames(value)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}

/**
 * Make a surface declaration usable: CLOSE it, then FREEZE it. A
 * declaration carrying an unresolved reference never becomes a surface —
 * the throw happens at module load, before any document is validated.
 */
export function defineSurface(surface: SurfaceDecl): SurfaceDecl {
  const problems = closureProblems(surface);
  if (problems.length > 0) throw new SurfaceDeclarationError(problems);
  return deepFreeze(surface);
}
