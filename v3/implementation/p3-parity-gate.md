# The parity gate — the engine-backed template surface vs. the implemented one

ADR-019 D5, run 2026-08-05 against the substrate committed at
`3466d241`. **This document is the delta list. It is presented BEFORE
any switch, never after** — that is D5's letter, and the switch is not
made until this list is ratified.

## 0. The instrument, and why it is this one

The corpus could not be replayed by "running the tests twice", because
the 362 cases carry their fixtures INSIDE `it()` blocks: a pass/fail
diff would report at test grain, and D5 asks about verdict, PATH and
MESSAGE.

So the instrument is a comparison at the call site. `schema/parityProbe.ts`
is default-OFF; with `PAIRFLOW_V3_PARITY=1` every call to `loadTemplate`'s
validate stage and to `admitTemplate` computes BOTH answers on the SAME
input and appends any divergence to a log. The reference implementation
stays the one that answers. A second switch, `PAIRFLOW_V3_ENGINE=1`,
returns the engine's answer instead — the DRY RUN of the switch, used
only to count what the switch would break.

Both variables are temporary and are removed at the switch.

## 1. What was replayed — and one correction to the corpus number

| Measure | Value | How derived, at write time |
|---|---|---|
| ADR-019 D5's corpus | 362 | `grep -cE '^\s*(it\|test)\('` over the 7 named files: 124 · 76 · 59 · 59 · 19 · 13 · 12. Reproduces exactly. |
| EXECUTED cases in those 7 files | 428 | `vitest run` on the same 7 files. The gap is loop-generated cases, which a source-literal grep cannot see. |
| EXECUTED cases actually replayed | **1830** | the whole `v3` suite |

**The corpus number under-measures the surface, and the direction
matters.** `admitTemplate` is the DIRECT-construction channel's entry,
and it is called from the testkit, the kernel, lifecycle and trace
suites — not only from the 7 named files. Restricting the replay to 362
would have hidden two thirds of the affected cases. The probe was
therefore run over the whole suite. This is a measurement refinement of
D5's corpus, not a contradiction of it: every one of the 362 is included.

Reference-path result with the probe ON: **1830 passed / 1830** — the
instrument changes no behaviour.

## 2. The headline: BOTH pre-named delta classes came back EMPTY

D5 pre-named two delta classes so they would arrive as decisions rather
than surprises. Measured over all 105 divergence records:

| Pre-named class | Measured |
|---|---|
| **path grain** (duplicate terminal ids at `terminal` not `terminal[i]`; every key-class lane at its containing map) | **0 deltas** |
| **message wording** (nine measured messages embed rule-specific rationale) | **0 deltas** |

Derived: for every finding path BOTH implementations emit, the set of
`{path, message, code}` triples at that path is identical — 0 records
with a changed message or code. The audit's §5 F3 called path grain "the
parity gate's highest-yield target"; the `at:` / `keyLaneAt:` /
`laneOrder:` attributes it recommended are why it yielded nothing.

The declaration carries a literal `message:` per lane, which is the
first of D5's two options. F5's recommendation (engine-generated wording
plus an approved delta list) was NOT taken, because taking it would have
put ~112 wording changes in front of the ratifier for no gain.

## 3. The delta list

105 divergence records, in exactly three classes.

### Class A — CHANNEL SYMMETRY: structural lanes now run on the direct-construction channel

**94 records · 4 failing cases under the dry run.**

Today the structural lanes (`ref`, `steps`, `terminal`, `roles`,
`start`, transition targets, the role-set equality, the id grammars)
exist ONLY in the file walk. `admitTemplate` never ran them, so a
directly-constructed template could be structurally broken and still be
admitted. Under ONE declaration on BOTH channels they run everywhere.

The lanes that newly fire, with occurrence counts:

| Occurrences | Path | Lane |
|---|---|---|
| 19 | `ref.version` | resolved safe-integer belt |
| 10 | `start` | `memberOf keys($.steps)` |
| 8 | `terminal` | nonempty |
| 8 | `steps` | nonempty |
| 8 | `ref.id` | grammar |
| 5 + 2 | `steps` | step-id grammar / stringness |
| 4 + 2 + 1 | `roles`, `roles.<r>` | the role-set equality, both directions |
| 4 + 3 + 1 | `steps.*.role` | role-name grammar / stringness |
| 3 | `steps.*.instruction` | nonempty |
| 3 | `steps.*.transitions` | event-type grammar |
| 3 | `runtimeContext` | spec-map required keys |
| 2 + 2 | `steps.*.transitions.<e>` | target ∈ steps ∪ terminal |
| 2 | `steps.*.gates` | dead-config subset, at a non-string key |

**This is what ADR-019 D1 asks for**, in its own words: channel symmetry
"becomes structural rather than argued", retiring the hand-partitioned
realization split that ch11-C40 and ch13-C19 each spent ratified prose
defending. The audit's F2 rests on the same mechanism: ch13-C7's entry
belt dissolves precisely because a cast-forged value can now be refused
structurally.

It is nonetheless a VERDICT change on existing cases, so it is D5's
business. The 4 failing cases are fixtures that are structurally
invalid on purpose, built to exercise something downstream:

- `admit.test.ts` — the `__proto__` own-key fixture carries `terminal: []`
  and a `start` naming no step;
- `diagEmission.test.ts` ×2 — a transition target `"vanished"` plus a
  declared-but-unused role;
- `storeCheckers.test.ts` — a transition target `"ghost"`.

Each is repairable by making the fixture structurally valid without
touching what it tests.

### Class B — LANE ORDER: the walk/admission interleaving

**11 records · 0 failing cases.**

Same finding SET, same paths, same messages, different order. Today the
walk's findings all precede admission's. Under one computation a step's
gate findings are emitted while that step is being walked, so they
interleave with later steps' structural findings. Example:

- reference: `[steps.bad container, steps.good.gates.GO[0] evaluator]`
- engine: `[steps.good.gates.GO[0] evaluator, steps.bad container]`

Finding ORDER is not named in D5 (which names verdict, path, message).
No test asserts an order that this changes. Recorded because a silent
reordering is exactly the kind of thing that should not be silent.

### Class C — the `(b′)` disposition collision on an EMPTY `steps` map

**1 record · 1 failing case.**

The ratified `(b′)` disposition (`load.test.ts`) says: an EMPTY `steps`
map plus a `round` declaration yields BOTH the C9 nonempty finding AND
the round MEMBERSHIP finding. Today it can, because two different
notions of "keys(steps)" exist: the walk's (undefined when `steps` is
empty, which suppresses `start`, transition targets and the role set)
and admission's (the actual object, against which round membership still
runs).

