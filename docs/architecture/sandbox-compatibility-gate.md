# Sandbox Compatibility Gate

Status: active
Date: 2026-04-11

---

## Purpose

Ez a gate azt vedi, hogy a Pairflow remote vagy executor-jellegu feature-jei kesobb sandboxolt runtime-ra is atfordithatok maradjanak nagyobb command-surface ujrairas nelkul.

A gate **nem** koveteli meg, hogy a feature mar most sandboxban fusson. Azt koveteli meg, hogy a mostani implementacio ne egetesse bele a host-shell, host-path vagy host-tmux reszleteket canonical boundarykent.

## When It Applies

Ez a gate kotelezo minden olyan planhoz vagy taskhoz, amely:
1. remote executiont vezet be vagy bovit,
2. uj executor/runtime boundaryt formalizal,
3. host-level process/workspace/attach/cleanup routingot valtoztat,
4. kesobbi sandbox, container vagy cloud runtime iranyat erintheti.

## Core Rule

A host access es a bubble runtime environment kulon fogalmi reteg maradjon.

Maskepp:
1. a `host` nem azonos a `runtime`-mal,
2. a `workspace path` nem azonos a canonical runtime identityvel,
3. az `attach`, `start`, `relay`, `cleanup` fogalmak nem szukulhetnek egyetlen host-specifikus implementaciora.

## Required Gate Checks

Minden erintett tasknak kulon ki kell ertekelnie legalabb ezt az 5 pontot.

### SG1. Runtime Boundary Preservation

A task nem kezelheti a remote bubble-t pusztan host shell commandkent. Kell maradjon kulon fogalmi seam legalabb ezekre:
1. workspace provisioning,
2. runtime start,
3. command relay,
4. interactive attach,
5. cleanup / teardown.

### SG2. Host Path Non-Authority

A host oldali path (`remoteClonePath` vagy utodja) lehet implementation detail, de nem valhat egyeduli canonical identityve vagy olyan persisted authorityva, amelyhez minden mas surface kozvetlenul hozzakotodik.

Elvart:
1. legyen instance-jellegu identity vagy runtime handle szemlelet,
2. a host path maradhasson lecserelheto sandbox rootra vagy bind-mountolt workspace-re.

### SG3. Host-Tool Decoupling

A `tmux`, raw `ssh`, `scp`, `rsync` vagy barmely host tool implementation detail maradjon.

Nem elfogadhato, ha a task:
1. a `tmux` session nevet teszi meg egyeduli runtime identitynek,
2. az attach szemantikajat veglegesen `tmux attach`-ra redukalja,
3. cleanupot ugy definial, hogy az csak host shell / raw path mellett ertelmezheto.

### SG4. Wrapper-Ready Execution

A task altal bevezetett command boundarynak ugy kell kialnia, hogy kesobb egy wrapper reteg behelyezheto legyen:

mai forma:
`ssh host -> cd workspace -> pairflow ...`

kesobbi, meg mindig kompatibilis forma:
`ssh host -> enter sandbox/runtime -> pairflow ...`

Ez azt jelenti, hogy az uj task nem szorhatja szet kontrollalatlanul a raw SSH command string epitest a kodbase-ben.

### SG5. Explicit Non-Goals for Isolation

Ha a task meg nem implemental sandboxingot, azt explicit non-goalkent ki kell mondania, es le kell irnia, mi marad kesobb cserelheto:
1. runtime wrapper,
2. workspace root mapping,
3. attach implementation,
4. cleanup implementation,
5. network/process/filesystem policy layer.

## Task-Level Usage Contract

Minden olyan task, amelyre ez a gate applies:
1. tartalmazzon kulon `Sandbox Compatibility Gate` vagy `Sandbox Compatibility Check` szekciot,
2. hivatkozzon erre a dokumentumra,
3. ertekelje ki `SG1`-`SG5` pontokat konkretan a task scope-jara,
4. mondja ki az explicit non-goalokat, ha a sandboxing meg nincs implementalva,
5. ne legyen `implementable` vagy `completed`, ha a gate nincs kitoltve.

Minimum elvart task-shape:

```md
## Sandbox Compatibility Gate

Reference: `docs/architecture/sandbox-compatibility-gate.md`

1. `SG1 Runtime Boundary Preservation`
   - megfeleles / nem-megfeleles:
2. `SG2 Host Path Non-Authority`
   - megfeleles / nem-megfeleles:
3. `SG3 Host-Tool Decoupling`
   - megfeleles / nem-megfeleles:
4. `SG4 Wrapper-Ready Execution`
   - megfeleles / nem-megfeleles:
5. `SG5 Explicit Non-Goals for Isolation`
   - felsorolt non-goalok:
```

## Review Interpretation

Review soran ez a gate nem advisory-only.

Ha egy task:
1. uj host-level couplingot betonoz be,
2. a runtime seamet elkeni,
3. a host pathot vagy host toolt canonical boundaryve teszi,

akkor arra erre a gate-re kell findingot rogizteni.

## Examples of Good Direction

1. Kulon helper vagy port a remote command vegrehajtasra egyesevel szetszort raw SSH stringek helyett.
2. Pointer/runtime-handle szemlelet a sima path-only szemlelet helyett.
3. Külön attach boundary, amely ma `tmux`-ot hasznal, de nem teszi azt a fogalom egyetlen jelenteseve.
4. Külön cleanup `teardown + workspace cleanup` gondolkodas a puszta `rm -rf` helyett.

## Examples of Drift

1. A persisted remote contract csak `host + remoteClonePath + tmuxSession`.
2. Minden command sajat maga epiti a raw `ssh "cd ... && pairflow ..."` stringet.
3. Az attach dokumentalt jelentese veglegesen `tmux attach`.
4. A cleanup fogalma egyetlen host-path torlesre szukul.
