# QA review charter — draft-lint `superseded` status machinery (ch13 phase P1)

You are a fresh-context quality reviewer on a Python linter and its
self-test suite. You have full repo access. Read the repo yourself; do
not trust any summary in this charter over the bytes.

Repo: the working tree you are launched in. HEAD is `a1da13f8`.
`tools/v3-plan/check_packet.py` sha256 =
`e35589712996fdb4972aa5c182ea294640093d2fbec5babf7cd062583ff11d1b`.
Cite that hash in your verdict. Everything below is repo-relative.

## 0. READ THIS FIRST — the time budget, and why it decides your output shape

**You have a HARD 20-minute wall-clock budget for this entire
session. It is enforced by an external process kill. A session that
hits it produces NO usable output — every finding you have not yet
written out is discarded.** A previous session on this same charter
spent its full budget investigating, planned to write everything up at
the end, and was killed mid-write-up. All of its work was lost.

So the rule is: **write each finding out IN FULL, in the report format
of §4, the moment you confirm it.** Do not accumulate findings to
present at the end. Do not save the evidence blocks for a final pass.
Your closing message should need to contain nothing but the verdict
counts, because everything else is already written.

Budget shape: aim to stop investigating at roughly the 12-minute mark
and spend what remains consolidating. Prefer **breadth at shallow
depth** over exhaustive depth in one lens. If constructing a probe
looks like it will take more than about two minutes, write it down as
`unrun` with one sentence on what would settle it, and move on. An
honest short verdict that survives beats a thorough one that dies.

## 1. What was built (the review object)

Three commits added a fifth terminal status, `superseded`, to the
contract-draft status machine that `tools/v3-plan/check_packet.py`
enforces:

- `274df3a6` — the machinery: status enum value, the `superseded`
  record block `{date, oracle_branch, oracle_tip, plan}` and its
  checks, the packet-anchor red path, the summary listing, and the
  D8.1–D8.9 self-test fixtures.
- `c8636170` — `v3/implementation/README.md`: the chapter-close
  carve-out (a draft closes at `realized` OR `superseded`).
- `a1da13f8` — `v3/implementation/contract-draft-template.md`: the
  scope declaration quoted in §2 below.

The claim registry the lint implements is in its own header comment
(search for `D1.` through `D8.`). The human-authoritative mirror of
that registry is `v3/implementation/contract-draft-template.md` §2,
§3, §4 and §6 — **on any mismatch between template and lint, the
TEMPLATE is the authority and the lint is the defect.**

Live inputs: `v3/implementation/packets/*.md`,
`v3/implementation/contracts/*.md`.

Baseline to re-run rather than believe (this is your first action):

```
python3 tools/v3-plan/check_packet.py --selftest
python3 tools/v3-plan/check_packet.py
```

**Cheap scratch technique — use this instead of copying the repo.**
The lint's own self-test builds throwaway fixture trees in
`tempfile` directories: read `build_superseded_fixture` and the
`expect_red_superseded` helper in the selftest section, import the
module (`import importlib.util` on
`tools/v3-plan/check_packet.py`), and drive `m.lint(...)` on fixture
trees you mutate. That is minutes cheaper than cloning the tree and it
is how the existing fixtures work.

## 2. Scope declaration — read this before deciding what counts

The following paragraph is the ratified scope of every check in this
registry. It is quoted verbatim from
`v3/implementation/contract-draft-template.md` §3:

> **Threat model (user-ratified 2026-08-04):** every check in this
> registry defends against ACCIDENT and SLOPPINESS — a wrong edit, a
> malformed block, a stale reference, a careless anchor. None of it
> defends against a commit-holder's DELIBERATE concealment (rows
> hidden in rendering constructs, hand-crafted evasions): that class
> is owned by human diff review and the fresh-context arm, exactly as
> older ratification blocks already are ("verified by diff review,
> not tier 0"). A finding outside this sentence is recorded as
> carried-scope, never built against.

What that means for your worklist:

- **IN SCOPE.** Defects reachable by a careless author writing in good
  faith: a typo, a stale line, a wrong key, a copy-paste artifact, a
  block written the obvious-but-wrong way, an off-by-one, an
  unhandled empty or missing input, a check that silently does
  nothing, a self-test fixture that would pass with the code it
  claims to test removed.
- **OUT OF SCOPE — record it, do not propose a fix.** Anything whose
  only plausible author is someone deliberately hand-crafting input
  to defeat the scanner: content buried in rendering constructs to
  hide it from the parser, input shaped specifically to slip past a
  particular regex while still rendering as the real thing. That
  class is owned by human diff review, not by this code. A previous
  round of this review built code against that class for days; the
  result was deleted. Do not reopen it.

This bounds the *worklist*, not your *reading*. Read everything;
classify honestly; report both classes.

## 3. The lenses — ordered cheapest-first, so a kill costs you least

Work them in this order and **emit findings as you go**.

**Lens A — template↔lint mirror (pure reading, no setup).** Read
`contract-draft-template.md` §2, §3, §4, §6 line by line against the
code. Report every disagreement, every place the template contradicts
itself, and every stale line. Include prose claims of repo fact:
a sentence asserting something about this repository's state, its
dates, or its history is a checkable claim, and an unverified one of
that shape is a defect in this codebase's own recorded terms. Verify
each such claim with a command.

**Lens B — anchor consumption coverage (D8.7).** After the pending
flip (§3, Lens E), a packet anchoring the superseded draft must go
red with the dedicated message. Establish by grep and by running the
lint **which anchor-carrying channels the lint actually consumes**:
the `rows[...].ref` manifest field is one — enumerate the others that
appear in real files under `v3/implementation/packets/`, including
header-union lines and inline `(anchored: contract:…)` text inside row
prose, and note that 16 packets are grandfathered pre-v2. For each
channel state, with a run, whether an anchor into a superseded draft
is caught there or passes green. A channel a careless author would
plausibly use that is NOT covered is an in-scope finding.

**Lens C — counterexample search on D8.1–D8.9.** For each claim,
construct one concrete input a careless author would plausibly
produce, run the lint on it, and report whether the outcome matches
what the claim and the template promise. Concentrate on inputs the
existing fixtures do not cover — wrong value TYPES, empty strings,
values that satisfy a regex but are not real (dates especially), and
missing-file/not-in-a-repo paths.

**Lens D — fixture sensitivity.** A fixture that passes both with and
without the code it claims to exercise proves nothing. For as many
D8 fixtures as your budget allows: neuter the check under test in a
scratch copy of the module and confirm the fixture actually fails.
Report any fixture that survives its own mutant, and any fixture whose
input could not pass the form it claims to test even if the check were
correct. Cover what you can; list by name the ones you did not reach.

**Lens E — the pending act.** The next act flips
`v3/implementation/contracts/ch13-context-block-contract.md` from
`ratified` to `superseded` in ONE commit that edits the meta block and
appends, as the file's last block:

```json
{"superseded": {"date": "2026-08-04", "oracle_branch": "ch13-prose-line", "oracle_tip": "bb313036c7e50ad2625f0669f76a90bf317255e3", "plan": "v3/implementation/ch13-rederivation-plan.md"}}
```

No C-row is touched, so the D5 equality check must keep holding.
Simulate that act in a scratch copy and report anything that would go
wrong, be reported unhelpfully, or be reported not at all.

## 4. Evidence bar and finding format

**Every finding must carry an executed command and its real output.**
A finding stated from reading alone, however confident, is not a
finding here — this project has a recorded history of plausible review
claims that were false when run. If you could not run it, mark it
`unrun` explicitly.

Emit each finding, when you confirm it, as:

```
### F<n> — <one-line title>
CLASS: IN-SCOPE | CARRIED-SCOPE | UNRUN   (one sentence on why)
WHAT:  the defect in one sentence
WHERE: file:line
EVIDENCE:
  <exact command>
  <exact output>
WHY IT MATTERS: the concrete wrong outcome a careless author gets
FIX SKETCH: (IN-SCOPE only) the smallest change that closes it
```

## 5. Rules of engagement

- **Do not modify the repository.** Not one byte, tracked or
  untracked. A byte guard runs before and after this session; any
  change invalidates your entire verdict. Do all experimental work
  under `/tmp`.
- **Do not propose growth in the self-test registers.** The register
  form is fixed at ONE level: per-claim red fixture, a name list, and
  a pinned count. Registers that check other registers are a
  documented anti-pattern here, deleted once already. If you think a
  fixture is unverified, say so in prose; do not propose machinery to
  verify it.
- **Proportionality.** The product this code guards is a one-line
  status flip plus a four-key record. A fix proposal larger than the
  thing it guards is itself a finding — say so instead of proposing
  it.
- **Completeness over ranking.** Report everything in both classes.
  Do not silently drop small findings; do not pad with speculation.

## 6. Closing message

Only this, because everything else is already written:

- the basis hash you were given, restated;
- counts: IN-SCOPE / CARRIED-SCOPE / UNRUN;
- which lenses you completed, which you partially ran, which you did
  not reach;
- one sentence on whether the built machinery does what §2's scope
  declaration says it should.