One engine has ONE notion. As declared, `steps`'s nonempty lane is
`gating`, so every rule selecting over `keys($.steps)` is suppressed —
including round membership. The alternative (non-gating) would make
`start` fire on an empty `steps` map, which today it does not.

**CORRECTED at the switch, 2026-08-05 — the collision was mine, not the
direction's.** The ruling received was "amend `(b′)`"; no amendment was
made, because re-reading F7's own text showed the premise of this class
was wrong. F7 states `(b′)` with its reason: *`steps` EMPTY is a valid
map OF ITS KIND — ch8-C21's suppression binds missing/wrong-kind only*,
so `keys(steps)` = ∅ EXISTS and every rule selecting over it runs.

The engine had declared `steps`'s nonempty lane `gating`, which is
suppression on an EMPTY container — precisely what ch8-C21 does not do.
Removing that one attribute restores `(b′)` exactly, with no machinery
and no second selector semantics. The ratified disposition is preserved.

The consequence, recorded because it is a real (small) widening of Class
A: with `keys($.steps)` = ∅ a reliable operand, `start` now also reports
on an empty `steps` map, which ch8-C18 requires and the old walk merely
never reached. No case in the suite objects.

Class C is therefore EMPTY. The delta list is Classes A and B.

## 4. Dry run of the switch

`PAIRFLOW_V3_ENGINE=1 vitest run`: **5 failed / 1830** at the time of the
ruling — 4 of Class A, 1 of Class C. After the Class-C correction above
and the four fixture repairs, the switch was made and the suite is
**1830 / 1830 green on the engine-backed path**.

## 5. Reproducing the replay

The instrument was deleted at the switch, so reproducing the measurement
means going back to a commit that still carries it:

```
git checkout 9790b800          # the last commit carrying BOTH implementations
PAIRFLOW_V3_PARITY=1 pnpm --dir v3 exec vitest run
```

`9790b800` carries `schema/parityProbe.ts`, which writes one JSON line
per divergence to `/tmp/p3-parity.jsonl`: `{label, reference, candidate}`,
each side already rendered key-order-insensitively by the probe itself.
An EMPTY file is zero-delta; the classification in §3 is that file
grouped by whether the candidate's finding set is a superset of the
reference's (Class A), equal as a set but differently ordered (Class B),
or neither. No separate tool is needed and none is shipped — the probe
does the normalization, which is why the comparison is a `sort | uniq`
over the file rather than a program.

This is a real reproducibility cost of removing the probe, and it is the
reason the classification above is written out rather than left as "run
the harness" (arm round 1, F7: the exhaustive old↔new replay could not
be re-run from the post-switch tree).

## 6. Trajectory

Every number below is DERIVED at the moment it is written, and each one
is stamped with the commit it was measured at — a measurement without
its basis is what arm round 1's F1 and F2 caught.

**At the parity gate (2026-08-05, substrate at `3466d241`):**

- Build day 1. Arm rounds 0.
- Substrate 2426 lines raw / 1790 code-only; replaced implementation
  1366 raw / 965 code-only (`7b6bfbba`, the commit before the build).
  **1.85× on both measures — the plan §6 proportionality tripwire.**
- Corpus replayed: 1830 executed cases.

**After arm round 1's fold (2026-08-06, measured at `8d651d3f`):**

- Build day 2. Arm rounds 1.
- Substrate **2389 raw / 1741 code-only** against the same unchanged
  baseline of 1366 / 965 — **1.75× / 1.80×**. The direction of travel is
  down, and it moved because the fold DELETED declared-but-unconsumed
  data (four vocabulary attributes and most of the substrate block)
  rather than because anything was optimized.
- Suite: **1919 executed cases** in 72 files — the 1830 above plus the
  engine's own 89. The 1830 figure belongs to the parity measurement and
  is not restated as a current number.

The proportionality ruling stands as given: the ratio is re-measured at
the P4/P5 boundary, where the engine's fixed cost either amortizes over
a second surface or does not.
