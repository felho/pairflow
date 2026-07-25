import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { AttemptResult } from "../ports/delivery.js";
import {
  classifyConclusion,
  classifySessionConclusion,
  parseEmit,
  parseResult,
} from "./actorAdapter.js";
import type { ResultRecord } from "./actorAdapter.js";
import type { SpawnConclusion } from "./spawn.js";

/**
 * The PURE conclusion-classification + parser lanes (packet ch9-p3b aftermath,
 * gate-2 finding 2/4). This file spawns NO subprocess — so it stays OUT of the
 * Stryker subprocess-exclude (vitest.stryker.config.ts) and CARRIES the mutation
 * coverage for `actorAdapter.ts`'s pure logic: the CL1 precedence walked
 * ROW-BY-ROW × `timedOut` × record shape to its EXACT K1 member (including the
 * flag×record combinations the trivial real wrapper cannot produce — a flagged
 * natural exit-0, a flagged nonzero, a flagged foreign kill), plus the RS2/EM1
 * fail-closed parsers member-by-member.
 */

// ── builders ────────────────────────────────────────────────────────────────
function exit(over: Partial<Extract<SpawnConclusion, { kind: "exit" }>> = {}): SpawnConclusion {
  return { kind: "exit", code: 0, signal: null, timedOut: false, stdout: "", stderr: "", ...over };
}
const INFRA: SpawnConclusion = { kind: "infra", message: "spawn setup boom" };
function rec(over: Partial<ResultRecord> = {}): ResultRecord {
  return { attemptId: "att-1", exitCode: 0, signal: null, termForwarded: false, ...over };
}
function result(cls: Extract<AttemptResult, { kind: "infra_failure" }>["class"]): AttemptResult {
  return { kind: "infra_failure", class: cls };
}

