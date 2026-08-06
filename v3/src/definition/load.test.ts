import { describe, expect, it } from "vitest";

import type { WorkflowTemplate } from "../domain/index.js";
import { createGateRegistry } from "../gates/index.js";
import { admitTemplate, loadTemplate } from "./index.js";
import type { TemplateLoadErrorInfo } from "./index.js";

// Packet ch8-P1: the load pipeline over bytes — the G-gate lanes
// (read/parse/resolve stages), the E1 ordering rules, the dimension-7
// short-circuit combinations, and the E5 machine-shape assertions on
// every error lane. Hostile fixtures are RAW text (R-RAW-FIXTURES).
//
// Packet ch11-P4: the gates subtree through the FILE channel + the F3
// stringness lane (dimension 4), the F7 cross-rung accumulation
// disposition list a/b/b′/c/d/e (dimension 5), the maximal-template
// channel equivalence (dimension 6), and the F8 declaration-absent
// default (dimension 8).

const catalog = createGateRegistry();

function bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function loadGated(text: string): ReturnType<typeof loadTemplate> {
  return loadTemplate(bytes(text), { catalog });
}

function gatedErr(text: string): TemplateLoadErrorInfo {
  const result = loadGated(text);
  if (result.ok) {
    throw new Error("expected a load error, got a template");
  }
  return result.error;
}

function gatedPaths(err: TemplateLoadErrorInfo): string[] {
  return err.findings.map((f) => (f as { path?: string }).path ?? "<no-path>");
}

function expectErr(result: ReturnType<typeof loadTemplate>): TemplateLoadErrorInfo {
  if (result.ok) {
    throw new Error("expected a load error, got a template");
  }
  return result.error;
}

// A minimal valid template (V-lane fixtures swap single pieces of it).
const VALID = `ref:
  id: t
  version: 1
start: s
steps:
  s:
    role: r
    instruction: i
    transitions: {}
terminal:
  - done
roles:
  r: {}
`;

describe("G2 — YAML 1.2 core-schema semantics", () => {
  it("parses on/yes/no/off as STRINGS and only true/false as booleans (agentConfig carrier)", () => {
    const result = loadTemplate(
      bytes(`ref:
  id: t
  version: 1
start: s
steps:
  s:
    role: r
    instruction: i
    transitions: {}
    agentConfig:
      a: on
      b: yes
      c: no
      d: off
      e: true
      f: false
terminal:
  - done
roles:
  r: {}
`),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.template.steps["s"]?.agentConfig).toStrictEqual({
      a: "on",
      b: "yes",
      c: "no",
      d: "off",
      e: true,
      f: false,
    });
  });
});

describe("G3 — strict UTF-8 read stage", () => {
  it("rejects invalid byte sequences as a single read-stage finding (never U+FFFD repair)", () => {
    const err = expectErr(loadTemplate(new Uint8Array([0xff, 0xfe, 0x2d, 0x2d])));
    expect(err.stage).toBe("read");
    expect(err.findings).toHaveLength(1);
    const finding = err.findings[0];
    expect(finding).toBeDefined();
    // Bare bytes-level call without opts.path: keyset is exactly {stage, message}
    // (E5 presence scoping) and the message is content-free.
    expect(Object.keys(finding as object).sort()).toStrictEqual(["message", "stage"]);
    expect((finding as { message: string }).message).not.toContain("�");
  });

  it("stamps opts.path onto the read-stage decode finding when supplied", () => {
    const result = loadTemplate(new Uint8Array([0xc3, 0x28]), { path: "/tmp/x.yaml" });
    const err = expectErr(result);
    expect(err.stage).toBe("read");
    expect(err.findings[0]).toMatchObject({ stage: "read", path: "/tmp/x.yaml" });
  });
});

describe("G4 — document API with warnings promotion (fail-closed)", () => {
  it("loads the clean minimal template (zero errors, zero warnings baseline)", () => {
    const result = loadTemplate(bytes(VALID));
    expect(result.ok).toBe(true);
  });

  it("rejects an unresolved custom tag (a parser WARNING, promoted)", () => {
    const err = expectErr(loadTemplate(bytes(`a: !custom x\n`)));
    expect(err.stage).toBe("parse");
    expect(err.findings.length).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(err.findings)).toMatch(/tag/i);
  });

  it("keeps legal anchor reuse and explicit !!str clean (no false positive)", () => {
    const result = loadTemplate(
      bytes(`ref:
  id: t
  version: 1
start: s
steps:
  s:
    role: r
    instruction: !!str i
    transitions: {}
    agentConfig:
      x: &n 5
      y: *n
terminal:
  - done
roles:
  r: {}
`),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.template.steps["s"]?.agentConfig).toStrictEqual({ x: 5, y: 5 });
  });
});

describe("G5 — one document per file", () => {
  it("rejects a multi-document stream", () => {
    const err = expectErr(loadTemplate(bytes(`a: 1\n---\nb: 2\n`)));
    expect(err.stage).toBe("parse");
  });
});

