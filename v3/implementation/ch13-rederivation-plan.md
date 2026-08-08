# ch13 re-derivation plan — schema-first, on the improved process

Status: RATIFIED direction (user, 2026-08-03). This plan is the
knowledge hand-over from the session that ran the ch13-p1 prose line
to its end; the executing sessions read THIS document, not that
session's transcript.

## 1. Why (the evidence, all committed)

The ch13-p1 prose line ended at a measured semantic drift floor:

- 28 registered rules · 6 literal restatements caught by the P11
  pointer-lint · 9 semantic paraphrases caught by the first full arm
  sweep · 8 FRESH semantic paraphrases caught by the second sweep
  AFTER the first nine were folded. The second number did not shrink —
  it came from new places.
- Root cause (measured, not conjectured): the conversion worklist was
  the old mirror table's rows, and the paraphrases live exactly where
  that table never looked (five rules had ZERO pointers). Four of the
  table's first nine rows were wrong or incomplete — the table was
  unverified prose about prose.
- The general form: a lint confines LITERALS (mechanical, complete);
  a mirror table lists MEANINGS (human attention, incomplete); an arm
  finds what the list missed (one pass at a time, while every fold
  mints new prose). Prose is not indexable by meaning. Rules must
  become DATA for restatement to be structurally impossible.

Full context: process-log entries from 2026-07-31 through 2026-08-03
(the reopen series, the watchdog acts, the executed-probe/DERIVED/
citation rules, the tooling-arm rule, the 6/9 split, the schema
candidate at commit 4c1d481f).

## 2. The strategy (ratified shape)

Supersede FORWARD — no history surgery. Main stays linear; the old
line is preserved, referenced, and machine-locked against reuse.

- The ORACLE: branch `ch13-prose-line` (tip bb313036) carries the
  full prose-line state: the ratified 19-row contract, the 28-rule
  pointer-form packet (basis 831aa3cc), and the complete arm verdict
  series. It never merges. Consult it for DECISIONS and MEASUREMENTS;
  never copy its prose.
- ch13-P0 (closed-pipe-sink) stays as built — the cut is after P0.
- ch13-p1 is superseded wholesale: its F1/F2 flags are never
  ratified; its five open arm findings are never folded. The working
  files leave the packets dir once the supersede act runs.

## 3. Phases (each is its own act with its own verification)

P1 — SUPERSEDE MECHANICS. Add a `superseded` terminal status to the
contract-draft status machine and flip the ch13 contract to it, with
a record pointing at the oracle branch and this plan. Lint rule (the
P11 build pattern: selftest-red per claim, arm-obliged because it is
guard machinery): a packet anchoring `contract:...` to a superseded
draft is red. Move the p1 working files under the oracle branch's
custody only (they are already committed there).

