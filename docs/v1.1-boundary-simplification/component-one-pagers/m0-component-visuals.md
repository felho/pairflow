# M0 Component Visuals

Status: draft
Scope: M0 architecture understanding + one-pager validation

## 1) Layered view (who can call what)

```mermaid
flowchart LR
  CLI[CLI Commands]
  ORCH[Application Orchestrators]
  DOMAIN[Domain Engines\nConvergencePolicyEngine\nGatePipelineEngine\nStateTransitionService]
  INFRA[Infrastructure Adapters\nBubbleMutationRunner\nConfigLoader\nAgentAdapter\nMetricsDispatcher\nLegacyCompatAdapter\nTranscriptStateReconciler]
  REPOS[Repositories\nTranscriptRepository\nStateRepository]

  CLI --> ORCH
  ORCH --> DOMAIN
  ORCH --> INFRA
  INFRA --> REPOS

  DOMAIN -. no direct I/O .-> REPOS
  DOMAIN -. no direct I/O .-> INFRA
```

## 2) M0 mandatory core component map

```mermaid
flowchart TB
  ORCH[Orchestrator]

  CPE[ConvergencePolicyEngine]
  GATE[GatePipelineEngine]
  STS[StateTransitionService]
  LEGACY[LegacyCompatAdapter]

  BMR[BubbleMutationRunner]
  CFG[ConfigLoader + TomlNormalizer]
  AGENT[AgentAdapter\n(TmuxAgentAdapter)]
  MET[MetricsDispatcher]
  REC[TranscriptStateReconciler]
  ERR[PairflowError + ErrorMappingBoundary]

  TR[TranscriptRepository]
  SR[StateRepository]

  ORCH --> CFG
  ORCH --> LEGACY
  ORCH --> CPE
  ORCH --> GATE
  ORCH --> STS
  ORCH --> BMR
  ORCH --> AGENT
  ORCH --> MET
  ORCH --> REC
  ORCH --> ERR

  BMR --> TR
  BMR --> SR
  REC --> TR
  REC --> SR

  LEGACY --> CPE
  CPE --> GATE
  STS --> BMR
```

## 3) Mutation pipeline (transcript-first invariant)

```mermaid
flowchart LR
  A[Domain mutation plan ready]
  B[BubbleMutationRunner\nvalidate input + snapshot]
  C[Append transcript envelope/event]
  D[Persist next state\nexpected fingerprint/state]
  E[Return MutationOutcome\napplied|conflict|recovery_needed|rejected]

  A --> B --> C --> D --> E

  C -. append ok, state fail .-> E
  E -. recovery path .-> R[TranscriptStateReconciler]
```

## 4) Sequence: `pass`

```mermaid
sequenceDiagram
  autonumber
  participant CLI as CLI
  participant OR as PassOrchestrator
  participant CFG as ConfigLoader
  participant LC as LegacyCompatAdapter
  participant CPE as ConvergencePolicyEngine
  participant GATE as GatePipelineEngine
  participant STS as StateTransitionService
  participant BMR as BubbleMutationRunner
  participant TR as TranscriptRepository
  participant SR as StateRepository
  participant AG as AgentAdapter
  participant MET as MetricsDispatcher

  CLI->>OR: pairflow pass ...
  OR->>CFG: loadDecisionConfig()
  OR->>LC: normalizeInput(payload)
  OR->>CPE: evaluateConvergence(context)
  OR->>GATE: run(gates, gateContext)
  OR->>STS: applyStateTransition(current, request)
  OR->>BMR: applyMutation(plan)
  BMR->>TR: append(envelope/event)
  BMR->>SR: write(nextState, expectedFingerprint)
  BMR-->>OR: MutationOutcome
  OR->>AG: deliverToRecipient(...)
  OR->>MET: dispatch(bubble_passed)
  OR-->>CLI: success/result
```

## 5) Sequence: `converged`