describe("G6 — duplicate keys (document-wide, agentConfig interior included)", () => {
  it("rejects a duplicate top-level key", () => {
    const err = expectErr(loadTemplate(bytes(`a: 1\na: 2\n`)));
    expect(err.stage).toBe("parse");
    expect(JSON.stringify(err.findings)).toMatch(/unique|duplicate/i);
  });

  it("rejects a duplicate key INSIDE agentConfig (V9's exemption is shape-only)", () => {
    const err = expectErr(
      loadTemplate(
        bytes(`ref:
  id: t
  version: 1
start: s
steps:
  s:
    role: r
    instruction: i
    transitions: {}
    agentConfig:
      k: 1
      k: 2
terminal:
  - done
roles:
  r: {}
`),
      ),
    );
    expect(err.stage).toBe("parse");
  });

  it("rejects structurally duplicate collection keys inside agentConfig", () => {
    const err = expectErr(
      loadTemplate(
        bytes(`ref:
  id: t
  version: 1
start: s
steps:
  s:
    role: r
    instruction: i
    transitions: {}
    agentConfig:
      ? [a, b]
      : first
      ? [a, b]
      : second
terminal:
  - done
roles:
  r: {}
`),
      ),
    );
    expect(err.stage).toBe("parse");
    expect(JSON.stringify(err.findings)).toMatch(/unique|duplicate/iu);
  });

  it("rejects an alias key that resolves to an existing anchored collection key", () => {
    const err = expectErr(
      loadTemplate(
        bytes(`ref:
  id: t
  version: 1
start: s
steps:
  s:
    role: r
    instruction: i
    transitions: {}
    agentConfig:
      ? &key [a, b]
      : first
      ? *key
      : second
terminal:
  - done
roles:
  r: {}
`),
      ),
    );
    expect(err.stage).toBe("parse");
    expect(JSON.stringify(err.findings)).toMatch(/unique|duplicate/iu);
  });

  it("rejects an alias key resolved through an anchor declared outside the key", () => {
    const err = expectErr(
      loadTemplate(
        bytes(`ref:
  id: t
  version: 1
start: s
steps:
  s:
    role: r
    instruction: i
    transitions: {}
    agentConfig:
      seed: &key [a, b]
      ? [a, b]
      : first
      ? *key
      : second
terminal:
  - done
roles:
  r: {}
`),
      ),
    );
    expect(err.stage).toBe("parse");
    expect(JSON.stringify(err.findings)).toMatch(/unique|duplicate/iu);
  });

  it("emits one duplicate finding per later key across compose-time and resolved matches", () => {
    const err = expectErr(
      loadTemplate(
        bytes(`ref:
  id: t
  version: 1
start: s
steps:
  s:
    role: r
    instruction: i
    transitions: {}
    agentConfig:
      seed: &key [a, b]
      ? *key
      : first
      ? [a, b]
      : second
      ? &local [a, b]
      : third
terminal:
  - done
roles:
  r: {}
`),
      ),
    );
    expect(err.stage).toBe("parse");
    expect(err.findings).toHaveLength(2);
    const positions = err.findings.map((finding) => (
      "line" in finding ? `${finding.line}:${finding.col}` : "unpositioned"
    ));
    expect(new Set(positions).size).toBe(2);
  });

  it("rejects 0 and -0 as duplicate keys — comparator equality matches Map key identity (SameValueZero)", () => {
    // The integration re-check's catch: Object.is judged 0/-0 DISTINCT,
    // no duplicate finding fired, then the downstream Map (SameValueZero)
    // collapsed them — the first value silently lost (an E3/G6 violation).
    // YAML canonical int equality also makes 0 == -0.
    const err = expectErr(
      loadTemplate(
        bytes(`ref:
  id: t
  version: 1
start: s
steps:
  s:
    role: r
    instruction: i
    transitions: {}
    agentConfig:
      0: first
      -0: second
terminal:
  - done
roles:
  r: {}
`),
      ),
    );
    expect(err.stage).toBe("parse");
    expect(JSON.stringify(err.findings)).toMatch(/unique|duplicate/iu);
  });
});

describe("G7 — the %YAML directive rule (two-mechanism union)", () => {
  it("rejects the silently-adopted %YAML 1.1 with a SYNTHESIZED finding", () => {
    const err = expectErr(loadTemplate(bytes(`%YAML 1.1\n---\na: 1\n`)));
    expect(err.stage).toBe("parse");
    expect(err.findings).toHaveLength(1);
    const finding = err.findings[0] as { stage: string; message: string };
    expect(finding.message).toMatch(/1\.1/);
    expect(finding.message).toMatch(/1\.2/);
    // Synthesized: the parser emitted nothing — no position fields.
    expect(Object.keys(finding).sort()).toStrictEqual(["message", "stage"]);
  });

  it("rejects %YAML 1.3 through the BAD_DIRECTIVE warning promotion", () => {
    const err = expectErr(loadTemplate(bytes(`%YAML 1.3\n---\na: 1\n`)));
    expect(err.stage).toBe("parse");
    expect(err.findings.length).toBeGreaterThanOrEqual(1);
  });

  it("keeps an explicit %YAML 1.2 legal", () => {
    const result = loadTemplate(bytes(`%YAML 1.2\n---\n${VALID}`));
    expect(result.ok).toBe(true);
  });
});

describe("G8 — anchors/aliases and the resolution-stage guard", () => {
  it("maps the alias-amplification guard throw to a SINGLE resolve-stage finding", () => {
    const bomb = `a: &a [x,x,x,x,x,x,x,x,x]
b: &b [*a,*a,*a,*a,*a,*a,*a,*a,*a]
c: &c [*b,*b,*b,*b,*b,*b,*b,*b,*b]
d: &d [*c,*c,*c,*c,*c,*c,*c,*c,*c]
e: &e [*d,*d,*d,*d,*d,*d,*d,*d,*d]
f: &f [*e,*e,*e,*e,*e,*e,*e,*e,*e]
g: &g [*f,*f,*f,*f,*f,*f,*f,*f,*f]
`;
    const err = expectErr(loadTemplate(bytes(bomb)));
    expect(err.stage).toBe("resolve");
    expect(err.findings).toHaveLength(1);
    expect(err.findings[0]).toMatchObject({ stage: "resolve" });
  });
});

