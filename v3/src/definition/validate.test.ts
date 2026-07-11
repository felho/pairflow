import { describe, expect, it } from "vitest";

import type { WorkflowTemplate } from "../domain/index.js";
import { loadTemplate } from "./index.js";
import type { TemplateLoadErrorInfo } from "./index.js";

// Packet ch8-P1: the validate lane inventory (V1–V17), the E2
// accumulation + dependent-lane suppression rules, the V3 version
// source-form ladder (dimension 2), and the canonical-example
// round-trip (dimension 12). Every hostile fixture is RAW YAML text.

function bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function load(text: string): ReturnType<typeof loadTemplate> {
  return loadTemplate(bytes(text));
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
      expect(result.template.steps["a"].agentConfig).toBe(result.template.steps["b"].agentConfig);
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

  it("keeps numeric, complex, and __proto__ keys losslessly inside agentConfig", () => {
    const result = load(
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
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const config = result.template.steps["s"]?.agentConfig;
    expect(config).toBeInstanceOf(Map);
    const entries = [...(config as Map<unknown, unknown>).entries()];
    expect(entries[0]).toStrictEqual([["a", "b"], "complex"]);
    expect(entries.slice(1)).toStrictEqual([[1, "numeric"], ["__proto__", "proto"]]);
  });

  it("preserves typed-distinct agentConfig keys without string coercion or data loss", () => {
    const result = load(
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
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const config = result.template.steps["s"]?.agentConfig;
    expect(config).toBeInstanceOf(Map);
    expect([...(config as Map<unknown, unknown>).entries()]).toStrictEqual([[1, "numeric"], ["1", "string"]]);
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
    expect(err.findings.length).toBe(3);
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
    expect(result.template.roles["r"]).toStrictEqual({ defaultActor: "codex" });
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
    expect(step?.transitions["__proto__"]).toBe("done");
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
`;
    const expected: WorkflowTemplate = {
      ref: { id: "local-pair-v0", version: 1 },
      start: "implement",
      steps: {
        implement: {
          role: "implementer",
          instruction: "build it",
          transitions: { PASS: "review" },
        },
        review: {
          role: "reviewer",
          instruction: "review it",
          transitions: { PASS: "implement", CONVERGED: "done" },
        },
      },
      terminal: ["done"],
      roles: {
        implementer: { defaultActor: "codex" },
        reviewer: { defaultActor: "claude" },
      },
    };
    const result = load(canonical);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.template).toStrictEqual(expected);
  });
});
