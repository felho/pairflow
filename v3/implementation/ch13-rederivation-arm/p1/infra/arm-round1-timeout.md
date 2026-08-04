# QA review charter — draft-lint `superseded` status machinery (ch13 re-derivation, phase P1, round 1)

You are a fresh-context quality reviewer on a Python linter and its
self-test suite. You have full repo access. Read the repo yourself; do
not trust any summary in this charter over the bytes.

Repo: the working tree you are launched in. HEAD is `a1da13f8`.
Everything below is repo-relative.

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

Primary target: `tools/v3-plan/check_packet.py` (3220 lines). The
claim registry it implements is in its own header comment (search for
`D1.` through `D8.`). The human-authoritative mirror of that registry
is `v3/implementation/contract-draft-template.md` §2, §3, §4 and §6 —
**on any mismatch between template and lint, the TEMPLATE is the
authority and the lint is the defect.**

Live inputs the lint runs over: `v3/implementation/packets/*.md`,
`v3/implementation/contracts/*.md`.

Current measured state, for you to re-run rather than believe:

```
python3 tools/v3-plan/check_packet.py --selftest
  → selftest: 131 red dims exercised, green fixture + reopen choreography
    + fenced-noise greens pass, 0 failure(s)
python3 tools/v3-plan/check_packet.py
  → packet-lint: 26 v2 packet(s) linted, 16 pre-v2 grandfathered,
    5 draft(s) linted (0 reopened, 0 superseded), 0 error(s)
```

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

Plain restatement of what that means for your worklist:

- **IN SCOPE.** Defects reachable by a careless author writing in good
  faith: a typo, a stale line, a wrong key, a copy-paste artifact, a
  block written in the obvious-but-wrong way, an off-by-one, an
  unhandled empty/missing input, a check that silently does nothing,
  a self-test fixture that would pass with the code it claims to
  test removed.
- **OUT OF SCOPE (record it, do not propose a fix).** Anything whose
  only reachable author is someone deliberately hand-crafting input
  to defeat the scanner — content buried in rendering constructs to
  hide it from the parser, input shaped specifically to slip past a
  particular regex while still rendering as the real thing, and the
  like. That class is owned by human diff review, not by this code.
  A previous round of this review spent days building code against
  that class; the result was deleted. Do not reopen it.

This is a boundary on the *worklist*, not on your *reading*. Read
everything; classify honestly; report both classes.

## 3. What to look for (the QA lenses)

Work through these; you may add lenses, but cover these:

1. **Counterexample search on each D8 claim.** For every claim D8.1
   through D8.9 in the lint's registry comment: construct a concrete
   input a careless author would plausibly produce, run the lint on
   it, and report whether the outcome matches what the claim (and the
   template) promises. Concentrate on inputs the fixtures do not
   already cover.

2. **False-green search.** Where does the lint report green on
   something it claims to reject? Missing-key, empty-value,
   wrong-type, absent-file, and not-in-a-repo paths are the usual
   homes. Include the packet-anchor path (D8.7): the anchor forms the
   lint recognizes vs. the anchor forms that actually occur in
   `v3/implementation/packets/*.md`. Note that many live packets use
   a header-union form and 16 are grandfathered pre-v2 — check
   whether an anchor into a superseded draft is actually caught on
   every form that reaches the lint, or only on some.

3. **Sensitivity check on each self-test fixture.** A fixture that
   passes both with and without the code it claims to exercise proves
   nothing. For the D8 fixtures specifically: remove or neuter the
   check under test (in a scratch copy — see §5) and confirm the
   fixture actually fails. Report any fixture that survives its own
   mutant. Report also any fixture whose input could not pass the
   form it claims to test even if the check were correct.

4. **Template–lint mirror check.** Read
   `contract-draft-template.md` §2, §3, §4, §6 line by line against
   the code. Report every place they disagree, every place the
   template contradicts itself, and every line in the template that
   is stale with respect to what the code now does. Include date and
   reference claims in prose: a sentence that states a fact about the
   repo is a claim, and an unverified claim of that shape is a defect
   in this codebase's own recorded terms.

5. **The pending act.** The next act on this repo flips
   `v3/implementation/contracts/ch13-context-block-contract.md` from
   `ratified` to `superseded` in ONE commit that edits the meta block
   and appends:

   ```json
   {"superseded": {"date": "2026-08-04", "oracle_branch": "ch13-prose-line", "oracle_tip": "bb313036c7e50ad2625f0669f76a90bf317255e3", "plan": "v3/implementation/ch13-rederivation-plan.md"}}
   ```

   No C-row is touched, so the D5 equality check must keep holding.
   Simulate that act in a scratch copy and report anything that would
   go wrong, be reported unhelpfully, or be reported not at all.

## 4. Evidence bar (this is the hard requirement)

**Every finding must carry an executed command and its real output.**
A finding stated from reading alone, however confident, is not a
finding here — this project has a recorded history of plausible
review claims that were false when run. If you could not run it, say
"unrun" explicitly and mark the finding as such.

For each finding give:

- **ID** (F1, F2, …)
- **CLASS**: `IN-SCOPE` or `CARRIED-SCOPE` (per §2), with one
  sentence on why it falls there
- **WHAT**: the defect in one sentence
- **WHERE**: `file:line`
- **EVIDENCE**: the exact command(s) you ran and the exact output
- **WHY IT MATTERS**: the concrete wrong outcome a careless author
  would get
- **FIX SKETCH** (IN-SCOPE only): the smallest change that closes it

## 5. Rules of engagement

- **Do not modify the repository.** Not one byte, tracked or
  untracked. A byte guard runs before and after this session and any
  change invalidates your entire verdict. Do all experimental work in
  a scratch directory outside the repo (e.g. copy files under
  `/tmp/…` and run the lint there, or use `git stash`-free
  read-only techniques). If you need the lint to see a modified tree,
  copy the whole repo to `/tmp` and work on the copy.
- **Do not propose growth in the self-test registers.** The register
  form is fixed at ONE level: per-claim red fixture, a name list, and
  a pinned count. Registers that check other registers are a
  documented anti-pattern in this repo, deleted once already. If you
  believe a fixture is unverified, say so in prose; do not propose
  machinery to verify it.
- **Proportionality.** The product this code guards is a one-line
  status flip plus a four-key record. A fix proposal larger than the
  thing it guards is itself a finding — say so instead of proposing
  it.
- **Completeness over ranking.** Report everything you find in both
  classes. Do not silently drop small findings; do not pad with
  speculation.

## 6. Output format

Write plain text, in this order:

1. **RECEIPTS** — the commands you ran to establish baseline state
   (selftest, lint) with their output.
2. **FINDINGS** — the §4 blocks, IN-SCOPE first, then CARRIED-SCOPE.
3. **CLEAN LANES** — which of the §3 lenses you ran and found nothing
   in, with the evidence that you actually exercised them (a lens
   reported clean without a command is reported as unrun).
4. **VERDICT** — counts by class, and one sentence on whether the
   built machinery does what §2's scope declaration says it should.
