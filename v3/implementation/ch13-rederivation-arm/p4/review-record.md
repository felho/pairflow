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

PROBE-P4-3's first two results are MEASURED DIVERGENCES from the
superseded line's C8(e)/C7 grain decisions; contract v2 rows C7/C8
carry them as DECIDED-HERE (v2) markers with these receipts.

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

## 6. Experiment §5 running record (P4, per round — derived numbers)

| Event | Yield | Classes | Reopens | Gates | STOPs |
|---|---|---|---|---|---|
| STOP 1 | 4 rulings | — | 0 | 1 (user) | 1 (designed) |
| Flag #1 | 1 ruling | vocabulary gap (measured by probe) | 0 | 1 (user) | 1 (flag) |
| D11 arm r1 | 2 folded | build-omission ×2 | 0 | 0 | 0 |
| D11 arm r2 | 0 findings — frame closes | — | 0 | 0 | 0 |

## 7. Bet ledger scoring (STOP 1's stated bets)

1. **Authoring** (1 pass + probes, 0 reserve): OPEN — declaration draft
   + contract doc drafted under /tmp during the D11 frame; scored at
   panel entry.
2. **Flag #1** (1 probe + 1 ruling): **EXACT** — the probe measured the
   gap and the sneak-in in one run; one ruling settled it.
3. **Panel** (2 rounds, 3rd via user): OPEN.
4. **Byte-lock guard** (1 build + 1 verification, cap 3): OPEN.
5. **Arm** (1 pointed round + 1 re-check): OPEN for the contract; the
   D11 SUBSTRATE act's own frame ran under the Flag-#1 bet's hedge —
   the hedge ("engine descent touches evaluation core → surprise home,
   reserve through the user") priced the risk correctly in KIND (two
   descent-composition omissions) and the frame absorbed both within
   its cap: 2 findings → fold → 0/0/0, closed at round 2 of 3.

## 7a. The never-copy sweep (authoring-side, executed 2026-08-08)

The v2 draft was checked MECHANICALLY against the superseded contract
for shared runs of six or more consecutive words (script output beside
this file). First pass: 43 overlapping runs — the authoring side had
reproduced sentence fragments from memory, the exact drift the rule
exists to catch. All non-boilerplate runs were rewritten fresh; the
final pass shows 6 remaining runs, every one of them contract-draft
TEMPLATE skeleton (meta block, section headers, the metrics-line form),
none of them the superseded contract's own prose. The panel re-runs
this sweep on the final bytes.

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

## 9. Completeness pass (the panel's duty — old→new over 19 rows + 4 reopens)

Placeholder: filled by the P4 panel, direction old→new, verdict per row
(carried-where / dropped-why / schema-covered-how), committed here
beside the panel verdict.
