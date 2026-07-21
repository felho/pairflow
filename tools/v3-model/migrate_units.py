#!/usr/bin/env python3
"""One-shot migration (Phase 2): pseudocode snapshots → unit-level deltas.

Converts every *pseudocode* code block from a stored full snapshot
(code/<id>.new.txt) into the unit-delta layout foldlib.py serves:

  1. Segment each snapshot into named top-level units. A segment owns its
     header line and body, plus the column-0 comment run directly above the
     header and the blank separator lines above that — so a unit's
     doc-comment travels with the unit. Bytes are partitioned exactly:
     joining the segments reproduces the snapshot.
  2. Dedup along the baseline chain: a unit whose segment text equals its
     nearest ancestor version is inherited, not stored.
  3. Verify: fold(block) must equal the original snapshot for every block
     (byte-identical) BEFORE anything is deleted or rewritten.
  4. Rewrite: store units/ + deltas/, flip the manifest entries to
     {"fold": true}, rewrite section markers [[@code ...]] → [[@fold <id>]],
     delete the migrated code/<id>.new.txt snapshots.

Template-config blocks are left as snapshots (a later slice, if needed).
Kept in the repo for provenance; running it again is a guarded no-op.
"""

import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SRC = REPO / "v3/model"

HEADER_RE = re.compile(r"^(?:INTERFACE\s+)?([A-Za-z_][A-Za-z0-9_]*)")
PREAMBLE = "__preamble__"


def fail(msg: str) -> None:
    sys.exit(f"migrate: FATAL: {msg}")


def is_header(line: str) -> bool:
    return bool(line) and not line[0].isspace() and not line.startswith("#") and bool(HEADER_RE.match(line))


def is_col0_comment(line: str) -> bool:
    return line.startswith("#")


def segment(text: str, block_id: str) -> list[tuple[str, str]]:
    """Partition a snapshot into ordered (unit_name, segment_text) pairs."""
    lines = text.splitlines(keepends=True)
    starts = []  # (line_index, unit_name)
    for i, ln in enumerate(lines):
        if not is_header(ln):
            continue
        name = HEADER_RE.match(ln).group(1) if not ln.startswith("INTERFACE") else ln.split()[1].rstrip(":")
        # attach the comment run directly above, then the blank run above that
        j = i
        while j > 0 and is_col0_comment(lines[j - 1]):
            j -= 1
        k = j
        while k > 0 and lines[k - 1].strip() == "":
            k -= 1
        starts.append((k, name))

    if not starts:
        fail(f"{block_id}: no unit headers found")
    segs = []
    if starts[0][0] > 0:
        segs.append((PREAMBLE, "".join(lines[: starts[0][0]])))
    for n, (idx, name) in enumerate(starts):
        end = starts[n + 1][0] if n + 1 < len(starts) else len(lines)
        if end <= idx:
            fail(f"{block_id}: overlapping segments at {name} (line {idx})")
        segs.append((name, "".join(lines[idx:end])))

    names = [n for n, _ in segs]
    dupes = {n for n in names if names.count(n) > 1}
    if dupes:
        fail(f"{block_id}: duplicate unit names {sorted(dupes)}")
    if "".join(t for _, t in segs) != text:
        fail(f"{block_id}: segmentation does not partition the text")
    return segs


def resolve(chain_maps: dict, baselines: dict, block_id: str, unit: str):
    b = block_id
    while b is not None:
        if unit in chain_maps[b]:
            return chain_maps[b][unit]
        b = baselines[b]
    return None


def main() -> None:
    if (SRC / "deltas").exists():
        print("migrate: deltas/ already exists — nothing to do (one-shot migration already ran)")
        return
    manifest = json.loads((SRC / "manifest.json").read_text())
    targets = [c for s in manifest["sections"] for c in s["codes"] if "pseudocode" in c["id"]]

    originals, stored_maps, baselines, orders = {}, {}, {}, {}
    n_units = n_stored = 0
    for code in targets:
        bid = code["id"]
        text = (SRC / code["new"]).read_text()
        originals[bid] = text
        segs = segment(text, bid)
        baselines[bid] = code["baseline"]
        orders[bid] = [n for n, _ in segs]
        stored_maps[bid] = {}
        for name, body in segs:
            n_units += 1
            inherited = resolve(stored_maps, baselines, code["baseline"], name) if code["baseline"] else None
            if inherited != body:
                stored_maps[bid][name] = body
                n_stored += 1

    # verify the fold reproduces every original before touching anything
    def fold(bid: str) -> str:
        return "".join(resolve(stored_maps, baselines, bid, u) for u in orders[bid])

    for bid, text in originals.items():
        if fold(bid) != text:
            fail(f"{bid}: fold does not reproduce the original snapshot")

    # write units/ + deltas/
    for bid in originals:
        (SRC / "units" / bid).mkdir(parents=True, exist_ok=True)
        for name, body in stored_maps[bid].items():
            (SRC / "units" / bid / f"{name}.txt").write_text(body)
        (SRC / "deltas").mkdir(exist_ok=True)
        (SRC / "deltas" / f"{bid}.json").write_text(
            json.dumps({"id": bid, "baseline": baselines[bid], "order": orders[bid]}, indent=2, ensure_ascii=False) + "\n"
        )

    # flip manifest entries and section markers, drop the migrated snapshots
    migrated = set(originals)
    for section in manifest["sections"]:
        touched = False
        for code in section["codes"]:
            if code["id"] in migrated:
                del code["new"]
                code["fold"] = True
                touched = True
        if touched:
            sf = SRC / section["file"]
            content = sf.read_text()
            for code in section["codes"]:
                if code.get("fold"):
                    marker = f"[[@code code/{code['id']}.new.txt]]"
                    if marker not in content:
                        fail(f"{section['id']}: expected marker missing: {marker}")
                    content = content.replace(marker, f"[[@fold {code['id']}]]")
            sf.write_text(content)
    (SRC / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    for bid in migrated:
        (SRC / "code" / f"{bid}.new.txt").unlink()

    print(f"migrate: {len(targets)} blocks -> {n_stored} stored unit versions "
          f"(of {n_units} unit slots; {n_units - n_stored} inherited); snapshots removed")


if __name__ == "__main__":
    main()
