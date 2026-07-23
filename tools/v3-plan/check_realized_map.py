#!/usr/bin/env python3
"""realized_map lint — map lane citations vs packet-manifest refs.

Born from the 2026-07-23 realized_map arm-audit sweep (process log):
three subagent-built close maps carried 50+ attribution defects, ~70%
of them the OMISSION class this scanner catches mechanically — a
manifest row whose refs name a contract C-row, while the map's entry
for that row does not cite the lane. The scanner is the MACHINE HALF
of the codified two-layer audit (DraftContract §5); the external-arm
pass is the other half and neither subsumes the other (the sweep's
independence tally: arm-only 12 / machine-only 7 / both ~27).

Checks, per realized contract (status `realized` + a `realized_map`
block):
- MISSING (hard error): a packet-manifest lane carries a
  `contract:<id>#Cn` ref, but the map's Cn entry does not cite that
  lane. Exemption: none — omissions are the defect class.
- EXTRA (report-only): the map cites a lane the manifest does not ref
  for that row. Report-only BY DESIGN: the sweep's extras were
  dominated by deliberate context mentions ("the every-stage catch is
  G1's, anchored at C36") and tokenizer context-flow artifacts; and
  NEW-DECISION rows legitimately carry EMPTY refs while their lane
  TEXT anchors the row (the ch11 V5 lesson — a refs-only scan must
  not force such citations out). New-decision lanes are dropped from
  the extra report entirely.

Exit codes: 0 clean (extras allowed), 1 missing citations, 2 usage /
parse failure.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
CONTRACTS_DIR = REPO / "v3" / "implementation" / "contracts"
PACKETS_DIR = REPO / "v3" / "implementation" / "packets"

LANE_TOKEN = re.compile(r"([A-Z]{1,2})(\d+)(?:[-–]([A-Z]{0,2})(\d+))?")
CITE_TOKEN = re.compile(
    r"ch\d+-P\d+[A-Za-z]?|\b[A-Z]{1,2}\d+(?:[-–][A-Z]{0,2}\d+)?\b"
)
PACKET_TAG = re.compile(r"ch\d+-P(\d+[A-Za-z]?)\b")


def parse_manifest(text: str, path: str):
    """Yield manifest row dicts from the fenced packet_rows block."""
    m = re.search(r'"packet_rows"\s*:', text)
    if m is None:
        raise ValueError(f"no packet_rows manifest in {path}")
    fence_start = text.rfind("```", 0, m.start())
    fence_start = text.index("\n", fence_start) + 1
    fence_end = text.index("```", m.start())
    data = json.loads(text[fence_start:fence_end])
    rows = data.get("packet_rows", data)
    if isinstance(rows, dict) and "rows" in rows:
        rows = rows["rows"]
    return rows


def manifest_lanes(contract_id: str, packet_paths):
    """(Cn -> {(ptag, lane)}, {(ptag, lane) that are new-decision})."""
    ref_re = re.compile(r"contract:" + re.escape(contract_id) + r"#(C\d+)\b")
    per_row: dict[str, set] = {}
    new_decision: set = set()
    for pp in packet_paths:
        tag_m = re.search(r"ch\d+-p(\d+[a-z]?)", Path(pp).name)
        if tag_m is None:
            raise ValueError(f"unrecognized packet filename: {pp}")
        ptag = "P" + tag_m.group(1).upper()
        for row in parse_manifest(Path(pp).read_text(), str(pp)):
            rid = row.get("id", "")
            if row.get("class") == "new-decision":
                new_decision.add((ptag, rid))
            for c in ref_re.findall(json.dumps(row)):
                per_row.setdefault(c, set()).add((ptag, rid))
    return per_row, new_decision


def cited_lanes(entry: str):
    """Extract (ptag, lane) citations; packet-tag context flows left
    to right — a heuristic tokenizer, which is why EXTRA is
    report-only while MISSING is authoritative."""
    out = set()
    cur = None
    for tok in CITE_TOKEN.finditer(entry):
        t = tok.group(0)
        pm = PACKET_TAG.match(t)
        if pm:
            cur = "P" + pm.group(1).upper()
            continue
        if cur is None:
            continue
        lm = LANE_TOKEN.match(t)
        if lm is None:
            continue
        fam, n1, fam2, n2 = lm.groups()
        if n2 and (not fam2 or fam2 == fam):
            for k in range(int(n1), int(n2) + 1):
                out.add((cur, f"{fam}{k}"))
        else:
            out.add((cur, f"{fam}{n1}"))
    return out


def load_realized_map(text: str):
    """(contract_id, map dict) or None when not a realized contract."""
    head = re.search(r'\{"contract_draft":.*?\}\}', text)
    if head is None:
        return None
    meta = json.loads(head.group(0))["contract_draft"]
    if meta.get("status") != "realized":
        return None
    mm = re.search(r'\{"realized_map"', text)
    if mm is None:
        return None
    blob = text[mm.start(): text.index("```", mm.start())]
    rmap = json.loads(blob)["realized_map"]
    contract_id = f"{meta['chapter']}-{meta['surface']}"
    return contract_id, rmap


def check_contract(path: Path):
    """(missing findings, extra notes) for one realized contract."""
    loaded = load_realized_map(path.read_text())
    if loaded is None:
        return None
    contract_id, rmap = loaded
    chapter = contract_id.split("-", 1)[0]
    packets = sorted(PACKETS_DIR.glob(f"{chapter}-p*.md"))
    if not packets:
        raise ValueError(f"{path.name}: no packets found for {chapter}")
    per_row, new_decision = manifest_lanes(contract_id, packets)
    missing, extras = [], []
    for c in sorted(set(per_row) | set(rmap), key=lambda x: int(x[1:])):
        want = per_row.get(c, set())
        have = cited_lanes(rmap.get(c, ""))
        for lane in sorted(want - have):
            missing.append(f"{path.name} {c}: missing {lane[0]} {lane[1]}")
        for lane in sorted(have - want):
            if lane in new_decision or re.fullmatch(r"C\d+", lane[1]):
                continue
            extras.append(f"{path.name} {c}: uncited-ref lane {lane[0]} {lane[1]}")
    return missing, extras


def run(paths):
    any_missing = False
    scanned = 0
    for path in paths:
        result = check_contract(path)
        if result is None:
            continue
        scanned += 1
        missing, extras = result
        for line in missing:
            print(f"ERROR: {line}")
            any_missing = True
        for line in extras:
            print(f"note: {line} (report-only)")
    print(f"realized-map: {scanned} realized contract(s) checked,"
          f" {'RED' if any_missing else 'green'}")
    return 1 if any_missing else 0


# ---------------------------------------------------------------- selftest

FIXTURE_PACKET = """
# fixture
```json
{{
  "packet_rows": {{
    "rows": [
      {{ "id": "G1", "class": "anchored", "refs": ["contract:chX-fix#C1"] }},
      {{ "id": "G2", "class": "anchored", "refs": ["contract:chX-fix#C1", "contract:chX-fix#C2"] }},
      {{ "id": "V5", "class": "new-decision", "refs": [] }},
      {{ "id": "A1", "class": "anchored", "refs": ["contract:chX-fix#C3"] }},
      {{ "id": "A2", "class": "anchored", "refs": ["contract:chX-fix#C3"] }}
    ]
  }}
}}
```
"""


def selftest():
    rows = parse_manifest(FIXTURE_PACKET.format(), "fixture")
    ref_re = re.compile(r"contract:chX-fix#(C\d+)\b")
    per_row: dict[str, set] = {}
    nd: set = set()
    for row in rows:
        if row.get("class") == "new-decision":
            nd.add(("P1", row["id"]))
        for c in ref_re.findall(json.dumps(row)):
            per_row.setdefault(c, set()).add(("P1", row["id"]))
    cases = [
        # (name, entry for C1, expect_missing, expect_extra)
        ("green two lanes", "ch99-P1 G1/G2 — file.ts", set(), set()),
        ("missing co-lane", "ch99-P1 G1 — file.ts",
         {("P1", "G2")}, set()),
        ("range expansion", "ch99-P1 A1-A2 — file.ts", None, None),
        ("en-dash range expansion", "ch99-P1 A1–A2 — file.ts",
         None, None),
        ("new-decision exempt extra", "ch99-P1 G1/G2 + V5 — file.ts",
         set(), set()),
        ("real extra reported", "ch99-P1 G1/G2 + A9 — file.ts",
         set(), {("P1", "A9")}),
        ("no context no cite", "G1 and G2 mentioned bare", None, None),
    ]
    failures = 0
    for name, entry, exp_missing, exp_extra in cases:
        have = cited_lanes(entry)
        if name in ("range expansion", "en-dash range expansion"):
            ok = have == {("P1", "A1"), ("P1", "A2")}
        elif name == "no context no cite":
            ok = have == set()
        else:
            want = per_row.get("C1", set())
            missing = want - have
            extras = {l for l in have - want
                      if l not in nd and not re.fullmatch(r"C\d+", l[1])}
            ok = missing == exp_missing and extras == exp_extra
        if not ok:
            print(f"selftest FAIL: {name} (cited={sorted(have)})")
            failures += 1
    print(f"selftest: {len(cases)} case(s), {failures} failure(s)")
    return 1 if failures else 0


def main(argv):
    if "--selftest" in argv:
        return selftest()
    args = [a for a in argv if not a.startswith("-")]
    paths = ([Path(a) for a in args]
             if args else sorted(CONTRACTS_DIR.glob("*.md")))
    return run(paths)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
