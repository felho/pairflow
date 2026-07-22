#!/usr/bin/env python3
"""DEFERRED-marker checker — the ch12 boundary's pointer-comment tooling.

Convention (v3/implementation/README.md §4, adopted at the ch12
boundary): a temporary in-code deferral marker takes the CANONICAL
form `DEFERRED(chN[-pM]): <note>`. This tool:

  * enumerates every canonical marker under the scanned root
    (default: v3/src — code comments; the doc plane uses prose
    "deferred" freely and is out of scope),
  * FAILS CLOSED on the marker NAMESPACE: any `DEFERRED(...)`
    occurrence that does not match the canonical form is an error
    (a typo'd marker must go loud, never silently uncounted). Bare
    `DEFERRED` words outside the paren form are ignored — they occur
    legitimately (SQLite `BEGIN DEFERRED`, test titles),
  * with --closed chN[-pM]: goes RED while any marker addressed to
    that chapter (or that exact packet) remains — the
    red-at-chapter-close gate,
  * reads BYTES and decodes with errors="replace" so a NUL byte or
    other binary classification cannot hide a marker from the scan
    (the R-INSTRUMENT-PROBE lesson: instruments must not be
    tool/mode-dependent).

Exit codes: 0 clean; 1 findings (nonconforming namespace entry, or
--closed markers remaining); 2 usage.
"""

from __future__ import annotations

import argparse
import re
import sys
import tempfile
from pathlib import Path

CANONICAL_RE = re.compile(r"DEFERRED\((ch\d+)(-p\d+[a-z]?)?\):")
NAMESPACE_RE = re.compile(r"DEFERRED\([^)]*\)?")
SKIP_DIRS = {"node_modules", "dist", ".git", "coverage"}


def scan_file(path: Path) -> tuple[list[tuple[int, str, str]], list[tuple[int, str]]]:
    """Returns (markers, nonconforming): markers as (line_no, chapter_or_packet, line),
    nonconforming as (line_no, line)."""
    text = path.read_bytes().decode("utf-8", errors="replace")
    markers: list[tuple[int, str, str]] = []
    bad: list[tuple[int, str]] = []
    for i, line in enumerate(text.splitlines(), start=1):
        spans: list[tuple[int, int]] = []
        for m in CANONICAL_RE.finditer(line):
            target = m.group(1) + (m.group(2) or "")
            markers.append((i, target, line.strip()))
            spans.append(m.span())
        for m in NAMESPACE_RE.finditer(line):
            if not any(s <= m.start() < e for s, e in spans):
                bad.append((i, line.strip()))
    return markers, bad


def scan_tree(root: Path) -> tuple[list[tuple[Path, int, str, str]], list[tuple[Path, int, str]]]:
    markers: list[tuple[Path, int, str, str]] = []
    bad: list[tuple[Path, int, str]] = []
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        file_markers, file_bad = scan_file(path)
        markers.extend((path, n, t, line) for n, t, line in file_markers)
        bad.extend((path, n, line) for n, line in file_bad)
    return markers, bad


def run(root: Path, closed: list[str]) -> int:
    markers, bad = scan_tree(root)
    errors = 0
    for path, line_no, target, line in markers:
        print(f"deferred: {path}:{line_no}: [{target}] {line}")
    for path, line_no, line in bad:
        errors += 1
        print(
            f"check-deferred FAIL: {path}:{line_no}: DEFERRED(...) occurrence "
            f"does not match the canonical form DEFERRED(chN[-pM]): — {line}"
        )
    for closed_target in closed:
        for path, line_no, target, _line in markers:
            chapter = target.split("-")[0]
            if target == closed_target or chapter == closed_target:
                errors += 1
                print(
                    f"check-deferred FAIL: {path}:{line_no}: marker [{target}] "
                    f"remains but {closed_target} is closing — retire the "
                    f"deferred work or re-address the marker"
                )
    print(f"check-deferred: {len(markers)} marker(s), {errors} error(s)")
    return 1 if errors else 0


def selftest() -> int:
    failures: list[str] = []

    def expect(label: str, cond: bool) -> None:
        if not cond:
            failures.append(label)

    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        (root / "a.ts").write_text(
            "// DEFERRED(ch9): wire the real provider\n"
            "// prose: this is deferred to a later chapter\n"
            'db.exec("BEGIN DEFERRED");\n',
            encoding="utf-8",
        )
        (root / "b.ts").write_text(
            "// DEFERRED(ch12-p4): retire at the format packet\n", encoding="utf-8"
        )
        markers, bad = scan_tree(root)
        expect("finds-both-canonical-markers", len(markers) == 2)
        expect("bare-DEFERRED-word-ignored", len(bad) == 0)
        expect("closed-chapter-goes-red", run(root, ["ch9"]) == 1)
        expect("closed-exact-packet-goes-red", run(root, ["ch12-p4"]) == 1)
        expect("other-chapter-stays-green", run(root, ["ch13"]) == 0)

        # adversarial: typo'd namespace entry must go loud, never uncounted
        (root / "c.ts").write_text("// DEFERRED(soon): vague\n", encoding="utf-8")
        _, bad = scan_tree(root)
        expect("typo-namespace-entry-is-red", len(bad) == 1)
        expect("typo-fails-run", run(root, []) == 1)
        (root / "c.ts").unlink()

        # adversarial: a NUL byte in the file must not hide the marker
        (root / "d.ts").write_bytes(b"\x00// DEFERRED(ch9): behind a NUL\n")
        markers, _ = scan_tree(root)
        expect("nul-byte-does-not-hide-marker", len(markers) == 3)
        (root / "d.ts").unlink()

        # adversarial: deleting the marker returns the tree to green
        (root / "a.ts").write_text("// clean now\n", encoding="utf-8")
        (root / "b.ts").write_text("// clean now\n", encoding="utf-8")
        expect("deleted-markers-green", run(root, ["ch9", "ch12-p4"]) == 0)

    if failures:
        print(f"check-deferred selftest: {len(failures)} failure(s): {failures}")
        return 1
    print("check-deferred selftest: 8 case(s) exercised, 0 failure(s)")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default="v3/src", help="tree to scan (default: v3/src)")
    parser.add_argument(
        "--closed",
        action="append",
        default=[],
        help="chapter (ch9) or packet (ch12-p4) whose markers must be gone",
    )
    parser.add_argument("--selftest", action="store_true")
    args = parser.parse_args()
    if args.selftest:
        return selftest()
    root = Path(args.root)
    if not root.is_dir():
        print(f"check-deferred FAIL: root '{root}' is not a directory")
        return 2
    return run(root, args.closed)


if __name__ == "__main__":
    sys.exit(main())
