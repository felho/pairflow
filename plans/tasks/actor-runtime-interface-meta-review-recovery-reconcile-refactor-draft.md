---
artifact_type: task
artifact_id: task_actor_runtime_interface_meta_review_recovery_reconcile_refactor_draft_v1
title: "Actor Runtime Interface Meta-Review Recovery Reconcile Refactor"
status: superseded
phase: phaseE
superseded_reason: "The draft direction has been promoted into an explicit Phase E plan and task chain that fully removes the public recover command and requires an actor-agnostic reconcile kernel."
superseded_by:
  - plans/actor-runtime-incomplete-emit-reconcile-and-recover-removal-plan-v1.md
  - plans/tasks/actor-runtime-incomplete-emit/foundation-generic-reconcile-kernel-phaseE.md
  - plans/tasks/actor-runtime-incomplete-emit/meta-review-submit-cutover-phaseE.md
  - plans/tasks/actor-runtime-incomplete-emit/internal-caller-cutover-and-public-recover-removal-phaseE.md
  - plans/tasks/actor-runtime-incomplete-emit/actor-agnostic-cleanup-phaseE.md
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Meta-Review Recovery Reconcile Refactor

## Current Codebase Check (2026-04-10)

1. A checked-out tree-ben a meta-review es reconcile canonical ownership ma mar `src/v11/**` alatt van.
2. A draft iranya tovabbra is relevans, de minden kesobbi implementation scope-ot a mai `src/v11/application/metaReview/**`, `src/v11/application/reconcile/**` es `src/v11/application/watchdog/**` topologyhoz kell kotni.

## Why this draft exists

Ez a draft a jelenlegi beszelgetes lenyeget rogziti a `recover` iranyanak ujragondolasahoz.

Kivaltó helyzet:
1. a retained meta-review operator cleanup tobb tucat review/implementacios kor utan sem zart le stabilan;
2. a beszelgetes soran kiderult, hogy a mai meta-reviewer mar sokkal kozelebb all a tobbi actorhoz, mint amit a retained `recover` command kulon identitasa sugall;
3. ugyanakkor a recovery mogotti kepesseg ma meg nem teljesen torolheto, mert a submit flow es a watchdog is hasznalja.

Ez a task nem immediate implementation spec, hanem iranyrogzito draft.

## Current understanding

### A) Mi valtozott a meta-reviewerben

1. A canonical meta-reviewer happy path ma a `pairflow agent emit --kind meta_review_result`.
2. A sikeres emit ugyanabban a command-flowban tovabbroute-olja a bubble-t a kovetkezo helyes allapotba.
3. Emiatt a regi "meta-review mint kulon submit/recover alrendszer" modell ma mar csak reszben tukrozi a valos architecture-t.

### B) Miert nem lehet egyszeruen kijelenteni, hogy a `recover` ertelmetlen

1. A jelenlegi `submitMetaReviewResult(...)` implementacio belul meg mindig tobbfazisu:
   - authority + input validation,
   - canonical snapshot state-be irasa,
   - rolling artifact write,
   - gate route alkalmazasa.
2. A gate route alkalmazasat jelenleg a recovery executor vegzi el ugyanebben a flowban.
3. Ebből az kovetkezik, hogy a `recover` ma nem csak kezi fallback command, hanem reszben shared route-application engine.
4. A watchdog timeout path szinten erre a kepessegre epit.

### C) Mi a valodi problema

Nem az a fo kerdes, hogy legyen-e public `recover` command, hanem az, hogy:
1. kell-e meta-review-specifikus recovery-identitas a kernelben,
2. vagy a jelenlegi recovery logika valojaban egy altalanosabb `reconcile_or_finish_incomplete_emit` kepesseg special-case formája.

## First-principles direction

Munkahipotézis:

1. a recovery ne meta-review-specifikus kivetelezett filozofia legyen,
2. hanem kozos kernelkepesseg, amely a canonical output persistence utan determinisztikusan be tudja fejezni a route-applicationt vagy fail-closed tud maradni,
3. es amelyet:
   - a normal command flow,
   - a watchdog,
   - a startup reconcile,
   - es esetleges explicit operator recovery
   ugyanazon belso szerzodes menten hasznal.

