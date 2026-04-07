# v1.1 Architecture Decision Log

This log captures architectural decisions made during the v1.1 boundary simplification design phase. Each entry records the decision, the reasoning, alternatives considered, and references to affected documents.

---

## ADR-001: Dual-Gate State Write Model

**Date:** 2026-03-18
**Status:** accepted
**Scope:** Mutation fitness (check #2) and Transition fitness (check #3)
**Context thread:** Codex session `019cebfb-0fd1-7103-b2ff-c4358906d3bc` (2026-03-14, main v1.1 discovery session)

### Context

Two fitness checks were originally defined with single-path rules:
- Mutation fitness: *"state-changing pathok csak kozos mutation pipeline-on (`BubbleMutationRunner`) futhatnak."*
- Transition fitness: *"normal flow-ban kotelezo `applyStateTransition()` hasznalat."*

During design review, we identified that the `TranscriptStateReconciler` (m0-05) bypasses both `BubbleMutationRunner` and `StateTransitionService`. The question was whether this is a fitness violation or an intentional architectural feature.

### Analysis

Investigation of both the v1.1 design documents and the current codebase (15 `writeStateSnapshot` call sites across 9 files) revealed that there are two fundamentally different state write operations:

| Aspect | Forward Mutation | Backward Reconstruction |
|--------|-----------------|------------------------|
| **What** | Apply new domain event | Restore state from existing transcript |
| **Who** | BubbleMutationRunner | TranscriptStateReconciler |
| **Input** | `domain_mutation_plan` + `validated_next_state` (from STS) | Transcript tail + current state drift detection |
| **Transcript** | Writes new envelope, then persists state | Reads existing envelopes, writes audit event |
| **When** | Normal command flow (pass, approval, reply, kickoff, etc.) | Operator recovery flow |
| **Guardrails** | STS validation, transcript-first ordering, fingerprint guard | `reason` + `operation_id` + audit event |

These are not the same operation with different callers — they have different semantics, different inputs, different guardrails, and different invariants.

### Decision

State writes are allowed through exactly **two gates** (dual-gate model):

1. **Forward gate (BubbleMutationRunner)** — For normal command flows. State is computed by `StateTransitionService`, validated, and persisted after transcript append. This is the only path for creating new domain events.

2. **Reconstruction gate (TranscriptStateReconciler)** — For operator recovery flows. State is derived from the canonical transcript (source of truth) and corrected when drift is detected. This path does not create new domain events; it corrects state to match existing ones.

**No third gate may exist.** Any `StateRepository.write` call outside these two components is a fitness violation.

This decision covers both mutation and transition fitness, because the two are structurally linked in the forward gate: the forward path requires STS validation as a precondition for BMR persistence. In other words, on the forward path you cannot have mutation without transition validation — they are a single chain (`STS → BMR`). On the reconstruction path, neither applies — state is derived from transcript, not computed via transition or mutation.

### Fitness Check Implementation

```
CI CHECK (mutation fitness):
  For each StateRepository.write / writeStateSnapshot call site:
    ├── In BubbleMutationRunner? → PASS (forward mutation)
    ├── In TranscriptStateReconciler? → PASS (backward reconstruction)
    └── Elsewhere? → FAIL

CI CHECK (transition fitness):
  For each state-changing command path:
    ├── Forward path? → PASS only if STS.applyStateTransition() called before BMR
    ├── Reconstruction path (reconciler)? → PASS (STS not applicable)
    └── No STS call on forward path? → FAIL
```

Rollout note:
- Ezek target-architektura definiciok.
- Bevezetes: report-only indul, majd checkenkenti hard-fail aktivalas a megfelelo migration milestone utan.

### Alternatives Considered

1. **Single-gate (BMR only):** Force the reconciler to go through BMR. Rejected because reconstruction is not a domain mutation — it does not have a `domain_mutation_plan` or a `validated_next_state` from STS. Forcing it through BMR would either require a fake mutation plan or a bypass flag, both of which would weaken the BMR contract.

2. **Exception-based (BMR + exception list):** Keep the single-gate rule but add reconciler as an exception. Rejected because exceptions invite more exceptions over time and make the fitness check harder to reason about. The dual-gate model is more precise and stable.

3. **Unrestricted operator writes:** Allow any operator command to write state directly. Rejected because this would create an open-ended set of state write paths, defeating the purpose of the fitness check.

### Consequences

- The mutation fitness check definition in section 16.2 is updated to reflect the dual-gate model.
- The transition fitness check definition in section 16.2 is updated to reference the same dual-gate model.
- The forbidden rules in section 4.0 (rule 5) are updated with the dual-gate specification.
- Both gates have explicit, non-overlapping guardrail requirements.
- The `TranscriptStateReconciler` component one-pager (m0-05) is consistent with this decision as-is.

### Open Question (deferred)

The current `metaReviewGate.ts:persistHumanGateRoute` uses state-first ordering (state write before transcript append, with rollback on append failure). This is the reverse of the transcript-first invariant. When this path migrates to BMR in v1.1, the transcript-first ordering will apply automatically. However, the gate has a transactional requirement (state must reflect the gate decision before the approval request is appended) that may need special handling within BMR. This is deferred to the Phase C (meta-review gate decomposition) design work.

### Affected Documents

- `v1.1 architecture context.md` — Section 4.0 (rule 5), section 16.2 (fitness checks 2 and 3)
- `component-one-pagers/m0-01-bubble-mutation-runner.md` — No change needed (BMR spec already excludes reconstruction)
- `component-one-pagers/m0-02-state-transition-service.md` — No change needed (STS spec already scopes to forward transitions only)
- `component-one-pagers/m0-05-transcript-state-reconciler.md` — No change needed (reconciler spec already describes its own write path)

---

## ADR-002: Mandatory Error Context Fields Per Component

**Date:** 2026-03-18
**Status:** accepted
**Scope:** Error fitness (check #4)

### Context

The error fitness check requires: *"message-only wrap tiltott, code + context megtartas kotelezo."*

The `PairflowError` base contract (section 4.0) defines minimum context fields for state/transcript mutation errors (`bubble_id`, `state`, `expected_fingerprint`, `actual_fingerprint`, `operation_id`). The component one-pager template (section 8) instructs authors to specify mandatory context fields.

During design review, we found that only 4 of 10 component one-pagers actually defined their mandatory context fields (BMR, STS, CPE, GatePipelineEngine). The remaining 5 listed error codes but no context specification. This means implementations could produce structurally valid `PairflowError` objects with empty context, making debugging and retry decisions unreliable.

### Decision

Every component one-pager must define mandatory context fields for its error codes. The context fields should be the minimum set required to diagnose the error without access to the full runtime state.

### Changes Applied

| Component | Error Codes | Context Fields Added |
|-----------|-------------|---------------------|
| m0-05 TranscriptStateReconciler | `RECONCILE_INPUT_INVALID`, `RECONCILE_STATE_WRITE_FAILED`, `RECONCILE_REJECTED` | `bubble_id`, `operation_id`, `reason`, `before_state_hash`, `reconciled_state_hash`, `state_diff_summary` (+ optional `*_state_ref`) |
| m0-07 MetricsDispatcher | `METRICS_DISPATCH_FAILED`, `METRICS_EVENT_INVALID` | `bubble_id`, `event_type`, `dispatch_attempt` |
| m0-08 ConfigLoader | `CONFIG_PARSE_FAILED`, `CONFIG_PRECEDENCE_INVALID`, `CONFIG_UNSAFE_MUTATION_REQUIRES_RESTART` | `config_source_path`, `field_name`, `precedence_level` |
| m0-09 AgentAdapter | `AGENT_SESSION_START_FAILED`, `AGENT_DELIVERY_FAILED`, `AGENT_RESTART_FAILED`, `AGENT_HEALTH_CHECK_FAILED` | `bubble_id`, `role`, `agent_name`, `session_id` |
| m0-10 LegacyCompatAdapter | `LEGACY_NORMALIZATION_FAILED`, `LEGACY_INPUT_UNSUPPORTED`, `LEGACY_ACTIVATION_MARKER_INCONSISTENT` | `bubble_id`, `input_format_version`, `normalization_step` |

Already complete (no change needed):

| Component | Context Fields |
|-----------|---------------|
| m0-01 BubbleMutationRunner | `bubble_id`, `operation_id`, `expected_fingerprint`, `actual_fingerprint`, `state` |
| m0-02 StateTransitionService | `bubble_id`, `from_state`, `to_state`, `operation_id` |
| m0-03 ConvergencePolicyEngine | `bubble_id`, `round`, `policy_profile`, `task_activation_state` |
| m0-04 GatePipelineEngine | `bubble_id`, `gate_id`, `round` |
| m0-06 PairflowError | Base contract (category prefixes, not component-specific context) |

### Consequences

- All 10 component one-pagers now define mandatory error context fields.
- The component one-pager template already requires this (section 8) — no template change needed.
- Error fitness check is now GREEN a target architecture design szinten: minden error code-hoz van minimum context contract. Runtime enforcement ettol fuggetlenul fazisosan kapcsolhato hard-fail modba.

### Affected Documents

- `component-one-pagers/m0-05-transcript-state-reconciler.md` — Context fields added
- `component-one-pagers/m0-07-metrics-dispatcher.md` — Context fields added
- `component-one-pagers/m0-08-config-loader-and-toml-normalizer.md` — Context fields added
- `component-one-pagers/m0-09-agent-adapter.md` — Context fields added
- `component-one-pagers/m0-10-legacy-compat-adapter.md` — Context fields added

---

## ADR-003: Parity + Semantic Side-Effect Shield

**Date:** 2026-03-20
**Status:** accepted
**Scope:** Contract parity exit quality gate (especially kickoff/handoff commands)

### Context

Migration policy eddig eros parity-fokuszra epult (`legacy <-> v11` ekvivalencia contract/replay alapon).
Egy kickoff jellegu hibaosztalynal ez onmagaban nem volt eleg:

- control-plane allapot valtozott (`RUNNING`, round update),
- transcript `TASK` append megtortent,
- de runtime implementer delivery nem tortent meg,
- es ez nem jelent meg explicit failure statusban sem.

Igy parity sikeres maradhatott ugy, hogy a felhasznaloi elvart viselkedes serult.

### Decision

`parity -> v11` gatehez kotelezoen bevezetunk command-level semantic side-effect invariantokat.

Minimum szabaly:

1. Kritikus side-effectet vegzo command success pathjan kotelezo ellenorizni:
   - az elvart adapter hivas tenylegesen megtortenik, vagy
   - explicit delivery-failure status visszater (nincs csendes kieses).
2. Az invariant deterministic contract/integration tesztben legyen verifikalva.
3. A rollout lepcsozetes:
   - M0-M1: report-only,
   - M2+: soft-fail,
   - M3+: hard-fail a `v11` allapotu commandokra.

### Consequences

- A migration gate erosebb lesz: parity ekvivalencia + semantic side-effect coverage egyutt kotelezo.
- Kickoff jellegu regressziok korabban (teszt/CI szinten) eszlelhetok.
- A command matrixben explicit review-bizonyitek kell a kritikus side-effect invariantokra.

### Affected Documents

- `v1.1-implementation-roadmap.md` — 4.2.3 policy + M2 shield hardening gate.
- `docs/architecture/architecture-fitness-checks.md` — cross-cutting critical side-effect invariant overlay.
- `orchestration-matrix-annex.md` — review evidence kovetelmeny kiegeszitese side-effect invarianttal.

---

## ADR-004: Fitness Rollout Method and Triage Governance

**Date:** 2026-03-20  
**Status:** accepted  
**Scope:** Fitness infrastructure lifecycle (W2), CI enforcement strategy, finding triage

### Context

A fitness infrastructure nem "kesz szabalykonyvkent" szuletett, hanem migration kozbeni tanulasi ciklusban:

1. M0 indulaskor gyors, egyszeru checker-ek (foleg regex/line-window jellegu logika) keszultek, hogy azonnal legyen merheto signal.
2. Report-only modban elkezdtuk gyujteni a valos zaj/problema mintakat.
3. A strangler refaktor soran kiderult, hogy:
   - vannak valos architekturalis serulesek,
   - es vannak checker precision problemak (false positive / loophole).
4. Bevezettuk a lepcsozetes enforcementet (`report-only` -> `soft-fail` -> `hard-fail`), hogy ne zajra blokkoljon a CI.
5. Hardening soran egyes checkek AST-segitett analizis fele mozdultak (kulonosen transition/mutation), es kulon kezeltuk a metadata-only persist vs lifecycle transition eseteket.
6. Egy kickoff regresszio osztaly megmutatta, hogy parity onmagaban nem eleg: kritikus side-effect (delivery) kieshet ugy, hogy allapot/tranzakcio "zoldnek" tunik. Emiatt kulon cross-cutting `critical_side_effect` overlay check szuletett.

### Decision

A fitness findingok kezelesere kotelezo triage sorrend:

1. **Refactor first** (alapertelmezett), ha a finding valos runtime/architecture kockazatot jelez.
2. **Policy/checker refinement**, ha igazolt, reprodukalhato false positive mintat latunk.
3. **Temporary exception**, ha az elozo ketto idoben vagy kockazatban nem vallalhato az adott milestone-ban.

Kotelezo guardrailok:

1. Nincs csendes downgrade `fail` -> `warn` indoklas es teszt nelkul.
2. Nincs hatarozatlan ideju exception; `owner + reason + expires_milestone` kotelezo.
3. Minden checker-semantika valtozasnal audit nyom kell:
   - commit,
   - checker/test artifact,
   - rovid decision-log hivatkozas.

### Consequences

1. A W2 munka formalisan ket agra bomlik:
   - detection quality hardening (precision/noise),
   - enforcement maturity hardening (mode promotion).
2. A CI zaj csokkentese explicit cel lesz hard-fail promocio elott.
3. Uj check csak akkor kerul be, ha van reprodukalhato kockazati osztaly es determinisztikus detektalasi strategia.

### Affected Documents

- `docs/architecture/architecture-fitness-checks.md` — evolution history + triage matrix + operational workflow
- `docs/v1.1-boundary-simplification/v1.1-implementation-roadmap.md` — W2 hardening/triage workflow

---

## ADR-005: Contract Case Baseline "Good Enough" Stop Gate

**Date:** 2026-03-20  
**Status:** accepted  
**Scope:** Command-level contract case expansion policy and migration-stop criteria

### Context

A contract case hardening munka gyorsan tud "vegtelen checklist"-be csuszni:

1. Ha tul keves a case, gyenge marad a regresszio vedelmi alap.
2. Ha tul sok, a csapat a variansok finomitasaval tolti az idot, es lassul a migration.

Szukseg volt egy explicit stop-szabalyra, ami egyszerre vedi a minoseget es a tempot.

### Decision

Bevezetunk egy formalis `good enough` baseline gate-et a contract case-ekre:

1. Minden kritikus commandra minimum:
   - 1 happy-path triad (`legacy` + `v11` + `parity`),
   - legalabb 2 magas erteku guard/error triad,
   - legalabb 1 invariant triad (kritikus side-effect / cleanup / mutation-no-op).
2. Risk-tier coverage cel:
   - `P0` kockazatok: 100% ismert osztaly lefedes,
   - `P1` kockazatok: >=80% ismert osztaly lefedes,
   - `P2` variansok: nem release-gate kotelezoek.
3. Baseline utan uj case csak admission szabaly szerint:
   - uj reason code, vagy
   - uj kockazati osztaly, vagy
   - valos regresszio/incident reprodukcio.

Ha egyik admission feltetel sem teljesul, az uj case backlog varians, nem migration-blocker.

### Consequences

1. A case-epitesnek van formalis "elég" allapota.
2. A migration nem all be vegtelen varians-gyartasba.
3. A baseline utan a bovitest incident-driven modra valtjuk.

### Affected Documents

- `docs/architecture/architecture-fitness-checks.md` — Contract Case "Good Enough" Baseline + Case Admission Policy
- `docs/v1.1-boundary-simplification/v1.1-implementation-roadmap.md` — Rules section updated with mandatory good-enough stop-gate reference
