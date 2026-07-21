import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { REJECTION_NAMES } from "../domain/index.js";

/**
 * The PI-3 rejection drift test's name axis (packet ch5-P1 — moved here
 * from domain/, where it arrived early per plan §4.5): the in-code union
 * carries ALL 54 ledger §3 names — set equality against the ledger parsed
 * at test time, so there is no second hand-copied list to drift.
 * ADR-007: drift TEST files may value-import domain registry values —
 * comparing the runtime value against the ledger is the whole point.
 */
const LEDGER_URL = new URL(
  "../../../v3/model/ledger.md",
  import.meta.url,
);

const REJECTION_LINE = /^- `([^`]+)` —/;

function ledgerRejectionNames(): string[] {
  const text = readFileSync(LEDGER_URL, "utf8");
  const section = text
    .split(/^## /m)
    .find((part) => part.startsWith("3 ·"));
  if (section === undefined) {
    throw new Error("ledger.md §3 (rejection registry) not found");
  }
  const names: string[] = [];
  for (const line of section.split("\n")) {
    const match = REJECTION_LINE.exec(line);
    if (match?.[1] !== undefined) {
      names.push(match[1]);
    }
  }
  return names;
}

describe("the 54-name rejection registry (ledger §3 ↔ code)", () => {
  it("the ledger parse itself yields 54 names (drift guard, plan §1.4)", () => {
    expect(ledgerRejectionNames()).toHaveLength(54);
  });

  it("carries no duplicates in code", () => {
    expect(new Set(REJECTION_NAMES).size).toBe(REJECTION_NAMES.length);
  });

  it("equals the ledger §3 name set exactly — no misses, no extras", () => {
    const ledger = [...ledgerRejectionNames()].sort();
    const inCode = [...REJECTION_NAMES].sort();
    expect(inCode).toEqual(ledger);
  });
});