## Proposed target shape

### 1) Rename the concept in the architecture

Targetben a mai meta-review-specifikus `recover` logika helyett egy altalanosabb belso capability legyen a center:

`reconcile_or_finish_incomplete_emit`

Ez a capability:
1. canonical persisted outputbol dolgozik,
2. explicit execution contexttel dolgozik,
3. route-ot derivál vagy ujrajatszik,
4. nem synthesize-al authorityt operator inputbol vagy pane allapotbol.

### 2) Separate public wrapper from internal engine

Kulon kell valasztani:
1. az internal reconcile/route-apply engine-t,
2. es a retained public operator wrapper(eke)t.

Lehetséges vegallapot:
1. a public `pairflow bubble meta-review recover` atmenetileg retained marad,
2. de mar csak thin wrapper a kozos reconcile engine felett,
3. es nem onallo meta-review-specifikus domain fogalomkent el a kernelben.

### 3) Remove normal happy-path semantic dependence on "recovery"

A normal successful `meta_review_result` emit ne ugy nezzen ki architecture-szinten, mintha "submit utan recoveryt hivna", hanem ugy, hogy:
1. canonical output persisted,
2. route deterministically applied from canonical output,
3. delivery/notification optional post-commit step.

Ez lehet ugyanazzal a kodosztallyal vagy service-szel implementalva, de a named contract ne "recovery fallback" legyen a happy path kozepén.

### 4) Keep fail-closed behavior

A refaktor csak akkor vedheto, ha:
1. a canonical actor authority tovabbra is explicit marad,
2. nincs hidden rerun,
3. nincs hidden operator-origin route authority,
4. a watchdog tovabbra is deterministic timeout/escalation behaviorrel rendelkezik.

## Suggested work split

### Slice 1: internal seam extraction

1. Azonositsuk es nevezzuk el kulon a kozos reconcile/route-application engine-t.
2. A mai `recover` command-path es a `submitMetaReviewResult(...)` kozosen ezt a seamet hasznalja.

### Slice 2: happy-path terminology cleanup

1. A successful submit flow ne recovery-nek nevezze a normal route-applicationt.
2. A code/comments/tests ugy valjanak szet, hogy:
   - normal route-application,
   - explicit fallback reconcile,
   - explicit operator recovery wrapper
   kulon fogalmak legyenek.

### Slice 3: public surface decision

1. Kulon dontes kell arrol, hogy a public `bubble meta-review recover` retained maradjon-e.
2. Ha retained marad, legyen wrapper.
3. Ha nem marad retained, a watchdog/operator/internal callers generic reconcile boundaryra alljanak at.

## Why this should happen after `run` removal

1. A `run` removal eloszor csokkenti a retained meta-review operator namespace komplexitasat.
2. Utana a `recover` iranya tisztabban lathato lesz, mert nem keveredik ugyanabba a subtree-be egy retained live-run special case.
3. Ez kisebb blast radiusu refaktort eredmenyez.

## Non-goals

1. Ez a draft nem mondja ki, hogy a public `recover` commandot azonnal torolni kell.
2. Ez a draft nem allitja, hogy a watchdog recovery logika ma mar felesleges.
3. Ez a draft nem irja felul a `status` / `last-report` retained projection-dontest.
4. Ez a draft nem teljes unified actor emit implementation plan.

## Relationship to the broader actor-runtime direction

Ez a draft egy szukebb tactical follow-up, de ugyanabba az iranyba mutat, mint a broader actor-runtime-interface initiative:
1. kisebb, kozosebb kernel,
2. kevesebb role-specifikus special-case orchestration,
3. tisztabb operator-vs-actor-vs-internal-engine hatar.

## Draft conclusion

Munkahipotézis:
1. a `recover` mogotti kepesseg ma meg valos es hasznos,
2. de a jelenlegi formája tul meta-review-specifikus,
3. es a kovetkezo vedheto lepes az, hogy ezt kozos reconcile/route-application kernelképessegge keretezzuk at, mikozben a public retained surface sorsa kulon dontes targya lesz.
