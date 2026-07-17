# Task Packet: ch11-P3a — the process-admission foundation (external.process registration · runner port + evidence contract · scripted kit runner · runtimeContext declaration)

Plan step: plan.md §11.4 P3a row — the P3 slot's FOUNDATION share under
the ratified ch11-P3 split (foundation → activation; the P3a/P3b rows
are the repartition, aligned at ch11-p3a pre-approval). Realizes §11.1
item 3's admission-side half plus item 4's template-declaration grain:
`validate_gate_config` as the `external.process` registration's
validate-and-normalize body, run by `admit_definition` at definition
load; the registration joins the static registry (C8's chapter-end
three-member composition); the `ProcessGateRunner` / `ProcessResult` /
evidence-record PORT shapes (C34/C26) with the ledger-shaped scripted
testkit runner (kit piece only — the end-to-end six-outcome drive is
P3b's); the template-side `runtimeContext` declaration key (C18,
domain grain) and the C19 admission cross-rule. The kernel is
byte-untouched (Claim 2's scoped statement) — a process gate reaching
HANDLE still rejects `gate_execution_not_supported` until P3b (the
P2b lane stands). Draft anchors (= the manifest's C-row ref union):
`contract:ch11-gate-format` rows C5/C8/C9/C12–C21/C26/C29/C34 —
admission-side shares; the C23–C25 wire forms, C31–C33, C36, and the
l2a golden trace are P3b's; C37–C41 are P2c/P4's. Plan alignment:
the P3-split alignment — the §11.4 P3a/P3b rows and the §11.1/§11.2
P3-slot sentences, each marked "aligned at ch11-p3a pre-approval" —
is PREPARED in the working tree and lands in the SAME commit as this
packet (R-ALIGNED-UP); beyond it, no decision here contradicts
ratified plan text.
Autonomy stage: measurement — inherited from the P3 slot through the
split (parts inherit mode, predicted class, watchpoints; fresh
watchdog per part). Not first-of-a-kind: the admission-extension
class has precedent (ch11-P2a built `admitTemplate`; ch11-P2c
extended its normalization), the port-declaration class has precedent
(ch11-P2a reconciled `ports/gate.ts`), and the testkit-fake class has
precedent (the ch3 scripted players, the ch5 kit packets).
Classification: **projection** — manifest tally: 9 anchored /
3 derived / 2 new-decision (machine-counted from the `packet_rows`
block). The two new-decision rows (V1's JSON-mode authored-`reason`
retention; V5's C19 finding granularity) are below the
Case-B threshold and touch no
authority/separation/availability-class semantics; they ride as
flags F1/F2 to the approve — the approve is therefore FLAG-BEARING
(STOP `4:flagged-approve`): the human's act, which ratifies them.

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

The EMPTY rejection list is a declaration, not an omission: no
registry rejection changes hands here. The three codes this packet
drives — `invalid_process_gate_config`, `gate_config_not_supported`,
`runtime_context_required_for_process_gate` — are DEFINITION-ISSUE
codes on ch8's load channel (C20; the tokens reuse the former
rejection names). `runtime_context_required_for_process_gate`'s
REJECTION half (the C36 HANDLE runtime backstop — the registry's
dual name) is P3b-owned; the rejection registry stays 54 names,
untouched. The l2a units NOT owned here — `HANDLE`,
`run_process_gate`, `classify_process_result`, `runner_outcome` —
and the l2a golden trace are P3b's (the activation share), as are
the three remaining l2a invariants — `evidence-on-every-run`
(checker), `runner-error-business-block` (test),
`runs-in-the-workspace` (test): 4 owned here + 3 there = the §11.2
l2a share of seven.
Disposition notes: `validate_gate_config` is `implement` (realized
in full AGAINST the canonical V-matrix — see the operative
material's authority note); `ProcessGateRunner` is
`type/schema` (the PORT shape and its values — the spawn is ch9's,
the kit fake is testkit surface); `GateRegistration` is
`alias/inherited` (the l2a unit EXTENDS the P2a-realized l2
registration contract — the process arm already exists in
`ports/gate.ts`; this packet instantiates the `external.process`
member, adding no new contract shape); `CREATE_INSTANCE` is
`alias/inherited` (the §11.2 reprint class: its text pins that CREATE
consumes only admitted definitions — realized at P2a, byte-unchanged
here).

## Sizing/risk (template §2 step 0 — materialized)

Axes:

- **authority movement: none.** Admission remains the single semantic
  authority built at P2a (C20); this packet adds a registration UNDER
  the existing `GateRegistration` contract and the cross-rule branch
  `admit.ts`'s own A7 note reserves for this packet.
- **surface spread:** one concept (the process-admission foundation)
  across the gates module (the registration), the ports surface (the
  runner port + evidence shapes), the domain grain (one optional
  template field), the admission seam (the C19 branch), and the
  testkit CONTRACT (a new fake seam — counts under the surface rule).
  No kernel-logic, store-schema, ingress, read-projection, or CLI
  surface changes.
- **identity/join fragility: none** — no cross-seam identity joins
  (`logRef` resolution is a single-port contract).
- **foundation + activation coupling: none by construction** — the
  ratified P3 split exists exactly to sever it; activation (the
  HANDLE process branch, the wire forms, the storeChecker, the l2a
  trace) is P3b's, and the P2b `gate_execution_not_supported` lane
  stands.
- **prerequisite coupling: none** — P2a/P2b/P2c are built; ch9's
  spawn is explicitly out (port shape only).
- **acceptance multiplicity:** one proof class — contract/unit tests
  over the admission lanes, the type surfaces, and the kit runner's
  own contract; no schema/CLI/migration proof.

Consume-family scan (from the tree):

| Family | State | Evidence |
|---|---|---|
| producer / validator-gate | present — extended | `v3/src/definition/admit.ts` (the A7 note reserves the branch); `v3/src/gates/registry.ts` (the composition) |
| persistence / replay | absent | no store file in the mutation boundary; no schema change |
| execution consumer | present — reached through an UNCHANGED port | the kernel reads effective configs via `AdmittedTemplate` (P2a); a consumer reached through an unchanged port is still a consumer; its process branch is P3b's |
| read / presentation (floor + CLI) | absent | no floor/CLI file in the boundary; C28: no new verbs or flags |
| recovery / cleanup | absent | no such surface exists on this slice |
| external / integration | declared, not driven | the `ProcessGateRunner` port IS the future dispatch seam; the spawn is ch9's |
| testkit | present — contract change | the scripted runner is a new kit seam (counts) |

**Hard stops:** hard stops 2 AND 6 trip BY LETTER — hard stop 2 on
the surface-spread axis's own enumeration (one concept across the
gates module, the ports surface, the domain grain, the admission
seam, and the testkit contract — the testkit seam counts under the
surface rule), hard stop 6 on the consume-family count (validator,
execution-consumer-through-an-unchanged-port, testkit).
`single-packet allowed: yes` — ONE implementation-closure proof
covers both trips: one bounded code change (the registration + the
port shapes + the kit runner + the A7 branch) closes every touched
surface and family in the same build; one proof surface (the
admission-lane, type-level, and kit-contract tests) validates all
of it; the execution-consumer family's fallout is deferred WHOLE to
P3b by the ratified split — no per-consumer-family review loop, no
separate compatibility/diagnostics/read-projection/recovery/
ordering risk. No further hard-stop or escalation combination is
near (one success class; no store/floor/CLI surface). Conditional
annexes: **closure-budget — the SHARED-CONTRACT bucket is touched**
(compact record): the R1–R3 port/result/evidence shapes are NEW
shared contracts with three consumers — the kit runner (closed
HERE), the P3b execution path (deferred by the ratified split; the
C34/C26 rows pin the shape for it), and the ch9 real runner
(deferred by the chapter boundary; same pinned rows) — the two
deferrals are the split's designed shape, safe because this
packet's only live consumer is the kit and the contract rows fix
the shape both successors must meet; the
authority/runtime/read-projection buckets stay untouched (the
mutation boundary contains no kernel/store/floor/cli file).
**proof-boundary N/A** — no
success/completion-proof semantics change (no existing proof
contract is reused or moved; the new tests are the new surfaces'
own). **mutable-flow N/A** — admission is a pure computation (the
all-or-nothing A2 return commits nothing on any failure path,
P2a-built); the kit runner's persist-before-return is its OWN
declared contract (R3), not hard-stop-9 material (no
rollback/retry/lock semantics change on any producer).

## Claim + dimensions (enumerated BEFORE deriving test obligations)

The Claim, stated wide; every completeness clause carries its closed
form (R-CLAIM-GRAMMAR):

1. **Admission (PARAMETERIZED).** Every member of the declared lane
   inventory (the V2 list; membership owner: row V2, projecting
   C21's process-side subset) is decided by `admit_definition` at
   definition load through the `external.process` registration: a
   template carrying process gates either ADMITS with its effective
   config fully materialized per V1, or reports every violated
   lane's finding on ch8's load channel (issue accumulation,
   all-or-nothing), the named lanes carrying their issue codes. No
   process-gate config reaches any downstream surface in raw
   authored form (C20 — the definition store's only output is the
   admitted value).
2. **Runtime non-change (SCOPED).** Outside the admission seam and
   the new port/testkit/domain surfaces, shipped behavior is
   unchanged: the kernel is byte-untouched — enforced by the
   declared mutation boundary (no kernel file), machine-audited at
   build close — and a process gate reaching HANDLE still rejects
   `gate_execution_not_supported` (the P2b-built lane and its test
   stand unedited). Named exclusion + deferral home: the
   reject→run flip is P3b's.
3. **Port (PARAMETERIZED).** The `ProcessGateRunner` port,
   `ProcessResult`, and the evidence record carry C34/C26's exact
   field lists (rows R1–R3): `run()` resolves only after its
   evidence record is durably persisted on the runner's substrate; a
   returned `logRef` resolves; timeout and runner_error runs are
   evidenced equally (the run-level half of the l2a
   evidence-on-every-run invariant — the storeChecker half is
   P3b's).
4. **Registry (MEASURED at build).** The shipped catalog resolves
   exactly the three C8 members — the two-way exact-set test plus a
   close-time untruncated sweep receipt over `gates/registry.ts`.
5. **Declaration (PARAMETERIZED + SCOPED).** `WorkflowTemplate`
   gains the optional `runtimeContext` field whose sole legal value
   is the string literal `"required"` (C18 at the domain grain; the
   literal type forecloses other values on the direct channel, with
   its compile-negative probe per the probes discipline), and a
   template declaring any process gate without it fails admission
   per C19 (row V5, both iff directions). Named exclusions: the
   YAML key and its source-form lanes are P4's; the instance field,
   start-input seam, and store column are P3b's.

Dimensions:

1. config container states (absent-where-required / non-map / map);
2. key presence per keyset — each required key's absence, each
   unknown key, per container: `config`, `output`, `onExit`,
   `reason`; plus own-property hostility: an inherited/`__proto__`
   member is never read as config (the G8 discipline);
3. value domains — `command` string/nonempty; `output.mode`
   allowlist; `onExit` bucket verdict allowlist; disposition
   allowlist with the `failInstance` DISTINCT lane; `reason` token
   grammar;
4. the numeric ladder on `timeoutMs` (value → descriptor → prototype
   → numeric identity: non-integer, unsafe, zero, negative, `-0`
   distinguished via `Object.is`, `NaN`/`Infinity`, non-number,
   boxed Number);
5. mode × keyset interaction — `onExit` required in exitCode mode
   AND illegal in gateDecisionJson mode (both iff directions);
6. defaults materialization — each V1 default driven in BOTH
   directions (absent → materialized, authored → carried);
   exitCode-mode `reason` completeness (authored-or-default per
   bucket); JSON-mode `reason` verbatim carry, partial-stays-partial;
7. the cross-rule plane — process gate × `runtimeContext` value:
   declared-required admits; undeclared with a process gate fails;
   undeclared with N ≥ 2 process gates fails with EXACTLY ONE
   finding (the count member — N = 1 cannot distinguish
   template-grain from per-gate); a process-gate-free template
   admits regardless (C19's iff, both directions);
8. issue-code assignment — each coded lane's code; uncoded lanes
   stay code-free (the A9 carrier discipline);
9. accumulation and suppression — a multi-fault template reports its
   full lane set; a broken container suppresses only its own
   dependent lanes;
10. port result kinds × field presence — `exitCode`/`stdout` present
    iff kind=`"ok"` (both directions);
11. evidence timing and content — persist-before-return, a record
    for every kind, deterministic workspace-fact fakes;
12. registry membership — exact-set, two-way;
13. type-level foreclosures — the process arm cannot carry
    `evaluate`; `execution` is the `"inline"` singleton;
    `runtimeContext` is the `"required"` literal — each carries its
    own compile-negative probe.

## Operative material (full text — projection, not invention)

Authority note: the unit texts are the model floor, reprinted
verbatim; the BUILD TARGET for the validator body is the canonical
V-matrix. V1–V6 bind lanes the skeleton omits — the `reason` grammar
and its exitCode-mode materialization, the unknown-key and
container-kind checks, the V3 value ladder — and V2's o/p lanes are
DISTINCT single-code lanes: the skeleton's disposition fall-through
(a `failInstance` value also matching the `≠ block_transition` arm)
is superseded — one finding per disposition value, never a double
code.

`l2a-pseudocode/validate_gate_config` (disposition: implement):

```text
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

`l2a-pseudocode/GateRegistration` (disposition: alias/inherited):

```text
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

`l2a-pseudocode/ProcessGateRunner` (disposition: type/schema):

```text
# ProcessGateRunner — the executor that spawns an external gate process; the kernel owns the contract, the runner owns the spawn
INTERFACE ProcessGateRunner:
  run(command, { cwd, stdin, timeout_ms }) → ProcessResult   # { kind: ok | timeout | runner_error, exit_code?, stdout?, log_ref, duration_ms }
```

`l2a-pseudocode/CREATE_INSTANCE` (disposition: alias/inherited — the
§11.2 reprint class; included for the one line this packet leans on:
CREATE consumes only ADMITTED definitions, realized at P2a and
byte-unchanged here):

```text
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

The exact issue-code tokens (data, not prose):
`invalid_process_gate_config` · `gate_config_not_supported` ·
`runtime_context_required_for_process_gate` — definition-issue codes
on the load channel; the third is also the C36 rejection's name
(P3b's half of the dual).

## Canonical domain matrix (D)

| ID | Rule |
|---|---|
| D1 | `WorkflowTemplate` gains the OPTIONAL `readonly runtimeContext` field, typed as the string literal `"required"` (C18 at the domain grain). Absent = a context-free workflow. The literal type forecloses every other value on the direct channel (compile-negative probe per the probes discipline; the file-channel illegal-value lane lands at P4 with the YAML key). The admitted value carries the field through unchanged (`admitTemplate` spreads the template root). Named exclusions with homes: the instance-side field, start-input seam, and store column — P3b; the YAML authoring key + source-form lanes — P4. |

## Canonical admission/validator matrix (V)

| ID | Rule |
|---|---|
| V1 | The EFFECTIVE process config (the admitted binding's single `config` surface, P2a's A5): `{ command: string (nonempty), timeoutMs: number, output: { mode: "exitCode" \| "gateDecisionJson" }, onExit?: { zero: Verdict, nonzero: Verdict }, onRunnerError: "blockTransition", onTimeout: "blockTransition", reason?: { zero?: token, nonzero?: token } }` — every default MATERIALIZED once at admission: absent `output` ⇒ `{ mode: "exitCode" }` (C14); absent dispositions ⇒ `"blockTransition"` (C16). Presence rules, stated once: `onExit` is present IFF exitCode mode — REQUIRED there, an admission finding when authored in gateDecisionJson mode (C15's hardening, lane n). `reason` in exitCode mode is ALWAYS present and COMPLETE — both buckets, authored-or-default `exit_zero`/`exit_nonzero` (C17). `reason` in gateDecisionJson mode is present IFF AUTHORED — grammar-validated, carried VERBATIM as authored (a partial map stays partial: C17's defaults belong to exit-bucket decisions, which that mode never produces), kernel-unread but NOT system-inert: C23 (P3b's wire) ships the ENTIRE effective config on the process stdin, so the authored value is WIRE-VISIBLE — the external gate process may observe it and condition its returned decision on it; authored pass-through data handed to the process, the `command` field's own class. Flag F1 is this decision's record (new-decision; the approve ratifies it). |
| V2 | The admission lane inventory — the ONE channel (C20), C21's process-side subset; each lane fires per occurrence at its C7-addressed path in ch8-C21 `{path, message}` form, container preconditions joining ch8-C21's rule (a missing or wrong-kind container is ONE finding; its dependent lanes are suppressed); NAMED lanes additionally carry their CODE. The inventory as a LIST (membership owner: THIS row; named exclusions: the P2a-built structural/`uses`-grammar/threshold/verdict-config lanes stand unchanged; the C40 round lanes are P2c/P4's; the P4 source-form lanes are P4's): a. `config` missing where the registration requires it (C5) — uncoded, at the config path; dependent lanes suppressed. b. `config` not a map — container precondition, uncoded. c. process-config unknown key — uncoded. d. `command` missing / empty / non-string → `invalid_process_gate_config`. e. `timeoutMs` missing or value-invalid per V3 → `invalid_process_gate_config`. f. `output` not a map — container precondition, uncoded. g. `output` unknown inner key — uncoded. h. `output.mode` not in { `exitCode`, `gateDecisionJson` } (non-string included) → `invalid_process_gate_config`. i. `onExit` missing in exitCode mode (the defaulted form included) → `invalid_process_gate_config`. j. `onExit` not a map — container precondition, uncoded. k. an `onExit` bucket (`zero` / `nonzero`) missing → `invalid_process_gate_config`. l. an `onExit` bucket value outside { `allow`, `warn`, `block` } (`route` included) → `invalid_process_gate_config`. m. `onExit` surplus key — uncoded. n. `onExit` present in gateDecisionJson mode (unconsumed config) — uncoded. o. `onRunnerError` / `onTimeout` = `failInstance` → `gate_config_not_supported` (the DISTINCT reserved-disposition lane). p. `onRunnerError` / `onTimeout` any other non-`blockTransition` value → `invalid_process_gate_config`. q. `reason` violation — a non-map value is a CONTAINER PRECONDITION (one finding, its dependent sub-lanes suppressed — the `reason` map joins C21's container rule, symmetric with lanes b/f/j); on a map: unknown key beside `zero`/`nonzero`, or a token failing `^[a-z][a-z0-9_]*$` — uncoded. r. resolution: `external.process` now RESOLVES against the shipped catalog (the P2a `gate_evaluator_unavailable` lane's code path is unchanged; this packet drives the positive direction). s. the C19 cross-rule lane — the ONE declared exception to the per-occurrence rule: TEMPLATE-GRAIN, exactly one finding at the top-level `runtimeContext` path (V5's ratified granularity) → `runtime_context_required_for_process_gate`. |
| V3 | `timeoutMs` value grammar — the C12 VALUE half at the domain grain: a safe integer ≥ 1, the full numeric ladder binding (dimension 4; `-0` fails the ≥ 1 bound and is still driven as its own ladder member, distinguished via `Object.is` where equality could mask it). DERIVATION NOTE: the same value-grain projection of C12's source regex that `threshold.ts` realizes for `value` — the one-grammar rule for authored integers; the source-text half is P4's (named exclusion). |
| V4 | Finding addressing + code carrier: the registration's findings are config-relative `{path, message}` (`""` = the config itself); admission prefixes the C7 address `steps.<stepId>.gates.<eventType>[<i>].config…`; the `code` field rides per the A9 carrier rule — present on exactly the named lanes (d, e, h, i, k, l, o, p, s), absent on every uncoded lane. ADDRESSING EXCEPTION — lane s (a MIRROR of V5, the canonical home; this row decides nothing about it): not a registration finding (`admit_definition`-emitted, never the per-gate validator), addressed at the TOP-LEVEL template path `runtimeContext`, template-grain — never config-relative, never C7-prefixed; it appears in this roster as a CODE carrier only. DERIVATION NOTE: the P2a-built `GateConfigFinding`/`ValidationFinding` contract applied to this registration's lanes under C21's code assignments. |
| V5 | The C19 cross-rule: read from the registration's `requiresRuntimeContext` flag by `admit_definition` — never by the per-gate config validator (the rule crosses the template). Fires IFF the template declares ≥ 1 process gate AND `template.runtimeContext` is not `"required"`; the negative directions: a declaring template admits, and a process-gate-free template admits with or without the declaration. EXACTLY ONE finding for the TEMPLATE, at the top-level path `runtimeContext`, code `runtime_context_required_for_process_gate`; the message MAY name the triggering bindings (message granularity is packet freedom — every triggering binding stays locatable). DECISION NOTE (new-decision, ratifier-selected): C19 phrases the outcome in the singular at the template grain while C21's matrix is per-occurrence — both a single template-level finding and one per offending binding conform, so the granularity is a decision. The TEMPLATE-GRAIN single finding is the selected form: one missing declaration is ONE defect with N causes (the author's fix is one top-level key, never a per-gate edit), the finding points at the fix site, no N-fold duplicate diagnostics, and the form stays stable as later process gates join the template. Flag F2 is the dated decision record; the approve ratifies it. |
| V6 | Single-authority admission (C20): both channels — the file pipeline's validate stage and the direct-constructed testkit path — pass the SAME `admitTemplate` over the SAME injected catalog; the effective config is written into the binding at admission; no second validation point exists. Testing an invalid config asserts the compiler's issue list — a raw template is never handed to the kernel (C22's standing rule). |

## Canonical runner-port matrix (R)

| ID | Rule |
|---|---|
| R1 | `INTERFACE ProcessGateRunner: run(command, { cwd, stdin, timeoutMs }) → Promise<ProcessResult>` — the model unit's signature at the TS grain (`timeout_ms` → `timeoutMs`, the C13/C16/C18 rename culture; snake_case belongs to P3b's wire forms). `command` is C13's one POSIX shell line; `cwd` is the workspace root; `stdin` carries the invocation document (no argv payload). The spawn realization is ch9's — this packet declares the port and scripts it in the kit. |
| R2 | `ProcessResult` (C34's verbatim field list at the TS grain): `{ kind: "ok" \| "timeout" \| "runner_error", exitCode?, stdout?, logRef, durationMs }` — `exitCode` (an integer) and `stdout` (the UTF-8-decoded text) present IFF kind=`"ok"` (both iff directions driven); `logRef` a nonempty string; `durationMs` a non-negative integer. `stdout` is process-returned text: opaque at this packet, classified untrusted-confined (C25 consumes it at P3b under C32's culture — never re-parsed or interpreted here). |
| R3 | The evidence record (C26's complete field list, realized IN FULL — only the measurement is ch9's, never the fields): addressed by `logRef` (the ref addresses the WHOLE record); fields `{ log, kind: "ok" \| "timeout" \| "runner_error", exitCode? (present iff kind="ok"), durationMs (non-negative integer), headSha, gitStatusHash }`. PERSISTENCE GUARANTEE (the port's contract): `run()` has DURABLY persisted the record on its substrate BEFORE returning — a returned `logRef` MUST resolve, and the record exists independently of any kernel commit (timeout and runner_error runs are evidenced too). The workspace-fact fields are the runner's DECLARED values: the kit runner mints deterministic fakes; the ch9 real runner measures them. `kind` records PROCESS EXECUTION independent of decision classification (a malformed-JSON run is kind=`"ok"` — the C25/C29 six-outcome bridge is P3b's to drive end-to-end). `log` is captured output text: untrusted-confined — retained verbatim in the record, never re-parsed, never policy or path input; at this packet its only consumers are kit assertions. |

## Canonical registry matrix (G)

| ID | Rule |
|---|---|
| G1 | The shipped catalog composition becomes EXACTLY { `declarative.threshold`, `pairflow.previous_reviewer_verdict`, `external.process` } — C8/C9's chapter-end three-member set, MEASURED at build (the two-way exact-set test: the three resolve to their registrations, every probed other id resolves `null`; plus the close-time untruncated sweep receipt over `gates/registry.ts`). Static composition, no mutation API, injected at the composition roots (neither `kernel/` nor `definition/` imports `gates/` — the C29/ADR-013 import rule stands unchanged). |
| G2 | The `external.process` registration: `{ implementation: "process", execution: "inline", requiresRuntimeContext: true, validateAndNormalizeConfig: <the validate_gate_config body> }`. The process arm carries NO `evaluate` — foreclosed by the P2a-built discriminated union, with its standing compile probe extended to the SHIPPED registration. It is the only registry member with implementation=`"process"` (C9); all three members are execution=`"inline"` (the `"inline"` singleton type — the still-inline-only invariant's type/schema disposition, with its compile probe). |

## Canonical testkit/drift matrix (T)

| ID | Rule |
|---|---|
| T1 | `ScriptedProcessGateRunner` (testkit): implements the R1 port; plays scripted per-call `ProcessResult` outcomes with FAITHFUL QUEUED PLAYBACK — each call returns EXACTLY the next scripted result, field-for-field as scripted, in order (a runner normalizing, defaulting, or altering any scripted field violates this row). The six-outcome mapping (parameterized, THIS row is the membership owner — each C29 outcome member → its scriptable `ProcessResult` shape): allow/warn/block via the exit-bucket path ← kind=`"ok"` + `exitCode` 0 or nonzero (the bucket dispositions select the verdict); allow/warn/block via the JSON path ← kind=`"ok"` + `stdout` carrying a C25 `GateDecision` document; malformed ← kind=`"ok"` + `stdout` carrying non-C25 text (per R3's kind note); timeout ← kind=`"timeout"`; runner_error ← kind=`"runner_error"`. Mints deterministic workspace-fact fakes; PERSISTS its evidence record before resolving (R3's guarantee is the kit's own driven contract) and EXPOSES its persisted records for assertion. Script exhaustion is an explicit error (the scriptedActor idiom). Kit piece only — the end-to-end six-outcome drive through classification and HANDLE is P3b's (the deferral home). |
| T2 | Drift flips at build: `unitMap.json` — the four owned unit ids flip pending → realized with their `codeRef` witnesses; the two `alias/inherited` flips witness their PRE-EXISTING realization sites (`CREATE_INSTANCE` → the kernel's create path; `GateRegistration` → `ports/gate.ts`) — existing files outside or inside this boundary, byte-untouched where outside (the `l2-pseudocode/CREATE_INSTANCE` → `kernel/start.ts` precedent: the map accepts existing-file witnesses); `domainRegistry.ts` — `l2a/ProcessGateRunner` and `l2a/ProcessResult` flip with witnesses; `l2a/GateInvocation` STAYS pending (P3b's wire value). The rejection registry is untouched (54 names). DERIVATION NOTE: plan §11.2's ownership arithmetic applied to the drift files' current pending markers. |

## Site × shape × phase grid

N/A with evidence: this packet's failure lanes live at ADMISSION — a
pure, single-phase pre-state computation (the all-or-nothing A2
return commits nothing) — and inside the kit runner's single-call
contract. No seam with phases (stop/drain, pre/post-commit) gains a
failure lane here; the HANDLE-side phases arrive with P3b.

## Mirrored surface map (one canonical statement per rule)

| Rule | Canonical home | Named mirrors (summarize/defer only) |
|---|---|---|
| kernel byte-untouched | Claim 2 | the header paragraph; the sizing surface-spread axis; the closure-budget annex; the mutation-boundary note ("Claim 2's machine face") |
| the effective-config shape + presence | V1 | Claim 1's reference; R1's stdin mention (the wire is P3b's) |
| the three-member composition | G1 | Claim 4; the header paragraph |
| the six-outcome family | T1 | R3's kind note; the header's kit-piece sentence |
| the P3b deferral set (HANDLE branch, wire forms, checker, trace, C36) | the slice notes | the header anchors sentence; Claim 2/5 exclusions; the sizing foundation-coupling axis; T1/T2 |
| the issue-code tokens | the operative-material data line | V2's per-lane assignments; the slice note |
| the C19 cross-rule | V5 | Claim 5; V2 lane s; V4's code-carrier roster + addressing exception; G2's flag mention; D1's exclusions; the header |
| the runner/result/evidence field lists | R2/R3 | the header; the ProcessGateRunner unit's comment line |
| persist-before-return | R3 | Claim 3; T1's guarantee mention; the acceptance kit-contract bullet |
| the `runtimeContext` optional-`"required"` field | D1 | Claim 5; dimension 13 |
| the 54-name rejection registry untouched | the slice note | T2; the acceptance drift bullet |
| the own-property (G8) discipline | the in-context note | dimension 2's hostility member; the acceptance own-property bullet |

Fold policy: a change to a canonical row updates every named mirror
before handing back; a mirror discovered in review is added here.

## In-context notes (the scarce budget)

- Extend, don't fork: the registration lands as
  `v3/src/gates/process.ts` beside `threshold.ts` /
  `previousReviewerVerdict.ts`, following their shape (a module-level
  registration value + local validator helpers); `admit.ts`'s A7
  comment marks exactly where the cross-rule branch belongs —
  realize it in place, minding the grain: DETECTION rides the
  per-binding loop (the resolved registration's
  `requiresRuntimeContext` flag observed as bindings resolve), and
  the SINGLE template-grain finding emits ONCE, post-loop, against
  `template.runtimeContext` (V5's form — never one per binding); no
  second validator, no parallel port file.
- The own-property discipline (P2a's G8) binds every config read:
  own enumerable string keys only — `__proto__`/inherited members
  are never config (`threshold.ts` is the pattern).
- The C15 word-key rename applies on BOTH sides: the validator reads
  the WORDS `zero`/`nonzero`; the model text's `"0"` bucket never
  appears in code.
- The kit runner follows `scriptedActor`'s scripting idiom —
  deterministic queue, explicit exhaustion error; kit self-tests own
  its contract.
- Hostile numeric fixtures ride the direct channel as object
  literals — the channel preserves `-0` (no stringify staging; the
  R-RAW-FIXTURES watchpoint does not fire).

## Embedding gates (v1-inherited)

- Target files (verified against the live tree): NEW —
  `v3/src/gates/process.ts` + test,
  `v3/src/testkit/scriptedProcessGateRunner.ts` + test. EDITED —
  `v3/src/gates/registry.ts` (composition) + `registry.test.ts` (the
  exact-set test currently asserts `external.process` → `null`; it
  flips), `v3/src/gates/index.ts`, `v3/src/ports/gate.ts` (the
  runner port + result + evidence shapes join the reconciled port
  file) + `v3/src/ports/index.ts`, `v3/src/domain/template.ts` (the
  `runtimeContext` field) + `v3/src/domain/index.ts` (export ripple
  if any), `v3/src/definition/admit.ts` (the A7 branch) +
  `admit.test.ts`, `v3/src/testkit/index.ts`,
  `v3/src/drift/unitMap.json` + `v3/src/drift/domainRegistry.ts`
  (the T2 flips).
- Entrypoints: `admitTemplate` (`v3/src/definition/admit.ts`) — the
  single admission authority; `createGateRegistry`
  (`v3/src/gates/registry.ts`) — the injected composition.
- Mutation boundary: the files below; extend-don't-fork. No
  `kernel/`, `store/`, `floor/`, or `cli/` file is in the boundary —
  Claim 2's machine face.

```json
{
  "mutation_boundary": {
    "files": [
      "v3/src/gates/process.ts",
      "v3/src/gates/process.test.ts",
      "v3/src/gates/registry.ts",
      "v3/src/gates/registry.test.ts",
      "v3/src/gates/index.ts",
      "v3/src/ports/gate.ts",
      "v3/src/ports/index.ts",
      "v3/src/domain/template.ts",
      "v3/src/domain/index.ts",
      "v3/src/definition/admit.ts",
      "v3/src/definition/admit.test.ts",
      "v3/src/testkit/scriptedProcessGateRunner.ts",
      "v3/src/testkit/scriptedProcessGateRunner.test.ts",
      "v3/src/testkit/index.ts",
      "v3/src/drift/unitMap.json",
      "v3/src/drift/domainRegistry.ts",
      "docs/v3/implementation/plan.md"
    ]
  }
}
```

(`plan.md` is the R-ALIGNED-UP carrier — the prepared §11 P3-split
alignment lands in the build commit, so the boundary lists it; the
P1/ch8-P2 precedent.)

## Row manifest (the D1 classification's machine face)

```json
{
  "packet_rows": {
    "rows": [
      { "id": "D1", "class": "anchored", "refs": ["contract:ch11-gate-format#C18"] },
      { "id": "V1", "class": "new-decision", "refs": [] },
      { "id": "V2", "class": "anchored", "refs": ["contract:ch11-gate-format#C21", "contract:ch11-gate-format#C13", "contract:ch11-gate-format#C14", "contract:ch11-gate-format#C15", "contract:ch11-gate-format#C16", "contract:ch11-gate-format#C17", "contract:ch11-gate-format#C5"] },
      { "id": "V3", "class": "derived", "refs": ["contract:ch11-gate-format#C12", "prose:v3/src/gates/threshold.ts"] },
      { "id": "V4", "class": "derived", "refs": ["prose:packet ch11-p2a", "contract:ch11-gate-format#C21"] },
      { "id": "V5", "class": "new-decision", "refs": [] },
      { "id": "V6", "class": "anchored", "refs": ["contract:ch11-gate-format#C20"] },
      { "id": "R1", "class": "anchored", "refs": ["prose:l2a-pseudocode/ProcessGateRunner", "contract:ch11-gate-format#C34", "contract:ch11-gate-format#C13"] },
      { "id": "R2", "class": "anchored", "refs": ["contract:ch11-gate-format#C34"] },
      { "id": "R3", "class": "anchored", "refs": ["contract:ch11-gate-format#C26"] },
      { "id": "G1", "class": "anchored", "refs": ["contract:ch11-gate-format#C8", "contract:ch11-gate-format#C9", "contract:ch11-gate-format#C29"] },
      { "id": "G2", "class": "anchored", "refs": ["prose:l2a-pseudocode/GateRegistration", "contract:ch11-gate-format#C9", "contract:ch11-gate-format#C19"] },
      { "id": "T1", "class": "anchored", "refs": ["contract:ch11-gate-format#C29", "contract:ch11-gate-format#C26", "contract:ch11-gate-format#C34"] },
      { "id": "T2", "class": "derived", "refs": ["prose:plan §11.2", "prose:v3/src/drift/unitMap.json"] }
    ]
  }
}
```

## Pre-approval flags

- **F1 — the JSON-mode authored `reason`: kernel-unread but
  WIRE-VISIBLE pass-through (V1's retention decision).** C13 lists
  `reason` as a legal optional key unscoped by mode, and C21's
  closed lane list hardens only `onExit` against gateDecisionJson
  mode — so an authored, grammar-valid `reason` in JSON mode ADMITS
  and rides the effective config verbatim-as-authored. What that
  MEANS, stated in full (the ratification covers THIS reading, not a
  weaker "inert" one): the kernel's own classification never reads
  it in that mode, BUT C23 ships the ENTIRE effective config on the
  process stdin, so the key is WIRE-VISIBLE — the external gate
  process can observe it and may condition its returned decision on
  it; it is authored pass-through data handed to the process (the
  `command` field's class), not dead bytes. This is the one point
  where the "unconsumed config = dead config" culture is not
  applied. What the draft's letter actually forecloses, stated
  precisely: REJECTING the key would add an admission lane C21's
  closed list omits, and a WIRE-time strip would fork C23's
  one-downstream-form rule (wire ≠ effective). An ADMISSION-TIME
  normalization drop would CONFORM — the dropped form would BE the
  effective config and the same bytes would ride the wire (wire ≡
  effective, both without the key) — so carry-verbatim is NOT the
  letter's only reading: the retention is a genuine selection among
  conforming alternatives, which is exactly why V1 is a new-decision
  row. If TRUE inertness is ever wanted, that is a later additive
  draft-level decision (an admission rejection lane, the
  admission-time drop, or a ratified wire exclusion; the examples
  are illustrative, the draft decides), named here so it stays
  visible. MANIFEST CLASS: V1 is a NEW-DECISION row — the
  cited C-rows (C13/C14/C16/C17/C23) CONSTRAIN the space but do not
  select among equally conforming alternatives (carry-verbatim vs an
  admission-time normalization drop); the retention choice is this
  packet's own. Decision provenance: accepted in the pre-reset
  ch11-P3a rounds (2026-07-16/17; the record packet @ commit
  ca4ea924) and carried by the recreation bootstrap note (the
  process log) so it is not re-litigated; tally 9/3/2, below the
  Case-B threshold; no authority/separation/availability-class
  semantics touched. `Route: approve-ratified` — this packet's
  human approve is the ratification act of the pass-through
  meaning.

- **F2 — the C19 finding granularity: template-grain, exactly one
  finding (V5's new-decision, ratifier-selected).** C19 states the
  cross-rule's outcome in the singular at the template grain; C21
  places its lane in the per-occurrence admission matrix — both a
  single template-level finding and one finding per offending
  binding conform to the ratified rows, so the choice is this
  packet's own. V5 selects the TEMPLATE-GRAIN form, the ratifier's
  selection at this packet's findings round (2026-07-17,
  superseding the panel-drafted per-binding form): if at least one
  `requiresRuntimeContext` gate is declared and
  `runtimeContext: required` is absent, EXACTLY ONE
  `runtime_context_required_for_process_gate` finding is issued for
  the template, at the top-level `runtimeContext` path. Rationale
  (the ratifier's): the author's fix is ONE top-level declaration —
  N offending gates are N causes of the same single template-level
  defect, not N defects; the finding points directly at the fix
  site; no N identical diagnostics for one missing key; the form
  stays stable as further process gates join the template. The
  message MAY name the triggering bindings (packet freedom — every
  triggering binding stays locatable). Decision provenance: the
  granularity question was minted at this packet's first panel
  round (the derived-row entailment attack, two independent lenses
  concurring); the ratifier resolved it template-grain at the
  findings round. Tally 9/3/2, below the Case-B threshold; no
  authority/separation/availability-class semantics touched.
  `Route: approve-ratified` — this packet's human approve is the
  ratification act of the template-grain form.

## Acceptance

Test obligations are stated as DISCIPLINE + FAMILY INVENTORY (the
spec-vs-build altitude line, README §5.5): the discipline names the
rule, the inventory declares the membership with its owner;
fixture-level enumeration is BUILD work, verified member-by-member by
the build-close arm gate's mandatory sensitivity pass against the
BUILT test bodies (R-LANE-SENSITIVITY binds twice).

- **Lane coverage:** every member of the V2 inventory (owner: V2) is
  driven by a named test and ABLE TO FAIL on its row's meaning.
- **Iff symmetry:** every declared presence-iff is driven in BOTH
  directions — the presence direction and the absence/illegality
  direction each have a member. Inventory (owners named): V1's
  mode-conditional presences (`onExit`, exitCode-mode `reason`
  completeness, JSON-mode `reason` verbatim carry); R2/R3's
  kind-conditional fields (`exitCode`, `stdout`); V5's cross-rule
  (both negative directions included).
- **Defaults, both directions:** each V1 default (owner: V1 —
  `output.mode`, `onRunnerError`, `onTimeout`, the exitCode-mode
  `reason` buckets) driven absent → materialized AND authored →
  carried.
- **Numeric ladder:** dimension 4's members (owner: dimension 4)
  each drive `timeoutMs`; the `-0` member asserts with
  `Object.is`-grade distinction where equality could mask it.
- **Compile probes:** every type-level foreclosure (owner: dimension
  13 — the process arm's missing `evaluate`, the `"inline"`
  singleton, the `"required"` literal) carries a compile-negative
  probe (the `registry.test.ts` probe idiom).
- **Accumulation + suppression:** dimension 9 driven — one
  multi-fault template reports its full lane set; one broken
  container suppresses exactly its own dependents.
- **Own-property hostility:** dimension 2's G8 member driven — a
  hostile inherited/`__proto__` fixture against the process-config
  reads (the `threshold.ts` `ownGet` pattern is the built
  precedent).
- **Count claims driven at their distinguishing arity:** the C19
  collapse — a template with N ≥ 2 offending process gates yields
  EXACTLY ONE finding at the top-level `runtimeContext` path
  (owner: V5; dimension 7's count member — a single-gate fixture
  cannot falsify the collapse); and the disposition no-double rule —
  an authored `failInstance` yields exactly ONE finding carrying
  `gate_config_not_supported` (lane o), never the o+p double
  (owner: V2 lanes o/p with the operative authority note).
- **Kit contract:** T1's guarantees driven by kit self-tests —
  persist-before-return (observable ordering), a record for every
  scripted kind, deterministic workspace facts, explicit script
  exhaustion, and FAITHFUL PLAYBACK across the six-outcome mapping:
  every member of T1's parameterized mapping (owner: T1) scriptable
  and returned exactly as scripted — a playback test able to fail on
  any altered field.
- **Port value contracts:** R2/R3's scalar refinements and value
  preservation driven as a parameterized family (owners: R2/R3) —
  `exitCode` an integer, `logRef` a nonempty string, `durationMs` a
  non-negative integer, the evidence record's EXACT field set, and
  the `log`/workspace-fact values retained as scripted/declared
  (able to fail on a dropped, renamed, defaulted, or mutated
  field).
- **Registry exact-set:** G1 measured two-way, with the close-time
  untruncated sweep receipt.
- **Behavior-change honesty (SCOPED):** the claimed deltas are
  exactly — the admission of process-gate-bearing templates (the new
  lanes + effective configs), the registry membership, the new
  port/testkit surfaces, and the optional domain field; everything
  else is proven unchanged by the FULL existing suite green with
  zero golden-expectation edits (the l1/l2 trace tables and P2b's
  `gate_execution_not_supported` lane byte-identical).
- Coverage validation green at close: units 21/159 (+4), invariants
  20/116 (+4), traces 4/20 (unchanged).
- Drift tests green (standing, unconditional — PI-3): the rejection
  registry untouched (54); the T2 flips with witnesses.
- Bridges green at close: `v3:typecheck`, `v3:lint`, `v3:test`,
  `v3:coverage`, `v3:packet-lint` (`--forbid-reopened`: 0 reopened),
  `v3:adr-check` (no new ADR — ADR-013 is `accepted`; no trigger
  fires).
- Standing review rules in force: **REV-E-NO-ADAPTER-BRANCH** (the
  catalog is injected; kernel/definition code never branches on a
  concrete registration type beyond the contract's own
  discriminant); **REV-B-LOCAL-NOT-AUTHORITY** (the kit runner's
  record store is testkit surface, never authority — the store-side
  evidence authority is P3b's storeChecker).

## Build record

Approved 2026-07-17 at STOP `4:flagged-approve` — the ratifier's act
ratified F1 (JSON-mode `reason` verbatim carry), F2 (the C19
template-grain single finding, the ratifier's re-decision over the
panel-drafted per-binding form), and the 48 KB size-advisory
accept-with-note. The hash chronicle (the first packet authored
UNDER the 2026-07-17 process revision — recreation from ratified
sources, the pre-reset record @ ca4ea924 consulted as quarry only):
R1 FULL bound `eebd6a1f…` (nine findings folded — V5 minted
new-decision/F2, the operative authority note, lane-q container
symmetry, the G8 member, mirror/bookkeeping) → R2 FULL (mandatory
escalation, manifest-class change) bound `0d6ccca3…` (one content
finding: the plan Mode-cell clarification; bookkeeping batch) →
reconciled `f3bf0d35…`, close CLEAN → the ratifier's findings round
(the F1 foreclosure precision — the admission-time drop CONFORMS;
F2 re-decided TEMPLATE-GRAIN) → R3 FULL (STOP-resolution
escalation) bound `8fb543d1…` (the lens-3 P1 count-falsifiability
catch + the V4 addressing P2 folded: the N≥2 count member, the
count-claims acceptance bullet, the addressing exception, the A7
grain note) → R3b targeted recheck PASS + reconciliation CLEAN,
close CLEAN @ `6cd27852…` → the APPROVE → the flagged-path
agent-invoked arm on the approved bytes (pin-conform
gpt-5.6-sol/high/never, byte guards clean before+after): REFINE,
five findings folded (hard-stop-2 letter-trip + the shared-contract
annex; the V4 mirror precision; T1's six-outcome mapping + faithful
playback; the R2/R3 value-contract family; V5 present-tense) → arm
RE-CHECK CLEAN citing `f0d9cae0…` — the build basis. 4 counted
panel rounds of the 8-round watchdog; reconciliations, closes, arm
passes, and both fresh-implementer runs (zero divergences each)
uncounted; every internal pass Opus-class. Yield curve 9 → 1 → 2 →
0; the process-effectiveness comparison against the pre-reset
record lives in the process log (2026-07-17).

Built the same day (delegated build round, the packet as the
binding contract @ `f0d9cae0…`). **727 → 796 tests** (+69; zero
golden-expectation edits — the l1/l2 trace tables and the kernel
`gate_execution_not_supported` lane byte-identical; the ONE
declared flip: `registry.test.ts`'s `external.process` null-probe).
Bridges at close (orchestrator-rerun, not builder-claimed):
`v3:typecheck` clean · `v3:lint` clean · the v3 suite 796/796 · the
root suite 3856/3856 · `v3:coverage` OK (21/159 · 20/116 · 4/20) ·
`v3:packet-lint --forbid-reopened` 0 reopened / 0 errors ·
`v3:adr-check` 14 consistent. Builder-run mutation probes at build:
the C19 collapse broken to per-binding turned the count member red;
the `failInstance` fall-through turned the no-double member red —
both restored green (the write-time sensitivity half; arm gate 2
owns the built-body pass). In-packet-freedom choices recorded: the
C19 message names every triggering binding's C7 address inside the
ONE template-grain finding; the kit's deterministic workspace fakes
are exported, visibly non-authoritative constants; the cross-rule
operand is recorded at registration RESOLUTION (before config
validation — an invalid-config process gate still triggers the
cross-rule, clean accumulation); the A9 code carrier realized by an
optional `code` on `GateConfigFinding` propagated verbatim into
`ValidationFinding` (uncoded lanes stay code-free); the kit
runner's `run()` is implemented parameterless (queued playback —
structurally assignable to the port). No deviations from the
packet.

Aftermath: the post-build audit's FIRST run was RED — the declared
boundary omitted `docs/v3/implementation/plan.md`, the R-ALIGNED-UP
alignment carrier riding the same commit (the P1/ch8-P2 boundary
precedent; three panel rounds and the pre-build arm had cleared the
boundary "complete and minimal" — the machine audit caught it on
first contact, the tier-0-scoping principle working as designed).
Fixed by the boundary addition above; the build commit amended; the
audit green at the amended sha. Process-log carries the friction
line and the candidate lens-5 sharpening.

Arm gate 2 (the build-close implementation review, pin-conform
gpt-5.6-sol/high/never, byte guards clean): REFINE citing
`3dd3343b` with SEVEN P2 findings — the mandatory sensitivity pass
earning its promotion exactly as the ch11-P2b/P2c second occurrence
predicted (green-but-blind lanes in the BUILT bodies under correct
packet lane texts): two product gaps (a returned `logRef` had no
lookup back to its record; the R2 scalar refinements were
documentary — the kit now validates scripted results at play,
throwing loudly per the kit culture) and five test-evidence gaps
(JSON-mode full-row equality; the V2 grouped lanes' missing halves
k/l/o/p/q + `warn` acceptance + lane-j LOCAL suppression + extended
`__proto__` hostility + the V3 accessor rung; the R2/R3 union
compile probes + exact whole-record asserts; the T1 six-outcome
JSON warn/block members + runner_error log content; the G1
exact-set made enumeration-sensitive — `REGISTRY_IDS` exported as
the single source the Map is built from, so an undeclared fourth
registration turns the test red). All seven folded in one aftermath
round: **796 → 831 tests** (+35; the aftermath commit carries
packet + code + tests per the §4 choreography; boundary unchanged —
every touched file already declared). Bridges re-verified green
(orchestrator-rerun): typecheck 0 · lint 0 · v3 suite 831/831 ·
packet-lint 0/0.

```json
{
  "packet_metrics": {
    "class": "kernel-semantic",
    "prediction": { "predicted": "projection", "reasoning": "inherited from the P3 row through the ratified findings-round split; the draft (ratified 2026-07-12) decided every open point of the process-admission contract — the packet projects C5–C21/C26/C29/C34's admission-side shares plus the four foundation units", "discovered": "projection" },
    "provenance": { "anchored": 9, "derived": 3, "new_decision": 2 },
    "rounds": { "review": 4, "doc_refinement": 0, "implementation": 2 },
    "stops": [
      { "type": "4:flagged-approve", "what": "two new-decision rows rode as flags — V1 (the JSON-mode authored-reason retention, F1) and V5 (the C19 finding granularity, F2)", "resolution": "the ratifier approved 2026-07-17: F1 ratified with its foreclosure reasoning precised (the admission-time drop conforms — carry is a genuine selection), F2 re-decided to the TEMPLATE-GRAIN single finding (superseding the panel-drafted per-binding form), and the 48 KB size advisory accept-with-note ratified in the same act" }
    ],
    "detector_misses": [],
    "learned": "first packet under the 2026-07-17 revision: altitude line + claim grammar held (yield 9-1-2-0, -34% vs the pre-reset record; the old family-symmetry class recurred ONCE and closed in one fold) — while the external arm still earned its keep with five folds on close-clean bytes, three of them altitude-calibration items"
  }
}
```
