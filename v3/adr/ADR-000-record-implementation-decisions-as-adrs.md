# ADR-000: Record implementation decisions as ADRs

Status: accepted
Date: 2026-07-07
Links: supersedes — · amends — · depends-on — · related ADR-001, ADR-002, ADR-003

## Context

The model plane keeps its decisions in the corpus + `v3/design/topics/` memos
(the playbook §8 boundary rule; the memos ARE the model's decision records).
The implementation plane needs its own decision records with a lifecycle and
a review surface — PI-10 activates the convention; this ADR is its bootstrap
record.

## Decision

Implementation-side decisions — storage substrate, migration stance, adapter
technology, repo layout, language/framework/tooling picks, and any deliberate
deviation an `IC-*` item allows — are recorded as ADRs in `v3/adr/`:

- Sequential IDs (`ADR-NNN`), one flat directory, flat index in
  [`README.md`](README.md) (id · title · status · date) with a trigger-watch
  section for dormant ADR triggers.
- Lifecycle: `proposed → accepted → deprecated | superseded by ADR-XXX`.
  Superseding is permanent; the successor references back via `Supersedes:`.
- Relationship links per ADR: `supersedes` / `amends` / `depends-on` /
  `related`.
- The template ([`_template.md`](_template.md)) carries a **mandatory IC-N
  screen**; a banned kernel shape enters only via an `accepted` ADR that
  cites and overturns IC-N explicitly, and no ADR bypasses the model↔code
  divergence stop.
- Integrity check: [`check.sh`](check.sh) (dangling refs, supersede
  reciprocity + cycles, status values, index consistency); root bridge
  `pnpm v3:adr-check`.
- **ADR compliance review** as a change-review step (build-loop step 6):
  diff vs accepted ADRs, references-to-superseded flagged, unlinked-change
  prompt — the third QA axis beside the IC contract tests and the PI-3
  drift tests.

Boundary rule restated: model-side decisions stay in the corpus + memos; no
retroactive conversion into ADRs.

## Alternatives Considered

- **Decisions in plan prose only** — rejected: no lifecycle, no supersede
  semantics, no compliance-review surface; architecture-shape decisions
  would have no regression guard.
- **The full `ruflo-adr` plugin machinery** — rejected: the durable subset
  (flat files, flat index, plain-script integrity check) is adopted; the
  AgentDB/semantic-search infrastructure is not (playbook §10).

## IC-N Screen (mandatory)

No — this decision is process machinery; it touches no kernel shape.

## Consequences

- Positive: every implementation decision has a citable ID, a lifecycle,
  and a mechanical integrity guard; "unlinked change" becomes an askable
  review question.
- Negative: ceremony per decision (template + index row + check run).
- Neutral: ADR home is `v3/adr/`, moving the process README §1 default
  (`docs/v3/implementation/adr/`) — recorded in plan §2.5.

## Verification

`check.sh` green in CI-local culture; the compliance-review step applied at
build-loop step 6 of every chapter.

## Related

Playbook §8 (ADR activation addendum) · `implementation-contract.md` PI-10 ·
plan §2.5.