P2 — DECISION LEDGER. [STRUCK by the user 2026-08-05 — see the
amendment at the tail of this file; the phase order is P1 → P3 → P4
→ P5.] Extract from the oracle the ratified DECISIONS
as data, not prose: one entry per decision (the original 19-row
ratification + the four reopens + the two dial rounds + flag
resolutions), each with: id, the decision in one sentence, its probe
receipts (pointers to the oracle's arm files / MEASURED stamps), and
its status (carried | superseded-by-schema). This ledger is the ONLY
inheritance channel into the new line — decisions carry, wording does
not. Panel-check the ledger against the oracle for completeness
(count: expect ~30 entries; every reopen decision must appear).

P3 — SCHEMA ADR + SUBSTRATE. Author and ratify the ADR from the
4c1d481f candidate + §1's measurements: structural rules become
per-surface declared schemas (key classes, containers, grammars,
defaults/normalization as data) validated by ONE engine on BOTH
channels; prose remains ONLY for genuinely semantic rules (reference
resolution, unreferenced hygiene, event-grain suppression,
per-occurrence duplicates). Then build the substrate: schema format,
engine, finding-path/message mapping, lint integration. The engine is
contract-dense guard machinery: packet-grade treatment, executed
probes, and a scoped arm on the builder's own work BEFORE anything
projects onto it (the 2026-08-02 tooling-arm rule).

P4 — ch13 CONTRACT v2, schema-first. Re-author from the decision
ledger: structural decisions land as schema declarations; semantic
decisions as C-rows written under ALL standing draft duties
(executed-probe, delegation litmus, DERIVED-with-measurer, citation
rule, names-not-ordinals, flag rule: decision + receipt-pointer, no
inline measured claims). Normal draft-panel + ratification flow. The
EXPERIMENT measurement starts here (§5).

P5 — ch13-p1 v2 packet: fresh projection from contract v2 onto the
schema substrate, pointer-only from birth (the mirror_map block is in
the template for it), then build.

## 4. Roles

- USER: ratifier of every contract/ADR act and the watchdog
  authority. Unchanged.
- GENERAL (a fresh Fable session): orchestrates this plan; reviews
  the executor's proposals before they reach the user; runs the
  never-assume verification discipline (hash/lint/probe checks on
  every claim that is 10-seconds checkable); owns arm charters and
  the paste-ready decision presentations (one decision per message,
  self-contained, recommendation first).
- EXECUTOR (an Opus 5 session): performs the acts, reports with
  basis hashes and executed probes, stops at the standing gates.
  Start it FRESH — the prose line's executor session carries that
  line's assumptions and is closed, not reused; the general authors
  the executor's kickoff (pointing at this plan) as its first act.
- RELAY MECHANICS: the general and the executor are separate Claude
  sessions with no direct channel — every instruction and report
  flows through the USER as paste-ready blocks. Write them
  self-contained: the receiving session sees only the block, never
  the sender's context.
- ARM (fresh-context external verifier, the established pin):
  verifies every guard-machinery build and every phase close.
  Verdicts land in an `-arm/` dir beside the phase's artifacts.

## 5. The experiment (why this is also a test)

The re-derivation is a controlled test of the improved process on the
same subject matter. Record per phase, and compare against the prose
line's numbers (all in the process-log): panel/verification rounds,
findings by class (new-design-error / fold-byproduct / reproduction /
paraphrase), reopens, human gates, and STOPs. The prose line's
headline numbers: 4 contract reopens, 4+ panel-frame rounds plus a
watchdog reset, 3 scoped-arm tooling rounds, 28·6·9·8. Success
criterion (falsifiable): the v2 line reaches a ratified contract and
an approved packet with ZERO reopens caused by unmeasured claims, no
watchdog exhaustion, and a semantic-paraphrase count at the final arm
of ZERO (structural restatement being impossible by form) — anything
above that is the experiment's honest result either way, recorded at
the boundary review.

## 6. Standing rules that bind every phase (committed precedents)

executed-probe (5259d4df, 8c184b34: measurable claims need run
receipts; DERIVED needs a named measurer; binds the ratifying side
too); unverified citation = citation-shaped unrun measured
(e7b94ed5); draft-delegation litmus ("what does the code do when this
actor gets it wrong?"); tooling sessions are arm-obliged (5035eb15);
class-width scope for class-shaped defects; names, never ordinals;
consolidation edits assert only what per-case probes show (6dbbd52a);
watchdog counts are anchor-scoped, re-based only by the user with
recorded reason (cb7ba9fe); flag texts carry decisions and receipt
pointers, never inline measurements.

Added by the user's ratification of 2026-08-04 (the P1 overbuild
reset — process-log entry of that date; postmortem outside the repo
in pairflow-notes/): THREAT-MODEL-FIRST (no guard is built or
extended without one sentence naming what it defends against;
findings outside that sentence are recorded as carried-scope, never
fixed — from round 1); BOUNDED TOOLING LOOPS (verification loops on
guard machinery run 3 rounds by default; a 4th opens only through
the user, and the question put to them is "is the criterion right?",
never "may we continue?"); the PROPORTIONALITY TRIPWIRE (a fold
growing guard code twice in a row, or guard size exceeding what it
guards, converts the next round into a scope review); the TRAJECTORY
LINE (every human-gate presentation opens with phase day · round
count · artifact size and delta — every number DERIVED from repo
surfaces at write time, never recalled from conversation memory, and
never tooled: hand-assembled, 10-second ceiling per number).

Amendment, user-ratified 2026-08-05: P2 IS STRUCK. The ledger would
itself have been a restatement mirror — the old rows re-worded in a
second file, the exact paraphrase pattern this re-derivation exists
to kill — duplicating an artifact that already exists in stronger
form: the superseded contract IS the decision record (rows frozen
byte-for-byte under the equality lock, row ids permanently
anchorable as `contract:ch13-context-block#C<n>`, the five
ratification blocks carrying dates, reasons and receipts). Its
substance moves into P4 with NO new mechanism: (a) authoring rule —
every v2 row or schema declaration CITES its source (old row id or
dated process-log entry) and cites row ids, never copies sentences;
(b) review duty — the P4 panel runs a completeness pass over the old
19 rows and 4 reopen records (carried where / dropped why /
schema-covered how). The carried-vs-superseded-by-schema triage
happens there, per decision, in place. Phase order: P1 → P3 → P4 →
P5.

Amendment, user-ratified 2026-08-08: the P4 inheritance rule's
CITATION half is revised. The 2026-08-05 amendment required every v2
row and declaration to cite its source row INLINE; weighed against
its own costs — every citation is a checkable claim (the e7b94ed5
rule), the machine-locked prose regains back-door authority through
in-text references, and the ratified artifact gains noise — the
inline form loses. The revised form: the v2 contract carries ONE
header supersession line ("successor of ch13-context-block,
superseded 2026-08-05; inheritance verified by the P4 completeness
pass") and NO per-row back-references; the old→new mapping lives in
the P4 REVIEW RECORD (the completeness pass over the 19 rows + 4
reopen records, committed as evidence beside the panel/arm
verdicts); the NEVER-COPY-SENTENCES rule stands unchanged; a
decision unintelligible without its history may carry a brief
non-normative Context note, sparingly. The completeness pass remains
the load-bearing guarantee — it runs old→new, the direction that
catches loss.
