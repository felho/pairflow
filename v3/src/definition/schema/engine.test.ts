import { parseDocument } from "yaml";
import { describe, expect, it } from "vitest";

import { REJECTION_NAMES } from "../../domain/index.js";
import type { GateCatalog, GateRegistration } from "../../ports/index.js";
import type { ValidationFinding } from "../errors.js";
import { instanceKey, runSurface } from "./engine.js";
import type { EngineChannel } from "./engine.js";
import { closureProblems, defineSurface, SurfaceDeclarationError } from "./defineSurface.js";
import { normalize } from "./normalizer.js";
import { templateFormat } from "./templateFormat.js";
import type { EdgeSourceDecl, NodeDecl, SurfaceDecl } from "./vocabulary.js";

/**
 * The ENGINE's own suite (ADR-019's P3 build). It tests the VOCABULARY's
 * semantics over SYNTHETIC declarations — never the template
 * declaration, whose correctness is measured by the 1830-case corpus the
 * parity gate replayed.
 *
 * SENSITIVITY DISCIPLINE (process-log 2026-08-04, the non-discriminating
 * fixture and the vacuous mutant): every guard below carries BOTH its
 * fixture and a MUTANT declaration with that guard removed, and the
 * fixture must stop producing the finding against the mutant. A fixture
 * that fires either way proves nothing.
 *
 * Declaration-as-data makes the mutant cheap and exact: it is the same
 * object with one attribute deleted, not a hand-edited copy of an
 * engine. That is a property of the direction, and it is why this suite
 * can afford a mutant per guard.
 *
 * The register is ONE level: a per-claim fixture, the name list, and a
 * pinned count. No register tower (the documented anti-precedent).
 */

const NO_CATALOG: GateCatalog = { resolve: () => null };

function surface(root: NodeDecl, extra: Partial<SurfaceDecl> = {}): SurfaceDecl {
  return {
    substrate: templateFormat.substrate,
    root,
    valueClasses: {},
    crossRules: [],
    normalizers: [],
    ...extra,
  };
}

function direct(
  root: NodeDecl,
  value: unknown,
  extra?: Partial<SurfaceDecl>,
  catalog: GateCatalog = NO_CATALOG,
): readonly ValidationFinding[] {
  return runSurface(surface(root, extra), value, { channel: { kind: "direct" }, catalog }).findings;
}

function fromFile(
  root: NodeDecl,
  yaml: string,
  extra?: Partial<SurfaceDecl>,
): readonly ValidationFinding[] {
  const doc = parseDocument(yaml);
  const value: unknown = doc.toJS({ mapAsMap: true });
  const channel: EngineChannel = { kind: "file", doc, source: yaml };
  return runSurface(surface(root, extra), value, { channel, catalog: NO_CATALOG }).findings;
}

/** Building blocks kept tiny so a mutant is visibly ONE attribute away. */
const ROWS = ["synthetic"] as const;

function fixed(tag: string, fields: Record<string, NodeDecl>, over: Partial<NodeDecl> = {}): NodeDecl {
  return {
    kind: "map.fixed",
    tag,
    rows: ROWS,
    containerMessage: "{path} must be a map",
    unknownMessage: "unknown key {value}",
    fields,
    ...over,
  } as NodeDecl;
}

function text(tag: string, over: Partial<NodeDecl> = {}): NodeDecl {
  return { kind: "string", tag, rows: ROWS, typeMessage: "{path} must be a string", ...over } as NodeDecl;
}

// ---------------------------------------------------------------------------
// The guard register.
// ---------------------------------------------------------------------------

interface Guard {
  readonly claim: string;
  readonly decl: NodeDecl;
  /** The SAME declaration with this guard removed. */
  readonly mutant: NodeDecl;
  readonly value?: unknown;
  readonly yaml?: string;
  readonly expected: ValidationFinding;
  readonly extra?: Partial<SurfaceDecl>;
  readonly catalog?: GateCatalog;
}

const idish = { kind: "string", tag: "member", rows: ROWS, grammar: { re: "^[a-z]+$", message: "{path}: bad id" } } as NodeDecl;

const GUARDS: readonly Guard[] = [
  {
    claim: "map.fixed — the container kind",
    decl: fixed("m", {}),
    mutant: { kind: "raw", tag: "m", rows: ROWS },
    value: 7,
    expected: { path: "$", message: "$ must be a map" },
  },
  {
    claim: "map.fixed — a missing required key at CONTAINER grain",
    decl: fixed("m", { a: text("a", { presence: { required: true } }) }, { missingMessage: 'missing required key "{key}"' }),
    mutant: fixed("m", { a: text("a") }, { missingMessage: 'missing required key "{key}"' }),
    value: {},
    expected: { path: "$", message: 'missing required key "a"' },
  },
  {
    claim: "map.fixed — a missing required key at SELF grain with its own wording and code",
    decl: fixed("m", {
      a: text("a", { presence: { required: true, at: "self", message: "a is required", code: "x_code" } }),
    }),
    mutant: fixed("m", { a: text("a") }),
    value: {},
    expected: { path: "a", message: "a is required", code: "x_code" },
  },
  {
    claim: "map.fixed — an unknown key is fail-closed",
    decl: fixed("m", { a: text("a") }),
    mutant: fixed("m", { a: text("a"), b: text("b") }),
    value: { b: "x" },
    expected: { path: "b", message: 'unknown key "b"' },
  },
  {
    claim: "map.fixed — a REMOVED key fails loud with its migration text",
    decl: fixed("m", { a: text("a") }, { removedKeys: { old: "`old` is retired — author `a`" } }),
    mutant: fixed("m", { a: text("a") }),
    value: { old: 1 },
    expected: { path: "old", message: "`old` is retired — author `a`" },
  },
  {
    claim: "map.open — the container kind",
    decl: { kind: "map.open", tag: "o", rows: ROWS, containerMessage: "{path} must be an open map", keyLaneAt: "container", entry: text("e") },
    mutant: { kind: "raw", tag: "o", rows: ROWS },
    value: [],
    expected: { path: "$", message: "$ must be an open map" },
  },
  {
    claim: "map.open — nonempty",
    decl: { kind: "map.open", tag: "o", rows: ROWS, containerMessage: "c", nonempty: { message: "{path} must be NONEMPTY" }, keyLaneAt: "container", entry: text("e") },
    mutant: { kind: "map.open", tag: "o", rows: ROWS, containerMessage: "c", keyLaneAt: "container", entry: text("e") },
    value: {},
    expected: { path: "$", message: "$ must be NONEMPTY" },
  },
  {
    claim: "map.open — the key class reports at the CONTAINING map",
    decl: { kind: "map.open", tag: "o", rows: ROWS, containerMessage: "c", keyClass: idish, keyLaneAt: "container", entry: text("e") } as NodeDecl,
    mutant: { kind: "map.open", tag: "o", rows: ROWS, containerMessage: "c", keyLaneAt: "container", entry: text("e") },
    value: { "BAD": "x" },
    expected: { path: "$", message: "$: bad id" },
  },
  {
    claim: "map.open — the key class reports at the SEGMENT when so declared",
    decl: { kind: "map.open", tag: "o", rows: ROWS, containerMessage: "c", keyClass: idish, keyLaneAt: "segment", entry: text("e") } as NodeDecl,
    mutant: { kind: "map.open", tag: "o", rows: ROWS, containerMessage: "c", keyLaneAt: "segment", entry: text("e") },
    value: { "BAD": "x" },
    expected: { path: "BAD", message: "BAD: bad id" },
  },
  {
    claim: "map.open — keysSubsetOf marks a key outside the target set",
    decl: fixed("root", {
      src: { kind: "map.open", tag: "src", rows: ROWS, containerMessage: "c", keyLaneAt: "container", entry: text("s") },
      sub: {
        kind: "map.open",
        tag: "sub",
        rows: ROWS,
        containerMessage: "c",
        keyLaneAt: "container",
        keysSubsetOf: { relation: "keysSubsetOf", target: { keysOf: "$.src" }, message: "'{key}' is not in src" },
        entry: text("t"),
      },
    }),
    mutant: fixed("root", {
      src: { kind: "map.open", tag: "src", rows: ROWS, containerMessage: "c", keyLaneAt: "container", entry: text("s") },
      sub: { kind: "map.open", tag: "sub", rows: ROWS, containerMessage: "c", keyLaneAt: "container", entry: text("t") },
    }),
    value: { src: { a: "x" }, sub: { b: "y" } },
    expected: { path: "sub.b", message: "'b' is not in src" },
  },
  {
    claim: "list — the container kind",
    decl: { kind: "list", tag: "l", rows: ROWS, containerMessage: "{path} must be a list", memberLaneAt: "index", member: text("m") },
    mutant: { kind: "raw", tag: "l", rows: ROWS },
    value: "nope",
    expected: { path: "$", message: "$ must be a list" },
  },
  {
    claim: "list — nonempty",
    decl: { kind: "list", tag: "l", rows: ROWS, containerMessage: "c", nonempty: { message: "{path} must be NONEMPTY" }, memberLaneAt: "index", member: text("m") },
    mutant: { kind: "list", tag: "l", rows: ROWS, containerMessage: "c", memberLaneAt: "index", member: text("m") },
    value: [],
    expected: { path: "$", message: "$ must be NONEMPTY" },
  },
  {
    claim: "list — the member lane reports at the CONTAINER when so declared",
    decl: { kind: "list", tag: "l", rows: ROWS, containerMessage: "c", memberLaneAt: "container", member: idish },
    mutant: { kind: "list", tag: "l", rows: ROWS, containerMessage: "c", memberLaneAt: "container", member: { kind: "raw", tag: "member", rows: ROWS } as NodeDecl },
    value: ["ok", "BAD"],
    expected: { path: "$", message: "$: bad id" },
  },
  {
    claim: "list — duplicates at INDEX grain",
    decl: { kind: "list", tag: "l", rows: ROWS, containerMessage: "c", memberLaneAt: "index", member: text("m"), unique: { grain: "perOccurrence", at: "index", message: "'{valueRaw}' is duplicated" } },
    mutant: { kind: "list", tag: "l", rows: ROWS, containerMessage: "c", memberLaneAt: "index", member: text("m") },
    value: ["a", "a"],
    expected: { path: "$[1]", message: "'a' is duplicated" },
  },
  {
    claim: "list — duplicates at CONTAINER grain",
    decl: { kind: "list", tag: "l", rows: ROWS, containerMessage: "c", memberLaneAt: "container", member: text("m"), unique: { grain: "perOccurrence", at: "container", message: "duplicate {valueJson}" } },
    mutant: { kind: "list", tag: "l", rows: ROWS, containerMessage: "c", memberLaneAt: "container", member: text("m") },
    value: ["a", "a"],
    expected: { path: "$", message: 'duplicate "a"' },
  },
  {
    claim: "list — disjointFrom a selector's set",
    decl: fixed("root", {
      names: { kind: "map.open", tag: "names", rows: ROWS, containerMessage: "c", keyLaneAt: "container", entry: text("n") },
      ids: { kind: "list", tag: "ids", rows: ROWS, containerMessage: "c", memberLaneAt: "container", member: text("m"), disjointFrom: { relation: "disjointFrom", target: { keysOf: "$.names" }, message: "{valueJson} collides" } },
    }),
    mutant: fixed("root", {
      names: { kind: "map.open", tag: "names", rows: ROWS, containerMessage: "c", keyLaneAt: "container", entry: text("n") },
      ids: { kind: "list", tag: "ids", rows: ROWS, containerMessage: "c", memberLaneAt: "container", member: text("m") },
    }),
    value: { names: { a: "x" }, ids: ["a"] },
    expected: { path: "ids", message: '"a" collides' },
  },
  {
    claim: "list — memberOf a selector's set",
    decl: fixed("root", {
      names: { kind: "map.open", tag: "names", rows: ROWS, containerMessage: "c", keyLaneAt: "container", entry: text("n") },
      ids: { kind: "list", tag: "ids", rows: ROWS, containerMessage: "c", memberLaneAt: "index", member: text("m"), memberOf: { relation: "memberOf", target: { keysOf: "$.names" }, message: "'{valueRaw}' is not a name" } },
    }),
    mutant: fixed("root", {
      names: { kind: "map.open", tag: "names", rows: ROWS, containerMessage: "c", keyLaneAt: "container", entry: text("n") },
      ids: { kind: "list", tag: "ids", rows: ROWS, containerMessage: "c", memberLaneAt: "index", member: text("m") },
    }),
    value: { names: { a: "x" }, ids: ["zz"] },
    expected: { path: "ids[0]", message: "'zz' is not a name" },
  },
  {
    claim: "string — the type lane",
    decl: text("s"),
    mutant: { kind: "raw", tag: "s", rows: ROWS },
    value: 4,
    expected: { path: "$", message: "$ must be a string" },
  },
  {
    claim: "string — nonempty",
    decl: text("s", { nonempty: { message: "{path} must be nonempty" } }),
    mutant: text("s"),
    value: "",
    expected: { path: "$", message: "$ must be nonempty" },
  },
  {
    claim: "string — a value grammar",
    decl: text("s", { grammar: { re: "^[a-z]+$", message: "{path} must match {grammar}" } }),
    mutant: text("s"),
    value: "NOPE",
    expected: { path: "$", message: "$ must match ^[a-z]+$" },
  },
  {
    claim: "string — a node with NO type lane leaves the non-string case to its membership lane",
    decl: fixed("root", {
      names: { kind: "map.open", tag: "names", rows: ROWS, containerMessage: "c", keyLaneAt: "container", entry: text("n") },
      pick: { kind: "string", tag: "pick", rows: ROWS, memberOf: { relation: "memberOf", target: { keysOf: "$.names" }, message: "{path} must name one; got {value}" } },
    }),
    mutant: fixed("root", {
      names: { kind: "map.open", tag: "names", rows: ROWS, containerMessage: "c", keyLaneAt: "container", entry: text("n") },
      pick: { kind: "string", tag: "pick", rows: ROWS },
    }),
    value: { names: { a: "x" }, pick: 9 },
    expected: { path: "pick", message: "pick must name one; got 9" },
  },
  {
    claim: "integer — the resolved safe-integer belt",
    decl: { kind: "integer", tag: "i", rows: ROWS, resolvedForm: { safeInteger: true, min: 1, message: "{path} must be a safe integer >= 1" } },
    mutant: { kind: "integer", tag: "i", rows: ROWS },
    value: 0,
    expected: { path: "$", message: "$ must be a safe integer >= 1" },
  },
  {
    claim: "integer — the plain-decimal SOURCE ladder on the file channel",
    decl: fixed("root", { v: { kind: "integer", tag: "v", rows: ROWS, sourceForm: "plainDecimalInteger" } }),
    mutant: fixed("root", { v: { kind: "integer", tag: "v", rows: ROWS } }),
    yaml: "v: 0x10\n",
    expected: { path: "v", message: 'v must be written as a plain decimal integer >= 1; got source form "0x10"' },
  },
  {
    claim: "enum — the allowlist",
    decl: { kind: "enum", tag: "e", rows: ROWS, members: [{ value: "a" }, { value: "b" }], message: "{path} must be one of {members}; got {value}" },
    mutant: { kind: "enum", tag: "e", rows: ROWS, members: [{ value: "a" }, { value: "b" }, { value: "c" }], message: "{path} must be one of {members}; got {value}" },
    value: "c",
    expected: { path: "$", message: '$ must be one of a, b; got "c"' },
  },
  {
    claim: "union — an illegal value",
    decl: { kind: "union", tag: "u", rows: ROWS, literals: ["none"], message: "{path} must be none or a map; got {value}" },
    mutant: { kind: "union", tag: "u", rows: ROWS, literals: ["none", "other"], message: "{path} must be none or a map; got {value}" },
    value: "other",
    expected: { path: "$", message: '$ must be none or a map; got "other"' },
  },
  {
    claim: "union — a REMOVED value fails loud with its migration text",
    decl: { kind: "union", tag: "u", rows: ROWS, literals: ["none"], removedValues: { legacy: "`legacy` is retired — author `none`" }, message: "illegal" },
    mutant: { kind: "union", tag: "u", rows: ROWS, literals: ["none"], message: "illegal" },
    value: "legacy",
    expected: { path: "$", message: "`legacy` is retired — author `none`" },
  },
  {
    claim: "map.plain — a non-plain container",
    decl: { kind: "map.plain", tag: "p", rows: ROWS, containerMessage: "{label} must be a map; got {value}", canonicalJsonSafe: { message: "{label} must be canonical-JSON-safe" } },
    mutant: { kind: "raw", tag: "p", rows: ROWS },
    value: [1],
    expected: { path: "$", message: "{label} must be a map; got a list" },
  },
  {
    claim: "map.plain — canonical-JSON safety",
    decl: fixed("root", {
      cfg: { kind: "valueClass", tag: "cfg", rows: ROWS, valueClass: "profile", label: "cfg" },
    }),
    mutant: fixed("root", { cfg: { kind: "raw", tag: "cfg", rows: ROWS } }),
    value: { cfg: { n: Number.POSITIVE_INFINITY } },
    extra: {
      valueClasses: {
        profile: { kind: "map.plain", tag: "vc", rows: ROWS, containerMessage: "{label} must be a map", canonicalJsonSafe: { message: "{label} must be canonical-JSON-safe" } },
      },
    },
    expected: { path: "cfg", message: "cfg must be canonical-JSON-safe" },
  },
  {
    claim: "raw — an asserted container kind",
    decl: { kind: "raw", tag: "r", rows: ROWS, containerMessage: "{path} must be a map when present; got {value}" },
    mutant: { kind: "raw", tag: "r", rows: ROWS },
    value: 3,
    expected: { path: "$", message: "$ must be a map when present; got 3" },
  },
  {
    claim: "channel — a DIRECT-only key is an unknown key on the file channel",
    decl: fixed("root", { a: text("a"), produced: { kind: "raw", tag: "produced", rows: ROWS, channel: "direct" } }),
    mutant: fixed("root", { a: text("a"), produced: { kind: "raw", tag: "produced", rows: ROWS } }),
    yaml: "a: x\nproduced: 1\n",
    expected: { path: "produced", message: 'unknown key "produced"' },
  },
  {
    claim: "channel — a FILE-only enum member is refused on the direct channel",
    decl: { kind: "enum", tag: "e", rows: ROWS, members: [{ value: "authored", channel: "file" }, { value: "stored", channel: "direct" }], message: "{path} must be one of {members}; got {value}" },
    mutant: { kind: "enum", tag: "e", rows: ROWS, members: [{ value: "authored" }, { value: "stored" }], message: "{path} must be one of {members}; got {value}" },
    value: "authored",
    expected: { path: "$", message: '$ must be one of stored; got "authored"' },
  },
  {
    claim: "map.plain — a TYPED SUBSET field is validated when present (D11)",
    decl: {
      kind: "map.plain",
      tag: "m",
      rows: ROWS,
      containerMessage: "{path} must be a plain map",
      canonicalJsonSafe: { message: "{path} must be canonical-JSON-safe" },
      fields: {
        refs: {
          kind: "list",
          tag: "refs",
          rows: ROWS,
          containerMessage: "{path} must be a list",
          memberLaneAt: "index",
          member: idish,
        },
      },
    },
    mutant: {
      kind: "map.plain",
      tag: "m",
      rows: ROWS,
      containerMessage: "{path} must be a plain map",
      canonicalJsonSafe: { message: "{path} must be canonical-JSON-safe" },
    },
    value: { refs: ["BAD"] },
    expected: { path: "refs[0]", message: "refs[0]: bad id" },
  },
];

