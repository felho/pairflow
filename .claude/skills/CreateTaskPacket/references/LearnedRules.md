# Learned Rules — the failure-class registry

Distilled from `docs/v3/implementation/process-log.md` (the source of
record; every rule cites its provenance line). Maintenance: updated at
**chapter boundaries only** (README §7 — capture, don't fix), from the
boundary review's verdicts. A rule enters here when the log marks it
adopted or standing; WATCH items enter marked as such.

| Id | Rule | Provenance |
|---|---|---|
| R-CLAIM-NEGATIVES | A gate's or contract's negative tests derive from its DECLARED claim, never from the implemented rule list — a blocklist passing an unlisted violation is the recurring failure class. | README §4 step 2; log 2026-07-07 ch3 aftermath (2nd occurrence) |
| R-MATRIX-LANES | A canonical contract matrix (exit codes, parse rules, config resolution, error-doc schemas) IS a declared claim: every lane it declares is DRIVEN by a test, never merely documented. | README §4 step 2; log 2026-07-08 ch6 boundary (P4a aftermath precedent) |
| R-DIMENSIONS | Enumerate a claim's DIMENSIONS before deriving tests; a fix scoped to the dimension just caught repeats the loop. Known ladder: value shapes → descriptors → prototypes → numeric identity. | log 2026-07-07 ch4 aftermath 3–4; ch5 chapter rule |
| R-NUMERIC-LADDER | The dimension ladder applies to EVERY new validator over a numeric domain, not just the gate that learned it. `-0` requires `Object.is` (`Number.isSafeInteger(-0)` is true, `-0 < 0` is false). | log 2026-07-08 ch6 aftermath 2 |
| R-FIELD-LISTS | Contract/type rows pull the registry FIELD LISTS from the model source; ledger §4 entity names alone under-specify a shape (`round` dropped from `WorkflowInstance`). | template §2 step 2; log 2026-07-07 ch4 boundary |
| R-EXECUTION | A logged instruction is not execution — a sweep or test obligation counts only when it RAN. Packets phrase obligations as execution ("driven by test X"), never intention. | log 2026-07-07 ch4 aftermath 4; ch5 chapter rule |
| R-RAW-FIXTURES | A negative test's fixture path can silently erase the dimension under test (`JSON.stringify` flattens `-0` to `0`). Stage hostile values through channels that provably preserve them — raw text files. **WATCH status**: applied as a watchpoint (flag in the report, never a blocker) until a second occurrence promotes it at a chapter boundary. | log 2026-07-08 ch6 P4b build |
| R-ALIGNED-UP | A packet decision contradicting ratified plan text flows UP into the plan IN THE SAME COMMIT, marked "aligned at <packet-id> pre-approval". Never silent, never deferred. | log 2026-07-07 ch5 boundary (standing convention) |
| R-EMPTY-SLICE | Operability packets (CLI/floor/tooling — zero kernel semantics) declare an EMPTY ledger slice explicitly; "coverage axes unchanged" is an assertion the close verifies, not an omission. | ch6 practice (all five packets); plan §6 |
| R-FIRST-STOP | The first packet of a new task class is pre-approve regardless of the chapter's ramp stage (first-of-a-kind stop). Flow mode is for classes with precedent. | ch5 ratification (flow-mode rule); log 2026-07-07 ch5 boundary |
| R-WIDE-CLAIM | State claims WIDE — "no diagnostic or non-committed data can EVER enter this surface", not "trivially true because the store holds nothing else". The negatives derive from the wide statement. | plan §6.2 (ch6-P1); log 2026-07-07 ch4 aftermath |
| R-STRUCTURE-SEMANTICS | When a surface splits malformed input from semantic failure (usage/2 vs mismatch/1), the structure-vs-semantics line is drawn in ONE place, and the boundary validator's depth matches the declared matrix row. | log 2026-07-08 ch6 aftermath 2 |

## How a rule gets here

1. Friction happens → one line in `process-log.md` the moment it happens.
2. Chapter boundary review issues the verdict (gate / rule / README edit /
   non-issue / WATCH).
3. Verdicts that shape packet AUTHORING land here with their provenance;
   verdicts that shape the build loop land in README §4. This file never
   invents a rule the log does not carry.
