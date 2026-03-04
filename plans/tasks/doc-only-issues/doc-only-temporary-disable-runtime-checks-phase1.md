# Task: Docs-Only Runtime Check Requirement Temporary Disable (Phase 1)

## Context

A közelmúltbeli docs-only bubble körökben a `pnpm test` / `pnpm typecheck` futtatások többsége nem a dokumentumban állított konkrét futtatható claimet validálta, hanem általános repo/subproject check volt. Ez alacsony jelérték mellett magas operatív zajt és gate-inkonzisztenciát okozott.

## Goal

Ideiglenesen kapcsoljuk ki a docs-only bubble-kben a kötelező runtime check követelményt, hogy megszűnjenek a nem értelmes újrafuttatási körök.

## Scope

In scope:
1. Docs-only (`review_artifact_type=document`) esetben a kötelező test/typecheck expectation kikapcsolása.
2. Reviewer irányelvek és runtime kickoff üzenetek frissítése docs-only módra.
3. Dokumentáció frissítés a temp policy-ról.

Out of scope:
1. Claim-alapú célzott check pipeline teljes implementációja.
2. Markdown code snippet automatikus futtatás.

## Proposed Behavior

1. Ha bubble `review_artifact_type=document`, az orchestrator/reviewer runtime check expectation legyen optional.
2. Ha bubble `review_artifact_type=code` vagy `review_artifact_type=auto`, maradjon az eredeti (szigorúbb) viselkedés.
3. Docs-only handoff summary alapértelmezett formulája:
   - "docs-only scope, runtime checks not required in this round".
4. Ha docs-only körben mégis futott check, az opcionális evidence-ként kezelendő.

## Implementation Notes / Approach

Docs-only mód detektálás:
1. Forrás: `BubbleConfig.review_artifact_type` (`auto | code | document`).
2. Típusforrás: `ReviewArtifactType` import a `src/types/bubble.ts` fájlból.
3. Policy:
   - csak explicit `document` kap felmentést a kötelező runtime check alól,
   - `auto` marad eredeti viselkedésen (nincs implicit felmentés).

Data flow / plumbing:
1. A `BubbleConfig` már át van adva a verifier flow-ba (`pass.ts` -> `verifyImplementerTestEvidence`).
2. Kiegészítő, minimális plumbing szükséges a resolver API-n:
   - `reviewArtifactType` opcionális továbbítása a wrapper/call site felől a `resolveReviewerTestExecutionDirectiveFromArtifact()` függvénybe.
   - a `ResolveReviewerTestExecutionDirectiveInput` típus explicit bővítendő: `reviewArtifactType?: ReviewArtifactType`.

