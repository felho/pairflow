# ADR-015: v3 plane consolidation — `docs/v3/` merges into `v3/`

Status: accepted
Date: 2026-07-20 (proposed) · 2026-07-21 (accepted — the user's
ratifying act, which also sanctions the named mid-chapter timing
exception per the Commit shape / Timing sections)
Links: supersedes — · amends ADR-001 (extends the v3 package topology to
non-code planes; the code-home decision itself is unchanged) ·
depends-on — · related — playbook §8, implementation-contract PI-10

## Context

The v3 effort lives in two disconnected roots. `v3/` holds the code
plane (package, `src/`, `adr/`, runtime `templates/`). `docs/v3/` holds
everything else, organized by the PHASE that produced it, not by what
it IS:

- `docs/v3/research/` — twenty external-system studies + synthesis
  (pre-work; read-mostly since the convergence phase closed).
- `docs/v3/convergence/` — a phase name covering two very different
  things: (a) `model-src/` + `core-model.html`, which is not
  documentation but the SOURCE OF TRUTH the implementation is checked
  against (manifest-driven, built by `tools/v3-model/`, machine face
  `ledger.md`, drift-locked to `v3/src` by the drift suite); and
  (b) ratified essays (`approach.md`, `design-method-playbook.md`,
  `implementation-contract.md`) consumed as standing authority.
- `docs/v3/implementation/` — the factory: process README, plan,
  packets, contracts, templates, logs.