// ---------------------------------------------------------------------------

function run(guard: Guard, decl: NodeDecl): readonly ValidationFinding[] {
  return guard.yaml === undefined
    ? direct(decl, guard.value, guard.extra, guard.catalog)
    : fromFile(decl, guard.yaml, guard.extra);
}

describe("the engine's vocabulary guards, each with a discriminating fixture", () => {
  for (const guard of GUARDS) {
    it(`${guard.claim} — fires`, () => {
      expect(run(guard, guard.decl)).toContainEqual(guard.expected);
    });

    it(`${guard.claim} — the fixture DISCRIMINATES (the mutant declaration does not fire it)`, () => {
      expect(run(guard, guard.mutant)).not.toContainEqual(guard.expected);
    });
  }

  it("the guard register is complete, unique and PINNED", () => {
    // One level: the fixture list above IS the register. The pin makes
    // adding or dropping a guard a visible edit rather than a drift.
    expect(GUARDS).toHaveLength(32);
    expect(new Set(GUARDS.map((guard) => guard.claim)).size).toBe(GUARDS.length);
    for (const guard of GUARDS) {
      expect(guard.decl).not.toStrictEqual(guard.mutant);
    }
  });
});

describe("lane order is DECLARED, because the measured nodes disagree", () => {
  const node = (order: "missingThenUnknown" | "unknownThenPerKey" | "unknownThenMissingThenValues"): NodeDecl =>
    fixed(
      "m",
      {
        a: text("a", { presence: { required: true }, grammar: { re: "^ok$", message: "a bad" } }),
        b: text("b", { presence: { required: true } }),
      },
      { laneOrder: order, missingMessage: 'missing "{key}"' },
    );
  const value = { a: "no", surplus: 1 };

  it("missingThenUnknown — every missing key, then every unknown key, then the value lanes", () => {
    expect(direct(node("missingThenUnknown"), value).map((f) => f.message)).toStrictEqual([
      'missing "b"',
      'unknown key "surplus"',
      "a bad",
    ]);
  });

  it("unknownThenPerKey — unknown keys, then each key's missing-or-value lane in declared order", () => {
    expect(direct(node("unknownThenPerKey"), value).map((f) => f.message)).toStrictEqual([
      'unknown key "surplus"',
      "a bad",
      'missing "b"',
    ]);
  });

  it("unknownThenMissingThenValues — unknown keys, then every missing key, then the value lanes", () => {
    expect(direct(node("unknownThenMissingThenValues"), value).map((f) => f.message)).toStrictEqual([
      'unknown key "surplus"',
      'missing "b"',
      "a bad",
    ]);
  });
});