Konkrét logikai lépések:
1. `src/core/reviewer/testEvidence.ts`:
   - Current behavior:
     - evidence alapján artifact készül (`verifyImplementerTestEvidence()`), majd ebből reviewer directive deriválódik.
     - a függvény input típusa: `VerifyImplementerTestEvidenceInput` (a `bubbleConfig` mező már része az inputnak), ezért docs-only detektáláshoz itt nincs extra input-type bővítés.
     - a directive resolver (`resolveReviewerTestExecutionDirectiveFromArtifact`) trusted artifactnál freshness fingerprint checket futtat (`readWorktreeFingerprint()` + `compareFingerprint()`).
     - jelenleg nincs docs-only dedikált early-return guard a freshness check előtt; ezért docs-only null-git artifact esetén a freshness path `untrusted/evidence_stale` kimenetbe fordulhat.
   - Required change (primary/happy path):
     - a `verifyImplementerTestEvidence()` kapjon explicit docs-only rövidzár ágat:
     - beszúrási pont: a függvény eleje, `normalizeRequiredCommands()` hívás előtt (early return).
     - feltétel: `input.bubbleConfig.review_artifact_type === "document"`,
     - eredmény: teljes `ReviewerTestEvidenceArtifact` return (nem részleges mezőhalmaz):
       - `schema_version = reviewerTestEvidenceSchemaVersion`
       - `bubble_id = input.bubbleId`
       - `pass_envelope_id = input.envelope.id`
       - `pass_ts = input.envelope.ts`
       - `round = input.envelope.round`
       - `verified_at = now.toISOString()`
       - `status = "trusted"`
       - `decision = "skip_full_rerun"`
       - `reason_code = "no_trigger"`
       - `reason_detail = "docs-only scope, runtime checks not required"`
       - `required_commands = []`
       - `command_evidence = []`
       - `git = { commit_sha: null, status_hash: null, dirty: null }` (docs-only rövidzárnál nincs fingerprint olvasás).
   - Required change (directive resolver compatibility, kötelező):
     - **mindkét** resolver input bővüljön `reviewArtifactType?: ReviewArtifactType` mezővel:
       - `resolveReviewerTestExecutionDirective()` wrapper: a **named interface** `ResolveReviewerTestExecutionDirectiveInput` bővül (exportált, `src/core/reviewer/testEvidence.ts:75-78`).
       - `resolveReviewerTestExecutionDirectiveFromArtifact()`: az **inline object type** bővül (`input: { artifact; worktreePath; reviewArtifactType? }`). Ez NEM a named interface — a két input type külön entitás.
       - a wrapper továbbítja a `reviewArtifactType`-ot a `...FromArtifact` felé.
       - a `...FromArtifact` ezen az explicit inputon dönt.
     - `resolveReviewerTestExecutionDirectiveFromArtifact` kapjon explicit docs-only kompatibilitási ágat.
     - beszúrási pont: az `input.artifact.status !== "trusted"` guard után, és a `readWorktreeFingerprint()` hívás (691. sor) előtt, early returnként (gyakorlatban a 690. sor környéke).
     - elsődleges guard feltétel: `input.reviewArtifactType === "document"` (az adott beszúrási ponton az artifact státusz már eleve trusted).
     - explicit döntés: defense-in-depth miatt megtartható a redundáns `artifact.status === "trusted"` check is, de implementációs szempontból nem kötelező, mert közvetlenül előtte már megtörténik a `status !== "trusted"` korai visszatérés.
     - kompatibilitási fallback guard (ha `reviewArtifactType` hiányzik):
       - `artifact.decision === "skip_full_rerun"`
       - `artifact.reason_code === "no_trigger"`
       - `artifact.git.commit_sha === null`
     - megjegyzés: ez a fallback kizárólag backward compatibility célú védőháló; a primer döntés mindig az explicit `reviewArtifactType` input alapján történik.
     - eredmény:
       - fingerprint freshness check kihagyása,
       - `skip_full_rerun: true`,
       - `verification_status: "trusted"`,
       - `reason_detail: "docs-only scope, runtime checks not required"` (vagy artifact reason_detail).
   - Wrapper note:
     - a wrapperben nincs új döntési logika; csak az artifact olvasás marad, és az opcionális `reviewArtifactType` továbbítása a `...FromArtifact()` felé.
     - explicit wrapper hívásminta:
```ts
return resolveReviewerTestExecutionDirectiveFromArtifact({
  artifact,
  worktreePath: input.worktreePath,
  reviewArtifactType: input.reviewArtifactType
})
```
2. `src/core/agent/pass.ts`:
   - Current behavior:
     - a PASS nem blokkolja saját magát hiányzó evidence-re.
     - **evidence creation**: `verifyImplementerTestEvidence(...)` hívódik (`pass.ts` ~481-488), `.catch(() => undefined)` kezeléssel — ez a primary docs-only short-circuit pont, mert innen jön az artifact.
     - **directive resolution**: `resolveReviewerTestExecutionDirectiveFromArtifact({ artifact, worktreePath })` közvetlenül a `pass.ts`-ből hívódik (`~498-501`), nem a wrapperen keresztül.
     - ha verifier runtime hiba történik (evidence creation `.catch(() => undefined)` és/vagy artifact/directive feloldás sikertelen), a fallback directive `skip_full_rerun: false`, `reason_code: "evidence_unverifiable"`, `reason_detail: "Failed to resolve reviewer test directive due to verification runtime error."` értékekkel reviewer oldalon kötelező check futtatás felé terel.
     - fallback lokalizáció: `reviewerTestDirective = implementerDirective ?? { ... }` ág (`pass.ts` ~505-511).
   - Required change (primary path call site):
     - a `resolveReviewerTestExecutionDirectiveFromArtifact` hívás (`pass.ts` ~498-501) bővüljön:
       - `reviewArtifactType: resolved.bubbleConfig.review_artifact_type`.
     - cél: docs-only guard elsődlegesen explicit input alapján matcheljen, ne csak kompatibilitási artifact-fallbacken.
   - Required change (defense-in-depth, fallback path only):
     - explicit feltétel: `resolved.bubbleConfig.review_artifact_type === "document"`.
     - beszúrási pont: a `reviewerTestDirective = implementerDirective ?? { ... }` fallback objektum (`pass.ts` ~505-511); itt kell a docs-only-specifikus fallbackot bevezetni.
     - docs-only bubble esetén a fallback directive (`reviewerTestDirective` fallback ág) ne a jelenlegi `reason_code: "evidence_unverifiable"` értéket használja, hanem `skip_full_rerun: true`, `reason_code: "no_trigger"`, `reason_detail: "docs-only scope, runtime checks not required"`.
     - a fallback ág csak akkor aktiválódik, ha az elsődleges resolver út (`verifyImplementerTestEvidence` + artifact write + directive resolve) bármely ponton elhasal és `implementerDirective` undefined marad.
   - Kapcsolat tisztázás:
     - a `testEvidence.ts` docs-only rövidzár a primary/happy path.
     - a `pass.ts` módosítás kizárólag fallback védelmi ág, nem primary logika.
