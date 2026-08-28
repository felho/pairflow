import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * The PI-3 unit→code mapping drift test (packet ch5-P1). The manifest is
 * `drift/unitMap.json` — ONE machine face, dual-read by this test and by
 * `tools/v3-plan/check_coverage.py` (the three-way ledger ↔ manifest ↔
 * packet lock's code end). This test owns: key set == the
 * `v3/model/units/` tree at test time, schema validity, and codeRef
 * resolution (file exists, symbol present on a word boundary — a
 * presence check; the owning packet's tests carry the deeper guarantee).
 */
const UNITS_DIR = fileURLToPath(
  new URL("../../../v3/model/units/", import.meta.url),
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

describe("the unit→code manifest (v3/model/units ↔ drift/unitMap.json)", () => {
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

  it("pins the ch12-p1a packet-owned mappings VERBATIM (D1 — build-close aftermath fold)", () => {
    // Content, not just resolution: the generic codeRef-resolution lane
    // below stays green on a WRONG-but-existing target (e.g. COMPLETE
    // pointed at createKernel) — the packet-owned rows are therefore
    // pinned as exact strings here.
    expect(unitMap["l0d-pseudocode/admit_loaded"]).toEqual({
      codeRef: "v3/src/kernel/admission.ts#admitLoaded",
      disposition: "implement",
      status: "realized",
    });
    // RE-POINTED at the ch14-p2a aftermath fold, and loudly: p2a's
    // ratified arrival took over the terminal branch, which left
    // `kernel.ts#complete` a dead parallel path — the exact shape the
    // registry's own doc forbids. The unit did not change; its ADDRESS
    // did, to the function that now carries the branch. Same
    // containing-symbol form as `l0d/HANDLE → #createKernel`.
    expect(unitMap["l0d-pseudocode/COMPLETE"]).toEqual({
      codeRef: "v3/src/kernel/arrival.ts#applyTargetEntryEffects",
      disposition: "implement",
      status: "realized",
    });
    expect(unitMap["l0d-pseudocode/HANDLE"]).toEqual({
      codeRef: "v3/src/kernel/kernel.ts#createKernel",
      disposition: "implement",
      status: "realized",
    });
  });

  it("pins the ch12-p1b D1 packet-owned mappings VERBATIM (build-close aftermath fold)", () => {
    // The SEVEN D1 rows flip implement/realized at P1b. The generic
    // resolution lane below stays green on a wrong-but-existing symbol
    // (e.g. START pointed at #createInstance), so the packet-owned rows
    // are pinned as exact strings here.
    expect(unitMap["l0d-pseudocode/RECEIVE"]).toEqual({
      codeRef: "v3/src/kernel/kernel.ts#createKernel",
      disposition: "implement",
      status: "realized",
    });
    expect(unitMap["l0d-pseudocode/CREATE_INSTANCE"]).toEqual({
      codeRef: "v3/src/kernel/lifecycle.ts#createInstance",
      disposition: "implement",
      status: "realized",
    });
    expect(unitMap["l0d-pseudocode/START"]).toEqual({
      codeRef: "v3/src/kernel/lifecycle.ts#start",
      disposition: "implement",
      status: "realized",
    });
    expect(unitMap["l0d-pseudocode/KICKOFF"]).toEqual({
      codeRef: "v3/src/kernel/lifecycle.ts#kickoff",
      disposition: "implement",
      status: "realized",
    });
    expect(unitMap["l0d-pseudocode/CANCEL"]).toEqual({
      codeRef: "v3/src/kernel/lifecycle.ts#cancel",
      disposition: "implement",
      status: "realized",
    });
    expect(unitMap["l0d-pseudocode/FAIL"]).toEqual({
      codeRef: "v3/src/kernel/lifecycle.ts#fail",
      disposition: "implement",
      status: "realized",
    });
    expect(unitMap["l0d-pseudocode/activate"]).toEqual({
      codeRef: "v3/src/kernel/lifecycle.ts#activate",
      disposition: "implement",
      status: "realized",
    });
  });

  it("pins the ch12-p1b D4 one-shot re-points VERBATIM (the retirement fold)", () => {
    // ALL FOUR rows whose codeRef was the deleted start.ts#startInstance
    // re-point into the lifecycle successor's home. The l0b one-shot keeps
    // `implement`; the three l2/l2a rows keep `alias/inherited`. None goes
    // pending, none keeps the deleted start.ts ref.
    expect(unitMap["l0b-pseudocode/START_INSTANCE"]).toEqual({
      codeRef: "v3/src/kernel/lifecycle.ts#createInstance",
      disposition: "implement",
      status: "realized",
    });
    expect(unitMap["l2-pseudocode/CREATE_INSTANCE"]).toEqual({
      codeRef: "v3/src/kernel/lifecycle.ts#createInstance",
      disposition: "alias/inherited",
      status: "realized",
    });
    expect(unitMap["l2a-pseudocode/CREATE_INSTANCE"]).toEqual({
      codeRef: "v3/src/kernel/lifecycle.ts#createInstance",
      disposition: "alias/inherited",
      status: "realized",
    });
    expect(unitMap["l2-pseudocode/activate"]).toEqual({
      codeRef: "v3/src/kernel/lifecycle.ts#activate",
      disposition: "alias/inherited",
      status: "realized",
    });
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

describe("the ch13-p1a unit-map flips (packet row D10)", () => {
  const unitMap = loadUnitMap();

  it("pins the TWO packet-owned mappings VERBATIM (the generic resolution lane stays green on a wrong-but-existing target)", () => {
    // `validate_context_refs` is generated/mapped because its rule is no
    // longer code: the resolution lane is DECLARED at `[vc-blockidlist]`
    // and executed by the one engine on both channels, so the declaration
    // module's own exported surface is what realizes it.
    expect(unitMap["l2b-pseudocode/validate_context_refs"]).toEqual({
      codeRef: "v3/src/definition/schema/templateFormat.ts#templateFormat",
      disposition: "generated/mapped",
      status: "realized",
    });
    // `CREATE_INSTANCE` is review-only at this level — its whole l2b
    // delta is the comment line placing definition-static validation at
    // ADMISSION — and its codeRef follows the live `l2-`/`l2a-` reprint
    // precedent, which points at the kernel's create function.
    expect(unitMap["l2b-pseudocode/CREATE_INSTANCE"]).toEqual({
      codeRef: "v3/src/kernel/lifecycle.ts#createInstance",
      disposition: "review-only",
      status: "realized",
    });
  });
});

describe("the ch13-p1b unit-map flips (packet row D12)", () => {
  const unitMap = loadUnitMap();

  it("pins the TWO packet-owned mappings VERBATIM (the generic lane stays green on a wrong-but-existing target)", () => {
    // The render is the one l2b unit this packet IMPLEMENTS, and it lives
    // in its own module beside the run-profile resolver.
    expect(unitMap["l2b-pseudocode/assemble_context_blocks"]).toEqual({
      codeRef: "v3/src/kernel/contextBlocks.ts#assembleContextBlocks",
      disposition: "implement",
      status: "realized",
    });
    // The l2b `dispatch_intent` is a REPRINT whose realization already
    // exists: it rides the live `alias/inherited` precedent and targets
    // the same dispatch function the sibling l0d/l0e rows do. Its delta —
    // the packet field — lands in that same function.
    expect(unitMap["l2b-pseudocode/dispatch_intent"]).toEqual({
      codeRef: "v3/src/kernel/dispatchIntent.ts#deriveDispatchIntent",
      disposition: "alias/inherited",
      status: "realized",
    });
  });
});


describe("the ch14-p1 unit-map flip (packet row D12)", () => {
  const unitMap = loadUnitMap();

  it("pins the packet-owned mapping VERBATIM, FULLY QUALIFIED (a second row of the same bare name exists)", () => {
    // `implement` rather than `generated/mapped`: the unit's load-bearing
    // half — the per-type class rules — is NOT expressible in the
    // declaration vocabulary, so it realizes as named hand lanes in the
    // audited residual's module, with the ordinary field grammars riding
    // the schema beside them.
    expect(unitMap["l3-pseudocode/validate_decision_gates"]).toEqual({
      codeRef: "v3/src/definition/schema/templateSurface.ts#stepClassFindings",
      disposition: "implement",
      status: "realized",
    });
    // The fully-qualified address matters: a bare-name edit would flip
    // the wrong row.
    expect(unitMap["auto-action-pseudocode/validate_decision_gates"]).toEqual({ status: "pending" });
  });
});

describe("the ch14-p2a unit-map flips (packet row K13 — the aftermath fold)", () => {
  const unitMap = loadUnitMap();

  it("pins the ELEVEN packet-owned mappings VERBATIM, FULLY QUALIFIED", () => {
    // The generic resolution lane below stays green on a
    // wrong-but-existing symbol, so every packet-owned row is an exact
    // string here — and every address is FULLY QUALIFIED, because four
    // of these bare names (HANDLE, CREATE_INSTANCE, RECEIVE, directive)
    // also exist in other sections.
    //
    // The four inline rows address the function that CONTAINS them
    // (`applyTargetEntryEffects`): the arrival's fan-out realizes the
    // two parks, the recommendation read and the decision-key read as
    // branches rather than as separate exports — the same
    // containing-symbol form `l0d/HANDLE → #createKernel` already uses.
    expect(unitMap["l3-pseudocode/apply_target_entry_effects"]).toEqual({
      codeRef: "v3/src/kernel/arrival.ts#applyTargetEntryEffects",
      disposition: "implement",
      status: "realized",
    });
    for (const inline of [
      "l3-pseudocode/park_for_human_decision",
      "l3-pseudocode/park_for_wait",
      "l3-pseudocode/incoming_recommendation",
      "l3-pseudocode/decision_keys",
    ]) {
      expect(unitMap[inline], inline).toEqual({
        codeRef: "v3/src/kernel/arrival.ts#applyTargetEntryEffects",
        disposition: "implement",
        status: "realized",
      });
    }
    expect(unitMap["l3-pseudocode/post_commit_output"]).toEqual({
      codeRef: "v3/src/kernel/postCommitOutput.ts#postCommitOutput",
      disposition: "implement",
      status: "realized",
    });
    expect(unitMap["l3-pseudocode/human_decision_request"]).toEqual({
      codeRef: "v3/src/domain/humanDecisionRequest.ts#humanDecisionRequest",
      disposition: "implement",
      status: "realized",
    });
    // Its own export, because the Ask and p2b's submit guard read ONE
    // function — the reason it was minted at p2a at all.
    expect(unitMap["l3-pseudocode/required_fields"]).toEqual({
      codeRef: "v3/src/domain/humanDecisionRequest.ts#requiredFields",
      disposition: "implement",
      status: "realized",
    });
    // REVIEW-ONLY: a family block, not a routine. Its witness is the
    // family's second member — the one this chapter added.
    expect(unitMap["l3-pseudocode/directive"]).toEqual({
      codeRef: "v3/src/domain/dispatch.ts#HumanDecisionRequest",
      disposition: "review-only",
      status: "realized",
    });
    // The two REPRINTS, each carrying one delta: HANDLE's arrival line
    // and CREATE_INSTANCE's role-less binding skip.
    expect(unitMap["l3-pseudocode/HANDLE"]).toEqual({
      codeRef: "v3/src/kernel/kernel.ts#createKernel",
      disposition: "implement",
      status: "realized",
    });
    expect(unitMap["l3-pseudocode/CREATE_INSTANCE"]).toEqual({
      codeRef: "v3/src/kernel/lifecycle.ts#createInstance",
      disposition: "implement",
      status: "realized",
    });
  });

  // ch14-p2b flips all six. The lane asserted they stay PENDING and is
  // REPLACED rather than deleted — each row still needs a guard, and
  // each is addressed FULLY QUALIFIED, because the bare names
  // `COMPLETE` and `RECEIVE` exist in several other sections and a
  // bare-name edit would flip the wrong row.
  it("ch14-p2b flips its six l3 rows, each to the code that carries the unit", () => {
    expect(unitMap["l3-pseudocode/admit_input"]).toEqual({
      codeRef: "v3/src/kernel/operatorIntents.ts#admitInput",
      disposition: "implement",
      status: "realized",
    });
    expect(unitMap["l3-pseudocode/SUBMIT_DECISION"]).toEqual({
      codeRef: "v3/src/kernel/operatorIntents.ts#submitDecision",
      disposition: "implement",
      status: "realized",
    });
    expect(unitMap["l3-pseudocode/RESUME_WAIT"]).toEqual({
      codeRef: "v3/src/kernel/operatorIntents.ts#resumeWait",
      disposition: "implement",
      status: "realized",
    });
    // COMPLETE's widened precondition lives in the ARRIVAL's terminal
    // branch: the unit did not change, its ADDRESS moved with the code
    // that carries it (the ch14-p2a fold's own precedent).
    expect(unitMap["l3-pseudocode/COMPLETE"]).toEqual({
      codeRef: "v3/src/kernel/arrival.ts#applyTargetEntryEffects",
      disposition: "implement",
      status: "realized",
    });
    // RECEIVE IS the kernel entry object's source routing.
    expect(unitMap["l3-pseudocode/RECEIVE"]).toEqual({
      codeRef: "v3/src/kernel/kernel.ts#createKernel",
      disposition: "implement",
      status: "realized",
    });
    // The review-only unit keeps its declared disposition through the
    // flip — a flip is not a promotion.
    expect(unitMap["l3-pseudocode/choice_point"]).toEqual({
      codeRef: "v3/src/kernel/operatorIntents.ts#submitDecision",
      disposition: "review-only",
      status: "realized",
    });
  });
});
