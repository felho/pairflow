# feature-ideas.md — v3 relevance triage

Date: 2026-06-19
Source: [`feature-ideas.md`](feature-ideas.md) (lines 1–118)
Method: one subagent pass; each line judged for relevance to **Pairflow v3** (the
distributed workflow-kernel redesign — see
[`../docs/v3/convergence/approach.md`](../docs/v3/convergence/approach.md)).
Opaque-but-promising URLs were fetched to identify the project; obvious or
clearly off-theme ones were judged by name. `basis` = how the verdict was reached
(`knew` / `fetched` / `guess`).

Verdict scale:
- **YES** — clearly relevant (a concept/level v3 should absorb, or an on-theme project worth studying).
- **MAYBE** — adjacent / depends / couldn't fully identify; worth a second look.
- **NO** — not relevant (current-tool trivia, off-theme, joke, or noise).

## Triage table

| Line | What it is | Verdict | v3 angle | basis |
|---|---|---|---|---|
| 1 | Implementer commits before passing the ball (per-round diff clarity) | YES | L0a Transcript/atomic-commit; round-boundary observability | knew |
| 2 | Transcript should carry agent-session ID | YES | L0a EventEnvelope/durable run record; L0c actor binding | knew |
| 3 | Commit messages should contain bubble id | YES | Durable run record / observability correlation | knew |
| 4 | addyosmani/agent-skills — Claude skills collection | YES | Skills-as-artifacts; L2b context blocks | knew |
| 5 | vladikk/modularity — Vlad Khononov DDD/modularity | YES | DDD/modularity (def-vs-run aggregates, bounded contexts) | knew |
| 6 | claude.com superpowers plugin | YES | Skills/plugin packaging; DX | knew |
| 7 | "Add 'I love you' to prompts" :D | NO | Joke/noise | knew |
| 8–11 | Review Loop Escalation Rule (P1 churn → plan/sequencing reset) | YES | L1/L2 policy; convergence-loop escalation; process→v3 absorb | knew |
| 12 | Make CreatePairflowSpec's verifiable logic checkable by pairflow | YES | Spec-as-code / checkable artifacts (cross-cutting) | knew |
| 13–24 | Baseline-Preservation + Unauthorized-Removal audit (spec+review) | YES | L2 gates/policies; regression-guard as packaged process gate | knew |
| 25–35 | Long-bubble guardrails: early-abort, intervention_count, sequencing-failure section | YES | L0d lifecycle telemetry; L1/L2 policy; observability | knew |
| 36–43 | Watchdog recovery for "terminal output but no lifecycle command" | YES | L0d typed waits; L9 wait conditions; fail-closed gate boundaries | knew |
| 44 | plastic-labs/honcho — agent memory infrastructure | YES | L11 memory scopes; context engineering | fetched |
| 45 | setcode.dev — (coding-agent tooling site) | MAYBE | Likely agent coding tool; name-opaque, low signal | guess |
| 46 | stanford-iris-lab/meta-harness — auto-search over model harnesses | YES | Agent harness abstraction; metacognition/L12 | fetched |
| 47 | Neon-Data/auto-context — GH Action syncing CLAUDE.md to code | YES | Context engineering; spec/context drift-sync | fetched |
| 48 | github.com/vincentkoc — a user profile | MAYBE | Person, not a repo; depends what's pinned | guess |
| 49 | vercel-labs/agent-browser PR — browser agent | MAYBE | Agent harness/browser tool; specific PR, narrow | knew |
| 50 | CsabaKovacs/rulesmith — rules/skills authoring (dup of 75) | MAYBE | Possibly rules-as-code authoring; name-based | guess |
| 51 | Per-worktree bootable app + CDP/DOM skills for agent (Codex bug-repro) | YES | L0e RuntimeContextProvider; L0f typed slots; harness tooling | knew |
| 52 | Per-worktree ephemeral observability stack (LogQL/PromQL for agent) | YES | L0e provisioning; observability-for-agents; context assembly | knew |
| 53 | developers.openai.com/codex/use-cases | MAYBE | Codex use-case docs; harness inspiration | knew |
| 54 | openai cookbook — gpt-5 codex prompting guide | MAYBE | Prompt/context engineering reference | knew |
| 55 | sentrux/sentrux — real-time architectural feedback for agents | YES | Observability/fitness gates; L2 quality gates | fetched |
| 56 | getagentseal/codeburn — AI-spend TUI dashboard | YES | Cost/budget ledger (cross-cutting) | fetched |
| 57 | Break tasks into smaller steps so weaker models can do them | YES | L0b AgentConfig (model); context/step granularity; convergence | knew |
| 58 | Experiment: weaker implementer model — does it converge, how many rounds | YES | L13 evals/trust calibration; convergence telemetry | knew |
| 59 | openai/symphony — orchestrator for autonomous coding agents | YES | Workflow orchestration; harness; sibling to omnigent study | fetched |
| 60 | cocoindex-io/cocoindex — incremental context pipeline for agents | YES | Context engineering; L11/L2b freshness | fetched |
| 61 | mattpocock/skills — TS skills collection | YES | Skills-as-artifacts; DX | knew |
| 62 | pnpm-workspace.yaml | NO | Bare filename note; packaging trivia, no v3 bearing | knew |
| 63 | BloopAI/vibe-kanban — kanban for coding agents | YES | Task inbox / orchestration UI (L8 channels & inbox) | knew |
| 64 | hud.io — agent evals/environments platform | YES | L13 evals; sandbox environments | knew |
| 65 | kajogo777/agent-sandbox-taxonomy — sandbox scoring framework | YES | Sandboxing taxonomy (cross-cutting); L7-adjacent | fetched |
| 66 | jedi4ever/context-filter — prompt-injection guard for CLAUDE.md | YES | L10 gatekeeper; prompt-injection defense | fetched |
| 67 | tessl.io blog — context development lifecycle for agents | YES | Context engineering lifecycle | knew |
| 68 | addyosmani blog — agent harness engineering | YES | Agent harness abstraction (cross-cutting) | knew |
| 69 | youtube watch?v=ow1we5PzK-o | MAYBE | Unknown video; could be on-theme | guess |
| 70 | "Start agents without MCP servers" | YES | L0b/L0c ActorAdapter tool_policy; harness launch config | knew |
| 71 | CLI structural-smell: fitness/contract guard on command imports | MAYBE | Current-tool refactor; weakly informs L0f/fitness-guard idea | knew |
| 72 | tmux defaults discovery (start/restart wiring) | NO | Current-tool config trivia, non-blocking | knew |
| 73 | x.com/trq212 status | MAYBE | Unknown tweet; can't judge | guess |
| 74 | youtube watch?v=qKU-e0x2EmE | MAYBE | Unknown video | guess |
| 75 | CsabaKovacs/rulesmith (dup of 50) | MAYBE | Rules-as-code authoring; name-based | guess |
| 76 | bemafred/sky-omega — RDF/SPARQL semantic agent memory | YES | L11 memory scopes; context engineering | fetched |
| 77 | llmsresearch/paperbanana — (LLM research / paper tool) | MAYBE | Likely paper/research tooling; off-core | guess |
| 78 | "execute plan should work for tasks too; remote line unfinished" | YES | L4/L6 orchestration scope; remote runtime (L0e cloud sandbox) | knew |
| 79 | Carry v2 architecture ideation forward — first look at xstate | YES | L0a reactive kernel / state-machine substrate (direct v3 concern) | knew |
| 80 | DX/onboarding: NPM package, versioning, changelog, semver, skills-install, pid file, static docs site | YES | DX/onboarding/packaging (cross-cutting) | knew |
| 81 | Strengthen onboarding: iterm2, clearer UI, simple onboarding doc | YES | DX/onboarding (cross-cutting) | knew |
| 82 | x.com/port_dev status | MAYBE | Unknown tweet | guess |
| 83 | antirez/ds4 (DwarfStar) — native local inference engine (DeepSeek) | NO | Local inference engine; off-theme for v3 kernel | fetched |
| 84 | yvgude/lean-ctx — Rust context-compression layer for agents | YES | Context engineering; token-budget (cross-cutting) | fetched |
| 85 | cheriftj/c4-model-skill — C4 architecture-model skill | YES | DDD/modularity; skills-as-artifacts | knew |
| 86 | Tencent/TencentDB-Agent-Memory — local 4-tier agent memory | YES | L11 memory scopes; context engineering | fetched |
| 87 | teng-lin/notebooklm-py — NotebookLM Python client | NO | Off-theme content/notebook tool | guess |
| 88 | alirezarezvani/claude-skills — skills collection | YES | Skills-as-artifacts; DX | knew |
| 89 | public-apis/public-apis — generic API list | NO | Off-theme noise | knew |
| 90 | colbymchenry/codegraph — local code knowledge-graph for agents | YES | Context engineering; L11; codebase-graph for context assembly | fetched |
| 91 | githits.com — (GitHub stats site) | NO | Off-theme | guess |
| 92 | virgiliojr94/book-to-skill — convert books into skills | MAYBE | Skill-authoring pipeline; adjacent to spec/skill-as-artifact | guess |
| 93 | agentic-qe — agentic QE framework | YES | L13 evals; testing-as-agents | fetched-adjacent |
| 94 | DeusData/codebase-memory-mcp + jskswamy codebase plugin | YES | L11 memory; codebase context (MCP) | guess |
| 95 | gist: Multi-Layer Memory Architecture for AI Agents | YES | L11 memory scopes architecture | knew |
| 96 | aiming-lab/SimpleMem + MemPalace/mempalace — agent memory | YES | L11 memory scopes | guess |
| 97 | RuView release "sleep-monitor" | NO | Off-theme (hardware/sleep monitor) | guess |
| 98 | Picrew LLM-Harness + awesome-agent-harness | YES | Agent harness abstraction (cross-cutting) | guess |
| 99 | pnocera/reversa — legacy→executable-spec via agents | YES | Spec-as-code; def aggregates; reverse-eng (on-theme with v3 RE work) | fetched |
| 100 | awesome-skills/code-review-skill | YES | Skills-as-artifacts; review process | knew |
| 101 | OpenDCAI/DataFlow — data-prep/eval pipeline for LLMs | MAYBE | Data-centric AI; weak for kernel, maybe evals | fetched |
| 102 | Ontos-AI/knowhere — doc→structured-chunks (Agentic RAG) | MAYBE | Context/RAG ingestion; adjacent | fetched |
| 103 | DrCatHicks/learning-opportunities — dev-learning tool for AI coding | MAYBE | Metacognition/learning (L12); but human-pedagogy focus | fetched |
| 104 | nicobailon/pi-subagents — child-agent delegation framework | YES | L4 child workflow instances; subagent orchestration | fetched |
| 105 | Turn parts of spec into code; reuse CraftPRD crystallization | YES | Spec-as-code / checkable artifacts (cross-cutting); L12 | knew |
| 106 | mdoty4/batonbot — local-first prompt/agent pipeline orchestrator | YES | Workflow orchestration; harness | fetched |
| 107 | prakhar1114/ai_mime — record→rerunnable self-healing script | MAYBE | Demo→executable automation; weak spec-as-code adjacency | fetched |
| 108 | paperclipai/paperclip — manage agents "as employees" (org/budget/gov) | YES | L4/L8/L14 orchestration, inbox, budget, governance | fetched |
| 109 | 666ghj/MiroFish — multi-agent world-simulation forecaster | NO | Simulation/forecasting; off-theme for workflow kernel | fetched |
| 110 | karpathy/autoresearch — autonomous ML-experiment agent | MAYBE | Metacognition/self-improving loop (L12); research-flavored | fetched |
| 111 | martian-engineering/lossless-claw — DAG-summarization context plugin | YES | Context engineering; durable history without truncation | fetched |
| 112 | chopratejas/headroom — context-compression proxy/MCP | YES | Context engineering; token-budget (cross-cutting) | fetched |
| 113 | GoogleCloud knowledge-catalog OKF SPEC.md | YES | Knowledge/context format; spec-as-artifact; memory metadata | fetched |
| 114 | harness.bencium.io — (agent harness site, 403) | MAYBE | Name = agent harness; couldn't fetch | guess |
| 115 | toonformat.dev — TOON compact JSON encoding for LLM prompts | YES | Context engineering; token-efficient context format | fetched |
| 116 | omnigent-ai/omnigent — meta-harness (already studied) | YES | Agent harness/meta-harness; sibling omnigent-study.md | knew |
| 117 | GoogleCloud knowledge-catalog repo + OKF dir | YES | Knowledge/context format; spec-as-code (same as 113) | fetched |
| 118 | (blank trailing line) | NO | Empty | knew |

