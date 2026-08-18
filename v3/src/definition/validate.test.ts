import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type { WorkflowTemplate } from "../domain/index.js";
import { createGateRegistry } from "../gates/index.js";
import { loadTemplate } from "./index.js";
import type { TemplateLoadErrorInfo } from "./index.js";
import type { ValidationFinding } from "./errors.js";

// Packet ch8-P1: the validate lane inventory (V1–V17), the E2
// accumulation + dependent-lane suppression rules, the V3 version
// source-form ladder (dimension 2), and the canonical-example
// round-trip (dimension 12). Every hostile fixture is RAW YAML text.
//
// Packet ch11-P4: F1/F2 keyset growth (dimension 1), F5 the round
// SOURCE-FORM lanes (dimension 2), and F6 the C12 integer source ladder
// (dimension 3), all driven through `loadTemplate`. F6's positives need
// the REAL catalog so admission resolves the gate and the ONLY finding
// is the source-form one.

function bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function load(text: string): ReturnType<typeof loadTemplate> {
  return loadTemplate(bytes(text));
}

function loadGated(text: string): ReturnType<typeof loadTemplate> {
  return loadTemplate(bytes(text), { catalog: createGateRegistry() });
}

function expectValidateErr(text: string): TemplateLoadErrorInfo {
  const result = load(text);
  if (result.ok) {
    throw new Error("expected a validate error, got a template");
  }
  expect(result.error.stage).toBe("validate");
  return result.error;
}

function paths(err: TemplateLoadErrorInfo): string[] {
  return err.findings.map((f) => (f as { path: string }).path);
}

// The minimal valid template, built from named parts so single-key
// fixtures stay surgical (drop a part, swap a part) instead of
// regex-editing a blob.
const PART = {
  ref: "ref:\n  id: t\n  version: 1\n",
  start: "start: s\n",
  steps: "steps:\n  s:\n    role: r\n    instruction: i\n    transitions: {}\n",
  terminal: "terminal:\n  - done\n",
  roles: "roles:\n  r: {}\n",
} as const;
type PartName = keyof typeof PART;

function template(overrides: Partial<Record<PartName, string>> = {}, drop: PartName[] = []): string {
  return (Object.keys(PART) as PartName[])
    .filter((name) => !drop.includes(name))
    .map((name) => overrides[name] ?? PART[name])
    .join("");
}

const VALID = template();

function withVersion(versionSource: string): string {
  return template({ ref: `ref:\n  id: t\n  version: ${versionSource}\n` });
}

describe("V1 — top-level exact keyset", () => {
  it("accepts the minimal valid template", () => {
    expect(load(VALID).ok).toBe(true);
  });

  for (const key of Object.keys(PART) as PartName[]) {
    it(`reports a missing required key: ${key}`, () => {
      const err = expectValidateErr(template({}, [key]));
      expect(paths(err)).toContain("$");
      expect(JSON.stringify(err.findings)).toContain(key);
    });
  }

  it("reports an unknown top-level key at its own path", () => {
    const err = expectValidateErr(`${VALID}extra: 1\n`);
    expect(paths(err)).toStrictEqual(["extra"]);
  });

  it("yields ONE finding at $ for a list root", () => {
    const err = expectValidateErr(`- x\n- y\n`);
    expect(err.findings).toHaveLength(1);
    expect(paths(err)).toStrictEqual(["$"]);
  });

  it("yields ONE finding at $ for a scalar root", () => {
    const err = expectValidateErr(`hello\n`);
    expect(err.findings).toHaveLength(1);
    expect(paths(err)).toStrictEqual(["$"]);
  });

  it("yields ONE finding at $ for the empty document (null root)", () => {
    const err = expectValidateErr(``);
    expect(err.findings).toHaveLength(1);
    expect(paths(err)).toStrictEqual(["$"]);
  });
});

describe("V16 — kind is reserved (unknown key today)", () => {
  it("rejects a kind: key as unknown", () => {
    const err = expectValidateErr(`${VALID}kind: template\n`);
    expect(paths(err)).toStrictEqual(["kind"]);
  });
});

describe("V2 — ref shape and the id rule", () => {
  it("suppresses id/version lanes under a wrong-kind ref (ONE finding)", () => {
    const err = expectValidateErr(template({ ref: "ref: 1\n" }));
    expect(err.findings).toHaveLength(1);
    expect(paths(err)).toStrictEqual(["ref"]);
  });

  it("rejects an unknown key inside ref", () => {
    const err = expectValidateErr(template({ ref: "ref:\n  id: t\n  version: 1\n  extra: x\n" }));
    expect(paths(err)).toContain("ref.extra");
  });

  const badIds = [
    ["uppercase", "Abc"],
    ["leading dash", '"-abc"'],
    ["empty", '""'],
    ["underscore", "a_b"],
  ] as const;
  for (const [label, id] of badIds) {
    it(`rejects a bad id source: ${label}`, () => {
      const err = expectValidateErr(template({ ref: `ref:\n  id: ${id}\n  version: 1\n` }));
      expect(paths(err)).toContain("ref.id");
    });
  }

  it("rejects a non-string resolved id (number)", () => {
    const err = expectValidateErr(template({ ref: "ref:\n  id: 1\n  version: 1\n" }));
    expect(paths(err)).toContain("ref.id");
  });

  it("accepts digit-and-dash ids", () => {
    expect(load(template({ ref: "ref:\n  id: a-1\n  version: 1\n" })).ok).toBe(true);
  });
});

describe("V3 — the version source-form ladder (dimension 2)", () => {
  const positives = ["1", "10", "9007199254740991"];
  for (const src of positives) {
    it(`accepts version source ${src}`, () => {
      const result = load(withVersion(src));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.template.ref.version).toBe(Number(src));
    });
  }

  const negatives = [
    ["zero", "0"],
    ["negative zero (raw text)", "-0"],
    ["negative", "-1"],
    ["explicit plus", "+1"],
    ["integral float form", "1.0"],
    ["float", "1.10"],
    ["leading zero", "01"],
    ["hex", "0x10"],
    ["exponent", "1e2"],
    ["double-quoted", '"1"'],
    ["single-quoted", "'1'"],
    ["anchored", "&v 1"],
    ["tagged !!str", "!!str 1"],
  ] as const;
  for (const [label, src] of negatives) {
    it(`rejects version source form: ${label}`, () => {
      const err = expectValidateErr(withVersion(src));
      expect(paths(err)).toContain("ref.version");
    });
  }

  it("rejects an ALIASED version (the anchor defined elsewhere)", () => {
    // Root-key order is free in YAML: steps (carrying the anchor) precede ref.
    const err = expectValidateErr(
      "start: s\n" +
        "steps:\n  s:\n    role: r\n    instruction: i\n    transitions: {}\n    agentConfig:\n      n: &v 1\n" +
        "ref:\n  id: t\n  version: *v\n" +
        PART.terminal +
        PART.roles,
    );
    expect(paths(err)).toContain("ref.version");
  });

  it("rejects an unsafe integer on the resolved-value belt (source regex passes)", () => {
    const err = expectValidateErr(withVersion("9007199254740993"));
    expect(paths(err)).toContain("ref.version");
  });

  it("rejects a non-scalar version", () => {
    const err = expectValidateErr(withVersion("{a: 1}"));
    expect(paths(err)).toContain("ref.version");
  });
});

describe("V4 — steps container and step keysets", () => {
  it("rejects an empty steps map", () => {
    const err = expectValidateErr(template({ steps: "steps: {}\n" }));
    expect(paths(err)).toContain("steps");
  });

  it("suppresses per-step lanes under a wrong-kind step value", () => {
    const err = expectValidateErr(template({ steps: "steps:\n  s: nope\n" }));
    expect(err.findings).toHaveLength(1);
    expect(paths(err)).toStrictEqual(["steps.s"]);
  });

  it("reports a step missing role", () => {
    const err = expectValidateErr(template({ steps: "steps:\n  s:\n    instruction: i\n    transitions: {}\n" }));
    expect(paths(err)).toContain("steps.s");
    expect(JSON.stringify(err.findings)).toContain("role");
  });

  it("reports a step missing instruction", () => {
    const err = expectValidateErr(template({ steps: "steps:\n  s:\n    role: r\n    transitions: {}\n" }));
    expect(paths(err)).toContain("steps.s");
    expect(JSON.stringify(err.findings)).toContain("instruction");
  });

  it("reports a step missing transitions", () => {
    const err = expectValidateErr(template({ steps: "steps:\n  s:\n    role: r\n    instruction: i\n" }));
    expect(paths(err)).toContain("steps.s");
    expect(JSON.stringify(err.findings)).toContain("transitions");
  });

  it("rejects an unknown key in a step", () => {
    const err = expectValidateErr(
      template({ steps: "steps:\n  s:\n    role: r\n    instruction: i\n    transitions: {}\n    extra: 1\n" }),
    );
    expect(paths(err)).toContain("steps.s.extra");
  });
});