Two tensions forced the decision. First, the repository boundary
between `docs/v3` and `v3` runs exactly between the most tightly
coupled surfaces we have (model ↔ code: the drift suite, the
model-sync deltas, the ledger's unit basis in every packet). Second,
the phase-based names age badly: "convergence" describes WHEN the
content was written, and nothing about its current role, so new
content keeps landing by historical accident rather than by type.

## Decision

Merge `docs/v3/` into `v3/` and re-cut the tree by ROLE (plane), not
by phase. Four planes plus the code:

```
v3/
├── README.md            (NEW — orientation map: planes + authorities)
├── model/               the definition (source of truth, build input)
├── design/              ratified thinking + history (read-mostly)
│   ├── research/
│   └── topics/
├── implementation/      the factory (unchanged internally)
├── adr/  src/  templates/  (code plane — unchanged)
└── package.json, tsconfig.json, vitest.config.ts, …
```

### Mapping (old → new; every move is a `git mv`)

| Old | New |
|---|---|
| `docs/v3/convergence/model-src/` (whole tree) | `v3/model/` |
| `docs/v3/convergence/core-model.html` | `v3/model/core-model.html` |
| `docs/v3/convergence/core-model-todo.md` | `v3/model/core-model-todo.md` |
| `docs/v3/convergence/core-model-future-topic.md` | `v3/model/core-model-future-topic.md` |
| `docs/v3/convergence/approach.md` | `v3/design/approach.md` |
| `docs/v3/convergence/design-method-playbook.md` | `v3/design/design-method-playbook.md` |
| `docs/v3/convergence/implementation-contract.md` | `v3/design/implementation-contract.md` |
| `docs/v3/research/` (whole tree) | `v3/design/research/` |
| `docs/v3/topics/` (whole tree) | `v3/design/topics/` |
| `docs/v3/concept-braindump.md` | `v3/design/concept-braindump.md` |
| `docs/v3/test-workflows.md` | `v3/design/test-workflows.md` |
| `docs/v3/implementation/` (whole tree) | `v3/implementation/` |

`docs/v3/` ceases to exist. The "convergence" name is retired: its
model half is promoted to a first-class plane (`v3/model/`), its
essays join the design archive. `v3/implementation/` keeps its
internal structure byte-for-byte (it is the densest-referenced
surface — skill, AGENTS.md, tooling, plan anchors — so it moves as a
unit).

Plane boundaries, stated once (the new `v3/README.md` carries this):

- `model/` — the ratified model corpus. Written only through the
  model-plane process (playbook §6/§8); the implementation consumes
  it, never edits it.
- `design/` — ratified essays, studies, topic memos. Standing
  authority where cited (playbook, implementation-contract), archive
  otherwise. New topic memos still land in `design/topics/`.
- `implementation/` — the working plane (process README is its
  authority, unchanged).
- `adr/`, `src/`, `templates/` — the code plane per ADR-001.

### Reference rewrite — three reference classes, three treatments

Measured 2026-07-20 (re-measure at execution time; counts are
point-in-time): ~91 `docs/v3` references in `*.md/*.ts/*.json/*.html`
across the repo (AGENTS.md ×7, plan/packets/contracts, ADRs,
`model-src/manifest.json` which stores the repo-relative `html`
output path), 26 lines in Python/shell files repo-wide (`git grep -n
-I 'docs/v3' -- '*.py' '*.sh'`, re-measured at arm round deep-11;
chiefly `tools/v3-plan/check_packet.py`, `check_coverage.py`,
`tools/v3-model/*.py`, `check.sh`), 5 files in
the repo-local `CreateTaskPacket` skill, and 63 currently-resolving
relative Markdown links inside `docs/v3` whose target moves relative
to them (arm-measured, 2026-07-20).

**Class A — repo-root-anchored `docs/v3/…` paths** (Markdown, Python,
shell, JSON, skill files). Two forms (arm finding F1-deep2): LITERAL
strings, rewritten by the prefix table below; and SEGMENT-WISE path
constructions in code that never contain the literal — enumerated as
named edit sites: `tools/v3-plan/check_packet.py`'s `PACKETS_DIR` /
`CONTRACTS_DIR` constants (`REPO_ROOT / "docs" / "v3" / …`), plus any
further hits of a `"docs"` path-segment grep over `tools/` at
execution time (`check_coverage.py`'s defaults are literal strings,
Class A-covered — verified 2026-07-21). The prefix table, applied in
order (longer prefixes first so no rule shadows another):

1. `docs/v3/convergence/model-src` → `v3/model`
2. `docs/v3/convergence/core-model` → `v3/model/core-model`
3. `docs/v3/convergence/approach.md` → `v3/design/approach.md`
4. `docs/v3/convergence/design-method-playbook.md` → `v3/design/design-method-playbook.md`
5. `docs/v3/convergence/implementation-contract.md` → `v3/design/implementation-contract.md`
6. `docs/v3/research` → `v3/design/research`
7. `docs/v3/topics` → `v3/design/topics`
8. `docs/v3/implementation` → `v3/implementation`
9. residual `docs/v3/` → `v3/design/` (the two root files), then a
   MANUAL review of any remaining bare `docs/v3` (historical-fact
   lines may keep it per the policy below; live pointers may not).

**Class B — relative pointers inside the moved trees**, in Markdown
links AND in HTML `href`/`src` attributes (arm finding F2r). NOT
rewritten by a prefix list (arm finding F3: 63 currently-resolving
Markdown links need retargets the four originally-listed relative
rules did not cover, including shortenings like `../../../v3/adr/…` →
`../adr/…` from the moved implementation tree). Treatment is fully
mechanical and general: for every relative pointer in a moved file,
resolve it against the pointer's OLD anchor location to an absolute
repo path, map that path through the Class A table (identity for
unmoved targets), then re-relativize from the NEW anchor location. A
pointer that does not resolve BEFORE the migration is left
byte-identical (pre-existing breakage is not silently "fixed"; it is
listed in the sweep report).

LABEL LOCKSTEP (arm finding F1-deep6): many links use their own path
as the visible label — `[`../convergence/approach.md`](…)` — and one
(`plan.md`'s `[`../../../v3/adr/_template.md`](…)`) carries no
retired token, so no other class would touch its label while Class B
rewrites its target: every pointer check would stay green around a
visibly wrong, copy-paste-hostile path. Rule: when a rewritten
link's label text is path-shaped and textually equals its OLD
target, the label is rewritten IN LOCKSTEP with the target; such
label edits are listed in the report alongside their links.

The HTML case, enumerated (measured 2026-07-20): `model-src`'s
authored fragments carry exactly THREE unique non-anchor, non-http
hrefs — `approach.md`, `design-method-playbook.md`,
`../concept-braindump.md` — and their anchor is the GENERATED page's
location (`core-model.html`), not the fragment's own; after the move
they become `../design/approach.md`,
`../design/design-method-playbook.md`,
`../design/concept-braindump.md`. These are path-string-only edits to
model-src bytes, inside what the IC-N stance below already permits
(no model meaning changes); `core-model.html` is then regenerated, so
its diff carries exactly these href retargets (four occurrences of
the three targets) and NOTHING else — the manifest's `html` output
path changes separately in `manifest.json`; `build.py` never emits it
into the page (arm confirmation-run finding).

**Class C — pointers that are neither root-anchored strings nor
Markdown links** (arm findings F2, F1-deep): authority pointers
written as inline code or prose — e.g. `v3/implementation/README.md`
§1–§2's `../convergence/implementation-contract.md` and
`../convergence/approach.md`, the playbook's basename-only
`core-model.html` mentions and its "convergence docs" HOME wording,
AGENTS.md's section header, bare-basename mentions whose SIBLING
relationship breaks (`core-model-future-topic.md`'s `approach.md`,
`core-model-todo.md`'s `implementation-contract.md` — both files move
to `model/` while their targets move to `design/`), and stale
nomenclature in code-plane comments (`v3/src/drift/unitMap.test.ts`,
prior ADRs naming `model-src/`). The token set is NOT hand-picked
(the deep arm run measured a six-token list missing 24 of 95
resolving inline pointers), but it is also NOT the naive
every-moved-basename set (arm finding F2-deep8: that derived set is
262 tokens matching 3 092 lines repo-wide — `README.md` alone hits
589 — an undecidable sweep that can only be rubber-stamped). The
sweep is two-tier and MACHINE-CHECKABLE:

- Repo-wide tokens: `docs/v3`, `model-src`, and the retired
  directory name in PATH-SHAPED context only — `convergence/` or
  `/convergence` (arm finding F2-deep10: the bare word matches
  1 266 tracked occurrences, overwhelmingly prose — "the convergence
  phase" is language, not a pointer, and stays valid; the two
  authority-wording sites that DO need rewording are already
  enumerated as named edit sites above). Scope: TRACKED files only
  (`git ls-files` basis — ignored artifacts like `dist/` cannot
  destabilize the census) minus the Verification 5 excludes.
- Moved-tree tokens: relative path fragments whose resolution the
  move changes — `../convergence`, `../research`, `../topics`,
  `../implementation`, and ANY other `../`-prefixed inline-code path
  in a moved file (the sweep script flags them all) — scope: the
  moved trees.
- Bare subtree-prefixed paths (arm finding F1-deep9: 10 measured
  hits like `topics/_dynamic-orchestrator-workflow.md` or
  `research/bitsafe-workflow-simulation.md`, implicitly rooted at
  the old `docs/v3` and carrying neither a retired token nor a
  `../` prefix): tokens `topics/` and `research/` followed by a
  filename character — scope: the moved trees. (`packets/` and
  `contracts/` stay valid: their parent `implementation/` moves as a
  unit, so implicit references inside it keep resolving.)

Bare basenames are NOT sweep tokens: the name rule below already
dispositions them as a CLASS (a basename is an identifier the
migration never changes), and any path-shaped occurrence containing
a basename necessarily also contains a separator or root anchor the
tiers above reach. The sweep runs as a SCRIPT committed with the report, in TWO runs
with distinct semantics (arm finding F1-deep10: a single
post-migration run is irreproducible — rewritten hits' keys vanish
with the rewrite, and moved files change the path half of every
key):

- The PRE-sweep runs on the MIGRATION PARENT's tree and emits the
  authoritative hit table, keyed `old-path:line:token`; every key
  gets a disposition (`rewritten`, `kept — <class>`, `annotated`);
  this table freezes into the report.
- The POST-sweep runs on the migration commit's tree; its keys are
  translated through the mapping table (old path → new path; the
  token unchanged). It must return EXACTLY the residue the frozen
  table predicts: every `kept`/`annotated` row present at its
  translated key, every `rewritten` row absent, and — the third
  residue class (arm finding F1-deep11: the migration itself
  CREATES occurrences by design, which "nothing new" would flag) —
  every `introduced` row present: the three "NEVER moves" amendment
  parentheticals (each names the old home as a historical
  reference) and the appended process-log entry (which narrates the
  move in old-path terms). The `introduced` rows are enumerated in
  the frozen table IN ADVANCE, keyed by their new-tree locations;
  anything beyond the three classes, in either direction, fails
  Verification 7. (`v3/README.md` uses new paths only — it may
  name the old layout solely inside its own `introduced`-listed
  history note, if it has one.)

Reconciliation is CONTENT-ANCHORED, not line-anchored (arm finding
F1-deep12: the amendment parentheticals INSERT lines, shifting every
later kept occurrence in the same file — a line-number key would
mispredict and fail falsely): a `kept` row matches when its exact
line CONTENT (byte-identical by definition of kept) exists in the
translated file; a `rewritten` row when its OLD content is absent
AND its PREDICTED NEW content is present — the frozen table records
both sides, computable in advance because every rewrite is
mechanical (arm finding F1-deep13: absence alone would bless a
deletion or a mistyped replacement); an `introduced` row when its
pre-stated content is present; per (path, token) occurrence COUNTS
close the census. Line numbers in the table are advisory locators
only.

The sweep script has a NAME and a HOME (arm finding F2-deep12):
`tools/v3-plan/adr015_sweep.py`, landing in the migration commit
beside the checkers it complements; run contract:
`--pre <parent-sha>` emits the table, `--post <migration-sha>`
reconciles against the frozen copy in the report; both read trees
via `git show`, never the working tree, so the audit is rerunnable
at any later commit.

The ADR itself, the report, and the gate records are self-excluded
BY LISTING (each named in the report with reason `self`), so their
own old-path mentions cannot hide a missed hit elsewhere. EVERY hit gets an explicit
disposition — rewritten (live pointer), kept verbatim (historical
fact, per the policy below), or kept (self-reference/coincidence) —
recorded in the migration's sweep report (committed alongside as
`v3/implementation/adr-015-migration-report.md`, the trace of what
changed to what).

The model tooling's REVERSE direction is a named edit site of its
own (arm finding F1-deep7 — no earlier round exercised it): after
the move, `extract.py`'s `HTML` input (`v3/model/core-model.html`)
lives INSIDE its `OUT` root (`v3/model`), so its guard message's
"remove model-src/ entirely first" re-bootstrap instruction — and
the same wording in `tools/v3-model/README.md` — would have the
operator delete the very input. The migration commit rewrites both
to enumerate the SOURCE ARTIFACTS (`sections/`, `units/`,
`records/`, `deltas/`, `code/`, `manifest.json`, `_prelude.html`,
`_postlude.html`) instead of the root, and Verification 11 exercises
the re-bootstrap for real.

One disposition sub-rule is decided HERE, not at execution (arm
finding F1-deep5, which exposed it as an undecided class colliding
with Verification 3): a PATH-SHAPED occurrence (contains a directory
separator or a repo-root anchor) is a POINTER — it resolves
somewhere, so it is rewritten (live) or kept (historical) per the
policies above. A BARE-BASENAME occurrence (e.g.
`model-src/sections/06-l0f.html`'s `<code>approach.md</code>`, the
todo/future-topic files' `approach.md` / `implementation-contract.md`
mentions) is a NAME: no file's basename changes in this migration,
so the mention stays a valid identifier, is KEPT byte-identical, and
is recorded in the report as `kept — name`. Names are therefore
never counted as broken pointers by any verification, and the
generated page's four-href diff pin in Verification 3 stands.

The name rule BIFURCATES once (arm finding F2-deep13, which showed
some basenames are LOCATION CLAIMS — "mechanics live in
`implementation-contract.md`", "moved to …" — that strand the
reader after the model/design split; this closes the round-5 ↔
round-13 oscillation): on MARKDOWN surfaces
(`core-model-todo.md`, `core-model-future-topic.md`), a basename
inside a location-claim phrase gains the minimal path qualifier,
COMPUTED by the Class B mechanics — resolve the target's new
absolute home, re-relativize from the CLAIMING file's new anchor —
never hand-written (arm finding F1-deep15: a hand-written
`design/implementation-contract.md` example in an earlier revision
of this very paragraph resolved to the nonexistent
`v3/model/design/…` from the moved file's anchor; the computed form
is `../design/implementation-contract.md`), recorded as
`rewritten — location claim` with its predicted new content in the
frozen table like every other rewrite; on BUILD-PINNED model-src bytes the
name rule stands unqualified — the generated page's four retargeted
hrefs are its navigational carriers, `v3/README.md` is the
orientation map, and model-content edits beyond path strings stay
outside this ADR's IC-N-declared minimal edit set.

Out-of-tree consumers updated in the same change: `AGENTS.md` (the V3
section header becomes "V3 Implementation Plane (`v3/`)"),
`.claude/skills/CreateTaskPacket/**`, `tools/v3-model/**`,
`tools/v3-plan/**`, `plans/feature-ideas-v3-triage.md`.

### The contracts' "NEVER moves" rule — a sanctioned one-time amendment

The contract-draft system carries a LIVE location-stability rule in
three places (`contract-draft-template.md`, the DraftContract
workflow, `process-v2-design.md`): "the file NEVER moves and row IDs
NEVER change (anchors stay resolvable forever)". A silent mechanical
path rewrite would leave that rule asserting "never moves" about
files this ADR just moved (arm finding F1-deep8). The rule's INTENT
is anchor resolvability — and `contract:chN-<surface>#Cn` anchors
resolve via the contracts DIRECTORY plus the filename pattern, never
via an absolute path, so relocating the HOME as a whole (filenames
and row IDs untouched) preserves every anchor; the checker alias
preserves resolvability against pre-migration commits. This ADR
therefore AMENDS the rule's letter, once, at all three sites: each
gains the parenthetical "(the contracts HOME was re-pinned once,
`docs/v3/implementation/contracts` → `v3/implementation/contracts`,
by ADR-015 — a relocation of the home as a whole, not of a file
within it; filenames and row IDs unchanged, anchors unaffected)".
The rule otherwise stands in full force; a future in-home file move
remains forbidden.

