# LegacyCompatAdapter

Status: draft
Owner: TBD
Scope: M0

## 1) Purpose

- Legacy parser/format/allapot kompatibilitasi logika izolalasa a domain core-tol.

## 2) Responsibilities

- Legacy input normalizalas canonical domain modellre.
- Compat warning/diagnostics adasa.

## 3) Non-Responsibilities (Anti-goals)

- Nem core policy dontes.
- Nem maradandó domain szabaly tarolo.

## 4) Boundary and Dependencies

- Hivhatja: orchestrator entry boundary.
- Domain fele csak canonical tipusokat adhat tovabb.

## 5) Input Contract

- Legacy summary/findings/state payload.

## 6) Output Contract

- Canonical typed payload + compat diagnostics.

## 7) Invariants

- Domain core legacy formatot kozvetlenul nem fogad.

## 8) Error Model

- `LEGACY_NORMALIZATION_FAILED`
- `LEGACY_INPUT_UNSUPPORTED`

## 9) Observability

- Compat usage metric (`legacy_path_taken`) es reason code.

## 10) Tests

- Unit: normalizalas edge-case matrix.
- Regression: korabbi parser drift bugok.

## 11) Migration Notes

- Fokozatosan szukitjuk a legacy pathot.

## 12) Done Criteria

- Legacy format kezelesek kozpontilag ebben a boundary-ben vannak.