describe("classifyConclusion — the CL1 total precedence (pure, member-by-member)", () => {
  // Each row: a human name, the seam conclusion, the (row-4-only) record, and
  // the EXACT expected decision. `record` is null on the rows the real caller
  // leaves unread (it passes null off the exit-0 lane) — but the gate-2 re-check
  // group below deliberately DRIVES rows 2-3 with a NON-NULL record to prove the
  // earlier row concludes and the record is never consulted.
  const CASES: readonly {
    name: string;
    conclusion: SpawnConclusion;
    record: ResultRecord | null;
    expected: { kind: "emit" } | { kind: "result"; result: AttemptResult };
  }[] = [
    // Row 1 — seam infra (record irrelevant, both timer values collapse to infra).
    { name: "row1: infra → spawn_infra", conclusion: INFRA, record: null, expected: { kind: "result", result: result("spawn_infra") } },
    // Row 2 — wrapper SIGNAL conclusion (code null), flag decides.
    { name: "row2: signal, UNFLAGGED → foreign_kill", conclusion: exit({ code: null, signal: "SIGKILL", timedOut: false }), record: null, expected: { kind: "result", result: result("foreign_kill") } },
    { name: "row2: signal, FLAGGED → own_timeout", conclusion: exit({ code: null, signal: "SIGKILL", timedOut: true }), record: null, expected: { kind: "result", result: result("own_timeout") } },
    // Row 3 — wrapper NONZERO exit, flag decides.
    { name: "row3: nonzero wrapper, UNFLAGGED → spawn_infra", conclusion: exit({ code: 7, timedOut: false }), record: null, expected: { kind: "result", result: result("spawn_infra") } },
    { name: "row3: nonzero wrapper, FLAGGED → own_timeout", conclusion: exit({ code: 7, timedOut: true }), record: null, expected: { kind: "result", result: result("own_timeout") } },
    // Row 4 head — wrapper exit 0, INVALID/missing/foreign result (record null), flag decides.
    { name: "row4-head: exit0 + null record, UNFLAGGED → spawn_infra", conclusion: exit({ code: 0, timedOut: false }), record: null, expected: { kind: "result", result: result("spawn_infra") } },
    { name: "row4-head: exit0 + null record, FLAGGED → own_timeout", conclusion: exit({ code: 0, timedOut: true }), record: null, expected: { kind: "result", result: result("own_timeout") } },
    // Row 4 — recorded ACTOR SIGNAL: termForwarded discriminates ONLY under a fired timer.
    { name: "row4 actor-signal: unflagged → foreign_kill", conclusion: exit({ code: 0, timedOut: false }), record: rec({ exitCode: null, signal: "SIGTERM", termForwarded: false }), expected: { kind: "result", result: result("foreign_kill") } },
    { name: "row4 actor-signal: unflagged + termForwarded → foreign_kill (fwd-bit inert w/o timer)", conclusion: exit({ code: 0, timedOut: false }), record: rec({ exitCode: null, signal: "SIGTERM", termForwarded: true }), expected: { kind: "result", result: result("foreign_kill") } },
    { name: "row4 actor-signal: FLAGGED + termForwarded → own_timeout (our forwarded kill)", conclusion: exit({ code: 0, timedOut: true }), record: rec({ exitCode: null, signal: "SIGTERM", termForwarded: true }), expected: { kind: "result", result: result("own_timeout") } },
    { name: "row4 actor-signal: FLAGGED + NOT termForwarded → foreign_kill (foreign kill overlapped our timer)", conclusion: exit({ code: 0, timedOut: true }), record: rec({ exitCode: null, signal: "SIGTERM", termForwarded: false }), expected: { kind: "result", result: result("foreign_kill") } },
    // Row 4 — recorded ACTOR NONZERO: never a kill record, even under a fired timer.
    { name: "row4 actor-nonzero: unflagged → nonzero_exit", conclusion: exit({ code: 0, timedOut: false }), record: rec({ exitCode: 4 }), expected: { kind: "result", result: result("nonzero_exit") } },
    { name: "row4 actor-nonzero: FLAGGED → nonzero_exit (a late timer never reclassifies)", conclusion: exit({ code: 0, timedOut: true }), record: rec({ exitCode: 4 }), expected: { kind: "result", result: result("nonzero_exit") } },
    // Row 4 — recorded ACTOR EXIT 0: the EM lanes, NEVER reclassified by a late timer (P6h).
    { name: "row4 actor-0: unflagged → emit", conclusion: exit({ code: 0, timedOut: false }), record: rec({ exitCode: 0 }), expected: { kind: "emit" } },
    { name: "row4 actor-0: FLAGGED → emit (P6h: completed work never reclassified)", conclusion: exit({ code: 0, timedOut: true }), record: rec({ exitCode: 0 }), expected: { kind: "emit" } },
    // ── ch9-P3b gate-2 re-check: EARLIER-ROW precedence with a NON-NULL record ──
    // Rows 2-3 conclude BEFORE the record is read; a valid-looking record present
    // here must stay INERT. These drive the flag×record combinations the real
    // caller never produces (off the exit-0 lane it passes null), so the row-2/
    // row-3 mutants fall: a condition forced false OR a block emptied would fall
    // THROUGH to row 4, read the record, and mis-classify (emit / foreign_kill /
    // nonzero_exit — each ≠ the earlier row's member on both `timedOut` values).
    // Row 2 (wrapper SIGNAL, code null) — record inert.
    { name: "gate2 row2 signal + exit-0 record, UNFLAGGED → foreign_kill (record inert)", conclusion: exit({ code: null, signal: "SIGKILL", timedOut: false }), record: rec({ exitCode: 0 }), expected: { kind: "result", result: result("foreign_kill") } },
    { name: "gate2 row2 signal + exit-0 record, FLAGGED → own_timeout (record inert)", conclusion: exit({ code: null, signal: "SIGKILL", timedOut: true }), record: rec({ exitCode: 0 }), expected: { kind: "result", result: result("own_timeout") } },
    { name: "gate2 row2 signal + nonzero record, FLAGGED → own_timeout (record inert)", conclusion: exit({ code: null, signal: "SIGKILL", timedOut: true }), record: rec({ exitCode: 9 }), expected: { kind: "result", result: result("own_timeout") } },
    // Row 3 (wrapper NONZERO exit) — record inert. exit-0 record would fall to
    // emit; signal record to foreign_kill; nonzero record to nonzero_exit.
    { name: "gate2 row3 nonzero + exit-0 record, UNFLAGGED → spawn_infra (record inert)", conclusion: exit({ code: 7, timedOut: false }), record: rec({ exitCode: 0 }), expected: { kind: "result", result: result("spawn_infra") } },
    { name: "gate2 row3 nonzero + exit-0 record, FLAGGED → own_timeout (record inert)", conclusion: exit({ code: 7, timedOut: true }), record: rec({ exitCode: 0 }), expected: { kind: "result", result: result("own_timeout") } },
    { name: "gate2 row3 nonzero + signal record, UNFLAGGED → spawn_infra (record inert)", conclusion: exit({ code: 7, timedOut: false }), record: rec({ exitCode: null, signal: "SIGTERM", termForwarded: false }), expected: { kind: "result", result: result("spawn_infra") } },
    { name: "gate2 row3 nonzero + nonzero record, FLAGGED → own_timeout (record inert)", conclusion: exit({ code: 7, timedOut: true }), record: rec({ exitCode: 4 }), expected: { kind: "result", result: result("own_timeout") } },
  ];

  it.each(CASES)("$name", ({ conclusion, record, expected }) => {
    expect(classifyConclusion(conclusion, record)).toEqual(expected);
  });

  it("ORDER: the earlier row wins — an exit-0 wrapper whose (unread) result would classify does NOT shortcut past row 4", () => {
    // On rows 1-3 the caller passes null; here we prove the row ORDER: a signal
    // wrapper (row 2) never falls through to the record lanes even if a record
    // is (defensively) present.
    expect(classifyConclusion(exit({ code: null, signal: "SIGKILL", timedOut: false }), rec({ exitCode: 0 }))).toEqual({
      kind: "result",
      result: result("foreign_kill"),
    });
  });
});

