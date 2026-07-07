import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * The PI-3 unit→code mapping drift test (packet ch5-P1). The manifest is
 * `drift/unitMap.json` — ONE machine face, dual-read by this test and by
 * `tools/v3-plan/check_coverage.py` (the three-way ledger ↔ manifest ↔
 * packet lock's code end). This test owns: key set == the
 * `model-src/units/` tree at test time, schema validity, and codeRef
 * resolution (file exists, symbol present on a word boundary — a
 * presence check; the owning packet's tests carry the deeper guarantee).
 */
const UNITS_DIR = fileURLToPath(
  new URL("../../../docs/v3/convergence/model-src/units/", import.meta.url),
);
const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const UNIT_MAP_URL = new URL("./unitMap.json", import.meta.url);

const UNIT_DISPOSITIONS = new Set([
  "implement",
  "type/schema",
  "test-only",
  "generated/mapped",
  "alias/inherited",
  "review-only",
]);

type UnitMapEntry =
  | { status: "pending" }
  | { status: "realized"; disposition: string; codeRef: string };

function loadUnitMap(): Record<string, UnitMapEntry> {
  return JSON.parse(readFileSync(UNIT_MAP_URL, "utf8")) as Record<string, UnitMapEntry>;
}

function unitsTreeIds(): string[] {
  const ids: string[] = [];
  for (const section of readdirSync(UNITS_DIR, { withFileTypes: true })) {
    if (!section.isDirectory()) {
      continue;
    }
    for (const file of readdirSync(`${UNITS_DIR}${section.name}`)) {
      if (file.endsWith(".txt")) {
        ids.push(`${section.name}/${file.slice(0, -".txt".length)}`);
      }
    }
  }
  return ids;
}

describe("the unit→code manifest (model-src/units ↔ drift/unitMap.json)", () => {
  const unitMap = loadUnitMap();

  it("equals the units tree key set exactly — no misses, no extras", () => {
    expect(Object.keys(unitMap).sort()).toEqual(unitsTreeIds().sort());
  });

  it("every entry is schema-valid: pending, or realized with an exact disposition token", () => {
    for (const [id, entry] of Object.entries(unitMap)) {
      if (entry.status === "pending") {
        expect(Object.keys(entry), id).toEqual(["status"]);
        continue;
      }
      expect(entry.status, id).toBe("realized");
      expect(Object.keys(entry).sort(), id).toEqual(["codeRef", "disposition", "status"]);
      expect(UNIT_DISPOSITIONS.has(entry.disposition), `${id}: '${entry.disposition}'`).toBe(
        true,
      );
    }
  });

  it("every realized codeRef resolves: the file exists and carries the symbol", () => {
    const realized = Object.entries(unitMap).filter(
      (pair): pair is [string, Extract<UnitMapEntry, { status: "realized" }>] =>
        pair[1].status === "realized",
    );
    expect(realized.length).toBeGreaterThan(0);
    for (const [id, entry] of realized) {
      const [path, symbol] = entry.codeRef.split("#");
      expect(path, `${id}: codeRef '${entry.codeRef}' must be '<path>#<symbol>'`).toBeTruthy();
      expect(symbol, `${id}: codeRef '${entry.codeRef}' must be '<path>#<symbol>'`).toBeTruthy();
      const absolute = `${REPO_ROOT}${path ?? ""}`;
      expect(existsSync(absolute), `${id}: missing file ${path ?? ""}`).toBe(true);
      const source = readFileSync(absolute, "utf8");
      const escaped = (symbol ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      expect(
        new RegExp(`\\b${escaped}\\b`).test(source),
        `${id}: symbol '${symbol ?? ""}' not found in ${path ?? ""}`,
      ).toBe(true);
    }
  });
});
