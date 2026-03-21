# ConfigLoader + TomlNormalizer

Status: active (ratified baseline)
Owner: architecture/runtime
Scope: M0

Current State (2026-03-21): implemented baseline contract; maintained under active v11 hard-gate rollout.

## 1) Purpose

- Egységes config parse/merge/precedence es safe decision-point read.

## 2) Responsibilities

- TOML parse util centralizalasa.
- Global/repo/bubble precedence feloldasa.
- Safe mezok friss olvasasa decision pointon.

## 3) Non-Responsibilities (Anti-goals)

- Nem teljes dynamic hot-reload engine.
- Nem kezeli strukturális mezok mid-flight valtatasat.

## 4) Boundary and Dependencies

- Hivhatja: orchestrator.
- Dependencia: config file repository.

## 5) Input Contract

- Config source pathok.
- Optional override input.

## 6) Output Contract

- `ResolvedConfig` + source metadata.

## 7) Invariants

- Safe mezok allowlist kotelezo.
- Strukturális mezok restart-kotelesek.

## 8) Error Model

- `CONFIG_PARSE_FAILED`
- `CONFIG_PRECEDENCE_INVALID`
- `CONFIG_UNSAFE_MUTATION_REQUIRES_RESTART`

Kotelezo context:
- `config_source_path`, `field_name` (ha specifikus mezorol van szo), `precedence_level` (global/repo/bubble).

## 9) Observability

- `config_loaded`, `config_override_applied`, `config_override_rejected` event.

## 10) Tests

- Unit: parser/merge precedence.
- Integration: safe mezovaltozas ervenyesul restart nelkul.

## 11) Migration Notes

- Kezdet: kozos TOML util + loader interface.

## 12) Done Criteria

- Nincs duplikalt TOML parse helper a core config modulokban.
