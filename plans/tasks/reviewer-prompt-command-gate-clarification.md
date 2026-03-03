# Task: Reviewer Prompt Command-Gate Clarification

## Goal

Rögzíteni a két reviewer prompt-változatot (startup + transition), és dokumentálni a jelenlegi félrevezető pontokat, amelyek `PASS` loophoz vezethetnek akkor is, amikor a reviewernek már `converged`-et kellene futtatnia.

## Background

Jelen tünet:
1. Több körön át reviewer oldalon `findings=[]` / non-blocker jellegű eredmény látszik.
2. A bubble mégis `RUNNING` marad, mert `converged` helyett újabb `pass` megy.

Feltételezett ok:
1. A reviewer promptban több, egymással részben ütköző command-döntési utasítás van.
2. A prompt több ponton `PASS`-centrikus nyelvet használ (`PASS package`, `PASS output contract`), ami implicit defaulttá teszi a `pass` parancsot.

## Captured Prompt 1 (Transition Message Variant)

Forrás (chat snapshot): implementer -> reviewer handoff üzenet.

Nyitó sor (verbatim):

```text
# [pairflow] r7 PASS codex->claude msg=msg_20260303_016 ref=.pairflow/evidence/typecheck.log. Action: Implementer handoff received. Run a fresh review now.
```

Megjegyzés:
1. A prompt további része tartalmazza a teljes Severity Ontology beágyazott szöveget, decision mappinget, Phase 1 reviewer flow-t, és a command végrehajtási utasítást.
2. A body lényegileg megegyezik a startup variánssal.

## Captured Prompt 2 (Reviewer Startup Variant)

Forrás (chat snapshot): reviewer indításakor küldött prompt.

Nyitó sor (verbatim):

```text
# [pairflow] r7 PASS codex->claude msg=msg_20260303_016 ref=.pairflow/evidence/typecheck.log. Action: Implementer handoff received. Run a fresh review now.
```

Megjegyzés:
1. A user szerint ez a startup prompt variáns, és a transition prompttal "mainly the same".
2. A releváns döntési blokkok (Severity ontology, Decision Mapping, reviewer round flow, PASS/CONVERGED command utasítás) azonos vagy közel azonos tartalmúak.

## Shared Prompt Body (Key Verbatim Blocks)

Az alábbi blokkok mindkét prompt-változatban jelen vannak (verbatim részletek):

```text
Decision Mapping
Any `P0/P1` present: reviewer should request a fix cycle.
Only `P2/P3`: reviewer should prefer convergence with notes (policy rollout dependent).
Clean: reviewer converges.
```

```text
4) `Final Consolidation`: deduplicate again across primary + expansion findings, calibrate severity, then emit one final reviewer PASS package that follows the deterministic section/field contract below.
```

```text
Required reviewer PASS output contract (machine-checkable): include exactly these sections in this order:
`Scout Coverage`, `Deduplicated Findings`, `Issue-Class Expansions`, `Residual Risk / Notes`.
```

```text
If findings remain, run `pairflow pass --summary ... --finding 'P1:...|artifact://...'` ...
If clean, run `pairflow converged --summary` directly (do not run `pairflow pass --no-findings` first).
```

```text
Execute pairflow commands directly (no confirmation prompt).
Run pairflow commands from worktree: /Users/felho/dev/.pairflow-worktrees/pairflow/reviewer-brief-injection-and-enforcement-phase1.
```

## Assessment (Potentially Misleading Instructions)

### A. `PASS`-bias a prompt nyelvében

1. `emit one final reviewer PASS package` és `Required reviewer PASS output contract` nyelvhasználat implicit defaulttá teszi a `pass` parancsot.
2. Ez még akkor is `pass` irányba tolhat, amikor a tartalom alapján már `converged` lenne helyes.

### B. Ellentmondásos döntési jelzések

1. A `Decision Mapping` szerint `Only P2/P3` esetén convergence preferált.
2. Ugyanakkor a `If findings remain, run pairflow pass` szabály minden findingra pass-t sugallhat.
3. Így a reviewer könnyen úgy értelmezi: "van finding (akár non-blocker), akkor pass".

### C. `policy rollout dependent` bizonytalanság

1. Runtime promptban ez túl homályos.
2. Döntési ponton nem derül ki determinisztikusan, hogy most ténylegesen pass vagy converged kell.