## Rollup — YES lines grouped by v3 theme

- **Kernel / state-machine substrate (L0a, lifecycle):** 1, 2, 3, 79
- **Process / convergence-loop / gates → absorb into L1–L2:** 8–11, 12, 13–24, 25–35, 36–43, 57, 100, 105
- **Child workflows / multi-agent orchestration (L4, L6, L8, L14):** 59, 63, 78, 104, 106, 108, 116
- **Agent harness abstraction / runtime (L0b–L0e, harness):** 46, 51, 52, 68, 70, 98, 116
- **Memory / context engineering (L11, L2b, cross-cutting):** 44, 47, 60, 67, 76, 84, 86, 90, 94, 95, 96, 111, 112, 113, 115, 117
- **Skills / spec-as-code / checkable artifacts (L12, cross-cutting):** 4, 5, 6, 12, 61, 85, 88, 99, 105
- **Evals / quality / cost / observability (L13, cost ledger, obs):** 55, 56, 58, 64, 93
- **Sandboxing / gatekeeper (L7, L10):** 65, 66
- **DX / onboarding / packaging (cross-cutting):** 80, 81

Clear NO / noise: 7 (joke), 62, 72, 83, 87, 89, 91, 97, 109, 118.

## Highest-signal clusters for v3

1. **Memory + context engineering is by far the densest cluster** (~16 YES URLs:
   honcho, sky-omega, TencentDB-Agent-Memory, codegraph, lean-ctx, headroom,
   lossless-claw, TOON, OKF, cocoindex, auto-context, the multi-layer-memory gist,
   SimpleMem/MemPalace). Directly feeds **L11 (memory scopes) + L2b (context
   assembly)** and confirms context/memory should be a first-class v3 surface, not
   an afterthought.
