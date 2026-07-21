# v3-model — core-model source/render split (Phase 0 + 1 + 2)

Tooling for `v3/model/core-model.html`. The HTML is decomposed into
addressable source files under `v3/model/`; the HTML is
(re)built from them byte-identically. This is the harness for refactoring the
core-model document without content changes.

## Files

| Script | Role |
|---|---|
| `extract.py` | HTML → `v3/model/` (mechanical cut: per-section files + code blocks + Absent/Invariant records + manifest). **Bootstrap only** — refuses to run once `deltas/` exists (it would clobber the unit-delta layout). |
| `build.py [--out PATH]` | `v3/model/` → HTML (paste-back + record rendering + unit folding). |
| `check.sh` | Golden test: the built HTML must be byte-identical to the canonical `core-model.html`; also verifies `ledger.md` freshness. |
| `foldlib.py` | Shared fold logic: reassembles a pseudocode block from its unit deltas along the baseline chain. |
| `migrate_units.py` | One-shot Phase 2 migration (snapshots → unit deltas); kept for provenance, guarded no-op now. |
| `analyze_chain.py` | Read-only report: the baseline graph of the code blocks (`data-code-old-ref`), per-block delta size, and the precise per-unit blast radius (from the `units/` layout). |
| `report_ledger.py` | Generates `v3/model/ledger.md`: the deferral ledger (Absent items bucketed by pointer target — the L9 bucket is the recovery-obligations list), the invariant catalog, the rejection registry, and the domain registry (aggregate/entity inventory per section's Domain lens, with root/kind markers and relationship prose). |

## Editing workflow (until a later phase changes it)

1. Edit files under `v3/model/` (a section, a code
   snapshot).
2. Run `python3 tools/v3-model/build.py` to regenerate the HTML.
3. Run `bash tools/v3-model/check.sh` — it must pass before committing.

Editing the HTML directly still works, but then `extract.py` must be re-run so
the sources follow; `check.sh` fails whenever the two sides diverge, whichever
side was edited.

## What the extraction preserves

- `_prelude.html` / `_postlude.html` — head+styles+nav+intro and the
  diff-viewer JS, verbatim. The viewer also carries a render-side
  readability layer over the kernel-primitives labeling convention: the
  uppercase primitive labels (`ADMISSION` / `WARRANT` / `ERRAND` /
  `CHOICEPOINT` / `DIRECTIVE`) in comments render as color-coded pills,
  `# ─── … ───` contract headers render as color-keyed bands, comments
  are dimmed (hover a line to read its full comment), and the viewer
  reflows comments — a trailing comment moves ABOVE its code line and any
  comment wraps at 100 chars, applied identically to both diff sides so
  the pairing stays consistent (contract bands stay one-line). Presentation
  only — the source units and every checksum are untouched by it.
- `sections/NN-<id>.html` — one file per level section; the bodies of the
  `diff-source` `<script>` blocks are replaced by `[[@code <relpath>]]`
  markers.
- `code/<id>.new.txt` — full snapshot for the *template-config* blocks only.
  There are no `.old.txt` files: the viewer resolves the old side **by
  reference** (`data-code-old-ref`, recorded as `baseline` in
  `manifest.json`), so every old body in the HTML is empty and stays inline.
- `deltas/<block>.json` + `units/<block>/<unit>.txt` — the *pseudocode*
  blocks in unit-delta form (Phase 2). A block stores only the unit versions
  it adds or changes plus its unit `order`; everything else is inherited
  along the baseline chain and reassembled by `foldlib.fold()` at build
  time. Sections carry `[[@fold <id>]]` markers for these.
  - **Editing a unit at level X**: edit `units/<X>/<unit>.txt`. Blast radius
    first: `ls units/*/<unit>.txt` shows every block holding a version — only
    those need review; all downstream snapshots recompute.
  - **A new level**: a new `deltas/<id>.json` (baseline + order) + unit files
    for what it adds/changes — no full-snapshot copying.
  - A unit's leading column-0 comment run travels with the unit; the
    `__preamble__` pseudo-unit holds bytes before the first unit.
- `records/absent/<sid>.json` — one record per Absent item (`{id, html}`);
  the section keeps the grid wrapper plus an `[[@absent <sid>]]` marker.
- `records/invariants/<sid>.json` — one record per invariant rule
  (`{id, name_html, body_html}`), grouped per `agg invariant` block; marker
  `[[@invariants <sid> <k>]]`.
- `ledger.md` — GENERATED registries (deferral ledger / invariant catalog /
  rejection registry / domain registry); regenerate with `report_ledger.py`,
  guarded by `check.sh`. The domain registry (§4) derives from each section's
  Domain-lens slice (the `.agg` structure is reused by other lenses, so the
  slice boundary — Domain heading to next view heading — is the scope); it is
  the domain vocabulary's semantic checksum and the source for the
  implementation's type-layer drift test (v1-operability memo Q4).
- `manifest.json` — section order + code-block inventory + baseline refs.

Record fields are minimal on purpose: the `html` fragment is the single
authority, and registry metadata (an Absent item's `→ target`, an invariant's
plain-text name) is *derived* from it at report time — no second stored truth
to drift. Editable validity fields (`introduced` / `resolved_by`) come when
content editing starts, replacing derivation.

Not yet record-ified (Phase 1b, when a consumer needs them): Runtime trace
rows, Domain entity tables, Evidence items. The pattern is established; traces
become valuable as executable fixtures in the reference-implementation phase.
(The Domain entity tables now have a *derived* inventory — ledger §4 — without
being record-ified: the inline HTML stays the single authority.)

## Notes

- Prototype is Python (stdlib-only) for speed; port to TypeScript if this
  becomes long-lived repo infrastructure.
- The `new` snapshots are full copies per level — that duplication is the
  known ripple problem this split exists to attack in later phases
  (unit-level deltas). Phase 0 is deliberately content-neutral.