describe("V5 — the shared id/name grammar (no whitespace, no dot, nonempty)", () => {
  const nonStringOpenMapKeys = [
    [
      "step id",
      template({
        start: 'start: "1"\n',
        steps: "steps:\n  1:\n    role: r\n    instruction: i\n    transitions: {}\n",
      }),
      "steps",
    ],
    [
      "role name",
      template({
        steps: 'steps:\n  s:\n    role: "1"\n    instruction: i\n    transitions: {}\n',
        roles: "roles:\n  1: {}\n",
      }),
      "roles",
    ],
    [
      "event type",
      template({ steps: "steps:\n  s:\n    role: r\n    instruction: i\n    transitions:\n      1: done\n" }),
      "steps.s.transitions",
    ],
  ] as const;
  for (const [label, yaml, path] of nonStringOpenMapKeys) {
    it(`rejects a non-string YAML key used as a ${label}`, () => {
      const err = expectValidateErr(yaml);
      expect(paths(err)).toContain(path);
      expect(JSON.stringify(err.findings)).toContain("nonempty string");
    });
  }

  it("rejects typed-distinct YAML keys before toJS can collapse them", () => {
    const err = expectValidateErr(
      template({
        start: 'start: "1"\n',
        steps:
          'steps:\n  1:\n    role: r\n    instruction: first\n    transitions: {}\n  "1":\n    role: r\n    instruction: second\n    transitions: {}\n',
      }),
    );
    expect(paths(err)).toContain("steps");
    expect(JSON.stringify(err.findings)).toContain("step id must be a nonempty string");
  });

  it("rejects a step id with a space", () => {
    const err = expectValidateErr(
      template({
        start: 'start: "a b"\n',
        steps: 'steps:\n  "a b":\n    role: r\n    instruction: i\n    transitions: {}\n',
      }),
    );
    expect(JSON.stringify(err.findings)).toContain("a b");
  });

  it("rejects a step id with a dot", () => {
    const err = expectValidateErr(
      template({
        start: 'start: "a.b"\n',
        steps: 'steps:\n  "a.b":\n    role: r\n    instruction: i\n    transitions: {}\n',
      }),
    );
    expect(JSON.stringify(err.findings)).toContain("a.b");
  });

  it("rejects an empty step id", () => {
    const err = expectValidateErr(
      template({ steps: 'steps:\n  "":\n    role: r\n    instruction: i\n    transitions: {}\n' }),
    );
    expect(err.findings.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects a unicode-whitespace (NBSP) step id (the /\\s/u rule)", () => {
    const nbspId = "a\u00a0b";
    const err = expectValidateErr(
      template({
        start: `start: "${nbspId}"\n`,
        steps: `steps:\n  "${nbspId}":\n    role: r\n    instruction: i\n    transitions: {}\n`,
      }),
    );
    expect(err.findings.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects an event type with whitespace", () => {
    const err = expectValidateErr(
      template({ steps: 'steps:\n  s:\n    role: r\n    instruction: i\n    transitions:\n      "GO ON": done\n' }),
    );
    expect(JSON.stringify(err.findings)).toContain("GO ON");
  });

  it("rejects a role name with a dot (roles map key + step reference)", () => {
    const err = expectValidateErr(
      template({
        steps: 'steps:\n  s:\n    role: "a.b"\n    instruction: i\n    transitions: {}\n',
        roles: 'roles:\n  "a.b": {}\n',
      }),
    );
    expect(err.findings.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects a terminal id with whitespace", () => {
    const err = expectValidateErr(template({ terminal: 'terminal:\n  - "do ne"\n' }));
    expect(JSON.stringify(err.findings)).toContain("do ne");
  });

  // Aftermath (external-arm watchpoint): the FULL id-class × form grid,
  // table-driven — every class rejects every form at its exact path.
  const forms = [
    ["whitespace", "a b"],
    ["dot", "a.b"],
    ["empty", ""],
  ] as const;
  for (const [formLabel, token] of forms) {
    it(`grid: step id × ${formLabel}`, () => {
      const err = expectValidateErr(
        template({
          start: `start: "${token}"\n`,
          steps: `steps:\n  "${token}":\n    role: r\n    instruction: i\n    transitions: {}\n`,
        }),
      );
      expect(paths(err)).toContain("steps");
    });

    it(`grid: terminal id × ${formLabel}`, () => {
      const err = expectValidateErr(template({ terminal: `terminal:\n  - "${token}"\n` }));
      expect(paths(err)).toContain("terminal");
    });

    it(`grid: role name × ${formLabel} (both surfaces; V11 suppressed, no cascade)`, () => {
      const err = expectValidateErr(
        template({
          steps: `steps:\n  s:\n    role: "${token}"\n    instruction: i\n    transitions: {}\n`,
          roles: `roles:\n  "${token}": {}\n`,
        }),
      );
      const p = paths(err);
      expect(p).toContain("steps.s.role");
      expect(p).toContain("roles");
      // No V11 noise from the same defect: only the two grammar findings.
      expect(err.findings.length).toBe(2);
    });

    it(`grid: event type × ${formLabel}`, () => {
      const err = expectValidateErr(
        template({ steps: `steps:\n  s:\n    role: r\n    instruction: i\n    transitions:\n      "${token}": done\n` }),
      );
      expect(paths(err)).toContain("steps.s.transitions");
    });
  }

  it("V11 suppression on a grammar-invalid USED role: exactly the grammar finding, no undeclared/unused cascade", () => {
    const err = expectValidateErr(
      template({ steps: 'steps:\n  s:\n    role: "a b"\n    instruction: i\n    transitions: {}\n' }),
    );
    expect(paths(err)).toStrictEqual(["steps.s.role"]);
  });
});

describe("V6 — instruction rules (no normalization)", () => {
  it("rejects an empty instruction", () => {
    const err = expectValidateErr(template({ steps: 'steps:\n  s:\n    role: r\n    instruction: ""\n    transitions: {}\n' }));
    expect(paths(err)).toContain("steps.s.instruction");
  });

  it("rejects a non-string instruction", () => {
    const err = expectValidateErr(template({ steps: "steps:\n  s:\n    role: r\n    instruction: 5\n    transitions: {}\n" }));
    expect(paths(err)).toContain("steps.s.instruction");
  });

  it("preserves block-scalar chomping verbatim (|- strips, | keeps one newline)", () => {
    const strip = load(
      template({ steps: "steps:\n  s:\n    role: r\n    instruction: |-\n      hello\n      world\n    transitions: {}\n" }),
    );
    expect(strip.ok).toBe(true);
    if (strip.ok) {
      expect(strip.template.steps["s"]?.instruction).toBe("hello\nworld");
    }
    const keep = load(
      template({ steps: "steps:\n  s:\n    role: r\n    instruction: |\n      hello\n    transitions: {}\n" }),
    );
    expect(keep.ok).toBe(true);
    if (keep.ok) {
      expect(keep.template.steps["s"]?.instruction).toBe("hello\n");
    }
  });
});

describe("V7 — transitions may be empty", () => {
  it("accepts an empty transitions map (the event-with-no-route outcome is runtime's, not the format's)", () => {
    expect(load(VALID).ok).toBe(true);
  });

  it("rejects a wrong-kind transitions value and suppresses its lanes", () => {
    const err = expectValidateErr(template({ steps: "steps:\n  s:\n    role: r\n    instruction: i\n    transitions: nope\n" }));
    expect(paths(err)).toStrictEqual(["steps.s.transitions"]);
  });
});

describe("V9 — agentConfig raw pass-through", () => {
  it("preserves referential identity of a cross-step aliased agentConfig graph (one memo per build)", () => {
    // The integration re-check's catch: a per-step materialization memo
    // duplicated a shared anchored graph — two steps aliasing one
    // anchor received DIFFERENT objects, refuting the lossless/raw claim.
    const result = load(`ref:
  id: t
  version: 1
start: a
steps:
  a:
    role: r
    instruction: i
    transitions: { GO: b }
    agentConfig: &cfg { shared: { x: 1 } }
  b:
    role: r
    instruction: i
    transitions: {}
    agentConfig: *cfg
terminal:
  - done
roles:
  r: {}
`);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const a = result.template.steps["a"];
      const b = result.template.steps["b"];
      expect(a?.agentConfig).toBeDefined();
      expect(a?.agentConfig).toBe(b?.agentConfig);
    }
  });

  it("passes an arbitrary nested map through untouched (deep-equal)", () => {
    const result = load(
      template({
        steps: `steps:
  s:
    role: r
    instruction: i
    transitions: {}
    agentConfig:
      model: opus
      nested:
        list:
          - 1
          - "two"
        flag: true
      "weird key with spaces": ok
`,
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.template.steps["s"]?.agentConfig).toStrictEqual({
      model: "opus",
      nested: { list: [1, "two"], flag: true },
      "weird key with spaces": "ok",
    });
  });

  // ch12-p2 (C7 narrowing): the ch8-C14 ANY-VALUE agentConfig domain is
  // narrowed to a canonical-JSON MAP at admission. A non-string-keyed
  // agentConfig materializes (validate stage UNCHANGED) as a JS Map to
  // preserve typed keys — which is no longer a PLAIN map, so it now
  // REJECTS at the admit rung (accumulated into the validate stage under
  // the F7 cross-rung rule). The lossless string-keyed case still admits
  // (the "keeps STRING keys losslessly" test above).
  it("rejects a non-string-keyed agentConfig at admission (C7 map narrowing)", () => {
    const err = expectValidateErr(
      template({
        steps: `steps:
  s:
    role: r
    instruction: i
    transitions: {}
    agentConfig:
      ? [a, b]
      : complex
      1: numeric
      __proto__: proto
`,
      }),
    );
    expect(paths(err)).toContain("steps.s.agentConfig");
    expect(JSON.stringify(err.findings)).toMatch(/agentConfig must be a map/);
  });

  it("rejects a typed-distinct-keyed agentConfig at admission (C7 map narrowing — 1 vs \"1\")", () => {
    const err = expectValidateErr(
      template({
        steps: `steps:
  s:
    role: r
    instruction: i
    transitions: {}
    agentConfig:
      1: numeric
      "1": string
`,
      }),
    );
    expect(paths(err)).toContain("steps.s.agentConfig");
    expect(JSON.stringify(err.findings)).toMatch(/agentConfig must be a map/);
  });
});

describe("V15 — acyclicity (cycle-safe validator)", () => {
  it("reports a cyclic value graph (through agentConfig) as a validate finding — no hang, no throw", () => {
    const err = expectValidateErr(
      template({
        steps: "steps:\n  s:\n    role: r\n    instruction: i\n    transitions: {}\n    agentConfig: &a\n      self: *a\n",
      }),
    );
    expect(err.findings.length).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(err.findings)).toMatch(/cycl/i);
  });

  // Aftermath round 2 (the arm's re-check catch): with accumulation the
  // walk RUNS on cyclic graphs — every message site must be cycle-safe.
  // A cyclic map planted in each arbitrary-value scalar slot: the cycle
  // finding survives, no internal-failure, no throw.
  const cyclicSlots = [
    ["ref.id (V2 message site)", "ref:\n  id: &a\n    self: *a\n  version: 1\n", "ref"],
    ["step role (grammar site)", "steps:\n  s:\n    role: &a\n      self: *a\n    instruction: i\n    transitions: {}\n", "steps"],
    ["start (V13 message site)", "start: &a\n  self: *a\n", "start"],
    ["transition target (V14 message site)", "steps:\n  s:\n    role: r\n    instruction: i\n    transitions:\n      GO: &a\n        self: *a\n", "steps"],
  ] as const;
  for (const [label, part, partName] of cyclicSlots) {
    it(`stays cycle-safe with a cyclic value at: ${label}`, () => {
      const err = expectValidateErr(template({ [partName]: part }));
      expect(JSON.stringify(err.findings)).toMatch(/cycl/i);
      expect(JSON.stringify(err.findings)).not.toMatch(/internal validator failure/);
    });
  }

  it("ACCUMULATES the cycle finding with the other structural lanes (aftermath — E2 has no cycle exemption)", () => {
    const err = expectValidateErr(
      template({
        start: "start: nope\n",
        steps: "steps:\n  s:\n    role: r\n    instruction: i\n    transitions: {}\n    agentConfig: &a\n      self: *a\n",
      }) + "extra: 1\n",
    );
    const p = paths(err);
    expect(JSON.stringify(err.findings)).toMatch(/cycl/i);
    expect(p).toContain("start");
    expect(p).toContain("extra");
    // ch12-p2 (C7): the cyclic value sits in agentConfig, so the admit
    // rung's canonical-JSON lane ALSO fires on it (a cycle is not
    // canonical-JSON-safe) and ACCUMULATES beside the walk's cycle/start/
    // extra findings — four, not three.
    expect(p).toContain("steps.s.agentConfig");
    expect(err.findings.length).toBe(4);
  });
});

describe("V10 — roles entries", () => {
  it("rejects a wrong-kind roles entry", () => {
    const err = expectValidateErr(template({ roles: "roles:\n  r: nope\n" }));
    expect(paths(err)).toStrictEqual(["roles.r"]);
  });

  it("rejects an unknown key in a roles entry", () => {
    const err = expectValidateErr(template({ roles: "roles:\n  r:\n    actor: x\n" }));
    expect(paths(err)).toContain("roles.r.actor");
  });

  it("rejects an empty defaultActor", () => {
    const err = expectValidateErr(template({ roles: 'roles:\n  r:\n    defaultActor: ""\n' }));
    expect(paths(err)).toContain("roles.r.defaultActor");
  });

  it("accepts a present nonempty defaultActor", () => {
    const result = load(template({ roles: "roles:\n  r:\n    defaultActor: codex\n" }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // ch13v2-C13: the roles entry carries its ADMISSION-PRODUCED ref list
    // on every admitted value — the empty list, no config being authored.
    expect(result.template.roles["r"]).toStrictEqual({ defaultActor: "codex", promptConcernRefs: [] });
  });
});

describe("V11 — role-set discipline (declared == used, both directions)", () => {
  it("rejects an undeclared-but-used role", () => {
    const err = expectValidateErr(template({ roles: "roles:\n  other: {}\n" }));
    expect(err.findings.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects a declared-but-unused role", () => {
    const err = expectValidateErr(template({ roles: "roles:\n  r: {}\n  unused: {}\n" }));
    expect(JSON.stringify(err.findings)).toContain("unused");
  });
});

describe("V12 — terminal list rules", () => {
  it("rejects an empty terminal list", () => {
    const err = expectValidateErr(template({ terminal: "terminal: []\n" }));
    expect(paths(err)).toContain("terminal");
  });

  it("rejects a wrong-kind terminal", () => {
    const err = expectValidateErr(template({ terminal: "terminal: done\n" }));
    expect(paths(err)).toStrictEqual(["terminal"]);
  });

  it("rejects a duplicate terminal id", () => {
    const err = expectValidateErr(template({ terminal: "terminal:\n  - done\n  - done\n" }));
    expect(paths(err)).toContain("terminal");
  });

  it("rejects a terminal id colliding with a step id", () => {
    const err = expectValidateErr(template({ terminal: "terminal:\n  - done\n  - s\n" }));
    expect(paths(err)).toContain("terminal");
  });
});

describe("V13/V14 — reference integrity over keys(steps)", () => {
  it("rejects a start naming a missing step", () => {
    const err = expectValidateErr(template({ start: "start: nope\n" }));
    expect(paths(err)).toContain("start");
  });

  it("rejects a transition target naming neither a step nor a terminal", () => {
    const err = expectValidateErr(
      template({ steps: "steps:\n  s:\n    role: r\n    instruction: i\n    transitions:\n      GO: nowhere\n" }),
    );
    expect(paths(err)).toContain("steps.s.transitions.GO");
  });

  it("accepts targets into steps and into terminal", () => {
    const result = load(
      template({ steps: "steps:\n  s:\n    role: r\n    instruction: i\n    transitions:\n      LOOP: s\n      DONE: done\n" }),
    );
    expect(result.ok).toBe(true);
  });
});

describe("E2 — dependent-lane suppression combinations (dimension 5)", () => {
  it("a wrong-kind steps WITH start present yields ONLY the steps finding", () => {
    const err = expectValidateErr(template({ steps: "steps: nope\n", roles: "roles: {}\n" }));
    expect(paths(err)).toStrictEqual(["steps"]);
  });
});

describe("E2 — accumulation (dimension 6)", () => {
  it("returns ALL findings of a multi-defect file in ONE result (membership, not order)", () => {
    const err = expectValidateErr(
      template({
        start: "start: nope\n",
        steps: "steps:\n  s:\n    role: r\n    instruction: i\n    transitions:\n      GO: nowhere\n",
        roles: "roles:\n  r: {}\n  unused: {}\n",
      }),
    );
    const p = paths(err);
    expect(p).toContain("start");
    expect(p).toContain("steps.s.transitions.GO");
    expect(err.findings.length).toBe(3);
  });
});

describe("E5 — validate finding keysets", () => {
  it("keeps validate entries at exactly {path, message}", () => {
    const err = expectValidateErr(template({ start: "start: nope\n" }));
    for (const finding of err.findings) {
      expect(Object.keys(finding as object).sort()).toStrictEqual(["message", "path"]);
    }
  });
});

describe("dimension 12 — the canonical example round-trip", () => {
  it("round-trips legal __proto__ step and role identifiers as own properties", () => {
    const result = load(
      template({
        start: "start: __proto__\n",
        steps:
          "steps:\n  __proto__:\n    role: __proto__\n    instruction: i\n    transitions:\n      __proto__: done\n",
        roles: "roles:\n  __proto__: {}\n",
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.template.steps)).toStrictEqual(["__proto__"]);
    expect(Object.keys(result.template.roles)).toStrictEqual(["__proto__"]);
    expect(Object.hasOwn(result.template.steps, "__proto__")).toBe(true);
    expect(Object.hasOwn(result.template.roles, "__proto__")).toBe(true);
    const step = result.template.steps["__proto__"];
    expect(step?.role).toBe("__proto__");
    expect(step?.instruction).toBe("i");
    expect(Object.keys(step?.transitions ?? {})).toStrictEqual(["__proto__"]);
    expect(Object.hasOwn(step?.transitions ?? {}, "__proto__")).toBe(true);
    expect(step?.transitions?.["__proto__"]).toBe("done");
  });

  it("loads the draft's canonical example to the exact WorkflowTemplate value", () => {
    const canonical = `ref:
  id: local-pair-v0
  version: 1
start: implement
steps:
  implement:
    role: implementer
    instruction: |-
      build it
    transitions:
      PASS: review
  review:
    role: reviewer
    instruction: |-
      review it
    transitions:
      PASS: implement
      CONVERGED: done
terminal:
  - done
roles:
  implementer:
    defaultActor: codex
  reviewer:
    defaultActor: claude
round:
  advanceOnArrivalAt:
    - implement
`;
    const expected: WorkflowTemplate = {
      ref: { id: "local-pair-v0", version: 1 },
      start: "implement",
      steps: {
        implement: {
          role: "implementer",
          instruction: "build it",
          transitions: { PASS: "review" },
          // ch11-P4 (Y4): the authored `round` declaration (F5 source-form
          // clean) expands to per-transition flags — a transition advances
          // iff its TARGET ∈ advanceOnArrivalAt. implement.PASS → review
          // (not listed) ⇒ false.
          advancesRound: { PASS: false },
          // ch13v2-C13: the step's ADMISSION-PRODUCED ref list — empty,
          // the canonical file authoring no agentConfig.
          promptConcernRefs: [],
        },
        review: {
          role: "reviewer",
          instruction: "review it",
          transitions: { PASS: "implement", CONVERGED: "done" },
          // review.PASS → implement (LISTED) ⇒ true; CONVERGED → done ⇒ false.
          advancesRound: { PASS: true, CONVERGED: false },
          promptConcernRefs: [],
        },
      },
      terminal: ["done"],
      roles: {
        // ch13v2-C13: the same produced position at the roles entries.
        implementer: { defaultActor: "codex", promptConcernRefs: [] },
        reviewer: { defaultActor: "claude", promptConcernRefs: [] },
      },
      round: { advanceOnArrivalAt: ["implement"] },
      // ch12-p1b G3: admission materializes the activation default.
      activation: { mode: "immediate" },
      // ch12-p3 R1: admission materializes the runtime-context requirement
      // (absent ⇒ "none").
      runtimeContext: "none",
      // ch13v2-C1: admission materializes the absent catalog to the empty
      // record (the declared default).
      contextBlocks: {},
    };
    const result = load(canonical);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.template).toStrictEqual(expected);
  });
});

// ── packet ch11-P4: F1/F2 keyset growth (dimension 1) ──────────────────

describe("ch11-P4 F1/F2 — keyset growth, both directions (dimension 1)", () => {
  it("F1: root accepts the OPTIONAL runtimeContext key (driven positive)", () => {
    expect(load(`${VALID}runtimeContext: none\n`).ok).toBe(true);
  });

  it("F1: root accepts the OPTIONAL round key (driven positive)", () => {
    expect(load(`${VALID}round:\n  advanceOnArrivalAt:\n    - s\n`).ok).toBe(true);
  });

  it("F2: a step accepts the OPTIONAL gates key — an empty gates map is legal-and-inert", () => {
    const result = load(
      template({ steps: "steps:\n  s:\n    role: r\n    instruction: i\n    transitions: {}\n    gates: {}\n" }),
    );
    expect(result.ok).toBe(true);
  });

  it("F1: gates at ROOT is UNKNOWN (it is step surface)", () => {
    const err = expectValidateErr(`${VALID}gates: {}\n`);
    expect(paths(err)).toStrictEqual(["gates"]);
  });

  it("F2: round at STEP grain is UNKNOWN", () => {
    const err = expectValidateErr(
      template({ steps: "steps:\n  s:\n    role: r\n    instruction: i\n    transitions: {}\n    round: {}\n" }),
    );
    expect(paths(err)).toContain("steps.s.round");
  });

  it("F2: runtimeContext at STEP grain is UNKNOWN", () => {
    const err = expectValidateErr(
      template({ steps: "steps:\n  s:\n    role: r\n    instruction: i\n    transitions: {}\n    runtimeContext: required\n" }),
    );
    expect(paths(err)).toContain("steps.s.runtimeContext");
  });

  it("kind is STILL reserved (unknown) after the growth", () => {
    const err = expectValidateErr(`${VALID}kind: template\n`);
    expect(paths(err)).toStrictEqual(["kind"]);
  });
});

// ── packet ch11-P4: F5 the round SOURCE-FORM lanes (dimension 2) ────────

describe("ch11-P4 F5 — the round source-form lanes (dimension 2)", () => {
  it("a SCALAR round → ONE finding at round, dependents suppressed", () => {
    const err = expectValidateErr(`${VALID}round: 5\n`);
    expect(err.findings).toHaveLength(1);
    expect(paths(err)).toStrictEqual(["round"]);
  });

  it("a LIST round → ONE finding at round", () => {
    const err = expectValidateErr(`${VALID}round:\n  - x\n`);
    expect(err.findings).toHaveLength(1);
    expect(paths(err)).toStrictEqual(["round"]);
  });

  it("a PRESENT-NULL round (round: with nothing) → a finding at round (never the F8 absent default)", () => {
    const err = expectValidateErr(`${VALID}round:\n`);
    expect(err.findings).toHaveLength(1);
    expect(paths(err)).toStrictEqual(["round"]);
  });

  it("an UNKNOWN key in the round map → a finding at round.<key>", () => {
    const err = expectValidateErr(`${VALID}round:\n  foo: bar\n`);
    expect(paths(err)).toContain("round.foo");
  });

  it("advanceOnArrivalAt MISSING (empty round map) → a finding at round", () => {
    const err = expectValidateErr(`${VALID}round: {}\n`);
    expect(paths(err)).toContain("round");
  });

  it("a NON-LIST advanceOnArrivalAt (string form) → a finding at round.advanceOnArrivalAt", () => {
    const err = expectValidateErr(`${VALID}round:\n  advanceOnArrivalAt: s\n`);
    expect(paths(err)).toStrictEqual(["round.advanceOnArrivalAt"]);
  });

  it("a NON-LIST advanceOnArrivalAt (map form) → a finding at round.advanceOnArrivalAt", () => {
    const err = expectValidateErr(`${VALID}round:\n  advanceOnArrivalAt:\n    a: 1\n`);
    expect(paths(err)).toStrictEqual(["round.advanceOnArrivalAt"]);
  });

  it("a NON-STRING member (unquoted numeric → a NUMBER) → a finding at round.advanceOnArrivalAt[<i>]", () => {
    const err = expectValidateErr(`${VALID}round:\n  advanceOnArrivalAt:\n    - 0\n`);
    expect(paths(err)).toContain("round.advanceOnArrivalAt[0]");
  });

  it("the F5/F8 split: present-null is a finding, ABSENT is the F8 default (admits all-false)", () => {
    // absent — VALID has no round key.
    const absent = load(VALID);
    expect(absent.ok).toBe(true);
    if (!absent.ok) return;
    expect(absent.template.steps["s"]?.advancesRound).toStrictEqual({});
  });

  it("the positive: a source-form-clean declaration admits with the typed round field", () => {
    const result = load(`${VALID}round:\n  advanceOnArrivalAt:\n    - s\n`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.template.round).toStrictEqual({ advanceOnArrivalAt: ["s"] });
  });
});

// ── packet ch11-P4: F6 the C12 integer source ladder (dimension 3) ──────

const gatedThreshold = (valueSource: string): string => `ref:
  id: t
  version: 1
start: s
steps:
  s:
    role: r
    instruction: i
    transitions:
      GO: done
    gates:
      GO:
        - uses: declarative.threshold
          config:
            metric: round
            op: ">="
            value: ${valueSource}
terminal:
  - done
roles:
  r: {}
`;

const gatedProcess = (timeoutSource: string): string => `ref:
  id: t
  version: 1
start: s
steps:
  s:
    role: r
    instruction: i
    transitions:
      GO: done
    gates:
      GO:
        - uses: external.process
          config:
            command: "echo hi"
            timeoutMs: ${timeoutSource}
            onExit: { zero: allow, nonzero: block }
terminal:
  - done
roles:
  r: {}
runtimeContext:
  kind: worktree
  provider: pairflow.worktree
`;

describe("ch11-P4 F6 — the C12 source ladder for config.value (dimension 3)", () => {
  it("the plain-decimal positive admits", () => {
    expect(loadGated(gatedThreshold("2")).ok).toBe(true);
  });

  const badForms = [
    ["integral float", "900.0"],
    ["hex", "0x384"],
    ["exponent", "9e2"],
    ["double-quoted", '"900"'],
    ["single-quoted", "'900'"],
    ["anchored", "&v 900"],
    ["tagged !!int", "!!int 900"],
    ["leading zero", "0900"],
  ] as const;
  for (const [label, src] of badForms) {
    it(`rejects config.value source form: ${label}`, () => {
      const result = loadGated(gatedThreshold(src));
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.findings.map((f) => (f as { path: string }).path)).toContain(
        "steps.s.gates.GO[0].config.value",
      );
    });
  }

  it("an ALIASED config.value (anchor defined elsewhere) → a source finding", () => {
    const aliased = `ref:
  id: t
  version: 1
start: s
steps:
  s:
    role: r
    instruction: i
    transitions:
      GO: done
    agentConfig:
      anchor: &v 2
    gates:
      GO:
        - uses: declarative.threshold
          config:
            metric: round
            op: ">="
            value: *v
terminal:
  - done
roles:
  r: {}
`;
    const result = loadGated(aliased);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.findings.map((f) => (f as { path: string }).path)).toContain(
      "steps.s.gates.GO[0].config.value",
    );
  });

  it("zero and negative forms fail the ^[1-9] source rule", () => {
    for (const src of ["0", "-1"]) {
      const result = loadGated(gatedThreshold(src));
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.error.findings.map((f) => (f as { path: string }).path)).toContain(
        "steps.s.gates.GO[0].config.value",
      );
    }
  });
});

describe("ch11-P4 F6 — the C12 source ladder for config.timeoutMs (dimension 3)", () => {
  it("the plain-decimal positive ADMITS — F3 materializes the file spec map (the C25 P4-deferral retired), the process gate's C5 cross-rule satisfied", () => {
    // ch12-P4 (F3/A1): a process-gated YAML template now ADMITS — the
    // file-channel runtimeContext spec map WALKS (F3 materializes it into a
    // plain own-property record, retiring the P3 P4-deferred admission
    // refusal), so the process gate's C5 provisionable-requirement cross-rule
    // is satisfied and the plain-decimal timeoutMs is valid: the whole
    // template loads clean.
    const result = loadGated(gatedProcess("600000"));
    expect(result.ok).toBe(true);
  });

  const badForms = [
    ["integral float", "900.0"],
    ["hex", "0x384"],
    ["exponent", "9e2"],
    ["quoted", '"600000"'],
    ["anchored", "&a 900"],
    ["tagged !!int", "!!int 900"],
  ] as const;
  for (const [label, src] of badForms) {
    it(`rejects config.timeoutMs source form: ${label}`, () => {
      const result = loadGated(gatedProcess(src));
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.findings.map((f) => (f as { path: string }).path)).toContain(
        "steps.s.gates.GO[0].config.timeoutMs",
      );
    });
  }

  it("an ALIASED config.timeoutMs (anchor defined elsewhere) → a source finding", () => {
    const aliased = `ref:
  id: t
  version: 1
start: s
steps:
  s:
    role: r
    instruction: i
    transitions:
      GO: done
    agentConfig:
      anchor: &a 900
    gates:
      GO:
        - uses: external.process
          config:
            command: "echo hi"
            timeoutMs: *a
            onExit: { zero: allow, nonzero: block }
terminal:
  - done
roles:
  r: {}
runtimeContext:
  kind: worktree
  provider: pairflow.worktree
`;
    const result = loadGated(aliased);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.findings.map((f) => (f as { path: string }).path)).toContain(
      "steps.s.gates.GO[0].config.timeoutMs",
    );
  });

  it("zero and negative timeoutMs forms fail the ^[1-9] source rule", () => {
    for (const src of ["0", "-900"]) {
      const result = loadGated(gatedProcess(src));
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.error.findings.map((f) => (f as { path: string }).path)).toContain(
        "steps.s.gates.GO[0].config.timeoutMs",
      );
    }
  });
});

