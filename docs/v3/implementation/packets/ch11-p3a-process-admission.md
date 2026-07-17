# Task Packet: ch11-P3a — the process-admission foundation (validate_gate_config · the external.process registration · the runner-port shapes · the runtimeContext declaration key)

Plan step: plan.md §11.4 P3a row — the P3 slot's FOUNDATION share
under the ch11-P3 findings-round split (2026-07-16: the ratifier
rejected the single-packet closure proof against the visible
foundation→activation seam; the P3a/P3b rows are the repartition,
coverage union preserved). Realizes plan §11.1 item 3's
admission/registration/port half and item 4's TEMPLATE half:
`validate_gate_config` as the `external.process` registration's
admission validator (the ratified model fix), the registration
joining the static registry, the `ProcessGateRunner`/`ProcessResult`/
evidence-record PORT shapes + the ledger-shaped six-outcome scripted
testkit runner (kit piece — the end-to-end kernel drive is P3b's),
the template-side `runtimeContext` declaration key + the C19
admission cross-rule. The rejection surface at this share
(stated precisely — the plan row's "the three L2a rejections" is
loose wording): the two DEFINITION-ISSUE codes
(`invalid_process_gate_config`, `gate_config_not_supported`) + the
`runtime_context_required_for_process_gate` ADMISSION-issue code
(C19's declaration-level lane); the registry NAME's behavioral
HANDLE lane is P3b's. Draft anchors (= the manifest's C-row ref
union): `contract:ch11-gate-format` rows
C5/C8/C9/C12/C13/C15/C18/C19/C20/C21/C26/C29/C34 (13 — C14/C16/C17/
C23 left the ANCHOR union when V1 reclassified to new-decision at
arm gate 1: those rows now appear as V1's in-row CONSTRAINT context,
not as manifest refs — a new-decision row carries none).
Plan alignment: the §11.4 repartition (the P3 row → the P3a/P3b
rows + the order line) and the §11.1 item 3 / §11.2 pointer
updates, marked "aligned at ch11-p3a pre-approval", ride THIS
packet's commit. The §11.1 item 2 schema-bump alignment is P3b's
(no store-schema change happens here). The ratified draft's
"ch11-P3" references predate the split and denote the P3 slot.
Commit choreography (stated so the build cannot trip the audit):
`process-log.md` is OUTSIDE this packet's boundary — its capture
entries land in a SEPARATE `docs(v3)` commit, never in the packet
commit (the post-build audit binds the packet commit's changed
files to the declared boundary).
P3b's alignment set additionally covers the §11.1 item 4 wording and
the §11.5 DoD's singular schema-bump phrase, which the second
store-schema change touches (recorded here so it is not missed
downstream — the lens-5 finding at this packet's panel).
Autonomy stage: measurement — inherited from the P3 row through the
split (parts inherit mode, predicted class, watchpoints; fresh
watchdog per part). Not first-of-a-kind: the registry-member
extension class has precedent (ch11-P2a), the port + testkit-fake
class has precedent (ch4-P1, ch7-P1), the admission-extension class
has precedent (ch11-P2a/P2c).
Classification: **projection** — manifest tally: 8 anchored /
7 derived / 1 new-decision (machine-counted from the `packet_rows`
block). The ONE new-decision row is V1's JSON-mode reason semantics
(reclassified derived → new-decision at arm gate 1: the
carried-verbatim-to-wire retention is a genuine decision the cited
C-rows do not select among equally conform alternatives) — it is
EXACTLY the decision flag F1 records, riding this HUMAN approve as
approve-ratified; it touches config-value retention, NOT
authority/separation/availability-class semantics, and one row is
below the Case-B mass threshold — Case B not fired. Every other
row anchors to the ratified draft rows, the l2a unit texts,
ratified plan text, or the built P2a/P2b/P2c rows, or derives from
them with an in-row note.

## Ledger slice (declared — feeds the coverage accounting)

```json
{
  "ledger_slice": {
    "units": [
      { "id": "l2a-pseudocode/CREATE_INSTANCE", "disposition": "alias/inherited" },
      { "id": "l2a-pseudocode/GateRegistration", "disposition": "alias/inherited" },
      { "id": "l2a-pseudocode/ProcessGateRunner", "disposition": "type/schema" },
      { "id": "l2a-pseudocode/validate_gate_config", "disposition": "implement" }
    ],
    "rejections": [],
    "invariants": [
      { "id": "l2a/gate-config-validated-at-definition-load", "disposition": "test" },
      { "id": "l2a/bounded-timeout-mandatory", "disposition": "type/schema" },
      { "id": "l2a/explicit-output-mode", "disposition": "type/schema" },
      { "id": "l2a/still-inline-only", "disposition": "type/schema" }
    ],
    "traces": [],
    "shared_ownership": []
  }
}
```

The EMPTY rejection list is a declaration, not an omission: this
share drives NO registry rejection behaviorally —
`runtime_context_required_for_process_gate` appears here ONLY as the
C19 admission-issue CODE on the definition channel (the registry's
dual name); its behavioral HANDLE lane, the l2a trace, and the three
execution units (`run_process_gate`, `classify_process_result`,
`runner_outcome` + the `HANDLE` alias) are P3b's slice — the split's
coverage union restores the full P3 set. Disposition notes (the
§11.2 reprint/inheritance chain): `CREATE_INSTANCE` is the l2
reprint (admission-comment delta only) — alias to the built
`start.ts#startInstance` chain; `GateRegistration`'s l2a delta (the
process implementation axis, `requires_runtime_context`,
process-has-no-evaluate) is ALREADY realized in `ports/gate.ts`
since P2a — alias there (the process REGISTRATION VALUE realizes
`validate_gate_config`, its own unit, here). `explicit-output-mode`'s
type/schema half (the effective form's required resolved
`output.mode`) is realized here; the behavioral output-mode-monopoly
drive is P3b's classification lanes — a stated proof boundary.

## Sizing/risk (template §2 step 0 — materialized)

Predicted class (plan §11.4 P3a row, inherited through the split):
**projection**. Discovered at authoring: **projection** — agree.

**The split record:** the parent P3 assessment tripped hard stop 2
by letter (one contract across seven surfaces) and carried a
closure proof; the RATIFIER's findings round (2026-07-16) rejected
that proof against the visible foundation→activation seam — the
split executed per the verdict-action matrix (parts inherit mode,
predicted class, watchpoints; fresh watchdog per part; depth 1).

**This part's own six axes:**

- **authority movement:** ONE bounded EVIDENCE-surface move
  (re-assessed at arm gate 1): runtime/semantic authority does not
  move — admission stays the single semantic authority (C20,
  P2a-built) and `validate_gate_config` JOINS it through the
  P2a-built seam — but the composition's canonical STATEMENT moves
  from registry.ts's inline Map literal to the exported
  `blockARegistrations` record (G2's packet-added test-evidence
  contract). Closure: the move is within ONE module, lands in the
  same bounded change, and turns on NO runtime behavior (hard stop 1
  needs movement + activation — activation is P3b's), so no hard
  stop trips; stated, not glossed. CONSUME-FAMILY SCAN for the
  move (mandatory once an authority axis is acknowledged; the
  second arm re-check corrected the family accounting — a consumer
  reached THROUGH an unchanged port is still a CONSUMER): producer
  = gates/ (the record + the frozen exports, changed);
  validator/gate = admission, PRESENT (it RESOLVES the composition
  at definition load — the new member changes what admits);
  execution consumer = HANDLE, PRESENT (it resolves at run — the
  new member changes the shipped route to the interim reject);
  testkit = PRESENT (contract change); persistence/replay,
  read/presentation, recovery/cleanup, external/integration =
  absent. The composition authority thus touches 3+ consume
  families — HARD STOP 6 TRIPS BY LETTER, and the packet continues
  on the explicit IMPLEMENTATION-CLOSURE PROOF (the P2c form): the
  consumers reach the composition ONLY through the resolve-only
  port whose CONTRACT is unchanged (no consumer code changes — the
  admission and kernel call sites are byte-untouched, the boundary
  is the witness); a missing or mis-keyed record entry is caught by
  THREE independent lanes (the composition `toStrictEqual`, the
  record↔catalog wiring lane, and the kernel interim-state lane
  driving the SHIPPED composition); the whole move lands in one
  bounded gates/-module change with one proof surface and no
  per-family review loop — split would separate the record from its
  only producer for no risk reduction. Hard stop 7's shared-shape
  operand: the NEW runner/result port shapes have ZERO consumers
  until P3b (nothing can fall out), so its two-fallout-family
  condition is unsatisfiable here — stated, not assumed.
- **surface spread:** NO trip. Against the gate's enumerated surface
  classes: kernel logic UNCHANGED (byte-untouched), store schema
  UNCHANGED, ingress-write seam UNCHANGED, read projection UNCHANGED,
  CLI-human payload UNCHANGED (C28); the testkit CONTRACT changes
  (the new scripted runner — counted), and the work otherwise lives
  on the definition/validation surface (a new registry member + its
  validator + one optional template field + port types). Two counted
  surface classes — under the 3+ line.
- **identity/join fragility:** NO — no cross-seam identity enters
  (the evidence-ref join is P3b's, with the checker that binds it).
- **foundation + activation coupling:** NO — this IS the foundation
  share; nothing turns on (the kernel still rejects a process gate
  at run — the P2b lane stands).
- **prerequisite coupling:** NO — P2a/P2b/P2c built and committed;
  P3b depends on THIS part, not the reverse.
- **acceptance multiplicity:** re-stated honestly (arm gate 1: one
  test COMMAND is not one success class): the packet closes FOUR
  distinct success classes — admission lanes, registry
  composition/immutability evidence, port/kit contract
  (runner/record/persistence), drift flips. Closure argument (why
  no split is owed on this axis alone): all four land in one
  bounded change with no cross-class sequencing (none activates
  runtime behavior; each is independently green-able within the
  same build), the same builder owns all four, and no
  per-class review loop is expected — the multiplicity is real, the
  closure is the argument, not the shared command.

HARD STOP 6 TRIPS BY LETTER (the composition authority's 3+ consume
families — the corrected scan above); single-packet allowed: YES
solely on the stated IMPLEMENTATION-CLOSURE PROOF (the unchanged
resolve-only port + the three independent catch lanes + one bounded
gates/-module change — the P2c precedent form); no other hard stop
trips. Conditional annexes: **closure-budget triage** —
buckets touched: admission validation, testkit contract, the
composition-EVIDENCE bucket (G2's exported record + definition-site
freezes — closure: the same bounded gates/-module change), the
CANONICAL-AUTHORITY bucket (the composition statement's move into
the record — closure: the three independent lanes above), and the
SHARED-CONTRACT bucket (the new runner/result/record port shapes —
closure: zero consumers until P3b, so no migration or fallout
exists to sequence); explicitly deferred: the kernel process branch + instance representation +
store column + checker + trace + composition slot (P3b), the YAML
format surface (P4), the real spawn (ch 9). **Proof-boundary
triage** — N/A: no success/completion proof source moves.
**Mutable-flow record** — N/A: no runtime behavior changes; the one
runtime-adjacent surface (admission) admits nothing on any finding
(all-or-nothing, P2a-built).

**R-ACTIVATION-JOURNEY disposition (one-line N/A with evidence):**
nothing is wired into any live path — the kernel is byte-untouched,
the file channel cannot author gates until P4, and the shipped
journey suite runs unchanged.

## Claim + dimensions (enumerated BEFORE deriving test rows)

**Claim (wide):**

1. **Admission owns the process config, once:** every C13–C17 rule
   on the process-gate config is validated and normalized at ONE
   point — `admit_definition` through the `external.process`
   registration's validator (`validate_gate_config`) — with defaults
   (output mode, dispositions, per-bucket reasons) MATERIALIZED into
   the effective config there and NOWHERE re-resolved; failures are
   DEFINITION ISSUES on the load channel (the named lanes carrying
   their issue codes); NO unadmitted or unnormalized process config
   can admit, on ANY channel.
2. **The composition is exactly C8's:** `createGateRegistry()` =
   the THREE Block A members; the process member carries
   `requiresRuntimeContext: true` and NO `evaluate` (type-level);
   `execution` stays the `"inline"` singleton (the still-inline-only
   pin) — deferred execution remains unrepresentable.
3. **The process↔workspace rule holds at the declaration level
   (C19):** a template binding ANY gate whose registration requires
   a runtime context, without `runtimeContext: "required"`, is an
   admission finding carrying the
   `runtime_context_required_for_process_gate` code — flag-driven,
   never name-driven; the runtime backstop (C36) is P3b's.
4. **The runner port contract is fixed and kit-realized:** the
   `ProcessGateRunner`/`ProcessResult`/evidence-record shapes are
   C34/C26's field lists; the scripted testkit runner REALIZES the
   persistence guarantee (one record durably on its substrate BEFORE
   `run()` resolves; refs resolve; records independent of any kernel
   commit) and can stage all six outcome classes — the kernel-side
   consumer arrives at P3b.
5. **Confinement:** the kernel is BYTE-UNTOUCHED — an admitted
   process-gated template still rejects at run via the P2b
   `gate_execution_not_supported` lane (behaviorally ALIVE through
   this packet; it retires at P3b with the model's reject→run flip);
   no store-schema change, no CLI change (C28), no `KernelDeps`
   change, no harness change; `fixtureTemplate()` and the shipped
   YAML stay byte-untouched.

Dimensions:

1. **Admission config lanes (V2's matrix — each able to fail, each
   at its C7-prefixed path, coded where C21 names a code):** `config`
   missing entirely (C5); `command` missing / empty / non-string;
   `timeoutMs` missing / invalid under the full NUMERIC LADDER —
   V3's ten rungs, the canonical list, driven rung-by-rung (this
   mirror defers; the enumeration lives in V3 alone); unknown
   config key; config PRESENT-but-non-map (ONE container finding,
   dependents suppressed — distinct from config-missing); `output`
   non-map / unknown inner key / unknown `mode`; `onExit` missing in
   exitCode mode / NON-MAP in exitCode mode (ONE container finding,
   bucket lanes suppressed) / a bucket missing / a bucket value
   non-allowlisted / surplus key / present in gateDecisionJson mode
   (unconsumed — fires on the KEY's presence regardless of the
   value's shape, V2's precedence pin);
   `onRunnerError`/`onTimeout` = `failInstance` → the DISTINCT
   `gate_config_not_supported` code; any other unknown disposition →
   `invalid_process_gate_config`; `reason` non-map / unknown key /
   token-grammar violation; the VALID forms admit with the effective
   config asserted EXACTLY (defaulted mode, dispositions, per-bucket
   reasons — V1, incl. the JSON-mode authored-reason letter case AND
   the MIXED exitCode-mode reason case: one bucket authored, the
   other defaulted — `reason: {nonzero: "x"}` ⇒ effective
   `{zero: "exit_zero", nonzero: "x"}` — the per-bucket-not-
   all-or-nothing crux driven as its own exact-effective lane);
   hostile own-property lanes (`__proto__` pair, inherited-key
   phantom — V4); accumulation with sibling findings on the one
   channel (V7); input purity on frozen valid AND invalid inputs
   (V8).
2. **Cross-rule lanes (C19):** a process-gated template WITHOUT
   `runtimeContext: "required"` → the coded finding at the binding's
   C7 path (and WITH the declaration it admits); a hostile catalog's
   requiring NON-process registration trips it too (flag-driven);
   the two shipped inline members (`requiresRuntimeContext: false`)
   never do; per-binding grain (a two-process-gate template yields
   two findings).
3. **Registry composition:** the exact THREE-member set, asserted on
   the exported canonical composition record's own keys (G2's
   mechanism — a fourth member and a missing member both fail); the
   FOUR IMMUTABILITY mutation-negative lanes (add / delete / replace
   / NESTED member-field overwrite — each throws AND the
   composition/value asserted unchanged after the attempts; the
   runtime freeze of the record AND its member values driven, not
   presumed) PLUS the compile-negative pair for the readonly TYPE
   half (G2's `@ts-expect-error` probes — probe A on the RECORD
   type, probe B on the P2a port-field readonly at the nested
   depth; the type layer driven independently of the freeze);
   the record↔catalog wiring lane; `external.process` resolves;
   `requiresRuntimeContext` driven across all three members; the
   process registration carries no `evaluate` (type-discriminated —
   the P2a union). The record-is-the-only-source property is G2's
   named REVIEW-OWNED structural obligation (sweep-assisted), not a
   test lane.
4. **Port/kit contract lanes (each able to fail):** the record
   persisted and RESOLVABLE before `run()` resolves; one record per
   invocation; deterministic workspace-fact fields; the scripted
   sequence honored; invocations recorded verbatim
   (`{command, cwd, stdin, timeoutMs}`); a `run()` beyond the script
   THROWS (exhaustion is a test defect — fail-loud); the
   script-entry `exitCode` precondition driven over the FULL
   `Number.isInteger` ladder in BOTH directions (T1's reject set +
   the legal-accept narrowing-killers incl. `-1`, `-0`, `2**53`); the PER-KIND exact
   result↔record field-for-field correspondence; the SCALAR-DOMAIN
   lanes (`logRef` nonempty; `durationMs` non-negative integer;
   `exitCode` integer on the OUTPUT); the `log`-per-kind rule (ok →
   the entry's stdout verbatim; timeout/runner_error → `""`); the
   `ProcessResult` union's kind-conditional fields hold by type; all
   six outcome classes stageable (ok/0, ok/nonzero, timeout,
   runner_error, ok+malformed stdout, ok+valid decision JSON).
5. **Interim-state + confinement lanes:** an ADMITTED process-gated
   template driven to HANDLE still yields
   `Rejected(gate_execution_not_supported)` — the P2b lane RE-DRIVEN
   through the SHIPPED composition (previously only a test-composed
   hostile catalog could stage it; the kernel is byte-untouched);
   the FULL existing suite green with zero golden-expectation edits;
   zero diffs outside the declared boundary.
6. **Type-ripple confinement:** `GateConfigFinding.code?` and
   `WorkflowTemplate.runtimeContext?` are optional-additive — zero
   forced literal updates (the measured sweeps); NO `KernelDeps`
   change → NO test-composed-kernel ripple (the P3 single-packet
   form's 12-file ripple does not exist here — it moves to P3b with
   the dep); `v3:typecheck` is the closing backstop.

## Operative material (full text — projection, not invention)

### The unit pseudocode (verbatim)

#### `l2a-pseudocode/validate_gate_config`

```
# validate_gate_config — the external.process REGISTRATION's validate_and_normalize_config body
# (GateRegistration contract). Invoked by ADMISSION (admit_definition) at definition load — never
# by CREATE (instance admission owns only task/binding) and never mid-run. Failures are DEFINITION
# ISSUES; defaults MATERIALIZE here into the effective config (resolved once — downstream, including
# the process wire, reads only the effective form).
validate_gate_config(raw) → effective | issues                       # the process-config schema, registration-owned
  IF raw.command is absent OR raw.timeout_ms is absent
     THEN issue(invalid_process_gate_config)                          # command + bounded timeout are mandatory
  # disposition allowlist — block_transition is the only realized value (absent ⇒ block_transition default)
  FOR disposition IN [raw.on_runner_error, raw.on_timeout]:
    IF disposition is absent          THEN CONTINUE                   # absent ⇒ block_transition materializes into effective
    IF disposition = fail_instance    THEN issue(gate_config_not_supported)    # reserved future disposition (distinct code)
    IF disposition ≠ block_transition THEN issue(invalid_process_gate_config)  # any other value is unknown
  # output mode — exit_code is the default; only an explicit-but-unknown value is invalid
  IF raw.output.mode is present AND raw.output.mode NOT IN { exit_code, gate_decision_json }
     THEN issue(invalid_process_gate_config)
  IF (raw.output.mode ?? exit_code) = exit_code THEN                  # exit_code mode (incl. the defaulted form)
    IF raw.on_exit["0"] is absent OR raw.on_exit[nonzero] is absent
       THEN issue(invalid_process_gate_config)                        # both exit buckets are required
    IF raw.on_exit["0"] NOT IN { allow, warn, block } OR raw.on_exit[nonzero] NOT IN { allow, warn, block }
       THEN issue(invalid_process_gate_config)                        # buckets map only to realized verdicts — no route smuggled in
  RETURN effective(raw with defaults materialized)                    # output.mode, dispositions resolved — the ONE config form downstream
```

#### `l2a-pseudocode/GateRegistration` (reprint — the l2a delta over the P2a-built descriptor)

```
# GateRegistration — L2a adds the external.process registration to L2 core's declarative/packaged members
INTERFACE GateRegistration:
  implementation: declarative | packaged | process      # L2a realizes inline process too; only DEFERRED execution stays out (later slice)
  execution:      inline | deferred                      # still inline only — deferred is a later lifecycle slice (gate_pending + GATE_RESULT)
  requires_runtime_context: yes | no                     # the external.process registration declares YES — admission enforces it against the definition
  validate_and_normalize_config(raw) → effective | issues   # external.process OWNS the process-config schema (validate_gate_config is its validator body)
INTERFACE InlineGateEvaluator extends GateRegistration:  # declarative | packaged — in-process evaluate
  evaluate(effective_config, projection) → GateDecision
# the process registration has NO evaluate — a process gate runs via run_process_gate instead
```

#### `l2a-pseudocode/ProcessGateRunner`

```
# ProcessGateRunner — the executor that spawns an external gate process; the kernel owns the contract, the runner owns the spawn
INTERFACE ProcessGateRunner:
  run(command, { cwd, stdin, timeout_ms }) → ProcessResult   # { kind: ok | timeout | runner_error, exit_code?, stdout?, log_ref, duration_ms }
```

#### `l2a-pseudocode/CREATE_INSTANCE` (verbatim — a declared slice unit; alias to the built start chain, the admission-comment lines are the l2a delta)

```

# Convenience operator API, not a kernel primitive: a single "start workflow" command may
# compose CREATE_INSTANCE(...) then START(instance). activation_mode controls what happens
# after RUNTIME_CONTEXT_READY (activate vs WAITING(kickoff_pending)) — not whether CREATE dispatches.
CREATE_INSTANCE(template_ref, activation_mode, task, binding, run_overrides) → Created   # operator_intent; template + binding resolved on the start path (formalized by L0f)
  template ← definitionStore.load(template_ref)                # a pinned ADMITTED definition (admit_definition, L2) — plain or L0f-resolved, always carrying EFFECTIVE configs; the raw/authored form is admission's input and never reaches CREATE
  IF activation_mode = immediate AND task is absent THEN RETURN Rejected(task_required)
  REQUIRE binding covers every role reachable in template      # binding resolved pre-kernel; the kernel only validates coverage (fail at create, not mid-run)
  # definition-static validation happened at ADMISSION (admit_definition, definition load) — the store issues only ADMITTED definitions; CREATE validates INSTANCE inputs (task, binding coverage) only
  instance ← create { template_ref, task, binding, activation_mode,
                      kernel_status: CREATED, current_step: none, round: 0,   # round 0 = prepared, no work cycle begun yet (position none until ACTIVE)
                      runtime_context: none, run_overrides: snapshot(run_overrides), version: 1 }
  COMMIT instance creation
  RETURN Created(instance.version)                             # no dispatch yet — not active
```

### The definition-issue codes (NOT ledger §3 registry names — 54 post-fix)

- `invalid_process_gate_config` — the generic invalid-config lane's
  code (V2's coded lanes).
- `gate_config_not_supported` — the reserved `failInstance`
  disposition's DISTINCT code (its own lane).
- `runtime_context_required_for_process_gate` — the C19
  declaration-level ADMISSION code; the SAME spelling is a ledger §3
  registry name whose behavioral HANDLE lane (C36) is P3b's — the
  registry's dual name, stated so neither share claims the other's
  half.

### The invariant bodies (ledger §2 l2a — this share's disposition targets)

| Invariant | Disposition | Body (model text, compact) |
|---|---|---|
| gate-config-validated-at-definition-load | test | `validate_gate_config(raw)` is the registration's validator body, run by ADMISSION at definition load; a process gate without a workspace (via `requires_runtime_context`), a `fail_instance` disposition (`gate_config_not_supported`), or an incomplete/invalid config (`invalid_process_gate_config`) is a DEFINITION ISSUE, never a mid-run surprise; defaults MATERIALIZE into the effective config — resolved once (the HANDLE ready(∅) runtime backstop is P3b's) |
| bounded-timeout-mandatory | type/schema | every process gate carries a timeout; the effective-config type's REQUIRED `timeoutMs` realizes the schema half (the timeout-as-runner-outcome behavior is P3b's classification) |
| explicit-output-mode | type/schema | verdict source is exit code or decision JSON BY CONFIG — the effective form's REQUIRED resolved `output.mode` realizes the schema half (the never-guess behavioral monopoly drive is P3b's) |
| still-inline-only | type/schema | a deferred process gate is still rejected — the `execution: "inline"` singleton pin (P2a-built, re-declared by this registration) keeps the deferred axis unrepresentable |

### Substrate probe record

N/A — no lane or matrix cell in this share rests on driver/OS/
filesystem/parser behavior: the validator runs over in-memory JS
values (the threshold precedent's ground), the registry is a Map,
and the kit runner's substrate is process memory by design (its
DURABLE production counterpart is P3b's slot and ch 9's runner). The
JSON.parse probes (C25) and the node:sqlite nullable-column probe
travel with P3b, where those cells live.

## Canonical domain matrix (D)

| Id | Rule |
|---|---|
| D1 | `WorkflowTemplate` gains OPTIONAL `runtimeContext?: "required"` — C18's declaration key at the DOMAIN grain (the direct channel's input; the YAML key + its illegal-value source lane land at P4 with the format walk — the C39/C40 staging precedent). The singleton literal type forecloses illegal values on the direct channel — and that TYPE GUARANTEE is itself DRIVEN (the ratifier's eighth round: an undriven foreclosure is the compile-half gap the exitCode ladder already taught): an isolated `@ts-expect-error` probe on an otherwise type-correct template literal carrying `runtimeContext: "sometimes"` fails to compile, so a widening to `string` leaves the directive unused — TS2578 fails `v3:typecheck` (the `__probe` idiom, in admit.test.ts beside the cross-rule lanes); absent = a context-free workflow. Consumers: the C19 cross-rule HERE (V5); the instance-side representation and the C36 runtime backstop are P3b's. The value domain grows additively in the consuming chapter (ch 9's spec map), per C18's own clause (anchored: contract:ch11-gate-format#C18) |

## Canonical admission/validator matrix (V)

| Id | Rule |
|---|---|
| V1 | The EFFECTIVE process config (the admitted binding's single `config` surface, P2a A5): `{ command: string (nonempty), timeoutMs: number, output: { mode: "exitCode" \| "gateDecisionJson" }, onExit?: { zero: Verdict, nonzero: Verdict }, onRunnerError: "blockTransition", onTimeout: "blockTransition", reason?: { zero?: token, nonzero?: token } }` — every default MATERIALIZED once at admission: absent `output` ⇒ `{ mode: "exitCode" }` (C14); absent dispositions ⇒ `"blockTransition"` (C16). PRESENCE, stated once and precisely (the findings-round correction of the P3 form's self-contradiction): `onExit` is present IFF exitCode mode — REQUIRED there, ILLEGAL in gateDecisionJson mode (C15's hardening); `reason` in exitCode mode is ALWAYS present and COMPLETE — both buckets, authored-or-default (`exit_zero`/`exit_nonzero`, C17); `reason` in gateDecisionJson mode is present IFF AUTHORED — grammar-validated, carried VERBATIM as authored (partial maps stay partial: no default materializes there, because C17's defaults belong to exit-bucket decisions which that mode never produces), KERNEL-UNREAD but NOT system-inert (the ratifier's correction, second findings round): C23 puts the ENTIRE effective config on the process stdin (P3b's wire), so the authored value is WIRE-VISIBLE and the external gate process MAY observe it and condition its returned decision on it — authored pass-through data handed to the process, the `command` field's own class (flag F1 records this stronger meaning). DERIVATION NOTE (the letter followed, stated): C13 lists `reason` as a legal optional key UNSCOPED by mode and C21's closed lane list hardens only `onExit` against gateDecisionJson mode — rejecting such an authored `reason`, or stripping it AT the wire, would be a NEW admission/wire decision the draft did not take (C23 fixes the wire's `config` as the effective form itself — the one downstream form; a wire-time strip would make wire ≠ effective and fork that rule) (new-decision — reclassified at arm gate 1: C13/C14/C16/C17/C23 CONSTRAIN the space but do not select among equally conform alternatives (carry-verbatim vs an admission-time normalization drop); the retention choice is this packet's own, recorded by flag F1 and ratified by the human approve) |
| V2 | The process ADMISSION lane matrix (C21's process share — every lane a `{path, message}` finding at the C7-prefixed path, the NAMED lanes carrying their CODE; each driven and able to fail): config MISSING where required → one finding, dependent lanes suppressed (C5; the registration requires config); config PRESENT but NOT A MAP (a string, a list, null) → ONE container finding at the config path, ALL dependent lanes suppressed (the C21 container rule at the top grain — a distinct lane from config-missing, driven by name); `command` missing/empty/non-string → code `invalid_process_gate_config`; `timeoutMs` missing or V3-invalid → code `invalid_process_gate_config`; config unknown key (uncoded); `output` not a map → ONE container finding, its inner lanes suppressed (C21's container rule at the config grain); `output` unknown inner key (uncoded); `output.mode` explicit-but-unknown → code `invalid_process_gate_config`; exitCode mode: `onExit` missing, or `onExit` present but NOT A MAP → ONE container finding suppressing its bucket lanes (code `invalid_process_gate_config` on the missing form; the container form is the C21 kind rule — both driven by name), or `zero`/`nonzero` bucket missing → code `invalid_process_gate_config`; a bucket value ∉ {allow, warn, block} → code `invalid_process_gate_config` (`route` never smuggles in); `onExit` surplus key (uncoded); gateDecisionJson mode: a present `onExit` (unconsumed, uncoded) — and the PRECEDENCE is PINNED: the unconsumed lane fires on the KEY's presence REGARDLESS of the value's shape (the key is illegal in that mode, so its content is never inspected — a non-map `onExit` in JSON mode yields exactly the ONE unconsumed finding, never a container finding and never a bucket cascade; driven as a combination lane); `onRunnerError`/`onTimeout` = `"failInstance"` → code `gate_config_not_supported` (its OWN distinct lane); any other non-`"blockTransition"` value → code `invalid_process_gate_config`; `reason` not a map / unknown key beside `zero`/`nonzero` / a value violating `^[a-z][a-z0-9_]*$` (uncoded). The authored camelCase tokens map to the model's snake_case (`blockTransition` ↔ `block_transition`, `exitCode` ↔ `exit_code`, `gateDecisionJson` ↔ `gate_decision_json` — the C13/C16 rename culture, both sides stated); the exit buckets are the WORDS `zero`/`nonzero` on BOTH the authoring and reading sides (C15's rename, stated so neither side forks) (anchored: contract:ch11-gate-format#C21, contract:ch11-gate-format#C13, contract:ch11-gate-format#C15, contract:ch11-gate-format#C5) |
| V3 | `timeoutMs`'s VALUE grammar (C12's value half; the source-text half is P4's format walk): a safe integer ≥ 1 via the threshold precedent's one check (`typeof === "number" && Number.isSafeInteger(v) && v >= 1`) — the R-NUMERIC-LADDER dimensions all fail it: non-numbers, boxed `Number` objects (typeof "object"), numeric strings, non-integers, `NaN` and `Infinity` (number-typed, `Number.isSafeInteger` false — the threshold precedent's own named pair), unsafe integers, `0`, negatives, and `-0` (`-0 >= 1` is false); each driven as its own lane, staged as DIRECT object literals (the preserving channel — no stringify). The threshold `value` rule is UNTOUCHED (P2a-built, same grammar) (derived: contract:ch11-gate-format#C12, prose:v3/src/gates/threshold.ts) |
| V4 | The validator treats raw config under the OWN-PROPERTY discipline (the P2a G8 rule applied at write time): member reads own-property only, the unknown-key scan over OWN enumerable string keys, non-map shapes ONE container finding — the container-kind check binds CONSUMED containers (for `onExit` that is exitCode mode alone: in gateDecisionJson mode the key is illegal and its content never inspected, so V2's unconsumed-presence pin fires instead — the fifth-round precedence, stated here so V4's grain list and V2's pin cannot be read against each other); the DRIVEN hostile set: a `__proto__` key pair, an inherited-key phantom (a config object whose prototype carries `command` — the member is NOT read), for the top config, `output`, `onExit` (exitCode mode), and `reason` grains (derived: prose:packet ch11-p2a, contract:ch11-gate-format#C21) |
| V5 | The process↔workspace CROSS-RULE (C19, the P2a A7 branch realized WITH its template-side operand D1): after a binding's registration resolves, `admitTemplate` checks `registration.requiresRuntimeContext && template.runtimeContext !== "required"` → the finding `{path: <binding base>, code: "runtime_context_required_for_process_gate"}` — read by ADMISSION, never by the per-gate config validator (the rule crosses the template); one finding PER offending binding at that binding's C7 path (the actionable grain). Driven flag-wise: a hostile catalog's requiring non-process registration trips it; the shipped inline members never do; a process-gated template WITH the declaration admits. The INSTANCE-side operand (the ready ref) and the C36 runtime backstop are P3b's. The PER-BINDING finding grain rests on C21's placement of the lane among the per-gate C7-path lanes (C19's own text is template-grain — the disambiguation is C21's, cited) (anchored: contract:ch11-gate-format#C19, contract:ch11-gate-format#C21) |
| V6 | `GateConfigFinding` gains OPTIONAL `code?: string` — the registration-side carrier of the C21 named-lane codes; `admitTemplate`'s C7 path-prefixing carries `code` through UNCHANGED onto the `ValidationFinding` (the P2a A9 carrier extended: the P3-slot codes join with their lanes — `invalid_process_gate_config` and `gate_config_not_supported` validator-emitted, `runtime_context_required_for_process_gate` admission-emitted per V5). Every ch8 lane and every uncoded gate lane stays code-less; the CLI `{stage, findings}` machine shape is unchanged in kind (C28) (derived: contract:ch11-gate-format#C21, prose:packet ch11-p2a) |
| V7 | One channel, all-or-nothing, accumulation (the P2a A2/A3 rules JOINED, not re-decided): process-config findings, the V5 cross-rule finding, and sibling findings (threshold config, round lanes) ACCUMULATE in the SAME result; ANY finding ⇒ no admitted value. DRIVEN as THREE combinations, each pinning an independence the ratifier's sixth round named (an isolated-lane suite is blind to all three): (a) a bad process config AND a bad threshold config on sibling bindings → both report; (b) ONE binding with an invalid process config AND a missing `runtimeContext` declaration → BOTH the config findings and the V5 cross-rule finding report (kills the implementation that runs the cross-rule only after a clean config validation — the two rules are INDEPENDENT reads); (c) ONE process config with MULTIPLE independent defects (e.g. `command` missing AND `timeoutMs` invalid) → both findings accumulate (kills the first-error-only validator; the threshold validator's multi-finding idiom is the precedent) (derived: contract:ch11-gate-format#C20, prose:packet ch11-p2a) |
| V8 | Input purity, mutation-sensitive on BOTH arms (the P2c arm-gate-2 lesson applied at write time — purity driven on valid AND invalid inputs) and on BOTH branches (the arm-gate-1 catch: validator purity alone does not witness the cross-rule): the process admission lanes run on DEEP-FROZEN inputs (template, steps, gates, config, nested maps — a mutating validator throws in strict mode) plus a before/after deep-equality assert on the raw config object; AND the V5 cross-rule lanes run through `admitTemplate` on a DEEP-FROZEN template whose `runtimeContext` field is covered by the before/after assert — a cross-rule that mutates or deletes `template.runtimeContext` fails, independent of the validator's own purity; defaults materialize into the EFFECTIVE value only, never into the input (derived: prose:packet ch11-p2c, prose:packet ch11-p2a) |

## Canonical runner-port matrix (R)

| Id | Rule |
|---|---|
| R1 | `ProcessGateRunner` (ports/gate.ts — the C29 runner half joining P2a's registration half): `run(command: string, opts: { cwd: string; stdin: string; timeoutMs: number }): Promise<ProcessResult>` — the kernel owns the contract, the runner owns the spawn. The `sh -c` shell interpretation is RATIFIED contract (C13's own letter — "ONE POSIX shell command line, interpreted with `sh -c`"), NOT open runner freedom: ch 9 REALIZES it but may not substitute a direct-exec/argv form (the arm-gate-1 correction — the earlier deferral list mis-filed it). Spawn mechanics genuinely beyond the contract — kill-signal semantics on timeout, environment inheritance, stdout size bounding — are NAMED ch-9 runner-contract territory: deferred explicitly, never realized here. The kernel-side CONSUMER (`run_process_gate`) is P3b's (anchored: prose:l2a-pseudocode/ProcessGateRunner, contract:ch11-gate-format#C34, contract:ch11-gate-format#C13) |
| R2 | `ProcessResult` — C34's shape as a DISCRIMINATED union encoding the iffs type-level: `{ kind: "ok", exitCode: number, stdout: string, logRef: string, durationMs: number } \| { kind: "timeout", logRef, durationMs } \| { kind: "runner_error", logRef, durationMs }` — `exitCode`/`stdout` present iff kind=ok BY TYPE, and the iff's ABSENCE half is itself compile-negative-driven (the arm-gate-1 catch: a widened non-ok arm gaining `exitCode?: number` would pass every runtime test AND typecheck — so the non-ok arms exclude the ok-only fields structurally (the `?: never` exclusion or an equivalent), guarded by SIX `@ts-expect-error` probes covering BOTH iff directions (the ratifier's eighth round: absence-only probes leave the ok arm free to go optional): the ABSENCE half — assigning `exitCode` AND `stdout` on EACH non-ok arm (timeout and runner_error, four probes); the PRESENCE half — two ok-arm literals each OMITTING one required field (`{kind:"ok", stdout, logRef, durationMs}` without `exitCode`; `{kind:"ok", exitCode, logRef, durationMs}` without `stdout`) fail to compile, so an `exitCode?:`/`stdout?:` widening leaves those directives unused — TS2578 either way, the `__probe` idiom) (`stdout` is the UTF-8-decoded text C25's parser consumes at P3b — decoding is the runner's duty); `exitCode` is an INTEGER (C34's condition, carried in full — TS has no integer type, so the constraint is the runner's port contract: the kit passes the entry-authored value through unchanged and its contract test asserts `Number.isInteger` on the runner's OUTPUT, ch-9's real runner receives it from the OS); `logRef` nonempty, `durationMs` a non-negative integer — BOTH runner-OWNED values (minted deterministically by the kit, measured by ch-9). camelCase realization of the model's snake_case fields (the rename culture, stated) (anchored: contract:ch11-gate-format#C34) |
| R3 | The evidence record + PERSISTENCE GUARANTEE (C26's port-contract half), ADDRESS and PAYLOAD separated (the internal-closure fix — C26's letter: the ref ADDRESSES the record): the record is ADDRESSED by `logRef` (the key — whether the implementation also stores it inside the record object is build freedom, the CONTRACT reads it as the address); the record's PAYLOAD field list is C26's verbatim: `{ log, kind ("ok" \| "timeout" \| "runner_error"), exitCode (present iff kind=ok), durationMs (non-negative integer), headSha, gitStatusHash }`. Field OWNERSHIP fixed: `log` is the CAPTURED OUTPUT TEXT for EVERY kind — C26's letter, restored at the ratifier's sixth findings round: the earlier "runner diagnostic for non-ok kinds" reading was NOT equivalent (a real runner's partial output produced BEFORE a timeout must not be dropped for a synthetic message; a separate diagnostic report would be a draft-level addition, deliberately not taken). The kit's no-spawn realization: kind=ok → the entry's `stdout`; timeout/runner_error → the deterministic EMPTY string `""` (no process output exists to capture in a scripted world — captured-nothing, not a substitute text); ch-9's real runner captures whatever output actually preceded the failure — through the runner's OWN capture-and-persist path, INDEPENDENT of the returned `ProcessResult.stdout` (which is ok-only by C34): the ok-only `stdout` field never forecloses a non-ok record's captured `log` (stated so the P3b/ch-9 builder cannot misread C34); `durationMs` and the workspace-fact fields (`headSha`, `gitStatusHash`) are RUNNER-owned declared values — the ch-11 testkit runner mints DETERMINISTIC fakes, the ch-9 real runner MEASURES them. Persistence: DURABLY on the runner's substrate BEFORE `run()` returns; a returned `logRef` MUST resolve; the record exists INDEPENDENTLY of any kernel commit. `kind` records PROCESS EXECUTION independent of decision classification (C26's bridge to the six-outcome drive). The record TYPE (`ProcessGateEvidenceRecord`) lives in ports/gate.ts beside the port; the records EXPOSURE is the testkit runner's surface (T1). The `evidence-on-every-run` CHECKER (both halves) and the durable PRODUCTION slot are P3b's — this share fixes the contract and its kit realization (anchored: contract:ch11-gate-format#C26) |

## Canonical registry matrix (G)

| Id | Rule |
|---|---|
| G1 | `external.process` (gates/process.ts — `implementation: "process"`, `execution: "inline"`, `requiresRuntimeContext: true`, `validateAndNormalizeConfig` = the validate_gate_config body, NO `evaluate` by type) JOINS `createGateRegistry()` — the C8 chapter-end THREE-member composition, `external.process` resolving, `requiresRuntimeContext` values driven across all three members. INTERIM STATE (stated, deliberate): with the member present and the kernel byte-untouched, an ADMITTED process-gated template reaching HANDLE still yields `Rejected(gate_execution_not_supported)` — the P2b lane becomes drivable through the SHIPPED composition (kernel.test.ts re-drives it on the real member; previously only a test-composed hostile catalog could) and RETIRES only at P3b with the model's reject→run flip (anchored: contract:ch11-gate-format#C8, contract:ch11-gate-format#C9, prose:packet ch11-p2a, prose:packet ch11-p2b) |
| G2 | The composition-EVIDENCE mechanism (a PACKET-added test-evidence contract BEYOND the C8/C9 anchors — split out of G1 at arm gate 1: a C8/C9-faithful private Map would satisfy the anchors but not this mechanism, so the two must not share a row or a class; provenance: the ratifier's second-, third-, and fourth-findings-round prescriptions, human-directed): `gates/registry.ts` states the Block A composition ONCE as an exported canonical record (`blockARegistrations` — its keys ARE the composition inventory), and `createGateRegistry()` builds the catalog FROM that record and from NOTHING ELSE. IMMUTABILITY on BOTH layers AND at BOTH depths, with the freeze at the DEFINITION SITES (the arm-gate-1 product fix: a registry-init-time freeze leaves a pre-freeze mutation window — a consumer importing `thresholdRegistration` BEFORE the registry module evaluates could mutate it and the registry would freeze the compromised object; so `Object.freeze` is applied where each registration VALUE is defined — threshold.ts, previousReviewerVerdict.ts, process.ts export FROZEN objects — and the record itself is frozen in registry.ts at its own definition): the TYPE is readonly (compile-time half — driven by two isolated compile-negative probes on the P2a `__probe` precedent: probe A, a `@ts-expect-error`-guarded reassignment of a record member, guards the RECORD type's readonly; probe B, a `@ts-expect-error`-guarded overwrite of the process member's `requiresRuntimeContext`, re-guards the P2a-shipped PORT-field readonly at the nested depth — TS readonly is shallow; an accidental widening of either surface leaves its directive unused, TS2578 fails `v3:typecheck`); the runtime half is `Object.freeze` (a TS-only `as const` stays writable JavaScript). Guard scoping stated exactly: (a) the record's composition is mechanically falsifiable in both directions (`toStrictEqual` on its own keys: fourth/missing member both fail; the record↔catalog wiring lane); (b) immutability is test-driven by mutation-negative lanes covering ALL THREE members (the arm re-check catch: a process-member-only drive leaves the two inline registrations' freezes unfalsifiable): the record-level add / delete / replace trio, PLUS a nested member-field overwrite lane PER MEMBER (each of thresholdRegistration, previousReviewerVerdictRegistration, and the process registration: a field overwrite THROWS in strict mode AND the value is asserted unchanged), PLUS a per-member `Object.isFrozen` assert on all three exported values and the record itself; (c) record-is-the-only-source is a REVIEW-owned structural obligation (not test-drivable through the resolve-only port), sweep-assisted (exactly ONE `new Map(Object.entries(blockARegistrations))`, ZERO `.set(` in registry.ts). The `GateCatalog` PORT stays resolve-only (derived: prose:the ch11-P3a findings rounds 2–4 (the ratifier's mechanism prescriptions) + arm gate 1 (the definition-site freeze + the row split), contract:ch11-gate-format#C8) |

## Canonical testkit/drift matrix (T)

| Id | Rule |
|---|---|
| T1 | `createScriptedProcessGateRunner(script)` (testkit/processGateRunner.ts — the C29 six-outcome re-shape, the retired ch-3 scripted players' ledger-shaped successor): consumes a scripted OUTCOME-per-run sequence whose entry shape is DISJOINT from the runner-minted fields (the internal-closure fix, fifth findings round): a script entry is `{kind: "ok", exitCode, stdout} | {kind: "timeout"} | {kind: "runner_error"}` — the test authors ONLY the outcome; the RUNNER mints `logRef` and `durationMs` (both runner-OWNED — deterministic here, ch-9's real runner measures them) plus the record's workspace-fact fields, and ASSEMBLES the C34 `ProcessResult` from entry + minted fields. Entry-borne EXTRA fields are IGNORED wholesale (the arm-gate-1 correction — under structural TypeScript a widened variable CAN smuggle `{kind: "timeout", logRef: "authored"}` into the entry type, so "can never carry" was false as stated): the runner mints `logRef`/`durationMs` REGARDLESS of any smuggled value — driven by a hostile lane staging ALL the smuggleable fields at once (the arm re-check catch: a logRef-only drive leaves durationMs/stdout smuggling green): the combined smuggling probe runs on EVERY kind — ok, timeout, AND runner_error (the ratifier's eighth round: the wholesale claim binds ALL arms and ALL runner-owned fields, so the drive enumerates the family): a widened entry of EACH kind carrying the FULL smuggleable set for that kind — authored `logRef`, `durationMs`, `headSha`, `gitStatusHash`, `log`, plus `exitCode`/`stdout` on the NON-ok kinds — and the lane asserts every runner-owned field is the runner-minted value on BOTH the result and the record (ref, durationMs, headSha, gitStatusHash), the non-ok result carries NO `exitCode`/`stdout`, and the record's `log` follows R3's per-kind rule regardless of any smuggled `log`. The script is consumed IN AUTHORED ORDER — driven by a multi-entry lane (a three-entry script with distinct kinds asserted in authored order; a `pop()`/reversed consumer fails). The record's `log` field is the CAPTURED OUTPUT for every kind (R3/C26): kind=ok → the entry's `stdout` text verbatim; kind=timeout/runner_error → the deterministic empty string `""` (nothing was captured — never a synthetic diagnostic; the `kind` field carries the failure semantics). A SCRIPT-ENTRY PRECONDITION is fail-loud (the exhaustion-throw culture): the predicate is EXACTLY `Number.isInteger(entry.exitCode)` — C34's domain, NOTHING narrower (the seventh-findings-round correction: a `Number.isSafeInteger` or `>= 0` narrowing would wrongly reject C34-legal integers — narrowing the accepted domain is a C34/draft-level decision, never packet freedom); a failing entry makes `run()` THROW as a script defect — the kit never forwards a C34-violating value. The lane is driven over the FULL R-NUMERIC-LADDER in BOTH directions: rejected by name — a fractional (`1.5`), `NaN`, `Infinity`, `-Infinity`, a numeric STRING (`"1"`), a boxed `Number` object, and the coercible non-numbers `true`, `null`, and `[]` (the arm-gate-1 complement closure: a coerce-then-check mutant — `Number(x)` maps all three to integers — passes the first six rungs and fails exactly these); accepted by name, each rung with ITS OWN killer — `0` and a positive integer (the baseline); `-1` (kills a `>= 0` narrowing); `-0` (kills the plausible V3-predicate COPY mutant — `-0 >= 1` is false — and a `-0`→`+0` coercion: its accept lane asserts `Object.is` identity, `toBe(-0)`, else it collapses into the `0` lane); `2**53` (kills an `isSafeInteger` narrowing — integer but not safe) — each passes through unchanged. RECORDS every SUCCESSFULLY CONSUMED invocation verbatim (`{command, cwd, stdin, timeoutMs}` — the wire-assert surface for P3b), and persists ONE evidence record per COMPLETED run BEFORE resolving (R3's guarantee, in-memory substrate) — the quantifier is scoped to completed runs (the arm-gate-1 precision: the two THROW paths are NOT runs): a `run()` call BEYOND the script THROWS (exhaustion — a test defect, fail-loud) and an invalid-entry call THROWS (the precondition below), and BOTH throw paths leave `invocations` AND `records` UNCHANGED (the post-throw state is pinned by its own lane — a throwing call neither records an invocation nor mints a record, so the one-record-per-invocation correspondence holds exactly); exposes `invocations`, `records`, and ref resolution for assertion. The persistence-BEFORE-resolve guarantee (R3) is asserted in its testable CONSEQUENCE form on an in-memory fake: at the moment `run()` resolves, the returned ref ALREADY resolves against the exposed records and the record count has grown by exactly one — a stronger direct ordering observation does not exist for an in-process substrate (stated, not glossed). TERMINOLOGY (stated so the P3b builder expects the right thing): the six classes here are ProcessResult-level STAGING classes (ok/0, ok/nonzero, timeout, runner_error, ok + malformed stdout, ok + valid decision JSON) — they map onto C29's six DECISION outcomes (allow/warn/block/timeout/runner_error/malformed) only through P3b's classification; the kit stages results and never emits decisions (anchored: contract:ch11-gate-format#C29, contract:ch11-gate-format#C26, contract:ch11-gate-format#C34) |
| T2 | Drift flips: `unitMap.json` — the 4 slice ids flip `realized` (`validate_gate_config` → implement @ gates/process.ts; `GateRegistration` → alias @ ports/gate.ts; `ProcessGateRunner` → type/schema @ ports/gate.ts; `CREATE_INSTANCE` → alias @ kernel/start.ts); `domainRegistry.ts` — `l2a/ProcessGateRunner` and `l2a/ProcessResult` flip realized with their type witnesses; `l2a/GateInvocation` stays PENDING (the wire value is constructed at P3b — a deliberate non-flip); `rejectionNames` UNTOUCHED (54) (derived: prose:plan §11.2, prose:v3/src/drift/unitMap.json) |

## Site × shape × phase grid (template §2 write-time discipline)

N/A — one line with evidence: this share adds ZERO awaited sites to
any phased seam. Admission is synchronous over in-memory values; the
registry is a Map lookup; the scripted runner's async `run()` is a
TESTKIT surface with no kernel caller until P3b (the kernel is
byte-untouched — the diff surface at close is the witness).

## Mirrored surface map (one canonical statement per rule)

| Rule | Canonical | Mirrors |
|---|---|---|
| single-authority admission + defaults materialized once | V1 + V2 | Claim 1 · dimension 1 · the invariant table's validated-at-load row |
| the C21 process lane set + codes | V2 | dimension 1 · V6's code list · the acceptance lane list |
| the effective form's presence rules (onExit/reason by mode) | V1 | dimension 1's exact-config clause · flag F1 · the acceptance letter-case lane |
| cross-rule at admission (declaration level; backstop deferred) | V5 | Claim 3 · dimension 2 · D1's consumer note · the header's rejection-surface sentence |
| the composition's three members + interim reject state | G1 | Claim 2 · Claim 5's interim clause · dimensions 3 and 5 |
| the composition record's immutability (both layers, both depths — freeze at the DEFINITION sites) | G2 | dimension 3's mutation-lane + compile-probe clauses · the acceptance registry bullet's lanes/probes · sweep (d) |
| the runner port contract + result/record shapes + persistence guarantee | R1 + R2 + R3 | Claim 4 · dimension 4 · T1's kit realization |
| the six-outcome kit drive (stageable here, driven at P3b) | T1 | Claim 4's staging clause · dimension 4 · the slice's proof-boundary note |
| deferred-to-P3b set — the COMPLETE enumeration (the C36 runtime backstop + the behavioral rejection · the HANDLE process branch + run_process_gate/classify_process_result/runner_outcome · the C23/C24 wire forms + C25 parse + C32 confinement + C33 propagation · the instance field + start-input seam + store column/schema bump (+ its §11.1 item 2 / item 4 / §11.5 plan alignments) · the evidence checker (both halves) · the durable production slot · the l2a trace · the GateInvocation flip · the gate_execution_not_supported retirement) | the slice's disposition note + the plan §11.4 P3b row (canonical, arm-gate-1 correction — the header sentence covers only the alignment subset) | Claim 5 · the Sizing closure-budget annex · R3's deferral clause · G1's retire clause · T2's GateInvocation non-flip · the header's P3b-alignment note |
| the in-context notes | the rows each note names (V1 · V2/C15 · R1/C13 · G1 · T1) | notes 1–5 (pointer-style, no independent restatement) |

## In-context notes (the scarce budget)

1. **No re-defaulting anywhere downstream:** the effective config is
   COMPLETE per V1's presence rules — if a `??` over `output.mode`
   or a disposition appears outside `validate_gate_config`, the bug
   is upstream. One config form after admission.
2. **The zero/nonzero rename is BOTH-sided:** the authoring grammar
   writes `zero`/`nonzero` — no `"0"` string key survives anywhere
   in this repo's config path (V2; the model text's `on_exit["0"]`
   is wire-history, not code). And the two issue codes are FINDING
   `code` strings ONLY — they never enter `domain/rejections.ts`
   (the registry stays 54; the file is outside the boundary, so a
   "helpful" registry addition fails the post-build audit).
3. **Do not build spawn or execution mechanics:** no kernel edit, no
   `run_process_gate`, no classification, no production runner slot
   — all P3b's; if a change wants `kernel/` or `store/` or `cli/`
   production files, it is out of this packet's boundary.
4. **The interim reject state is a feature, not a gap:** an admitted
   process-gated template that reaches HANDLE and rejects
   `gate_execution_not_supported` is the model's own L2-core
   semantics with the registration present — do not "helpfully"
   soften or special-case it.
5. **The kit runner never spawns:** it is a scripted value machine —
   deterministic refs, in-memory records, loud exhaustion; resist
   adding real-subprocess convenience to it (ch 9's runner is the
   spawning one).

## Embedding gates (v1-inherited)

- **Edited (production):** `v3/src/domain/template.ts` (D1),
  `v3/src/ports/gate.ts` (R1/R2/R3 types + V6's `code`; the same
  edit corrects the file's stale forward-pointer comment — line
  ~43's "its cross-rule branch is P3" is realized HERE by V5),
  `v3/src/ports/index.ts` (exports),
  `v3/src/gates/process.ts` (NEW — G1's registration + V1–V4's
  validator; exports its registration FROZEN, G2),
  `v3/src/gates/registry.ts` (G1 + G2's record),
  `v3/src/gates/threshold.ts` + `v3/src/gates/previousReviewerVerdict.ts`
  (ONE-LINE edits each — `Object.freeze` at the DEFINITION site,
  G2's arm-gate-1 fix: the pre-freeze mutation window closes only
  where the values are born),
  `v3/src/gates/index.ts` (export),
  `v3/src/definition/admit.ts` (V5 cross-rule + V6 code
  carry-through),
  `v3/src/testkit/processGateRunner.ts` (NEW — T1),
  `v3/src/testkit/index.ts` (exports),
  `v3/src/drift/unitMap.json` + `v3/src/drift/domainRegistry.ts`
  (T2), `docs/v3/implementation/plan.md` (the split repartition +
  pointer alignments — applied, riding this commit).
- **Edited (tests):** `v3/src/gates/process.test.ts` (NEW —
  dimension 1: the V2 lane matrix, V3's ladder, V4's hostile
  own-property set, V8's purity, V1's exact effective-config asserts
  incl. the JSON-mode letter case),
  `v3/src/gates/registry.test.ts` (dimension 3),
  `v3/src/definition/admit.test.ts` (dimension 2's cross-rule lanes
  + V6 code carry-through + V7 accumulation),
  `v3/src/testkit/processGateRunner.test.ts` (NEW — dimension 4),
  `v3/src/kernel/kernel.test.ts` (dimension 5's interim-state lane —
  TEST-ONLY: `kernel.ts` production is byte-untouched).
- **Untouched, explicitly:** `v3/src/kernel/**` PRODUCTION files
  (`kernel.ts`, `start.ts`, `admission.ts`, `capability.ts`,
  `gateProjection.ts`, `dispatchIntent.ts`, `index.ts`),
  `v3/src/domain/instance.ts` (the instance field is P3b's — its
  stale round doc-comment is corrected there with the field edit),
  `v3/src/domain/gate.ts` + `outcome.ts` + `rejections.ts`,
  `v3/src/store/**`, `v3/src/cli/**` (production AND tests — no
  wiring change exists yet),
  `v3/src/definition/load.ts` + `validate.ts` +
  `fileDefinitionStore.ts`,
  `v3/src/floor/**`, `v3/src/ingress/**`, `v3/src/diag/**`,
  `v3/src/emit/**`,
  `v3/src/testkit/traceHarness.ts` + `storeCheckers.ts` +
  `templateFixture.ts` (+ their tests), all trace test files
  (`l0aTrace`/`l0bTrace`/`l1Trace`/`l2Trace`/`twoWorker`,
  `emitLoop.test.ts`) — NO `KernelDeps` change happens here, so NO
  deps-literal ripple exists, `v3/templates/**`,
  `v3/eslint.config.mjs`, `tools/**`, `v3/adr/**` (the gates module
  is ADR-013's; no new module decision).
- **Sweeps (measured 2026-07-17, current tree; untruncated; the
  commands are LITERAL — the test exclusion is a flag, not prose;
  fifth-findings-round correction):**
  `grep -rn "gate_execution_not_supported" v3/src --include="*.ts"
  --exclude="*.test.ts"` → 4 hits: `domainRegistry.ts:232`/`:235`
  (drift rows), `domain/rejections.ts:25` (the 54-name registry
  member), `kernel.ts:187` (the P2b early-reject — STAYS
  byte-identical in this packet; the close re-runs the sweep and
  asserts all 4 hits UNCHANGED);
  `grep -rail "runtimecontext\|runtime_context" v3/src
  --include="*.ts" --exclude="*.test.ts"` (case-INSENSITIVE; the
  `-a` is LOAD-BEARING — `definition/admit.ts` carries two literal
  NUL bytes in its `effectiveKey` separator (line ~83), so a
  text-default grep classifies it BINARY and implementations
  DIVERGE on skipping it; the sixth-findings-round catch) →
  exactly 6 files: gates/threshold.ts + previousReviewerVerdict.ts
  (`requiresRuntimeContext: false` fields), ports/gate.ts (the
  flag), definition/admit.ts (the P2a A7 comment this packet
  realizes), drift/domainRegistry.ts (quoted keys),
  domain/rejections.ts (the `runtime_context_*` registry names) —
  NO domain-template/instance/store/kernel hit: D1 is new, zero
  forced literal updates;
  `grep -rnl "ScriptedGate\|ScriptedProcess\|ProcessRunner\|GateRunner"
  v3/src --include="*.ts" --exclude="*.test.ts"` →
  drift/domainRegistry.ts only (quoted keys; the ch-3 players gone
  since P2a — the runner half lands on clean ground);
  `grep -ral "GateConfigFinding\|GateConfigResult" v3/src
  --include="*.ts" --exclude="*.test.ts"` (`-a` for the same
  admit.ts NUL reason) → 5 files (threshold,
  previousReviewerVerdict, ports/gate.ts, ports/index.ts,
  definition/admit.ts — a comment reference at its finding
  carry-through) — V6's optional field forces none of them
  (admit.ts is in the boundary regardless, V5/V6).
- **Type-ripple targets:** D1 and V6 are optional-additive (zero
  forced updates — the measured sweeps); NO `KernelDeps` change → NO
  test-composed-kernel ripple; `v3:typecheck` is the closing
  backstop.

```json
{
  "mutation_boundary": {
    "files": [
      "docs/v3/implementation/plan.md",
      "v3/src/domain/template.ts",
      "v3/src/ports/gate.ts",
      "v3/src/ports/index.ts",
      "v3/src/gates/process.ts",
      "v3/src/gates/process.test.ts",
      "v3/src/gates/registry.ts",
      "v3/src/gates/registry.test.ts",
      "v3/src/gates/index.ts",
      "v3/src/gates/threshold.ts",
      "v3/src/gates/previousReviewerVerdict.ts",
      "v3/src/definition/admit.ts",
      "v3/src/definition/admit.test.ts",
      "v3/src/kernel/kernel.test.ts",
      "v3/src/testkit/processGateRunner.ts",
      "v3/src/testkit/processGateRunner.test.ts",
      "v3/src/testkit/index.ts",
      "v3/src/drift/unitMap.json",
      "v3/src/drift/domainRegistry.ts"
    ]
  }
}
```

## Row manifest (the D1 classification's machine face)

```json
{
  "packet_rows": {
    "rows": [
      { "id": "D1", "class": "anchored", "refs": ["contract:ch11-gate-format#C18"] },
      { "id": "V1", "class": "new-decision", "refs": [] },
      { "id": "V2", "class": "anchored", "refs": ["contract:ch11-gate-format#C21", "contract:ch11-gate-format#C13", "contract:ch11-gate-format#C15", "contract:ch11-gate-format#C5"] },
      { "id": "V3", "class": "derived", "refs": ["contract:ch11-gate-format#C12", "prose:v3/src/gates/threshold.ts"] },
      { "id": "V4", "class": "derived", "refs": ["prose:packet ch11-p2a", "contract:ch11-gate-format#C21"] },
      { "id": "V5", "class": "anchored", "refs": ["contract:ch11-gate-format#C19", "contract:ch11-gate-format#C21"] },
      { "id": "V6", "class": "derived", "refs": ["contract:ch11-gate-format#C21", "prose:packet ch11-p2a"] },
      { "id": "V7", "class": "derived", "refs": ["contract:ch11-gate-format#C20", "prose:packet ch11-p2a"] },
      { "id": "V8", "class": "derived", "refs": ["prose:packet ch11-p2c", "prose:packet ch11-p2a"] },
      { "id": "R1", "class": "anchored", "refs": ["prose:l2a-pseudocode/ProcessGateRunner", "contract:ch11-gate-format#C34", "contract:ch11-gate-format#C13"] },
      { "id": "R2", "class": "anchored", "refs": ["contract:ch11-gate-format#C34"] },
      { "id": "R3", "class": "anchored", "refs": ["contract:ch11-gate-format#C26"] },
      { "id": "G1", "class": "anchored", "refs": ["contract:ch11-gate-format#C8", "contract:ch11-gate-format#C9", "prose:packet ch11-p2a", "prose:packet ch11-p2b"] },
      { "id": "G2", "class": "derived", "refs": ["prose:the ch11-P3a findings rounds (the ratifier's mechanism prescriptions + arm gate 1)", "contract:ch11-gate-format#C8"] },
      { "id": "T1", "class": "anchored", "refs": ["contract:ch11-gate-format#C29", "contract:ch11-gate-format#C26", "contract:ch11-gate-format#C34"] },
      { "id": "T2", "class": "derived", "refs": ["prose:plan §11.2", "prose:v3/src/drift/unitMap.json"] }
    ]
  }
}
```

## Pre-approval flags

- **F1 — the JSON-mode authored `reason`: kernel-unread but
  WIRE-VISIBLE pass-through (V1's letter reading, strengthened at
  the ratifier's second findings round).** C13 lists `reason` as a
  legal optional key unscoped by mode; C21's closed lane list
  hardens only `onExit` against gateDecisionJson mode — so an
  authored, grammar-valid `reason` in JSON mode ADMITS and rides the
  effective config verbatim-as-authored. What that MEANS, stated in
  full (the ratification covers THIS, not a weaker "inert" reading):
  the kernel's own classification never reads it in that mode, BUT
  C23 ships the ENTIRE effective config on the process stdin, so the
  key is WIRE-VISIBLE — the external gate process can observe it and
  may condition its returned decision on it; it is authored
  pass-through data handed to the process (the `command` field's
  class), not dead bytes. This is the one point where the
  "unconsumed config = dead config" culture is not applied, and it
  follows the draft's letter: rejecting the key would add an
  admission lane C21's closed list omits, and a wire-time strip
  would make the wire's `config` diverge from the effective form —
  forking C23's one-downstream-form rule.
  If TRUE inertness is ever wanted, that is a later additive
  draft-level decision (e.g. an admission rejection lane, an
  admission-time normalization DROP of the key in JSON mode — which
  keeps wire ≡ effective, both without it — or a ratified wire
  exclusion; the examples are illustrative, the draft decides),
  named here so it stays visible. MANIFEST CLASS (arm gate 1): V1
  is a NEW-DECISION row — the cited C-rows CONSTRAIN but do not
  select the retention choice, so this flag IS the decision record
  and the human approve is its ratification act (tally 8/7/1,
  below the Case-B threshold; no authority/separation/
  availability-class semantics touched).
  `Route: approve-ratified` — the
  approve ratifies the pass-through meaning.

## Acceptance

- **Dimensions 1–5 test-driven, with ONE named exception carved out
  explicitly: G2's record-is-the-only-source property is a
  REVIEW-OWNED structural obligation (the resolve-only port makes it
  test-undrivable; sweep (d) is its mechanical assist) — every OTHER
  declared lane driven BY NAME and ABLE TO FAIL
  (R-LANE-SENSITIVITY — checked once against these lane texts and
  once against the BUILT test bodies at close); dimension 6 is
  typecheck+sweep-driven by its nature. FOUR NAMED CLOSE-TIME sweeps
  are acceptance obligations: (a) the confinement sweep —
  `grep -rn "gate_execution_not_supported" v3/src
  --include="*.ts" --exclude="*.test.ts"` re-run at close: all 4
  hits UNCHANGED
  (`kernel.ts:187` byte-identical — the kernel is untouched); (b)
  the testkit-in-production sweep — no production file imports
  `testkit/`; (c) the composition sweep — the registry exact-set
  assert covers EXACTLY the three C8 members; (d) the
  single-source sweep — `grep -n "\.set(\|new Map(" 
  v3/src/gates/registry.ts` yields exactly ONE
  `new Map(Object.entries(blockARegistrations))` construction and
  ZERO `.set(` calls (G2's textual assist; the review owns the
  semantics):**
  - `gates/process.test.ts` — dimension 1's full lane matrix (V2 —
    every lane by name, the CONTAINER lanes included BY NAME: config
    present-but-non-map → ONE finding, dependents suppressed, and
    its MESSAGE differs from the config-missing lane's (the two
    lanes assert different messages, never count alone);
    `onExit` non-map in exitCode mode → ONE container finding,
    bucket lanes suppressed; and the PRECEDENCE combination — a
    non-map `onExit` in gateDecisionJson mode yields exactly the ONE
    unconsumed finding, never a container finding or cascade), V3's
    ladder (every rung its own case, `-0`
    included, direct object literals), V4's hostile own-property
    set, V8's frozen-input purity on valid AND invalid arms, V1's
    exact effective-config asserts (defaulted and authored forms,
    both modes, the JSON-mode authored-reason letter case asserted
    verbatim-as-authored and complete-in-exitCode-mode, and the
    MIXED exitCode-mode reason lane — one bucket authored, one
    defaulted, exact-effective).
  - `definition/admit.test.ts` — dimension 2's cross-rule lanes (V5:
    without-declaration finding with code at the binding path;
    with-declaration admits; the hostile requiring-registration
    flag drive; per-binding grain on a two-process-gate template),
    V6's code carry-through (a coded validator finding surfaces with
    its code and C7-prefixed path), D1's type-guarantee probe (the
    `runtimeContext: "sometimes"` invalid-literal `@ts-expect-error`
    on a type-correct template — TS2578 on a widened field), V8's
    CROSS-RULE purity half (the
    V5 lanes run through `admitTemplate` on a deep-frozen template,
    `runtimeContext` covered by the before/after assert — a
    mutating or deleting cross-rule fails), V7's THREE accumulation
    combinations by name (sibling process+threshold; same-binding
    invalid-config + missing-runtimeContext with BOTH finding sets
    present; one config with two independent defects — both
    accumulate).
  - `gates/registry.test.ts` — dimension 3: the exact three-member
    set asserted on the exported `blockARegistrations` record's OWN
    keys (`toStrictEqual` the three C8 ids — a fourth member or a
    missing member both fail); the IMMUTABILITY
    mutation-negative lanes across ALL THREE members (the
    record-level add / delete / replace trio; a nested field
    overwrite PER MEMBER — threshold, previousReviewerVerdict, and
    the process registration each — every attempt THROWS in strict
    mode AND the composition/value is asserted unchanged; plus
    `Object.isFrozen` asserted on all three exported values and the
    record); the TWO compile-negative probes for
    the readonly type half (`@ts-expect-error` on a record-member
    reassignment — the RECORD type's guard — and on a
    `requiresRuntimeContext` overwrite — the P2a port-field
    readonly's nested-depth guard; the P2a `__probe` idiom:
    `export const`-anchored, type-valid RHS so the SOLE error is
    the readonly write; an unused directive is TS2578 and fails
    `v3:typecheck`);
    the record↔catalog wiring lane (each record id resolves through
    the built catalog to ITS registration); the flag values across
    members; no evaluate on the process member by type.
  - `testkit/processGateRunner.test.ts` — dimension 4 (persistence
    before resolve; ref resolution; one record per invocation;
    deterministic fields; verbatim invocations; the exhaustion-throw
    negative; all six outcome classes staged) PLUS the
    sixth-findings-round sensitivity set: PER-KIND exact
    result↔record correspondence (for each staged kind, the returned
    `ProcessResult` and the record it addresses asserted
    FIELD-FOR-FIELD — `kind` equal; `exitCode` equal and present iff
    ok on BOTH sides; `durationMs` EQUAL on both sides and
    runner-minted (the ratifier's eighth round: two different
    non-negative integers must fail); `log` = the entry's stdout
    for ok, `""` for timeout/runner_error); the SCALAR-DOMAIN lanes driven by name
    (`logRef !== ""`; `Number.isInteger(durationMs) && durationMs
    >= 0`; `Number.isInteger(exitCode)` on the runner's OUTPUT); and
    the script-entry `exitCode` precondition driven over the FULL
    discriminating ladder (T1's rule, BOTH directions): REJECTED,
    each its own lane — `1.5`, `NaN`, `Infinity`, `-Infinity`, the
    string `"1"`, a boxed `Number` object — each makes `run()`
    THROW (a pass-through implementation fails these); ACCEPTED,
    each its own lane with its own killer — `0` and a positive
    integer (baseline); `-1` (fails a `>= 0` narrowing); `-0`
    (fails a `>= 1` V3-copy mutant and coercion — asserted
    `toBe(-0)`, `Object.is` identity); `2**53` (fails an
    `isSafeInteger` narrowing) — each passes through unchanged
    (the accepted domain is exactly `Number.isInteger`, C34's — any
    narrower domain would be a C34/draft-level decision); the
    coercible-non-number rungs `true`, `null`, `[]` (each throws —
    the coerce-then-check mutant killer); the SCRIPT-ORDER lane (a
    three-entry script with distinct kinds consumed in authored
    order — a reversed consumer fails); the SMUGGLED-FIELDS
    hostile lanes, one PER kind — ok, timeout, AND runner_error (a
    widened entry of each kind carrying the full smuggleable set:
    `logRef`, `durationMs`, `headSha`, `gitStatusHash`, `log`, plus
    `exitCode`/`stdout` on the non-ok kinds — every runner-owned
    field asserted runner-minted on BOTH result and record; the
    non-ok result carries no `exitCode`/`stdout`; the record's
    `log` follows the per-kind rule regardless of a smuggled
    `log`); the
    POST-THROW-STATE lane (after an exhaustion throw AND an
    invalid-entry throw, `invocations` and `records` asserted
    UNCHANGED); and the R2 union compile-negative probes — SIX, both iff
    directions: `@ts-expect-error` assigning `exitCode` and
    `stdout` on EACH non-ok arm (four, the absence half) plus the
    two ok-arm omission probes (`{kind:"ok"}` literals each missing
    one required field, the presence half) — TS2578 on any widened
    arm in either direction.
  - `kernel/kernel.test.ts` — dimension 5's interim-state lane (an
    ADMITTED process-gated template through the SHIPPED composition
    → `Rejected(gate_execution_not_supported)`; production kernel
    byte-untouched).
- **Behavior-change honesty:** the claimed deltas are EXACTLY: the
  admission process/cross-rule lanes (new findings on previously
  unresolvable-`uses` templates — `external.process` now resolves),
  the one optional template field, the optional finding-code field,
  the port types, the kit runner, and the drift flips; everything
  else is proven unchanged by the FULL existing suite green with
  zero golden-expectation edits.
- Drift tests green (standing, unconditional — PI-3): rejection
  registry untouched (54); `unitMap.json` +4 realized;
  `domainRegistry.ts` +2 realized (GateInvocation deliberately
  pending — T2).
- Coverage validation green: units 21/159 (+4), invariants 20/116
  (+4), traces 4/20 (unchanged).
- Bridges green at close: `v3:typecheck`, `v3:lint`, `v3:test`,
  `v3:coverage`, `v3:packet-lint` (--forbid-reopened: 0 reopened),
  `v3:adr-check` (14 ADRs, no new ADR).
- Standing review rules in force: **REV-A1-TXN** (no commit-path
  change), **REV-B-LOCAL-NOT-AUTHORITY** (the registry is injected
  composition, never a mutable lookup; no process-local map gates
  anything), **REV-C-PROJECTIONS-READONLY** (no read-model change),
  **REV-E-NO-ADAPTER-BRANCH** (no kernel change at all),
  **REV-DIAG-FAILOPEN** (diag untouched).

## Build record

<Filled at build close.>

```json
{
  "packet_metrics": {
    "class": "kernel-semantic",
    "prediction": { "predicted": "projection", "reasoning": "inherited from the P3 row through the findings-round split; the draft (ratified 2026-07-12) decided every open point of the process-admission contract — the packet projects C5–C21/C26/C29/C34's admission-side rows + the four foundation units", "discovered": "projection" },
    "provenance": { "anchored": 8, "derived": 7, "new_decision": 1 },
    "rounds": { "review": 0, "doc_refinement": 0, "implementation": 0 },
    "stops": [],
    "detector_misses": [],
    "learned": ""
  }
}
```
