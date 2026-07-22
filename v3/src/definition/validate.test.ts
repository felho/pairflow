import { describe, expect, it } from "vitest";

import type { WorkflowTemplate } from "../domain/index.js";
import { createGateRegistry } from "../gates/index.js";
import { loadTemplate } from "./index.js";
import type { TemplateLoadErrorInfo } from "./index.js";

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
        },
        review: {
          role: "reviewer",
          instruction: "review it",
          transitions: { PASS: "implement", CONVERGED: "done" },
          // review.PASS → implement (LISTED) ⇒ true; CONVERGED → done ⇒ false.
          advancesRound: { PASS: true, CONVERGED: false },
        },
      },
      terminal: ["done"],
      roles: {
        implementer: { defaultActor: "codex" },
        reviewer: { defaultActor: "claude" },
      },
      round: { advanceOnArrivalAt: ["implement"] },
      // ch12-p1b G3: admission materializes the activation default.
      activation: { mode: "immediate" },
      // ch12-p3 R1: admission materializes the runtime-context requirement
      // (absent ⇒ "none").
      runtimeContext: "none",
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
    expect(result.template.roles["r"]).toEqual({
      defaultActor: "codex",
      defaultAgentConfig: { approach: "tdd" },
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