describe("ch11-P4 F6 — the source-ladder SCOPING iff, both directions", () => {
  it("the matching authored uses FIRES the ladder (threshold + value 900.0)", () => {
    const result = loadGated(gatedThreshold("900.0"));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(
      result.error.findings.some((f) => (f as { path: string }).path === "steps.s.gates.GO[0].config.value"),
    ).toBe(true);
  });

  it("a C12-named key under a NON-matching authored uses yields NO source finding — only admission's keyset lane", () => {
    // `timeoutMs` under declarative.threshold is NOT F6's field there
    // (that field belongs to external.process); F6 does not fire, and
    // admission reports it as an unknown threshold config key.
    const withStrayTimeout = `ref:
  id: t
  version: 1
start: s
steps:
  s:
    role: r
    instruction: i
    transitions:
      GO: done
    gates:
      GO:
        - uses: declarative.threshold
          config:
            metric: round
            op: ">="
            value: 2
            timeoutMs: "900.0"
terminal:
  - done
roles:
  r: {}
`;
    const result = loadGated(withStrayTimeout);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const timeoutFindings = result.error.findings.filter(
      (f) => (f as { path: string }).path === "steps.s.gates.GO[0].config.timeoutMs",
    );
    // Exactly ONE finding at that path, and it is admission's UNKNOWN-KEY
    // lane (uncoded, keyset message) — NOT a source-form finding.
    expect(timeoutFindings).toHaveLength(1);
    expect(timeoutFindings[0]).not.toHaveProperty("code");
    expect((timeoutFindings[0] as { message: string }).message).toContain("unknown config key");
  });

  it("a `value` key under a NON-matching authored uses (external.process) yields NO source finding — only admission's keyset lane", () => {
    // `value` under external.process is NOT F6's field there (that field
    // belongs to declarative.threshold); F6 does not fire even for the
    // GP4-trap `900.0`, and admission reports it as an unknown process
    // config key. The reverse of the timeoutMs-under-threshold direction.
    const withStrayValue = `ref:
  id: t
  version: 1
start: s
steps:
  s:
    role: r
    instruction: i
    transitions:
      GO: done
    gates:
      GO:
        - uses: external.process
          config:
            command: "echo hi"
            timeoutMs: 1000
            onExit: { zero: allow, nonzero: block }
            value: "900.0"
terminal:
  - done
roles:
  r: {}
runtimeContext:
  kind: worktree
  provider: pairflow.worktree
`;
    const result = loadGated(withStrayValue);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const valueFindings = result.error.findings.filter(
      (f) => (f as { path: string }).path === "steps.s.gates.GO[0].config.value",
    );
    // Exactly ONE finding at that path, admission's UNKNOWN-KEY lane
    // (uncoded, keyset message) — NOT a source-form finding.
    expect(valueFindings).toHaveLength(1);
    expect(valueFindings[0]).not.toHaveProperty("code");
    expect((valueFindings[0] as { message: string }).message).toContain("unknown config key");
  });
});

// ── packet ch12-P4: F1/F2 the `activation` source form (dimension 1) ────

function activationPaths(err: TemplateLoadErrorInfo): string[] {
  return paths(err).filter((p) => p === "activation" || p.startsWith("activation."));
}

