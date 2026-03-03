# Pairflow evidence-governance inkonzisztencia - teljes kontextus (2026-03-03)

## Cél
Ez a dokumentum összefoglalja a 2026-03-03-i Pairflow használat során tapasztalt, visszatérő evidence-governance inkonzisztenciákat. A fókusz nem a termékdokumentumok tartalma, hanem a Pairflow review/verification pipeline ellentmondásai.

## Rövid problémaösszefoglaló
Több bubble-ben visszatérően az történt, hogy:
- a reviewer/orchestrator summary `PASS` vagy "tests pass / typecheck clean" állítást adott,
- miközben a `reviewer-test-verification.json` artifact `untrusted` státuszt jelzett,
- tipikusan `missing` vagy `unverifiable` command evidence (`pnpm test`, `pnpm typecheck`) okkal.

Ez approval döntési bizonytalanságot okozott: human summary szerint zöld, machine gate szerint nem zöld.

## Környezeti adatok
- Host projekt (ahol a bubble-k futottak): `/Users/felho/dev/make-it-legal/precedens.ai`
- Pairflow repo docs célmappa: `/Users/felho/dev/pairflow/docs`
- Időpont: 2026-03-03 (Europe/Budapest)
- Bubble mód: docs-only refinement / review körök

## Érintett bubble-k

### 1) `ai-chat-session-idempotency-refine-2026-03-03`
Legfontosabb ellentmondás:
- Approval summary: PASS, "pnpm test 45/45 PASS, tsc --noEmit PASS".
- Verifier artifact: `untrusted`, reason: missing command evidence.

Konkrét hivatkozások:
- Bubble transcript approval request:
  - `/Users/felho/dev/make-it-legal/precedens.ai/.pairflow/bubbles/ai-chat-session-idempotency-refine-2026-03-03/transcript.ndjson`
  - `msg_20260303_050` (round 20)
- Verifier artifact:
  - `/Users/felho/dev/make-it-legal/precedens.ai/.pairflow/bubbles/ai-chat-session-idempotency-refine-2026-03-03/artifacts/reviewer-test-verification.json`
  - Fő jelek:
    - `status: "untrusted"`
    - `reason_code: "evidence_missing"`
    - `reason_detail: "Missing command evidence: pnpm typecheck, pnpm test."`
    - `command_evidence[*].status`: `missing`

További anomália:
- Verifier artifact `git.commit_sha` régebbi commitre mutatott (`b70a168...`), miközben a bubble már round 19/20 dokumentációs állapotot állított.
- Ez stale vagy nem frissített verifier-state gyanút erősít.

### 2) `p11-h1-phase-0-doc-refine-2026-03-03`
Legfontosabb ellentmondás:
- Reviewer summary: clean review, tests pass, typecheck clean.
- Verifier artifact: `untrusted`, reason: `evidence_unverifiable`.

Konkrét hivatkozások:
- Bubble transcript approval request:
  - `/Users/felho/dev/make-it-legal/precedens.ai/.pairflow/bubbles/p11-h1-phase-0-doc-refine-2026-03-03/transcript.ndjson`
  - `msg_20260303_042` (round 14)
- Verifier artifact:
  - `/Users/felho/dev/make-it-legal/precedens.ai/.pairflow/bubbles/p11-h1-phase-0-doc-refine-2026-03-03/artifacts/reviewer-test-verification.json`
  - Fő jelek:
    - `status: "untrusted"`
    - `reason_code: "evidence_unverifiable"`
    - `reason_detail: "Unverifiable command evidence: pnpm test (unverifiable)."`
    - `pnpm typecheck` sor `verified`, de `explicit_exit_status: false`
    - `pnpm test` sor `unverifiable`

Mellékjelenség:
- A done-package bizonyos részei "trusted" állapotot állítottak, miközben az artifact aktuálisan `untrusted` maradt.

### 3) `p11-h1-phase-2-task-create-2026-03-03`
Itt pozitív referencia is látható:
- ugyanaz a workflow képes volt `trusted` verifier státuszt adni,
- ami arra utal, hogy nem általános használati hiba, hanem esetfüggő parser/mapping állapot vagy log-format érzékenység.

Konkrét hivatkozások:
- `/Users/felho/dev/make-it-legal/precedens.ai/.pairflow/bubbles/p11-h1-phase-2-task-create-2026-03-03/artifacts/reviewer-test-verification.json`
- `status: "trusted"`, `reason_code: "no_trigger"`, command evidence verified.

## Visszatérő mintázatok (root-cause hipotézisek)

### A) Command-normalizálási mismatch
A verifier `pnpm test` / `pnpm typecheck` canonical commandot vár, miközben gyakorlatban gyakori:
- `pnpm --dir 05_finder test`
- `pnpm --dir 05_finder exec tsc --noEmit` (typecheck fallback)

Ha mapping nincs tökéletesen vagy ugyanúgy értelmezve, a verifier missing/unverifiable állapotba esik.

### B) Log-format parser sérülékenység
Több esetben a tesztfutás láthatóan sikeres, mégis `unverifiable` lett.
Valószínű okok:
- hiányzó/inkonzisztens explicit completion marker,
- hiányzó explicit `EXIT_CODE` vagy parser által nem felismert forma,
- részleges log-snip alapján történő match, de verifikációs kritérium nem teljes.

### C) Summary-verifier gate szétcsúszás
A reviewer summary képes "PASS" állítást adni akkor is, ha a machine verifier artifact nem trusted.
Ez workflow design-probléma: a human-facing summary nincs hardenelve a verifier gate eredményéhez.

