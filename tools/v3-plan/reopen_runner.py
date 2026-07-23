#!/usr/bin/env python3
"""reopen_runner — the template-§4 contract-reopen choreography as a tool.

Three live executions were hand-scripted (ch11 round-declaration, the
ch12-act pointer reopen, the ch9-act sys: rename) and two of them hit
the same bug classes: a structural regex assumption and an unclosed
json fence. The choreography is DETERMINISTIC and payload-driven — a
tool's job. The tool does FILE OPERATIONS ONLY (commits stay the
caller's act; the human ratification act stays human — this executes
the already-ratified payload, never decides it).

Subcommands:
  commit1 --payload P.json      row edits + status flip + map LIFT
  commit2 --payload P.json --content-sha SHA
                                map edits + reinsert + ratification
                                block + context/metrics appends +
                                status flip back
  --selftest                    fixture round-trip incl. failure lanes

Payload schema (all paths repo-relative):
{
  "contract": "v3/implementation/contracts/chN-...-contract.md",
  "status_from": "realized", "status_reopened": "reopened",
  "status_final": "realized",
  "row_edits": [
    {"row": "C10", "find": "`tok`", "replace": "`sys:tok`", "count": 1},
    {"row": "C31", "full": "| C31 | <entire replacement row> |"}
  ],
  "map_edits": [
    {"entry": "C10", "find": "...", "replace": "...", "count": 1},
    {"entry": "C31", "full": "\"C31\": \"<entire replacement value>\""}
  ],
  "context_appends": [
    {"anchor": "**Close metrics", "where": "before", "text": "..."},
    {"anchor": "map in ONE act (this commit).", "where": "after", "text": "..."}
  ],
  "ratification_block": {"date": "YYYY-MM-DD", "arms": ["..."]}
}
Every edit is ASSERTED (find must match exactly `count` times inside
its row/entry scope); after every write the file's fenced json blocks
are re-parsed (the fence-bug class dies here).
"""
from __future__ import annotations
import argparse, json, os, re, subprocess, sys

LIFT_SUFFIX = ".map.lifted"


def die(msg: str) -> "NoReturn":
    sys.exit(f"reopen_runner: {msg}")


def fence_check(text: str, path: str) -> None:
    """Every ```json fence must close and parse."""
    for m in re.finditer(r"```json\n(.*?)(?:\n```|\Z)", text, re.S):
        body = m.group(1)
        if not m.group(0).rstrip().endswith("```"):
            die(f"{path}: unclosed json fence near offset {m.start()}")
        try:
            json.loads(body)
        except Exception as e:
            die(f"{path}: unparseable json block near offset {m.start()}: {e}")


def scoped_replace(text: str, scope_re: str, find: str, replace: str,
                   count: int, what: str) -> str:
    m = re.search(scope_re, text)
    if not m:
        die(f"scope not found: {what}")
    seg = m.group(0)
    hits = seg.count(find)
    if hits != count:
        die(f"{what}: expected {count} hit(s) of {find!r}, found {hits}")
    return text[: m.start()] + seg.replace(find, replace) + text[m.end():]


def row_scope(row: str) -> str:
    # rows are SINGLE-LINE in these contracts — newline-bounded on
    # purpose (the arm's REOPEN-03: a dotall scope can bleed across
    # lines on a malformed row)
    return rf"^\| {re.escape(row)} \|[^\n]*$"


def entry_scope(entry: str) -> str:
    # map entries are single-line too (REOPEN-03)
    return rf'^"{re.escape(entry)}": "[^\n]*$'


def load(path: str) -> str:
    if not os.path.exists(path):
        die(f"missing file: {path}")
    return open(path).read()


def save(path: str, text: str) -> None:
    """Atomic: validate, write a temp sibling, os.replace (REOPEN-01)."""
    fence_check(text, path)
    tmp = path + ".tmp"
    open(tmp, "w").write(text)
    os.replace(tmp, path)


def flip_status(text: str, frm: str, to: str, path: str) -> str:
    old = f'"status": "{frm}"'
    if old not in text:
        die(f"{path}: status is not {frm!r} (choreography order violated?)")
    return text.replace(old, f'"status": "{to}"', 1)