3. `src/core/runtime/reviewerGuidance.ts`:
   - célfüggvény: `buildReviewerAgentSelectionGuidance()`.
   - current document branch kezdete: `"IMPORTANT: This bubble primarily targets document/task artifacts. ..."` (fájl eleji, kb. 10-12. sor).
   - a meglévő `document` branch return string végéhez hozzáfűzésre kerül explicit mondat:
   - `"Runtime checks are not required for document-only scope."`
4. `src/core/runtime/tmuxDelivery.ts`:
   - közvetlen logikai módosítás nem kötelező; a docs-only üzenet elsődlegesen a directive formázásból jön.
   - mechanizmus: a delivery message a `formatReviewerTestExecutionDirective()` kimenetét illeszti be; ha a docs-only directive helyes (`skip_full_rerun + reason_detail`), a megfelelő szöveg automatikusan megjelenik.
   - pontosítás: a `formatReviewerTestExecutionDirective()` a `src/core/reviewer/testEvidence.ts` fájlban van definiálva, és importon keresztül használja a `tmuxDelivery.ts`.
   - csak akkor kell módosítani, ha a fenti directive szövegen felül külön statikus mondatot is akarunk a delivery message-be.
5. `src/core/bubble/startBubble.ts`:
   - Current behavior:
     - `buildImplementerEvidenceHandoffGuidance()` jelenleg 0 paraméteres private helper, statikus evidence-gyűjtési szöveggel.
   - kötelező döntés: `buildImplementerEvidenceHandoffGuidance()` paraméterlistája bővül `reviewArtifactType: ReviewArtifactType` mezővel (nem closure).
   - a helper (nem exportált/private) szövegében explicit legyen: docs-only scope-ban runtime evidence gyűjtés nem kötelező.
   - hívási lánc (hol használódik a helper):
     - `buildImplementerStartupPrompt()` -> `buildImplementerEvidenceHandoffGuidance()`
     - `buildImplementerKickoffMessage()` -> `buildImplementerEvidenceHandoffGuidance()`
     - `buildResumeImplementerStartupPrompt()` -> `buildImplementerEvidenceHandoffGuidance()`
     - `buildResumeImplementerKickoffMessage()` -> `buildImplementerEvidenceHandoffGuidance()`
   - current signaturek (módosítás előtt):
     - `buildImplementerStartupPrompt({ bubbleId, repoPath, worktreePath, taskArtifactPath, donePackagePath })`
     - `buildImplementerKickoffMessage({ bubbleId, taskArtifactPath })`
     - `buildResumeImplementerStartupPrompt({ bubbleId, repoPath, worktreePath, taskArtifactPath, donePackagePath, state, transcriptSummary, kickoffDiagnostic? })`
     - `buildResumeImplementerKickoffMessage({ bubbleId, taskArtifactPath, round })`
   - required signature change:
     - mind a 4 implementer-fókuszú builder inputja bővül `reviewArtifactType: ReviewArtifactType` mezővel.
   - minden releváns hívási út frissítendő az új paraméterre:
     - `buildImplementerStartupPrompt()` -> `reviewArtifactType` forrása: `resolved.bubbleConfig.review_artifact_type`.
     - `buildImplementerKickoffMessage()` -> `reviewArtifactType` forrása: `resolved.bubbleConfig.review_artifact_type`.
     - `buildResumeImplementerStartupPrompt()` -> `reviewArtifactType` forrása: `resolved.bubbleConfig.review_artifact_type`.
     - `buildResumeImplementerKickoffMessage()` -> `reviewArtifactType` forrása: `resolved.bubbleConfig.review_artifact_type`.
   - resolver wrapper call site (resume path):
     - a `resolveReviewerTestExecutionDirective({...})` hívás (`startBubble.ts` ~550-558) bővüljön:
       - `reviewArtifactType: resolved.bubbleConfig.review_artifact_type`.
     - pontosítás: ez a wrapper-hívás közvetlenül formatálva van (`.then((directive) => formatReviewerTestExecutionDirective(directive)).catch(() => undefined)`), ezért a docs-only guard kezelése a resolver inputnál történik, nem a formatált stringen.