### Checker continuity — the legacy-path alias (arm finding F1)

`tools/v3-plan/check_packet.py` audits HISTORY against the CURRENT
path: D5 (`check_recorded_equality`) reads
`git show <recorded-commit>:<current rel path>` to prove a ratified
draft's C-rows unchanged, and P8 (`check_post_build`) reads the
packet's bytes at the pinned build commit the same way. Every
recorded commit predates this migration, so after the move both
lookups would fail LOUDLY on the new `v3/implementation/…` paths.

Decision: the checker learns ONE static alias — when
`git show <commit>:<rel>` fails and `rel` starts with
`v3/implementation/`, retry `docs/v3/implementation/` + remainder
(the pre-ADR-015 home); an error only if both fail. The alias
governs the WHOLE AUDIT FRAME, not just the read (arm finding F1r):
whichever rel succeeds becomes the frame's rel — P8's change-list
membership test (`rel in changed`), the `allowed` set seed, and the
`outside` computation all use IT, so a pre-migration build commit is
audited entirely in its own (old-path) coordinate system, where the
recorded `mutation_boundary` paths already live. A post-migration
commit resolves on the first try and never touches the alias — no
false positive for future packets. The alias is additionally BOUNDED
by ANCESTRY (deep arm finding F2-deep: an unbounded fallback could
false-green a future commit that deletes the new path and
reintroduces an old-path file; a first fix — a README-presence
sentinel — was itself REFUTED by arm round deep-3, which simulated a
future tree with the old README restored, the new one deleted, and
an old-path packet: sentinel true, P8 false-green): the legacy retry
is permitted ONLY when the audited commit is an ancestor of (or
equal to) the recorded `MIGRATION_PARENT` commit — the migration
commit's first parent, checked via
`git merge-base --is-ancestor <commit> <MIGRATION_PARENT>`. Ancestry
is exactly the pre-migration property: true for every commit the
history audits can legitimately reach, false for EVERY future
commit regardless of what its tree contains, and unforgeable
without rewriting published history. Outside the bound, a missing
new path stays the LOUD error it is today. Mechanically: the alias
logic ships with `MIGRATION_PARENT = None` (alias fully disabled)
in the hardening commit, where the selftest proves all three
polarities on synthetic repos (unset → never fires; ancestor →
fires; non-ancestor → loud error, via an injected cutoff); the
migration commit then sets the constant to its own parent's sha —
known at authoring time as the then-HEAD — as its only checker
edit besides the Class A path constants. The alias constant carries
a comment citing this ADR; the logic and its selftests land in the
HARDENING commit (Commit shape, commit 2), the pin in the migration
commit. No other tool reads history by path (`check_coverage.py` and
`tools/v3-model/*` read the working tree only — verified 2026-07-20).

