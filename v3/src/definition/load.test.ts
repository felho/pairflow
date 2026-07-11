import { describe, expect, it } from "vitest";

import { loadTemplate } from "./index.js";
import type { TemplateLoadErrorInfo } from "./index.js";

// Packet ch8-P1: the load pipeline over bytes — the G-gate lanes
// (read/parse/resolve stages), the E1 ordering rules, the dimension-7
// short-circuit combinations, and the E5 machine-shape assertions on
// every error lane. Hostile fixtures are RAW text (R-RAW-FIXTURES).

function bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
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