### D. Hiányzó explicit command gate

1. Nincs top-priority, rövid, félreérthetetlen parancsválasztó szabály.
2. Emiatt a hosszú promptban elveszik a kritikus döntési logika.

### E. Anti-loop stop szabály hiánya

1. Nincs kimondva, hogy non-blocker-only esetben (P2/P3 note szint) a loopot le kell zárni.
2. Ez támogatja az "üres vagy nem-blokkoló PASS körök" fennmaradását.

## Proposed Prompt Fix (Targeted)

Beillesztendő a prompt elejére, `Highest Priority` blokkként:

```text
Command Decision Gate (Highest Priority)
- If any blocker finding remains (P0/P1 with evidence, or explicitly must-fix), run:
  pairflow pass --summary ... [--finding ...]
- If no blocker findings remain (only P2/P3 notes or clean), run:
  pairflow converged --summary ...
- Never use pairflow pass --no-findings.
- Do not send PASS with findings=[].
```

További pontosítás:
1. `Required reviewer PASS output contract` -> `Required reviewer output contract (applies to PASS and CONVERGED)`.
2. `policy rollout dependent` kifejezést runtime promptból el kell távolítani vagy explicit policy-értékre kell cserélni.
3. A `If findings remain, run pairflow pass` sort szűkíteni kell blocker/must-fix findingokra.

## Acceptance Criteria (For Follow-up Fix)

1. Reviewer prompt tartalmaz explicit, top-priority `Command Decision Gate` blokkot.
2. Non-blocker-only (`P2/P3`) review esetén reviewer `converged` irányba terelt (nem `pass`).
3. Prompt terminológia nem `PASS`-centrikus, hanem parancs-semleges output contractot használ.
4. Nem jelenik meg runtime-ban a bizonytalan `policy rollout dependent` formula.
5. E2E bubble tesztben megszűnik az ismételt `findings=[]` melletti PASS loop.

## Notes

1. Ez a task dokumentációs/irányelvi tisztázás; implementáció külön feladatban javasolt.
2. A két prompt variáns összehangolása kötelező (startup + transition), hogy ne legyen policy drift.

## Reference Prompts (Verbatim from User Input)

### Prompt A (Transition Message Variant)

