# P4 review record — ch13 contract v2 (context-block-v2)

The committed evidence home for the P4 phase (ch13-rederivation-plan
§3/P4 and the 2026-08-08 inheritance amendment: the old→new mapping and
the phase's verdicts live HERE, beside the panel/arm outputs — the
contract stays clean). Everything below is derived from repo surfaces
at write time; nothing is recalled from conversation.

## 1. STOP 1 rulings (user-ratified 2026-08-08, relayed by the general)

- (a) NAME: `context-block-v2` (option 1 of three presented).
- (b) HOME: extend `v3/src/definition/schema/templateFormat.ts`; no new
  file — the ch13 keys are D7 additive NODE growth of the one template
  surface.
- (c) BYTE-LOCK: the ratification block gains an OPTIONAL `schema` key
  `{path, sha256}`, checked by the draft lint on the LATEST block only;
  two-commit choreography unchanged. **Coordination note, recorded on
  the ruling's instruction:** multiple contracts locking ONE schema
  file will each go red on any edit of it — DESIGNED behaviour (a
  schema edit is an act), and a boundary topic when a second locking
  contract becomes real.
- (d) WORK PLAN + BETS: approved as presented; Flag-candidate #1
  carved out with its executed probe.

## 2. FLAG #1 ruling (user-ratified 2026-08-08)

Option A: the `fields` attribute widens to `map.plain` (ADR-019 D11,
commit `08f99ab9`); build `65b1a9e2`; round-1 fold `14f3ab12`. The P4
declaration adopts the construct only after the arm frame is green.

## 3. The four LOUD-open items (named by the user's STOP-1 ruling)

Awareness only — each fails LOUD at declaration load, so no build is
owed; the P4 authoring is expected to meet them, not to fix them:

1. `^` inside a value-class definition;
2. a delegate reused at a value-class root;
3. duplicate hook tags reporting one path twice;
4. a selector naming a literal key at an open map — refused at load.

(The P4 session could not resolve this list from repo surfaces alone —
it lived only in relay text; recorded here on the ruling's instruction
so it has a repo home.)

## 4. Probe log (executed 2026-08-08; scripts + outputs beside this file)

| Probe | Script | What it measured |
|---|---|---|
| PROBE-P4-1 | `p4-flag1-probe.ts.txt` (P1_*) | the D10 belt at a fixed position: resolving ref clean; `{}` entry → entry finding + coded per-site finding; wrong-kind catalog → container finding AND per-site findings (no suppression); absent catalog → per-site; duplicates per occurrence at index; channels byte-identical |
| PROBE-P4-2 | `p4-flag1-probe.ts.txt` (P2, P3) | pre-D11: a ref list inside `map.plain` unreachable (ghost/numeric/grammar-violating members, zero findings); a runtime `fields` attr on map.plain loaded silently inert |
| PROBE-P4-3 | `p4-dup-resolution-probe.ts.txt` | DUP_GHOST: membership fires per shape-passing occurrence (both indices) beside the dup finding; DUP_BAD_SHAPE: a shape-failing member is invisible to every list-level lane; NONSTRING_KEY_FILE: boolean-keyed entry unaddressable by the string ref of the same spelling (two true findings); BAD_KEY_SIBLING: grammar-failing key draws the key lane, valid sibling ref resolves |
| PROBE-P4-4 | `p4-live-declaration-probes.ts.txt` | the LIVE declaration at the ratifying basis, both channels: the fail-closed class at width (incl. present-null and the boolean members), refs beside refused/absent catalogs, the empty catalog and the EMPTY AUTHORED list, all three positions accumulating, the dup/shape receipts, the boolean key, open siblings, bad-key-with-resolving-sibling, the channel-gated capabilityProfile, the CB3 key-order re-execution (`["1","2","10","ZZZ","AAA"]`), and the compound clean zero. NOTE for auditors: the output's `L_empty_catalog_ref` line reports `agree:false` from the probe's own asymmetric inputs and is superseded by the `_FILE` twin on the next line; the only DESIGNED asymmetry in the file is `L_capability_profile`. |

