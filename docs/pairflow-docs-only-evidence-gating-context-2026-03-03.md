# Pairflow docs-only evidence gating - kontextus, probléma és javasolt működés (2026-03-03)

## Cél
Ez a dokumentum azt rögzíti, hogy docs-only bubble esetén milyen evidence/verification gate-nek van értelme, mi okozta a mostani elakadást, és milyen policy adna jó egyensúlyt minőség és haladás között.

## Miért készült ez a fájl
A mai körökben visszatérően felmerült kérdés:
- Van-e értelme ugyanazt a hard verifier folyamatot használni docs-only munkára, mint kódimplementációra?
- Ha igen, milyen mértékben?
- Hol csúszik szét most a folyamat?

## Rövid álláspont
- **Van értelme** docs-only környezetben is evidence-t tartani, ha a dokumentum explicit command-claimet tesz.
- **Nincs értelme** ugyanolyan kemény, parser-érzékeny hard gate-et futtatni docs-onlyra, mint production kódchange-re.
- A jelenlegi setupban a gate túl szigorú docs-only use case-re, ezért sok kör megy el nem tartalmi, hanem pipeline-kompatibilitási vitákra.

## Jelenlegi állapot - mit láttunk konkrétan

### Mintázat
Többször előfordult:
1. reviewer/orchestrator summary PASS ("tests pass", "typecheck clean"),
2. verifier artifact `untrusted` (`evidence_missing` vagy `evidence_unverifiable`),
3. emiatt újabb rework, miközben a tartalmi dokumentum már gyakorlatilag kész.

### Konkrét bubble példák

#### A) `ai-chat-session-idempotency-refine-2026-03-03`
- Approval summary PASS: `msg_20260303_050`.
- Verifier artifact ugyanakkor `untrusted`, missing evidence állapotban.
- Hivatkozások:
  - `/Users/felho/dev/make-it-legal/precedens.ai/.pairflow/bubbles/ai-chat-session-idempotency-refine-2026-03-03/transcript.ndjson`
  - `/Users/felho/dev/make-it-legal/precedens.ai/.pairflow/bubbles/ai-chat-session-idempotency-refine-2026-03-03/artifacts/reviewer-test-verification.json`

#### B) `p11-h1-phase-0-doc-refine-2026-03-03`
- Approval summary clean, no blockers.
- Verifier artifact `untrusted`, `evidence_unverifiable` (`pnpm test`).
- Hivatkozások:
  - `/Users/felho/dev/make-it-legal/precedens.ai/.pairflow/bubbles/p11-h1-phase-0-doc-refine-2026-03-03/transcript.ndjson`
  - `/Users/felho/dev/make-it-legal/precedens.ai/.pairflow/bubbles/p11-h1-phase-0-doc-refine-2026-03-03/artifacts/reviewer-test-verification.json`

#### C) Kontroll példa: `p11-h1-phase-2-task-create-2026-03-03`
- Ugyanebben a napban volt `trusted` verifier kimenet is.
- Ez azt jelzi, hogy nem feltétlen user-használati hiba, hanem állapot-/formatumfüggő rendszerérzékenység.

## A "2-es" és "3-as" problématípus

### 2-es típus (logformátum/parsing)
A logból a parser nem tud egyértelműen PASS/EXIT állapotot kinyerni.
- Tipikus jel: `unverifiable` evidence.
- Oka lehet hiányzó explicit `EXIT_CODE`, completion marker vagy command identity.

### 3-as típus (binding/freshness)
A summary és az artifact nem ugyanarra a roundra/commitre mutat.
- Tipikus jel: summary PASS, artifact stale/untrusted/regebbi commit.
- Ez state-binding probléma (pass envelope ↔ evidence refs ↔ commit SHA).

## Miért fáj ez docs-only esetben
- A docs tartalom sokszor már implementációra kész, de a pipeline állapot nem.
- A csapat tempója lelassul, mert rework körök a verifier körül forognak.
- A review fókusza eltolódik tartalmi minőségről parser-kompatibilitásra.

## Mi lenne "bölcs" policy docs-onlyra

### 1) Mode-aware gating
Bevezetni egy explicit `docs_only` gate szintet:
- tartalmi konzisztencia és cross-doc drift legyen elsődleges,
- evidence parser hibák legyenek warning szintűek,
- kivéve ha summary ellentmond az artifactnak (az maradjon blocker).

### 2) Summary-Artifact consistency hard rule
Docs-only módban is kötelező:
- ha verifier `untrusted`, summary nem írhat "clean validation" állítást.
- A UI-ban jelenjen meg machine status badge (`trusted/untrusted`) a summary mellett.

### 3) Canonical command normalization
A verifier értelmezze ekvivalensnek:
- `pnpm --dir 05_finder test` ~= `pnpm test`
- `pnpm --dir 05_finder exec tsc --noEmit` ~= `pnpm typecheck` (ha script nincs)

### 4) Structured evidence footer (kötelező)
Minden kötelező log végén standard blokk:
- `CMD:`
- `EXIT_CODE:`
- `STATUS:`
- `TIMESTAMP_UTC:`

### 5) Freshness check
Verifier artifact csak akkor lehet trusted, ha:
- ugyanarra a `pass_envelope_id`-re és roundra van kötve,
- commit SHA és status hash a jelenlegi bubble state-t tükrözi.

## Javasolt döntési mátrix (docs-only)

### Kötelező blocker
- Summary vs artifact ellentmondás.
- Stale/rossz round evidence binding.
- Egyértelmű tartalmi P0/P1.

### Nem blocker (warning)
- Parser-szintű formázási hiány, ha az evidence érdemben olvasható.
- Docs polish P2/P3, ha handoff nem sérül.

## A mostani eset tanulsága
- A jelenlegi docs-only körökben a fő késleltető tényező nem a dokumentumtartalom minősége volt, hanem a verifier/state konzisztencia.
- A minőség megtartása mellett gyorsulás úgy érhető el, ha docs-only módot hivatalosan külön gate policy kezeli.

## Kapcsolódó dokumentum
- Előző, általános hibakontextus:
  - `/Users/felho/dev/pairflow/docs/pairflow-evidence-governance-context-2026-03-03.md`

## Javasolt következő lépés Pairflow oldalról
1. `docs_only` workflow policy implementálása.
2. Summary generator hard gate összekötése verifier státusszal.
3. Command canonicalization és evidence parser robusztusítás.
4. Artifact freshness guard beépítése (`stale` reason code).

## Záró megállapítás
A docs-only evidence gate jelenleg részben indokolt, de túl merev. A rendszernek különbséget kell tennie tartalmi minőségbiztosítás és parser-szintű technikai megfelelés között, különben a review ciklusok aránytalanul hosszúak maradnak.
