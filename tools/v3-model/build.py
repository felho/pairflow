#!/usr/bin/env python3
"""Assemble docs/v3/convergence/core-model.html from model-src/ sources.

The inverse of extract.py: prelude + sections (with `[[@code <relpath>]]`
markers replaced by the referenced file's bytes) + postlude. Pure paste-back —
no byte transformation — so the output is byte-identical to what was extracted.

Usage: build.py [--out PATH]   (default: overwrite the canonical HTML)
"""

import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SRC = REPO / "docs/v3/convergence/model-src"
MARKER_RE = re.compile(r"\[\[@code ([^\]]+)\]\]")


def main() -> None:
    out_path = REPO / "docs/v3/convergence/core-model.html"
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
        parts.append(MARKER_RE.sub(inject, chunk))
    parts.append((SRC / "_postlude.html").read_text())

    out_path.write_text("".join(parts))
    print(f"build: wrote {out_path}")


if __name__ == "__main__":
    main()
