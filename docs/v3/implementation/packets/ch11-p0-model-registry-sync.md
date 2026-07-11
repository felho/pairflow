# Task Packet: ch11-p0-model-registry-sync — the ratified model-sync bridge's single instance

Plan step: plan.md §11.4 (the ch11-P0 row; the §5.5 one-off exception)
Autonomy stage: measurement
Classification: projection — 0 new-decision manifest rows; every row
anchors to the RATIFIED referents (the model state `453d3be9`, the delta
evidence `ch11-model-sync-delta.md` @ de33d245, the §5.5 exception); the
mode is nonetheless HUMAN pre-approve — the bridge demands it
(first-of-a-kind: model-sync class).

## Ledger slice (declared — feeds the coverage accounting)

```json
{
  "ledger_slice": {
    "units": [],
    "rejections": [],
    "invariants": [],
    "traces": [],
    "shared_ownership": []
  }
}
```

The EMPTY slice is an assertion, not an omission: this packet changes NO
semantic surface — it re-derives the MECHANICAL MIRRORS of the ratified
ledger (the 54-name union stays drift-test surface, never a per-packet
rejection claim — the ch4 convention).

## Operative material (full text — projection, not invention)

The single source is the ratified delta evidence
`docs/v3/implementation/ch11-model-sync-delta.md` (@ de33d245; pinned
refs base `cd52433b` ↔ model `453d3be9`). The three lanes, verbatim from
it:

| ID | Rule |
|---|---|
| S1 | `v3/src/domain/rejections.ts` re-derived: the rejection union = EXACTLY ledger §3's 54 names at the ratified state — the evidence file's enumerated 31-name removal set leaves; ZERO additions; the derivation command re-run over the pinned refs must reproduce the set before the edit is accepted. |
| S2 | `v3/src/drift/unitMap.json` re-derived: the manifest key set = EXACTLY the units tree at the ratified state — the evidence file's Lane 2 seven-key delta (−`l2-pseudocode/GateEvaluator`, +`l2-pseudocode/GateRegistration`, −`l2a-pseudocode/GateEvaluator`, +`l2a-pseudocode/GateRegistration`, +`l2-pseudocode/admit_definition`, +`emit-contract-pseudocode/admit_definition`, −`emit-contract-pseudocode/validate_gate_config`); renamed/new keys carry the UNREALIZED disposition of their predecessors (no code exists for them yet — ch11-P2+ realizes). |
| S3 | `v3/src/drift/domainRegistry.ts` re-derived: the manifest = EXACTLY ledger §4 at the ratified state — the evidence file's Lane 3 delta (the `l2` block relabel to "Evaluation & admission — one registration contract, two value types"; `GateEvaluator` → `GateRegistration`; + `AdmittedDefinition (value)`; the `l4-child` entity rename `Rejected(child_5-tuple)` → `Definition issues (child_5-tuple)`). |
| S4 | `v3/src/drift/rejectionNames.test.ts` count re-pin: the THREE hardcoded 85-count sites (the header comment, the describe title, the `toHaveLength` expect) re-pin to 54 — the evidence file's boundary clause names this file as the ONLY lock-test boundary member (unitMap/domainRegistry tests carry no pinned counts — measured exclusion). |
| S5 | TWO-WAY exact-set sensitivity proofs EXECUTED per lock at build close: for each of the three locks, a probe mutation in EACH direction (one extra member added; one member removed) goes RED — six probe runs, receipts in the Build record; a lock that cannot fail in either direction is NOT re-derived, it is broken. |
| S6 | The mutation boundary is the evidence file's CLOSED list (with the Lane-4 extension) — the three mirrors + the count-pinning lock test + the coverage script's count re-pin (`tools/v3-plan/check_coverage.py`) + this packet file, NOTHING else; NO runtime/compiler behavior rides the bridge. |
| S7 | The approve-time bridge condition (the ratified §5.5 exception): at THIS packet's approve the three named drift lanes are red, each lane's observed divergence EXACTLY the evidence file's enumerated delta (verified by diff enumeration at approve — receipts in the pre-approval summary); every other approve-time tier-0 gate green — with the Lane-4 addendum's coverage-gate divergences (9 items, enumerated) equally authorized once the addendum is ratified. Any deviation beyond the enumerated deltas BLOCKS the approve. |
| S9 | `tools/v3-plan/check_coverage.py` count re-pin (the Lane-4 addendum): the expected dict's units 158 → 159 and rejections 85 → 54 (+ its docstring count mentions); the `--fold-time` gate's 9 approve-time divergences are EXACTLY the addendum's enumeration — 7 == Lane 2's key delta through a second checker, 2 == the script's own count mirror. |
| S8 | Build-close: all three drift lanes GREEN + the `check_coverage.py --fold-time` gate GREEN; `tools/v3-model/check.sh` green; FULL `pnpm ci:local` green; the post-build audit green. A bridge that does not close its named drift lanes is a STOP, never a partial success. The exception EXPIRES at this build-close (or at P0 abandonment). |

## In-context notes (the scarce budget)

- The unitMap.json edit is a KEY-SPACE sync: inspect the manifest's value
  convention at build time (realized entries map to code sites; the
  renamed/new keys are unrealized) — the disposition of values follows
  the file's own existing convention, never invented.
- The rejections.ts edit removes EXACTLY the 31 names; the type's
  ordering/grouping convention in the file is preserved as-is.

## Embedding gates

- Target files: the mutation boundary below, nothing else.
- Entrypoints: none (no runtime surface).
- Mutation boundary: the evidence file's closed list.

