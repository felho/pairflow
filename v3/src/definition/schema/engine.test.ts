import { parseDocument } from "yaml";
import { describe, expect, it } from "vitest";

import type { GateCatalog, GateRegistration } from "../../ports/index.js";
import type { ValidationFinding } from "../errors.js";
import { collectTags, runSurface } from "./engine.js";
import type { EngineChannel } from "./engine.js";
import { normalize } from "./normalizer.js";
import { templateFormat } from "./templateFormat.js";
import type { NodeDecl, SurfaceDecl } from "./vocabulary.js";

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
    surface: "synthetic",
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
    expect(GUARDS).toHaveLength(31);
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

  it("a MISSING container suppresses the same rule", () => {
    expect(direct(root, { start: "nope" })).toStrictEqual([]);
  });

  it("an EMPTY container does NOT suppress it — the set exists and is empty", () => {
    expect(direct(root, { steps: {}, start: "nope" })).toStrictEqual([
      { path: "start", message: "start must name a step" },
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
    const effective = new Map<string, unknown>([["steps.a.gates.GO[0]", { resolved: 2 }]]);
    normalize(templateFormat, value, effective);
    expect((value.steps.a.gates as Record<string, unknown>)["GO"]).toStrictEqual([
      { uses: "x.y", config: { resolved: 2 } },
    ]);
  });
});

describe("the declaration's own hygiene", () => {
  it("every declaration tag is unique — the tag-closure check's mechanical half (D4)", () => {
    const tags = collectTags(templateFormat);
    expect(new Set(tags).size).toBe(tags.length);
  });

  it("every declared node cites at least one ratified row", () => {
    const walk = (decl: NodeDecl): string[] => {
      const own = decl.rows.length === 0 ? [decl.tag] : [];
      switch (decl.kind) {
        case "map.fixed":
          return [...own, ...Object.values(decl.fields).flatMap(walk)];
        case "map.open":
          return [...own, ...(decl.keyClass ? walk(decl.keyClass) : []), ...walk(decl.entry)];
        case "list":
          return [...own, ...walk(decl.member)];
        case "union":
          return [...own, ...(decl.mapCase ? walk(decl.mapCase) : [])];
        default:
          return own;
      }
    };
    expect(walk(templateFormat.root)).toStrictEqual([]);
  });
});
