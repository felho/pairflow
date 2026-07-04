#!/usr/bin/env python3
"""Extract docs/v3/convergence/core-model.html into addressable source files.

Phase 0 of the core-model source/render split: a mechanical, content-neutral
decomposition. The HTML is cut at <section> boundaries into per-level files,
and every diff-source code block (pseudocode / template config) is pulled out
into a standalone file, leaving an include marker behind. build.py re-assembles
the byte-identical HTML; check.sh is the golden test.

Layout produced under docs/v3/convergence/model-src/:
  _prelude.html            head + styles + nav + intro (up to the first level section)
  _postlude.html           everything after the last level section (incl. the diff-viewer JS)
  sections/NN-<id>.html    one file per level section, code bodies replaced by markers
  code/<code-id>.old.txt   the data-code-old body of that code block (baseline snapshot)
  code/<code-id>.new.txt   the data-code-new body (this level's snapshot)
  manifest.json            section order + code-block inventory

Markers: the body of a diff-source <script> is replaced by `[[@code <relpath>]]`.
Bytes are never transformed — extraction is cut-and-file, so build is paste-back.
"""

import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
HTML = REPO / "docs/v3/convergence/core-model.html"
OUT = REPO / "docs/v3/convergence/model-src"

SECTION_RE = re.compile(r'<section id="([^"]+)">')
CODE_RE = re.compile(
    r'(<script type="text/plain" class="diff-source"[^>]*>)(.*?)(</script>)',
    re.S,
)
MARKER_FMT = "[[@code {relpath}]]"


def fail(msg: str) -> None:
    sys.exit(f"extract: FATAL: {msg}")


def split_sections(src: str):
    """Return (prelude, [(section_id, chunk)], postlude).

    A chunk spans from its <section ...> open tag to just before the next
    section's open tag; the last chunk ends after its own </section>.
    """
    starts = [(m.start(), m.group(1)) for m in SECTION_RE.finditer(src)]
    if not starts:
        fail("no <section id=...> found")
    # everything up to and including section#how is prelude (not a level)
    level_starts = [(pos, sid) for pos, sid in starts if sid != "how"]
    prelude = src[: level_starts[0][0]]
    chunks = []
    last_end = None
    for i, (pos, sid) in enumerate(level_starts):
        if i + 1 < len(level_starts):
            end = level_starts[i + 1][0]
        else:
            close = src.rfind("</section>")
            if close < pos:
                fail(f"last section {sid} has no closing tag")
            end = close + len("</section>")
            last_end = end
        chunks.append((sid, src[pos:end]))
    return prelude, chunks, src[last_end:]


def extract_codes(section_id: str, chunk: str, code_dir: Path):
    """Pull diff-source bodies out of a section chunk.

    Returns (rewritten_chunk, code_records). Blocks come in (old, new) pairs;
    the pair is named by the new block's data-code-id.
    """
    matches = list(CODE_RE.finditer(chunk))
    if len(matches) % 2 != 0:
        fail(f"{section_id}: odd number of diff-source blocks ({len(matches)})")

    records = []
    replacements = []  # (start, end, replacement_text)
    for i in range(0, len(matches), 2):
        old_m, new_m = matches[i], matches[i + 1]
        if "data-code-old" not in old_m.group(1):
            fail(f"{section_id}: block {i} is not data-code-old: {old_m.group(1)[:80]}")
        if "data-code-new" not in new_m.group(1):
            fail(f"{section_id}: block {i+1} is not data-code-new: {new_m.group(1)[:80]}")
        id_m = re.search(r'data-code-id="([^"]+)"', new_m.group(1))
        if not id_m:
            fail(f"{section_id}: data-code-new without data-code-id")
        code_id = id_m.group(1)
        base_m = re.search(r'data-code-old-ref="([^"]+)"', old_m.group(1))
        baseline = base_m.group(1) if base_m else None  # None = empty baseline

        for m, kind in ((old_m, "old"), (new_m, "new")):
            relpath = f"code/{code_id}.{kind}.txt"
            (code_dir / f"{code_id}.{kind}.txt").write_text(m.group(2))
            marker = MARKER_FMT.format(relpath=relpath)
            if marker in chunk:
                fail(f"{section_id}: marker collision for {relpath}")
            replacements.append((m.start(2), m.end(2), marker))
        records.append({
            "id": code_id,
            "baseline": baseline,
            "old": f"code/{code_id}.old.txt",
            "new": f"code/{code_id}.new.txt",
        })

    for start, end, marker in sorted(replacements, reverse=True):
        chunk = chunk[:start] + marker + chunk[end:]
    return chunk, records


def main() -> None:
    src = HTML.read_text()
    prelude, chunks, postlude = split_sections(src)

    (OUT / "sections").mkdir(parents=True, exist_ok=True)
    (OUT / "code").mkdir(parents=True, exist_ok=True)
    (OUT / "_prelude.html").write_text(prelude)
    (OUT / "_postlude.html").write_text(postlude)

    manifest = {"html": "docs/v3/convergence/core-model.html", "sections": []}
    for i, (sid, chunk) in enumerate(chunks, start=1):
        rewritten, codes = extract_codes(sid, chunk, OUT / "code")
        fname = f"sections/{i:02d}-{sid}.html"
        (OUT / fname).write_text(rewritten)
        manifest["sections"].append({"id": sid, "file": fname, "codes": codes})

    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")

    n_codes = sum(len(s["codes"]) for s in manifest["sections"])
    print(f"extract: {len(chunks)} sections, {n_codes} code-block pairs -> {OUT.relative_to(REPO)}")


if __name__ == "__main__":
    main()