6. `tests/helpers/bubble.ts`:
   - current input shape: `{ bubbleId, repoPath, task, startedAt?, reviewerBrief?, accuracyCritical? }`.
   - kötelező döntés: `setupRunningBubbleFixture` bővüljön `reviewArtifactType?: ReviewArtifactType` paraméterrel, hogy a tesztek determinisztikusan állíthassák a bubble típust.
   - implementációs részlet:
      - a helper jelenleg `createBubble()`-t hív, ahol a `review_artifact_type` alapból task-inferencia (`inferReviewArtifactType`) alapján épül.
      - explicit fixture override esetén a létrehozás után a configot és a `bubble.toml`-t is szinkronban kell frissíteni (`renderBubbleConfigToml` -> `created.paths.bubbleTomlPath`), különben a lookup/workspace-resolution réteg eltérő értéket láthat.
      - import forrás: `renderBubbleConfigToml` a `src/config/bubbleConfig.ts`-ből (alternatíva: projekt barrel export, ha van).
     - javasolt konkrét szinkronlépés (in-memory config + `bubble.toml` együtt frissítve):
```ts
const overriddenConfig = { ...created.config, review_artifact_type: reviewArtifactType };
const overriddenCreated = { ...created, config: overriddenConfig };
await writeFile(
  overriddenCreated.paths.bubbleTomlPath,
  renderBubbleConfigToml(overriddenConfig),
  "utf8"
);
return overriddenCreated;
```
   - ahol nem kell explicit típus, maradhat a jelenlegi inferencia alapú viselkedés.

Interfész/mező mapping (docs-only short-circuit):
1. `ReviewerTestEvidenceArtifact`:
   - `artifact.schema_version = reviewerTestEvidenceSchemaVersion`
   - `artifact.bubble_id = input.bubbleId`
   - `artifact.pass_envelope_id = input.envelope.id`
   - `artifact.pass_ts = input.envelope.ts`
   - `artifact.round = input.envelope.round`
   - `artifact.verified_at = now.toISOString()`
   - `artifact.status = "trusted"`
   - `artifact.decision = "skip_full_rerun"`
   - `artifact.reason_code = "no_trigger"`
   - `artifact.reason_detail = "docs-only scope, runtime checks not required"`
   - `artifact.required_commands = []`
   - `artifact.command_evidence = []`
   - `artifact.git = { commit_sha: null, status_hash: null, dirty: null }`
2. `ReviewerTestExecutionDirective` (artifactből derivált):
   - `directive.skip_full_rerun = true`
   - `directive.reason_code = "no_trigger"`
   - `directive.reason_detail = "docs-only scope, runtime checks not required"`
   - `directive.verification_status = "trusted"`
3. Resolver input contract:
   - wrapper: `resolveReviewerTestExecutionDirective({ artifactPath, worktreePath, reviewArtifactType? })` — named interface `ResolveReviewerTestExecutionDirectiveInput` bővül.
   - direct: `resolveReviewerTestExecutionDirectiveFromArtifact({ artifact, worktreePath, reviewArtifactType? })` — **inline object type** bővül (NEM a named interface).
   - wrapper call site-ok:
     - `src/core/bubble/startBubble.ts` (`resolveReviewerTestExecutionDirective` resume path, ~550-558).
     - wrapper unit tesztek (`tests/core/reviewer/testEvidence.test.ts`).
   - direct `...FromArtifact` call site-ok:
     - `src/core/agent/pass.ts` (`~498-501`).
   - `reviewArtifactType` hiányában legacy compatibility guard marad aktív.

## Implementation Order

