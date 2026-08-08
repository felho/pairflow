# QA review charter — schema-lock round 1: the byte lock on ratification blocks

You are a fresh-context reviewer with full repo access. Read the repo
yourself; do not trust any summary in this charter over the bytes.

The contract-draft lint has just gained ONE check family: a
ratification block may carry an optional `schema` key `{path, sha256}`,
and on the latest block the named file's working tree bytes must hash
to the recorded value. This is guard machinery guarding a ratification
act that has not yet run — a defect found now costs nothing; a defect
found at the act costs the act.

## 0. READ THIS FIRST — the time budget

**A HARD 20-minute wall-clock budget, enforced by an external process
kill; unwritten findings are lost.** Write each finding IN FULL the
moment you confirm it. Stop investigating at ~12 minutes; over-2-minute
questions go down as `unrun` with one sentence.

## 1. The review object

Commit `ed86ac24` (the build). The claims are the D3 extension and the
new D5b in the file's own docstring, plus the template's new schema-lock
clause (§2 and §3) — read those first; they are the standard.

| File | sha256 (first 16) |
|---|---|
| `tools/v3-plan/check_packet.py` (3458 lines) | `bf0fdb20af426d2e` |
| `v3/implementation/contract-draft-template.md` | `459c923ff5a3aa20` |

Run `python3 tools/v3-plan/check_packet.py --selftest` and the live
lint. Build disposable draft fixtures under `/tmp` git repos (the
selftest's own `build_green_fixture` choreography is the worked
example: content commit → record commit).

## 2. The lenses

**Lens A — the four shape/byte lanes, each with its corrected twin:**
wrong inner keyset; malformed sha256; missing path; hash mismatch; and
the green (true hash) — do they fire for THEIR claim and only that?

**Lens B — the boundary semantics:** the byte check binds the LATEST
block only (an OLDER block with a stale schema must not red); it is
suspended at `reopened` (a stale hash during the two-commit reopen
window must stay green, exactly as the commit-equality check does);
it binds at `ratified`, `realized` AND `superseded`; a block WITHOUT
the schema key stays exactly as before (no regression on the five
existing drafts and the superseded ch13 contract).

**Lens C — the path discipline:** repo-relative enforcement (a leading
`/` or a `..` segment refuses at shape), resolution against the
DRAFT'S OWN git root (a fixture repo's lock must not read this repo's
files), and a directory (not file) at the path.

**Lens D — the lint's own integrity:** selftest register 139, every
dim red for its claim, greens green; the live run's error count and
draft tally unchanged against the parent commit.

## 3. Finding format

Threat model: ACCIDENT and SLOPPINESS in the build — behaviour that
contradicts the docstring's D3/D5b claims, the template's §3 clause, or
the build's commit message. Outside that: CARRIED-SCOPE, one line.

```
### <CLASS> <n> — <one-line title>
CLASS: IN-SCOPE | CARRIED-SCOPE | UNRUN
WHAT / WHERE / EVIDENCE (exact command + output) / EXPECTED
```

Do not propose fixes. Do not modify the repository — not one byte; work
under `/tmp`. A guard runs before and after. Vocabulary: routine
software engineering (conformance, counterexamples, sensitivity).

## 4. Closing message

Only this: HEAD; counts IN-SCOPE / CARRIED-SCOPE / UNRUN; lenses
full/partial; `python3 tools/v3-plan/check_packet.py --selftest` and
the live lint's results; one sentence — does the lock hold its stated
claims?
