#!/usr/bin/env python3
"""ADR-015 Class C sweep — the two-run PRE/POST reconciliation.

The ADR-015 plane consolidation (docs/v3/ → v3/{model,design,
implementation}) retires path vocabulary that live surfaces may not
keep and historical records may not lose. This script is the
machine-checkable census over that vocabulary (ADR-015 "Class C",
arm findings F2-deep8/F1-deep10/F1-deep11):

- `--pre <parent-sha>` scans the MIGRATION PARENT's tree and emits
  the authoritative hit table (JSON rows keyed path:line:token).
  Every key receives a disposition (`rewritten`, `kept — <class>`,
  `annotated`, `introduced`) in the frozen copy that lives in the
  migration report; the raw emission carries no dispositions.
- `--post <migration-sha>` scans the migration commit's tree and
  reconciles it against the frozen table read from the report AT
  THAT COMMIT (`v3/implementation/adr-015-migration-report.md`).
  Reconciliation is CONTENT-ANCHORED (arm finding F1-deep12; line
  numbers are advisory locators only): a `kept` row matches when its
  exact line content exists in the translated file; a `rewritten`
  row when its old content is absent AND its predicted new content
  is present (arm finding F1-deep13); an `introduced` row when its
  pre-stated content is present at its own (new-tree) key. Every
  post-tree hit must be claimed by some frozen row's surviving
  content, and per-(path, token) occurrence counts close the census.

Both runs read trees via `git show`, never the working tree, so the
audit is rerunnable at any later commit (arm finding F2-deep12).

Token tiers (ADR-015 Class C):
- Repo-wide (tracked files only, minus the Verification-5 excludes):
  `docs/v3`; `model-src`; the retired directory name in PATH-SHAPED
  context only (`convergence/` or `/convergence` — bare prose
  "convergence" is language, not a pointer; arm finding F2-deep10).
- Moved trees only (pre: docs/v3/**; post: v3/{model,design,
  implementation}/**): every `../`-prefixed inline path, and bare
  subtree-prefixed paths (`topics/<name>`, `research/<name>`,
  `convergence/<name>` implicitly rooted at the old docs/v3 — arm
  finding F1-deep9).

Self-exclusion is BY LISTING: the frozen table names the ADR, the
report, and this script with reason `self`; their own old-path
mentions are skipped by reconciliation but still visibly listed.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
REPORT_REL = "v3/implementation/adr-015-migration-report.md"

# The ADR-015 mapping table (Decision section), applied in order —
# longer prefixes first so no rule shadows another. Raw prefix
# semantics: rule 2 deliberately covers core-model.html,
# core-model-todo.md and core-model-future-topic.md.
PREFIX_TABLE = [
    ("docs/v3/convergence/model-src", "v3/model"),
    ("docs/v3/convergence/core-model", "v3/model/core-model"),
    ("docs/v3/convergence/approach.md", "v3/design/approach.md"),
    ("docs/v3/convergence/design-method-playbook.md", "v3/design/design-method-playbook.md"),
    ("docs/v3/convergence/implementation-contract.md", "v3/design/implementation-contract.md"),
    ("docs/v3/research", "v3/design/research"),
    ("docs/v3/topics", "v3/design/topics"),
    ("docs/v3/implementation", "v3/implementation"),
    ("docs/v3/concept-braindump.md", "v3/design/concept-braindump.md"),
    ("docs/v3/test-workflows.md", "v3/design/test-workflows.md"),
]

# Verification-5 excludes: point-in-time artifacts, not pointers.
EXCLUDE_DIR_PARTS = {"node_modules", ".pairflow", "__pycache__", ".git"}

PRE_MOVED_PREFIX = "docs/v3/"
POST_MOVED_PREFIXES = ("v3/model/", "v3/design/", "v3/implementation/")

RELPATH_RE = re.compile(r"\.\./[A-Za-z0-9_][A-Za-z0-9_.\-/]*")
BARE_SUBTREE_RE = re.compile(r"(?<![\w.\-/])((?:topics|research|convergence)/[A-Za-z0-9_][A-Za-z0-9_.\-/]*)")
CONV_PATH_RE = re.compile(r"convergence/|/convergence")


def map_path(path: str) -> str:
    for old, new in PREFIX_TABLE:
        if path.startswith(old):
            return new + path[len(old):]
    return path


def git_out(*argv: str) -> str:
    out = subprocess.run(
        ["git", "-C", str(REPO_ROOT), *argv], capture_output=True, text=True
    )
    if out.returncode != 0:
        raise SystemExit(f"git {' '.join(argv)} failed: {out.stderr.strip()}")
    return out.stdout


def tree_files(sha: str) -> list[str]:
    files = git_out("ls-tree", "-r", "--name-only", "-z", sha).split("\0")
    kept = []
    for f in files:
        if not f:
            continue
        if any(part in EXCLUDE_DIR_PARTS for part in f.split("/")):
            continue
        kept.append(f)
    return kept


def file_lines(sha: str, path: str) -> list[str] | None:
    out = subprocess.run(
        ["git", "-C", str(REPO_ROOT), "show", f"{sha}:{path}"],
        capture_output=True,
    )
    if out.returncode != 0:
        return None
    try:
        return out.stdout.decode("utf-8").splitlines()
    except UnicodeDecodeError:
        return None  # binary — carries no textual pointer


def scan_tree(sha: str, moved_prefixes: tuple[str, ...] | str) -> list[dict]:
    """One deterministic pass; returns rows {path, line, token, content}."""
    if isinstance(moved_prefixes, str):
        moved_prefixes = (moved_prefixes,)
    rows: list[dict] = []
    for path in tree_files(sha):
        lines = file_lines(sha, path)
        if lines is None:
            continue
        in_moved = path.startswith(moved_prefixes)
        for lineno, line in enumerate(lines, start=1):
            for _ in range(line.count("docs/v3")):
                rows.append({"path": path, "line": lineno, "token": "docs/v3", "content": line})
            for _ in range(line.count("model-src")):
                rows.append({"path": path, "line": lineno, "token": "model-src", "content": line})
            for _ in CONV_PATH_RE.finditer(line):
                rows.append({"path": path, "line": lineno, "token": "convergence-path", "content": line})
            if in_moved:
                for m in RELPATH_RE.finditer(line):
                    rows.append({"path": path, "line": lineno, "token": m.group(0), "content": line})
                for m in BARE_SUBTREE_RE.finditer(line):
                    rows.append({"path": path, "line": lineno, "token": f"bare:{m.group(1)}", "content": line})
    return rows


def load_frozen(post_sha: str) -> dict:
    """The frozen table from the report at the post tree (git show)."""
    out = subprocess.run(
        ["git", "-C", str(REPO_ROOT), "show", f"{post_sha}:{REPORT_REL}"],
        capture_output=True,
        text=True,
    )
    if out.returncode != 0:
        raise SystemExit(f"cannot read {REPORT_REL} at {post_sha}: {out.stderr.strip()}")
    m = re.search(
        r"<!-- adr015-frozen-table -->\n```json\n(.*?)\n```", out.stdout, re.DOTALL
    )
    if not m:
        raise SystemExit("frozen table block not found in the report")
    return json.loads(m.group(1))


def run_pre(sha: str) -> int:
    rows = scan_tree(sha, PRE_MOVED_PREFIX)
    json.dump({"tree": sha, "rows": rows}, sys.stdout, indent=1, ensure_ascii=False)
    sys.stdout.write("\n")
    print(f"pre-sweep: {len(rows)} hit(s) across the tree at {sha[:12]}", file=sys.stderr)
    return 0


def run_post(sha: str) -> int:
    frozen = load_frozen(sha)
    self_files = set(frozen.get("self_excluded", []))
    rows = frozen["rows"]
    errors: list[str] = []

    post_lines: dict[str, list[str] | None] = {}

    def lines_at(path: str) -> list[str] | None:
        if path not in post_lines:
            post_lines[path] = file_lines(sha, path)
        return post_lines[path]

    # 1) every frozen row's survival condition, content-anchored
    for row in rows:
        disp = row["disposition"]
        if disp == "introduced":
            tpath = row["path"]  # introduced rows are keyed by NEW-tree path
        else:
            tpath = map_path(row["path"])
        if tpath in self_files:
            continue
        lines = lines_at(tpath)
        key = f"{row['path']}:{row['line']}:{row['token']}"
        if lines is None:
            errors.append(f"{key}: translated file {tpath} unreadable at {sha[:12]}")
            continue
        if disp.startswith("kept"):
            if row["content"] not in lines:
                errors.append(f"{key} [{disp}]: content not found in {tpath}")
        elif disp in ("rewritten", "rewritten — location claim"):
            if row["content"] in lines:
                errors.append(f"{key} [{disp}]: OLD content still present in {tpath}")
            new = row.get("new")
            if new is not None and new not in lines:
                errors.append(f"{key} [{disp}]: predicted new content absent in {tpath}")
        elif disp == "annotated":
            new = row.get("new")
            if new is None or new not in lines:
                errors.append(f"{key} [annotated]: annotated content absent in {tpath}")
        elif disp == "introduced":
            if row["content"] not in lines:
                errors.append(f"{key} [introduced]: pre-stated content absent in {tpath}")
        else:
            errors.append(f"{key}: unknown disposition '{disp}'")

    # 2) every post hit claimed + per-(path, token) counts close
    post_rows = scan_tree(sha, POST_MOVED_PREFIXES)
    # The expected occurrence multiplicity comes from the FROZEN TABLE
    # (distinct source lines per surviving content), NEVER from counting
    # the post tree — post-tree counting is circular and blessed the
    # deletion of one of two identical kept lines (external-arm finding,
    # 2026-07-21 xhigh round 1 on the migration implementation).
    surviving: dict[str, set[str]] = {}
    surviving_mult: dict[str, Counter] = {}
    seen_source_lines: set[tuple] = set()
    for row in rows:
        disp = row["disposition"]
        tpath = row["path"] if disp == "introduced" else map_path(row["path"])
        if tpath in self_files:
            continue  # self-excluded on both sides of the census
        if disp.startswith("kept") or disp == "introduced":
            content = row["content"]
        elif row.get("new") is not None:
            content = row["new"]
        else:
            continue
        surviving.setdefault(tpath, set()).add(content)
        line_key = (row["path"], row["line"], disp == "introduced", content)
        if line_key not in seen_source_lines:  # one line, many tokens → one occurrence
            seen_source_lines.add(line_key)
            surviving_mult.setdefault(tpath, Counter())[content] += 1

    unclaimed = []
    for hit in post_rows:
        if hit["path"] in self_files:
            continue
        if hit["content"] not in surviving.get(hit["path"], set()):
            unclaimed.append(hit)
    for hit in unclaimed:
        errors.append(
            f"post hit not claimed by any frozen row: "
            f"{hit['path']}:{hit['line']}:{hit['token']}"
        )

    # 3) RELATIVE ORDER of surviving lines (external-arm finding,
    # 2026-07-21 xhigh round 2): content + count closure alone blessed
    # a SWAP of two different kept-historical lines. The frozen table's
    # advisory line numbers define the expected relative order per
    # file; the post file must realize those contents as a SUBSEQUENCE
    # in that order — insertions (amendments, the appended log entry)
    # cannot disturb it, a swap or reorder trips it. Introduced rows
    # (line 0) carry no order and are excluded.
    order_seq: dict[str, list[tuple[int, str]]] = {}
    seen_order_keys: set[tuple] = set()
    for row in rows:
        disp = row["disposition"]
        if disp == "introduced" or row["line"] == 0:
            continue
        tpath = map_path(row["path"])
        if tpath in self_files:
            continue
        if disp.startswith("kept"):
            content = row["content"]
        elif row.get("new") is not None:
            content = row["new"]
        else:
            continue
        key = (tpath, row["path"], row["line"])
        if key in seen_order_keys:  # one source line, many tokens
            continue
        seen_order_keys.add(key)
        order_seq.setdefault(tpath, []).append((row["line"], content))
    for tpath, seq in sorted(order_seq.items()):
        lines = lines_at(tpath)
        if lines is None:
            continue  # unreadable already reported above
        pos = 0
        for lineno, content in sorted(seq, key=lambda lc: lc[0]):
            found = -1
            for i in range(pos, len(lines)):
                if lines[i] == content:
                    found = i
                    break
            if found < 0:
                errors.append(
                    f"order check: {tpath}: surviving line (advisory "
                    f"{lineno}) out of relative order or missing: "
                    f"{content[:70]!r}"
                )
                break
            pos = found + 1

    expected = Counter()
    for path, mults in surviving_mult.items():
        if path.startswith(POST_MOVED_PREFIXES):
            moved = POST_MOVED_PREFIXES
        else:
            moved = ()
        for content, multiplicity in mults.items():
            fake_rows = scan_tree_line(content, path, moved)
            for token in fake_rows:
                expected[(path, token)] += multiplicity * fake_rows[token]
    actual = Counter()
    for hit in post_rows:
        if hit["path"] in self_files:
            continue
        actual[(hit["path"], hit["token"])] += 1
    for key in sorted(set(expected) | set(actual), key=str):
        if expected[key] != actual[key]:
            errors.append(
                f"count mismatch at {key[0]} token {key[1]!r}: "
                f"expected {expected[key]}, found {actual[key]}"
            )

    for msg in errors:
        print(f"post-sweep FAIL: {msg}", file=sys.stderr)
    print(
        f"post-sweep: {len(rows)} frozen row(s) reconciled, {len(post_rows)} "
        f"post hit(s), {len(self_files)} self-excluded file(s), "
        f"{len(errors)} error(s)"
    )
    return 1 if errors else 0


def scan_tree_line(content: str, path: str, moved_prefixes: tuple[str, ...]) -> Counter:
    """Token counts a single surviving line contributes at `path`."""
    counts: Counter = Counter()
    counts["docs/v3"] += content.count("docs/v3")
    counts["model-src"] += content.count("model-src")
    counts["convergence-path"] += len(CONV_PATH_RE.findall(content))
    if path.startswith(moved_prefixes):
        for m in RELPATH_RE.finditer(content):
            counts[m.group(0)] += 1
        for m in BARE_SUBTREE_RE.finditer(content):
            counts[f"bare:{m.group(1)}"] += 1
    return +counts


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--pre", metavar="PARENT_SHA")
    mode.add_argument("--post", metavar="MIGRATION_SHA")
    args = parser.parse_args()
    if args.pre:
        return run_pre(args.pre)
    return run_post(args.post)


if __name__ == "__main__":
    sys.exit(main())