1. TDD-step 1: `tests/core/reviewer/testEvidence.test.ts` új/updated esetek (docs-only, code, auto, missing/invalid artifact type), majd `testEvidence.ts` implementáció.
2. TDD-step 2: `tests/core/agent/pass.test.ts` fallback defense-in-depth esetek, majd `pass.ts` implementáció.
3. TDD-step 3: `tests/core/runtime/reviewerGuidance.test.ts` (új; document + code + auto baseline), majd `reviewerGuidance.ts` szövegfrissítés.
4. TDD-step 4: `tests/core/bubble/startBubble.test.ts` implementer guidance paraméterezésre, majd `startBubble.ts` implementáció.
5. `tmuxDelivery.ts` módosítás opcionális, csak ha a meglévő `formatReviewerTestExecutionDirective()` output nem adja ki az elvárt docs-only üzenetet (lásd közvetlenül alatta: "Step 5 decision checklist").

Step 5 decision checklist (`tmuxDelivery.ts`):
1. Futtasd a `tests/core/runtime/tmuxDelivery.test.ts` docs-only esetét olyan directive-tel, ahol `skip_full_rerun=true` és `reason_detail` docs-only szöveg.
2. Ha a message tartalmazza:
   - `"Implementer test evidence has been orchestrator-verified."`
   - `"Do not re-run full tests unless a trigger from the decision matrix applies."`
   - `"Reason: docs-only scope, runtime checks not required"`
   akkor `tmuxDelivery.ts` nem módosítandó.
3. Ha bármelyik hiányzik, akkor célzott `tmuxDelivery.ts` módosítás szükséges (kizárólag formázási/illesztési szinten).

## Suggested Touchpoints

Megjegyzés: ez referencia-lista; a végrehajtási sorrend elsődlegesen az `Implementation Order` szerint történik.

1. `src/core/reviewer/testEvidence.ts`
2. `tests/core/reviewer/testEvidence.test.ts`
3. `src/core/agent/pass.ts`
4. `tests/core/agent/pass.test.ts`
5. `src/core/runtime/reviewerGuidance.ts`
6. `tests/core/runtime/reviewerGuidance.test.ts` (új)
7. `src/core/bubble/startBubble.ts`
8. `tests/core/bubble/startBubble.test.ts`
9. `tests/helpers/bubble.ts`
10. `src/core/runtime/tmuxDelivery.ts` (opcionális; alapértelmezésben nem szükséges módosítani)
11. `tests/core/runtime/tmuxDelivery.test.ts` (integration guard a directive szövegezésre)
12. `README.md` vagy releváns docs

## Acceptance Criteria

1. Docs-only bubble esetén check hiány miatt nem keletkezik automatikus blocker.
2. Docs-only bubble-ben a reviewer directive `skip_full_rerun` ágon megy, `reason_detail` tartalmazza: "docs-only scope, runtime checks not required".
3. Docs-only rövidzáras artifact a directive resolveren átmenve sem fordul `evidence_stale`/`untrusted` állapotba.
4. Reviewer kickoff/guidance docs-only módban nem követel kötelező runtime checket, és explicit "runtime checks not required" jelzést ad.
5. `review_artifact_type=auto` esetén az eredeti check expectation marad.
6. `review_artifact_type=code` esetén az eredeti check expectation marad.
7. Nem docs-only bubble-ök jelenlegi működése változatlan.
8. Van célzott teszt docs-only, code, auto artifact típusokra is.
9. Implementer startup prompt (`buildImplementerStartupPrompt`) és startup/evidence guidance docs-only módban sem ír elő kötelező runtime evidence gyűjtést.
10. Ha a `review_artifact_type` hiányzik vagy unexpected érték, az eredeti (strict) viselkedés marad érvényben (nincs implicit docs-only felmentés).
11. A resolver docs-only guard elsődlegesen explicit `reviewArtifactType=document` inputon működik; a mezőszintű artifact guard csak kompatibilitási fallback.

## Test Plan

1. Unit: `tests/core/reviewer/testEvidence.test.ts`
   - státusz: meglévő tesztfájl, bővítendő új test case-ekkel.
   - Megjegyzés: a `setupRunningBubbleFixture` helper bővítendő `reviewArtifactType?: ReviewArtifactType` paraméterrel; elsődlegesen ezt használjuk determinisztikus típusbeállításra.
   - Legacy/inferencia ág tesztekben továbbra is megmaradhat docs-jellegű task szöveg az `inferReviewArtifactType` validálására.
   - docs-only config mellett `verifyImplementerTestEvidence()` `trusted + skip_full_rerun` eredményt ad, üres command listákkal.
   - docs-only short-circuit artifact a `resolveReviewerTestExecutionDirectiveFromArtifact` híváson át is `skip_full_rerun: true` + `verification_status: "trusted"` marad.
   - code config mellett hiányzó runtime evidence továbbra is szigorú.
   - auto config mellett hiányzó runtime evidence továbbra is szigorú.
   - `review_artifact_type = undefined` (vagy hiányzó mező) esetén strict viselkedés marad.
   - invalid artifact type (tesztben `as unknown as ReviewArtifactType`) esetén strict viselkedés marad.