PROBE-P4-3's first two results are MEASURED DIVERGENCES from the
superseded line's C8(e)/C7 grain decisions; contract v2 rows C7/C8
carry them as DECIDED-HERE (v2) markers with these receipts.

(The divergence RATIONALES live in §9, beside the mapping they belong to.)

## 5. The D11 substrate act (the Flag #1 package)

- `08f99ab9` docs(v3): ADR-019 D11 amendment.
- `65b1a9e2` feat(v3): the build — suite 2044 → 2059 (= exactly the 15
  added tests; zero live delta by arithmetic).
- Arm round 1 (charter/output beside this file; pin gpt-5.6-sol/high,
  guards clean, 415s): **2 IN-SCOPE · 0 CARRIED · 0 UNRUN**, all five
  lenses full. F1 the closure gap (`collectDependsOn` predated the
  widening), F2 the direct-channel raw-Map slip — both build omissions,
  neither a reproduction nor a paraphrase.
- `14f3ab12` fix(v3): the fold, test-first — suite 2059 → 2063 (= the 4
  added tests).
- Arm round 2 (re-check on the folded bytes; pin gpt-5.6-sol/high,
  guards clean, 260s): **0 IN-SCOPE · 0 CARRIED · 0 UNRUN**, both fold
  neighbourhoods exercised in full (value-class-mediated plain fields,
  runtime suppression, non-string and nested Maps, typed-field Maps,
  channel agreement, file-channel anchor/alias), all four gates PASS
  (2063/2063). **The frame closes at round 2 of 3 — the third round is
  unspent reserve.** The construct's verification is green; the P4
  declaration may adopt it (the Flag #1 ruling's condition).

## 5a. The schema-lock guard act (STOP 1 ruling (c), built before the ratifying act)

- `ed86ac24` feat(v3): template §2/§3 + lint D3 extension + D5b + five
  selftest dims (135 → 139).
- Arm round 1 (charter/output beside this file; pin gpt-5.6-sol/high,
  guards clean, 280s): **2 IN-SCOPE · 0 CARRIED · 0 UNRUN**, all four
  lenses full. F1 the `..`-substring false positive (a legal dotted
  filename refused), F2 the symlink escape (an outside target's true
  hash satisfied the lock) — both build omissions in path discipline.
- `20b73f6a` fix(v3): the fold, dims-first — segment-wise `..`,
  resolved-root containment; register 139 → 140 + one new green.
- Arm round 2 (re-check; guards clean, 180s): **0 IN-SCOPE · 0 CARRIED
  · 0 UNRUN**, neighbourhoods full (head/tail/lone `..`, separators,
  inside/relative/intermediate-directory symlinks, the macOS
  `/tmp → /private/tmp` false-escape check), selftest 140 + live lint
  unchanged. **The frame closes at round 2 of 3.**
- `0d58283e` docs(v3): tag closure both directions (C1 ↔ d-root;
  d-capability-profile → ch13v2-C11) — closure re-run CLEAN.

## 6. Experiment §5 running record (P4, per round — derived numbers)

| Event | Yield | Classes | Reopens | Gates | STOPs |
|---|---|---|---|---|---|
| STOP 1 | 4 rulings | — | 0 | 1 (user) | 1 (designed) |
| Flag #1 | 1 ruling | vocabulary gap (measured by probe) | 0 | 1 (user) | 1 (flag) |
| D11 arm r1 | 2 folded | build-omission ×2 | 0 | 0 | 0 |
| D11 arm r2 | 0 findings — frame closes | — | 0 | 0 | 0 |
| Schema-lock arm r1 | 2 folded | build-omission ×2 (path discipline) | 0 | 0 | 0 |
| Schema-lock arm r2 | 0 findings — frame closes | — | 0 | 0 | 0 |
| Tag-closure (authoring-side) | 1 gap folded | citation omission | 0 | 0 | 0 |
| Panel r1 (full, 6 agents) | ~50 folded | 2 P1 (kept-claim defect; inheritance loss) · inheritance/receipt/plan classes | 0 | 0 | 0 |
| Panel r2 (full, 6 agents) | ~35 folded | 1 P1 (precedent contradiction) · fold-propagation classes | 0 | 0 | 1 (bet-boundary STOP, user opened r3) |
| Panel r3 (targeted, 4 agents) | ~20 folded | 0 P1 · 5 P2 (clause scope ×2, ADR-D4 propagation, citation target, receipt gap) · rest hygiene | 0 | 0 | 0 |

## 7. Bet ledger scoring (STOP 1's stated bets)

1. **Authoring** (1 pass + probes, 0 reserve): **HALF** — one pass
   produced the draft, but the panel's rounds found real inheritance
   losses and the first-generation sweep tokenizer masked copied
   sentences; the "0 reserve" half of the bet under-priced the first
   schema-first authoring. Lesson: a first-of-form authoring pass
   prices a loss-hunting review round, not zero reserve.
2. **Flag #1** (1 probe + 1 ruling): **EXACT** — the probe measured the
   gap and the sneak-in in one run; one ruling settled it.
3. **Panel** (2 rounds, 3rd via user): **AS PRICED** — two rounds ran
   autonomously with real yield; the 3rd (targeted) opened through the
   user exactly as the bet reserved it, and closed 0-P1.
4. **Byte-lock guard** (1 build + 1 verification, cap 3): **HALF** —
   the build landed in one pass, but round 1 found two path-discipline
   defects, so the fold forced a second round the bet had not priced
   (the cap absorbed it: closed at 2 of 3). Lesson for the priors:
   filesystem/path semantics are a surprise home of the same kind as
   runtime semantics — a guard build touching them prices 1 build +
   1 round + 1 re-check, not 1+1.
5. **Arm** (1 pointed round + 1 re-check): OPEN for the contract; the
   D11 SUBSTRATE act's own frame ran under the Flag-#1 bet's hedge —
   the hedge ("engine descent touches evaluation core → surprise home,
   reserve through the user") priced the risk correctly in KIND (two
   descent-composition omissions) and the frame absorbed both within
   its cap: 2 findings → fold → 0/0/0, closed at round 2 of 3.

## 7a. The never-copy sweep (authoring-side; METHOD CORRECTED at panel round 1)

Three generations, recorded because the instrument itself was a
finding. (1) The authoring-side sweep split on whitespace with
punctuation attached — 43 runs found, rewritten to 6 "skeleton" runs.
(2) Panel round 1 (lens 2, F2) showed that tokenizer lets a comma swap
mask a copied sentence: WORD-NORMALIZED (case- and
punctuation-insensitive, inline code spans stripped), 12 non-skeleton
runs survived. (3) The round-1 fold rewrote all of them — including
runs the fold itself had re-imported while restoring lost decisions —
and the corrected sweep now returns: 6 runs total, 5 contract-draft
TEMPLATE skeleton + 1 legitimately D10-inherited (the belt sentence
ADR-019 D10 itself quotes), 0 non-skeleton. Script + output beside
this file (`never-copy-sweep-out.txt`); the close re-runs it on the
final bytes. Lesson for the priors: a guard's tokenizer is part of
the guard — the meter must be metered.

## 8. Ergonomics note — what a minimal authoring form should have offered

For the boundary review (carried from the dress rehearsal's
USABILITY-2, confirmed by this phase's authoring):

- A new-surface author must lift the ENTIRE `substrate` block from the
  worked example (round 10 measured this; the P4 probes did the same
  lift three times). A documented minimal substrate constructor — or a
  stated "extend the existing surface" default like the one P4's ruling
  took — would have removed the only scaffolding step the docs do not
  cover.
- The `rows:` attribute forces a citation spelling decision on every
  node before the cited contract exists (P4 chose `ch13v2-C<n>` for
  draft-phase citations, disambiguating from the superseded `ch13-C<n>`
  ids elsewhere in the same file). A stated convention would remove the
  choice.
- The probe scripts' import paths are absolute and repo-specific; a
  documented one-liner ("import from `v3/src/definition/schema`, run
  with `pnpm exec tsx`") is all a first author needs and is nowhere
  written.

## 9. Completeness pass (panel rounds 1–3, 2026-08-08 — old→new over 19 rows + 4 reopens, WITH the divergence rationales)

Run by a dedicated fresh-context Opus agent, direction OLD → NEW, at
round-1 basis old=frozen@superseded, new=1b2b78aa7e9f376a @ 0ad7e5d9;
re-checked at round 2 on c01db023bcd0240c @ 17659831 and spot-checked
at round 3; the FINAL fold's post-state is what the ratifying act
binds. The round folds (§10–§12) restored or closed every item the
pass flagged.

| Old item | Verdict | Where / Why / How |
|---|---|---|
| C1 | carried + schema-covered, MARKED divergence | v2 C1; `[d-ctxblocks]` (map.open + default) in `[d-root]`.fields. Fail-closed replaces normalize-non-record — marked DECIDED HERE (v2), receipted (PROBE-P4-4 class-width incl. present-null). Non-suppression of C7 = D10's broken-operand nature. |
| C2 | carried + schema-covered; walk-side hand-off dropped-vacuous | v2 C2; `[vc-block-id]`/`[d-block-key]`/`[d-block-ref]`. The filter/keep hand-off was a walk/rung artifact; its observable survives (PROBE-P4-3/P4-4 boundary-key cases). Channel-independence of the key lane is the FOURTH marked divergence (post-fold). |
| C3 | carried + schema-covered | v2 C3; `[d-ctx-entry]`/`[d-ctx-body]`; no-reserve stays semantic. |
| C4 | carried + schema-covered | v2 C4; `[d-prompt-refs]` on `[vc-agentconfig]` — the vocabulary was built for it (D11). Fixture disposition → v2 C16. |
| C5 | carried | v2 C5, all three legs. |
| C6 | carried + schema-covered | v2 C6; `[d-ctx-gate-refs]` in `[d-binding]`. |
| C7 | carried + schema-covered, MARKED divergence | v2 C7; the belt became D10's `validKeysOf` with the code on `[vc-blockidlist]`. Per-occurrence resolution marked + receipted (DUP_GHOST, PROBE-P4-4). |
| C8 | compound | (a)(b)(d)(f) structural; (c) → v2 C9 in full; (e) → unique rule + v2 C8; (g) → v2 C8's compound clean negative (restored at the fold, receipted PROBE-P4-4); enumeration guard + primitive rule dropped-vacuous under fail-closed; raw-feed co-fire superseded — marked + receipted (DUP_BAD_SHAPE). Domain asymmetry: CLOSED by the substrate (one enumerable-own-key domain), stated in v2 C9 post-fold. |
| C9 | carried | v2 C10 every leg incl. the hoist+ascending-re-sort basis (restored at the fold) and the DERIVED re-mark with named measurer. |
| C10 | carried + schema-covered; EC scope restored at fold | v2 C11 + `[d-capability-profile]`; the pre-EC boundary re-added. |
| C11 | carried; token grain restored at fold | v2 C12 + the model-verbatim snake token values and literal quoting. |
| C12 | carried | v2 C14. |
| C13 | carried | v2 C15. |
| C14 | carried; membership criterion restored at fold | v2 C16 + consumption-based membership + the named interim carrier. |
| C15 | carried | v2 C17. |
| C16 | dropped-why: executed one-time act | The ch11 reopen act ran 2026-07-26; ch11 is realized with the texts. Pointer maintenance = the Context's named carried scope (owner: boundary review). |
| C17 | compound; two lost legs restored at fold | v2 C13 + default: placement (siblings at fixed-keyset levels), TS-optionality grain, carry-list duty (louder than the original), registry flips + type witnesses, the two build traps; non-record normalization superseded (marked, receipted); single-body-source home restored. |
| C18 | carried | v2 C18. |
| C19 | carried (inventory) + dropped-why (split retired), MARKED | v2 C19: tag-set inventory with the shared nodes as named exclusions; channel scope an engine property; capabilityProfile's declared asymmetry named. |
| Reopen 1 (C1 grain) | carried + partly vacuous | Ref-lane half = D10's nature; whole-result half vacuous (refuse vs admit can no longer be confused). |
| Reopen 2 (direct-channel region) | carried + schema-covered | The belt IS D10; key-exclusion deletion + unconditional domain in v2 C9; the C19 premise dropped-vacuous. |
| Reopen 3 (C17 nullish) | dropped-why: superseded, marked + receipted | v2 C1; absent-half survives as the declared default. |
| Reopen 4 (C17 class width) | dropped-why: superseded, marked + receipted | Same clause; the carrier obligation vacuous when the only non-record outcome is refusal. |

**The divergence RATIONALES (the arguments the rows deliberately do
not carry — the 2026-08-08 inheritance rule's designed home):**
- **C1 fail-closed** replaces the predecessor's normalize-any-
  non-record-to-empty rule. Safe because the defect that rule healed —
  a cast-forged catalog carried onto the admitted value — cannot arise
  under an engine that validates the direct-construction channel: the
  container lane refuses the forgery before any rebuild exists.
- **C2 channel-independent key lane**: the predecessor placed the key
  lane walk-side (file-only) because only the walk saw source keys;
  under one declaration the lane runs wherever a key exists, which is
  strictly fail-louder — no admit/refuse outcome moves, a direct-
  channel authoring defect now gets the same diagnosis a file author
  gets.
- **C7 per-occurrence resolution** replaces first-occurrence-carries:
  that rule made the duplicate lane decide the resolution lane's
  domain — a cross-lane coupling of exactly the class whose deletion
  the predecessor's own 2026-08-01 reopen ratified for the
  key-exclusion case — and per-lane independence is the engine's
  standing shape.
- **C8 shape-failure invisibility** replaces the unconditional
  raw-feed co-fire: a member that failed its own lane already carries
  its trace, and feeding it to sibling lanes multiplied findings for
  one defect while coupling lanes the engine keeps independent.

**Round-2/3 refresh notes on the table above:** old-C17's verdict also
covers the CHANNEL GRAIN and FIELD SPELLINGS decisions C13 gained at
round 2 (the channel narrowing is observably identical to the
predecessor's behaviour — its engine ran no direct-channel keyset lane
— so no divergence marker is owed); old-C8's leg (d) is additionally
homed as C4's authored-empty-list clause; old-C19's verdict reads on
the round-3 form (VALIDATION-node inventory, four named exclusions).

The pass's findings (1 P1, 2 P2, 7 P3) and their dispositions are in
the §10 round record — every lost item was FOLDED back in round 1;
the P1 (registry flip) and both P2s (optionality grain, invariant
homes) are restored in v2 C13 and the invariant homes on C7/C10/C11/
C13 — and, at the round-2 fold, on C14 (communication-only, with the
REV-line byte-scope binding) and C15 (deterministic-ordered-render),
completing all six. Verdict (the agent's, standing): the v2 line carries the old
line's decisions substantially without loss and in places carries
them better; no reopen decision vanished quietly; the divergences are
marked and receipted.

## 10. Panel round 1 (2026-08-08) — full five-lens + completeness, and the fold

Basis: contract 1b2b78aa7e9f376a, declaration 34af910d5cfbd0ba @
0ad7e5d9. Six fresh-context Opus agents (five lenses + the
completeness pass). Yield: ~50 findings — 2 P1 (lens 3's C13
keyset-claim self-contradiction; the completeness pass's registry
flip), ~14 P2, the rest P3/watchpoint/considered. ZERO STOP-class
findings; all three (now four) DECIDED-HERE markers cleared as
row-home by the model-plane audit (lens 2 duty 4).

The CONTENT fold (one batch, this round): supersession arguments moved
out of rows (the 2026-08-08 inheritance rule — the rows keep markers
and receipts); C19's inventory re-parameterized both directions;
C13 restored the placement + optionality + registry-flip + build-trap
decisions and scoped its keyset claim (the P1 fix); C9's stand-down
generalized to reachability and the closed domain-asymmetry stated;
C2 gained the fourth DECIDED-HERE marker; C8 gained the C9 carve-out
and the compound clean negative; C12 gained the wire tokens; C16 the
membership criterion; C7 the admission moment + containment + its
invariant home; C10/C11/C13 their invariant homes + EC scope + the
re-sort clause; the Context gained the rename-culture statement, the
carried-scope pointer note, the lock-consequence sentence, the
narrowed no-restatement claim and the completed model-note
enumeration; the declaration's header lost its stale R1/hash/
collectTags claims and `n-effective-config` gained the C13 row
citation; the domain type's comment re-attributed to C13; five plan
sections gained their aligned-at edits; PROBE-P4-4 (the live
declaration, class-width) landed with script + output; the never-copy
sweep was corrected and re-run to clean (§7a).

Dispositions: folded ~40 · declined 1 (lens 2 F7 — the code literal
in both authorities: defensible via C18's CLI hop, D2 scoping; a
rename would be its own ratified act) · routed 1 (the ch11/plan
pointer maintenance → boundary review, named in Context) · deferred
0 · considered_not_finding per lens reports (in their outputs, this
directory's transcripts are not committed — the reports' substance is
this section). Round 2 (the post-fold re-run) is FULL by the
escalation rule (claim-structure changes + a manifest-class change:
the fourth DECIDED-HERE marker).

## 11. Panel round 2 (2026-08-08) — full six-agent re-run, and its fold

Basis: contract c01db023bcd0240c, declaration a355ada64c35ed7c @
17659831. Yield: 1 P1 (the C13 channel question — resolved by carrying
the producer-monopoly precedent's declaration half: normalized
positions channel-gated to direct at P5, the `advancesRound` pattern's
own stated reason) · ~13 P2 · ~20 P3/watchpoint. ZERO STOP-class.
Notable: three lenses independently converged on C19's exclusion
arithmetic; two on the C13 channel seam; the completeness re-check
verified every round-1 restoration ON THE BYTES and caught the fold's
own transit loss (the evacuated rationales — written into the record
at round 2 and MOVED under §9 at round 3, which is what makes the
contract's six citations true).

The round-2 fold: C13 gains the CHANNEL GRAIN and FIELD SPELLINGS
clauses and the carry∪into gloss fix; C4 homes the authored EMPTY
list, the mode-tagged member's forward scope, and the aggregate-note
retirement (with C1's chain-retirement clause); C1's class-width gloss
re-worded to the declared lane's own boundary (the degenerate-object
accept named); C2/C1/C9 lose their predecessor-rule descriptions; C7's
grain gloss pointered; C8 scopes its clean receipt gate-free; C9 names
the gate chain's enclosures; C10's re-execution claim gains its live
receipt (the CB3 case joined PROBE-P4-4); C12 carries the rename
relation's whole normative content; C14/C15 gain the last two
invariant homes (C14 with the REV byte-scope binding and its ch12-C10/
ch11-C27/ch9-C18 row ids); C16's carrier pointer corrected to §2-under-
§5 and its criterion scoped against C12's tree-wide ripple; C19
re-parameterized over VALIDATION nodes with three named exclusions.
The probe suite grew the round's receipt gaps (refused/absent catalog
WITH refs both channels, the class members routed through both channels, the
empty authored list, open siblings, bad-key-with-resolving-sibling,
the CB3 re-execution); the sweep script is committed beside its
output; the templateFormat header and the domain comment aligned; the
plan gained §13.5(g) (the pointer-maintenance carrier), the live P5
packet's mode+prediction row, and the Shipped line's stamp.

Dispositions: folded ~30 · declined 0 · routed 0 · the rest
considered/cleared in the lens outputs. The panel bet (2 rounds, the
3rd through the user) is now at its boundary — the 3rd (targeted)
round after this content fold opens through the user, per the ratified
STOP-1 work plan.

## 12. Panel round 3 (2026-08-08, targeted — opened by the user at the bet boundary) and its fold

Basis: contract ddc5820089b58a1b, declaration 9368e5253d1163fa @
b5537ce8. Four agents: lenses 1/3 (delta-scoped), the mandatory lens-4
reconciliation, the completeness spot-check. Yield: 0 P1 · 5 P2 · ~20
P3/watchpoint, zero STOP-class. The completeness spot-check's verdict:
the inheritance guarantee holds, rationales included; the residue was
record hygiene, not decision loss.

The fold: C13's CHANNEL GRAIN qualified to the two admission-produced
positions with the binding named channel-both AT the claim, and the
producer-monopoly's RECOMPUTE half carried explicitly (two lenses
converged with executed evidence); C19 gains its fourth named
exclusion, the authored-position scoping of the symmetry sentence, the
two forward-scoped asymmetry arrivals, and the declaration growth in
its P5 list; C12's key enumeration gains its own field name; C16 tags
the full-packet member as C12's tree-wide ripple; C1's degenerate
accept gains its receipt; the Context gains the Read-path answer.
PROBE-P4-4 grew the degenerate cases, the gates-record key-order
measurement (the operand itself, no longer the transitions analog),
the unfiltered-retention case and the unfiltered true zeros, and its
instrument note now discloses the finding filter. The record: the
rationales moved under §9 (the six contract citations now point true),
§9's heading/basis repaired and its table refreshed for the round-2/3
rows, §6 gained the panel rounds, bets 1 and 3 scored. The plan:
§13.5(g)'s site count corrected to six (two realized_map entries carry
the pointer, the third mentions the act without it), and §13.4's row
basis marker reworded to "the surface this act ratifies".

CARRIED TO THE FLAGS ROUND, not folded: ADR-019 D4's original absolute
("the contract states no structural attribute; a rule visible in both
places is a defect") vs the refined gloss/normative form now on the
contract and the declaration — a D-section edit is a user-ratified
amendment, so the prepared one-clause D4 clarification rides the
ratification GO, never a silent edit (lens-4 R3 F1).

## 13. The contract arm on the approve-ready bytes (bet 5's pointed round) and its fold

Charter + output beside this file (`p4-contract-arm*`). Pin
gpt-5.6-sol/high, guards clean, 410s, target-locked on the contract
file. Verdict: **3 IN-SCOPE · 0 CARRIED · 0 UNRUN**; gates re-run by
the arm all green (packet-lint, typecheck, suite 2063/2063).

- **A1 (C2's id count):** the arm grepped the model for the WRONG
  third id (`emit-envelope` — C16's shipped id, never a model
  exhibit) and concluded the count of three was invented. The count
  is TRUE — the third is `docs-only-edit-scope`
  (core-model.html:8888, inside the mode-tagged member) — but the
  arm's misfire is itself evidence: an unnamed count invites the
  wrong needle. FOLD: the row now NAMES the three ids.
- **A2 (C1/C7/C8 attribute glosses vs ADR-019 D4's standing
  absolute):** REAL under the current ADR bytes, and exactly the
  D4-vs-gloss tension already carried to the flags round (§12). The
  arm independently confirms the amendment is BLOCKING, not
  cosmetic: under the unamended D4 the draft cannot ratify clean.
  Resolution: flag R5's prepared D4 amendment rides the GO; no
  contract edit (the glosses are the non-binding form both the
  contract and the declaration already declare).
- **A3 (C16's repository-wide "first" claim unreceipted):** true by
  sweep, receipt owed. MEASURED at this fold: `grep -rn
  "agentConfig|defaultAgentConfig" v3/templates/` returns ZERO hits
  (2026-08-08, the arm reproduced the same). FOLD: the row cites this
  note as its receipt.

Bet 5 scoring after this round: the pointed round found 3 (one an
arm-side needle error that still bought a row hardening, one the
known flag confirmed blocking, one a receipt gap) — the re-check on
the folded bytes is the bet's priced second half.

## 14. The arm re-check and the phase's approve-ready state (2026-08-08)

Re-check (charter/output beside this file; pin gpt-5.6-sol/high,
guards clean, 85s): **0 IN-SCOPE · 1 CARRIED-SCOPE (the D4 amendment,
explicitly behind the human GO) · 0 UNRUN** — all three dispositions
hold. Bet 5 scores **AS PRICED** (one pointed round + one re-check).

THE TWO-HASH MODEL, applied: the clean top-level close bound the
CONTENT hash `81f1daa9ac04a393` @ dc821f5b; the arm fold that followed
was BOOKKEEPING-class (an id enumeration replacing a count — a
measurement transcription; a receipt pointer), so the close stands and
the FINAL RECONCILED basis is `6c01e478c406776d` (contract) +
`9368e5253d1163fa` (declaration) @ 3cb4498c, verified by the arm
re-check as the reconciliation pass. These are the bytes the flags
round presents and the ratifying act binds.

Panel/arm totals for the §5 experiment at approve-readiness: 3 panel
rounds (2 full + 1 targeted, the 3rd opened by the user at the bet
boundary) + 1 clean close + 2 contract-arm rounds; ~105 findings
found and dispositioned across them; ZERO contract reopens; ZERO
STOP-class findings; the never-copy sweep 0 non-skeleton on the final
bytes; citation closure clean both directions; every DECIDED-HERE
marker receipted against the live declaration.

## 15. The ratification act (2026-08-08, user GO — commit aca7c2b8)

Flags R1–R4 (the four DECIDED-HERE markers) approved one at a time;
flag R5 (the ADR-019 D4 gloss and closure-form clarification) approved
with the GO. One ratifying commit: status draft → ratified; the block
records the content commit 3cb4498c AND — the schema lock's first live
use — templateFormat.ts's full sha256; the D4 amendment applied with
its dated user-ratified marker; the metrics line records 3 panel
rounds + close + arm×2, 4 markers, 0 reopenings. Post-commit lint: 0
errors with BOTH locks binding.

**The §5 experiment, settled at this act:** the falsifiable claim held
— the v2 line reached ratification with ZERO reopens caused by
unmeasured claims (zero reopens at all), zero watchdog exhaustion, and
zero semantic paraphrases on the final bytes (the word-normalized
sweep's 0 non-skeleton runs; the two byte-locked authorities make
structural restatement impossible BY FORM, and the sweep measured the
prose remainder). The prose line's comparison series: 4 reopens, 4+
panel-frame rounds + a watchdog reset, 28·6·9·8. The honest
qualifiers: (a) the improved line spent its findings BEFORE
ratification — ~105 panel/arm findings dispositioned across 3+1+2
rounds — so the gain is in WHERE the defects were caught, not in their
count; (b) P5 (the packet + build) still owes the claim's second half
(an approved packet with a zero-paraphrase final arm).
