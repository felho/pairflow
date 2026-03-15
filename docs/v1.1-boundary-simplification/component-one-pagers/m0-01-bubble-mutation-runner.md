# BubbleMutationRunner

Status: draft
Owner: TBD
Scope: M0

## 1) Purpose

- Egyseges mutation pipeline a transcript + state irasra.
- Megszunteti a commandonkent duplikalt conflict/recovery logikat.

## 2) Responsibilities

- Snapshot beolvasasa (fingerprinttel).
- Tranzakcios alkalmazas egy mar validalt mutation plan alapjan.
- Transcript append (elso).
- State persist expected fingerprint/state guarddal (masodik).
- Standardized mutation outcome visszaadasa.

## 3) Non-Responsibilities (Anti-goals)

- Nem hoz policy dontest.
- Nem szamolja ki a `next_state`-et.
- Nem vegez state transition validaciot.
- Nem kuld tmux uzenetet.

## 4) Boundary and Dependencies

- Hivhatja: application/orchestrator use-case-ek.
- Hivhatja: TranscriptRepository, StateRepository.
- Tiltott: kozvetlen CLI/agent adapter hasznalat.

## 4.1 Ownership Split

- `StateTransitionService` ownership:
  - transition validacio,
  - `next_state` eloallitasa (pure).
- `BubbleMutationRunner` ownership:
  - transcript append,
  - state persist guarddal,
  - mutation outcome.
- Ownership handoff contract:
  - runner csak `validated_next_state`-et fogad el,
  - transition requestbol nem szamolhat sajat `next_state`-et.

## 5) Input Contract

- `current_snapshot` (state + fingerprint).
- `domain_mutation_plan` (events/envelopes + `validated_next_state`).
- `operation_id`, `actor`, `reason` (ha operator path).

## 6) Output Contract

- `MutationOutcome`:
  - `status`: `applied | conflict | recovery_needed | rejected`
  - `reason_code`
  - `transcript_refs`
  - `state_fingerprint`

## 7) Invariants

- Transcript-first ordering kotelezo.
- Normál pathon csak validalt state mehet persistre.
- Partial success eseten explicit recovery jelzes kotelezo.
- `BubbleMutationRunner` nem bypassolhatja a transition gate ownershipot.

## 8) Error Model

- `MUTATION_CONFLICT`
- `TRANSCRIPT_APPEND_FAILED`
- `STATE_PERSIST_FAILED`
- `MUTATION_RECOVERY_REQUIRED`

Kotelezo context:
- `bubble_id`, `operation_id`, `expected_fingerprint`, `actual_fingerprint`, `state`.

## 9) Observability

- `mutation_started`, `mutation_applied`, `mutation_conflict`, `mutation_recovery_required` event.
- Transcript audit event operator mutacion.

## 10) Tests

- Unit: ordering, conflict branch, partial failure branch.
- Integration: `pass` es `approval` flow.
- Regression: append-success/state-fail osztaly.
- Guard test: runner invalid/unvalidated `next_state` inputot elutasit.

## 11) Migration Notes

- Elso target: `pass`.
- Masodik target: `approval` vagy `reply`.
- Feature flag fallback a regi pathra.

## 12) Done Criteria

- Ket kritikus command mar ezen fut.
- Nincs P1 regresszio.
- Recovery kimenet schema egységes.

## 12.1 Green Criteria (ownership fitness)

- Nincs olyan state-changing path, ahol runner kozvetlenul transition logikat csinal.
- Nincs olyan call-site, ahol runnerhez transition request megy `validated_next_state` helyett.
- CI check + legalabb 1 integration teszt bizonyitja a `STS -> BMR` ownership lancot (`pass` + `approval`).