describe("ch12-P4 F1/F2 — the activation source form (dimension 1), both directions", () => {
  it("F1: root accepts the OPTIONAL activation key (immediate positive)", () => {
    expect(load(`${VALID}activation:\n  mode: immediate\n`).ok).toBe(true);
  });

  it("F1: activation at STEP grain is UNKNOWN", () => {
    const err = expectValidateErr(
      template({ steps: "steps:\n  s:\n    role: r\n    instruction: i\n    transitions: {}\n    activation: {}\n" }),
    );
    expect(paths(err)).toContain("steps.s.activation");
  });

  it("F1: activation at ROLES-ENTRY grain is UNKNOWN", () => {
    const err = expectValidateErr(template({ roles: "roles:\n  r:\n    activation: {}\n" }));
    expect(paths(err)).toContain("roles.r.activation");
  });

  it("F2: both `mode` members are legal (immediate, deferredKickoff)", () => {
    expect(load(`${VALID}activation:\n  mode: immediate\n`).ok).toBe(true);
    expect(load(`${VALID}activation:\n  mode: deferredKickoff\n`).ok).toBe(true);
  });

  it("F2: the authored camelCase `deferredKickoff` maps to the STORED `deferred_kickoff` on the admitted value", () => {
    const result = load(`${VALID}activation:\n  mode: deferredKickoff\n`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.template.activation).toEqual({ mode: "deferred_kickoff" });
  });

  it("F2: the STORED snake token `deferred_kickoff` is NOT an authored member (a sensitivity lane) → a finding at activation.mode", () => {
    const err = expectValidateErr(`${VALID}activation:\n  mode: deferred_kickoff\n`);
    expect(paths(err)).toContain("activation.mode");
  });

  it("F2: a non-member `mode` value → a finding at activation.mode", () => {
    const err = expectValidateErr(`${VALID}activation:\n  mode: eager\n`);
    expect(paths(err)).toContain("activation.mode");
  });

  for (const [label, form] of [
    ["a number", "activation:\n  mode: 123\n"],
    ["a list", "activation:\n  mode:\n    - immediate\n"],
    ["present-null", "activation:\n  mode:\n"],
  ] as const) {
    it(`F2: a NON-STRING mode (${label}) → a finding at activation.mode (the string/non-string sensitivity — a "reject only bad strings" bug must fail here)`, () => {
      const err = expectValidateErr(`${VALID}${form}`);
      expect(paths(err)).toContain("activation.mode");
    });
  }

  it("F2: an empty activation map (missing mode) → a finding at activation", () => {
    const err = expectValidateErr(`${VALID}activation: {}\n`);
    expect(activationPaths(err)).toStrictEqual(["activation"]);
  });

  it("F2: an unknown key in the activation map → a finding at activation.<key>", () => {
    const err = expectValidateErr(`${VALID}activation:\n  mode: immediate\n  extra: 1\n`);
    expect(paths(err)).toContain("activation.extra");
  });

  for (const [label, form] of [
    ["present-null", "activation:\n"],
    ["a scalar", "activation: hello\n"],
    ["a list", "activation:\n  - x\n"],
  ] as const) {
    it(`F2: a PRESENT non-map activation (${label}) → ONE container finding at activation, dependents suppressed`, () => {
      const err = expectValidateErr(`${VALID}${form}`);
      expect(activationPaths(err)).toStrictEqual(["activation"]);
    });
  }

  it("F2: an ABSENT activation key materializes the immediate default at admission (the walk adds no default)", () => {
    const result = load(VALID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.template.activation).toEqual({ mode: "immediate" });
  });
});

// ── packet ch12-P4: F3 the `runtimeContext` spec-map source form (dim 2) ─

describe("ch12-P4 F3 — the runtimeContext spec-map source form (dimension 2)", () => {
  const withRc = (rc: string): string => `${VALID}runtimeContext:\n${rc}`;

  it("a well-formed spec map materializes to required(spec) (the positive)", () => {
    const result = load(withRc("  kind: worktree\n  provider: pairflow.worktree\n"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.template.runtimeContext).toEqual({
      kind: "worktree",
      provider: "pairflow.worktree",
    });
  });

  it("a missing `kind` → a finding at runtimeContext", () => {
    const err = expectValidateErr(withRc("  provider: pairflow.worktree\n"));
    expect(paths(err)).toContain("runtimeContext");
  });

  it("a missing `provider` → a finding at runtimeContext", () => {
    const err = expectValidateErr(withRc("  kind: worktree\n"));
    expect(paths(err)).toContain("runtimeContext");
  });

  it("a `kind` off the ^[a-z][a-z0-9_]*$ grammar → a finding at runtimeContext.kind", () => {
    const err = expectValidateErr(withRc("  kind: Worktree\n  provider: pairflow.worktree\n"));
    expect(paths(err)).toContain("runtimeContext.kind");
  });

  it("a `provider` off the dotted grammar (no dot) → a finding at runtimeContext.provider", () => {
    const err = expectValidateErr(withRc("  kind: worktree\n  provider: worktree\n"));
    expect(paths(err)).toContain("runtimeContext.provider");
  });

  it("a non-map `config` → a finding at runtimeContext.config", () => {
    const err = expectValidateErr(
      withRc("  kind: worktree\n  provider: pairflow.worktree\n  config: nope\n"),
    );
    expect(paths(err)).toContain("runtimeContext.config");
  });

  it("an unknown spec-map key → a finding at runtimeContext.<key>", () => {
    const err = expectValidateErr(
      withRc("  kind: worktree\n  provider: pairflow.worktree\n  extra: 1\n"),
    );
    expect(paths(err)).toContain("runtimeContext.extra");
  });

  it("RP6: `!!str none` is the string none (context-free) → admits", () => {
    expect(load(`${VALID}runtimeContext: !!str none\n`).ok).toBe(true);
  });

  it("RP6: the capitalized-null family (`None`/`NULL`/`Null`) is a null node → admission's illegal-value container finding", () => {
    for (const nul of ["None", "NULL", "Null"]) {
      const err = expectValidateErr(`${VALID}runtimeContext: ${nul}\n`);
      expect(paths(err)).toContain("runtimeContext");
    }
  });

  it("RP6: a duplicate `kind` key is the document-wide DUPLICATE_KEY (a parse-stage refusal, never a walk finding)", () => {
    const result = load(
      withRc("  kind: worktree\n  kind: other\n  provider: pairflow.worktree\n"),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.stage).toBe("parse");
  });

  it("RP6: a merge key `<<` inside the spec map is a LITERAL key under 1.2 core → double fail-closed (unknown key + still-missing kind)", () => {
    const err = expectValidateErr(
      withRc("  <<:\n    kind: worktree\n  provider: pairflow.worktree\n"),
    );
    // `<<` is not a legal spec-map key (no 1.2 merge) → unknown key; and the
    // map still lacks a legal `kind` → missing-key finding. A silent merge
    // would leave a well-formed spec and this test would fail.
    expect(paths(err)).toContain("runtimeContext.<<");
    expect(paths(err)).toContain("runtimeContext");
  });

  it("RP6: a WHOLE-MAP alias spec map resolves to a plain object graph (no bypass) → the ENTIRE runtimeContext value materializes to a plain own-property record", () => {
    // The WHOLE spec map is anchored on a step's format-open `agentConfig`
    // (`&s`) and the ENTIRE `runtimeContext` value is that alias (`*s`) — this
    // exercises WHOLE-MAP alias resolution/materialization (the value is a
    // `mapAsMap` alias node, not an ordinary map). A raw JS Map or an
    // unresolved alias node slipping through the whole-value alias path fails
    // toEqual (a Map is not deep-equal to a plain object).
    const wholeMapAlias = `ref:
  id: t
  version: 1
start: s
steps:
  s:
    role: r
    instruction: i
    transitions: {}
    agentConfig: &s
      kind: worktree
      provider: pairflow.worktree
      config:
        repo: bubble
terminal:
  - done
roles:
  r: {}
runtimeContext: *s
`;
    const result = load(wholeMapAlias);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.template.runtimeContext).toEqual({
      kind: "worktree",
      provider: "pairflow.worktree",
      config: { repo: "bubble" },
    });
  });

  it("RP6: an INNER anchor/alias in the spec map resolves to a plain value graph (no alias node leaks) — the inner-alias dimension", () => {
    // The provider string is anchored and aliased inside `config.mirror`; the
    // whole template is valid and admits. Complements the whole-map alias test
    // above with an inner (sub-value) alias dimension.
    const result = load(
      withRc("  kind: worktree\n  provider: &p pairflow.worktree\n  config:\n    mirror: *p\n"),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.template.runtimeContext).toEqual({
      kind: "worktree",
      provider: "pairflow.worktree",
      config: { mirror: "pairflow.worktree" },
    });
  });
});

// ── packet ch12-P4: F4 the roles-entry defaultAgentConfig (dimension 3) ─

