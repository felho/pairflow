# ADR-015 migration report — the reference-census trace

Companion artifact of the ADR-015 migration commit (`docs/v3/` →
`v3/{model,design,implementation}`). This file is the frozen,
machine-read half of the two-run Class C sweep
(`tools/v3-plan/adr015_sweep.py`) and the human-readable trace of
what changed to what. It is SELF-EXCLUDED from its own sweep by the
listing below — its old-path mentions are the census itself.

- ADR: `../adr/ADR-015-v3-plane-consolidation.md` (Status: accepted, 2026-07-21).
- Migration parent (`MIGRATION_PARENT`): `3446e48e1b130834e7122cac2335b371bafa8d7f`.
- Executed: 2026-07-21, between packets (ch12-P0 closed, ch12-P1 unauthored) —
  the ADR's named one-time timing exception, sanctioned by the ratifying act.

## Mapping (old → new; every move a `git mv`; 349 tracked files)

| Old | New |
|---|---|
| `docs/v3/convergence/model-src/` | `v3/model/` |
| `docs/v3/convergence/core-model.html` | `v3/model/core-model.html` |
| `docs/v3/convergence/core-model-todo.md` | `v3/model/core-model-todo.md` |
| `docs/v3/convergence/core-model-future-topic.md` | `v3/model/core-model-future-topic.md` |
| `docs/v3/convergence/approach.md` | `v3/design/approach.md` |
| `docs/v3/convergence/design-method-playbook.md` | `v3/design/design-method-playbook.md` |
| `docs/v3/convergence/implementation-contract.md` | `v3/design/implementation-contract.md` |
| `docs/v3/research/` | `v3/design/research/` |
| `docs/v3/topics/` | `v3/design/topics/` |
| `docs/v3/concept-braindump.md` | `v3/design/concept-braindump.md` |
| `docs/v3/test-workflows.md` | `v3/design/test-workflows.md` |
| `docs/v3/implementation/` | `v3/implementation/` |

The one untracked, globally-ignored `docs/v3/.DS_Store` was deleted
with plain `rm`; nothing tracked was deleted outside the moves.

## Census summary

- 753 sweep-table rows (keys `old-path:line:token`), every one dispositioned:
  - `rewritten`: 426
  - `kept — coincidence`: 119
  - `kept — self`: 85
  - `kept — historical`: 70
  - `kept — resolution preserved`: 30
  - `introduced`: 8
  - `kept — not a repo pointer`: 7
  - `kept — alias machinery`: 5
  - `kept — name`: 3
- 218 line edits across 69 files, plus the appended
  process-log entry — 70 changed files in all; a further
  31 files passed the mechanical rewrite pipeline unchanged
  (Class A prefix rewrites, Class B computed retargets incl. the four
  HTML href occurrences and the label-lockstep rule, Class C named
  edit sites, the three "NEVER moves" amendments, the
  `MIGRATION_PARENT` pin, and the segment-wise checker constants).
- Historical records untouched: the process log (append-only; one
  appended entry, zero in-file edits), `flip-claims.md`,
  `autonomy-realignment.md`, `ch11-model-sync-delta.md`, built
  packets' machine boundary data and build-commit narration, ratified
  contract-drafts' Sources prose, and every recorded verdict/hash.

## Self-excluded files (reason: `self`)

| File | Why |
|---|---|
| `v3/adr/ADR-015-v3-plane-consolidation.md` | the deciding ADR (incl. its gate records): its old-path mentions ARE the decision text |
| `v3/implementation/adr-015-migration-report.md` | this report: the census itself |
| `tools/v3-plan/adr015_sweep.py` | the sweep tool: its mapping table necessarily names the old homes |

## Pre-existing broken pointers (left byte-identical)

Pointers that did not resolve BEFORE the migration are not silently
"fixed"; each is listed (path:line → target). All are upstream-repo
relative paths quoted inside the BitSafe capture study, plus one
`agent://` scheme example:

- `docs/v3/research/bitsafe-ai-os-capture.md:2872` → `02-architecture.md`
- `docs/v3/research/bitsafe-ai-os-capture.md:2873` → `04-substrate.md`
- `docs/v3/research/bitsafe-ai-os-capture.md:2874` → `05-working-with-nanoclaw.md`
- `docs/v3/research/bitsafe-ai-os-capture.md:2875` → `06-cost-discipline.md`
- `docs/v3/research/bitsafe-ai-os-capture.md:2983` → `02-architecture.md`
- `docs/v3/research/bitsafe-ai-os-capture.md:2984` → `03-autonomous-engine.md`
- `docs/v3/research/bitsafe-ai-os-capture.md:2985` → `05-working-with-nanoclaw.md`
- `docs/v3/research/bitsafe-ai-os-capture.md:2986` → `07-monitors-and-alerts.md`
- `docs/v3/research/bitsafe-ai-os-capture.md:3473` → `docs/articles/01-company-wide-ai-assistant.md`
- `docs/v3/research/bitsafe-ai-os-capture.md:3474` → `docs/articles/02-architecture.md`
- `docs/v3/research/bitsafe-ai-os-capture.md:3475` → `docs/articles/03-autonomous-engine.md`
- `docs/v3/research/bitsafe-ai-os-capture.md:3476` → `docs/articles/04-substrate.md`
- `docs/v3/research/bitsafe-ai-os-capture.md:3477` → `docs/articles/05-working-with-nanoclaw.md`
- `docs/v3/research/bitsafe-ai-os-capture.md:3478` → `docs/articles/06-cost-discipline.md`
- `docs/v3/research/bitsafe-ai-os-capture.md:3479` → `docs/articles/07-monitors-and-alerts.md`
- `docs/v3/research/bitsafe-ai-os-capture.md:3480` → `docs/articles/08-capability-coverage-and-harness-guards.md`
- `docs/v3/research/bitsafe-ai-os-capture.md:3490` → `docs/specs/code-factory-mvp-spec.md`
- `docs/v3/research/bitsafe-ai-os-capture.md:3500` → `LICENSE-DOCS`
- `docs/v3/research/bitsafe-ai-os-capture.md:3501` → `LICENSE`
- `docs/v3/research/paperclip-study.md:416` → `agent://<id>`

## Label-lockstep rewrites (arm finding F1-deep6)

Links whose visible label was the (path-shaped) old target; label and
target rewritten IN LOCKSTEP:

- `docs/v3/convergence/approach.md:10`: label ``core-model.html`` → ``../model/core-model.html``
- `docs/v3/convergence/approach.md:11`: label ``../concept-braindump.md`` → ``concept-braindump.md``
- `docs/v3/convergence/approach.md:12`: label ``../test-workflows.md`` → ``test-workflows.md``
- `docs/v3/convergence/approach.md:755`: label ``../topics/_open-kernel-primitives.md`` → ``topics/_open-kernel-primitives.md``
- `docs/v3/convergence/approach.md:824`: label ``../topics/_closed-v1-operability.md`` → ``topics/_closed-v1-operability.md``
- `docs/v3/convergence/approach.md:920`: label ``../topics/_open-private-data-boundary-vs-federation.md`` → ``topics/_open-private-data-boundary-vs-federation.md``
- `docs/v3/convergence/approach.md:957`: label ``core-model-future-topic.md`` → ``../model/core-model-future-topic.md``
- `docs/v3/convergence/approach.md:1021`: label ``core-model-future-topic.md`` → ``../model/core-model-future-topic.md``
- `docs/v3/convergence/core-model-future-topic.md:180`: label ``../topics/_open-agent-runtime-and-pane-layout.md`` → ``../design/topics/_open-agent-runtime-and-pane-layout.md``
- `docs/v3/convergence/core-model-future-topic.md:1511`: label ``../topics/_open-private-data-boundary-vs-federation.md`` → ``../design/topics/_open-private-data-boundary-vs-federation.md``
- `docs/v3/convergence/core-model-todo.md:8`: label ``implementation-contract.md`` → ``../design/implementation-contract.md``
- `docs/v3/convergence/design-method-playbook.md:13`: label ``../research/ruflo-v3-sdlc-workflow.md`` → ``research/ruflo-v3-sdlc-workflow.md``
- `docs/v3/convergence/design-method-playbook.md:285`: label ``../../../tools/v3-model/README.md`` → ``../../tools/v3-model/README.md``
- `docs/v3/convergence/implementation-contract.md:171`: label ``../topics/_closed-v1-operability.md`` → ``topics/_closed-v1-operability.md``
- `docs/v3/convergence/implementation-contract.md:244`: label ``../topics/_open-runtime-capability-surface.md`` → ``topics/_open-runtime-capability-surface.md``
- `docs/v3/implementation/plan.md:21`: label ``../convergence/implementation-contract.md`` → ``../design/implementation-contract.md``
- `docs/v3/implementation/plan.md:373`: label ``../../../v3/adr/_template.md`` → ``../adr/_template.md``
- `docs/v3/research/README.md:32`: label ``../convergence/design-method-playbook.md`` → ``../design-method-playbook.md``
- `docs/v3/research/dbos-study.md:27`: label ``../convergence/approach.md`` → ``../approach.md``
- `docs/v3/research/dbos-study.md:28`: label ``../convergence/core-model.html`` → ``../../model/core-model.html``
- `docs/v3/research/gastown-study.md:38`: label ``../convergence/approach.md`` → ``../approach.md``
- `docs/v3/research/gastown-study.md:39`: label ``../convergence/core-model.html`` → ``../../model/core-model.html``
- `docs/v3/research/gstack-study.md:31`: label ``../convergence/approach.md`` → ``../approach.md``
- `docs/v3/research/gstack-study.md:32`: label ``../convergence/core-model.html`` → ``../../model/core-model.html``
- `docs/v3/research/hermes-agent-study.md:35`: label ``../convergence/approach.md`` → ``../approach.md``
- `docs/v3/research/hermes-agent-study.md:36`: label ``../convergence/core-model.html`` → ``../../model/core-model.html``
- `docs/v3/research/honcho-study.md:33`: label ``../convergence/approach.md`` → ``../approach.md``
- `docs/v3/research/honcho-study.md:34`: label ``../convergence/core-model.html`` → ``../../model/core-model.html``
- `docs/v3/research/langgraph-study.md:33`: label ``../convergence/approach.md`` → ``../approach.md``
- `docs/v3/research/langgraph-study.md:34`: label ``../convergence/core-model.html`` → ``../../model/core-model.html``
- `docs/v3/research/nanoclaw-study.md:31`: label ``../convergence/approach.md`` → ``../approach.md``
- `docs/v3/research/nanoclaw-study.md:32`: label ``../convergence/core-model.html`` → ``../../model/core-model.html``
- `docs/v3/research/omnigent-study.md:19`: label ``../convergence/approach.md`` → ``../approach.md``
- `docs/v3/research/omnigent-study.md:20`: label ``../convergence/core-model.html`` → ``../../model/core-model.html``
- `docs/v3/research/paperclip-study.md:25`: label ``../convergence/approach.md`` → ``../approach.md``
- `docs/v3/research/paperclip-study.md:26`: label ``../convergence/core-model.html`` → ``../../model/core-model.html``
- `docs/v3/research/ruflo-v3-sdlc-workflow.md:18`: label ``../convergence/design-method-playbook.md`` → ``../design-method-playbook.md``
- `docs/v3/research/superpowers-study.md:32`: label ``../convergence/approach.md`` → ``../approach.md``
- `docs/v3/research/superpowers-study.md:33`: label ``../convergence/core-model.html`` → ``../../model/core-model.html``
- `docs/v3/research/symphony-study.md:22`: label ``../convergence/approach.md`` → ``../approach.md``
- `docs/v3/research/symphony-study.md:23`: label ``../convergence/core-model.html`` → ``../../model/core-model.html``
- `docs/v3/research/temporal-study.md:37`: label ``../convergence/approach.md`` → ``../approach.md``
- `docs/v3/research/temporal-study.md:38`: label ``../convergence/core-model.html`` → ``../../model/core-model.html``
- `docs/v3/research/vibe-kanban-study.md:37`: label ``../convergence/approach.md`` → ``../approach.md``
- `docs/v3/research/vibe-kanban-study.md:38`: label ``../convergence/core-model.html`` → ``../../model/core-model.html``
- `docs/v3/topics/README.md:12`: label ``../convergence/core-model-todo.md`` → ``../../model/core-model-todo.md``
- `docs/v3/topics/README.md:14`: label ``../convergence/core-model-future-topic.md`` → ``../../model/core-model-future-topic.md``
- `docs/v3/topics/_closed-emit-contract.md:44`: label ``../convergence/core-model-todo.md`` → ``../../model/core-model-todo.md``
- `docs/v3/topics/_open-kernel-primitives.md:43`: label ``../convergence/core-model.html`` → ``../../model/core-model.html``
- `docs/v3/topics/_open-kernel-primitives.md:44`: label ``../convergence/core-model-todo.md`` → ``../../model/core-model-todo.md``
- `docs/v3/topics/_open-v3-core-api-surface.md:125`: label ``../convergence/core-model-future-topic.md`` → ``../../model/core-model-future-topic.md``
- `docs/v3/topics/_open-v3-storage-architecture.md:233`: label ``../convergence/core-model-future-topic.md`` → ``../../model/core-model-future-topic.md``
- `docs/v3/topics/_open-v3-workflow-inspector-ui.md:237`: label ``../convergence/core-model-future-topic.md`` → ``../../model/core-model-future-topic.md``
- `docs/v3/topics/v3-gate-policy-config-design-synthesis.md:5`: label ``../convergence/core-model-future-topic.md`` → ``../../model/core-model-future-topic.md``

## Introduced occurrences (arm finding F1-deep11)

The migration itself CREATES these occurrences by design; they are
pre-enumerated in the frozen table with disposition `introduced`:

- The three "NEVER moves" amendment parentheticals (each names the
  old contracts home as a historical reference):
  `v3/implementation/contract-draft-template.md`,
  `.claude/skills/CreateTaskPacket/Workflows/DraftContract.md`,
  `v3/implementation/process-v2-design.md`.
- The appended process-log entry (narrates the move in old-path
  terms): `v3/implementation/process-log.md`.

## Annotated occurrences

None. The only dual-role candidate class lives in the process log,
which is append-only (README §7) and therefore receives zero in-file
edits (arm finding F4-deep9); its entries are kept verbatim as dated
records and the new appended entry names the re-homed authorities.

## Run contract

```
python3 tools/v3-plan/adr015_sweep.py --pre 3446e48e1b130834e7122cac2335b371bafa8d7f
python3 tools/v3-plan/adr015_sweep.py --post <migration-sha>
```

Both read trees via `git show`, never the working tree. The POST run
reconciles the migration commit's tree against the frozen table
below: `kept*` rows present at their translated keys (content-
anchored), `rewritten` rows' old content absent AND predicted new
content present, `introduced` rows present at their new-tree keys,
every post hit claimed, per-(path, token) counts closed with
multiplicity taken from the FROZEN TABLE's distinct source lines
(never from counting the post tree), and the surviving lines'
RELATIVE ORDER per file realized as a subsequence of the post file
(insertion-tolerant, swap-sensitive) — the last two closures are the
2026-07-21 external-arm rounds' folds.

## The frozen table

Keys are `old-path:line:token` on the migration parent's tree
(`introduced` rows are keyed by their NEW-tree path, line 0; line
numbers are advisory locators — reconciliation is content-anchored).

