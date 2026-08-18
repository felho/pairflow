import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Family 15 (packet ch14-p2a, K6) — the NARROW RULE, driven rather than
 * merely stated.
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
