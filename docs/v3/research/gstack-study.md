# gstack Study — Roles Without Actors, and the Deterministic Gate

Date: 2026-06-20

## Purpose

This note captures what Pairflow v3 can learn from **gstack**
(`garrytan/gstack`), Garry Tan's (YC CEO) Claude Code setup — "turns Claude Code into a
virtual engineering team": **23 role-specialist slash-commands + a set of power tools**,
mostly Markdown, MIT-licensed, multi-host. It is the **second methodology/skills package**
in the series (after Superpowers), and like Superpowers it does not move v3's kernel
verdict — its value is sharper and bounded: a **worked role taxonomy** (CEO / Eng Manager /
Designer / Reviewer / QA Lead / Security Officer / Release Engineer) for v3's L0b actor
question, a **second, codegen-based answer** to L5 skill portability, a **third independent
corroboration of the `verify` gate**, and the **cleanest deterministic L2 gate primitive**
in the whole series.

The single sharpest finding: **gstack has roles without actors** — every "role" is a
stateless Markdown persona re-prompted into the *same* Claude session, with no actor
identity, no binding, no per-actor state. That is the exact *inverse* of v3's "an actor
bound to a role," and it confirms from the negative that v3's actor-as-first-class is the
missing piece a pure persona library lacks.

Source repository (read-only reference, not a dependency):

- `/Users/felho/dev/repos-to-learn-from/gstack` (analyzed at HEAD `a861c00`, pushed 2026-06-18)

The reference point for every mapping below is the v3 level roadmap and the
incrementally-built model:

- [`../convergence/approach.md`](../convergence/approach.md) — the level roadmap (L0a … L14)
- [`../convergence/core-model.html`](../convergence/core-model.html) — the model itself

Twelfth in a series; the convergence bridge over the first ten is
[`_synthesis.md`](_synthesis.md). Read alongside:

- [`superpowers-study.md`](superpowers-study.md) — the first methodology lens; the `verify` gate; action-indirection portability (the runtime contrast to gstack's codegen).
- [`hermes-agent-study.md`](hermes-agent-study.md) — the L5 baseline (agentskills.io format, runtime catalog).
- [`gastown-study.md`](gastown-study.md) — the gate-bead (the structural `verify` gate); Seance (raw-fork continuity, the opposite of gstack's distilled checkpoint).
- [`honcho-study.md`](honcho-study.md) — the distilled-memory reference (gstack's continuity sits on this axis but flat-Markdown).

> Method: four parallel sub-agent analyses (a leaner fan-out, proportionate to a
> methodology/skills package), each reading full SKILL.md command files + the TS build
> machinery, with `file:line` citations. Slices: the role taxonomy (L0b); the
> slash-command format + power tools + multi-host (L5); the SDLC methodology as a v3
> workflow; context-continuity + safety tools (L11/L2).

## Executive Summary

Four load-bearing findings.

> **1. "Roles without actors" — the inverse of v3, which confirms v3's design.** gstack is a
> **stateless persona library**: each role is a Markdown prompt-persona (a `SKILL.md` with YAML
> frontmatter) invoked fresh as a slash command; the "virtual engineering team" is emergent from
> invoking personas in a human-chosen sequence. There is **no actor identity, no role→actor
> binding, no per-role state** — "gstack's 'actor' is implicitly always the same Claude session
> re-prompted with a different persona… roles without actors, the inverse of v3's actor bound to a
> role." The transferable L0b idea is **authority as a first-class role attribute**: gstack's single
> most useful line is "the only review that gates shipping" (`ship/SKILL.md:915`) — one *blocking*
> role, the rest *advisory* — but it's buried in a release script's prose. **v3 should promote
> blocking-vs-advisory authority to a schema field on the role→actor binding**, which gstack proves
> the concept of but leaves implicit.

> **2. The cleanest deterministic L2 gate primitive in the series.** gstack's safety tools (`careful`/
> `freeze`/`guard`) are **Claude Code `PreToolUse` hooks that intercept a tool call and return a
> three-valued verdict — `{allow {} | ask | deny}` — from a *deterministic shell script*, with no LLM
> in the enforcement path** (`careful/bin/check-careful.sh`, `freeze/bin/check-freeze.sh`). Two gate
> strengths: **soft (`ask`, human-overridable)** for destructive-but-legitimate ops (`rm -rf`, `DROP
> TABLE`, `git push --force`), **hard (`deny`)** for an invariant boundary (`freeze` = a directory-scoped
> edit confinement). **This is exactly the shape v3's L2 gates should take: deterministic, model-out-of-
> loop, three-valued.** The cautionary half: gstack's gates are **session-scoped, opt-in, and fail-open**
> ("not a security boundary — Bash `sed` can escape it") — a convenience guardrail for a human-in-the-loop
> session, the *opposite* of what a kernel needs (default-on, fail-closed, enforced at the capability layer).

> **3. The `verify` gate, generalized across an entire pipeline — a third independent corroboration, plus
> two new gate types.** "Evidence beats self-report" is encoded at *three* stages: **QA reads a real
> Chromium session + screenshots** ("Repro is everything… Never refuse to use the browser… Never suggest
> unit tests as a substitute", `qa/SKILL.md:1389-1400`); **code review dispatches fresh-context / cross-model
> independent reviewers** ("Each subagent has fresh context — no prior review bias"; "'This looks fine' is
> not a finding", `review/SKILL.md:1558`); a **pre-emit gate requires quoting the source construct** before a
> finding is promoted ("the verification is 'I read the source that creates this symbol', not 'I grep'd for
> the name'", `review/SKILL.md:1230-1257`). And gstack adds **two gate types no prior reference workflow had**:
> a **CEO product-review FRONT-gate** (premise challenge + mandatory 2-3 implementation alternatives +
> scope-mode expand/hold/reduce — checks task-vs-outcome *before any code exists*) and a **dedicated SECURITY
> gate** (OWASP+STRIDE, confidence-gated, reads the real repo + git history, with a tunable confidence bar =
> the allow/warn/block sensitivity knob + per-category false-positive allowlists).

> **4. Portability-by-codegen — the AOT alternative to Superpowers' runtime indirection.** Where Superpowers
> keeps ONE skill and lets each harness supply the verbs (runtime action-indirection), gstack **compiles one
> canonical `SKILL.md.tmpl` per command into per-host files via a typed `HostConfig` registry** — emitting 10
> host dialects (Claude/Codex/Cursor/Factory/OpenCode/Kiro/OpenClaw/Hermes/gBrain) by transforming frontmatter,
> rewriting paths, and **`suppressedResolvers`** (declaratively zeroing out steps a host can't do — capability-
> gated step elision in config, not scattered `if`s). It also has **richer evals than Superpowers** (LLM-as-judge
> section scoring + routing E2E + tiered `gate`/`periodic` + diff-selected + cross-model), a **`preamble-tier`
> (0-4) graded bootstrap dial**, and a clean **power-tool=mechanism (real hooks/bin) vs persona=prose** split.
> The AVOID: 55×10 materialized files is heavy coupling (large diffs, CI freshness-checks) — adopt the *config
> schema concept*, not necessarily the materialized output.

Where gstack sits: the **second methodology lens**, orthogonal to the kernel-spectrum axis. It confirms more
than it changes — but its distinctive gifts (the deterministic three-valued gate, authority-as-role-attribute,
the CEO-front-gate + security-gate workflow additions, the verify-gate's third corroboration, the codegen
portability alternative, and the "roles without actors" mirror) sharpen v3's L0b/L2/L5 and its workflow library.

The synthesis line, lightly extended:

> **gstack is the negative-space confirmation of v3's actor model (it has roles without actors) and the source
> of v3's cleanest L2 gate primitive (a deterministic, model-out-of-loop, three-valued PreToolUse check) — plus
> two workflow gates the library was missing (a product-premise FRONT-gate and a security OWASP/STRIDE gate) and
> a third independent corroboration that a step's self-report never satisfies a gate.**

---

## L0b — The Role Taxonomy / Virtual-Team Model

**3-sentence verdict.** gstack is a **stateless persona library**: each "role" is a Markdown prompt-persona (a
`SKILL.md` with YAML frontmatter) the user invokes fresh as a slash command, and the "virtual engineering team"
is an emergent property of invoking these personas in a human-chosen sequence — there is no runtime role
registry, no actor binding, and no role that holds state across invocations. Roles coordinate through **on-disk
artifacts** (design docs, CEO-plans, handoff notes, review logs under `~/.gstack/projects/{slug}/`) rather than
message-passing, and one orchestrator role (`/autoplan`) reads the other role files from disk and runs them
sequentially. Authority is **mostly advisory with one hard gate**: of the whole team, only the Eng Review blocks
shipping; CEO, design, and security roles produce reports the user is free to ignore.

### The taxonomy, how a role is defined, authority & coordination

The roster (`AGENTS.md:14-107`) groups ~30 commands by SDLC phase: plan-mode reviewers (`/office-hours` YC
partner, `/plan-ceo-review` CEO, `/plan-eng-review` architecture, `/plan-design-review`, `/plan-devex-review`,
`/autoplan` orchestrator), implementation/review (`/review`, `/codex` second-opinion, `/investigate`, `/design-
review`, `/qa`, iOS variants), release (`/ship`, `/land-and-deploy`, `/canary`, `/document-release`, `/cso`).
**A role is defined as a directory with a `SKILL.md` (generated from a `.tmpl`)** whose frontmatter is the only
metadata binding (`name`, `description`, `allowed-tools`, `triggers`) and whose body is a plain-prose persona
("You are a **Chief Security Officer** who has led incident response…", `cso/SKILL.md:762`; "You are a **YC office
hours partner**", `office-hours/SKILL.md:845`). **There is no `role:` field, no authority field, no actor identity**
— a role is an English persona statement + a trigger list. A hidden **second tier** exists: `review/specialists/*.md`
(security/testing/performance/red-team) are dispatched by `/ship` as **parallel fresh-context subagents** emitting
structured JSON findings (`ship/sections/review-army.md:204-247`).

**Authority is explicit and almost entirely advisory, with exactly one blocking role:** "**Eng Review (required by
default): The only review that gates shipping**"; "**CEO, Design, and Codex reviews are shown for context but never
block shipping**" (`ship/SKILL.md:915-924`); the Security Officer "does NOT make code changes… produces a Security
Posture Report" (`cso/SKILL.md:766`); "AI models recommend. Users decide" (`ETHOS.md:115-117`). **Coordination is
human-sequenced** (the user types each command; nothing enforces the order) with two assists: `/autoplan` chains the
plan-mode reviewers in mandatory order ("CEO → Design → Eng → DX… each builds on the previous"), and **explicit
on-disk handoff artifacts** (a `*-ceo-handoff-*.md` note a prior session wrote; office-hours' design doc the next
role reads). **Roles are stateless** — continuity is entirely artifact-based (CEO-plans, design docs, `reviews.jsonl`,
a `decisions.active.json` ledger persisted to `~/.gstack/projects/{slug}/`).

### LEARN / AVOID / ORTHOGONAL (L0b)

**LEARN**
- **Authority belongs in the role contract, made explicit per role.** "The only review that gates shipping" — one
  blocking role, the rest advisory — is the single most transferable idea. v3 should encode authority
  (`blocking` vs `advisory`) as a first-class attribute of the role→actor binding, not buried in a release script.
- **On-disk handoff artifacts as the role-coordination substrate** — the `ceo-handoff` note and the office-hours
  design doc *are* v3's context-packet: a serialized hand-off a downstream actor deserializes. Validates modeling
  the context-packet as the unit passed between role-bound actors, and filesystem/artifact persistence as the
  continuity mechanism for stateless actors.
- **Two-tier roles: human-invoked personas + ephemeral specialist subagents** emitting *structured* findings (JSON),
  not prose. v3's role→actor binding should accommodate the recursion: an actor bound to a role can itself bind
  sub-actors to sub-roles.
- **Persona-as-prompt is cheap and legible** — a role's judgment encoded as readable, auditable, editable English
  (the CEO's 18 "cognitive patterns"). Keep the role *definition* human-readable even if the binding is structured.

**AVOID**
- **Persona ≠ contract.** gstack roles carry no machine-readable responsibilities/authority/handoff schema — just a
  prose persona + trigger words. The pipeline order, the gate, and the handoff all live in scattered prose another
  role re-implements. v3 must NOT model a role as "a markdown file with a persona sentence" — the binding must carry
  structured authority/scope/handoff fields a kernel can reason over.
- **Human-sequenced pipeline with no enforced ordering** — outside `/autoplan`, the SDLC sequence is a convention the
  user must remember; `/ship` just *notices* a missing review and proceeds anyway. v3, as a kernel, should own the
  ordering/dependency graph, not trust invocation order.
- **The giant shared "chrome"** — ~750 lines of identical boilerplate (preamble/telemetry/AskUserQuestion) in every
  role file, the actual role logic a small tail. v3's kernel should factor this out so a role definition is *only*
  the role-specific contract.

**ORTHOGONAL** — the browser/Playwright stack, telemetry/gbrain sync, AskUserQuestion formatting, Conductor host
quirks. **The key finding itself:** gstack has roles without actors (a single implicit actor) — the inverse of v3's
"actor bound to a role"; that gap *is* the v3-validating observation.

---

## L5 — Slash-Command/Skill Format, Power Tools & Multi-Host

**3-sentence verdict.** gstack is a **build-system that compiles one canonical `SKILL.md.tmpl` per command into
per-host Claude-Code-native skill files** via a declarative typed `HostConfig` registry — Claude Code's *native*
format (`name`/`description`/`allowed-tools`/`hooks`), extended with gstack-private frontmatter (`preamble-tier`,
`triggers`, `sensitive`) and a `{{PLACEHOLDER}}` template layer resolved at codegen. Where **hermes** is a runtime
catalog and **superpowers** is *runtime action-indirection*, gstack is the **opposite axis: heavy ahead-of-time
codegen** — the template is the single source of truth and `gen-skill-docs.ts` emits 10 host dialects by transforming
frontmatter, rewriting paths, and suppressing host-incapable steps. Portability-by-compilation rather than
portability-by-runtime-indirection.

### Format, power tools, multi-host, evals

A command is a directory with `SKILL.md.tmpl` (source) + `SKILL.md` (generated); frontmatter is YAML with native keys
plus gstack-only `preamble-tier` (1-4, gates how much bootstrap preamble is injected), `triggers`/`voice-triggers`,
`sensitive`. **The 55 skills split by *nature*:** **role specialists** are *prompt-only personas* (pure Markdown);
**power tools are mechanism** — they carry real machinery (`freeze`/`guard`/`careful` register actual `PreToolUse` deny
hooks via `bin/*.sh`; `context-save`/`restore` write continuity state; `browse` is a compiled Chromium binary; `codex`
shells an out-of-model second opinion with a `[P1]` gate; `health`/`benchmark`/`gstack-upgrade` are dashboard/regression/
install machinery). The distinguishing trait: power tools have a `bin/` and/or `hooks`; role specialists are prose.

**Multi-host projection** is codegen-time: a typed `HostConfig` per host (`hosts/*.ts`) declares paths, a `frontmatter`
transform (allowlist/denylist/rename, e.g. `voice-triggers→triggers`), `pathRewrites`, **`suppressedResolvers`** (zero
out steps a host can't do — "Codex can't invoke itself so `CODEX_SECOND_OPINION`/`REVIEW_ARMY` render empty",
`codex.ts:34-42`), and `generateMetadata` (sidecar yaml). `gen-skill-docs.ts` reads `.tmpl` → resolves placeholders →
applies the host transform → writes N physical copies. **Evals are real and richer than Superpowers':** LLM-as-judge
section scoring (`clarity/completeness/actionability ≥ 4`), routing/journey E2E (the right skill fires for a phrase),
tiered `EVALS_TIER=gate` (blocks merge in CI) vs `periodic`, diff-selected re-runs, cross-model `codex-e2e`/`gemini-e2e`,
a cost-budgeted store. Upgrade = idempotent versioned shell migrations with `.done` touchfiles + scope guards.

### LEARN / AVOID / ORTHOGONAL (L5)

**LEARN**
- **Single-source template + typed `HostConfig` codegen** — one `.tmpl`, a declarative per-host transform object,
  validated for uniqueness. Proves codegen-from-typed-config is maintainable at 55 skills × 10 hosts. (Superpowers does
  this at runtime, gstack at build time — v3 can choose per need.)
- **`suppressedResolvers` = capability-gated step elision** — "this host can't do step X, render it empty," declaratively
  in the host config, not scattered `if`s. A kernel-grade capability-negotiation pattern.
- **`preamble-tier` (0-4) as a graded bootstrap-injection dial** — scale bootstrap weight per skill (cheap commands tier-1,
  heavy orchestrators tier-4) instead of Superpowers' one coercive bootstrap. The "variable ceremony per subflow" knob.
- **Power-tool = mechanism (real hooks/bin), persona = prose** — the clean L5 distinction: a help-subflow can be pure
  prompt OR carry an enforcement gate.
- **Tiered, diff-selected, LLM-judged evals with a `gate` merge-blocker** — the verification idea made CI-operational;
  v3 skills should ship gate-tier behavioral evals. Plus idempotent versioned migrations (`.done` touchfiles + scope guards).

**AVOID**
- **Heavy AOT codegen for everything** — 55×10 materialized files means every edit re-runs codegen + CI freshness-checks
  the committed output (high coupling, large diffs). Adopt the config-schema *concept* without necessarily materializing
  files; for a kernel, runtime indirection may be the lighter primitive.
- **Fat inline routing prose in frontmatter + a giant central routing table** — a maintenance hotspot that bloats every
  skill's context (the `--catalog-mode trim` pass exists because the full version was too heavy). Start trim.
- **gstack-private frontmatter keys mixed into native frontmatter** — couples to a moving native schema; keep kernel
  metadata in a separate namespace.

**ORTHOGONAL** — the browser/Chromium stack, iOS-QA-over-USB, PDF/diagram generation, gBrain sync; the Codex/OpenAI
coupling (the transferable idea is only the gate + verbatim-passthrough + anti-injection-delimiter discipline).

---

## Methodology — The gstack SDLC as a Reference v3 Workflow

**3-sentence verdict.** gstack is an opinionated, named-role SDLC (CEO reviewer → eng manager → designer → QA lead →
security officer → release engineer), where each role produces a *durable artifact on disk* and the pipeline advances
by one stage *reading the prior stage's artifact* rather than trusting a verbal handoff. Its defining move is that
**evidence beats self-report at every gate**: QA opens a real Chromium and attaches screenshots, the code reviewer
dispatches *independent fresh-context specialist subagents* plus an out-of-model adversary (Codex), and the security
officer runs a real OWASP+STRIDE audit — none accept "I tested it" as proof. For v3 this is the strongest available
validation of the `verify` gate generalized across an *entire* pipeline, plus a concrete blueprint for two things prior
studies lacked: a product-rethinking *front* gate and a dedicated *security* gate.

### The pipeline + the v3 mapping

Stages, each a slash command producing a durable artifact: `/office-hours` (design doc; HARD GATE: no code, only a
design doc) → `/plan-ceo-review` (CEO plan + review report) → `/plan-eng-review` (architecture lock + test plan) →
`/plan-design-review` + `/design-review` (scorecard / live-site visual audit) → `/review` (specialist JSON findings +
persisted review log) → `/qa` (report dir with per-issue screenshots) → `/cso` (Security Posture Report) → `/ship` →
`/land-and-deploy` + `/document-release`. **Coupling is artifact-mediated, not call-mediated**: `/ship` doesn't *call*
`/review` — it *reads the persisted review log* and, if none exists, runs its own. **Composable, not a hard-wired
sequence** (`/autoplan` is sugar chaining stages 1-3.5).

v3 mapping: **GATES** — the *only blocking* gate is the eng/code review (a `[P1]` from Codex → `GATE: FAIL`); the
coverage gate is block-with-human-override (an L2→L3 escalation); the pre-emit "quote the source" check inside `/review`
is a literal `verify` gate; CEO/Design/security are *advisory* warn-gates. **HUMAN-DECISIONS (L3)** — every finding
surfaced as an individual `AskUserQuestion` ("One issue per call… STOP until the user responds"); the autoplan Final
Approval Gate (Approve/Override/Revise/Reject); and notably the **anti-shortcut clause names "writing findings without
firing the AskUserQuestion" as a *bug*** — the human gate cannot be silently bypassed by producing the artifact.
**ACTIONS** — `/qa` runs a real process and routes each issue (verified / best-effort / reverted); `/review`'s specialist
dispatch is a fan-out + adaptive-gating action. **LOOP-BACK rounds** — autoplan Revise re-runs affected phases, **Max 3
cycles**; pre-gate verification retries **Max 2 attempts**.

### The two new gate types

**The CEO product-review FRONT-gate** (`plan-ceo-review/SKILL.md`): a stage whose job is to *rethink whether this is the
right thing* before any code exists — premise challenge ("Is this the right problem? Is the plan solving a proxy problem?
What if we did nothing?", `:1163-1166`), find-the-10-star-product ("push scope UP… 'what would make this 10x better for
2x the effort?'"), and **mandatory 2-3 implementation alternatives** (minimal-viable + ideal-architecture at *equal
weight*; "if the right answer is a rewrite, say so", `:1179-1208`) — a forced divergence gate before convergence. No prior
reference workflow had this; it is the product-correctness analogue of a verify gate. **The dedicated SECURITY gate**
(`/cso`, OWASP+STRIDE): scope-resolved (8 mutually-exclusive scopes, `--diff` for branch-only), **confidence-gated** (daily
8/10 bar, comprehensive 2/10 — the bar tunes false-positive tolerance, exactly v3's allow/warn/block sensitivity),
infra-first (secrets archaeology / supply chain / webhooks before OWASP), advisory, with codified per-category FP-suppression
rules. For v3: a security gate = an L2 warn-gate (block-eligible at a stricter confidence bar) reading the *real repo + git
history* as its independent artifact, with a tunable confidence threshold and per-category allowlist.

### LEARN / AVOID / ORTHOGONAL (Methodology)

**LEARN**
- **Artifact-mediated handoff = the v3 step-graph edge** — a stage writes a durable artifact; the next stage's gate *reads
  that artifact*, not the prior agent's claim. The cleanest concrete model for "a step's self-report does NOT satisfy a gate."
- **The CEO front-stage belongs in WF-1** — a product/premise gate *before* planning (premise challenge + mandatory 2-3
  alternatives + scope-mode as an L3 decision). No prior study had it; it checks task-vs-outcome before code exists.
- **A dedicated security gate** (the `/cso` model) — L2 warn-gate, block-eligible at a stricter confidence bar, reads real
  repo + git history, tunable confidence bar, per-category FP allowlist. Fills a gap no prior reference workflow had.
- **The `verify` gate generalizes across the pipeline** — three independent-evidence patterns to encode: QA reads a real
  browser; review uses fresh-context/cross-model reviewers ("'This looks fine' is not a finding"); the pre-emit gate
  requires quoting the source. Third corroboration after Superpowers + gastown's gate-bead.
- **Block-vs-advise discipline** (one blocking gate, the rest advisory), **bounded loop-back rounds** (Max 3 / Max 2), and
  **block-with-human-override** (the clean L2→L3 escalation).

**AVOID**
- **The shared-preamble bloat** — ~750 identical lines before the ~250-line distinctive body; put gate/step *semantics* in
  the kernel and keep step definitions thin.
- **Advisory-by-default security/QA can be skipped** — because `/cso` and `/qa` never block `/ship`, a security report can be
  produced and ignored. If v3 wants a *security gate*, wire it block-eligible, not merely advisory.
- **Prose-bypass of human gates is a *named bug* here** — meaning it happens. v3's L3 human-decision gates must be enforced by
  the kernel (you cannot advance by writing the artifact), not by prompt instruction.

**ORTHOGONAL** — Conductor/host AskUserQuestion machinery, telemetry, gbrain sync, the browse binary, iOS-QA-over-USB; the
"completeness is cheap / boil the ocean" review *posture* (not a gate mechanism).

---

## L11/L2 — Context Continuity & Safety Tools

**3-sentence verdict.** gstack's continuity model is a **distilled, append-only Markdown checkpoint** — a Staff-Engineer's
handwritten session note (goal / decisions / remaining / notes), not a session fork — stored outside the repo and resumed
by reading the newest file. Its safety model is a **session-scoped, opt-in hook layer**: invoking `/careful`/`/freeze`/
`/guard` registers Claude Code `PreToolUse` hooks that intercept Bash/Edit/Write and return `ask` (warn) or `deny` (block)
from a deterministic shell script. `canary` and `health` are not gates at all — read-only *post-hoc verifiers* (live-app
monitor; code-quality dashboard) that observe and report but never block or fix.

### Continuity + the deterministic gate

**context-save** writes a *distilled summary the model authors* (not a transcript): gather git state, summarize *goal +
decisions + remaining + gotchas* into a 4-section Markdown file with frontmatter, **append-only, never overwritten**, keyed
by a *sortable filename prefix* (`context-restore` uses `sort -r`, explicitly *not* `ls -t` mtime, so resume survives
rsync/copy where mtime doesn't). **Restore is read-and-present**, not inject-and-resume (default scope = all branches, for
cross-workspace handoff). A second channel embeds `[gstack-context]` blocks inside `WIP:` commit messages; a `decisions.active.json`
ledger treats cross-session decisions as "settled unless explicitly superseded." On the axis: **with honcho on the
*distilled* side** (a curated lossy summary of what mattered) but **flat author-written Markdown with zero embedding/
perspectival machinery** (closer to hermes's flat-Markdown memory); the **opposite of gastown-Seance** (which forks the
predecessor's *literal* session — gstack throws the transcript away and keeps only the compression).

**The safety gates are deterministic PreToolUse hooks** registered in skill frontmatter (automatic once the skill is
invoked): **`careful`** intercepts `Bash`, pattern-matches destructive ops (`rm -r`, `DROP TABLE`, `git push --force`,
`kubectl delete`…) and returns `{"permissionDecision":"ask"}` — a **soft, overridable warn** (allow-lists safe build-artifact
deletes; logs the *pattern name only*, never command content); **`freeze`** intercepts `Edit`+`Write`, resolves the target
path against a session boundary file, and returns `{"permissionDecision":"deny"}` if outside the frozen dir — a **hard block**
(directory-scoped edit confinement); **`guard`** registers all three at once. **`canary`** (live post-deploy visual monitor,
read-only, *offers* rollback via AskUserQuestion but never acts) and **`health`** (code-quality dashboard, HARD GATE: do NOT
fix) are observers, not gates.

### LEARN / AVOID / ORTHOGONAL (L11/L2)

**LEARN**
- **PreToolUse hook returning `{allow | ask | deny}` from a deterministic script** is the cleanest "gate as automatic check"
  primitive in the series — no LLM in the enforcement path, pure pattern-match → verdict. v3's L2 gates should be exactly
  this: deterministic, model-out-of-loop, three-valued.
- **Two gate strengths** — soft `ask` (destructive-but-legitimate, human-overridable) vs hard `deny` (invariant boundary).
  Not every gate should block.
- **Append-only, never-overwrite checkpoint files keyed by a sortable filename prefix** — robust resume that survives copy/
  rsync where mtime doesn't. Good kernel hygiene for any persisted artifact.
- **Distilled 4-field continuity record + a separate durable decisions ledger** — a low-cost L11 model; the "settled unless
  explicitly superseded" decision rule is exactly the cross-session-decision primitive a distributed kernel needs.
- **Freeze = directory-scoped edit boundary** — a clean, generalizable capability-confinement primitive: scope a worker to a
  path, deny edits outside it.

**AVOID**
- **Fail-open + session-scoped + opt-in** — `freeze` allows everything with no state file and on parse failure; hooks vanish
  at session end. For a kernel, safety must be **default-on and fail-closed** — gstack's model is a human-in-the-loop
  convenience guardrail, not a trust boundary.
- **"Not a security boundary" by the tool's own admission** — Bash `sed` escapes it. Don't ship a v3 gate a sibling tool can
  trivially bypass; enforce at the capability layer, not by string-matching one tool's input.
- **Continuity-by-model-self-summary is lossy and non-deterministic** (the agent decides what to record). For kernel-level
  handoff where correctness matters, prefer a structured/verifiable record.

**ORTHOGONAL** — `canary` (live visual monitoring) and `health` (code-quality dashboard) are developer conveniences, not
kernel concerns; the AskUserQuestion decision-brief apparatus is a human-UX layer; the shared preamble is distribution
machinery.

---

## Consolidated Direction for v3

| v3 level | What gstack contributes | Verdict |
|---|---|---|
| **L0b actor** | A worked role taxonomy (CEO/EngMgr/Designer/Reviewer/QA/Security/Release) — but **roles WITHOUT actors** (stateless personas, single implicit actor); authority ("only the eng review gates shipping") buried in prose; on-disk handoff artifacts. | **Promote authority (blocking/advisory) to a schema field on the role→actor binding.** Adopt artifact-as-context-packet + two-tier roles. The "roles without actors" gap confirms v3's actor-bound-to-role is the right inversion. |
| **L2 gates** | **The cleanest deterministic gate primitive**: a PreToolUse hook returning `{allow | ask | deny}` from a deterministic script, model-out-of-loop, two strengths (soft ask / hard deny). | **Adopt the deterministic three-valued gate shape.** Reject fail-open + session-scoped + opt-in (v3 needs default-on + fail-closed at the capability layer). |
| **L2/L3 workflow gates** | Two new gate types: the **CEO product-review FRONT-gate** (premise + mandatory alternatives + scope-mode) and a **security OWASP/STRIDE gate** (confidence-tunable, reads real repo+git). Plus the verify-gate's third corroboration. | **Add the CEO front-gate to WF-1 and a block-eligible security gate to the library.** Corroborates the `verify` gate. |
| **L5 skills** | Portability-by-codegen (typed HostConfig → 10 host dialects, `suppressedResolvers`, `preamble-tier`); richer evals (gate/periodic, LLM-judge, routing E2E); power-tool=mechanism vs persona=prose. | **Adopt the config-schema concept + capability-gated step elision + graded bootstrap + gate-tier evals.** Reject heavy AOT materialization. |
| **L11 continuity** | Distilled 4-field Markdown checkpoint (append-only, sortable-filename-keyed) + a decisions ledger ("settled unless superseded"). | **Adopt as a low-cost continuity option + the decisions-ledger primitive.** On the honcho-distilled axis; gastown-Seance is the raw-fork opposite. |

## Reconsiderations for v3

1. **"Roles without actors" is the negative-space proof of v3's actor model.** gstack is an entire production methodology
   built on roles with *no* actor identity — the same Claude session re-prompted with a different persona. It works for a
   single-human-in-the-loop tool, but it has no answer to "which actor, with what authority, holds what state" — exactly the
   gap v3's first-class actor + role→actor binding fills. The one idea to lift directly: **make blocking-vs-advisory authority
   a schema field on the binding** (gstack's "only the eng review gates shipping" is the concept, left implicit in prose).

2. **The deterministic three-valued PreToolUse gate is v3's L2 gate shape.** Across the series, gates were prose disciplines
   (Superpowers), structural blocking deps (gastown's gate-bead), or transactional decision rows (paperclip). gstack adds the
   *enforcement-mechanism* reference: a deterministic script that intercepts a tool call and returns `{allow | ask | deny}`
   with **no model in the loop**. v3's L2 evaluator should be exactly this — but **default-on and fail-closed at the capability
   layer**, the inverse of gstack's opt-in/fail-open/session-scoped convenience model.

3. **Two workflow gates the library was missing.** The CEO **product-premise FRONT-gate** (rethink whether this is the right
   thing, with mandatory alternatives, before any code) and a dedicated **security OWASP/STRIDE gate** are both absent from the
   prior reference workflows (Superpowers, ruflo-SDLC, gastown). v3's WF-1..WF-7 library should include both — the front-gate as
   an L3 product-decision, the security gate as a block-eligible L2 reading the real repo. And gstack's **prose-bypass of a human
   gate is a *named bug*** — direct evidence that v3 must enforce L3 gates at the kernel, not by instruction.

4. **The methodology lens is now two-for-two on the verify gate, and converging.** Superpowers, gastown's gate-bead, and now
   gstack's three-stage independent-evidence discipline (real browser / fresh-context+cross-model reviewer / quote-the-source)
   all independently arrive at "a step's self-report never satisfies a gate." After three corroborations from independent
   systems, the `verify` gate is the most-validated single addition in the entire research corpus — it should be a first-class
   L2 gate kind, non-negotiable.

## Caveats

- **A methodology/skills package, judged against v3's bar.** Like Superpowers, gstack is the human-discipline lens — it does
  not touch kernel/durability mechanism. Many "AVOID" verdicts mean "appropriate for a single-human-in-the-loop tool, wrong for
  a distributed kernel," not "wrong."
- **Leaner four-agent fan-out**, proportionate to the smaller scope; the agents read full SKILL.md command files + the TS build
  machinery. Findings about the role model, the gate mechanism, the methodology, and continuity are high-confidence; the deep TS
  tooling (browse daemon, iOS-QA) was out of scope.
- **The "23 tools" framing is marketing-rounded** — the repo has ~55 skill dirs (role specialists + power tools + variants). The
  study uses the actual on-disk inventory.
- **Same-recent HEAD.** Analyzed at `a861c00`, pushed 2026-06-18. Line numbers are a snapshot.
