import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { EventEnvelope } from "../domain/index.js";
import { isWireExpectedVersion } from "../ingress/ingress.js";
import type { ResumeWaitInput, SubmitDecisionInput } from "../kernel/index.js";

/**
 * Family 15 (packet ch14-p2a, K6) — the NARROW RULE, driven rather than
 * merely stated.
 *
 * THIS FILE ALSO CARRIES ch14-p2b's CORPUS LANES, named here because a
 * header describing one family is how the next reader concludes the
 * others are absent: family 17's class-separation COMPILE-NEGATIVES (an
 * `EventEnvelope` must not satisfy either operator intent's kernel-side
 * input type) and family 10's SHARED-CALL-SITE lane (both ingress wires
 * reach the one extracted `expectedVersion` refusal ladder). They live
 * here rather than in a new file because ch14-p2b's mutation boundary
 * declares four creations and none is a drift file — "beside the
 * existing intent-narrow scanner" resolves to INTO it.
 *
 * `pnpm v3:typecheck` forces *a* narrow at every reader of the widened
 * `committed.intent` and CANNOT see WHICH: a bare type assertion
 * satisfies the compiler and answers the claim's question wrongly. It
 * would also ride through K17(a)'s erasure set as "compiler-forced" if
 * nothing here refused it — which is exactly where the two rules meet.
 *
 * The rule: at a widening site the narrow is on a DISCRIMINATING FIELD.
 * Never truthiness, never `as`.
 */

const SRC = new URL("..", import.meta.url).pathname;

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(path));
    else if (entry.name.endsWith(".ts")) out.push(path);
  }
  return out;
}

/** The two members share NO key by construction, so a discriminator exists. */
const DISCRIMINATORS = [
  '"packet" in',
  '"actor" in',
  '"requestRef" in',
  '"question" in',
  '"allowedDecisions" in',
];

