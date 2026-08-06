# Design review — the declared-schema direction (ADR-019) and the substrate that realizes it

You are a fresh-context reviewer, and this round is a **design review**,
not a code review. You have full repo access. Read the repo yourself; do
not trust any summary in this charter over the bytes.

Three earlier rounds already examined this code for accident and
sloppiness, and closed green. **They never examined the DIRECTION.** That
is this round's sole subject: is the design right, does it promise more
than it delivers, and what will it cost the people who have to build on
it next.

You REPORT. You fix nothing and you propose no edits to the repository.
Every finding you write is input to a pending decision by the project's
owner.

## 0. READ THIS FIRST — the time budget, and why it decides your output shape

**You have a HARD 20-minute wall-clock budget for this entire session. It
is enforced by an external process kill. A session that hits it produces
NO usable output — every finding you have not yet written out is
discarded.** An earlier session in this repo spent its whole budget
investigating, planned to write up at the end, and was killed mid-write-up.
All of its work was lost.

So the rule is: **write each finding out IN FULL, in the §4 format, the
moment you form it.** Do not accumulate findings for the end. Your closing
message should need to contain nothing but the counts and the §5
paragraph, because everything else is already written.

Budget shape: stop investigating at roughly the 12-minute mark and spend
the rest consolidating. Prefer **breadth at shallow depth**. If a check
looks like it will take more than about two minutes, write it down as
`unrun` with one sentence on what would settle it, and move on.

## 1. The review object

Pinned by hash. The tree's HEAD may be a later docs-only commit; the
hashes are the pin.

| File | Lines | sha256 (first 16) |
|---|---|---|
| `v3/adr/ADR-019-declared-schema-for-structural-definition-rules.md` | 317 | `833faf93a689014e` |
| `v3/implementation/schema-expressiveness-audit.md` | 923 | `bfed821037786fa1` |
| `v3/src/definition/schema/vocabulary.ts` | 384 | `b64aa92474047756` |
| `v3/src/definition/schema/templateFormat.ts` | 545 | `c8815a980075e8da` |
| `v3/src/definition/schema/engine.ts` | 1183 | `c60b692db5301402` |
| `v3/src/definition/schema/normalizer.ts` | 140 | `30754f4b7aa93199` |
| `v3/src/definition/schema/templateSurface.ts` | 144 | `10f65890beee8e91` |
| `v3/src/definition/admit.ts` | 68 | `9b9ac9bdd25cd9fb` |
| `v3/src/definition/load.ts` | 268 | `4fae069c9d2a0525` |

## 2. What the design is, in one page

The repo validates authored workflow-definition documents. Until this
work, the rules lived as hand-written code in two places — a walk over
the parsed YAML document, and an admission pass over the resulting value
— which disagreed about which rules ran on which of the two entry
channels (a file, or a value a caller constructs directly in code).

ADR-019 decided that structural rules become **declared schema**:

- a VOCABULARY of declaration attributes, expressed as types
  (`schema/vocabulary.ts`);
- a DECLARATION of the template format, expressed as data
  (`schema/templateFormat.ts`), each node carrying a `tag` and the
  ratified contract rows it realizes;
- ONE engine (`schema/engine.ts`) that applies the declaration to either
  channel;
- a separately-named NORMALIZER (`schema/normalizer.ts`) that computes
  the admitted form, because "a declaration says what is legal; it does
  not compute a value";
- a small remainder — the ADR calls it the RESIDUAL, seven named
  families — where prose and hand-written code still legislate.

The motivating measurement is in the ADR's Context: a prior prose-based
attempt produced repeated semantic restatement, and the second cleanup
sweep found as many fresh defects as the first. The ADR's bet is that
making rules DATA makes restatement structurally impossible.

The realizing build is complete: the hand-written walk is deleted, the
engine is live on both channels, and a parity exercise found zero
differences in finding paths and zero in finding messages.

## 3. The lenses

Work them in order and **emit findings as you go**.

**Lens 1 — the LOAD-BEARING CLAIMS. Stress them; do not restate them.**
For each claim below: is it true as stated, true only under conditions
the ADR does not name, or true of less than it sounds like? Say what a
COUNTEREXAMPLE would look like, concretely, and check whether one exists.

  a. *"One engine on both channels makes restatement structurally
     impossible."* Structurally impossible for WHAT, exactly? Count what
     the declaration actually covers versus what the surface's rules
     are. Is there anywhere a rule could still be stated twice?
  b. *"The declaration is data, not code."* Test it against the bytes.
     What in `templateFormat.ts` behaves as code — is interpreted, is
     compiled, or carries control flow — even though it is spelled as
     data? Does anything in the file survive `JSON.stringify` unchanged,
     and does it matter either way? The ADR calls it "a frozen
     declaration object"; check what is actually frozen.
  c. *"The residual is exactly seven families."* Is every hand-written
     rule that remains a member of one of the seven, honestly? Look
     especially at anything the build placed in a family whose stated
     definition does not quite fit it. A remainder that is really an
     eighth kind, filed under a seventh name, is a finding.
  d. *"Channel symmetry becomes structural rather than argued."* The
     declaration marks some attributes as belonging to one channel.
     Count how many such marks exist and what decides them. Is symmetry
     now structural, or is the asymmetry simply written down in a new
     place?