<!-- adr015-frozen-table -->
```json
{
 "migration_parent": "3446e48e1b130834e7122cac2335b371bafa8d7f",
 "self_excluded": [
  "v3/adr/ADR-015-v3-plane-consolidation.md",
  "v3/implementation/adr-015-migration-report.md",
  "tools/v3-plan/adr015_sweep.py"
 ],
 "rows": [
  {
   "path": ".claude/skills/CreateTaskPacket/SKILL.md",
   "line": 20,
   "token": "docs/v3",
   "content": "| Template (§1) + projection checklist (§2) + `REV-*` registry (§3) | `docs/v3/implementation/task-packet-template.md` |",
   "disposition": "rewritten",
   "new": "| Template (§1) + projection checklist (§2) + `REV-*` registry (§3) | `v3/implementation/task-packet-template.md` |"
  },
  {
   "path": ".claude/skills/CreateTaskPacket/SKILL.md",
   "line": 21,
   "token": "docs/v3",
   "content": "| Contract-draft FORM authority (C-rows, ratification blocks, lifecycle) | `docs/v3/implementation/contract-draft-template.md` |",
   "disposition": "rewritten",
   "new": "| Contract-draft FORM authority (C-rows, ratification blocks, lifecycle) | `v3/implementation/contract-draft-template.md` |"
  },
  {
   "path": ".claude/skills/CreateTaskPacket/SKILL.md",
   "line": 22,
   "token": "docs/v3",
   "content": "| Build loop + the autonomy envelope, STOP registry, verdict-action matrix, finding policy (§5.5) | `docs/v3/implementation/README.md` (§4–§7) |",
   "disposition": "rewritten",
   "new": "| Build loop + the autonomy envelope, STOP registry, verdict-action matrix, finding policy (§5.5) | `v3/implementation/README.md` (§4–§7) |"
  },
  {
   "path": ".claude/skills/CreateTaskPacket/SKILL.md",
   "line": 23,
   "token": "docs/v3",
   "content": "| The ratified plan (the packet's plan step lives here) | `docs/v3/implementation/plan.md` |",
   "disposition": "rewritten",
   "new": "| The ratified plan (the packet's plan step lives here) | `v3/implementation/plan.md` |"
  },
  {
   "path": ".claude/skills/CreateTaskPacket/SKILL.md",
   "line": 24,
   "token": "docs/v3",
   "content": "| The model↔code contract surface (units / rejections / invariants / traces) | `docs/v3/convergence/model-src/ledger.md` |",
   "disposition": "rewritten",
   "new": "| The model↔code contract surface (units / rejections / invariants / traces) | `v3/model/ledger.md` |"
  },
  {
   "path": ".claude/skills/CreateTaskPacket/SKILL.md",
   "line": 24,
   "token": "model-src",
   "content": "| The model↔code contract surface (units / rejections / invariants / traces) | `docs/v3/convergence/model-src/ledger.md` |",
   "disposition": "rewritten",
   "new": "| The model↔code contract surface (units / rejections / invariants / traces) | `v3/model/ledger.md` |"
  },
  {
   "path": ".claude/skills/CreateTaskPacket/SKILL.md",
   "line": 24,
   "token": "convergence-path",
   "content": "| The model↔code contract surface (units / rejections / invariants / traces) | `docs/v3/convergence/model-src/ledger.md` |",
   "disposition": "rewritten",
   "new": "| The model↔code contract surface (units / rejections / invariants / traces) | `v3/model/ledger.md` |"
  },
  {
   "path": ".claude/skills/CreateTaskPacket/SKILL.md",
   "line": 25,
   "token": "docs/v3",
   "content": "| Friction log (provenance of every learned rule) | `docs/v3/implementation/process-log.md` |",
   "disposition": "rewritten",
   "new": "| Friction log (provenance of every learned rule) | `v3/implementation/process-log.md` |"
  },
  {
   "path": ".claude/skills/CreateTaskPacket/Workflows/AuthorPacket.md",
   "line": 11,
   "token": "docs/v3",
   "content": "  matches the file name under `docs/v3/implementation/packets/`.",
   "disposition": "rewritten",
   "new": "  matches the file name under `v3/implementation/packets/`."
  },
  {
   "path": ".claude/skills/CreateTaskPacket/Workflows/AuthorPacket.md",
   "line": 32,
   "token": "docs/v3",
   "content": "   `docs/v3/implementation/packets/` — a packet file lands in git only",
   "disposition": "rewritten",
   "new": "   `v3/implementation/packets/` — a packet file lands in git only"
  },
  {
   "path": ".claude/skills/CreateTaskPacket/Workflows/AuthorPacket.md",
   "line": 69,
   "token": "docs/v3",
   "content": "1. `docs/v3/implementation/task-packet-template.md` — template §1,",
   "disposition": "rewritten",
   "new": "1. `v3/implementation/task-packet-template.md` — template §1,"
  },
  {
   "path": ".claude/skills/CreateTaskPacket/Workflows/AuthorPacket.md",
   "line": 73,
   "token": "docs/v3",
   "content": "2. The `PLAN_SECTION` in `docs/v3/implementation/plan.md`, including any",
   "disposition": "rewritten",
   "new": "2. The `PLAN_SECTION` in `v3/implementation/plan.md`, including any"
  },
  {
   "path": ".claude/skills/CreateTaskPacket/Workflows/AuthorPacket.md",
   "line": 78,
   "token": "docs/v3",
   "content": "   `docs/v3/implementation/packets/` — conventions are inherited from the",
   "disposition": "rewritten",
   "new": "   `v3/implementation/packets/` — conventions are inherited from the"
  },
  {
   "path": ".claude/skills/CreateTaskPacket/Workflows/AuthorPacket.md",
   "line": 131,
   "token": "docs/v3",
   "content": "   `docs/v3/convergence/model-src/units/` — no paraphrase.",
   "disposition": "rewritten",
   "new": "   `v3/model/units/` — no paraphrase."
  },
  {
   "path": ".claude/skills/CreateTaskPacket/Workflows/AuthorPacket.md",
   "line": 131,
   "token": "model-src",
   "content": "   `docs/v3/convergence/model-src/units/` — no paraphrase.",
   "disposition": "rewritten",
   "new": "   `v3/model/units/` — no paraphrase."
  },
  {
   "path": ".claude/skills/CreateTaskPacket/Workflows/AuthorPacket.md",
   "line": 131,
   "token": "convergence-path",
   "content": "   `docs/v3/convergence/model-src/units/` — no paraphrase.",
   "disposition": "rewritten",
   "new": "   `v3/model/units/` — no paraphrase."
  },
  {
   "path": ".claude/skills/CreateTaskPacket/Workflows/AuthorPacket.md",
   "line": 244,
   "token": "docs/v3",
   "content": "`docs/v3/implementation/packets/<PACKET_ID>.md`, following template §1",
   "disposition": "rewritten",
   "new": "`v3/implementation/packets/<PACKET_ID>.md`, following template §1"
  },
  {
   "path": ".claude/skills/CreateTaskPacket/Workflows/AuthorPacket.md",
   "line": 351,
   "token": "docs/v3",
   "content": "Packet drafted: docs/v3/implementation/packets/<PACKET_ID>.md",
   "disposition": "rewritten",
   "new": "Packet drafted: v3/implementation/packets/<PACKET_ID>.md"
  },
  {
   "path": ".claude/skills/CreateTaskPacket/Workflows/DraftContract.md",
   "line": 9,
   "token": "docs/v3",
   "content": "Form authority: `docs/v3/implementation/contract-draft-template.md`",
   "disposition": "rewritten",
   "new": "Form authority: `v3/implementation/contract-draft-template.md`"
  },
  {
   "path": ".claude/skills/CreateTaskPacket/Workflows/DraftContract.md",
   "line": 17,
   "token": "docs/v3",
   "content": "  `docs/v3/implementation/contracts/ch<N>-<surface>-contract.md`. A",
   "disposition": "rewritten",
   "new": "  `v3/implementation/contracts/ch<N>-<surface>-contract.md`. A"
  },
  {
   "path": ".claude/skills/CreateTaskPacket/Workflows/DraftContract.md",
   "line": 112,
   "token": "docs/v3",
   "content": "Draft: docs/v3/implementation/contracts/ch<N>-<surface>-contract.md",
   "disposition": "rewritten",
   "new": "Draft: v3/implementation/contracts/ch<N>-<surface>-contract.md"
  },
  {
   "path": ".claude/skills/CreateTaskPacket/Workflows/DraftContract.md",
   "line": 0,
   "token": "docs/v3",
   "content": "(the contracts HOME was re-pinned once, `docs/v3/implementation/contracts` → `v3/implementation/contracts`, by ADR-015 — a relocation of the home as a whole, not of a file within it; filenames and row IDs unchanged, anchors unaffected). Decision-class rows'",
   "disposition": "introduced",
   "reason": "created by the migration itself (amendment parenthetical / appended log entry)"
  },
  {
   "path": ".claude/skills/CreateTaskPacket/Workflows/ReviewPacket.md",
   "line": 16,
   "token": "docs/v3",
   "content": "Process authority: `docs/v3/implementation/README.md` §5.5 (the",
   "disposition": "rewritten",
   "new": "Process authority: `v3/implementation/README.md` §5.5 (the"
  },
  {
   "path": ".claude/skills/CreateTaskPacket/Workflows/ReviewPacket.md",
   "line": 24,
   "token": "docs/v3",
   "content": "- `TARGET_PATH`: a packet under `docs/v3/implementation/packets/` or a",
   "disposition": "rewritten",
   "new": "- `TARGET_PATH`: a packet under `v3/implementation/packets/` or a"
  },
  {
   "path": ".claude/skills/CreateTaskPacket/Workflows/ReviewPacket.md",
   "line": 25,
   "token": "docs/v3",
   "content": "  contract-draft under `docs/v3/implementation/contracts/`.",
   "disposition": "rewritten",
   "new": "  contract-draft under `v3/implementation/contracts/`."
  },
  {
   "path": ".claude/skills/CreateTaskPacket/Workflows/ReviewPacket.md",
   "line": 131,
   "token": "model-src",
   "content": "   id resolves to a file under `model-src/units/` (spot-check by `ls`,",
   "disposition": "rewritten",
   "new": "   id resolves to a file under `v3/model/units/` (spot-check by `ls`,"
  },
  {
   "path": ".claude/skills/CreateTaskPacket/Workflows/ReviewPacket.md",
   "line": 565,
   "token": "docs/v3",
   "content": "     `docs/v3/implementation/arm-pin.md` (current row; revised at",
   "disposition": "rewritten",
   "new": "     `v3/implementation/arm-pin.md` (current row; revised at"
  },
  {
   "path": ".claude/skills/CreateTaskPacket/references/LearnedRules.md",
   "line": 3,
   "token": "docs/v3",
   "content": "Distilled from `docs/v3/implementation/process-log.md` (the source of",
   "disposition": "rewritten",
   "new": "Distilled from `v3/implementation/process-log.md` (the source of"
  },
  {
   "path": "AGENTS.md",
   "line": 23,
   "token": "docs/v3",
   "content": "## V3 Implementation Plane (`docs/v3/` + `v3/`)",
   "disposition": "rewritten",
   "new": "## V3 Implementation Plane (`v3/`)"
  },
  {
   "path": "AGENTS.md",
   "line": 29,
   "token": "docs/v3",
   "content": "- **Process authority:** `docs/v3/implementation/README.md` (build loop",
   "disposition": "rewritten",
   "new": "- **Process authority:** `v3/implementation/README.md` (build loop"
  },
  {
   "path": "AGENTS.md",
   "line": 31,
   "token": "docs/v3",
   "content": "  (`docs/v3/implementation/plan.md`) is ratified chapter by chapter;",
   "disposition": "rewritten",
   "new": "  (`v3/implementation/plan.md`) is ratified chapter by chapter;"
  },
  {
   "path": "AGENTS.md",
   "line": 32,
   "token": "docs/v3",
   "content": "  task packets live in `docs/v3/implementation/packets/`.",
   "disposition": "rewritten",
   "new": "  task packets live in `v3/implementation/packets/`."
  },
  {
   "path": "AGENTS.md",
   "line": 37,
   "token": "docs/v3",
   "content": "  `docs/v3/implementation/task-packet-template.md`, and the",
   "disposition": "rewritten",
   "new": "  `v3/implementation/task-packet-template.md`, and the"
  },
  {
   "path": "AGENTS.md",
   "line": 39,
   "token": "docs/v3",
   "content": "  `docs/v3/implementation/contract-draft-template.md` — if the skill",
   "disposition": "rewritten",
   "new": "  `v3/implementation/contract-draft-template.md` — if the skill"
  },
  {
   "path": "AGENTS.md",
   "line": 42,
   "token": "docs/v3",
   "content": "  as C-rows in `docs/v3/implementation/contracts/` and RATIFIED by the",
   "disposition": "rewritten",
   "new": "  as C-rows in `v3/implementation/contracts/` and RATIFIED by the"
  },
  {
   "path": "docs/actor-runtime-interface/generic-runtime-kernel-contract-note-v1.md",
   "line": 39,
   "token": "convergence-path",
   "content": "   - `src/v11/domain/convergence/policyValidation.ts`",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "docs/actor-runtime-interface/generic-runtime-kernel-contract-note-v1.md",
   "line": 169,
   "token": "convergence-path",
   "content": "   - `src/v11/domain/convergence/policyValidation.ts`",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "docs/modularity-review/2026-05-13-modularity-review.md",
   "line": 27,
   "token": "convergence-path",
   "content": "`src/types/protocol.ts` is not just a small protocol DTO. It imports kernel participant/message literals, `MetaReviewRecommendation` from `v11/shared/metaReview`, and findings types, then exports delivery target roles, findings parity metadata, protocol envelopes, meta-review submission payloads, and actor emit input variants. The fan-in is large: an import scan found more than 100 source/test consumers of this file, including `domain/metaReviewGate`, `domain/convergence`, `application/pass`, `application/approval`, `application/metaReviewGate`, `infrastructure/artifact/transcript`, `infrastructure/channel/tmux`, and `src/cli/commands/agent/emit.ts`.",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "docs/modularity-review/2026-05-14-modularity-review-full-codebase.md",
   "line": 34,
   "token": "convergence-path",
   "content": "Changing protocol meaning forces a developer to hold actor emit kinds, transcript envelopes, pass/convergence payloads, findings priority aliases, meta-review parity metadata, approval routing, UI action events, and contract tests in one working set. That pushes the system toward [complexity](https://coupling.dev/posts/core-concepts/complexity/): a change can look like a local field addition but later affect validation, persistence, delivery text, UI timeline projection, and tests.",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "docs/reviewer-evidence-governance.md",
   "line": 99,
   "token": "convergence-path",
   "content": "3. A clean reviewer/convergence statement is valid only for the reviewed scope;",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "docs/v2/codex/pairflow-v2-architecture-plan.md",
   "line": 346,
   "token": "convergence-path",
   "content": "  K->>Pol: evaluate review/convergence gates",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "docs/v3/convergence/approach.md",
   "line": 11,
   "token": "../concept-braindump.md",
   "content": "is [`../concept-braindump.md`](../concept-braindump.md) (21 sections) and the 7 fixed",
   "disposition": "rewritten",
   "new": "is [`concept-braindump.md`](concept-braindump.md) (21 sections) and the 7 fixed"
  },
  {
   "path": "docs/v3/convergence/approach.md",
   "line": 11,
   "token": "../concept-braindump.md",
   "content": "is [`../concept-braindump.md`](../concept-braindump.md) (21 sections) and the 7 fixed",
   "disposition": "rewritten",
   "new": "is [`concept-braindump.md`](concept-braindump.md) (21 sections) and the 7 fixed"
  },
  {
   "path": "docs/v3/convergence/approach.md",
   "line": 12,
   "token": "../test-workflows.md",
   "content": "scenarios in [`../test-workflows.md`](../test-workflows.md).",
   "disposition": "rewritten",
   "new": "scenarios in [`test-workflows.md`](test-workflows.md)."
  },
  {
   "path": "docs/v3/convergence/approach.md",
   "line": 12,
   "token": "../test-workflows.md",
   "content": "scenarios in [`../test-workflows.md`](../test-workflows.md).",
   "disposition": "rewritten",
   "new": "scenarios in [`test-workflows.md`](test-workflows.md)."
  },
  {
   "path": "docs/v3/convergence/approach.md",
   "line": 755,
   "token": "../topics/_open-kernel-primitives.md",
   "content": "Source: [`../topics/_open-kernel-primitives.md`](../topics/_open-kernel-primitives.md)",
   "disposition": "rewritten",
   "new": "Source: [`topics/_open-kernel-primitives.md`](topics/_open-kernel-primitives.md)"
  },
  {
   "path": "docs/v3/convergence/approach.md",
   "line": 755,
   "token": "../topics/_open-kernel-primitives.md",
   "content": "Source: [`../topics/_open-kernel-primitives.md`](../topics/_open-kernel-primitives.md)",
   "disposition": "rewritten",
   "new": "Source: [`topics/_open-kernel-primitives.md`](topics/_open-kernel-primitives.md)"
  },
  {
   "path": "docs/v3/convergence/approach.md",
   "line": 817,
   "token": "../implementation/README.md",
   "content": "**Implementation process.** [`../implementation/README.md`](../implementation/README.md)",
   "disposition": "kept — resolution preserved",
   "reason": "kept — resolution preserved (target moves with the tree)",
   "new": null
  },
  {
   "path": "docs/v3/convergence/approach.md",
   "line": 817,
   "token": "../implementation/README.md",
   "content": "**Implementation process.** [`../implementation/README.md`](../implementation/README.md)",
   "disposition": "kept — resolution preserved",
   "reason": "kept — resolution preserved (target moves with the tree)",
   "new": null
  },
  {
   "path": "docs/v3/convergence/approach.md",
   "line": 824,
   "token": "../topics/_closed-v1-operability.md",
   "content": "**V1 operability scope.** [`../topics/_closed-v1-operability.md`](../topics/_closed-v1-operability.md)",
   "disposition": "rewritten",
   "new": "**V1 operability scope.** [`topics/_closed-v1-operability.md`](topics/_closed-v1-operability.md)"
  },
  {
   "path": "docs/v3/convergence/approach.md",
   "line": 824,
   "token": "../topics/_closed-v1-operability.md",
   "content": "**V1 operability scope.** [`../topics/_closed-v1-operability.md`](../topics/_closed-v1-operability.md)",
   "disposition": "rewritten",
   "new": "**V1 operability scope.** [`topics/_closed-v1-operability.md`](topics/_closed-v1-operability.md)"
  },
  {
   "path": "docs/v3/convergence/approach.md",
   "line": 920,
   "token": "../topics/_open-private-data-boundary-vs-federation.md",
   "content": "[`../topics/_open-private-data-boundary-vs-federation.md`](../topics/_open-private-data-boundary-vs-federation.md).",
   "disposition": "rewritten",
   "new": "[`topics/_open-private-data-boundary-vs-federation.md`](topics/_open-private-data-boundary-vs-federation.md)."
  },
  {
   "path": "docs/v3/convergence/approach.md",
   "line": 920,
   "token": "../topics/_open-private-data-boundary-vs-federation.md",
   "content": "[`../topics/_open-private-data-boundary-vs-federation.md`](../topics/_open-private-data-boundary-vs-federation.md).",
   "disposition": "rewritten",
   "new": "[`topics/_open-private-data-boundary-vs-federation.md`](topics/_open-private-data-boundary-vs-federation.md)."
  },
  {
   "path": "docs/v3/convergence/approach.md",
   "line": 10,
   "token": "../model/core-model.html",
   "content": "incrementally in [`core-model.html`](core-model.html). The raw material being distilled",
   "disposition": "rewritten",
   "reason": "retarget whose new form carries a sweep token",
   "new": "incrementally in [`../model/core-model.html`](../model/core-model.html). The raw material being distilled"
  },
  {
   "path": "docs/v3/convergence/approach.md",
   "line": 957,
   "token": "../model/core-model-future-topic.md",
   "content": "  ([`core-model-future-topic.md`](core-model-future-topic.md) L4 #12), with the BitSafe",
   "disposition": "rewritten",
   "reason": "retarget whose new form carries a sweep token",
   "new": "  ([`../model/core-model-future-topic.md`](../model/core-model-future-topic.md) L4 #12), with the BitSafe"
  },
  {
   "path": "docs/v3/convergence/approach.md",
   "line": 1021,
   "token": "../model/core-model-future-topic.md",
   "content": "   [`core-model-future-topic.md`](core-model-future-topic.md) L8 §6 (channel",
   "disposition": "rewritten",
   "reason": "retarget whose new form carries a sweep token",
   "new": "   [`../model/core-model-future-topic.md`](../model/core-model-future-topic.md) L8 §6 (channel"
  },
  {
   "path": "docs/v3/convergence/core-model-future-topic.md",
   "line": 133,
   "token": "bare:research/bitsafe-workflow-simulation.md",
   "content": "Source: the BitSafe workflow simulation (research/bitsafe-workflow-simulation.md,",
   "disposition": "rewritten",
   "new": "Source: the BitSafe workflow simulation (../design/research/bitsafe-workflow-simulation.md,"
  },
  {
   "path": "docs/v3/convergence/core-model-future-topic.md",
   "line": 180,
   "token": "../topics/_open-agent-runtime-and-pane-layout.md",
   "content": "  adapter split; see [`../topics/_open-agent-runtime-and-pane-layout.md`](../topics/_open-agent-runtime-and-pane-layout.md).",
   "disposition": "rewritten",
   "new": "  adapter split; see [`../design/topics/_open-agent-runtime-and-pane-layout.md`](../design/topics/_open-agent-runtime-and-pane-layout.md)."
  },
  {
   "path": "docs/v3/convergence/core-model-future-topic.md",
   "line": 180,
   "token": "../topics/_open-agent-runtime-and-pane-layout.md",
   "content": "  adapter split; see [`../topics/_open-agent-runtime-and-pane-layout.md`](../topics/_open-agent-runtime-and-pane-layout.md).",
   "disposition": "rewritten",
   "new": "  adapter split; see [`../design/topics/_open-agent-runtime-and-pane-layout.md`](../design/topics/_open-agent-runtime-and-pane-layout.md)."
  },
  {
   "path": "docs/v3/convergence/core-model-future-topic.md",
   "line": 708,
   "token": "bare:topics/_dynamic-orchestrator-workflow.md",
   "content": "  only that it terminated. See `topics/_dynamic-orchestrator-workflow.md`",
   "disposition": "rewritten",
   "new": "  only that it terminated. See `../design/topics/_dynamic-orchestrator-workflow.md`"
  },
  {
   "path": "docs/v3/convergence/core-model-future-topic.md",
   "line": 1462,
   "token": "bare:research/bitsafe-workflow-simulation.md",
   "content": "Source: research/bitsafe-workflow-simulation.md — GAP-4's disposition input:",
   "disposition": "rewritten",
   "new": "Source: ../design/research/bitsafe-workflow-simulation.md — GAP-4's disposition input:"
  },
  {
   "path": "docs/v3/convergence/core-model-future-topic.md",
   "line": 1511,
   "token": "../topics/_open-private-data-boundary-vs-federation.md",
   "content": "[`../topics/_open-private-data-boundary-vs-federation.md`](../topics/_open-private-data-boundary-vs-federation.md).",
   "disposition": "rewritten",
   "new": "[`../design/topics/_open-private-data-boundary-vs-federation.md`](../design/topics/_open-private-data-boundary-vs-federation.md)."
  },
  {
   "path": "docs/v3/convergence/core-model-future-topic.md",
   "line": 1511,
   "token": "../topics/_open-private-data-boundary-vs-federation.md",
   "content": "[`../topics/_open-private-data-boundary-vs-federation.md`](../topics/_open-private-data-boundary-vs-federation.md).",
   "disposition": "rewritten",
   "new": "[`../design/topics/_open-private-data-boundary-vs-federation.md`](../design/topics/_open-private-data-boundary-vs-federation.md)."
  },
  {
   "path": "docs/v3/convergence/core-model-todo.md",
   "line": 450,
   "token": "model-src",
   "content": "## Tooling backlog (model-src / ledger generator)",
   "disposition": "kept — name",
   "reason": "bare-name mention in a dated record/backlog heading; basenames are invariant, the name rule keeps it",
   "new": null
  },
  {
   "path": "docs/v3/convergence/core-model-todo.md",
   "line": 466,
   "token": "../topics/_closed-v1-operability.md",
   "content": "motivated in `../topics/_closed-v1-operability.md` Q4.4 (v1-operability round,",
   "disposition": "rewritten",
   "new": "motivated in `../design/topics/_closed-v1-operability.md` Q4.4 (v1-operability round,"
  },
  {
   "path": "docs/v3/convergence/core-model-todo.md",
   "line": 8,
   "token": "../design/implementation-contract.md",
   "content": "> [`implementation-contract.md`](implementation-contract.md) (`IC-*` items — the",
   "disposition": "rewritten",
   "reason": "retarget whose new form carries a sweep token",
   "new": "> [`../design/implementation-contract.md`](../design/implementation-contract.md) (`IC-*` items — the"
  },
  {
   "path": "docs/v3/convergence/core-model-todo.md",
   "line": 34,
   "token": "../design/implementation-contract.md",
   "content": "> mechanics live in `implementation-contract.md` IC-A1.",
   "disposition": "rewritten",
   "reason": "retarget whose new form carries a sweep token",
   "new": "> mechanics live in `../design/implementation-contract.md` IC-A1."
  },
  {
   "path": "docs/v3/convergence/core-model-todo.md",
   "line": 59,
   "token": "../design/implementation-contract.md",
   "content": "> `implementation-contract.md` IC-A2 (with the nanoclaw negative-proof design rules;",
   "disposition": "rewritten",
   "reason": "retarget whose new form carries a sweep token",
   "new": "> `../design/implementation-contract.md` IC-A2 (with the nanoclaw negative-proof design rules;"
  },
  {
   "path": "docs/v3/convergence/core-model-todo.md",
   "line": 73,
   "token": "../design/implementation-contract.md",
   "content": "> `implementation-contract.md` IC-A3 (retransmission vs re-attempt, content-addressed vs",
   "disposition": "rewritten",
   "reason": "retarget whose new form carries a sweep token",
   "new": "> `../design/implementation-contract.md` IC-A3 (retransmission vs re-attempt, content-addressed vs"
  },
  {
   "path": "docs/v3/convergence/core-model-todo.md",
   "line": 83,
   "token": "../design/implementation-contract.md",
   "content": "> output refs, the fencing-token watch rule — moved to `implementation-contract.md` IC-B.",
   "disposition": "rewritten",
   "reason": "retarget whose new form carries a sweep token",
   "new": "> output refs, the fencing-token watch rule — moved to `../design/implementation-contract.md` IC-B."
  },
  {
   "path": "docs/v3/convergence/core-model-todo.md",
   "line": 99,
   "token": "../design/implementation-contract.md",
   "content": "timeout-driven successor); the introduce-only-if rule is `implementation-contract.md`",
   "disposition": "rewritten",
   "reason": "retarget whose new form carries a sweep token",
   "new": "timeout-driven successor); the introduce-only-if rule is `../design/implementation-contract.md`"
  },
  {
   "path": "docs/v3/convergence/core-model-todo.md",
   "line": 107,
   "token": "../design/implementation-contract.md",
   "content": "> moved to `implementation-contract.md` IC-C.",
   "disposition": "rewritten",
   "reason": "retarget whose new form carries a sweep token",
   "new": "> moved to `../design/implementation-contract.md` IC-C."
  },
  {
   "path": "docs/v3/convergence/core-model-todo.md",
   "line": 124,
   "token": "../design/implementation-contract.md",
   "content": "  enforced implementation-side → `implementation-contract.md` IC-C.",
   "disposition": "rewritten",
   "reason": "retarget whose new form carries a sweep token",
   "new": "  enforced implementation-side → `../design/implementation-contract.md` IC-C."
  },
  {
   "path": "docs/v3/convergence/core-model-todo.md",
   "line": 147,
   "token": "../design/implementation-contract.md",
   "content": "MOVED to `implementation-contract.md` IC-C — analytics/telemetry derive from the",
   "disposition": "rewritten",
   "reason": "retarget whose new form carries a sweep token",
   "new": "MOVED to `../design/implementation-contract.md` IC-C — analytics/telemetry derive from the"
  },
  {
   "path": "docs/v3/convergence/core-model-todo.md",
   "line": 395,
   "token": "../design/implementation-contract.md",
   "content": "- MOVED to `implementation-contract.md` IC-A2/IC-N (no reconciler/outbox for the",
   "disposition": "rewritten",
   "reason": "retarget whose new form carries a sweep token",
   "new": "- MOVED to `../design/implementation-contract.md` IC-A2/IC-N (no reconciler/outbox for the"
  },
  {
   "path": "docs/v3/convergence/core-model-todo.md",
   "line": 400,
   "token": "../design/implementation-contract.md",
   "content": "- MOVED to `implementation-contract.md` IC-B/IC-N (no deterministic replay for",
   "disposition": "rewritten",
   "reason": "retarget whose new form carries a sweep token",
   "new": "- MOVED to `../design/implementation-contract.md` IC-B/IC-N (no deterministic replay for"
  },
  {
   "path": "docs/v3/convergence/core-model-todo.md",
   "line": 406,
   "token": "../design/implementation-contract.md",
   "content": "- The analytics/audit-trail guardrail MOVED to `implementation-contract.md` IC-C.",
   "disposition": "rewritten",
   "reason": "retarget whose new form carries a sweep token",
   "new": "- The analytics/audit-trail guardrail MOVED to `../design/implementation-contract.md` IC-C."
  },
  {
   "path": "docs/v3/convergence/core-model-todo.md",
   "line": 446,
   "token": "../design/implementation-contract.md",
   "content": "- MOVED to `implementation-contract.md` IC-N (no full event-sourcing as the source of",
   "disposition": "rewritten",
   "reason": "retarget whose new form carries a sweep token",
   "new": "- MOVED to `../design/implementation-contract.md` IC-N (no full event-sourcing as the source of"
  },
  {
   "path": "docs/v3/convergence/core-model.html",
   "line": 273,
   "token": "../concept-braindump.md",
   "content": "        <p>The convergence companion to <a href=\"../concept-braindump.md\">concept-braindump.md</a>,",
   "disposition": "rewritten",
   "new": "        <p>The convergence companion to <a href=\"../design/concept-braindump.md\">concept-braindump.md</a>,"
  },
  {
   "path": "docs/v3/convergence/core-model.html",
   "line": 274,
   "token": "../design/approach.md",
   "content": "        <a href=\"approach.md\">approach.md</a> (the method + roadmap; source of truth for the ramp), and",
   "disposition": "rewritten",
   "reason": "retarget whose new form carries a sweep token",
   "new": "        <a href=\"../design/approach.md\">approach.md</a> (the method + roadmap; source of truth for the ramp), and"
  },
  {
   "path": "docs/v3/convergence/core-model.html",
   "line": 275,
   "token": "../design/design-method-playbook.md",
   "content": "        <a href=\"design-method-playbook.md\">design-method-playbook.md</a> (how to use DDD, pseudocode,",
   "disposition": "rewritten",
   "reason": "retarget whose new form carries a sweep token",
   "new": "        <a href=\"../design/design-method-playbook.md\">design-method-playbook.md</a> (how to use DDD, pseudocode,"
  },
  {
   "path": "docs/v3/convergence/core-model.html",
   "line": 556,
   "token": "../design/design-method-playbook.md",
   "content": "              <a href=\"design-method-playbook.md\">playbook §2.1</a>; a full evidence gate is only",
   "disposition": "rewritten",
   "reason": "retarget whose new form carries a sweep token",
   "new": "              <a href=\"../design/design-method-playbook.md\">playbook §2.1</a>; a full evidence gate is only"
  },
  {
   "path": "docs/v3/convergence/design-method-playbook.md",
   "line": 13,
   "token": "../research/ruflo-v3-sdlc-workflow.md",
   "content": "- [`../research/ruflo-v3-sdlc-workflow.md`](../research/ruflo-v3-sdlc-workflow.md)",
   "disposition": "rewritten",
   "new": "- [`research/ruflo-v3-sdlc-workflow.md`](research/ruflo-v3-sdlc-workflow.md)"
  },
  {
   "path": "docs/v3/convergence/design-method-playbook.md",
   "line": 13,
   "token": "../research/ruflo-v3-sdlc-workflow.md",
   "content": "- [`../research/ruflo-v3-sdlc-workflow.md`](../research/ruflo-v3-sdlc-workflow.md)",
   "disposition": "rewritten",
   "new": "- [`research/ruflo-v3-sdlc-workflow.md`](research/ruflo-v3-sdlc-workflow.md)"
  },
  {
   "path": "docs/v3/convergence/design-method-playbook.md",
   "line": 282,
   "token": "docs/v3",
   "content": "source layout under `docs/v3/convergence/model-src/`, rebuilt byte-identically",
   "disposition": "rewritten",
   "new": "source layout under `v3/model/`, rebuilt byte-identically"
  },
  {
   "path": "docs/v3/convergence/design-method-playbook.md",
   "line": 282,
   "token": "model-src",
   "content": "source layout under `docs/v3/convergence/model-src/`, rebuilt byte-identically",
   "disposition": "rewritten",
   "new": "source layout under `v3/model/`, rebuilt byte-identically"
  },
  {
   "path": "docs/v3/convergence/design-method-playbook.md",
   "line": 282,
   "token": "convergence-path",
   "content": "source layout under `docs/v3/convergence/model-src/`, rebuilt byte-identically",
   "disposition": "rewritten",
   "new": "source layout under `v3/model/`, rebuilt byte-identically"
  },
  {
   "path": "docs/v3/convergence/design-method-playbook.md",
   "line": 285,
   "token": "../tools/v3-model/README.md",
   "content": "[`../../../tools/v3-model/README.md`](../../../tools/v3-model/README.md) — that",
   "disposition": "rewritten",
   "new": "[`../../tools/v3-model/README.md`](../../tools/v3-model/README.md) — that"
  },
  {
   "path": "docs/v3/convergence/design-method-playbook.md",
   "line": 285,
   "token": "../tools/v3-model/README.md",
   "content": "[`../../../tools/v3-model/README.md`](../../../tools/v3-model/README.md) — that",
   "disposition": "rewritten",
   "new": "[`../../tools/v3-model/README.md`](../../tools/v3-model/README.md) — that"
  },
  {
   "path": "docs/v3/convergence/design-method-playbook.md",
   "line": 311,
   "token": "model-src",
   "content": "  `model-src/` → `build.py` → `check.sh` must pass before commit. A direct",
   "disposition": "rewritten",
   "new": "  `../model/` → `build.py` → `check.sh` must pass before commit. A direct"
  },
  {
   "path": "docs/v3/convergence/design-method-playbook.md",
   "line": 488,
   "token": "docs/v3",
   "content": "  `docs/v3/topics/` memo. The memos already ARE the model's decision records:",
   "disposition": "rewritten",
   "new": "  `v3/design/topics/` memo. The memos already ARE the model's decision records:"
  },
  {
   "path": "docs/v3/convergence/design-method-playbook.md",
   "line": 600,
   "token": "docs/v3",
   "content": "Use docs/v3/convergence/design-method-playbook.md.",
   "disposition": "rewritten",
   "new": "Use v3/design/design-method-playbook.md."
  },
  {
   "path": "docs/v3/convergence/design-method-playbook.md",
   "line": 600,
   "token": "convergence-path",
   "content": "Use docs/v3/convergence/design-method-playbook.md.",
   "disposition": "rewritten",
   "new": "Use v3/design/design-method-playbook.md."
  },
  {
   "path": "docs/v3/convergence/implementation-contract.md",
   "line": 171,
   "token": "../topics/_closed-v1-operability.md",
   "content": "([`../topics/_closed-v1-operability.md`](../topics/_closed-v1-operability.md) —",
   "disposition": "rewritten",
   "new": "([`topics/_closed-v1-operability.md`](topics/_closed-v1-operability.md) —"
  },
  {
   "path": "docs/v3/convergence/implementation-contract.md",
   "line": 171,
   "token": "../topics/_closed-v1-operability.md",
   "content": "([`../topics/_closed-v1-operability.md`](../topics/_closed-v1-operability.md) —",
   "disposition": "rewritten",
   "new": "([`topics/_closed-v1-operability.md`](topics/_closed-v1-operability.md) —"
  },
  {
   "path": "docs/v3/convergence/implementation-contract.md",
   "line": 227,
   "token": "../implementation/README.md",
   "content": "  [`../implementation/README.md`](../implementation/README.md) §5). The plan",
   "disposition": "kept — resolution preserved",
   "reason": "kept — resolution preserved (target moves with the tree)",
   "new": null
  },
  {
   "path": "docs/v3/convergence/implementation-contract.md",
   "line": 227,
   "token": "../implementation/README.md",
   "content": "  [`../implementation/README.md`](../implementation/README.md) §5). The plan",
   "disposition": "kept — resolution preserved",
   "reason": "kept — resolution preserved (target moves with the tree)",
   "new": null
  },
  {
   "path": "docs/v3/convergence/implementation-contract.md",
   "line": 244,
   "token": "../topics/_open-runtime-capability-surface.md",
   "content": "[`../topics/_open-runtime-capability-surface.md`](../topics/_open-runtime-capability-surface.md)).",
   "disposition": "rewritten",
   "new": "[`topics/_open-runtime-capability-surface.md`](topics/_open-runtime-capability-surface.md))."
  },
  {
   "path": "docs/v3/convergence/implementation-contract.md",
   "line": 244,
   "token": "../topics/_open-runtime-capability-surface.md",
   "content": "[`../topics/_open-runtime-capability-surface.md`](../topics/_open-runtime-capability-surface.md)).",
   "disposition": "rewritten",
   "new": "[`topics/_open-runtime-capability-surface.md`](topics/_open-runtime-capability-surface.md))."
  },
  {
   "path": "docs/v3/convergence/model-src/_prelude.html",
   "line": 273,
   "token": "../concept-braindump.md",
   "content": "        <p>The convergence companion to <a href=\"../concept-braindump.md\">concept-braindump.md</a>,",
   "disposition": "rewritten",
   "new": "        <p>The convergence companion to <a href=\"../design/concept-braindump.md\">concept-braindump.md</a>,"
  },
  {
   "path": "docs/v3/convergence/model-src/_prelude.html",
   "line": 274,
   "token": "../design/approach.md",
   "content": "        <a href=\"approach.md\">approach.md</a> (the method + roadmap; source of truth for the ramp), and",
   "disposition": "rewritten",
   "reason": "retarget whose new form carries a sweep token",
   "new": "        <a href=\"../design/approach.md\">approach.md</a> (the method + roadmap; source of truth for the ramp), and"
  },
  {
   "path": "docs/v3/convergence/model-src/_prelude.html",
   "line": 275,
   "token": "../design/design-method-playbook.md",
   "content": "        <a href=\"design-method-playbook.md\">design-method-playbook.md</a> (how to use DDD, pseudocode,",
   "disposition": "rewritten",
   "reason": "retarget whose new form carries a sweep token",
   "new": "        <a href=\"../design/design-method-playbook.md\">design-method-playbook.md</a> (how to use DDD, pseudocode,"
  },
  {
   "path": "docs/v3/convergence/model-src/manifest.json",
   "line": 2,
   "token": "docs/v3",
   "content": "  \"html\": \"docs/v3/convergence/core-model.html\",",
   "disposition": "rewritten",
   "new": "  \"html\": \"v3/model/core-model.html\","
  },
  {
   "path": "docs/v3/convergence/model-src/manifest.json",
   "line": 2,
   "token": "convergence-path",
   "content": "  \"html\": \"docs/v3/convergence/core-model.html\",",
   "disposition": "rewritten",
   "new": "  \"html\": \"v3/model/core-model.html\","
  },
  {
   "path": "docs/v3/convergence/model-src/sections/01-l0a.html",
   "line": 188,
   "token": "../design/design-method-playbook.md",
   "content": "              <a href=\"design-method-playbook.md\">playbook §2.1</a>; a full evidence gate is only",
   "disposition": "rewritten",
   "reason": "retarget whose new form carries a sweep token",
   "new": "              <a href=\"../design/design-method-playbook.md\">playbook §2.1</a>; a full evidence gate is only"
  },
  {
   "path": "docs/v3/implementation/README.md",
   "line": 9,
   "token": "convergence-path",
   "content": "(`../convergence/`, `../topics/`) stays untouched by anything that happens",
   "disposition": "rewritten",
   "new": "(`../model/`, `../design/`) stays untouched by anything that happens"
  },
  {
   "path": "docs/v3/implementation/README.md",
   "line": 9,
   "token": "../convergence/",
   "content": "(`../convergence/`, `../topics/`) stays untouched by anything that happens",
   "disposition": "rewritten",
   "new": "(`../model/`, `../design/`) stays untouched by anything that happens"
  },
  {
   "path": "docs/v3/implementation/README.md",
   "line": 9,
   "token": "../topics/",
   "content": "(`../convergence/`, `../topics/`) stays untouched by anything that happens",
   "disposition": "rewritten",
   "new": "(`../model/`, `../design/`) stays untouched by anything that happens"
  },
  {
   "path": "docs/v3/implementation/README.md",
   "line": 38,
   "token": "convergence-path",
   "content": "1. **The model** — `../convergence/core-model.html`, authored via",
   "disposition": "rewritten",
   "new": "1. **The model** — `../model/core-model.html`, authored via"
  },
  {
   "path": "docs/v3/implementation/README.md",
   "line": 38,
   "token": "../convergence/core-model.html",
   "content": "1. **The model** — `../convergence/core-model.html`, authored via",
   "disposition": "rewritten",
   "new": "1. **The model** — `../model/core-model.html`, authored via"
  },
  {
   "path": "docs/v3/implementation/README.md",
   "line": 39,
   "token": "model-src",
   "content": "   `model-src/` (playbook §6). Its machine face is",
   "disposition": "rewritten",
   "new": "   `../model/` (playbook §6). Its machine face is"
  },
  {
   "path": "docs/v3/implementation/README.md",
   "line": 40,
   "token": "model-src",
   "content": "   `model-src/ledger.md`: 158 pseudocode units, 85 named rejections, the",
   "disposition": "rewritten",
   "new": "   `../model/ledger.md`: 158 pseudocode units, 85 named rejections, the"
  },
  {
   "path": "docs/v3/implementation/README.md",
   "line": 43,
   "token": "convergence-path",
   "content": "2. **The implementation contract** — `../convergence/implementation-contract.md`:",
   "disposition": "rewritten",
   "new": "2. **The implementation contract** — `../design/implementation-contract.md`:"
  },
  {
   "path": "docs/v3/implementation/README.md",
   "line": 43,
   "token": "../convergence/implementation-contract.md",
   "content": "2. **The implementation contract** — `../convergence/implementation-contract.md`:",
   "disposition": "rewritten",
   "new": "2. **The implementation contract** — `../design/implementation-contract.md`:"
  },
  {
   "path": "docs/v3/implementation/README.md",
   "line": 47,
   "token": "convergence-path",
   "content": "   `../convergence/approach.md`.",
   "disposition": "rewritten",
   "new": "   `../design/approach.md`."
  },
  {
   "path": "docs/v3/implementation/README.md",
   "line": 47,
   "token": "../convergence/approach.md",
   "content": "   `../convergence/approach.md`.",
   "disposition": "rewritten",
   "new": "   `../design/approach.md`."
  },
  {
   "path": "docs/v3/implementation/README.md",
   "line": 51,
   "token": "../topics/_closed-emit-contract.md",
   "content": "`f0e82d4e`; memo: `../topics/_closed-emit-contract.md`). There is no pending",
   "disposition": "rewritten",
   "new": "`f0e82d4e`; memo: `../design/topics/_closed-emit-contract.md`). There is no pending"
  },
  {
   "path": "docs/v3/implementation/README.md",
   "line": 622,
   "token": "model-src",
   "content": "  model plane (model-src edit + `check.sh` + ratification) and returns to",
   "disposition": "rewritten",
   "new": "  model plane (`../model` edit + `check.sh` + ratification) and returns to"
  },
  {
   "path": "docs/v3/implementation/autonomy-realignment.md",
   "line": 34,
   "token": "convergence-path",
   "content": "   autonomy-gating and deferred; they are actually SIZING/convergence",
   "disposition": "kept — historical",
   "reason": "historical — dated realignment record (narrates a past measurement)",
   "new": null
  },
  {
   "path": "docs/v3/implementation/autonomy-realignment.md",
   "line": 258,
   "token": "docs/v3",
   "content": "  MEASURED (grep over docs/v3 + skills + AGENTS.md): zero on live",
   "disposition": "kept — historical",
   "reason": "historical — dated realignment record (narrates a past measurement)",
   "new": null
  },
  {
   "path": "docs/v3/implementation/ch11-model-sync-delta.md",
   "line": 22,
   "token": "docs/v3",
   "content": "`docs/v3/convergence/model-src/ledger.md` §3 at base `cd52433b` MINUS the",
   "disposition": "kept — historical",
   "reason": "historical — delta derivation pinned to base cd52433b ↔ model 453d3be9",
   "new": null
  },
  {
   "path": "docs/v3/implementation/ch11-model-sync-delta.md",
   "line": 22,
   "token": "model-src",
   "content": "`docs/v3/convergence/model-src/ledger.md` §3 at base `cd52433b` MINUS the",
   "disposition": "kept — historical",
   "reason": "historical — delta derivation pinned to base cd52433b ↔ model 453d3be9",
   "new": null
  },
  {
   "path": "docs/v3/implementation/ch11-model-sync-delta.md",
   "line": 22,
   "token": "convergence-path",
   "content": "`docs/v3/convergence/model-src/ledger.md` §3 at base `cd52433b` MINUS the",
   "disposition": "kept — historical",
   "reason": "historical — delta derivation pinned to base cd52433b ↔ model 453d3be9",
   "new": null
  },
  {
   "path": "docs/v3/implementation/ch11-model-sync-delta.md",
   "line": 53,
   "token": "docs/v3",
   "content": "docs/v3/convergence/model-src/units/`):",
   "disposition": "kept — historical",
   "reason": "historical — delta derivation pinned to base cd52433b ↔ model 453d3be9",
   "new": null
  },
  {
   "path": "docs/v3/implementation/ch11-model-sync-delta.md",
   "line": 53,
   "token": "model-src",
   "content": "docs/v3/convergence/model-src/units/`):",
   "disposition": "kept — historical",
   "reason": "historical — delta derivation pinned to base cd52433b ↔ model 453d3be9",
   "new": null
  },
  {
   "path": "docs/v3/implementation/ch11-model-sync-delta.md",
   "line": 53,
   "token": "convergence-path",
   "content": "docs/v3/convergence/model-src/units/`):",
   "disposition": "kept — historical",
   "reason": "historical — delta derivation pinned to base cd52433b ↔ model 453d3be9",
   "new": null
  },
  {
   "path": "docs/v3/implementation/contract-draft-template.md",
   "line": 41,
   "token": "docs/v3",
   "content": "`docs/v3/implementation/contracts/ch<N>-<surface>-contract.md` — the",
   "disposition": "rewritten",
   "new": "`v3/implementation/contracts/ch<N>-<surface>-contract.md` — the"
  },
  {
   "path": "v3/implementation/contract-draft-template.md",
   "line": 0,
   "token": "docs/v3",
   "content": "(the contracts HOME was re-pinned once, `docs/v3/implementation/contracts` → `v3/implementation/contracts`, by ADR-015 — a relocation of the home as a whole, not of a file within it; filenames and row IDs unchanged, anchors unaffected).",
   "disposition": "introduced",
   "reason": "created by the migration itself (amendment parenthetical / appended log entry)"
  },
  {
   "path": "docs/v3/implementation/contracts/ch11-gate-format-contract.md",
   "line": 19,
   "token": "bare:topics/v3-gate-policy-config-design-synthesis.md",
   "content": "`topics/v3-gate-policy-config-design-synthesis.md` (direction only —",
   "disposition": "kept — historical",
   "reason": "ratified contract-draft: ratification-time Sources/context record",
   "new": null
  },
  {
   "path": "docs/v3/implementation/contracts/ch11-gate-format-contract.md",
   "line": 103,
   "token": "model-src",
   "content": "(`model-src/sections/08-l2.html`, the round-semantics paragraph —",
   "disposition": "kept — historical",
   "reason": "ratified contract-draft: ratification-time Sources/context record",
   "new": null
  },
  {
   "path": "docs/v3/implementation/contracts/ch12-runtime-core-contract.md",
   "line": 11,
   "token": "model-src",
   "content": "the section prose (`model-src/sections/03-l0c.html` / `04-l0d.html` /",
   "disposition": "kept — historical",
   "reason": "ratified contract-draft: ratification-time Sources/context record",
   "new": null
  },
  {
   "path": "docs/v3/implementation/flip-claims.md",
   "line": 379,
   "token": "docs/v3",
   "content": "  lint-visible home `docs/v3/implementation/contracts/` — fold",
   "disposition": "kept — historical",
   "reason": "historical — the Phase-1 flip's dated claims record",
   "new": null
  },
  {
   "path": "docs/v3/implementation/flip-claims.md",
   "line": 661,
   "token": "docs/v3",
   "content": "  docs/v3/implementation/adr does not exist). And §6's chapter-DoD enumeration gains the",
   "disposition": "kept — historical",
   "reason": "historical — the Phase-1 flip's dated claims record",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/README.md",
   "line": 4,
   "token": "../task-packet-template.md",
   "content": "[`../task-packet-template.md`](../task-packet-template.md)). The",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/README.md",
   "line": 4,
   "token": "../task-packet-template.md",
   "content": "[`../task-packet-template.md`](../task-packet-template.md)). The",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch11-p0-model-registry-sync.md",
   "line": 33,
   "token": "docs/v3",
   "content": "`docs/v3/implementation/ch11-model-sync-delta.md` (@ de33d245; pinned",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch11-p0-model-registry-sync.md",
   "line": 73,
   "token": "docs/v3",
   "content": "      \"docs/v3/implementation/packets/ch11-p0-model-registry-sync.md\"",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch11-p1-l1-authority.md",
   "line": 451,
   "token": "model-src",
   "content": "| W1 | `EventEnvelope` gains `expectedRole?: string` — OPTIONAL in the type so the `missing_role` branch stays representable (the `expectedVersion` precedent, stated in the type's own comment); semantically MANDATORY for actor envelopes from L1 on — A7 enforces (anchored: prose:ledger §4 l1, prose:model-src/sections/07-l1 Domain block) |",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch11-p1-l1-authority.md",
   "line": 466,
   "token": "model-src",
   "content": "| C4 | `CapabilityProfile` is realized TYPE-LEVEL: `WorkflowTemplate` gains an OPTIONAL `capabilityProfile` lookup surface realizing the ledger's `(role × step_id) → allowed action set` value; the CONTAINER SHAPE is BUILD FREEDOM within the boundary (the model's Config example is entry-list form, a keyed record is equally legal — the packet prescribes the SEMANTICS, C1–C3/C6, never the TS container; the arm-gate-1 correction: prescribing one shape would be an unanchored decision). The YAML format does NOT gain a key (authored restrictions are Absent → later; the ch8 validator's fixed keyset stands — a `capabilityProfile` key in a template FILE stays a V8 unknown-key rejection). PROOF BOUNDARY: explicit profiles are drivable only via directly-constructed `WorkflowTemplate` values (testkit/domain), never via the authoring format — stated, not hidden; `not_authorized` is behavioral through this channel (plan §11.2's count). DERIVATION: the unit's lookup REQUIRES a template-side profile surface; the ledger names the value type; the TS record shape and the type-level-only landing are the projection of \"explicit restrictions enter the same profile later\" + the Absent row (derived: prose:ledger §4 l1 CapabilityProfile, prose:model-src/sections/07-l1 Config block, prose:plan §11.2) |",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch11-p1-l1-authority.md",
   "line": 467,
   "token": "model-src",
   "content": "| C5 | `not_authorized` fires ONLY when the type exists as a transition AND capability forbids it (A9 precedes A10); under a profile-less template it is DORMANT by construction (C2 returns exactly the transition set) — the dormancy is STATED and the behavioral drive rides C4's explicit-profile channel (anchored: prose:model-src/sections/07-l1 Runtime note, prose:l1-pseudocode/HANDLE) |",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch11-p1-l1-authority.md",
   "line": 491,
   "token": "model-src",
   "content": "| T1 | The l1 golden trace (operative material) is reproduced by a NEW at-level trace test through the wired ingress+kernel+store — committed-row full-sequence equality + final state + the `role_not_authorized` step's no-state-change assertion (anchored: prose:model-src/sections/07-l1 Runtime trace) |",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch11-p1-l1-authority.md",
   "line": 613,
   "token": "docs/v3",
   "content": "  `docs/v3/implementation/plan.md` (the aligned §11.4 P1 row edit —",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch11-p1-l1-authority.md",
   "line": 718,
   "token": "docs/v3",
   "content": "      \"docs/v3/implementation/plan.md\"",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch11-p1-l1-authority.md",
   "line": 743,
   "token": "model-src",
   "content": "      { \"id\": \"W1\", \"class\": \"anchored\", \"refs\": [\"prose:ledger §4 l1\", \"prose:model-src/sections/07-l1\"] },",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch11-p1-l1-authority.md",
   "line": 753,
   "token": "model-src",
   "content": "      { \"id\": \"C4\", \"class\": \"derived\", \"refs\": [\"prose:ledger §4 l1\", \"prose:model-src/sections/07-l1\", \"prose:plan §11.2\"] },",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch11-p1-l1-authority.md",
   "line": 754,
   "token": "model-src",
   "content": "      { \"id\": \"C5\", \"class\": \"anchored\", \"refs\": [\"prose:model-src/sections/07-l1\", \"prose:l1-pseudocode/HANDLE\"] },",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch11-p1-l1-authority.md",
   "line": 763,
   "token": "model-src",
   "content": "      { \"id\": \"T1\", \"class\": \"anchored\", \"refs\": [\"prose:model-src/sections/07-l1\"] },",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch11-p2a-gate-admission.md",
   "line": 449,
   "token": "model-src",
   "content": "| G7 | Both registrations: `requiresRuntimeContext: false`; `implementation` `declarative` / `packaged` respectively; `execution` `\"inline\"`; the evaluators are read-only and stateless — pure over their two inputs, no captured mutable state, no I/O (the `l2/gate-is-read-only-stateless` invariant's evaluator half; its REVIEW disposition binds at P2b's rung) (anchored: prose:l2-pseudocode/GateRegistration, prose:ledger §2 l2, prose:model-src/sections/08-l2 Domain block) |",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch11-p2a-gate-admission.md",
   "line": 472,
   "token": "model-src",
   "content": "| D2 | `GateBinding { uses: string; config?: unknown }` — the ledger's field list (`where` lives in the containing keys: step + event type); the ADMITTED binding carries the EFFECTIVE config in its `config` field, its single config surface per A5's rule (the D6 intersection keeps the ledger field list — the arm re-check resolution) (anchored: prose:ledger §4 l2 GateBinding, prose:model-src/sections/08-l2 Domain block) |",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch11-p2a-gate-admission.md",
   "line": 606,
   "token": "docs/v3",
   "content": "  `docs/v3/implementation/plan.md` (the aligned §11.4 repartition —",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch11-p2a-gate-admission.md",
   "line": 753,
   "token": "docs/v3",
   "content": "      \"docs/v3/implementation/plan.md\"",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch11-p2a-gate-admission.md",
   "line": 776,
   "token": "model-src",
   "content": "      { \"id\": \"G7\", \"class\": \"anchored\", \"refs\": [\"prose:l2-pseudocode/GateRegistration\", \"prose:ledger §2 l2\", \"prose:model-src/sections/08-l2\"] },",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch11-p2a-gate-admission.md",
   "line": 789,
   "token": "model-src",
   "content": "      { \"id\": \"D2\", \"class\": \"anchored\", \"refs\": [\"prose:ledger §4 l2\", \"prose:model-src/sections/08-l2\"] },",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch11-p3a-process-admission.md",
   "line": 480,
   "token": "docs/v3",
   "content": "      \"docs/v3/implementation/plan.md\"",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch11-p3a-process-admission.md",
   "line": 728,
   "token": "docs/v3",
   "content": "boundary omitted `docs/v3/implementation/plan.md`, the R-ALIGNED-UP",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch11-p3b-process-execution.md",
   "line": 674,
   "token": "docs/v3",
   "content": "      \"docs/v3/implementation/plan.md\"",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch11-p3b-process-execution.md",
   "line": 710,
   "token": "model-src",
   "content": "      { \"id\": \"T3\", \"class\": \"anchored\", \"refs\": [\"prose:model-src/sections/09-l2a.html (the Runtime trace)\", \"contract:ch11-gate-format#C17\"] },",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch12-p0-gate-field.md",
   "line": 50,
   "token": "model-src",
   "content": "l2 HANDLE gate-loop segment, verbatim (`model-src/units/l2-pseudocode/HANDLE.txt`):",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch12-p0-gate-field.md",
   "line": 63,
   "token": "model-src",
   "content": "The l2a HANDLE block line, verbatim (`model-src/units/l2a-pseudocode/HANDLE.txt` —",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch12-p0-gate-field.md",
   "line": 216,
   "token": "docs/v3",
   "content": "      \"docs/v3/implementation/packets/ch12-p0-gate-field.md\"",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch4-p1-domain-and-ports.md",
   "line": 122,
   "token": "docs/v3",
   "content": "The names live in `docs/v3/convergence/model-src/ledger.md` §3 (the",
   "disposition": "rewritten",
   "new": "The names live in `v3/model/ledger.md` §3 (the"
  },
  {
   "path": "docs/v3/implementation/packets/ch4-p1-domain-and-ports.md",
   "line": 122,
   "token": "model-src",
   "content": "The names live in `docs/v3/convergence/model-src/ledger.md` §3 (the",
   "disposition": "rewritten",
   "new": "The names live in `v3/model/ledger.md` §3 (the"
  },
  {
   "path": "docs/v3/implementation/packets/ch4-p1-domain-and-ports.md",
   "line": 122,
   "token": "convergence-path",
   "content": "The names live in `docs/v3/convergence/model-src/ledger.md` §3 (the",
   "disposition": "rewritten",
   "new": "The names live in `v3/model/ledger.md` §3 (the"
  },
  {
   "path": "docs/v3/implementation/packets/ch5-p1-drift-suite.md",
   "line": 30,
   "token": "model-src",
   "content": "`model-src/units/` tree) and the code cannot shear without a red",
   "disposition": "rewritten",
   "new": "`v3/model/units/` tree) and the code cannot shear without a red"
  },
  {
   "path": "docs/v3/implementation/packets/ch5-p1-drift-suite.md",
   "line": 71,
   "token": "model-src",
   "content": "- Key set == the `model-src/units/` tree, derived at test time (158",
   "disposition": "rewritten",
   "new": "- Key set == the `v3/model/units/` tree, derived at test time (158"
  },
  {
   "path": "docs/v3/implementation/packets/ch5-p1-drift-suite.md",
   "line": 149,
   "token": "docs/v3",
   "content": "`docs/v3/convergence/model-src/` at test time; `unitMap.json` is",
   "disposition": "rewritten",
   "new": "`v3/model/` at test time; `unitMap.json` is"
  },
  {
   "path": "docs/v3/implementation/packets/ch5-p1-drift-suite.md",
   "line": 149,
   "token": "model-src",
   "content": "`docs/v3/convergence/model-src/` at test time; `unitMap.json` is",
   "disposition": "rewritten",
   "new": "`v3/model/` at test time; `unitMap.json` is"
  },
  {
   "path": "docs/v3/implementation/packets/ch5-p1-drift-suite.md",
   "line": 149,
   "token": "convergence-path",
   "content": "`docs/v3/convergence/model-src/` at test time; `unitMap.json` is",
   "disposition": "rewritten",
   "new": "`v3/model/` at test time; `unitMap.json` is"
  },
  {
   "path": "docs/v3/implementation/packets/ch5-p1-drift-suite.md",
   "line": 196,
   "token": "docs/v3",
   "content": "  `docs/v3/implementation/plan.md` §5.1 (parent-plan alignment,",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch5-p2-invariant-disposition-map.md",
   "line": 52,
   "token": "docs/v3",
   "content": "`docs/v3/implementation/invariant-disposition-map.md` — prose header",
   "disposition": "rewritten",
   "new": "`v3/implementation/invariant-disposition-map.md` — prose header"
  },
  {
   "path": "docs/v3/implementation/packets/ch5-p2-invariant-disposition-map.md",
   "line": 139,
   "token": "docs/v3",
   "content": "- Target files: `docs/v3/implementation/invariant-disposition-map.md`",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch5-p4-digest-slice.md",
   "line": 176,
   "token": "docs/v3",
   "content": "  it); `docs/v3/implementation/plan.md` §5.4 (null-encoding alignment,",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch6-p1-timeline-read.md",
   "line": 85,
   "token": "docs/v3",
   "content": "  `docs/v3/implementation/plan.md` (§6.2 aligned-at-ch6-P1 line), this",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch6-p2-tail-seed.md",
   "line": 103,
   "token": "docs/v3",
   "content": "  `docs/v3/implementation/plan.md` (§6.3 aligned-at-ch6-P2 line), this",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch6-p3-debug-bundle.md",
   "line": 103,
   "token": "docs/v3",
   "content": "  `docs/v3/implementation/plan.md` (§6.4 aligned-at-ch6-P3 line), this",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch6-p4a-operator-cli.md",
   "line": 127,
   "token": "docs/v3",
   "content": "  `v3/adr/README.md` index, `docs/v3/implementation/plan.md` (§6.5",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch6-p4b-dev-cli.md",
   "line": 93,
   "token": "docs/v3",
   "content": "  `package.json` (ROOT — `v3:cli:dev`), `docs/v3/implementation/plan.md`",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch7-p1-diag-channel-core.md",
   "line": 231,
   "token": "docs/v3",
   "content": "  `docs/v3/implementation/plan.md` (the \"aligned at ch7-P1",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch7-p2-diag-store.md",
   "line": 391,
   "token": "docs/v3",
   "content": "  `docs/v3/implementation/task-packet-template.md` (§3 gains the",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch7-p3-diag-consumers.md",
   "line": 485,
   "token": "docs/v3",
   "content": "  `docs/v3/implementation/plan.md` (the flag-4 PREPARED aligned edit",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch7-p3-diag-consumers.md",
   "line": 522,
   "token": "docs/v3",
   "content": "      \"docs/v3/implementation/plan.md\"",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch7-p3-diag-consumers.md",
   "line": 830,
   "token": "../diag/index.js",
   "content": "dynamic `await import(\"../diag/index.js\")` VALUE import in a floor",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch7-p3-diag-consumers.md",
   "line": 839,
   "token": "../diag/",
   "content": "annotation form; `import type … from \"../diag/…\"` remains the legal",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch7-p3-diag-consumers.md",
   "line": 876,
   "token": "../diag/index.js",
   "content": "        \"what\": \"the floor->diag lint ban covered only STATIC import declarations — a dynamic await import('../diag/index.js') value import in a floor file stayed lint-green, bypassing the mechanized guardrail (no production violation existed; the hole was the guardrail's)\",",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch8-p1-definition-module.md",
   "line": 218,
   "token": "../evil",
   "content": "   the dir path (S4); traversal-shaped ref (`{id: \"../evil\"}`) →",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch8-p1-definition-module.md",
   "line": 370,
   "token": "../evil",
   "content": "| S1 | The file-backed `DefinitionStore` is DIRECTORY-backed: for ref `{id, version}` the target filename is exactly `<id>@<version>.yaml` (the requested version rendered in decimal via `String(version)`) under the configured templates directory, and the match is BYTE-EXACT ON THE DIRECTORY LISTING (`readdir` + string equality) — never OS path resolution, which is case-insensitive on the default macOS filesystem and would resolve case-variant names (probe P12); presence/absence is thereby platform-independent. Consequences, stated: the only path ever OPENED is the directory joined with a MATCHED LISTING ENTRY — no caller-controlled path segment reaches an open call, so a traversal-shaped ref (`{id: \"../evil\"}`) can only miss (readdir entries contain no separators): the REF can never direct an open outside the directory. The directory's own CONTENT is a different axis and is operator-trusted (the README §5.5 threat model): a listing entry that is a SYMLINK is opened through the OS's follow semantics — NO no-follow claim is made (external-arm probe, 2026-07-10: readdir lists the symlink's own name, `readFile` follows its target; an lstat-reject rule would be an unanchored new decision and is deliberately not minted). The requested ref is NOT prevalidated: no byte-exact listing entry → `null`; when a matching entry DOES exist for an off-grammar request (e.g. `version: 1.5` rendering `x@1.5.yaml` against a real file of that name), the file loads and is judged by its OWN content — its version source form fails V3 — a typed rejection per S3's invalid≠absent rule, never a `null` special case. The listing is FRESH per `load` call — no process-local cache is authority (REV-B). The store does NOT validate the directory at construction — failures surface per-load (S4; the eager CLI-wiring gate is C29's, P2) (anchored: contract:ch8-template-format#C26) |",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch8-p1-definition-module.md",
   "line": 380,
   "token": "../testkit/",
   "content": "| B2 | The lint-boundary extension: the production testkit/drift import bans extend to `src/definition/**` — the STATIC entry (`src/definition/**` joins the ban files list) AND the DYNAMIC form (a merged `no-restricted-syntax` entry carrying `dynamicTestkitDriftSelectors`, per the config's flat-config MERGE RULE — definition/ claims no other syntax selectors, so it joins the plain group). Executed probes for BOTH forms (R-CLAIM-FORM-PROBES: probe the claim's form dimensions, not the rule's shape): a static testkit import in `src/definition/` → red; a dynamic `import(\"../testkit/…\")` → red; the legal imports (a `domain/` type import, the `yaml` package) → green; probes executed and REVERTED, transcripts in the build record (anchored: prose:plan §8.7, ADR-011) |",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch8-p1-definition-module.md",
   "line": 738,
   "token": "../testkit/",
   "content": "(`no-restricted-imports`, ADR-005); dynamic `import(\"../testkit/…\")`",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch8-p2-md1-migration-activation.md",
   "line": 221,
   "token": "../evil",
   "content": "   nonempty — an off-grammar id (`../evil`, uppercase) flows to the",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch8-p2-md1-migration-activation.md",
   "line": 445,
   "token": "docs/v3",
   "content": "  `docs/v3/implementation/plan.md` (M5's status receipts).",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/packets/ch8-p2-md1-migration-activation.md",
   "line": 496,
   "token": "docs/v3",
   "content": "      \"docs/v3/implementation/plan.md\"",
   "disposition": "kept — historical",
   "reason": "built packet: machine boundary data, build-commit narration, or provenance echo",
   "new": null
  },
  {
   "path": "docs/v3/implementation/plan.md",
   "line": 21,
   "token": "convergence-path",
   "content": "[`../convergence/implementation-contract.md`](../convergence/implementation-contract.md)",
   "disposition": "rewritten",
   "new": "[`../design/implementation-contract.md`](../design/implementation-contract.md)"
  },
  {
   "path": "docs/v3/implementation/plan.md",
   "line": 21,
   "token": "convergence-path",
   "content": "[`../convergence/implementation-contract.md`](../convergence/implementation-contract.md)",
   "disposition": "rewritten",
   "new": "[`../design/implementation-contract.md`](../design/implementation-contract.md)"
  },
  {
   "path": "docs/v3/implementation/plan.md",
   "line": 21,
   "token": "../convergence/implementation-contract.md",
   "content": "[`../convergence/implementation-contract.md`](../convergence/implementation-contract.md)",
   "disposition": "rewritten",
   "new": "[`../design/implementation-contract.md`](../design/implementation-contract.md)"
  },
  {
   "path": "docs/v3/implementation/plan.md",
   "line": 21,
   "token": "../convergence/implementation-contract.md",
   "content": "[`../convergence/implementation-contract.md`](../convergence/implementation-contract.md)",
   "disposition": "rewritten",
   "new": "[`../design/implementation-contract.md`](../design/implementation-contract.md)"
  },
  {
   "path": "docs/v3/implementation/plan.md",
   "line": 296,
   "token": "docs/v3",
   "content": "  `docs/v3/convergence/model-src/ledger.md` — the model↔code contract",
   "disposition": "rewritten",
   "new": "  `v3/model/ledger.md` — the model↔code contract"
  },
  {
   "path": "docs/v3/implementation/plan.md",
   "line": 296,
   "token": "model-src",
   "content": "  `docs/v3/convergence/model-src/ledger.md` — the model↔code contract",
   "disposition": "rewritten",
   "new": "  `v3/model/ledger.md` — the model↔code contract"
  },
  {
   "path": "docs/v3/implementation/plan.md",
   "line": 296,
   "token": "convergence-path",
   "content": "  `docs/v3/convergence/model-src/ledger.md` — the model↔code contract",
   "disposition": "rewritten",
   "new": "  `v3/model/ledger.md` — the model↔code contract"
  },
  {
   "path": "docs/v3/implementation/plan.md",
   "line": 370,
   "token": "docs/v3",
   "content": "corpus\"). This MOVES the README §1 default (`docs/v3/implementation/adr/`),",
   "disposition": "kept — historical",
   "reason": "kept — historical (former-default record)",
   "new": null
  },
  {
   "path": "docs/v3/implementation/plan.md",
   "line": 373,
   "token": "../v3/adr/_template.md",
   "content": "- **Template** ([`../../../v3/adr/_template.md`](../../../v3/adr/_template.md)):",
   "disposition": "rewritten",
   "new": "- **Template** ([`../adr/_template.md`](../adr/_template.md)):"
  },
  {
   "path": "docs/v3/implementation/plan.md",
   "line": 373,
   "token": "../v3/adr/_template.md",
   "content": "- **Template** ([`../../../v3/adr/_template.md`](../../../v3/adr/_template.md)):",
   "disposition": "rewritten",
   "new": "- **Template** ([`../adr/_template.md`](../adr/_template.md)):"
  },
  {
   "path": "docs/v3/implementation/plan.md",
   "line": 557,
   "token": "model-src",
   "content": "- **Inventory sources:** the `model-src/units/` tree (159 files at the ch11",
   "disposition": "rewritten",
   "new": "- **Inventory sources:** the `v3/model/units/` tree (159 files at the ch11"
  },
  {
   "path": "docs/v3/implementation/plan.md",
   "line": 561,
   "token": "docs/v3",
   "content": "- **Packet source:** `docs/v3/implementation/packets/` (the convention this",
   "disposition": "rewritten",
   "new": "- **Packet source:** `v3/implementation/packets/` (the convention this"
  },
  {
   "path": "docs/v3/implementation/plan.md",
   "line": 809,
   "token": "model-src",
   "content": "modules never import `drift/`; drift tests read the `model-src` documents",
   "disposition": "rewritten",
   "new": "modules never import `drift/`; drift tests read the `v3/model` documents"
  },
  {
   "path": "docs/v3/implementation/plan.md",
   "line": 834,
   "token": "model-src",
   "content": "   `model-src/units/` tree at test time; every `codeRef` resolves (file",
   "disposition": "rewritten",
   "new": "   `v3/model/units/` tree at test time; every `codeRef` resolves (file"
  },
  {
   "path": "docs/v3/implementation/plan.md",
   "line": 1070,
   "token": "../topics/_closed-v1-operability.md",
   "content": "  (`../topics/_closed-v1-operability.md`), NOT the seam itself.",
   "disposition": "rewritten",
   "new": "  (`../design/topics/_closed-v1-operability.md`), NOT the seam itself."
  },
  {
   "path": "docs/v3/implementation/process-log.md",
   "line": 1348,
   "token": "../diag/",
   "content": "  `await import(\"../diag/…\")` value import in a floor file stayed",
   "disposition": "kept — historical",
   "reason": "historical — append-only log (README §7); zero in-file edits, one appended entry",
   "new": null
  },
  {
   "path": "docs/v3/implementation/process-log.md",
   "line": 1830,
   "token": "docs/v3",
   "content": "  moved OUT of the skill into docs/v3/implementation/arm-pin.md",
   "disposition": "kept — historical",
   "reason": "historical — append-only log (README §7); zero in-file edits, one appended entry",
   "new": null
  },
  {
   "path": "docs/v3/implementation/process-log.md",
   "line": 2634,
   "token": "docs/v3",
   "content": "  packet's mutation boundary omitted docs/v3/implementation/plan.md,",
   "disposition": "kept — historical",
   "reason": "historical — append-only log (README §7); zero in-file edits, one appended entry",
   "new": null
  },
  {
   "path": "v3/implementation/process-log.md",
   "line": 0,
   "token": "docs/v3",
   "content": "(`docs/v3/` → `v3/`).** The named one-time mid-chapter exception the",
   "disposition": "introduced",
   "reason": "created by the migration itself (amendment parenthetical / appended log entry)"
  },
  {
   "path": "v3/implementation/process-log.md",
   "line": 0,
   "token": "docs/v3",
   "content": "unauthored, no bubbles in flight). `docs/v3/` ceased to exist; the",
   "disposition": "introduced",
   "reason": "created by the migration itself (amendment parenthetical / appended log entry)"
  },
  {
   "path": "v3/implementation/process-log.md",
   "line": 0,
   "token": "docs/v3",
   "content": "`docs/v3/convergence/model-src/` + the core-model files) →",
   "disposition": "introduced",
   "reason": "created by the migration itself (amendment parenthetical / appended log entry)"
  },
  {
   "path": "v3/implementation/process-log.md",
   "line": 0,
   "token": "model-src",
   "content": "`docs/v3/convergence/model-src/` + the core-model files) →",
   "disposition": "introduced",
   "reason": "created by the migration itself (amendment parenthetical / appended log entry)"
  },
  {
   "path": "v3/implementation/process-log.md",
   "line": 0,
   "token": "convergence-path",
   "content": "`docs/v3/convergence/model-src/` + the core-model files) →",
   "disposition": "introduced",
   "reason": "created by the migration itself (amendment parenthetical / appended log entry)"
  },
  {
   "path": "docs/v3/implementation/process-v2-design.md",
   "line": 144,
   "token": "docs/v3",
   "content": "- **Home:** `docs/v3/implementation/contracts/chN-<surface>-contract.md`;",
   "disposition": "rewritten",
   "new": "- **Home:** `v3/implementation/contracts/chN-<surface>-contract.md`;"
  },
  {
   "path": "docs/v3/implementation/process-v2-design.md",
   "line": 208,
   "token": "docs/v3",
   "content": "  the skill:** `docs/v3/implementation/contract-draft-template.md` (§5)",
   "disposition": "rewritten",
   "new": "  the skill:** `v3/implementation/contract-draft-template.md` (§5)"
  },
  {
   "path": "docs/v3/implementation/process-v2-design.md",
   "line": 626,
   "token": "docs/v3",
   "content": "5. NEW `docs/v3/implementation/contract-draft-template.md` — the",
   "disposition": "kept — historical",
   "reason": "kept — historical (the flip's executed edit list)",
   "new": null
  },
  {
   "path": "docs/v3/implementation/process-v2-design.md",
   "line": 639,
   "token": "docs/v3",
   "content": "7. `docs/v3/implementation/plan.md` — TWO sections, and this item RIDES",
   "disposition": "kept — historical",
   "reason": "kept — historical (the flip's executed edit list)",
   "new": null
  },
  {
   "path": "v3/implementation/process-v2-design.md",
   "line": 0,
   "token": "docs/v3",
   "content": "  (the contracts HOME was re-pinned once, `docs/v3/implementation/contracts` → `v3/implementation/contracts`, by ADR-015 — a relocation of the home as a whole, not of a file within it; filenames and row IDs unchanged, anchors unaffected). Draft-lint checks (Phase 0): row-ID uniqueness;",
   "disposition": "introduced",
   "reason": "created by the migration itself (amendment parenthetical / appended log entry)"
  },
  {
   "path": "docs/v3/implementation/task-packet-template.md",
   "line": 62,
   "token": "model-src",
   "content": "  `model-src/units/<section>/<UnitName>.txt`; `<unit-disposition>` one of",
   "disposition": "rewritten",
   "new": "  `v3/model/units/<section>/<UnitName>.txt`; `<unit-disposition>` one of"
  },
  {
   "path": "docs/v3/implementation/task-packet-template.md",
   "line": 238,
   "token": "docs/v3",
   "content": "- **Contract-drafts** (`docs/v3/implementation/contracts/`) are linted",
   "disposition": "rewritten",
   "new": "- **Contract-drafts** (`v3/implementation/contracts/`) are linted"
  },
  {
   "path": "docs/v3/research/README.md",
   "line": 9,
   "token": "../topics/",
   "content": "[`../topics/`](../topics/README.md). The converged model contract lives in",
   "disposition": "kept — resolution preserved",
   "reason": "kept — resolution preserved (target moves with the tree)",
   "new": null
  },
  {
   "path": "docs/v3/research/README.md",
   "line": 9,
   "token": "../topics/README.md",
   "content": "[`../topics/`](../topics/README.md). The converged model contract lives in",
   "disposition": "kept — resolution preserved",
   "reason": "kept — resolution preserved (target moves with the tree)",
   "new": null
  },
  {
   "path": "docs/v3/research/README.md",
   "line": 10,
   "token": "convergence-path",
   "content": "[`../convergence/`](../convergence/approach.md).",
   "disposition": "rewritten",
   "new": "[`../approach.md`](../approach.md)."
  },
  {
   "path": "docs/v3/research/README.md",
   "line": 10,
   "token": "convergence-path",
   "content": "[`../convergence/`](../convergence/approach.md).",
   "disposition": "rewritten",
   "new": "[`../approach.md`](../approach.md)."
  },
  {
   "path": "docs/v3/research/README.md",
   "line": 10,
   "token": "../convergence/",
   "content": "[`../convergence/`](../convergence/approach.md).",
   "disposition": "rewritten",
   "new": "[`../approach.md`](../approach.md)."
  },
  {
   "path": "docs/v3/research/README.md",
   "line": 10,
   "token": "../convergence/approach.md",
   "content": "[`../convergence/`](../convergence/approach.md).",
   "disposition": "rewritten",
   "new": "[`../approach.md`](../approach.md)."
  },
  {
   "path": "docs/v3/research/README.md",
   "line": 32,
   "token": "convergence-path",
   "content": "  [`../convergence/design-method-playbook.md`](../convergence/design-method-playbook.md).",
   "disposition": "rewritten",
   "new": "  [`../design-method-playbook.md`](../design-method-playbook.md)."
  },
  {
   "path": "docs/v3/research/README.md",
   "line": 32,
   "token": "convergence-path",
   "content": "  [`../convergence/design-method-playbook.md`](../convergence/design-method-playbook.md).",
   "disposition": "rewritten",
   "new": "  [`../design-method-playbook.md`](../design-method-playbook.md)."
  },
  {
   "path": "docs/v3/research/README.md",
   "line": 32,
   "token": "../convergence/design-method-playbook.md",
   "content": "  [`../convergence/design-method-playbook.md`](../convergence/design-method-playbook.md).",
   "disposition": "rewritten",
   "new": "  [`../design-method-playbook.md`](../design-method-playbook.md)."
  },
  {
   "path": "docs/v3/research/README.md",
   "line": 32,
   "token": "../convergence/design-method-playbook.md",
   "content": "  [`../convergence/design-method-playbook.md`](../convergence/design-method-playbook.md).",
   "disposition": "rewritten",
   "new": "  [`../design-method-playbook.md`](../design-method-playbook.md)."
  },
  {
   "path": "docs/v3/research/README.md",
   "line": 37,
   "token": "convergence-path",
   "content": "*-study.md  ->  _synthesis.md  ->  convergence/approach.md + core-model.html",
   "disposition": "rewritten",
   "new": "*-study.md  ->  _synthesis.md  ->  ../approach.md + ../../model/core-model.html"
  },
  {
   "path": "docs/v3/research/README.md",
   "line": 37,
   "token": "bare:convergence/approach.md",
   "content": "*-study.md  ->  _synthesis.md  ->  convergence/approach.md + core-model.html",
   "disposition": "rewritten",
   "new": "*-study.md  ->  _synthesis.md  ->  ../approach.md + ../../model/core-model.html"
  },
  {
   "path": "docs/v3/research/README.md",
   "line": 38,
   "token": "convergence-path",
   "content": "                                   convergence/core-model-todo.md         (active contract follow-ups)",
   "disposition": "rewritten",
   "new": "                                   ../../model/core-model-todo.md         (active contract follow-ups)"
  },
  {
   "path": "docs/v3/research/README.md",
   "line": 38,
   "token": "bare:convergence/core-model-todo.md",
   "content": "                                   convergence/core-model-todo.md         (active contract follow-ups)",
   "disposition": "rewritten",
   "new": "                                   ../../model/core-model-todo.md         (active contract follow-ups)"
  },
  {
   "path": "docs/v3/research/README.md",
   "line": 39,
   "token": "convergence-path",
   "content": "                                   convergence/core-model-future-topic.md (deferred, level-owned topics)",
   "disposition": "rewritten",
   "new": "                                   ../../model/core-model-future-topic.md (deferred, level-owned topics)"
  },
  {
   "path": "docs/v3/research/README.md",
   "line": 39,
   "token": "bare:convergence/core-model-future-topic.md",
   "content": "                                   convergence/core-model-future-topic.md (deferred, level-owned topics)",
   "disposition": "rewritten",
   "new": "                                   ../../model/core-model-future-topic.md (deferred, level-owned topics)"
  },
  {
   "path": "docs/v3/research/_synthesis.md",
   "line": 67,
   "token": "../topics/v3-gate-policy-config-design-synthesis.md",
   "content": "| — | [`v3-gate-policy-config-design-synthesis.md`](../topics/v3-gate-policy-config-design-synthesis.md) | gate/policy/config synthesis | L2 design input (pre-series) |",
   "disposition": "kept — resolution preserved",
   "reason": "kept — resolution preserved (target moves with the tree)",
   "new": null
  },
  {
   "path": "docs/v3/research/_synthesis.md",
   "line": 579,
   "token": "../topics/_open-agent-runtime-and-pane-layout.md",
   "content": "topic** ([`_open-agent-runtime-and-pane-layout.md`](../topics/_open-agent-runtime-and-pane-layout.md)).",
   "disposition": "kept — resolution preserved",
   "reason": "kept — resolution preserved (target moves with the tree)",
   "new": null
  },
  {
   "path": "docs/v3/research/bitsafe-ai-os-capture.md",
   "line": 3734,
   "token": "../mcp-tools/index.ts",
   "content": "`loadConfig()` reads `/workspace/agent/container.json` → `buildSystemPromptAddendum()` (agent identity + live destinations) → discover `/workspace/extra/*` dirs → register the built-in `nanoclaw` MCP server (`bun run .../mcp-tools/index.ts`) + any from `container.json` → `createProvider(name, opts)` (providers self-register via barrel import) → optional `ensureMemoryScaffold()` (only if `provider.usesMemoryScaffold`; Claude skips it) → `runPollLoop(...)`. All IO via the two DBs; logs to stderr.",
   "disposition": "kept — not a repo pointer",
   "reason": "kept — not a repo pointer (unresolvable before the migration: code-relative import or example path)",
   "new": null
  },
  {
   "path": "docs/v3/research/bitsafe-workflow-simulation.md",
   "line": 3,
   "token": "convergence-path",
   "content": "**Status: COMPLETE — 17/17 simulations, 16-gap register, synthesis; gaps LIFTED 2026-07-06 into `convergence/core-model-future-topic.md` (12 gaps, level/seam sections) + `topics/_open-creation-identity.md` (GAP-1) + `topics/_open-kernel-floor.md` (GAP-2, GAP-11, boundary canon) — see the register's Disposition column** · Started 2026-07-06 · Companion to `bitsafe-ai-os-capture.md` (source facts) and `nanoclaw-study.md` (runtime/supervision read)",
   "disposition": "rewritten",
   "new": "**Status: COMPLETE — 17/17 simulations, 16-gap register, synthesis; gaps LIFTED 2026-07-06 into `../../model/core-model-future-topic.md` (12 gaps, level/seam sections) + `topics/_open-creation-identity.md` (GAP-1) + `topics/_open-kernel-floor.md` (GAP-2, GAP-11, boundary canon) — see the register's Disposition column** · Started 2026-07-06 · Companion to `bitsafe-ai-os-capture.md` (source facts) and `nanoclaw-study.md` (runtime/supervision read)"
  },
  {
   "path": "docs/v3/research/bitsafe-workflow-simulation.md",
   "line": 3,
   "token": "bare:convergence/core-model-future-topic.md",
   "content": "**Status: COMPLETE — 17/17 simulations, 16-gap register, synthesis; gaps LIFTED 2026-07-06 into `convergence/core-model-future-topic.md` (12 gaps, level/seam sections) + `topics/_open-creation-identity.md` (GAP-1) + `topics/_open-kernel-floor.md` (GAP-2, GAP-11, boundary canon) — see the register's Disposition column** · Started 2026-07-06 · Companion to `bitsafe-ai-os-capture.md` (source facts) and `nanoclaw-study.md` (runtime/supervision read)",
   "disposition": "rewritten",
   "new": "**Status: COMPLETE — 17/17 simulations, 16-gap register, synthesis; gaps LIFTED 2026-07-06 into `../../model/core-model-future-topic.md` (12 gaps, level/seam sections) + `topics/_open-creation-identity.md` (GAP-1) + `topics/_open-kernel-floor.md` (GAP-2, GAP-11, boundary canon) — see the register's Disposition column** · Started 2026-07-06 · Companion to `bitsafe-ai-os-capture.md` (source facts) and `nanoclaw-study.md` (runtime/supervision read)"
  },
  {
   "path": "docs/v3/research/bitsafe-workflow-simulation.md",
   "line": 3,
   "token": "bare:topics/_open-creation-identity.md",
   "content": "**Status: COMPLETE — 17/17 simulations, 16-gap register, synthesis; gaps LIFTED 2026-07-06 into `convergence/core-model-future-topic.md` (12 gaps, level/seam sections) + `topics/_open-creation-identity.md` (GAP-1) + `topics/_open-kernel-floor.md` (GAP-2, GAP-11, boundary canon) — see the register's Disposition column** · Started 2026-07-06 · Companion to `bitsafe-ai-os-capture.md` (source facts) and `nanoclaw-study.md` (runtime/supervision read)",
   "disposition": "rewritten",
   "new": "**Status: COMPLETE — 17/17 simulations, 16-gap register, synthesis; gaps LIFTED 2026-07-06 into `../../model/core-model-future-topic.md` (12 gaps, level/seam sections) + `topics/_open-creation-identity.md` (GAP-1) + `topics/_open-kernel-floor.md` (GAP-2, GAP-11, boundary canon) — see the register's Disposition column** · Started 2026-07-06 · Companion to `bitsafe-ai-os-capture.md` (source facts) and `nanoclaw-study.md` (runtime/supervision read)"
  },
  {
   "path": "docs/v3/research/bitsafe-workflow-simulation.md",
   "line": 3,
   "token": "bare:topics/_open-kernel-floor.md",
   "content": "**Status: COMPLETE — 17/17 simulations, 16-gap register, synthesis; gaps LIFTED 2026-07-06 into `convergence/core-model-future-topic.md` (12 gaps, level/seam sections) + `topics/_open-creation-identity.md` (GAP-1) + `topics/_open-kernel-floor.md` (GAP-2, GAP-11, boundary canon) — see the register's Disposition column** · Started 2026-07-06 · Companion to `bitsafe-ai-os-capture.md` (source facts) and `nanoclaw-study.md` (runtime/supervision read)",
   "disposition": "rewritten",
   "new": "**Status: COMPLETE — 17/17 simulations, 16-gap register, synthesis; gaps LIFTED 2026-07-06 into `../../model/core-model-future-topic.md` (12 gaps, level/seam sections) + `topics/_open-creation-identity.md` (GAP-1) + `topics/_open-kernel-floor.md` (GAP-2, GAP-11, boundary canon) — see the register's Disposition column** · Started 2026-07-06 · Companion to `bitsafe-ai-os-capture.md` (source facts) and `nanoclaw-study.md` (runtime/supervision read)"
  },
  {
   "path": "docs/v3/research/bitsafe-workflow-simulation.md",
   "line": 30,
   "token": "model-src",
   "content": "**Built (normative, machine-checked corpus — `convergence/model-src/`):**",
   "disposition": "rewritten",
   "new": "**Built (normative, machine-checked corpus — `../../model/`):**"
  },
  {
   "path": "docs/v3/research/bitsafe-workflow-simulation.md",
   "line": 30,
   "token": "convergence-path",
   "content": "**Built (normative, machine-checked corpus — `convergence/model-src/`):**",
   "disposition": "rewritten",
   "new": "**Built (normative, machine-checked corpus — `../../model/`):**"
  },
  {
   "path": "docs/v3/research/bitsafe-workflow-simulation.md",
   "line": 30,
   "token": "bare:convergence/model-src/",
   "content": "**Built (normative, machine-checked corpus — `convergence/model-src/`):**",
   "disposition": "rewritten",
   "new": "**Built (normative, machine-checked corpus — `../../model/`):**"
  },
  {
   "path": "docs/v3/research/bitsafe-workflow-simulation.md",
   "line": 35,
   "token": "bare:topics/_open-kernel-primitives.md",
   "content": "- Five kernel primitives (contracts in-corpus, memo `topics/_open-kernel-primitives.md`):",
   "disposition": "kept — resolution preserved",
   "reason": "kept — resolution preserved (topics/ and research/ keep their common parent)",
   "new": null
  },
  {
   "path": "docs/v3/research/bitsafe-workflow-simulation.md",
   "line": 43,
   "token": "convergence-path",
   "content": "**Planned (topic map only — `convergence/core-model-future-topic.md`):** L5 skill surface & portable capability packaging · L6 triggers & scheduling · L7 grants & credentials · L8 channels, task inbox & EventNormalizer · L9 wait conditions, liveness & recovery · L10 gatekeeper & private-data federation · L11 memory & durable agent identity · L12 definition PRs & metacognition · L13 trust calibration & evals · cross-level seams (identity/sandbox/session, observe seam, operational observability & cost).",
   "disposition": "rewritten",
   "new": "**Planned (topic map only — `../../model/core-model-future-topic.md`):** L5 skill surface & portable capability packaging · L6 triggers & scheduling · L7 grants & credentials · L8 channels, task inbox & EventNormalizer · L9 wait conditions, liveness & recovery · L10 gatekeeper & private-data federation · L11 memory & durable agent identity · L12 definition PRs & metacognition · L13 trust calibration & evals · cross-level seams (identity/sandbox/session, observe seam, operational observability & cost)."
  },
  {
   "path": "docs/v3/research/bitsafe-workflow-simulation.md",
   "line": 43,
   "token": "bare:convergence/core-model-future-topic.md",
   "content": "**Planned (topic map only — `convergence/core-model-future-topic.md`):** L5 skill surface & portable capability packaging · L6 triggers & scheduling · L7 grants & credentials · L8 channels, task inbox & EventNormalizer · L9 wait conditions, liveness & recovery · L10 gatekeeper & private-data federation · L11 memory & durable agent identity · L12 definition PRs & metacognition · L13 trust calibration & evals · cross-level seams (identity/sandbox/session, observe seam, operational observability & cost).",
   "disposition": "rewritten",
   "new": "**Planned (topic map only — `../../model/core-model-future-topic.md`):** L5 skill surface & portable capability packaging · L6 triggers & scheduling · L7 grants & credentials · L8 channels, task inbox & EventNormalizer · L9 wait conditions, liveness & recovery · L10 gatekeeper & private-data federation · L11 memory & durable agent identity · L12 definition PRs & metacognition · L13 trust calibration & evals · cross-level seams (identity/sandbox/session, observe seam, operational observability & cost)."
  },
  {
   "path": "docs/v3/research/bitsafe-workflow-simulation.md",
   "line": 505,
   "token": "bare:topics/_open-creation-identity.md",
   "content": "| GAP-1 | Creation-grain idempotency (trigger/event → `CREATE_INSTANCE` exactly-once binding) | S2–S17 (all 16 simulations after S1; S16 also at timer-series grain) | `CREATE_INSTANCE` carries no idempotency/external-identity key and `UNIQUE(instance_id, op_id)` is per-instance scope, so a redelivered event or a re-claimed L6 fire mints twin instances. L8 §1's store-enforced correlation covers the *channel-borne* path as written; the L6 fire→create seam and the bare operator/API ingress have no story. **Two documented real-world casualties, dual failure faces: BitSafe's 26 duplicate findings pages (S9, capture 1404 — too many instances) and the 16 stuck production threads (S17, capture 1480 — zero instances); L8 §1's mint-or-return-existing oracle kills both with one mechanism, and v3-as-built would reproduce both.** | Lifted → `topics/_open-creation-identity.md` (design-fork memo) |",
   "disposition": "kept — resolution preserved",
   "reason": "kept — resolution preserved (topics/ and research/ keep their common parent)",
   "new": null
  },
  {
   "path": "docs/v3/research/bitsafe-workflow-simulation.md",
   "line": 506,
   "token": "bare:topics/_open-kernel-floor.md",
   "content": "| GAP-2 | Instance-weight floor: no sub-instance-weight form and no instance-boundary guidance for trivial/high-volume work | S1, S2, S5, S6, S9, S13, S14, S16, S17 | Every run pays the full instance lifecycle + LC archival regardless of coordination content — a one-property audited CRM write, a ~7,700-run autofill fleet, a 4-check-vs-1-sweep fork, or a 35-check batch-vs-fan-out decision all force the author into a boundary call with no stated rule. To ratify: is the answer \"by design — below this line, stay provider-native\", and if so, where is the line written? | Lifted → `topics/_open-kernel-floor.md` §1 |",
   "disposition": "kept — resolution preserved",
   "reason": "kept — resolution preserved (topics/ and research/ keep their common parent)",
   "new": null
  },
  {
   "path": "docs/v3/research/bitsafe-workflow-simulation.md",
   "line": 515,
   "token": "bare:topics/_open-kernel-floor.md",
   "content": "| GAP-11 | Cross-instance exclusive-resource claim (mutex/serialization/lease) has no kernel construct | S11, S12 | A singleton external resource (one dev VM = one smoke slot; one shared file path) must be held exclusively by one instance at a time, with queue/priority (S11) or TTL-expiry (S12's claim_file, 25-min auto-expire) — but no claim/lock spans instances: the wait slot is per-instance, L4 links per-parent, L6 §3 governs scheduler dispatch not mid-instance acquisition, GAP-10's counters are quota not exclusion, and `Lease` is deliberately poisoned vocabulary (\"implies TTL + renewal; the model has none\"). To ratify: is resource/file-grain exclusion below the kernel's line by design, with the kernel's contribution capped at task-grain creation identity (GAP-1)? | Lifted → `topics/_open-kernel-floor.md` §2 |",
   "disposition": "kept — resolution preserved",
   "reason": "kept — resolution preserved (topics/ and research/ keep their common parent)",
   "new": null
  },
  {
   "path": "docs/v3/research/dbos-study.md",
   "line": 27,
   "token": "convergence-path",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/dbos-study.md",
   "line": 27,
   "token": "convergence-path",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/dbos-study.md",
   "line": 27,
   "token": "../convergence/approach.md",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/dbos-study.md",
   "line": 27,
   "token": "../convergence/approach.md",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/dbos-study.md",
   "line": 28,
   "token": "convergence-path",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/dbos-study.md",
   "line": 28,
   "token": "convergence-path",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/dbos-study.md",
   "line": 28,
   "token": "../convergence/core-model.html",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/dbos-study.md",
   "line": 28,
   "token": "../convergence/core-model.html",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/gastown-study.md",
   "line": 19,
   "token": "../topics/_open-agent-runtime-and-pane-layout.md",
   "content": "topic** ([`_open-agent-runtime-and-pane-layout.md`](../topics/_open-agent-runtime-and-pane-layout.md)):",
   "disposition": "kept — resolution preserved",
   "reason": "kept — resolution preserved (target moves with the tree)",
   "new": null
  },
  {
   "path": "docs/v3/research/gastown-study.md",
   "line": 38,
   "token": "convergence-path",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/gastown-study.md",
   "line": 38,
   "token": "convergence-path",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/gastown-study.md",
   "line": 38,
   "token": "../convergence/approach.md",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/gastown-study.md",
   "line": 38,
   "token": "../convergence/approach.md",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/gastown-study.md",
   "line": 39,
   "token": "convergence-path",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/gastown-study.md",
   "line": 39,
   "token": "convergence-path",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/gastown-study.md",
   "line": 39,
   "token": "../convergence/core-model.html",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/gastown-study.md",
   "line": 39,
   "token": "../convergence/core-model.html",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/gstack-study.md",
   "line": 31,
   "token": "convergence-path",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/gstack-study.md",
   "line": 31,
   "token": "convergence-path",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/gstack-study.md",
   "line": 31,
   "token": "../convergence/approach.md",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/gstack-study.md",
   "line": 31,
   "token": "../convergence/approach.md",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/gstack-study.md",
   "line": 32,
   "token": "convergence-path",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/gstack-study.md",
   "line": 32,
   "token": "convergence-path",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/gstack-study.md",
   "line": 32,
   "token": "../convergence/core-model.html",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/gstack-study.md",
   "line": 32,
   "token": "../convergence/core-model.html",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/hermes-agent-study.md",
   "line": 35,
   "token": "convergence-path",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/hermes-agent-study.md",
   "line": 35,
   "token": "convergence-path",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/hermes-agent-study.md",
   "line": 35,
   "token": "../convergence/approach.md",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/hermes-agent-study.md",
   "line": 35,
   "token": "../convergence/approach.md",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/hermes-agent-study.md",
   "line": 36,
   "token": "convergence-path",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/hermes-agent-study.md",
   "line": 36,
   "token": "convergence-path",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/hermes-agent-study.md",
   "line": 36,
   "token": "../convergence/core-model.html",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/hermes-agent-study.md",
   "line": 36,
   "token": "../convergence/core-model.html",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/honcho-study.md",
   "line": 33,
   "token": "convergence-path",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/honcho-study.md",
   "line": 33,
   "token": "convergence-path",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/honcho-study.md",
   "line": 33,
   "token": "../convergence/approach.md",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/honcho-study.md",
   "line": 33,
   "token": "../convergence/approach.md",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/honcho-study.md",
   "line": 34,
   "token": "convergence-path",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/honcho-study.md",
   "line": 34,
   "token": "convergence-path",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/honcho-study.md",
   "line": 34,
   "token": "../convergence/core-model.html",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/honcho-study.md",
   "line": 34,
   "token": "../convergence/core-model.html",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/langgraph-study.md",
   "line": 33,
   "token": "convergence-path",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/langgraph-study.md",
   "line": 33,
   "token": "convergence-path",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/langgraph-study.md",
   "line": 33,
   "token": "../convergence/approach.md",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/langgraph-study.md",
   "line": 33,
   "token": "../convergence/approach.md",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/langgraph-study.md",
   "line": 34,
   "token": "convergence-path",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/langgraph-study.md",
   "line": 34,
   "token": "convergence-path",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/langgraph-study.md",
   "line": 34,
   "token": "../convergence/core-model.html",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/langgraph-study.md",
   "line": 34,
   "token": "../convergence/core-model.html",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/langgraph-study.md",
   "line": 418,
   "token": "../base.py",
   "content": "The postgres schema (`checkpoint-postgres/.../base.py:43-91`) has three tables: `checkpoints` (PK",
   "disposition": "kept — not a repo pointer",
   "reason": "kept — not a repo pointer (unresolvable before the migration: code-relative import or example path)",
   "new": null
  },
  {
   "path": "docs/v3/research/nanoclaw-study.md",
   "line": 31,
   "token": "convergence-path",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/nanoclaw-study.md",
   "line": 31,
   "token": "convergence-path",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/nanoclaw-study.md",
   "line": 31,
   "token": "../convergence/approach.md",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/nanoclaw-study.md",
   "line": 31,
   "token": "../convergence/approach.md",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/nanoclaw-study.md",
   "line": 32,
   "token": "convergence-path",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model"
  },
  {
   "path": "docs/v3/research/nanoclaw-study.md",
   "line": 32,
   "token": "convergence-path",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model"
  },
  {
   "path": "docs/v3/research/nanoclaw-study.md",
   "line": 32,
   "token": "../convergence/core-model.html",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model"
  },
  {
   "path": "docs/v3/research/nanoclaw-study.md",
   "line": 32,
   "token": "../convergence/core-model.html",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model"
  },
  {
   "path": "docs/v3/research/omnigent-study.md",
   "line": 4,
   "token": "../topics/_open-agent-runtime-and-pane-layout.md",
   "content": "[`../topics/_open-agent-runtime-and-pane-layout.md`](../topics/_open-agent-runtime-and-pane-layout.md))",
   "disposition": "kept — resolution preserved",
   "reason": "kept — resolution preserved (target moves with the tree)",
   "new": null
  },
  {
   "path": "docs/v3/research/omnigent-study.md",
   "line": 4,
   "token": "../topics/_open-agent-runtime-and-pane-layout.md",
   "content": "[`../topics/_open-agent-runtime-and-pane-layout.md`](../topics/_open-agent-runtime-and-pane-layout.md))",
   "disposition": "kept — resolution preserved",
   "reason": "kept — resolution preserved (target moves with the tree)",
   "new": null
  },
  {
   "path": "docs/v3/research/omnigent-study.md",
   "line": 19,
   "token": "convergence-path",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/omnigent-study.md",
   "line": 19,
   "token": "convergence-path",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/omnigent-study.md",
   "line": 19,
   "token": "../convergence/approach.md",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/omnigent-study.md",
   "line": 19,
   "token": "../convergence/approach.md",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/omnigent-study.md",
   "line": 20,
   "token": "convergence-path",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/omnigent-study.md",
   "line": 20,
   "token": "convergence-path",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/omnigent-study.md",
   "line": 20,
   "token": "../convergence/core-model.html",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/omnigent-study.md",
   "line": 20,
   "token": "../convergence/core-model.html",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/omnigent-study.md",
   "line": 297,
   "token": "../topics/_open-agent-runtime-and-pane-layout.md",
   "content": "[`../topics/_open-agent-runtime-and-pane-layout.md`](../topics/_open-agent-runtime-and-pane-layout.md)",
   "disposition": "kept — resolution preserved",
   "reason": "kept — resolution preserved (target moves with the tree)",
   "new": null
  },
  {
   "path": "docs/v3/research/omnigent-study.md",
   "line": 297,
   "token": "../topics/_open-agent-runtime-and-pane-layout.md",
   "content": "[`../topics/_open-agent-runtime-and-pane-layout.md`](../topics/_open-agent-runtime-and-pane-layout.md)",
   "disposition": "kept — resolution preserved",
   "reason": "kept — resolution preserved (target moves with the tree)",
   "new": null
  },
  {
   "path": "docs/v3/research/omnigent-study.md",
   "line": 377,
   "token": "../topics/_dynamic-orchestrator-workflow.md",
   "content": "> [`../topics/_dynamic-orchestrator-workflow.md`](../topics/_dynamic-orchestrator-workflow.md).",
   "disposition": "kept — resolution preserved",
   "reason": "kept — resolution preserved (target moves with the tree)",
   "new": null
  },
  {
   "path": "docs/v3/research/omnigent-study.md",
   "line": 377,
   "token": "../topics/_dynamic-orchestrator-workflow.md",
   "content": "> [`../topics/_dynamic-orchestrator-workflow.md`](../topics/_dynamic-orchestrator-workflow.md).",
   "disposition": "kept — resolution preserved",
   "reason": "kept — resolution preserved (target moves with the tree)",
   "new": null
  },
  {
   "path": "docs/v3/research/paperclip-study.md",
   "line": 25,
   "token": "convergence-path",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/paperclip-study.md",
   "line": 25,
   "token": "convergence-path",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/paperclip-study.md",
   "line": 25,
   "token": "../convergence/approach.md",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/paperclip-study.md",
   "line": 25,
   "token": "../convergence/approach.md",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/paperclip-study.md",
   "line": 26,
   "token": "convergence-path",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/paperclip-study.md",
   "line": 26,
   "token": "convergence-path",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/paperclip-study.md",
   "line": 26,
   "token": "../convergence/core-model.html",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/paperclip-study.md",
   "line": 26,
   "token": "../convergence/core-model.html",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/ruflo-v3-sdlc-workflow.md",
   "line": 18,
   "token": "convergence-path",
   "content": "- [`../convergence/design-method-playbook.md`](../convergence/design-method-playbook.md)",
   "disposition": "rewritten",
   "new": "- [`../design-method-playbook.md`](../design-method-playbook.md)"
  },
  {
   "path": "docs/v3/research/ruflo-v3-sdlc-workflow.md",
   "line": 18,
   "token": "convergence-path",
   "content": "- [`../convergence/design-method-playbook.md`](../convergence/design-method-playbook.md)",
   "disposition": "rewritten",
   "new": "- [`../design-method-playbook.md`](../design-method-playbook.md)"
  },
  {
   "path": "docs/v3/research/ruflo-v3-sdlc-workflow.md",
   "line": 18,
   "token": "../convergence/design-method-playbook.md",
   "content": "- [`../convergence/design-method-playbook.md`](../convergence/design-method-playbook.md)",
   "disposition": "rewritten",
   "new": "- [`../design-method-playbook.md`](../design-method-playbook.md)"
  },
  {
   "path": "docs/v3/research/ruflo-v3-sdlc-workflow.md",
   "line": 18,
   "token": "../convergence/design-method-playbook.md",
   "content": "- [`../convergence/design-method-playbook.md`](../convergence/design-method-playbook.md)",
   "disposition": "rewritten",
   "new": "- [`../design-method-playbook.md`](../design-method-playbook.md)"
  },
  {
   "path": "docs/v3/research/ruflo-v3-sdlc-workflow.md",
   "line": 356,
   "token": "bare:research/dossier",
   "content": "- Recursive research/dossier expansion is a third concept.",
   "disposition": "kept — not a repo pointer",
   "reason": "kept — not a repo pointer (unresolvable before the migration)",
   "new": null
  },
  {
   "path": "docs/v3/research/ruflo-v3-sdlc-workflow.md",
   "line": 556,
   "token": "bare:research/dossier",
   "content": "3. **Recursive research/dossier expansion** — seed-driven graph exploration with provenance and budget caps.",
   "disposition": "kept — not a repo pointer",
   "reason": "kept — not a repo pointer (unresolvable before the migration)",
   "new": null
  },
  {
   "path": "docs/v3/research/superpowers-study.md",
   "line": 32,
   "token": "convergence-path",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/superpowers-study.md",
   "line": 32,
   "token": "convergence-path",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/superpowers-study.md",
   "line": 32,
   "token": "../convergence/approach.md",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/superpowers-study.md",
   "line": 32,
   "token": "../convergence/approach.md",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/superpowers-study.md",
   "line": 33,
   "token": "convergence-path",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/superpowers-study.md",
   "line": 33,
   "token": "convergence-path",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/superpowers-study.md",
   "line": 33,
   "token": "../convergence/core-model.html",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/superpowers-study.md",
   "line": 33,
   "token": "../convergence/core-model.html",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/symphony-study.md",
   "line": 22,
   "token": "convergence-path",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/symphony-study.md",
   "line": 22,
   "token": "convergence-path",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/symphony-study.md",
   "line": 22,
   "token": "../convergence/approach.md",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/symphony-study.md",
   "line": 22,
   "token": "../convergence/approach.md",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/symphony-study.md",
   "line": 23,
   "token": "convergence-path",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/symphony-study.md",
   "line": 23,
   "token": "convergence-path",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/symphony-study.md",
   "line": 23,
   "token": "../convergence/core-model.html",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/symphony-study.md",
   "line": 23,
   "token": "../convergence/core-model.html",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/temporal-study.md",
   "line": 37,
   "token": "convergence-path",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/temporal-study.md",
   "line": 37,
   "token": "convergence-path",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/temporal-study.md",
   "line": 37,
   "token": "../convergence/approach.md",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/temporal-study.md",
   "line": 37,
   "token": "../convergence/approach.md",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/temporal-study.md",
   "line": 38,
   "token": "convergence-path",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/temporal-study.md",
   "line": 38,
   "token": "convergence-path",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/temporal-study.md",
   "line": 38,
   "token": "../convergence/core-model.html",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/temporal-study.md",
   "line": 38,
   "token": "../convergence/core-model.html",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/vibe-kanban-study.md",
   "line": 37,
   "token": "convergence-path",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/vibe-kanban-study.md",
   "line": 37,
   "token": "convergence-path",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/vibe-kanban-study.md",
   "line": 37,
   "token": "../convergence/approach.md",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/vibe-kanban-study.md",
   "line": 37,
   "token": "../convergence/approach.md",
   "content": "- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)",
   "disposition": "rewritten",
   "new": "- [`../approach.md`](../approach.md) — the level roadmap (L0a … L14)"
  },
  {
   "path": "docs/v3/research/vibe-kanban-study.md",
   "line": 38,
   "token": "convergence-path",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/vibe-kanban-study.md",
   "line": 38,
   "token": "convergence-path",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/vibe-kanban-study.md",
   "line": 38,
   "token": "../convergence/core-model.html",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/vibe-kanban-study.md",
   "line": 38,
   "token": "../convergence/core-model.html",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model itself"
  },
  {
   "path": "docs/v3/research/vibe-kanban-study.md",
   "line": 258,
   "token": "../container.rs",
   "content": "`cleanup_orphan_executions` (`services/.../container.rs:272-326`) finds every",
   "disposition": "kept — not a repo pointer",
   "reason": "kept — not a repo pointer (unresolvable before the migration: code-relative import or example path)",
   "new": null
  },
  {
   "path": "docs/v3/research/vibe-kanban-study.md",
   "line": 436,
   "token": "../container.rs",
   "content": "`container()` returns a `ContainerService` (`services/.../container.rs:88`), but the only",
   "disposition": "kept — not a repo pointer",
   "reason": "kept — not a repo pointer (unresolvable before the migration: code-relative import or example path)",
   "new": null
  },
  {
   "path": "docs/v3/research/vibe-kanban-study.md",
   "line": 557,
   "token": "../approvals.rs",
   "content": "When an agent's tool needs permission, `Approvals::create_with_waiter` (`services/.../approvals.rs:86`)",
   "disposition": "kept — not a repo pointer",
   "reason": "kept — not a repo pointer (unresolvable before the migration: code-relative import or example path)",
   "new": null
  },
  {
   "path": "docs/v3/topics/README.md",
   "line": 4,
   "token": "../research/",
   "content": "design syntheses. Unlike [`../research/`](../research/README.md) (which reads",
   "disposition": "kept — resolution preserved",
   "reason": "kept — resolution preserved (target moves with the tree)",
   "new": null
  },
  {
   "path": "docs/v3/topics/README.md",
   "line": 4,
   "token": "../research/README.md",
   "content": "design syntheses. Unlike [`../research/`](../research/README.md) (which reads",
   "disposition": "kept — resolution preserved",
   "reason": "kept — resolution preserved (target moves with the tree)",
   "new": null
  },
  {
   "path": "docs/v3/topics/README.md",
   "line": 7,
   "token": "convergence-path",
   "content": "[`../convergence/`](../convergence/approach.md).",
   "disposition": "rewritten",
   "new": "[`../approach.md`](../approach.md)."
  },
  {
   "path": "docs/v3/topics/README.md",
   "line": 7,
   "token": "convergence-path",
   "content": "[`../convergence/`](../convergence/approach.md).",
   "disposition": "rewritten",
   "new": "[`../approach.md`](../approach.md)."
  },
  {
   "path": "docs/v3/topics/README.md",
   "line": 7,
   "token": "../convergence/",
   "content": "[`../convergence/`](../convergence/approach.md).",
   "disposition": "rewritten",
   "new": "[`../approach.md`](../approach.md)."
  },
  {
   "path": "docs/v3/topics/README.md",
   "line": 7,
   "token": "../convergence/approach.md",
   "content": "[`../convergence/`](../convergence/approach.md).",
   "disposition": "rewritten",
   "new": "[`../approach.md`](../approach.md)."
  },
  {
   "path": "docs/v3/topics/README.md",
   "line": 12,
   "token": "convergence-path",
   "content": "  [`../convergence/core-model-todo.md`](../convergence/core-model-todo.md).",
   "disposition": "rewritten",
   "new": "  [`../../model/core-model-todo.md`](../../model/core-model-todo.md)."
  },
  {
   "path": "docs/v3/topics/README.md",
   "line": 12,
   "token": "convergence-path",
   "content": "  [`../convergence/core-model-todo.md`](../convergence/core-model-todo.md).",
   "disposition": "rewritten",
   "new": "  [`../../model/core-model-todo.md`](../../model/core-model-todo.md)."
  },
  {
   "path": "docs/v3/topics/README.md",
   "line": 12,
   "token": "../convergence/core-model-todo.md",
   "content": "  [`../convergence/core-model-todo.md`](../convergence/core-model-todo.md).",
   "disposition": "rewritten",
   "new": "  [`../../model/core-model-todo.md`](../../model/core-model-todo.md)."
  },
  {
   "path": "docs/v3/topics/README.md",
   "line": 12,
   "token": "../convergence/core-model-todo.md",
   "content": "  [`../convergence/core-model-todo.md`](../convergence/core-model-todo.md).",
   "disposition": "rewritten",
   "new": "  [`../../model/core-model-todo.md`](../../model/core-model-todo.md)."
  },
  {
   "path": "docs/v3/topics/README.md",
   "line": 14,
   "token": "convergence-path",
   "content": "  [`../convergence/core-model-future-topic.md`](../convergence/core-model-future-topic.md)",
   "disposition": "rewritten",
   "new": "  [`../../model/core-model-future-topic.md`](../../model/core-model-future-topic.md)"
  },
  {
   "path": "docs/v3/topics/README.md",
   "line": 14,
   "token": "convergence-path",
   "content": "  [`../convergence/core-model-future-topic.md`](../convergence/core-model-future-topic.md)",
   "disposition": "rewritten",
   "new": "  [`../../model/core-model-future-topic.md`](../../model/core-model-future-topic.md)"
  },
  {
   "path": "docs/v3/topics/README.md",
   "line": 14,
   "token": "../convergence/core-model-future-topic.md",
   "content": "  [`../convergence/core-model-future-topic.md`](../convergence/core-model-future-topic.md)",
   "disposition": "rewritten",
   "new": "  [`../../model/core-model-future-topic.md`](../../model/core-model-future-topic.md)"
  },
  {
   "path": "docs/v3/topics/README.md",
   "line": 14,
   "token": "../convergence/core-model-future-topic.md",
   "content": "  [`../convergence/core-model-future-topic.md`](../convergence/core-model-future-topic.md)",
   "disposition": "rewritten",
   "new": "  [`../../model/core-model-future-topic.md`](../../model/core-model-future-topic.md)"
  },
  {
   "path": "docs/v3/topics/README.md",
   "line": 45,
   "token": "model-src",
   "content": "| [`_open-kernel-primitives.md`](_open-kernel-primitives.md) | **COMPLETE — the rebaseline executed as waves 1–5, all ratified (2026-07-06)** — the five kernel primitives (Errand · ChoicePoint · Admission · Warrant · Directive) are named contracts in the corpus at their earned birth points (Admission@L0d · Warrant@L1 · Errand@LC2 · ChoicePoint+Directive@L3) with instance/phase labels corpus-wide; behavior-neutrality machine-checked per wave (registries + per-block rejection multisets; one deliberate ratified delta, F-W4-2). §9 is the per-wave findings log. The named debt (the dedicated F-W1-2 ingress/idempotency hardening touch) was discharged and ratified 2026-07-06 — the strand is fully closed. | Realized in `core-model.html` (model-src units); `core-model-todo.md` Parts A/B/D/E cross-refs. |",
   "disposition": "kept — name",
   "reason": "bare-name mention in a dated record/backlog heading; basenames are invariant, the name rule keeps it",
   "new": null
  },
  {
   "path": "docs/v3/topics/_closed-emit-contract.md",
   "line": 44,
   "token": "convergence-path",
   "content": "Relation: [`../convergence/core-model-todo.md`](../convergence/core-model-todo.md)",
   "disposition": "rewritten",
   "new": "Relation: [`../../model/core-model-todo.md`](../../model/core-model-todo.md)"
  },
  {
   "path": "docs/v3/topics/_closed-emit-contract.md",
   "line": 44,
   "token": "convergence-path",
   "content": "Relation: [`../convergence/core-model-todo.md`](../convergence/core-model-todo.md)",
   "disposition": "rewritten",
   "new": "Relation: [`../../model/core-model-todo.md`](../../model/core-model-todo.md)"
  },
  {
   "path": "docs/v3/topics/_closed-emit-contract.md",
   "line": 44,
   "token": "../convergence/core-model-todo.md",
   "content": "Relation: [`../convergence/core-model-todo.md`](../convergence/core-model-todo.md)",
   "disposition": "rewritten",
   "new": "Relation: [`../../model/core-model-todo.md`](../../model/core-model-todo.md)"
  },
  {
   "path": "docs/v3/topics/_closed-emit-contract.md",
   "line": 44,
   "token": "../convergence/core-model-todo.md",
   "content": "Relation: [`../convergence/core-model-todo.md`](../convergence/core-model-todo.md)",
   "disposition": "rewritten",
   "new": "Relation: [`../../model/core-model-todo.md`](../../model/core-model-todo.md)"
  },
  {
   "path": "docs/v3/topics/_closed-v1-operability.md",
   "line": 6,
   "token": "convergence-path",
   "content": "[`implementation-contract.md`](../convergence/implementation-contract.md),",
   "disposition": "rewritten",
   "new": "[`implementation-contract.md`](../implementation-contract.md),"
  },
  {
   "path": "docs/v3/topics/_closed-v1-operability.md",
   "line": 6,
   "token": "../convergence/implementation-contract.md",
   "content": "[`implementation-contract.md`](../convergence/implementation-contract.md),",
   "disposition": "rewritten",
   "new": "[`implementation-contract.md`](../implementation-contract.md),"
  },
  {
   "path": "docs/v3/topics/_closed-v1-operability.md",
   "line": 8,
   "token": "convergence-path",
   "content": "[`approach.md`](../convergence/approach.md), and `core-model-todo.md` T1",
   "disposition": "rewritten",
   "new": "[`approach.md`](../approach.md), and `core-model-todo.md` T1"
  },
  {
   "path": "docs/v3/topics/_closed-v1-operability.md",
   "line": 8,
   "token": "../convergence/approach.md",
   "content": "[`approach.md`](../convergence/approach.md), and `core-model-todo.md` T1",
   "disposition": "rewritten",
   "new": "[`approach.md`](../approach.md), and `core-model-todo.md` T1"
  },
  {
   "path": "docs/v3/topics/_closed-v1-operability.md",
   "line": 54,
   "token": "convergence-path",
   "content": "`../convergence/implementation-contract.md`: every IC-* item names concrete",
   "disposition": "rewritten",
   "new": "`../implementation-contract.md`: every IC-* item names concrete"
  },
  {
   "path": "docs/v3/topics/_closed-v1-operability.md",
   "line": 54,
   "token": "../convergence/implementation-contract.md",
   "content": "`../convergence/implementation-contract.md`: every IC-* item names concrete",
   "disposition": "rewritten",
   "new": "`../implementation-contract.md`: every IC-* item names concrete"
  },
  {
   "path": "docs/v3/topics/_closed-v1-operability.md",
   "line": 57,
   "token": "convergence-path",
   "content": "plus schema/lint/CI checks, and [`approach.md`](../convergence/approach.md)",
   "disposition": "rewritten",
   "new": "plus schema/lint/CI checks, and [`approach.md`](../approach.md)"
  },
  {
   "path": "docs/v3/topics/_closed-v1-operability.md",
   "line": 57,
   "token": "../convergence/approach.md",
   "content": "plus schema/lint/CI checks, and [`approach.md`](../convergence/approach.md)",
   "disposition": "rewritten",
   "new": "plus schema/lint/CI checks, and [`approach.md`](../approach.md)"
  },
  {
   "path": "docs/v3/topics/_closed-v1-operability.md",
   "line": 68,
   "token": "convergence-path",
   "content": "`../convergence/core-model-future-topic.md` (Observe seam §§1–7), and the",
   "disposition": "rewritten",
   "new": "`../../model/core-model-future-topic.md` (Observe seam §§1–7), and the"
  },
  {
   "path": "docs/v3/topics/_closed-v1-operability.md",
   "line": 68,
   "token": "../convergence/core-model-future-topic.md",
   "content": "`../convergence/core-model-future-topic.md` (Observe seam §§1–7), and the",
   "disposition": "rewritten",
   "new": "`../../model/core-model-future-topic.md` (Observe seam §§1–7), and the"
  },
  {
   "path": "docs/v3/topics/_closed-v1-operability.md",
   "line": 247,
   "token": "model-src",
   "content": "implementation's type layer (point 1). This touches the model-src/ledger",
   "disposition": "kept — name",
   "reason": "bare-name mention in a dated record/backlog heading; basenames are invariant, the name rule keeps it",
   "new": null
  },
  {
   "path": "docs/v3/topics/_closed-v1-operability.md",
   "line": 337,
   "token": "convergence-path",
   "content": "source is now [`implementation-contract.md`](../convergence/implementation-contract.md)",
   "disposition": "rewritten",
   "new": "source is now [`implementation-contract.md`](../implementation-contract.md)"
  },
  {
   "path": "docs/v3/topics/_closed-v1-operability.md",
   "line": 337,
   "token": "../convergence/implementation-contract.md",
   "content": "source is now [`implementation-contract.md`](../convergence/implementation-contract.md)",
   "disposition": "rewritten",
   "new": "source is now [`implementation-contract.md`](../implementation-contract.md)"
  },
  {
   "path": "docs/v3/topics/_closed-v1-operability.md",
   "line": 344,
   "token": "convergence-path",
   "content": "[`core-model-todo.md`](../convergence/core-model-todo.md) points back at",
   "disposition": "rewritten",
   "new": "[`core-model-todo.md`](../../model/core-model-todo.md) points back at"
  },
  {
   "path": "docs/v3/topics/_closed-v1-operability.md",
   "line": 344,
   "token": "../convergence/core-model-todo.md",
   "content": "[`core-model-todo.md`](../convergence/core-model-todo.md) points back at",
   "disposition": "rewritten",
   "new": "[`core-model-todo.md`](../../model/core-model-todo.md) points back at"
  },
  {
   "path": "docs/v3/topics/_closed-v1-operability.md",
   "line": 356,
   "token": "convergence-path",
   "content": "end of [`implementation-contract.md`](../convergence/implementation-contract.md),",
   "disposition": "rewritten",
   "new": "end of [`implementation-contract.md`](../implementation-contract.md),"
  },
  {
   "path": "docs/v3/topics/_closed-v1-operability.md",
   "line": 356,
   "token": "../convergence/implementation-contract.md",
   "content": "end of [`implementation-contract.md`](../convergence/implementation-contract.md),",
   "disposition": "rewritten",
   "new": "end of [`implementation-contract.md`](../implementation-contract.md),"
  },
  {
   "path": "docs/v3/topics/_dynamic-orchestrator-workflow.md",
   "line": 20,
   "token": "../research/bitsafe-workflow-simulation.md",
   "content": "> `../research/bitsafe-workflow-simulation.md`):** the static half of this memo's",
   "disposition": "kept — resolution preserved",
   "reason": "kept — resolution preserved (target moves with the tree)",
   "new": null
  },
  {
   "path": "docs/v3/topics/_open-agent-runtime-and-pane-layout.md",
   "line": 20,
   "token": "../research/_synthesis.md",
   "content": "[`_synthesis.md`](../research/_synthesis.md) decision matrix (see its §8 addendum for studies 11–12).",
   "disposition": "kept — resolution preserved",
   "reason": "kept — resolution preserved (target moves with the tree)",
   "new": null
  },
  {
   "path": "docs/v3/topics/_open-agent-runtime-and-pane-layout.md",
   "line": 370,
   "token": "../research/gastown-study.md",
   "content": "[`gastown-study.md`](../research/gastown-study.md) §L0e.",
   "disposition": "kept — resolution preserved",
   "reason": "kept — resolution preserved (target moves with the tree)",
   "new": null
  },
  {
   "path": "docs/v3/topics/_open-agent-runtime-and-pane-layout.md",
   "line": 387,
   "token": "../research/nanoclaw-study.md",
   "content": "### nanoclaw — the four-channel scorecard, source-verified ([`../research/nanoclaw-study.md`](../research/nanoclaw-study.md), `_synthesis.md` §13)",
   "disposition": "kept — resolution preserved",
   "reason": "kept — resolution preserved (target moves with the tree)",
   "new": null
  },
  {
   "path": "docs/v3/topics/_open-agent-runtime-and-pane-layout.md",
   "line": 387,
   "token": "../research/nanoclaw-study.md",
   "content": "### nanoclaw — the four-channel scorecard, source-verified ([`../research/nanoclaw-study.md`](../research/nanoclaw-study.md), `_synthesis.md` §13)",
   "disposition": "kept — resolution preserved",
   "reason": "kept — resolution preserved (target moves with the tree)",
   "new": null
  },
  {
   "path": "docs/v3/topics/_open-agent-runtime-and-pane-layout.md",
   "line": 540,
   "token": "../research/omnigent-study.md",
   "content": "[`omnigent-study.md`](../research/omnigent-study.md) §5.1 (done 2026-07-04).",
   "disposition": "kept — resolution preserved",
   "reason": "kept — resolution preserved (target moves with the tree)",
   "new": null
  },
  {
   "path": "docs/v3/topics/_open-creation-identity.md",
   "line": 5,
   "token": "bare:research/bitsafe-workflow-simulation.md",
   "content": "Source: the BitSafe workflow simulation (`research/bitsafe-workflow-simulation.md`, GAP-1 — surfaced by 16 of 17 simulated workflows)",
   "disposition": "kept — resolution preserved",
   "reason": "kept — resolution preserved (topics/ and research/ keep their common parent)",
   "new": null
  },
  {
   "path": "docs/v3/topics/_open-kernel-floor.md",
   "line": 5,
   "token": "bare:research/bitsafe-workflow-simulation.md",
   "content": "Source: the BitSafe workflow simulation (`research/bitsafe-workflow-simulation.md`, GAP-2 + GAP-11 + the recurring \"not a kernel workload\" verdicts)",
   "disposition": "kept — resolution preserved",
   "reason": "kept — resolution preserved (topics/ and research/ keep their common parent)",
   "new": null
  },
  {
   "path": "docs/v3/topics/_open-kernel-primitives.md",
   "line": 43,
   "token": "convergence-path",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model this memo re-reads.",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model this memo re-reads."
  },
  {
   "path": "docs/v3/topics/_open-kernel-primitives.md",
   "line": 43,
   "token": "convergence-path",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model this memo re-reads.",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model this memo re-reads."
  },
  {
   "path": "docs/v3/topics/_open-kernel-primitives.md",
   "line": 43,
   "token": "../convergence/core-model.html",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model this memo re-reads.",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model this memo re-reads."
  },
  {
   "path": "docs/v3/topics/_open-kernel-primitives.md",
   "line": 43,
   "token": "../convergence/core-model.html",
   "content": "- [`../convergence/core-model.html`](../convergence/core-model.html) — the model this memo re-reads.",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model.html`](../../model/core-model.html) — the model this memo re-reads."
  },
  {
   "path": "docs/v3/topics/_open-kernel-primitives.md",
   "line": 44,
   "token": "convergence-path",
   "content": "- [`../convergence/core-model-todo.md`](../convergence/core-model-todo.md) — Parts A/B/D/E already",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model-todo.md`](../../model/core-model-todo.md) — Parts A/B/D/E already"
  },
  {
   "path": "docs/v3/topics/_open-kernel-primitives.md",
   "line": 44,
   "token": "convergence-path",
   "content": "- [`../convergence/core-model-todo.md`](../convergence/core-model-todo.md) — Parts A/B/D/E already",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model-todo.md`](../../model/core-model-todo.md) — Parts A/B/D/E already"
  },
  {
   "path": "docs/v3/topics/_open-kernel-primitives.md",
   "line": 44,
   "token": "../convergence/core-model-todo.md",
   "content": "- [`../convergence/core-model-todo.md`](../convergence/core-model-todo.md) — Parts A/B/D/E already",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model-todo.md`](../../model/core-model-todo.md) — Parts A/B/D/E already"
  },
  {
   "path": "docs/v3/topics/_open-kernel-primitives.md",
   "line": 44,
   "token": "../convergence/core-model-todo.md",
   "content": "- [`../convergence/core-model-todo.md`](../convergence/core-model-todo.md) — Parts A/B/D/E already",
   "disposition": "rewritten",
   "new": "- [`../../model/core-model-todo.md`](../../model/core-model-todo.md) — Parts A/B/D/E already"
  },
  {
   "path": "docs/v3/topics/_open-kernel-primitives.md",
   "line": 47,
   "token": "model-src",
   "content": "- `../convergence/model-src/` + `tools/v3-model/` — the unit-delta storage that makes the",
   "disposition": "rewritten",
   "new": "- `../../model/` + `tools/v3-model/` — the unit-delta storage that makes the"
  },
  {
   "path": "docs/v3/topics/_open-kernel-primitives.md",
   "line": 47,
   "token": "convergence-path",
   "content": "- `../convergence/model-src/` + `tools/v3-model/` — the unit-delta storage that makes the",
   "disposition": "rewritten",
   "new": "- `../../model/` + `tools/v3-model/` — the unit-delta storage that makes the"
  },
  {
   "path": "docs/v3/topics/_open-kernel-primitives.md",
   "line": 47,
   "token": "../convergence/model-src/",
   "content": "- `../convergence/model-src/` + `tools/v3-model/` — the unit-delta storage that makes the",
   "disposition": "rewritten",
   "new": "- `../../model/` + `tools/v3-model/` — the unit-delta storage that makes the"
  },
  {
   "path": "docs/v3/topics/_open-runtime-capability-surface.md",
   "line": 11,
   "token": "convergence-path",
   "content": "in [`implementation-contract.md`](../convergence/implementation-contract.md).*",
   "disposition": "rewritten",
   "new": "in [`implementation-contract.md`](../implementation-contract.md).*"
  },
  {
   "path": "docs/v3/topics/_open-runtime-capability-surface.md",
   "line": 11,
   "token": "../convergence/implementation-contract.md",
   "content": "in [`implementation-contract.md`](../convergence/implementation-contract.md).*",
   "disposition": "rewritten",
   "new": "in [`implementation-contract.md`](../implementation-contract.md).*"
  },
  {
   "path": "docs/v3/topics/_open-v3-core-api-surface.md",
   "line": 125,
   "token": "convergence-path",
   "content": "> [`../convergence/core-model-future-topic.md`](../convergence/core-model-future-topic.md)",
   "disposition": "rewritten",
   "new": "> [`../../model/core-model-future-topic.md`](../../model/core-model-future-topic.md)"
  },
  {
   "path": "docs/v3/topics/_open-v3-core-api-surface.md",
   "line": 125,
   "token": "convergence-path",
   "content": "> [`../convergence/core-model-future-topic.md`](../convergence/core-model-future-topic.md)",
   "disposition": "rewritten",
   "new": "> [`../../model/core-model-future-topic.md`](../../model/core-model-future-topic.md)"
  },
  {
   "path": "docs/v3/topics/_open-v3-core-api-surface.md",
   "line": 125,
   "token": "../convergence/core-model-future-topic.md",
   "content": "> [`../convergence/core-model-future-topic.md`](../convergence/core-model-future-topic.md)",
   "disposition": "rewritten",
   "new": "> [`../../model/core-model-future-topic.md`](../../model/core-model-future-topic.md)"
  },
  {
   "path": "docs/v3/topics/_open-v3-core-api-surface.md",
   "line": 125,
   "token": "../convergence/core-model-future-topic.md",
   "content": "> [`../convergence/core-model-future-topic.md`](../convergence/core-model-future-topic.md)",
   "disposition": "rewritten",
   "new": "> [`../../model/core-model-future-topic.md`](../../model/core-model-future-topic.md)"
  },
  {
   "path": "docs/v3/topics/_open-v3-storage-architecture.md",
   "line": 76,
   "token": "../research/nanoclaw-study.md",
   "content": "> **Reference — nanoclaw (`../research/nanoclaw-study.md`, `_synthesis.md` §13).**",
   "disposition": "kept — resolution preserved",
   "reason": "kept — resolution preserved (target moves with the tree)",
   "new": null
  },
  {
   "path": "docs/v3/topics/_open-v3-storage-architecture.md",
   "line": 233,
   "token": "convergence-path",
   "content": "> more detail in [`../convergence/core-model-future-topic.md`](../convergence/core-model-future-topic.md)",
   "disposition": "rewritten",
   "new": "> more detail in [`../../model/core-model-future-topic.md`](../../model/core-model-future-topic.md)"
  },
  {
   "path": "docs/v3/topics/_open-v3-storage-architecture.md",
   "line": 233,
   "token": "convergence-path",
   "content": "> more detail in [`../convergence/core-model-future-topic.md`](../convergence/core-model-future-topic.md)",
   "disposition": "rewritten",
   "new": "> more detail in [`../../model/core-model-future-topic.md`](../../model/core-model-future-topic.md)"
  },
  {
   "path": "docs/v3/topics/_open-v3-storage-architecture.md",
   "line": 233,
   "token": "../convergence/core-model-future-topic.md",
   "content": "> more detail in [`../convergence/core-model-future-topic.md`](../convergence/core-model-future-topic.md)",
   "disposition": "rewritten",
   "new": "> more detail in [`../../model/core-model-future-topic.md`](../../model/core-model-future-topic.md)"
  },
  {
   "path": "docs/v3/topics/_open-v3-storage-architecture.md",
   "line": 233,
   "token": "../convergence/core-model-future-topic.md",
   "content": "> more detail in [`../convergence/core-model-future-topic.md`](../convergence/core-model-future-topic.md)",
   "disposition": "rewritten",
   "new": "> more detail in [`../../model/core-model-future-topic.md`](../../model/core-model-future-topic.md)"
  },
  {
   "path": "docs/v3/topics/_open-v3-workflow-inspector-ui.md",
   "line": 237,
   "token": "convergence-path",
   "content": "> [`../convergence/core-model-future-topic.md`](../convergence/core-model-future-topic.md)",
   "disposition": "rewritten",
   "new": "> [`../../model/core-model-future-topic.md`](../../model/core-model-future-topic.md)"
  },
  {
   "path": "docs/v3/topics/_open-v3-workflow-inspector-ui.md",
   "line": 237,
   "token": "convergence-path",
   "content": "> [`../convergence/core-model-future-topic.md`](../convergence/core-model-future-topic.md)",
   "disposition": "rewritten",
   "new": "> [`../../model/core-model-future-topic.md`](../../model/core-model-future-topic.md)"
  },
  {
   "path": "docs/v3/topics/_open-v3-workflow-inspector-ui.md",
   "line": 237,
   "token": "../convergence/core-model-future-topic.md",
   "content": "> [`../convergence/core-model-future-topic.md`](../convergence/core-model-future-topic.md)",
   "disposition": "rewritten",
   "new": "> [`../../model/core-model-future-topic.md`](../../model/core-model-future-topic.md)"
  },
  {
   "path": "docs/v3/topics/_open-v3-workflow-inspector-ui.md",
   "line": 237,
   "token": "../convergence/core-model-future-topic.md",
   "content": "> [`../convergence/core-model-future-topic.md`](../convergence/core-model-future-topic.md)",
   "disposition": "rewritten",
   "new": "> [`../../model/core-model-future-topic.md`](../../model/core-model-future-topic.md)"
  },
  {
   "path": "docs/v3/topics/v3-gate-policy-config-design-synthesis.md",
   "line": 5,
   "token": "convergence-path",
   "content": "[`../convergence/core-model-future-topic.md`](../convergence/core-model-future-topic.md)",
   "disposition": "rewritten",
   "new": "[`../../model/core-model-future-topic.md`](../../model/core-model-future-topic.md)"
  },
  {
   "path": "docs/v3/topics/v3-gate-policy-config-design-synthesis.md",
   "line": 5,
   "token": "convergence-path",
   "content": "[`../convergence/core-model-future-topic.md`](../convergence/core-model-future-topic.md)",
   "disposition": "rewritten",
   "new": "[`../../model/core-model-future-topic.md`](../../model/core-model-future-topic.md)"
  },
  {
   "path": "docs/v3/topics/v3-gate-policy-config-design-synthesis.md",
   "line": 5,
   "token": "../convergence/core-model-future-topic.md",
   "content": "[`../convergence/core-model-future-topic.md`](../convergence/core-model-future-topic.md)",
   "disposition": "rewritten",
   "new": "[`../../model/core-model-future-topic.md`](../../model/core-model-future-topic.md)"
  },
  {
   "path": "docs/v3/topics/v3-gate-policy-config-design-synthesis.md",
   "line": 5,
   "token": "../convergence/core-model-future-topic.md",
   "content": "[`../convergence/core-model-future-topic.md`](../convergence/core-model-future-topic.md)",
   "disposition": "rewritten",
   "new": "[`../../model/core-model-future-topic.md`](../../model/core-model-future-topic.md)"
  },
  {
   "path": "plans/archive/plans/complexity-cleanup-wave-plan-v1.md",
   "line": 46,
   "token": "convergence-path",
   "content": "   - `src/v11/domain/convergence/policy.ts`",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/plans/complexity-cleanup-wave-plan-v1.md",
   "line": 235,
   "token": "convergence-path",
   "content": "   - `convergence/policy` validator slice",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/plans/converged-advisory-findings-contract-plan-v1.md",
   "line": 101,
   "token": "convergence-path",
   "content": "   - a detektor viselkedeset regresszios tesztek vedik (`tests/core/convergence/policy.test.ts`).",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/plans/converged-advisory-findings-contract-plan-v1.md",
   "line": 183,
   "token": "convergence-path",
   "content": "12. `tests/core/convergence/policy.test.ts`",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/plans/core-zero-retirement-inventory-ledger-v1.md",
   "line": 120,
   "token": "convergence-path",
   "content": "| src/core/convergence/policy.ts | thin-proxy | H | ready-after-verification | 0 |  |",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/plans/core-zero-retirement-inventory-ledger-v1.md",
   "line": 121,
   "token": "convergence-path",
   "content": "| src/core/convergence/repeatCleanAutoConvergeDefaults.ts | compat-facade | H | ready-after-consumer-check | 0 | delete előtt surface review kell |",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/plans/core-zero-retirement-inventory-ledger-v1.md",
   "line": 122,
   "token": "convergence-path",
   "content": "| src/core/convergence/repeatCleanAutoconverge.ts | thin-proxy | H | ready-after-verification | 0 |  |",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/plans/pairflow-initial-plan.md",
   "line": 148,
   "token": "convergence-path",
   "content": "    convergence/",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/plans/review-policy-reviewer-blocking-threshold-and-shared-ui-plan-v1.md",
   "line": 60,
   "token": "convergence-path",
   "content": "   - [src/v11/domain/convergence/policyReviewerAggregate.ts](/Users/felho/dev/pairflow/src/v11/domain/convergence/policyReviewerAggregate.ts)",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/plans/review-policy-reviewer-blocking-threshold-and-shared-ui-plan-v1.md",
   "line": 60,
   "token": "convergence-path",
   "content": "   - [src/v11/domain/convergence/policyReviewerAggregate.ts](/Users/felho/dev/pairflow/src/v11/domain/convergence/policyReviewerAggregate.ts)",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/plans/runtime-review-policy-reset-and-phasing-plan-v1.md",
   "line": 289,
   "token": "convergence-path",
   "content": "   - cel: residual convergence/meta-review/rework/start-resume runtime branches es a broad status/list/remote fail-closed parity alignmentja a Phase 3B activation core utan",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/2026-05-09-almost-e2e-smoke-suite-plan-v1/1-smoke-runner-contract.md",
   "line": 95,
   "token": "convergence-path",
   "content": "2. Adding actor-loop pass/convergence/meta-review happy-path scenarios.",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/2026-05-09-almost-e2e-smoke-suite-plan-v1/2-cli-lifecycle-smoke.md",
   "line": 95,
   "token": "convergence-path",
   "content": "   actor-loop pass/convergence/meta-review approval belongs to",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/2026-05-09-almost-e2e-smoke-suite-plan-v1/2-cli-lifecycle-smoke.md",
   "line": 103,
   "token": "convergence-path",
   "content": "1. Runner-driven fake actor loop through pass/convergence/meta-review.",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/2026-05-09-almost-e2e-smoke-suite-plan-v1/2-cli-lifecycle-smoke.md",
   "line": 239,
   "token": "convergence-path",
   "content": "| Deferred closures | Actor-loop pass/convergence/meta-review, UI action API smoke, real HTTP/browser coverage, Layer 3, and commit/merge/approve happy path. |",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/2026-05-09-almost-e2e-smoke-suite-plan-v1/3-actor-loop-smoke.md",
   "line": 181,
   "token": "convergence-path",
   "content": "   cannot express the needed pass/convergence/meta-review steps.",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-implementer-pilot-activation-phaseE3b.md",
   "line": 254,
   "token": "convergence-path",
   "content": "| CS4 | `src/v11/application/pass/passFlowDispatch.ts`, `src/v11/application/pass/normalPassFlowInvocationBuilders.ts`, `src/v11/application/pass/runNormalPassFlow.ts` | pass dispatch and normal-flow seam | az implementer `pass` activation a normal-pass route-on zarodik, reviewer auto-converge/convergence policy nelkul | P1 | required-now | T1, T1a |",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-migration-spine-phaseD-plan.md",
   "line": 52,
   "token": "convergence-path",
   "content": "| `S6_REVIEWER_META_AND_CLEANUP` | Reviewer, majd meta-reviewer migracio, utana adapter-cleanup es rollout a tobbi actorra. | `S5_PILOT_IMPLEMENTER_FIRST`; implementer pilot stabil es parity-gated. | `actor`, `kernel`, `executor`, `operator` | Reviewer oldalon a Phase C `SC2` es `SC3` igazolja, hogy fix-request/convergence tovabbra is `result` family marad policy gate contexttel; meta-review oldalon `SC4` igazolja, hogy a retained operator status csak diagnostics/projection marad, nem actor submit path. | Nincs tovabbi migration step ugyanebben a spine-ban; ez a sor a Phase E cleanup es rollout backlogba nyit at, miutan a retained adapterek mar csak summary/projection vagy diagnostics szerepet tartanak meg. | Retained tmux es operator status csak addig marad, amig legalabb egy actor meg ezeken a mixed recovery pathokon fugg. | A topology tovabbra is megmaradhat observability-only retegkent, de mar nem feltetele a canonical workflow tovabblepesnek. | Akkor torolheto vagy erosen egyszerusitheto a retained adapterhalmaz, ha (a) az `implementer`, `reviewer` es `meta_reviewer` ugyanazt az explicit wrapper + delivery/ack + core freeze boundaryt hasznalja, (b) a retained operator surface-ek csak summary/projection vagy diagnostics szerepet tartanak meg, es (c) nincs actor-specifikus recovery vagy special-case submit path a canonical approval/submit flow mellett. |",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-opportunity1-task1-generic-runtime-kernel-boundary-clarification.md",
   "line": 258,
   "token": "convergence-path",
   "content": "11. `src/v11/domain/convergence/policyValidation.ts`",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-opportunity1-task1-generic-runtime-kernel-boundary-clarification.md",
   "line": 312,
   "token": "convergence-path",
   "content": "   - downstream constraint only: pass/ask-human/convergence/meta-review command paths",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-opportunity1-task1-generic-runtime-kernel-boundary-clarification.md",
   "line": 438,
   "token": "convergence-path",
   "content": "| must-use | `src/v11/domain/convergence/policyValidation.ts` | P1 | required-now |",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-reviewer-cutover-phaseE.md",
   "line": 89,
   "token": "convergence-path",
   "content": "   - reviewer convergence/policy-gate contract,",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-reviewer-cutover-phaseE.md",
   "line": 250,
   "token": "convergence-path",
   "content": "1. [later-hardening] Ha a reviewer wrapper stabilizalasa kozben kozos pass/convergence helper-ek latszanak, azok kulon follow-upban konszolidalhatok a `meta_reviewer` szelet elott vagy utan.",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-reviewer-meta-rollout-and-adapter-cleanup-phaseE4.md",
   "line": 196,
   "token": "convergence-path",
   "content": "   - why this mix is safe: a fail-closed oldalak itt a retained adapter es submit/convergence stale/no-success consume viselkedesen belul maradnak, producer reopen nelkul.",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/commit-snapshot-and-completion-artifact-retirement/done-package-live-reference-cleanup.md",
   "line": 99,
   "token": "convergence-path",
   "content": "   - Generic approval/convergence artifact-ref tests may keep `artifact://done-package.md` only when the test is about arbitrary refs and not commit completion authority.",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/commit-snapshot-and-completion-artifact-retirement/done-package-live-reference-cleanup.md",
   "line": 181,
   "token": "convergence-path",
   "content": "4. Do not remove approval/convergence/reviewer tests merely because they use `artifact://done-package.md` as an arbitrary artifact reference.",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/commit-snapshot-and-completion-artifact-retirement/done-package-live-reference-cleanup.md",
   "line": 229,
   "token": "convergence-path",
   "content": "   - generic artifact-reference tests for approval/convergence/reviewer flows when the ref value is arbitrary and not commit authority;",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/meta-review-gate/meta-review-summary-structured-parity-enforcement-phase1.md",
   "line": 140,
   "token": "convergence-path",
   "content": "| must-use | `evaluatePositiveSummaryFindingsAssertion`, `evaluateNoFindingsSummaryFindingsAssertion` (`src/core/convergence/policy.ts`) | P1 | required-now |",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/meta-review-gate/pairflow-four-issue-hardening-three-phase.md",
   "line": 12,
   "token": "convergence-path",
   "content": "  - src/core/convergence/policy.ts",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/meta-review-gate/pairflow-four-issue-hardening-three-phase.md",
   "line": 21,
   "token": "convergence-path",
   "content": "  - tests/core/convergence/policy.test.ts",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/meta-review-gate/pairflow-four-issue-hardening-three-phase.md",
   "line": 107,
   "token": "convergence-path",
   "content": "   - reviewer PASS/convergence consistency contract",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/meta-review-gate/pairflow-four-issue-hardening-three-phase.md",
   "line": 138,
   "token": "convergence-path",
   "content": "2. `src/core/convergence/policy.ts`",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/meta-review-gate/pairflow-four-issue-hardening-three-phase.md",
   "line": 140,
   "token": "convergence-path",
   "content": "4. `tests/core/convergence/policy.test.ts`",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/meta-review-gate/pairflow-four-issue-hardening-three-phase.md",
   "line": 212,
   "token": "convergence-path",
   "content": "| CS5 | `src/core/convergence/policy.ts` | convergence gate | Apply same detection semantics for previous-review consistency gate. | I1 | 2 | P1 |",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/meta-review-gate/pairflow-four-issue-hardening-three-phase.md",
   "line": 214,
   "token": "convergence-path",
   "content": "| CS7 | `tests/core/convergence/policy.test.ts` | convergence tests | Add wording-variant and guard parity cases. | I1 | 2 | P1 |",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/meta-review-gate/pairflow-four-issue-hardening-three-phase.md",
   "line": 225,
   "token": "convergence-path",
   "content": "1. `payload.findings` remains canonical finding source for reviewer PASS/convergence.",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/meta-review-gate/pairflow-summary-claim-canonicalization-foundation-phase1.md",
   "line": 10,
   "token": "convergence-path",
   "content": "  - src/core/convergence/policy.ts",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/meta-review-gate/pairflow-summary-claim-canonicalization-foundation-phase1.md",
   "line": 15,
   "token": "convergence-path",
   "content": "  - tests/core/convergence/policy.test.ts",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/meta-review-gate/pairflow-summary-claim-canonicalization-foundation-phase1.md",
   "line": 83,
   "token": "convergence-path",
   "content": "| CC3 | `src/core/convergence/policy.ts` | Consume claim-state/source first; keep parser as diagnostic fallback only. | P1 |",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/meta-review-gate/pairflow-summary-claim-canonicalization-foundation-phase1.md",
   "line": 112,
   "token": "convergence-path",
   "content": "2. `pnpm exec vitest run tests/core/agent/pass.test.ts tests/core/convergence/policy.test.ts`",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/meta-review-gate/protocol-first-meta-review-runtime-decoupling-phase2.md",
   "line": 63,
   "token": "convergence-path",
   "content": "2. A convergence/apply path atallitasa ugy, hogy durable handoff + execution context utan a notify bizonytalansag ne route-oljon domain `META_REVIEW_FAILED` allapotba.",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/meta-review-gate/protocol-first-meta-review-runtime-decoupling-phase2.md",
   "line": 236,
   "token": "convergence-path",
   "content": "| T2  | pane unavailable after durable kickoff does not fail route | active execution context letrejott, meta-reviewer pane exited vagy marker confirm nem sikerul | convergence/apply kickoff flow lefut | state `META_REVIEW_RUNNING` marad, runtime uncertainty surface frissul, nincs immediate `META_REVIEW_FAILED` | P1 | required-now | automated test |",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/refactoring/converged-command-internal-surface-cleanout.md",
   "line": 104,
   "token": "convergence-path",
   "content": "> Given a reviewer convergence signal, what single command-local pathway validates it, applies the convergence/gate policy, persists the authoritative result, and returns the public `EmitConvergedResult`?",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/review-policy-reviewer-blocking-threshold-and-shared-ui/review-policy-reviewer-blocking-threshold-foundation-and-ui-phase1.md",
   "line": 163,
   "token": "convergence-path",
   "content": "   reviewer pass/convergence routing, prompt/guidance, meta-review gate semantics.",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/review-policy-reviewer-blocking-threshold-and-shared-ui/review-policy-reviewer-blocking-threshold-foundation-and-ui-phase1.md",
   "line": 186,
   "token": "convergence-path",
   "content": "2. `src/v11/domain/convergence/policyReviewerAggregate.ts`",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/review-policy-reviewer-blocking-threshold-and-shared-ui/review-policy-reviewer-blocking-threshold-routing-consume-phase2a.md",
   "line": 9,
   "token": "convergence-path",
   "content": "  - src/v11/domain/convergence/policyReviewerAggregate.ts",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/review-policy-reviewer-blocking-threshold-and-shared-ui/review-policy-reviewer-blocking-threshold-routing-consume-phase2a.md",
   "line": 16,
   "token": "convergence-path",
   "content": "  - tests/v11/domain/convergence/policy.test.ts",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/review-policy-reviewer-blocking-threshold-and-shared-ui/review-policy-reviewer-blocking-threshold-routing-consume-phase2a.md",
   "line": 97,
   "token": "convergence-path",
   "content": "   - [src/v11/domain/convergence/policyReviewerAggregate.ts](/Users/felho/dev/pairflow/src/v11/domain/convergence/policyReviewerAggregate.ts)",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/review-policy-reviewer-blocking-threshold-and-shared-ui/review-policy-reviewer-blocking-threshold-routing-consume-phase2a.md",
   "line": 97,
   "token": "convergence-path",
   "content": "   - [src/v11/domain/convergence/policyReviewerAggregate.ts](/Users/felho/dev/pairflow/src/v11/domain/convergence/policyReviewerAggregate.ts)",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/review-policy-reviewer-blocking-threshold-and-shared-ui/review-policy-reviewer-blocking-threshold-routing-consume-phase2a.md",
   "line": 130,
   "token": "convergence-path",
   "content": "   a `policyReviewerAggregate` helpernek van nem reviewer-facing downstream consume-ja is (peldaul `src/v11/domain/convergence/policyValidationSupport.ts`); ez a task nem ownershipolja azok szemantikajanak ujratervezeset, csak azt koveteli meg, hogy a reviewer routing consume lane a mar letezo aggregate contractot threshold-aware modon hasznalja, a nem reviewer-routingos consume pathok blocker/claim-parity orzese mellett.",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/review-policy-reviewer-blocking-threshold-and-shared-ui/review-policy-reviewer-blocking-threshold-routing-consume-phase2a.md",
   "line": 191,
   "token": "convergence-path",
   "content": "| CS1 | `src/v11/domain/convergence/policyReviewerAggregate.ts` | `evaluateReviewerFindingsAggregate(...)` | scope-policy normalized effective severity | document scope qualifier downgrade a threshold compare elott tortenjen; a reviewer threshold normalized effective severityt fogyasszon, ne raw declared severityt | P1 | T1,T2,T3,T5 |",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/reviewer-gating/01-converged-advisory-findings-cli-and-flow-contract-phase1.md",
   "line": 16,
   "token": "convergence-path",
   "content": "  - tests/core/convergence/policy.test.ts",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/reviewer-gating/review-decision-completeness-and-implementation-carry-phase1.md",
   "line": 16,
   "token": "convergence-path",
   "content": "  - src/core/convergence/policy.ts",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/reviewer-gating/review-decision-completeness-and-implementation-carry-phase1.md",
   "line": 22,
   "token": "convergence-path",
   "content": "  - tests/core/convergence/policy.test.ts",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/reviewer-gating/review-decision-completeness-and-implementation-carry-phase1.md",
   "line": 79,
   "token": "convergence-path",
   "content": "   - convergence/blocking policy contract,",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/reviewer-gating/review-decision-completeness-and-implementation-carry-phase1.md",
   "line": 92,
   "token": "convergence-path",
   "content": "| CS4 | `src/core/convergence/policy.ts` | convergence blocker policy | code scope-ban nyitott `impl-now` findingek blokkoljak a convergence-et, `later-hardening` nem | P1 | required-now | T3, T4, T8 |",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/reviewer-gating/review-decision-completeness-and-implementation-carry-phase1.md",
   "line": 154,
   "token": "convergence-path",
   "content": "| T8 | Scope-sensitive default mapping | azonos P2 required-now finding docs es code scope-ban | gate/convergence fut | docs->later-hardening, code->impl-now default | P1 | required-now | automated test |",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/reviewer-gating/reviewer-brief-injection-and-enforcement-phase1.md",
   "line": 254,
   "token": "convergence-path",
   "content": "17. Across consecutive reviewer PASS rounds in the same bubble, `artifacts/review-verification.json` is overwrite-replaced by the latest successful round, and convergence/status use this latest artifact as source-of-truth.",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/reviewer-gating/reviewer-brief-injection-and-enforcement-phase1.md",
   "line": 264,
   "token": "convergence-path",
   "content": "7. AC14-AC15: convergence/status tests assert gate behavior and `invalid` artifact diagnostics.",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/reviewer-gating/reviewer-convergence-p3-round4-task-2026-03-03.md",
   "line": 11,
   "token": "convergence-path",
   "content": "  - src/core/convergence/policy.ts",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/reviewer-gating/reviewer-convergence-p3-round4-task-2026-03-03.md",
   "line": 20,
   "token": "convergence-path",
   "content": "  - tests/core/convergence/policy.test.ts",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/reviewer-gating/reviewer-convergence-p3-round4-task-2026-03-03.md",
   "line": 124,
   "token": "convergence-path",
   "content": "| CS4 | `src/core/convergence/policy.ts` | policy input/evaluator | `validateConvergencePolicy(input: ConvergencePolicyInput) -> ConvergencePolicyResult` | findings evaluation helper + gate messaging | explicit `P0/P1/P2/P3` count + `hasBlocking` + `hasNonBlocking`; structured-first parsing, summary diagnostics fallback; round-1 guardrail policy backref | P1 | required-now | AC7, AC10, AC12, AC14, AC18, AC20, T2, T15, T17 |",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/reviewer-gating/reviewer-convergence-p3-round4-task-2026-03-03.md",
   "line": 196,
   "token": "convergence-path",
   "content": "| T2 | Policy helper aggregate + fallback diagnostics | post-gate reviewer context: structured findings (`P3`-only), plus negativ fixture structured payload nelkul/hibasan, summary jelen | convergence policy evaluated | explicit aggregate (`p0..p3`, `hasBlocking`, `hasNonBlocking`); structured payload primary; summary parse diagnostics fallback only | P1 | required-now | tests/core/convergence/policy.test.ts |",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/reviewer-gating/reviewer-convergence-p3-round4-task-2026-03-03.md",
   "line": 209,
   "token": "convergence-path",
   "content": "| T15 | Round-1 convergence guardrail precedence | reviewer converged intent round-1 helyzetben | convergence policy evaluated | explicit `ROUND1_CONVERGENCE_GUARDRAIL` reject, initial-design precedence megtartva | P2 | required-now | tests/core/agent/converged.test.ts + tests/core/convergence/policy.test.ts |",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/reviewer-gating/reviewer-convergence-p3-round4-task-2026-03-03.md",
   "line": 211,
   "token": "convergence-path",
   "content": "| T17 | Initial-design convergence eligibility compatibility (two-pass branch) | post-gate non-blocker context, de baseline eligibilitybol a two-consecutive-review-pass feltetel nem teljesul | `pairflow converged` policy path invoked | converged tovabbra is rejectelt baseline eligibility hiany miatt; post-gate gate nem bypassolja ezt a feltetelt | P1 | required-now | tests/core/agent/converged.test.ts + tests/core/convergence/policy.test.ts |",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/reviewer-gating/reviewer-convergence-p3-round4-task-2026-03-03.md",
   "line": 214,
   "token": "convergence-path",
   "content": "| T20 | Round 2-3 deadlock prevention by valid config floor | valid config range (`severity_gate_round >= 4`) + initial-design round 2-3 P2 convergence gate context | decision policy assessed | post-gate PASS reject gate round 2-3-ban nem aktiv, ezert nincs `no-valid-command` deadlock path | P1 | required-now | tests/core/convergence/policy.test.ts + docs diff review |",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/reviewer-gating/reviewer-convergence-p3-round4-task-2026-03-03.md",
   "line": 215,
   "token": "convergence-path",
   "content": "| T21 | Initial-design convergence eligibility compatibility (alternation branch) | post-gate non-blocker context, de alternation evidence hianyzik (`round_role_history`) | `pairflow converged` policy path invoked | converged rejectelt marad alternation baseline hiany miatt; post-gate gate nem bypassolja ezt a feltetelt | P2 | required-now | tests/core/agent/converged.test.ts + tests/core/convergence/policy.test.ts |",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/runtime-review-policy/runtime-review-policy-reviewer-bypass-activation-post-cutover-phase3b.md",
   "line": 120,
   "token": "convergence-path",
   "content": "   - residual convergence/recovery/start-resume closure: successor-owned Phase 3C",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/runtime-review-policy/runtime-review-policy-reviewer-bypass-activation-post-cutover-phase3b.md",
   "line": 409,
   "token": "convergence-path",
   "content": "6. A residual convergence/recovery/start-resume topology Phase 3B-ben nem ownershipolt.",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/runtime-review-policy/runtime-review-policy-reviewer-bypass-residual-runtime-alignment-phase3c.md",
   "line": 12,
   "token": "convergence-path",
   "content": "  - src/v11/domain/convergence/policyValidation.ts",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/runtime-review-policy/runtime-review-policy-reviewer-bypass-residual-runtime-alignment-phase3c.md",
   "line": 25,
   "token": "convergence-path",
   "content": "  - tests/v11/domain/convergence/policy.test.ts",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/runtime-review-policy/runtime-review-policy-reviewer-bypass-residual-runtime-alignment-phase3c.md",
   "line": 26,
   "token": "convergence-path",
   "content": "  - tests/v11/domain/convergence/repeatCleanAutoconverge.test.ts",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/runtime-review-policy/runtime-review-policy-reviewer-bypass-residual-runtime-alignment-phase3c.md",
   "line": 61,
   "token": "convergence-path",
   "content": "   - `src/v11/domain/convergence/policyValidation.ts`",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/runtime-review-policy/runtime-review-policy-reviewer-bypass-residual-runtime-alignment-phase3c.md",
   "line": 116,
   "token": "convergence-path",
   "content": "   Phase 3B activation truth -> convergence/meta-review/rework/start-resume/status/list consume alignment.",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/runtime-review-policy/runtime-review-policy-reviewer-bypass-residual-runtime-alignment-phase3c.md",
   "line": 155,
   "token": "convergence-path",
   "content": "   - [policyValidation.ts](/Users/felho/dev/pairflow/src/v11/domain/convergence/policyValidation.ts)",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/archive/tasks/runtime-review-policy/runtime-review-policy-reviewer-bypass-residual-runtime-alignment-phase3c.md",
   "line": 183,
   "token": "convergence-path",
   "content": "   `src/v11/domain/convergence/policyValidation.ts`,",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "plans/feature-ideas-v3-triage.md",
   "line": 7,
   "token": "docs/v3",
   "content": "[`../docs/v3/convergence/approach.md`](../docs/v3/convergence/approach.md)).",
   "disposition": "rewritten",
   "new": "[`../v3/design/approach.md`](../v3/design/approach.md))."
  },
  {
   "path": "plans/feature-ideas-v3-triage.md",
   "line": 7,
   "token": "docs/v3",
   "content": "[`../docs/v3/convergence/approach.md`](../docs/v3/convergence/approach.md)).",
   "disposition": "rewritten",
   "new": "[`../v3/design/approach.md`](../v3/design/approach.md))."
  },
  {
   "path": "plans/feature-ideas-v3-triage.md",
   "line": 7,
   "token": "convergence-path",
   "content": "[`../docs/v3/convergence/approach.md`](../docs/v3/convergence/approach.md)).",
   "disposition": "rewritten",
   "new": "[`../v3/design/approach.md`](../v3/design/approach.md))."
  },
  {
   "path": "plans/feature-ideas-v3-triage.md",
   "line": 7,
   "token": "convergence-path",
   "content": "[`../docs/v3/convergence/approach.md`](../docs/v3/convergence/approach.md)).",
   "disposition": "rewritten",
   "new": "[`../v3/design/approach.md`](../v3/design/approach.md))."
  },
  {
   "path": "src/cli/commands/agent/converged.ts",
   "line": 25,
   "token": "convergence-path",
   "content": "} from \"../../../v11/domain/convergence/policy.js\";",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "src/index.ts",
   "line": 420,
   "token": "convergence-path",
   "content": "} from \"./v11/domain/convergence/policy.js\";",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "src/index.ts",
   "line": 823,
   "token": "convergence-path",
   "content": "} from \"./v11/domain/convergence/policy.js\";",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "src/v11/application/converged/internal/flow/runConvergedFlowContract.ts",
   "line": 4,
   "token": "convergence-path",
   "content": "import type { ConvergencePolicyResult } from \"../../../../domain/convergence/policy.js\";",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "src/v11/application/converged/internal/validation/convergedPolicyPreparation.ts",
   "line": 5,
   "token": "convergence-path",
   "content": "} from \"../../../../domain/convergence/policy.js\";",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "src/v11/application/metaReview/internal/submit/parity.ts",
   "line": 15,
   "token": "convergence-path",
   "content": "} from \"../../../../domain/convergence/policy.js\";",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "src/v11/application/metaReview/internal/submit/runtimeParity.ts",
   "line": 26,
   "token": "convergence-path",
   "content": "} from \"../../../../domain/convergence/policy.js\";",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "src/v11/application/pass/internal/autoConverge/autoConvergeFinalization.ts",
   "line": 4,
   "token": "convergence-path",
   "content": "} from \"../../../../domain/convergence/repeatCleanAutoconverge.js\";",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "src/v11/application/pass/internal/autoConverge/autoConvergePreparation.ts",
   "line": 1,
   "token": "convergence-path",
   "content": "import { validateConvergencePolicy } from \"../../../../domain/convergence/policy.js\";",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "src/v11/application/pass/internal/autoConverge/runAutoConvergeFlow.ts",
   "line": 4,
   "token": "convergence-path",
   "content": "} from \"../../../../domain/convergence/repeatCleanAutoconverge.js\";",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "src/v11/application/pass/internal/normalPass/normalPassAppendExecution.ts",
   "line": 7,
   "token": "convergence-path",
   "content": "} from \"../../../../domain/convergence/repeatCleanAutoconverge.js\";",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "src/v11/application/pass/internal/normalPass/normalPassFinalization.ts",
   "line": 8,
   "token": "convergence-path",
   "content": "} from \"../../../../domain/convergence/repeatCleanAutoconverge.js\";",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "src/v11/application/pass/internal/normalPass/passResultBuilder.ts",
   "line": 5,
   "token": "convergence-path",
   "content": "} from \"../../../../domain/convergence/repeatCleanAutoconverge.js\";",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "src/v11/application/pass/internal/normalPass/passRoutingPreparation.ts",
   "line": 3,
   "token": "convergence-path",
   "content": "} from \"../../../../domain/convergence/repeatCleanAutoconverge.js\";",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "src/v11/application/pass/internal/normalPass/passRoutingPreparationTypes.ts",
   "line": 4,
   "token": "convergence-path",
   "content": "} from \"../../../../domain/convergence/repeatCleanAutoconverge.js\";",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "src/v11/application/pass/internal/normalPass/runNormalPassFlowContract.ts",
   "line": 4,
   "token": "convergence-path",
   "content": "} from \"../../../../domain/convergence/repeatCleanAutoconverge.js\";",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "src/v11/application/pass/passCommandContract.ts",
   "line": 4,
   "token": "convergence-path",
   "content": "} from \"../../domain/convergence/repeatCleanAutoconverge.js\";",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "src/v11/domain/metaReviewGate/approvalReviewerConsistency.ts",
   "line": 9,
   "token": "convergence-path",
   "content": "} from \"../convergence/policy.js\";",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "src/v11/domain/metaReviewGate/approvalSummaryNormalization.ts",
   "line": 6,
   "token": "convergence-path",
   "content": "} from \"../convergence/policy.js\";",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "src/v11/domain/metaReviewGate/approveClaimSummaryMismatch.ts",
   "line": 5,
   "token": "convergence-path",
   "content": "} from \"../convergence/policy.js\";",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "src/v11/domain/metaReviewGate/findingsClaimParsing.ts",
   "line": 4,
   "token": "convergence-path",
   "content": "} from \"../convergence/policy.js\";",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "src/v11/domain/metaReviewGate/findingsValidationParity.ts",
   "line": 5,
   "token": "convergence-path",
   "content": "} from \"../convergence/policy.js\";",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "src/v11/domain/pass/lifecycleMetricMetadata.ts",
   "line": 4,
   "token": "convergence-path",
   "content": "} from \"../convergence/repeatCleanAutoconverge.js\";",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "src/v11/domain/pass/passEnvelopeDraft.ts",
   "line": 4,
   "token": "convergence-path",
   "content": "} from \"../convergence/repeatCleanAutoconverge.js\";",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "src/v11/domain/pass/passEnvelopeDraft.ts",
   "line": 5,
   "token": "convergence-path",
   "content": "import { claimParserDivergenceDiagnosticReasonCode } from \"../convergence/policy.js\";",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "src/v11/domain/pass/repeatCleanMetadata.ts",
   "line": 4,
   "token": "convergence-path",
   "content": "} from \"../convergence/repeatCleanAutoconverge.js\";",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "src/v11/domain/pass/repeatCleanPolicyRejection.ts",
   "line": 1,
   "token": "convergence-path",
   "content": "import { repeatCleanAutoconvergePolicyRejectedReasonCode } from \"../convergence/repeatCleanAutoconverge.js\";",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "src/v11/domain/pass/reviewerDecision.ts",
   "line": 17,
   "token": "convergence-path",
   "content": "} from \"../convergence/policy.js\";",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "src/v11/domain/pass/reviewerFindingsClaim.ts",
   "line": 1,
   "token": "convergence-path",
   "content": "import { resolveLegacySummaryFindingsClaimState } from \"../convergence/policy.js\";",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "src/v11/shared/converged/convergedCommandInputNormalization.ts",
   "line": 8,
   "token": "convergence-path",
   "content": "} from \"../../domain/convergence/policy.js\";",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "tests/contracts/v11/converged.contract.runner.ts",
   "line": 11,
   "token": "convergence-path",
   "content": "import { resolveConvergedSummaryFindingsContradiction } from \"../../../src/v11/domain/convergence/policy.js\";",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "tests/contracts/v11/core-shim-boundary-coverage.test.ts",
   "line": 15,
   "token": "convergence-path",
   "content": "  \"src/core/convergence/policy.ts\",",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "tests/contracts/v11/core-shim-boundary-coverage.test.ts",
   "line": 16,
   "token": "convergence-path",
   "content": "  \"src/core/convergence/repeatCleanAutoconverge.ts\",",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "tests/core/agent/pass.test.ts",
   "line": 39,
   "token": "convergence-path",
   "content": "} from \"../../../src/v11/domain/convergence/repeatCleanAutoconverge.js\";",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "tests/v11/domain/convergence/policy.test.ts",
   "line": 9,
   "token": "convergence-path",
   "content": "} from \"../../../../src/v11/domain/convergence/policy.js\";",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "tests/v11/domain/convergence/repeatCleanAutoconverge.test.ts",
   "line": 11,
   "token": "convergence-path",
   "content": "} from \"../../../../src/v11/domain/convergence/repeatCleanAutoconverge.js\";",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "tests/v11/domain/pass/passEnvelopeDraft.test.ts",
   "line": 3,
   "token": "convergence-path",
   "content": "import { claimParserDivergenceDiagnosticReasonCode } from \"../../../../src/v11/domain/convergence/policy.js\";",
   "disposition": "kept — coincidence",
   "reason": "the v1 codebase's own convergence namespace / slash-joined prose — no relation to docs/v3",
   "new": null
  },
  {
   "path": "tools/v3-model/README.md",
   "line": 3,
   "token": "docs/v3",
   "content": "Tooling for `docs/v3/convergence/core-model.html`. The HTML is decomposed into",
   "disposition": "rewritten",
   "new": "Tooling for `v3/model/core-model.html`. The HTML is decomposed into"
  },
  {
   "path": "tools/v3-model/README.md",
   "line": 3,
   "token": "convergence-path",
   "content": "Tooling for `docs/v3/convergence/core-model.html`. The HTML is decomposed into",
   "disposition": "rewritten",
   "new": "Tooling for `v3/model/core-model.html`. The HTML is decomposed into"
  },
  {
   "path": "tools/v3-model/README.md",
   "line": 4,
   "token": "docs/v3",
   "content": "addressable source files under `docs/v3/convergence/model-src/`; the HTML is",
   "disposition": "rewritten",
   "new": "addressable source files under `v3/model/`; the HTML is"
  },
  {
   "path": "tools/v3-model/README.md",
   "line": 4,
   "token": "model-src",
   "content": "addressable source files under `docs/v3/convergence/model-src/`; the HTML is",
   "disposition": "rewritten",
   "new": "addressable source files under `v3/model/`; the HTML is"
  },
  {
   "path": "tools/v3-model/README.md",
   "line": 4,
   "token": "convergence-path",
   "content": "addressable source files under `docs/v3/convergence/model-src/`; the HTML is",
   "disposition": "rewritten",
   "new": "addressable source files under `v3/model/`; the HTML is"
  },
  {
   "path": "tools/v3-model/README.md",
   "line": 12,
   "token": "model-src",
   "content": "| `extract.py` | HTML → `model-src/` (mechanical cut: per-section files + code blocks + Absent/Invariant records + manifest). **Bootstrap only** — refuses to run once `deltas/` exists (it would clobber the unit-delta layout). |",
   "disposition": "rewritten",
   "new": "| `extract.py` | HTML → `v3/model/` (mechanical cut: per-section files + code blocks + Absent/Invariant records + manifest). **Bootstrap only** — refuses to run once `deltas/` exists (it would clobber the unit-delta layout). |"
  },
  {
   "path": "tools/v3-model/README.md",
   "line": 13,
   "token": "model-src",
   "content": "| `build.py [--out PATH]` | `model-src/` → HTML (paste-back + record rendering + unit folding). |",
   "disposition": "rewritten",
   "new": "| `build.py [--out PATH]` | `v3/model/` → HTML (paste-back + record rendering + unit folding). |"
  },
  {
   "path": "tools/v3-model/README.md",
   "line": 18,
   "token": "model-src",
   "content": "| `report_ledger.py` | Generates `model-src/ledger.md`: the deferral ledger (Absent items bucketed by pointer target — the L9 bucket is the recovery-obligations list), the invariant catalog, the rejection registry, and the domain registry (aggregate/entity inventory per section's Domain lens, with root/kind markers and relationship prose). |",
   "disposition": "rewritten",
   "new": "| `report_ledger.py` | Generates `v3/model/ledger.md`: the deferral ledger (Absent items bucketed by pointer target — the L9 bucket is the recovery-obligations list), the invariant catalog, the rejection registry, and the domain registry (aggregate/entity inventory per section's Domain lens, with root/kind markers and relationship prose). |"
  },
  {
   "path": "tools/v3-model/README.md",
   "line": 22,
   "token": "docs/v3",
   "content": "1. Edit files under `docs/v3/convergence/model-src/` (a section, a code",
   "disposition": "rewritten",
   "new": "1. Edit files under `v3/model/` (a section, a code"
  },
  {
   "path": "tools/v3-model/README.md",
   "line": 22,
   "token": "model-src",
   "content": "1. Edit files under `docs/v3/convergence/model-src/` (a section, a code",
   "disposition": "rewritten",
   "new": "1. Edit files under `v3/model/` (a section, a code"
  },
  {
   "path": "tools/v3-model/README.md",
   "line": 22,
   "token": "convergence-path",
   "content": "1. Edit files under `docs/v3/convergence/model-src/` (a section, a code",
   "disposition": "rewritten",
   "new": "1. Edit files under `v3/model/` (a section, a code"
  },
  {
   "path": "tools/v3-model/analyze_chain.py",
   "line": 27,
   "token": "docs/v3",
   "content": "SRC = REPO / \"docs/v3/convergence/model-src\"",
   "disposition": "rewritten",
   "new": "SRC = REPO / \"v3/model\""
  },
  {
   "path": "tools/v3-model/analyze_chain.py",
   "line": 27,
   "token": "model-src",
   "content": "SRC = REPO / \"docs/v3/convergence/model-src\"",
   "disposition": "rewritten",
   "new": "SRC = REPO / \"v3/model\""
  },
  {
   "path": "tools/v3-model/analyze_chain.py",
   "line": 27,
   "token": "convergence-path",
   "content": "SRC = REPO / \"docs/v3/convergence/model-src\"",
   "disposition": "rewritten",
   "new": "SRC = REPO / \"v3/model\""
  },
  {
   "path": "tools/v3-model/build.py",
   "line": 2,
   "token": "docs/v3",
   "content": "\"\"\"Assemble docs/v3/convergence/core-model.html from model-src/ sources.",
   "disposition": "rewritten",
   "new": "\"\"\"Assemble v3/model/core-model.html from v3/model/ sources."
  },
  {
   "path": "tools/v3-model/build.py",
   "line": 2,
   "token": "model-src",
   "content": "\"\"\"Assemble docs/v3/convergence/core-model.html from model-src/ sources.",
   "disposition": "rewritten",
   "new": "\"\"\"Assemble v3/model/core-model.html from v3/model/ sources."
  },
  {
   "path": "tools/v3-model/build.py",
   "line": 2,
   "token": "convergence-path",
   "content": "\"\"\"Assemble docs/v3/convergence/core-model.html from model-src/ sources.",
   "disposition": "rewritten",
   "new": "\"\"\"Assemble v3/model/core-model.html from v3/model/ sources."
  },
  {
   "path": "tools/v3-model/build.py",
   "line": 19,
   "token": "docs/v3",
   "content": "SRC = REPO / \"docs/v3/convergence/model-src\"",
   "disposition": "rewritten",
   "new": "SRC = REPO / \"v3/model\""
  },
  {
   "path": "tools/v3-model/build.py",
   "line": 19,
   "token": "model-src",
   "content": "SRC = REPO / \"docs/v3/convergence/model-src\"",
   "disposition": "rewritten",
   "new": "SRC = REPO / \"v3/model\""
  },
  {
   "path": "tools/v3-model/build.py",
   "line": 19,
   "token": "convergence-path",
   "content": "SRC = REPO / \"docs/v3/convergence/model-src\"",
   "disposition": "rewritten",
   "new": "SRC = REPO / \"v3/model\""
  },
  {
   "path": "tools/v3-model/build.py",
   "line": 43,
   "token": "docs/v3",
   "content": "    out_path = REPO / \"docs/v3/convergence/core-model.html\"",
   "disposition": "rewritten",
   "new": "    out_path = REPO / \"v3/model/core-model.html\""
  },
  {
   "path": "tools/v3-model/build.py",
   "line": 43,
   "token": "convergence-path",
   "content": "    out_path = REPO / \"docs/v3/convergence/core-model.html\"",
   "disposition": "rewritten",
   "new": "    out_path = REPO / \"v3/model/core-model.html\""
  },
  {
   "path": "tools/v3-model/check.sh",
   "line": 3,
   "token": "model-src",
   "content": "# build the HTML from model-src/ and require it to be byte-identical to the",
   "disposition": "rewritten",
   "new": "# build the HTML from v3/model/ and require it to be byte-identical to the"
  },
  {
   "path": "tools/v3-model/check.sh",
   "line": 4,
   "token": "docs/v3",
   "content": "# canonical docs/v3/convergence/core-model.html. Fails if either side was",
   "disposition": "rewritten",
   "new": "# canonical v3/model/core-model.html. Fails if either side was"
  },
  {
   "path": "tools/v3-model/check.sh",
   "line": 4,
   "token": "convergence-path",
   "content": "# canonical docs/v3/convergence/core-model.html. Fails if either side was",
   "disposition": "rewritten",
   "new": "# canonical v3/model/core-model.html. Fails if either side was"
  },
  {
   "path": "tools/v3-model/check.sh",
   "line": 15,
   "token": "docs/v3",
   "content": "if cmp -s docs/v3/convergence/core-model.html \"$tmp\"; then",
   "disposition": "rewritten",
   "new": "if cmp -s v3/model/core-model.html \"$tmp\"; then"
  },
  {
   "path": "tools/v3-model/check.sh",
   "line": 15,
   "token": "convergence-path",
   "content": "if cmp -s docs/v3/convergence/core-model.html \"$tmp\"; then",
   "disposition": "rewritten",
   "new": "if cmp -s v3/model/core-model.html \"$tmp\"; then"
  },
  {
   "path": "tools/v3-model/check.sh",
   "line": 16,
   "token": "model-src",
   "content": "  echo \"check: OK — model-src/ builds byte-identical core-model.html\"",
   "disposition": "rewritten",
   "new": "  echo \"check: OK — v3/model/ builds byte-identical core-model.html\""
  },
  {
   "path": "tools/v3-model/check.sh",
   "line": 18,
   "token": "docs/v3",
   "content": "  echo \"check: FAIL — built HTML differs from docs/v3/convergence/core-model.html\" >&2",
   "disposition": "rewritten",
   "new": "  echo \"check: FAIL — built HTML differs from v3/model/core-model.html\" >&2"
  },
  {
   "path": "tools/v3-model/check.sh",
   "line": 18,
   "token": "convergence-path",
   "content": "  echo \"check: FAIL — built HTML differs from docs/v3/convergence/core-model.html\" >&2",
   "disposition": "rewritten",
   "new": "  echo \"check: FAIL — built HTML differs from v3/model/core-model.html\" >&2"
  },
  {
   "path": "tools/v3-model/check.sh",
   "line": 19,
   "token": "docs/v3",
   "content": "  cmp docs/v3/convergence/core-model.html \"$tmp\" | head -5 >&2 || true",
   "disposition": "rewritten",
   "new": "  cmp v3/model/core-model.html \"$tmp\" | head -5 >&2 || true"
  },
  {
   "path": "tools/v3-model/check.sh",
   "line": 19,
   "token": "convergence-path",
   "content": "  cmp docs/v3/convergence/core-model.html \"$tmp\" | head -5 >&2 || true",
   "disposition": "rewritten",
   "new": "  cmp v3/model/core-model.html \"$tmp\" | head -5 >&2 || true"
  },
  {
   "path": "tools/v3-model/check.sh",
   "line": 26,
   "token": "docs/v3",
   "content": "if cmp -s docs/v3/convergence/model-src/ledger.md \"$ledger_tmp\"; then",
   "disposition": "rewritten",
   "new": "if cmp -s v3/model/ledger.md \"$ledger_tmp\"; then"
  },
  {
   "path": "tools/v3-model/check.sh",
   "line": 26,
   "token": "model-src",
   "content": "if cmp -s docs/v3/convergence/model-src/ledger.md \"$ledger_tmp\"; then",
   "disposition": "rewritten",
   "new": "if cmp -s v3/model/ledger.md \"$ledger_tmp\"; then"
  },
  {
   "path": "tools/v3-model/check.sh",
   "line": 26,
   "token": "convergence-path",
   "content": "if cmp -s docs/v3/convergence/model-src/ledger.md \"$ledger_tmp\"; then",
   "disposition": "rewritten",
   "new": "if cmp -s v3/model/ledger.md \"$ledger_tmp\"; then"
  },
  {
   "path": "tools/v3-model/extract.py",
   "line": 2,
   "token": "docs/v3",
   "content": "\"\"\"Extract docs/v3/convergence/core-model.html into addressable source files.",
   "disposition": "rewritten",
   "new": "\"\"\"Extract v3/model/core-model.html into addressable source files."
  },
  {
   "path": "tools/v3-model/extract.py",
   "line": 2,
   "token": "convergence-path",
   "content": "\"\"\"Extract docs/v3/convergence/core-model.html into addressable source files.",
   "disposition": "rewritten",
   "new": "\"\"\"Extract v3/model/core-model.html into addressable source files."
  },
  {
   "path": "tools/v3-model/extract.py",
   "line": 10,
   "token": "docs/v3",
   "content": "Layout produced under docs/v3/convergence/model-src/:",
   "disposition": "rewritten",
   "new": "Layout produced under v3/model/:"
  },
  {
   "path": "tools/v3-model/extract.py",
   "line": 10,
   "token": "model-src",
   "content": "Layout produced under docs/v3/convergence/model-src/:",
   "disposition": "rewritten",
   "new": "Layout produced under v3/model/:"
  },
  {
   "path": "tools/v3-model/extract.py",
   "line": 10,
   "token": "convergence-path",
   "content": "Layout produced under docs/v3/convergence/model-src/:",
   "disposition": "rewritten",
   "new": "Layout produced under v3/model/:"
  },
  {
   "path": "tools/v3-model/extract.py",
   "line": 37,
   "token": "docs/v3",
   "content": "HTML = REPO / \"docs/v3/convergence/core-model.html\"",
   "disposition": "rewritten",
   "new": "HTML = REPO / \"v3/model/core-model.html\""
  },
  {
   "path": "tools/v3-model/extract.py",
   "line": 37,
   "token": "convergence-path",
   "content": "HTML = REPO / \"docs/v3/convergence/core-model.html\"",
   "disposition": "rewritten",
   "new": "HTML = REPO / \"v3/model/core-model.html\""
  },
  {
   "path": "tools/v3-model/extract.py",
   "line": 38,
   "token": "docs/v3",
   "content": "OUT = REPO / \"docs/v3/convergence/model-src\"",
   "disposition": "rewritten",
   "new": "OUT = REPO / \"v3/model\""
  },
  {
   "path": "tools/v3-model/extract.py",
   "line": 38,
   "token": "model-src",
   "content": "OUT = REPO / \"docs/v3/convergence/model-src\"",
   "disposition": "rewritten",
   "new": "OUT = REPO / \"v3/model\""
  },
  {
   "path": "tools/v3-model/extract.py",
   "line": 38,
   "token": "convergence-path",
   "content": "OUT = REPO / \"docs/v3/convergence/model-src\"",
   "disposition": "rewritten",
   "new": "OUT = REPO / \"v3/model\""
  },
  {
   "path": "tools/v3-model/extract.py",
   "line": 239,
   "token": "model-src",
   "content": "        fail(\"model-src/ uses the unit-delta layout (deltas/ exists); extract.py is the \"",
   "disposition": "rewritten",
   "new": "        fail(\"v3/model uses the unit-delta layout (deltas/ exists); extract.py is the \""
  },
  {
   "path": "tools/v3-model/extract.py",
   "line": 241,
   "token": "model-src",
   "content": "             \"remove model-src/ entirely first — the delta decomposition would be lost.\")",
   "disposition": "rewritten",
   "new": "             \"delete the source artifacts first — sections/, units/, records/, deltas/, \""
  },
  {
   "path": "tools/v3-model/extract.py",
   "line": 250,
   "token": "docs/v3",
   "content": "    manifest = {\"html\": \"docs/v3/convergence/core-model.html\", \"sections\": []}",
   "disposition": "rewritten",
   "new": "    manifest = {\"html\": \"v3/model/core-model.html\", \"sections\": []}"
  },
  {
   "path": "tools/v3-model/extract.py",
   "line": 250,
   "token": "convergence-path",
   "content": "    manifest = {\"html\": \"docs/v3/convergence/core-model.html\", \"sections\": []}",
   "disposition": "rewritten",
   "new": "    manifest = {\"html\": \"v3/model/core-model.html\", \"sections\": []}"
  },
  {
   "path": "tools/v3-model/foldlib.py",
   "line": 20,
   "token": "docs/v3",
   "content": "SRC = Path(__file__).resolve().parents[2] / \"docs/v3/convergence/model-src\"",
   "disposition": "rewritten",
   "new": "SRC = Path(__file__).resolve().parents[2] / \"v3/model\""
  },
  {
   "path": "tools/v3-model/foldlib.py",
   "line": 20,
   "token": "model-src",
   "content": "SRC = Path(__file__).resolve().parents[2] / \"docs/v3/convergence/model-src\"",
   "disposition": "rewritten",
   "new": "SRC = Path(__file__).resolve().parents[2] / \"v3/model\""
  },
  {
   "path": "tools/v3-model/foldlib.py",
   "line": 20,
   "token": "convergence-path",
   "content": "SRC = Path(__file__).resolve().parents[2] / \"docs/v3/convergence/model-src\"",
   "disposition": "rewritten",
   "new": "SRC = Path(__file__).resolve().parents[2] / \"v3/model\""
  },
  {
   "path": "tools/v3-model/migrate_units.py",
   "line": 30,
   "token": "docs/v3",
   "content": "SRC = REPO / \"docs/v3/convergence/model-src\"",
   "disposition": "rewritten",
   "new": "SRC = REPO / \"v3/model\""
  },
  {
   "path": "tools/v3-model/migrate_units.py",
   "line": 30,
   "token": "model-src",
   "content": "SRC = REPO / \"docs/v3/convergence/model-src\"",
   "disposition": "rewritten",
   "new": "SRC = REPO / \"v3/model\""
  },
  {
   "path": "tools/v3-model/migrate_units.py",
   "line": 30,
   "token": "convergence-path",
   "content": "SRC = REPO / \"docs/v3/convergence/model-src\"",
   "disposition": "rewritten",
   "new": "SRC = REPO / \"v3/model\""
  },
  {
   "path": "tools/v3-model/report_ledger.py",
   "line": 2,
   "token": "model-src",
   "content": "\"\"\"Generate model-src/ledger.md — the derived registries of the core model.",
   "disposition": "rewritten",
   "new": "\"\"\"Generate v3/model/ledger.md — the derived registries of the core model."
  },
  {
   "path": "tools/v3-model/report_ledger.py",
   "line": 31,
   "token": "docs/v3",
   "content": "SRC = REPO / \"docs/v3/convergence/model-src\"",
   "disposition": "rewritten",
   "new": "SRC = REPO / \"v3/model\""
  },
  {
   "path": "tools/v3-model/report_ledger.py",
   "line": 31,
   "token": "model-src",
   "content": "SRC = REPO / \"docs/v3/convergence/model-src\"",
   "disposition": "rewritten",
   "new": "SRC = REPO / \"v3/model\""
  },
  {
   "path": "tools/v3-model/report_ledger.py",
   "line": 31,
   "token": "convergence-path",
   "content": "SRC = REPO / \"docs/v3/convergence/model-src\"",
   "disposition": "rewritten",
   "new": "SRC = REPO / \"v3/model\""
  },
  {
   "path": "tools/v3-plan/check_coverage.py",
   "line": 8,
   "token": "model-src",
   "content": "  - model-src/units/<section>/<UnitName>.txt -> unit ids \"<section>/<UnitName>\"",
   "disposition": "rewritten",
   "new": "  - v3/model/units/<section>/<UnitName>.txt -> unit ids \"<section>/<UnitName>\""
  },
  {
   "path": "tools/v3-plan/check_coverage.py",
   "line": 13,
   "token": "docs/v3",
   "content": "Packet source: docs/v3/implementation/packets/*.md (README.md excluded) —",
   "disposition": "rewritten",
   "new": "Packet source: v3/implementation/packets/*.md (README.md excluded) —"
  },
  {
   "path": "tools/v3-plan/check_coverage.py",
   "line": 44,
   "token": "docs/v3",
   "content": "Disposition lock (packet ch5-P2): docs/v3/implementation/",
   "disposition": "rewritten",
   "new": "Disposition lock (packet ch5-P2): v3/implementation/"
  },
  {
   "path": "tools/v3-plan/check_coverage.py",
   "line": 73,
   "token": "docs/v3",
   "content": "MODEL_SRC = REPO_ROOT / \"docs/v3/convergence/model-src\"",
   "disposition": "rewritten",
   "new": "MODEL_SRC = REPO_ROOT / \"v3/model\""
  },
  {
   "path": "tools/v3-plan/check_coverage.py",
   "line": 73,
   "token": "model-src",
   "content": "MODEL_SRC = REPO_ROOT / \"docs/v3/convergence/model-src\"",
   "disposition": "rewritten",
   "new": "MODEL_SRC = REPO_ROOT / \"v3/model\""
  },
  {
   "path": "tools/v3-plan/check_coverage.py",
   "line": 73,
   "token": "convergence-path",
   "content": "MODEL_SRC = REPO_ROOT / \"docs/v3/convergence/model-src\"",
   "disposition": "rewritten",
   "new": "MODEL_SRC = REPO_ROOT / \"v3/model\""
  },
  {
   "path": "tools/v3-plan/check_coverage.py",
   "line": 76,
   "token": "docs/v3",
   "content": "DEFAULT_PACKETS_DIR = REPO_ROOT / \"docs/v3/implementation/packets\"",
   "disposition": "rewritten",
   "new": "DEFAULT_PACKETS_DIR = REPO_ROOT / \"v3/implementation/packets\""
  },
  {
   "path": "tools/v3-plan/check_coverage.py",
   "line": 78,
   "token": "docs/v3",
   "content": "DEFAULT_DISPOSITION_MAP = REPO_ROOT / \"docs/v3/implementation/invariant-disposition-map.md\"",
   "disposition": "rewritten",
   "new": "DEFAULT_DISPOSITION_MAP = REPO_ROOT / \"v3/implementation/invariant-disposition-map.md\""
  },
  {
   "path": "tools/v3-plan/check_coverage.py",
   "line": 334,
   "token": "docs/v3",
   "content": "    \"\"\"The invariant disposition map (docs/v3/implementation/",
   "disposition": "rewritten",
   "new": "    \"\"\"The invariant disposition map (v3/implementation/"
  },
  {
   "path": "tools/v3-plan/check_packet.py",
   "line": 24,
   "token": "docs/v3",
   "content": "Packets (docs/v3/implementation/packets/*.md, README.md excluded):",
   "disposition": "rewritten",
   "new": "Packets (v3/implementation/packets/*.md, README.md excluded):"
  },
  {
   "path": "tools/v3-plan/check_packet.py",
   "line": 91,
   "token": "docs/v3",
   "content": "Drafts (docs/v3/implementation/contracts/*.md, README.md excluded):",
   "disposition": "rewritten",
   "new": "Drafts (v3/implementation/contracts/*.md, README.md excluded):"
  },
  {
   "path": "tools/v3-plan/check_packet.py",
   "line": 128,
   "token": "docs/v3",
   "content": "(docs/v3/implementation/...), so when the read fails, the rel starts",
   "disposition": "kept — alias machinery",
   "reason": "kept — alias machinery (docstring names the pre-migration home by design)",
   "new": null
  },
  {
   "path": "tools/v3-plan/check_packet.py",
   "line": 148,
   "token": "docs/v3",
   "content": "docs/v3/implementation/README.md §5.5 (the canonical home since the",
   "disposition": "rewritten",
   "new": "v3/implementation/README.md §5.5 (the canonical home since the"
  },
  {
   "path": "tools/v3-plan/check_packet.py",
   "line": 180,
   "token": "docs/v3",
   "content": "LEGACY_HOME_OLD = \"docs/v3/implementation/\"  # the pre-ADR-015 home",
   "disposition": "kept — alias machinery",
   "reason": "kept — alias machinery (the ADR-015 alias constant)",
   "new": null
  },
  {
   "path": "tools/v3-plan/check_packet.py",
   "line": 2021,
   "token": "docs/v3",
   "content": "            and _git_ok(root, \"mv\", \"docs/v3/implementation/packets/ch9-p1-test.md\", \"v3/implementation/packets/ch9-p1-test.md\")",
   "disposition": "kept — alias machinery",
   "reason": "kept — alias machinery (selftest fixture enacting the migration)",
   "new": null
  },
  {
   "path": "tools/v3-plan/check_packet.py",
   "line": 2028,
   "token": "docs/v3",
   "content": "            and _git_ok(root, \"mv\", \"v3/implementation/packets/ch9-p1-test.md\", \"docs/v3/implementation/packets/ch9-p1-test.md\")",
   "disposition": "kept — alias machinery",
   "reason": "kept — alias machinery (selftest fixture)",
   "new": null
  },
  {
   "path": "tools/v3-plan/check_packet.py",
   "line": 2079,
   "token": "docs/v3",
   "content": "            and _git_ok(root, \"mv\", \"docs/v3/implementation/contracts/ch9-test-surface-contract.md\", \"v3/implementation/contracts/ch9-test-surface-contract.md\")",
   "disposition": "kept — alias machinery",
   "reason": "kept — alias machinery (selftest fixture)",
   "new": null
  },
  {
   "path": "v3/adr/ADR-000-record-implementation-decisions-as-adrs.md",
   "line": 9,
   "token": "docs/v3",
   "content": "The model plane keeps its decisions in the corpus + `docs/v3/topics/` memos",
   "disposition": "rewritten",
   "new": "The model plane keeps its decisions in the corpus + `v3/design/topics/` memos"
  },
  {
   "path": "v3/adr/ADR-000-record-implementation-decisions-as-adrs.md",
   "line": 63,
   "token": "docs/v3",
   "content": "  (`docs/v3/implementation/adr/`) — recorded in plan §2.5.",
   "disposition": "kept — historical",
   "reason": "kept — historical (rejected former home, ADR-000)",
   "new": null
  },
  {
   "path": "v3/adr/ADR-001-code-home-package-topology-module-boundaries.md",
   "line": 10,
   "token": "docs/v3",
   "content": "(`docs/v3/convergence/model-src/ledger.md`) is drift-tested against the code",
   "disposition": "rewritten",
   "new": "(`v3/model/ledger.md`) is drift-tested against the code"
  },
  {
   "path": "v3/adr/ADR-001-code-home-package-topology-module-boundaries.md",
   "line": 10,
   "token": "model-src",
   "content": "(`docs/v3/convergence/model-src/ledger.md`) is drift-tested against the code",
   "disposition": "rewritten",
   "new": "(`v3/model/ledger.md`) is drift-tested against the code"
  },
  {
   "path": "v3/adr/ADR-001-code-home-package-topology-module-boundaries.md",
   "line": 10,
   "token": "convergence-path",
   "content": "(`docs/v3/convergence/model-src/ledger.md`) is drift-tested against the code",
   "disposition": "rewritten",
   "new": "(`v3/model/ledger.md`) is drift-tested against the code"
  },
  {
   "path": "v3/adr/ADR-003-storage-substrate-and-migration-stance.md",
   "line": 82,
   "token": "docs/v3",
   "content": "Plan §2.4 · storage memo (`docs/v3/topics/_open-v3-storage-architecture.md`)",
   "disposition": "rewritten",
   "new": "Plan §2.4 · storage memo (`v3/design/topics/_open-v3-storage-architecture.md`)"
  },
  {
   "path": "v3/adr/ADR-007-drift-test-module.md",
   "line": 11,
   "token": "model-src",
   "content": "the `model-src/units/` tree) and the code from shearing. The suite needs",
   "disposition": "rewritten",
   "new": "the `v3/model/units/` tree) and the code from shearing. The suite needs"
  },
  {
   "path": "v3/adr/ADR-007-drift-test-module.md",
   "line": 34,
   "token": "docs/v3",
   "content": "- **`drift/` reads `docs/v3/convergence/model-src/` at test time** (the",
   "disposition": "rewritten",
   "new": "- **`drift/` reads `v3/model/` at test time** (the"
  },
  {
   "path": "v3/adr/ADR-007-drift-test-module.md",
   "line": 34,
   "token": "model-src",
   "content": "- **`drift/` reads `docs/v3/convergence/model-src/` at test time** (the",
   "disposition": "rewritten",
   "new": "- **`drift/` reads `v3/model/` at test time** (the"
  },
  {
   "path": "v3/adr/ADR-007-drift-test-module.md",
   "line": 34,
   "token": "convergence-path",
   "content": "- **`drift/` reads `docs/v3/convergence/model-src/` at test time** (the",
   "disposition": "rewritten",
   "new": "- **`drift/` reads `v3/model/` at test time** (the"
  },
  {
   "path": "v3/adr/ADR-007-drift-test-module.md",
   "line": 47,
   "token": "model-src",
   "content": "  with opposite dependencies (reads model-src, binds domain types).",
   "disposition": "rewritten",
   "new": "  with opposite dependencies (reads v3/model, binds domain types)."
  },
  {
   "path": "v3/adr/ADR-014-runtime-core-module-homes-and-provider-seam.md",
   "line": 78,
   "token": "model-src",
   "content": "through model-src + check.sh (the ch12 draft's decision point 3 is",
   "disposition": "rewritten",
   "new": "through v3/model + check.sh (the ch12 draft's decision point 3 is"
  },
  {
   "path": "v3/adr/ADR-014-runtime-core-module-homes-and-provider-seam.md",
   "line": 106,
   "token": "docs/v3",
   "content": "- Contract: `docs/v3/implementation/contracts/ch12-runtime-core-contract.md`",
   "disposition": "rewritten",
   "new": "- Contract: `v3/implementation/contracts/ch12-runtime-core-contract.md`"
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 1,
   "token": "docs/v3",
   "content": "# ADR-015: v3 plane consolidation — `docs/v3/` merges into `v3/`",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 14,
   "token": "docs/v3",
   "content": "plane (package, `src/`, `adr/`, runtime `templates/`). `docs/v3/` holds",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 18,
   "token": "docs/v3",
   "content": "- `docs/v3/research/` — twenty external-system studies + synthesis",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 20,
   "token": "docs/v3",
   "content": "- `docs/v3/convergence/` — a phase name covering two very different",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 20,
   "token": "convergence-path",
   "content": "- `docs/v3/convergence/` — a phase name covering two very different",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 21,
   "token": "model-src",
   "content": "  things: (a) `model-src/` + `core-model.html`, which is not",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 27,
   "token": "docs/v3",
   "content": "- `docs/v3/implementation/` — the factory: process README, plan,",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 31,
   "token": "docs/v3",
   "content": "between `docs/v3` and `v3` runs exactly between the most tightly",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 40,
   "token": "docs/v3",
   "content": "Merge `docs/v3/` into `v3/` and re-cut the tree by ROLE (plane), not",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 59,
   "token": "docs/v3",
   "content": "| `docs/v3/convergence/model-src/` (whole tree) | `v3/model/` |",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 59,
   "token": "model-src",
   "content": "| `docs/v3/convergence/model-src/` (whole tree) | `v3/model/` |",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 59,
   "token": "convergence-path",
   "content": "| `docs/v3/convergence/model-src/` (whole tree) | `v3/model/` |",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 60,
   "token": "docs/v3",
   "content": "| `docs/v3/convergence/core-model.html` | `v3/model/core-model.html` |",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 60,
   "token": "convergence-path",
   "content": "| `docs/v3/convergence/core-model.html` | `v3/model/core-model.html` |",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 61,
   "token": "docs/v3",
   "content": "| `docs/v3/convergence/core-model-todo.md` | `v3/model/core-model-todo.md` |",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 61,
   "token": "convergence-path",
   "content": "| `docs/v3/convergence/core-model-todo.md` | `v3/model/core-model-todo.md` |",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 62,
   "token": "docs/v3",
   "content": "| `docs/v3/convergence/core-model-future-topic.md` | `v3/model/core-model-future-topic.md` |",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 62,
   "token": "convergence-path",
   "content": "| `docs/v3/convergence/core-model-future-topic.md` | `v3/model/core-model-future-topic.md` |",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 63,
   "token": "docs/v3",
   "content": "| `docs/v3/convergence/approach.md` | `v3/design/approach.md` |",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 63,
   "token": "convergence-path",
   "content": "| `docs/v3/convergence/approach.md` | `v3/design/approach.md` |",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 64,
   "token": "docs/v3",
   "content": "| `docs/v3/convergence/design-method-playbook.md` | `v3/design/design-method-playbook.md` |",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 64,
   "token": "convergence-path",
   "content": "| `docs/v3/convergence/design-method-playbook.md` | `v3/design/design-method-playbook.md` |",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 65,
   "token": "docs/v3",
   "content": "| `docs/v3/convergence/implementation-contract.md` | `v3/design/implementation-contract.md` |",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 65,
   "token": "convergence-path",
   "content": "| `docs/v3/convergence/implementation-contract.md` | `v3/design/implementation-contract.md` |",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 66,
   "token": "docs/v3",
   "content": "| `docs/v3/research/` (whole tree) | `v3/design/research/` |",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 67,
   "token": "docs/v3",
   "content": "| `docs/v3/topics/` (whole tree) | `v3/design/topics/` |",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 68,
   "token": "docs/v3",
   "content": "| `docs/v3/concept-braindump.md` | `v3/design/concept-braindump.md` |",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 69,
   "token": "docs/v3",
   "content": "| `docs/v3/test-workflows.md` | `v3/design/test-workflows.md` |",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 70,
   "token": "docs/v3",
   "content": "| `docs/v3/implementation/` (whole tree) | `v3/implementation/` |",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 72,
   "token": "docs/v3",
   "content": "`docs/v3/` ceases to exist. The \"convergence\" name is retired: its",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 94,
   "token": "docs/v3",
   "content": "point-in-time): ~91 `docs/v3` references in `*.md/*.ts/*.json/*.html`",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 96,
   "token": "model-src",
   "content": "`model-src/manifest.json` which stores the repo-relative `html`",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 98,
   "token": "docs/v3",
   "content": "-I 'docs/v3' -- '*.py' '*.sh'`, re-measured at arm round deep-11;",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 102,
   "token": "docs/v3",
   "content": "relative Markdown links inside `docs/v3` whose target moves relative",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 105,
   "token": "docs/v3",
   "content": "**Class A — repo-root-anchored `docs/v3/…` paths** (Markdown, Python,",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 116,
   "token": "docs/v3",
   "content": "1. `docs/v3/convergence/model-src` → `v3/model`",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 116,
   "token": "model-src",
   "content": "1. `docs/v3/convergence/model-src` → `v3/model`",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 116,
   "token": "convergence-path",
   "content": "1. `docs/v3/convergence/model-src` → `v3/model`",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 117,
   "token": "docs/v3",
   "content": "2. `docs/v3/convergence/core-model` → `v3/model/core-model`",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 117,
   "token": "convergence-path",
   "content": "2. `docs/v3/convergence/core-model` → `v3/model/core-model`",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 118,
   "token": "docs/v3",
   "content": "3. `docs/v3/convergence/approach.md` → `v3/design/approach.md`",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 118,
   "token": "convergence-path",
   "content": "3. `docs/v3/convergence/approach.md` → `v3/design/approach.md`",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 119,
   "token": "docs/v3",
   "content": "4. `docs/v3/convergence/design-method-playbook.md` → `v3/design/design-method-playbook.md`",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 119,
   "token": "convergence-path",
   "content": "4. `docs/v3/convergence/design-method-playbook.md` → `v3/design/design-method-playbook.md`",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 120,
   "token": "docs/v3",
   "content": "5. `docs/v3/convergence/implementation-contract.md` → `v3/design/implementation-contract.md`",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 120,
   "token": "convergence-path",
   "content": "5. `docs/v3/convergence/implementation-contract.md` → `v3/design/implementation-contract.md`",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 121,
   "token": "docs/v3",
   "content": "6. `docs/v3/research` → `v3/design/research`",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 122,
   "token": "docs/v3",
   "content": "7. `docs/v3/topics` → `v3/design/topics`",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 123,
   "token": "docs/v3",
   "content": "8. `docs/v3/implementation` → `v3/implementation`",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 124,
   "token": "docs/v3",
   "content": "9. residual `docs/v3/` → `v3/design/` (the two root files), then a",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 125,
   "token": "docs/v3",
   "content": "   MANUAL review of any remaining bare `docs/v3` (historical-fact",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 143,
   "token": "convergence-path",
   "content": "as the visible label — `[`../convergence/approach.md`](…)` — and one",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 152,
   "token": "model-src",
   "content": "The HTML case, enumerated (measured 2026-07-20): `model-src`'s",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 160,
   "token": "model-src",
   "content": "model-src bytes, inside what the IC-N stance below already permits",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 170,
   "token": "convergence-path",
   "content": "§1–§2's `../convergence/implementation-contract.md` and",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 171,
   "token": "convergence-path",
   "content": "`../convergence/approach.md`, the playbook's basename-only",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 178,
   "token": "model-src",
   "content": "prior ADRs naming `model-src/`). The token set is NOT hand-picked",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 186,
   "token": "docs/v3",
   "content": "- Repo-wide tokens: `docs/v3`, `model-src`, and the retired",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 186,
   "token": "model-src",
   "content": "- Repo-wide tokens: `docs/v3`, `model-src`, and the retired",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 187,
   "token": "convergence-path",
   "content": "  directory name in PATH-SHAPED context only — `convergence/` or",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 188,
   "token": "convergence-path",
   "content": "  `/convergence` (arm finding F2-deep10: the bare word matches",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 196,
   "token": "convergence-path",
   "content": "  move changes — `../convergence`, `../research`, `../topics`,",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 203,
   "token": "docs/v3",
   "content": "  the old `docs/v3` and carrying neither a retired token nor a",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 275,
   "token": "model-src",
   "content": "\"remove model-src/ entirely first\" re-bootstrap instruction — and",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 289,
   "token": "model-src",
   "content": "`model-src/sections/06-l0f.html`'s `<code>approach.md</code>`, the",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 312,
   "token": "model-src",
   "content": "frozen table like every other rewrite; on BUILD-PINNED model-src bytes the",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 338,
   "token": "docs/v3",
   "content": "`docs/v3/implementation/contracts` → `v3/implementation/contracts`,",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 356,
   "token": "docs/v3",
   "content": "`v3/implementation/`, retry `docs/v3/implementation/` + remainder",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 436,
   "token": "docs/v3",
   "content": "`docs/v3/implementation/arm-pin.md`\" — AND names the CURRENT",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 463,
   "token": "docs/v3",
   "content": "report lists EVERY `docs/v3` occurrence in built packets, the process",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 506,
   "token": "docs/v3",
   "content": "`git mv` covers the 349 TRACKED files under `docs/v3` (measured",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 507,
   "token": "docs/v3",
   "content": "2026-07-20); the one untracked, globally-ignored `docs/v3/.DS_Store`",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 536,
   "token": "docs/v3",
   "content": "contains no `docs/v3` string — and a HOME change is not an edit",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 544,
   "token": "docs/v3",
   "content": "- **Status quo** (docs stay in `docs/v3`): rejected — the boundary",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 607,
   "token": "docs/v3",
   "content": "5. `grep -rn \"docs/v3\" --exclude-dir=node_modules",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 648,
   "token": "docs/v3",
   "content": "   `git rev-parse <migration-parent>:docs/v3/implementation/model-tier-experiment.md`",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 657,
   "token": "docs/v3",
   "content": "   at its mapped new path, `docs/v3` holds zero tracked files, and",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 709,
   "token": "model-src",
   "content": "F2r MAJOR (model-src HTML hrefs uncovered by Class B/C → Class B",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 743,
   "token": "model-src",
   "content": "misattributed (a real `model-src` mention, wrong ADR filename) —",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 803,
   "token": "model-src",
   "content": "FINDINGS — one BLOCKER (F1-deep5: `model-src/sections/06-l0f.html`'s",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 837,
   "token": "model-src",
   "content": "\"remove model-src/ entirely\" re-bootstrap instruction would delete",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 846,
   "token": "docs/v3",
   "content": "`docs/v3` occurrences in 57 files, 211 relative pointers → 63",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 907,
   "token": "docs/v3",
   "content": "moves\" amendment text itself INTRODUCES three new `docs/v3`",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 932,
   "token": "docs/v3",
   "content": "The run positively verified: the inventory (118 tracked `docs/v3`",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/ADR-015-v3-plane-consolidation.md",
   "line": 948,
   "token": "model-src",
   "content": "model-src keeps names, its retargeted hrefs being the navigational",
   "disposition": "kept — self",
   "new": null
  },
  {
   "path": "v3/adr/README.md",
   "line": 6,
   "token": "docs/v3",
   "content": "`docs/v3/topics/` memos.",
   "disposition": "rewritten",
   "new": "`v3/design/topics/` memos."
  },
  {
   "path": "v3/adr/README.md",
   "line": 32,
   "token": "docs/v3",
   "content": "| [ADR-015](ADR-015-v3-plane-consolidation.md) | v3 plane consolidation — `docs/v3/` merges into `v3/` | accepted | 2026-07-21 |",
   "disposition": "kept — historical",
   "reason": "kept — historical (the ADR's title names the migration itself)",
   "new": null
  },
  {
   "path": "v3/adr/_template.md",
   "line": 28,
   "token": "docs/v3",
   "content": "model plane (`docs/v3/implementation/README.md` §6); an ADR records only",
   "disposition": "rewritten",
   "new": "model plane (`v3/implementation/README.md` §6); an ADR records only"
  },
  {
   "path": "v3/src/drift/domainRegistry.test.ts",
   "line": 17,
   "token": "docs/v3",
   "content": "  \"../../../docs/v3/convergence/model-src/ledger.md\",",
   "disposition": "rewritten",
   "new": "  \"../../../v3/model/ledger.md\","
  },
  {
   "path": "v3/src/drift/domainRegistry.test.ts",
   "line": 17,
   "token": "model-src",
   "content": "  \"../../../docs/v3/convergence/model-src/ledger.md\",",
   "disposition": "rewritten",
   "new": "  \"../../../v3/model/ledger.md\","
  },
  {
   "path": "v3/src/drift/domainRegistry.test.ts",
   "line": 17,
   "token": "convergence-path",
   "content": "  \"../../../docs/v3/convergence/model-src/ledger.md\",",
   "disposition": "rewritten",
   "new": "  \"../../../v3/model/ledger.md\","
  },
  {
   "path": "v3/src/drift/rejectionNames.test.ts",
   "line": 16,
   "token": "docs/v3",
   "content": "  \"../../../docs/v3/convergence/model-src/ledger.md\",",
   "disposition": "rewritten",
   "new": "  \"../../../v3/model/ledger.md\","
  },
  {
   "path": "v3/src/drift/rejectionNames.test.ts",
   "line": 16,
   "token": "model-src",
   "content": "  \"../../../docs/v3/convergence/model-src/ledger.md\",",
   "disposition": "rewritten",
   "new": "  \"../../../v3/model/ledger.md\","
  },
  {
   "path": "v3/src/drift/rejectionNames.test.ts",
   "line": 16,
   "token": "convergence-path",
   "content": "  \"../../../docs/v3/convergence/model-src/ledger.md\",",
   "disposition": "rewritten",
   "new": "  \"../../../v3/model/ledger.md\","
  },
  {
   "path": "v3/src/drift/unitMap.test.ts",
   "line": 11,
   "token": "model-src",
   "content": " * `model-src/units/` tree at test time, schema validity, and codeRef",
   "disposition": "rewritten",
   "new": " * `v3/model/units/` tree at test time, schema validity, and codeRef"
  },
  {
   "path": "v3/src/drift/unitMap.test.ts",
   "line": 16,
   "token": "docs/v3",
   "content": "  new URL(\"../../../docs/v3/convergence/model-src/units/\", import.meta.url),",
   "disposition": "rewritten",
   "new": "  new URL(\"../../../v3/model/units/\", import.meta.url),"
  },
  {
   "path": "v3/src/drift/unitMap.test.ts",
   "line": 16,
   "token": "model-src",
   "content": "  new URL(\"../../../docs/v3/convergence/model-src/units/\", import.meta.url),",
   "disposition": "rewritten",
   "new": "  new URL(\"../../../v3/model/units/\", import.meta.url),"
  },
  {
   "path": "v3/src/drift/unitMap.test.ts",
   "line": 16,
   "token": "convergence-path",
   "content": "  new URL(\"../../../docs/v3/convergence/model-src/units/\", import.meta.url),",
   "disposition": "rewritten",
   "new": "  new URL(\"../../../v3/model/units/\", import.meta.url),"
  },
  {
   "path": "v3/src/drift/unitMap.test.ts",
   "line": 53,
   "token": "model-src",
   "content": "describe(\"the unit→code manifest (model-src/units ↔ drift/unitMap.json)\", () => {",
   "disposition": "rewritten",
   "new": "describe(\"the unit→code manifest (v3/model/units ↔ drift/unitMap.json)\", () => {"
  }
 ]
}
```