describe("suppression: the implicit container precondition and declared gating", () => {
  const root = fixed("root", {
    steps: {
      kind: "map.open",
      tag: "steps",
      rows: ROWS,
      containerMessage: "steps must be a map",
      keyLaneAt: "container",
      entry: text("step"),
    },
    start: {
      kind: "string",
      tag: "start",
      rows: ROWS,
      memberOf: { relation: "memberOf", target: { keysOf: "$.steps" }, message: "start must name a step" },
    },
  });

  it("a WRONG-KIND container yields its own finding and suppresses the rule that selects over it", () => {
    const findings = direct(root, { steps: 7, start: "nope" });
    expect(findings).toStrictEqual([{ path: "steps", message: "steps must be a map" }]);
  });

  // A MISSING container is NOT the same as a wrong-kind one, and the
  // difference is the whole of vocabulary #14. A wrong-kind container has
  // its own finding, so a lane reading it is suppressed WITH a trace. A
  // missing one leaves no finding anywhere — so a lane reading it used to
  // end the walk undecided and be dropped, which is a declared rule
  // quietly not running. It is reported now unless the declaration says
  // the absence is legitimate, and both directions are tested here.
  it("a MISSING container leaves the rule UNDECIDED — reported, not dropped", () => {
    expect(direct(root, { start: "nope" })).toStrictEqual([
      {
        path: "start",
        message:
          "internal validator failure: the memberOf lane could not be decided — " +
          'its operand keysOf("$.steps") names a position the walk never evaluated',
      },
    ]);
  });

  it("...and is silent when the declaration DECLARES that absence legitimate", () => {
    const skipping = fixed("root", {
      steps: {
        kind: "map.open", tag: "steps", rows: ROWS, containerMessage: "steps must be a map",
        keyLaneAt: "container", entry: text("step"),
      },
      start: {
        kind: "string", tag: "start", rows: ROWS,
        memberOf: {
          relation: "memberOf", target: { keysOf: "$.steps" }, message: "start must name a step",
          whenOperandAbsent: "skip",
        },
      },
    });
    expect(direct(skipping, { start: "nope" })).toStrictEqual([]);
    // The opt-out is scoped to ABSENCE: where the operand exists, the lane
    // still decides. A marker that switched the rule off entirely would
    // pass the test above and be worthless.
    expect(direct(skipping, { steps: {}, start: "nope" })).toStrictEqual([
      { path: "start", message: "start must name a step" },
    ]);
  });

  it("a MISSING REQUIRED container suppresses instead — the missing-key finding IS the trace", () => {
    const required = fixed("root", {
      steps: {
        kind: "map.open", tag: "steps", rows: ROWS, containerMessage: "steps must be a map",
        keyLaneAt: "container", entry: text("step"), presence: { required: true },
      },
      start: {
        kind: "string", tag: "start", rows: ROWS,
        memberOf: { relation: "memberOf", target: { keysOf: "$.steps" }, message: "start must name a step" },
      },
    }, { missingMessage: 'missing required key "{key}"' });
    expect(direct(required, { start: "nope" })).toStrictEqual([
      { path: "$", message: 'missing required key "steps"' },
    ]);
  });

  it("an EMPTY container does NOT suppress it — the set exists and is empty", () => {
    expect(direct(root, { steps: {}, start: "nope" })).toStrictEqual([
      { path: "start", message: "start must name a step" },
    ]);
  });

  it("a path THROUGH an empty open map decides as the empty set, not as undecided", () => {
    // The live declaration's own case: `collect("$.steps.*.role")` over
    // `steps: {}`. No entry is ever evaluated, so no position below `.*`
    // is either — but there is nothing to wait FOR, and the answer the
    // walk can already see is the empty set. Waiting on instances that do
    // not exist would leave the rule undecided forever.
    const deep = fixed("root", {
      steps: {
        kind: "map.open", tag: "steps", rows: ROWS, containerMessage: "c", keyLaneAt: "container",
        entry: fixed("step", { role: text("role") }),
      },
      pick: {
        kind: "string", tag: "pick", rows: ROWS,
        memberOf: { relation: "memberOf", target: { collect: "$.steps.*.role" }, message: "no such role" },
      },
    });
    expect(direct(deep, { steps: {}, pick: "ghost" })).toStrictEqual([
      { path: "pick", message: "no such role" },
    ]);
    expect(direct(deep, { steps: { a: { role: "ghost" } }, pick: "ghost" })).toStrictEqual([]);
  });

  // ITEM 3's built semantics, stated as a test rather than as prose: a
  // materialized default takes the SAME path an authored value takes. So
  // it is validated, it COMPLETES its position, and it participates in
  // every rule that watches that position — including rules whose
  // legality is template-dependent, which is the interaction the ruling
  // asked to be pinned down either way.
  describe("a materialized `default:` is validated like any other value", () => {
    const withDefault = fixed("root", {
      roles: {
        kind: "map.open", tag: "roles", rows: ROWS, containerMessage: "c", keyLaneAt: "container",
        entry: { kind: "raw", tag: "role", rows: ROWS } as NodeDecl,
      },
      steps: {
        kind: "map.open", tag: "steps", rows: ROWS, containerMessage: "c", keyLaneAt: "container",
        entry: fixed("step", {
          role: {
            kind: "string", tag: "srole", rows: ROWS, default: "implementer",
            memberOf: { relation: "memberOf", target: { keysOf: "$.roles" }, message: "{path}: no such role" },
          },
        }),
      },
    });

    it("the default is CHECKED against a rule whose answer depends on the template", () => {
      expect(direct(withDefault, { roles: { implementer: {} }, steps: { s: {} } })).toStrictEqual([]);
      expect(direct(withDefault, { roles: { reviewer: {} }, steps: { s: {} } })).toStrictEqual([
        { path: "steps.s.role", message: "steps.s.role: no such role" },
      ]);
    });

    it("the default reaches the admitted form as the VALIDATED value", () => {
      const run = runSurface(surface(withDefault), { roles: { implementer: {} }, steps: { s: {} } }, {
        channel: { kind: "direct" },
      });
      expect(run.normalized).toStrictEqual({ roles: { implementer: {} }, steps: { s: { role: "implementer" } } });
    });

    it("an ENUM default is stored under its stored token, not its authored spelling", () => {
      const enumDefault = fixed("root", {
        mode: {
          kind: "enum", tag: "mode", rows: ROWS, message: "bad mode", default: "deferredKickoff",
          members: [{ value: "deferredKickoff", store: "deferred_kickoff" }, { value: "now" }],
        },
      });
      const run = runSurface(surface(enumDefault), {}, { channel: { kind: "direct" } });
      expect(run.findings).toStrictEqual([]);
      expect(run.normalized).toStrictEqual({ mode: "deferred_kickoff" });
    });
  });

  // PER-INSTANCE BOOKKEEPING. Run state used to be keyed by the
  // DECLARATION, which every instance of it shares — so one open-map
  // entry's broken field decided another entry's rule. This is the exact
  // probe that showed it, kept as the guard: entry A reports its own
  // undecided lane, and adding a DIFFERENT, broken entry B must not make
  // A's report disappear.
  it("one open-map entry's failure cannot decide ANOTHER entry's rule", () => {
    const crosstalk = fixed("root", {
      items: {
        kind: "map.open", tag: "items", rows: ROWS, containerMessage: "c", keyLaneAt: "container",
        entry: fixed("item", {
          tag: text("itag", { grammar: { re: "^[a-z]+$", message: "{path}: tag must be lower-case" } }),
          pick: text("ipick", {
            memberOf: { relation: "memberOf", target: { collect: "^.tag" }, message: "{path}: not the tag" },
          }),
        }),
      },
    });
    const undecidedA = {
      path: "items.A.pick",
      message:
        "internal validator failure: the memberOf lane could not be decided — " +
        'its operand collect("^.tag") names a position the walk never evaluated',
    };
    // A alone: its own operand is absent, so its lane is undecided.
    expect(direct(crosstalk, { items: { A: { pick: "zzz" } } })).toStrictEqual([undecidedA]);
    // A with a BROKEN sibling B: B's finding appears and A's SURVIVES.
    expect(direct(crosstalk, { items: { A: { pick: "zzz" }, B: { tag: "BAD", pick: "zzz" } } })).toStrictEqual([
      { path: "items.B.tag", message: "items.B.tag: tag must be lower-case" },
      undecidedA,
    ]);
  });

  // ADR-019 D10 — the ENTRY-BELTED membership construct. The two fixtures
  // below are the dress-rehearsal round's own probes, kept verbatim: they
  // are what an outside author hit when they tried to declare the ch13
  // context-block surface and found `keysOf` treated a reference to a
  // broken entry as resolved.
  describe("the entry belt (D10): key existence alone is not resolution", () => {
    /** ONE builder taking the relation, so belt and non-belt differ in
     * exactly one reference — the sensitivity proof is structural. */
    const catalogSurface = (relation: "keysOf" | "validKeysOf"): NodeDecl =>
      fixed("root", {
        contextBlocks: {
          kind: "map.open", tag: "cat", rows: ROWS, keyLaneAt: "segment",
          containerMessage: "contextBlocks must be a map; got {value}",
          entry: fixed("entry", {
            body: text("body", { presence: { required: true }, nonempty: { message: "{path}: body must not be empty" } }),
          }, { containerMessage: "{path}: entry must be a map", missingMessage: '{path}: entry is missing "{key}"' }),
        },
        refs: {
          kind: "list", tag: "refs", rows: ROWS, containerMessage: "refs must be a list", memberLaneAt: "index",
          member: text("ref"),
          memberOf: {
            relation: "memberOf", target: { [relation]: "$.contextBlocks" } as never,
            message: "{path}: ref {valueJson} does not resolve",
          },
        },
      });
    const belt = catalogSurface("validKeysOf");
    const unbelted = catalogSurface("keysOf");
    const unresolved = { path: "refs[0]", message: 'refs[0]: ref "alpha" does not resolve' };

    it("(a) a ref to a key whose entry is MALFORMED does not resolve — both channels", () => {
      const value = { contextBlocks: { alpha: {} }, refs: ["alpha"] };
      const entryFinding = { path: "contextBlocks.alpha", message: 'contextBlocks.alpha: entry is missing "body"' };
      expect(direct(belt, value)).toStrictEqual([entryFinding, unresolved]);
      expect(fromFile(belt, "contextBlocks:\n  alpha: {}\nrefs:\n  - alpha\n")).toStrictEqual([
        entryFinding, unresolved,
      ]);
      // SENSITIVITY: the same surface with `keysOf` calls it resolved.
      expect(direct(unbelted, value)).toStrictEqual([entryFinding]);
    });

    it("(a2) a ref to a key whose entry is NOT A MAP does not resolve", () => {
      const value = { contextBlocks: { alpha: 7 }, refs: ["alpha"] };
      const entryFinding = { path: "contextBlocks.alpha", message: "contextBlocks.alpha: entry must be a map" };
      expect(direct(belt, value)).toStrictEqual([entryFinding, unresolved]);
      expect(direct(unbelted, value)).toStrictEqual([entryFinding]);
    });

    it("(b) a WRONG-KIND catalog yields its container finding AND the per-site ref finding", () => {
      // The construct's broken-operand semantics: an operand that cannot
      // resolve anything answers EMPTY, never "unreliable", so the site's
      // own finding is never suppressed by the container's failure.
      const value = { contextBlocks: [], refs: ["alpha"] };
      const container = { path: "contextBlocks", message: "contextBlocks must be a map; got a list" };
      expect(direct(belt, value)).toStrictEqual([container, unresolved]);
      expect(fromFile(belt, "contextBlocks: []\nrefs:\n  - alpha\n")).toStrictEqual([container, unresolved]);
      // SENSITIVITY: with `keysOf` the container's failure suppresses it.
      expect(direct(unbelted, value)).toStrictEqual([container]);
    });

    it("(b2) an ABSENT catalog with a ref issued still reports per site", () => {
      expect(direct(belt, { refs: ["alpha"] })).toStrictEqual([unresolved]);
    });

    it("NEGATIVE: a legal ref to a VALID entry still resolves, on both channels", () => {
      const value = { contextBlocks: { alpha: { body: "x" } }, refs: ["alpha"] };
      expect(direct(belt, value)).toStrictEqual([]);
      expect(fromFile(belt, "contextBlocks:\n  alpha:\n    body: x\nrefs:\n  - alpha\n")).toStrictEqual([]);
      // ...and an empty catalog with no refs is legal.
      expect(direct(belt, { contextBlocks: {}, refs: [] })).toStrictEqual([]);
    });

    // Round 11's own fixture, kept verbatim. Two catalogs whose entries
    // belt on EACH OTHER answered differently depending on which was
    // declared first — one finding in one order, two in the other. The
    // order-dependence IS the disease, so the guard proves NEITHER order
    // sneaks through.
    describe("a belt RING is refused at load, in both declaration orders", () => {
      const catalogOf = (tag: string, target: string): NodeDecl =>
        ({
          kind: "map.open", tag, rows: ROWS, containerMessage: `${tag} must be a map`, keyLaneAt: "segment",
          entry: text(`${tag}-e`, {
            memberOf: { relation: "memberOf", target: { validKeysOf: target }, message: "{path}: {valueJson} unresolved" },
          }),
        });
      const ringSurface = (fields: Record<string, NodeDecl>): SurfaceDecl => surface(fixed("root", fields));

      it("a declared first", () => {
        expect(() => defineSurface(ringSurface({ a: catalogOf("a", "$.b"), b: catalogOf("b", "$.a") }))).toThrow(
          SurfaceDeclarationError,
        );
      });

      it("b declared first — the order that used to give a DIFFERENT answer", () => {
        expect(() => defineSurface(ringSurface({ b: catalogOf("b", "$.a"), a: catalogOf("a", "$.b") }))).toThrow(
          SurfaceDeclarationError,
        );
      });

      it("a belt on ITSELF is a ring of one", () => {
        expect(closureProblems(ringSurface({ a: catalogOf("a", "$.a") }))).toHaveLength(1);
      });

      it("NEGATIVE: a ONE-DIRECTIONAL belt between two catalogs still loads, and works", () => {
        const oneWay = ringSurface({
          a: catalogOf("a", "$.b"),
          b: {
            kind: "map.open", tag: "b", rows: ROWS, containerMessage: "b must be a map", keyLaneAt: "segment",
            entry: text("b-e"),
          },
        });
        expect(closureProblems(oneWay)).toStrictEqual([]);
        expect(direct(oneWay.root, { a: { one: "beta" }, b: { beta: "x" } })).toStrictEqual([]);
        expect(direct(oneWay.root, { a: { one: "ghost" }, b: { beta: "x" } })).toStrictEqual([
          { path: "a.one", message: 'a.one: "ghost" unresolved' },
        ]);
      });
    });

    it("NEGATIVE: suppression elsewhere is UNCHANGED — a broken sibling entry belts only itself", () => {
      const value = { contextBlocks: { alpha: { body: "x" }, beta: {} }, refs: ["alpha", "beta"] };
      expect(direct(belt, value)).toStrictEqual([
        { path: "contextBlocks.beta", message: 'contextBlocks.beta: entry is missing "body"' },
        { path: "refs[1]", message: 'refs[1]: ref "beta" does not resolve' },
      ]);
    });
  });

  it("an ALIASED map with a non-string key reports at BOTH its addresses", () => {
    // The deep key-stringness scan deduped by OBJECT IDENTITY, so one
    // anchored map sitting at two document addresses was reported at the
    // first and passed over in silence at the rest — while two separate
    // maps with the same content reported at both.
    const scanned = fixed("root", {
      gates: {
        kind: "map.open", tag: "g", rows: ROWS, containerMessage: "c", keyLaneAt: "container",
        deepKeyStringness: { message: "{path}: map keys must be strings", channel: "file" },
        entry: { kind: "raw", tag: "gv", rows: ROWS } as NodeDecl,
      },
    });
    const aliased = fromFile(scanned, "gates:\n  a: &bad\n    1: x\n  b: *bad\n");
    expect(aliased).toStrictEqual([
      { path: "gates.a", message: "gates.a: map keys must be strings" },
      { path: "gates.b", message: "gates.b: map keys must be strings" },
    ]);
    // DISCRIMINATES: a genuine cycle must still TERMINATE, and report its
    // key once rather than once per lap. The substrate's own acyclic lane
    // reports the back-edge separately, which is its job, not this scan's.
    const cyclic = fromFile(scanned, "gates:\n  a: &loop\n    1: x\n    self: *loop\n");
    expect(cyclic).toStrictEqual([
      { path: "gates.a.self", message: "cyclic value structure: the resolved template graph must be acyclic" },
      { path: "gates.a", message: "gates.a: map keys must be strings" },
    ]);
  });

  it("one list member's failure cannot decide a SIBLING member's rule", () => {
    // The disjointFrom pass rebuilt each member's frame with the LIST's
    // address, so every member shared one tag status and a single broken
    // member suppressed them all — in either order, which is what made it
    // invisible to an order-swap test.
    const list = fixed("root", {
      names: {
        kind: "map.open", tag: "names", rows: ROWS, containerMessage: "c", keyLaneAt: "container",
        entry: text("nv"),
      },
      ids: {
        kind: "list", tag: "ids", rows: ROWS, containerMessage: "c", memberLaneAt: "index",
        member: text("idm", { grammar: { re: "^[a-z]+$", message: "{path}: bad id" }, gating: true }),
        disjointFrom: {
          relation: "disjointFrom", target: { keysOf: "$.names" },
          message: "{path}: must not be a name", dependsOn: ["idm"],
        },
      },
    });
    const run = (ids: readonly string[]): readonly ValidationFinding[] =>
      direct(list, { names: { taken: "1" }, ids });

    expect(run(["taken"])).toStrictEqual([{ path: "ids[0]", message: "ids[0]: must not be a name" }]);
    // A broken sibling in EITHER order leaves the clean member's lane alone.
    expect(run(["BAD", "taken"])).toStrictEqual([
      { path: "ids[0]", message: "ids[0]: bad id" },
      { path: "ids[1]", message: "ids[1]: must not be a name" },
    ]);
    expect(run(["taken", "BAD"])).toStrictEqual([
      { path: "ids[1]", message: "ids[1]: bad id" },
      { path: "ids[0]", message: "ids[0]: must not be a name" },
    ]);
  });

  it("DISCRIMINATES: the BROKEN member's OWN dependent lane is still suppressed", () => {
    // Without this, "no crosstalk" could be achieved by never suppressing.
    const list = fixed("root", {
      names: {
        kind: "map.open", tag: "names", rows: ROWS, containerMessage: "c", keyLaneAt: "container",
        entry: text("nv"),
      },
      ids: {
        kind: "list", tag: "ids", rows: ROWS, containerMessage: "c", memberLaneAt: "index",
        member: text("idm", { grammar: { re: "^[a-z]+$", message: "{path}: bad id" }, gating: true }),
        disjointFrom: {
          relation: "disjointFrom", target: { keysOf: "$.names" },
          message: "{path}: must not be a name", dependsOn: ["idm"],
        },
      },
    });
    // "TAKEN" is both malformed AND a name: only its type lane reports.
    expect(direct(list, { names: { TAKEN: "1" }, ids: ["TAKEN"] })).toStrictEqual([
      { path: "ids[0]", message: "ids[0]: bad id" },
    ]);
  });

  it("a malformed KEY does not make the whole map unusable to rules that read it", () => {
    // The key lane occupies no position in the value graph, so it has no
    // segment of its own — and sharing the map's address made one bad key
    // mark the entire map unreliable, silently suppressing every rule
    // selecting over it. It has its own per-key lane now.
    const keyed = fixed("root", {
      steps: {
        kind: "map.open", tag: "steps", rows: ROWS, containerMessage: "c", keyLaneAt: "container",
        keyClass: text("skey", { grammar: { re: "^[a-z]+$", message: "{path}: bad key" } }),
        entry: text("sv"),
      } as NodeDecl,
      pick: text("pick", {
        memberOf: { relation: "memberOf", target: { keysOf: "$.steps" }, message: "{path}: not a step" },
      }),
    });
    const notAStep = { path: "pick", message: "pick: not a step" };
    expect(direct(keyed, { steps: { good: "1" }, pick: "ghost" })).toStrictEqual([notAStep]);
    expect(direct(keyed, { steps: { BAD: "1", good: "1" }, pick: "ghost" })).toStrictEqual([
      { path: "steps", message: "steps: bad key" },
      notAStep,
    ]);
  });

  it("a delegation the registry REFUSES is an undischarged obligation, reported", () => {
    const binding = fixed("root", {
      uses: text("u"),
      config: { kind: "delegate", tag: "cfg", rows: ROWS, registry: "gateCatalog", by: "uses", beltMessage: "b" },
    });
    const catalog: GateCatalog = {
      resolve: (name) =>
        name === "known"
          ? ({ requiresRuntimeContext: false, validateAndNormalizeConfig: () => ({ ok: true, effective: { E: 1 } }) } as unknown as GateRegistration)
          : null,
    };
    expect(direct(binding, { uses: "known", config: {} }, undefined, catalog)).toStrictEqual([]);
    expect(direct(binding, { uses: "ghost", config: {} }, undefined, catalog)).toStrictEqual([
      {
        path: "config",
        message:
          "internal validator failure: the delegated config could not be validated — the registry has no " +
          'registration named "ghost", so nothing checked it and it does not reach the admitted value',
      },
    ]);
  });

  it("...and stays quiet where a sibling lane already failed and IS the trace", () => {
    const guarded = fixed("root", {
      uses: text("u", {
        memberOf: { relation: "memberOf", target: { injected: "gateCatalog" }, message: "{path}: no such gate" },
      }),
      config: {
        kind: "delegate", tag: "cfg", rows: ROWS, registry: "gateCatalog", by: "uses",
        beltMessage: "b", dependsOn: ["u"],
      },
    });
    const catalog: GateCatalog = { resolve: () => null };
    expect(direct(guarded, { uses: "ghost", config: {} }, undefined, catalog)).toStrictEqual([
      { path: "uses", message: "uses: no such gate" },
    ]);
  });

  it("a declared `gating` key class makes the selector's operand unreliable", () => {
    const gated = fixed("root", {
      steps: {
        kind: "map.open",
        tag: "steps",
        rows: ROWS,
        containerMessage: "steps must be a map",
        keyClass: { ...(idish as { kind: "string" }), gating: true } as NodeDecl,
        keyLaneAt: "container",
        entry: text("step"),
      } as NodeDecl,
      start: {
        kind: "string",
        tag: "start",
        rows: ROWS,
        memberOf: { relation: "memberOf", target: { keysOf: "$.steps" }, message: "start must name a step" },
      },
    });
    const messages = direct(gated, { steps: { BAD: "x" }, start: "nope" }).map((f) => f.message);
    expect(messages).toContain("steps: bad id");
    expect(messages).not.toContain("start must name a step");
  });
});