**Lens 2 — FUTURE-CONSUMER STRESS.** Three consumers are already
scheduled. For each, walk what they will actually have to do against the
current design and name what will hurt, mislead, or need rework:

  a. **A contract author (next phase)** will write a ratified prose
     document whose rows CITE declaration tags instead of restating
     attributes. Are the tags stable, addressable and granular enough to
     cite? Is there a tag for everything a row would want to point at,
     and is there anything a row must point at that has no tag?
  b. **A packet author (the phase after)** will project an
     implementation task onto these declarations. What must they read to
     know what the declaration already guarantees? Is that answerable
     from the declaration alone?
  c. **A later migration act** may bring three currently-excluded
     validators onto the engine. The build recorded why it could not:
     a module-boundary rule (`v3/eslint.config.mjs`) and the shape of an
     injected registration's interface (`v3/src/ports/gate.ts`). Read
     both. Is the recorded reason accurate, and what would that
     migration have to change?

**Lens 3 — THE LOCK GAP.** The ADR's D4 acknowledges that a code file
can be edited without the ratification act that governs ratified prose,
and says the fix is to extend the act to the schema file's bytes — which
happens at the NEXT phase, with the contract. So: **today, what stops
`templateFormat.ts` from being edited?** Search the repo for any check,
lint rule, test, tool or convention that names that file or guards its
content. Report what you find and what you do not. Then answer directly:
is the gap between now and the next phase acceptable, or is it a finding?

**Lens 4 — VOCABULARY COHERENCE.** Read `vocabulary.ts` as a language
specification, which is what it is.

  a. Is it self-consistent? Does every documented attribute mean the same
     thing everywhere it appears?
  b. Can a construct be honestly MISREAD — a declaration author writes
     something reasonable that means something else, or means nothing?
     Name the specific construct and the specific misreading.
  c. The build argued that a field typed to ONE literal value needs no
     runtime comparison because the type system enforces it. Is that
     argument sound? Where does it hold and where does it not?

**Lens 5 — THE MAINTENANCE PATH.** Take one concrete rule of the
template format — your choice, but say which — and walk the ACTUAL path
a future maintainer follows to change it: which files they open, in what
order, what tells them they got it right, and what would still pass if
they got it wrong. **Where can they be wrong SILENTLY?** A change that
compiles, passes the suite, and quietly stops enforcing something is the
outcome to hunt here.

## 3.1 What the closed rounds already covered — do not re-hunt these

Three rounds already swept for: declaration attributes with no reader;
stale or unstamped numbers in the write-ups; finding-message and
finding-path drift against the deleted implementation; whether the
engine contains a rule-specific branch; whether test fixtures
discriminate. Their record is in
`v3/implementation/ch13-rederivation-arm/p3-build/` (three charters,
three verdicts, and `phase-close-report.md`). **Read the phase-close
report first** so you spend this round's budget on new ground.

If you happen to trip over an instance of a closed class, one line is
enough — say it is a closed class and move on.

## 4. Evidence bar and finding format

This is a design review, so **a reasoned finding is legal** where a
command cannot settle the question — but the SCENARIO must be specific:
a named construct, a named file, a named future act, and what concretely
goes wrong. "This might be confusing" is not a finding. "An author who
writes X, following the doc at line N, gets Y and no error" is.

Where a claim IS runnable, run it. Experimental work goes under `/tmp`.

Classify every finding as exactly one of:

- **design-error** — the design is wrong or will not do what it is for;
- **over-promise** — the design works but a stated claim is wider than
  what it delivers;
- **future-trap** — it works now and will bite a named future act;
- **confirmed-sound** — you stress-tested a claim and it held. **Report
  these too.** A round that reports only problems has not told the reader
  which parts they can rely on.

```
### F<n> — <one-line title>
CLASS: design-error | over-promise | future-trap | confirmed-sound
LENS:  1a..1d | 2a..2c | 3 | 4a..4c | 5
WHAT:  the finding in one sentence
WHERE: file:line (or the ADR section)
EVIDENCE:
  <exact command and its real output, OR the specific scenario:
   who does what, following which line, and what they get>
WHY IT MATTERS: the consequence, concretely
```

Do not include a fix sketch. Fixes are not this round's output.

## 5. The closing message — and the question you must answer

Only this, because everything else is already written:

- your tree's HEAD;
- counts by class: design-error / over-promise / future-trap /
  confirmed-sound;
- which lenses you completed, partially ran, or did not reach;
- and then, **the question the owner is actually asking**:

  > **Is the approach sound?**

  Answer it in ONE paragraph, hedge-free. Not "it depends" and not a
  summary of your findings — a judgement. If the answer is yes with
  conditions, name the conditions. If the answer is no, say what the
  design would have to become. You have read the ADR, its evidence base
  and the code that realizes it; you are better placed to answer this
  than anyone who has been living inside the work.

## 6. Rules of engagement

- **Do not modify the repository.** Not one byte, tracked or untracked.
  A byte guard runs before and after this session and any change
  invalidates the entire verdict. Work under `/tmp`.
- **Do not propose new machinery**, no new modules, attributes or tools.
- **Proportionality.** If the smallest honest correction to something is
  larger than the thing itself, that observation is the finding.
- **Do not manufacture findings to fill the round, and do not soften a
  real one to be agreeable.** A design that survives is a result worth
  reporting; so is one that does not.