### D) Stale artifact / commit-pointer drift
Legalább egy esetben a verifier artifact commit SHA régebbi állapotot tükrözött, mint a bubble aktuális roundja.
Ez arra utal, hogy a verifier állapotfrissítés nem mindig a legfrissebb pass envelope-hoz kötődik megbízhatóan.

## Reprodukciós forgatókönyv (javaslat)
1. Indíts docs-only bubble-t és futtasd a validációt `pnpm --dir <subdir> test` + `pnpm --dir <subdir> exec tsc --noEmit` formában.
2. Adj summary-ban PASS állítást (tests/typecheck clean).
3. Hívd verifier artifact generálást.
4. Figyeld:
   - `status` trusted vagy untrusted,
   - `reason_code` (`evidence_missing` / `evidence_unverifiable`),
   - `command_evidence` source/matched_text/exit-status mezők.
5. Hasonlítsd össze a summary claimet az artifact-tel.

Várt bug-jel:
- summary PASS + verifier untrusted együttállás.

## Felhasználói impact
- Approval ciklusok feleslegesen hosszúra nyúlnak (újabb rework körök).
- Nem egyértelmű, hogy mi blocker: tartalmi minőség vs pipeline hiba.
- Bizalomvesztés a review-flow-ban ("nem haladunk").
- Agent/operator időveszteség: ugyanazok a körök újra és újra evidence egyeztetésre mennek el.

## Rövid workaround (amíg nincs fix)
1. Approval előfeltétel: kizárólag `reviewer-test-verification.status == trusted` esetén tekintsük greennek.
2. Canonical command policy:
   - vagy csak `pnpm test` / `pnpm typecheck` fut,
   - vagy a verifier oldalon legyen explicit canonicalization (`--dir`, `exec tsc --noEmit` equivalence).
3. Kötelező structured log footer:
   - `CMD:`
   - `EXIT_CODE:`
   - `STATUS:`
   - `TIMESTAMP_UTC:`
4. Summary guard:
   - ha verifier != trusted, summary ne írhasson "tests/typecheck clean" állítást.

## Javasolt termékjavítások (Pairflow)

### 1) Hard gate coupling
A CONVERGENCE/APPROVAL summary generálása előtt kötelező legyen a verifier state check.
- Ha `untrusted`, summary automatikusan jelölje "verification not trusted" állapotra.

### 2) Command alias/canonicalization layer
Verifikátor tudja ekvivalensnek:
- `pnpm --dir 05_finder test` == `pnpm test` (context-bound)
- `pnpm --dir 05_finder exec tsc --noEmit` == `pnpm typecheck` (ha script hiányzik)

### 3) Log parser robusztusítás
A verifier csak akkor mondjon `verified`/`pass` állítást, ha explicit:
- exit code,
- completion marker,
- command identity,
- timestamp
mind jelen van és parse-olható.

### 4) Freshness protection
Artifactbe kerüljön explicit "bound pass envelope" és "current HEAD" konzisztenciaellenőrzés.
Ha drift van, status legyen `stale` külön reason code-dal.

### 5) Machine-readable summary contract
A human summary mögött kötelező legyen egy gépi meta blokk (verification_status, evidence_refs, commit_sha), és ezt UI mutassa.

## További releváns fájlok
- Bubble artifacts:
  - `/Users/felho/dev/make-it-legal/precedens.ai/.pairflow/bubbles/ai-chat-session-idempotency-refine-2026-03-03/artifacts/reviewer-test-verification.json`
  - `/Users/felho/dev/make-it-legal/precedens.ai/.pairflow/bubbles/p11-h1-phase-0-doc-refine-2026-03-03/artifacts/reviewer-test-verification.json`
  - `/Users/felho/dev/make-it-legal/precedens.ai/.pairflow/bubbles/p11-h1-phase-2-task-create-2026-03-03/artifacts/reviewer-test-verification.json`
- Bubble transcripts:
  - `/Users/felho/dev/make-it-legal/precedens.ai/.pairflow/bubbles/ai-chat-session-idempotency-refine-2026-03-03/transcript.ndjson`
  - `/Users/felho/dev/make-it-legal/precedens.ai/.pairflow/bubbles/p11-h1-phase-0-doc-refine-2026-03-03/transcript.ndjson`
  - `/Users/felho/dev/make-it-legal/precedens.ai/.pairflow/bubbles/p11-h1-phase-2-task-create-2026-03-03/transcript.ndjson`
- Example evidence logs:
  - `/Users/felho/dev/make-it-legal/precedens.ai/.pairflow/evidence/ai-chat-session-idempotency-refine-2026-03-03-pnpm-test-r20.log`
  - `/Users/felho/dev/make-it-legal/precedens.ai/.pairflow/evidence/ai-chat-session-idempotency-refine-2026-03-03-pnpm-typecheck-r20.log`
  - `/Users/felho/dev/make-it-legal/precedens.ai/.pairflow/evidence/p11-h1-phase-0-doc-refine-2026-03-03-r17-pnpm-test.log`
  - `/Users/felho/dev/make-it-legal/precedens.ai/.pairflow/evidence/p11-h1-phase-0-doc-refine-2026-03-03-r17-pnpm-typecheck.log`

## Záró megállapítás
A jelenség elsődlegesen Pairflow verification/workflow integrációs probléma. A dokumentációs tartalmak jelentős része már reviewer-szinten elfogadott volt; a fő akadály a summary és machine verifier állapot visszatérő szétcsúszása.
