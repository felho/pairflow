import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type { KernelStatus, TerminalDisposition } from "../domain/index.js";
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

// ── ch12-p1a D2 (build-close aftermath fold): the superseded row's
// CONTENT. The compile-time `satisfies` on `successors` only proves the
// keys EXIST in the witness table — a wrong-but-existing successor
// (e.g. l0d/WaitReason) compiles; these lanes make it red. ────────────

/** Exact type equality (the invariance trick) — `true` only when A and B
 * are mutually identical, not merely mutually assignable-ish. */
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
  ? true
  : false;

describe("the ch12-p1a superseded row (D2 — l0a/LifecycleStatus)", () => {
  it("is superseded by EXACTLY [l0d/KernelStatus, l0d/TerminalDisposition] — a wrong-but-existing successor is content-red", () => {
    expect(DOMAIN_REGISTRY["l0a/LifecycleStatus"]).toEqual({
      kind: "superseded",
      successors: ["l0d/KernelStatus", "l0d/TerminalDisposition"],
    });
    // The successor rows themselves carry the realized witnesses under
    // the EXACT type names the retirement named (C24).
    expect(DOMAIN_REGISTRY["l0d/KernelStatus"]).toEqual({
      kind: "realized",
      typeName: "KernelStatus",
    });
    expect(DOMAIN_REGISTRY["l0d/TerminalDisposition"]).toEqual({
      kind: "realized",
      typeName: "TerminalDisposition",
    });
  });

  it("the successors' witness types are EXACTLY the axis unions (type-equality witness — a widened, narrowed, or swapped successor type is compile-red)", () => {
    const kernelStatusBound: Equals<
      KernelStatus,
      "CREATED" | "ACTIVE" | "WAITING" | "TERMINAL"
    > = true;
    const dispositionBound: Equals<TerminalDisposition, "done" | "failed" | "cancelled"> = true;
    expect(kernelStatusBound).toBe(true);
    expect(dispositionBound).toBe(true);
  });
});

// ── ch12-p1b D2 (build-close aftermath fold): the FOUR entry-class rows
// flipping `realized` at P1b. The key-set lane above only proves the keys
// EXIST; the compile-time `import type` binding proves the typeName maps
// to a real type — but a wrong-but-existing typeName string (e.g.
// l0d/Template pointing at "EventEnvelope") passes both. These lanes pin
// the packet-owned CONTENT verbatim. ─────────────────────────────────────

describe("the ch12-p1b D2 realized rows (l0d entry classes + Template)", () => {
  it("pins the FOUR rows VERBATIM — a wrong-but-existing typeName is content-red", () => {
    expect(DOMAIN_REGISTRY["l0d/OperatorIntent"]).toEqual({
      kind: "realized",
      typeName: "CreateInput | StartInput | KickoffInput | CancelInput",
    });
    expect(DOMAIN_REGISTRY["l0d/KernelEvent"]).toEqual({
      kind: "realized",
      typeName: 'Kernel["fail"]',
    });
    expect(DOMAIN_REGISTRY["l0d/ActorEnvelope"]).toEqual({
      kind: "realized",
      typeName: "EventEnvelope",
    });
    expect(DOMAIN_REGISTRY["l0d/Template"]).toEqual({
      kind: "realized",
      typeName: "WorkflowTemplate",
    });
  });
});

// ── ch13-p1a (ch13v2-C13's registry-flip clause + plan §13.5's DoD line):
// the TWO l2b rows the definition side realizes. The key-set lane proves
// the keys exist and the `import type` binding proves the typeName maps to
// a real type — a wrong-but-existing typeName passes both, which is
// exactly this packet's exposure, so the packet-owned rows are pinned
// VERBATIM here. ─────────────────────────────────────────────────────────

describe("the ch13-p1a realized rows (the l2b definition-side slice)", () => {
  it("pins BOTH rows VERBATIM — a wrong-but-existing typeName is content-red", () => {
    expect(DOMAIN_REGISTRY["l2b/context_blocks catalog"]).toEqual({
      kind: "realized",
      typeName: "ContextBlockCatalog",
    });
    expect(DOMAIN_REGISTRY["l2b/ContextBlockRef"]).toEqual({
      kind: "realized",
      typeName: "BlockId",
    });
  });

});

// ── ch13-p1b (D12): the render side's ONE row. Same exposure, same
// remedy — the key-set lane and the `import type` binding both pass a
// wrong-but-existing typeName, so the packet-owned row is pinned
// VERBATIM rather than deferred. ─────────────────────────────────────────

describe("the ch13-p1b realized row (the l2b render-side slice)", () => {
  it("pins the row VERBATIM — its witness is the type the packet's blocks carry", () => {
    expect(DOMAIN_REGISTRY["l2b/ContextBlock"]).toEqual({
      kind: "realized",
      typeName: "ContextBlock",
    });
  });
});

// ── ch14-p1 (ch14-C25's registry-flip clause + plan §14.5's DoD line):
// the ONE l3 row the definition side realizes. Its witness is the
// step-class discriminator's own token union at FIELD grain — the shared
// `Step` interface would be satisfied by every agent step and would
// witness nothing, so the row is pinned VERBATIM here rather than left to
// the key-set lane, which a wrong-but-existing typeName passes. ──────────

describe("the ch14-p1 realized row (the l3 definition-side slice)", () => {
  it("pins the row VERBATIM — a wrong-but-existing typeName is content-red", () => {
    expect(DOMAIN_REGISTRY["l3/human_gate"]).toEqual({
      kind: "realized",
      typeName: "StepType",
    });
  });

  it("ch14-p2a flips exactly TWO l3 rows, each pinned to its realized name", () => {
    // Pinned VERBATIM, because the key-set lane cannot see a
    // wrong-but-existing target: a row flipped to the wrong type would
    // stay green everywhere else.
    expect(DOMAIN_REGISTRY["l3/apply_target_entry_effects(...)"]).toEqual({
      kind: "realized",
      typeName: "ArrivalEffect",
    });
    expect(DOMAIN_REGISTRY["l3/HumanDecisionRequest"]).toEqual({
      kind: "realized",
      typeName: "HumanDecisionRequest",
    });
  });

  // ch14-p2b (Q12) flips both: this lane asserted they stay PENDING and
  // is REPLACED by the flip assertion below rather than deleted — the
  // row it guarded still needs a guard, only its expected value moved.
  it("ch14-p2b flips the remaining two l3 rows, each pinned VERBATIM to its realized type name", () => {
    expect(DOMAIN_REGISTRY["l3/wait step + RESUME_WAIT"]).toEqual({
      kind: "realized",
      typeName: "WaitResumedEntry",
    });
    // The PAIR row flips only now, when BOTH members have writers: half
    // of it existed after p2a, and a flip on half a pair is the error
    // the row's own care exists to avoid.
    expect(DOMAIN_REGISTRY["l3/DECISION_REQUEST / DECISION_MADE"]).toEqual({
      kind: "realized",
      typeName: "DecisionMadeEntry",
    });
  });

  it("no l3 row is left pending — the chapter's kernel rows are all realized", () => {
    const pendingL3 = Object.entries(DOMAIN_REGISTRY)
      .filter(([id, entry]) => id.startsWith("l3/") && entry.kind === "pending")
      .map(([id]) => id);
    expect(pendingL3).toEqual([]);
  });
});