describe("the typed subset on a plain map (ADR-019 D11)", () => {
  const refsNode = (over: Partial<NodeDecl> = {}): NodeDecl =>
    ({
      kind: "list",
      tag: "refs",
      rows: ROWS,
      containerMessage: "{path} must be a list",
      memberLaneAt: "index",
      member: idish,
      ...over,
    }) as NodeDecl;

  const plain = (fields?: Record<string, NodeDecl>): NodeDecl =>
    ({
      kind: "map.plain",
      tag: "cfg",
      rows: ROWS,
      containerMessage: "{path} must be a plain map",
      canonicalJsonSafe: { message: "{path} must be canonical-JSON-safe" },
      ...(fields === undefined ? {} : { fields }),
    });

  const root = fixed("root", { cfg: plain({ refs: refsNode() }) });

  it("a declared field is validated when present, and SIBLING open keys stay legal — both channels", () => {
    const bad = { cfg: { refs: ["BAD"], free: { anything: 1 } } };
    const expected = [{ path: "cfg.refs[0]", message: "cfg.refs[0]: bad id" }];
    expect(direct(root, bad)).toStrictEqual(expected);
    expect(fromFile(root, "cfg:\n  refs:\n    - BAD\n  free:\n    anything: 1\n")).toStrictEqual(expected);
    expect(direct(root, { cfg: { refs: ["ok"], free: { anything: 1 } } })).toStrictEqual([]);
  });

  it("DISCRIMINATES: without the typed subset the same value passes untouched", () => {
    expect(direct(fixed("root", { cfg: plain() }), { cfg: { refs: ["BAD"] } })).toStrictEqual([]);
  });

  it("the ch13-C4 shape end-to-end: the entry belt reaches THROUGH the plain map", () => {
    const catalog: NodeDecl = {
      kind: "map.open",
      tag: "cat",
      rows: ROWS,
      containerMessage: "{path} must be a map",
      keyLaneAt: "container",
      entry: fixed(
        "entry",
        { body: text("body", { presence: { required: true }, nonempty: { message: "{path} must be nonempty" } }) },
        { missingMessage: 'missing required key "{key}"' },
      ),
    };
    const belted = refsNode({
      memberOf: {
        relation: "memberOf",
        target: { validKeysOf: "$.contextBlocks" },
        code: "unresolved_context_block_ref",
        message: "context block ref {valueJson} does not resolve to an entry",
      },
    });
    const c4Root = fixed("root", { contextBlocks: catalog, cfg: plain({ promptConcernRefs: belted }) });

    expect(
      direct(c4Root, { contextBlocks: { alpha: { body: "text" } }, cfg: { promptConcernRefs: ["ghost"] } }),
    ).toStrictEqual([
      {
        path: "cfg.promptConcernRefs[0]",
        message: 'context block ref "ghost" does not resolve to an entry',
        code: "unresolved_context_block_ref",
      },
    ]);

    // A ref to a key whose entry is MALFORMED: the entry's own finding AND
    // the per-site unresolved finding — D10's belt, reached from inside the
    // plain map.
    expect(
      direct(c4Root, { contextBlocks: { alpha: {} }, cfg: { promptConcernRefs: ["alpha"] } }),
    ).toStrictEqual([
      { path: "contextBlocks.alpha", message: 'missing required key "body"' },
      {
        path: "cfg.promptConcernRefs[0]",
        message: 'context block ref "alpha" does not resolve to an entry',
        code: "unresolved_context_block_ref",
      },
    ]);
  });

  it("an ABSENT typed field is legal and produces nothing", () => {
    expect(direct(root, { cfg: { free: 1 } })).toStrictEqual([]);
    expect(direct(root, { cfg: {} })).toStrictEqual([]);
  });

  it("a NON-PLAIN container suppresses the typed-field lanes — the container finding is the trace", () => {
    class Forged {
      readonly refs = ["BAD"];
    }
    expect(direct(root, { cfg: new Forged() })).toStrictEqual([
      { path: "cfg", message: "cfg must be a plain map" },
    ]);
  });

  it("a DIRECT-channel JS Map is not a plain map — refused, subset suppressed", () => {
    // The direct channel's input contract is the domain type: a plain
    // record. A string-keyed Map would realize to a record and slip the
    // plain gate, running the subset over a container the vocabulary's
    // own contract excludes.
    expect(direct(root, { cfg: new Map([["refs", ["BAD"]]]) })).toStrictEqual([
      { path: "cfg", message: "cfg must be a plain map" },
    ]);
  });

  it("DISCRIMINATES: the FILE channel's resolved maps ARE Maps and still realize", () => {
    expect(fromFile(root, "cfg:\n  refs:\n    - BAD\n")).toStrictEqual([
      { path: "cfg.refs[0]", message: "cfg.refs[0]: bad id" },
    ]);
  });

  it("a CANONICAL violation likewise gates the subset", () => {
    expect(direct(root, { cfg: { refs: ["BAD"], broken: Number.NaN } })).toStrictEqual([
      { path: "cfg", message: "cfg must be canonical-JSON-safe" },
    ]);
  });

  it("validation transforms NOTHING — the plain map passes through as authored", () => {
    const value = { cfg: { refs: ["ok"], free: { nested: true } } };
    const result = runSurface(surface(root), value, { channel: { kind: "direct" }, catalog: NO_CATALOG });
    expect(result.findings).toStrictEqual([]);
    expect((result.normalized as Record<string, unknown>)["cfg"]).toStrictEqual({
      refs: ["ok"],
      free: { nested: true },
    });
  });
});

describe("selectors", () => {
  const root = fixed("root", {
    a: { kind: "map.open", tag: "a", rows: ROWS, containerMessage: "c", keyLaneAt: "container", entry: text("ae") },
    b: { kind: "list", tag: "b", rows: ROWS, containerMessage: "c", memberLaneAt: "index", member: text("be") },
    pick: {
      kind: "string",
      tag: "pick",
      rows: ROWS,
      memberOf: {
        relation: "memberOf",
        target: { union: [{ keysOf: "$.a" }, { valuesOf: "$.b" }] },
        message: "pick must be in a or b",
      },
    },
  });

  it("a union of keys(..) and values(..) accepts a member of EITHER", () => {
    expect(direct(root, { a: { x: "1" }, b: ["y"], pick: "y" })).toStrictEqual([]);
    expect(direct(root, { a: { x: "1" }, b: ["y"], pick: "x" })).toStrictEqual([]);
  });

  it("a member of NEITHER is a finding", () => {
    expect(direct(root, { a: { x: "1" }, b: ["y"], pick: "z" })).toStrictEqual([
      { path: "pick", message: "pick must be in a or b" },
    ]);
  });

  it("an operand not yet evaluated is DEFERRED, not read early", () => {
    // `pick` is declared BEFORE `a`, so its operand is pending when the
    // field is reached; a naive engine reads an empty set and reports.
    const early = fixed("root", {
      pick: {
        kind: "string",
        tag: "pick",
        rows: ROWS,
        memberOf: { relation: "memberOf", target: { keysOf: "$.a" }, message: "pick must be in a" },
      },
      a: { kind: "map.open", tag: "a", rows: ROWS, containerMessage: "c", keyLaneAt: "container", entry: text("ae") },
    });
    expect(direct(early, { pick: "x", a: { x: "1" } })).toStrictEqual([]);
    expect(direct(early, { pick: "zz", a: { x: "1" } })).toStrictEqual([
      { path: "pick", message: "pick must be in a" },
    ]);
  });

  it("the `^` root resolves from the citing node's OWN container, never from itself", () => {
    const nested = fixed("root", {
      step: fixed("step", {
        edges: { kind: "map.open", tag: "edges", rows: ROWS, containerMessage: "c", keyLaneAt: "container", entry: text("t") },
        gates: {
          kind: "map.open",
          tag: "gates",
          rows: ROWS,
          containerMessage: "c",
          keyLaneAt: "container",
          keysSubsetOf: { relation: "keysSubsetOf", target: { keysOf: "^.edges" }, message: "dead config: '{key}'" },
          entry: text("g"),
        },
      }),
    });
    expect(direct(nested, { step: { edges: { GO: "x" }, gates: { GO: "g" } } })).toStrictEqual([]);
    expect(direct(nested, { step: { edges: { GO: "x" }, gates: { NOPE: "g" } } })).toStrictEqual([
      { path: "step.gates.NOPE", message: "dead config: 'NOPE'" },
    ]);
  });
});

describe("the equals cross rule reports each direction at its own grain", () => {
  const root = fixed("root", {
    declared: { kind: "map.open", tag: "declared", rows: ROWS, containerMessage: "c", keyLaneAt: "container", entry: text("d") },
    users: { kind: "map.open", tag: "users", rows: ROWS, containerMessage: "c", keyLaneAt: "container", entry: text("u") },
  });
  const extra: Partial<SurfaceDecl> = {
    crossRules: [
      {
        tag: "roleset",
        rows: ROWS,
        relation: "equals",
        left: { keysOf: "$.declared" },
        right: { collect: "$.users.*" },
        missingFromLeft: { at: "declared", message: "{valueJson} is used but not declared" },
        missingFromRight: { at: "declared.{valueRaw}", message: "{valueJson} is declared but not used" },
      },
    ],
  };

  it("used-but-undeclared reports at the container", () => {
    expect(direct(root, { declared: {}, users: { u1: "ghost" } }, extra)).toStrictEqual([
      { path: "declared", message: '"ghost" is used but not declared' },
    ]);
  });

  it("declared-but-unused reports at the ENTRY", () => {
    expect(direct(root, { declared: { spare: "x" }, users: {} }, extra)).toStrictEqual([
      { path: "declared.spare", message: '"spare" is declared but not used' },
    ]);
  });

  it("a matched set produces nothing, and duplicates on the used side do not double-report", () => {
    expect(direct(root, { declared: { r: "x" }, users: { a: "r", b: "r" } }, extra)).toStrictEqual([]);
  });
});

describe("the delegate hand-off", () => {
  const binding = fixed("binding", {
    uses: text("uses", { presence: { required: true, foldedIntoTypeLane: true }, typeMessage: "uses must be a string" }),
    config: {
      kind: "delegate",
      tag: "config",
      rows: ROWS,
      registry: "gateCatalog",
      by: "uses",
      presence: { required: true, foldedIntoTypeLane: true },
      dependsOn: ["uses"],
      beltMessage: "evaluator '{valueRaw}' reported a config failure without findings",
    },
  });
  const registration = (result: unknown): GateRegistration =>
    ({
      implementation: "declarative",
      execution: "inline",
      requiresRuntimeContext: false,
      validateAndNormalizeConfig: () => result,
      evaluate: () => ({ verdict: "allow" }),
    }) as unknown as GateRegistration;
  const catalogOf = (result: unknown): GateCatalog => ({ resolve: () => registration(result) });

  it("the registration's config-relative findings are PREFIXED with the binding's address", () => {
    const catalog = catalogOf({ ok: false, findings: [{ path: "value", message: "value is required", code: "c1" }] });
    expect(direct(binding, { uses: "a.b", config: {} }, undefined, catalog)).toStrictEqual([
      { path: "config.value", message: "value is required", code: "c1" },
    ]);
  });

  it("a config-relative path of \"\" addresses the config object itself", () => {
    const catalog = catalogOf({ ok: false, findings: [{ path: "", message: "config must be a map" }] });
    expect(direct(binding, { uses: "a.b", config: 3 }, undefined, catalog)).toStrictEqual([
      { path: "config", message: "config must be a map" },
    ]);
  });

  it("the delegation BELT: a failure reported with ZERO findings still blocks", () => {
    const catalog = catalogOf({ ok: false, findings: [] });
    expect(direct(binding, { uses: "a.b", config: {} }, undefined, catalog)).toStrictEqual([
      { path: "config", message: "evaluator 'a.b' reported a config failure without findings" },
    ]);
  });

  it("a failed `uses` SUPPRESSES the hand-off — nothing is resolved against a broken id", () => {
    const catalog = catalogOf({ ok: false, findings: [{ path: "", message: "config must be a map" }] });
    expect(direct(binding, { uses: 9, config: {} }, undefined, catalog)).toStrictEqual([
      { path: "uses", message: "uses must be a string" },
    ]);
  });

  it("an ABSENT config still reaches the registration — presence is the evaluator's business", () => {
    const catalog = catalogOf({ ok: false, findings: [{ path: "", message: "a config is required" }] });
    expect(direct(binding, { uses: "a.b" }, undefined, catalog)).toStrictEqual([
      { path: "config", message: "a config is required" },
    ]);
  });
});