Same hardening commit, one more guard (arm finding F1-deep2's
second half): today a MISSING packets/contracts directory yields an
EMPTY, exit-0 lint — zero packets checked reads as green. After a
path migration that is exactly the false-green shape (the checker
still pointed at the retired home would pass while checking
nothing), so the checker gains a loud guard: a nonexistent packets
or contracts directory is an ERROR, never an empty pass
(selftest-covered).

### Historical-record policy (refined per arm finding F4)

Two record classes, two treatments:

- **Live pointers** in built packets, the process log, ratified
  contract-drafts, and prior ADRs — references meant to RESOLVE NOW
  (links, "see X" pointers) — get the mechanical rewrite above, so
  they keep resolving.
- **Historical facts** stay byte-identical: machine data blocks whose
  paths describe bytes at a pinned commit (P8 `mutation_boundary`
  path lists in built packets), and chronicle lines that record what
  a past audit saw (e.g. the process log's 2026-07-17 boundary-audit
  entry naming the old plan path). Rewriting those would falsify the
  record; the checker alias above keeps them auditable against the
  commits they pin.

The class boundary is a DECISION PROCEDURE, not taste (deep arm
finding F3-deep: dual-purpose occurrences exist — e.g.
`ch11-p1-l1-authority.md`'s prose narrating that the old plan path
was edited in the recorded commit, lines from the same packet's
machine `mutation_boundary`): for each occurrence ask "does this
text RECORD THE PAST — bytes or events at a pinned commit, or a
narrated past state or decision even without a pin (arm round
deep-3: ADR-000 records a rejected former home with no commit sha —
still a historical fact) — or does it DIRECT THE READER to a
current surface?" The past is kept verbatim (where pinned, the
alias keeps it auditable); the directing pointer is rewritten. A
commit pin is SUFFICIENT for the historical class, not NECESSARY.
Prose adjacent to machine data inherits the machine data's answer
when it narrates the same commit.

DUAL-ROLE occurrences get a THIRD treatment (arm finding F2-deep7:
the process log's arm-pin entry BOTH narrates the past move — "the
pin's source of truth moved OUT of the skill into
`docs/v3/implementation/arm-pin.md`" — AND names the CURRENT
authority home; keeping it leaves a dead live-looking pointer,
rewriting it falsifies the narration): the historical path stays
verbatim and gains an inline annotation naming the new home —
`(now `v3/implementation/arm-pin.md` — ADR-015)`. The annotation is
visibly an addition, never a rewrite of the recorded words; each
annotated site is listed in the report as `annotated — dual role`.

EXCEPT in the process log (arm finding F4-deep9): the log is
APPEND-ONLY by its own README §7 rule, so it receives ZERO in-file
edits of any kind — every existing occurrence in it is kept
verbatim as historical (a log entry is by nature a dated record),
and the migration instead APPENDS one dated entry recording the
consolidation and the re-homed authorities (arm-pin included),
which is also the friction-log-conform "written home" for the
event. The inline-annotation treatment applies only on surfaces
without an append-only discipline.