describe("ch12-P4 F4 — the defaultAgentConfig roles-entry source form (dimension 3)", () => {
  it("a roles entry accepts the OPTIONAL defaultAgentConfig key (positive)", () => {
    const result = load(
      template({ roles: "roles:\n  r:\n    defaultAgentConfig:\n      mode: builder\n" }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.template.roles["r"]?.defaultAgentConfig).toEqual({ mode: "builder" });
  });

  it("defaultActor + defaultAgentConfig together are both delivered", () => {
    const result = load(
      template({
        roles: "roles:\n  r:\n    defaultActor: codex\n    defaultAgentConfig:\n      approach: tdd\n",
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // ch13v2-C13: the authored config survives UNMODIFIED (the ch12
    // cascade reads it there) and the produced ref list rides beside it —
    // empty, this config authoring no promptConcernRefs.
    expect(result.template.roles["r"]).toEqual({
      defaultActor: "codex",
      defaultAgentConfig: { approach: "tdd" },
      promptConcernRefs: [],
    });
  });

  it("defaultAgentConfig at ROOT is UNKNOWN", () => {
    const err = expectValidateErr(`${VALID}defaultAgentConfig: {}\n`);
    expect(paths(err)).toStrictEqual(["defaultAgentConfig"]);
  });

  it("defaultAgentConfig at STEP grain is UNKNOWN", () => {
    const err = expectValidateErr(
      template({ steps: "steps:\n  s:\n    role: r\n    instruction: i\n    transitions: {}\n    defaultAgentConfig: {}\n" }),
    );
    expect(paths(err)).toContain("steps.s.defaultAgentConfig");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// packet ch13-p1a — the context-block surface on the FILE channel.
//
// The same ch13v2 lane inventory (ch13v2-C19), driven through the load
// pipeline's validate stage. Channel scope is an ENGINE property of the
// one declaration, so the paths and messages are the direct channel's;
// what differs is DECLARED, and family 3's rows below are exactly those
// differences.
// ═══════════════════════════════════════════════════════════════════════

/** The ch13 file fixture: one step with one transition (so a gates key
 * has an operand), one role, and whichever ch13 positions a row needs.
 * `stepExtra` and `roleEntry` are authored at their own indent. */
function ctxYaml(parts: {
  readonly contextBlocks?: string;
  readonly roleEntry?: string;
  readonly stepExtra?: string;
} = {}): string {
  return [
    "ref:\n  id: t\n  version: 1\n",
    "start: s\n",
    `steps:\n  s:\n    role: r\n    instruction: i\n    transitions:\n      GO: done\n${parts.stepExtra ?? ""}`,
    "terminal:\n  - done\n",
    parts.roleEntry === undefined ? "roles:\n  r: {}\n" : `roles:\n  r:\n${parts.roleEntry}`,
    parts.contextBlocks ?? "",
  ].join("");
}

/** The whole finding set of one FILE-channel admission, or [] on success. */
function ctxFileFindings(text: string): readonly ValidationFinding[] {
  const result = loadGated(text);
  return result.ok ? [] : (result.error.findings as readonly ValidationFinding[]);
}

const CTX_BLOCK_GRAMMAR = "^[a-z][a-z0-9-]*$";
const CTX_NONEMPTY_REF = 'invalid context block ref "": block ids are kebab-case strings';
const CTX_EMPTY_KEY = 'invalid context block id "": block ids are kebab-case strings';
const CATALOG_ALPHA = "contextBlocks:\n  alpha:\n    body: x\n";
const ROLE_REF_ALPHA = "    defaultAgentConfig:\n      promptConcernRefs:\n        - alpha\n";
const GATE = (refs?: string): string =>
  `    gates:\n      GO:\n        - uses: declarative.threshold\n          config: { metric: round, op: ">=", value: 2 }\n${refs ?? ""}`;
const UNRESOLVED_ROLE_ALPHA: ValidationFinding = {
  path: "roles.r.defaultAgentConfig.promptConcernRefs[0]",
  message: 'context block ref "alpha" does not resolve to an entry',
  code: "unresolved_context_block_ref",
};

interface FileLaneCase {
  readonly lane: string;
  readonly bad: string;
  readonly findings: readonly ValidationFinding[];
  readonly good: string;
}

const CTX_FILE_LANES: readonly FileLaneCase[] = [
  {
    lane: "d-ctxblocks (container lane)",
    bad: ctxYaml({ contextBlocks: "contextBlocks: 7\n" }),
    findings: [{ path: "contextBlocks", message: "contextBlocks must be a map of block-id -> { body }; got 7" }],
    good: ctxYaml({ contextBlocks: "contextBlocks: {}\n" }),
  },
  {
    lane: "d-block-key (key lane) + the C9 audit reporting beside it",
    bad: ctxYaml({ contextBlocks: "contextBlocks:\n  Bad Key:\n    body: x\n" }),
    findings: [
      { path: "contextBlocks", message: `invalid context block id "Bad Key": block ids match ${CTX_BLOCK_GRAMMAR}` },
      { path: "contextBlocks.Bad Key", message: 'context block "Bad Key" is declared but no ref names it' },
    ],
    good: ctxYaml({ contextBlocks: CATALOG_ALPHA, roleEntry: ROLE_REF_ALPHA }),
  },
  {
    lane: "d-ctx-entry (container lane) + the C7 per-site finding beside it",
    bad: ctxYaml({ contextBlocks: "contextBlocks:\n  alpha: 7\n", roleEntry: ROLE_REF_ALPHA }),
    findings: [
      { path: "contextBlocks.alpha", message: "a context block entry must be a map with exactly body; got 7" },
      UNRESOLVED_ROLE_ALPHA,
    ],
    good: ctxYaml({ contextBlocks: CATALOG_ALPHA, roleEntry: ROLE_REF_ALPHA }),
  },
  {
    lane: "d-ctx-entry (unknown-key lane)",
    bad: ctxYaml({ contextBlocks: "contextBlocks:\n  alpha:\n    body: x\n    extra: 1\n", roleEntry: ROLE_REF_ALPHA }),
    findings: [
      {
        path: "contextBlocks.alpha.extra",
        message: 'unknown key "extra" (a context block entry\'s only key is body)',
      },
      UNRESOLVED_ROLE_ALPHA,
    ],
    good: ctxYaml({ contextBlocks: CATALOG_ALPHA, roleEntry: ROLE_REF_ALPHA }),
  },
  {
    lane: "d-ctx-entry (missing-key lane)",
    bad: ctxYaml({ contextBlocks: "contextBlocks:\n  alpha: {}\n", roleEntry: ROLE_REF_ALPHA }),
    findings: [
      { path: "contextBlocks.alpha", message: 'missing required key "body"' },
      UNRESOLVED_ROLE_ALPHA,
    ],
    good: ctxYaml({ contextBlocks: CATALOG_ALPHA, roleEntry: ROLE_REF_ALPHA }),
  },
  {
    lane: "d-ctx-body (type lane)",
    bad: ctxYaml({ contextBlocks: "contextBlocks:\n  alpha:\n    body: 7\n", roleEntry: ROLE_REF_ALPHA }),
    findings: [
      { path: "contextBlocks.alpha.body", message: "body must be a nonempty string; got 7" },
      UNRESOLVED_ROLE_ALPHA,
    ],
    good: ctxYaml({ contextBlocks: CATALOG_ALPHA, roleEntry: ROLE_REF_ALPHA }),
  },
  {
    lane: "d-ctx-body (nonempty lane)",
    bad: ctxYaml({ contextBlocks: 'contextBlocks:\n  alpha:\n    body: ""\n', roleEntry: ROLE_REF_ALPHA }),
    findings: [
      { path: "contextBlocks.alpha.body", message: "body must be a nonempty string" },
      UNRESOLVED_ROLE_ALPHA,
    ],
    good: ctxYaml({ contextBlocks: CATALOG_ALPHA, roleEntry: ROLE_REF_ALPHA }),
  },
  {
    lane: "vc-blockidlist (container lane) at the ROLE position",
    bad: ctxYaml({
      contextBlocks: CATALOG_ALPHA,
      roleEntry: "    defaultAgentConfig:\n      promptConcernRefs: nope\n",
    }),
    findings: [
      {
        path: "roles.r.defaultAgentConfig.promptConcernRefs",
        message: 'promptConcernRefs must be a list of context block ids; got "nope"',
      },
    ],
    good: ctxYaml({ contextBlocks: CATALOG_ALPHA, roleEntry: ROLE_REF_ALPHA }),
  },
  {
    lane: "vc-blockidlist (container lane) at the STEP position",
    bad: ctxYaml({
      contextBlocks: CATALOG_ALPHA,
      stepExtra: "    agentConfig:\n      promptConcernRefs: nope\n",
    }),
    findings: [
      {
        path: "steps.s.agentConfig.promptConcernRefs",
        message: 'promptConcernRefs must be a list of context block ids; got "nope"',
      },
    ],
    good: ctxYaml({
      contextBlocks: CATALOG_ALPHA,
      stepExtra: "    agentConfig:\n      promptConcernRefs:\n        - alpha\n",
    }),
  },
  {
    lane: "vc-blockidlist (container lane) at the GATE position",
    bad: ctxYaml({ contextBlocks: CATALOG_ALPHA, stepExtra: GATE("          contextBlockRefs: nope\n") }),
    findings: [
      {
        path: "steps.s.gates.GO[0].contextBlockRefs",
        message: 'contextBlockRefs must be a list of context block ids; got "nope"',
      },
    ],
    good: ctxYaml({
      contextBlocks: CATALOG_ALPHA,
      stepExtra: GATE("          contextBlockRefs:\n            - alpha\n"),
    }),
  },
  {
    lane: "vc-block-id (member type lane)",
    bad: ctxYaml({ roleEntry: "    defaultAgentConfig:\n      promptConcernRefs:\n        - 7\n" }),
    findings: [
      {
        path: "roles.r.defaultAgentConfig.promptConcernRefs[0]",
        message: "invalid context block ref 7: block ids are kebab-case strings",
      },
    ],
    good: ctxYaml({ contextBlocks: CATALOG_ALPHA, roleEntry: ROLE_REF_ALPHA }),
  },
  {
    lane: "vc-block-id (nonempty lane) at the MEMBER position",
    bad: ctxYaml({ roleEntry: '    defaultAgentConfig:\n      promptConcernRefs:\n        - ""\n' }),
    findings: [
      { path: "roles.r.defaultAgentConfig.promptConcernRefs[0]", message: CTX_NONEMPTY_REF },
    ],
    good: ctxYaml({ contextBlocks: CATALOG_ALPHA, roleEntry: ROLE_REF_ALPHA }),
  },
  {
    lane: "vc-block-id (nonempty lane) at the KEY position",
    bad: ctxYaml({ contextBlocks: 'contextBlocks:\n  "":\n    body: x\n' }),
    findings: [
      { path: "contextBlocks", message: CTX_EMPTY_KEY },
      { path: "contextBlocks.", message: 'context block "" is declared but no ref names it' },
    ],
    good: ctxYaml({ contextBlocks: CATALOG_ALPHA, roleEntry: ROLE_REF_ALPHA }),
  },
  {
    lane: "vc-block-id (grammar lane)",
    bad: ctxYaml({ roleEntry: "    defaultAgentConfig:\n      promptConcernRefs:\n        - Bad Ref\n" }),
    findings: [
      {
        path: "roles.r.defaultAgentConfig.promptConcernRefs[0]",
        message: `invalid context block ref "Bad Ref": block ids match ${CTX_BLOCK_GRAMMAR}`,
      },
    ],
    good: ctxYaml({ contextBlocks: CATALOG_ALPHA, roleEntry: ROLE_REF_ALPHA }),
  },
  {
    lane: "vc-blockidlist (duplicate lane, per occurrence)",
    bad: ctxYaml({
      contextBlocks: CATALOG_ALPHA,
      roleEntry: "    defaultAgentConfig:\n      promptConcernRefs:\n        - alpha\n        - alpha\n",
    }),
    findings: [
      {
        path: "roles.r.defaultAgentConfig.promptConcernRefs[1]",
        message: 'duplicate context block ref "alpha"',
      },
    ],
    good: ctxYaml({ contextBlocks: CATALOG_ALPHA, roleEntry: ROLE_REF_ALPHA }),
  },
  {
    lane: "vc-blockidlist (the CODED resolution lane)",
    bad: ctxYaml({ roleEntry: "    defaultAgentConfig:\n      promptConcernRefs:\n        - ghost\n" }),
    findings: [
      {
        path: "roles.r.defaultAgentConfig.promptConcernRefs[0]",
        message: 'context block ref "ghost" does not resolve to an entry',
        code: "unresolved_context_block_ref",
      },
    ],
    good: ctxYaml({
      contextBlocks: "contextBlocks:\n  ghost:\n    body: x\n",
      roleEntry: "    defaultAgentConfig:\n      promptConcernRefs:\n        - ghost\n",
    }),
  },
  {
    lane: "the C9 hygiene lane",
    bad: ctxYaml({ contextBlocks: CATALOG_ALPHA }),
    findings: [
      { path: "contextBlocks.alpha", message: 'context block "alpha" is declared but no ref names it' },
    ],
    good: ctxYaml({ contextBlocks: CATALOG_ALPHA, roleEntry: ROLE_REF_ALPHA }),
  },
  {
    // The C9 audit's AUDITED-SET half, and the ONE document that
    // discriminates it: a NON-STRING catalog key survives only on this
    // channel (the file walk preserves resolved key types), and the
    // engine writes an entry into the NORMALIZED catalog only where the
    // key is a string. An audit reading the normalized value therefore
    // drops this entry and accuses nobody — measured, not predicted:
    // under that one-word change this row's hygiene finding vanishes
    // while every other test in the tree stays green.
    lane: "the C9 hygiene lane over a NON-STRING key (the audited set reads the RAW document)",
    bad: ctxYaml({ contextBlocks: "contextBlocks:\n  true:\n    body: x\n" }),
    findings: [
      { path: "contextBlocks", message: "invalid context block id true: block ids are kebab-case strings" },
      { path: "contextBlocks", message: "context block true is declared but no ref names it" },
    ],
    good: ctxYaml({ contextBlocks: CATALOG_ALPHA, roleEntry: ROLE_REF_ALPHA }),
  },
];

describe("ch13-p1a family 1 — the ch13v2 lane inventory, DRIVEN (file channel)", () => {
  for (const lane of CTX_FILE_LANES) {
    it(`${lane.lane}: the violating input produces exactly its finding set`, () => {
      expect(ctxFileFindings(lane.bad)).toStrictEqual(lane.findings);
    });

    it(`${lane.lane}: the conforming input produces none`, () => {
      expect(ctxFileFindings(lane.good)).toStrictEqual([]);
    });
  }
});

describe("ch13-p1a family 3 — the admitted form on the FILE channel (the declared differences)", () => {
  const admittedFile = (text: string): WorkflowTemplate => {
    const result = loadGated(text);
    if (!result.ok) throw new Error(`expected a template: ${JSON.stringify(result.error.findings)}`);
    return result.template;
  };

  it("the STEP's produced key is UNKNOWN in a file — the channel gate, in the refusing direction", () => {
    expect(ctxFileFindings(ctxYaml({ stepExtra: "    promptConcernRefs: []\n" }))).toStrictEqual([
      { path: "steps.s.promptConcernRefs", message: 'unknown key "promptConcernRefs"' },
    ]);
  });

  it("the ROLES-ENTRY's produced key is UNKNOWN in a file — likewise", () => {
    expect(ctxFileFindings(ctxYaml({ roleEntry: "    promptConcernRefs: []\n" }))).toStrictEqual([
      { path: "roles.r.promptConcernRefs", message: 'unknown key "promptConcernRefs"' },
    ]);
  });

  it("the BINDING's ref key is AUTHORABLE in a file — the stated exclusion (C6's authored key, channel-both)", () => {
    const template = admittedFile(
      ctxYaml({
        contextBlocks: CATALOG_ALPHA,
        stepExtra: GATE("          contextBlockRefs:\n            - alpha\n"),
      }),
    );
    expect(template.steps["s"]?.gates?.["GO"]?.[0]?.contextBlockRefs).toStrictEqual(["alpha"]);
  });

  it("the normalizer writes BOTH produced positions on the file channel too, from the nested authored source", () => {
    const template = admittedFile(ctxYaml({ contextBlocks: CATALOG_ALPHA, roleEntry: ROLE_REF_ALPHA }));
    expect(template.roles["r"]?.promptConcernRefs).toStrictEqual(["alpha"]);
    // …and the step position, whose source this file does not author.
    expect(template.steps["s"]?.promptConcernRefs).toStrictEqual([]);
  });

  it("the STEP position × PRESENT-POPULATED on this channel: the authored nested list is lifted, not defaulted", () => {
    // The matrix cell the role-authored fixture above cannot cover: with
    // the step's own source populated, an implementation that lifts only
    // the role position — or defaults this one to the empty list — reds
    // here and nowhere else.
    const template = admittedFile(
      ctxYaml({
        contextBlocks: CATALOG_ALPHA,
        stepExtra: "    agentConfig:\n      promptConcernRefs:\n        - alpha\n",
      }),
    );
    expect(template.steps["s"]?.promptConcernRefs).toStrictEqual(["alpha"]);
    // the authored source survives unmodified beside it (the ch12 cascade)
    expect(template.steps["s"]?.agentConfig).toStrictEqual({ promptConcernRefs: ["alpha"] });
    // …and the role position, whose source this file does not author.
    expect(template.roles["r"]?.promptConcernRefs).toStrictEqual([]);
  });

  it("BOTH sources populated at once: each position lifts its OWN, neither borrows the other's", () => {
    const template = admittedFile(
      ctxYaml({
        contextBlocks: "contextBlocks:\n  alpha:\n    body: x\n  beta:\n    body: y\n",
        roleEntry: "    defaultAgentConfig:\n      promptConcernRefs:\n        - alpha\n",
        stepExtra: "    agentConfig:\n      promptConcernRefs:\n        - beta\n",
      }),
    );
    expect(template.roles["r"]?.promptConcernRefs).toStrictEqual(["alpha"]);
    expect(template.steps["s"]?.promptConcernRefs).toStrictEqual(["beta"]);
  });

  it("an absent gate ref key materializes the declared empty list on this channel as well", () => {
    const template = admittedFile(ctxYaml({ stepExtra: GATE() }));
    expect(template.steps["s"]?.gates?.["GO"]?.[0]?.contextBlockRefs).toStrictEqual([]);
  });
});

// ── ch13-p1a family 2 on the FILE channel: the same five normative pairs
// D13 names, staged as combination lanes through the load pipeline. The
// dimension the packet governs every guarantee by is CHANNEL, and a pair
// driven on one channel only leaves the other free to reorder. ──────────

const ROLE_REFS = (...refs: readonly string[]): string =>
  `    defaultAgentConfig:\n      promptConcernRefs:\n${refs.map((r) => `        - ${r}\n`).join("")}`;
const CATALOG_TWO = "contextBlocks:\n  alpha:\n    body: x\n  beta:\n    body: y\n";

/** Findings addressed INSIDE the catalog. Every entry in these fixtures
 * is well-formed, so the hygiene lane is the only lane that can report
 * there — the set is read structurally, never by matching prose. */
function ctxCatalogFindings(findings: readonly ValidationFinding[]): readonly ValidationFinding[] {
  return findings.filter((f) => f.path === "contextBlocks" || f.path.startsWith("contextBlocks."));
}

describe("ch13-p1a family 2 — lane independence on the FILE channel", () => {
  it("C1 + C7: refs issued BESIDE a refused catalog draw the container finding AND their per-site findings", () => {
    expect(
      ctxFileFindings(ctxYaml({ contextBlocks: "contextBlocks: 7\n", roleEntry: ROLE_REFS("alpha") })),
    ).toStrictEqual([
      { path: "contextBlocks", message: "contextBlocks must be a map of block-id -> { body }; got 7" },
      UNRESOLVED_ROLE_ALPHA,
    ]);
  });

  it("C7 + C8: a DUPLICATED unresolved ref reports per occurrence beside the duplicate finding", () => {
    expect(
      ctxFileFindings(ctxYaml({ contextBlocks: "contextBlocks: {}\n", roleEntry: ROLE_REFS("ghost", "ghost") })),
    ).toStrictEqual([
      { path: "roles.r.defaultAgentConfig.promptConcernRefs[1]", message: 'duplicate context block ref "ghost"' },
      {
        path: "roles.r.defaultAgentConfig.promptConcernRefs[0]",
        message: 'context block ref "ghost" does not resolve to an entry',
        code: "unresolved_context_block_ref",
      },
      {
        path: "roles.r.defaultAgentConfig.promptConcernRefs[1]",
        message: 'context block ref "ghost" does not resolve to an entry',
        code: "unresolved_context_block_ref",
      },
    ]);
  });

  it("C8: a SHAPE-FAILING member repeated is invisible to every list-level lane", () => {
    expect(
      ctxFileFindings(ctxYaml({ contextBlocks: "contextBlocks: {}\n", roleEntry: ROLE_REFS("Bad Ref", "Bad Ref") })),
    ).toStrictEqual([
      {
        path: "roles.r.defaultAgentConfig.promptConcernRefs[0]",
        message: `invalid context block ref "Bad Ref": block ids match ${CTX_BLOCK_GRAMMAR}`,
      },
      {
        path: "roles.r.defaultAgentConfig.promptConcernRefs[1]",
        message: `invalid context block ref "Bad Ref": block ids match ${CTX_BLOCK_GRAMMAR}`,
      },
    ]);
  });

  it("C9's carve-out from C8: a GRAMMAR-FAILING mention still names its target", () => {
    const findings = ctxFileFindings(
      ctxYaml({ contextBlocks: CATALOG_TWO, roleEntry: ROLE_REFS("alpha", "Bad Ref") }),
    );
    expect(ctxCatalogFindings(findings)).toStrictEqual([
      { path: "contextBlocks.beta", message: 'context block "beta" is declared but no ref names it' },
    ]);
  });

  it("C8's compound CLEAN case at the GATE position (an injected registry): zero findings", () => {
    expect(
      ctxFileFindings(
        ctxYaml({
          contextBlocks: CATALOG_TWO,
          stepExtra: GATE("          contextBlockRefs:\n            - alpha\n            - beta\n"),
        }),
      ),
    ).toStrictEqual([]);
  });

  it("the C9 stand-down is template-wide on this channel too: a marking malformation silences the whole audit", () => {
    // The mention of `alpha` sits inside a DEAD gate key and `beta` is
    // named nowhere at all; the dead-config skip marks the enclosure, so
    // neither is accused. The intact twin accuses both.
    const broken = ctxYaml({
      contextBlocks: CATALOG_TWO,
      stepExtra: `    gates:\n      GHOST:\n        - uses: declarative.threshold\n          config: { metric: round, op: ">=", value: 2 }\n          contextBlockRefs:\n            - alpha\n`,
    });
    expect(ctxCatalogFindings(ctxFileFindings(broken))).toStrictEqual([]);
    expect(ctxCatalogFindings(ctxFileFindings(ctxYaml({ contextBlocks: CATALOG_TWO })))).toStrictEqual([
      { path: "contextBlocks.alpha", message: 'context block "alpha" is declared but no ref names it' },
      { path: "contextBlocks.beta", message: 'context block "beta" is declared but no ref names it' },
    ]);
  });
});

// ── The C9 stand-down on the FILE channel, PARAMETERIZED over the same
// derived trigger set the direct suite drives (packet row D7's floor).
// One route was driven above — the dead-config one, because it is the
// route the engine did not mark before this packet. The remaining twelve
// are the floor's other members: eleven markable tags, the gates node
// carrying two routes. Each document gives `alpha` its only mention
// INSIDE the broken enclosure and leaves `beta` named nowhere, so a
// template-wide stand-down leaves both unaccused and a per-entry one does
// not; each carries the intact control that accuses both. ───────────────

const SD_STEPS = (extra = ""): string =>
  `steps:\n  s:\n    role: r\n    instruction: i\n    transitions:\n      GO: done\n${extra}`;
const SD_GATE = (refs = ""): string =>
  `    gates:\n      GO:\n        - uses: declarative.threshold\n          config: { metric: round, op: ">=", value: 2 }\n${refs}`;

const sdDoc = (parts: { steps?: string; roles?: string }): string =>
  `ref:\n  id: t\n  version: 1\nstart: s\n${parts.steps ?? SD_STEPS()}terminal:\n  - done\n${
    parts.roles ?? "roles:\n  r: {}\n"
  }${CATALOG_TWO}`;

const SD_ROUTES: readonly { tag: string; broken: string; intact: string }[] = [
  {
    tag: "d-prompt-refs (the role ref list itself)",
    broken: sdDoc({ roles: "roles:\n  r:\n    defaultAgentConfig:\n      promptConcernRefs: alpha\n" }),
    intact: sdDoc({ roles: "roles:\n  r:\n    defaultAgentConfig:\n      promptConcernRefs: []\n" }),
  },
  {
    tag: "d-prompt-refs (the step ref list itself)",
    broken: sdDoc({ steps: SD_STEPS("    agentConfig:\n      promptConcernRefs: alpha\n") }),
    intact: sdDoc({ steps: SD_STEPS("    agentConfig:\n      promptConcernRefs: []\n") }),
  },
  {
    tag: "d-ctx-gate-refs (the gate ref list itself)",
    broken: sdDoc({ steps: SD_STEPS(SD_GATE("          contextBlockRefs: alpha\n")) }),
    intact: sdDoc({ steps: SD_STEPS(SD_GATE("          contextBlockRefs: []\n")) }),
  },
  {
    tag: "d-agentconfig (the step's config container)",
    broken: sdDoc({ steps: SD_STEPS("    agentConfig: 7\n") }),
    intact: sdDoc({ steps: SD_STEPS("    agentConfig: {}\n") }),
  },
  {
    tag: "d-defaultagent (the role's config container)",
    broken: sdDoc({ roles: "roles:\n  r:\n    defaultAgentConfig: 7\n" }),
    intact: sdDoc({ roles: "roles:\n  r:\n    defaultAgentConfig: {}\n" }),
  },
  {
    tag: "d-binding",
    broken: sdDoc({ steps: SD_STEPS("    gates:\n      GO:\n        - 7\n") }),
    intact: sdDoc({ steps: SD_STEPS(SD_GATE()) }),
  },
  {
    tag: "d-pipeline",
    broken: sdDoc({ steps: SD_STEPS("    gates:\n      GO: 7\n") }),
    intact: sdDoc({ steps: SD_STEPS(SD_GATE()) }),
  },
  {
    tag: "d-gates (the container route)",
    broken: sdDoc({ steps: SD_STEPS("    gates: 7\n") }),
    intact: sdDoc({ steps: SD_STEPS("    gates: {}\n") }),
  },
  {
    tag: "d-step",
    broken: sdDoc({ steps: "steps:\n  s: 7\n" }),
    intact: sdDoc({}),
  },
  {
    tag: "d-steps",
    broken: sdDoc({ steps: "steps: 7\n" }),
    intact: sdDoc({}),
  },
  {
    tag: "d-roles-entry",
    broken: sdDoc({ roles: "roles:\n  r: 7\n" }),
    intact: sdDoc({}),
  },
  {
    tag: "d-roles",
    broken: sdDoc({ roles: "roles: 7\n" }),
    intact: sdDoc({}),
  },
];

describe("ch13-p1a family 2 — the C9 stand-down over the derived trigger set (FILE channel)", () => {
  for (const route of SD_ROUTES) {
    it(`${route.tag}: a marking malformation stands the whole audit down`, () => {
      expect(ctxCatalogFindings(ctxFileFindings(route.broken))).toStrictEqual([]);
    });

    it(`${route.tag}: the DISCRIMINATING control — the same document intact accuses both entries`, () => {
      expect(ctxCatalogFindings(ctxFileFindings(route.intact))).toStrictEqual([
        { path: "contextBlocks.alpha", message: 'context block "alpha" is declared but no ref names it' },
        { path: "contextBlocks.beta", message: 'context block "beta" is declared but no ref names it' },
      ]);
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// packet ch14-p1 — the human-decision / bare-wait DECLARATION surface on
// the FILE-WALK channel. Both entries reach ONE computation, so this half
// exists for what DIFFERENTIATES the channels — the `type` token DOMAIN
// (ch14-C1's authored↔stored map), the produced-field carve-out, and the
// cases only a file can EXPRESS (a non-string key, a duplicate key) —
// plus every lane driven through the real file entry, because a
// one-channel lane is exactly where a blind spot hides.
// ═══════════════════════════════════════════════════════════════════════

const CH14_HEAD = "ref:\n  id: t\n  version: 1\nstart: implement\n";
const CH14_TAIL = "terminal:\n  - done\nroles:\n  implementer: {}\n  operator: {}\n";

const CH14_AGENT = "  implement:\n    role: implementer\n    instruction: i\n    transitions:\n      PASS: gate\n";
const CH14_GATE =
  "  gate:\n    type: humanGate\n    role: operator\n    instruction: q\n" +
  "    decisions:\n      approve:\n        target: done\n";
const CH14_WAIT =
  "  hold:\n    type: wait\n    wait:\n      kind: commit_pending\n      resumeEvents:\n        - COMMIT\n" +
  "    onResume:\n      COMMIT: done\n";

/** A three-class FILE, each step block replaceable. */
function ch14File(over: { agent?: string; gate?: string; wait?: string; tail?: string } = {}): string {
  return (
    CH14_HEAD +
    "steps:\n" +
    (over.agent ?? CH14_AGENT) +
    (over.gate ?? CH14_GATE) +
    (over.wait ?? CH14_WAIT) +
    (over.tail ?? CH14_TAIL)
  );
}

function ch14Findings(text: string): readonly ValidationFinding[] {
  return expectValidateErr(text).findings as readonly ValidationFinding[];
}

describe("ch14-P1 family 1 (file channel) — the discriminator's TOKEN DOMAIN and its STORE pin", () => {
  it("the authored camelCase spelling admits, and the ADMITTED value carries the STORED token", () => {
    const result = load(ch14File());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const steps = result.template.steps as unknown as Record<string, Record<string, unknown>>;
    expect(steps["gate"]?.["type"]).toBe("human_gate");
    // `wait` is IDENTICAL on both sides — one unscoped member with its
    // own store, not a duplicated pair.
    expect(steps["hold"]?.["type"]).toBe("wait");
  });

  it("SENSITIVITY TWIN: the STORED token is refused as an authored FILE value", () => {
    const findings = ch14Findings(ch14File({ gate: CH14_GATE.replace("humanGate", "human_gate") }));
    expect(findings).toContainEqual({
      path: "steps.gate.type",
      message: 'type must be one of humanGate, wait; got "human_gate"',
    });
  });

  it("each channel renders its OWN spellings — the enum lane filters members before rendering", () => {
    const findings = ch14Findings(ch14File({ gate: CH14_GATE.replace("humanGate", "nope") }));
    expect(findings).toContainEqual({
      path: "steps.gate.type",
      message: 'type must be one of humanGate, wait; got "nope"',
    });
  });
});

/** The ONE id grammar's message tail — the D9 ban clause beside the
 * standing whitespace/dot clause — spelled once so a row asserting a
 * grammar finding by literal value cannot drift from its neighbours. */
const ID_RULE =
  ': ids contain no whitespace and no "." and are not the canonical decimal spelling of an ' +
  "integer in 0…4294967294 (a JS record hoists those keys)";

// ── FAMILY 1 (FILE CHANNEL): the SAME declaration-derived lane register
// the direct channel drives, expanded WHOLE here rather than sampled —
// one row per lane of every node this packet mints, with the finding SET
// asserted by equality so a spurious extra reds. The register's node set
// is checked against the same seventeen-node derivation `admit.test.ts`
// carries; drift between the two halves is what the pair exists to catch.
// A lane that fires only on one channel is exactly the blind spot the
// two-channel discipline exists for. ─────────────────────────────────────

/** A humanGate whose `decisions` body is the variable. */
function ch14Gate(decisions: string): string {
  return "  gate:\n    type: humanGate\n    role: operator\n    instruction: q\n" + decisions;
}

/** A bare wait whose `wait` / `onResume` bodies are the variables. */
function ch14Hold(body: string): string {
  return "  hold:\n    type: wait\n" + body;
}

const APPROVE_DONE = "    decisions:\n      approve:\n        target: done\n";

interface FileLaneRow {
  /** The lane's CHANNEL-INDEPENDENT identity — the half the direct
   * register carries verbatim. `lane` beside it is this channel's own
   * prose, which the two registers legitimately word differently. */
  readonly id: string;
  readonly node: string;
  readonly lane: string;
  readonly text: string;
  readonly findings: readonly ValidationFinding[];
}

const CH14_FILE_LANES: readonly FileLaneRow[] = [
  { id: "d-step-type/value-unknown-token", node: "d-step-type", lane: "value (an unknown token)",
    text: ch14File({ gate: ch14Gate(APPROVE_DONE).replace("humanGate", "nope") }),
    findings: [
      { path: "steps.gate.type", message: "type must be one of humanGate, wait; got \"nope\"" },
    ] },
  { id: "d-step-type/value-other-channels-spelling", node: "d-step-type", lane: "value (the STORED spelling is not this channel's authored one)",
    text: ch14File({ gate: ch14Gate(APPROVE_DONE).replace("humanGate", "human_gate") }),
    findings: [
      { path: "steps.gate.type", message: "type must be one of humanGate, wait; got \"human_gate\"" },
    ] },
  { id: "d-decisions/container", node: "d-decisions", lane: "container",
    text: ch14File({ gate: ch14Gate("    decisions: x\n") }),
    findings: [
      { path: "steps.gate.decisions", code: "invalid_decision_gate_config", message: "decisions must be a map of decision key -> { target, payload? }; got \"x\"" },
    ] },
  { id: "d-decision-key/key-grammar", node: "d-decision-key", lane: "key grammar",
    text: ch14File({ gate: ch14Gate("    decisions:\n      \"a b\":\n        target: done\n") }),
    findings: [
      { path: "steps.gate.decisions", message: `invalid decision key "a b"${ID_RULE}` },
    ] },
  { id: "d-decision-entry/container", node: "d-decision-entry", lane: "container",
    text: ch14File({ gate: ch14Gate("    decisions:\n      approve: 5\n") }),
    findings: [
      { path: "steps.gate.decisions.approve", code: "invalid_decision_gate_config", message: "a decision must be a map with exactly target (+ optional payload); got 5" },
    ] },
  { id: "d-decision-entry/unknown-key", node: "d-decision-entry", lane: "unknown key",
    text: ch14File({ gate: ch14Gate("    decisions:\n      approve:\n        target: done\n        paylod: {}\n") }),
    findings: [
      { path: "steps.gate.decisions.approve.paylod", code: "invalid_decision_gate_config", message: "unknown decision key 'paylod' (allowed: target, payload)" },
    ] },
  { id: "d-decision-entry/missing-target", node: "d-decision-entry", lane: "missing `target`",
    text: ch14File({ gate: ch14Gate("    decisions:\n      approve: {}\n") }),
    findings: [
      { path: "steps.gate.decisions.approve", code: "invalid_decision_gate_config", message: "missing required key \"target\"" },
    ] },
  { id: "d-decision-target/membership-unresolvable", node: "d-decision-target", lane: "membership (unresolvable)",
    text: ch14File({ gate: ch14Gate("    decisions:\n      approve:\n        target: ghost\n") }),
    findings: [
      { path: "steps.gate.decisions.approve.target", code: "decision_target_unresolved", message: "decision target must name a step or a terminal id; got \"ghost\"" },
    ] },
  { id: "d-decision-target/membership-non-string", node: "d-decision-target", lane: "membership owns the NON-STRING fault too — ONE finding, no type lane",
    text: ch14File({ gate: ch14Gate("    decisions:\n      approve:\n        target: 5\n") }),
    findings: [
      { path: "steps.gate.decisions.approve.target", code: "decision_target_unresolved", message: "decision target must name a step or a terminal id; got 5" },
    ] },
  { id: "d-decision-payload/container", node: "d-decision-payload", lane: "container",
    text: ch14File({ gate: ch14Gate("    decisions:\n      approve:\n        target: done\n        payload: true\n") }),
    findings: [
      { path: "steps.gate.decisions.approve.payload", code: "invalid_decision_payload_schema", message: "payload must be a map of field name -> { required? }; got true" },
    ] },
  { id: "d-payload-field/key-grammar", node: "d-payload-field", lane: "key grammar",
    text: ch14File({ gate: ch14Gate("    decisions:\n      approve:\n        target: done\n        payload:\n          \"a.b\": {}\n") }),
    findings: [
      { path: "steps.gate.decisions.approve.payload", message: `invalid payload field name "a.b"${ID_RULE}` },
    ] },
  { id: "d-payload-spec/container", node: "d-payload-spec", lane: "container",
    text: ch14File({ gate: ch14Gate("    decisions:\n      approve:\n        target: done\n        payload:\n          instruction: true\n") }),
    findings: [
      { path: "steps.gate.decisions.approve.payload.instruction", code: "invalid_decision_payload_schema", message: "a payload field spec must be a map with the single optional key required; got true" },
    ] },
  { id: "d-payload-spec/unknown-key", node: "d-payload-spec", lane: "unknown key (no nested types yet)",
    text: ch14File({ gate: ch14Gate("    decisions:\n      approve:\n        target: done\n        payload:\n          instruction:\n            type: markdown\n") }),
    findings: [
      { path: "steps.gate.decisions.approve.payload.instruction.type", code: "invalid_decision_payload_schema", message: "unknown payload spec key 'type' (allowed: required)" },
    ] },
  // YAML 1.2's unquoted `yes` arrives as a STRING, which is the model's
  // own `NOT "yes"` case — driven by the substrate rather than by a hand
  // check, and reachable only on this channel.
  { id: "d-payload-required/value-non-boolean-scalar", node: "d-payload-required", lane: "value (YAML's unquoted `yes` is a STRING)",
    text: ch14File({ gate: ch14Gate("    decisions:\n      approve:\n        target: done\n        payload:\n          instruction:\n            required: yes\n") }),
    findings: [
      { path: "steps.gate.decisions.approve.payload.instruction.required", code: "invalid_decision_payload_schema", message: "required must be one of true, false; got \"yes\"" },
    ] },
  { id: "d-payload-required/value-quoted-boolean", node: "d-payload-required", lane: "value (a QUOTED boolean is not a boolean)",
    text: ch14File({ gate: ch14Gate("    decisions:\n      approve:\n        target: done\n        payload:\n          instruction:\n            required: \"true\"\n") }),
    findings: [
      { path: "steps.gate.decisions.approve.payload.instruction.required", code: "invalid_decision_payload_schema", message: "required must be one of true, false; got \"true\"" },
    ] },
  { id: "d-wait/container", node: "d-wait", lane: "container",
    text: ch14File({ wait: ch14Hold("    wait: 5\n    onResume: {}\n") }),
    findings: [
      { path: "steps.hold.wait", message: "wait must be a map with exactly kind and resumeEvents; got 5" },
    ] },
  { id: "d-wait/unknown-key", node: "d-wait", lane: "unknown key",
    text: ch14File({ wait: ch14Hold("    wait:\n      kind: k\n      resumeEvents:\n        - E\n      extra: 1\n    onResume: {}\n") }),
    findings: [
      { path: "steps.hold.wait.extra", message: "unknown key \"extra\" (a wait's only keys are kind, resumeEvents)" },
    ] },
  { id: "d-wait-kind/presence", node: "d-wait-kind", lane: "presence",
    text: ch14File({ wait: ch14Hold("    wait:\n      resumeEvents:\n        - E\n    onResume: {}\n") }),
    findings: [
      { path: "steps.hold.wait", message: "missing required key \"kind\"" },
    ] },
  { id: "d-wait-kind/type-non-string", node: "d-wait-kind", lane: "type (a non-string kind)",
    text: ch14File({ wait: ch14Hold("    wait:\n      kind: 5\n      resumeEvents:\n        - E\n    onResume: {}\n") }),
    findings: [
      { path: "steps.hold.wait.kind", message: "wait kind must be a nonempty string, got 5" },
    ] },
  { id: "d-resume-events/presence", node: "d-resume-events", lane: "presence",
    text: ch14File({ wait: ch14Hold("    wait:\n      kind: k\n    onResume: {}\n") }),
    findings: [
      { path: "steps.hold.wait", message: "missing required key \"resumeEvents\"" },
    ] },
  { id: "d-resume-events/container", node: "d-resume-events", lane: "container",
    text: ch14File({ wait: ch14Hold("    wait:\n      kind: k\n      resumeEvents: COMMIT\n    onResume: {}\n") }),
    findings: [
      { path: "steps.hold.wait.resumeEvents", message: "resumeEvents must be a nonempty list of event-type ids; got \"COMMIT\"" },
    ] },
  { id: "d-resume-events/nonempty", node: "d-resume-events", lane: "nonempty (a wait no event can resume is dead config)",
    text: ch14File({ wait: ch14Hold("    wait:\n      kind: k\n      resumeEvents: []\n    onResume: {}\n") }),
    findings: [
      { path: "steps.hold.wait.resumeEvents", message: "resumeEvents must be a NONEMPTY list" },
    ] },
  { id: "d-resume-events/per-occurrence-uniqueness", node: "d-resume-events", lane: "per-occurrence uniqueness",
    text: ch14File({ wait: ch14Hold("    wait:\n      kind: k\n      resumeEvents:\n        - E\n        - E\n    onResume: {}\n") }),
    findings: [
      { path: "steps.hold.wait.resumeEvents[1]", message: "duplicate resume event \"E\"" },
    ] },
  { id: "d-resume-event/member-grammar", node: "d-resume-event", lane: "member grammar",
    text: ch14File({ wait: ch14Hold("    wait:\n      kind: k\n      resumeEvents:\n        - \"a b\"\n    onResume: {}\n") }),
    findings: [
      { path: "steps.hold.wait.resumeEvents[0]", message: `invalid event type "a b"${ID_RULE}` },
    ] },
  { id: "d-on-resume/container", node: "d-on-resume", lane: "container",
    text: ch14File({ wait: ch14Hold("    wait:\n      kind: k\n      resumeEvents:\n        - E\n    onResume: 5\n") }),
    findings: [
      { path: "steps.hold.onResume", message: "onResume must be a map of event-type -> target id (it may be empty); got 5" },
    ] },
  { id: "d-on-resume/dead-route", node: "d-on-resume", lane: "keysSubsetOf the step's own resumeEvents (dead route)",
    text: ch14File({ wait: ch14Hold("    wait:\n      kind: k\n      resumeEvents:\n        - E\n    onResume:\n      GHOST: done\n") }),
    findings: [
      { path: "steps.hold.onResume.GHOST", message: "dead resume route: 'GHOST' is not a declared resume event of step 'hold'" },
    ] },
  { id: "d-resume-target/membership", node: "d-resume-target", lane: "membership",
    text: ch14File({ wait: ch14Hold("    wait:\n      kind: k\n      resumeEvents:\n        - COMMIT\n    onResume:\n      COMMIT: ghost\n") }),
    findings: [
      { path: "steps.hold.onResume.COMMIT", message: "resume target must name a step or a terminal id; got \"ghost\"" },
    ] },
  { id: "d-recommends/container", node: "d-recommends", lane: "container",
    text: ch14File({ agent: CH14_AGENT + "    recommends: 5\n" }),
    findings: [
      { path: "steps.implement.recommends", message: "recommends must be a map of event-type -> decision key; got 5" },
    ] },
  { id: "d-recommends/dead-recommendation", node: "d-recommends", lane: "keysSubsetOf keys(transitions) (dead recommendation)",
    text: ch14File({ agent: CH14_AGENT + "    recommends:\n      GHOST: approve\n" }),
    findings: [
      { path: "steps.implement.recommends.GHOST", message: "dead recommendation: 'GHOST' is not a transition of step 'implement'" },
    ] },
  { id: "d-recommends-value/value-grammar", node: "d-recommends-value", lane: "value grammar (the decision-key class)",
    text: ch14File({ agent: CH14_AGENT + "    recommends:\n      PASS: \"a b\"\n" }),
    findings: [
      { path: "steps.implement.recommends.PASS", message: `invalid decision key "a b"${ID_RULE}` },
    ] },
];

/** A lane's CONTENT identity: its channel-independent id plus the SHAPE
 * of the finding set it owes — every path, with its code where it
 * carries one. A shared literal of these is what locks the two channel
 * registers together (see `CH14_LANE_IDENTITIES`). */
function laneIdentity(row: { readonly id: string; readonly findings: readonly ValidationFinding[] }): string {
  const shape = row.findings
    .map((finding) => (finding.code === undefined ? finding.path : `${finding.path}#${finding.code}`))
    .join(" + ");
  return `${row.id} | ${shape}`;
}

/** THE SHARED LANE REGISTER, compared by CONTENT.
 *
 * Family 1 runs the same declaration-derived register on both channels,
 * and the two halves live in two test MODULES: a genuinely shared
 * register is impossible between them, because importing one test file
 * from the other re-registers its whole suite. So the CONTENT comparison
 * is the mechanism — this list is spelled BYTE-IDENTICALLY in
 * `admit.test.ts` and `validate.test.ts`, each half asserts its own
 * register against it by equality, and each half additionally asserts
 * that every entry appears verbatim in the SIBLING module's source. The
 * pair is what closes the drift: a lane substituted in one register reds
 * against its own list, and a list edited to match it reds against the
 * sibling.
 *
 * Each entry is `<node>/<lane key> | <finding path>[#<code>]` — the
 * lane's identity plus the SHAPE of what it owes, so a row that keeps
 * its label while driving a NEIGHBOUR's case reds too. A node-set and a
 * count are not content: the arm's proving substitution kept both
 * (gate-2 re-check finding 2). The `lane` PROSE is deliberately not in
 * the identity: each channel names its own case (`humanGate` authored
 * against `human_gate` stored, YAML's unquoted `yes` against a JS
 * string), and dimension 1 rules that difference legitimate. */
const CH14_LANE_IDENTITIES: readonly string[] = [
  "d-step-type/value-unknown-token | steps.gate.type",
  "d-step-type/value-other-channels-spelling | steps.gate.type",
  "d-decisions/container | steps.gate.decisions#invalid_decision_gate_config",
  "d-decision-key/key-grammar | steps.gate.decisions",
  "d-decision-entry/container | steps.gate.decisions.approve#invalid_decision_gate_config",
  "d-decision-entry/unknown-key | steps.gate.decisions.approve.paylod#invalid_decision_gate_config",
  "d-decision-entry/missing-target | steps.gate.decisions.approve#invalid_decision_gate_config",
  "d-decision-target/membership-unresolvable | steps.gate.decisions.approve.target#decision_target_unresolved",
  "d-decision-target/membership-non-string | steps.gate.decisions.approve.target#decision_target_unresolved",
  "d-decision-payload/container | steps.gate.decisions.approve.payload#invalid_decision_payload_schema",
  "d-payload-field/key-grammar | steps.gate.decisions.approve.payload",
  "d-payload-spec/container | steps.gate.decisions.approve.payload.instruction#invalid_decision_payload_schema",
  "d-payload-spec/unknown-key | steps.gate.decisions.approve.payload.instruction.type#invalid_decision_payload_schema",
  "d-payload-required/value-non-boolean-scalar | steps.gate.decisions.approve.payload.instruction.required#invalid_decision_payload_schema",
  "d-payload-required/value-quoted-boolean | steps.gate.decisions.approve.payload.instruction.required#invalid_decision_payload_schema",
  "d-wait/container | steps.hold.wait",
  "d-wait/unknown-key | steps.hold.wait.extra",
  "d-wait-kind/presence | steps.hold.wait",
  "d-wait-kind/type-non-string | steps.hold.wait.kind",
  "d-resume-events/presence | steps.hold.wait",
  "d-resume-events/container | steps.hold.wait.resumeEvents",
  "d-resume-events/nonempty | steps.hold.wait.resumeEvents",
  "d-resume-events/per-occurrence-uniqueness | steps.hold.wait.resumeEvents[1]",
  "d-resume-event/member-grammar | steps.hold.wait.resumeEvents[0]",
  "d-on-resume/container | steps.hold.onResume",
  "d-on-resume/dead-route | steps.hold.onResume.GHOST",
  "d-resume-target/membership | steps.hold.onResume.COMMIT",
  "d-recommends/container | steps.implement.recommends",
  "d-recommends/dead-recommendation | steps.implement.recommends.GHOST",
  "d-recommends-value/value-grammar | steps.implement.recommends.PASS",
];

describe("ch14-P1 family 1 (file channel) — every declared lane, finding SET asserted WHOLE", () => {
  for (const row of CH14_FILE_LANES) {
    it(`${row.node}: ${row.lane}`, () => {
      expect(ch14Findings(row.text)).toStrictEqual(row.findings);
    });
  }

  it("the file register's node set IS the direct register's — the seventeen nodes this packet mints", () => {
    // Derived by READING the declaration's ch14 growth: the eleven
    // intended nodes plus the sub-nodes the composition rules mint. The
    // same set is asserted in `admit.test.ts`'s DECLARED_LANES register;
    // a node driven on one channel only cannot survive both checks.
    expect(new Set(CH14_FILE_LANES.map((row) => row.node))).toStrictEqual(
      new Set([
        "d-step-type", "d-decisions", "d-decision-key", "d-decision-entry", "d-decision-target",
        "d-decision-payload", "d-payload-field", "d-payload-spec", "d-payload-required",
        "d-wait", "d-wait-kind", "d-resume-events", "d-resume-event",
        "d-on-resume", "d-resume-target", "d-recommends", "d-recommends-value",
      ]),
    );
    expect(new Set(CH14_FILE_LANES.map((row) => `${row.node} ${row.lane}`)).size).toBe(CH14_FILE_LANES.length);
  });

  it("this register IS the shared one, by CONTENT — identity and finding shape, in order", () => {
    expect(CH14_FILE_LANES.map(laneIdentity)).toStrictEqual(CH14_LANE_IDENTITIES);
  });

  it("and the DIRECT register carries the same content — every identity present verbatim in its module", () => {
    // The cross-module half of the lock. Reading the sibling's SOURCE is
    // what an import cannot do here without re-registering its suite;
    // the drift suites already read source text for the same reason.
    const sibling = readFileSync(new URL("./admit.test.ts", import.meta.url), "utf8");
    for (const identity of CH14_LANE_IDENTITIES) {
      expect(sibling, `lane identity missing from the direct register: ${identity}`).toContain(
        JSON.stringify(identity),
      );
    }
  });

  it("the CONFORMING direction: the three-class file admits whole", () => {
    expect(load(ch14File()).ok).toBe(true);
  });
});

describe("ch14-P1 family 1 (file channel) — the cases only a FILE can express", () => {
  it("a NON-STRING decision key: refused before the own-key scan can be blinded", () => {
    const findings = ch14Findings(
      ch14File({ gate: "  gate:\n    type: humanGate\n    role: operator\n    instruction: q\n    decisions:\n      10:\n        target: done\n" }),
    );
    expect(findings.map((finding) => finding.path)).toContain("steps.gate.decisions");
    expect(JSON.stringify(findings)).toContain("decision key must be a nonempty string");
  });

  it("a DUPLICATE decision key: the substrate's own uniqueness lane fires at the parse stage", () => {
    const result = load(
      ch14File({ gate: "  gate:\n    type: humanGate\n    role: operator\n    instruction: q\n    decisions:\n      approve:\n        target: done\n      approve:\n        target: implement\n" }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(JSON.stringify(result.error.findings)).toContain("Map keys must be unique");
  });

  it("a NON-STRING resume-event member", () => {
    const findings = ch14Findings(
      ch14File({ wait: "  hold:\n    type: wait\n    wait:\n      kind: k\n      resumeEvents:\n        - 5\n    onResume: {}\n" }),
    );
    expect(findings).toContainEqual({
      path: "steps.hold.wait.resumeEvents[0]",
      message: "event type must be a nonempty string, got 5",
    });
  });
});

// ── FAMILY 2 (FILE CHANNEL): the class partition in the AUTHORED
// spelling. The direct channel drives the full `CLASS_KEYSETS ×
// authorable × required` table; this half drives the SAME table on
// authored file fixtures, because the class LABEL a message carries is
// the authored token (`humanGate` here, `human_gate` there) and a sampled
// file half cannot see a cell whose label is wrong. ──────────────────────

/** Each authorable step key in its authored YAML form, chosen so the
 * value SATISFIES its own declared lane — that is what makes a
 * class-refusal cell draw the class refusal ALONE (D3's converse). */
const FILE_KEY_YAML: Readonly<Record<string, string>> = {
  role: "    role: operator\n",
  instruction: "    instruction: i\n",
  transitions: "    transitions:\n      PASS: done\n",
  agentConfig: "    agentConfig: {}\n",
  gates: "    gates: {}\n",
  decisions: "    decisions:\n      approve:\n        target: done\n",
  wait: "    wait:\n      kind: commit_pending\n      resumeEvents:\n        - COMMIT\n",
  onResume: "    onResume: {}\n",
  recommends: "    recommends: {}\n",
};

interface FileClass {
  readonly id: string;
  /** The role this class's OWN block declares, where it declares one —
   * the agent step keeps `implementer` so the role-set equality stays
   * satisfied and the class-refusal cells draw ONE finding. */
  readonly ownRole?: string;
  /** The AUTHORED class label a finding names — `humanGate`, not the
   * stored `human_gate`. */
  readonly label: string;
  /** The `type` line, empty for the agent class (an ABSENT `type` IS the
   * agent class; no `agent` token is minted). */
  readonly typeYaml: string;
  /** The class's own keyset, in the order its message enumerates. */
  readonly keys: readonly string[];
  /** The keys the class DEMANDS, `type` excluded — dropping `type` drops
   * the CLASS, so the demand is only meaningful for the keys that
   * survive the discriminator. */
  readonly required: readonly string[];
}

const FILE_CLASSES: readonly FileClass[] = [
  { id: "implement", label: "an agent", typeYaml: "", ownRole: "implementer",
    keys: ["role", "instruction", "transitions", "agentConfig", "gates", "recommends"],
    required: ["role", "instruction", "transitions"] },
  { id: "gate", label: "a humanGate", typeYaml: "    type: humanGate\n",
    keys: ["type", "role", "instruction", "decisions"],
    required: ["role", "instruction", "decisions"] },
  { id: "hold", label: "a wait", typeYaml: "    type: wait\n",
    keys: ["type", "wait", "onResume"],
    required: ["wait", "onResume"] },
];

/** The class's canonical step block, with one key ADDED or DROPPED. */
function fileClassStep(cls: FileClass, over: { add?: string; drop?: string } = {}): string {
  const own = cls.keys.filter((key) => key !== "type" && key !== over.drop);
  const body = own
    .map((key) => (key === "role" && cls.ownRole !== undefined ? `    role: ${cls.ownRole}\n` : FILE_KEY_YAML[key] ?? ""))
    .join("");
  const extra = over.add === undefined ? "" : FILE_KEY_YAML[over.add] ?? "";
  return `  ${cls.id}:\n` + (over.drop === "type" ? "" : cls.typeYaml) + body + extra;
}

/** The whole three-class document with ONE class's block replaced. */
function fileWithClass(cls: FileClass, over: { add?: string; drop?: string } = {}): string {
  const block = fileClassStep(cls, over);
  if (cls.id === "implement") return ch14File({ agent: block });
  if (cls.id === "gate") return ch14File({ gate: block });
  return ch14File({ wait: block });
}

describe("ch14-P1 family 2 (file channel) — every key a class does not own is REFUSED, in the AUTHORED spelling", () => {
  for (const cls of FILE_CLASSES) {
    for (const key of Object.keys(FILE_KEY_YAML)) {
      if (cls.keys.includes(key)) continue;
      it(`${cls.label} step: '${key}' draws the class refusal ALONE (its value satisfies its own declared lane)`, () => {
        expect(ch14Findings(fileWithClass(cls, { add: key }))).toStrictEqual([
          { path: `steps.${cls.id}.${key}`,
            message: `unknown key ${key} on ${cls.label} step (${cls.label} step's keys are ${cls.keys.join(", ")})` },
        ]);
      });
    }
  }

  it("the cross-product is TOTAL — no cell is construction-unreachable on this channel, so none is exempted", () => {
    // The three keysets against the whole authorable union. `type` is
    // absent from the union here for the reason the direct half states:
    // a PRESENT legal `type` selects a different class by definition.
    const cells = FILE_CLASSES.flatMap((cls) =>
      Object.keys(FILE_KEY_YAML).filter((key) => !cls.keys.includes(key)).map((key) => `${cls.id}.${key}`),
    );
    expect(cells).toHaveLength(16);
  });
});

describe("ch14-P1 family 2 (file channel) — every key a class REQUIRES is demanded", () => {
  for (const cls of FILE_CLASSES) {
    for (const key of cls.required) {
      it(`${cls.label} step: a missing '${key}' is re-imposed by the hand lane, at the declared lane's own path and wording`, () => {
        const findings = ch14Findings(fileWithClass(cls, { drop: key }));
        expect(findings).toContainEqual(
          key === "decisions"
            ? { path: `steps.${cls.id}`, message: `missing required key "${key}"`, code: "invalid_decision_gate_config" }
            : { path: `steps.${cls.id}`, message: `missing required key "${key}"` },
        );
      });
    }
  }
});

describe("ch14-P1 family 2 (file channel) — D3's composition rule, both directions", () => {
  it("a class-refused key whose value ALSO fails its own declared lane draws BOTH findings", () => {
    expect(ch14Findings(ch14File({ agent: CH14_AGENT + "    decisions: x\n" }))).toStrictEqual([
      { path: "steps.implement.decisions", code: "invalid_decision_gate_config",
        message: 'decisions must be a map of decision key -> { target, payload? }; got "x"' },
      { path: "steps.implement.decisions",
        message: "unknown key decisions on an agent step " +
          "(an agent step's keys are role, instruction, transitions, agentConfig, gates, recommends)" },
    ]);
  });

  it("its CONVERSE: a class-refused key whose value satisfies its lane draws the class refusal ALONE", () => {
    expect(
      ch14Findings(ch14File({ agent: CH14_AGENT + "    decisions:\n      approve:\n        target: done\n" })),
    ).toStrictEqual([
      { path: "steps.implement.decisions",
        message: "unknown key decisions on an agent step " +
          "(an agent step's keys are role, instruction, transitions, agentConfig, gates, recommends)" },
    ]);
  });
});

describe("ch14-P1 family 2 (file channel) — the discriminator GATE is per STEP, never template-wide", () => {
  it("a broken `type` on one step does not stand the OTHER step's class lanes down", () => {
    expect(
      ch14Findings(ch14File({
        gate: ch14Gate(APPROVE_DONE).replace("humanGate", "nope"),
        wait: "  hold:\n    type: wait\n    wait:\n      kind: commit_pending\n      resumeEvents:\n        - COMMIT\n" +
          "    onResume:\n      COMMIT: done\n    decisions:\n      approve:\n        target: done\n",
      })),
    ).toStrictEqual([
      { path: "steps.gate.type", message: 'type must be one of humanGate, wait; got "nope"' },
      { path: "steps.hold.decisions",
        message: "unknown key decisions on a wait step (a wait step's keys are type, wait, onResume)" },
    ]);
  });

  it("and the gated step draws ONE finding, never an enum finding plus an agent-class cascade", () => {
    expect(ch14Findings(ch14File({ gate: ch14Gate(APPROVE_DONE).replace("humanGate", "nope") }))).toStrictEqual([
      { path: "steps.gate.type", message: 'type must be one of humanGate, wait; got "nope"' },
    ]);
  });
});

describe("ch14-P1 family 2 (file channel) — the produced-field carve-out is the DIRECT channel's", () => {
  it("the produced channel-direct positions stay FILE-illegal", () => {
    expect(ch14Findings(ch14File({ agent: CH14_AGENT + "    advancesRound: {}\n" })).map((f) => f.path)).toContain(
      "steps.implement.advancesRound",
    );
  });
});

describe("ch14-P1 family 6 (file channel) — the ban at the positions this chapter adds", () => {
  const banned: readonly (readonly [string, string, string])[] = [
    ["a decision key", ch14File({ gate: '  gate:\n    type: humanGate\n    role: operator\n    instruction: q\n    decisions:\n      "10":\n        target: done\n' }), "steps.gate.decisions"],
    ["a payload field name", ch14File({ gate: '  gate:\n    type: humanGate\n    role: operator\n    instruction: q\n    decisions:\n      approve:\n        target: done\n        payload:\n          "10": {}\n' }), "steps.gate.decisions.approve.payload"],
    ["a wait kind", ch14File({ wait: '  hold:\n    type: wait\n    wait:\n      kind: "10"\n      resumeEvents:\n        - E\n    onResume: {}\n' }), "steps.hold.wait.kind"],
    ["a resume event", ch14File({ wait: '  hold:\n    type: wait\n    wait:\n      kind: k\n      resumeEvents:\n        - "10"\n    onResume: {}\n' }), "steps.hold.wait.resumeEvents[0]"],
    ["a recommends value", ch14File({ agent: CH14_AGENT + '    recommends:\n      PASS: "10"\n', gate: '  gate:\n    type: humanGate\n    role: operator\n    instruction: q\n    decisions:\n      "10":\n        target: done\n' }), "steps.implement.recommends.PASS"],
  ];
  for (const [claim, text, path] of banned) {
    it(`${claim} in the banned class is REFUSED on the file channel`, () => {
      const own = ch14Findings(text).filter((finding) => finding.path === path);
      expect(own.map((finding) => finding.message).join("\n")).toContain("0…4294967294");
    });
  }

  it("the measured NON-members stay legal on this channel too", () => {
    expect(
      load(ch14File({ wait: '  hold:\n    type: wait\n    wait:\n      kind: "4294967295"\n      resumeEvents:\n        - "01"\n    onResume: {}\n' })).ok,
    ).toBe(true);
  });
});

// ── FAMILY 8 (FILE CHANNEL): NOT a separate register. The hand-lane
// inventory is ONE register, and both channels are GENERATED from it —
// see `admit.test.ts`'s HAND_LANES, whose every row carries a DIRECT
// fixture and a FILE fixture and is driven through `loadTemplate` here
// as well as through `admitTemplate` there. Hand-written file-channel
// samples beside it were exactly the blind spot the shared register
// closes: a member sampled on one side and forgotten on the other. ───────
