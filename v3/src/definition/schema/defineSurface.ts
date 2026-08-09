import {
  type DeclCursor,
  RELATION_READS,
  defaultFindings,
  derefNode,
  descend,
  resolveSelectorPath,
  selectorRead,
  shapesOf,
} from "./engine.js";
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
 * WHERE THE RESOLVING HAPPENS is the second lesson, learnt three rounds
 * running. This gate used to keep its OWN model of which positions exist
 * and what a selector reaches — a replica of the engine's walk — and every
 * round found another place the replica had drifted from the original. It
 * keeps none now. `descend` and `resolveSelectorPath` are the ENGINE's, the
 * same calls its runtime selector walk makes, so what this gate certifies
 * as reachable is reachable by construction. What is left here is the
 * POLICY: an answer must exist, it must be readable for EVERY legal value,
 * and it must exist on BOTH channels.
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
  return segmentProblems(segments.slice(1), path, "selector", where);
}

/** A NORMALIZER operand path: `$`-rooted, dot-separated, with `*` legal as
 * a whole segment (the `.*.` wildcard the hook resolver splits on). */
function normalizerPathProblems(path: string, where: string): string[] {
  const segments = path.split(".");
  if (segments[0] !== "$") {
    return [`${where}: normalizer path ${JSON.stringify(path)} must start with "$"`];
  }
  return segmentProblems(segments.slice(1), path, "normalizer", where);
}

/** Both path languages spell a segment the same way, because the engine
 * reads both with the same descent. */
