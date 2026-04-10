---
artifact_type: plan
artifact_id: plan_bubble_startup_recovery_contract_and_phasing_v1
title: "Bubble Startup Recovery Minimal Plan"
status: implementable
prd_ref: null
owners:
  - "felho"
---

# Plan: Bubble Startup Recovery Minimal Scope

## Objective

A jelenlegi startup/recovery hibat a lehető legkisebb, legpragmatikusabb contracttal lefedni.

Sikernek az szamit, ha:
1. `PREPARING_WORKSPACE` alatt nincs implicit vagy kitalalt recovery authority; csak explicit, valid `startup_recovery` descriptor megengedett.
2. A fresh `CREATED -> PREPARING_WORKSPACE` elso persisted write egyetlen canonical seamen keresztul tortenik.
3. A fresh success-path `RUNNING` alatt active `startup_recovery` blokk nem maradhat perzisztalva.
4. A scope itt megall; nem csinalunk ebbol teljes recovery-roadmapot.

## Current Codebase Check (2026-04-10)

1. Az eredeti bugfix gondolatmenet tul nagy startup/recovery programmá nyilt.
2. A valos, azonnali problema ket helyen van:
   - mi szamit ervenyes persisted recovery allapotnak,
   - hol irjuk ki eloszor deterministicen ezt az allapotot.
3. Minden mas csak akkor jon vissza scope-ba, ha egy uj, konkret hiba vagy gap ezt tenylegesen kikényszeríti.

## Scope Now

1. Canonical `startup_recovery` schema/read authority.
2. Fresh-path first-write boundary.

## Explicitly Out Of Scope

1. Retry-safe routing/admission policy.
2. Failure-policy persistence semantics.
3. `RUNNING` commit-gate propagation vagy clear-vs-archive default.
4. Startup interruption safety, tmux reuse/reclaim, operator hardening.
5. Barmilyen jovo roadmap fenntartasa "ha majd egyszer kell" alapon.

## Work Items

| Work Item | Artifact | Why It Exists | Done When |
|---|---|---|---|
| 1 | `plans/tasks/bubble-start-startup-recovery-schema-authority-phase1a.md` | explicitten lezarja, mi a valid `startup_recovery` allapot es mi fail-closed | `CREATED` / `PREPARING_WORKSPACE` / `RUNNING` schema boundary es legacy missing-block read behavior ellentmondasmentes |
| 2 | `plans/tasks/bubble-start-startup-recovery-write-boundary-phase1a.md` | explicitten lezarja, hol authoralodik az elso canonical persisted descriptor | a fresh preparing baseline es a fresh success-path running write deterministic, single-seam, schema-valid |

## Validation Strategy

1. A schema-authority task document contractja es regression surface-e legyen explicit es eleg szuk.
2. A write-boundary task egyetlen canonical authoring seamet es egyetlen fresh baseline-t engedjen.
3. Ha ez a ket artifact kesz, a plan veget er. Tovabbi recovery-scope csak uj bizonyitek alapjan nyithato meg egy kulon uj tervben.

## Decisions Captured

1. A `startup_recovery` descriptor a canonical `state.json` resze.
2. A mostani minimal delivery scope pontosan ket artifact: `schema-authority` es `write-boundary`.
3. A korabbi szelesebb roadmap szandekosan torolve lett; nem latent backlog.