// ── TX7 (packet ch9-p4a): the SESSION-GRAIN conclusion derivation — the pure
//    classifier's session-concluded arm (Stryker-covered, no subprocess). The
//    channel's own `timedOut` flag replaces the seam's; the RS2 record walk is
//    the CL1 row-4 core REUSED verbatim. COMPLETED WORK IS NEVER RECLASSIFIED.
describe("classifySessionConclusion — the TX7 session-grain precedence (pure, flag-composed)", () => {
  const SESSION_CASES: readonly {
    name: string;
    timedOut: boolean;
    record: ResultRecord | null;
    expected: { kind: "emit" } | { kind: "result"; result: AttemptResult };
  }[] = [
    // absent / unparseable / keyset / foreign echo (record null) — the flag decides.
    { name: "no result, UNFLAGGED → spawn_infra (C23's dead-session/no-result lane)", timedOut: false, record: null, expected: { kind: "result", result: result("spawn_infra") } },
    { name: "no result, FLAGGED → own_timeout", timedOut: true, record: null, expected: { kind: "result", result: result("own_timeout") } },
    // a valid SIGNAL record — CL1 row 4's flag branch, verbatim semantics.
    { name: "signal record, FLAGGED + termForwarded → own_timeout (our forwarded kill)", timedOut: true, record: rec({ exitCode: null, signal: "SIGTERM", termForwarded: true }), expected: { kind: "result", result: result("own_timeout") } },
    { name: "signal record, FLAGGED + NOT termForwarded → foreign_kill", timedOut: true, record: rec({ exitCode: null, signal: "SIGKILL", termForwarded: false }), expected: { kind: "result", result: result("foreign_kill") } },
    { name: "signal record, UNFLAGGED → foreign_kill (fwd-bit inert without the timer)", timedOut: false, record: rec({ exitCode: null, signal: "SIGTERM", termForwarded: true }), expected: { kind: "result", result: result("foreign_kill") } },
    // valid NONZERO — never a kill record, even under a fired timer.
    { name: "nonzero record, UNFLAGGED → nonzero_exit", timedOut: false, record: rec({ exitCode: 4 }), expected: { kind: "result", result: result("nonzero_exit") } },
    { name: "nonzero record, FLAGGED → nonzero_exit (a late timer never reclassifies)", timedOut: true, record: rec({ exitCode: 4 }), expected: { kind: "result", result: result("nonzero_exit") } },
    // valid ZERO — the EM lanes; the completed-work-kept member under a fired timer.
    { name: "exit-0 record, UNFLAGGED → emit", timedOut: false, record: rec({ exitCode: 0 }), expected: { kind: "emit" } },
    { name: "exit-0 record, FLAGGED → emit (completed work is never reclassified)", timedOut: true, record: rec({ exitCode: 0 }), expected: { kind: "emit" } },
  ];

  it.each(SESSION_CASES)("$name", ({ timedOut, record, expected }) => {
    expect(classifySessionConclusion(timedOut, record)).toEqual(expected);
  });
});

// ── the RS2 / EM1 fail-closed parsers (member-by-member, no spawn) ───────────
const roots: string[] = [];
afterEach(() => {
  for (const dir of roots.splice(0)) rmSync(dir, { recursive: true, force: true });
});
function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "v3-classify-"));
  roots.push(root);
  return root;
}
function planted(root: string, name: string, contents: string): string {
  const p = join(root, name);
  writeFileSync(p, contents);
  return p;
}