function segmentProblems(segments: readonly string[], path: string, language: string, where: string): string[] {
  const problems: string[] = [];
  for (const segment of segments) {
    if (segment === "") {
      problems.push(`${where}: ${language} path ${JSON.stringify(path)} has an empty segment`);
    } else if (segment.includes("*") && segment !== "*") {
      problems.push(
        `${where}: ${language} path ${JSON.stringify(path)} uses "*" inside a segment; ` +
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

interface Context {
  readonly surface: SurfaceDecl;
  /** The document root as a declaration position — the base of every
   * `$`-rooted path, and the engine's own. */
  readonly root: DeclCursor;
  readonly codes: ReadonlySet<string>;
  readonly tags: string[];
  /** Tags the ENGINE records reliability for — only these can satisfy a
   * `dependsOn` (F4: a substrate or cross-rule tag never gets a status, so
   * depending on one suppresses nothing, forever). */
  readonly nodeTags: Set<string>;
  /** Hook tags whose operand paths are syntactically clean. A path that
   * failed its grammar is NOT resolved a second time — one broken
   * reference must yield one problem, or a maintainer cannot tell how many
   * things are actually wrong. */
  readonly resolvableHooks: Set<string>;
  /** D10's belt DEPENDENCY graph: an edge from a catalog whose entries
   * contain a belt to the catalog that belt targets. A cycle here is the
   * disease — see `beltRingProblems`. */
  readonly beltEdges: { readonly from: string; readonly to: string; readonly where: string }[];
  /** The catalogs whose ENTRY subtree the walk is currently inside,
   * outermost first. A belt found here makes every one of them depend on
   * the belt's target, because an entry is clean only if its whole
   * subtree is. */
  readonly entryOwners: DeclCursor[];
  readonly problems: string[];
}

/**
 * A position the walk visits on only ONE channel is never evaluated on the
 * other. A rule reading it there waits forever on an operand that never
 * completes, and the deferred queue drops it without a word — the same
 * silence, reached by a different road.
 */
function channelProblem(visited: readonly DeclCursor[], path: string, where: string): string | undefined {
  const scoped = visited.find((cursor) => cursor.node.channel !== undefined && cursor.node.channel !== "both");
  if (scoped === undefined) return undefined;
  return (
    `${where}: selector path ${JSON.stringify(path)} passes through ${JSON.stringify(scoped.decl)}, ` +
    `which is declared channel ${JSON.stringify(scoped.node.channel)} — on the other channel that operand ` +
    `is never evaluated, so the rule waits on it and is dropped in silence`
  );
}

/** Resolve ONE selector leaf through the engine's own descent, then apply
 * the gate's policy to the answer. */
function leafProblems(
  selector: Extract<
    Selector,
    { keysOf: string } | { validKeysOf: string } | { valuesOf: string } | { collect: string }
  >,
  where: string,
  ctx: Context,
  base: DeclCursor | undefined,
): string[] {
  const { relation, path } = selectorRead(selector);
  const syntax = selectorPathProblems(path, where);
  if (syntax.length > 0) return syntax;

  const resolution = resolveSelectorPath(ctx.surface, ctx.root, base, path);
  const target = resolution.visited.at(-1);
  if (resolution.unreached !== undefined || target === undefined) {
    return [
      `${where}: selector path ${JSON.stringify(path)} addresses ` +
        `${JSON.stringify(resolution.unreached ?? path)}, which the declaration does not declare`,
    ];
  }

  const channel = channelProblem(resolution.visited, path, where);
  if (channel !== undefined) return [channel];

  // D10's belt measures ENTRIES, so its operand must be a node that HAS
  // them. A fixed map's fields are declared positions, not a keyed set
  // whose members can each be valid or not — a belt over one would ask a
  // question the shape cannot answer.
  if (relation === "validKeysOf") {
    const belted = derefNode(ctx.surface, target.node);
    if (belted?.kind !== "map.open") {
      return [
        `${where}: validKeysOf(${JSON.stringify(path)}) addresses a ${belted?.kind ?? "?"}; the entry belt ` +
          `measures the keys of a map.open, whose entries are what it belts`,
      ];
    }
    // Every catalog whose entry subtree encloses this belt now DEPENDS on
    // the catalog it targets — an entry is clean only if its whole subtree
    // is. A cycle among those edges is refused below.
    for (const owner of ctx.entryOwners) {
      ctx.beltEdges.push({ from: owner.decl, to: target.decl, where });
    }
  }

  // EVERY legal value must be readable. One that is readable for some
  // inputs and silently skipped for others is what "closed" must not mean.
  const needed = RELATION_READS[relation].shape;
  const shapes = shapesOf(ctx.surface, target.node);
  const unreadable = [...shapes].filter((shape) => shape !== needed);
  if (unreadable.length === 0) return [];
  return [
    `${where}: ${relation}(${JSON.stringify(path)}) addresses a ${target.node.kind} whose value can be ` +
      `${[...shapes].sort().join(" | ")}; ${relation} reads only ${needed}, so the rule would be ` +
      `skipped for ${unreadable.sort().join(" | ")} values`,
  ];
}

function selectorProblems(selector: Selector, where: string, ctx: Context, base: DeclCursor | undefined): string[] {
  if ("injected" in selector) return [];
  if ("union" in selector) return selector.union.flatMap((part) => selectorProblems(part, where, ctx, base));
  return leafProblems(selector, where, ctx, base);
}

function checkMembership(
  rule: { readonly target: Selector; readonly message: MessageTemplate; readonly code?: string },
  where: string,
  ctx: Context,
  base: DeclCursor | undefined,
): void {
  ctx.problems.push(...selectorProblems(rule.target, where, ctx, base));
  ctx.problems.push(...slotProblems(rule.message, where));
  if (rule.code !== undefined && !ctx.codes.has(rule.code)) {
    ctx.problems.push(`${where}: issue code ${JSON.stringify(rule.code)} is outside the declared namespace`);
  }
}

/** The position a child of `at` occupies, or undefined where the enclosing
 * position is itself unaddressable (inside a value-class DEFINITION, which
 * the engine only ever evaluates at a reference site). */
function childAt(ctx: Context, at: DeclCursor | undefined, step: Parameters<typeof descend>[2]): DeclCursor | undefined {
  return at === undefined ? undefined : descend(ctx.surface, at, step);
}

/**
 * Walk one node. `channelHonoured` says whether a `channel` mark at THIS
 * position is read by the engine — true only for a field of a `map.fixed`.
 * `at` is the node's own position and `parentAt` its container's — the
 * declaration operands of `$`-relative and `^`-relative paths, carried
 * rather than derived, because a list member's address ends in `[]` and
 * chopping it lands on the wrong container.
 */
function checkNode(
  decl: NodeDecl,
  where: string,
  channelHonoured: boolean,
  ctx: Context,
  at: DeclCursor | undefined,
  parentAt: DeclCursor | undefined,
  owner?: NodeDecl,
): void {
  ctx.tags.push(decl.tag);
  ctx.nodeTags.add(decl.tag);
  if (decl.rows.length === 0) ctx.problems.push(`${where}: node "${decl.tag}" cites no ratified row`);
  if (decl.channel !== undefined && !channelHonoured) {
    ctx.problems.push(
      `${where}: node "${decl.tag}" carries channel ${JSON.stringify(decl.channel)}, ` +
        `which is read only on a field of a map.fixed`,
    );
  }
  // A `default:` fills an ABSENCE, and a field of a fixed map is the only
  // position where absence is a thing the walk can detect: an entry that
  // is not in an open map does not exist, and neither does a list member.
  // Declared anywhere else it was accepted and never materialized —
  // pass-and-ignore, the shape this substrate refuses.
  if (!channelHonoured && Object.prototype.hasOwnProperty.call(decl, "default")) {
    ctx.problems.push(
      `${where}: node "${decl.tag}" carries a default, which is materialized only on a field of a ` +
        `map.fixed — the only position where an absence exists to fill`,
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
      for (const [name, field] of Object.entries(decl.fields)) {
        const site = `${where}.${name}`;
        ctx.problems.push(...defaultProblems(field, site, ctx));
        checkNode(field, site, true, ctx, childAt(ctx, at, { kind: "field", name }), at, decl);
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
      // The rule is the OPEN MAP's own, so a `^` in it resolves from the
      // map's container — the engine builds its frame that way too.
      if (decl.keysSubsetOf !== undefined) checkMembership(decl.keysSubsetOf, `${where}.keysSubsetOf`, ctx, parentAt);
      if (decl.keyClass !== undefined) {
        checkNode(decl.keyClass, `${where}<key>`, false, ctx, childAt(ctx, at, { kind: "keyClass" }), at);
      }
      // Only the ENTRY subtree is owned: the key class and the
       // keysSubsetOf lane sit beside the entries, not inside them.
      if (at !== undefined) ctx.entryOwners.push(at);
      checkNode(decl.entry, `${where}.*`, false, ctx, childAt(ctx, at, { kind: "entry" }), at);
      if (at !== undefined) ctx.entryOwners.pop();
      return;
    }
    case "list": {
      ctx.problems.push(...slotProblems(decl.containerMessage, where));
      if (decl.nonempty !== undefined) ctx.problems.push(...slotProblems(decl.nonempty.message, where));
      if (decl.unique !== undefined) ctx.problems.push(...slotProblems(decl.unique.message, where));
      // A member's `^` is the LIST — the engine hands the member frame the
      // list as its `parentValue`, and a list is not a container to read.
      if (decl.memberOf !== undefined) checkMembership(decl.memberOf, `${where}.memberOf`, ctx, at);
      if (decl.disjointFrom !== undefined) checkMembership(decl.disjointFrom, `${where}.disjointFrom`, ctx, at);
      checkNode(decl.member, `${where}[]`, false, ctx, childAt(ctx, at, { kind: "member" }), at);
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
      if (decl.memberOf !== undefined) checkMembership(decl.memberOf, `${where}.memberOf`, ctx, parentAt);
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
      // A union's map case is evaluated AT THE UNION'S OWN ADDRESS.
      if (decl.mapCase !== undefined) checkNode(decl.mapCase, where, false, ctx, at, parentAt);
      return;
    }
    case "raw":
      if (decl.containerMessage !== undefined) ctx.problems.push(...slotProblems(decl.containerMessage, where));
      return;
    case "map.plain": {
      ctx.problems.push(
        ...slotProblems(decl.containerMessage, where),
        ...slotProblems(decl.canonicalJsonSafe.message, where),
      );
      // D11: the TYPED SUBSET descends like a fixed map's fields, with
      // `channelHonoured` false — so `channel` and `default` on a plain
      // field hit the standing guards above. `presence` is refused HERE:
      // a plain map has no missing-key lane, and an attribute the engine
      // does not read must refuse the load, never ride along inert.
      for (const [name, field] of Object.entries(decl.fields ?? {})) {
        const site = `${where}.${name}`;
        if (field.presence !== undefined) {
          ctx.problems.push(
            `${site}: node "${field.tag}" carries presence, which is read only on a field of a ` +
              `map.fixed — a plain map has no missing-key lane`,
          );
        }
        checkNode(field, site, false, ctx, childAt(ctx, at, { kind: "field", name }), at, decl);
      }
      return;
    }
    case "valueClass": {
      const problem = valueClassProblem(decl, where, ctx);
      if (problem !== undefined) ctx.problems.push(problem);
      return;
    }
    case "delegate": {
      ctx.problems.push(...slotProblems(decl.beltMessage, where));
      checkDelegateBy(decl, where, ctx, owner);
      return;
    }
  }
}

/**
 * A declared `default:` must satisfy the field it defaults. The engine
 * materializes it through that field's own lanes, so a default the field
 * would refuse produces a finding on every template that omits the key —
 * blamed on the template, for a fault in the declaration. The author hears
 * it here instead, once.
 *
 * Only CONTEXT-FREE violations reach this list. A default whose legality
 * depends on the template around it — a role name against this template's
 * roles — cannot be decided without a template, and is not this gate's to
 * judge.
 *
 * `default: undefined` is refused outright, which settles the recorded
 * debt that it was indistinguishable from declaring no default: the two
 * are distinguishable by own-property, and materializing `undefined` is
 * not a thing a declaration can mean.
 */
function defaultProblems(field: NodeDecl, where: string, ctx: Context): string[] {
  if (!Object.prototype.hasOwnProperty.call(field, "default")) return [];
  if (field.default === undefined) {
    return [
      `${where}: default is written as \`undefined\`, which materializes nothing — ` +
        `omit the key to declare no default`,
    ];
  }
  return defaultFindings(ctx.surface, field, field.default).map(
    (finding) =>
      `${where}: default ${JSON.stringify(field.default) ?? String(field.default)} is not legal for the ` +
      `field it defaults — ${finding.message}`,
  );
}

/** The measured shame case: an unknown name made the engine return the
 * value unvalidated, so a mistyped class silently switched a rule off. */
function valueClassProblem(
  decl: Extract<NodeDecl, { kind: "valueClass" }>,
  where: string,
  ctx: Context,
): string | undefined {
  if (decl.valueClass in ctx.surface.valueClasses) return undefined;
  return (
    `${where}: value class ${JSON.stringify(decl.valueClass)} is not declared ` +
    `(declared: ${Object.keys(ctx.surface.valueClasses).join(", ")})`
  );
}

/**
 * A ring of value-class references never terminates, and the gate used to
 * wave it through. The walk hands a reference straight to its target
 * WITHOUT consuming any value, so nothing descends and nothing ends: the
 * declaration passed this gate and then exhausted the stack on the first
 * document that reached it (round 6 tripped over this without filing it).
 *
 * Reported ONCE PER RING, not once per site that names it: a maintainer
 * fixing a ring fixes one thing, and a problem list that repeats it as
 * many times as the declaration mentions it reads as many faults.
 */
function ringProblems(ctx: Context): string[] {
  const problems: string[] = [];
  const reported = new Set<string>();
  for (const name of Object.keys(ctx.surface.valueClasses)) {
    const chain: string[] = [];
    let cursor: string | undefined = name;
    while (cursor !== undefined && !chain.includes(cursor)) {
      chain.push(cursor);
      const target: NodeDecl | undefined = ctx.surface.valueClasses[cursor];
      cursor = target?.kind === "valueClass" ? target.valueClass : undefined;
    }
    if (cursor === undefined) continue;
    const ring = chain.slice(chain.indexOf(cursor));
    const key = [...ring].sort().join(",");
    if (reported.has(key)) continue;
    reported.add(key);
    problems.push(
      `value class ${JSON.stringify(cursor)} resolves to itself ` +
        `(${[...ring, cursor].join(" -> ")}); the walk would follow it without end`,
    );
  }
  return problems;
}

/**
 * A ring of ENTRY BELTS (ADR-019 D10, amended 2026-08-08). Catalog A's
 * entries belt on catalog B while B's entries belt on A: neither can say
 * whether its own entries are valid until the other has, so the answer
 * the walk gives depends on which catalog was declared first. Round 11
 * measured exactly that — one finding in one order, two in the other.
 *
 * Refused at LOAD, the sibling of the value-class ring guard and the same
 * shape: a declaration that cannot be decided is refused once, loudly,
 * before any document meets it. No runtime machinery, and the deferred
 * drain's ordering becomes unreachable by construction.
 *
 * Reported ONCE PER RING, naming every belt in it — a maintainer breaking
 * a ring breaks one thing.
 */
function beltRingProblems(ctx: Context): string[] {
  const problems: string[] = [];
  const reported = new Set<string>();
  const outgoing = new Map<string, { readonly to: string; readonly where: string }[]>();
  for (const edge of ctx.beltEdges) {
    const list = outgoing.get(edge.from) ?? [];
    list.push({ to: edge.to, where: edge.where });
    outgoing.set(edge.from, list);
  }

  // Colours, so a dense graph costs one pass rather than every path.
  const state = new Map<string, "open" | "closed">();
  const chain: string[] = [];
  const sites: string[] = [];

  const visit = (node: string): void => {
    const colour = state.get(node);
    if (colour === "closed") return;
    if (colour === "open") {
      const ring = chain.slice(chain.indexOf(node));
      const key = [...ring].sort().join(",");
      if (reported.has(key)) return;
      reported.add(key);
      const belts = sites.slice(chain.indexOf(node));
      problems.push(
        `belt ring: the validKeysOf operands form a cycle (${[...ring, node].join(" -> ")}), ` +
          `declared at ${belts.join(", ")} — no belt in the ring can decide its entries' validity ` +
          `until another already has, so the findings would depend on declaration order; ` +
          `restructure the references to run one way`,
      );
      return;
    }
    state.set(node, "open");
    chain.push(node);
    for (const edge of outgoing.get(node) ?? []) {
      sites.push(edge.where);
      visit(edge.to);
      sites.pop();
    }
    chain.pop();
    state.set(node, "closed");
  };

  for (const from of [...outgoing.keys()]) visit(from);
  return problems;
}

/** The hand-off reads a SIBLING field to name the registration. The engine
 * reads it with `typeof by !== "string" → satisfied`, so a name that
 * resolves to the wrong THING is as silent as one that resolves to
 * nothing: the delegation is skipped and the config never validated. */
function checkDelegateBy(
  decl: Extract<NodeDecl, { kind: "delegate" }>,
  where: string,
  ctx: Context,
  owner: NodeDecl | undefined,
): void {
  const fields = owner === undefined ? undefined : derefNode(ctx.surface, owner);
  const names = fields?.kind === "map.fixed" ? Object.keys(fields.fields) : [];
  const by = fields?.kind === "map.fixed" ? descend(ctx.surface, { node: fields, decl: where }, { kind: "field", name: decl.by }) : undefined;
  if (by === undefined) {
    ctx.problems.push(
      `${where}: delegate reads sibling field ${JSON.stringify(decl.by)}, ` +
        `which the enclosing map does not declare (siblings: ${names.join(", ")})`,
    );
    return;
  }
  if (by.node.channel !== undefined && by.node.channel !== "both") {
    ctx.problems.push(
      `${where}: delegate reads sibling field ${JSON.stringify(decl.by)}, which is declared channel ` +
        `${JSON.stringify(by.node.channel)} — on the other channel it is never present, so the ` +
        `delegation is skipped and the config never validated`,
    );
    return;
  }
  const shapes = shapesOf(ctx.surface, by.node);
  const unreadable = [...shapes].filter((shape) => shape !== "string");
  if (unreadable.length > 0) {
    ctx.problems.push(
      `${where}: delegate reads sibling field ${JSON.stringify(decl.by)}, whose value can be ` +
        `${[...shapes].sort().join(" | ")}; the registration is looked up by a string, so the delegation ` +
        `is skipped for ${unreadable.sort().join(" | ")} values`,
    );
  }
}

function checkCrossRule(rule: EqualsRuleDecl, ctx: Context): void {
  const where = `crossRule "${rule.tag}"`;
  ctx.tags.push(rule.tag);
  if (rule.rows.length === 0) ctx.problems.push(`${where}: cites no ratified row`);
  // A cross rule cites from the ROOT: it has no citing node, so `^` has no
  // operand and every path it writes must be document-rooted.
  ctx.problems.push(...selectorProblems(rule.left, `${where}.left`, ctx, undefined));
  ctx.problems.push(...selectorProblems(rule.right, `${where}.right`, ctx, undefined));
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

/** Where a normalizer operand path lands, through the engine's descent. */
function hookPosition(ctx: Context, path: string): DeclCursor | undefined {
  const resolution = resolveSelectorPath(ctx.surface, ctx.root, undefined, path);
  return resolution.unreached === undefined ? resolution.visited.at(-1) : undefined;
}

function fieldProblem(ctx: Context, at: DeclCursor, name: string, where: string): string | undefined {
  const node = derefNode(ctx.surface, at.node);
  if (descend(ctx.surface, at, { kind: "field", name }) !== undefined) return undefined;
  // A plain map's TYPED SUBSET (D11) holds declared field positions too,
  // and a hook reading a NESTED source lands on one. Listing only a fixed
  // map's fields rendered an empty list there — a refusal that named the
  // reference and then said nothing about what was available.
  const declared =
    node?.kind === "map.fixed"
      ? { label: "fields", names: Object.keys(node.fields) }
      : node?.kind === "map.plain"
        ? { label: "typed fields", names: Object.keys(node.fields ?? {}) }
        : { label: `a ${node?.kind ?? "?"}, which declares no fields`, names: [] };
  const listed = declared.names.length === 0 ? declared.label : `${declared.label}: ${declared.names.join(", ")}`;
  return `${where}: ${JSON.stringify(name)} is not a field of ${JSON.stringify(at.decl)} (${listed})`;
}

/** Pass two for the normalizer: its operand paths address declared
 * positions, and its dynamic FIELD names are fields of the node it lands
 * on. An unresolved `edges` produced an empty flag map in silence. */
function resolveHooks(surface: SurfaceDecl, ctx: Context): void {
  for (const hook of surface.normalizers) {
    if (!ctx.resolvableHooks.has(hook.tag)) continue;
    const where = `normalizer "${hook.tag}"`;
    const over = hookPosition(ctx, hook.over);
    if (over === undefined) {
      ctx.problems.push(`${where}.over: ${JSON.stringify(hook.over)} is not a declared position`);
      continue;
    }
    const entry = descend(ctx.surface, over, { kind: "entry" });
    if (entry === undefined) {
      const kind = derefNode(ctx.surface, over.node)?.kind ?? over.node.kind;
      ctx.problems.push(`${where}.over: ${JSON.stringify(hook.over)} is a ${kind}; the hook walks a map.open`);
      continue;
    }
    if (hook.hook === "expandAdvancesRound") {
      if (hookPosition(ctx, hook.advanceSet) === undefined) {
        ctx.problems.push(`${where}.advanceSet: ${JSON.stringify(hook.advanceSet)} is not a declared position`);
      }
      for (const [label, name] of [["edges", hook.edges], ["into", hook.into]] as const) {
        const problem = fieldProblem(ctx, entry, name, `${where}.${label}`);
        if (problem !== undefined) ctx.problems.push(problem);
      }
      continue;
    }
    if (hook.hook === "liftNestedList") {
      for (const [label, name] of [["from", hook.from], ["into", hook.into]] as const) {
        const problem = fieldProblem(ctx, entry, name, `${where}.${label}`);
        if (problem !== undefined) ctx.problems.push(problem);
      }
      // The source sits one level IN — a field of the entry's own field,
      // which is what makes this hook a derivation rather than a default.
      // Resolving it is the whole reason the guard exists: a name that
      // reaches nothing leaves the hook writing the empty list forever,
      // and an empty list is a legal answer, so nothing downstream reds.
      const from = descend(ctx.surface, entry, { kind: "field", name: hook.from });
      if (from !== undefined) {
        const problem = fieldProblem(ctx, from, hook.source, `${where}.source`);
        if (problem !== undefined) ctx.problems.push(problem);
      }
      continue;
    }
    const member = descend(ctx.surface, entry, { kind: "member" });
    if (member === undefined) {
      ctx.problems.push(`${where}.over: ${JSON.stringify(entry.decl)} is not a list; the hook rebuilds its members`);
      continue;
    }
    for (const name of [...hook.carry, hook.into]) {
      const problem = fieldProblem(ctx, member, name, where);
      if (problem !== undefined) ctx.problems.push(problem);
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
    case "map.plain":
      // D11: the typed subset's rules join the closure like any others
      // (arm D11-R1 F1: a ghost dependsOn inside a plain field slipped
      // the gate because this traversal predated the widening).
      for (const [name, field] of Object.entries(decl.fields ?? {})) {
        collectDependsOn(field, `${where}.${name}`, into);
      }
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
    surface,
    root: { node: surface.root, decl: "$" },
    codes: new Set(surface.substrate.codes.values),
    tags: [],
    nodeTags: new Set(),
    resolvableHooks: new Set(),
    beltEdges: [],
    entryOwners: [],
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

  checkNode(surface.root, "$", false, ctx, ctx.root, undefined);
  for (const [name, decl] of Object.entries(surface.valueClasses)) {
    // A value-class DEFINITION has no address of its own: the engine only
    // ever evaluates it at a reference site, and its `^` is that site's
    // container. So it is walked without a position, and a `^` written
    // inside one does not resolve — loudly, at load, which is the recorded
    // disposition rather than a silence.
    checkNode(decl, `valueClass "${name}"`, false, ctx, undefined, undefined);
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

  ctx.problems.push(...ringProblems(ctx));
  ctx.problems.push(...beltRingProblems(ctx));
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
