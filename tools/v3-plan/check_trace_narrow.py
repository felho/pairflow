#!/usr/bin/env python3
"""The compiler-forced-narrow gate (packet ch14-p2a, K17).

THREAT MODEL, stated first because a guard without one has no stopping
rule: a build that WEAKENS or RE-PINS a golden trace and reports it as a
compile fix. K14's amendment distinguishes a compiler-forced narrowing
from a re-pin; without a mechanism that distinction is discharged by
narrative, which is exactly where it stands guard.

TWO HALVES, both mechanical, both required. An edit is compiler-forced
ONLY if BOTH pass.

(a) THE TEXT HALF — type-level edits only. For each touched golden-trace
    file, the pre-edit and post-edit bytes must be IDENTICAL after
    erasing a CLOSED, DECLARED set of narrowing constructs. The list is
    fixed and NOT open-ended: it admits the DISCRIMINATING narrow and
    REFUSES a bare type assertion on the widening's sites, so the gate
    cannot launder away the one rule that keeps an Ask from riding a
    dispatch assertion. One byte of difference outside the erasure — a
    deleted assertion, a changed expected literal, a re-ordered
    expectation — is a RE-PIN.

(b) THE BEHAVIOUR HALF — the replay digest, at the two grains K14 names
    (the committed ROW SEQUENCE and the INSTANCE RECORD): the two must
    be equal across the edit.

    THE GATE-TIME RECOMPUTATION LEG IS DROPPED, by measurement, and what
    it defended is named rather than quietly inherited (ratifier
    decision at ch14-p2a build, 2026-08-18).

    What it was for: a build that lands everything and then computes
    both digests gets two identical values, and an ANCESTRY check does
    not catch it — any ancestor satisfies ancestry, so nothing binds the
    digest VALUE to the ref it cites. The leg recomputed the baseline at
    that ref and compared.

    Why it is gone: it COLLIDES WITH ITS OWN EXCEPTION. Recomputing at
    the pre-change ref requires the measurement to be TAKEN there, and
    taking it requires wiring in the replay harness — an EXISTING file.
    The instrument-landing commit that puts the hook at that ref is
    ADD-ONLY by the confinement that makes the exception auditable, so
    the wiring cannot ride it. The hook is additive; its call site is
    not.

    WHAT IS THEREFORE NO LONGER PROVEN, stated plainly: a POST-HOC
    FABRICATED BASELINE. A receipt asserting a baseline digest that was
    never computed at the ref it cites is no longer refused by this
    gate.

    WHAT STANDS IN ITS PLACE, and it is deliberately not called a
    replacement: (1) the (a) TEXT HALF is the primary re-pin guard and
    is unaffected — a re-pin that changes an expectation is caught by
    bytes, not by digests; (2) the instrument commit's ANCESTRY, which
    is a cheap precondition and was never the proof; (3) the receipt's
    digest claim is SCOPED to exactly what it evidences — that the two
    recorded values are equal — and not one word more.

The `--selftest` leg runs FIRST and its fixtures must pass before any
verdict is issued: a checker whose own fixtures do not run before its
verdict is the false-green class one layer up.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

# ── (a) the CLOSED erasure set ───────────────────────────────────────
# Each entry rewrites a NARROWING construct back to the expression it
# narrows, so a purely type-level edit normalizes to the pre-edit bytes.
# CLOSED means: adding a member is a checker edit, reviewed as one.
ERASURES: list[tuple[str, str]] = [
    # the discriminating-narrow helper's call sites
    (r"asDispatch\(([^()]*(?:\([^()]*\)[^()]*)*)\)", r"\1"),
    # the helper's own declaration (a type-level addition, not behaviour)
    (
        r"\n/\*\*(?:[^*]|\*(?!/))*?\*/\nconst asDispatch = [^;]*;\n",
        "\n",
    ),
    # a type-only import added for the narrow
    (r'\nimport type \{ DispatchIntent, HumanDecisionRequest \} from "[^"]*";', ""),
]

# The REFUSAL list — constructs that are NOT compiler-forced however
# much they satisfy the compiler. A bare assertion onto either member of
# the widened union is the shape that would let a re-pin ride through.
REFUSED = re.compile(r"\bas\s+(?:DispatchIntent|HumanDecisionRequest)\b")


class Checker:
    def __init__(self) -> None:
        self.errors: list[str] = []

    def error(self, message: str) -> None:
        self.errors.append(message)


def erase(text: str) -> str:
    for pattern, replacement in ERASURES:
        text = re.sub(pattern, replacement, text)
    # NORMALIZATION, declared as part of the closed set rather than left
    # implicit: trailing whitespace per line, and runs of blank lines
    # collapsed to one. Neither is behaviour, and the blank-line rule is
    # REQUIRED — erasing a declaration block leaves the blank line that
    # separated it, which would otherwise read as a byte difference and
    # red every clean narrow. Nothing else is rewritten.
    text = "\n".join(line.rstrip() for line in text.split("\n"))
    return re.sub(r"\n{2,}", "\n", text)


def check_text_half(name: str, before: str, after: str, checker: Checker) -> None:
    """(a): identical after erasure, and no refused construct."""
    refused = REFUSED.findall(after)
    if refused:
        checker.error(
            f"{name}: a BARE TYPE ASSERTION on a widening site is not a "
            f"compiler-forced narrow (found {len(refused)}) — the closed erasure "
            f"set admits the discriminating narrow and nothing else"
        )
        return
    if erase(before) != erase(after):
        checker.error(
            f"{name}: bytes DIFFER outside the closed erasure set — this is a "
            f"RE-PIN, not a compile fix (a deleted assertion, a changed expected "
            f"literal, or a re-ordered expectation)"
        )


def check_behaviour_half(name: str, receipt: dict, checker: Checker, source: str = "") -> None:
    """(b): the two recorded digests are equal.

    A trace with NO shared measurement point may DECLARE the half
    unreachable — but never silently. The declaration carries a reason
    and the reason is CHECKED against the bytes: `no_shared_replay_seam`
    holds only for a file that does not go through the harness's
    `replayTrace`. An undeclared absence stays an error, because a
    missing digest and a digest that could not be taken are different
    facts and only one of them is acceptable.
    """
    if receipt.get("behaviour_half") == "unreachable":
        if receipt.get("reason") != "no_shared_replay_seam":
            checker.error(
                f"{name}: an unreachable behaviour half must name the CHECKED reason "
                f"'no_shared_replay_seam'"
            )
            return
        if "replayTrace(" in source:
            checker.error(
                f"{name}: claims 'no_shared_replay_seam' but DOES go through "
                f"replayTrace — the measurement point exists"
            )
            return
        if "digests" in receipt:
            checker.error(f"{name}: declares the behaviour half unreachable AND carries digests")
        return
    digests = receipt.get("digests")
    if not isinstance(digests, dict):
        checker.error(f"{name}: receipt carries no digests block")
        return
    baseline = digests.get("baseline")
    current = digests.get("current")
    for label, value in (("baseline", baseline), ("current", current)):
        if not isinstance(value, dict) or set(value) != {"transcript", "instance"}:
            checker.error(
                f"{name}: {label} digests must carry EXACTLY the two grains "
                f"K14 names (transcript, instance)"
            )
            return
    if baseline != current:
        moved = [g for g in ("transcript", "instance") if baseline[g] != current[g]]
        checker.error(
            f"{name}: the replay digest MOVED at {moved} — the edit changed "
            f"behaviour, so it is not type-level"
        )
    # The receipt must not claim MORE than the gate now checks: a
    # `recomputation` block would read as provenance this gate no longer
    # verifies, and an unverified claim beside a verified one is how a
    # reader takes the wrong thing from a green.
    if "recomputation" in receipt:
        checker.error(
            f"{name}: receipt carries a 'recomputation' block, but the gate-time "
            f"recomputation leg is DROPPED — the claim would be unverified "
            f"provenance sitting beside a verified equality"
        )


def check_receipt(receipt: dict, repo: Path, checker: Checker) -> None:
    name = receipt.get("file")
    if not isinstance(name, str) or not name:
        checker.error("receipt: missing 'file'")
        return
    ref = receipt.get("baseline_ref")
    if not isinstance(ref, str) or not re.fullmatch(r"[0-9a-f]{7,40}", ref):
        checker.error(f"{name}: baseline_ref must be a pinned commit sha")
        return
    shown = subprocess.run(
        ["git", "-C", str(repo), "show", f"{ref}:{name}"],
        capture_output=True,
        text=True,
    )
    if shown.returncode != 0:
        checker.error(f"{name}: not readable at baseline ref '{ref}'")
        return
    current_path = repo / name
    if not current_path.exists():
        checker.error(f"{name}: not present in the working tree")
        return
    source = current_path.read_text(encoding="utf-8")
    check_text_half(name, shown.stdout, source, checker)
    check_behaviour_half(name, receipt, checker, source)


# ── selftest ─────────────────────────────────────────────────────────

BEFORE = """const x = 1;
expect(committed.map((o) => o.intent?.actor ?? null)).toEqual(["a", "b"]);
expect(committed[0]?.intent?.packet).toMatchObject({ v: 3 });
"""

AFTER_CLEAN = """const x = 1;