```text
# [pairflow] r7 PASS codex->claude msg=msg_20260303_016 ref=.pairflow/evidence/typecheck.log. Action: Implementer handoff received. Run a fresh review now. IMPORTANT: Choose review mode by deliverable type. For code-centric changes, prefer `feature-dev:code-reviewer` (fall back to `/review` if unavailable). For document-centric tasks, use document-focused review and do not force
  code-reviewer. Severity Ontology v1 reminder (embedded from canonical docs at build-time: `docs/reviewer-severity-ontology.md#runtime-reminder`): Blocker severities (`P0/P1`) require concrete evidence (repro, failing check output, or precise code-path proof). Without blocker-grade evidence (`P0/P1`), downgrade to `P2` by default. Cosmetic/comment-only findings are `P3`. Out-of-scope
  observations should be notes (`P3`), not mandatory fix findings. Full canonical ontology (embedded from `docs/reviewer-severity-ontology.md`): Reviewer Severity Ontology (v1) **Date:** 2026-02-28 **Status:** Canonical policy (active) Purpose This document is the canonical severity policy for reviewer findings. Goals: Keep `P0/P1/P2/P3` stable across rounds. Prevent severity inflation and
  deflation. Make reviewer decisions predictable and auditable. Scope This ontology applies to reviewer findings in Pairflow loops. It does not replace task acceptance criteria; it complements them. Runtime Reminder Block (Build Source) The block below is the canonical source for runtime reviewer reminder text. It is consumed by a build/codegen step and embedded into TypeScript so runtime
  prompts do not depend on reading this markdown file from disk. Blocker severities (`P0/P1`) require concrete evidence (repro, failing check output, or precise code-path proof). Without blocker-grade evidence (`P0/P1`), downgrade to `P2` by default. Cosmetic/comment-only findings are `P3`. Out-of-scope observations should be notes (`P3`), not mandatory fix findings. Severity Definitions
  Severity Meaning Typical examples `P0` Critical blocker-level correctness/safety/runtime risk (highest urgency) confirmed data loss path, critical security exposure, deterministic corruption/destructive behavior `P1` Blocker-level correctness/safety/runtime risk data loss, crash, security issue, race condition, incorrect state transition, deterministic wrong behavior `P2` Real
  functional/quality gap, but not a blocker missing edge-case handling, meaningful test gap, misleading logic with plausible future defect risk `P3` Non-blocking improvement naming, comments, minor consistency/refactor/documentation cleanup Evidence Requirement by Severity `P0` evidence (required) At least one of: Deterministic reproduction steps. Concrete failing test or failing check
  output. Precise code-path proof showing incorrect runtime behavior. Without blocker-grade evidence (`P0/P1`), downgrade to `P2` by default. `P1` evidence (required) At least one of: Deterministic reproduction steps. Concrete failing test or failing check output. Precise code-path proof showing incorrect runtime behavior. Without blocker-grade evidence (`P0/P1`), downgrade to `P2` by
  default. `P2` evidence (required) Concrete functional or quality risk statement. Traceable location/path. Clear expected-vs-actual explanation. `P3` evidence (lightweight) Localized suggestion and rationale. Stability Rules (Anti-Drift) Cosmetic/comment-only findings cannot be `P2+`. Severity cannot escalate across rounds without new evidence. "Might be risky" claims are not `P0/P1` by
  default. Out-of-scope observations default to note-level (`P3`/informational), not mandatory fix findings. Reviewer should avoid contradictory follow-up direction unless new evidence justifies the change. Reviewer Output Contract Each finding should include: `severity` `title` `why_this_severity` (short) `evidence` (repro/test/code-path) `scope_link` (acceptance criterion or explicit risk
  category) Runtime PASS Evidence Binding Reviewer PASS with any `P0/P1` finding must have evidence bound at finding level: Preferred CLI form: `--finding "P1:Title|ref1,ref2"` (maps to `finding.refs`). If a single ref contains a comma, escape it as `\,` inside the `--finding` value. Envelope-level `--ref` values are optional generic artifacts only; they do not satisfy blocker finding
  evidence binding. If a `P0/P1` finding has no finding-level refs, PASS is rejected. Decision Mapping Any `P0/P1` present: reviewer should request a fix cycle. Only `P2/P3`: reviewer should prefer convergence with notes (policy rollout dependent). Clean: reviewer converges. Operational Use This file is intended to be: Referenced by optimization/tracker docs. Reflected in reviewer prompt
  templates and handoff guidance. Used as review calibration baseline in loop metrics analysis. Implementer test evidence has been orchestrator-verified. Do not re-run full tests unless a trigger from the decision matrix applies. Decision matrix triggers that still require tests: evidence missing/unverifiable/stale, reviewer-requested scope changes, high-risk domains
  (concurrency/persistence/auth/security/destructive flows), or flaky/infra uncertainty. Reason: Evidence is verified, fresh, and complete. Phase 1 reviewer round flow (prompt-level only): 1) `Parallel Scout Scan`: must run exactly `required_scout_agents=2` scout scans on the same local diff scope (`max_scout_agents=2` hard cap) with explicit cap `max_scout_candidates_per_agent=8`; include
  only concrete location-backed findings, exclude style/preference-only notes. 2) `Deduplicate + Classify`: merge scout findings, deduplicate by root cause + overlapping location, then classify each finding as `one_off` or issue class (`race_condition`, `lifecycle_symmetry`, `timeout_cancellation`, `idempotency`, `concurrency_guard`, `other`). If class detection is uncertain, classify as
  `one_off`. 3) `Issue-Class Expansion` (conditional): run only for issue-class findings, at most one expansion run per class per round, with `max_class_expansions_per_round=2` and explicit cap `max_expansion_siblings_per_class=5`. Expansion scope is limited to changed files + directly related call-sites; repo-wide expansion scans are forbidden. Stop rules: stop expansion immediately when no
   new concrete locations are found; also stop when class/round caps are reached. 4) `Final Consolidation`: deduplicate again across primary + expansion findings, calibrate severity, then emit one final reviewer PASS package that follows the deterministic section/field contract below. Required reviewer PASS output contract (machine-checkable): include exactly these sections in this order:
  `Scout Coverage`, `Deduplicated Findings`, `Issue-Class Expansions`, `Residual Risk / Notes`. `Scout Coverage` required fields: `scouts_executed`, `scope_covered`, `guardrail_confirmation`, `raw_candidates_count`, `deduplicated_count`. `Deduplicated Findings` entry fields: `title`, `severity`, `class`, `locations`, `evidence`, `expansion_siblings`. `Issue-Class Expansions` entry fields:
  `class`, `source_finding_title`, `scan_scope`, `siblings`, `stop_reason`. `class` must be `one_off` or one issue class (`race_condition`, `lifecycle_symmetry`, `timeout_cancellation`, `idempotency`, `concurrency_guard`, `other`). `locations` must contain at least one concrete location. Explicit empty-case format is mandatory: if no deduplicated findings, render `Deduplicated Findings: []`;
   if no issue-class expansions, render `Issue-Class Expansions: []`. If findings remain, run `pairflow pass --summary ... --finding 'P1:...|artifact://...'` (repeatable; for P0/P1 include finding-level refs). If clean, run `pairflow converged --summary` directly (do not run `pairflow pass --no-findings` first). Execute pairflow commands directly (no confirmation prompt). Run pairflow
  commands from worktree: /Users/felho/dev/.pairflow-worktrees/pairflow/reviewer-brief-injection-and-enforcement-phase1.
