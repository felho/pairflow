#!/usr/bin/env python3
"""Extract v3/model/core-model.html into addressable source files.

Phase 0 of the core-model source/render split: a mechanical, content-neutral
decomposition. The HTML is cut at <section> boundaries into per-level files,
and every diff-source code block (pseudocode / template config) is pulled out
into a standalone file, leaving an include marker behind. build.py re-assembles
the byte-identical HTML; check.sh is the golden test.

Layout produced under v3/model/:
  _prelude.html            head + styles + nav + intro (up to the first level section)
  _postlude.html           everything after the last level section (incl. the diff-viewer JS)
  sections/NN-<id>.html    one file per level section, code bodies replaced by markers
  code/<code-id>.old.txt   the data-code-old body of that code block (baseline snapshot)
  code/<code-id>.new.txt   the data-code-new body (this level's snapshot)
  manifest.json            section order + code-block inventory

Phase 1 additions — record-ified prose lenses (still content-neutral):
  records/absent/<sid>.json      one record per Absent item ({id, html}); the
                                 section keeps the grid wrapper + an
                                 `[[@absent <sid>]]` marker line
  records/invariants/<sid>.json  one record per Invariant rule ({id, name_html,
                                 body_html}), grouped per `agg invariant` block;
                                 marker `[[@invariants <sid> <k>]]`

Markers: the body of a diff-source <script> is replaced by `[[@code <relpath>]]`.
Bytes are never transformed — extraction is cut-and-file, so build is paste-back.
"""

import html as html_mod
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
HTML = REPO / "v3/model/core-model.html"
OUT = REPO / "v3/model"

SECTION_RE = re.compile(r'<section id="([^"]+)">')
CODE_RE = re.compile(
    r'(<script type="text/plain" class="diff-source"[^>]*>)(.*?)(</script>)',
    re.S,
)
MARKER_FMT = "[[@code {relpath}]]"

ABSENT_OPEN = '<div class="absent-grid">'
ABSENT_ITEM_RE = re.compile(r'^(\s*)<div class="absent-item">(.*)</div>$')
INV_OPEN = '<div class="agg invariant">'
ENTS_OPEN = '<div class="ents">'
ENT_RE = re.compile(r'^(\s*)<div class="ent"><div class="en">(.*?)</div><div class="fields">(.*)</div></div>$')
TAG_RE = re.compile(r"<[^>]+>")
BOLD_RE = re.compile(r"<b>(.*?)</b>")


def fail(msg: str) -> None:
    sys.exit(f"extract: FATAL: {msg}")


def slugify(html_text: str, used: set) -> str:
    text = html_mod.unescape(TAG_RE.sub("", html_text)).lower()
    slug = re.sub(r"[^a-z0-9]+", "-", text).strip("-")[:60].rstrip("-") or "item"
    base, n = slug, 2
    while slug in used:
        slug, n = f"{base}-{n}", n + 1
    used.add(slug)
    return slug


def extract_absent(section_id: str, chunk: str, records_dir: Path):
    """Pull the absent-grid's item lines into a record file; leave a marker line.

    Structure assumption (asserted): the grid's children are single-line
    absent-item divs, uniformly indented, immediately followed by the closing
    </div>. Any deviation fails loudly rather than extracting wrongly.
    """
    lines = chunk.split("\n")
    out, items, used = [], [], set()
    i, grids = 0, 0
    while i < len(lines):
        ln = lines[i]
        out.append(ln)
        if ln.strip() == ABSENT_OPEN:
            grids += 1
            i += 1
            indent = None
            while i < len(lines):
                m = ABSENT_ITEM_RE.match(lines[i])
                if not m:
                    break
                if indent is None:
                    indent = m.group(1)
                elif m.group(1) != indent:
                    fail(f"{section_id}: uneven absent-item indent at line {i}")
                inner = m.group(2)
                items.append({"id": slugify(BOLD_RE.search(inner).group(1) if BOLD_RE.search(inner) else inner, used), "html": inner})
                i += 1
            if not items:
                fail(f"{section_id}: absent-grid with no items")
            if lines[i].strip() != "</div>":
                fail(f"{section_id}: unexpected line inside absent-grid: {lines[i][:80]!r}")
            out.append(f"[[@absent {section_id}]]")
            continue
        i += 1
    if grids != 1:
        fail(f"{section_id}: expected exactly 1 absent-grid, found {grids}")
    (records_dir / "absent").mkdir(parents=True, exist_ok=True)
    (records_dir / "absent" / f"{section_id}.json").write_text(
        json.dumps({"section": section_id, "indent": indent, "items": items}, indent=2, ensure_ascii=False) + "\n"
    )
    return "\n".join(out), len(items)