/**
 * doc
 */
const asDispatch = (i: T) => (i !== null && "packet" in i ? i : null);
expect(committed.map((o) => asDispatch(o.intent)?.actor ?? null)).toEqual(["a", "b"]);
expect(asDispatch(committed[0]?.intent)?.packet).toMatchObject({ v: 3 });
"""

GOOD_DIGESTS = {"transcript": "aa", "instance": "bb"}


def selftest() -> int:
    failures: list[str] = []
    dims: list[str] = []

    def assert_red(label: str, errors: list[str], needle: str) -> None:
        dims.append(label)
        if not any(needle in e for e in errors):
            failures.append(f"dim NOT red: {label} (no error containing {needle!r}): {errors}")

    # GREEN: a purely type-level narrow erases back to the pre-edit bytes
    checker = Checker()
    check_text_half("green", BEFORE, AFTER_CLEAN, checker)
    if checker.errors:
        failures.append(f"green NOT green: a clean narrow was refused ({checker.errors})")

    # 1. a DELETED assertion
    checker = Checker()
    deleted = AFTER_CLEAN.replace(
        'expect(asDispatch(committed[0]?.intent)?.packet).toMatchObject({ v: 3 });\n', ""
    )
    check_text_half("n1", BEFORE, deleted, checker)
    assert_red("deleted-assertion", checker.errors, "RE-PIN")

    # 2. a CHANGED expected literal
    checker = Checker()
    check_text_half("n2", BEFORE, AFTER_CLEAN.replace('"b"', '"c"'), checker)
    assert_red("changed-expected-literal", checker.errors, "RE-PIN")

    # 3. an ALTERED committed value
    checker = Checker()
    check_text_half("n3", BEFORE, AFTER_CLEAN.replace("v: 3", "v: 4"), checker)
    assert_red("altered-committed-value", checker.errors, "RE-PIN")

    # 4. a narrowing construct OUTSIDE the closed list
    checker = Checker()
    outside = BEFORE.replace("o.intent?.actor", "narrowSomehow(o.intent)?.actor")
    check_text_half("n4", BEFORE, outside, checker)
    assert_red("construct-outside-closed-list", checker.errors, "RE-PIN")

    # 5. a BARE TYPE ASSERTION on a widening site
    checker = Checker()
    bare = BEFORE.replace("o.intent?.actor", "(o.intent as DispatchIntent).actor")
    check_text_half("n5", BEFORE, bare, checker)
    assert_red("bare-assertion", checker.errors, "BARE TYPE ASSERTION")

    # 6. a receipt CLAIMING the dropped provenance. The leg is gone, so
    #    the sixth negative guards the honesty of the claim instead of
    #    the provenance itself: an unverified block beside a verified
    #    equality is exactly how a reader takes more from a green than
    #    the gate proved.
    checker = Checker()
    check_behaviour_half(
        "n6",
        {
            "baseline_ref": "abcdef1",
            "digests": {"baseline": GOOD_DIGESTS, "current": GOOD_DIGESTS},
            "recomputation": {"exit_code": 0, "digests": GOOD_DIGESTS},
        },
        checker,
    )
    assert_red("claims-dropped-recomputation", checker.errors, "DROPPED")

    # …and the behaviour half's own primary refusal: a MOVED digest
    checker = Checker()
    check_behaviour_half(
        "n7",
        {
            "baseline_ref": "abcdef1",
            "digests": {
                "baseline": GOOD_DIGESTS,
                "current": {"transcript": "aa", "instance": "cc"},
            },
        },
        checker,
    )
    assert_red("digest-moved", checker.errors, "MOVED")

    # an UNREACHABLE claim from a file that DOES have the seam
    checker = Checker()
    check_behaviour_half(
        "n9",
        {"behaviour_half": "unreachable", "reason": "no_shared_replay_seam"},
        checker,
        "await replayTrace(fixture, {});",
    )
    assert_red("false-unreachable-claim", checker.errors, "measurement point exists")

    # GREEN: a receipt scoped to what the gate now evidences
    checker = Checker()
    check_behaviour_half(
        "green-b",
        {
            "baseline_ref": "abcdef1",
            "digests": {"baseline": GOOD_DIGESTS, "current": GOOD_DIGESTS},
        },
        checker,
    )
    if checker.errors:
        failures.append(f"green NOT green: a clean receipt was refused ({checker.errors})")

    for failure in failures:
        print(f"selftest FAIL: {failure}", file=sys.stderr)
    print(f"check-trace-narrow selftest: {len(dims)} red dims exercised, {len(failures)} failure(s)")
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--selftest", action="store_true")
    parser.add_argument("--receipts", type=Path)
    parser.add_argument("--repo", type=Path, default=Path.cwd())
    args = parser.parse_args()

    # The selftest leg runs FIRST, always.
    if selftest() != 0:
        return 1
    if args.selftest and args.receipts is None:
        return 0
    if args.receipts is None:
        print("check-trace-narrow: --receipts <path> required for the live leg", file=sys.stderr)
        return 2

    receipts = json.loads(args.receipts.read_text(encoding="utf-8"))
    if not isinstance(receipts, list) or not receipts:
        print("check-trace-narrow: receipts must be a NONEMPTY list", file=sys.stderr)
        return 2
    checker = Checker()
    for receipt in receipts:
        check_receipt(receipt, args.repo, checker)
    for error in checker.errors:
        print(f"check-trace-narrow FAIL: {error}", file=sys.stderr)
    print(f"check-trace-narrow: {len(receipts)} receipt(s), {len(checker.errors)} error(s)")
    return 1 if checker.errors else 0


if __name__ == "__main__":
    sys.exit(main())