def cmd_commit1(payload: dict) -> None:
    path = payload["contract"]
    text = load(path)
    text_mut = flip_status(text, payload.get("status_from", "realized"),
                           payload.get("status_reopened", "reopened"), path)
    for e in payload.get("row_edits", []):
        scope = row_scope(e["row"])
        if "full" in e:
            m = re.search(scope, text_mut, re.M)
            if not m:
                die(f"row not found: {e['row']}")
            text_mut = text_mut[: m.start()] + e["full"] + text_mut[m.end():]
        else:
            text_mut = scoped_replace(
                text_mut, "(?m)" + scope, e["find"], e["replace"],
                e.get("count", 1), f"row {e['row']}")
    # lift the map
    m = re.search(r"```json\n\{\"realized_map\": \{.*?\n\}\n\}\n```\n", text_mut, re.S) \
        or re.search(r"```json\n\{\"realized_map\": \{.*?\n\}\}\n```\n", text_mut, re.S)
    if m:
        text_mut = text_mut.replace(m.group(0), "")
    elif payload.get("expect_map", True):
        die(f"{path}: realized_map block not found (set expect_map=false for pre-close reopens)")
    # validate the candidate BEFORE any side effect (the re-check's
    # NEW-REOPEN-04: a failing fence check must leave NO sidecar)
    fence_check(text_mut, path)
    if m:
        open(path + LIFT_SUFFIX, "w").write(m.group(0))
    save(path, text_mut)
    print(f"reopen_runner commit1: {len(payload.get('row_edits', []))} row edit(s), "
          f"status → {payload.get('status_reopened', 'reopened')}, map "
          f"{'lifted → ' + path + LIFT_SUFFIX if m else 'absent (pre-close)'}")


def git_sha_is_commit(sha: str, cwd: str) -> bool:
    p = subprocess.run(["git", "cat-file", "-t", sha], capture_output=True,
                       text=True, cwd=cwd)
    return p.returncode == 0 and p.stdout.strip() == "commit"


def cmd_commit2(payload: dict, content_sha: str, no_git_check: bool = False) -> None:
    path = payload["contract"]
    # ALL preconditions before ANY mutation (REOPEN-01/-02)
    if payload.get("ratification_block"):
        if not re.fullmatch(r"[0-9a-f]{40}", content_sha or ""):
            die("--content-sha must be the FULL 40-char sha of commit 1")
        if not no_git_check and not git_sha_is_commit(
                content_sha, os.path.dirname(os.path.abspath(path)) or "."):
            die(f"--content-sha {content_sha[:12]} does not resolve to a commit "
                "(use --no-git-check only for fixtures)")
    lifted_path = path + LIFT_SUFFIX
    if payload.get("status_final", "realized") == "realized":
        if not os.path.exists(lifted_path):
            die("realized-reopen commit2 REQUIRES the lifted map sidecar "
                "(a realized contract may not close mapless — REOPEN-02)")
        if not payload.get("ratification_block"):
            die("realized-reopen commit2 REQUIRES a ratification_block (REOPEN-02)")
    text = load(path)
    if os.path.exists(lifted_path):
        mp = open(lifted_path).read()
        for e in payload.get("map_edits", []):
            scope = "(?m)" + entry_scope(e["entry"])
            if "full" in e:
                m = re.search(scope, mp)
                if not m:
                    die(f"map entry not found: {e['entry']}")
                trailing = "," if m.group(0).rstrip().endswith(",") else ""
                mp = mp[: m.start()] + e["full"] + trailing + mp[m.end():]
            else:
                mp = scoped_replace(mp, scope, e["find"], e["replace"],
                                    e.get("count", 1), f"map {e['entry']}")
        heading = payload.get("map_heading", "## Realized map (empty until chapter close)\n")
        if heading not in text:
            die(f"{path}: map heading not found")
        text = text.replace(heading, heading + "\n" + mp.lstrip("\n"), 1)
    # context appends
    for a in payload.get("context_appends", []):
        anchor = a["anchor"]
        if anchor not in text:
            die(f"{path}: context anchor not found: {anchor[:50]!r}")
        if a.get("where", "before") == "before":
            text = text.replace(anchor, a["text"] + anchor, 1)
        else:
            text = text.replace(anchor, anchor + a["text"], 1)
    # ratification block
    rb = payload.get("ratification_block")
    if rb:
        block = json.dumps({"ratification": {**rb, "commit": content_sha}})
        hist = re.compile(r"(## Ratification history.*?)(\n## )", re.S)
        m = hist.search(text)
        if not m:
            die(f"{path}: Ratification history section not found")
        insert = m.group(1).rstrip() + f"\n\n```json\n{block}\n```\n"
        text = text[: m.start(1)] + insert + text[m.end(1):]
    text = flip_status(text, payload.get("status_reopened", "reopened"),
                       payload.get("status_final", "realized"), path)
    save(path, text)
    if os.path.exists(lifted_path):
        os.remove(lifted_path)  # only after the successful atomic save
    print(f"reopen_runner commit2: map {len(payload.get('map_edits', []))} edit(s) "
          f"reinserted, {len(payload.get('context_appends', []))} append(s), "
          f"ratification block on {content_sha[:8]}, status → "
          f"{payload.get('status_final', 'realized')}")


