#!/usr/bin/env python3
"""Generate model-src/ledger.md — the derived registries of the core model.

Three registries, all DERIVED from the extracted sources (never edited by hand):

  1. Deferral ledger — every Absent item, bucketed by the level(s) its
     `→ target` pointer names. The L9 bucket is the recovery-obligations
     ledger the model review asked for.
  2. Invariant catalog — every invariant rule by section, with a stable id.
  3. Rejection registry — every `Rejected(reason)` in the pseudocode
     snapshots, with the block where it first appears.

check.sh verifies ledger.md is fresh (regenerates and compares).
"""

import json
import re
import sys
from collections import OrderedDict
from pathlib import Path

import foldlib

REPO = Path(__file__).resolve().parents[2]
SRC = REPO / "docs/v3/convergence/model-src"

AT_RE = re.compile(r'<span class="at">→\s*(.*?)</span>')
TAG_RE = re.compile(r"<[^>]+>")
LEVEL_TOKEN_RE = re.compile(r"L\d+[a-f]?\+?|[③][ab]|[①②③④]|§[\d.]+\d")
REJECT_RE = re.compile(r"Rejected\(([a-z_][a-z_0-9]*)")


def level_sort_key(token: str):
    m = re.match(r"L(\d+)([a-f]?)(\+?)", token)
    if m:
        return (0, int(m.group(1)), m.group(2), m.group(3))
    if token in "①②③④" or token in ("③a", "③b"):
        order = {"①": 1, "②": 2, "③": 3, "③a": 3.1, "③b": 3.2, "④": 4}
        return (1, order[token], "", "")
    if token.startswith("§"):
        return (2, float(token[1:].split(".")[0]), token, "")
    return (3, 0, token, "")


def main() -> None:
    manifest = json.loads((SRC / "manifest.json").read_text())
    section_order = [s["id"] for s in manifest["sections"]]
    lines = [
        "# Core-model derived registries",
        "",
        "> GENERATED — do not edit. Regenerate: `python3 tools/v3-model/report_ledger.py`",
        "> (check.sh fails when this file is stale.)",
        "",
    ]

    # ── 1. deferral ledger ────────────────────────────────────────────────
    buckets: "OrderedDict[str, list]" = OrderedDict()
    total = 0
    for sid in section_order:
        data = json.loads((SRC / "records/absent" / f"{sid}.json").read_text())
        for item in data["items"]:
            total += 1
            at = AT_RE.findall(item["html"])
            raw = TAG_RE.sub("", at[-1]).strip() if at else "(no pointer)"
            tokens = LEVEL_TOKEN_RE.findall(raw) or [raw.lower()]
            for tok in dict.fromkeys(tokens):
                buckets.setdefault(tok, []).append((sid, item["id"], raw))

    lines += [f"## 1 · Deferral ledger — {total} Absent items by pointer target", ""]
    for tok in sorted(buckets, key=level_sort_key):
        entries = buckets[tok]
        lines.append(f"### {tok} ({len(entries)})")
        lines.append("")
        for sid, iid, raw in entries:
            lines.append(f"- `{sid}` · {iid} — → {raw}")
        lines.append("")

    # ── 2. invariant catalog ──────────────────────────────────────────────
    n_inv = 0
    inv_lines = []
    for sid in section_order:
        data = json.loads((SRC / "records/invariants" / f"{sid}.json").read_text())
        for k, block in enumerate(data["blocks"]):
            for item in block["items"]:
                n_inv += 1
                name = TAG_RE.sub("", item["name_html"])
                inv_lines.append(f"- `{sid}` · **{item['id']}** — {name}")
    lines += [f"## 2 · Invariant catalog — {n_inv} rules", ""] + inv_lines + [""]

    # ── 3. rejection registry ─────────────────────────────────────────────
    first_seen: "OrderedDict[str, str]" = OrderedDict()
    for section in manifest["sections"]:
        for code in section["codes"]:
            body = foldlib.code_text(code)
            for reason in REJECT_RE.findall(body):
                first_seen.setdefault(reason, code["id"])
    lines += [f"## 3 · Rejection registry — {len(first_seen)} distinct `Rejected(...)` reasons", ""]
    for reason in sorted(first_seen):
        lines.append(f"- `{reason}` — first appears in `{first_seen[reason]}`")
    lines.append("")

    out = SRC / "ledger.md"
    content = "\n".join(lines)
    if len(sys.argv) > 1 and sys.argv[1] == "--stdout":
        sys.stdout.write(content)
        return
    out.write_text(content)
    print(f"ledger: {total} absent items in {len(buckets)} buckets, {n_inv} invariants, "
          f"{len(first_seen)} rejection reasons -> {out.relative_to(REPO)}")


if __name__ == "__main__":
    main()
