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
  return segments.slice(1).some((segment) => segment === "")
    ? [`${where}: normalizer path ${JSON.stringify(path)} has an empty segment`]
    : [];
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
  readonly valueClasses: ReadonlySet<string>;
  readonly codes: ReadonlySet<string>;
  readonly tags: string[];
  readonly problems: string[];
}

function selectorProblems(selector: Selector, where: string): string[] {
  if ("injected" in selector) return [];
  if ("union" in selector) return selector.union.flatMap((part) => selectorProblems(part, where));
  const path = "keysOf" in selector ? selector.keysOf : "valuesOf" in selector ? selector.valuesOf : selector.collect;
  return selectorPathProblems(path, where);
}

function checkMembership(
  rule: { readonly target: Selector; readonly message: MessageTemplate; readonly code?: string },
  where: string,
  ctx: Context,
): void {
  ctx.problems.push(...selectorProblems(rule.target, where));
  ctx.problems.push(...slotProblems(rule.message, where));
  if (rule.code !== undefined && !ctx.codes.has(rule.code)) {
    ctx.problems.push(`${where}: issue code ${JSON.stringify(rule.code)} is outside the declared namespace`);
  }
}

/**
 * Walk one node. `channelHonoured` says whether a `channel` mark at THIS
 * position is read by the engine — true only for a field of a `map.fixed`.
 */
function checkNode(decl: NodeDecl, where: string, channelHonoured: boolean, ctx: Context): void {
  ctx.tags.push(decl.tag);
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
      for (const [name, field] of Object.entries(decl.fields)) {
        checkNode(field, `${where}.${name}`, true, ctx);
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
      if (decl.keysSubsetOf !== undefined) checkMembership(decl.keysSubsetOf, `${where}.keysSubsetOf`, ctx);
      if (decl.keyClass !== undefined) checkNode(decl.keyClass, `${where}<key>`, false, ctx);
      checkNode(decl.entry, `${where}.*`, false, ctx);
      return;
    }
    case "list": {
      ctx.problems.push(...slotProblems(decl.containerMessage, where));
      if (decl.nonempty !== undefined) ctx.problems.push(...slotProblems(decl.nonempty.message, where));
      if (decl.unique !== undefined) ctx.problems.push(...slotProblems(decl.unique.message, where));
      if (decl.memberOf !== undefined) checkMembership(decl.memberOf, `${where}.memberOf`, ctx);
      if (decl.disjointFrom !== undefined) checkMembership(decl.disjointFrom, `${where}.disjointFrom`, ctx);
      checkNode(decl.member, `${where}[]`, false, ctx);
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
      if (decl.memberOf !== undefined) checkMembership(decl.memberOf, `${where}.memberOf`, ctx);
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
      if (decl.mapCase !== undefined) checkNode(decl.mapCase, where, false, ctx);
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
      if (!ctx.valueClasses.has(decl.valueClass)) {
        ctx.problems.push(
          `${where}: value class ${JSON.stringify(decl.valueClass)} is not declared ` +
            `(declared: ${[...ctx.valueClasses].join(", ")})`,
        );
      }
      return;
    }
    case "delegate": {
      ctx.problems.push(...slotProblems(decl.beltMessage, where));
      return;
    }
  }
}

function checkCrossRule(rule: EqualsRuleDecl, ctx: Context): void {
  const where = `crossRule "${rule.tag}"`;
  ctx.tags.push(rule.tag);
  if (rule.rows.length === 0) ctx.problems.push(`${where}: cites no ratified row`);
  ctx.problems.push(...selectorProblems(rule.left, `${where}.left`));
  ctx.problems.push(...selectorProblems(rule.right, `${where}.right`));
  ctx.problems.push(...findingPathProblems(rule.missingFromLeft.at, `${where}.missingFromLeft.at`));
  ctx.problems.push(...findingPathProblems(rule.missingFromRight.at, `${where}.missingFromRight.at`));
  ctx.problems.push(...slotProblems(rule.missingFromLeft.message, `${where}.missingFromLeft`));
  ctx.problems.push(...slotProblems(rule.missingFromRight.message, `${where}.missingFromRight`));
}

function checkHook(hook: NormalizerHookDecl, ctx: Context): void {
  const where = `normalizer "${hook.tag}"`;
  ctx.tags.push(hook.tag);
  if (hook.rows.length === 0) ctx.problems.push(`${where}: cites no ratified row`);
  ctx.problems.push(...normalizerPathProblems(hook.over, `${where}.over`));
  if (hook.hook === "expandAdvancesRound") {
    ctx.problems.push(...normalizerPathProblems(hook.advanceSet, `${where}.advanceSet`));
  }
}

function checkBranch(branch: SubstrateBranch, where: string, ctx: Context): void {
  ctx.tags.push(branch.tag);
  if (branch.rows.length === 0) ctx.problems.push(`${where}: cites no ratified row`);
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
    valueClasses: new Set(Object.keys(surface.valueClasses)),
    codes: new Set(surface.substrate.codes.values),
    tags: [],
    problems: [],
  };

  checkBranch(surface.substrate.read, "substrate.read", ctx);
  checkBranch(surface.substrate.parse.directive, "substrate.parse.directive", ctx);
  checkBranch(surface.substrate.parse.duplicateKeys, "substrate.parse.duplicateKeys", ctx);
  checkBranch(surface.substrate.resolve.graph, "substrate.resolve.graph", ctx);
  checkBranch(surface.substrate.codes, "substrate.codes", ctx);
  checkBranch(surface.substrate.internalFailure, "substrate.internalFailure", ctx);

  checkNode(surface.root, "$", false, ctx);
  for (const [name, decl] of Object.entries(surface.valueClasses)) {
    checkNode(decl, `valueClass "${name}"`, false, ctx);
  }
  for (const rule of surface.crossRules) checkCrossRule(rule, ctx);
  for (const hook of surface.normalizers) checkHook(hook, ctx);

  // Tags must be unique, or a contract pointer is ambiguous.
  const seen = new Set<string>();
  for (const tag of ctx.tags) {
    if (seen.has(tag)) ctx.problems.push(`declaration tag ${JSON.stringify(tag)} is declared more than once`);
    seen.add(tag);
  }

  // `dependsOn` names a TAG; an unresolvable one suppresses nothing, silently.
  const dependencies: { tag: string; where: string }[] = [];
  collectDependsOn(surface.root, "$", dependencies);
  for (const rule of surface.crossRules) {
    for (const tag of rule.dependsOn ?? []) dependencies.push({ tag, where: `crossRule "${rule.tag}"` });
  }
  for (const dependency of dependencies) {
    if (!seen.has(dependency.tag)) {
      ctx.problems.push(
        `${dependency.where}: dependsOn names ${JSON.stringify(dependency.tag)}, which is not a declared tag`,
      );
    }
  }

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
