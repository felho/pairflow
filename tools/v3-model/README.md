# v3-model — core-model source/render split (Phase 0 + 1)

Tooling for `docs/v3/convergence/core-model.html`. The HTML is decomposed into
addressable source files under `docs/v3/convergence/model-src/`; the HTML is
(re)built from them byte-identically. This is the harness for refactoring the
core-model document without content changes.

## Files

| Script | Role |
|---|---|
| `extract.py` | HTML → `model-src/` (mechanical cut: per-section files + code blocks + Absent/Invariant records + manifest). Deterministic; safe to re-run. |
| `build.py [--out PATH]` | `model-src/` → HTML (paste-back + record rendering). |
| `check.sh` | Golden test: the built HTML must be byte-identical to the canonical `core-model.html`; also verifies `ledger.md` freshness. |
| `analyze_chain.py` | Read-only report: the baseline graph of the code blocks (`data-code-old-ref`), per-block delta size, and per-unit blast radius (which levels touch which pseudocode unit). |
| `report_ledger.py` | Generates `model-src/ledger.md`: the deferral ledger (Absent items bucketed by pointer target — the L9 bucket is the recovery-obligations list), the invariant catalog, and the rejection registry. |

## Editing workflow (until a later phase changes it)

1. Edit files under `docs/v3/convergence/model-src/` (a section, a code
   snapshot).
2. Run `python3 tools/v3-model/build.py` to regenerate the HTML.
3. Run `bash tools/v3-model/check.sh` — it must pass before committing.

Editing the HTML directly still works, but then `extract.py` must be re-run so
the sources follow; `check.sh` fails whenever the two sides diverge, whichever
side was edited.

## What the extraction preserves

- `_prelude.html` / `_postlude.html` — head+styles+nav+intro and the
  diff-viewer JS, verbatim.
- `sections/NN-<id>.html` — one file per level section; the bodies of the
  `diff-source` `<script>` blocks are replaced by `[[@code <relpath>]]`
  markers.
- `code/<id>.new.txt` — each code block's full snapshot (`data-code-new`).
  There are no `.old.txt` files: the viewer resolves the old side **by
  reference** (`data-code-old-ref`, recorded as `baseline` in
  `manifest.json`), so every old body in the HTML is empty and stays inline.
- `records/absent/<sid>.json` — one record per Absent item (`{id, html}`);
  the section keeps the grid wrapper plus an `[[@absent <sid>]]` marker.
- `records/invariants/<sid>.json` — one record per invariant rule
  (`{id, name_html, body_html}`), grouped per `agg invariant` block; marker
  `[[@invariants <sid> <k>]]`.
- `ledger.md` — GENERATED registries (deferral ledger / invariant catalog /
  rejection registry); regenerate with `report_ledger.py`, guarded by
  `check.sh`.
- `manifest.json` — section order + code-block inventory + baseline refs.

Record fields are minimal on purpose: the `html` fragment is the single
authority, and registry metadata (an Absent item's `→ target`, an invariant's
plain-text name) is *derived* from it at report time — no second stored truth
to drift. Editable validity fields (`introduced` / `resolved_by`) come when
content editing starts, replacing derivation.

Not yet record-ified (Phase 1b, when a consumer needs them): Runtime trace
rows, Domain entity tables, Evidence items. The pattern is established; traces
become valuable as executable fixtures in the reference-implementation phase.

## Notes

- Prototype is Python (stdlib-only) for speed; port to TypeScript if this
  becomes long-lived repo infrastructure.
- The `new` snapshots are full copies per level — that duplication is the
  known ripple problem this split exists to attack in later phases
  (unit-level deltas). Phase 0 is deliberately content-neutral.
