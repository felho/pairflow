import { describe, expect, it } from "vitest";

import { defaultSessionNamer, enc } from "./enc.js";

/**
 * The C8 encoding suite (packet ch9-p3b, T1) — RELOCATED from the provider
 * suite with the function (injectivity / reserved-delimiter / nonempty lanes
 * move; the provider suite keeps its COMPOSED-identity lanes — hostile ids in
 * the created path/branch). Plus RS4(b)'s `defaultSessionNamer` selftest.
 */
describe("enc — the C8 host-safe encoding (relocated authority)", () => {
  it("enc property-level: lowercase-stable, delimiters unexpressible, nonempty, code-unit injective", () => {
    // (iv) enc of a nonempty id is nonempty.
    expect(enc("a").length).toBeGreaterThan(0);
    expect(enc("\uD800").length).toBeGreaterThan(0);
    // all-lowercase, alphabet [a-z0-9_].
    expect(enc("ABC/..--x")).toMatch(/^[a-z0-9_]*$/);
    // (iii) `/`, `--`, `.` unexpressible.
    const out = enc("a/b--c.d");
    expect(out).not.toContain("/");
    expect(out).not.toContain("--");
    expect(out).not.toContain(".");
    // (i) case-fold injectivity by construction: 'a' vs 'A' distinct.
    expect(enc("a")).not.toBe(enc("A"));
    // ILL-FORMED-Unicode injectivity: lone surrogate vs U+FFFD distinct.
    expect(enc("\uD800")).toBe("_d800");
    expect(enc("�")).toBe("_fffd");
    expect(enc("\uD800")).not.toBe(enc("�"));
  });

  it("enc pass-through: lowercase ASCII letters and digits ride verbatim", () => {
    expect(enc("abcxyz0189")).toBe("abcxyz0189");
    // Every escape is exactly `_` + FOUR lowercase hex digits.
    expect(enc("_")).toBe("_005f");
    expect(enc("A")).toBe("_0041");
    expect(enc(" ")).toBe("_0020");
  });
});

describe("defaultSessionNamer — the C23 session-name derivation (RS4(b))", () => {
  it("is `pairflow-` + enc(instanceId) + `--` + enc(attemptId)", () => {
    expect(defaultSessionNamer("inst-1", "att-9")).toBe(
      `pairflow-${enc("inst-1")}--${enc("att-9")}`,
    );
  });

  it("hostile ids never appear RAW in the session name (C8's encoding rule)", () => {
    const name = defaultSessionNamer("../Escape--x", "a/b");
    // The raw traversal, uppercase, and bare `--` never survive into the name.
    expect(name).not.toContain("..");
    expect(name).not.toContain("/");
    expect(name).not.toMatch(/[A-Z]/);
    // The ONLY literal `--` is the derivation's own delimiter; the ids'
    // `--` (from `Escape--x`) is escaped away, so exactly one `--` remains.
    expect(name.split("--")).toHaveLength(2);
    expect(name.startsWith("pairflow-")).toBe(true);
  });

  it("injectivity: distinct (instanceId, attemptId) pairs cannot alias", () => {
    // enc's reserved delimiters make the join unambiguous: `a--b`/`c` cannot
    // collide with `a`/`b--c`.
    expect(defaultSessionNamer("a--b", "c")).not.toBe(defaultSessionNamer("a", "b--c"));
  });
});