describe("the widened intent is narrowed on a DISCRIMINATING field", () => {
  const files = sourceFiles(SRC);

  it("scans a non-empty corpus (a silent zero would prove nothing)", () => {
    expect(files.length).toBeGreaterThan(30);
  });

  it("no source asserts its way past the widening", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const [i, line] of text.split("\n").entries()) {
        // A bare assertion ONTO either member of the widened union is
        // the shape K17(a) refuses; the erasure set admits the
        // discriminating narrow and nothing else.
        if (/\bas\s+(DispatchIntent|HumanDecisionRequest)\b/.test(line)) {
          offenders.push(`${file}:${String(i + 1)}: ${line.trim()}`);
        }
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("every file reading `.intent` past the widening carries a discriminating narrow", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      // The COMMITTED arm's reads — `Activated.intent` is a different
      // type and outside the set, which is why the scan looks for the
      // optional-chain form the committed arm requires.
      if (!/\.intent\?\./.test(text)) continue;
      if (!DISCRIMINATORS.some((token) => text.includes(token))) {
        offenders.push(file);
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});

/**
 * FAMILY 17 (packet ch14-p2b, Q9) — the CLASS SEPARATION, driven as a
 * COMPILE-NEGATIVE.
 *
 * `l3/decision-is-operator-intent-not-actor-envelope`'s disposition is
 * TYPE/SCHEMA, so the lane is a compile-negative: an `EventEnvelope`
 * value handed to either operator intent's KERNEL-SIDE input type must
 * FAIL to typecheck.
 *
 * SHAPE ALONE DOES NOT DELIVER IT, which is why the discriminator is
 * NOMINAL: an `EventEnvelope` is structurally assignable to a bare
 * `{ instanceId, opId, expectedVersion?, type }` resume intent, because
 * excess-property checking binds only fresh object literals. The
 * required literal `intent` member is what closes it — no envelope
 * carries it and no envelope TYPE can satisfy it.
 *
 * ITS SENSITIVITY IS STATED AT THE GRAIN IT ACTUALLY REACHES: removing
 * the member, or making it optional, makes the negative PASS and reds
 * this lane. WIDENING it from a literal to a plain `string` does NOT —
 * an envelope carries no `intent` key at any type — so that widening is
 * covered by its OWN cell below. The two cells together cover removal,
 * optionality and widening.
 *
 * This family SCANS NOTHING: it is the compile-negative class. The live
 * corpus scanner is `intentNarrow.test.ts`, which is packet ch14-p2a's.
 */

/** `true` iff `T` is assignable to `U` — the negative's carrier. */
type Assignable<T, U> = [T] extends [U] ? true : false;

describe("family 17 — an EventEnvelope is NOT assignable to either operator intent", () => {
  it("CELL 1: the envelope value fails against SubmitDecisionInput", () => {
    const envelopeIsNotASubmit: Assignable<EventEnvelope, SubmitDecisionInput> = false;
    expect(envelopeIsNotASubmit).toBe(false);
  });

  it("CELL 1: the envelope value fails against ResumeWaitInput", () => {
    // The resume intent is the SHARPER half: its field set
    // (`instanceId, opId, expectedVersion?, type`) is one an envelope
    // structurally satisfies, so ONLY the nominal member refuses it.
    const envelopeIsNotAResume: Assignable<EventEnvelope, ResumeWaitInput> = false;
    expect(envelopeIsNotAResume).toBe(false);
  });

  it("CELL 2: a WRONG-LITERAL intent value fails too — the widening cell", () => {
    // If `intent` were widened from a literal to a plain `string`, cell 1
    // would still pass (an envelope carries no `intent` at any type) and
    // the separation would be silently weaker. THIS cell is what sees
    // that: a record carrying `intent: "resume-wait"` must not satisfy
    // the SUBMIT type, and vice versa.
    type WrongLiteralSubmit = Omit<SubmitDecisionInput, "intent"> & { intent: "resume-wait" };
    type WrongLiteralResume = Omit<ResumeWaitInput, "intent"> & { intent: "submit-decision" };
    const wrongSubmit: Assignable<WrongLiteralSubmit, SubmitDecisionInput> = false;
    const wrongResume: Assignable<WrongLiteralResume, ResumeWaitInput> = false;
    expect(wrongSubmit).toBe(false);
    expect(wrongResume).toBe(false);
  });

  it("CONTROL: a WELL-FORMED intent value IS assignable — the negative is not vacuous", () => {
    // Without this cell the three above would pass on a type nothing can
    // satisfy at all.
    const submit: SubmitDecisionInput = {
      intent: "submit-decision",
      instanceId: "i1",
      opId: "d1",
      expectedVersion: 3,
      requestRef: "R",
      verdict: "approve",
      by: "human-1",
    };
    const resume: ResumeWaitInput = {
      intent: "resume-wait",
      instanceId: "i1",
      opId: "r1",
      expectedVersion: 4,
      type: "COMMIT",
    };
    expect(submit.intent).toBe("submit-decision");
    expect(resume.intent).toBe("resume-wait");
  });
});

/**
 * FAMILY 10's STRUCTURAL LANE (Q19) — the shared numeric-refusal helper.
 *
 * A BEHAVIOURAL lane driving one refusal cell through the new wire does
 * NOT suffice and is named as insufficient rather than left to look
 * adequate: it cannot distinguish a SHARED HELPER from a FAITHFUL COPY,
 * which is the only thing the extraction exists to prevent. Absent the
 * extraction the block would carry ALL FOUR cells, because a copy that
 * drops `Object.is(v, -0)` passes a single lane while admitting the
 * value the round-trip flattens.
 *
 * **THE TWO WIRES ARE NOT TWO MODULES.** The envelope path
 * (`parseEnvelope`) and the operator-intent path (`submitIntent`'s
 * keyset branch) both live in `v3/src/ingress/ingress.ts`, and
 * `ingress/index.ts` is a barrel that re-exports it. So the lane
 * identifies TWO CALL SITES inside ONE file rather than one reference in
 * each of two files — which is what makes a single lane enough.
 */
describe("family 10 — ONE numeric ladder, called from BOTH wires", () => {
  const ingressSource = readFileSync(
    new URL("../ingress/ingress.ts", import.meta.url),
    "utf8",
  );

  it("the helper is EXPORTED and importable — the reuse is compile-visible", () => {
    expect(typeof isWireExpectedVersion).toBe("function");
  });

  it("BOTH call sites live in the ONE ingress production module", () => {
    const callSites = [...ingressSource.matchAll(/isWireExpectedVersion\(/g)].length;
    // One DECLARATION plus at least two CALL sites: the envelope path and
    // the operator-intent path. A copy in either place leaves this at
    // fewer calls and REDS.
    expect(ingressSource).toContain("export function isWireExpectedVersion");
    expect(callSites).toBeGreaterThanOrEqual(3);
    // The two wires' own branches each reach it.
    const envelopeBranch = ingressSource.slice(
      ingressSource.indexOf("function parseEnvelope"),
      ingressSource.indexOf("export function isWireExpectedVersion"),
    );
    expect(envelopeBranch).toContain("isWireExpectedVersion(expectedVersion)");
    const intentBranch = ingressSource.slice(ingressSource.indexOf("submitIntent(raw: unknown)"));
    expect(intentBranch).toContain('isWireExpectedVersion(record["expectedVersion"])');
  });

  it("ALL FOUR refusal cells live in the ONE helper — including the `-0` cell a copy drops", () => {
    expect(isWireExpectedVersion(3)).toBe(true);
    expect(isWireExpectedVersion(0)).toBe(true);
    // typeof number
    expect(isWireExpectedVersion("3")).toBe(false);
    // Number.isInteger
    expect(isWireExpectedVersion(1.5)).toBe(false);
    // >= 0
    expect(isWireExpectedVersion(-1)).toBe(false);
    // Object.is(v, -0) — `Number.isInteger(-0)` is true and `-0 < 0` is
    // false, yet the round-trip flattens it to 0. A copy dropping THIS
    // cell passes a single-lane gate block while admitting the value.
    expect(isWireExpectedVersion(-0)).toBe(false);
  });
});