describe("the normalizer (ADR-019 D3) — derivation, never validation", () => {
  it("expands a COMPLETE per-edge flag map, all-false when no advancing set is declared", () => {
    const value = {
      steps: {
        a: { transitions: { GO: "b" } },
        b: { transitions: {} },
      },
    };
    normalize(templateFormat, value, new Map());
    expect((value.steps.a as Record<string, unknown>)["advancesRound"]).toStrictEqual({ GO: false });
    expect((value.steps.b as Record<string, unknown>)["advancesRound"]).toStrictEqual({});
  });

  it("expands against the DECLARED advancing set", () => {
    const value = {
      round: { advanceOnArrivalAt: ["b"] },
      steps: { a: { transitions: { GO: "b", STAY: "a" } } },
    };
    normalize(templateFormat, value, new Map());
    expect((value.steps.a as Record<string, unknown>)["advancesRound"]).toStrictEqual({ GO: true, STAY: false });
  });

  it("PRODUCER MONOPOLY: a pre-populated flag map is recomputed, never trusted", () => {
    const value = { steps: { a: { transitions: { GO: "b" }, advancesRound: { GO: true, PHANTOM: true } } } };
    normalize(templateFormat, value, new Map());
    expect((value.steps.a as Record<string, unknown>)["advancesRound"]).toStrictEqual({ GO: false });
  });

  it("writes each registration's EFFECTIVE config into the binding's single config surface", () => {
    const value = {
      steps: { a: { transitions: { GO: "b" }, gates: { GO: [{ uses: "x.y", config: { authored: 1 } }] } } },
    };
    const effective = new Map<string, unknown>([[instanceKey(["steps", "a", "gates", "GO", 0]), { resolved: 2 }]]);
    normalize(templateFormat, value, effective);
    // ch13v2-C13 grew the carry list by `contextBlockRefs`. This lane calls
    // the normalizer DIRECTLY over a hand-built value, so the declared
    // default never materialized and the carry copies an absent field —
    // the one state C13's ordering clause warns of, unreachable through
    // admission (where the default fills during the walk) and reachable
    // only here.
    expect((value.steps.a.gates as Record<string, unknown>)["GO"]).toStrictEqual([
      { uses: "x.y", contextBlockRefs: undefined, config: { resolved: 2 } },
    ]);
  });

  // The hooks walk their operand paths with the ENGINE's descent. Before
  // that, this module read them with a reader of its own that took `*` for
  // a literal key: a declared path the gate had certified reached nothing
  // and the hook returned having written NOTHING. Both fixtures below are
  // paths the LIVE declaration does not use but the language permits, and
  // both are what the next chapter is free to write.
  const openMap = (tag: string, entry: NodeDecl): NodeDecl =>
    ({ kind: "map.open", tag, rows: ROWS, containerMessage: "c", keyLaneAt: "container", entry });
  const listOf = (tag: string, member: NodeDecl): NodeDecl =>
    ({ kind: "list", tag, rows: ROWS, containerMessage: "c", memberLaneAt: "index", member });
  const hooked = (root: NodeDecl, hook: Record<string, unknown>): SurfaceDecl =>
    ({
      substrate: templateFormat.substrate, valueClasses: {}, crossRules: [], root,
      normalizers: [{ tag: "n", rows: ROWS, ...hook }],
    }) as unknown as SurfaceDecl;

  it("expandAdvancesRound walks an operand path that CONTAINS a wildcard", () => {
    const surface = hooked(
      fixed("r", {
        adv: listOf("adv", text("advm")),
        outer: openMap("o", fixed("oe", {
          inner: openMap("i", fixed("ie", {
            transitions: openMap("t", text("tv")),
            flags: { kind: "raw", tag: "fl", rows: ROWS },
          })),
        })),
      }),
      { hook: "expandAdvancesRound", over: "$.outer.*.inner", edges: [{ from: "transitions" }], advanceSet: "$.adv", into: "flags" },
    );
    expect(closureProblems(surface)).toStrictEqual([]);
    const value = { adv: ["b"], outer: { one: { inner: { s: { transitions: { GO: "b", STAY: "a" } } } } } };
    normalize(surface, value, new Map());
    expect(value.outer.one.inner.s).toHaveProperty("flags", { GO: true, STAY: false });
  });

  it("expandAdvancesRound reads EVERY position a wildcard operand reaches", () => {
    const surface = hooked(
      fixed("r", {
        sets: openMap("os", listOf("sl", text("sm"))),
        steps: openMap("st", fixed("ste", {
          transitions: openMap("t", text("tv")),
          flags: { kind: "raw", tag: "fl", rows: ROWS },
        })),
      }),
      { hook: "expandAdvancesRound", over: "$.steps", edges: [{ from: "transitions" }], advanceSet: "$.sets.*", into: "flags" },
    );
    expect(closureProblems(surface)).toStrictEqual([]);
    const value = { sets: { first: ["a"], second: ["b"] }, steps: { s: { transitions: { TO_A: "a", TO_B: "b" } } } };
    normalize(surface, value, new Map());
    // Reading only the first match left TO_B false with nothing saying so.
    expect(value.steps.s).toHaveProperty("flags", { TO_A: true, TO_B: true });
  });

  it("two binding addresses that RENDER alike keep their own effective configs", () => {
    // `["a.b"]` and `["a","b"]` render to the same string. Keyed by that
    // string, the second binding's effective config overwrote the first's.
    const surface = hooked(
      fixed("r", {
        pipes: openMap("p", listOf("pl", fixed("bind", {
          uses: text("bu"),
          config: { kind: "raw", tag: "bcfg", rows: ROWS },
        }))),
      }),
      { hook: "materializeEffectiveConfigs", over: "$.pipes", carry: ["uses"], into: "config" },
    );
    expect(closureProblems(surface)).toStrictEqual([]);
    const value = { pipes: { "a.b": [{ uses: "x" }], a: { b: [{ uses: "y" }] } } };
    const effective = new Map<string, unknown>([
      [instanceKey(["pipes", "a.b", 0]), { which: "dotted" }],
      [instanceKey(["pipes", "a", "b", 0]), { which: "nested" }],
    ]);
    normalize(surface, value, effective);
    // Each address keeps its own; neither is overwritten by the other.
    expect(value.pipes["a.b"]).toStrictEqual([{ uses: "x", config: { which: "dotted" } }]);
  });

  it("materializeEffectiveConfigs walks an operand path with a SECOND wildcard", () => {
    const surface = hooked(
      fixed("r", {
        outer: openMap("o", fixed("oe", {
          mid: openMap("m", fixed("me", {
            pipes: openMap("p", listOf("pl", fixed("bind", {
              uses: text("bu"),
              config: { kind: "raw", tag: "bcfg", rows: ROWS },
            }))),
          })),
        })),
      }),
      { hook: "materializeEffectiveConfigs", over: "$.outer.*.mid.*.pipes", carry: ["uses"], into: "config" },
    );
    expect(closureProblems(surface)).toStrictEqual([]);
    const value = { outer: { A: { mid: { B: { pipes: { C: [{ uses: "x.y", extra: "dropped" }] } } } } } };
    // The per-binding key is the WALK's own grain, two wildcards deep —
    // `extra` disappearing is the proof the hook actually rebuilt.
    const effective = new Map<string, unknown>([
      [instanceKey(["outer", "A", "mid", "B", "pipes", "C", 0]), { resolved: 2 }],
    ]);
    normalize(surface, value, effective);
    expect(value.outer.A.mid.B.pipes.C).toStrictEqual([{ uses: "x.y", config: { resolved: 2 } }]);
  });
});

describe("authored text that collides with a JavaScript object's own members", () => {
  // A workflow author may legitimately name a step `constructor` or write
  // `toString` as a scalar. Every registry the declaration keys by
  // AUTHORED text must be read as an OWN property; a bracket read returns
  // the prototype's member, which is not a message, and using it as one
  // ends the walk instead of reporting a finding.
  const withRemovedKeys = (removedKeys: Record<string, string>): NodeDecl =>
    ({
      kind: "map.fixed", tag: "m", rows: ["x"],
      containerMessage: "c", unknownMessage: "unknown key {valueJson}",
      removedKeys,
      fields: { a: { kind: "string", tag: "a", rows: ["x"], typeMessage: "t" } },
    });

  for (const collider of ["constructor", "toString", "hasOwnProperty", "valueOf"]) {
    it(`an unknown key named ${collider} yields the declared finding, not a crash`, () => {
      expect(direct(withRemovedKeys({}), { [collider]: 1 })).toStrictEqual([
        { path: collider, message: `unknown key ${JSON.stringify(collider)}` },
      ]);
    });
  }

  it("DISCRIMINATES: a key the registry really declares still yields its migration text", () => {
    // If the lookup were simply disabled, this would report "unknown key"
    // instead — so the fix is an own-property read, not a removed feature.
    expect(direct(withRemovedKeys({ old: "`old` is retired" }), { old: 1 })).toStrictEqual([
      { path: "old", message: "`old` is retired" },
    ]);
    expect(direct(withRemovedKeys({ constructor: "`constructor` is retired" }), { constructor: 1 })).toStrictEqual([
      { path: "constructor", message: "`constructor` is retired" },
    ]);
  });

  const union = (removedValues: Record<string, string>): NodeDecl =>
    ({
      kind: "union", tag: "u", rows: ["x"], literals: ["none"], removedValues,
      message: "illegal value {valueJson}",
    });

  for (const collider of ["constructor", "toString"]) {
    it(`a scalar value of ${collider} yields the declared union finding, not a crash`, () => {
      expect(direct(union({}), collider)).toStrictEqual([
        { path: "$", message: `illegal value ${JSON.stringify(collider)}` },
      ]);
    });
  }

  it("DISCRIMINATES: a value the removal registry really declares still yields its migration text", () => {
    expect(direct(union({ legacy: "`legacy` is retired" }), "legacy")).toStrictEqual([
      { path: "$", message: "`legacy` is retired" },
    ]);
  });
});

describe("the vocabulary's doc comments, checked against the engine (B2 conformance)", () => {
  it("a string node whose only scalar lane is a grammar REPORTS a non-string", () => {
    const decl = fixed("m", {
      a: { kind: "string", tag: "a", rows: ROWS, grammar: { re: "^[a-z]+$", message: "a must match {grammar}" } },
    });
    expect(direct(decl, { a: 9 })).toStrictEqual([{ path: "a", message: "a must match ^[a-z]+$" }]);
  });

  it("DISCRIMINATES: a node whose MEMBERSHIP lane owns the fault still stays silent on type", () => {
    // `start` and a transition target report one finding for both faults,
    // so the grammar lane must NOT take over where a membership lane exists.
    const decl = fixed("m", {
      names: { kind: "map.open", tag: "n", rows: ROWS, containerMessage: "c", keyLaneAt: "container",
        entry: text("ne") },
      pick: { kind: "string", tag: "p", rows: ROWS,
        memberOf: { relation: "memberOf", target: { keysOf: "$.names" }, message: "pick must name one; got {value}" } },
    });
    expect(direct(decl, { names: { a: "1" }, pick: 9 })).toStrictEqual([
      { path: "pick", message: "pick must name one; got 9" },
    ]);
  });

  it("a declared resolved belt still applies after the source ladder passes", () => {
    const decl = fixed("m", {
      n: { kind: "integer", tag: "n", rows: ROWS, sourceForm: "plainDecimalInteger",
        resolvedForm: { safeInteger: true, min: 5, message: "n must be >= 5" } },
    });
    // The ladder proves the SOURCE form and has its own built-in bound of
    // 1; a declared stricter bound is a separate obligation.
    expect(fromFile(decl, "n: 3\n")).toStrictEqual([{ path: "n", message: "n must be >= 5" }]);
    expect(direct(decl, { n: 3 })).toStrictEqual([{ path: "n", message: "n must be >= 5" }]);
  });

  it("DISCRIMINATES: a value satisfying both the ladder and the belt passes on both channels", () => {
    const decl = fixed("m", {
      n: { kind: "integer", tag: "n", rows: ROWS, sourceForm: "plainDecimalInteger",
        resolvedForm: { safeInteger: true, min: 5, message: "n must be >= 5" } },
    });
    expect(fromFile(decl, "n: 7\n")).toStrictEqual([]);
    expect(direct(decl, { n: 7 })).toStrictEqual([]);
  });

  it("the duplicate lane's `at` grain is its OWN, not the member lane's", () => {
    const atIndex = (memberLaneAt: "container" | "index"): NodeDecl =>
      ({ kind: "list", tag: "l", rows: ROWS, containerMessage: "c", memberLaneAt, member: text("m"),
        unique: { grain: "perOccurrence", at: "index", message: "dup {valueRaw}" } });
    // Both member grains must give the duplicate lane the SAME index path.
    expect(direct(atIndex("container"), ["a", "a"])).toStrictEqual([{ path: "$[1]", message: "dup a" }]);
    expect(direct(atIndex("index"), ["a", "a"])).toStrictEqual([{ path: "$[1]", message: "dup a" }]);
  });

  it("DISCRIMINATES: `at: container` still addresses the container under either member grain", () => {
    const atContainer = (memberLaneAt: "container" | "index"): NodeDecl =>
      ({ kind: "list", tag: "l", rows: ROWS, containerMessage: "c", memberLaneAt, member: text("m"),
        unique: { grain: "perOccurrence", at: "container", message: "dup {valueRaw}" } });
    expect(direct(atContainer("container"), ["a", "a"])).toStrictEqual([{ path: "$", message: "dup a" }]);
    expect(direct(atContainer("index"), ["a", "a"])).toStrictEqual([{ path: "$", message: "dup a" }]);
  });

  describe("`dependsOn` suppression is per-INSTANCE, so document order cannot change the answer", () => {
    const surface = (): SurfaceDecl =>
      ({
        substrate: templateFormat.substrate, valueClasses: {}, crossRules: [], normalizers: [],
        root: fixed("r", {
          names: { kind: "map.open", tag: "nm", rows: ROWS, containerMessage: "c", keyLaneAt: "container",
            entry: text("nmv") },
          steps: { kind: "map.open", tag: "st", rows: ROWS, containerMessage: "c", keyLaneAt: "container",
            entry: fixed("ste", {
              role: { kind: "string", tag: "ro", rows: ROWS, typeMessage: "bad role",
                grammar: { re: "^[a-z]+$", message: "bad role" }, gating: true },
              pick: { kind: "string", tag: "pk", rows: ROWS,
                memberOf: { relation: "memberOf", target: { keysOf: "$.names" },
                  message: "pick {valueRaw} is not a name", dependsOn: ["ro"] } },
            }) },
        }),
      });
    const good = { role: "r", pick: "ghost" };
    const bad = { role: "BAD", pick: "x" };
    const run = (steps: Record<string, unknown>): readonly ValidationFinding[] =>
      runSurface(surface(), { names: { a: "1" }, steps }, { channel: { kind: "direct" } }).findings;

    it("a VALID entry reports whether it comes before or after a broken sibling entry", () => {
      const expected = { path: "steps.good.pick", message: "pick ghost is not a name" };
      expect(run({ good })).toContainEqual(expected);
      expect(run({ bad, good })).toContainEqual(expected);
      expect(run({ good, bad })).toContainEqual(expected);
    });

    it("DISCRIMINATES: the BROKEN entry's own dependent lane is still suppressed", () => {
      // Without this, "no leakage" could be achieved by never suppressing.
      expect(run({ bad: { role: "BAD", pick: "ghost" } })).toStrictEqual([
        { path: "steps.bad.role", message: "bad role" },
      ]);
    });
  });
});