def extract_invariants(section_id: str, chunk: str, records_dir: Path):
    """Pull each `agg invariant` block's ent lines into records; leave markers.

    A section may have several invariant blocks (L0a has two); each becomes an
    indexed block in the record file with marker `[[@invariants <sid> <k>]]`.
    """
    lines = chunk.split("\n")
    out, blocks, used = [], [], set()
    i = 0
    while i < len(lines):
        ln = lines[i]
        out.append(ln)
        if ln.strip() == INV_OPEN:
            # copy through to the ents opener (label lines etc. stay in place)
            i += 1
            while i < len(lines) and lines[i].strip() != ENTS_OPEN:
                if "</div>" == lines[i].strip():
                    fail(f"{section_id}: agg invariant block without an ents list")
                out.append(lines[i])
                i += 1
            if i >= len(lines):
                fail(f"{section_id}: unterminated agg invariant block")
            out.append(lines[i])  # the <div class="ents"> line
            i += 1
            indent, items = None, []
            while i < len(lines):
                m = ENT_RE.match(lines[i])
                if not m:
                    break
                if indent is None:
                    indent = m.group(1)
                elif m.group(1) != indent:
                    fail(f"{section_id}: uneven ent indent at line {i}")
                items.append({"id": slugify(m.group(2), used), "name_html": m.group(2), "body_html": m.group(3)})
                i += 1
            if not items:
                fail(f"{section_id}: agg invariant block with no ent rows")
            if lines[i].strip() != "</div>":
                fail(f"{section_id}: unexpected line inside invariant ents: {lines[i][:80]!r}")
            out.append(f"[[@invariants {section_id} {len(blocks)}]]")
            blocks.append({"indent": indent, "items": items})
            continue
        i += 1
    if not blocks:
        fail(f"{section_id}: no agg invariant block found")
    (records_dir / "invariants").mkdir(parents=True, exist_ok=True)
    (records_dir / "invariants" / f"{section_id}.json").write_text(
        json.dumps({"section": section_id, "blocks": blocks}, indent=2, ensure_ascii=False) + "\n"
    )
    return "\n".join(out), sum(len(b["items"]) for b in blocks)


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

        record = {"id": code_id, "baseline": baseline, "new": f"code/{code_id}.new.txt"}
        for m, kind in ((old_m, "old"), (new_m, "new")):
            if m.group(2) == "":
                continue  # old sides are empty in the HTML (baseline is by-ref); keep empty bodies inline, no file
            relpath = f"code/{code_id}.{kind}.txt"
            (code_dir / f"{code_id}.{kind}.txt").write_text(m.group(2))
            marker = MARKER_FMT.format(relpath=relpath)
            if marker in chunk:
                fail(f"{section_id}: marker collision for {relpath}")
            replacements.append((m.start(2), m.end(2), marker))
            if kind == "old":
                record["old"] = relpath  # only present if a stored old body ever appears
        records.append(record)

    for start, end, marker in sorted(replacements, reverse=True):
        chunk = chunk[:start] + marker + chunk[end:]
    return chunk, records


def main() -> None:
    if (OUT / "deltas").exists():
        fail("v3/model uses the unit-delta layout (deltas/ exists); extract.py is the "
             "pre-phase-2 bootstrapper and would clobber it. To re-bootstrap from the HTML, "
             "delete the source artifacts first — sections/, units/, records/, deltas/, "
             "code/, manifest.json, _prelude.html, _postlude.html — NEVER core-model.html "
             "itself (the HTML lives inside the source root and is this script's input); "
             "the delta decomposition would be lost.")
    src = HTML.read_text()
    prelude, chunks, postlude = split_sections(src)

    (OUT / "sections").mkdir(parents=True, exist_ok=True)
    (OUT / "code").mkdir(parents=True, exist_ok=True)
    (OUT / "_prelude.html").write_text(prelude)
    (OUT / "_postlude.html").write_text(postlude)

    manifest = {"html": "v3/model/core-model.html", "sections": []}
    n_absent = n_inv = 0
    for i, (sid, chunk) in enumerate(chunks, start=1):
        rewritten, codes = extract_codes(sid, chunk, OUT / "code")
        rewritten, na = extract_absent(sid, rewritten, OUT / "records")
        rewritten, ni = extract_invariants(sid, rewritten, OUT / "records")
        n_absent += na
        n_inv += ni
        fname = f"sections/{i:02d}-{sid}.html"
        (OUT / fname).write_text(rewritten)
        manifest["sections"].append({"id": sid, "file": fname, "codes": codes})

    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")

    n_codes = sum(len(s["codes"]) for s in manifest["sections"])
    print(f"extract: {len(chunks)} sections, {n_codes} code-block pairs, "
          f"{n_absent} absent records, {n_inv} invariant records -> {OUT.relative_to(REPO)}")


if __name__ == "__main__":
    main()
