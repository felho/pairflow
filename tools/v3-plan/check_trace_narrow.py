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
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

# ── (a) the CLOSED erasure set ───────────────────────────────────────
# Each entry rewrites a NARROWING construct back to the expression it
# narrows, so a purely type-level edit normalizes to the pre-edit bytes.
# CLOSED means: adding a member is a checker edit, reviewed as one.
#
# EVERY ENTRY IS CODE-ANCHORED, and that is the whole second half of
# what "closed" has to mean. A pinned VALUE is not a pinned CONTEXT: a
# bare text rule matches the same bytes wherever they occur — inside an
# EXPECTED STRING LITERAL and inside a COMMENT included — so a re-pin
# that changed an expectation to `"asDispatch(x)"` or to
# `"createFloor(v, null)"` would be erased on BOTH sides of the diff and
# ride through green. Widening a gate's closed list is the one move that
# can WEAKEN the gate, and the per-entry negatives in the selftest are
# what keep that from being "the instrument learned to pass this build".
#
# HOW THE ANCHOR WORKS. Every pattern names, with a `code` group, the
# span that must be REAL SOURCE CODE; `sub_in_code` DROPS any match
# whose anchor carries one masked character. The anchor is deliberately
# NOT always the whole match, because two entries legitimately SPAN a
# non-code region: the helper's declaration is introduced by a doc
# COMMENT, and the type-only import ends in a module-specifier STRING.
# What each entry needs is that the part which makes the construct REAL
# — the call head, the declaration head, the import head — is code; the
# rest of the span then belongs to a construct that provably exists.
#
# PROVENANCE, because a reader would otherwise mis-attribute the fix and
# the defect alike: the first three entries were AUTHORED BY PACKET
# ch14-p2a and ran through an UNMASKED `re.sub` from that packet until
# this one. The context-overmatch defect below is INHERITED, not minted
# here — packet ch14-p3a closed it because the file is inside its
# mutation boundary, because the masking machinery it built for the
# fourth entry made the fix cheap, and because a measuring instrument
# with a demonstrated false-green path is a live hole whoever dug it.
# Only the FOURTH entry is this packet's own.
ERASURES: list[tuple[str, str]] = [
    # the discriminating-narrow helper's CALL SITES (packet ch14-p2a).
    # The anchor is the CALL HEAD, not the whole call: an argument may
    # legitimately contain a string literal, and anchoring on the whole
    # call would then RED a clean narrow. A call head sitting in code is
    # a real call site; one inside a literal or a comment is not.
    (
        r"(?P<code>asDispatch\()(?P<narrowed>[^()]*(?:\([^()]*\)[^()]*)*)\)",
        r"\g<narrowed>",
    ),
    # the helper's own DECLARATION (packet ch14-p2a) — a type-level
    # addition, not behaviour — together with the doc comment that
    # introduces it.
    #
    # The anchor is the DECLARATION HEAD. It cannot be the whole
    # statement: the body reads `"packet" in intent`, so the statement
    # carries a string literal and a whole-statement anchor would red
    # every real narrow. A `const asDispatch =` in code IS the helper's
    # declaration; the doc comment above it is a comment by construction
    # and can never be anchored at all.
    #
    # The doc comment is OPTIONAL here where packet ch14-p2a required it.
    # Requiring it made the entry UNREACHABLE from inside a block comment
    # — JS block comments do not nest, so a `/* ... */` wrapper ends at
    # the doc comment's own `*/` and everything after it is real code
    # again — which left the block-comment negative with nothing to
    # falsify. Optional, the entry also erases an undocumented
    # declaration of the same helper, which is the same type-level
    # addition; the widening is in the SHAPE, while the code anchor is a
    # strict narrowing in the direction that can produce a false green.
    (
        r"(?:\n/\*\*(?:[^*]|\*(?!/))*?\*/)?\n(?P<code>const asDispatch = )[^;]*;\n",
        "\n",
    ),
    # a type-only IMPORT added for the narrow (packet ch14-p2a). The
    # anchor stops before the module specifier, which is a string literal
    # by construction; the import head is what proves the statement real.
    (
        r'\n(?P<code>import type \{ DispatchIntent, HumanDecisionRequest \} from )"[^"]*";',
        "",
    ),
    # packet ch14-p3a (F2), a REVIEWED CHECKER EDIT taken by the route this
    # list declares above: `createFloor` gained a REQUIRED nullable second
    # parameter, so every call site takes a purely type-level argument
    # addition, which is not a narrowing construct and normalizes under none
    # of the three entries above.
    #
    # THE FORM IS PINNED TWICE OVER. (1) By VALUE: only the literal `, null`
    # erases, so a second argument carrying any other value stays visible to
    # the text half. (2) By CONTEXT: the match must be a WHOLE STATEMENT LINE
    # of the form `const <name> = createFloor(<simple-expr>, null);`, in code
    # — the anchor here IS the whole statement, which carries no string by
    # construction. A call spanning several lines, a call in an argument
    # position, or a second argument that is itself a call all stay visible
    # — each is a further reviewed checker edit if a trace ever takes one,
    # which is the route this list declares rather than a shape it
    # pre-authorizes.
    (
        r"(?m)^(?P<code>(?P<head>[ \t]*(?:const|let|var)[ \t]+[A-Za-z_$][A-Za-z0-9_$]*[ \t]*=[ \t]*"
        r"createFloor\([^,()\n]*), null\);)[ \t]*$",
        r"\g<head>);",
    ),
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


# The filler a masked (non-code) character becomes. It cannot occur in a
# TypeScript source file, so a masked region can never be matched by an
# erasure pattern written over source text.
_MASK = "\x00"


def _regex_literal_end(text: str, start: int) -> int | None:
    """Index just past a REGEX LITERAL opening at `start`, or None.

    Only the same-line form is recognized, which is the whole form the
    language has: a regex literal cannot contain a raw newline, so a `/`
    with no unescaped partner before the line ends is NOT one and is
    left alone. Inside, `\\` escapes the next character and `[...]` is a
    character class in which `/` does not close; the trailing flag
    letters are taken with the literal.
    """
    i = start + 1
    n = len(text)
    in_class = False
    while i < n:
        char = text[i]
        if char == "\n":
            return None
        if char == "\\":
            if i + 1 >= n or text[i + 1] == "\n":
                return None
            i += 2
            continue
        if in_class:
            if char == "]":
                in_class = False
        elif char == "[":
            in_class = True
        elif char == "/":
            i += 1
            while i < n and text[i].isalpha():
                i += 1
            return i
        i += 1
    return None


def _scan_noncode(text: str, *, regex_literals: bool) -> list[bool]:
    """ONE scanning pass, returning the mask as a POSITION SET.

    `regex_literals=False` is EXACTLY the pre-regex-literal masker:
    comments, strings and template literals, and a `/` that opens
    neither `//` nor `/*` is ordinary code. `regex_literals=True` adds
    the speculative regex-literal scan. Newlines are never masked, in
    either pass, so line structure is preserved.

    The two passes are kept as passes — not merged into one scanner with
    a flag threaded through the middle — because `mask_noncode` UNIONS
    them, and the union is the whole monotonicity guarantee.
    """
    masked = [False] * len(text)
    i = 0
    n = len(text)
    while i < n:
        char = text[i]
        if char == "/" and text.startswith("//", i):
            while i < n and text[i] != "\n":
                masked[i] = True
                i += 1
        elif char == "/" and text.startswith("/*", i):
            # The OPENER IS CONSUMED BEFORE THE CLOSER IS SEARCHED FOR.
            # Written the other way — searching from the `/` — the
            # opener's own `*` doubles as the closer's, so `/*/ x */`
            # masked three characters and left the rest as code, a
            # deterministic false GREEN (build-close review, gate 2f).
            # No character may serve in both roles.
            masked[i] = True
            masked[i + 1] = True
            i += 2
            while i < n and not text.startswith("*/", i):
                if text[i] != "\n":
                    masked[i] = True
                i += 1
            for _ in range(2):
                if i < n:
                    masked[i] = True
                    i += 1
        elif char == "/" and regex_literals:
            # A REGEX LITERAL. It is tried LAST among the `/` forms —
            # `//` and `/*` are decided above — because an empty regex
            # is not expressible, so `//` is always the comment.
            end = _regex_literal_end(text, i)
            if end is None:
                i += 1
            else:
                while i < end:
                    masked[i] = True
                    i += 1
        elif char in "\"'`":
            quote = char
            masked[i] = True
            i += 1
            while i < n:
                current = text[i]
                if current == "\\":
                    masked[i] = True
                    if i + 1 < n and text[i + 1] != "\n":
                        masked[i + 1] = True
                    i += 2
                    continue
                if current == quote:
                    masked[i] = True
                    i += 1
                    break
                # An unterminated single-quoted string does not swallow the
                # rest of the file; a template literal legitimately spans
                # lines and does.
                if current == "\n":
                    if quote != "`":
                        break
                    i += 1
                    continue
                masked[i] = True
                i += 1
        else:
            i += 1
    return masked


def mask_noncode(text: str) -> str:
    """Return `text` with every COMMENT, STRING-LITERAL and REGEX-LITERAL
    character replaced by a filler, positions and newlines preserved.

    The lexer is deliberately crude, and the direction of its error is
    the point: masking TOO MUCH can only make an erasure fail to apply,
    which turns a clean edit into a RE-PIN verdict — a false RED. It can
    never make an erasure apply where it should not, which is the false
    GREEN this gate exists to refuse. So an ambiguous byte (a `/` that
    opens a regex literal, a quote inside one) is allowed to over-mask.

    THE UNION, AND WHY IT IS THE IMPLEMENTATION AND NOT A TIDINESS. The
    result is the union of TWO independent passes: the strings-and-
    comments pass alone, and the same pass WITH the speculative
    regex-literal scan. That is a correction of a claim this docstring
    used to make — that the safe direction held "MECHANICALLY and not by
    care" because masking never removes a byte from the compared text.
    The reasoning assumed masking is MONOTONE in the recognized forms.
    IT IS NOT, FOR A SPECULATIVE SCANNER, and the counterexample was
    live in the shipped gate (build-close review, gate 2 pass 5):

        const ratio = total / divisor; expect(label).toBe("prefix/_x");

    The DIVISION slash opens a speculative regex scan that runs to the
    `/` INSIDE the string literal and consumes the string's OPENING
    QUOTE. The rest of the string body is then read as code, so a re-pin
    to `"prefix/_asDispatch(x)"` erased on both sides and rode through
    green — a form the pre-regex-literal masker had caught. Adding a
    recognized form UNMASKED a span. Over-masking is safe; MIS-masking
    is not, and a speculative scanner mis-tokenizes by design.

    The union restores monotonicity BY CONSTRUCTION rather than by
    argument: the masked set is a superset of the strings-and-comments
    pass for EVERY input, because that pass is one of the two unioned.
    No division-versus-regex token-context heuristic is used to choose
    between the passes — such a heuristic's failure direction is toward
    false GREEN. The property is DRIVEN, not asserted: the selftest
    checks the superset relation against a reference scanner over a
    corpus that includes the counterexample above, its line-comment
    twin, every fixture in this file, and the real contents of the four
    live golden-trace files.

    AND THE REFERENCE'S OWN LIMIT, because calling it "independent" is
    what let the next false green through. It is CODE-independent — no
    shared helper, so the two sides cannot move together — but it is not
    FAILURE-independent: it re-implements the SAME IDEA, so a wrong idea
    about where a construct ends is duplicated into it and the property
    holds between two wrong scanners. That is not a hypothesis; `/*/ x
    */` was exactly that (build-close review, gate 2f). A SECOND
    property therefore runs beside the superset one: the CONSTRUCTED
    ORACLE, a corpus of labelled segments carrying no scanning algorithm
    at all, whose labels were checked against the TypeScript compiler's
    own scanner. It covers the shared-algorithm mode and NOT the
    shared-author mode — a mislabelled case is still just a wrong
    expectation — and it is finite and hand-picked, so it says nothing
    about a construct nobody wrote down.

    WHAT IT RECOGNIZES AS NON-CODE, listed so the next reader meets the
    limit as KNOWN rather than discovering it a fourth time (no masking
    at all, then the inherited entries bypassing it, then regex
    literals):

      - `//` line comments, to end of line;
      - `/* … */` block comments, which do NOT nest;
      - `'…'` and `"…"` strings, ended by the quote or by the line end;
      - `` `…` `` template literals, which DO span lines — including any
        `${ … }` substitution, masked WHOLE, so real code inside an
        interpolation counts as non-code (over-mask, safe direction);
      - `/…/flags` regex literals, same-line only, honouring `\\`
        escapes and `[...]` character classes.

    WHAT IT DOES NOT RECOGNIZE, and each is a live limit rather than a
    defect: it makes NO division-versus-regex token-context judgement at
    all, so `a / b / c` on one line over-masks the span between the two
    slashes (a false RED) while a `/` with no partner on its line is
    never masked at all; a TAGGED template's body is masked exactly like
    a plain template literal's, its tag staying code; JSX text and
    attribute values are plain code to it; and it is NOT a TypeScript
    lexer — the next construct nobody has named yet will also be treated
    as code. Whether this gate should be
    parser-based, or should instead shrink its scope, is a routed
    boundary question and is deliberately not answered here.
    """
    plain = _scan_noncode(text, regex_literals=False)
    speculative = _scan_noncode(text, regex_literals=True)
    out = list(text)
    for i in range(len(text)):
        if plain[i] or speculative[i]:
            out[i] = _MASK
    return "".join(out)


def sub_in_code(pattern: str, replacement: str, text: str) -> str:
    """Apply `pattern` ONLY where its `code` ANCHOR lies in code.

    The pattern is matched against the ORIGINAL text, because an entry
    may legitimately SPAN a non-code region — a doc comment above a
    declaration, a module specifier at the end of an import — and a
    match found on the masked copy could not then be spliced back. What
    makes the application code-aware is the ANCHOR: every entry names,
    with a `code` group, the span that must be REAL SOURCE CODE, and a
    match whose anchor carries a single masked character is DROPPED. An
    occurrence inside a string literal or a comment therefore never
    fires; a real site does.

    A pattern with NO `code` group RAISES, and the check is made on the
    COMPILED pattern BEFORE the match loop rather than from inside it.
    The placement is the whole guarantee, and it is a correction: the
    earlier form read `span("code")` only for a match it had already
    found, so an anchorless entry that happened to match NOTHING in a
    given text was accepted in silence and only a MATCHING one failed.
    Checked up front, an anchorless entry fails on its first call over
    any text, matching or not — which is what makes "an anchorless entry
    cannot be added silently" true rather than true only in the matching
    case.

    WHAT THE GUARD DOES NOT COVER, stated so the claim stays the size of
    the code: it refuses an entry with no `code` group at all. An entry
    whose `code` group is present but MISPLACED — anchoring a span that
    is not the part making the construct real — is a reviewed-judgement
    question the per-entry selftest negatives carry, not this guard.
    """
    compiled = re.compile(pattern)
    if "code" not in compiled.groupindex:
        raise ValueError(
            "erasure entry has NO (?P<code>...) anchor and would apply "
            f"context-blind: {pattern!r}"
        )
    masked = mask_noncode(text)
    pieces: list[str] = []
    last = 0
    for match in compiled.finditer(text):
        # A `code` group that exists but did not PARTICIPATE (an optional
        # branch) names no span to vet, so the match is dropped rather
        # than waved through.
        start, end = match.span("code")
        if start < 0 or _MASK in masked[start:end]:
            continue
        pieces.append(text[last : match.start()])
        pieces.append(match.expand(replacement))
        last = match.end()
    pieces.append(text[last:])
    return "".join(pieces)


def erase(text: str) -> str:
    for pattern, replacement in ERASURES:
        text = sub_in_code(pattern, replacement, text)
    # NORMALIZATION, declared as part of the closed set rather than left
    # implicit: trailing whitespace per line, and runs of blank lines
    # collapsed to one. Neither is behaviour, and the blank-line rule is
    # REQUIRED — erasing a declaration block leaves the blank line that
    # separated it, which would otherwise read as a byte difference and
    # red every clean narrow. Nothing else is rewritten.
    text = "\n".join(line.rstrip() for line in text.split("\n"))
    return re.sub(r"\n{2,}", "\n", text)


def check_refused(name: str, after: str, checker: Checker) -> bool:
    """The REFUSED bare-type-assertion scan, shared by BOTH paths.

    It is a SEPARATE function because the declared-repin edit class
    (ch14-p3b, G1(e)) inverts the byte comparison but keeps this guard
    unchanged: an edit that asserts its way past the widening is not
    laundered by declaring itself a re-pin. Returns True when it fired,
    so the caller can stop rather than report a second, derived fault.
    """
    refused = REFUSED.findall(after)
    if refused:
        checker.error(
            f"{name}: a BARE TYPE ASSERTION on a widening site is not a "
            f"compiler-forced narrow (found {len(refused)}) — the closed erasure "
            f"set admits the discriminating narrow and nothing else"
        )
        return True
    return False


def check_text_half(name: str, before: str, after: str, checker: Checker) -> None:
    """(a): identical after erasure, and no refused construct."""
    if check_refused(name, after, checker):
        return
    if erase(before) != erase(after):
        checker.error(
            f"{name}: bytes DIFFER outside the closed erasure set — this is a "
            f"RE-PIN, not a compile fix (a deleted assertion, a changed expected "
            f"literal, or a re-ordered expectation)"
        )


def digest_pair(name: str, receipt: dict, checker: Checker) -> tuple[dict, dict] | None:
    """The recorded (baseline, current) pair, with the TWO SHAPE GUARDS
    that live beside the equality but are not part of it.

    Factored out because the declared-repin edit class (ch14-p3b, G1(e))
    inverts the equality and keeps BOTH guards unchanged: a build that
    implements only the new branch would otherwise drop them. Returns
    None when a guard fired.
    """
    digests = receipt.get("digests")
    if not isinstance(digests, dict):
        checker.error(f"{name}: receipt carries no digests block")
        return None
    baseline = digests.get("baseline")
    current = digests.get("current")
    for label, value in (("baseline", baseline), ("current", current)):
        if not isinstance(value, dict) or set(value) != {"transcript", "instance"}:
            checker.error(
                f"{name}: {label} digests must carry EXACTLY the two grains "
                f"K14 names (transcript, instance)"
            )
            return None
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
        return None
    return baseline, current


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
    pair = digest_pair(name, receipt, checker)
    if pair is None:
        return
    baseline, current = pair
    if baseline != current:
        moved = [g for g in ("transcript", "instance") if baseline[g] != current[g]]
        checker.error(
            f"{name}: the replay digest MOVED at {moved} — the edit changed "
            f"behaviour, so it is not type-level"
        )


# ── the DECLARED RE-PIN edit class (packet ch14-p3b, G1) ─────────────
#
# K14's letter says any edit this gate does not clear is a re-pin and a
# build STOP. It is RIGHT about `l0bTrace.test.ts` at ch14-p3b: the
# shipped template's CONVERGED edge retargets at a human gate, so the
# expected literals move AND the replay digests move. What the letter has
# no vocabulary for is a re-pin the packet DECLARED IN ADVANCE against a
# ratified delta.
#
# TWO DISPOSITIONS ARE REFUSED BY NAME. Advancing `baseline_ref` to the
# packet's own build commit would compare the post-edit bytes with
# themselves and issue a green that evidences nothing. Dropping the file
# from the corpus would surrender the gate on it forever rather than for
# this edit — the same defect this checker's own docstring names.
#
# ELECTED: a declared `edit_class`, in the idiom `behaviour_half:
# "unreachable"` already uses — a declaration the gate refuses to take on
# trust and CHECKS against the bytes and the digests.
#
# THE CLASS CANNOT STAY GREEN ACROSS A COMMIT. That is check (g), and it
# is what answers the disposition it refuses: without it, a
# `baseline_ref` pinned at the pre-change parent would satisfy (a) and
# (b) FOREVER, so a later packet DELETING an assertion from that file
# would pass every check and the gate would report GREEN on exactly the
# defect it exists to catch.
#
# WHAT (g) BOUNDS, AND WHAT IT DOES NOT: it bounds DURATION — the entry
# cannot stay green across a commit — and it does NOT bound CONTENT.
# While the tree is dirty and the entry declares, any real re-pin
# satisfies (a), (b) and (g) together, deleted assertions included. The
# class is single-use by CONSTRUCTION over commits, not over edits.
#
# THE RESIDUAL, in the same voice this file used for its own dropped leg:
# the class proves the declaration is CONSISTENT with the bytes and the
# digests, and that it is not stale. It does NOT prove the new
# expectations are the ones the declared delta entails.

DECLARED_REPIN = "declared-repin"

#: The strict contract-ref form an anchor must take — the same shape the
#: packet linter accepts, so an anchor that resolves here resolves there.
CONTRACT_REF = re.compile(r"^contract:(ch\d+-[a-z0-9-]+)#(C[1-9]\d*)$")

#: A C-row is a TABLE ROW whose first cell is the row id.
def _contract_row(text: str, row: str) -> bool:
    return re.search(rf"(?m)^\|\s*{re.escape(row)}\s*\|", text) is not None


def anchor_fault(anchor: object, repo: Path) -> str | None:
    """(c): the anchor must PARSE as the strict contract-ref form AND
    RESOLVE — the named contract file exists and defines that C-row as a
    table row. Returns the fault, or None when it resolves.

    A form check alone would admit an anchor pointing at a row nobody
    wrote, which is a declaration against nothing."""
    if anchor is None:
        return "no 'anchor' field"
    if not isinstance(anchor, str) or not anchor:
        return "the anchor must be a nonempty string"
    match = CONTRACT_REF.fullmatch(anchor)
    if match is None:
        return f"{anchor!r} is not the strict contract-ref form contract:chN-<surface>#Cn"
    surface, row = match.group(1), match.group(2)
    path = repo / "v3" / "implementation" / "contracts" / f"{surface}-contract.md"
    if not path.is_file():
        return f"no contract file for surface '{surface}'"
    if not _contract_row(path.read_text(encoding="utf-8"), row):
        return f"contract '{surface}' defines no table row {row}"
    return None


def _resolve_commit(repo: Path, rev: str) -> str | None:
    """The commit OBJECT a rev names, or None.

    BY RESOLVED OBJECT, NEVER BY STRING, and the distinction is
    load-bearing: `baseline_ref` is an ABBREVIATED sha (the shape rule
    admits 7 to 40 hex characters), so a literal comparison against
    `git rev-parse HEAD`'s full forty would refuse the legitimate
    build-time state on every run."""
    result = subprocess.run(
        ["git", "-C", str(repo), "rev-parse", "--verify", f"{rev}^{{commit}}"],
        capture_output=True,
        text=True,
    )
    return result.stdout.strip() if result.returncode == 0 else None


def check_pending_edit(name: str, ref: str, source: str, repo: Path, checker: Checker) -> None:
    """(g): a CONJUNCTION of two conditions, and one alone does not carry
    it.

    (g1) the file's WORKING-TREE bytes DIFFER from its bytes at `HEAD` —
    the edit is pending rather than landed; and (g2) `baseline_ref`
    RESOLVES TO THE SAME COMMIT OBJECT as `HEAD` — the declaration is
    being read against the very state it was declared against.

    WHY (g1) ALONE IS NOT ENOUGH: after the build commit and before the
    retirement, any uncommitted touch to the file makes the working tree
    differ from `HEAD` again, so (g1) goes green while the declaration
    HAS survived its commit. (g2) closes that — at build time
    `baseline_ref` is the parent, which IS `HEAD` before the commit;
    from the build commit onward the parent is no longer `HEAD`."""
    at_head = subprocess.run(
        ["git", "-C", str(repo), "show", f"HEAD:{name}"],
        capture_output=True,
        text=True,
    )
    if at_head.returncode == 0 and at_head.stdout == source:
        checker.error(
            f"{name}: a declared re-pin describes a PENDING edit, but the working-tree "
            f"bytes are IDENTICAL to the bytes at HEAD — the edit has landed, so the "
            f"declaration has outlived the commit it describes (g1)"
        )
    head = _resolve_commit(repo, "HEAD")
    baseline = _resolve_commit(repo, ref)
    if head is None or baseline is None or head != baseline:
        checker.error(
            f"{name}: a declared re-pin is read against the state it was declared "
            f"against, but baseline_ref '{ref}' does not resolve to the SAME commit "
            f"object as HEAD — the declaration has outlived its commit and must be "
            f"RETIRED, never re-pointed under the declaration (g2)"
        )


def check_declared_repin(
    name: str, receipt: dict, before: str, after: str, repo: Path, checker: Checker
) -> None:
    """The declared-repin entry's checks, per ENTRY: no other receipt's
    checks change, and an entry without the key is scanned exactly as
    today."""
    # (d) a trace with NO measurement point can evidence no moved digest.
    if receipt.get("behaviour_half") == "unreachable":
        checker.error(
            f"{name}: behaviour_half 'unreachable' and edit_class "
            f"'{DECLARED_REPIN}' TOGETHER are refused — a trace with no measurement "
            f"point can evidence no MOVED digest"
        )
        return
    # (c) the anchor must parse AND resolve.
    fault = anchor_fault(receipt.get("anchor"), repo)
    if fault is not None:
        checker.error(
            f"{name}: a declared re-pin needs a RESOLVING contract anchor ({fault}) — "
            f"a re-pin cannot be declared against a row nobody wrote"
        )
        return
    # (e) the PRE-EXISTING shape guards still run, unchanged.
    if check_refused(name, after, checker):
        return
    pair = digest_pair(name, receipt, checker)
    # (a) INVERTED: the bytes must DIFFER after erasure — a declared
    #     re-pin whose bytes normalize to identical is a
    #     mis-declaration, so the label cannot be worn for free.
    if erase(before) == erase(after):
        checker.error(
            f"{name}: declared '{DECLARED_REPIN}', but the bytes are IDENTICAL after "
            f"erasure — the label cannot be worn for free"
        )
    # (b) INVERTED: at least one grain must have moved — a re-pin that
    #     changed an expectation while the replayed behaviour did not is
    #     the WEAKENED-ASSERTION class in its simplest form.
    if pair is not None:
        baseline, current = pair
        if baseline == current:
            checker.error(
                f"{name}: declared '{DECLARED_REPIN}', but the recorded digests are "
                f"EQUAL on both grains — an expectation moved while the replayed "
                f"behaviour did not"
            )
    # (g) the declaration cannot survive a commit boundary.
    ref = receipt.get("baseline_ref")
    if isinstance(ref, str):
        check_pending_edit(name, ref, after, repo, checker)


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
    # (f) the class is per ENTRY: an entry without the key is scanned
    #     exactly as it was before this class existed.
    edit_class = receipt.get("edit_class")
    if edit_class == DECLARED_REPIN:
        check_declared_repin(name, receipt, shown.stdout, source, repo, checker)
        return
    if edit_class is not None:
        checker.error(
            f"{name}: unknown edit_class {edit_class!r} (the only declared class is "
            f"'{DECLARED_REPIN}')"
        )
        return
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

# packet ch14-p3a (F2): the fixtures for the `createFloor` entry. The FIVE
# existing text-half dims run on fixtures carrying NO `createFloor` text at
# all, so a `createFloor`-pinned entry cannot green them and they are NOT
# the guard here — this fixture carries the call itself.
FLOOR_BEFORE = """const floor = createFloor(handle.store);
expect(await floor.listInstances()).toHaveLength(1);
"""
FLOOR_AFTER_CLEAN = """const floor = createFloor(handle.store, null);
expect(await floor.listInstances()).toHaveLength(1);
"""

# packet ch14-p3a (F2), the OVERMATCH negatives. A pinned VALUE is not a
# pinned CONTEXT: the same bytes occur inside an EXPECTED STRING LITERAL
# and inside a COMMENT, and a rule that erased them THERE would carry a
# re-pin through green on exactly the file it was minted for. Each
# fixture pairs the LEGITIMATE argument addition with a change in a
# non-code context, so the lane can only go red on the context rule.
FLOOR_LITERAL_BEFORE = FLOOR_BEFORE + 'expect(label).toBe("createFloor(v)");\n'
FLOOR_LITERAL_AFTER = FLOOR_AFTER_CLEAN + 'expect(label).toBe("createFloor(v, null)");\n'

FLOOR_COMMENT_BEFORE = FLOOR_BEFORE + "// the site under test: createFloor(v)\n"
FLOOR_COMMENT_AFTER = FLOOR_AFTER_CLEAN + "// the site under test: createFloor(v, null)\n"

# A COMMENTED-OUT STATEMENT — the one shape a line-anchored rule alone
# would still erase, because the commented text IS a whole statement
# line. It is the masking pass, not the anchor, that reds this.
FLOOR_BLOCK_BEFORE = FLOOR_BEFORE + "/*\nconst legacy = createFloor(other);\n*/\n"
FLOOR_BLOCK_AFTER = FLOOR_AFTER_CLEAN + "/*\nconst legacy = createFloor(other, null);\n*/\n"

# The GREEN control for the three above: the same non-code contexts
# present and UNCHANGED, with the real call site taking the addition.
# Without it the three negatives could be satisfied by a rule that had
# simply stopped erasing anything at all.
FLOOR_CONTEXT_BEFORE = (
    FLOOR_BEFORE + 'expect(label).toBe("createFloor(v)");\n// see createFloor(v)\n'
)
FLOOR_CONTEXT_AFTER = (
    FLOOR_AFTER_CLEAN + 'expect(label).toBe("createFloor(v)");\n// see createFloor(v)\n'
)


# packet ch14-p3a (F1), the INHERITED entries' overmatch negatives. The
# three entries above the `createFloor` one were authored by packet
# ch14-p2a and applied context-blind until this packet; each of them
# carried the SAME defect the `createFloor` fixtures below were written
# for, and each now gets the same four lanes: the construct planted in a
# STRING LITERAL, in a LINE COMMENT, and in a BLOCK COMMENT — where it
# must NOT erase — plus a GREEN control where those very contexts are
# present and UNCHANGED while the real construct takes the narrow, so
# the negatives cannot be satisfied by an entry that erases nothing.
#
# WHICH LANES FALSIFY WHAT, stated because two of the twelve do not
# falsify the pre-fix implementation and a reader deserves to know
# which. The declaration and import entries are LINE-ANCHORED — their
# match begins at a newline — so a `//` prefix, which occupies the line
# start, already put them out of reach of a line comment before the code
# anchor existed. Their line-comment lanes are therefore red under BOTH
# implementations. They are kept as REDUNDANCY CONTROLS — and that is a
# CORRECTION of the claim this comment used to make for them, which
# called them the standing guard on the anchor pair. A lane that stays
# red when EITHER anchor is dropped is by that very fact INSENSITIVE to
# each removal taken alone: it can witness only the SIMULTANEOUS loss of
# both, which is redundancy evidence and not sensitivity evidence.
# Every other lane below is green under the pre-fix rule and red under
# this one.

# ── the CALL-SITE entry ──────────────────────────────────────────────
# The executed counterexample from the ch14-p3a build-close review:
# `toBe("x")` re-pinned to `toBe("asDispatch(x)")` erases on both sides.
CALL_LITERAL_BEFORE = BEFORE + 'expect(label).toBe("x");\n'
CALL_LITERAL_AFTER = AFTER_CLEAN + 'expect(label).toBe("asDispatch(x)");\n'

CALL_COMMENT_BEFORE = BEFORE + "// the narrowed site: o.intent\n"
CALL_COMMENT_AFTER = AFTER_CLEAN + "// the narrowed site: asDispatch(o.intent)\n"

CALL_BLOCK_BEFORE = BEFORE + "/*\nconst legacy = o.intent;\n*/\n"
CALL_BLOCK_AFTER = AFTER_CLEAN + "/*\nconst legacy = asDispatch(o.intent);\n*/\n"

CALL_CONTEXT_BEFORE = BEFORE + 'expect(label).toBe("asDispatch(x)");\n// see asDispatch(x)\n'
CALL_CONTEXT_AFTER = AFTER_CLEAN + 'expect(label).toBe("asDispatch(x)");\n// see asDispatch(x)\n'

# packet ch14-p3a AFTERMATH (build-close review, gate 2 pass 4): the
# FOURTH non-code context, and the third round in which this masker's
# notion of "non-code" turned out to be incomplete. A REGEX LITERAL is
# an expected value like any string is — `toMatch(/x/)` re-pinned to
# `toMatch(/asDispatch(x)/)` erased on BOTH sides and rode through
# green, which is a real re-pin passing as a compile fix.
CALL_REGEX_BEFORE = BEFORE + "expect(label).toMatch(/x/);\n"
CALL_REGEX_AFTER = AFTER_CLEAN + "expect(label).toMatch(/asDispatch(x)/);\n"

# The GREEN control for it, on REAL CODE: the regex literal is present
# and UNCHANGED while the real call site takes the narrow, and a
# DIVISION rides along so the lane also refuses a masker that had simply
# started swallowing every `/` it met. Without this control the red lane
# above is satisfied by a rule that stopped erasing anything.
CALL_REGEX_CONTEXT = 'expect(label).toMatch(/asDispatch(x)/);\nconst half = total / 2;\n'
CALL_REGEX_CONTEXT_BEFORE = BEFORE + CALL_REGEX_CONTEXT
CALL_REGEX_CONTEXT_AFTER = AFTER_CLEAN + CALL_REGEX_CONTEXT

# packet ch14-p3a AFTERMATH (build-close review, gate 2 pass 5): THE
# REGEX FIX'S OWN FALSE GREEN. A DIVISION slash opened the speculative
# regex scan; the scan ran to the `/` inside the LATER non-code region
# on the same physical line and ATE ITS OPENING DELIMITER, so the rest
# of that region was read as code. Both lanes are RED at `c201b23f^`
# (before the regex branch existed) and GREEN at `c201b23f` — the fix
# UNMASKED what the simpler masker had covered, which is why the union
# and not a cleverer scan is the answer.
#
# The `_` after `prefix/` is load-bearing and not decoration: the regex
# scan takes trailing ALPHA characters as flags, so `prefix/asDispatch`
# would swallow the call head by accident and the lane would be red for
# the wrong reason. A non-alpha byte stops the flag run and leaves the
# call head standing in what the scanner then believes is code.
SLASH_STRING_LINE = 'const ratio = total / divisor; expect(label).toBe("prefix/_%s");\n'
SLASH_STRING_BEFORE = BEFORE + SLASH_STRING_LINE % "x"
SLASH_STRING_AFTER = AFTER_CLEAN + SLASH_STRING_LINE % "asDispatch(x)"

SLASH_COMMENT_LINE = "const ratio = total / divisor; // the site: prefix/_%s\n"
SLASH_COMMENT_BEFORE = BEFORE + SLASH_COMMENT_LINE % "x"
SLASH_COMMENT_AFTER = AFTER_CLEAN + SLASH_COMMENT_LINE % "asDispatch(x)"

# The GREEN control for the pair: the same division and the same
# non-code region present and UNCHANGED while the real call site takes
# the narrow. Without it both lanes above are satisfied by a masker that
# had simply started swallowing every line containing a `/`.
SLASH_CONTEXT = SLASH_STRING_LINE % "x" + SLASH_COMMENT_LINE % "x"
SLASH_CONTEXT_BEFORE = BEFORE + SLASH_CONTEXT
SLASH_CONTEXT_AFTER = AFTER_CLEAN + SLASH_CONTEXT

# packet ch14-p3a AFTERMATH (build-close review, gate 2f): THE OPENER'S
# OWN STAR. `/*/ x */` is ONE block comment to TypeScript — verified
# against the compiler's scanner, which reports a single
# MultiLineCommentTrivia over the whole span. Both the shipped masker
# AND the reference scanner it was checked against searched for `*/`
# starting AT the `/`, so the opener's `*` served as the closer's too:
# three characters masked, the rest read as code, and a re-pin planted
# there erased on both sides and rode through green.
#
# This lane is the reason the CONSTRUCTED ORACLE below exists. The
# monotonicity reference could not catch this one, because it made the
# SAME mistake — a duplicated implementation catches a transcription
# slip and is blind to a shared misunderstanding.
BLOCK_SLASH_LINE = "/*/ the site: %s */\n"
BLOCK_SLASH_BEFORE = BEFORE + BLOCK_SLASH_LINE % "x"
BLOCK_SLASH_AFTER = AFTER_CLEAN + BLOCK_SLASH_LINE % "asDispatch(x)"

# The GREEN control: the same comment form present and UNCHANGED while
# the real call site takes the narrow. Without it the lane above is
# satisfied by a masker that had simply started swallowing every `/*`
# it met to the end of the file.
BLOCK_SLASH_CONTEXT = BLOCK_SLASH_LINE % "asDispatch(x)"
BLOCK_SLASH_CONTEXT_BEFORE = BEFORE + BLOCK_SLASH_CONTEXT
BLOCK_SLASH_CONTEXT_AFTER = AFTER_CLEAN + BLOCK_SLASH_CONTEXT

# ── the DECLARATION entry ────────────────────────────────────────────
# The erased construct spans lines, so its string-literal lane needs a
# TEMPLATE literal — the only string form that legitimately does.
DECL_DOC = "/**\n * doc\n */\n"
DECL_LITERAL_BEFORE = BEFORE + "const sample = `\n`;\n"
DECL_LITERAL_AFTER = (
    AFTER_CLEAN + "const sample = `\n" + DECL_DOC + "const asDispatch = (i: T) => i;\n`;\n"
)

# Line-anchored out of reach of a `//` prefix; see the note above.
DECL_COMMENT_BEFORE = BEFORE + "// const asDispatch = (i: T) => i;\n"
DECL_COMMENT_AFTER = AFTER_CLEAN + "// const asDispatch = (i: T) => null;\n"

# The block-comment lane carries the DOC-FREE shape on purpose: a doc
# comment planted inside a block comment ENDS it at its own `*/`, so the
# declaration after it would be real code and the lane would be green
# for the right reason. Only the optional-doc form is reachable here.
DECL_BLOCK_BEFORE = BEFORE + "/*\n*/\n"
DECL_BLOCK_AFTER = AFTER_CLEAN + "/*\nconst asDispatch = (i: T) => i;\n*/\n"

DECL_SAMPLE = "const sample = `\n" + DECL_DOC + "const asDispatch = (i: T) => i;\n`;\n"
DECL_CONTEXT_BEFORE = BEFORE + DECL_SAMPLE
DECL_CONTEXT_AFTER = AFTER_CLEAN + DECL_SAMPLE

# ── the TYPE-ONLY IMPORT entry ───────────────────────────────────────
# The entry's match begins at the newline BEFORE the statement, so the
# fixture needs a line above it for the narrow to be clean.
IMPORT_LINE = 'import type { DispatchIntent, HumanDecisionRequest } from "./domain/index.js";'
IMPORT_BEFORE = 'import { helper } from "./helper.js";\n' + BEFORE
IMPORT_AFTER_CLEAN = 'import { helper } from "./helper.js";\n' + IMPORT_LINE + "\n" + AFTER_CLEAN

IMPORT_LITERAL_BEFORE = IMPORT_BEFORE + "const sample = `\n`;\n"
IMPORT_LITERAL_AFTER = IMPORT_AFTER_CLEAN + "const sample = `\n" + IMPORT_LINE + "\n`;\n"

# Line-anchored out of reach of a `//` prefix; see the note above.
IMPORT_COMMENT_BEFORE = IMPORT_BEFORE + "// " + IMPORT_LINE + "\n"
IMPORT_COMMENT_AFTER = IMPORT_AFTER_CLEAN + "// " + IMPORT_LINE.replace("./domain", "./other") + "\n"

IMPORT_BLOCK_BEFORE = IMPORT_BEFORE + "/*\n*/\n"
IMPORT_BLOCK_AFTER = IMPORT_AFTER_CLEAN + "/*\n" + IMPORT_LINE + "\n*/\n"

IMPORT_CONTEXT_BEFORE = IMPORT_BEFORE + "// " + IMPORT_LINE + "\n"
IMPORT_CONTEXT_AFTER = IMPORT_AFTER_CLEAN + "// " + IMPORT_LINE + "\n"


# ── the MONOTONICITY reference ───────────────────────────────────────
# The pre-regex-literal masker, RE-IMPLEMENTED HERE and deliberately NOT
# shared with the scanner it checks. A reference that calls the code
# under test proves nothing; this one is written from the same spec and
# would have gone red on the shipped `c201b23f`, which is the only
# evidence that matters for it.
#
# It is knowingly a DUPLICATE, and the duplication is the point: the
# invariant it drives is that ADDING a recognized form may only ADD
# masked positions. A shared helper would make the two sides move
# together and the property vacuous.


def _reference_noncode_positions(text: str) -> set[int]:
    """Positions of every COMMENT and STRING character, regex-blind.

    `//` to end of line; `/* … */` non-nesting; `'` and `"` ended by the
    quote or the line end; `` ` `` spanning lines; a backslash escapes
    the next character inside a string. Newlines are never included. A
    `/` that opens neither comment form is ordinary code — which is
    exactly the assumption the speculative scan overturned.
    """
    found: set[int] = set()
    i = 0
    n = len(text)
    while i < n:
        char = text[i]
        if text.startswith("//", i):
            while i < n and text[i] != "\n":
                found.add(i)
                i += 1
        elif text.startswith("/*", i):
            # Opener consumed first — see the note on the production
            # branch. The SHARED version of this error is why the
            # oracle below exists.
            found.add(i)
            found.add(i + 1)
            i += 2
            while i < n and not text.startswith("*/", i):
                if text[i] != "\n":
                    found.add(i)
                i += 1
            for _ in range(2):
                if i < n:
                    found.add(i)
                    i += 1
        elif char in "\"'`":
            found.add(i)
            i += 1
            while i < n:
                if text[i] == "\\":
                    found.add(i)
                    if i + 1 < n and text[i + 1] != "\n":
                        found.add(i + 1)
                    i += 2
                    continue
                if text[i] == char:
                    found.add(i)
                    i += 1
                    break
                if text[i] == "\n":
                    if char != "`":
                        break
                    i += 1
                    continue
                found.add(i)
                i += 1
        else:
            i += 1
    return found


# ── the CONSTRUCTED ORACLE ───────────────────────────────────────────
# THE REFERENCE ABOVE IS CODE-INDEPENDENT BUT NOT FAILURE-INDEPENDENT,
# and gate 2f of the build-close review measured the difference. `/*/ x
# */` was mis-tokenized IDENTICALLY by the masker and by the reference,
# because both were written from the same sentence — "a block comment
# runs from `/*` to the next `*/`" — and both read that sentence as
# permitting the opener's own `*` to close it. The superset property
# held perfectly between two implementations that were both wrong. A
# duplicate catches a TRANSCRIPTION slip; it is structurally blind to a
# SHARED MISUNDERSTANDING.
#
# So this corpus is not a third scanner. It carries no scanning
# algorithm at all: each case is a SEQUENCE OF LABELLED SEGMENTS, and
# the expected mask is read off the labels by concatenation. Nothing
# here decides where a comment ends — the author already did, segment by
# segment — so a wrong rule about where a comment ends cannot be
# duplicated into it.
#
# HOW THE LABELS WERE ESTABLISHED, because an authored oracle is only
# worth its authority: every case below was run through the TypeScript
# compiler's own scanner (`ts.createScanner`, `skipTrivia=false`) at
# authoring time and the labelled non-code segments match its
# comment/string token spans EXACTLY. That validation was a ONE-TIME
# act, not a gate leg — see the residual note on the selftest lane.
#
# The assertion is ONE-DIRECTIONAL, matching the masker's declared safe
# direction: every labelled non-code position MUST be masked. A code
# position that gets masked anyway is over-masking, which this module
# permits by design, so the oracle says nothing about it.
_ORACLE_CASES: tuple[tuple[str, tuple[tuple[str, bool], ...]], ...] = (
    # THE GATE-2f FINDING: the opener's `*` reused as the closer's.
    (
        "block-opener-star-reused",
        (
            ("const a = 1;\n", False),
            ("/*/ asDispatch(x) */", True),
            ("\nconst b = 2;\n", False),
        ),
    ),
    # An opener immediately followed by its own closer character.
    (
        "block-empty",
        (("const a = 1;\n", False), ("/**/", True), ("\nconst b = 2;\n", False)),
    ),
    # The same, with nothing but slashes and stars between them.
    (
        "block-nested-looking-tight",
        (("const a = 1;\n", False), ("/*/*/", True), ("\nconst b = 2;\n", False)),
    ),
    # A NESTED-LOOKING opener. Block comments do not nest, so the inner
    # `/*` is comment text and the first `*/` ends the whole span.
    (
        "block-nested-looking-spaced",
        (
            ("const a = 1;\n", False),
            ("/* /* asDispatch(x) */", True),
            ("\nconst b = 2;\n", False),
        ),
    ),
    # Stars immediately before the closer — the `**/` tail.
    (
        "block-stars-before-closer",
        (
            ("const a = 1;\n", False),
            ("/* asDispatch(x) **/", True),
            ("\nconst b = 2;\n", False),
        ),
    ),
    # A COMMENT MARKER INSIDE A QUOTE: no comment starts here.
    (
        "block-marker-inside-string",
        (("const u = ", False), ('"a /* asDispatch(x) */ b"', True), (";\n", False)),
    ),
    (
        "line-marker-inside-string",
        (("const u = ", False), ('"http://asDispatch(x)"', True), (";\n", False)),
    ),
    # A QUOTE INSIDE A COMMENT: no string starts here, and neither quote
    # form ends the comment.
    (
        "quote-inside-block-comment",
        (("/* a \"asDispatch(x)\" and 'b' */", True), ("\nconst c = 3;\n", False)),
    ),
    # A block opener inside a LINE comment: the line comment owns it.
    (
        "block-opener-inside-line-comment",
        (("// /* asDispatch(x)", True), ("\nconst d = 4;\n", False)),
    ),
    # A line marker inside a BLOCK comment: the block comment owns it.
    (
        "line-marker-inside-block-comment",
        (("/* // asDispatch(x) */", True), ("\nconst e = 5;\n", False)),
    ),
    # An ESCAPED QUOTE does not end its string.
    (
        "escaped-quote-inside-string",
        (("const s = ", False), ("'it\\'s asDispatch(x)'", True), (";\n", False)),
    ),
    # An escaped quote AT END OF LINE — a LINE CONTINUATION, so this
    # single-quoted-family string legitimately spans two lines.
    (
        "string-line-continuation",
        (("const s = ", False), ('"a\\\nb asDispatch(x)"', True), (";\n", False)),
    ),
)


def _oracle_case_text(segments: tuple[tuple[str, bool], ...]) -> tuple[str, set[int]]:
    """The case's SOURCE TEXT and the positions its labels call non-code.

    Newlines are excluded from the expectation because the masker
    preserves line structure by contract; every other character of a
    segment labelled non-code must come back masked.
    """
    parts: list[str] = []
    expected: set[int] = set()
    offset = 0
    for piece, noncode in segments:
        if noncode:
            expected.update(offset + k for k, char in enumerate(piece) if char != "\n")
        parts.append(piece)
        offset += len(piece)
    return "".join(parts), expected

def _live_trace_sources() -> list[tuple[str, str]]:
    """The four LIVE golden-trace files, by their receipt entries.

    Real source is in the corpus because the fixtures in this file are
    small and hand-shaped: the mis-tokenization that shipped needs a
    division and a later same-line literal, and only real test code says
    whether such lines exist in the files this gate actually guards.

    A missing receipts file or a missing source file is a FAILURE
    reported by the caller, never a silent skip — a corpus that quietly
    shrinks to nothing is the same defect as a property asserted in
    prose.
    """
    repo = Path(__file__).resolve().parents[2]
    receipts_path = repo / "v3" / "src" / "drift" / "traceNarrowReceipts.json"
    entries = json.loads(receipts_path.read_text(encoding="utf-8"))
    sources: list[tuple[str, str]] = []
    for entry in entries:
        name = entry["file"]
        sources.append((name, (repo / name).read_text(encoding="utf-8")))
    return sources


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

    # packet ch14-p3a (F2) — the new entry's own three lanes.
    # GREEN: the required-parameter addition erases back to the pre-edit
    # bytes. This is the entry's whole reason to exist and is otherwise
    # driven only implicitly by the live leg.
    checker = Checker()
    check_text_half("floor-green", FLOOR_BEFORE, FLOOR_AFTER_CLEAN, checker)
    if checker.errors:
        failures.append(
            f"green NOT green: the createFloor argument addition was refused ({checker.errors})"
        )

    # 7. the SAME call site with a DIFFERENT second argument — the entry is
    #    pinned to the literal `null`, so any other value stays a RE-PIN.
    checker = Checker()
    check_text_half(
        "n10", FLOOR_BEFORE, FLOOR_AFTER_CLEAN.replace(", null)", ", definitions)"), checker
    )
    assert_red("createFloor-second-argument-not-null", checker.errors, "RE-PIN")

    # 8. the SAME file with an expected literal changed BESIDE the argument
    #    addition — the erasure must not carry a re-pin through with it.
    checker = Checker()
    check_text_half(
        "n11", FLOOR_BEFORE, FLOOR_AFTER_CLEAN.replace("toHaveLength(1)", "toHaveLength(2)"), checker
    )
    assert_red("createFloor-addition-beside-a-repin", checker.errors, "RE-PIN")

    # 12. the SAME text inside an EXPECTED STRING LITERAL. The erasure is
    #     pinned by VALUE and by CONTEXT; without the context half a
    #     changed-expected-literal re-pin whose literal happens to contain
    #     the added text is erased on BOTH sides of the diff and rides
    #     through green.
    checker = Checker()
    check_text_half("n12", FLOOR_LITERAL_BEFORE, FLOOR_LITERAL_AFTER, checker)
    assert_red("createFloor-inside-a-string-literal", checker.errors, "RE-PIN")

    # 13. the SAME text inside a LINE COMMENT.
    checker = Checker()
    check_text_half("n13", FLOOR_COMMENT_BEFORE, FLOOR_COMMENT_AFTER, checker)
    assert_red("createFloor-inside-a-line-comment", checker.errors, "RE-PIN")

    # 14. a COMMENTED-OUT STATEMENT inside a BLOCK COMMENT — the shape a
    #     line-anchored rule alone still erases.
    checker = Checker()
    check_text_half("n14", FLOOR_BLOCK_BEFORE, FLOOR_BLOCK_AFTER, checker)
    assert_red("createFloor-inside-a-block-comment", checker.errors, "RE-PIN")

    # GREEN: the real call site still erases with those very contexts
    # present and unchanged — the control that keeps the three negatives
    # from being satisfied by an entry that erases nothing.
    checker = Checker()
    check_text_half("floor-context-green", FLOOR_CONTEXT_BEFORE, FLOOR_CONTEXT_AFTER, checker)
    if checker.errors:
        failures.append(
            f"green NOT green: the createFloor addition was refused beside unchanged "
            f"string/comment contexts ({checker.errors})"
        )

    # packet ch14-p3a (F1) — the three INHERITED entries' context lanes.
    # A helper, because twelve lanes written out longhand hide the one
    # thing worth reading: each triple is (entry, context, fixture pair),
    # and every one of them must RE-PIN.
    def assert_context_red(label: str, before: str, after: str) -> None:
        checker = Checker()
        check_text_half(label, before, after, checker)
        assert_red(label, checker.errors, "RE-PIN")

    def assert_context_green(label: str, before: str, after: str) -> None:
        checker = Checker()
        check_text_half(label, before, after, checker)
        if checker.errors:
            failures.append(
                f"green NOT green: {label} — the real construct was refused beside "
                f"unchanged string/comment contexts ({checker.errors})"
            )

    # 15-17. the CALL-SITE entry in each non-code context. 15 is the
    #        executed counterexample the review reproduced.
    assert_context_red("asDispatch-inside-a-string-literal", CALL_LITERAL_BEFORE, CALL_LITERAL_AFTER)
    assert_context_red("asDispatch-inside-a-line-comment", CALL_COMMENT_BEFORE, CALL_COMMENT_AFTER)
    assert_context_red("asDispatch-inside-a-block-comment", CALL_BLOCK_BEFORE, CALL_BLOCK_AFTER)
    assert_context_green("asDispatch-context-green", CALL_CONTEXT_BEFORE, CALL_CONTEXT_AFTER)

    # 15b. the AFTERMATH lane: the same construct inside a REGEX
    #      LITERAL, which the masker did not recognize as non-code and
    #      which therefore carried a real re-pin through green.
    assert_context_red("asDispatch-inside-a-regex-literal", CALL_REGEX_BEFORE, CALL_REGEX_AFTER)
    assert_context_green(
        "asDispatch-regex-context-green", CALL_REGEX_CONTEXT_BEFORE, CALL_REGEX_CONTEXT_AFTER
    )

    # 15c-15d. the AFTERMATH-2 lanes: a DIVISION slash on the same
    #          physical line as a later string / line comment. The
    #          speculative regex scan ate the literal's opening
    #          delimiter and re-read its body as code, so the regex fix
    #          UNMASKED a span the simpler masker had covered. Both are
    #          red at `c201b23f^` and green at `c201b23f`.
    assert_context_red("division-then-string-literal", SLASH_STRING_BEFORE, SLASH_STRING_AFTER)
    assert_context_red("division-then-line-comment", SLASH_COMMENT_BEFORE, SLASH_COMMENT_AFTER)
    assert_context_green("division-slash-context-green", SLASH_CONTEXT_BEFORE, SLASH_CONTEXT_AFTER)

    # 15e. the AFTERMATH-3 lane: `/*/ x */`. The masker consumed the
    #      opener's `*` twice — once opening, once closing — masked
    #      three characters, and read the rest of a real block comment
    #      as code. GREEN at `5e100e48`, red here.
    assert_context_red(
        "block-comment-opener-star-reused", BLOCK_SLASH_BEFORE, BLOCK_SLASH_AFTER
    )
    assert_context_green(
        "block-comment-opener-star-context-green",
        BLOCK_SLASH_CONTEXT_BEFORE,
        BLOCK_SLASH_CONTEXT_AFTER,
    )

    # 18-20. the DECLARATION entry in each non-code context.
    assert_context_red("declaration-inside-a-string-literal", DECL_LITERAL_BEFORE, DECL_LITERAL_AFTER)
    assert_context_red("declaration-inside-a-line-comment", DECL_COMMENT_BEFORE, DECL_COMMENT_AFTER)
    assert_context_red("declaration-inside-a-block-comment", DECL_BLOCK_BEFORE, DECL_BLOCK_AFTER)
    assert_context_green("declaration-context-green", DECL_CONTEXT_BEFORE, DECL_CONTEXT_AFTER)

    # 21-23. the TYPE-ONLY IMPORT entry in each non-code context.
    assert_context_red("import-inside-a-string-literal", IMPORT_LITERAL_BEFORE, IMPORT_LITERAL_AFTER)
    assert_context_red("import-inside-a-line-comment", IMPORT_COMMENT_BEFORE, IMPORT_COMMENT_AFTER)
    assert_context_red("import-inside-a-block-comment", IMPORT_BLOCK_BEFORE, IMPORT_BLOCK_AFTER)
    assert_context_green("import-context-green", IMPORT_CONTEXT_BEFORE, IMPORT_CONTEXT_AFTER)

    # GREEN: the type-only import erases on its own, which is what the
    # three lanes above are the context half of.
    checker = Checker()
    check_text_half("import-green", IMPORT_BEFORE, IMPORT_AFTER_CLEAN, checker)
    if checker.errors:
        failures.append(
            f"green NOT green: the type-only import addition was refused ({checker.errors})"
        )

    # 24-25. the ANCHOR-VALIDATION lanes. `sub_in_code` refuses an entry
    #        with no `(?P<code>...)` group, and the refusal must not
    #        depend on the entry MATCHING anything. The check used to sit
    #        INSIDE the match loop, so a nonmatching anchorless entry was
    #        accepted in silence and only a matching one failed — which
    #        made "an anchorless entry cannot be added silently" true in
    #        the matching case alone. BOTH shapes are driven here, and the
    #        nonmatching one is the lane that falsifies the old form.
    def assert_anchorless_refused(label: str, pattern: str) -> None:
        dims.append(label)
        try:
            sub_in_code(pattern, "x", BEFORE)
        except ValueError:
            return
        except Exception as exc:  # noqa: BLE001 - the type is the assertion
            failures.append(f"dim NOT red: {label} (refused, but as {exc!r})")
            return
        failures.append(f"dim NOT red: {label} (an anchorless entry was ACCEPTED)")

    assert_anchorless_refused("anchorless-entry-that-MATCHES", r"const x = 1;")
    assert_anchorless_refused("anchorless-entry-that-does-NOT-match", r"no-such-text-anywhere")

    # GREEN: an entry that DOES carry the anchor still applies. Without
    # it the two lanes above are satisfied by a `sub_in_code` that raised
    # on every pattern.
    if sub_in_code(r"(?P<code>const x) = 1;", r"\g<code>;", BEFORE) == BEFORE:
        failures.append("green NOT green: an ANCHORED entry did not apply")

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

    # ── THE MONOTONICITY PROPERTY, DRIVEN OVER A CORPUS ──────────────
    # The acceptance criterion of the aftermath fold that produced the
    # union: the masked positions must be a SUPERSET of what the
    # PRE-REGEX-LITERAL masker produced, for EVERY input. Never fewer.
    #
    # This is the lane the shipped `c201b23f` had no equivalent of. Its
    # docstring ARGUED the direction was safe ("masking never removes a
    # byte from the compared text, so over-masking can only leave more
    # difference visible") and the argument was wrong, because it
    # assumed masking is monotone in the recognized forms and a
    # speculative scanner is not. A property asserted in prose and not
    # checked is precisely what produced that finding.
    #
    # THE COLLECTION RULE, stated as the CONVENTION it actually is. A
    # module-level global joins the corpus when its name is UPPERCASE,
    # its value is a `str`, and its name does NOT begin with `_`. The
    # last clause is a correction (build-close review, gate 2f): without
    # it the `_MASK` sentinel — one NUL character, no code, no non-code
    # — joined as a 56th "fixture" and the claimed count was one too
    # high. Private module constants are excluded by that same clause,
    # which is what makes the rule statable rather than accidental.
    #
    # A fixture that FOLLOWS the convention joins without anyone
    # remembering to; a fixture that does not — a lowercase local, a
    # string built inside `selftest`, a file added elsewhere — does NOT
    # join, and no mechanism here notices. The convention is the whole
    # contract, and it is the reason to keep authoring fixtures as
    # UPPERCASE module globals.
    corpus: list[tuple[str, str]] = [
        (name, value)
        for name, value in sorted(globals().items())
        if name.isupper() and not name.startswith("_") and isinstance(value, str)
    ]
    fixture_count = len(corpus)
    # The oracle cases join too: they are the smallest inputs that
    # exercise the tokenizer edges, and the reference must survive them.
    corpus.extend(
        (f"oracle:{name}", _oracle_case_text(segments)[0])
        for name, segments in _ORACLE_CASES
    )
    try:
        corpus.extend(_live_trace_sources())
    except (OSError, ValueError, KeyError) as exc:  # noqa: BLE001 - reported, never skipped
        failures.append(f"monotonicity corpus: the LIVE trace sources could not be read ({exc!r})")
    if _MASK in dict(corpus).values():
        failures.append("monotonicity corpus: the _MASK sentinel is being counted as a fixture")
    # ── packet ch14-p3b (G1) — the DECLARED RE-PIN edit class, FOURTEEN
    # lanes: one GREEN, one RED per FALSIFIER, plus the abbreviated-ref
    # green and the UNCHANGED-PATH control. The falsifiers, not the
    # checks, are the membership — check (c) alone carries three of them,
    # and (e) and (f) name lanes no single falsifier does.
    #
    # Each lane runs the WHOLE `check_receipt`, against a REAL temporary
    # git repository: checks (c) and (g) read the filesystem and git, so
    # a lane that stubbed either would measure something adjacent to the
    # thing under test. The repo carries the trace file (committed =
    # BEFORE, working tree = AFTER) and a minimal contract file the
    # anchor resolves against.
    REPIN_BEFORE = "const v = 1;\nexpect(state.currentStep).toBe(\"done\");\n"
    REPIN_AFTER = "const v = 1;\nexpect(state.currentStep).toBe(\"human_approval\");\n"
    TRACE = "v3/src/l0bTrace.test.ts"
    ANCHOR = "contract:ch14-human-decision#C24"
    MOVED = {
        "baseline": {"transcript": "aa", "instance": "bb"},
        "current": {"transcript": "cc", "instance": "dd"},
    }

    def repin_repo(
        tmp: Path, *, committed: str, working: str, extra_commit: bool = False
    ) -> tuple[Path, str]:
        """A git repo with the trace committed and the working tree
        holding `working`. Returns (repo, the sha of the FIRST commit)."""
        repo = tmp
        (repo / "v3" / "src").mkdir(parents=True, exist_ok=True)
        (repo / "v3" / "implementation" / "contracts").mkdir(parents=True, exist_ok=True)
        (repo / "v3" / "implementation" / "contracts" / "ch14-human-decision-contract.md").write_text(
            "# ch14 — human-decision contract\n\n| ID | Rule |\n|---|---|\n"
            "| C24 | The shipped wiring |\n",
            encoding="utf-8",
        )
        git = ["git", "-C", str(repo)]
        subprocess.run([*git[:1], "init", "-q", str(repo)], check=True, capture_output=True)
        subprocess.run([*git, "config", "user.email", "t@t"], check=True, capture_output=True)
        subprocess.run([*git, "config", "user.name", "t"], check=True, capture_output=True)
        (repo / TRACE).write_text(committed, encoding="utf-8")
        subprocess.run([*git, "add", "-A"], check=True, capture_output=True)
        subprocess.run([*git, "commit", "-qm", "before"], check=True, capture_output=True)
        first = subprocess.run(
            [*git, "rev-parse", "HEAD"], check=True, capture_output=True, text=True
        ).stdout.strip()
        if extra_commit:
            (repo / "unrelated.txt").write_text("x\n", encoding="utf-8")
            subprocess.run([*git, "add", "-A"], check=True, capture_output=True)
            subprocess.run([*git, "commit", "-qm", "after"], check=True, capture_output=True)
        (repo / TRACE).write_text(working, encoding="utf-8")
        return repo, first

    def run_repin(
        overrides: dict,
        *,
        committed: str = REPIN_BEFORE,
        working: str = REPIN_AFTER,
        extra_commit: bool = False,
        ref: str | None = None,
        abbreviate: bool = False,
    ) -> list[str]:
        tmp = Path(tempfile.mkdtemp(prefix="v3-repin-"))
        try:
            repo, first = repin_repo(
                tmp, committed=committed, working=working, extra_commit=extra_commit
            )
            head = _resolve_commit(repo, "HEAD") or ""
            baseline = ref if ref is not None else (first if extra_commit else head)
            if abbreviate:
                baseline = baseline[:8]
            entry = {
                "id": "R-NARROW-1",
                "file": TRACE,
                "baseline_ref": baseline,
                "edit_class": DECLARED_REPIN,
                "anchor": ANCHOR,
                "digests": MOVED,
            }
            entry.update(overrides)
            for key, value in list(entry.items()):
                if value is None:
                    del entry[key]
            local = Checker()
            check_receipt(entry, repo, local)
            return local.errors
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    # 1. GREEN — differing bytes, differing digests, a resolving anchor,
    #    an uncommitted edit.
    dims.append("declared-repin-green")
    green_errors = run_repin({})
    if green_errors:
        failures.append(f"green NOT green: a well-formed declared re-pin was refused ({green_errors})")

    # 2. identical erased bytes — the label cannot be worn for free.
    assert_red(
        "declared-repin-identical-bytes",
        run_repin({}, working=REPIN_BEFORE + "\n\n"),
        "IDENTICAL after erasure",
    )

    # 3. equal digests — an expectation moved while the behaviour did not.
    assert_red(
        "declared-repin-equal-digests",
        run_repin({"digests": {"baseline": GOOD_DIGESTS, "current": GOOD_DIGESTS}}),
        "EQUAL on both grains",
    )

    # 4-6. check (c)'s THREE falsifiers.
    assert_red("declared-repin-anchor-missing", run_repin({"anchor": None}), "no 'anchor' field")
    assert_red(
        "declared-repin-anchor-malformed",
        run_repin({"anchor": "ch14-human-decision C24"}),
        "not the strict contract-ref form",
    )
    assert_red(
        "declared-repin-anchor-row-absent",
        run_repin({"anchor": "contract:ch14-human-decision#C999"}),
        "defines no table row C999",
    )

    # 7. `unreachable` + `declared-repin` together.
    assert_red(
        "declared-repin-with-unreachable",
        run_repin({"behaviour_half": "unreachable", "reason": "no_shared_replay_seam"}),
        "can evidence no MOVED digest",
    )

    # 8. a bare type assertion UNDER the class — check (e) keeps the
    #    REFUSED scan, so the class cannot launder one through.
    assert_red(
        "declared-repin-bare-assertion",
        run_repin({}, working=REPIN_AFTER + "const i = (o.intent as DispatchIntent).actor;\n"),
        "BARE TYPE ASSERTION",
    )

    # 9. check (g1) — the working tree EQUALS the bytes at HEAD.
    assert_red(
        "declared-repin-edit-already-landed",
        run_repin({}, committed=REPIN_AFTER, working=REPIN_AFTER, ref=None),
        "(g1)",
    )

    # 9b. check (g2) — `baseline_ref` resolves to a DIFFERENT commit
    #     object than HEAD. The lane that fails a declaration read after
    #     its own commit, and the one an uncommitted touch would hide:
    #     here the working tree DOES differ from HEAD, so (g1) is green.
    assert_red(
        "declared-repin-outlived-its-commit",
        run_repin({}, extra_commit=True),
        "(g2)",
    )

    # 9c. GREEN — the ABBREVIATED form. `baseline_ref` is a 7-to-40
    #     character prefix; a string comparison against `rev-parse HEAD`'s
    #     full forty would wrongly refuse the legitimate build-time state.
    dims.append("declared-repin-abbreviated-ref-green")
    abbreviated = run_repin({}, abbreviate=True)
    if abbreviated:
        failures.append(
            f"green NOT green: an ABBREVIATED baseline_ref resolving to HEAD was "
            f"refused ({abbreviated})"
        )

    # 10-11. check (e)'s two PRE-EXISTING shape guards, named separately
    #        because a build implementing only the new branch is exactly
    #        what (e) exists to catch.
    assert_red(
        "declared-repin-one-grain-digest-block",
        run_repin({"digests": {"baseline": {"transcript": "aa"}, "current": {"transcript": "cc"}}}),
        "EXACTLY the two grains",
    )
    assert_red(
        "declared-repin-recomputation-block",
        run_repin({"recomputation": {"at": "deadbeef"}}),
        "'recomputation' block",
    )

    # 12. the UNCHANGED PATH for (f): a NON-declaring entry still reds on
    #     the ORDINARY text-half and digest-equality rules. Both are
    #     asserted, because the class is per entry and an entry without
    #     the key must be scanned exactly as it was before.
    assert_red(
        "non-declaring-entry-still-reds-on-text",
        run_repin({"edit_class": None, "anchor": None,
                   "digests": {"baseline": GOOD_DIGESTS, "current": GOOD_DIGESTS}}),
        "RE-PIN, not a compile fix",
    )
    assert_red(
        "non-declaring-entry-still-reds-on-digests",
        run_repin({"edit_class": None, "anchor": None}, working=REPIN_BEFORE),
        "the replay digest MOVED",
    )

    dims.append("mask-monotonicity-over-corpus")
    lost: list[str] = []
    for name, text in corpus:
        masked = mask_noncode(text)
        missing = sorted(
            i for i in _reference_noncode_positions(text) if masked[i] != _MASK
        )
        if missing:
            at = missing[0]
            lost.append(
                f"{name}: {len(missing)} position(s) the strings-and-comments masker "
                f"covered are UNMASKED, first at {at} ({text[max(0, at - 40) : at + 40]!r})"
            )
    if lost:
        failures.append(
            "MASK MONOTONICITY VIOLATED — adding a recognized form removed masking: "
            + "; ".join(lost)
        )
    if len(corpus) < 5:
        failures.append(f"monotonicity corpus is implausibly small ({len(corpus)} input(s))")

    # ── THE CONSTRUCTED-ORACLE PROPERTY ──────────────────────────────
    # Every position a LABEL calls non-code must be masked. The labels
    # were authored and validated against the TypeScript compiler's own
    # scanner; nothing here re-derives them, which is the only reason
    # this lane can see what the monotonicity reference cannot.
    #
    # MEASURED, not argued: against the masker shipped at `5e100e48`
    # this lane reds on `block-opener-star-reused` (17 positions) and
    # `block-nested-looking-tight` (2). The monotonicity reference at
    # that same commit got BOTH cases wrong in exactly the same way, so
    # the superset property stayed green over them — which is the
    # common-mode blindness this lane exists to remove.
    #
    # THE RESIDUAL, stated because the record must not claim more than
    # it holds. This lane removes the SHARED-ALGORITHM mode: no scanning
    # rule is duplicated, so a wrong rule cannot pass by being wrong
    # twice. It does NOT remove the SHARED-AUTHOR mode: a case whose
    # label encodes a wrong belief about TypeScript is simply a wrong
    # expectation, and the compiler cross-check that would catch it ran
    # ONCE, by hand, at authoring time — it is not a leg of this gate.
    # And the oracle is a FINITE, HAND-PICKED corpus: it says nothing
    # about any construct nobody thought to write down. Both scanners
    # remain crude lexers, and the coverage of this lane is exactly its
    # twelve cases and no more.
    dims.append("mask-covers-constructed-oracle")
    uncovered: list[str] = []
    for name, segments in _ORACLE_CASES:
        text, expected = _oracle_case_text(segments)
        masked = mask_noncode(text)
        missing = sorted(i for i in expected if masked[i] != _MASK)
        if missing:
            uncovered.append(
                f"{name}: {len(missing)} LABELLED non-code position(s) left as code, "
                f"first at {missing[0]} ({text!r})"
            )
    if uncovered:
        failures.append(
            "ORACLE COVERAGE VIOLATED — the masker read authored non-code as code: "
            + "; ".join(uncovered)
        )

    for failure in failures:
        print(f"selftest FAIL: {failure}", file=sys.stderr)
    print(
        f"check-trace-narrow selftest: {len(dims)} red dims exercised, "
        f"{len(failures)} failure(s); monotonicity corpus = {len(corpus)} input(s) "
        f"({fixture_count} module fixtures by naming convention, "
        f"{len(_ORACLE_CASES)} oracle cases, {len(corpus) - fixture_count - len(_ORACLE_CASES)} "
        f"live trace file(s))"
    )
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
