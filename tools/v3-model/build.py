#!/usr/bin/env python3
"""Assemble v3/model/core-model.html from v3/model/ sources.

The inverse of extract.py: prelude + sections (with `[[@code <relpath>]]`
markers replaced by the referenced file's bytes) + postlude. Pure paste-back —
no byte transformation — so the output is byte-identical to what was extracted.

Usage: build.py [--out PATH]   (default: overwrite the canonical HTML)
"""

import json
import re
import sys
from pathlib import Path

import foldlib

REPO = Path(__file__).resolve().parents[2]
SRC = REPO / "v3/model"
MARKER_RE = re.compile(r"\[\[@code ([^\]]+)\]\]")
FOLD_RE = re.compile(r"\[\[@fold ([^\]]+)\]\]")
ABSENT_MARK_RE = re.compile(r"^\[\[@absent (\S+)\]\]$", re.M)
INV_MARK_RE = re.compile(r"^\[\[@invariants (\S+) (\d+)\]\]$", re.M)


def render_absent(match: re.Match) -> str:
    data = json.loads((SRC / "records/absent" / f"{match.group(1)}.json").read_text())
    ind = data["indent"]
    return "\n".join(f'{ind}<div class="absent-item">{it["html"]}</div>' for it in data["items"])


def render_invariants(match: re.Match) -> str:
    data = json.loads((SRC / "records/invariants" / f"{match.group(1)}.json").read_text())
    block = data["blocks"][int(match.group(2))]
    ind = block["indent"]
    return "\n".join(
        f'{ind}<div class="ent"><div class="en">{it["name_html"]}</div><div class="fields">{it["body_html"]}</div></div>'
        for it in block["items"]
    )


def main() -> None:
    out_path = REPO / "v3/model/core-model.html"
    args = sys.argv[1:]
    if args[:1] == ["--out"] and len(args) == 2:
        out_path = Path(args[1])
    elif args:
        sys.exit("usage: build.py [--out PATH]")

    manifest = json.loads((SRC / "manifest.json").read_text())

    def inject(match: re.Match) -> str:
        relpath = match.group(1)
        code_file = SRC / relpath
        if not code_file.is_file():
            sys.exit(f"build: FATAL: marker references missing file {relpath}")
        return code_file.read_text()

    parts = [(SRC / "_prelude.html").read_text()]
    for section in manifest["sections"]:
        chunk = (SRC / section["file"]).read_text()
        chunk = ABSENT_MARK_RE.sub(render_absent, chunk)
        chunk = INV_MARK_RE.sub(render_invariants, chunk)
        chunk = FOLD_RE.sub(lambda m: foldlib.fold(m.group(1)), chunk)
        parts.append(MARKER_RE.sub(inject, chunk))
    parts.append((SRC / "_postlude.html").read_text())

    out_path.write_text("".join(parts))
    print(f"build: wrote {out_path}")


if __name__ == "__main__":
    main()
