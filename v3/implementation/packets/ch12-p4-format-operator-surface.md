# Task Packet: ch12-P4 — the format + operator surface (runtime YAML keys · the source-form validator lanes · the four lifecycle CLI verbs + the C25 bridge retirement · the floor read extension)

Plan step: plan.md §12.4 P4 row — the chapter's format + operator walk
(§12.1 item 5): the runtime YAML keys (`activation`, the
`runtimeContext` requirement block, the roles-entry
`defaultAgentConfig`) + their validator source-form lanes + the CLI
`validate` extension; the four lifecycle CLI verbs
(`create` / `start` / `kickoff` / `cancel`) with the C25 in-handler
CREATE→START bridge RETIRED as the named replacement (C24); and the
floor read extension (`kernel_status` / `terminal_disposition` /
`activation_mode` / the typed `wait` / the runtime-context state), the
shipped canonical template + fixture gaining NO new keys under the
ch8-P2 equality pin. Draft anchors (= the manifest's ANCHORED-row
C-ref union; the derived rows additionally cite their derivation
inputs): `contract:ch12-runtime-core` rows
C1/C2/C3/C4/C5/C6/C7/C9/C11/C12/C13/C16/C17/C19/C20/C21/C22/C24/C25
(their FILE-channel / source-form / operator-surface shares — the
value-level and admission-semantic shares are P1a/P2/P3-built) plus
`contract:ch8-template-format` rows C7/C30/C31/C38 (the additive-growth
clause, the pinned-ref grammar, and the CLI doc shapes this surface
rides) and the ch6-P4a CLI canonical channel/error/exit matrices the
four verbs inherit. The real spawn, the `pairflow.worktree` provider's
git mechanics, and the real actor adapter are ch9's; provisioning-
failure handling and every deferred provider surface stay the named
ledger Absents.
Plan alignment: ONE prepared same-commit edit [R-ALIGNED-UP] — the
plan §12.4 P4 row's "template-fixture updates under the ch8-P2
equality pin" shorthand predates the draft ratification (2026-07-19),
where C25 DECIDED the shipped template/fixture gain NO new keys (their
behavior IS the defaults); the packet keeps both byte-untouched and
the equality pin byte-unedited. The prepared plan edit (marked
"aligned at ch12-p4 pre-approval", landing in this packet's build
commit) narrows the row to "the shipped template/fixture gain NO new
keys, the ch8-P2 equality pin held byte-unedited (C25)". Every other
reciprocal is named by the plan's P1b/P3 rows and C25 ("P4 lands the
four-verb surface and retires this", "the `defaultAgentConfig` KEY's
source-form walk waits for P4", "the SOURCE-FORM walk changes only at
P4"); no OTHER decision contradicts ratified plan text.
Autonomy stage: measurement (the plan row predicts flag-free
approve → autonomous build THROUGH the two transitional external-arm
gates; the §5.5 fallbacks stand — a new-decision row or an arm-minted
flag demotes to the human path — EXERCISED here: arm gate 1 minted
F1's reclassification, demoting the approve to the human path, STOP
`4:flagged-approve`). Not first-of-a-kind: the format-walk
class has precedent (ch8-P1 built the validator lanes, ch11-P4 the
gate/round/runtimeContext walk), the lifecycle-CLI-verb class has
precedent (ch6-P4a's operator verbs), and the floor-read-extension
class has precedent (ch6-P1 timeline read, ch4-P4 floor).
Classification: **projection** — manifest tally: 16 anchored /
1 derived / 1 new-decision (machine-counted from the `packet_rows`
block). Almost every point was ratified at the runtime-core draft
(2026-07-19, incl. the acts A/B/C reopen set and the stance set) or
derives from a built packet row with an in-row note; the ONE
new-decision row (R1's compact-list field selection, arm-gate-1
reclassified from derived) rides as flag F1 to the approve — the
approve is therefore FLAG-BEARING (STOP `4:flagged-approve`, the
human's), below the Case-B threshold (it touches no
authority/separation/availability-class semantics — a human-display
projection) and riding `approve-ratified`. Watchpoint W2 (the
bridge-retirement consumer sweep) carries a fold-now route; W1 is
subsumed by F1.

## Ledger slice (declared — feeds the coverage accounting)

```json
{
  "ledger_slice": {
    "units": [],
    "rejections": [],
    "invariants": [],
    "traces": [],
    "shared_ownership": []
  }
}
```

Operability packet (R-EMPTY-SLICE; the ch11-P4 / ch8-P1 precedent):
the format + operator surface carries zero kernel semantics — all 21
chapter unit ids, the two new behavioral rejections
(`task_required`, `runtime_context_provider_unavailable`), the
`not_active` owning units, all 15 invariant dispositions, and all 3
golden traces are P0–P3-owned and realized. This packet's claim
surface is its canonical contract matrices. Coverage axes unchanged —
an assertion the close verifies (units 45/159, invariants 38/116,
traces 8/20 — P3's close values), not an omission.

## Sizing/risk (template §2 step 0 — materialized)

Predicted class (plan §12.4): **projection** (basis: the ratified
draft). Discovered: **projection with ONE new-decision row** — 16 of
18 rows anchor to a ratified draft C-row; V7 derives from the
R-ACTIVATION-JOURNEY discipline (its fixture shape build-freedom); and
R1's compact-list field selection is a genuine choice C21 leaves open
(arm-gate-1 reclassified it from derived), riding as flag F1 to the
human approve (the ch11-P4 Y6 precedent — a below-Case-B new-decision
riding `approve-ratified`).

Axes:

- **authority movement: none.** Admission stays THE single semantic
  authority (C20/C25 — the walk feeds it and adds no second validation
  home); the kernel lifecycle machinery (CREATE/START/KICKOFF/CANCEL/
  `activate`, the provider seam, the cascade) is byte-untouched — the
  four CLI verbs are THIN INGRESS WRITERS through the already-built
  kernel methods (the ch6 write-entrypoint rule; no direct `StorePort`
  writes); the floor is a READ projection over already-stored fields;
  the store, registry, and provider port are byte-untouched.
- **surface spread:** one concept (the ch12 runtime surface made
  authorable / operable / observable through the shipped entrypoints)
  across the definition validator (the source-form walk — one module
  family), the CLI write verbs (`main.ts` — the four-verb surface +
  the bridge retirement), and the floor read projection (`floor.ts` —
  the compact-list discriminant). Trips hard stop 2 by letter at three
  surfaces — closure proof below. Testkit: `fixtureTemplate()` and the
  shipped `local-pair-v0@1.yaml` gain NO new keys (C25 — their
  behavior IS the defaults: immediate, context-free), so the testkit
  CONTRACT is unchanged and it does NOT count under the surface rule;
  the equality pin holds BYTE-UNEDITED (the pin's protection is its
  exclusion from the boundary).
- **identity/join fragility: none** — no cross-seam identity; the
  walk's output is the same in-memory admitted value the direct
  channel constructs, and the floor reads the same stored instance the
  kernel wrote.
- **foundation + activation coupling:** this IS the chapter's declared
  activation share at the SHIPPED-ENTRYPOINT grain — the
  P1a/P1b/P2/P3-built foundation (the lifecycle machinery, the
  cascade, the provider contract, the admission value-level lanes)
  becomes authorable (the format walk), operable (the four verbs), and
  observable (the floor) from the shipped CLI. The packet's own new
  foundation is the source-form walk + the compact projection, whose
  sole consumers are the same admission call and the same CLI read
  verbs — no separable seam (the plan's P4 row pins exactly this
  bundle).
- **prerequisite coupling: none** — P0–P3 are built; ch9 depends on
  this chapter, not the reverse.
- **acceptance multiplicity:** the validator lanes + the four verbs'
  channel behavior + the breaking bridge-retirement sweep + the floor
  compact projection + the activation journey — success classes proven
  at 3 surfaces; the below-hard-stop escalation combination does NOT
  fire (it needs 4+ surfaces, or an authority change with a
  cross-seam mapping + a CLI payload change — no authority moves).

**Hard stop 2 (letter-tripped, closure-proven; single-packet allowed:
yes).** The plan's ratified P4 row IS this bundle (the chapter cut
already quarantined the schema/lifecycle to P1a/P1b, the cascade to
P2, and the provider machinery to P3; what remains is the one format
walk, its shipped operator surface, and the read projection). One
bounded code change closes every touched surface: the walk cannot ship
without the keyset growth, the four verbs are thin writers over built
kernel methods (no kernel edit), the compact projection reads
already-stored fields (no schema edit), and the bridge retirement's
fallout is confined to the CLI verb + its own test consumers. ONE
proof surface (`v3:test` + the bridges) validates all of it; the same
consumers own the fallout; no per-consumer-family review loop; no
compatibility/diagnostics/recovery/ordering risk is introduced.
Hard stops 1/3–11: no authority moves (1, 4, 6, 7); no unfinished
prerequisite (3); no fragile-join cutover (5); no persisted-schema
change — the schema bump was P1a, so hard stop 8's persisted-authority
leg is absent (8); no proof-source move — the kernel's create/start/
kickoff/cancel were ALREADY the completion proof sources, the bridge
merely called two of them (10); no rollback/lock/ordering/side-effect
change (9). Hard stop 11 (reusing an existing proof contract): the ch8
validate/load suites and the ch6-P4a CLI channel matrices EXTEND
additively — every existing lane stays byte-identical except the
closed edit inventory (Y-analog: the declared-edit list in Claim 6);
explicitly narrowed reuse, stated, not silent.

Consume-family scan (from the tree, 2026-07-22):

| Family | State | Evidence |
|---|---|---|
| producer / validator-gate | present — extended | `v3/src/definition/validate.ts` (F1–F5, the source-form walk), `admit.ts` (A1–A3: the value-level lanes are P1a/P2/P3-built; P4 drives them through the FILE channel and RETIRES the P4-deferred spec-map Map interception at `admit.ts:323-339`); `gates/` and the cascade byte-untouched |
| persistence / replay | absent — unchanged | no store change; the schema bump was P1a; `v3/src/store/` byte-untouched; dev `replay` uses the built kernel seams, unaffected by the shipped-verb change |
| execution consumer | present — byte-untouched code, NEWLY REACHABLE | the kernel lifecycle machinery (CREATE/START/KICKOFF/CANCEL/`activate`, the provider seam) now receivable from the shipped four-verb CLI and from file-authored runtime keys (the activation; zero kernel edits) |
| read / presentation (floor + CLI) | present — extended | `v3/src/floor/floor.ts` (R1's compact `listInstances` projection; `getInstanceDetail`/`getTimeline` already full — R2/R3 verify pass-through); the CLI read verbs (`list`/`detail`/`timeline`) dump the floor's JSON unchanged, so the compact/full split lives in the floor |
| recovery / cleanup | absent | no teardown/rollback surface on this slice (the named Absents stand) |
| external / integration | present — the four verbs + the bridge retirement | `cli/main.ts` (V1–V6: the four lifecycle verbs, the `--mode`/`--run-overrides` flags, the bridge retirement); the C31/C38 dev-`validate` docs carry the new findings unchanged in kind |
| testkit | present — value-unchanged | `fixtureTemplate()` + the shipped template gain NO keys (C25); the equality pin is the mechanical witness, byte-unedited and boundary-excluded |

**R-ACTIVATION-JOURNEY disposition (the rule FIRES):** this packet
wires previously-built foundation into the live path reachable from
the shipped entrypoints (the four verbs make the full CREATE→START→
hold→KICKOFF / →CANCEL lifecycle drivable through the subprocess CLI).
The discharge is V7's journey scenario — subprocess, production
bindings (the EMPTY production provider registry, C16), a context-free
deferred-hold lifecycle through all four verbs, full state reads off
the floor. Deterministic by construction (context-free + deferred: no
provider leg, and the lifecycle-state reads land BEFORE any immediate
dispatch would spawn an actor — the P1b context-free deferred-hold
journey pattern, now through the shipped four-verb surface).

Conditional annexes: **closure-budget** — buckets touched: validation
(the source-form walk + the file-channel drives), the operator surface
(the four verbs), and the read projection (the compact list); the
persisted-authority and shared-contract buckets are UNTOUCHED (no
schema change, no downstream shape migration); named deferrals: the
real spawn + the `pairflow.worktree` provider + the real actor adapter
(ch9), provisioning-failure handling and every deferred provider
surface (the named Absents), the C9 dead-override-key diagnostic lane
(the ratifier's D5 conscious debt — an explicit later decision).
**Proof-boundary N/A with declared edits** — no proof contract moves;
the kernel's lifecycle methods were already the completion proof
sources (the bridge called `create`+`start`; P4 splits the CLI verb
back onto them 1:1 without relocating any kernel proof). The closed
declared-edit inventory is Claim 6's (each a C24/C25-sanctioned
retirement or a bridge-consumer re-target, never a proof relocation).
**Mutable-flow N/A** — no side-effecting flow changes; the walk is
pure over parsed input, the verbs delegate to the built kernel ops
under their existing commit discipline, and the floor projection is a
pure read.

## Claim + dimensions (enumerated BEFORE deriving test obligations)

The Claim, stated wide; every completeness clause carries its closed
form (R-CLAIM-GRAMMAR):

1. **Authoring reach + channel equivalence (PARAMETERIZED).** Every
   ratified runtime-format authoring key (membership owner: the
   draft's keyset rows — C1 `activation`, C2/C3 the `runtimeContext`
   requirement block + spec map, C6 the roles-entry
   `defaultAgentConfig`, C7's two template agent-config positions) is
   authorable through the file channel: a well-formed runtime-key YAML
   template loads to an ADMITTED template — the `activation` default
   materialized, the requirement normalized, the agent-config values
   carried — DEEP-EQUAL to the admission of the equivalent
   directly-constructed value (the walk adds and subtracts NO
   semantics; admission stays the one authority).
2. **Validator source-form lanes (PARAMETERIZED).** Every member of
   the declared lane inventory (membership owner: C1's `activation`
   grammar + C2/C3's requirement/spec-map grammar + C6's roles-entry
   growth + C7's template-position container rule + C25's staging
   note) is driven through the FILE channel and able to fail on its
   row's meaning. The OWNERSHIP is per-key (stated so no seam forks):
   `activation`'s source-form — its container (a scalar/list/null
   where a map is required), its `mode` enum membership, its unknown
   keys — is the WALK's (F2, new at P4); the `defaultAgentConfig`
   roles-entry KEY and a well-formed `runtimeContext` spec map's
   keyset + `kind`/`provider` grammar are the WALK's (F3/F4); but the
   `runtimeContext` illegal-VALUE container check, the bare-`required`
   migration, the process-gate cross-rule, and the agent-config
   canonical-JSON/map gate are ADMISSION's (A-matrix — P1a/P2/P3-built,
   driven HERE through the file channel, the walk passing the raw
   value through). All findings ride the ONE validate-stage channel in
   the ch8-C21 `{path, message}` form, accumulating across
   independently-traversable lanes with LOCAL container suppression.
3. **The four lifecycle verbs (PARAMETERIZED).** The write family
   gains `create` / `start` / `kickoff` / `cancel` (C19) as THIN
   INGRESS WRITERS over the built kernel methods; each inherits the
   ch6-P4a canonical channel/error/exit matrices UNCHANGED (stdout one
   data document, stderr one error doc; exit 0 ok / 2 usage /
   3 not-found·kernel-negative / 1 internal — the CLASS shapes
   inherited unchanged, over the per-op LIFECYCLE outcome vocabulary,
   which has NO `stale` and whose terminal-sink is an integrity THROW,
   not a rejection — the exact mapping is V3's). Every
   member of the declared verb-lane inventory (owner: C20's per-verb
   schema rows) is driven: `create`'s pinned-ref + minted-id + optional
   `--task`/`--override`/`--run-overrides`/`--mode`; the op-carrying
   `start`/`kickoff`/`cancel` minting their nonce `op_id`; `kickoff`'s
   required `--task`; every verb surfacing the kernel outcome as data.
4. **The bridge retirement (SCOPED).** The C25 in-handler CREATE→START
   bridge in `verbStart` (`main.ts:305-352`, the `verbStart` bridge region) RETIRES; `start` becomes
   the real single-op START verb (a BREAKING surface change — the
   ch8-C29 class): the packet sweeps EVERY bridge consumer by the
   RETIRED behavior's name (R-ABSENCE-CONSUMERS — the tests asserting
   `start` creates-and-activates in one shot re-target: `create` for
   creation, `start` for activation). NO convenience CREATE+START
   composition ships (C19 — dogfooding runs `create` then `start`).
   Named exclusions with homes: the kernel's create/start methods are
   byte-untouched (they were the bridge's own delegates); the dev
   `replay` seams (`kernel.create`/`kernel.start`, `dev/main.ts:596`)
   and the testkit direct-composition seams (`traceHarness.ts:31/234`,
   its test, and `twoWorker.test.ts:120`) are byte-untouched (they all
   call the kernel directly, never the shipped `start` verb — the same
   exclusion class, enumerated in the sweep below so no builder
   re-targets them).
5. **The floor read extension (PARAMETERIZED + SCOPED).** `listInstances`
   projects a COMPACT state discriminant (`kernel_status`,
   `terminal_disposition`, `activation_mode`, the typed `wait`'s kind,
   and the runtime-context STATE discriminant `none | requested |
   ready` WITHOUT the opaque locator — C21's contrast with detail,
   the `projection-never-the-ref` culture applied to the human list
   payload, C17); `getInstanceDetail` exposes the FULL stored state
   INCLUDING the opaque ref (an operator/debug read — the
   `projection-never-the-ref` invariant binds the ACTOR PACKET, not
   the kernel-side floor); `getTimeline` returns BOTH entry classes
   (transition + lifecycle fact) with their kind visible (C12). The
   ch-4 `status`/`LifecycleStatus` field is ABSENT from every floor
   read doc (C11/C24 named replacement — already retired at P1a; this
   packet's floor docs never reintroduce it).
6. **Non-change + the closed declared-edit inventory (SCOPED).**
   Outside the declared mutation boundary, shipped behavior is
   unchanged; the CLAIMED deltas are EXACTLY the closed inventory
   (Claim 6's machine face — each a list member verified
   member-by-member at build): (1) the four-verb surface + the
   `verbStart` bridge collapse to the real START op; (2) every bridge
   CONSUMER re-target in the CLI test suites (measured at build by the
   `C25 bridge` sweep); (3) `listInstances`'s compact projection + its
   consumer test re-targets; (4) the file-channel `runtimeContext`
   spec-map now WALKS (the `cli.test.ts:1210` P4-deferred-refusal test
   flips to assert the walk); (5) the `admit.ts` P4-deferred Map
   interception (`admit.ts:323-339`) removed + the P4-deferral pointer
   comments retired (`admit.ts:291/325/335/442`, `domain/template.ts:
   84/140/172/181/183`, `cli/main.ts:308`). NOTHING else: the kernel,
   store, gates module, cascade, provider port, diag, and the shipped
   template/fixture bytes stay identical, proven by the full suite
   green and the byte-unedited equality pin.

Dimensions:

1. **`activation` source-form (F2), both directions:** the key legal
   at ROOT and unknown at every other grain (step, roles-entry); a
   present `activation` that is NOT a map (present-null, a scalar, a
   list) → ONE container-precondition finding at `activation`,
   dependents suppressed; `mode` MISSING (the empty `activation: {}`
   map) → a finding; a non-string / non-member `mode` value (the
   camelCase domain `immediate | deferredKickoff`) → its lane's
   finding; an unknown key in the `activation` map → a finding; the
   absent-key positive → the `immediate` default materialized at
   admission (P1a-built — the file adds no default).
2. **`runtimeContext` requirement source-form (F3), the value-domain
   split:** the string `none` → the requirement `none`; a spec map
   `{kind, provider, config?}` → `required(spec)` (the walk
   materializes the file's `mapAsMap` Map into an own-property record —
   retiring the P4-deferred interception); a present-null / list /
   other-scalar value → ADMISSION's A1 container-precondition finding
   at `runtimeContext` (P3-built value-level, the walk passing the raw
   value through — probes RP1/RP2); the bare `required` string → the
   LOUD migration refusal (A1, P3-built value-level — driven through
   the file channel here); the spec map's keyset (`kind` required,
   `provider` required, `config` optional map) + the `kind` grammar
   `^[a-z][a-z0-9_]*$` + the `provider` dotted grammar (ch11-C6 reuse)
   + `config` raw pass-through + unknown spec-map keys → findings at
   their paths.
3. **`defaultAgentConfig` roles-entry source-form (F4), both
   directions:** the roles-entry keyset grows to `defaultActor?` +
   `defaultAgentConfig?` — the key legal at the roles-entry grain and
   unknown at every other grain; the walk delivers the value to the
   built roles-entry slot; the value-level lanes (map requirement,
   canonical-JSON-safety — the `.nan`/`.inf` non-finite rejection) are
   admission's (A3, C7 — P2-built, driven through the file channel for
   BOTH the new `defaultAgentConfig` position and the existing
   `steps.<s>.agentConfig` position).
4. **The RP6 hostile source forms (C25's drive obligation):** a merge
   key `<<` inside the spec map (a literal key under 1.2 core →
   double fail-closed: unknown key + the map still lacks a legal
   shape), an anchor/alias spec map (resolves to a plain object graph,
   no bypass), `!!str none` (the string `none`), `None`/`NULL`/`Null`
   (the container/null lanes), a duplicate `kind` key (the ch8-C4
   document-wide `DUPLICATE_KEY`) — each driven, pinning the
   fail-closed behavior (probe RP6, `yaml@^2.9.0` — the draft's
   session-verified record; the lockfile is the gate, re-checked at
   build per R-DERIVED-PROBES).
5. **Channel equivalence (Claim 1):** the maximal runtime-key
   template — an `activation` block, a `runtimeContext` spec map with
   a `config`, a role `defaultAgentConfig`, a step `agentConfig` —
   loaded from YAML DEEP-EQUALS the direct-channel admission of the
   equivalent value (the materialized default, the normalized
   requirement, every field), never per-key spot checks.
6. **Accumulation + suppression (the load pipeline):** the file
   pipeline reports ch8-structure findings AND admission findings in
   ONE `stage: "validate"` result; a broken container suppresses only
   its dependents (an illegal `runtimeContext` value → its container
   finding, the C5 process-gate cross-rule suppressed under it, the
   independent `activation` lane still firing); the parse-stage
   short-circuit is unchanged (a parse error never mixes with validate
   findings — ch8-C36 stands).
7. **`create` schema (V2):** the pinned template ref (ch8-C30 grammar;
   default `local-pair-v0@1`), the caller-minted instance id, optional
   `--task`, the `--override role=actor` binding surface, optional
   `--run-overrides` (a JSON map step-id → agent-config map,
   shape-validated CLI-side as structure only — valid JSON, a map of
   maps, canonical-JSON-safe; semantics kernel-side, C9), optional
   `--mode` (`immediate | deferredKickoff`); `create` mints the
   instance id only (no `op_id` — creation is genesis) and emits the
   `Created` outcome as data (the instance id surfaced for scripting).
8. **`start` / `kickoff` / `cancel` schemas + op_id (V3):** `start
   <id>` and `cancel <id>` carry no payload; `kickoff <id> --task
   <task>` requires the task (its nonempty-string grammar);
   `start`/`kickoff`/`cancel` mint their nonce `op_id` (C13); every
   verb surfaces the kernel outcome as data in its ch6 class — a
   `Rejected(task_required)` on immediate-create-without-task, a
   `Rejected(runtime_context_provider_unavailable)` on `start` of a
   spec-declaring template (the EMPTY production registry, C16 — exit
   3, kernel-negative), a `Duplicate` on a replayed op_id (exit-0
   idempotent success) — each in its ch6 data class; a lifecycle CAS
   conflict does NOT surface (`stale` is absent from the lifecycle
   unions — it RETRIES in-loop), and a terminal-sink violation THROWS
   (exit-1 internal, V3).
9. **The `--mode` + `--run-overrides` realizations (V5):** `--mode
   deferredKickoff` on an immediate-default template creates task-less
   LEGALLY (the CREATE-level choice ?? the template default ??
   `immediate`, resolved once at CREATE — C13); `--run-overrides`
   snapshots onto the instance's `run_overrides` (C9); an unknown
   step-id in the map is INERT kernel-side (the model's `get`-semantics
   — no CLI-side rejection lane, the ratifier's D5 conscious debt).
10. **The bridge retirement + consumer sweep (V4, Claim 4/6):** the
    `verbStart` bridge collapses (`start` no longer calls
    `kernel.create`); the `C25 bridge` consumer sweep re-targets every
    test asserting the one-shot create-and-activate — the sites are the
    embedding-gate sweep receipt's group (i), membership build-measured
    (W2, R-ABSENCE-CONSUMERS); no convenience verb ships. (`cli.test.ts:1210`
    is NOT in this set — it is the P4-deferred-refusal flip, Claim 6
    item 4, a distinct delta.)
11. **The floor compact/full split (R1/R2/R3, Claim 5):**
    `listInstances` returns the compact discriminant (the axis fields,
    the runtime-context state WITHOUT the locator) and its consumer
    tests re-target; `getInstanceDetail` returns the full state WITH
    the opaque ref; `getTimeline` returns both entry classes with kind
    visible; the `status` field appears in NO floor read doc.
12. **The activation journey (V7, R-ACTIVATION-JOURNEY):** a
    subprocess-driven context-free deferred-hold lifecycle — `create
    --mode deferredKickoff` (no task) → `Created` with the instance
    id → `start <id>` → `Accepted`, `WAITING(kickoff_pending)` →
    `detail`'s instance shows `kernelStatus: "WAITING"` + the typed
    `wait` (emitted camelCase, R1) → `kickoff <id> --task <t>` →
    activation (currentStep set, round 1); plus a CANCEL lane:
    `create --mode deferredKickoff` → `start` → held → `cancel <id>` →
    `TERMINAL(cancelled)`, `detail`'s instance showing
    `kernelStatus: "TERMINAL"` + `terminalDisposition: "cancelled"`
    and the compact `list` row's cancelled discriminant.
13. **CLI `validate` doc lanes (V1's `validate` share):** dev
    `validate <path>` on a VALID runtime-key file exits 0 with
    `{valid: true, ref}`; on a source-form-defective one exits 1 with
    the `TemplateInvalid` `{stage: "validate", findings}` doc (the
    ch8-C31/C38 shapes byte-unchanged, only finding content new); one
    write verb (`create`) surfaces the same doc for a defective
    template.

## Operative material (projection, not invention)

This is an operability packet: the operative floor is the ratified
draft's own rows (reprinted as anchors in the matrices below — the
draft is bytes in this repo,
`contracts/ch12-runtime-core-contract.md`) plus the model's exhibited
authoring forms, carried as DATA.

The golden-trace Config views' authoring forms (the model's exhibited
YAML, `code/l0c-template-config.new.txt` / `l0d-…` / `l0e-…` — the
grain the file surface realizes; keys per the ratified camelCase
rename culture C13/C16):

```yaml
# the l0c/l0d/l0e views' shapes, at this surface's ratified key grain
activation:
  mode: deferredKickoff          # C1; authored camelCase ↔ model deferred_kickoff
runtimeContext:                  # C2/C3 — the spec-map form
  kind: worktree
  provider: pairflow.worktree
  config:
    repo: "bubble/{instance_id}"
roles:
  implementer:
    defaultActor: codex
    defaultAgentConfig:          # C6/C7 — the roles-entry agent-config value class
      mode: builder
      promptProfileRefs: [engineer-defaults]
steps:
  implement:
    role: implementer
    instruction: "…"
    transitions: { PASS: review }
    agentConfig:                 # C7 — the step position (its keyset slot is P2-built)
      approach: tdd
```

A context-free workflow authors `runtimeContext: none` (or omits the
key — C4, the absent≡none default); the shipped canonical
`local-pair-v0@1.yaml` authors NEITHER `activation` NOR `runtimeContext`
NOR any agent-config key — its behavior IS the defaults (immediate,
context-free), and it gains NO new key at P4 (C25, under the ch8-P2
equality pin).

The substrate facts this packet's lanes rest on are the draft's PROBED
record (RP1–RP6, `yaml@2.9.0` — the string `none` vs present-null node
class; the illegal value classes parse clean; the spec-map block +
raw `config` sub-map; unquoted mid-scalar braces legal, a leading
brace opens a flow map; flow-map agentConfig forms with list values;
and RP6's hostile spec-map forms — merge key, anchor/alias, `!!str`,
capitalized/NULL family, duplicate key). No new substrate premise is
added; the pinned `yaml@^2.9.0` is unchanged (the lockfile is the
gate — re-probed at build per R-DERIVED-PROBES).

## Canonical format-walk matrix (F — the source-form lanes, `validate.ts`)

| ID | Rule |
|---|---|
| F1 | Root keyset growth: the legal top-level keyset grows the ch8 five (`ref`/`start`/`steps`/`terminal`/`roles`) + the ratified optionals to include `activation` (C1) beside the P3/ch11-realized `runtimeContext` and `round` (`validate.ts:36/40` — `OPTIONAL_ROOT_KEYS` gains `activation`; ch8-C7's additive-growth clause is the carrier; no ch11 row is modified). `activation` maps onto the built `WorkflowTemplate.activation?` field (`domain/template.ts:185`). Every other key remains the ch8 unknown-key finding (`kind` still reserved, ch8-C24); `activation` at step / roles-entry grain is unknown (it is root surface). (anchored: contract:ch12-runtime-core#C1, contract:ch8-template-format#C7) |
| F2 | The `activation` container + `mode` source-form: `activation` is a FIXED-KEYSET map with the single key `mode`, REQUIRED when the key is authored (an empty `activation: {}` → the missing-`mode` finding at `activation`); `mode`'s value ∈ { `immediate`, `deferredKickoff` } (authored camelCase ↔ the model's stored `immediate` / `deferred_kickoff` — the C1/C11 authored↔stored mapping, stated so neither side silently forks); a non-string or non-member `mode` value is a finding at `activation.mode`; a PRESENT `activation` that is not a map (present-null, scalar, list) is a container-precondition finding at path `activation` (ONE finding, dependent lanes suppressed — C25's channel); unknown keys in the map are findings at `activation.<key>` (ch8-C13 fail-closed culture). The walk performs NO default materialization — an ABSENT key leaves the field absent, and admission materializes the `immediate` default (G3, P1a-built, `admit.ts:456`). (anchored: contract:ch12-runtime-core#C1) |
| F3 | The `runtimeContext` requirement source-form (the C18-successor value domain, owned by C2/C3): the walk resolves the value domain { the string `none` (→ `none`); a SPEC MAP (→ `required(spec)`) } and MATERIALIZES a file-channel spec map — a `mapAsMap` JS `Map` under `toJS({mapAsMap:true})` (`load.ts:232`) — into an own-property record delivered to the built template's `runtimeContext` slot (the `defineOwn` materialization idiom, mirroring ch11-P4's F3 gates-subtree rule; this RETIRES the P4-deferred Map interception at `admit.ts:323-339`). The spec map is FIXED-KEYSET: `kind` (required, `^[a-z][a-z0-9_]*$`), `provider` (required, the ch11-C6 dotted grammar `^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$`), `config` (OPTIONAL map, RAW pass-through — provider-owned, uninterpreted; probe RP3); each grammar/keyset violation is a finding at its path (`runtimeContext.kind`, `runtimeContext.provider`, `runtimeContext.<unknown>`). An illegal `runtimeContext` value (present-null / list / other-scalar — anything that is NEITHER the string `none` NOR a spec map) is NOT materialized by the walk: F3 passes it through RAW, and admission's A1 container-precondition lane (P3-built, `admit.ts:340-350`) emits the ONE finding at `runtimeContext` (probes RP1/RP2). This is the OWNERSHIP ASYMMETRY with F2 (stated so neither side forks): `activation`'s container check is the WALK's (F2 — new at P4, the walk owns the whole activation container); `runtimeContext`'s illegal-VALUE container check is ADMISSION's (A1 — the value-level lanes were built at P3, and P4's walk adds ONLY the spec-map SOURCE-FORM: the materialization + the well-formed spec map's own keyset/grammar). The bare-`required` migration refusal is likewise admission's (A1, P3-built); the walk never legalizes or rejects a `runtimeContext` value's MEANING — only a well-formed spec map's FORM. (anchored: contract:ch12-runtime-core#C2, contract:ch12-runtime-core#C3) |
| F4 | The `defaultAgentConfig` roles-entry keyset growth: the roles-entry legal keyset becomes `defaultActor?` + `defaultAgentConfig?` (C6 — camelCase of the model's `default_agent_config`; ch8-C15's roles-entry keyset grows additively under ch8-C7, the ch11-C1 successor-row precedent; `validate.ts:570-577` gains the key beside `defaultActor`). The walk delivers the resolved value to the built roles-entry slot (`domain/template.ts:143-145`, the type already carries it); `defaultAgentConfig` at any OTHER grain is unknown. The agent-config VALUE CLASS (a map, canonical-JSON-safe — C7) is admission's value-level gate (A3, P2-built), driven here through the file channel. (anchored: contract:ch12-runtime-core#C6, contract:ch12-runtime-core#C7) |
| F5 | Channel equivalence for the defaults + the agent-config step position: an absent `activation` key → admission's `immediate` default (F2); an absent `runtimeContext` key → admission's `none` requirement (C4, P3-built); the EXISTING `steps.<s>.agentConfig` position (its keyset slot `validate.ts:43` + its raw-pass-through walk are P2/ch11-built) carries its value to the built template unchanged (the value-level map + canonical-JSON gate is admission's, A3). The walk adds NO default and NO value interpretation — a source-form-clean runtime-key template maps onto the typed fields and admission materializes the same value the direct channel constructs (Claim 1's deep-equal). (anchored: contract:ch12-runtime-core#C1, contract:ch12-runtime-core#C4) |

## Canonical admission-drive matrix (A — the value-level lanes, `admit.ts`; P1a/P2/P3-built, DRIVEN through the file channel here + the P4-deferred retirement)

| ID | Rule |
|---|---|
| A1 | The `runtimeContext` value-level lanes (C2, admission-owned, P3-built at `admit.ts:305-350`) DRIVEN through the file channel: the bare string `required` → the LOUD migration refusal ("author the spec map `{kind, provider, config?}`" — the §8.2 rule-3 mechanic, `admit.ts:315-322`); a present-null / list / other-scalar value → the container-precondition finding (`admit.ts:340-350`); a source-form-clean spec map (now MATERIALIZED by F3 into an own-property record) → the normalized `required(spec)` (`normalizeRuntimeContext`, `admit.ts:468-480`). The P4-DEFERRED Map interception (`admit.ts:323-339`, "deferred to P4 (C25)") RETIRES — its raison d'être (a file spec map arriving as an un-walkable JS Map) is closed by F3's materialization. (anchored: contract:ch12-runtime-core#C2, contract:ch12-runtime-core#C25) |
| A2 | The process↔workspace ADMISSION cross-rule (C5, admission-owned, P3-built at `admit.ts:359-367`) DRIVEN through the file channel: a template declaring ANY `external.process` gate whose requirement RESOLVES to `none` (authored `none` or absent key) → the `runtime_context_required_for_process_gate` admission finding (`admit.ts:362`); a real spec map (now file-authorable via F3) → NO finding (the provisionable requirement satisfies it); an ILLEGAL `runtimeContext` value → ONLY A1's container finding, this lane SUPPRESSED as its dependent (ch8-C21). (anchored: contract:ch12-runtime-core#C5) |
| A3 | The agent-config VALUE-CLASS lanes (C7, admission-owned, P2-built — `checkAgentConfigValue`) DRIVEN through the file channel for BOTH template positions: `roles.<r>.defaultAgentConfig` (newly file-authorable via F4) and `steps.<s>.agentConfig` — a non-map value → a container-precondition finding at the position's path; a resolved value carrying a non-finite number (the YAML `.nan`/`.inf` forms) → the canonical-JSON-safety rejection (C7's value-level lane — the emit-lib strictness the provenance serialization rests on). The `runOverrides` position is NOT a template position — its structure is the CLI-side check (V2), the kernel treating each entry opaquely (C9). (anchored: contract:ch12-runtime-core#C7) |

## Canonical CLI-verb matrix (V — the operator surface, `main.ts`)

| ID | Rule |
|---|---|
| V1 | The write family gains `create` / `start` / `kickoff` / `cancel` (C19) as THIN INGRESS WRITERS — each a `VERBS` entry (`main.ts:476-484`) delegating to the built kernel method (`kernel.create` / `.start` / `.kickoff` / `.cancel`, `kernel.ts:106-142`); no CLI handler writes through `StorePort` directly (the ch6 write-entrypoint rule). The dev `validate` verb (`dev/main.ts:642-673`) rides the F1–F5 walk automatically — its new source-form findings surface in the same `TemplateInvalid` `{stage, findings}` doc (V1's `validate` share, C31/C38 shapes unchanged). No new dev verbs; the provisioned path stays `replay`-drivable via the scripted provider (C19, P3-built). (anchored: contract:ch12-runtime-core#C19, contract:ch12-runtime-core#C22) |
| V2 | `create` schema (C20): the pinned template ref (ch8-C30 grammar; default `local-pair-v0@1`), the caller-minted instance id (`ctx.deps.instanceIdSource()`, the existing rule), optional `--task`, the existing `--override role=actor` binding surface, optional `--run-overrides` (a JSON map of step-id → agent-config map — shape-validated CLI-side as STRUCTURE only: valid JSON, a map whose every entry is a map, canonical-JSON-safe; the SEMANTICS are kernel-side, C9), and optional `--mode` (`immediate | deferredKickoff` — the CREATE-level choice, C13; absent → the admitted template's default). `create` mints the instance id ONLY (no `op_id` — creation is genesis, C13) and emits the `Created` outcome as data (the instance id surfaced on stdout for scripting the `create`→`start` sequence). The CLI-side INPUT-PRECONDITION lanes, each a deterministic `usage`/2 (the ch6 usage class — mirroring F2's template-grain enum/structure findings at the CLI input grain; the kernel never sees a malformed input, so `errors.ts` and the kernel are untouched): a `--mode` value OUTSIDE `{immediate, deferredKickoff}` (a non-member token — the CLI validates membership before `kernel.create`, never resolving a bogus token through the `?? default` cascade); a `--run-overrides` value that is NOT valid JSON, OR valid JSON that is NOT a map, OR a map with an entry that is NOT a map, OR carrying a non-canonical-JSON-safe value (the structure-only check, C7/C9). The kernel-outcome lanes surface in their ch6 class: a `Rejected(task_required)` (immediate mode, no task) is an exit-3 kernel-negative DATA doc; a binding-coverage failure is a `kernel.create` THROW the CLI catches and maps to `usage`/2 (the guard migrated from the retired bridge, V4 — `main.ts:347-352`). (anchored: contract:ch12-runtime-core#C20, contract:ch12-runtime-core#C13, contract:ch12-runtime-core#C9) |
| V3 | `start <instance-id>` and `cancel <instance-id>` carry no payload; `kickoff <instance-id> --task <task>` REQUIRES the task (its nonempty-string grammar, the ch4 task-string culture — a missing `--task` is `usage`/2). `start` / `kickoff` / `cancel` MINT their nonce `op_id` (the request-scoped nonce family, `deriveOperatorOpId(ctx.deps.nonceSource())` — C13). Every verb surfaces its LIFECYCLE outcome in the ch6 CHANNEL/exit classes (stdout one data doc, stderr one error doc; 0 ok / 2 usage / 3 not-found·kernel-negative / 1 internal — the CLASS shapes inherited from ch6-P4a UNCHANGED), but over the per-op outcome VOCABULARY of `CreateOutcome`/`StartOutcome`/`KickoffOutcome`/`CancelOutcome` (`domain/outcome.ts`), which DIFFERS from the actor-transition `Outcome`: `stale` does NOT occur (a lifecycle CAS conflict RETRIES in-loop — `lifecycle.ts` `case "cas_conflict": continue` — never surfacing an outcome). The mapping: SUCCESS/idempotent kinds (`created`/`activated`/`accepted`/`terminated`/`duplicate`) → exit-0 DATA docs (`duplicate` is idempotent success); `rejected(reason)` kinds (`task_required`/`unknown_instance`/`op_id_collision`/`runtime_context_provider_unavailable`) → exit-3 kernel-negative DATA docs — an unknown instance on the WRITE path is a `Rejected(unknown_instance)` DATA doc, NOT a read-side `notFound` ERROR doc (the read verbs' notFound/3 is a distinct surface); an INTEGRITY THROW → exit-1 internal — the terminal-sink guard on `cancel`/`kickoff` of an already-TERMINAL run is a `state_violation` THROW (`CancelOutcome`/`KickoffOutcome` carry NO terminal arm — a terminal instance is an INVARIANT sink, not a business rejection), as is a colliding minted id; a CLI-side INPUT-PRECONDITION failure (missing `--task`; a `--mode`/`--run-overrides` malformed input) → exit-2 usage (stderr error doc). (anchored: contract:ch12-runtime-core#C20, prose:packet ch6-p4a) |
| V4 | The bridge retirement (C24 named replacement): the C25 in-handler CREATE→START bridge (`verbStart`, `main.ts:305-352` — `kernel.create(...)` then `kernel.start(...)` in one handler) RETIRES; `start` becomes the real single-op START verb (calls `kernel.start` alone with a minted `op_id`, no create). This is a BREAKING surface change (ch8-C29 class): the packet's ripple sweep enumerates the bridge's CONSUMERS by the RETIRED behavior's name (R-ABSENCE-CONSUMERS — searching `C25 bridge` / the create-then-activate assertion, never only the new verb token) and re-targets each (`create` proves creation, `start` proves activation). NO convenience CREATE+START composition ships (C19 — the model permits one; deferred additively; dogfooding runs `create` then `start`). The retired bridge's own guards (the binding-coverage → usage lane, `main.ts:347-352`) migrate to `create` (where CREATE now rejects binding coverage). The P4-deferral pointer comments (`main.ts:308`) retire in the same commit. (anchored: contract:ch12-runtime-core#C24, contract:ch12-runtime-core#C19, contract:ch12-runtime-core#C25) |
| V5 | The `--mode` + `--run-overrides` realizations (C13/C9): `--mode deferredKickoff` on an immediate-default template creates task-less LEGALLY (the EFFECTIVE mode = the CREATE input ?? the template `activation.mode` default ?? `immediate`, resolved once at CREATE and snapshotted — C13; CREATE's `task_required` check reads the resolved mode). The CREATE input is a MEMBER token BY CLI PRECONDITION — a non-member `--mode` is refused CLI-side (V2's `usage`/2 lane) BEFORE the cascade, so the `?? default` resolution never sees a bogus token (the fail-open a silent pass-through would create is closed at the CLI grain). `--run-overrides` snapshots onto the instance's `run_overrides` (C9, frozen for the run); an unknown step-id in the map is INERT kernel-side (the model's `get(step.id, empty_config)` semantics — no CLI-side rejection lane, the ratifier's D5 conscious-debt disposition, an explicit later decision, deliberately not a finding here). (anchored: contract:ch12-runtime-core#C13, contract:ch12-runtime-core#C9, contract:ch12-runtime-core#C20) |
| V6 | The spec-declaring template through the shipped CLI (C16): `start` on a template declaring a `runtimeContext` spec map — now file-authorable via F3 — resolves the provider against the EMPTY production registry (`createStaticProviderRegistry({})`, `main.ts:303`) and the kernel returns `Rejected(runtime_context_provider_unavailable)` (the kernel's own lane, C16 — replacing the retired ch11-P4 CLI-side eager guard, already retired at P3, `main.ts:273-283`): an exit-3 kernel-negative DATA document. Such a template is honestly UNSTARTABLE through the shipped CLI until `pairflow.worktree` joins at ch9 (C15's production-provider gate binds that entry). The provisioned path stays drivable pre-ch9 ONLY via dev `replay` (the scripted provider, P3-built). (anchored: contract:ch12-runtime-core#C16, contract:ch12-runtime-core#C20) |
| V7 | The activation journey (the R-ACTIVATION-JOURNEY discharge): a subprocess-driven, production-bound (empty registry, C16), DETERMINISTIC context-free deferred-hold lifecycle through all four verbs — (a) `create --mode deferredKickoff` (no task; a context-free template) → `Created` + the instance id on stdout → `start <id>` → `Accepted`, the run `WAITING(kickoff_pending)` → `detail <id>`'s instance shows `kernelStatus: "WAITING"` + the typed `wait` (the emitted read-doc grain, R1) → `kickoff <id> --task <t>` → activation (currentStep = template.start, round 1); (b) a CANCEL lane — `create --mode deferredKickoff` → `start` → held → `cancel <id>` → `TERMINAL(cancelled)`, `detail`'s instance showing `kernelStatus: "TERMINAL"` + `terminalDisposition: "cancelled"` and the compact `list` row's cancelled discriminant. Deterministic by construction (context-free + deferred: no provider leg; the state reads land BEFORE any immediate dispatch would spawn an actor — the P1b context-free deferred-hold journey pattern through the shipped surface). V7 DISCHARGES the R-ACTIVATION-JOURNEY smoke (this packet's acceptance obligation); the §12.5 hand-driven dogfooding checkpoint is a SEPARATE chapter-CLOSE act (run-or-waived at close, the DoD's own disposition — V7's CI-safe automation makes a waive low-risk but does not itself waive it), not this packet's acceptance obligation. DERIVATION NOTE (stays derived — the arm's new-decision challenge reconciled): the ROW is FORCED — R-ACTIVATION-JOURNEY requires a shipped-entrypoint lifecycle smoke, C16's EMPTY production registry + the determinism clause leave the context-free DEFERRED-HOLD shape as the ONLY deterministic full-lifecycle path pre-ch9 (an immediate/provisioned run spawns an actor or needs a provider — both ch9), and covering all four verbs is the DoD's intent; the exact branch structure (two runs vs a single create→start→kickoff→cancel path — both cover the verbs) is fixture-shape BUILD-FREEDOM per R-ALTITUDE-LINE, not a spec-time decision — so the ROW derives while its structure is build work (the arm's single-path alternative is at the fixture altitude the line defers). (derived: prose:template §2 write-time disciplines, prose:packet ch12-p1b, contract:ch12-runtime-core#C19) |

## Canonical floor matrix (R — the read projection, `floor.ts`)

| ID | Rule |
|---|---|
| R1 | `listInstances` projects a COMPACT state discriminant (C21 — the contrast with `detail`): each row carries `instanceId`, `templateRef`, `currentStep`, `round`, `kernelStatus`, `terminalDisposition`, `activationMode`, the typed `wait`'s KIND (not its full payload), and the runtime-context STATE discriminant `none | requested | ready` WITHOUT the opaque locator (the `projection-never-the-ref` culture applied to the human list payload — C17; a compact read never leaks the provider-defined locator). READ-DOC GRAIN (the canonical statement — the authored↔stored culture at the read face, stated once so neither side silently forks): the projected keys are the `WorkflowInstance` TS field names (`kernelStatus` / `terminalDisposition` / `activationMode` / `wait` / `runtimeContext`) — the EMITTED read-doc keys, since the CLI read verbs `JSON.stringify` the floor's output verbatim (camelCase, the emitted grain); the snake_case tokens `kernel_status` / `terminal_disposition` / `activation_mode` that C11's columns and C21's prose name are the STORED-COLUMN / model grain. Every read-doc EXHIBIT in this packet (V7, dimension 12) uses the emitted camelCase; every reference to C11/C21's field concepts uses the model snake_case. The projection is a pure read over the already-stored `WorkflowInstance` fields (P1a–P3-built schema, `domain/instance.ts:85-110`) — `floor.ts:29` gains the compact mapping; the store's own `listInstances` (the kernel's full-instance read) is byte-untouched (the floor is a read-only projection layer; the sole floor-level consumer `l0bTrace.test.ts:158` asserts `.toHaveLength(1)` only — no row field — and survives the return-type narrowing, named here per R-ABSENCE-CONSUMERS, boundary-EXCLUDED as it needs no edit). DECISION NOTE (new-decision — the arm-gate-1 reclassification): C21 prescribes "a compact state discriminant" and C17 forces the opaque-locator EXCLUSION, but neither pins the exact membership — the full typed `wait` vs its `kind` alone, and `version` present vs absent, are each conforming alternatives (the arm's entailment attack; W1 had flagged the shape open). The CHOSEN compact set is: `instanceId`, `templateRef`, `currentStep`, `round`, `kernelStatus`, `terminalDisposition`, `activationMode`, the `wait`'s KIND only, and the runtime-context state discriminant (`none | requested | ready`, no locator) — a `version`-excluded, kind-only-`wait` projection chosen because a list row is a state-scan surface (the discriminant, not the full payload); `detail` (R2) carries the full `wait` + ref for the operator read. Flag F1 carries this decision; the human approve ratifies it. Touches no authority/separation/availability-class semantics (a human-display projection). (new-decision: the compact-list field selection under C21/C17) |
| R2 | `getInstanceDetail` exposes the FULL stored state INCLUDING the opaque `runtime_context` ref (an operator/debug read surface — the `projection-never-the-ref` invariant binds the ACTOR PACKET, C17, never the kernel-side floor; the asymmetry is deliberate and stated). It already returns `{instance, transcript}` with every field (`floor.ts:30`); this row's obligation is the VERIFY that the full ref survives the projection (no accidental compacting) and that the `detail` verb's raw JSON dump carries it. (anchored: contract:ch12-runtime-core#C21, contract:ch12-runtime-core#C17) |
| R3 | `getTimeline` returns BOTH transcript entry classes — actor `TransitionEntry` (carrying `issuedAgentConfig`, C10) and `LifecycleFactEntry` (`STARTED` / `CANCELLED` / `TASK_SUPPLIED`) — with their entry-kind visible (C12; committed-rows-only, unchanged). The ch-4 `status` / `LifecycleStatus` field is ABSENT from EVERY floor read doc (C11/C24 named replacement — retired at P1a; `kernel_status` + `terminal_disposition` are the replacement, and the floor docs never reintroduce the retired field). The stale floor doc comment (`floor.ts:4-10`, ch-6-scoped) updates to name the ch12 macro-lifecycle read surface. (anchored: contract:ch12-runtime-core#C12, contract:ch12-runtime-core#C21, contract:ch12-runtime-core#C11) |

## Site × shape × phase grid

The packet adds ZERO awaited sites to the validator walk (F1–F5 are
synchronous and pure over the parsed doc — the ch8/ch11 `readdir`/
`readFile` pipeline sites keep their lanes byte-untouched). The grid
exists because the four verbs sit on the CLI's async ingress seam and
the START verb's shape changes across the bridge retirement:

| Site | Shape | Phase | Disposition |
|---|---|---|---|
| `create` (`kernel.create`, `main.ts`) | immediate mode, no `--task` | pre-commit (CREATE gate) | `Rejected(task_required)` → exit-3 data doc (the kernel lane; C13's resolved-mode check) |
| `create` | `--mode deferredKickoff`, no `--task` | pre-commit | `Created` (task-less legal — the CREATE-level choice; C13/V5) |
| `create` | binding coverage unmet | pre-commit | binding-coverage rejection → `usage`/2 (the retired bridge's guard, migrated to `create`; V4) |
| `create` | malformed `--run-overrides` JSON | pre-ingress (CLI parse) | `usage`/2 InvalidPayloadJson (the CLI-side structure check; V2) |
| `create` | `--run-overrides` valid JSON, not a map, OR an entry not a map | pre-ingress (CLI parse) | `usage`/2 (the map-of-maps structure check; V2) |
| `create` | `--run-overrides` map-of-maps with a non-canonical-JSON-safe LEAF (e.g. `1e999` → `Infinity`) | pre-ingress (CLI parse) | `usage`/2 (the canonical-JSON-safety check — survives JSON + map-of-maps, fails the leaf; V2) |
| `create` | `--mode` non-member token | pre-ingress (CLI parse) | `usage`/2 (CLI membership check before `kernel.create` — never resolved through the `?? default` cascade; V2/V5) |
| `start <id>` | context-free, immediate | post-CREATE, pre-commit | `Activated` (the first dispatch leaves START) → exit-0 data doc |
| `start <id>` | context-free, deferred | post-CREATE, pre-commit | `Accepted`, `WAITING(kickoff_pending)` → exit-0 data doc (V7's hold) |
| `start <id>` | spec-declaring template | pre-commit (registry resolve) | `Rejected(runtime_context_provider_unavailable)` → exit-3 (the EMPTY production registry; C16/V6) |
| `start <id>` | unknown instance | pre-state | `Rejected(unknown_instance)` DATA doc → exit-3 (a WRITE-path kernel-negative, NOT a read-side `notFound` error doc) |
| `start <id>` | replayed `op_id` | commit | `Duplicate` → exit-0 idempotent-SUCCESS data doc (the uniform commit discipline, C12; `committed`/`duplicate` → 0 in `outcomeExitCode`) |
| `kickoff <id>` | no `--task` | pre-ingress (CLI parse) | `usage`/2 MissingTask (the ch6 class; V3) |
| `kickoff <id>` | a WAITING(kickoff_pending) run | commit | `TASK_SUPPLIED` fact + activation → exit-0 data doc |
| `cancel <id>` | a non-terminal run | commit | `CANCELLED` fact + `TERMINAL(cancelled)` → exit-0 data doc |
| `cancel <id>` | a terminal run | pre-commit (terminal-sink) | the terminal-sink `state_violation` THROW → exit-1 internal (`CancelOutcome` has NO terminal arm — a terminal instance is an INVARIANT sink, not a business rejection; `lifecycle.ts` `throw ... "cancel failed (terminal sink)"`) |

## Mirrored surface map (one canonical statement per rule)

| Rule | Canonical home | Named mirrors (summarize/defer only) |
|---|---|---|
| admission is the ONE semantic authority; the walk adds no value semantics | F3 (the "form not meaning" clause) | Claim 1/2 · F1/F2/F4/F5 · A1/A2/A3 · the sizing authority axis |
| the `activation` source-form grammar | F2 | Claim 2 · dimension 1 · C1's authored↔stored note |
| the `runtimeContext` value-domain split + the spec-map materialization | F3 | Claim 1/2 · dimension 2 · A1's file-drive · the P4-deferred retirement (Claim 6 item 5) |
| the `defaultAgentConfig` roles-entry growth | F4 | Claim 2 · dimension 3 · A3's value-level drive |
| the four verbs as thin ingress writers | V1 | Claim 3 · dimension 7/8 · the consume-family external row |
| the ch6-P4a exit/channel/error-class matrix (0 ok / 2 usage / 3 not-found·kernel-negative / 1 internal; inherited UNCHANGED) | V3 | Claim 3 · the site×shape×phase grid's exit cells |
| the floor read-doc grain (emitted camelCase keys ↔ model/column snake_case tokens) | R1 (the READ-DOC GRAIN clause) | the header's field concepts · Claim 5 · R3 · V7's exhibits · dimension 11/12's exhibits |
| the bridge retirement + the consumer sweep | V4 | Claim 4/6 · dimension 10 · the sizing proof-boundary annex · W2 |
| the CREATE-level mode + run-overrides | V5 | Claim 3 · dimension 9 · C13/C9 |
| the spec-declaring-template unstartable lane | V6 | Claim 3 · dimension 8 · the grid's spec-declaring cell |
| the compact/full floor split (ref excluded from list) | R1 (+ R2 the full ref) | Claim 5 · dimension 11 · F1 (R1's decision) · C17's ref-exclusion |
| both entry classes on the timeline; `status` gone | R3 | Claim 5 · dimension 11 · C11/C24's named replacement |
| the shipped template/fixture gain NO keys; the pin holds byte-unedited | the sizing testkit axis | Claim 6 · the operative material's "gains NEITHER" note · the boundary-exclusion of the pin test |
| the closed declared-edit inventory | Claim 6 | dimension 10/11 · the acceptance honesty bullet · the sizing proof-boundary annex |
| the activation journey discharge | V7 | the sizing R-ACTIVATION-JOURNEY disposition · dimension 12 |
| the RP6 hostile source forms driven | dimension 4 | Claim 2 · F3 · the operative material's probe note |

Fold policy: a change to a canonical row updates every named mirror
before handing back; a mirror discovered in review is added here.
Convention (stated once): each acceptance bullet MIRRORS the
dimension(s) it names and defers to them — acceptance bullets are not
listed per map row.

## In-context notes (the scarce budget)

- **Extend, don't fork:** the root keyset grows in place
  (`OPTIONAL_ROOT_KEYS`, `validate.ts:40`); the roles-entry key joins
  the existing `defaultActor` check (`validate.ts:570-577`); the
  `activation`/`runtimeContext`-spec-map walk lands in `validate.ts`'s
  existing single pass — no new module, no second walk. The spec-map
  materialization mirrors the agentConfig `materializeResolvedValue`
  idiom (own-property record from a `mapAsMap` Map, the F3 stringness
  discipline where map keys must be strings). The four verbs join the
  `VERBS` record + `VERB_OPTIONS` schema (`main.ts:445-484`); the
  compact projection lands in `floor.ts:29`.
- **The bridge retirement is a 1:1 un-bundling, not a rewrite:**
  `verbStart` today calls `kernel.create` then `kernel.start`
  (`main.ts:316-331`); P4 moves the `create` call into a new `create`
  verb and leaves `start` calling `kernel.start` alone. The
  binding-coverage → usage guard (`main.ts:347-352`) moves to `create`
  (CREATE is where binding coverage now rejects). Do NOT invent a
  convenience verb (C19).
- **The floor is a projection, not the store:** `floor.listInstances`
  compacts; `store.listInstances` (the kernel's full read) stays
  full — never compact the store method (the kernel depends on the
  full instance). `detail`/`timeline` already return full — R2/R3 are
  verify-and-doc, not new projection.
- **The spec-declaring template is honestly unstartable through the
  shipped CLI** (C16 — empty production registry): do NOT wire the
  scripted provider into production to make it startable (ADR-005
  boundary). The kernel's `runtime_context_provider_unavailable` lane
  is the authority; the retired ch11-P4 eager CLI guard does NOT
  return (it retired at P3).
- **Do not "fix" the inert dead-override-key shape** (C9's stated
  consequence, the ratifier's D5 conscious debt): an unknown step-id
  in `--run-overrides` is INERT kernel-side; no CLI rejection lane, no
  warning — that detection stays a named later decision.
- **The shipped template + fixture gain NO keys** (C25): the
  equality pin (`templateFixture.test.ts`) holds BYTE-UNEDITED and
  stays OUTSIDE the boundary — its protection is its exclusion (both
  comparison sides run through admission, so any P4 admission-path
  change lands identically on file-parse and fixture; a one-sided
  drift is mechanically red).
- **Hostile source-form fixtures are raw authored YAML text** written
  to a temp templates dir (filename `<id>@<version>.yaml` per
  ch8-C26); the channel preserves them exactly (R-RAW-FIXTURES
  satisfied without staging tricks — the RP6 forms ride as raw
  strings).

## Embedding gates (v1-inherited)

- Target files (verified against the live tree, 2026-07-22):
  EDITED (production) — `v3/src/definition/validate.ts` (F1–F5, the
  source-form walk), `v3/src/definition/admit.ts` (A1's P4-deferred
  Map interception removed + the P4-deferral pointer comments
  `admit.ts:291/325/335/442`), `v3/src/definition/load.ts` (a possible
  comment; the walk+admit accumulation rides the existing pipeline),
  `v3/src/cli/main.ts` (V1–V6: the four verbs + `VERB_OPTIONS` schema
  + the bridge retirement + the P4-deferral comment `main.ts:308`),
  `v3/src/floor/floor.ts` (R1's compact projection + the R3 doc
  update), `v3/src/domain/template.ts` (P4-deferral pointer-comment
  retirements only — `template.ts:84/140/172/181/183`).
  EDITED (tests) — `definition/validate.test.ts` (dimensions 1–4),
  `definition/load.test.ts` (dimensions 5–6, the file-channel drives +
  channel equivalence), `definition/admit.test.ts` (A1–A3 file-drives
  + the retirement), `definition/fileDefinitionStore.test.ts` (a
  runtime-key template loads by ref), `cli/cli.test.ts` (V2–V6 + the
  `C25 bridge` consumer sweep incl. `cli.test.ts:1210`'s
  refusal→walks flip), `cli/journey.test.ts` (V7 + the bridge-consumer
  re-targets `journey.test.ts:61/119/152-155`), `cli/dev/dev.test.ts`
  (V1's `validate` doc lanes + the `dev.test.ts:112` bridge comment),
  `floor/floor.test.ts` (R1–R3). UNTOUCHED, explicitly:
  `v3/src/testkit/templateFixture.ts`, `v3/templates/local-pair-v0@1.yaml`,
  and `v3/src/testkit/templateFixture.test.ts` (the equality pin —
  boundary-EXCLUDED so any edit trips the post-build audit
  mechanically; C25 forbids new keys, so no edit is due).
- Entrypoints: `loadTemplate` / `validateTemplate` (the walk),
  `admitTemplate` (the A-lane drives), the CLI mains (`runCli` — the
  four verbs; `runDevCli` — `validate`'s lanes ride unchanged
  machinery), `createFloor` (the compact projection).
- Sweeps (measured 2026-07-22, untruncated — re-run at build per
  R-UNTRUNCATED-SWEEP / R-ABSENCE-CONSUMERS):
  - `grep -rn "C25 bridge\|CREATE→START\|create-then\|the bridge" v3/src --include="*.ts"`
    → the bridge-consumer inventory (V4's R-ABSENCE-CONSUMERS sweep,
    searching the RETIRED behavior's name via TWO arms — the
    literal-token grep AND the create-and-activate BEHAVIOR-assertion
    arm (a wrapped comment token or a bare `STARTED`-at-seq-1 assertion
    is behavior-visible but literal-grep-invisible; the behavior arm is
    the R-ABSENCE-CONSUMERS half) — classified in TWO groups (the
    membership UNIT is the site; the exact line count defers to the
    build re-measurement — W2): (i) the SHIPPED-VERB consumers,
    re-targeted at build (all in-boundary) — `cli/main.ts:46/306-307`
    (the bridge itself), `cli/cli.test.ts:139/224-225/290/1232`,
    `cli/journey.test.ts:61` (literal) + `119/152-155` (behavior arm —
    the wrapped token + the STARTED/round-2 assertions),
    `cli/dev/dev.test.ts:112` (each an assertion of the shipped `start`
    verb's create-and-activate one-shot); (ii) the
    DIRECT-COMPOSITION seams that call `kernel.create`→`kernel.start`
    WITHOUT the shipped verb and stay BYTE-UNTOUCHED (the same
    exclusion class as the dev `replay` seam named in Claim 4) —
    `testkit/traceHarness.ts:31/234`, `testkit/traceHarness.test.ts:70`,
    `twoWorker.test.ts:120`: these are NOT shipped-verb consumers, so
    the bridge retirement leaves them unchanged (a builder must NOT
    re-target them). The "untruncated" claim binds this re-run's full
    output, both groups enumerated.
  - `grep -rn "\.listInstances(" v3/src --include="*.ts"`
    → the floor-projection consumer sweep (R1's return-type narrowing,
    R-ABSENCE-CONSUMERS): `cli/main.ts:124` (the `list` verb, in-boundary),
    `floor/floor.test.ts` (in-boundary), `l0bTrace.test.ts:158`
    (a `.toHaveLength(1)` length-only consumer — no row field read, so
    it SURVIVES the narrowing untouched and stays boundary-EXCLUDED;
    named so it is not silently missed). The store's own
    `store.listInstances` (the kernel read) is a distinct method,
    byte-untouched.
  - `grep -rn "P4" v3/src --include="*.ts"` filtered to the ch12-P4
    deferral pointers (the ★ set): `cli/main.ts:308`, `admit.ts:291/
    325/335/442`, `domain/template.ts:84/140/172/181/183`,
    `cli/cli.test.ts:1210` — retired/flipped in this commit; the
    prior-chapter P4 mentions (ch4/ch5/ch7/ch11-P4) stay untouched.
  - `grep -rn "startInstance" v3/src --include="*.ts"` → only comments
    confirming the ch-4 one-shot's retirement (no live call site — the
    bridge uses `kernel.create`/`kernel.start`).
- Mutation boundary: the files below; extend-don't-fork. The kernel,
  store, cascade, `gates/`, provider port, and diag surfaces are
  behavior-untouched (Claim 6); `errors.ts` needs no change (the
  finding forms + the P3-built codes carry everything — no new code).
  `v3/implementation/plan.md` joins the boundary for the aligned §12.4
  edit (R-ALIGNED-UP — the ch12-p1a precedent of listing the aligned
  plan file in the boundary block).

```json
{
  "mutation_boundary": {
    "files": [
      "v3/implementation/plan.md",
      "v3/src/definition/validate.ts",
      "v3/src/definition/validate.test.ts",
      "v3/src/definition/admit.ts",
      "v3/src/definition/admit.test.ts",
      "v3/src/definition/load.ts",
      "v3/src/definition/load.test.ts",
      "v3/src/definition/fileDefinitionStore.test.ts",
      "v3/src/cli/main.ts",
      "v3/src/cli/cli.test.ts",
      "v3/src/cli/journey.test.ts",
      "v3/src/cli/dev/dev.test.ts",
      "v3/src/floor/floor.ts",
      "v3/src/floor/floor.test.ts",
      "v3/src/domain/template.ts"
    ]
  }
}
```

## Row manifest (the D1 classification's machine face)

```json
{
  "packet_rows": {
    "rows": [
      { "id": "F1", "class": "anchored", "refs": ["contract:ch12-runtime-core#C1", "contract:ch8-template-format#C7"] },
      { "id": "F2", "class": "anchored", "refs": ["contract:ch12-runtime-core#C1"] },
      { "id": "F3", "class": "anchored", "refs": ["contract:ch12-runtime-core#C2", "contract:ch12-runtime-core#C3"] },
      { "id": "F4", "class": "anchored", "refs": ["contract:ch12-runtime-core#C6", "contract:ch12-runtime-core#C7"] },
      { "id": "F5", "class": "anchored", "refs": ["contract:ch12-runtime-core#C1", "contract:ch12-runtime-core#C4"] },
      { "id": "A1", "class": "anchored", "refs": ["contract:ch12-runtime-core#C2", "contract:ch12-runtime-core#C25"] },
      { "id": "A2", "class": "anchored", "refs": ["contract:ch12-runtime-core#C5"] },
      { "id": "A3", "class": "anchored", "refs": ["contract:ch12-runtime-core#C7"] },
      { "id": "V1", "class": "anchored", "refs": ["contract:ch12-runtime-core#C19", "contract:ch12-runtime-core#C22"] },
      { "id": "V2", "class": "anchored", "refs": ["contract:ch12-runtime-core#C20", "contract:ch12-runtime-core#C13", "contract:ch12-runtime-core#C9"] },
      { "id": "V3", "class": "anchored", "refs": ["contract:ch12-runtime-core#C20", "prose:packet ch6-p4a"] },
      { "id": "V4", "class": "anchored", "refs": ["contract:ch12-runtime-core#C24", "contract:ch12-runtime-core#C19", "contract:ch12-runtime-core#C25"] },
      { "id": "V5", "class": "anchored", "refs": ["contract:ch12-runtime-core#C13", "contract:ch12-runtime-core#C9", "contract:ch12-runtime-core#C20"] },
      { "id": "V6", "class": "anchored", "refs": ["contract:ch12-runtime-core#C16", "contract:ch12-runtime-core#C20"] },
      { "id": "V7", "class": "derived", "refs": ["prose:template §2 write-time disciplines", "prose:packet ch12-p1b", "contract:ch12-runtime-core#C19"] },
      { "id": "R1", "class": "new-decision", "refs": [] },
      { "id": "R2", "class": "anchored", "refs": ["contract:ch12-runtime-core#C21", "contract:ch12-runtime-core#C17"] },
      { "id": "R3", "class": "anchored", "refs": ["contract:ch12-runtime-core#C12", "contract:ch12-runtime-core#C21", "contract:ch12-runtime-core#C11"] }
    ]
  }
}
```

## Pre-approval flags

(Flag ids are their own namespace — distinct from the matrix row ids.)

ONE new-decision row (manifest tally 16 anchored / 1 derived / 1
new-decision). The approve is therefore FLAG-BEARING (STOP
`4:flagged-approve`, the human's): the arm-gate-1 pass reclassified R1
from derived, minting the flag below, which DEMOTES the approve off
the autonomous path.

- **F1 — the compact `list` field selection (R1, new-decision).**
  C21 names "a compact state discriminant" without a byte-exact field
  list, and C17 forces only the opaque-locator EXCLUSION; the exact
  membership is a genuine choice (the full typed `wait` vs its `kind`,
  `version` present vs absent — each conforming; the arm-gate-1
  entailment attack, W1's earlier watchpoint realized as the
  reclassification). The CHOSEN set (R1's decision note): `instanceId`,
  `templateRef`, `currentStep`, `round`, `kernelStatus`,
  `terminalDisposition`, `activationMode`, the `wait`'s KIND only, the
  runtime-context state discriminant `none | requested | ready` (no
  locator, no `version`) — a state-scan projection; `detail` (R2)
  carries the full `wait` + ref. Tally 16/1/1, below the Case-B
  threshold; no authority/separation/availability-class semantics
  touched (a human-display projection). `Route: approve-ratified` —
  this packet's human approve is the ratification act of the compact
  shape.

Arm-gate-1 also challenged **V7** (the activation journey) as a
second new-decision; that challenge is a `considered_not_finding`
(reconciled, NOT folded): V7's ROW is FORCED (R-ACTIVATION-JOURNEY +
C16's empty registry + the determinism clause admit only the
context-free deferred-hold shape pre-ch9), and the arm's single-path
alternative differs only at the fixture-STRUCTURE altitude that
R-ALTITUDE-LINE defers to build — so the row stays derived, its shape
build-freedom. The human MAY override this reconciliation at the
approve.

- **W2 — the bridge-retirement consumer sweep (V4).** The R-ABSENCE-
  CONSUMERS sweep enumerates the `C25 bridge` consumers by the retired
  behavior's name; the membership is the build re-measurement (a
  test-body re-target class, `deferred-to-build` by R-ALTITUDE-LINE).
  `Route: fold-now` — any consumer the authoring sweep missed folds at
  build; a consumer of the bridge's ABSENCE (a test asserting `start`
  creates, now broken) is token-visible via the `C25 bridge` /
  create-assertion search (R-ABSENCE-CONSUMERS satisfied by searching
  the retired behavior, not the new verb).

Arm-gate-1 CONTENT folds (three, all corrections — no new-decision
mass): (1) the CLI exit mapping was re-based onto the real LIFECYCLE
outcome unions (`domain/outcome.ts`) — `stale` does NOT occur (a
lifecycle CAS conflict retries in-loop), a write-path `unknown_instance`
is a `Rejected` DATA doc/3 (not a read-side notFound), and the
terminal-sink guard on `cancel`/`kickoff` is an integrity THROW/1 (not
an exit-3 rejection) — V3/dimension 8/the grid corrected; (2) the
`runtimeContext` illegal-VALUE container finding is ADMISSION's (A1,
P3-built), NOT the walk's (the ownership asymmetry with `activation`'s
walk-owned container, F2) — F3/Claim 2/dimension 2 corrected; (3) the
plan §12.4 "template-fixture updates" shorthand is aligned to C25's
"no new keys" (the prepared same-commit plan edit, header Plan
alignment). None mints new-decision mass.

Beyond F1/V7/W2: every other decision point was ratified at the
runtime-core draft (2026-07-19 — the acts A/B/C reopen set, the D5
stance set incl. the C13 mode refinement, the C16 empty-registry
stance, the C19 no-convenience-verb stance, the C9 conscious debt,
C25's full staging discipline). No contested substrate premise
exists — every parser-resting lane cites the draft's probed record
(RP1–RP6) at the same pinned `yaml@^2.9.0` (the lockfile is the gate,
re-probed at build).

## Acceptance

Test obligations are stated as DISCIPLINE + FAMILY INVENTORY (the
spec-vs-build altitude line, README §5.5): the discipline names the
rule, the inventory declares the membership with its owner named;
fixture-level enumeration is BUILD work, verified member-by-member by
the build-close arm gate's mandatory sensitivity pass against the
BUILT test bodies (R-LANE-SENSITIVITY binds twice); the builder's
red-on-break mutation-probe list is DERIVED from these family
inventories, ≥1 probe per family, materialized as a build-report table
(R-DERIVED-PROBES).

- **The source-form lane sweep (owner: F1–F5's lane inventory —
  C1's activation grammar + C2/C3's requirement/spec-map grammar +
  C6's roles-entry growth + F5's default lanes):** every member driven
  through `loadTemplate` on YAML-staged fixtures, each able to fail on
  its row's meaning; container-precondition lanes assert the ONE
  finding + dependent suppression; coded/uncoded findings asserted on
  path (and code where admission-coded).
- **Both-direction iffs:** the keyset growth (dimensions 1/3 — each
  new key legal at its grain AND unknown at every other grain; every
  other unknown key still red, `kind` still reserved); the
  `runtimeContext` value-domain split (dimension 2 — `none`/spec-map
  positives vs the present-null/list/scalar container finding vs the
  bare-`required` migration refusal); the `activation` present-null
  vs absent-key split (present-null a finding; absent the F2/F5
  default); the `mode` enum membership (both member positives, a
  non-member finding).
- **The RP6 hostile source forms (owner: dimension 4):** each of the
  merge-key / anchor-alias / `!!str none` / capitalized-null-family /
  duplicate-key forms driven, pinning the fail-closed behavior.
- **Channel equivalence:** dimension 5's maximal runtime-key template —
  file-loaded vs direct-admitted DEEP-EQUAL on the whole admitted
  value (full-document equality, never per-key spot checks).
- **Admission value-level drives, both channels (owner: A1/A2/A3):**
  each admission lane driven through the FILE channel (the source-form-
  clean value reaching admission) AND on the direct channel via
  `admitTemplate` on a cast-forged value; the A1 P4-deferred-Map
  retirement verified (a file spec map now WALKS to `required(spec)`,
  not the deferred refusal — `cli.test.ts:1210`'s flip); the A2
  process-gate cross-rule's real-spec-map-satisfies vs none-triggers
  both directions; the A3 non-finite (`.nan`/`.inf`) rejection at each
  template position.
- **The four verbs' channel matrices (owner: V2/V3 + the ch6-P4a
  matrices + the site×shape×phase grid):** every grid cell driven —
  `create`'s task/binding lanes, the CLI-side INPUT-PRECONDITION
  usage/2 lanes (a `--mode` NON-MEMBER token; a `--run-overrides`
  malformed-JSON, a valid-JSON-non-map-of-maps, and a
  non-canonical-JSON-safe value — each a distinct grid cell), the
  op-carrying verbs' nonce minting, `kickoff`'s required task, each
  verb's ch6 exit class over the LIFECYCLE outcome vocabulary (V3):
  the success/idempotent kinds → exit-0 (`created`/`activated`/
  `accepted`/`terminated`/`duplicate`); `rejected(reason)` → exit-3
  DATA docs (incl. write-path `unknown_instance`, NOT a read-side
  notFound); the terminal-sink `state_violation` THROW → exit-1
  internal (a driven negative — a terminal `cancel`/`kickoff` is NOT
  an exit-3 rejection); NO `stale` lane (the lifecycle CAS retries
  in-loop — a driven NON-occurrence); the `create`-emits-instance-id
  lane (scripting).
- **The bridge retirement (SCOPED, owner: V4 + W2's sweep):** the
  `verbStart` bridge collapsed (a code-level check that `start` no
  longer calls `kernel.create`); every `C25 bridge` consumer
  re-targeted (membership measured at build); no convenience verb in
  the CODE.
- **The `--mode`/`--run-overrides` realizations (owner: V5):**
  `--mode deferredKickoff` task-less-legal; the `--mode` non-member
  refused CLI-side BEFORE the cascade (a sensitivity lane — a bogus
  token must NOT resolve through `?? default`); `--run-overrides`
  snapshotted; an unknown step-id INERT (no rejection — the conscious-
  debt disposition asserted as a NON-finding).
- **The spec-declaring-template unstartable lane (owner: V6 + the
  grid):** `start` on a spec-map template → `Rejected(runtime_context_
  provider_unavailable)` exit-3 through the empty production registry;
  no eager CLI guard resurrected (a code-level check).
- **The floor compact/full split (owner: R1/R2/R3):** `listInstances`
  compact (the axis fields present, the opaque locator ABSENT — a
  sensitivity assert that a `ready(ref)` run's list row carries the
  `ready` discriminant but NOT the locator); `getInstanceDetail` full
  (the locator PRESENT); `getTimeline` both entry classes with kind;
  the `status` field absent from every read doc (a code-level check).
- **The activation journey (owner: V7):** the subprocess context-free
  deferred-hold lifecycle through all four verbs (create-deferred →
  start-held → kickoff-activate; and create → start → cancel →
  TERMINAL(cancelled)), full state reads off the floor, deterministic
  (no provider leg, reads before any dispatch).
- **CLI `validate` doc lanes (owner: V1's validate share):** dev
  `validate` exit 0 on a valid runtime-key file; exit 1 with the
  `TemplateInvalid` `{stage: "validate", findings}` doc for a
  source-form-defective one; one write verb (`create`) surfacing the
  same doc.
- **Behavior-change honesty (SCOPED):** the claimed deltas are EXACTLY
  Claim 6's closed inventory; everything else proven unchanged by the
  FULL existing suite green with zero further edits (the kernel,
  store, cascade, gates, provider port, diag byte-untouched; the
  shipped template/fixture bytes identical; the equality pin green and
  BYTE-UNEDITED, mechanically diffed at close).
- Coverage validation green at close: units 45/159, invariants 38/116,
  traces 8/20 — ALL UNCHANGED (the empty slice verified).
- Drift tests green (standing, unconditional — PI-3): the rejection
  registry untouched (54); `unitMap.json` and `domainRegistry.ts`
  untouched (no flips — no unit or type ownership joins).
- Bridges green at close: `v3:typecheck`, `v3:lint`, `v3:test`,
  `v3:coverage`, `v3:packet-lint` (`--forbid-reopened`: 0 reopened),
  `v3:adr-check` (no new ADR — no module/boundary decision enters;
  ADR-014's homes stand byte-identical), and the FULL `pnpm ci:local`
  gate (the chapter DoD requirement, since this is the chapter's last
  packet before close).
- Standing review rules in force: **REV-A1-TXN** (the commit boundary
  untouched — the verbs delegate to the built kernel ops);
  **REV-B-LOCAL-NOT-AUTHORITY** (the staged files and fixtures are
  never decision inputs); **REV-C-PROJECTIONS-READONLY** (the floor
  read projection never writes; it derives from committed rows);
  **REV-E-NO-ADAPTER-BRANCH** (no adapter branching — the walk
  discriminates on VALUE shapes, the verbs on kernel outcomes);
  **REV-DIAG-FAILOPEN** (diag untouched).

## Build record

Approved 2026-07-22 at STOP `4:flagged-approve` (the human ratified F1 —
the compact-list field selection — and accepted V7 as derived; the
three arm-gate-1 content folds carried). Panel chronicle: R1 FULL
five-lens (one P1 read-doc-grain fold + P2/P3 folds) → R2 TARGETED
(1/3/4/5, bookkeeping folds) → CLOSE caught a content defect (Duplicate
mis-classed exit-3 → exit-0) → RE-CLOSE CLEAN → arm gate 1 (pin-conform
gpt-5.6-sol/high/never, byte-guard clean, 1194 v3 tests green) REFINE
with 5 findings: three CONTENT folds (the exit-matrix re-based onto the
lifecycle unions; the A1 illegal-value ownership; the plan §12.4
alignment) + the R1 derived→new-decision reclassification (F1 minted,
the approve demoted to the human path) + the V7 challenge (reconciled
as considered_not_finding — the row forced, its shape build-freedom).
2 counted panel rounds; closes/re-closes/the arm uncounted; every
internal pass Opus-class.

Built the same day (fresh-context-delegated build, the b8ceeb69
convention: the agent owned the mechanical realization + test bodies;
the orchestrator owns verification + the commit + both arm gates).
**~1197 → 1248 v3 tests** (+51 acceptance lanes; existing bridge
consumers re-targeted in place). The 12 changed code/test files sit
inside the 14-file boundary (`admit.test.ts` + `load.ts` needed no
edit — changed ⊆ declared); the shipped template/fixture, the equality
pin, the kernel, the store, and the provider port are byte-untouched.
In-build-freedom choices (recorded): the A-lane FILE-channel drives
landed in `load.test.ts` (the `loadTemplate` home), leaving
`admit.test.ts`'s direct-channel A-coverage byte-untouched; the
`start`/`kickoff`/`cancel` verbs take `--templates-dir` for wiring
uniformity; the CLI doc labels `CreateFailed` / `InvalidMode` /
`InvalidRunOverrides`; the two-run V7 journey structure (the
R-ALTITUDE-LINE fixture-shape freedom). Builder mutation-probe table
(R-DERIVED-PROBES — ≥1 per family, neutralize→red→restore): F1 (drop
`activation` from the keyset) 7 red; F2 (admit the stored snake token)
1 red; F3 (`kind` grammar → `/.*/`) 1 red; F4 (drop
`defaultAgentConfig`) 2 red; A1 (disable the illegal-value branch) 1
red; A3 (disable canonical-JSON check) 2 red; V2 (`--mode` accepts any)
1 red; V3 (`rejected`→ok) 1 red; R1 (return the full instance) 1 red —
each restored green. Bridges at close (ORCHESTRATOR-rerun, not
builder-claimed): `v3:typecheck` clean · `v3:lint` clean · the v3 suite
1248/1248 · `v3:coverage` OK (45/159 · 38/116 · 8/20 — unchanged) ·
`v3:packet-lint --forbid-reopened` 0 reopened / 0 errors ·
`v3:adr-check` 16 consistent. Boundary containment orchestrator-verified:
12 changed code files + the packet file + the aligned plan.md, zero
outside. No contract divergence found (the C25 P4-deferral retirement,
the V6 spec-declaring flip, and the lifecycle exit-union mapping all
matched the built kernel).

Arm gate 2 (the build-close implementation review + mandatory
sensitivity pass; pin-conform gpt-5.6-sol/high/never, byte-guard clean
before + after, HEAD/tree unchanged): REFINE citing `709ba9ee` with
FOUR findings — ALL test-evidence class, ZERO product gaps (the arm
confirmed the production code contract-faithful: the admission
Map-interception gone, `start` calls only `kernel.start`, no lifecycle
`stale`, the floor excludes the locator + version). The four
green-but-blind BUILT-body lanes (the ch11-P2/ch8-P2 sensitivity-pass
class recurring): (1) F2/F3 — the `activation.mode` non-member fixtures
were string-only (a non-string bug stayed green), no RP6 merge-key
spec-map fixture, the alias test checked finding-ABSENCE not
materialized content, the `none` test asserted `ok` not the normalized
value; (2) A2/A3 — the illegal-runtimeContext + process-gate
suppression and the `defaultAgentConfig` non-map container lane were
direct-channel only, not FILE-driven; (3) V2/V3 — the `start`
replayed-op_id Duplicate/exit-0 cell, the `stale`-absent
non-occurrence, and the terminal-`kickoff`→internal lane were undriven
(only `cancel`-sink was), and the `Created` negative was not
exact-keyset; (4) R1/R3 — the compact-list drove only `ready(ref)` (a
`requested.request_id` leak or a hardcoded `ready` stayed green) and
the timeline `issuedAgentConfig` survival was unasserted. All four
folded in one aftermath round (test-body strengthening ONLY, zero
production change — the arm's zero-product-gaps verdict held):
**1248 → 1261 v3 tests** (+13 sensitivity lanes across the 4 boundary
test files). Bridges re-verified GREEN (orchestrator-rerun):
`v3:typecheck` clean · `v3:lint` clean · the v3 suite 1261/1261;
boundary containment orchestrator-verified (4 changed test files ⊆
boundary). The aftermath's sensitivity strengthenings: the
string/non-string `mode` boundary; the RP6 merge-key inside the spec
map + the alias MATERIALIZED-content assert (Map ≠ plain object); the
`none` normalized-value assert; the file-channel A2 suppression + both
agent-config positions' non-map container; the `start` Duplicate/exit-0
+ terminal-`kickoff`/1 + the `[created, accepted, activated,
terminated]`-only `stale`-never sweep + the `Created` exact keyset; the
`none`/`requested`/`ready` three-state compact rows with a
`SECRET_REQUEST_ID`/`SECRET_LOCATOR`-absent leak assert + the
`issuedAgentConfig`-survives-projection assert. Arm gate-2 re-check
(finder-lane rerun on `9636ddcd`): REFINE with ONE finding — the RP6
alias fold had WEAKENED a pre-existing lane (it aliased only the inner
provider scalar, dropping the WHOLE-MAP alias coverage the original
`runtimeContext: *s` fixture carried). Folded (`d1bbcbca`): the
whole-map alias test restored — the full `{kind, provider, config}`
spec map anchored on a step's format-open `agentConfig`, the ENTIRE
`runtimeContext` value that alias, asserting the materialized plain
own-property record via `toEqual` (a raw JS Map fails); the
inner-scalar-alias test kept as a second dimension. 1261 → 1262 tests.
Arm gate-2 re-check #2 (`d1bbcbca`): **CLEAN** — the arm EXECUTED the
mutation this time (a raw-Map materializer turned the whole-map test
red at `toEqual`, restored byte-clean), confirming sensitivity by
execution; suite 1262/1262 green, no test weakened. **The packet is
DONE** (a clean sha-citing gate-2 verdict; the transitional arm gates
both discharged). Every arm pass pin-conform gpt-5.6-sol/high/never,
byte-guard clean before + after.

```json
{
  "packet_metrics": {
    "class": "operability",
    "prediction": { "predicted": "projection", "reasoning": "the ratified runtime-core draft (2026-07-19, incl. the acts A/B/C reopen set and the D5 stance set) decided every format + operator-surface point; the packet projects the file-channel/source-form shares of C1-C7, the CLI verb surface of C19/C20/C24, the mode/override realizations of C9/C13, the empty-registry lane of C16, and the floor read split of C11/C12/C17/C21", "discovered": "projection" },
    "provenance": { "anchored": 16, "derived": 1, "new_decision": 1 },
    "rounds": { "review": 2, "doc_refinement": 0, "implementation": 2 },
    "stops": [
      { "type": "4:flagged-approve", "what": "R1's compact-list field selection rode as flag F1 — arm-gate-1 reclassified it from derived (C21's 'compact state discriminant' + C17's ref-exclusion leave the exact membership open; the ch11-P4 Y6 class)", "resolution": "the human approved 2026-07-22: F1 ratified (the chosen compact set stands — kernelStatus/terminalDisposition/activationMode/wait.kind/runtime-context discriminant, no locator, no version); V7 accepted as derived (the arm's journey-structure new-decision challenge reconciled — the row forced, its shape build-freedom); the three arm-gate-1 content folds (exit-matrix/A1-ownership/plan-alignment) carried" }
    ],
    "detector_misses": [
      { "found_at": "arm-approve", "what": "R1 rode as derived through the full round + targeted re-run + two closes; the arm's entailment attack surfaced conforming compact-shape alternatives, reclassifying it new-decision and demoting the flag-free approve", "why_missed": "the internal lenses tested R1's derivation against C21/C17's ref-exclusion, not against the full space of conforming field-set alternatives (the W1 watchpoint was carried but not escalated)" },
      { "found_at": "arm-approve", "what": "the CLI exit mapping was based on the actor-transition Outcome (committed/duplicate/stale/rejected) instead of the per-op lifecycle unions — stale absent, terminal-sink a throw not a rejection, write-path unknown_instance a Rejected data doc not a notFound", "why_missed": "the packet assumed the ch6-P4a matrix applied uniformly; the two internal closes verified Duplicate→0 but not the whole lifecycle-vs-actor union divergence" },
      { "found_at": "implementation", "what": "the build-close arm sensitivity pass harvested 4 green-but-blind BUILT test bodies (string-only mode fixtures; alias finding-absence-not-content; direct-channel-only A2/A3; the start-Duplicate/terminal-kickoff/stale-absent lifecycle lanes undriven; the compact-list ready-only, no requested/leak assert; the timeline issuedAgentConfig unasserted) — all test-evidence, zero product gaps", "why_missed": "the builder's R-DERIVED-PROBES table ran ONE probe per family, proving the family not-entirely-dead but not every LANE within it sensitive — the single-probe-per-family rule under-covers multi-lane families (the boundary-review mutation-testing item)" }
    ],
    "learned": "the CLI exit-class must read the actual per-op outcome UNION (domain/outcome.ts), never assume a sibling matrix applies — a code-substrate the Substrate Reality Probe did not previously cover; and a watchpointed-derived row (R1/W1) is a latent new-decision the arm's entailment attack surfaces"
  }
}
```
