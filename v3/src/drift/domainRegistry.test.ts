import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { DOMAIN_REGISTRY } from "./domainRegistry.js";

/**
 * The PI-3 domain-registry drift test (packet ch5-P1): ledger §4 parsed
 * at test time vs the hand-authored manifest. The manifest's realized
 * rows are type-bound (import type / RejectionName literals) — their
 * EXISTENCE proof is `v3:typecheck`, not this test. This test owns the
 * KEY SET, plus the parser's self-trust (dimension 6): per-section
 * entity counts must equal the ledger's own header counts, so a wrong
 * normalization rule fails here, not downstream.
 */
const LEDGER_URL = new URL(
  "../../../v3/model/ledger.md",
  import.meta.url,
);

const SECTION_HEADING = /^### `([^`]+)` \((\d+) blocks? · (\d+) entit(?:y|ies)\)$/;
const BLOCK_LINE = /^- \*\*(.+)\*\* — (.*)$/;
// A trailing SPACE-SEPARATED annotation — `[root]`, `(value)`, `(name
// only)`, … — is stripped; attached parens (`Rejected(not_active)`,
// `apply_target_entry_effects(...)`) are part of the token.
const TRAILING_ANNOTATION = /\s+[([][^()[\]]*[)\]]$/;

function normalizeToken(raw: string): string {
  let token = raw.trim();
  for (;;) {
    const stripped = token.replace(TRAILING_ANNOTATION, "");
    if (stripped === token) {
      return token;
    }
    token = stripped;
  }
}

interface ParsedSection {
  readonly section: string;
  readonly declaredBlocks: number;
  readonly declaredEntities: number;
  readonly entityKeys: string[];
  readonly parsedBlocks: number;
}

function parseLedgerRegistry(): ParsedSection[] {
  const text = readFileSync(LEDGER_URL, "utf8");
  const registry = text.split(/^## /m).find((part) => part.startsWith("4 ·"));
  if (registry === undefined) {
    throw new Error("ledger.md §4 (domain registry) not found");
  }
  const sections: ParsedSection[] = [];
  let current: {
    section: string;
    declaredBlocks: number;
    declaredEntities: number;
    entityKeys: string[];
    parsedBlocks: number;
  } | null = null;
  for (const line of registry.split("\n")) {
    const heading = SECTION_HEADING.exec(line);
    if (heading !== null) {
      if (current !== null) {
        sections.push(current);
      }
      current = {
        section: heading[1] ?? "",
        declaredBlocks: Number(heading[2]),
        declaredEntities: Number(heading[3]),
        entityKeys: [],
        parsedBlocks: 0,
      };
      continue;
    }
    if (current === null) {
      continue;
    }
    if (line.startsWith("- *relations:*")) {
      continue;
    }
    const block = BLOCK_LINE.exec(line);
    if (block === null) {
      continue;
    }
    current.parsedBlocks += 1;
    const entityPart = (block[2] ?? "").trim();
    if (entityPart === "(no entities)") {
      continue;
    }
    for (const rawToken of entityPart.split("·")) {
      current.entityKeys.push(normalizeToken(rawToken));
    }
  }
  if (current !== null) {
    sections.push(current);
  }
  return sections;
}

describe("the domain-registry manifest (ledger §4 ↔ drift/domainRegistry.ts)", () => {
  const sections = parseLedgerRegistry();

  it("parser self-trust: per-section block and entity counts equal the ledger's own headers", () => {
    for (const section of sections) {
      expect(section.parsedBlocks, `${section.section}: block count`).toBe(
        section.declaredBlocks,
      );
      expect(
        section.entityKeys.length,
        `${section.section}: entity count (normalization rule arbiter)`,
      ).toBe(section.declaredEntities);
    }
  });

  it("no section produces duplicate entity keys (the key space is per-section)", () => {
    for (const section of sections) {
      const keys = section.entityKeys;
      expect(new Set(keys).size, `${section.section}: ${keys.join(", ")}`).toBe(keys.length);
    }
  });

  it("equals the manifest key set exactly — no misses, no extras", () => {
    const ledgerKeys = sections
      .flatMap((section) => section.entityKeys.map((key) => `${section.section}/${key}`))
      .sort();
    const manifestKeys = Object.keys(DOMAIN_REGISTRY).sort();
    expect(manifestKeys).toEqual(ledgerKeys);
  });
});