describe("parseResult — RS2 fail-closed keyset + echo (pure)", () => {
  it("a valid result echoing the attempt id parses; a FOREIGN attemptId is rejected", () => {
    const root = tempRoot();
    const ok = planted(root, "ok.json", JSON.stringify({ attemptId: "att-1", exitCode: 0, signal: null, termForwarded: false }));
    expect(parseResult(ok, "att-1")).toEqual({ attemptId: "att-1", exitCode: 0, signal: null, termForwarded: false });
    expect(parseResult(ok, "att-OTHER")).toBeNull();
  });

  it("missing and unparseable files are null", () => {
    const root = tempRoot();
    expect(parseResult(join(root, "nope.json"), "att-1")).toBeNull();
    expect(parseResult(planted(root, "bad.json", "{not json"), "att-1")).toBeNull();
  });

  it("keyset-violation lanes are null: non-integer exitCode, -0, both-null, both-non-null, extra key, non-bool termForwarded, non-object", () => {
    const root = tempRoot();
    const p = (n: string, c: string) => parseResult(planted(root, n, c), "att-1");
    expect(p("f1.json", JSON.stringify({ attemptId: "att-1", exitCode: 1.5, signal: null, termForwarded: false }))).toBeNull();
    expect(p("f2.json", '{"attemptId":"att-1","exitCode":-0,"signal":null,"termForwarded":false}')).toBeNull();
    expect(p("f3.json", JSON.stringify({ attemptId: "att-1", exitCode: null, signal: null, termForwarded: false }))).toBeNull();
    expect(p("f4.json", JSON.stringify({ attemptId: "att-1", exitCode: 0, signal: "SIGTERM", termForwarded: false }))).toBeNull();
    expect(p("f5.json", JSON.stringify({ attemptId: "att-1", exitCode: 0, signal: null, termForwarded: false, extra: 1 }))).toBeNull();
    expect(p("f6.json", JSON.stringify({ attemptId: "att-1", exitCode: 0, signal: null, termForwarded: "no" }))).toBeNull();
    expect(p("f7.json", "[1,2,3]")).toBeNull();
    expect(p("f8.json", JSON.stringify({ attemptId: "att-1", exitCode: 0, signal: 5, termForwarded: false }))).toBeNull();
  });

  it("JSON primitives (null, string, number, boolean) are each fail-closed null — valid JSON but not a plain object, NEVER a throw", () => {
    const root = tempRoot();
    const p = (n: string, c: string) => parseResult(planted(root, n, c), "att-1");
    expect(p("p-null.json", "null")).toBeNull();
    expect(p("p-str.json", '"a string"')).toBeNull();
    expect(p("p-num.json", "42")).toBeNull();
    expect(p("p-bool.json", "true")).toBeNull();
  });

  it("a valid signal record parses (exactly-one-of holds)", () => {
    const root = tempRoot();
    const p = planted(root, "sig.json", JSON.stringify({ attemptId: "att-1", exitCode: null, signal: "SIGKILL", termForwarded: true }));
    expect(parseResult(p, "att-1")).toEqual({ attemptId: "att-1", exitCode: null, signal: "SIGKILL", termForwarded: true });
  });
});

describe("parseEmit — EM1 fail-closed schema (pure)", () => {
  it("valid parses; missing/empty-type/missing-payload/non-canonicalizable/unknown-key/non-object are null", () => {
    const root = tempRoot();
    const w = (n: string, c: string) => parseEmit(planted(root, n, c));
    expect(w("ok.json", JSON.stringify({ type: "PASS", payload: { a: 1 } }))).toEqual({ type: "PASS", payload: { a: 1 } });
    expect(parseEmit(join(root, "gone.json"))).toBeNull();
    expect(w("empty.json", JSON.stringify({ type: "", payload: {} }))).toBeNull();
    expect(w("nopl.json", JSON.stringify({ type: "PASS" }))).toBeNull();
    expect(w("nc.json", '{"type":"PASS","payload":-0}')).toBeNull();
    expect(w("unk.json", JSON.stringify({ type: "PASS", payload: {}, extra: 1 }))).toBeNull();
    expect(w("arr.json", "[1,2]")).toBeNull();
    expect(w("badjson.json", "{not json")).toBeNull();
  });

  it("JSON primitives (null, string, number, boolean) are each fail-closed null — valid JSON but not a plain object, NEVER a throw", () => {
    const root = tempRoot();
    const w = (n: string, c: string) => parseEmit(planted(root, n, c));
    expect(w("p-null.json", "null")).toBeNull();
    expect(w("p-str.json", '"x"')).toBeNull();
    expect(w("p-num.json", "7")).toBeNull();
    expect(w("p-bool.json", "false")).toBeNull();
  });
});