```json
{
  "mutation_boundary": {
    "files": [
      "v3/src/domain/rejections.ts",
      "v3/src/drift/unitMap.json",
      "v3/src/drift/domainRegistry.ts",
      "v3/src/drift/rejectionNames.test.ts",
      "tools/v3-plan/check_coverage.py",
      "docs/v3/implementation/packets/ch11-p0-model-registry-sync.md"
    ]
  }
}
```

## Row manifest

```json
{
  "packet_rows": {
    "rows": [
      { "id": "S1", "class": "anchored", "refs": ["prose:ch11-model-sync-delta.md Lane 1 (@ de33d245)"] },
      { "id": "S2", "class": "anchored", "refs": ["prose:ch11-model-sync-delta.md Lane 2 (@ de33d245)"] },
      { "id": "S3", "class": "anchored", "refs": ["prose:ch11-model-sync-delta.md Lane 3 (@ de33d245)"] },
      { "id": "S4", "class": "anchored", "refs": ["prose:ch11-model-sync-delta.md — the exception's closed boundary clause"] },
      { "id": "S5", "class": "anchored", "refs": ["prose:ch11-model-sync-delta.md — the two-way exact-set clause"] },
      { "id": "S6", "class": "anchored", "refs": ["prose:ch11-model-sync-delta.md — the mutation-boundary clause", "prose:README §5.5 one-off exception"] },
      { "id": "S7", "class": "anchored", "refs": ["prose:README §5.5 one-off exception (user-ratified 2026-07-11)"] },
      { "id": "S8", "class": "anchored", "refs": ["prose:ch11-model-sync-delta.md — the build-close clause", "prose:plan §11.4 ch11-P0 row"] },
      { "id": "S9", "class": "anchored", "refs": ["prose:ch11-model-sync-delta.md Lane 4 addendum — ratified 2026-07-12 by the dual act naming 30fe3479"] }
    ]
  }
}
```

## Sizing/risk

N/A — no authority, runtime, read-surface, or shared-contract work is in
scope (evidence: the mutation boundary is five mechanical mirror/infra
files + this packet; zero production behavior — S6). Site × shape × phase grid:
N/A — no failure lanes over a phased seam (the packet's only "lanes" are
the three drift locks themselves).

## Pre-approval flags

- **Flag 1 — approve under FOUR red approve-time surfaces (the ratified
  bridge + the Lane-4 addendum).** At approve, `rejectionNames.test.ts`
  (2 tests), `unitMap.test.ts` (1), `domainRegistry.test.ts` (1) are red
  BY DESIGN — authorized by the user-ratified §5.5 one-off exception
  (@ de33d245) — AND `check_coverage.py --fold-time` is red by EXACTLY
  the Lane-4 addendum's 9 enumerated items — authorized by the addendum
  (ratified 2026-07-12, the dual act naming `30fe3479`); the delta-equality
  receipts ride the pre-approval summary. Route: approve-ratified — the
  approve act consumes the ratified authorizations; revisit: none.

## Acceptance

- Contract tests: none new — the three EXISTING drift locks turn green
  (S8), with the six sensitivity probes executed (S5).
- Checks: `tools/v3-model/check.sh`; FULL `pnpm ci:local` (build-close).
- Drift tests green at build close (standing, unconditional — PI-3; red
  at approve ONLY per the ratified exception, S7).
- Standing review rules in force: REV-* registry n/a (no canonical
  contract matrices beyond the S-rows; R-LANE-SENSITIVITY realized as S5).

## Build record

Built 2026-07-12 in ONE commit (code + packet; the record + metrics ride
it). The four mirrors re-derived from the ratified ledger (453d3be9):
`rejections.ts` 85 → 54 names (the enumerated 31 removed, alphabetical
order preserved); `unitMap.json` 158 → 159 keys (the Lane-2 seven-key
delta; new keys `{"status": "pending"}` — the predecessors' unrealized
disposition); `domainRegistry.ts` — `l2/GateRegistration` rename,
`l2/AdmittedDefinition` added (l2 comment 9 → 10), the l4-child compound
entity re-keyed to the parser-normal form `l4-child/Definition issues`
(the space-paren qualifier rule strips the tuple; the five names lost
their `RejectionName` binding with the channel move — `kind: "pending"`,
the realized block retired); `rejectionNames.test.ts` three count sites
85 → 54; `check_coverage.py` expected dict 158/85 → 159/54 (+ the
docstring's 158/158 line). SENSITIVITY PROOF (S5) EXECUTED: 6/6 probe
mutations red (±1 member per lock, both directions, receipts in the
session transcript). One in-build surprise: the l4-child manifest key's
parser-normal form (the qualifier-stripping rule) — caught by the lock
itself on first run, zero behavioral impact. One tooling stumble: the
unitMap probe's git-restore reverted the UNCOMMITTED build edit
(re-applied; lesson — probe-restore must be content-based on
uncommitted trees). Full green at close: 560/560 tests, coverage
fold-time OK, typecheck, lint, check.sh.

```json
{
  "packet_metrics": {
    "class": "model-registry-sync (bridge)",
    "prediction": { "predicted": "projection", "reasoning": "every row anchors to the ratified evidence file / ledger state; the bridge itself was ratified before authoring", "discovered": "projection" },
    "provenance": { "anchored": 9, "derived": 0, "new_decision": 0 },
    "rounds": { "review": 1, "doc_refinement": 2, "implementation": 1 },
    "stops": [],
    "detector_misses": [],
    "learned": "run the approve-time gates AT authoring — one execution beat five review rounds (Lane 4); probe-restores must be content-based on uncommitted trees"
  }
}
```
