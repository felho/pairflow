# QA review charter — schema-lock round 2: re-check on the folded bytes

You are a fresh-context reviewer with full repo access. Read the repo
yourself; do not trust any summary in this charter over the bytes.

SECOND round of a bounded three-round frame on the contract-draft
lint's schema lock. Round 1 found two in-scope defects; both were
folded at commit `20b73f6a` (dims-first). This round verifies the folds
and their neighbourhoods and confirms nothing else moved. NOT a fresh
falsification hunt — outside the scope below, CARRIED-SCOPE, one line.

## 0. The time budget

**HARD 20-minute wall-clock budget, external kill; unwritten findings
are lost.** Write each finding in full immediately; stop at ~12 min;
over-2-minute questions go down as `unrun`.

## 1. The review object

`tools/v3-plan/check_packet.py` (3515 lines, sha256 first16
`367a598eb6cfdb2b`) at commit `20b73f6a` (with the docs commit
`0d58283e` on top; HEAD may sit there — the lint bytes are `20b73f6a`'s).
The standards: the file's D3/D5b docstring claims, the template's §3
schema-lock clause, and the fold's commit message.

## 2. The two folds under verification

**Fold 1:** the shape check refuses `..` as a path SEGMENT, not as a
substring — `schema..fixture.ts` (a regular file, true hash) is green;
`sub/../x.ts` refuses at shape. Exercise the neighbourhood: `../x` at
the head; a trailing `/..`; a filename that is exactly `..` alone;
backslashes and other separators the split does not treat.

**Fold 2:** the resolved target must stay under the resolved root — a
symlink inside the root pointing outside refuses with "resolves outside
the draft's repository", even with the outside bytes' true hash.
Exercise the neighbourhood: a symlink pointing INSIDE the root (must
stay green with the target's true hash); a symlinked intermediate
DIRECTORY escaping the root; a relative symlink; the fixture root
itself being under a symlinked /tmp path (macOS `/tmp` → `/private/tmp`
— a false escape here would red every legitimate lock).

## 3. Scope fence

In scope: the two folds, their neighbourhoods, regression on the five
schema-lock dims and the live drafts. Also verify: selftest register
now 140 red dims + the new green, 0 failures; live lint unchanged (6
drafts, 0 errors).

## 4. Finding format

Threat model: ACCIDENT and SLOPPINESS in the fold. Format as before:

```
### <CLASS> <n> — <one-line title>
CLASS: IN-SCOPE | CARRIED-SCOPE | UNRUN
WHAT / WHERE / EVIDENCE (exact command + output) / EXPECTED
```

No fixes. No repo modification — work under `/tmp`; a guard runs
before and after. Routine QA vocabulary throughout.

## 5. Closing message

Only: HEAD; counts; neighbourhoods full/partial; selftest + live lint
results; one sentence — do the folds hold?