describe("G9 — merge keys are not a format feature", () => {
  it("rejects << in a FIXED-KEYSET map as an unknown key", () => {
    const err = expectErr(
      loadTemplate(
        bytes(`ref:
  id: t
  version: 1
start: s
steps:
  s:
    role: r
    instruction: i
    transitions: {}
    <<: {role: x}
terminal:
  - done
roles:
  r: {}
`),
      ),
    );
    expect(err.stage).toBe("validate");
    expect(JSON.stringify(err.findings)).toContain("<<");
  });

  it("treats << in an OPEN-KEY map as a legal, meaningless event-type token", () => {
    const result = loadTemplate(
      bytes(`ref:
  id: t
  version: 1
start: s
steps:
  s:
    role: r
    instruction: i
    transitions:
      "<<": done
terminal:
  - done
roles:
  r: {}
`),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // No merge happened: << is a plain transitions key.
    expect(result.template.steps["s"]?.transitions).toStrictEqual({ "<<": "done" });
  });
});

describe("dimension 7 — short-circuit combinations (one stage per result)", () => {
  it("a duplicate key AND a missing start yield parse findings ONLY", () => {
    const err = expectErr(loadTemplate(bytes(`ref: {id: t, version: 1}\nref: {id: u, version: 2}\nsteps: {}\n`)));
    expect(err.stage).toBe("parse");
    for (const finding of err.findings) {
      expect((finding as { stage?: string }).stage).toBe("parse");
    }
  });

  it("an alias bomb AND shape defects yield the resolve finding ONLY", () => {
    const bomb = `a: &a [x,x,x,x,x,x,x,x,x]
b: &b [*a,*a,*a,*a,*a,*a,*a,*a,*a]
c: &c [*b,*b,*b,*b,*b,*b,*b,*b,*b]
d: &d [*c,*c,*c,*c,*c,*c,*c,*c,*c]
e: &e [*d,*d,*d,*d,*d,*d,*d,*d,*d]
f: &f [*e,*e,*e,*e,*e,*e,*e,*e,*e]
g: &g [*f,*f,*f,*f,*f,*f,*f,*f,*f]
not_a_template_key: 1
`;
    const err = expectErr(loadTemplate(bytes(bomb)));
    expect(err.stage).toBe("resolve");
    expect(err.findings).toHaveLength(1);
  });
});

describe("dimension 8 — parse-stage ordering (E1)", () => {
  it("lists two custom tags in source-position order", () => {
    const err = expectErr(loadTemplate(bytes(`a: !t1 x\nb: !t2 y\n`)));
    expect(err.stage).toBe("parse");
    expect(err.findings).toHaveLength(2);
    const [first, second] = err.findings as ReadonlyArray<{ line?: number }>;
    expect(first?.line).toBeDefined();
    expect(second?.line).toBeDefined();
    expect(first!.line!).toBeLessThan(second!.line!);
  });

  it("lists a later error BEFORE an earlier warning (class-major order, P23c)", () => {
    // Tag warning on line 1, duplicate-key error on line 3.
    const err = expectErr(loadTemplate(bytes(`a: !t1 x\nb: 1\nb: 2\n`)));
    expect(err.stage).toBe("parse");
    expect(err.findings).toHaveLength(2);
    const [first, second] = err.findings as ReadonlyArray<{ line?: number; message: string }>;
    expect(first!.message).toMatch(/unique|duplicate/i);
    expect(second!.message).toMatch(/tag/i);
    // The class-major claim: the error lists first despite its LATER source position.
    expect(first!.line!).toBeGreaterThan(second!.line!);
  });

  it("lists %YAML 1.3 and a custom tag (both warnings) in source order", () => {
    const err = expectErr(loadTemplate(bytes(`%YAML 1.3\n---\na: !t1 x\n`)));
    expect(err.stage).toBe("parse");
    expect(err.findings).toHaveLength(2);
    const [first, second] = err.findings as ReadonlyArray<{ line?: number }>;
    expect(first!.line!).toBeLessThan(second!.line!);
  });

  it("heads the list with the synthesized directive finding (%YAML 1.1 + duplicate key)", () => {
    const err = expectErr(loadTemplate(bytes(`%YAML 1.1\n---\nb: 1\nb: 2\n`)));
    expect(err.stage).toBe("parse");
    expect(err.findings).toHaveLength(2);
    const [first, second] = err.findings as ReadonlyArray<{ message: string }>;
    expect(first!.message).toMatch(/1\.1/);
    expect(second!.message).toMatch(/unique|duplicate/i);
  });
});

describe("E5 — the machine shape on error lanes", () => {
  it("carries 1-based line/col on parse findings where the parser provides them", () => {
    const err = expectErr(loadTemplate(bytes(`a: 1\na: 2\n`)));
    const finding = err.findings[0] as { line?: number; col?: number };
    expect(finding.line).toBeGreaterThanOrEqual(1);
    expect(finding.col).toBeGreaterThanOrEqual(1);
  });

  it("keeps parse-entry keysets within {stage, line, col, message} (no path, no code)", () => {
    const err = expectErr(loadTemplate(bytes(`a: !custom x\n`)));
    for (const finding of err.findings) {
      const keys = Object.keys(finding);
      expect(keys).toContain("stage");
      expect(keys).toContain("message");
      expect(keys).not.toContain("path");
      expect(keys).not.toContain("code");
    }
  });

  it("top-level stage equals every entry's own stage marker on E1-form results", () => {
    const err = expectErr(loadTemplate(bytes(`a: !custom x\n`)));
    for (const finding of err.findings) {
      expect((finding as { stage?: string }).stage).toBe(err.stage);
    }
  });
});

// ── packet ch11-P4: the gates subtree through the FILE channel + the F3
// stringness lane (dimension 4). Semantic gate lanes are admission's
// (exhaustively driven direct-channel in admit.test.ts); here the
// obligation is that the FILE channel REACHES each lane class. ─────────

const gatedStep = (gatesBody: string, extras = ""): string => `ref:
  id: t
  version: 1
start: s
steps:
  s:
    role: r
    instruction: i
    transitions:
      GO: done
${gatesBody}terminal:
  - done
roles:
  r: {}
${extras}`;

describe("ch11-P4 dimension 4 — the gates subtree through the file channel", () => {
  it("a scalar gates value → ONE finding at steps.<id>.gates (container precondition)", () => {
    const err = gatedErr(gatedStep("    gates: nope\n"));
    expect(err.stage).toBe("validate");
    expect(gatedPaths(err)).toContain("steps.s.gates");
  });

  it("a non-transition event key → the dead-config finding (C2)", () => {
    const err = gatedErr(
      gatedStep("    gates:\n      NOPE:\n        - uses: pairflow.previous_reviewer_verdict\n"),
    );
    expect(gatedPaths(err)).toContain("steps.s.gates.NOPE");
  });

  it("an empty gate list → a finding (C3)", () => {
    const err = gatedErr(gatedStep("    gates:\n      GO: []\n"));
    expect(gatedPaths(err)).toContain("steps.s.gates.GO");
  });

  it("A1: a binding UNKNOWN key → an uncoded finding at its C7 address", () => {
    const err = gatedErr(
      gatedStep(
        "    gates:\n      GO:\n        - uses: pairflow.previous_reviewer_verdict\n          id: x\n",
      ),
    );
    expect(gatedPaths(err)).toContain("steps.s.gates.GO[0].id");
    const finding = err.findings.find((f) => (f as { path: string }).path === "steps.s.gates.GO[0].id");
    expect(finding).not.toHaveProperty("code");
  });

  it("A2: a grammar-invalid uses → an UNCODED finding at .uses (distinct from the coded lane)", () => {
    const err = gatedErr(gatedStep("    gates:\n      GO:\n        - uses: nodots\n"));
    const finding = err.findings.find((f) => (f as { path: string }).path === "steps.s.gates.GO[0].uses");
    expect(finding).toBeDefined();
    expect(finding).not.toHaveProperty("code");
  });

  it("A2: an unknown-but-GRAMMATICAL uses → the CODED gate_evaluator_unavailable lane", () => {
    const err = gatedErr(gatedStep("    gates:\n      GO:\n        - uses: no.such.gate\n"));
    const finding = err.findings.find((f) => (f as { path: string }).path === "steps.s.gates.GO[0]");
    expect(finding).toMatchObject({ code: "gate_evaluator_unavailable" });
  });

  it("a per-registration config lane (bad threshold metric) surfaces at .config.<key>", () => {
    const err = gatedErr(
      gatedStep(
        '    gates:\n      GO:\n        - uses: declarative.threshold\n          config: { metric: spins, op: ">=", value: 2 }\n',
      ),
    );
    expect(gatedPaths(err)).toContain("steps.s.gates.GO[0].config.metric");
  });

  it("onExit UNCONSUMED under gateDecisionJson mode → the coded config lane", () => {
    const err = gatedErr(
      gatedStep(
        "    gates:\n      GO:\n        - uses: external.process\n          config:\n            command: \"echo hi\"\n            timeoutMs: 1000\n            output: { mode: gateDecisionJson }\n            onExit: { zero: allow, nonzero: block }\n",
        "runtimeContext:\n  kind: worktree\n  provider: pairflow.worktree\n",
      ),
    );
    expect(gatedPaths(err)).toContain("steps.s.gates.GO[0].config.onExit");
  });

  it("A3: an illegal runtimeContext value → an uncoded finding at runtimeContext", () => {
    const err = gatedErr(
      gatedStep("    gates:\n      GO:\n        - uses: pairflow.previous_reviewer_verdict\n", "runtimeContext: optional\n"),
    );
    const finding = err.findings.find((f) => (f as { path: string }).path === "runtimeContext");
    expect(finding).toBeDefined();
    expect(finding).not.toHaveProperty("code");
  });

  it("C19: a process gate WITHOUT runtimeContext → the coded cross-rule finding", () => {
    const err = gatedErr(
      gatedStep(
        "    gates:\n      GO:\n        - uses: external.process\n          config:\n            command: \"echo hi\"\n            timeoutMs: 1000\n            onExit: { zero: allow, nonzero: block }\n",
      ),
    );
    const finding = err.findings.find((f) => (f as { path: string }).path === "runtimeContext");
    expect(finding).toMatchObject({ code: "runtime_context_required_for_process_gate" });
  });

  it("F3 STRINGNESS: a numeric map key in the gates subtree → a finding at the nearest addressable path", () => {
    const err = gatedErr(
      gatedStep("    gates:\n      0:\n        - uses: pairflow.previous_reviewer_verdict\n"),
    );
    expect(err.stage).toBe("validate");
    expect(gatedPaths(err)).toContain("steps.s.gates");
    expect(JSON.stringify(err.findings)).toMatch(/must be strings/);
  });

  it("F3 STRINGNESS (RECURSIVE): a numeric map key DEEP in a binding's config → a finding at the nearest addressable path", () => {
    // The stringness rule is RECURSIVE: `config: { 0: x }` plants a
    // node-level NUMBER key inside the gates subtree (mapAsMap preserves
    // it). The scan must descend into the binding's config, not stop at
    // the gates map — else admission's own-key scans silently drop it.
    const err = gatedErr(
      gatedStep(
        "    gates:\n      GO:\n        - uses: pairflow.previous_reviewer_verdict\n          config:\n            0: x\n",
      ),
    );
    expect(err.stage).toBe("validate");
    // The nearest addressable path is the config map's own address.
    expect(gatedPaths(err)).toContain("steps.s.gates.GO[0].config");
    expect(JSON.stringify(err.findings)).toMatch(/must be strings/);
  });
});

// ── packet ch11-P4: the remaining C21 admission lanes REACHED through
// the FILE channel (arm-gate-2 fold). The semantic verdicts are driven
// exhaustively on the direct channel in admit.test.ts / gates/*.test.ts;
// the obligation here is that a YAML-staged loadTemplate call REACHES
// each lane — asserting the row's OWN path (and code on coded lanes),
// not mere rejection. ────────────────────────────────────────────────

describe("ch11-P4 dimension 4 — the C21 admission lanes through the file channel", () => {
  it("a NON-LIST gate pipeline value → the pipeline-kind finding at steps.<id>.gates.<evt>", () => {
    const err = gatedErr(gatedStep("    gates:\n      GO: nope\n"));
    expect(err.stage).toBe("validate");
    expect(gatedPaths(err)).toContain("steps.s.gates.GO");
    const finding = err.findings.find((f) => (f as { path: string }).path === "steps.s.gates.GO");
    expect((finding as { message: string }).message).toContain("gate pipeline must be a list");
  });

  it("a NON-MAP binding → the binding-kind finding at steps.<id>.gates.<evt>[0]", () => {
    const err = gatedErr(gatedStep("    gates:\n      GO:\n        - nope\n"));
    expect(gatedPaths(err)).toContain("steps.s.gates.GO[0]");
    const finding = err.findings.find((f) => (f as { path: string }).path === "steps.s.gates.GO[0]");
    expect((finding as { message: string }).message).toContain("gate binding must be a map");
  });

  it("a MISSING uses → the uses finding at steps.<id>.gates.<evt>[0].uses", () => {
    const err = gatedErr(
      gatedStep("    gates:\n      GO:\n        - config: { required: true }\n"),
    );
    const finding = err.findings.find((f) => (f as { path: string }).path === "steps.s.gates.GO[0].uses");
    expect(finding).toBeDefined();
    expect(finding).not.toHaveProperty("code");
    expect((finding as { message: string }).message).toContain("non-empty string");
  });

  it("a NON-MAP config (external.process) → the config container finding at ....config", () => {
    const err = gatedErr(
      gatedStep(
        "    gates:\n      GO:\n        - uses: external.process\n          config: nope\n",
        "runtimeContext:\n  kind: worktree\n  provider: pairflow.worktree\n",
      ),
    );
    const finding = err.findings.find((f) => (f as { path: string }).path === "steps.s.gates.GO[0].config");
    expect(finding).toBeDefined();
    expect((finding as { message: string }).message).toContain("config must be a map");
  });

  it("a NON-MAP output → the output container finding at ....config.output", () => {
    const err = gatedErr(
      gatedStep(
        "    gates:\n      GO:\n        - uses: external.process\n          config:\n            command: \"echo hi\"\n            timeoutMs: 1000\n            output: nope\n            onExit: { zero: allow, nonzero: block }\n",
        "runtimeContext:\n  kind: worktree\n  provider: pairflow.worktree\n",
      ),
    );
    const finding = err.findings.find((f) => (f as { path: string }).path === "steps.s.gates.GO[0].config.output");
    expect(finding).toBeDefined();
    expect((finding as { message: string }).message).toContain("output must be a map");
  });

  it("a NON-MAP onExit (exitCode mode) → the onExit container finding at ....config.onExit", () => {
    const err = gatedErr(
      gatedStep(
        "    gates:\n      GO:\n        - uses: external.process\n          config:\n            command: \"echo hi\"\n            timeoutMs: 1000\n            onExit: nope\n",
        "runtimeContext:\n  kind: worktree\n  provider: pairflow.worktree\n",
      ),
    );
    const finding = err.findings.find((f) => (f as { path: string }).path === "steps.s.gates.GO[0].config.onExit");
    expect(finding).toBeDefined();
    expect((finding as { message: string }).message).toContain("onExit must be a map");
  });

  it("a NON-MAP reason → the reason container finding at ....config.reason", () => {
    const err = gatedErr(
      gatedStep(
        "    gates:\n      GO:\n        - uses: external.process\n          config:\n            command: \"echo hi\"\n            timeoutMs: 1000\n            onExit: { zero: allow, nonzero: block }\n            reason: nope\n",
        "runtimeContext:\n  kind: worktree\n  provider: pairflow.worktree\n",
      ),
    );
    const finding = err.findings.find((f) => (f as { path: string }).path === "steps.s.gates.GO[0].config.reason");
    expect(finding).toBeDefined();
    expect((finding as { message: string }).message).toContain("reason must be a map");
  });

  it("a threshold config KEYSET violation (unknown key) → an uncoded finding at ....config.<key>", () => {
    const err = gatedErr(
      gatedStep(
        '    gates:\n      GO:\n        - uses: declarative.threshold\n          config: { metric: round, op: ">=", value: 2, bogus: 1 }\n',
      ),
    );
    const finding = err.findings.find((f) => (f as { path: string }).path === "steps.s.gates.GO[0].config.bogus");
    expect(finding).toBeDefined();
    expect(finding).not.toHaveProperty("code");
    expect((finding as { message: string }).message).toContain("unknown config key");
  });

  it("a non-allowlisted threshold op → an uncoded finding at ....config.op", () => {
    const err = gatedErr(
      gatedStep(
        '    gates:\n      GO:\n        - uses: declarative.threshold\n          config: { metric: round, op: ">", value: 2 }\n',
      ),
    );
    const finding = err.findings.find((f) => (f as { path: string }).path === "steps.s.gates.GO[0].config.op");
    expect(finding).toBeDefined();
    expect(finding).not.toHaveProperty("code");
    expect((finding as { message: string }).message).toContain("op must be");
  });

  it("a process DISPOSITION violation (onRunnerError: failInstance) → the CODED gate_config_not_supported lane", () => {
    const err = gatedErr(
      gatedStep(
        "    gates:\n      GO:\n        - uses: external.process\n          config:\n            command: \"echo hi\"\n            timeoutMs: 1000\n            onExit: { zero: allow, nonzero: block }\n            onRunnerError: failInstance\n",
        "runtimeContext:\n  kind: worktree\n  provider: pairflow.worktree\n",
      ),
    );
    const finding = err.findings.find(
      (f) => (f as { path: string }).path === "steps.s.gates.GO[0].config.onRunnerError",
    );
    expect(finding).toMatchObject({ code: "gate_config_not_supported" });
  });

  it("a reason-GRAMMAR violation (a bad token) → an uncoded finding at ....config.reason.<bucket>", () => {
    const err = gatedErr(
      gatedStep(
        "    gates:\n      GO:\n        - uses: external.process\n          config:\n            command: \"echo hi\"\n            timeoutMs: 1000\n            onExit: { zero: allow, nonzero: block }\n            reason: { nonzero: \"Bad-Token\" }\n",
        "runtimeContext:\n  kind: worktree\n  provider: pairflow.worktree\n",
      ),
    );
    const finding = err.findings.find(
      (f) => (f as { path: string }).path === "steps.s.gates.GO[0].config.reason.nonzero",
    );
    expect(finding).toBeDefined();
    expect(finding).not.toHaveProperty("code");
    expect((finding as { message: string }).message).toContain("must match");
  });
});

// ── packet ch11-P4: F7 cross-rung ACCUMULATION (dimension 5) ───────────

describe("ch11-P4 dimension 5 — the F7 accumulation disposition list a/b/b′/c/d/e", () => {
  it("(a) a non-map root → ONE walk finding, the admission rung fully suppressed", () => {
    const err = gatedErr(`- x\n- y\n`);
    expect(err.stage).toBe("validate");
    expect(err.findings).toHaveLength(1);
    expect(gatedPaths(err)).toStrictEqual(["$"]);
  });

  it("(b) steps NOT-A-MAP suppresses the gate/C19/round lanes but the steps-INDEPENDENT A3 still runs", () => {
    const err = gatedErr(
      `ref:\n  id: t\n  version: 1\nstart: s\nsteps: nope\nterminal:\n  - done\nroles:\n  r: {}\nruntimeContext: bogus\n`,
    );
    const paths = gatedPaths(err);
    expect(paths).toContain("steps");
    expect(paths).toContain("runtimeContext"); // A3 accumulates (top-level read)
    expect(paths).toHaveLength(2);
  });

  it("(b) steps MISSING ENTIRELY + an illegal runtimeContext: BOTH the ch8 missing-key AND the A3 lane accumulate", () => {
    // The steps-DEPENDENT admission lanes have no operand (steps absent),
    // but the steps-INDEPENDENT A3 runtimeContext lane (a top-level read)
    // still runs — so the ch8 missing-key finding and A3 accumulate in
    // ONE validate result (suppression stays LOCAL to the broken operand).
    const err = gatedErr(
      `ref:\n  id: t\n  version: 1\nstart: s\nterminal:\n  - done\nroles:\n  r: {}\nruntimeContext: "yes"\n`,
    );
    expect(err.stage).toBe("validate");
    const paths = gatedPaths(err);
    expect(paths).toContain("$"); // the ch8 missing-key finding
    expect(paths).toContain("runtimeContext"); // A3 accumulates (top-level read)
    expect(JSON.stringify(err.findings)).toContain("steps"); // the missing key named
    expect(paths).toHaveLength(2);
  });

  it("(b′) EMPTY steps + a round declaration: the C9 finding accumulates AND round MEMBERSHIP fires", () => {
    const err = gatedErr(
      `ref:\n  id: t\n  version: 1\nstart: s\nsteps: {}\nterminal:\n  - done\nroles: {}\nround:\n  advanceOnArrivalAt:\n    - s\n`,
    );
    const paths = gatedPaths(err);
    expect(paths).toContain("steps"); // C9 nonemptiness
    expect(paths).toContain("round.advanceOnArrivalAt[0]"); // membership FIRES (s ∉ ∅)
  });

  it("(c) a broken step container suppresses ITS gates; every OTHER step's gate lane still runs", () => {
    const err = gatedErr(
      `ref:\n  id: t\n  version: 1\nstart: good\nsteps:\n  good:\n    role: r\n    instruction: i\n    transitions:\n      GO: done\n    gates:\n      GO:\n        - uses: no.such.gate\n  bad: nope\nterminal:\n  - done\nroles:\n  r: {}\n`,
    );
    const paths = gatedPaths(err);
    expect(paths).toContain("steps.bad"); // the broken container's own finding
    expect(paths).toContain("steps.good.gates.GO[0]"); // the OTHER step's gate ran
  });

  it("(d) a round SOURCE-FORM defect suppresses the round value-level lanes; the gate lane is unaffected", () => {
    const err = gatedErr(
      `ref:\n  id: t\n  version: 1\nstart: s\nsteps:\n  s:\n    role: r\n    instruction: i\n    transitions:\n      GO: done\n    gates:\n      GO:\n        - uses: no.such.gate\nterminal:\n  - done\nroles:\n  r: {}\nround: 5\n`,
    );
    const paths = gatedPaths(err);
    expect(paths).toContain("round"); // the source-form finding
    expect(paths).toContain("steps.s.gates.GO[0]"); // the gate lane ran
    // The round VALUE-LEVEL lanes are SUPPRESSED (no membership/empty finding).
    expect(paths.some((p) => p.startsWith("round.advanceOnArrivalAt"))).toBe(false);
  });

  it("(e) an INDEPENDENT structural lane (bad start) accumulates with an admission gate lane", () => {
    const err = gatedErr(
      `ref:\n  id: t\n  version: 1\nstart: nope\nsteps:\n  s:\n    role: r\n    instruction: i\n    transitions:\n      GO: done\n    gates:\n      GO:\n        - uses: no.such.gate\nterminal:\n  - done\nroles:\n  r: {}\n`,
    );
    const paths = gatedPaths(err);
    expect(paths).toContain("start");
    expect(paths).toContain("steps.s.gates.GO[0]");
  });

  it("the parse short-circuit is UNCHANGED: a parse-defective gated file reports PARSE findings ONLY", () => {
    const err = gatedErr(
      `ref:\n  id: t\n  version: 1\nstart: s\nsteps:\n  s:\n    role: r\n    instruction: i\n    transitions:\n      GO: done\n    gates:\n      GO:\n        - uses: pairflow.previous_reviewer_verdict\n        - uses: pairflow.previous_reviewer_verdict\n  s:\n    role: r\n    instruction: i\n    transitions: {}\nterminal:\n  - done\nroles:\n  r: {}\n`,
    );
    expect(err.stage).toBe("parse");
    for (const finding of err.findings) {
      expect((finding as { stage?: string }).stage).toBe("parse");
    }
  });
});

// ── packet ch11-P4: channel equivalence (dimension 6) ──────────────────

describe("ch11-P4 dimension 6 — the maximal gated template: file-loaded ≡ direct-admitted", () => {
  const maximalYaml = `ref:
  id: max
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
    gates:
      CONVERGED:
        - uses: declarative.threshold
          config: { metric: round, op: ">=", value: 2 }
        - uses: pairflow.previous_reviewer_verdict
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

  const maximalDirect: WorkflowTemplate = {
    ref: { id: "max", version: 1 },
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
        gates: {
          CONVERGED: [
            { uses: "declarative.threshold", config: { metric: "round", op: ">=", value: 2 } },
            { uses: "pairflow.previous_reviewer_verdict" },
          ],
        },
      },
    },
    terminal: ["done"],
    roles: { implementer: { defaultActor: "codex" }, reviewer: { defaultActor: "claude" } },
    round: { advanceOnArrivalAt: ["implement"] },
  };

  it("the whole admitted value is DEEP-EQUAL across channels (effective configs + advancesRound + every field)", () => {
    const fileLoaded = loadGated(maximalYaml);
    const direct = admitTemplate(maximalDirect, catalog);
    expect(fileLoaded.ok).toBe(true);
    expect(direct.ok).toBe(true);
    if (!fileLoaded.ok || !direct.ok) return;
    expect(fileLoaded.template).toEqual(direct.template);
  });
});

// ── packet ch11-P4: F8 the declaration-absent default (dimension 8) ─────

describe("ch11-P4 dimension 8 — the file-grain declaration-absent default (F8)", () => {
  it("a declaration-absent YAML template admits with COMPLETE all-false advancesRound maps", () => {
    const result = loadGated(
      `ref:\n  id: t\n  version: 1\nstart: s\nsteps:\n  s:\n    role: r\n    instruction: i\n    transitions:\n      GO: done\nterminal:\n  - done\nroles:\n  r: {}\n`,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.template.steps["s"]?.advancesRound).toStrictEqual({ GO: false });
    expect(result.template.round).toBeUndefined();
  });
});

// ── packet ch12-P4 (F3, C2/C3): the file-channel runtimeContext spec-map
// SOURCE FORM now WALKS — the walk materializes the `mapAsMap` JS Map into a
// plain own-property record delivered to the template's runtimeContext slot
// (retiring the ch12-P3 P4-deferred admission interception, Claim 6 item 5).
// Direct construction is unaffected. ──

describe("ch12-P4 F3 — the file-channel runtimeContext spec-map source form now walks", () => {
  const withRc = (rc: string): string =>
    `ref:\n  id: t\n  version: 1\nstart: s\nsteps:\n  s:\n    role: r\n    instruction: i\n    transitions:\n      GO: done\nterminal:\n  - done\nroles:\n  r: {}\n${rc}`;

  it("a YAML-authored runtimeContext SPEC MAP now WALKS (F3) → the admitted template carries the materialized required(spec)", () => {
    const result = loadGated(
      withRc("runtimeContext:\n  kind: worktree\n  provider: pairflow.worktree\n"),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // The spec map materialized into a plain own-property record (never a JS
    // Map) — deep-equal to the direct-construction spec (the C25 P4-deferral
    // retirement: one authority, no degenerate staging).
    expect(result.template.runtimeContext).toEqual({
      kind: "worktree",
      provider: "pairflow.worktree",
    });
  });

  it("a spec map with a `config` sub-map carries the RAW config verbatim (provider-owned, uninterpreted)", () => {
    const result = loadGated(
      withRc(
        "runtimeContext:\n  kind: worktree\n  provider: pairflow.worktree\n  config:\n    repo: bubble/{instance_id}\n",
      ),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.template.runtimeContext).toEqual({
      kind: "worktree",
      provider: "pairflow.worktree",
      config: { repo: "bubble/{instance_id}" },
    });
  });

  it("a YAML `runtimeContext: required` → the R2 migration refusal (still driven)", () => {
    const err = gatedErr(withRc("runtimeContext: required\n"));
    const finding = err.findings.find((f) => (f as { path: string }).path === "runtimeContext");
    expect((finding as { message: string }).message).toMatch(/retired/);
  });

  it("a YAML `runtimeContext: none` (context-free) admits AND normalizes to the `none` requirement (content asserted, not just ok)", () => {
    const result = loadGated(withRc("runtimeContext: none\n"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // A mis-normalization (e.g. carrying the raw string through as a spec, or
    // dropping the field) would fail this content assert.
    expect(result.template.runtimeContext).toBe("none");
  });

  it("an ABSENT runtimeContext (context-free) admits AND normalizes to `none`", () => {
    const result = loadGated(withRc(""));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.template.runtimeContext).toBe("none");
  });

  it("an ILLEGAL runtimeContext value (present-null / list / other-scalar) → admission's A1 container finding at runtimeContext (the walk passes it raw)", () => {
    for (const rc of ["runtimeContext:\n", "runtimeContext:\n  - x\n", "runtimeContext: 7\n"]) {
      const err = gatedErr(withRc(rc));
      const at = err.findings.filter((f) => (f as { path: string }).path === "runtimeContext");
      // EXACTLY ONE finding at runtimeContext (the walk owns no value meaning;
      // A1 emits the container-precondition lane), uncoded.
      expect(at).toHaveLength(1);
      expect(at[0]).not.toHaveProperty("code");
    }
  });
});

// ── packet ch12-P4: dimension 5 — the MAXIMAL runtime-key template channel
// equivalence (file-loaded ≡ direct-admitted, whole-value deep-equal) ──────

describe("ch12-P4 dimension 5 — the maximal runtime-key template: file-loaded ≡ direct-admitted", () => {
  const maximalYaml = `ref:
  id: rtmax
  version: 1
start: implement
steps:
  implement:
    role: implementer
    instruction: |-
      build it
    transitions:
      PASS: done
    agentConfig:
      approach: tdd
terminal:
  - done
roles:
  implementer:
    defaultActor: codex
    defaultAgentConfig:
      mode: builder
      promptProfileRefs:
        - engineer-defaults
activation:
  mode: deferredKickoff
runtimeContext:
  kind: worktree
  provider: pairflow.worktree
  config:
    repo: bubble/{instance_id}
`;

  const maximalDirect: WorkflowTemplate = {
    ref: { id: "rtmax", version: 1 },
    start: "implement",
    steps: {
      implement: {
        role: "implementer",
        instruction: "build it",
        transitions: { PASS: "done" },
        agentConfig: { approach: "tdd" },
      },
    },
    terminal: ["done"],
    roles: {
      implementer: {
        defaultActor: "codex",
        defaultAgentConfig: { mode: "builder", promptProfileRefs: ["engineer-defaults"] },
      },
    },
    // The authored camelCase deferredKickoff ↔ the stored deferred_kickoff.
    activation: { mode: "deferred_kickoff" },
    runtimeContext: {
      kind: "worktree",
      provider: "pairflow.worktree",
      config: { repo: "bubble/{instance_id}" },
    },
  };

  it("the whole admitted value is DEEP-EQUAL across channels (activation default, requirement, every agent-config position)", () => {
    const fileLoaded = loadGated(maximalYaml);
    const direct = admitTemplate(maximalDirect, catalog);
    expect(fileLoaded.ok).toBe(true);
    expect(direct.ok).toBe(true);
    if (!fileLoaded.ok || !direct.ok) return;
    expect(fileLoaded.template).toEqual(direct.template);
  });
});

// ── packet ch12-P4: A3 the agent-config canonical-JSON-safety value lane,
// driven through the FILE channel at BOTH template positions ──────────────

describe("ch12-P4 A3 — the non-finite agent-config rejection through the file channel", () => {
  it("a `.nan` in a step agentConfig → the canonical-JSON-safety rejection at steps.<s>.agentConfig", () => {
    const err = gatedErr(
      `ref:\n  id: t\n  version: 1\nstart: s\nsteps:\n  s:\n    role: r\n    instruction: i\n    transitions: {}\n    agentConfig:\n      budget: .nan\nterminal:\n  - done\nroles:\n  r: {}\n`,
    );
    const at = err.findings.filter((f) => (f as { path: string }).path === "steps.s.agentConfig");
    expect(at).toHaveLength(1);
    expect((at[0] as { message: string }).message).toMatch(/canonical-JSON-safe/);
  });

  it("a `.inf` in a role defaultAgentConfig → the canonical-JSON-safety rejection at roles.<r>.defaultAgentConfig", () => {
    const err = gatedErr(
      `ref:\n  id: t\n  version: 1\nstart: s\nsteps:\n  s:\n    role: r\n    instruction: i\n    transitions: {}\nterminal:\n  - done\nroles:\n  r:\n    defaultAgentConfig:\n      ceiling: .inf\n`,
    );
    const at = err.findings.filter(
      (f) => (f as { path: string }).path === "roles.r.defaultAgentConfig",
    );
    expect(at).toHaveLength(1);
    expect((at[0] as { message: string }).message).toMatch(/canonical-JSON-safe/);
  });

  it("a NON-MAP `roles.<r>.defaultAgentConfig` (a scalar) → the container-precondition finding through the FILE channel", () => {
    const err = gatedErr(
      `ref:\n  id: t\n  version: 1\nstart: s\nsteps:\n  s:\n    role: r\n    instruction: i\n    transitions: {}\nterminal:\n  - done\nroles:\n  r:\n    defaultAgentConfig: hello\n`,
    );
    const at = err.findings.filter(
      (f) => (f as { path: string }).path === "roles.r.defaultAgentConfig",
    );
    expect(at).toHaveLength(1);
    expect((at[0] as { message: string }).message).toMatch(/defaultAgentConfig must be a map/);
  });

  it("a NON-MAP `steps.<s>.agentConfig` (a scalar) → the container-precondition finding through the FILE channel", () => {
    const err = gatedErr(
      `ref:\n  id: t\n  version: 1\nstart: s\nsteps:\n  s:\n    role: r\n    instruction: i\n    transitions: {}\n    agentConfig: hello\nterminal:\n  - done\nroles:\n  r: {}\n`,
    );
    const at = err.findings.filter((f) => (f as { path: string }).path === "steps.s.agentConfig");
    expect(at).toHaveLength(1);
    expect((at[0] as { message: string }).message).toMatch(/agentConfig must be a map/);
  });
});

// ── packet ch12-P4 A2 (C5): the process↔workspace cross-rule through the
// FILE channel — an ILLEGAL runtimeContext value SUPPRESSES the cross-rule
// (dependent-lane suppression), and a real spec map SATISFIES it. ──────────

describe("ch12-P4 A2 — the process-gate cross-rule through the file channel", () => {
  const processStep = `steps:
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
`;
  const withProcess = (rc: string): string =>
    `ref:\n  id: t\n  version: 1\nstart: s\n${processStep}terminal:\n  - done\nroles:\n  r: {}\n${rc}`;

  it("an ILLEGAL runtimeContext value AND a process gate → ONE container finding at runtimeContext, the C5 cross-rule SUPPRESSED (dependent-lane)", () => {
    const err = gatedErr(withProcess("runtimeContext:\n")); // present-null (illegal)
    const at = err.findings.filter((f) => (f as { path: string }).path === "runtimeContext");
    // Exactly one finding at runtimeContext — the A1 container lane, uncoded;
    // the coded cross-rule is SUPPRESSED under it (would fail if the cross-rule
    // fired alongside the illegal-value finding).
    expect(at).toHaveLength(1);
    expect(at[0]).not.toHaveProperty("code");
    expect(
      err.findings.some((f) => (f as { code?: string }).code === "runtime_context_required_for_process_gate"),
    ).toBe(false);
  });

  it("a real spec map SATISFIES the process-gate cross-rule (the negative direction — admits clean)", () => {
    const result = loadGated(
      withProcess("runtimeContext:\n  kind: worktree\n  provider: pairflow.worktree\n"),
    );
    expect(result.ok).toBe(true);
  });

  it("an authored `none` requirement TRIGGERS the cross-rule (a coded finding — the positive direction, so suppression above is meaningful)", () => {
    const err = gatedErr(withProcess("runtimeContext: none\n"));
    expect(
      err.findings.some((f) => (f as { code?: string }).code === "runtime_context_required_for_process_gate"),
    ).toBe(true);
  });
});

describe("the source-form address is CARRIED, not parsed back out of a rendered path", () => {
  // ch8-C10 admits any id without whitespace or a dot, so `s[0]` is a
  // legal step id. Deriving the AST address by re-parsing the rendered
  // finding path read `[0]` as a list index, missed the node, and let a
  // forbidden source form through (B1 F3).
  const gated = (value: string, stepId: string): string =>
    `ref:\n  id: t\n  version: 1\nstart: "${stepId}"\nsteps:\n  "${stepId}":\n    role: r\n` +
    `    instruction: i\n    transitions:\n      GO: done\n    gates:\n      GO:\n` +
    `        - uses: declarative.threshold\n          config:\n            metric: round\n` +
    `            op: ">="\n            value: ${value}\nterminal:\n  - done\nroles:\n  r: {}\n`;

  it("a forbidden source form is caught under a step id containing brackets", () => {
    const err = gatedErr(gated("01", "s[0]"));
    expect(err.findings).toStrictEqual([
      {
        path: "steps.s[0].gates.GO[0].config.value",
        message: 'steps.s[0].gates.GO[0].config.value must be written as a plain decimal integer >= 1; got source form "01"',
      },
    ]);
  });

  it("DISCRIMINATES: the same bracketed id with a well-formed source value admits", () => {
    expect(loadGated(gated("1", "s[0]")).ok).toBe(true);
  });

  it("and the ordinary id keeps behaving exactly as before", () => {
    expect(gatedErr(gated("01", "s")).findings).toHaveLength(1);
    expect(loadGated(gated("1", "s")).ok).toBe(true);
  });
});
