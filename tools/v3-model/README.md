# v3-model — core-model source/render split (Phase 0)

Tooling for `docs/v3/convergence/core-model.html`. The HTML is decomposed into
addressable source files under `docs/v3/convergence/model-src/`; the HTML is
(re)built from them byte-identically. This is the harness for refactoring the
core-model document without content changes.

## Files

| Script | Role |
|---|---|
| `extract.py` | HTML → `model-src/` (mechanical cut: per-section files + code blocks + manifest). Deterministic; safe to re-run. |
| `build.py [--out PATH]` | `model-src/` → HTML (pure paste-back of the extracted bytes). |
| `check.sh` | Golden test: the built HTML must be byte-identical to the canonical `core-model.html`. |
| `analyze_chain.py` | Read-only report: the baseline graph of the code blocks (`data-code-old-ref`), per-block delta size, and per-unit blast radius (which levels touch which pseudocode unit). |

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
- `code/<id>.old.txt` — the stored old side. Note: the viewer resolves most
  baselines **by reference** (`data-code-old-ref` → recorded as `baseline` in
  `manifest.json`), so these files are empty except for genuinely
  empty-baseline blocks.
- `manifest.json` — section order + code-block inventory + baseline refs.

## Notes

- Prototype is Python (stdlib-only) for speed; port to TypeScript if this
  becomes long-lived repo infrastructure.
- The `new` snapshots are full copies per level — that duplication is the
  known ripple problem this split exists to attack in later phases
  (unit-level deltas). Phase 0 is deliberately content-neutral.
