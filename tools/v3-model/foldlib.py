"""Shared fold logic for the unit-delta storage of pseudocode blocks (Phase 2).

A pseudocode block is stored as a delta over its baseline block:
  deltas/<block-id>.json        {"id", "baseline", "order": [unit names]}
  units/<block-id>/<unit>.txt   the unit versions this block sets (added or
                                changed); anything not stored here is inherited
                                by walking the baseline chain

fold(block_id) reassembles the block's full snapshot byte-identically:
concatenate, in `order`, each unit's nearest version along the chain.

Blocks not migrated (template configs) keep their full snapshot under
code/<id>.new.txt; code_text() serves both forms.
"""

import json
from functools import lru_cache
from pathlib import Path

SRC = Path(__file__).resolve().parents[2] / "v3/model"


@lru_cache(maxsize=None)
def _delta(block_id: str) -> dict:
    return json.loads((SRC / "deltas" / f"{block_id}.json").read_text())


@lru_cache(maxsize=None)
def _body(block_id: str, unit: str) -> str:
    b = block_id
    while b is not None:
        f = SRC / "units" / b / f"{unit}.txt"
        if f.is_file():
            return f.read_text()
        b = _delta(b)["baseline"]
    raise KeyError(f"unit {unit!r} unresolved from block {block_id!r}")


@lru_cache(maxsize=None)
def fold(block_id: str) -> str:
    delta = _delta(block_id)
    return "".join(_body(block_id, unit) for unit in delta["order"])


def code_text(code_entry: dict) -> str:
    """Full text of a manifest code entry — folded delta or stored snapshot."""
    if code_entry.get("fold"):
        return fold(code_entry["id"])
    return (SRC / code_entry["new"]).read_text()
