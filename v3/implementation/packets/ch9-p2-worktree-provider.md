# Task Packet: ch9-p2-worktree-provider — the `pairflow.worktree` provider

Plan step: plan.md §9.4 ch9-P2 row (realizes §9.1 item 3 — the
`pairflow.worktree` provider: local git worktree mechanics behind the
ch12 L0e port, the spec's config surface, worktree/branch creation,
the opaque ref, the actor-facing projection, and the PRODUCTION
registry registration — legal here because ch9-P1 realized the
failure→`FAIL` channel first; the `l0d-pseudocode/RUNTIME_CONTEXT_READY`
candidate id resolves in this packet's slice).
Draft anchors (= the manifest's C-row ref union):
`contract:ch9-runner` rows C1/C3/C4/C5/C6/C7/C8/C9/C10/C11/C22/C26 +
`contract:ch12-runtime-core` rows C15/C16/C18. ADR-014 (the module
home), ADR-017 (the spawn-discipline stance the git invocations
adopt), and ADR-018 (the `sys:` namespace) are governing authority.

Autonomy stage: measurement — inherited from the ch9 chapter header.
**First-of-a-kind: YES** — the first REAL provider (the first
production component with external side effects on the host: git
worktrees, branches, directories). The approve is the HUMAN's
regardless of flags (R-FIRST-STOP; README §5.5), and the packet
carries flags besides (STOP `4:flagged-approve` coincides).

Plan alignment (R-ALIGNED-UP): NONE. The packet realizes the §9.4 P2
row as ratified; no ratified plan text is contradicted, so no
aligned-up edit rides this commit.

Classification: **projection** — manifest tally: 14 anchored /
14 derived / 4 new-decision (machine-counted from the `packet_rows`
block). Every anchored/derived row anchors to the ratified
ch9-runner draft, the ratified ch12-runtime-core rows it cites, or
ADR-014/017/018, or derives from those with an in-row note. The
FOUR new-decision rows are each a FLAGGED, dated decision record
riding this packet's HUMAN approve as `approve-ratified` (S4↔F1 the
unborn-HEAD placement; PB2↔F2 the synchronous-completion shape;
J3↔F4 the journey-template provenance; N5↔F5 the request-id
freshness resolution) — 4 of 32 rows, below the Case-B threshold,
none touching authority/separation/availability-class semantics.
The remaining derived rows narrow inside explicitly delegated claim
surfaces (C8's "the exact encoding is packet-time detail", C7's
provision-time config evaluation, C26's channel-reuse grain).

## Ledger slice (declared — feeds the coverage accounting)

```json
{
  "ledger_slice": {
    "units": [
      { "id": "l0d-pseudocode/RUNTIME_CONTEXT_READY", "disposition": "alias/inherited" }
    ],
    "rejections": [],
    "invariants": [],
    "traces": [],
    "shared_ownership": []
  }
}
```

The NEAR-EMPTY slice is a declaration, not an omission (plan §9.2:
the runner surfaces are adapter/runtime-side, outside the unit tree;
the claim surface is the draft's canonical contract matrices). The
ONE unit: `l0d-pseudocode/RUNTIME_CONTEXT_READY` — the sole unowned
l0d rung — resolves `alias/inherited` as plan §9.2 predicted,
CONFIRMED by authoring-time projection (both unit texts quoted in
Operative material): the realized l0e version
(`v3/src/kernel/lifecycle.ts#runtimeContextReady`, ch12-P3's
`implement` row) SUBSUMES the l0d version — same admission rungs
(terminal-sink, correlation), same `ready(ref)` commit, and the l0d
tail's immediate/deferred fork IS `activate_or_hold`'s shared fork
(the ch12-P3 D1 fold-encoding precedent: an earlier-level version
whose semantics live in a shared realized symbol aliases onto it).
The flip is a `unitMap.json` bookkeeping edit — the ALIAS itself
touches no kernel code (the packet's one kernel change is N5's
unrelated `newRequestId` composition). Rejections: no rejection-name
registry change (the `ProviderRegistry` gain is R1's separate,
deliberate act — the registry meant HERE is the drift-locked
rejection-name set; the
provisioning reasons are `FAIL` REASON PAYLOAD, ch9-P1 G1/D1; the
54-name registry stays byte-identical, drift lanes green before and
after). Invariants: none newly owned. Traces: none (§9.2: no new
ledger section trace — the executable end-to-end expectation is the
J-family journey).

## Sizing/risk (template §2 step 0 — materialized)

Predicted class: the plan §9.4 P2 row carries NO explicit
projection/invention prediction (unlike the P0/P1 rows); the
ratified-draft anchoring (C6–C11 fix every provider surface) predicts
**projection**. Discovered at authoring: **projection** (14 anchored /
14 derived / 4 new-decision — the four flagged approve-ratified
decision records, below Case B) — consistent.

Six axes: **authority movement** — NO (no canonical source of truth
moves; the provider implements an existing port; the registry is the
ratified C16 composition gaining its ratified C6 member).
**Surface spread** — counted per the ch9-P1/ch12-P3 precedent, per
concept, at the SURFACE grain (a mirrored contract face's two homes
count separately when they are distinct code surfaces): the PROVIDER
concept touches the new `providers/` adapter module + the
composition root + the kernel's ONE-function `newRequestId` change
(N5 — F5's resolution) = THREE; the C26 OBSERVABILITY concept
touches the shared diag contract face (`ports/diagnostics.ts`) +
the persisted read gate (`diag/sqliteDiagStore.ts`) + the
composition emission point = THREE. HARD STOP 2 LETTER-TRIPPED for
both — closure proofs below. Store schema, ingress, floor read
projections, CLI verb/flag payloads, and the testkit CONTRACT stay
untouched (the `cli.test.ts` re-base is a test exercising a premise
flip, not a surface; the testkit is not imported by any new
production code). **Identity/join fragility** — NO (the worktree naming is a
within-provider derivation; no cross-store join consumer exists at P2
— attach's ledger-based resolution is ch9-P4's). **Foundation +
activation coupling** — TOUCHED, by ratified design: this packet both
ships the provider and turns it on (registration + journey). The
coupling is the CHAPTER's cut: the D5 gate made ch9-P1 the foundation
packet, and C6 ratifies registration as legal exactly here; hard
stop 1 needs authority movement (absent) and hard stop 3 needs an
UNFINISHED prerequisite (ch9-P1 is committed and green —
`14be9b3f` + aftermath `aeae92d4`). **Prerequisite coupling** — NO
(all prerequisites landed: ch9-P0, ch9-P1, ch12-P3; and hard stop 3
does NOT fire on the ADR-017/C19 seam question — the provider's git
spawns are functionally COMPLETE under M4's own discipline without
the shared C19 spawn module: that seam is ch9-P3's build for its
two ratified consumers, and the provider's fold-in is a REFACTOR
obligation carried as M4's machine-counted `DEFERRED(ch9-p3)`
marker, never a functional dependency of this activation).
**Acceptance
multiplicity** — provider behavior + the activation journey + diag
lanes, all proven on ONE proof surface (`pnpm v3:test` families +
the v3 bridges; full `ci:local` at close).

**Single-packet allowed: yes — both letter-trips closure-proven.**
PROVIDER-concept closure: the provider module, the composition
edit, and the one-function kernel change are ONE compile-linked
bounded change (the kernel change has zero signature impact — the
id STRING composition only; every consumer treats ids opaquely, the
ch12-P3 freshness lanes stay green unchanged), validated by ONE
proof surface (`pnpm v3:test` + the journey); no per-consumer
sequencing exists. OBSERVABILITY-concept closure: the diag type
face, the read gate, and the emission wrapper land as ONE
compile-linked change — the store's type-synced key allowlist
forces emit/read lockstep at the compiler, so the two mirrored
homes cannot be sequenced apart; one proof surface drives all
three. The journey is proof surface, not a consumer family; no
separate compatibility/recovery/ordering risk is introduced
(teardown, health, and retry stay named Absents; the
errand/delivery machinery is ch9-P3's). No escalation combo fires
beyond the two proven letter-trips. Consume-family scan: not run —
no authority movement, no shared-result-shape change (the diag face
growth is additive at token grain, the ch12-P1b
`IngressDetailToken` precedent).

Conditional annexes (template §2's triggered records, compact):

- **Closure-budget triage:** buckets in scope — runtime activation
  (the registry join), the shared diag contract face, its persisted
  read gate. Intentionally collapsed: diag type + read gate +
  emission wrapper as one compile-linked change (safe — the
  type-synced allowlist makes the compiler the sequencer); provider
  + registration + journey as one activation slice (safe — the D5
  gate's foundation half landed at ch9-P1). Explicitly deferred:
  the C19 shared-seam extraction (ch9-P3, the M4 marker);
  teardown/health/retry (named Absents).
- **Proof-boundary triage:** success/completion proof semantics
  UNCHANGED — the committed instance row (READY ref / terminal
  FAIL) is the sole canonical proof source before and after; the
  C26 events are declared non-authoritative history (DG1), so no
  surface goes mixed-truth; no reused proof contract needs parity
  (the journey is a new proof artifact).
- **Mutable-flow record:** evaluation-phase failure produces ZERO
  host side effects (S2/S3 — every check precedes the first
  mutating invocation); create-phase failure leaves orphans BY
  DESIGN (the named Absent, N4); no rollback/retry/lease/lock
  primitive is introduced (retry machinery is ch9-P3's errand
  world); the crash-window discipline is N5's id freshness, never a
  coordination primitive.

## Operative material (full text — projection, not invention)

The semantic source is the ratified `ch9-runner` contract (2026-07-23,
commit `5c68f206`; C7/C10 amended by the same-day reopen act —
content `09825f78`, re-ratified `4db149b1`). The provider rows —
verbatim NORMATIVE bodies
(the ratified rows' trailing `DECIDED HERE …` provenance clauses are
elided where present; decision provenance lives in the draft, never
re-decided here):

> **C6** | The production `ProviderRegistry` gains `pairflow.worktree`
> at ch9 (the ch12-C16 successor): the join is LEGAL because the
> failure→FAIL channel (C1–C5) is ratified with this draft and
> REALIZED by the packet ORDERED BEFORE the registration packet (plan
> §9.4: P1 before P2) — the ch12-C15 D5 production-provider gate
> discharges by packet ordering; every FUTURE registry member remains
> bound by the same gate shape (channel realized before registration).
>
> **C7** | The `pairflow.worktree` spec grammar: `kind = "worktree"`;
> `config` is a CLOSED keyset — `repo` (required; absolute path to the
> host git repository), `base` (optional committish; default = the
> repo's HEAD at provision time), `dir` (optional worktree parent
> directory; default `<repo-parent>/.pairflow-worktrees/<repo-name>`
> — OUTSIDE the repository's working tree, the v1-validated sibling
> placement (v1 `bubblePaths` and omnigent's `git_worktree.py`
> independently converged on parent-of-repo placement): host-repo
> `git clean`/`git status` and tree-wide tooling can never touch or
> see live worktrees, and provisioning FROM a linked worktree cannot
> nest a worktree inside a working tree). Admission still
> validates SHAPE only (ch12-C16's asymmetry, cited); the provider
> evaluates the config AT PROVISION — an unknown config key, a
> missing/relative `repo`, or a non-repository `repo` is
> `FAILED(sys:provision_rejected)`.
>
> **C8** | Worktree identity is keyed by BOTH ids: directory
> `<dir>/<enc(instance_id)>--<enc(request_id)>` and branch
> `pairflow/<enc(instance_id)>/<enc(request_id)>`, where `enc` is a
> SANITIZING, INJECTIVE, host-safe encoding (ids are arbitrary
> nonempty strings at ingress; a raw id is NEVER a filesystem-path,
> git-ref, or tmux-session component: `../escape` traversal and
> ref-illegal characters are the K4 host-effect class, ADR-017's
> stance): the claim surface is injectivity — with the composite
> delimiters `--` and `/` RESERVED outside enc's output, so composed
> names cannot alias — plus path/ref/session-safety (the exact
> encoding is packet-time detail under this claim); an over-length
> component (an injective encoding cannot truncate; the substrate's
> NAME_MAX/ref limits bind) degrades LOUD — git fails nonzero (the
> P1b/P1c basis) → `FAILED(sys:provision_failed)`, never silent — so
> the ch12-C18 crash-retry window's DELIBERATE duplicate provisioning
> (a fresh `request_id` per re-run) can never collide (P1b/P1c prove
> git fails loud on collision — a collision therefore surfaces as
> `FAILED(sys:provision_failed)`, never silent reuse); superseded
> worktrees persist as orphans (teardown is the named Absent; the
> floor makes them findable via the ref).
>
> **C9** | Provisioning mechanics: the worktree is created with a NEW
> branch at `base` (P1a; the at-committish form P1h); a dirty host
> repository does NOT block provisioning (P1d); provisioning from a
> host that is itself a linked worktree works (P1e) and is NOT
> rejected. The provider's git invocations run with an explicit
> working directory (`repo`) and NEVER touch the host repo's index or
> checked-out tree.
>
> **C10** | The ref (opaque to the kernel, ch12-C18's kind-boundary
> cited): `{ kind: "worktree", locator: { path, branch, repo,
> base_commit } }` — canonical-JSON-safe values only. The actor
> projection (`project_for_actor`): `{ kind: "worktree", path,
> branch }` — the projection CARRIES only these fields; the
> kernel-side `repo` and `base_commit` ref fields are not propagated.
> This is FIELD OMISSION, not confinement (the substrate leaks both
> to a curious actor: the default `dir` places the worktree beside
> the host repo so `path` embeds the repo's parent path and name,
> the linked worktree's `.git` backpointer names the host repo, and
> `git rev-parse HEAD` in the fresh worktree equals the base commit) — actor-side secrecy of the host repo is
> NOT a boundary this chapter claims (the trusted-local-host stance,
> ADR-017).
>
> **C11** | The worktree provider's detach acknowledgment is
> UNCONDITIONAL: `provision()` accepts and detaches for every
> shape-valid call; EVERY provisioning failure — config rejection
> included — travels the FAILED channel (C1–C5). The ch12-C18
> pre-commit port-breach lane remains reserved for genuine
> programming errors, never used for business/config failure. Packet
> ownership splits at the seam: the CHANNEL half (the
> unconditional-detach obligation as port contract) is ch9-P1's, the
> worktree provider's own failure ROUTING onto it is ch9-P2's.
>
> **C3** | The provisioning-failure `reason` domain is a CLOSED,
> kernel-owned enum — at ch9 exactly two members:
> `sys:provision_rejected` (the provider determined the spec/config
> cannot be honored — e.g. missing or non-git `repo`) and
> `sys:provision_failed` (the provisioning mechanics failed — e.g. a
> git command's nonzero exit, P1b/P1c). Members grow ONLY by contract
> successor rows; the domain is validated at the completion's own
> transport gate (C5).
>
> **C26** | Runner-plane observability rides the EXISTING diagnostic
> channel (ch7 structured kernel log + audit stream, cited — a
> BEST-EFFORT, fail-open, non-authoritative channel by its own
> ratified contract): every errand state transition, every
> provisioning completion (both kinds), and every spawn outcome emits
> a structured diagnostic event. The authority split is honest: the
> errand LEDGER is the authoritative runner-plane CURRENT state; the
> diagnostic stream is best-effort HISTORY (events may be lost on
> channel failure — no full-history reconstruction is claimed); no
> new observability machinery is minted.

The realized-at-P1 channel rows this packet ROUTES ONTO — C1 (the
FAILED completion + at-most-one completion per request), C4 (`detail`
= optional untrusted free text, confined), C5 (transport rules + the
reason-domain gate) — are cited as ch9-P1's realized surface
(`packets/ch9-p1-fail-channel.md` W/F/G/SM families), not restated:
this packet is their first production CALLER, never a re-realization.

### Delegated sources expanded (R-DELEGATION-CLOSURE)

- **The registry composition (ch12-C16):** "`ProviderRegistry`
  composition is STATIC, INJECTED at the composition root, and
  PER-CHAPTER … Resolution timing is START-ONLY (the
  `provider-resolved-at-start` invariant …: admission validates the
  spec map's SHAPE, never resolves the name); `dispatch_intent`'s
  re-resolve of the SAME pinned provider is a kernel/config INVARIANT
  throw when it fails (`registry-stable-for-the-run`), never a
  business rejection." The registration edits the composition root's
  member map ONLY — no resolution-timing or admission surface moves.
- **The detach acknowledgment + provision order (ch12-C15/C18):**
  "`provision(instance_id, request_id, spec)` — async … the awaited
  fulfillment is the DETACH ACKNOWLEDGMENT … NEVER the completion";
  START calls "`provision(...)` FIRST (… an external async call,
  necessarily OUTSIDE any store transaction), then the
  `requested(request_id)` marker + the `STARTED` fact committed in
  ONE atomic move". The held-completion release rule (ch12-C15, via
  ch9-P1 SM1): a completion fired synchronously inside `provision()`
  is HELD and delivered when the initiating START attempt CONCLUDES —
  never dropped, never mid-attempt.
- **The crash-retry window (ch12-C18):** "a re-run then provisions
  AGAIN under a FRESH `request_id`, the superseded request's READY
  failing correlation (inert): duplicate provisioning across that
  crash/retry window is the DELIBERATE provider-side cost (teardown
  is the named Absent), never a kernel-state hazard."
- **The projection gate (ch12-C15):** the ref and the projection are
  "CANONICAL-JSON-SAFE VALUES BY PORT CONTRACT … a violating provider
  return is a kernel/config INTEGRITY throw … the projection at the
  `project_for_actor` RETURN, at dispatch time, before it enters the
  packet."
- **The spawn discipline (ADR-017, Decision):** explicit `cwd`
  always; env allowlist fail-closed ("the child receives ONLY the
  composition-declared allowlist …"); composition-configured timeout
  as SIGTERM with bounded-grace SIGKILL escalation; captured stdio;
  a missing binary is a distinct infra lane. The ADR's scope sentence
  — "ONE spawn discipline serves every runner-plane spawn (actor
  adapter + process-gate runner + any future spawning component)" —
  is what M4 applies to the provider's git child processes.

### The unit texts (verbatim — the U1 alias projection's basis)

`l0d-pseudocode/RUNTIME_CONTEXT_READY`:

```text
RUNTIME_CONTEXT_READY(instance, request_id, runtime_context_ref) → Outcome   # kernel_event (v1: workspace/worktree ready)
  REQUIRE admit_loaded(instance, expect: {
    state:     kernel_status ≠ TERMINAL,                       # ADMISSION: state rung — terminal is a sink (a late READY after CANCEL/FAIL must not resurrect the run)
    correlate: runtime_context = requested(request_id) })      # correlation rung — the readiness for the request WE issued
  instance.runtime_context ← ready(runtime_context_ref)    # opaque ref { kind, locator }; v1 kind=worktree { path, branch, repo }
  IF instance.activation_mode = immediate THEN RETURN activate(instance)
  instance.kernel_status ← WAITING                             # deferred_kickoff: hold for an operator kickoff
  instance.wait ← { kind: kickoff_pending, requested_by: "activation", resume_events: [KICKOFF] }
  RETURN Accepted
```

`l0e-pseudocode/RUNTIME_CONTEXT_READY` (the realized version,
ch12-P3 `implement` at `kernel/lifecycle.ts#runtimeContextReady`):

```text
RUNTIME_CONTEXT_READY(instance, request_id, runtime_context_ref) → Outcome   # kernel_event (v1: workspace/worktree ready)
  REQUIRE admit_loaded(instance, expect: {
    state:     kernel_status ≠ TERMINAL,                       # ADMISSION state rung (L0d) — terminal is a sink (a late READY after CANCEL/FAIL must not resurrect the run)
    correlate: runtime_context = requested(request_id) })      # correlation rung — the readiness for the request WE issued
  template ← definitionStore.load(instance.template_ref)
  requirement ← template.runtime_context
  REQUIRE requirement = required(spec)                       # a request was issued ⇒ a context is required (made explicit)
  REQUIRE runtime_context_ref.kind = spec.kind              # L0e kind-boundary — a provider may only return a ref of the requested kind
  instance.runtime_context ← ready(runtime_context_ref)    # kernel guards kind + correlation only; the locator stays provider-defined, unvalidated
  RETURN activate_or_hold(instance)
```

The l0e version adds the template bind + kind boundary and routes the
tail through `activate_or_hold` — the SAME immediate/deferred fork
the l0d tail spells inline. One realized symbol carries both
versions' semantics; the l0d row aliases onto it (U1).

### Substrate probes (2026-07-23, in-session; script + outputs in the
session scratchpad `ch9p2-probes/` — git 2.x on darwin, APFS)

The draft's probes P1a–P1h (worktree add mechanics, collision
loudness, dirty-host, linked-worktree host, at-committish form) are
the ratified basis for M1/M2/N4 and are not re-run. NEW cells this
packet's matrices rest on, probed now:

| Probe | Question | Observed |
|---|---|---|
| P4a | over-length branch/leaf component (300 chars) | `fatal: cannot lock ref … File name too long`, exit 255 — LOUD (N3) |
| P4b | `git worktree add` under a minimal env (`PATH` only, no `HOME`) | exit 0 — the M4 allowlist is viable |
| P4c | `worktree add -b` on an unborn-HEAD repo (zero commits) | exit 0 — the ADD itself does NOT fail; the failure lane is `base_commit` RESOLUTION (P4e), which is why S2 rejects at evaluation |
| P4d | worktree created at a dir INSIDE the repo tree (the explicit-`dir` edge; the pre-amendment default — C7's amended default now places outside) | exit 0; host `git status --porcelain` shows only untracked `?? .pairflow-worktrees/` — index/tracked tree untouched, and git creates the nested parent chain (M1's basis; the residual pollution note is flag F3) |
| P4e | `git rev-parse --verify <committish>^{commit}` — HEAD / bogus | exit 0 with the sha / exit 128 `fatal: Needed a single revision` — the S2 base-resolution lane's mechanism |
| P4f | `git -C <plain dir> rev-parse --git-dir` | exit 128 `fatal: not a git repository` — the S2 non-repository determination |
| P4g | filesystem case sensitivity at the scratchpad mount | case-INSENSITIVE (`a` == `A`) — the N2 lowercase-output motivation (context probe) |
| P4h | partial state after the P4a over-length failure | zero worktree directories left; git self-cleaned (context probe — N3's loud-degradation leaves no half-provisioned dir on this lane) |
| P4i | root identity: `rev-parse --git-dir` and `--show-toplevel` from a repo SUBDIRECTORY; `--show-toplevel` from a linked worktree | `--git-dir` exits 0 from the subdir (the check S2(d) alone would PASS a non-root `repo`); `--show-toplevel` returns the ROOT ≠ subdir (S2(i)'s mechanism); a linked worktree's toplevel is ITSELF (C9's linked-host lane stays legal); `--show-toplevel` returns a REALPATH (symlink-resolved) — S2(i)'s comparison realpath-normalizes `repo` first |
| P4j | realpath resolution failure: `fs.realpathSync` on a nonexistent path | throws `ENOENT` with a message naming the path (`no such file or directory, lstat …`) — the grid's realpath-row failure shape and its detail source (PB3's fs-site source class) |

## Claim

The shipped system can provision a REAL runtime context end-to-end,
and can no longer silently hang on one: a spec-declaring template
started through the SHIPPED CLI either yields a provisioned,
branch-isolated git worktree — created at the declared base, named by
the C8 identity scheme with no raw id ever reaching a host surface,
committed as a correlated READY ref whose actor projection carries
exactly `{kind, path, branch}` — or the run lands TERMINAL `failed`
through the ch9-P1 channel with a C3-classified `sys:` reason,
floor-visible; nothing else. Concretely: (1) the production
`ProviderRegistry`'s sole member is `pairflow.worktree` (the C6
join, legal because the P1-realized channel is in the tree this
packet builds on), composed at the composition root with the
completion sink bound to `Kernel.deliverCompletion`; (2) the
provider evaluates its config AT PROVISION against C7's closed
keyset and rejects what it cannot honor as
`FAILED(sys:provision_rejected)`, classifies provisioning-mechanics
failures as `FAILED(sys:provision_failed)`, and NEVER throws for
business/config failure (C11's routing half — `provision()` has no
exit that neither fires exactly one completion nor is the reserved
programming-error port breach); (3) the worktree identity is
injective and host-safe under the ACTUAL host substrate
(case-insensitive name folding and ill-formed Unicode included),
over-length and collision degrade loud, a crashed attempt's orphan
can never SILENTLY collide with its retry (N5's real-clock-fresh
request ids; the same-millisecond residual fires the loud lane),
orphans persist as the named Absent; (4) the git
invocations run under the ADR-017 discipline (explicit `repo` cwd,
env allowlist, bounded timeout, captured stdio — the stderr tail
feeding C4's confined `detail`), and never touch the host repo's
index or checked-out tree — live worktrees themselves living BESIDE
the repo by the amended C7 default, outside every working tree; (5) every provisioning completion (both
kinds) emits a `source: "runner"` structured diagnostic event
through the existing ch7 channel (C26's provisioning half — the
emission point is the composition's sink wrapper, the kernel's own
diag culture unchanged), with the untrusted `detail` confined to the
diag surface; (6) the whole path is proven as an ACTIVATION JOURNEY
through the shipped CLI subprocess — one READY journey to a real
worktree and one FAILED journey to a visible `sys:provision_rejected`
terminal — production bindings, zero test seams.

Dimensions (enumerated before test rows — R-DIMENSIONS):

1. **Spec/config evaluation** (S family) — grammar, closed keyset,
   defaults, the per-key rejection lanes, the rejected-vs-failed
   phase line.
2. **Naming/identity** (N family) — the composite identity, the
   encoding's binding properties, over-length, collision, orphans.
3. **Git mechanics** (M family) — creation at base, host-state
   non-interference, the spawn discipline.
4. **Port behavior** (PB family) — routing totality, exactly-one
   completion, the synchronous-completion shape, `detail`.
5. **Ref + projection** (RP family) — locator shape, projection
   field omission, `projectForActor` integrity.
6. **Registration/composition** (R family) — the C6 join, sink
   binding, the shutdown drain, dev/testkit non-change.
7. **Types/ripple** (T family) — the measured empty-registry-premise
   consumer sweep.
8. **Diag events** (DG family) — the C26 provisioning half: event
   shape, emit/read parity, emission point, confinement.
9. **Unit/coverage/drift** (U family) — the alias flip, ledger
   byte-identity, registry non-change.
10. **The activation journey** (J family) — R-ACTIVATION-JOURNEY's
    obligation, READY and FAILED lanes.

R-NUMERIC-LADDER does not fire: no new validator over a numeric
domain (config values are string-typed; the timeout/grace values are
provider-internal knobs, not validated input domains).
R-ACTIVATION-JOURNEY FIRES (the J family): this packet wires the
previously-built provisioning foundation (ch12-P3 + ch9-P1) into a
live path reachable from the shipped `start` entrypoint. The
provisioning path is deterministic (git; no actor spawns exist at P2
— the adapter is ch9-P3's), so the journey needs no actor stub.

## Canonical matrices

### S — spec/config evaluation

| Id | Rule | Class |
|---|---|---|
| S1 | The spec grammar: `kind = "worktree"`; `config` is the CLOSED keyset { `repo` required — absolute path to the host git repository; `base` optional committish, default = the repo's HEAD resolved AT provision time; `dir` optional worktree parent directory, default `<repo-parent>/.pairflow-worktrees/<repo-name>` — OUTSIDE the repository's working tree (the amended C7 default: the v1/omnigent-validated sibling placement) }. Admission stays SHAPE-only (ch12-C16's asymmetry — this packet changes no admission surface); the provider evaluates the config AT PROVISION (anchored: contract:ch9-runner#C7) |
| S2 | The config-evaluation rejection matrix — every lane `FAILED(sys:provision_rejected)`, evaluated BEFORE any host mutation: (a) `spec.kind ≠ "worktree"` (the grammar's kind row — the registry routes by provider NAME, so a foreign kind can arrive); (b) `config` absent or `repo` missing; (c) `repo` not a string, or a relative path; (d) `repo` not a git repository (`git -C repo rev-parse --git-dir` nonzero — probe P4f); (e) an unknown config key (C7's closed keyset); (f) `dir` present but not a string or not absolute; (g) `base` present but not a string; (h) `base` (or the defaulted HEAD) unresolvable to a commit (`git rev-parse --verify <base>^{commit}` nonzero — probes P4e/P4c; the unborn-HEAD DEFAULT sub-lane is S4's decided record); (i) `repo` is INSIDE a repository but is NOT its working-tree ROOT — the ROOT-IDENTITY check: the REALPATH-NORMALIZED `repo` (symlink-resolved — `--show-toplevel` itself returns a realpath, so a lexical-only comparison would falsely reject a legitimately-rooted repo reached via a symlink, e.g. the macOS `/tmp` → `/private/tmp` case) must equal `git -C <repo> rev-parse --show-toplevel`; a REALPATH-RESOLUTION FAILURE (e.g. ENOENT on a vanished path) is the same evaluation-phase `sys:provision_rejected` class as (c)/(d) — the fs call is an evaluation check, not a spawn, and its detail source is the fs error's message (the grid's realpath row) (probe P4i: `--git-dir` alone PASSES from a subdirectory, so without this lane a `repo=<root>/subdir` config would derive the default `dir` INSIDE the host working tree, breaking the amended C7 guarantee; `--show-toplevel` returns the root, and a linked worktree's root is ITSELF — the C9 linked-host lane stays legal). Lanes (f)/(g) and the kind lane (a) NARROW beyond C7's example list under C3's rejected-class definition ("the spec/config cannot be honored") — carried as pre-approval flag F1 (derived: contract:ch9-runner#C7 + contract:ch9-runner#C3 — DERIVATION: C7 fixes the closed keyset, the required/absolute `repo`, and the evaluated-at-provision rule with a non-exhaustive example list; the per-key lanes instantiate C3's rejected class over that keyset; the base-resolution lane is forced by C10's `base_commit` ref field, which cannot be populated from an unresolvable committish; the root-identity lane (i) is C7-literal — "absolute path to the host git repository" names the repository, and a subdirectory is not it; within (h) the unborn-HEAD DEFAULT sub-lane is S4's decided record) |
| S4 | THE DECIDED PLACEMENT (the dated decision record — flag F1): a valid repository whose `base` DEFAULTS to HEAD and whose HEAD is UNBORN (zero commits) rejects at EVALUATION as `sys:provision_rejected` — the substrate would let `worktree add -b` itself succeed on an unborn HEAD (probe P4c), so the placement is a CHOICE, not an entailment: the evaluation phase cannot populate C10's `base_commit`, and rejecting there keeps every create-phase failure a mechanics failure (new-decision — flag F1's record, ratified by this packet's human approve) |
| S3 | The rejected-vs-failed PHASE LINE, drawn ONCE (the R-STRUCTURE-SEMANTICS discipline): the provider's execution has exactly TWO phases — EVALUATION (config checks + base resolution; no host mutation) and CREATE (the `git worktree add` invocation and any later step). The phase line classifies NONZERO GIT EXITS: evaluation-phase nonzero (the config cannot be honored on this host) → `sys:provision_rejected`; create-phase nonzero → `sys:provision_failed`. INFRA SHAPES — a timeout kill, a spawn error (ENOENT), a synchronous spawn-setup throw — are `sys:provision_failed` in EVERY phase: a host unable to RUN git is a mechanics failure, never a config verdict (the failure grid below states every site × shape × phase cell). The phase boundary is the first host-mutating git invocation. C3's own examples sit on this line (missing/non-git repo → rejected; a git command's nonzero exit at create → failed) (derived: contract:ch9-runner#C3 + contract:ch9-runner#C7 — DERIVATION: C3 defines the two members by "cannot be honored" vs "mechanics failed"; the nonzero-exit phase line is the unique placement consistent with both rows' example sets, and routing infra shapes to `provision_failed` phase-independently follows C3's mechanics definition directly — the classification is decidable at every failure site via the grid) |

The provisioning failure grid (site × shape × phase — every non-n/a
cell driven, the driving family named per cell; the two n/a cells
carry their rule-out reason in the site column; the three git-spawn
sites' nine cells are all reachable):

| Site (phase) | nonzero exit | timeout kill | spawn-infra (ENOENT / sync setup throw) |
|---|---|---|---|
| realpath normalization (evaluation; an fs call, NOT a git spawn — the exit/timeout/spawn shapes do not apply, its one failure shape is the fs error) | `sys:provision_rejected` — S2 (i)'s realpath-failure clause (detail = the fs error's message, probe P4j) | n/a — no child process | n/a — no child process |
| repo-root + repository check (evaluation) | `sys:provision_rejected` — S2 (d)/(i) | `sys:provision_failed` — S3/M4 | `sys:provision_failed` — S3/M4 |
| base resolution (evaluation) | `sys:provision_rejected` — S2 (h) (unborn default: S4) | `sys:provision_failed` — S3/M4 | `sys:provision_failed` — S3/M4 |
| worktree add (create) | `sys:provision_failed` — N3/N4/M1 | `sys:provision_failed` — M4 | `sys:provision_failed` — M4 |

Every non-n/a cell fires exactly ONE FAILED completion (PB1's
totality — the grid IS the collapsed lane's declared membership at
spec grain: three git-spawn sites × three shapes = nine cells, all
reachable, plus the realpath fs-site's single failure shape; the
build enumerates the code's throw sites onto these cells).

### N — naming/identity (the C8 scheme)

| Id | Rule | Class |
|---|---|---|
| N1 | Worktree identity is keyed by BOTH ids: directory `<dir>/<enc(instance_id)>--<enc(request_id)>`, branch `pairflow/<enc(instance_id)>/<enc(request_id)>`. A raw id NEVER appears as a filesystem-path or git-ref component; the composite delimiters `--` and `/` are RESERVED outside `enc`'s output, so composed names cannot alias (anchored: contract:ch9-runner#C8) |
| N2 | `enc`'s BINDING PROPERTIES (the claim surface; C8 delegates the exact encoding to packet time): (i) INJECTIVE under the HOST substrate's name folding — the scratchpad mount is case-insensitive (probe P4g), so two ids differing only by letter case MUST map to distinct folded names; (ii) SANITIZING — output is host-safe for filesystem paths and git ref components (no traversal, no ref-illegal bytes); (iii) the reserved delimiters are unexpressible in output (`/` never; `--` never as a substring); (iv) enc of a nonempty id is nonempty. REFERENCE REALIZATION (UTF-16 CODE-UNIT grain — ids are JS strings and may be ILL-FORMED Unicode; a byte-grain UTF-8 encoding would ALIAS a lone surrogate with U+FFFD, both serializing to the replacement bytes): output alphabet `[a-z0-9_]` — a code unit whose character is in `[a-z0-9]` passes through; EVERY other code unit (uppercase, `_`, multibyte, and lone surrogates included, closing (i) by construction) encodes as `_` + exactly FOUR lowercase hex digits of the unit value (`\uD800` → `_d800`, `�` → `_fffd` — distinct by construction). Injective over ARBITRARY JS strings (fixed-width escape, raw output chars never `_`), all-lowercase (case-fold-stable), and `-`/`/`/`.` are unexpressible. An equivalent realization is admissible PROVIDED properties (i)–(iv) hold — the property set, not the byte mapping, is what the tests drive; a changed mapping strands only orphans (the named Absent). READING RULE (packet-wide): every mention of `enc` reads as the reference realization with this property-level substitutability (derived: contract:ch9-runner#C8 + prose:probe P4g (case-insensitive host) — DERIVATION: C8 fixes the property claim and delegates the spelling; the lowercase-only escape alphabet is the minimal realization in which host-fold injectivity holds by construction rather than by substrate assumption) |
| N3 | Over-length degrades LOUD: an enc output exceeding the substrate's NAME_MAX/ref limits makes git fail nonzero (probe P4a: `cannot lock ref`, exit 255) → `FAILED(sys:provision_failed)`, never silent truncation (an injective encoding cannot truncate); the failed lane leaves no half-provisioned worktree directory on this path (probe P4h — context, not a claimed invariant of every failure lane) (anchored: contract:ch9-runner#C8) |
| N4 | Collision degrades LOUD (the draft's P1b/P1c basis: existing branch exit 255, existing non-empty dir exit 128) → `FAILED(sys:provision_failed)`, never silent reuse — so the ch12-C18 crash-retry window's deliberate duplicate provisioning (a FRESH `request_id` per re-run) can never collide SILENTLY — the claim's two halves, stated precisely: silent reuse is impossible BY CONSTRUCTION (any collision fails loud on this lane); collision itself is PRACTICALLY excluded by N5's cross-process id freshness (real-clock composition), whose stated residual — a same-millisecond restart — lands on THIS loud lane, never on reuse (exactly C8's own structure: "a collision therefore surfaces as FAILED, never silent reuse"). Superseded worktrees PERSIST as orphans: teardown is the named Absent; the floor makes them findable via the committed ref (anchored: contract:ch9-runner#C8 + contract:ch12-runtime-core#C18) |
| N5 | CROSS-PROCESS REQUEST-ID FRESHNESS (the dated decision record — flag F5, the resolved contested-ratified-vs-reality STOP): the kernel's `newRequestId` composes the injected TimeSource with the in-process counter — `req-<epochMillis>-<n>` — so a request id is fresh across process restarts ON A REAL CLOCK (a SCOPED claim, not an absolute: a restart within the SAME millisecond re-mints the same first id — that residual lands on N4's LOUD collision lane, never on silent reuse). The one-shot shipped CLI builds a kernel per process; a bare per-kernel counter restarts at 1, and a crash between worktree creation (PB2 runs it pre-commit) and the marker commit would make the retry RE-MINT the crashed attempt's id — colliding with its own orphan and terminally failing the run, falsifying N4's freshness premise. The composition is deterministic under the testkit's controlled clock (the CHK-noRandom seam untouched), and the counter suffix keeps same-millis in-process attempts distinct (the ch12-P3 per-attempt freshness lanes stay green unchanged). Driven by a crash-window lane: an orphan worktree pre-created at a PRIOR kernel's id names cannot collide with a fresh kernel's retry (new-decision — flag F5's record) |

### M — git mechanics

| Id | Rule | Class |
|---|---|---|
| M1 | Provisioning creates the worktree with a NEW branch AT `base`: `git worktree add <path> -b <branch> <base_commit>` (the draft's P1a/P1h basis), where `base_commit` is the EVALUATION-phase resolution of `base` (or the defaulted HEAD) to a commit sha — the SAME value the ref's `base_commit` field carries (C10), resolved ONCE, so the ref records exactly what the worktree was created at. Parent directories of `<dir>` are created as needed (probe P4d: git creates the nested default path) (anchored: contract:ch9-runner#C9 + contract:ch9-runner#C7 + contract:ch9-runner#C10) |
| M2 | Host-state tolerance: a DIRTY host repository does not block provisioning (P1d), and a host that is itself a linked worktree provisions fine and is not rejected (P1e) — both are DRIVEN lanes, not merely documented (anchored: contract:ch9-runner#C9) |
| M3 | Host non-interference: every git invocation runs with the explicit working directory `repo` (never the spawning process's cwd), and the provider NEVER touches the host repo's index or checked-out tree — driven by asserting the host's `git status --porcelain` and index are UNCHANGED by a provision — under the amended C7 default the assert is clean and unqualified (worktrees land beside the repo, outside its working tree); an EXPLICIT in-repo `dir` stays legal and then shows only the untracked entry (probe P4d — the F3 residual) (anchored: contract:ch9-runner#C9) |
| M4 | The git invocations adopt the ADR-017 spawn discipline — the provider is a runner-plane spawning component under the ADR's "every runner-plane spawn" scope: explicit `cwd` (= M3's `repo`), a fail-closed ENV ALLOWLIST (default `{PATH}` — probe P4b proves `git worktree add` succeeds under PATH-only env; factory-configurable for hosts needing more), captured stdio (stderr feeds PB3's `detail` tail), and a bounded timeout (default 30 s, factory-configurable) delivered as SIGTERM with the ADR's bounded-grace SIGKILL escalation — a timeout kill or spawn-infra error (ENOENT) is `sys:provision_failed` in EVERY phase (S3's infra rule; the grid); the SIGTERM-then-SIGKILL escalation is DRIVEN (a TERM-ignoring child killed at the grace default 10 s — factory-configurable, the ADR's dial). The C19 shared spawn SEAM (actor adapter + process-gate runner) is ch9-P3/P4's build; this packet applies the ADR's discipline PROPERTIES to its own git spawns without claiming that seam, and the provider's spawn code carries the machine-counted pointer `DEFERRED(ch9-p3): fold into the shared C19 spawn seam` — P3 births the seam and this discipline folds into it, closing ADR-017's one-enforcement-point intent without making the seam a functional prerequisite here (derived: ADR-017 + contract:ch9-runner#C9 — DERIVATION: ADR-017's decision clause scopes to every runner-plane spawn and any future spawning component; C9 fixes the explicit-cwd half; the allowlist/timeout/captured-stdio items instantiate the ADR's four decision items on the git child processes, viability probed at P4b; the discipline PROPERTIES flow from the anchors — the default VALUES (30 s, `{PATH}`) are provider knobs below contract grain, and the build confirms no git leg silently needs `HOME`/`GIT_*` beyond P4b's coverage) |

### PB — port behavior (the C11 routing half)

| Id | Rule | Class |
|---|---|---|
| PB1 | Routing TOTALITY + exactly-one completion: `provision()` accepts and detaches for EVERY shape-valid call and fires EXACTLY ONE completion per `request_id` — `ready(ref)` on success, `failed(reason, detail?)` on every provisioning failure, config rejection included (the S2/S3 lanes are the declared failure membership); NO business/config failure ever surfaces as a throw. The totality claim is PARAMETERIZED (R-CLAIM-GRAMMAR): every member of the declared failure inventory — the S2 evaluation lanes + the CREATE-phase members (nonzero exit, timeout kill, spawn-infra/ENOENT) — maps to exactly one FAILED completion; at build the collapsed lane is enumerated FROM THE CODE (every throw site in the provider body, its helpers, and every awaited spawn boundary — each mapped to a completion or explicitly the port-breach programming-error class) per the write-time inventory discipline. The ch12-C18 port-breach lane (a synchronous throw / a pre-detach rejection) stays RESERVED for programming errors — the provider's own defect class, never reachable from hostile config (anchored: contract:ch9-runner#C11 + contract:ch9-runner#C1) |
| PB2 | The SYNCHRONOUS-COMPLETION shape: the provider performs the FULL provisioning INSIDE `provision()` — evaluation, create, completion fire through the bound sink — and only then fulfills the detach acknowledgment. The fired completion is therefore HELD by the seam (ch9-P1 SM1's ratified path — the scripted player's timing, now production's) and flushed at the START attempt's conclusion, INSIDE the initiating `start()` call: by the time the shipped one-shot CLI's `start` verb returns its outcome, provisioning has CONCLUDED and the run is READY-committed or TERMINAL-failed. This is what makes the chapter's no-silent-hang business invariant TRUE under ch9's process model (a one-shot CLI process; the detached-async home — `runner run` — is ch9-P4's): a truly-async provider here would race process exit and strand the run `CREATED`+`requested`. The seam absorbs both timings by ratified design, so a later provider MAY be async under a resident process; nothing in this row forecloses that (new-decision — flag F2's record, ratified by this packet's human approve; the rationale: C5/SM1 ratify the held synchronous-fire path explicitly, C18 fixes provision-before-commit and the conclusion flush, and among the ratified-legal timings the synchronous shape is the one under which the one-shot shipped CLI cannot strand an in-flight provisioning — a TIMING CHOICE within a seam that absorbs both timings by design) |
| PB3 | `detail` on a FAILED completion: populated from the failing step's stderr (or the infra error's message), BOUNDED to a tail (last 2 000 code units — a provider-grain cap keeping the wire value a plain short string), OPTIONAL — present iff the SELECTED SOURCE is nonempty, PER SITE CLASS: a git spawn's captured stderr tail; a spawn-infra failure's error message (an ENOENT carries no stderr but does carry a message); the evaluation fs-site's (realpath, S2(i)/the grid's realpath row) error message; an empty-stderr nonzero exit yields NO detail — and by C4 untrusted, confined to the diag/audit surface, never parsed, never matched, never in `failure_reason` (the P1-realized G3 gate enforces string-ness; this packet only PRODUCES the value) (derived: contract:ch9-runner#C4 — DERIVATION: C4 fixes the classification and names "a stderr tail" as the exemplar; the bound and the absent-when-empty rule are the minimal production discipline under it — the 2 000-code-unit cap itself is a provider knob below contract grain) |

### RP — ref + projection

| Id | Rule | Class |
|---|---|---|
| RP1 | The READY ref: `{ kind: "worktree", locator: { path, branch, repo, base_commit } }` — all four locator fields plain strings (canonical-JSON-safe by construction): `path` = the created worktree directory (absolute), `branch` = the created branch name, `repo` = the evaluated host repo path, `base_commit` = M1's resolved sha. The locator is provider-defined and KERNEL-UNINTERPRETED (the kind-boundary-only rule; the domain `RuntimeContextRef.locator: unknown` already carries it) (anchored: contract:ch9-runner#C10) |
| RP2 | The actor projection: `projectForActor(ref)` returns `{ kind: "worktree", path, branch }` — FIELD OMISSION, not confinement (`repo`/`base_commit` are omitted, not secret: the substrate leaks both to a curious actor, and actor-side secrecy of the host repo is NOT claimed — the trusted-local-host stance). The projection is trivially canonical-JSON-safe (three strings) (anchored: contract:ch9-runner#C10) |
| RP3 | `projectForActor` INTEGRITY: the provider gates its own input/return — a ref whose `kind ≠ "worktree"` or whose locator is not the RP1 shape is a LOUD synchronous throw (a programming/config-integrity error: the kernel's kind boundary and the fact that this provider only ever emitted RP1 refs make the lane unreachable in a healthy composition; a corrupted store row surfacing here must fail loud at the ch12-C15 projection gate, never project lossily) (derived: contract:ch9-runner#C10 + contract:ch12-runtime-core#C15 — DERIVATION: C15 places the projection's integrity gate at the `project_for_actor` return and prescribes fail-closed; the provider-side shape check is that gate's producer half for a provider whose locator shape is declared) |

### R — registration/composition

| Id | Rule | Class |
|---|---|---|
| R1 | The production `ProviderRegistry` gains `pairflow.worktree` (the C6 join): both shipped-CLI kernel composition sites (`cli/main.ts` — the `withKernel` helper and the ingress-submit site) build the registry through ONE shared production helper whose member map is `{ "pairflow.worktree": <the worktree provider> }` — the empty-map call retires from production. The join is LEGAL: the D5 gate discharged by ordering (ch9-P1 is committed — the channel this provider routes onto exists in the tree this packet builds on) (anchored: contract:ch9-runner#C6) |
| R2 | Composition mechanics: the provider's completion sink is bound to `Kernel.deliverCompletion` at the same composition point (the dev-replay binding culture); the sink handed to the provider is the DG4 diag-wrapping sink; and the `withKernel` composition helper — the kernel home of the write verbs, where `start` (the ONLY `provision()` caller) runs — awaits `kernel.settleRuntimeContextDeliveries()` after its verb body, before process exit (the envelope-submit site builds a kernel but never provisions; a settle there would be a permanent no-op across one-shot processes) — the seam's own shutdown-drain rule ("a real shutdown would await this before teardown") made real at the first composition that can produce deliveries; under PB2's synchronous shape the drain is empty in the normal path and exists as the belt for any direct-path residue (derived: contract:ch9-runner#C6 + contract:ch12-runtime-core#C16 + prose:kernel seam shutdown-drain note (kernel.ts#407) — DERIVATION: C16 fixes composition-root injection; the sink binding is the seam's only wiring form; the settle-before-exit is the seam's own stated shutdown rule applied at the first real composition) |
| R3 | Dev and testkit surfaces are UNCHANGED: the dev CLI's hermetic replay keeps registering the SCRIPTED player under the test-chosen name `pairflow.worktree` (ADR-009's dev boundary; C16's "registry name is test-chosen data"); the testkit contract is untouched (no new fake, no seam change); production code imports `providers/`, never testkit (ADR-005) (derived: ADR-005 + ADR-009 + contract:ch12-runtime-core#C16 — DERIVATION: the non-change is asserted, not implied — the boundary between the real provider's production registration and the scripted player's dev/test registrations is exactly the ADR-005/009 line, restated once here so the build cannot "helpfully" swap the dev player out) |

### T — types/ripple

| Id | Rule | Class |
|---|---|---|
| T1 | The EMPTY-REGISTRY-PREMISE consumer sweep is MEASURED (R-ABSENCE-CONSUMERS — the flipped shared value is the production registry's emptiness, searched by the NAMES `createStaticProviderRegistry`, `runtime_context_provider_unavailable`, `pairflow.worktree`, plus the stale-comment token `dormant`/`EMPTY`): the authoring-time sweep (untruncated, receipt in the authoring session) found the premise-DEPENDENT consumers — `cli/cli.test.ts#1246` (the ONE test whose assertion rides the PRODUCTION registry being empty: a `pairflow.worktree` spec through the shipped CLI asserting `runtime_context_provider_unavailable` — re-based at build to an unregistered name for the unavailable lane, the lane itself stays driven), `cli/main.ts#254/#612` (the two composition sites R1 edits) and its `#461`/`withKernel` doc comments, `kernel/kernel.ts#102` + `#158` (the `providerRegistry` field doc's "EMPTY production registry / honestly unstartable" sentence AND the "dormant in production" note) + `ports/runtimeContextProvider.ts#51-53` AND `#74` (the ProviderRegistry interface doc's and the `createStaticProviderRegistry` factory doc's "EMPTY production registry" sentences — stale comments, swept present-tense), and `cli/journey.test.ts#435` (a comment naming "the EMPTY production provider registry (C16)" inside a test that DRIVES the shipped subprocess — a production-registry consumer whose behavior is registry-independent (context-free template) but whose comment goes stale: comment-grain sweep); every OTHER hit constructs its own hermetic registry (trace/unit tests, dev replay) and is premise-INDEPENDENT: untouched. The sweep re-runs UNTRUNCATED at build with a required end state of zero premise-dependent consumers left un-re-based (derived: prose:R-ABSENCE-CONSUMERS + contract:ch9-runner#C6 — DERIVATION: registration flips the shared "no production provider" state; consumers of its ABSENCE are token-invisible to a registration-only diff, so the sweep is keyed on the value's names) |

### DG — the C26 provisioning-completion diag events

| Id | Rule | Class |
|---|---|---|
| DG1 | EVERY provisioning completion — both kinds, success and failure — emits ONE structured diagnostic event through the EXISTING ch7 channel: best-effort, fail-open, non-authoritative (events may be lost on channel failure; no full-history reconstruction is claimed — C26's honest split; the committed instance row stays the only authority, REV-B/REV-C unchanged) (anchored: contract:ch9-runner#C26) |
| DG2 | The event shape (additive domain growth, the ch12-P1b `IngressDetailToken` precedent): `DiagnosticSource` gains `"runner"` (the runner-plane's ONE source token — ch9-P3/P4's errand/spawn events join under it); `DiagnosticKind` gains `"provision_ready"` and `"provision_failed"`; the body gains `requestId` (present iff source = `"runner"` — both kinds carry the correlation id), `providerReason` (present iff kind = `"provision_failed"` — the RAW reason token AS THE PROVIDER REPORTED IT, a plain string, UNTRUSTED-CONFINED exactly like `error.message`; NEVER the classified enum: the event precedes the kernel's transport gate, so classification is the kernel's verdict and this field is the provider's report — a hostile/unknown token is carried VERBATIM while the kernel's gate throw proceeds unchanged), and `providerDetail` (present iff the report's `detail` value is a plain string — a non-string hostile detail is OMITTED at emit and the event still fires; only on `"provision_failed"`; PB3's tail, UNTRUSTED-CONFINED: diag store + local read surfaces only). `instanceId` is present on every runner row; the runner source carries NO `opId`/`actorId`/`type` (a completion is not an op) and NO `detail` (the ingress-token iff is untouched). Runner kinds are VALID ONLY with the runner source (bidirectional). SIBLING SCOPE: the source-grain `requestId` iff is scoped to the two provisioning kinds this packet mints — the sibling packet introducing further `runner` kinds (ch9-P3/P4 errand/spawn events) RE-EXAMINES the iff (it may relax it to kind-grain), never merely inherits it (derived: contract:ch9-runner#C26 + contract:ch9-runner#C4 — DERIVATION: C26 fixes the event set and the channel; the ch7 emit-face culture fixes the form — closed token domains, presence-iff fields, untrusted free text confined per C4's classification; the token spellings are D1-grain naming beneath the contract grain) |
| DG3 | Emit-face/read-gate PARITY (zero key drift — the ch7 R3 discipline): the diag store's read-side shape gate grows the SAME allowlist keys, source/kind members, and presence iffs BOTH DIRECTIONS (`requestId` iff source runner; `providerReason` iff kind provision_failed — STRING-typed, enum membership deliberately NOT read-gated: the field is an untrusted report, so a hostile token can never fail the whole read; `providerDetail` ⇒ kind provision_failed, string-typed; runner kinds ⇔ runner source; the kernel full-envelope rule stays scoped to source kernel), and a stored runner row violating them fails the WHOLE read (`read_failed`) — the emit allowlist and the read gate stay ONE declared claim in two mirrored homes. The debug bundle's `BundleDiagRow` projection is UNCHANGED: its closed field list structurally excludes the new fields (`providerDetail` can never enter the redacted bundle), and the widened kind/source types flow through its generic row mapping (anchored: contract:ch9-runner#C26 + prose:ch7 R3 read-gate culture (diag/sqliteDiagStore.ts validateShape)) |
| DG4 | The EMISSION POINT is the composition's completion-sink WRAPPER: the sink handed to the provider at the composition root emits the DG2 event (bare call on the fail-open `DiagnosticsSink` — REV-DIAG-FAILOPEN, no defensive wrapper) and then delivers to `Kernel.deliverCompletion`. The wrapper emits at completion-FIRE time, independent of the later admission outcome — the event records the provider's REPORT, never the kernel's verdict (an inert-admitted completion still emitted). Provider-anonymous (any future registry member inherits C26's provisioning half for free) and kernel-untouched: the kernel's own diag culture stays classification-only (ch9-P1 G4 fixed that the kernel emits NO new event for completions — the runner-plane owns this emission). The scripted player in hermetic tests fires through test sinks; the wrapper is production composition, driven by its own unit lane plus the journey (derived: contract:ch9-runner#C26 + prose:ch9-P1 G4 (the kernel classification-only culture) — DERIVATION: C26 frames the event as runner-plane observability; P1-G4 forecloses the kernel as emitter; the sink wrapper is the provider-anonymous point that sees every completion of every provider — provider-side emission is an admissible code-locus equivalent producing identical events, the wrapper chosen FOR the anonymity) |

### U — unit/coverage/drift

| Id | Rule | Class |
|---|---|---|
| U1 | `l0d-pseudocode/RUNTIME_CONTEXT_READY` flips `pending → realized` with disposition `alias/inherited`, codeRef `v3/src/kernel/lifecycle.ts#runtimeContextReady` — the ch12-P3 fold-encoding: the realized l0e symbol carries both versions' semantics (the quoted unit texts; the l0d inline WAITING/immediate fork IS `activate_or_hold`'s), no kernel byte changes. With this flip the l0d section's unit set is FULLY owned (derived: prose:plan §9.2 + prose:plan §9.4 P2 row + prose:ch12-P3 D1 fold-encoding culture — DERIVATION: plan §9.2 names the candidate and the expected disposition; the projection above confirms subsumption, so the alias encoding applies rather than a fresh implement row) |
| U2 | The ledger is BYTE-IDENTICAL; NO domainRegistry flip, NO new rejection registry name (`sys:provision_rejected`/`sys:provision_failed` are FAIL reason PAYLOAD — ch9-P1 G1's realized domain, produced (not defined) here; the 54-name registry and the drift lanes are green before AND after); the coverage union grows by exactly the U1 unit row. Any discovered need for model-plane change routes through the standing model↔code divergence stop (anchored: contract:ch9-runner#C3 + contract:ch9-runner#C22 + prose:plan §9.2) |

### J — the activation journey (R-ACTIVATION-JOURNEY)

| Id | Rule | Class |
|---|---|---|
| J1 | The READY journey — through the SHIPPED CLI as subprocesses, production bindings, zero test seams (the ch8-P2 `journey.test.ts` culture): a temp HOST git repo fixture (with a commit) — FIXTURE LAYOUT: the host repo is a NAMED SUBDIR under the journey's registered-and-swept temp root, never a mkdtemp root itself, so the beside-repo default worktree (`<repo-parent>/.pairflow-worktrees/<repo-name>`) lands INSIDE the swept root and never leaks into the shared system tmpdir — + a journey-authored template file declaring `runtimeContext: { kind: worktree, provider: pairflow.worktree, config: { repo: <fixture> } }` → `create` → `start` → the START outcome is `accepted`, AND post-exit host state proves the provisioning: the worktree directory exists at the C8-derived path, the branch exists at the resolved base commit, and the floor reads (`detail`/`timeline`) show the run READY-committed with the RP1 ref and the run's post-activation state (the template's activation mode decides WAITING-vs-ACTIVE; the journey pins one mode and asserts its state). The template file is JOURNEY-AUTHORED — J3's decided record, flag F4 (derived: prose:template §2 activation-journey rule + contract:ch9-runner#C6 — DERIVATION: registration wires built foundation into a live path from the shipped `start` entrypoint, so the journey obligation fires; the provisioning path is deterministic, so no actor stub is needed) |
| J2 | The FAILED journey — same shipped-CLI mechanics: a template whose `repo` config points at a NON-repository directory → `create` → `start` → post-exit the run is TERMINAL `failed` with `failure_reason = sys:provision_rejected`, floor-visible (`detail` shows the terminal disposition and reason) — the ch9-P1 channel driven end-to-end by its FIRST production caller, proving the chapter's no-silent-hang invariant at the shipped surface (derived: contract:ch9-runner#C3 + prose:ch9-runner Context (the no-silent-hang business invariant) — DERIVATION: the invariant's visible-FAIL half is only provable through a real provider on the shipped path; the non-repo lane is S2's cheapest deterministic member) |
| J3 | THE PROVENANCE DECISION (the dated decision record — flag F4): the journey's template file is JOURNEY-AUTHORED — the operator-authored-artifact ROLE is preserved (a real YAML file the shipped CLI loads) while the repo-canonical-file preference yields, because `config.repo` must embed the per-run temp fixture path no repo-canonical file can carry (new-decision — flag F4's record, ratified by this packet's human approve) |

## Mirrored surface map (one canonical statement per rule)

- The CONFIG KEYSET + defaults are canonical in S1; mirrors: the C7
  quote, Claim §2, J1's template fixture text.
- The REJECTION LANE SET is canonical in S2, the phase line in S3;
  mirrors: Claim §2, PB1's failure-membership parameter, J2's lane
  pick, flag F1.
- The IDENTITY SCHEME is canonical in N1, the enc properties in N2;
  mirrors: the C8 quote, Claim §3, M1's path/branch arguments, C23's
  future session naming (draft-side, not restated here).
- The LOUD-DEGRADATION lanes are canonical in N3/N4; mirrors: Claim
  §3, the C8 quote, the P4a/P4h probe rows.
- The SPAWN DISCIPLINE is canonical in M4; mirrors: Claim §4, the
  ADR-017 expansion under Delegated sources, PB3's stderr source.
- HOST NON-INTERFERENCE is canonical in M3; mirrors: Claim §4's
  "never touch the host repo's index or checked-out tree" clause,
  the C9 quote, flag F3, the In-context default-dir note, probe P4d.
- The `detail` PRODUCTION rule (bound, optionality, confinement) is
  canonical in PB3; mirrors: DG2's `providerDetail` clause, DG3's
  bundle exclusion, PB3's own C4 citation (C4 is cited-not-quoted
  in this packet — the P1-realized surface).
- ROUTING TOTALITY + exactly-one is canonical in PB1; mirrors: Claim
  §2, the C11 quote, S2/S3 (the membership).
- The SYNC-COMPLETION shape is canonical in PB2; mirrors: Claim
  (opening + §6's journey consequence), R2's settle belt, the
  In-context one-shot note, flag F2.
- The REF/PROJECTION shapes are canonical in RP1/RP2; mirrors: the
  C10 quote, Claim §1, J1's floor asserts.
- The REGISTRATION is canonical in R1, its mechanics in R2; mirrors:
  Claim §1, the C6 quote, T1's composition-site hits, J1/J2 (the
  journeys ride the registered composition).
- The DIAG EVENT SHAPE is canonical in DG2, parity in DG3, the
  emission point in DG4; mirrors: Claim §5, the C26 quote.
- The ALIAS FLIP is canonical in U1; mirrors: the Ledger-slice prose,
  the quoted unit texts.
- The FIXTURE-LAYOUT rule (temp host repos are named subdirs under
  the swept root) is canonical in J1; mirrors: the
  `worktreeProvider.test.ts` and `worktreeJourney.test.ts`
  test-target bullets.
- REQUEST-ID FRESHNESS is canonical in N5; mirrors: N4's premise
  clause, flag F5, the `kernel.ts` and `lifecycle.test.ts`
  embedding entries, Acceptance-N's crash-window member, the
  In-context id note, Claim §3's orphan-retry clause.
- The FAILURE GRID is canonical in its own table (under S3);
  mirrors: S3's phase/infra sentences, M4's infra clause,
  Acceptance-S/M lane texts.
- The DECIDED RECORDS S4/PB2/J3/N5 are the manifest faces of flags
  F1/F2/F4/F5 — one decision, two homes BY DESIGN: the flag carries
  the dated rationale and route, the row carries the claim surface.
- BLANKET mirrors (two standing classes, named once): every
  family's Acceptance bullet is a named mirror of its matrix family
  (it defers by lane id — a lane change updates its bullet in the
  same fold); and every In-context note restates its canonical row
  BY REFERENCE (each note names its row — the note follows the row
  under the fold policy).
- PARTIAL/FROZEN mirrors (not kept fully in sync by design): the
  C-row quotes in Operative material are the ratified rows' verbatim
  NORMATIVE bodies (trailers elided per the header note); they are
  the source, never edited to track packet phrasing.

Fold policy: a change to a canonical row updates EVERY named mirror
before handing back; a mirror discovered in review is ADDED here,
never re-discovered next round.

## In-context notes (the scarce budget)

- The ONE-SHOT process model is why PB2 exists: the shipped CLI at
  ch9 is verb-per-process; a provisioning that outlived the process
  would strand the run in exactly the silent hang the chapter
  forbids. The resident-process home for truly-async providers is
  `runner run` (ch9-P4). Do not "optimize" the provider to detached
  async work inside this packet.
- Orphan worktrees are BY DESIGN (teardown is a named Absent, plan
  §9.1): every superseded/crashed provisioning leaves its directory
  and branch; the committed ref keeps them findable. Do not add
  cleanup.
- The default `dir` lives BESIDE the host repo
  (`<repo-parent>/.pairflow-worktrees/<repo-name>` — C7's amended
  default): host-repo `git clean`/`git status` and tree-wide sweeps
  never see live worktrees. An explicit in-repo `dir` is legal but
  shows untracked pollution (P4d; flag F3). The provider must never
  write into the host repo's tree — no `.gitignore`, nothing (M3).
- `enc` is identity machinery, not a compatibility surface: a future
  encoding change strands orphans but breaks no consumer (the ref
  carries the literal path/branch; nothing re-derives names from
  ids at P2 — the first re-deriver is ch9-P3/P4's session naming,
  which shares the same `enc` by C23).
- The provider is STATELESS per call (no instance fields carrying
  cross-call state): every provision derives everything from the
  spec + ids. The runner-plane's durable state starts at ch9-P3's
  errand ledger (ADR-016), not here.
- `new_request_id` is kernel-minted as `req-<epochMillis>-<n>` (N5
  — TimeSource-composed, fresh across restarts ON A REAL CLOCK with
  the same-millisecond residual landing on the loud collision lane,
  deterministic under the controlled clock); the provider treats both ids as opaque
  nonempty strings — hostile-id lanes are driven with ids
  containing `/`, `..`, uppercase, `--`, multibyte UTF-8, and lone
  surrogates.

## Embedding gates

- **Target files (production):**
  - `v3/src/providers/worktreeProvider.ts` — NEW (ADR-014 point 4:
    `src/providers/` is born WITH the first real provider): the
    provider factory (`createWorktreeProvider(options?)` — options =
    the M4 knobs with defaults), the S/N/M evaluation+create
    machinery, PB1–PB3 routing, RP1–RP3 ref/projection, the N2
    reference `enc`.
  - `v3/src/providers/index.ts` — NEW: the module's public face.
  - `v3/src/ports/diagnostics.ts` — DG2: the `"runner"` source, the
    two kinds, the three body fields (presence rules in doc + type);
    the stale "EMPTY at ch12" registry comment block in
    `runtimeContextProvider.ts` is T1's sweep target, not this
    file's.
  - `v3/src/diag/sqliteDiagStore.ts` — DG3: ALLOWLIST/KINDS/source
    growth + the new presence iffs in `validateShape`.
  - `v3/src/cli/main.ts` — R1/R2/DG4: the shared production-registry
    helper at both kernel sites (`#254`, `#612`), sink binding + the
    diag-wrapping sink, the post-verb settle in `withKernel` (R2 —
    the start path's kernel home; NOT the envelope-submit symbol),
    the stale empty-registry comments (`withKernel` doc, `#461`)
    swept present-tense.
  - `v3/src/kernel/lifecycle.test.ts` — N5: the crash-window
    freshness lane (an orphan at a prior kernel's id names vs a
    fresh kernel's retry — two kernels over one store) + the stale
    `req-1`-style scenario comments swept to the composed id form.
  - `v3/src/ports/runtimeContextProvider.ts` — T1 MAY-change:
    comment-grain sweep only (BOTH production-empty sentences — the
    ProviderRegistry interface doc's, `#51-53`, and the
    `createStaticProviderRegistry` factory doc's, `#74` — gain their
    ch9 successor clause); no type/shape change.
  - `v3/src/kernel/kernel.ts` — N5 + T1: `newRequestId` composes
    the TimeSource epoch-millis with the counter (`req-<at>-<n>` —
    the packet's ONE kernel code change, F5's resolution, PLUS
    plumbing the already-injected `time` dep into the factory's
    destructuring scope — both lines in this file; the signature
    and every consumer's opaque-id treatment unchanged);
    plus the `#102` field-doc sentence and `#158` "dormant in
    production" comment swept present-tense.
  - `v3/src/drift/unitMap.json` — U1: the alias flip.
  - `v3/eslint.config.mjs` — `src/providers/**` JOINS the production
    ban lists (testkit/drift import bans, the dynamic-form groups) —
    extend-don't-fork: the existing glob lists gain the new module.
- **Test targets:**
  - `v3/src/providers/worktreeProvider.test.ts` — NEW: the S/N/M/PB/
    RP families against REAL temp git repos (integration-grain by
    design — the mechanics ARE the subject; a recording sink stands
    in for the kernel; every fixture repo follows J1's FIXTURE
    LAYOUT rule — a named subdir under the swept temp root, so
    beside-repo worktrees stay inside the sweep).
  - `v3/src/diag/sqliteDiagStore.test.ts` — the DG3 lanes (runner
    rows valid, every new iff violated in BOTH directions red,
    bundle exclusion unchanged).
  - `v3/src/cli/worktreeJourney.test.ts` — NEW: J1/J2 (the ch8-P2
    subprocess culture; temp db + temp definitions dir + temp host
    repo, the host repo per J1's fixture-layout rule).
  - `v3/src/cli/cli.test.ts` — T1: the `#1246` unavailable-lane test
    re-based to an unregistered provider name (the lane survives;
    the premise moves off the production registry).
  - `v3/src/cli/journey.test.ts` — T1 MAY-change: comment-grain
    sweep only (`#435`'s "EMPTY production provider registry"
    note); behavior registry-independent, no assert changes.
- **Entrypoints:** `createWorktreeProvider` (new, module-public);
  the shipped CLI `start` verb now reaching real provisioning (no
  verb/flag/output-schema change — composition only);
  `createStaticProviderRegistry` call sites in production carrying
  the one-member map. NO new CLI verbs (C25's surface is ch9-P4's);
  NO ingress change; NO kernel interface change.
- **Mutation boundary:** the files below. Extend-don't-fork: the
  provider is a new module behind the existing port; the diag face
  grows additively (no second channel); the composition helper
  replaces the two inline empty-map calls.

```json
{
  "mutation_boundary": {
    "files": [
      "v3/src/providers/worktreeProvider.ts",
      "v3/src/providers/index.ts",
      "v3/src/providers/worktreeProvider.test.ts",
      "v3/src/ports/diagnostics.ts",
      "v3/src/ports/runtimeContextProvider.ts",
      "v3/src/diag/sqliteDiagStore.ts",
      "v3/src/diag/sqliteDiagStore.test.ts",
      "v3/src/cli/main.ts",
      "v3/src/cli/cli.test.ts",
      "v3/src/cli/journey.test.ts",
      "v3/src/cli/worktreeJourney.test.ts",
      "v3/src/kernel/kernel.ts",
      "v3/src/kernel/lifecycle.test.ts",
      "v3/src/drift/unitMap.json",
      "v3/eslint.config.mjs",
      "v3/implementation/packets/ch9-p2-worktree-provider.md"
    ]
  }
}
```

**Substrate probes:** the authoring-time table above (P4a–P4j) plus
the draft's ratified P1a–P1h. Every matrix cell resting on git/OS
behavior names its probe; no cell rests on an unprobed substrate
claim (the unborn-HEAD surprise — P4c — moved its lane from create
to evaluation, which is why S2(h) exists).

## Pre-approval flags

- **F1 — config-evaluation narrowings (S2).** Three lanes narrow
  beyond C7's example list under C3's rejected-class definition —
  (f) `dir` absolute-and-string-typed when present, (g) `base`
  string-typed, (a) `spec.kind ≠ "worktree"` rejected at evaluation
  — and ONE PLACEMENT decides: the base-resolution failure
  (unborn-HEAD default included, probe P4c) classifies as
  `sys:provision_rejected` (evaluation-phase), not
  `provision_failed`. Risk if wrong: a lane the draft would rather
  classify `failed` reports the other token — no state-machine or
  registry impact either way (both are the C3 domain).
  Route: `approve-ratified` — the human approve act ratifies the
  narrowing set (dated decision record; revisit: none).
- **F2 — the synchronous-completion provider + start-path settle
  (PB2/R2, the `withKernel` drain).** The shipped `start` verb's wall clock now INCLUDES the
  provisioning (git worktree creation, typically well under a
  second; bounded by M4's timeout). The alternative — true-async
  provisioning with a resident settlement loop — is deliberately
  deferred to ch9-P4's `runner run` and stays open behind the same
  seam. Risk if wrong: none semantic (the seam absorbs both
  timings); latency-only. Route: `approve-ratified`.
- **F3 — the explicit in-repo `dir` pollution residual (M3/P4d).**
  The DEFAULT case is resolved: the C7 amendment (reopen act
  `09825f78`/`4db149b1`, the v1/omnigent prior-art check) moved the
  default OUTSIDE the repository's working tree, so a default
  provision leaves the host's `git status` untouched. The residual:
  an operator-set EXPLICIT in-repo `dir` remains legal and then
  shows an untracked entry (P4d) — an observed consequence, not a
  contract change (gitignore is the operator's call; the provider
  must not write one). Route: `boundary-review` — the boundary
  weighs whether the explicit in-repo case deserves a documented
  recommendation or a rejection lane in a later chapter.
- **F4 — journey template provenance (J1).** The ch8-P2 journey rule
  prefers the REPO's canonical template file as the operator-authored
  input; this journey's template is JOURNEY-AUTHORED because its
  `config.repo` must embed the per-run temp fixture path — a
  host-specific value no repo-canonical file can carry. The
  operator-authored-artifact role is preserved (a real YAML file the
  CLI loads); only the provenance differs. J3 is this decision's
  manifest face. Route: `approve-ratified`.
- **F5 — the request-id freshness resolution (N5; the resolved
  contested-ratified-vs-reality STOP).** The ratified crash-retry
  story (C8/C18: a fresh `request_id` per re-run → no collision)
  rested on a freshness the built kernel provided only WITHIN one
  process (`req-N` from a per-kernel counter; the one-shot CLI
  builds a kernel per process — a crash between worktree creation
  and the marker commit would brick the run's retry on its own
  orphan). Resolution (user-elected O1): `newRequestId` composes
  the injected TimeSource's epoch-millis with the counter
  (`req-<at>-<n>`) — fresh across restarts on the real clock,
  deterministic under the controlled test clock, the CHK-noRandom
  seam untouched, the ch12-P3 in-process freshness lanes green
  unchanged. Risk if wrong: a same-millisecond restart re-minting
  the same pair — real restarts sit far above millisecond grain,
  and the residual lands on the LOUD collision lane, never silent.
  N5 is this decision's manifest face. Route: `approve-ratified` (a
  resolved STOP verdict — the approve act ratifies it).
- **F6 — the derived-class decline record (PB3 cap / R2 drain
  placement / DG2 token shapes / DG4 emission locus / RP3
  full-locator check).** Adversarial review proposed reclassifying
  these five as decisions; each is the below-contract-grain
  representation/knob class with admissible equivalents inside a
  stated property (the established refutation-accepted precedent: a
  testkit-grain field order and a seam-representation class both
  stayed `derived` on the same reasoning). Route: `declined — below
  the D1 contract grain; the stated properties bind, the exact
  spellings are the build's within them`.

## Acceptance

- Contract tests: the C6/C7/C8/C9/C10/C11/C26 obligations this
  packet realizes, driven by claim-derived negatives (the S2 lanes,
  the N hostile-id/collision/over-length lanes, and the PB totality
  lanes derive from the CLAIM/matrix, never from the implemented
  predicate's shape — R-CLAIM-NEGATIVES; every declared matrix lane
  is DRIVEN — R-MATRIX-LANES).
- Checks: the drift suite (unit-map flip U1 verified, domainRegistry
  + rejection registry LOCKED unchanged; ledger byte-identical),
  `v3:packet-lint`, `v3:adr-check` (ADR-014/016/017/018 statuses
  untouched), `v3:coverage` (the union gains exactly the U1 row).
- Test disciplines + family inventories (DISCIPLINE + FAMILY
  INVENTORY, R-ALTITUDE-LINE — membership parameterized, fixture
  enumeration is build work; R-LANE-SENSITIVITY binds twice — at
  these lane texts now, at the built bodies via the arm gate-2
  sensitivity pass; the §9.4 mutation-pilot dual-run rides gate-2
  scoped to this boundary):
  - **S (spec/config):** the declared set = S2's lanes (a)–(i) each
    driving a `failed(sys:provision_rejected)` completion with ZERO
    host mutation (asserted: no worktree dir, no branch, host status
    unchanged), plus the three-default happy path (repo-only config)
    and the explicit base/dir variants. Membership: S1–S3 (owner:
    this packet; driven in `providers/worktreeProvider.test.ts`).
  - **N (identity):** the declared set {hostile ids (`/`, `..`,
    uppercase, `--`, multibyte) never appear raw in the created
    path/branch; case-fold injectivity — two ids differing only by
    case yield distinct worktrees on the case-insensitive host;
    delimiter reservation — an id containing `--` cannot alias a
    composed pair (driven as an injectivity pair, not an encoding
    string-equality assert); ILL-FORMED-Unicode injectivity — the
    lone-surrogate vs U+FFFD pair yields DISTINCT worktree names
    (N2's code-unit grain driven adversarially); the crash-window
    freshness lane — an orphan worktree pre-created at a PRIOR
    kernel's id names cannot collide with a fresh kernel's retry
    (N5; two kernels over one store, distinct clock values); the
    SAME-CLOCK control — two kernels under an IDENTICAL controlled
    clock re-mint the same first id and the collision fires LOUD
    (`sys:provision_failed`, never silent reuse — the N5 residual
    driven deliberately);
    over-length → loud
    `sys:provision_failed` (P4a's lane); same-name collision → loud
    `sys:provision_failed` (a second provision with the SAME ids —
    driven directly at the provider, beneath the kernel's
    fresh-request_id discipline); enc(nonempty) nonempty} each
    driven. Property-level asserts (N2's reading rule): the tests
    pin properties, not the reference escape mapping. Membership:
    N1–N5 (owner: this packet).
  - **M (mechanics):** the declared set {created branch points AT
    the resolved base (explicit committish variant: an older commit
    — the worktree checks out THAT tree); dirty host provisions;
    linked-worktree host provisions; host status/index UNCHANGED under
    the amended default (clean, unqualified assert), the explicit
    in-repo `dir` variant showing only the untracked entry (P4d);
    PATH-only env spawn succeeds;
    timeout kill → `sys:provision_failed` (a hang-simulating
    invocation under a tiny timeout); ENOENT (a bad git binary path
    via the factory knob) → `sys:provision_failed`} each driven.
    Membership: M1–M4 (owner: this packet).
  - **PB (port):** the declared set {every S2 lane and every M
    failure lane fires EXACTLY ONE FAILED completion (the recording
    sink counts); success fires exactly one READY; no lane throws
    out of `provision()` (the port-breach reserve is asserted by the
    absence of throws across the whole hostile matrix); the
    completion is fired BEFORE the detach ack fulfills (PB2 —
    observable: the recording sink already holds the completion when
    `provision()`'s promise settles); `detail` present iff the
    SELECTED SOURCE is nonempty — ALL THREE source-class lanes
    driven: an empty-stderr nonzero exit → detail ABSENT; an ENOENT
    spawn-infra failure → the infra error's message present as the
    detail; a realpath fs-failure → the fs error's message present
    (probe P4j) — bounded, absent from
    `failure_reason` (the kernel-side landing is P1's driven G
    surface — this packet asserts production: the source-selection
    rule, the tail cap, and the absent-when-empty rule)} each driven. The build-time inventory
    obligation: enumerate the provider body's throw sites + awaited
    spawn boundaries (transitive) and map each to a completion or
    the named port-breach class — a LIST in the build record, not a
    count. Membership: PB1–PB3 (owner: this packet).
  - **RP (ref/projection):** the declared set {the READY ref carries
    exactly the RP1 locator (path/branch/repo/base_commit, the
    resolved sha); `projectForActor` returns exactly
    {kind, path, branch} (a keyset assert — omission driven, not
    assumed); a foreign-kind ref throws; a malformed locator throws}
    each driven. Membership: RP1–RP3 (owner: this packet).
  - **R (composition):** the declared set {the production registry
    resolves `pairflow.worktree` to the real provider at BOTH
    composition sites (driven through the journey + a
    composition-grain unit lane); an unregistered name still rejects
    `runtime_context_provider_unavailable` (the re-based cli lane);
    the dev replay still runs the scripted player (the existing dev
    suite green)} each driven. Membership: R1–R3 (owner: this
    packet).
  - **T (ripple):** the T1 sweep re-runs UNTRUNCATED at build (the
    four name keys) with zero premise-dependent consumers left;
    typecheck green across the widened diag types (the debug-bundle
    projection compiles unchanged). Membership: T1 (owner: this
    packet).
  - **DG (diag):** the declared set {a READY completion emits
    exactly one `runner/provision_ready` row (instanceId+requestId,
    no reason fields); a FAILED completion emits exactly one
    `runner/provision_failed` row carrying `providerReason` (the
    VERBATIM reported token) and — when PB3's selected source
    produced a string — `providerDetail`; a FAILED completion with
    an UNKNOWN reason token emits its event with the token verbatim
    while the kernel's transport-gate throw proceeds unchanged
    (emission independent of the verdict — DG4's fire-time rule
    driven adversarially); a non-string `detail` is omitted at emit
    and the event still fires; the store round-trips
    runner rows; EVERY new presence iff violated in each direction
    fails the read (`read_failed`); runner kinds with source
    ingress/kernel red and vice versa; the bundle's closed
    projection excludes `providerDetail` (the existing exclusion
    suite green over a stored runner row); a diag sink whose
    UNDERLYING STORE fails — swallowed by the sink per the port's
    fail-open contract — leaves the delivery outcome unchanged (the
    wrapper lane: emit is called BARE, and the PORT contract, never
    a wrapper try/catch, is what protects delivery — a raw-throwing
    fake would breach the port, not drive this lane)} each driven.
    Membership: DG1–DG4 (owner: this packet).
  - **U (drift/coverage):** the standing drift suite green before
    AND after; the unit-map lane proves the U1 flip (alias codeRef
    resolves); `v3:coverage` green with the grown union. Membership:
    U1–U2 (owner: this packet).
  - **J (journey):** the declared set = J1 (READY: worktree on disk
    at the derived path, branch at base, floor READY ref +
    post-activation state) and J2 (FAILED: terminal `failed`,
    `failure_reason = sys:provision_rejected`, floor-visible) —
    subprocess, production bindings, zero seams; each leg asserts
    outcome, host state, and floor reads. Membership: J1–J2 (owner:
    this packet).
- Drift tests green (standing, unconditional — PI-3).
- Standing review rules in force: REV-B-LOCAL-NOT-AUTHORITY (the
  provider holds no cross-call state; the diag stream is best-effort
  history, never authority — DG1); REV-C-PROJECTIONS-READONLY (the
  journey's floor reads consume projections; the diag events are
  observation, never a stand-in for committed state);
  REV-E-NO-ADAPTER-BRANCH (the kernel gains NO provider-type branch
  — its one change is N5's id composition, provider-anonymous by
  construction); REV-DIAG-FAILOPEN (the DG4
  wrapper calls the sink BARE; a sink failure never changes a
  completion's delivery or an Outcome).

## Build record

**Execution context:** fresh-context-DELEGATED build (the README §4
default) — an Opus-class subagent fed the self-contained packet plus
the delegation prompt's verbatim-quoted stronger-than-suite
discipline lines (the S2 zero-host-mutation asserts, the N
property-level injectivity pairs incl. the ill-formed-Unicode and
crash-window/same-clock lanes, the M clean host-status assert +
grace/timeout/ENOENT lanes, the PB exactly-one/no-throw/
fired-before-ack matrix + three detail source classes, the DG
both-direction iff reds + verbatim-hostile-token lanes, the J
host-state asserts + fixture-layout rule, the full failure grid).
The main context held orchestration, the verification chain, both
arm gates, the probe runner, and the commit boundary. The
orchestrator authored ONE post-probe test fold (the S-probe
blind-class fix below); all other code and tests are the build
agent's.

**Review + gate history (approve phase):** internal panel — R1 FULL
(12 findings folded) + R2 targeted (clean + 2 bookkeeping) + close;
the C7 dir-default AMENDMENT (a user-initiated v1/omnigent prior-art
reality check → draft reopen act, commits `09825f78` + `4db149b1`)
voided that close; R3 targeted (clean + the fixture-layout fold) +
close; ARM GATE 1 (codex gpt-5.6-sol/high, agent-invoked,
`arm_run.sh`): two 600 s legs died as INFRA timeouts (the
invocation's own internal timeout — resolved by the user-elected
1200 s mode), then one full leg — 9 findings (3 P1) — folded (the
manifest moved to 14/14/4; R4 FULL panel ran as the mandatory
manifest-change escalation, clean + small folds) — and the arm's
re-checks converged 9 → 3 → 3 → 0, final verdict CLEAN citing the
approve basis `68ef68bd…eabd`; the human approved TWICE (the
original approve at `99294d45…`, the re-approve on the final bytes).

**Build:** the provider module (two-phase evaluate/create with the
failure-grid classification; the code-unit `enc`; `runGit` under the
ADR-017 discipline with the `DEFERRED(ch9-p3)` seam marker), the N5
`newRequestId` TimeSource composition, the DG2/DG3 runner-source
diag growth + the DG4 composition wrapper, the R1/R2 shared
production-registry helper + withKernel settle, the U1 alias flip,
the eslint provider globs, and the J1/J2 shipped-CLI journeys. Test
delta **1297 → 1356 (+59)**; typecheck/lint/full suite/drift/
coverage(build-close)/packet-lint/adr-check/deferred(1 marker) all
green, re-run by the orchestrator (never trusted from the builder's
self-report). The changed-file set equals the declared 16-file
boundary exactly.

**The PB1 throw-site inventory (the Acceptance-mandated LIST — every
throw site in the provider body + helpers + awaited spawn
boundaries, each mapped to a completion or the named port-breach
class, bound to the failure grid's cells):**

1. `fireReady()` unbound-sink throw → PORT BREACH (programming
   error; no grid cell — never reachable from config).
2. `fireFailed()` unbound-sink throw → PORT BREACH (same class).
3. `projectForActor()` foreign-kind throw → PORT BREACH (RP3
   integrity; the kernel's kind boundary makes it unreachable in a
   healthy composition).
4. `projectForActor()` malformed-locator throw → PORT BREACH (RP3,
   the corrupted-store-row class; exact own-keyset since the gate-2
   aftermath).
5. `runGit()` spawn setup try/catch → resolves `{kind:"infra"}` →
   `failed(sys:provision_failed)` — the grid's spawn-infra column
   (sync-setup-throw member), every git site.
6. `runGit()` child `error` event (ENOENT) → resolves infra →
   `failed(sys:provision_failed)` — the spawn-infra column, every
   git site.
7. `runGit()` timeout kill (SIGTERM→grace→SIGKILL) → resolves infra
   → `failed(sys:provision_failed)` — the timeout column, every git
   site.
8. `evaluate()` `realpathSync(repo)` try/catch → `failed(sys:
   provision_rejected)` — the grid's realpath row (its single
   failure shape).
9. Every `await runGit(...)`/`await evaluate(...)` boundary in
   `provision()` — the promises ALWAYS resolve, never reject; no
   await surfaces a throw, so every outcome maps to exactly one
   completion (PB1's totality; sites 1–4 are the reserved
   port-breach class, structurally unreachable from hostile config).

**R-DERIVED-PROBES (family → mutation → expected red → observed;
receipts under the session scratchpad `ch9p2-probes/build/`, probe
runner protocol, every restore byte-verified):**

| Family | Mutation | Expected red | Observed | Receipt |
|---|---|---|---|---|
| S | drop the `isAbsolute(repo)` guard | the relative-repo rejection lane | FIRST RUN GREEN (blind — see the aftermath note), re-run RED after the test strengthening | `S.receipt.json`, `S2.receipt.json` |
| N | `enc` passes uppercase unescaped | case-fold injectivity | RED (3 tests) | `N.receipt.json` |
| M | create runs in the process cwd, not `repo` | the mechanics/host-status set | RED (6 tests) | `M.receipt.json` |
| PB | a second completion fired on a rejection lane | exactly-one-completion | RED | `PB.receipt.json` |
| RP | projection gains `repo`+`base_commit` | the RP2 exact-keyset assert | RED | `RP.receipt.json` |
| R | the production registry reverts to the empty map | the J1 READY journey | RED (J1+J2) | `R.receipt.json` |
| T | cli.test #1246 reverts to the registered name | the unavailable lane self-reds | RED | `T.receipt.json` |
| DG | drop the `requestId iff runner` read gate | the iff-violation reds | RED (2 tests) | `DG.receipt.json` |
| U | the U1 codeRef points at a nonexistent symbol | the unit-map resolution test | RED | `U.receipt.json` |
| J | the completion fires true-async after `provision()` | the PB2 fired-before-ack lane | RED | `J.receipt.json` |

**Aftermath (pre-commit):** the S probe's first run stayed GREEN —
the blind class R-DERIVED-PROBES exists to catch: the relative-repo
fixture (`"relative/path"`, nonexistent) let the downstream realpath
rejection mask the guard's removal (same verdict, different
mechanism). Fix (orchestrator-authored): the S(c) lane gained a
relative-path-to-a-REAL-repo sub-case — without the guard that
config would fully provision (realpath resolves, root identity
passes), so the rejection now pins the guard itself; the S2 probe
re-ran RED with a byte-verified restore. One probe-tooling note: a
vitest `-t "(c) repo"` filter parsed as a regex and matched zero
tests (a false green) — caught in-session, re-run with a regex-safe
filter; the receipt logs carry both runs.

**Aftermath (build close):** post-build boundary audit 0 errors @
`4088b7a0`; coverage green. Mutation-pilot dual-run (the §9.4 flow
note; scoped to the boundary's six production files, 65 s):
providers 77.47% (243 killed / 55 survived / 18 no-coverage), kernel
88.72%, diag 75.57%, ports 100%, `cli/main.ts` 0% (475 no-coverage —
the subprocess-journey class: Stryker's in-process runner cannot see
child-process coverage; the ch9-P1 caveat's sibling, boundary-review
data, no fix owed at the pilot stage). Arm gate 2 (codex
gpt-5.6-sol/high, agent-invoked, 1200 s): **7 findings — 1 product,
2 packet-docs, 4 test-evidence, 0 P0/P1** — plus a long
plausibly-blind lane list; the receipt audit (S→S2 story included)
and repo integrity passed. Dispositions: RP3's loose locator check
FOLDED (exact own-keyset + extra/inherited-key negatives — the one
product fix); the DG4 token finding NARROWED on verification — the
EMITTED kinds were already correct (`provision_*`; a wrong kind
cannot typecheck against the closed union), the wrong tokens lived
only in the wrapper's DOC COMMENT, fixed, and the substance landed
as the new unfakeable journey diag-readback lanes; the port timing
doc FOLDED (sync-before-ack legality stated); the missing PB1
throw-site inventory FOLDED into this record (orchestrator-authored,
grid-bound); the four test-evidence batches FOLDED — the site-aware
git fake driving the remaining grid cells + a UNIVERSAL exactly-one
assert in the shared helper, the M4 env-allowlist NEGATIVE and the
SIGTERM→grace→SIGKILL ORDER observer, the request-only identity
pair + provider-grain orphan-retry + RP1 repo-value + PB3
tail-CONTENT lanes, and the production-composition lanes (journey
diag readback through the shipped subprocess; DG3 actorId/detail
negatives; the stored-runner bundle exclusion). Test delta
**1356 → 1371 (+15)**. EVERY arm-flagged plausibly-blind lane that
gained a test was then EXECUTED-verified through the probe runner:
probes AP-RP3 / AP-DG4 / AP-GRID / AP-ENV / AP-SIG / AP-NAME /
AP-TAIL / AP-BUNDLE — all 8 RED with byte-verified restores
(receipts under the session scratchpad `ch9p2-probes/aftermath/`;
zero exit-3). One kill-coverage note for the boundary read: the
failure-grid classification lives at TWO sites (`evaluate`'s
`infraFail` + the create-phase inline classification), so no
single-point mutation reds the whole grid — AP-GRID reds 4 cells,
the create-phase ENOENT cell is driven by its own lane. AP-BUNDLE's
target (`floor/debugBundle.ts` `toDiagRow`) sits OUTSIDE the
boundary — probed read-only-mutation via the runner (restored
byte-clean), no boundary change: the driving TEST lives in-boundary
and the projection was not edited. **The aftermath probe table (family → mutation → expected red →
observed; receipts under `ch9p2-probes/aftermath/`, all restores
byte-verified):**

| Probe | Mutation | Expected red | Observed |
|---|---|---|---|
| AP-RP3 | locator gate relaxed to a 4-field type check | the RP3 exact-shape negatives | RED |
| AP-DG4 | the production wrapper's diag emit deleted | the J1/J2 diag readback | RED (both) |
| AP-GRID | `evaluate`'s `infraFail` reason flipped | the evaluation grid cells | RED (4 cells) |
| AP-CREATE | the CREATE-phase classification flipped (both inline branches) | the create-phase `provision_failed` lanes | RED (over-length, collision, worktree-add×ENOENT; the worktree-add×timeout cell is TIMING-BLIND to this single mutation — under load the 150 ms budget can expire at an earlier evaluation site, still yielding `provision_failed` vacuously — the create site stays pinned by the three red cells) |
| AP-ENV | children spawned with the full `process.env` | the env-allowlist negative | RED |
| AP-SIG | immediate SIGKILL, no SIGTERM/grace | the signal-order observer | RED |
| AP-NAME | names derived from the instanceId only | the request-only distinctness pair | RED |
| AP-ORPHAN | pre-existing sibling worktrees removed before create | the orphan-persistence assert | RED |
| AP-REPO | the locator `repo` hardcoded to a constant | the RP1 repo-value assert | RED |
| AP-TAIL | the detail tail keeps the FIRST 2000 units | the last-2000 content assert | RED |
| AP-BUNDLE | `providerDetail` added to the bundle projection (`floor/debugBundle.ts` — outside the boundary, probed read-only-mutation, restored byte-clean) | the stored-runner bundle exclusion | RED |
| AP-DG3 | the runner branch's `actorId` forbidden-check dropped | the runner-row-with-actorId negative | RED |
| AP-WRAP | the wrapper's `providerReason` hardcoded to the OTHER token | the J2 verbatim-reason assert | RED (substitution-detectable for any non-expected value; the IDENTITY substitution — hardcoding exactly the J2 journey's own token — is the equivalent-mutant residual, recorded below) |

**Recorded residuals + declines (the gate-2 re-check's remaining
items, disposed):** (1) RP3 vs NON-ENUMERABLE/SYMBOL extra own keys
— `declined — out of threat model`, on the TRANSPORT-GATE mechanism:
every ref the kernel projects has passed the pre-commit
canonical-JSON transport gate (the kernel's canonicality check —
`kernel.ts#270` — rejects values that are not plain enumerable
string-keyed data), so BOTH projection paths are covered: the
immediate-activation path projects the post-gate IN-MEMORY value,
later dispatches the JSON-parsed stored form; a symbol-keyed or
non-enumerable carrier cannot pass the gate, and a programmatic
caller bypassing the kernel is the port-breach programming-error
class. (2) The R2 `withKernel` settle is
CODE-REVIEW-ASSERTED, not probe-driven — under PB2's synchronous
shape its removal is outcome-indistinguishable BY DESIGN (the drain
is empty on every reachable path; the belt exists for a future
async provider), the ch9-P1 W3 single-buffer narrowing's precedent
class. (3) The AP-WRAP identity-substitution residual: a wrapper
hardcoding exactly `sys:provision_rejected` survives J2 — the
verbatim pass-through's remaining guarantee is one line of reviewed
composition code (the equivalent-mutant class mutation testing
cannot kill). Aftermath authorship: code +
tests = the delegated aftermath agent; probe execution = two
delegated probe agents through the runner; packet-text folds (this
record, the inventory, the tables) = the orchestrator. **Leg close**
(the README §6 diminishing-returns cutoff; the ch9-P1 precedent):
the gate-2 re-check #2 at `e84ffe28` resolved/accepted every
disposition (AP-CREATE's three red cells + the recorded timing
blindness; AP-WRAP + the identity-mutant residual; the R2
synchronous-shape narrowing; the 13-receipt table audit) and
yielded ONLY the RP3-decline RATIONALE correction (the
transport-gate mechanism replacing the stored-ref round-trip claim
— corrected in this record) — the build-close arm leg CLOSES on
this bookkeeping-only round. R2's settle lane is
journey-covered by declaration (the `withKernel` helper is
composition-internal; the READY-committed floor read at process
exit is its proof — recorded here, not a new unit lane).

```json
{
  "packet_metrics": {
    "class": "kernel-semantic",
    "prediction": { "predicted": "projection", "reasoning": "plan §9.4 P2 row carries no explicit prediction; the ratified ch9 draft rows C6-C11 fix every provider surface, predicting projection", "discovered": "projection" },
    "provenance": { "anchored": 14, "derived": 14, "new_decision": 4 },
    "rounds": { "review": 4, "doc_refinement": 0, "implementation": 2 },
    "stops": [
      { "type": "2:contested-ratified-vs-reality", "what": "the ratified C7 in-repo dir default vs the v1/omnigent prior-art placement (host git-clean/status/sweep hazards, linked-worktree nesting) — a user-initiated reality check", "resolution": "user elected option A: draft reopen act 09825f78/4db149b1 amended the default to <repo-parent>/.pairflow-worktrees/<repo-name>" },
      { "type": "2:contested-ratified-vs-reality", "what": "the C8/C18 crash-retry freshness premise vs the per-process req-N counter (arm gate-1 P1: a crash between worktree creation and the marker commit bricks the retry on its own orphan)", "resolution": "user elected O1: newRequestId composes the injected TimeSource epoch-millis with the counter (N5/F5); the claim split into by-construction loud-collision + real-clock practical freshness" },
      { "type": "4:flagged-approve", "what": "first-of-a-kind human approve with flags F1-F6 (four approve-ratified decision records, one boundary-review residual, one decline record)", "resolution": "approved at 99294d45; re-approved on the arm-converged final bytes 68ef68bd" }
    ],
    "detector_misses": [
      { "found_at": "approve", "what": "USER-caught at the approve gate: the ratified draft's C7 dir default diverged from v1's deliberate parent-of-repo placement — neither the draft panel nor its arm ran a prior-art comparison", "why_missed": "no prior-art-check duty exists in the draft round; the boundary candidate is logged (a lens-5/DraftContract duty for v1-covered surfaces)" },
      { "found_at": "arm-approve", "what": "the per-process request-counter falsifying the crash-retry freshness premise; the subdir root-identity hole in the repository check; the pre-gate emission typing conflict (raw report vs classified enum)", "why_missed": "the panel verified claims against ratified rows and the built seam but did not walk cross-process lifecycles or attack the git-dir check with a non-root repo path; the arm's falsification-first framing found all three" },
      { "found_at": "implementation", "what": "PROBE-RUNNER-caught: the S relative-repo lane was green-but-blind (the nonexistent-path fixture let the realpath rejection mask the isAbsolute guard)", "why_missed": "the lane text was correct but the fixture collapsed two rejection channels; the probe runner's exit-3 class caught it exactly as designed" },
      { "found_at": "arm-build-close", "what": "one product defect (RP3 accepted extra/inherited locator keys) + four green-but-blind test batches (grid site cells, the M4 env/signal halves, identity/tail content, the production diag composition — static-body diag tests could not catch a wrapper or kind regression)", "why_missed": "the spec-time altitude rule defers member sensitivity to build close BY DESIGN; the build agent realized lane presence at declared strength but content-sensitivity gaps survived — the mandatory gate-2 sensitivity pass caught them, the aftermath folded all, and every fold was probe-runner-verified RED" }
    ],
    "learned": "the arm's approve leg out-caught a four-round panel on cross-process lifecycle walks and check-bypass attacks (9 findings incl. 3 P1); a user prior-art reality check reopened a same-day-ratified draft row — prior-art comparison is a missing draft-round duty; two 600s arm legs died on the invocation's own timeout before the 1200s mode converged; gate-2 again yielded mostly test-evidence (1 product / 4 sensitivity batches) and every aftermath fold was probe-runner-verified RED — the altitude split worked as designed on both gates",
    "main_thread_model": "claude-fable-5"
  }
}
```

## Row manifest (the D1 classification's machine face)

```json
{
  "packet_rows": {
    "rows": [
      { "id": "S1", "class": "anchored", "refs": ["contract:ch9-runner#C7"] },
      { "id": "S2", "class": "derived", "refs": ["contract:ch9-runner#C7", "contract:ch9-runner#C3"] },
      { "id": "S3", "class": "derived", "refs": ["contract:ch9-runner#C3", "contract:ch9-runner#C7"] },
      { "id": "S4", "class": "new-decision", "refs": [] },
      { "id": "N1", "class": "anchored", "refs": ["contract:ch9-runner#C8"] },
      { "id": "N2", "class": "derived", "refs": ["contract:ch9-runner#C8", "prose:probe P4g (case-insensitive host)"] },
      { "id": "N3", "class": "anchored", "refs": ["contract:ch9-runner#C8"] },
      { "id": "N4", "class": "anchored", "refs": ["contract:ch9-runner#C8", "contract:ch12-runtime-core#C18"] },
      { "id": "N5", "class": "new-decision", "refs": [] },
      { "id": "M1", "class": "anchored", "refs": ["contract:ch9-runner#C9", "contract:ch9-runner#C7", "contract:ch9-runner#C10"] },
      { "id": "M2", "class": "anchored", "refs": ["contract:ch9-runner#C9"] },
      { "id": "M3", "class": "anchored", "refs": ["contract:ch9-runner#C9"] },
      { "id": "M4", "class": "derived", "refs": ["ADR-017", "contract:ch9-runner#C9"] },
      { "id": "PB1", "class": "anchored", "refs": ["contract:ch9-runner#C11", "contract:ch9-runner#C1"] },
      { "id": "PB2", "class": "new-decision", "refs": [] },
      { "id": "PB3", "class": "derived", "refs": ["contract:ch9-runner#C4"] },
      { "id": "RP1", "class": "anchored", "refs": ["contract:ch9-runner#C10"] },
      { "id": "RP2", "class": "anchored", "refs": ["contract:ch9-runner#C10"] },
      { "id": "RP3", "class": "derived", "refs": ["contract:ch9-runner#C10", "contract:ch12-runtime-core#C15"] },
      { "id": "R1", "class": "anchored", "refs": ["contract:ch9-runner#C6"] },
      { "id": "R2", "class": "derived", "refs": ["contract:ch9-runner#C6", "contract:ch12-runtime-core#C16", "prose:kernel seam shutdown-drain note (kernel.ts#407)"] },
      { "id": "R3", "class": "derived", "refs": ["ADR-005", "ADR-009", "contract:ch12-runtime-core#C16"] },
      { "id": "T1", "class": "derived", "refs": ["prose:R-ABSENCE-CONSUMERS", "contract:ch9-runner#C6"] },
      { "id": "DG1", "class": "anchored", "refs": ["contract:ch9-runner#C26"] },
      { "id": "DG2", "class": "derived", "refs": ["contract:ch9-runner#C26", "contract:ch9-runner#C4"] },
      { "id": "DG3", "class": "anchored", "refs": ["contract:ch9-runner#C26", "prose:ch7 R3 read-gate culture (diag/sqliteDiagStore.ts validateShape)"] },
      { "id": "DG4", "class": "derived", "refs": ["contract:ch9-runner#C26", "prose:ch9-P1 G4 (kernel classification-only culture)"] },
      { "id": "U1", "class": "derived", "refs": ["prose:plan §9.2", "prose:plan §9.4 P2 row", "prose:ch12-P3 D1 fold-encoding culture"] },
      { "id": "U2", "class": "anchored", "refs": ["contract:ch9-runner#C3", "contract:ch9-runner#C22", "prose:plan §9.2"] },
      { "id": "J1", "class": "derived", "refs": ["prose:template §2 activation-journey rule", "contract:ch9-runner#C6"] },
      { "id": "J2", "class": "derived", "refs": ["contract:ch9-runner#C3", "prose:ch9-runner Context (no-silent-hang business invariant)"] },
      { "id": "J3", "class": "new-decision", "refs": [] }
    ]
  }
}
```