2. **The process-guardrail free-text ideas (lines 8–43) are the highest-value
   original thinking** — escalation rules, baseline-preservation audits,
   `intervention_count` telemetry, watchdog recovery. These are concrete **L1/L2
   gate-policy + L0d lifecycle-telemetry** requirements drawn from real bubble
   failure modes. Design-shaping, not just references.
3. **Harness/orchestration references** (meta-harness, symphony, omnigent,
   paperclip, pi-subagents, vibe-kanban) cluster around **L4 child-instances** and
   the harness-abstraction layer — paperclip and meta-harness are the two most
   on-theme to study after omnigent.
4. **Spec-as-code / reverse-engineering-to-contract** (reversa, OKF, lines 12,
   105) aligns with the v3 "checkable/executable artifacts" cross-cutting concern
   and the existing v3 reverse-engineering work.
5. **Per-worktree provisioning + ephemeral observability (lines 51–52)** are an
   unusually concrete **L0e/L0f** spec source — worth lifting almost verbatim into
   RuntimeContextProvider requirements.

## Caveats

- Snapshot of 2026-06-19; external repos may have moved.
- `guess` rows are name/owner-based judgments without a fetch; `fetched` rows were
  identified via WebFetch/WebSearch. Line 114 (`harness.bencium.io`) returned 403
  and is a name-based guess.
- "Interesting for v3" is judged broadly (core-model levels + cross-cutting
  concerns + process/DX that shapes v3's direction). A YES means "worth a look",
  not "must build".