```mermaid
sequenceDiagram
  autonumber
  participant CLI as CLI
  participant OR as ConvergedOrchestrator
  participant CFG as ConfigLoader
  participant CPE as ConvergencePolicyEngine
  participant GATE as GatePipelineEngine
  participant STS as StateTransitionService
  participant BMR as BubbleMutationRunner
  participant AG as AgentAdapter
  participant MET as MetricsDispatcher

  CLI->>OR: pairflow converged ...
  OR->>CFG: loadDecisionConfig()
  OR->>CPE: evaluateConvergence(context)
  OR->>GATE: run(meta-review/doc gates)
  alt gate blocks
    OR->>MET: dispatch(converged_blocked)
    OR-->>CLI: blocked + reason
  else allowed
    OR->>STS: applyStateTransition(...)
    OR->>BMR: applyMutation(plan)
    OR->>AG: notify next recipient/state
    OR->>MET: dispatch(converged_emitted)
    OR-->>CLI: success
  end
```

## 6) Sequence: `approval`

```mermaid
sequenceDiagram
  autonumber
  participant CLI as CLI
  participant OR as ApprovalOrchestrator
  participant CFG as ConfigLoader
  participant LC as LegacyCompatAdapter
  participant STS as StateTransitionService
  participant BMR as BubbleMutationRunner
  participant AG as AgentAdapter
  participant MET as MetricsDispatcher

  CLI->>OR: pairflow bubble approve|request-rework ...
  OR->>CFG: loadDecisionConfig()
  OR->>LC: normalizeApprovalContext()
  OR->>STS: applyStateTransition(current, approve/rework)
  OR->>BMR: applyMutation(approval_decision_plan)
  OR->>AG: deliver decision notification
  OR->>MET: dispatch(approval_decision_emitted)
  OR-->>CLI: success
```

## 7) Sequence: `meta-review gate`

```mermaid
sequenceDiagram
  autonumber
  participant OR as GateOrchestrator
  participant CFG as ConfigLoader
  participant GATE as GatePipelineEngine
  participant AG as AgentAdapter
  participant STS as StateTransitionService
  participant BMR as BubbleMutationRunner
  participant MET as MetricsDispatcher

  OR->>CFG: loadGateProfile()
  OR->>GATE: run(meta-review gates, context)
  alt gate requires autonomous meta-review
    OR->>AG: trigger meta-reviewer session/action
    OR->>MET: dispatch(meta_review_started)
  else gate outcome is block/rework/approve route
    OR->>STS: applyStateTransition(...)
    OR->>BMR: applyMutation(gate_route_plan)
    OR->>MET: dispatch(meta_review_gate_routed)
  end
```

## 8) Sequence: `reconcile/recovery` (operator path)

```mermaid
sequenceDiagram
  autonumber
  participant CLI as CLI
  participant OR as ReconcileOrchestrator
  participant REC as TranscriptStateReconciler
  participant TR as TranscriptRepository
  participant SR as StateRepository
  participant MET as MetricsDispatcher

  CLI->>OR: pairflow bubble reconcile --reason --operation-id
  OR->>REC: reconcile(bubbleId, reason, operationId)
  REC->>TR: read transcript tail/source
  REC->>SR: compare current state
  alt drift detected
    REC->>SR: write reconciled state
    REC->>TR: append reconcile audit event
    REC-->>OR: applied
  else no drift
    REC-->>OR: no_change
  end
  OR->>MET: dispatch(reconcile_result)
  OR-->>CLI: outcome
```

## 9) Validation matrix (one-pagers vs key sequences)

| Component | pass | converged | approval | meta-review gate | reconcile/recovery |
|---|---|---|---|---|---|
| BubbleMutationRunner | X | X | X | X | optional |
| StateTransitionService | X | X | X | X | optional |
| ConvergencePolicyEngine | X | X | - | - | - |
| GatePipelineEngine | X | X | - | X | - |
| TranscriptStateReconciler | - | - | - | - | X |
| PairflowError boundary | X | X | X | X | X |
| MetricsDispatcher | X | X | X | X | X |
| ConfigLoader + TomlNormalizer | X | X | X | X | X |
| AgentAdapter | X | X | X | X | - |
| LegacyCompatAdapter | X | optional | X | optional | - |

## 10) How to use this doc during design review

1. Valassz egy sequence-et (pl. `pass`) es nezd meg, nincs-e tul sok komponens aktiv egyszerre.
2. Ellenorizd, hogy a policy dontes domainben marad-e, es I/O csak orchestrator/adapternel van-e.
3. Ha egy komponens tul sok sequence-ben tul sok fele szerepet kap, vedd elo az anti-goal blokkjat.
4. Minden uj valtoztatasnal frissitsd a megfelelo sequence diagramot es a matrixot.