FIXTURE = """# chT — t contract

```json
{"contract_draft": {"chapter": "chT", "surface": "t", "status": "realized"}}
```

## Context (non-normative by declaration)

**Close metrics:** reopenings: 0.

## Contract rows (every normative statement is a C-row)

| ID | Rule |
|---|---|
| C1 | uses `tok_a` twice: `tok_a`. |
| C2 | replace me fully. |

## Ratification history

```json
{"ratification": {"date": "2026-01-01", "arms": ["x"], "commit": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}}
```

## Realized map (empty until chapter close)

```json
{"realized_map": {
"C1": "old c1 entry",
"C2": "old c2 entry"
}
}
```
"""


def selftest() -> int:
    import tempfile
    ok = 0
    with tempfile.TemporaryDirectory() as td:
        p = os.path.join(td, "chT-t-contract.md")
        open(p, "w").write(FIXTURE)
        pay = {
            "contract": p,
            "row_edits": [
                {"row": "C1", "find": "`tok_a`", "replace": "`sys:tok_a`", "count": 2},
                {"row": "C2", "full": "| C2 | fully replaced. |"},
            ],
            "map_edits": [
                {"entry": "C1", "find": "old c1", "replace": "new c1", "count": 1},
                {"entry": "C2", "full": '"C2": "entirely new c2 entry"'},
            ],
            "context_appends": [
                {"anchor": "**Close metrics:** reopenings: 0.", "where": "after",
                 "text": "\n**Dated update:** reopenings 0 → 1."}
            ],
            "ratification_block": {"date": "2026-01-02", "arms": ["y"]},
        }
        cmd_commit1(pay)
        t = open(p).read()
        assert '"status": "reopened"' in t and "sys:tok_a" in t and "fully replaced" in t
        assert "realized_map" not in t and os.path.exists(p + LIFT_SUFFIX)
        ok += 1
        cmd_commit2(pay, "b" * 40, no_git_check=True)
        t = open(p).read()
        assert '"status": "realized"' in t and "new c1" in t and "entirely new c2" in t
        assert "Dated update" in t and '"commit": "' + "b" * 40 in t
        assert not os.path.exists(p + LIFT_SUFFIX)
        fence_check(t, p)
        ok += 1
        # failure lanes: wrong count; missing row; wrong status order
        open(p, "w").write(FIXTURE)
        for bad, exp in [
            ({"contract": p, "row_edits": [{"row": "C1", "find": "`tok_a`", "replace": "x", "count": 1}]}, "expected 1 hit"),
            ({"contract": p, "row_edits": [{"row": "C9", "find": "q", "replace": "x"}]}, "scope not found"),
        ]:
            try:
                cmd_commit1(bad)
                raise AssertionError("should have died: " + exp)
            except SystemExit as e:
                assert exp in str(e), (exp, str(e))
                open(p, "w").write(FIXTURE)
            ok += 1
        try:
            cmd_commit2({"contract": p, "ratification_block": {"date": "x", "arms": []}}, "b" * 40, no_git_check=True)  # commit2 before commit1
            raise AssertionError("should have died on missing sidecar")
        except SystemExit as e:
            assert "REQUIRES the lifted map" in str(e), str(e)
        ok += 1
    print(f"reopen_runner selftest: {ok} case(s) exercised, 0 failure(s)")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", nargs="?", choices=["commit1", "commit2"])
    ap.add_argument("--payload")
    ap.add_argument("--content-sha", dest="sha")
    ap.add_argument("--no-git-check", action="store_true")
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args()
    if a.selftest:
        return selftest()
    if not a.cmd or not a.payload:
        ap.error("commit1|commit2 --payload P.json required")
    payload = json.load(open(a.payload))
    if a.cmd == "commit1":
        cmd_commit1(payload)
    else:
        cmd_commit2(payload, a.sha or "", a.no_git_check)
    return 0


if __name__ == "__main__":
    sys.exit(main())