The appended entry also CAPTURES (not fixes) one pre-existing
defect the review surfaced (arm finding F3-deep12): the
implementation README §2 quotes stale ledger inventory numbers
(158 units / 85 rejections / 121 entities; the ledger and the
coverage checker's plan-§1.4 guard agree on 159 / 54 / 122). The
defect predates this ADR and is a process-content fix, so the
mechanical-only discipline leaves the README's prose untouched
here; the capture routes it to the ch12 boundary per README §7's
capture-don't-fix rule. The migration
report lists EVERY `docs/v3` occurrence in built packets, the process
log, and ratified records — rewritten AND kept — each with its
disposition, so no judgment call is silent.

Recorded verdicts and recorded hashes are untouched in both classes:
an approve/basis sha256 describes the bytes that existed at that gate
and is never recomputed. This is link maintenance, not history
rewrite.

### Commit shape

Three commits, each leaving the tree green (the two-commit form was
revised by the USER's decision, 2026-07-21, after the test-coverage
review: the checker changes are a refactoring safety net and belong
BEFORE the refactor, independently tested — the checker's selftest
builds synthetic git fixtures, so every new behavior is provable on
the PRE-migration tree):

1. `docs(v3): ADR-015 v3 plane consolidation — RATIFIED` — this
   file WITH `Status: proposed` flipped to `accepted` and the index
   row updated to match, IN the same commit (arm finding F1-deep4:
   without the explicit flip, `check.sh` happily accepts a
   consistent `proposed` and the migration would execute under a
   non-effective ADR). The flip happens only upon the USER's
   explicit ratification — it is the ratifying act's byte form.
2. Checker hardening + its selftests — the missing-directory loud
   guard (a latent TODAY-bug fix: an empty lint currently passes
   green), the legacy-path alias with `MIGRATION_PARENT = None`
   (disabled) and all three cutoff polarities selftested on synthetic
   repos, and the reported-count surface the non-vacuity check reads.
   Green on the pre-migration tree; valuable even if the migration
   never ran.
3. The migration itself — all `git mv` moves + all reference rewrites
   (including the Class A path constants and the one-line
   `MIGRATION_PARENT` pin, set to this commit's parent sha) + the
   regenerated `core-model.html` + the new `v3/README.md` + the
   migration report + the sweep script
   (`tools/v3-plan/adr015_sweep.py`) + the appended process-log
   entry, in ONE commit so no intermediate commit has
   dangling paths. `git mv` preserves rename detection; the in-file
   path rewrites are small relative to file size, so similarity-based
   rename tracking holds.

`git mv` covers the 349 TRACKED files under `docs/v3` (measured
2026-07-20); the one untracked, globally-ignored `docs/v3/.DS_Store`
(arm finding F6) is deleted with plain `rm` when the emptied tree is
removed — nothing tracked is deleted outside the moves.

Timing: executed between packets — ch12-P0 is built and closed,
ch12-P1 is not yet authored — so no in-flight packet anchors to a
moving path. Session-memory files (outside the repo) are updated
after the migration lands.

This timing is a NAMED ONE-TIME EXCEPTION to the chapter-boundary
rhythm (arm finding F2-deep9: README §7's "no process edits
mid-chapter unless the issue blocks" and the skill's
boundary-only-amendment rule would otherwise defer this to the ch12
close), sanctioned explicitly by the ratifying act. Grounds: (a) the
quiet window is real — no in-flight packet, ch12-P1 unauthored,
`.pairflow/bubbles` empty (arm-verified in five consecutive rounds);
(b) waiting means authoring ch12-P1..P4 — four packets of new
anchors, gate records, and plan rows — onto paths already decided to
die, a strictly larger rewrite surface at the later boundary; (c)
the process surfaces move BYTE-STABLE except for the enumerated
path/label edits, so no process MEANING changes mid-chapter. The
ratifier accepts this exception by flipping the status; if the
ratifier disagrees, the alternative is deferral to the ch12 close
with this ADR staying `proposed`.

One moved file is WRITE-ONCE (arm finding F3-deep9):
`model-tier-experiment.md` is a RATIFIED pre-registration whose own
header voids it on "any other edit". Its relocation is a pure
`git mv` with ZERO in-file changes — measured 2026-07-21: the file
contains no `docs/v3` string — and a HOME change is not an edit
under its clause (which governs content; its §7/§8 append rights
are unaffected). Verification 8 asserts this mechanically: the
file's git BLOB HASH after the migration equals its blob hash
before it.

## Alternatives Considered

- **Status quo** (docs stay in `docs/v3`): rejected — the boundary
  splits model from code, and the phase names keep misfiling new
  content.
- **`v3/docs/{model,design,implementation}`** (one docs wrapper under
  the package): rejected — `model/` is not documentation (source of
  truth + build input), and the extra level deepens every path
  without adding a distinction the planes don't already make.
- **Also re-cutting `implementation/` internals** (process rules vs
  live production state): rejected for now — highest reference
  density, lowest payoff; can be its own ADR if the mixing ever
  hurts.
- **Moving code under `docs/`** (inverse merge): not seriously
  entertained; a package with docs is normal, docs with a package is
  not.

## IC-N Screen (mandatory)

No. This is repository topology for documentation and model-corpus
files; it touches no kernel shape (no replay, no leader-per-shard, no
event-sourcing-as-truth, no reconciler/outbox). No model meaning
changes: every model-plane byte moves verbatim (`git mv`), the only
in-file edits are path strings, so the model↔code divergence stop is
not implicated.

## Consequences

Positive: one root for the whole v3 effort; role-based names that
tell a newcomer (or an agent bootstrapping from repo surfaces alone)
what each surface IS; the model sits next to the code it locks; the
eventual "v3 becomes pairflow" transition moves one tree, not two.

Negative: one-time churn across ~50 files; external references to old
paths (session memory, any open browser tabs onto `core-model.html`)
go stale; `git log --follow` is needed to trace a moved file's
pre-move history casually.

Neutral: the `docs(v3)` commit scope is unchanged (it names the
plane, not the path). The root `docs/` keeps its non-v3 content.

## Verification

After the migration commit, all of the following must hold:

1. `pnpm v3:adr-check`, `pnpm v3:packet-lint`, `pnpm v3:coverage` —
   green AND NON-VACUOUS (arm finding F1-deep2): the CHECKER-REPORTED
   counts equal the pre-migration baseline, re-measured at execution
   from the checkers' own output, never from `ls` (arm finding
   F3-deep3: a directory listing counts `packets/README.md`, which
   the lint excludes — the correct 2026-07-21 baseline is 29 packets,
   13 v2 + 16 grandfathered, and 3 contracts) — an empty green run is
   a FAIL; `check_packet.py --selftest` covers the legacy-path alias
   (all three cutoff polarities) and the missing-directory guard.
2. HISTORY AUDIT PROOF (the F1 fix, exercised for real): a D5
   equality check on a pre-migration ratification commit (e.g. the
   `ch12-runtime-core` draft's recorded commit) and a `--post-build`
   rerun on a pre-migration build commit (e.g. ch12-P0's) both pass
   THROUGH the alias.
3. `tools/v3-model/check.sh` green, and `build.py` regenerates
   `v3/model/core-model.html` with no diff beyond the enumerated
   Class B href retargets (four occurrences, three unique targets);
   the manifest's `html` path change appears in `manifest.json` only.
4. `pnpm v3:typecheck && pnpm v3:lint && pnpm v3:test` — green
   (guards against an accidental code-plane touch).
5. `grep -rn "docs/v3" --exclude-dir=node_modules
   --exclude-dir=.pairflow --exclude-dir=__pycache__
   --exclude-dir=.git` (evidence logs, bytecode, and git internals
   are point-in-time artifacts, not pointers — arm findings F5/F5r)
   returns ONLY: this ADR + the migration report, the checker alias
   constant, and the kept-verbatim historical facts — each already
   enumerated in the migration report; zero live pointers.
6. A pointer sweep over the moved trees PLUS the files the
   migration itself creates — `v3/README.md` and the migration
   report (arm finding F3-deep7: a typo in the new bootstrap map
   would otherwise pass every listed check) — PLUS the out-of-tree
   authority surfaces `AGENTS.md` and
   `.claude/skills/CreateTaskPacket/**` (arm finding F1-deep13:
   AGENTS.md is the critical bootstrap surface and was outside every
   sweep; its references are repo-root-anchored, checked for
   existence): every relative Markdown link AND HTML `href`/`src` in
   `v3/model`, `v3/design`, `v3/implementation`, `v3/README.md`
   resolves to an existing file (HTML resolved from the generated
   page's anchor), and every root-anchored path named in AGENTS.md
   and the skill files points at an existing file or directory,
   EXCEPT pointers already broken before the migration (listed as
   such in the report). For the retargeted Class B links (63 at the
   current measure), existence is NOT enough (arm finding F2-deep14:
   a link consistently rewritten to a WRONG but existing file would
   pass): the sweep asserts TARGET IDENTITY — the committed new
   link, resolved from its new anchor, must equal the mapping-table
   image of what the old link resolved to from its old anchor, both
   sides recomputed independently at verification time.
7. The Class C sweep reconciles in BOTH directions (arm findings
   F2-deep8, F1-deep10, F1-deep11): the PRE-sweep table (frozen in
   the report, keyed on the migration parent's tree) covers every
   hit with a disposition, and the POST-sweep on the migration
   commit returns exactly the predicted residue through the key
   translation — `kept`/`annotated` rows present, `rewritten` rows
   absent, `introduced` rows present at their pre-enumerated
   new-tree keys, nothing beyond the three classes; the
   self-excluded files (this ADR, the report, the gate records) are
   listed with reason `self`.
8. WRITE-ONCE BLOB IDENTITY (arm finding F3-deep9):
   `git rev-parse <migration-commit>:v3/implementation/model-tier-experiment.md`
   equals
   `git rev-parse <migration-parent>:docs/v3/implementation/model-tier-experiment.md`
   — the pre-registration moved without a single byte changing.
9. FILE CENSUS (arm finding F1-deep13: nothing else proves every
   mapped file ARRIVED — a 3 952-line study with no sweep token and
   only bare-basename incoming references could silently vanish
   while every other gate stays green): comparing
   `git ls-files` at the migration commit vs its parent, every one
   of the mapped tracked files (349 at the 2026-07-21 measurement;
   re-measured at execution) is absent at its old path and present
   at its mapped new path, `docs/v3` holds zero tracked files, and
   the only additions are the enumerated new artifacts
   (`v3/README.md`, the report, the sweep script); total tracked
   count moves by exactly the additions. The census is
   CONTENT-BEARING (arm finding F1-deep14: path presence alone
   blesses a moved-but-emptied file): in
   `git diff -M100% --name-status <parent>..<migration>`, every
   mapped file with NO planned in-file edit appears as an EXACT
   rename (R100 — blob-identical), and every file WITH planned
   edits shows a diff containing ONLY lines the frozen table
   predicts (its Class A/B/C rewrites, label-lockstep edits, or
   amendments) — any other content change, including truncation,
   fails the gate.
10. FULL CI (arm finding F4-deep12: the v3 bridges alone leave the
   root suite unproven while the migration touches root-level
   surfaces — AGENTS.md, `tools/`, `.claude/skills/`, `plans/`):
   `pnpm ci:local` runs GREEN at each of the three commits, per the
   AGENTS.md chapter-DoD authority.
11. RE-BOOTSTRAP PROOF (arm finding F1-deep7): in a scratch clone of
   the migration commit, delete the enumerated source artifacts
   under `v3/model/`, run `extract.py`, then `build.py` — the
   REGENERATED HTML must be byte-identical to the committed
   `core-model.html`, and `core-model.html` itself must have
   survived the deletion step untouched. (Not the full source tree:
   `extract.py` is the pre-phase-2 bootstrapper by design — it
   cannot and need not reproduce the unit-delta decomposition; its
   own `deltas/` guard already says so.) This proves the reverse
   direction's INPUT survived the collapse of the html and the
   source tree into one root.

## External-arm gate record (pre-ratification review)

Arm run 2026-07-20 per ReviewPacket §6 mechanics on the proposed ADR
(basis `2239b253…58c6c0` at HEAD `d3c99106`): pin `gpt-5.6-sol` /
effort `high` / approval `never` (output-header verified), session
`019f8159-e50c-7263-a6b1-0e78e28a2214`, exit 0, byte guard clean
before and after. VERDICT: FINDINGS — F1 BLOCKER (D5/P8 history
audits break on moved paths → the checker alias section), F2 BLOCKER
(non-link authority pointers uncovered → Class C), F3 MAJOR (63
relative links need general retargeting → Class B), F4 MAJOR
("semantic content untouched" was false for machine audit data → the
refined two-class historical-record policy), F5 MINOR (residual grep
needed evidence/bytecode excludes → Verification 5), F6 MINOR
(untracked `.DS_Store` had no destination → Commit shape). All six
folded into this revision; the re-check runs are recorded below.

Re-check run 2026-07-20 (same pin, output-header verified; session
`019f8163-ae3e-7271-9da0-9edad7feef07`, exit 0, byte guard clean
before and after) on the folded revision (basis `05510b3e…82f57f9`):
VERDICT: FINDINGS — F1r BLOCKER (the alias read alone is not enough:
P8's change-list membership, `allowed` seed, and `outside` math still
used the new rel → the alias now governs the whole audit frame),
F2r MAJOR (model-src HTML hrefs uncovered by Class B/C → Class B
extended to HTML `href`/`src`, the three hrefs enumerated), F5r MINOR
(`.git` exclude added to Verification 5). The arm confirmed F3, F4,
F6 adequately closed. All three folded into this revision.

Confirmation run 2026-07-20 (same pin, output-header verified;
session `019f816c-1c46-77c3-a3f4-3cd880d2b743`, exit 0, byte guard
clean before and after) on basis `d63d2599…f3b0756b`: VERDICT:
FINDINGS — one MINOR only (the regenerated page's diff carries the
href retargets alone; the manifest `html` path changes in
`manifest.json`, which `build.py` never emits into the page — a
precision fix to the Class B paragraph and Verification 3, folded).
No BLOCKER or MAJOR; the F1r/F2r/F5r folds were confirmed adequate.

Deep run 2026-07-20/21 (user-directed extra round; model per pin,
effort raised to `xhigh` by the USER's explicit decision for this
run only — a recorded deviation from the standing `high` pin, not a
pin revision; output-header verified; session
`019f817a-8219-7c80-bb01-75f1402130c8`, exit 0, ~17 min wall clock
(23:41→23:59, file-timestamp-verified; an earlier "~66 min" figure
recorded here was an unverified estimate — corrected),
byte guard clean before and after) on basis `86aeff93…60ea683`,
prompted WITHOUT the prior findings (anti-anchoring) and with a full
8-item attack program: VERDICT: FINDINGS — F1-deep BLOCKER (the
six-token Class C list missed 24 of 95 resolving inline pointers —
bare sibling basenames, code-plane comments; → derived token set +
repo-wide scope), F2-deep BLOCKER (the unbounded alias could
false-green a future old-path reintroduction → the sentinel bound),
F3-deep MAJOR (dual-purpose prose adjacent to machine data had no
deterministic disposition → the decision procedure + full occurrence
enumeration). The arm also positively verified: the model build's
byte-stability and exact four-href migration diff, unique mapping of
all 349 tracked files with ≥99.5% rename similarity, and the
no-in-flight-packet timing claim. One evidence citation was
misattributed (a real `model-src` mention, wrong ADR filename) —
corrected during fold verification; the finding itself stood. All
three folded.

Deep run 2, 2026-07-21 (user-directed xhigh loop — the standing
instruction: repeat fresh anti-anchoring xhigh rounds until one
returns clean; same pin/effort, output-header verified; session
`019f8190-ebba-7071-a489-2ec81ed83dae`, exit 0, ~14 min wall clock,
byte guard clean before and after) on basis `a9988b1f…f4c0a28`:
VERDICT: FINDINGS — one BLOCKER (F1-deep2: `check_packet.py` builds
its default dirs SEGMENT-WISE — `REPO_ROOT / "docs" / "v3" / …` —
invisible to a literal Class A grep, AND a missing directory lints
EMPTY with exit 0, so post-migration the packet/contract surface
could silently vanish from verification while everything stayed
green → Class A extended with named segment-wise edit sites, the
missing-directory loud guard, and the non-vacuous count baseline in
Verification 1). The run also positively verified the model build,
the historical-occurrence dispositions, the authority chain, git
mechanics, and timing. Folded.

Deep run 3, 2026-07-21 (same loop, pin/effort verified; session
`019f819f-1993-7ac3-b9f7-8b6542901970`, exit 0, ~23 min, byte guard
clean before and after) on basis `88fe1738…13de66dc`: VERDICT:
FINDINGS — F1-deep3 BLOCKER (the README sentinel introduced for
F2-deep was REFUTED by simulation: a future tree with the old README
restored, the new one deleted, and an old-path packet reads
sentinel-true and P8 false-green → replaced by the ancestry bound on
`MIGRATION_PARENT`), F2-deep3 MAJOR (past-tense path statements
without a commit pin — e.g. ADR-000's rejected former home — fit
neither record class → the decision procedure now treats a pin as
sufficient, not necessary), F3-deep3 MINOR (the count baseline said
30 but the lint excludes `packets/README.md` — corrected to
checker-reported counts: 29 packets = 13 v2 + 16 grandfathered, 3
contracts). Between rounds 2 and 3 the USER also revised the commit
shape to three commits (checker hardening + selftests BEFORE the
migration, as a refactoring safety net) after reviewing the
checker's test coverage; folded together with this round. The run
positively verified: inventory completeness (349 tracked + 1 ignored
`.DS_Store`), the model build (four href occurrences, ledger
hash-identical), the authority chain, git mechanics (rename
similarity, prunable stale worktree), and timing (`.pairflow/bubbles`
empty, ch12-P1 unauthored).

Deep run 4, 2026-07-21 (same loop, pin/effort verified; session
`019f81b6-98ed-7300-8586-c542047fd8f8`, exit 0, ~19 min, byte guard
clean before and after) on basis `8d78e642…ce2a9bd1`: VERDICT:
FINDINGS — NO blocker; one MAJOR (F1-deep4: the ratifying commit did
not prescribe the `proposed → accepted` status flip, so the
migration could execute under a non-effective ADR → the flip is now
the ratifying commit's explicit content). The run positively
verified, among others, the ancestry-alias design END-TO-END on real
commits (D5 on the ch12 draft's ratification commit `d57a437f`, P8
on ch12-P0's build commit `ddd67d70` — both resolve in a consistent
old-path frame; a future commit is not an ancestor, so the alias
cannot activate) plus inventory, model build, historical
dispositions, git mechanics, and timing. Folded.

Deep run 5, 2026-07-21 (same loop, pin/effort verified; session
`019f81c8-df99-7662-8b8e-2afdfccf0559`, exit 0, ~18 min, byte guard
clean before and after) on basis `1325978c…b7bc1c9a`: VERDICT:
FINDINGS — one BLOCKER (F1-deep5: `model-src/sections/06-l0f.html`'s
`<code>approach.md</code>` was an UNDECIDED occurrence class — as a
forced rewrite it would be a fifth generated-HTML change colliding
with Verification 3's four-occurrence pin, as a skip an unrecorded
judgment call). Adjudicated at fold: the occurrence is not an href —
grep re-measurement confirms exactly FOUR resolvable hrefs — so the
gap was the missing rule, closed by the path-shaped-vs-bare-basename
disposition sub-rule (a bare basename is a NAME, kept, `kept — name`
in the report; basenames are invariant under this migration).
Verification 3's pin stands. The run also positively verified: the
Markdown sweep (192 resolving pointers → 63 retargets, 0 new breaks,
19 pre-existing breaks unchanged), the alias end-to-end (ch12-P0 P8
audit `0 error(s)` through the old-path frame), the three-commit
greenness, the authority chain, and timing.

Deep run 6, 2026-07-21 (same loop, pin/effort verified; session
`019f81da-aebb-7a11-a204-d6658ed02401`, exit 0, ~19 min, byte guard
clean before and after) on basis `78b26cb8…fc7980bd`: VERDICT:
FINDINGS — NO blocker; one MAJOR (F1-deep6: a link whose LABEL is
the literal old path and carries no retired token — `plan.md`'s ADR
template link — would keep a visibly wrong label while every check
stays green → the Class B label-lockstep rule). The run positively
verified the checker alias at full depth (D5: 27/27 identical C-rows
from the ratification commit; P8: all 8 boundary files at ch12-P0's
build commit), the byte-identical model rebuild with exactly four
href changes, the historical dispositions, the three-commit
greenness, and timing.

Deep run 7, 2026-07-21 (same loop, pin/effort verified; session
`019f81ec-ed66-77a2-a362-23910bd58a23`, exit 0, ~19 min, byte guard
clean before and after) on basis `07deae98…b14be48e`: VERDICT:
FINDINGS — NO blocker; two MAJOR + one MINOR, all closed in this
revision: F1-deep7 (the model tooling's REVERSE direction —
`extract.py`'s input collapses into its own output root, and the
"remove model-src/ entirely" re-bootstrap instruction would delete
the input → enumerated-artifact rewording + the Verification 8
re-bootstrap proof, scoped to what the pre-phase-2 bootstrapper
actually promises), F2-deep7 (a dual-role process-log occurrence
narrating a past move AND naming the current authority home →
the third, ANNOTATED treatment: verbatim history + `(now …)`
addition), F3-deep7 (the new `v3/README.md`'s own pointers were
outside the sweep → added to Verification 6). The run positively
verified: the full independent inventory (349/349 unique, 159
`docs/v3` occurrences in 57 files, 211 relative pointers → 63
retargets, 19 pre-broken), the alias end-to-end with numbers
(D5 27/27 rows, P8 8/8 boundary files), rename mechanics, and
timing.

Deep run 8, 2026-07-21 (same loop, pin/effort verified; session
`019f81ff-ffba-72c3-ba65-71162f0b9ddb`, exit 0, ~19 min, byte guard
clean before and after) on basis `86e15c0f…35354467`: VERDICT:
FINDINGS — NO blocker; two MAJOR, both closed in this revision:
F1-deep8 (the contract system's live "the file NEVER moves" rule
would survive a silent path rewrite as a false statement → the
sanctioned one-time home-re-pin amendment at its three sites,
grounded in the rule's intent: anchors resolve directory-relative
and stay intact), F2-deep8 (the every-basename token sweep was
undecidable — 262 tokens, 3 092 line hits — → the two-tier
machine-checkable sweep: retired-name tokens repo-wide + relative
fragments in moved trees, script-emitted `path:line:token` keys
reconciled against the report, basenames dispositioned as a class by
the name rule, self-exclusion by listing). The run positively
verified the alias frame (27/27, 8/8), the four-href model diff, the
historical dispositions incl. dual-role, rename mechanics, and
timing.

Deep run 9, 2026-07-21 (same loop, pin/effort verified; session
`019f8213-703a-7cc0-b779-13d6ab55a785`, exit 0, ~26 min, byte guard
clean before and after) on basis `defdabd8…4cbeabbc`: VERDICT:
FINDINGS — F1-deep9 BLOCKER (bare subtree-prefixed inline paths —
`topics/…`, `research/…` with no prefix and no retired token, 10
measured hits → the third sweep tier), F2-deep9 MAJOR (the
mid-chapter timing lacked a sanctioned exception to README §7's
capture-don't-fix and the skill's boundary-only-amendment rule → the
NAMED ONE-TIME EXCEPTION the ratifier explicitly accepts, with the
deferral alternative stated), F3-deep9 MAJOR (the write-once
model-tier pre-registration had no disposition → pure `git mv`,
zero in-file bytes, Verification 8 blob-identity proof), F4-deep9
MINOR (in-place annotation contradicted the log's append-only rule →
the process log gets ZERO in-file edits; the migration APPENDS one
dated entry instead). The run positively verified the alias frame
(27/27, 8/8), the model rebuild (no other URL-bearing attribute or
CSS `url()` exists), and the 349-move mapping.

Deep run 10, 2026-07-21 (same loop, pin/effort verified; session
`019f822d-ab40-73c3-84d3-b327c8a06060`, exit 0, ~22 min, byte guard
clean before and after) on basis `e9555d40…ac22e836`: VERDICT:
FINDINGS — both against the round-8-born sweep mechanics, both
closed in this revision: F1-deep10 BLOCKER (a single post-migration
sweep is irreproducible — rewritten keys vanish, moved paths change
keys → the two-run PRE/POST design with key translation and exact
residue prediction), F2-deep10 MAJOR (the bare `convergence` token
matches 1 266 tracked occurrences of ordinary prose, and the
filesystem scope depended on ignored `dist/` artifacts → path-shaped
context only, tracked-files scope). The run positively verified: the
alias frame (27/27, 8/8), the model rebuild with the predicted
four-line diff (post-migration page sha256 `967d2a97…3f680087`), the
historical dispositions, the authority chain, the 349-move mapping,
and timing.

Deep run 11, 2026-07-21 (same loop, pin/effort verified; session
`019f8242-f663-7503-a15f-e58b9b1fd282`, exit 0, ~21 min, byte guard
clean before and after) on basis `a929043c…8b82a68a`: VERDICT:
FINDINGS — F1-deep11 BLOCKER (a self-consistency catch: the "NEVER
moves" amendment text itself INTRODUCES three new `docs/v3`
occurrences, which the two-run sweep's "nothing new" rule would
flag — executing the plan exactly would fail its own Verification 7
→ the third residue class, `introduced`, pre-enumerated in the
frozen table), F2-deep11 MINOR (the Python/shell census line said
21; the current `git grep` measure is 26 lines → corrected with
method stated). The run positively verified: the alias frame (27/27,
8/8, no future-commit aliasing), the model rebuild (four predicted
href lines only), the authority chain, the mapping (lowest simulated
rename similarity 93.3%), the write-once blob move, and timing.

Deep run 12, 2026-07-21 (same loop, pin/effort verified; session
`019f8257-2ce9-7a10-b968-2f654552ae7f`, exit 0, ~21 min, byte guard
clean before and after) on basis `3f46a411…8ab3ca37`: VERDICT:
FINDINGS — NO blocker; four MAJOR, all closed in this revision:
F1-deep12 (line-number keys break when the amendments insert lines →
content-anchored reconciliation with advisory line numbers),
F2-deep12 (the sweep script had no name, home, or run contract →
`tools/v3-plan/adr015_sweep.py`, `--pre`/`--post` via `git show`,
added to the migration artifact list), F3-deep12 (the README's stale
ledger inventory — 158/85/121 vs the actual 159/54/122 — is a
PRE-EXISTING defect; per the mechanical-only discipline it is
CAPTURED in the appended log entry and routed to the ch12 boundary,
not fixed here), F4-deep12 (the gates omitted the full root suite →
`pnpm ci:local` green at each of the three commits, Verification 9).
The run positively verified: the inventory (118 tracked `docs/v3`
hits all classifiable), the alias frame (27/27, 8/8), the model
build, the historical policy, and timing.

Deep run 13, 2026-07-21 (same loop, pin/effort verified; session
`019f826c-a6fa-71c1-b0ee-b0841ca46487`, exit 0, ~20 min, byte guard
clean before and after) on basis `07ce0faf…97a803b9`: VERDICT:
FINDINGS — F1-deep13 BLOCKER (the gates proved ABSENCE, not
presence: a mistyped or deleted replacement passed, no gate proved
all 349 files arrived, and AGENTS.md sat outside every sweep → the
frozen table now records predicted NEW content for every rewritten
row, the FILE CENSUS became Verification 9, and AGENTS.md + the
skill joined the pointer sweep), F2-deep13 MAJOR (some bare
basenames are LOCATION CLAIMS — "lives in", "moved to" — stranding
the reader after the split → the name rule bifurcates: markdown
location-claims gain the minimal path qualifier; build-pinned
model-src keeps names, its retargeted hrefs being the navigational
carriers — closing the round-5 ↔ round-13 oscillation). The run
positively verified: the alias frame, the historical policy incl.
dual-role handling, the three-commit shape (no case-fold
collisions, all regular files), and timing.

Deep run 14, 2026-07-21 (same loop, pin/effort verified; session
`019f8280-8779-7520-89f8-192b0f644daa`, exit 0, ~20 min, byte guard
clean before and after) on basis `29f41e8c…e21f3b08`: VERDICT:
FINDINGS — F1-deep14 BLOCKER (the census proved path presence, not
content: an emptied or truncated moved file passed every gate → the
content-bearing census via `git diff -M100%`: unedited files must be
EXACT renames, edited files' diffs must contain only
frozen-table-predicted lines), F2-deep14 MAJOR (link existence did
not prove target identity — a consistently wrong retarget to an
existing file passed → the Class B sweep asserts target identity,
both sides recomputed independently). The run's checked-and-holds
list was the fullest yet: full inventory (118 lines / 56 files
literal consumers; 211 pointers, no fourth reference class found),
the alias frame incl. a real non-ancestor rejection test, the model
build, the historical policy, the authority chain end-to-end, git
mechanics, and timing.

Deep run 15, 2026-07-21 (same loop, pin/effort verified; session
`019f8294-1b1b-7e13-a526-3294dd9fdef3`, exit 0, ~16 min, byte guard
clean before and after) on basis `2378c618…2ff483e8`: VERDICT:
FINDINGS — a SINGLE finding, F1-deep15 BLOCKER: the round-13
location-claim fold's hand-written qualifier example resolved to a
nonexistent path from the moved file's anchor (`design/…` instead of
`../design/…`), and no gate would have caught the new wrong path →
qualifiers are now COMPUTED by the Class B mechanics, never
hand-written, with predicted content in the frozen table. Everything
else held: the alias (27/27, 8/8, non-ancestor rejected), the
historical policy incl. dual-role log handling, the full mapping (no
symlinks or special modes), the three-commit staging, and timing.

Deep run 16, 2026-07-21 (same loop, pin/effort verified; session
`019f82a3-84ad-7d52-8c13-0480a0234551`, exit 0, ~20 min, byte guard
clean before and after) on basis `ead55466…3bbd8558`: VERDICT:
**APPROVE** — zero findings; the full eight-item attack program
returned checked-and-holds only: injective 349-file mapping with
non-vacuous gates, no fourth reference class, the alias frame on
real commits (27/27, 8/8, future commits excluded by ancestry), the
model rebuild byte-identical with the predicted four-href migration
diff (post-page sha256 `967d2a97…3f680087`) and the reverse
bootstrap's input preserved, every sampled occurrence classifiable
under the live/historical/dual-role policy, the authority chain
resolving end-to-end incl. the three "NEVER moves" sites, git
mechanics coherent, and the timing window quiet. The xhigh loop
(the user's standing instruction: fresh anti-anchoring rounds until
one returns clean) closed at sixteen runs. The APPROVE covers basis
`ead55466…3bbd8558`; the sole subsequent edit is this gate-record
entry itself, frozen by the ratifying commit.

## Related

ADR-001 (code home / package topology — amended, not superseded);
`v3/design/design-method-playbook.md` §8 (model-plane routing,
unchanged); `v3/design/implementation-contract.md` PI-10 (ADR
activation, unchanged); `v3/implementation/README.md` §1 (its "what
lives here" list is updated by the migration commit).