describe("the declaration GATE: a declaration that is not closed never becomes a surface", () => {
  // F8's correction. Each guard is ONE builder taking `ok`, so the broken
  // and corrected surfaces are structurally identical BY CONSTRUCTION —
  // "exactly one reference differs" is guaranteed rather than eyeballed.
  // Each guard then asserts the broken form yields EXACTLY ONE problem
  // (so it names what it caught) and the corrected form yields none (so
  // the guard is not firing on the shape itself).
  interface Guard {
    readonly claim: string;
    readonly make: (ok: boolean) => SurfaceDecl;
    readonly problem: RegExp;
  }

  const surfaceOf = (over: Partial<SurfaceDecl>, root: Record<string, unknown>): SurfaceDecl =>
    ({
      substrate: templateFormat.substrate,
      valueClasses: {
        idClass: { kind: "string", tag: "vc", rows: ["x"], grammar: { re: "^[a-z]+$", message: "bad" } },
      },
      crossRules: [],
      normalizers: [],
      root: { kind: "map.fixed", tag: "root", rows: ["x"], containerMessage: "c", unknownMessage: "u", ...root },
      ...over,
    }) as SurfaceDecl;

  const plainRoot = { fields: { id: { kind: "valueClass", tag: "id", rows: ["x"], valueClass: "idClass" } } };
  const base = (over: Partial<SurfaceDecl> = {}, root: Record<string, unknown> = plainRoot): SurfaceDecl =>
    surfaceOf(over, root);

  /** A root with an open map `names` plus a scalar that selects over it. */
  const selecting = (relation: "keysOf" | "valuesOf" | "collect", path: string): SurfaceDecl =>
    base({}, {
      fields: {
        names: { kind: "map.open", tag: "n", rows: ["x"], containerMessage: "c", keyLaneAt: "container",
          entry: { kind: "string", tag: "ne", rows: ["x"], typeMessage: "t" } },
        pick: { kind: "string", tag: "p", rows: ["x"],
          memberOf: { relation: "memberOf", target: { [relation]: path } as never, message: "m" } },
      },
    });

  /** ch13v2-C13's nested-source hook (ADR-019 D12): the SOURCE is a typed
   * field of a plain map the landing entry carries, so the guard must
   * resolve one level IN — and name that typed subset when it cannot. */
  const liftSurface = (over: Partial<Record<"over" | "from" | "source" | "into", string>>): SurfaceDecl =>
    base({
      normalizers: [{
        tag: "n-l", rows: ["x"], hook: "liftNestedList",
        over: over.over ?? "$.roles", from: over.from ?? "config",
        source: over.source ?? "refs", into: over.into ?? "lifted",
      }],
    }, {
      fields: {
        roles: { kind: "map.open", tag: "ro", rows: ["x"], containerMessage: "c", keyLaneAt: "container",
          entry: { kind: "map.fixed", tag: "roe", rows: ["x"], containerMessage: "c", unknownMessage: "u",
            fields: {
              config: { kind: "map.plain", tag: "cfg", rows: ["x"], containerMessage: "c",
                canonicalJsonSafe: { message: "k" },
                fields: { refs: { kind: "list", tag: "rl", rows: ["x"], containerMessage: "c", memberLaneAt: "index",
                  member: { kind: "string", tag: "rm", rows: ["x"], typeMessage: "t" } } } },
              lifted: { kind: "raw", tag: "lf", rows: ["x"], channel: "direct" },
            } } },
      },
    });

  const hookSurface = (
    over: Partial<Record<"over" | "into" | "advanceSet", string>> & { edges?: readonly EdgeSourceDecl[] },
  ): SurfaceDecl =>
    base({
      normalizers: [{
        tag: "n-h", rows: ["x"], hook: "expandAdvancesRound",
        over: over.over ?? "$.steps", edges: over.edges ?? [{ from: "transitions" }],
        advanceSet: over.advanceSet ?? "$.adv", into: over.into ?? "flags",
      }],
    }, {
      fields: {
        adv: { kind: "list", tag: "adv", rows: ["x"], containerMessage: "c", memberLaneAt: "index",
          member: { kind: "string", tag: "advm", rows: ["x"], typeMessage: "t" } },
        steps: { kind: "map.open", tag: "st", rows: ["x"], containerMessage: "c", keyLaneAt: "container",
          entry: { kind: "map.fixed", tag: "ste", rows: ["x"], containerMessage: "c", unknownMessage: "u",
            fields: {
              transitions: { kind: "map.open", tag: "tr", rows: ["x"], containerMessage: "c", keyLaneAt: "container",
                entry: { kind: "string", tag: "trv", rows: ["x"], typeMessage: "t" } },
              // ADR-019 D13's second edge class shape: an open map whose
              // ENTRY is a fixed map, so `targetAt` has a field to resolve.
              choices: { kind: "map.open", tag: "ch", rows: ["x"], containerMessage: "c", keyLaneAt: "container",
                entry: { kind: "map.fixed", tag: "che", rows: ["x"], containerMessage: "c", unknownMessage: "u",
                  fields: { target: { kind: "string", tag: "cht", rows: ["x"], typeMessage: "t" } } } },
              flags: { kind: "raw", tag: "fl", rows: ["x"], channel: "direct" },
            } } },
      },
    });

  /** Two structurally identical open maps under one fixed map, one of whose
   * field names CONTAINS a dot. The hook names one or the other, so the
   * broken and corrected forms differ in exactly that one reference. */
  const dottedHook = (ok: boolean): SurfaceDecl => {
    const openMap = (tag: string): Record<string, unknown> => ({
      kind: "map.open", tag, rows: ["x"], containerMessage: "c", keyLaneAt: "container",
      entry: { kind: "map.fixed", tag: `${tag}e`, rows: ["x"], containerMessage: "c", unknownMessage: "u",
        fields: {
          transitions: { kind: "map.open", tag: `${tag}t`, rows: ["x"], containerMessage: "c",
            keyLaneAt: "container", entry: { kind: "string", tag: `${tag}v`, rows: ["x"], typeMessage: "t" } },
          flags: { kind: "raw", tag: `${tag}f`, rows: ["x"] },
        } },
    });
    return base({
      normalizers: [{
        tag: "n-h", rows: ["x"], hook: "expandAdvancesRound",
        over: ok ? "$.dotted.plain" : "$.dotted.a.b",
        edges: [{ from: "transitions" }], advanceSet: "$.adv", into: "flags",
      }],
    }, {
      fields: {
        adv: { kind: "list", tag: "adv", rows: ["x"], containerMessage: "c", memberLaneAt: "index",
          member: { kind: "string", tag: "advm", rows: ["x"], typeMessage: "t" } },
        dotted: { kind: "map.fixed", tag: "d", rows: ["x"], containerMessage: "c", unknownMessage: "u",
          fields: { "a.b": openMap("ab"), plain: openMap("pl") } },
      },
    });
  };

  const binding = (by: string): SurfaceDecl =>
    base({}, {
      fields: {
        uses: { kind: "string", tag: "u", rows: ["x"], typeMessage: "t" },
        config: { kind: "delegate", tag: "cfg", rows: ["x"], registry: "gateCatalog", by,
          beltMessage: "b", dependsOn: ["u"] },
      },
    });

  const GUARDS: readonly Guard[] = [
    { claim: "an unknown value-class name — the measured shame case",
      make: (ok) => base({}, { fields: { id: { kind: "valueClass", tag: "id", rows: ["x"], valueClass: ok ? "idClass" : "TYPO" } } }),
      problem: /value class "TYPO" is not declared/u },
    { claim: "a selector path in the documented-but-inert `..` form",
      make: (ok) => selecting("keysOf", ok ? "$.names" : "..names"),
      problem: /selector path "\.\.names" must start with "\$"/u },
    { claim: "a selector path with an empty segment",
      make: (ok) => selecting("keysOf", ok ? "$.names" : "$..names"),
      problem: /has an empty segment/u },
    { claim: "a selector path with `*` inside a segment",
      make: (ok) => selecting("keysOf", ok ? "$.names" : "$.na*mes"),
      problem: /"\*" is legal only as a whole segment/u },
    { claim: "a selector path that is well-formed but addresses NO declared position",
      make: (ok) => selecting("keysOf", ok ? "$.names" : "$.nmaes"),
      problem: /addresses "\$\.nmaes", which the declaration does not declare/u },
    { claim: "a selector whose target exists but is the WRONG KIND for the relation",
      make: (ok) => selecting(ok ? "keysOf" : "valuesOf", "$.names"),
      problem: /valuesOf\("\$\.names"\) addresses a map\.open whose value can be map; valuesOf reads only list/u },
    { claim: "a delegate reading a sibling field the enclosing map does not declare",
      make: (ok) => binding(ok ? "uses" : "ues"),
      problem: /delegate reads sibling field "ues"/u },
    { claim: "a channel mark where the engine does not read one",
      make: (ok) => base({}, { fields: { list: { kind: "list", tag: "l", rows: ["x"], containerMessage: "c", memberLaneAt: "index",
        member: { kind: "string", tag: "lm", rows: ["x"], typeMessage: "t", ...(ok ? {} : { channel: "file" }) } } } }),
      problem: /node "lm" carries channel, which the vocabulary does not admit on a string at this position \(member\)/u },
    { claim: "a dependsOn naming a tag nothing declares",
      make: (ok) => base({}, {
        fields: {
          uses: { kind: "string", tag: "u", rows: ["x"], typeMessage: "t" },
          config: { kind: "delegate", tag: "c", rows: ["x"], registry: "gateCatalog", by: "uses",
            beltMessage: "b", dependsOn: [ok ? "u" : "no-such-tag"] },
        } }),
      problem: /dependsOn names "no-such-tag", which is not a declared tag/u },
    { claim: "a dependsOn naming a declared tag the engine never gives a status",
      make: (ok) => base({}, {
        fields: {
          uses: { kind: "string", tag: "u", rows: ["x"], typeMessage: "t" },
          config: { kind: "delegate", tag: "c", rows: ["x"], registry: "gateCatalog", by: "uses",
            beltMessage: "b", dependsOn: [ok ? "u" : "d-read"] },
        } }),
      problem: /is declared but is not a node the engine records a status for/u },
    { claim: "a dependsOn INSIDE a value-class definition",
      make: (ok) => base({
        valueClasses: {
          idClass: { kind: "string", tag: "vc", rows: ["x"], grammar: { re: "^[a-z]+$", message: "bad" },
            memberOf: { relation: "memberOf", target: { keysOf: "$.names" }, message: "m",
              dependsOn: [ok ? "n" : "ghost-tag"] } },
        },
      }, {
        fields: {
          names: { kind: "map.open", tag: "n", rows: ["x"], containerMessage: "c", keyLaneAt: "container",
            entry: { kind: "string", tag: "ne", rows: ["x"], typeMessage: "t" } },
          id: { kind: "valueClass", tag: "id", rows: ["x"], valueClass: "idClass" },
        } }),
      problem: /dependsOn names "ghost-tag", which is not a declared tag/u },
    { claim: "a dependsOn INSIDE a typed plain-map field naming a tag nothing declares (D11)",
      make: (ok) => base({}, {
        fields: {
          names: { kind: "map.open", tag: "n", rows: ["x"], containerMessage: "c", keyLaneAt: "container",
            entry: { kind: "string", tag: "ne", rows: ["x"], typeMessage: "t" } },
          cfg: { kind: "map.plain", tag: "cfg", rows: ["x"], containerMessage: "c",
            canonicalJsonSafe: { message: "k" },
            fields: { pick: { kind: "string", tag: "pick", rows: ["x"], typeMessage: "t",
              memberOf: { relation: "memberOf", target: { keysOf: "$.names" }, message: "m",
                dependsOn: [ok ? "n" : "ghost-tag"] } } } },
        } }),
      problem: /dependsOn names "ghost-tag", which is not a declared tag/u },
    { claim: "a tag declared twice",
      make: (ok) => base({}, { fields: { id: { kind: "valueClass", tag: ok ? "id" : "root", rows: ["x"], valueClass: "idClass" } } }),
      problem: /tag "root" is declared more than once/u },
    { claim: "a node citing no ratified row",
      make: (ok) => base({}, { fields: { id: { kind: "valueClass", tag: "id", rows: ok ? ["x"] : [], valueClass: "idClass" } } }),
      problem: /cites no ratified row/u },
    { claim: "an issue code outside the closed namespace",
      make: (ok) => base({}, { fields: { id: { kind: "enum", tag: "id", rows: ["x"], members: [{ value: "a" }], message: "m",
        code: ok ? "gate_evaluator_unavailable" : "made_up_code" } } }),
      problem: /issue code "made_up_code" is outside the declared namespace/u },
    { claim: "a message using a placeholder the engine does not supply",
      make: (ok) => base({}, { ...plainRoot, unknownMessage: ok ? "unknown {key}" : "unknown {notASlot}" }),
      problem: /unknown placeholder \{notASlot\}/u },
    { claim: "a SUBSTRATE message using a placeholder the engine does not supply",
      make: (ok) => ({
        ...base(),
        substrate: {
          ...templateFormat.substrate,
          read: { ...templateFormat.substrate.read, message: ok ? "bad bytes" : "bad bytes {nope}" },
        },
      }),
      problem: /substrate\.read: unknown placeholder \{nope\}/u },
    { claim: "a finding-path template written in selector syntax",
      make: (ok) => base({
        crossRules: [{ tag: "eq", rows: ["x"], relation: "equals",
          left: { keysOf: "$.names" }, right: { keysOf: "$.names" },
          missingFromLeft: { at: ok ? "names" : "$.names", message: "m" },
          missingFromRight: { at: "names", message: "m" } }],
      }, {
        fields: { names: { kind: "map.open", tag: "n", rows: ["x"], containerMessage: "c", keyLaneAt: "container",
          entry: { kind: "string", tag: "ne", rows: ["x"], typeMessage: "t" } } },
      }),
      problem: /uses selector syntax; a finding path is rendered, not walked/u },
    { claim: "a normalizer operand path that is not document-rooted",
      make: (ok) => hookSurface({ over: ok ? "$.steps" : "steps" }),
      problem: /normalizer path "steps" must start with "\$"/u },
    { claim: "a normalizer operand path with `*` inside a segment",
      make: (ok) => hookSurface({ over: ok ? "$.steps" : "$.ste*ps" }),
      problem: /normalizer path "\$\.ste\*ps" uses "\*" inside a segment/u },
    { claim: "a normalizer operand path addressing NO declared position",
      make: (ok) => hookSurface({ over: ok ? "$.steps" : "$.setps" }),
      problem: /over: "\$\.setps" is not a declared position/u },
    { claim: "a normalizer reading an entry field the entry does not declare",
      make: (ok) => hookSurface({ edges: [{ from: ok ? "transitions" : "trasitions" }] }),
      problem: /edges: "trasitions" is not a field of "\$\.steps\.\*"/u },
    { claim: "a normalizer WRITING a field the entry does not declare",
      make: (ok) => hookSurface({ into: ok ? "flags" : "flgas" }),
      problem: /into: "flgas" is not a field of "\$\.steps\.\*"/u },
    // --- the four SILENT cases: the gate said "closed" over an inert rule.
    { claim: "collect over a target whose value can be a non-string — readable for no input",
      make: (ok) => base({}, {
        fields: {
          count: { kind: "integer", tag: "cnt", rows: ["x"], resolvedForm: { safeInteger: true, min: 1, message: "m" } },
          label: { kind: "string", tag: "lbl", rows: ["x"], typeMessage: "t" },
          pick: { kind: "string", tag: "p", rows: ["x"],
            memberOf: { relation: "memberOf", target: { collect: ok ? "$.label" : "$.count" }, message: "m" } },
        } }),
      problem: /collect\("\$\.count"\) addresses a integer whose value can be other; collect reads only string/u },
    { claim: "keysOf over a UNION that can also hold a string — readable for only some inputs",
      make: (ok) => base({}, {
        fields: {
          names: { kind: "map.open", tag: "n", rows: ["x"], containerMessage: "c", keyLaneAt: "container",
            entry: { kind: "string", tag: "ne", rows: ["x"], typeMessage: "t" } },
          rt: { kind: "union", tag: "rt", rows: ["x"], literals: ["none"], message: "m",
            mapCase: { kind: "map.fixed", tag: "rtm", rows: ["x"], containerMessage: "c", unknownMessage: "u",
              fields: { kind: { kind: "string", tag: "rtk", rows: ["x"], typeMessage: "t" } } } },
          pick: { kind: "string", tag: "p", rows: ["x"],
            memberOf: { relation: "memberOf", target: { keysOf: ok ? "$.names" : "$.rt" }, message: "m" } },
        } }),
      problem: /keysOf\("\$\.rt"\) addresses a union whose value can be map \| string/u },
    { claim: "a selector naming the engine-INTERNAL list-member address",
      make: (ok) => base({}, {
        fields: {
          items: { kind: "list", tag: "it", rows: ["x"], containerMessage: "c", memberLaneAt: "index",
            member: { kind: "string", tag: "itm", rows: ["x"], typeMessage: "t" } },
          pick: { kind: "string", tag: "p", rows: ["x"],
            memberOf: { relation: "memberOf", target: { valuesOf: ok ? "$.items" : "$.items[]" }, message: "m" } },
        } }),
      problem: /addresses "\$\.items\[\]", which the declaration does not declare/u },
    { claim: "a selector path through a declared field name that CONTAINS a dot",
      make: (ok) => base({}, {
        fields: {
          dotted: { kind: "map.fixed", tag: "d", rows: ["x"], containerMessage: "c", unknownMessage: "u",
            fields: {
              "a.b": { kind: "string", tag: "ab", rows: ["x"], typeMessage: "t" },
              plain: { kind: "string", tag: "pl", rows: ["x"], typeMessage: "t" },
            } },
          pick: { kind: "string", tag: "p", rows: ["x"],
            memberOf: { relation: "memberOf", target: { collect: ok ? "$.dotted.plain" : "$.dotted.a.b" }, message: "m" } },
        } }),
      problem: /addresses "\$\.dotted\.a\.b", which the declaration does not declare/u },
    // --- the four the ROUND AFTER those four found, and which the single
    // --- resolver closes by construction rather than one patch each.
    { claim: "a selector reading a target the engine visits on ONE channel only",
      make: (ok) => base({}, {
        fields: {
          names: { kind: "map.open", tag: "n", rows: ["x"], containerMessage: "c", keyLaneAt: "container",
            entry: { kind: "string", tag: "ne", rows: ["x"], typeMessage: "t" },
            ...(ok ? {} : { channel: "direct" }) },
          pick: { kind: "string", tag: "p", rows: ["x"],
            memberOf: { relation: "memberOf", target: { keysOf: "$.names" }, message: "m" } },
        } }),
      problem: /passes through "\$\.names", which is declared channel "direct"/u },
    { claim: "a selector reading `*` at a FIXED map, where the walk records no wildcard position",
      make: (ok) => base({}, {
        fields: {
          m: { kind: "map.fixed", tag: "m", rows: ["x"], containerMessage: "c", unknownMessage: "u",
            fields: {
              "*": { kind: "string", tag: "star", rows: ["x"], typeMessage: "t" },
              plain: { kind: "string", tag: "pl", rows: ["x"], typeMessage: "t" },
            } },
          pick: { kind: "string", tag: "p", rows: ["x"],
            memberOf: { relation: "memberOf", target: { collect: ok ? "$.m.plain" : "$.m.*" }, message: "m" } },
        } }),
      problem: /addresses "\$\.m\.\*", which the declaration does not declare/u },
    { claim: "a delegate reading a sibling field whose value is not a string",
      make: (ok) => base({}, {
        fields: {
          uses: { kind: "string", tag: "u", rows: ["x"], typeMessage: "t" },
          count: { kind: "integer", tag: "cnt", rows: ["x"], resolvedForm: { safeInteger: true, min: 1, message: "m" } },
          config: { kind: "delegate", tag: "cfg", rows: ["x"], registry: "gateCatalog", by: ok ? "uses" : "count",
            beltMessage: "b", dependsOn: ["u"] },
        } }),
      problem: /delegate reads sibling field "count", whose value can be other; the registration is looked up by a string/u },
    { claim: "a `^` selector on a LIST MEMBER, whose container is an array the walk cannot read",
      make: (ok) => base({}, {
        fields: {
          names: { kind: "map.open", tag: "n", rows: ["x"], containerMessage: "c", keyLaneAt: "container",
            entry: { kind: "string", tag: "ne", rows: ["x"], typeMessage: "t" } },
          items: { kind: "list", tag: "it", rows: ["x"], containerMessage: "c", memberLaneAt: "index",
            member: { kind: "string", tag: "itm", rows: ["x"], typeMessage: "t",
              memberOf: { relation: "memberOf", target: { keysOf: ok ? "$.names" : "^.names" }, message: "m" } } },
        } }),
      problem: /addresses "\$\.items\.names", which the declaration does not declare/u },
    { claim: "a normalizer operand path through a declared field name that CONTAINS a dot",
      make: (ok) => dottedHook(ok),
      problem: /over: "\$\.dotted\.a\.b" is not a declared position/u },
    { claim: "a declared default the field it defaults would REFUSE",
      make: (ok) => base({}, {
        fields: {
          name: { kind: "string", tag: "nm", rows: ["x"],
            grammar: { re: "^[a-z]+$", message: "{path} must be lower-case letters" },
            default: ok ? "abc" : "ABC" },
        } }),
      problem: /default "ABC" is not legal for the field it defaults — \$ must be lower-case letters/u },
    { claim: "a default written as `undefined`, which materializes nothing",
      make: (ok) => base({}, {
        fields: {
          name: { kind: "string", tag: "nm", rows: ["x"], typeMessage: "t", ...(ok ? {} : { default: undefined }) },
        } }),
      problem: /default is written as `undefined`, which materializes nothing/u },
    { claim: "two entry BELTS whose operands form a ring",
      make: (ok) => base({}, {
        fields: {
          a: { kind: "map.open", tag: "ca", rows: ["x"], containerMessage: "c", keyLaneAt: "segment",
            entry: { kind: "string", tag: "cae", rows: ["x"], typeMessage: "t",
              memberOf: { relation: "memberOf", target: { validKeysOf: "$.b" }, message: "m" } } },
          b: { kind: "map.open", tag: "cb", rows: ["x"], containerMessage: "c", keyLaneAt: "segment",
            entry: { kind: "string", tag: "cbe", rows: ["x"], typeMessage: "t",
              memberOf: { relation: "memberOf", target: { validKeysOf: ok ? "$.c" : "$.a" }, message: "m" } } },
          c: { kind: "map.open", tag: "cc", rows: ["x"], containerMessage: "c", keyLaneAt: "segment",
            entry: { kind: "string", tag: "cce", rows: ["x"], typeMessage: "t" } },
        } }),
      problem: /belt ring: the validKeysOf operands form a cycle \(\$\.a -> \$\.b -> \$\.a\)/u },
    { claim: "an entry BELT over a node that has no entries to belt",
      make: (ok) => base({}, {
        fields: {
          names: { kind: "map.open", tag: "n", rows: ["x"], containerMessage: "c", keyLaneAt: "container",
            entry: { kind: "string", tag: "ne", rows: ["x"], typeMessage: "t" } },
          fixedMap: { kind: "map.fixed", tag: "fm", rows: ["x"], containerMessage: "c", unknownMessage: "u",
            fields: { a: { kind: "string", tag: "fa", rows: ["x"], typeMessage: "t" } } },
          pick: { kind: "string", tag: "p", rows: ["x"],
            memberOf: { relation: "memberOf", target: { validKeysOf: ok ? "$.names" : "$.fixedMap" }, message: "m" } },
        } }),
      problem: /validKeysOf\("\$\.fixedMap"\) addresses a map\.fixed; the entry belt measures the keys of a map\.open/u },
    { claim: "a default declared where no absence exists to fill",
      make: (ok) => base({
        valueClasses: {
          idClass: { kind: "string", tag: "vc", rows: ["x"], grammar: { re: "^[a-z]+$", message: "bad" },
            ...(ok ? {} : { default: "abc" }) },
        },
      }, { fields: { id: { kind: "valueClass", tag: "id", rows: ["x"], valueClass: "idClass" } } }),
      problem: /node "vc" carries default, which the vocabulary does not admit on a string at this position \(valueClass\)/u },
    { claim: "a value class that resolves to ITSELF — the walk would never terminate",
      make: (ok) => base({
        valueClasses: {
          idClass: { kind: "string", tag: "vc", rows: ["x"], grammar: { re: "^[a-z]+$", message: "bad" } },
          ring: { kind: "valueClass", tag: "vr", rows: ["x"], valueClass: ok ? "idClass" : "ring" },
        },
      }, { fields: { id: { kind: "valueClass", tag: "id", rows: ["x"], valueClass: "ring" } } }),
      problem: /value class "ring" resolves to itself \(ring -> ring\); the walk would follow it without end/u },
    { claim: "a value class that resolves to itself around a RING of two",
      make: (ok) => base({
        valueClasses: {
          idClass: { kind: "string", tag: "vc", rows: ["x"], grammar: { re: "^[a-z]+$", message: "bad" } },
          a: { kind: "valueClass", tag: "va", rows: ["x"], valueClass: "b" },
          b: { kind: "valueClass", tag: "vb", rows: ["x"], valueClass: ok ? "idClass" : "a" },
        },
      }, { fields: { id: { kind: "valueClass", tag: "id", rows: ["x"], valueClass: "a" } } }),
      problem: /value class "a" resolves to itself \(a -> b -> a\)/u },
    { claim: "a grammar that is not a valid regular expression",
      make: (ok) => base({ valueClasses: { idClass: { kind: "string", tag: "vc", rows: ["x"],
        grammar: { re: ok ? "^[a-z]+$" : "^[a-z", message: "bad" } } } }),
      problem: /is not a valid regular expression/u },
    // --- D11: attribute applicability is LOUD at the widened grain — an
    // --- attribute the engine does not read on a plain-map field refuses
    // --- the load instead of riding along inert.
    { claim: "a `presence` on a TYPED plain-map field, where no missing-key lane exists (D11)",
      make: (ok) => base({}, { fields: { cfg: { kind: "map.plain", tag: "cfg", rows: ["x"], containerMessage: "c",
        canonicalJsonSafe: { message: "k" },
        fields: { refs: { kind: "string", tag: "cfgr", rows: ["x"], typeMessage: "t",
          ...(ok ? {} : { presence: { required: true } }) } } } } }),
      problem: /node "cfgr" carries presence, which the vocabulary does not admit on a string at this position \(plainField\)/u },
    { claim: "a `default` on a TYPED plain-map field (D11)",
      make: (ok) => base({}, { fields: { cfg: { kind: "map.plain", tag: "cfg", rows: ["x"], containerMessage: "c",
        canonicalJsonSafe: { message: "k" },
        fields: { refs: { kind: "string", tag: "cfgr", rows: ["x"], typeMessage: "t",
          ...(ok ? {} : { default: "abc" }) } } } } }),
      problem: /node "cfgr" carries default, which the vocabulary does not admit on a string at this position \(plainField\)/u },
    { claim: "a `channel` on a TYPED plain-map field (D11)",
      make: (ok) => base({}, { fields: { cfg: { kind: "map.plain", tag: "cfg", rows: ["x"], containerMessage: "c",
        canonicalJsonSafe: { message: "k" },
        fields: { refs: { kind: "string", tag: "cfgr", rows: ["x"], typeMessage: "t",
          ...(ok ? {} : { channel: "file" }) } } } } }),
      problem: /node "cfgr" carries channel, which the vocabulary does not admit on a string at this position \(plainField\)/u },
    // --- ch13-p1a family 4: the NESTED-SOURCE hook's load guard. Its
    // operand paths and every dynamic field name it reads or writes, the
    // nested source included — a name that reaches nothing would leave
    // the hook writing the empty list forever, and an empty list is a
    // legal answer, so nothing downstream would ever red.
    { claim: "a nested-source normalizer operand path addressing NO declared position",
      make: (ok) => liftSurface({ over: ok ? "$.roles" : "$.rolse" }),
      problem: /over: "\$\.rolse" is not a declared position/u },
    { claim: "a nested-source normalizer landing on a node of the WRONG KIND",
      make: (ok) => liftSurface({ over: ok ? "$.roles" : "$.roles.*" }),
      problem: /over: "\$\.roles\.\*" is a map\.fixed; the hook walks a map\.open/u },
    { claim: "a nested-source normalizer reading an entry field the entry does not declare",
      make: (ok) => liftSurface({ from: ok ? "config" : "cofnig" }),
      problem: /from: "cofnig" is not a field of "\$\.roles\.\*" \(fields: config, lifted\)/u },
    { claim: "a nested-source normalizer reading a name the SOURCE map does not type",
      make: (ok) => liftSurface({ source: ok ? "refs" : "rfes" }),
      problem: /source: "rfes" is not a field of "\$\.roles\.\*\.config" \(typed fields: refs\)/u },
    { claim: "a nested-source normalizer WRITING a field the entry does not declare",
      make: (ok) => liftSurface({ into: ok ? "lifted" : "liftde" }),
      problem: /into: "liftde" is not a field of "\$\.roles\.\*" \(fields: config, lifted\)/u },
    // --- packet ch14-p1 family 9: the WIDENED hook's own load guard
    // (ADR-019 D13(a)) and the applicability inventory (D13's condition 2).
    { claim: "an edge CLASS naming a field the landing entry does not declare",
      make: (ok) => hookSurface({ edges: [{ from: ok ? "transitions" : "trasitions" }] }),
      problem: /edges: "trasitions" is not a field of "\$\.steps\.\*"/u },
    { claim: "an edge CLASS landing on a node of the WRONG KIND",
      make: (ok) => hookSurface({ edges: [{ from: ok ? "transitions" : "flags" }] }),
      problem: /edges: "flags" is a raw; an edge class walks a map\.open/u },
    { claim: "an edge class's per-class TARGET EXTRACTION naming a field the edge entry does not declare",
      make: (ok) => hookSurface({ edges: [{ from: "choices", targetAt: ok ? "target" : "trget" }] }),
      problem: /edges\.targetAt: "trget" is not a field of "\$\.steps\.\*\.choices\.\*" \(fields: target\)/u },
    { claim: "an issue code outside the closed namespace at the CONTAINER grain (the widened position)",
      make: (ok) => base({}, { fields: { m: { kind: "map.open", tag: "m", rows: ["x"], containerMessage: "c",
        keyLaneAt: "container", entry: { kind: "string", tag: "me", rows: ["x"], typeMessage: "t" },
        code: ok ? "gate_evaluator_unavailable" : "made_up_container_code" } } }),
      problem: /issue code "made_up_container_code" is outside the declared namespace/u },
    { claim: "an issue code outside the closed namespace at the UNKNOWN-KEY grain (the widened position)",
      make: (ok) => base({}, { fields: { m: { kind: "map.fixed", tag: "m", rows: ["x"], containerMessage: "c",
        unknownMessage: "u", fields: {}, code: ok ? "gate_evaluator_unavailable" : "made_up_unknown_code" } } }),
      problem: /issue code "made_up_unknown_code" is outside the declared namespace/u },
    // The POSITION-grain negative is STRAIGHT-authored by construction:
    // `presence` is declared on the shared node base, so an open map's
    // entry carrying it is TYPE-legal and a cast would prove nothing.
    { claim: "a `presence` on an open map's ENTRY, where no missing-key lane exists (the POSITION grain)",
      make: (ok) => base({}, { fields: { m: { kind: "map.open", tag: "m", rows: ["x"], containerMessage: "c",
        keyLaneAt: "container",
        entry: { kind: "string", tag: "me", rows: ["x"], typeMessage: "t",
          ...(ok ? {} : { presence: { required: true } }) } } } }),
      problem: /node "me" carries presence, which the vocabulary does not admit on a string at this position \(entry\)/u },
    { claim: "a `presence` on a LIST MEMBER, likewise",
      make: (ok) => base({}, { fields: { l: { kind: "list", tag: "l", rows: ["x"], containerMessage: "c",
        memberLaneAt: "index",
        member: { kind: "string", tag: "lm", rows: ["x"], typeMessage: "t",
          ...(ok ? {} : { presence: { required: true } }) } } } }),
      problem: /node "lm" carries presence, which the vocabulary does not admit on a string at this position \(member\)/u },
    // The KIND-grain negative must be CAST-AUTHORED: an attribute the
    // kind's interface omits is a compile error before the guard ever
    // sees it. It also names a pair the code widening does NOT admit —
    // `code` at a container lane is legal after this build and cannot
    // serve as its own negative.
    { claim: "a `code` on a LIST, a kind the widening does not reach (the KIND grain, cast-authored)",
      make: (ok) => base({}, { fields: { l: { kind: "list", tag: "l", rows: ["x"], containerMessage: "c",
        memberLaneAt: "index", member: { kind: "string", tag: "lm", rows: ["x"], typeMessage: "t" },
        ...(ok ? {} : { code: "gate_evaluator_unavailable" }) } } }),
      problem: /node "l" carries code, which the vocabulary does not admit on a list at this position \(field\)/u },
    { claim: "a `gating` on a kind whose evaluation never reads one (cast-authored)",
      make: (ok) => base({}, { fields: { s: { kind: "string", tag: "s", rows: ["x"], typeMessage: "t",
        ...(ok ? {} : { gating: true }) } } }),
      problem: /node "s" carries gating, which the vocabulary does not admit on a string at this position \(field\)/u },
  ];

  for (const guard of GUARDS) {
    it(`${guard.claim} — refused, and ONLY that`, () => {
      const problems = closureProblems(guard.make(false));
      expect(problems).toHaveLength(1);
      expect(problems[0]).toMatch(guard.problem);
      expect(() => defineSurface(guard.make(false))).toThrow(SurfaceDeclarationError);
    });

    it(`${guard.claim} — DISCRIMINATES: the same surface with that one reference resolved passes`, () => {
      expect(closureProblems(guard.make(true))).toStrictEqual([]);
      expect(() => defineSurface(guard.make(true))).not.toThrow();
    });
  }

  it("the guard register is complete, unique and PINNED", () => {
    expect(GUARDS).toHaveLength(57);
    expect(new Set(GUARDS.map((guard) => guard.claim)).size).toBe(GUARDS.length);
  });

  it("the LIVE declaration is closed — no unresolved reference reaches a document", () => {
    expect(closureProblems(templateFormat)).toStrictEqual([]);
  });

  it("the LIVE declaration is frozen at EVERY level, not only the root (ADR-019 D4)", () => {
    const root = templateFormat.root as unknown as { readonly fields: Record<string, Record<string, unknown>> };
    const nested = root.fields["start"]?.["memberOf"] as { message: string };
    expect(Object.isFrozen(templateFormat)).toBe(true);
    expect(Object.isFrozen(root)).toBe(true);
    expect(Object.isFrozen(nested)).toBe(true);
    expect(() => {
      nested.message = "MUTATED";
    }).toThrow(TypeError);
  });

  it("the `..` form the vocabulary once documented is REFUSED, not silently inert", () => {
    // The regression this gate exists for: before it, a declaration written
    // to the documented form compiled, ran, and validated nothing.
    expect(closureProblems(selecting("keysOf", "..names"))).toHaveLength(1);
    expect(
      runSurface(selecting("keysOf", "$.names"), { names: { a: "1" }, pick: "zz" }, { channel: { kind: "direct" } })
        .findings,
    ).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// packet ch13-p1a — the ENGINE's two new capabilities (row D5), asserted
// on their own so a regression in either is addressable alone.
// ═══════════════════════════════════════════════════════════════════════

describe("the failed-tag surface (packet ch13-p1a, D5) — the residual channel", () => {
  const catalogOfNone: GateCatalog = { resolve: () => null };
  const template = (steps: Record<string, unknown>): Record<string, unknown> => ({
    ref: { id: "t", version: 1 },
    start: "s",
    steps,
    terminal: ["done"],
    roles: { r: {} },
  });
  const failedTags = (value: unknown): readonly string[] =>
    runSurface(templateFormat, value, { channel: { kind: "direct" }, catalog: catalogOfNone }).failedTags;

  it("a CLEAN document marks nothing", () => {
    expect(failedTags(template({ s: { role: "r", instruction: "i", transitions: {} } }))).toStrictEqual([]);
  });

  it("a wrong-kind container marks its own declared tag", () => {
    expect(failedTags(template({ s: { role: "r", instruction: "i", transitions: {}, gates: 7 } }))).toContain(
      "d-gates",
    );
  });

  it("the DEAD-CONFIG skip marks the enclosing container's tag — the second route to d-gates", () => {
    // The skip removes the entry and everything beneath it from
    // evaluation. Before this packet the container still returned ok and
    // NOTHING was marked, so a rule reading the tags to decide whether a
    // value under it is reachable saw a clean document (measured: the M1
    // trigger-tag probe's `gates dead-config key` row read `[]`).
    const withDeadKey = template({
      s: {
        role: "r",
        instruction: "i",
        transitions: {},
        gates: { GHOST: [{ uses: "declarative.threshold", config: {} }] },
      },
    });
    expect(failedTags(withDeadKey)).toStrictEqual(["d-gates"]);
  });

  it("the surface is present on the ROOT-CONTAINER short-circuit too, not only on the walk's return", () => {
    // The two return sites are different statements; an exposure reaching
    // only the walk's would leave the field ABSENT on this route, where
    // `[]` would then be a default rather than a measurement.
    expect(failedTags(7)).toStrictEqual([]);
  });
});

describe("the liftNestedList hook (packet ch13-p1a, D4) — derivation from a NESTED source", () => {
  const lifted = (root: NodeDecl, hook: Record<string, unknown>): SurfaceDecl =>
    ({
      substrate: templateFormat.substrate, valueClasses: {}, crossRules: [], root,
      normalizers: [{ tag: "n", rows: ROWS, ...hook }],
    }) as unknown as SurfaceDecl;

  const entryNode: NodeDecl = {
    kind: "map.fixed", tag: "e", rows: ROWS, containerMessage: "c", unknownMessage: "u",
    fields: {
      cfg: {
        kind: "map.plain", tag: "cfg", rows: ROWS, containerMessage: "c",
        canonicalJsonSafe: { message: "k" },
        fields: {
          refs: {
            kind: "list", tag: "rl", rows: ROWS, containerMessage: "c", memberLaneAt: "index",
            member: { kind: "string", tag: "rm", rows: ROWS, typeMessage: "t" },
          },
        },
      },
      out: { kind: "raw", tag: "o", rows: ROWS },
    },
  };

  const surface = lifted(
    {
      kind: "map.fixed", tag: "r", rows: ROWS, containerMessage: "c", unknownMessage: "u",
      fields: {
        outer: {
          kind: "map.open", tag: "om", rows: ROWS, containerMessage: "c", keyLaneAt: "container",
          entry: {
            kind: "map.open", tag: "inner", rows: ROWS, containerMessage: "c", keyLaneAt: "container",
            entry: entryNode,
          },
        },
      },
    },
    { hook: "liftNestedList", over: "$.outer.*", from: "cfg", source: "refs", into: "out" },
  );

  it("the declaration is CLOSED — the nested source resolves through the plain map's typed subset", () => {
    expect(closureProblems(surface)).toStrictEqual([]);
  });

  it("lifts the nested list onto the entry, through an operand path carrying a WILDCARD", () => {
    const value = { outer: { a: { one: { cfg: { refs: ["x", "y"], other: 1 } } } } };
    normalize(surface, value, new Map());
    expect(value.outer.a.one).toHaveProperty("out", ["x", "y"]);
  });

  it("an ABSENT source lands as the EMPTY LIST, never an absence", () => {
    const value = { outer: { a: { one: { cfg: { other: 1 } } } } };
    normalize(surface, value, new Map());
    expect(value.outer.a.one).toHaveProperty("out", []);
    const noConfig = { outer: { a: { one: {} } } };
    normalize(surface, noConfig, new Map());
    expect(noConfig.outer.a.one).toHaveProperty("out", []);
  });

  it("PRODUCER MONOPOLY: a pre-populated produced field is recomputed, never trusted", () => {
    const value = { outer: { a: { one: { cfg: { refs: ["x"] }, out: ["GHOST"] } } } };
    normalize(surface, value, new Map());
    expect(value.outer.a.one).toHaveProperty("out", ["x"]);
  });

  it("the AUTHORED source survives unmodified — the lifted list is a sibling, not a move", () => {
    const value = { outer: { a: { one: { cfg: { refs: ["x"] } } } } };
    normalize(surface, value, new Map());
    expect(value.outer.a.one.cfg).toStrictEqual({ refs: ["x"] });
    // …and the two do not share one array.
    expect(value.outer.a.one.cfg.refs).not.toBe((value.outer.a.one as Record<string, unknown>)["out"]);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// packet ch14-p1 — family 9's SAME-KIND twin, and family 5's
// declaration-WIDE code census. Both are properties of the DECLARATION
// rather than of any document, which is why they live here.
// ═══════════════════════════════════════════════════════════════════════

describe("ch14-P1 family 9 — the applicability inventory's POSITION key, driven in BOTH directions", () => {
  // D17's measured counterexample (receipt PROBE-CH14P1-7), which is what
  // fixes the inventory's key at attribute × kind × POSITION: the SAME
  // attribute on the SAME kind is legitimate one position and inert the
  // next, so no kind-keyed allowlist can separate them.
  const sameKind = (where: "field" | "entry"): SurfaceDecl =>
    ({
      substrate: templateFormat.substrate,
      valueClasses: {},
      crossRules: [],
      normalizers: [],
      root: {
        kind: "map.fixed", tag: "root", rows: ["x"], containerMessage: "c", unknownMessage: "u",
        fields: {
          named: { kind: "string", tag: "named", rows: ["x"], typeMessage: "t",
            ...(where === "field" ? { presence: { required: true } } : {}) },
          open: { kind: "map.open", tag: "open", rows: ["x"], containerMessage: "c", keyLaneAt: "container",
            entry: { kind: "string", tag: "entry", rows: ["x"], typeMessage: "t",
              ...(where === "entry" ? { presence: { required: true } } : {}) } },
        },
      },
    }) as unknown as SurfaceDecl;

  it("the LEGITIMATE position loads clean — and the attribute FIRES", () => {
    const surface = sameKind("field");
    expect(closureProblems(surface)).toStrictEqual([]);
    expect(runSurface(surface, { open: {} }, { channel: { kind: "direct" } }).findings).toStrictEqual([
      { path: "$", message: 'missing required key "named"' },
    ]);
  });

  it("the INERT position is REFUSED at load, naming the attribute and the node", () => {
    const problems = closureProblems(sameKind("entry"));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(
      /node "entry" carries presence, which the vocabulary does not admit on a string at this position \(entry\)/u,
    );
  });

  it("FAIL-CLOSED by construction: the live declaration passes the inventory at every position", () => {
    expect(closureProblems(templateFormat)).toStrictEqual([]);
  });
});

describe("ch14-P1 family 5 — the DECLARATION-WIDE code census (the exclusivity negative)", () => {
  // The same walk PROBE-CH14P1-6 established as an idiom, one key wider.
  // A chapter-scoped inventory cannot see a code landing on a node this
  // chapter never touches; this one can.
  function codePositions(surface: SurfaceDecl): readonly string[] {
    const found: string[] = [];
    const visit = (node: NodeDecl, where: string): void => {
      const carrier = node as unknown as Record<string, unknown>;
      for (const [attribute, value] of Object.entries(carrier)) {
        if (attribute === "code" && typeof value === "string") found.push(`${node.tag}.code=${value}`);
      }
      if (node.presence?.code !== undefined) found.push(`${node.tag}.presence.code=${node.presence.code}`);
      for (const rule of ["memberOf", "keysSubsetOf", "disjointFrom"] as const) {
        const membership = carrier[rule] as { readonly code?: string } | undefined;
        if (membership?.code !== undefined) found.push(`${node.tag}.${rule}.code=${membership.code}`);
      }
      switch (node.kind) {
        case "map.fixed":
        case "map.plain":
          for (const [name, field] of Object.entries(node.fields ?? {})) visit(field, `${where}.${name}`);
          return;
        case "map.open":
          if (node.keyClass !== undefined) visit(node.keyClass, `${where}<key>`);
          visit(node.entry, `${where}.*`);
          return;
        case "list":
          visit(node.member, `${where}[]`);
          return;
        case "union":
          if (node.mapCase !== undefined) visit(node.mapCase, where);
          return;
        default:
          return;
      }
    };
    visit(surface.root, "$");
    for (const [name, decl] of Object.entries(surface.valueClasses)) visit(decl, `valueClass "${name}"`);
    return found.sort();
  }

  it("the set of code-bearing DECLARATION positions is EXACTLY the ch14 table plus the two pre-existing ones", () => {
    expect(codePositions(templateFormat)).toStrictEqual([
      // The ch14 growth, per the code table.
      "d-decision-entry.code=invalid_decision_gate_config",
      "d-decision-payload.code=invalid_decision_payload_schema",
      "d-decision-target.memberOf.code=decision_target_unresolved",
      "d-decision-target.presence.code=invalid_decision_gate_config",
      "d-decisions.code=invalid_decision_gate_config",
      "d-payload-required.code=invalid_decision_payload_schema",
      "d-payload-spec.code=invalid_decision_payload_schema",
      // The TWO pre-existing declared code positions, measured: the
      // gate-evaluator membership lane and the context-block-ref one. The
      // other three coded lanes live OUTSIDE the declaration — one hand
      // lane in the audited residual, two inside delegated gate-config
      // validators — and are asserted by their own inventory, because a
      // census of declaration nodes cannot see them and a baseline of
      // five would red a correct declaration.
      "d-uses.memberOf.code=gate_evaluator_unavailable",
      "vc-blockidlist.memberOf.code=unresolved_context_block_ref",
    ]);
  });

  it("ch14-C8's MEASURED ground: all six new codes are ABSENT from the 54-name rejection registry", () => {
    // The `d-codes` node's disjointness claim was false of the token sets
    // — two pre-existing names already overlap — so the ch14 growth rests
    // on this measurement instead, and the measurement is pinned here
    // rather than asserted in a comment.
    expect(REJECTION_NAMES).toHaveLength(54);
    const six = [
      "invalid_decision_gate_config", "decision_gate_empty", "decision_target_unresolved",
      "invalid_decision_payload_schema", "recommends_on_non_gate", "recommends_unknown_decision",
    ];
    expect(six.filter((code) => (REJECTION_NAMES as readonly string[]).includes(code))).toStrictEqual([]);
    for (const code of six) expect(templateFormat.substrate.codes.values).toContain(code);
  });

  it("every declared code is a member of the closed namespace — the check that joins the NEW position", () => {
    const declared = new Set(templateFormat.substrate.codes.values);
    for (const position of codePositions(templateFormat)) {
      const code = position.slice(position.indexOf("=") + 1);
      expect(declared.has(code), position).toBe(true);
    }
  });
});