2. Unit: `tests/core/agent/pass.test.ts`
   - státusz: meglévő tesztfájl, bővítendő.
   - docs-only implementer PASS esetén a reviewer directive ne `run_checks` fallback legyen.
   - code/auto bubble esetén hiányzó evidence továbbra is a meglévő szigorú flow szerint működik.
3. Integration/Prompt: `tests/core/runtime/tmuxDelivery.test.ts`
   - státusz: meglévő tesztfájl, bővítendő docs-only assertionökkel.
   - Megjegyzés: a `baseConfig` fixture jellemzően `review_artifact_type="auto"` értékkel indul; ezt tesztszinten variálni kell `document`/`code` esetekre.
   - Megjegyzés: a fájlban már van document override minta (pl. dokumentum-típus explicit beállítása); ezt kell követni.
   - Megjegyzés: ez integration guard; `tmuxDelivery.ts` kódmódosítás csak akkor szükséges, ha a directive-en felül extra statikus docs-only mondatot is be akarunk szúrni.
   - docs-only reviewer delivery message tartalmazza:
     - `"Implementer test evidence has been orchestrator-verified."`
     - `"Do not re-run full tests unless a trigger from the decision matrix applies."`
     - `"docs-only scope, runtime checks not required"` (reason_detail).
   - code/auto módban a "Run required checks" (vagy ekvivalens) elvárás megmarad.
   - döntési szabály: ha a fenti assertionök már teljesülnek pusztán a `formatReviewerTestExecutionDirective()` meglévő outputjával, `tmuxDelivery.ts` kódmódosítás nem szükséges.
   - csak akkor kell `tmuxDelivery.ts` módosítás, ha a formatter outputja nem hozza a kívánt docs-only üzenetet.
4. Unit: `tests/core/runtime/reviewerGuidance.test.ts` (új)
   - státusz: új tesztfájl.
   - helper/fixture: nem szükséges bubble fixture; közvetlen unit teszt a `buildReviewerAgentSelectionGuidance(reviewArtifactType)` függvényre.
   - document ág tartalmazza a "Runtime checks are not required for document-only scope." mondatot.
   - code ág baseline szövege változatlan (kód-reviewer preferencia).
   - auto ág baseline szövege változatlan (deliverable-type alapú guidance).
5. Unit/Integration: `tests/core/bubble/startBubble.test.ts`
   - státusz: meglévő tesztfájl, bővítendő.
   - implementer startup/evidence guidance docs-only módban tartalmazza, hogy runtime checks/evidence optional.
   - code/auto bubble esetén megmarad az eredeti evidence-gyűjtési elvárás.

## Rollback

1. Ha az ideiglenes felmentés túl magas false-green kockázatot okoz, rollback elsődleges módja: commit revert.
2. Opcionális következő iterációban: feature flag alapú ki/be kapcsolhatóság.

## Migration / Breaking Change Note

1. Nem breaking change.
2. Policy-módosítás: explicit `document` artifact típus esetén lazább runtime check requirement.

## Edge Cases

1. Ha egy váratlan/invalid docs-only artifact állapot miatt a resolver guard mégsem matchel (pl. manuálisan írt artifact inkonzisztens mezőkkel), a freshness összehasonlítás null `commit_sha` mellett is a meglévő biztonságos fallbackbe (`untrusted` / `evidence_stale`) esik, nem false-green irányba.
2. Ha egy bubble `review_artifact_type` értéke menet közben manuálisan átíródik (config-edit), a subsequent parancsok az aktuálisan betöltött configot fogják használni; ez nem támogatott operatív flow, ezért policy szerint kerülendő. Konzervatív elv: inkonzisztencia esetén strict (nem docs-only) viselkedést kell preferálni.
3. Ha `bubbleConfig` mégsem elérhető a verifier flow-ban (elméletileg típus-szerződésszegés), a docs-only ág nem tekinthető megbízhatónak; fail-safe fallback: `skip_full_rerun: false` + unverifiable/stale jellegű strict út.
