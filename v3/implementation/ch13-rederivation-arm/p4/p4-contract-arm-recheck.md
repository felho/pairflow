# QA review charter — re-check on the folded bytes (the arm's second half)

You are a fresh-context reviewer at the repo root. This is the
RE-CHECK after your predecessor's round: it found three in-scope items
on the ch13 contract-v2 draft; all three were dispositioned at commit
`3cb4498c` (read `git show 3cb4498c` — the delta is small and is your
scope fence). NOT a fresh falsification hunt; outside the fence,
CARRIED-SCOPE in one line.

## 0. Budget

HARD 20-minute wall-clock kill; write findings immediately; stop
investigating at ~12 minutes.

## 1. The review object (verify hashes FIRST)

| File | sha256 (first 16) |
|---|---|
| `v3/implementation/contracts/ch13-context-block-v2-contract.md` | `6c01e478c406776d` |
| `v3/src/definition/schema/templateFormat.ts` | `9368e5253d1163fa` |

HEAD `3cb4498c`.

## 2. The three dispositions under verification

1. **C2 now NAMES the three model-exhibited ids** (`reviewer-severity-
   ontology`, `no-converged-before-round-2`, `docs-only-edit-scope`).
   Verify each exists in `v3/model/` as a block-id exhibit (the third
   inside the mode-tagged map-shaped ref member) and each matches
   `^[a-z][a-z0-9-]*$`. Verify the row's claim now needs no count
   inference.
2. **C16's "first" claim now cites its measurement** (the review
   record §13's sweep note). Re-run the sweep yourself
   (`grep -rn "agentConfig\|defaultAgentConfig" v3/templates/`) and
   verify the citation resolves to §13's note.
3. **The predecessor's finding 2 (attribute glosses vs ADR-019 D4)
   was routed, not folded**: the review record §12/§13 carry the
   prepared D4 amendment as flag R5 riding the human GO, and record
   that under the UNAMENDED D4 the draft does not ratify clean.
   Verify the routing is recorded exactly so (a reader must not be
   able to mistake the tension for unnoticed), and that NO silent ADR
   edit happened (`git log --oneline v3/adr/` — the last ADR commit
   must predate the panel rounds).

## 3. Closing message

Only: HEAD + both hashes as YOU measured; counts IN-SCOPE /
CARRIED-SCOPE / UNRUN; the lint result (`pnpm v3:packet-lint`); and
ONE sentence: do the three dispositions hold? No repo edits; /tmp
only; a guard runs before and after. Routine QA vocabulary.
