# LegacyCompatAdapter

Status: draft
Owner: TBD
Scope: M0

## 1) Purpose

- Legacy parser/format/allapot kompatibilitasi logika izolalasa a domain core-tol.

## 2) Responsibilities

- Legacy input normalizalas canonical domain modellre.
- Compat warning/diagnostics adasa.
- Hianyzo activation/ideation marker mezok deterministic defaultolasa.

## 3) Non-Responsibilities (Anti-goals)

- Nem core policy dontes.
- Nem maradandó domain szabaly tarolo.

## 4) Boundary and Dependencies

- Hivhatja: orchestrator entry boundary.
- Domain fele csak canonical tipusokat adhat tovabb.

## 5) Input Contract

- Legacy summary/findings/state payload.
- Legacy bubble config/state snapshot (activation marker hianyozhat).

## 6) Output Contract

- Canonical typed payload + compat diagnostics.
- Canonical activation marker mezok (`task_activation_state`, `ideation_mode`) explicit defaultokkal.

## 7) Invariants

- Domain core legacy formatot kozvetlenul nem fogad.
- Hianyzo activation marker mezok defaultja: `task_activation_state=active_task`, `ideation_mode=false`.

## 8) Error Model

- `LEGACY_NORMALIZATION_FAILED`
- `LEGACY_INPUT_UNSUPPORTED`
- `LEGACY_ACTIVATION_MARKER_INCONSISTENT`

Kotelezo context:
- `bubble_id`, `input_format_version` (ha megallapithato), `normalization_step` (melyik lepes bukott).

## 9) Observability

- Compat usage metric (`legacy_path_taken`) es reason code.

## 10) Tests

- Unit: normalizalas edge-case matrix.
- Regression: korabbi parser drift bugok.
- Regression: hianyzo ideation markerrel is deterministic canonical payload keletkezik.

## 11) Migration Notes

- Fokozatosan szukitjuk a legacy pathot.

## 12) Done Criteria

- Legacy format kezelesek kozpontilag ebben a boundary-ben vannak.
- Legacy activation marker hiany eseten sincs policy-drift a kickoff/pass elodontesben.
