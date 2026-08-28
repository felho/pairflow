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


def mask_noncode(text: str) -> str:
    """Return `text` with every COMMENT and STRING-LITERAL character
    replaced by a filler, positions and newlines preserved.

    The lexer is deliberately crude, and the direction of its error is
    the point: masking TOO MUCH can only make an erasure fail to apply,
    which turns a clean edit into a RE-PIN verdict — a false RED. It can
    never make an erasure apply where it should not, which is the false
    GREEN this gate exists to refuse. So an ambiguous byte (a `/` that
    opens a regex literal, a quote inside one) is allowed to over-mask.
    """
    out = list(text)
    i = 0
    n = len(text)
    while i < n:
        char = text[i]
        if char == "/" and text.startswith("//", i):
            while i < n and text[i] != "\n":
                out[i] = _MASK
                i += 1
        elif char == "/" and text.startswith("/*", i):
            while i < n and not text.startswith("*/", i):
                if text[i] != "\n":
                    out[i] = _MASK
                i += 1
            for _ in range(2):
                if i < n:
                    out[i] = _MASK
                    i += 1
        elif char in "\"'`":
            quote = char
            out[i] = _MASK
            i += 1
            while i < n:
                current = text[i]
                if current == "\\":
                    out[i] = _MASK
                    if i + 1 < n and text[i + 1] != "\n":
                        out[i + 1] = _MASK
                    i += 2
                    continue
                if current == quote:
                    out[i] = _MASK
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
                out[i] = _MASK
                i += 1
        else:
            i += 1
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

    A pattern with NO `code` group raises here rather than defaulting to
    the whole match, and that is deliberate: an anchorless entry is
    exactly the context-blind rule this function exists to refuse, so it
    must fail loudly at its first use instead of quietly overmatching.
    """
    masked = mask_noncode(text)
    pieces: list[str] = []
    last = 0
    for match in re.finditer(pattern, text):
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
# implementations. They are kept, and they are not idle: each stays red
# if the LINE anchor is dropped (the code anchor reds it) and if the
# CODE anchor is dropped (the line anchor reds it), so they are the
# standing guard on the pair. Every other lane below is green under the
# pre-fix rule and red under this one.

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