```

### Prompt B (Reviewer Startup Variant)

```text
# [pairflow] r7 PASS codex->claude msg=msg_20260303_016 ref=.pairflow/evidence/typecheck.log. Action: Implementer handoff received. Run a fresh review now. IMPORTANT: Choose review mode by deliverable type. For code-centric changes, prefer `feature-dev:code-reviewer` (fall back to `/review` if unavailable). For document-centric tasks, use document-focused review and do not force
  code-reviewer. Severity Ontology v1 reminder (embedded from canonical docs at build-time: `docs/reviewer-severity-ontology.md#runtime-reminder`): Blocker severities (`P0/P1`) require concrete evidence (repro, failing check output, or precise code-path proof). Without blocker-grade evidence (`P0/P1`), downgrade to `P2` by default. Cosmetic/comment-only findings are `P3`. Out-of-scope
  observations should be notes (`P3`), not mandatory fix findings. Full canonical ontology (embedded from `docs/reviewer-severity-ontology.md`): Reviewer Severity Ontology (v1) **Date:** 2026-02-28 **Status:** Canonical policy (active) Purpose This document is the canonical severity policy for reviewer findings. Goals: Keep `P0/P1/P2/P3` stable across rounds. Prevent severity inflation and
  deflation. Make reviewer decisions predictable and auditable. Scope This ontology applies to reviewer findings in Pairflow loops. It does not replace task acceptance criteria; it complements them. Runtime Reminder Block (Build Source) The block below is the canonical source for runtime reviewer reminder text. It is consumed by a build/codegen step and embedded into TypeScript so runtime
  prompts do not depend on reading this markdown file from disk. Blocker severities (`P0/P1`) require concrete evidence (repro, failing check output, or precise code-path proof). Without blocker-grade evidence (`P0/P1`), downgrade to `P2` by default. Cosmetic/comment-only findings are `P3`. Out-of-scope observations should be notes (`P3`), not mandatory fix findings. Severity Definitions
  Severity Meaning Typical examples `P0` Critical blocker-level correctness/safety/runtime risk (highest urgency) confirmed data loss path, critical security exposure, deterministic corruption/destructive behavior `P1` Blocker-level correctness/safety/runtime risk data loss, crash, security issue, race condition, incorrect state transition, deterministic wrong behavior `P2` Real
  functional/quality gap, but not a blocker missing edge-case handling, meaningful test gap, misleading logic with plausible future defect risk `P3` Non-blocking improvement naming, comments, minor consistency/refactor/documentation cleanup Evidence Requirement by Severity `P0` evidence (required) At least one of: Deterministic reproduction steps. Concrete failing test or failing check
  output. Precise code-path proof showing incorrect runtime behavior. Without blocker-grade evidence (`P0/P1`), downgrade to `P2` by default. `P1` evidence (required) At least one of: Deterministic reproduction steps. Concrete failing test or failing check output. Precise code-path proof showing incorrect runtime behavior. Without blocker-grade evidence (`P0/P1`), downgrade to `P2` by
  default. `P2` evidence (required) Concrete functional or quality risk statement. Traceable location/path. Clear expected-vs-actual explanation. `P3` evidence (lightweight) Localized suggestion and rationale. Stability Rules (Anti-Drift) Cosmetic/comment-only findings cannot be `P2+`. Severity cannot escalate across rounds without new evidence. "Might be risky" claims are not `P0/P1` by
  default. Out-of-scope observations default to note-level (`P3`/informational), not mandatory fix findings. Reviewer should avoid contradictory follow-up direction unless new evidence justifies the change. Reviewer Output Contract Each finding should include: `severity` `title` `why_this_severity` (short) `evidence` (repro/test/code-path) `scope_link` (acceptance criterion or explicit risk
  category) Runtime PASS Evidence Binding Reviewer PASS with any `P0/P1` finding must have evidence bound at finding level: Preferred CLI form: `--finding "P1:Title|ref1,ref2"` (maps to `finding.refs`). If a single ref contains a comma, escape it as `\,` inside the `--finding` value. Envelope-level `--ref` values are optional generic artifacts only; they do not satisfy blocker finding
  evidence binding. If a `P0/P1` finding has no finding-level refs, PASS is rejected. Decision Mapping Any `P0/P1` present: reviewer should request a fix cycle. Only `P2/P3`: reviewer should prefer convergence with notes (policy rollout dependent). Clean: reviewer converges. Operational Use This file is intended to be: Referenced by optimization/tracker docs. Reflected in reviewer prompt
  templates and handoff guidance. Used as review calibration baseline in loop metrics analysis. Implementer test evidence has been orchestrator-verified. Do not re-run full tests unless a trigger from the decision matrix applies. Decision matrix triggers that still require tests: evidence missing/unverifiable/stale, reviewer-requested scope changes, high-risk domains
  (concurrency/persistence/auth/security/destructive flows), or flaky/infra uncertainty. Reason: Evidence is verified, fresh, and complete. Phase 1 reviewer round flow (prompt-level only): 1) `Parallel Scout Scan`: must run exactly `required_scout_agents=2` scout scans on the same local diff scope (`max_scout_agents=2` hard cap) with explicit cap `max_scout_candidates_per_agent=8`; include
  only concrete location-backed findings, exclude style/preference-only notes. 2) `Deduplicate + Classify`: merge scout findings, deduplicate by root cause + overlapping location, then classify each finding as `one_off` or issue class (`race_condition`, `lifecycle_symmetry`, `timeout_cancellation`, `idempotency`, `concurrency_guard`, `other`). If class detection is uncertain, classify as
  `one_off`. 3) `Issue-Class Expansion` (conditional): run only for issue-class findings, at most one expansion run per class per round, with `max_class_expansions_per_round=2` and explicit cap `max_expansion_siblings_per_class=5`. Expansion scope is limited to changed files + directly related call-sites; repo-wide expansion scans are forbidden. Stop rules: stop expansion immediately when no
   new concrete locations are found; also stop when class/round caps are reached. 4) `Final Consolidation`: deduplicate again across primary + expansion findings, calibrate severity, then emit one final reviewer PASS package that follows the deterministic section/field contract below. Required reviewer PASS output contract (machine-checkable): include exactly these sections in this order:
  `Scout Coverage`, `Deduplicated Findings`, `Issue-Class Expansions`, `Residual Risk / Notes`. `Scout Coverage` required fields: `scouts_executed`, `scope_covered`, `guardrail_confirmation`, `raw_candidates_count`, `deduplicated_count`. `Deduplicated Findings` entry fields: `title`, `severity`, `class`, `locations`, `evidence`, `expansion_siblings`. `Issue-Class Expansions` entry fields:
  `class`, `source_finding_title`, `scan_scope`, `siblings`, `stop_reason`. `class` must be `one_off` or one issue class (`race_condition`, `lifecycle_symmetry`, `timeout_cancellation`, `idempotency`, `concurrency_guard`, `other`). `locations` must contain at least one concrete location. Explicit empty-case format is mandatory: if no deduplicated findings, render `Deduplicated Findings: []`;
   if no issue-class expansions, render `Issue-Class Expansions: []`. If findings remain, run `pairflow pass --summary ... --finding 'P1:...|artifact://...'` (repeatable; for P0/P1 include finding-level refs). If clean, run `pairflow converged --summary` directly (do not run `pairflow pass --no-findings` first). Execute pairflow commands directly (no confirmation prompt). Run pairflow
  commands from worktree: /Users/felho/dev/.pairflow-worktrees/pairflow/reviewer-brief-injection-and-enforcement-phase1.
```
