#!/usr/bin/env python3
"""Generate v3/model/ledger.md — the derived registries of the core model.

Four registries, all DERIVED from the extracted sources (never edited by hand):

  1. Deferral ledger — every Absent item, bucketed by the level(s) its
     `→ target` pointer names. The L9 bucket is the recovery-obligations
     ledger the model review asked for.
  2. Invariant catalog — every invariant rule by section, with a stable id.
  3. Rejection registry — every `Rejected(reason)` in the pseudocode
     snapshots, with the block where it first appears.
  4. Domain registry — every aggregate block and entity in each section's
     Domain lens (the slice between the Domain view heading and the next
     view heading), with root/kind markers and any relationship prose.
     The domain vocabulary as a semantic checksum, and the source for the
     implementation's type-layer drift test (v1-operability memo Q4).

check.sh verifies ledger.md is fresh (regenerates and compares).
"""

import html as htmllib
import json
import re
import sys
from collections import OrderedDict
from pathlib import Path

import foldlib

REPO = Path(__file__).resolve().parents[2]
SRC = REPO / "v3/model"

AT_RE = re.compile(r'<span class="at">→\s*(.*?)</span>')
TAG_RE = re.compile(r"<[^>]+>")
LEVEL_TOKEN_RE = re.compile(r"LC\d[ab]?|L\d+[a-g]?\+?|§[\d.]+\d")
REJECT_RE = re.compile(r"Rejected\(([a-z_][a-z_0-9]*)")

DOMAIN_H_RE = re.compile(r'<h3 class="view-h"><span class="view-tag domain">')
VIEW_H_RE = re.compile(r'<h3 class="view-h">')
AGG_OPEN_RE = re.compile(r'<div class="agg((?: [a-z]+)*)"[^>]*>')
AGG_LABEL_RE = re.compile(r'<div class="agg-label"[^>]*>(.*?)</div>', re.S)
ENT_RE = re.compile(r'<div class="ent"><div class="en">(.*?)</div><div class="fields">', re.S)
REL_RE = re.compile(r'<p class="rel">(.*?)</p>', re.S)
EN_SPAN_RE = re.compile(r'\s*<span([^>]*)>(.*?)</span>', re.S)


def flat_text(fragment: str) -> str:
    """Strip tags, unescape entities, collapse whitespace."""
    return " ".join(htmllib.unescape(TAG_RE.sub("", fragment)).split())


def parse_entity(en_html: str):
    """Split an entity cell into (name, [markers]): the trailing spans carry
    the root flag / kind annotation; everything else is the name."""
    markers = []

    def take(m):
        attrs, inner = m.group(1), flat_text(m.group(2))
        if 'class="root"' in attrs:
            markers.append("[root]")
        elif inner:
            markers.append(inner)
        return " "

    name = flat_text(EN_SPAN_RE.sub(take, en_html))
    return name, markers


def domain_lens(section_html: str) -> str:
    """The slice between the Domain view heading and the next view heading
    (the .agg structure is reused by other lenses, so scope matters)."""
    m = DOMAIN_H_RE.search(section_html)
    if not m:
        return ""
    nxt = VIEW_H_RE.search(section_html, m.end())
    return section_html[m.end():nxt.start() if nxt else len(section_html)]


def level_sort_key(token: str):
    if token.startswith("LC"):
        return (0, 3.5, token, "")  # lifecycle-close strand: between L3 and L4
    m = re.match(r"L(\d+)([a-g]?)(\+?)", token)
    if m:
        return (0, int(m.group(1)), m.group(2), m.group(3))
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

    # ── 4. domain registry ────────────────────────────────────────────────
    n_agg = 0
    n_ent = 0
    dom_lines = []
    for section in manifest["sections"]:
        sid = section["id"]
        lens = domain_lens((SRC / section["file"]).read_text())
        openers = list(AGG_OPEN_RE.finditer(lens))
        blocks = []
        for i, op in enumerate(openers):
            if "invariant" in op.group(1):
                continue
            end = openers[i + 1].start() if i + 1 < len(openers) else len(lens)
            chunk = lens[op.end():end]
            label_m = AGG_LABEL_RE.search(chunk)
            label = flat_text(label_m.group(1)) if label_m else "(unlabelled)"
            ents = []
            for ent_m in ENT_RE.finditer(chunk):
                name, markers = parse_entity(ent_m.group(1))
                ents.append(" ".join([name] + markers))
            blocks.append((label, ents))
        n_blk = len(blocks)
        n_e = sum(len(e) for _, e in blocks)
        n_agg += n_blk
        n_ent += n_e
        blk_word = "block" if n_blk == 1 else "blocks"
        ent_word = "entity" if n_e == 1 else "entities"
        dom_lines.append(f"### `{sid}` ({n_blk} {blk_word} · {n_e} {ent_word})")
        dom_lines.append("")
        for label, ents in blocks:
            dom_lines.append(f"- **{label}** — {' · '.join(ents) if ents else '(no entities)'}")
        for rel_m in REL_RE.finditer(lens):
            rel = flat_text(rel_m.group(1))
            rel = re.sub(r"^Relationships:\s*", "", rel)
            dom_lines.append(f"- *relations:* {rel}")
        dom_lines.append("")
    lines += [f"## 4 · Domain registry — {n_agg} aggregate blocks · {n_ent} entities", ""] + dom_lines

    out = SRC / "ledger.md"
    content = "\n".join(lines)
    if len(sys.argv) > 1 and sys.argv[1] == "--stdout":
        sys.stdout.write(content)
        return
    out.write_text(content)
    print(f"ledger: {total} absent items in {len(buckets)} buckets, {n_inv} invariants, "
          f"{len(first_seen)} rejection reasons, {n_agg} domain blocks / {n_ent} entities "
          f"-> {out.relative_to(REPO)}")


if __name__ == "__main__":
    main()
