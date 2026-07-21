# Pairflow v3 Gate / Policy Configuration Design Synthesis

Date: 2026-06-16
Status: captured synthesis — substantially absorbed into
[`../../model/core-model-future-topic.md`](../../model/core-model-future-topic.md)
"L2 / L2a" (#2 authoring-profile compilation, #3 v1-as-packaged-profile, #8 typed route
reasons, #9 typed transform outputs) and the realized L2/L2a/L2b sections of
`core-model.html`; retained as the fuller provenance record behind those items.
(Status line added 2026-07-06.)

## Purpose

This note captures the design synthesis from a ten-agent exploration of how Pairflow v3
should configure the full v1 gate / policy setup across:

- L2: inline gate / policy enforcement,
- L2a: external or process gate execution,
- L2b: actor-facing policy / gate communication.

The goal is not to finalize the HTML core model. The goal is to preserve the strongest
configuration design direction before the next L2/L2a/L2b specification pass.

## Executive Summary

The best direction is not a pure DSL, and not a single opaque `pairflow.*` black-box
policy. The strongest design is a two-surface model:

1. **Authoring config**: domain-close, compact, v1-compatible policy profile.
2. **Normalized runtime config**: strict, typed, explicit `GatePipeline` derived from
   that authoring config.

This balances readability, v1 coverage, auditability, and extensibility:

- workflow authors mostly configure domain parameters and rare overrides;
- Pairflow ships packaged `pairflow.*` gates for opinionated v1 behavior;
- simple rules use a small declarative primitive set;
- repo-specific or custom checks use a structured process-gate interface;
- actor-facing guidance is generated from the same gate declarations that enforce the
  rules.

Canonical design sentence:

```text
Project/workflow authors configure domain-level policy profiles and rare gate overrides.
Pairflow normalizes that into a strict typed GatePipeline. The pipeline enforces in L2,
runs process gates in L2a, and contributes actor-facing context in L2b.
```

## What The Exploration Converged On

### 1. Packaged v1 Policy Is The Migration Backbone

The v1 workflow should become a packaged workflow / policy profile, for example:

```yaml
workflow:
  uses: pairflow.v1.review_loop@1
```

That package owns the default template, steps, roles, gate pipelines, actor-facing
context contributions, and typed config schema. Most projects should not re-author the
v1 gate system. They should configure parameters such as:

- `severity_gate_round`,
- `reviewer_blocking_min_severity`,
- `meta_review_auto_rework_min_severity`,
- `meta_review_consecutive_clean_runs_required`,
- command sets,
- evidence trust policy,
- human gate / sticky gate behavior.

This is better than a pure DSL for v1 compatibility because many v1 gates carry domain
history: findings parity, docs-only evidence relaxation, clean-run streaks, command
authority, sticky human gates, and summary/evidence consistency.

### 2. A Small Declarative Layer Still Matters

Packaged gates should not force every simple threshold into a custom TypeScript policy.
A small declarative primitive set is useful:

```text
threshold(path, op, value)
exists(path | query)
no_open_items(collection, predicate)
previous_event(query, require)
severity(collection/item, threshold, qualifier_rules)
all([...])
any([...])
not(...)
when(condition, gate)
```

Paths must be allowlisted projection paths, not raw state paths. Examples:

- `round`,
- `current_step`,
- `event_type`,
- `findings.open`,
- `evidence.validation.status`,
- `history.previous_events`,
- `meta_review.recommendation`,
- `budget.remaining`.

The declarative layer should stay intentionally small. It is for simple predicates, not
for rebuilding Pairflow's entire review semantics as a hidden programming language.

### 3. Process Gates Are The Extension Seam

Dynamic TypeScript module loading should not be part of the MVP. The better extension
model is a strict process interface:

```text
GateInvocation -> GateDecision
```

Process gates may be:

- **inline**: git-hook-style, short, bounded timeout, runs before commit;
- **deferred**: long-running or evidence-heavy, enters `WAITING(gate_pending)`, resumes
  through a `GATE_RESULT` kernel event.

This covers:

- v1 command validation gates,
- validation-required on PASS,
- meta-review approve validation,
- accuracy-critical command checks,
- repo-specific custom checks,
- future external verification systems.

The process must not receive a raw transcript dump. It receives a small authority packet,
a `projection_ref`, and a typed config. SDKs can make querying convenient, but the kernel
contract stays language-neutral.

### 4. L2b Must Be Derived From Gates, Not Duplicated Prompt Text

Every gate declaration should be sufficient to produce two views:

```ts
interface GateEvaluator {
  implementation: "declarative" | "packaged" | "process";
  execution: "inline" | "deferred";

  evaluate(config, gateProjection): GateDecision;
  describeForActor(config, actorProjection): GateContextContribution;
}
```

`evaluate` is the enforcement path. `describeForActor` is the L2b communication path.

This is important because v1-like drift returns if the system has separate sources of
truth for:

- enforcement,
- reviewer prompt guidance,
- command instructions,
- docs-only guidance,
- meta-review/human routing copy.

L2b is not a security boundary. If an actor ignores the guidance, L2/L2a still enforces.
But if a gate can block an emit, the actor should be able to see that rule before it emits.

### 5. Strict Typed Normalization Is The Runtime Boundary

The authoring config should not be handed directly to evaluators. The path should be:

```text
unknown YAML/TOML
  -> strict schema validation
  -> normalized EffectiveGatePolicyConfig
  -> typed GatePipeline
  -> typed evaluator input
  -> typed GateDecision
  -> allowed projection fields only
```

Recommended validation posture:

- unknown top-level keys: reject;
- unknown family/gate keys inside selected scopes: reject;
- process gate output schema mismatch: infrastructure failure, not domain allow;
- projection fields are allowlisted per gate family;
- disabled behavior is explicit (`enabled: false`), not inferred from missing blocks;
- normalized config contains no raw unknown data.

The typed/strict model is better as the normalized/effective form than as the primary
hand-authored syntax.

## Recommended Authoring Shape

The hand-authored project/workflow-facing shape should stay domain-close:

```yaml
workflow:
  uses: pairflow.v1.review_loop@1

policy:
  profile: pairflow.v1.strict_code_review
  params:
    severity_gate_round: 2
    reviewer_blocking_min_severity: P3
    meta_review_auto_rework_min_severity: P2
    meta_review_consecutive_clean_runs_required: 2
    human_approval_required: true
    sticky_human_gate: true

artifact_scope:
  type: code
  accuracy_critical: false

validation:
  commands:
    typecheck: "pnpm typecheck"
    lint: "pnpm lint"
    test: "pnpm test"
  sets:
    pass_required: [typecheck, lint, test]
    approve_required: [typecheck, lint, test]

evidence:
  trusted_ref_prefixes: [".pairflow/evidence/"]
  summary_only_claims: untrusted
  docs_only:
    runtime_checks_required: false
    runtime_success_claims_require_trusted_evidence: true

overrides:
  gates:
    review.CONVERGED.min_round:
      with:
        value: 3

    implement.PASS.validation_required:
      with:
        timeout_seconds: 900
```

This surface is readable because it describes project intent:

- which packaged workflow is used,
- which policy profile is active,
- which thresholds differ,
- which validation commands exist,
- what evidence policy applies,
- which gate-level overrides are intentional.

## Recommended Normalized Runtime Shape

Pairflow should compile the authoring config into an explicit gate pipeline:

```yaml
gate_pipeline:
  review.CONVERGED:
    - id: min_round
      uses: declarative.threshold
      implementation: declarative
      execution: inline
      config:
        path: round
        op: ">="
        value: 3
        reason_code: round_below_min

    - id: convergence_policy
      uses: pairflow.convergence_policy
      implementation: packaged
      execution: inline
      config:
        require_previous_reviewer_verdict: true
        require_round_alternation: true
        reject_open_human_questions: true
        reviewer_blocking_min_severity: P3

  review.PASS:
    - id: reviewer_pass_policy
      uses: pairflow.reviewer_pass_policy
      implementation: packaged
      execution: inline
      config:
        require_explicit_findings_or_no_findings: true
        reject_summary_findings_contradiction: true
        reject_clean_pass_post_gate: true

  implement.PASS:
    - id: validation_required
      uses: external.process
      implementation: process
      execution: inline
      config:
        command_set: pass_required
        success_exit_codes: [0]
        evidence_required: true
        timeout_seconds: 900
```

This effective form is the right place for:

- exact ordering,
- first-block-wins behavior,
- evaluator identity,
- implementation/execution mode,
- strict typed config,
- status/debug export,
- audit/provenance.

It is not the best primary hand-authored config because it is too noisy and too easy to
misorder.

## L2 / L2a / L2b Scope

### L2

L2 owns inline gate enforcement:

- `GateBinding`,
- `GatePipeline`,
- inline `declarative.*` gates,
- inline packaged `pairflow.*` gates,
- `GateDecision allow | block`,
- canonical `instance.round`,
- `gate_projection`,
- no commit / no round burn on block.

L2 does not execute process gates and does not perform human lifecycle transitions.

### L2a

L2a owns process gate execution:

- `ProcessGateEvaluator`,
- `GateInvocation`,
- `GateRun`,
- `ProjectionRef`,
- `EvidenceRef`,
- `GateResult`,
- inline process gates with timeout,
- deferred process gates with `WAITING(gate_pending)` and `GATE_RESULT`,
- infrastructure failure normalization.

Important distinction:

```text
GateDecision.block
  The gate ran successfully and blocked for domain/policy reasons.

GateDecision.inconclusive
  The gate ran successfully but could not decide; policy maps this to block or human.

GateExecutionFailure
  Process failed, timed out, emitted invalid JSON, or failed artifact/evidence protocol.
```

### L2b

L2b owns actor-facing policy context:

- applicable gate summaries for actor-reachable emits,
- blocked-now / conditional / requires-external-gate affordances,
- required payload shape,
- required evidence shape,
- command gate preview,
- severity threshold explanation,
- human/meta-review route explanation.

L2b must derive from the gate declarations and current projection. It must not become a
second source of truth.

## V1 Gate / Policy Family Mapping

| v1 family | v3 representation |
|---|---|
| early convergence / round gate | `declarative.threshold` + `pairflow.convergence_policy` |
| previous reviewer verdict / alternation | `pairflow.convergence_policy` or `pairflow.previous_reviewer_verdict` |
| reviewer PASS policy | `pairflow.reviewer_pass_policy` |
| structured findings claim/parity | packaged findings policy + findings vocabulary |
| P0/P1/P2/P3 severity thresholding | packaged severity policy plus simple threshold params |
| command validation gates | `external.process` in L2a |
| pass validation evidence | L2a `GateRun` + `EvidenceRef` manifest |
| docs-only runtime relaxation | packaged evidence trust policy |
| summary/evidence consistency | packaged pure gate if projection-only; process gate if external checker needed |
| meta-review auto-rework | packaged routing policy, route vocabulary, L3 execution |
| human gate routes | route vocabulary + L3 human wait |
| sticky human gate | packaged routing policy state/params |
| accuracy-critical checks | policy overlay enabling targeted evidence / verification gates |

## Route Boundary

Route vocabulary is needed, but it should not collapse L2 and L3.

Good boundary:

```text
L2 / routing policy decides the route and reason.
L3 executes lifecycle transitions, human waits, dispatch, side effects, and persistence.
```

Examples of route names worth preserving:

- `meta_review_running`,
- `auto_rework`,
- `human_gate_approve`,
- `human_gate_budget_exhausted`,
- `human_gate_threshold_not_met`,
- `human_gate_threshold_unresolved`,
- `human_gate_inconclusive`,
- `human_gate_run_failed`,
- `human_gate_dispatch_failed`,
- `human_gate_sticky_bypass`.

The route should always carry a reason. `human_gate_approve` and
`human_gate_budget_exhausted` are materially different even if both enter a human decision
region.

## What Not To Do

Do not make the primary config a raw `gate_pipeline` stage list. It is excellent as a
normalized/debug view, but too verbose and ordering-sensitive for authors.

Do not make the system DSL-only. A DSL hides v1's domain concepts and makes subtle review
rules look like arbitrary expressions.

Do not make every small condition a custom packaged TypeScript gate. Simple thresholds and
existence checks deserve declarative primitives.

Do not duplicate L2b prompt text as a separate policy. The guidance must be generated from
the same gate config that enforces the rule.

Do not introduce dynamic TypeScript module loading in the MVP. Use the process interface as
the extension seam.

Do not let route policy perform L3 side effects. L2/routing decides; L3 executes.

## Notable Alternatives And References

These ideas were not selected as the primary design, but are worth preserving because they
may become useful in later L2a/L2b or implementation work.

### Decisions / Evidence / Messages Profile

One proposal organized authoring config around:

```text
decisions -> what L2 allows or blocks
evidence  -> what L2a commands/artifacts/trust proofs are required
messages  -> what L2b tells implementers, reviewers, meta-reviewers, and humans
```

This is very readable and useful as a documentation lens. It was not chosen as the
canonical model because it can obscure the actual runtime binding point: a gate is bound to
a workflow transition. Still, the split is useful when explaining how one policy profile
produces three outputs: enforcement, evidence collection, and actor guidance.

### Stage Mode Pipeline

Another proposal modeled every policy element as a `gate_pipeline.stage` with a mode:

```text
enforce     -> hard gate, block means no commit
advisory    -> diagnostic/projection only, no block
communicate -> L2b context contribution
route       -> structured routing intent
```

This is strong as an internal/debug representation because it makes ordering and stage
semantics explicit. It was not chosen as the primary authoring format because it is too
verbose and ordering-sensitive. The selected design can still compile to a stage-like
effective view for status/debug export.

### Typed Transform Decisions

The schema-focused proposal noted that not every gate output is just `allow`, `warn`, or
`block`. Some v1-ish checks effectively transform the interpretation of a finding:

```ts
type GateTransform =
  | { kind: "effective_priority"; from: "P0" | "P1"; to: "P2" | "P3" }
  | { kind: "effective_timing"; from: "required-now"; to: "later-hardening" };
```

This is interesting for doc/review policy cases where missing evidence or invalid layer
does not always hard-block, but downgrades or demotes a finding for projection/status. It
should not complicate L2 core immediately, but the findings/doc-gate design should revisit
whether `GateDecision` needs a typed transform/advisory output later.

### L2b Emit Affordances

The L2b-focused proposal introduced an actor-facing affordance shape:

```ts
interface EmitAffordance {
  event_type: string;
  target_step?: string;
  status: "available_now" | "blocked_now" | "conditional" | "requires_external_gate";
  gate_summary: GateSummary[];
  required_payload?: SchemaRef;
  required_evidence?: EvidenceRequirement[];
}
```

This is likely a good future ContextPacket form. It makes L2b more precise than generic
prompt blocks: the actor sees which emits are available, conditionally available, blocked,
or dependent on external/process gates.

### Explicit Gate Policy Decision Envelope

The routing-focused proposal suggested a route decision envelope:

```ts
interface GatePolicyDecision {
  route: PairflowGateRoute;
  reason_code: string;
  lifecycle_target?: "RUNNING" | "READY_FOR_HUMAN_APPROVAL" | "APPROVED_FOR_COMMIT";
  sticky_human_gate?: boolean;
  auto_rework_increment?: boolean;
  required_human_action?: "approve" | "request_rework" | "inspect";
  diagnostics: Record<string, unknown>;
}
```

This is too route-heavy for L2 core, but valuable for the later routing/L3 slice. It
captures the distinction between "what policy decided" and "what lifecycle/application
side effect executes that decision".

### Inline-Only Process MVP Cut

The minimal MVP proposal argued for an initial L2a cut with only inline process gates:

```text
command ref + timeout + exit-code mapping + evidence ref
```

This is attractive for implementation sequencing. It does not cover the full long-running
meta-review runner story, but it may be the right first executable L2a slice before
`WAITING(gate_pending)` and deferred `GATE_RESULT` are added.

## Recommended Next Step

Use this synthesis to refine the L2/L2a/L2b small specs:

1. Keep L2 core focused on inline declarative + packaged gates.
2. Add an explicit L2a contract for process gates, including inline and deferred modes.
3. Add an explicit L2b contract: every gate can contribute actor-facing context from the
   same config.
4. Treat `gate_pipeline` as the normalized effective form, not the primary authoring form.
5. Treat the v1 workflow as a packaged policy profile with typed parameters and explicit
   override seams.
