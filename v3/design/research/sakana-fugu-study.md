# Study — Sakana Fugu (TRINITY + Conductor → a learned dynamic orchestrator in production)

**Source:** Sakana AI, product page <https://sakana.ai/fugu/> (fetched 2026-07-24) and its three
referenced papers: **TRINITY** — Xu, Sun, Schwendeman, Nielsen, Cetin, Tang, *TRINITY: An Evolved
LLM Coordinator*, arXiv:2512.04695 (ICLR 2026); **Conductor** — Nielsen, Cetin, Schwendeman, Sun,
Xu, Tang, *Learning to Orchestrate Agents in Natural Language with the Conductor*,
arXiv:2512.04388; **Sakana Fugu Technical Report**, arXiv:2606.21228.
**Type:** web/paper research capture — **not** a codebase reverse-engineering study. The product is
closed; no `file:line` evidence exists. Mechanism claims below cite paper sections instead.
**Why it is in this series:** Fugu is the first *production* system in the corpus whose entire
product is the thing `_dynamic-orchestrator-workflow.md` reasons about: an LLM that constructs a
multi-agent workflow at runtime. Unlike Omnigent (a prompted orchestrator, Polly), Fugu's
orchestrator is *trained* (SFT + evolution + RL) to emit workflow structures. Its value here is as
an external checksum on the memo's settled direction — and the checksum comes back **confirming**.

---

## Executive summary — five load-bearing findings

1. **Even a frontier RL-trained orchestrator converges on "generate a declared plan, then execute
   it" — not on free-form mid-flight steering.** Fugu-Ultra's orchestrator "outputs full agentic
   workflows as natural language that divide an input task, allocate arbitrary subtasks, and define
   targeted communication strategies" (tech report §3.2.1) — a step list with worker IDs and
   context access lists, **fixed at generation time**. There is no re-evaluation or re-delegation
   between steps based on intermediate results. Dynamism lives in *which* plan gets generated per
   task, not in mutating the plan mid-trajectory. This is precisely the v3 settled direction:
   *"the agent chooses at runtime — among declared possibilities"* — a template pattern, not a
   kernel mechanism. Sakana reached the same shape from the opposite direction (end-to-end RL
   reward maximization instead of kernel-discipline reasoning).

2. **The access list is an independently invented context-packet discipline, with a named failure
   mode as its motivation.** In Fugu-Ultra, "an agent observes the actions and outputs of another
   agent only through the access list" (§3.2.2) — explicitly to prevent **"orchestration
   collapse"**, where one agent's environment actions steer all subsequent agents. That is v3's
   L0b issued-context principle (agents see only what the kernel issues, no ambient sharing),
   corroborated from a system that arrived at it because training *broke* without it. "Orchestration
   collapse" is a useful loanword for the failure v3's context isolation prevents.

3. **Attribution-at-ingress shows up as an execution necessity, not just an audit nicety.** "Any
   agent may make a function call at any time," and the runtime "must retain which agent emitted
   every call, along with where that agent sits" to route results back (§3.2.2). A production
   multi-agent runtime cannot function without knowing *who* emitted *what* from *where* — v3's
   authority binding at emit ingress is the same requirement, made durable.

4. **The role triad and the verifier corroborate v3 constructs one more time.** TRINITY's
   coordinator assigns **Thinker / Worker / Verifier** roles per turn to models in a pool — role
   binding as the orchestration primitive (≈ v3 step→role→actor dispatch), with verification as a
   first-class role (another external vote for the `verify` gate, after Superpowers, gastown,
   gstack, and the harness survey).

5. **What Fugu learns is orthogonal to what v3 builds — and that is the actual lesson.** TRINITY
   (a ~0.6B coordinator evolved with sep-CMA-ES) and Conductor (a 7B model RL-trained to design
   agent topologies and per-agent prompts) learn the *orchestration policy*: which workers, what
   order, what context, what instructions. They assume an execution substrate that spawns workers,
   routes context, and collects results — and that substrate is exactly the kind of thing v3 is.
   The two layers compose: a learned (or prompted) planner is an *actor* whose plan output becomes
   committed template/instance structure; the kernel neither knows nor cares whether the plan came
   from RL weights or a human. v3 should make sure nothing in its shape *precludes* a
   model-generated workflow being submitted as a plan — and nothing currently does.

---

## 1. What Fugu is, precisely

A commercial API product (variants: **Fugu**, **Fugu Ultra**, **Fugu Cyber**) exposing a
coordinated pool of frontier models behind one OpenAI-compatible endpoint. The orchestrator model
decides per request how to use the pool; the customer pays a single rate (highest-tier model in the
pool), and Sakana claims frontier-level results without single-vendor dependency. Headline claims
(all self-reported, see §5 reception): SWE-Bench Pro 73.7 (Fugu Ultra) vs 69.2 (Opus 4.8),
LiveCodeBench 93.2, GPQA-D 95.5; Fugu-Cyber 86.9% on CyberGym. Six qualitative demos (autonomous
GPT-training-recipe optimization over 123 experiments, blindfold chess vs 2100-Elo Stockfish, CAD,
trading, etc.). Not available in the EU/EEA at capture time.

Two research lineages feed it:

- **TRINITY** (arXiv:2512.04695): a compact coordinator — ~0.6B LM + ~10K-parameter head —
  iteratively assigns Thinker/Worker/Verifier roles to pool models each turn. The coordinator is
  optimized with separable CMA-ES (evolution, not gradient RL); skill stays in the workers, only
  coordination is learned. SOTA claims incl. 86.2% LiveCodeBench.
- **Conductor** (arXiv:2512.04388): a 7B model trained with pure RL to emit, in natural language,
  (a) which agents to activate, (b) the communication topology between them, (c) targeted per-agent
  prompts. Trained with randomized pool composition so it adapts to arbitrary open/closed pools.
  Supports **recursive topologies** — the Conductor can select *itself* as a worker, giving
  iterative test-time scaling (≈ nested orchestration / child-workflow recursion).

## 2. The production mechanics (tech report §3)

**Fugu (fast variant)** is not an orchestrator at all: a lightweight prediction head outputs logits
over the worker pool and routes the whole query to one model (§3.1.1). Trained in two stages: SFT
against softmaxed per-worker reward distributions, then sep-CMA-ES on end-to-end multi-turn reward
(§3.1.3). *v3 relevance: none — this is model routing below any workflow floor.*

**Fugu-Ultra (the interesting one):**

- The orchestrator generates a workflow as natural language: a sequence of **steps**, each with a
  subtask description, a **worker agent ID**, and an **access list** naming which prior steps'
  outputs enter this worker's context (§3.2.1). Topologies range from best-of-N and sequential
  chains to parallelizable trees with merge points. Workflows are budget-capped (up to 5 steps).
- **The plan is fixed at generation time.** No dynamic re-planning mid-trajectory; no follow-up
  delegation decided from intermediate results. Within an assigned step, an agent iterates freely
  with its environment ("any agent may make a function call at any time", §3.2.2) — the runtime
  routes each call back to its emitting agent.
- **State:** persistent workflow state during a run; **inter-workflow shared memory** across turns
  of a multi-turn conversation lets agents observe tool calls from previous workflows (§3.2.2) —
  their answer to warm continuity across rounds.
- **Verification:** no internal verify loop; correctness arrives post-hoc via the training reward
  (§3.2.1). TRINITY's Verifier role exists in the research lineage but the shipped Ultra pipeline
  as described has no runtime gate.
- **Training:** GRPO with a two-tier reward — format correctness (does the workflow parse) and
  task correctness (does execution solve the problem) — plus a KL leash (§3.2.3).

## 3. Crosswalk — Fugu mechanisms ↔ v3 constructs

| Fugu mechanism | v3 construct | Fit | Note |
|---|---|---|---|
| Orchestrator emits a step list at runtime | template pattern over declared shapes (memo settled direction) | **clean, confirming** | the plan is *declared before execution* even though authored by a model per-request |
| Access list per step | L0b issued context packet | clean | independently invented, with "orchestration collapse" as the named failure it prevents |
| Worker-ID assignment per step | step → role → actor binding | clean | Fugu binds to concrete models; v3 binds via roles — v3's indirection is strictly richer |
| "Retain which agent emitted every call" | authority binding / attribution at emit ingress | clean | execution-level necessity there; durable audited fact here |
| Parallel tree topologies with merge points | L4 fan-out (future-topic L4 #12) + wait/collect | clean | runtime-sized N decided by the planner — same construct the BitSafe simulation registered as GAP-3 |
| Conductor recursive self-selection | L4 child_workflow nesting | clean | a child that is itself an orchestrator |
| Inter-workflow shared memory across turns | shape 6 multi-round continuity / L11 memory scope | partial | theirs is ambient ("observe tool calls from previous workflows") — v3 would issue it as context, not leak it |
| Agent's free tool-calling inside a step | shape 5, below the kernel floor | clean | same weight-rule placement |
| TRINITY Verifier role | `verify` gate / verifier role binding | partial | present in research, absent as a runtime loop in shipped Ultra |
| Learned orchestration policy (evolution/RL) | — (no v3 counterpart) | **orthogonal** | the policy layer above the kernel; v3 is the substrate such a policy would drive |
| No audit trail, no idempotency, no human gates surfaced | L0a kernel discipline, L2/L3 | **gap on their side** | a closed inference product has no need to expose this; an SDLC platform cannot skip it |

## 4. LEARN / AVOID / ORTHOGONAL

**LEARN**

- **"Orchestration collapse"** as vocabulary and as evidence: ambient cross-agent context sharing
  is not just an audit problem, it degrades *task performance* enough that Sakana engineered
  isolation (access lists) to be able to train at all. Cite this when defending L0b's
  issued-context strictness against convenience pressure.
- **Plan-as-artifact.** The single most useful architectural datum: when you *train* an
  orchestrator end-to-end with full freedom, what comes out is a *declared, inspectable workflow
  object* — because the format reward requires parseability and the runtime requires structure.
  The memo's "no first-class dynamic-orchestrator mode" bet predicted this shape; Fugu is the
  strongest external confirmation yet, stronger than Omnigent (where the orchestrator is merely
  prompted and the plan stays in its context window).
- **Keep the planner-actor door open.** A v3 workflow template authored by a model at runtime and
  submitted through normal ingress (validated, committed, then executed) is the exact composition
  Fugu demonstrates is viable. This is not new v3 machinery — it is a *use pattern* of existing
  machinery worth naming when the dynamic-orchestrator template pattern gets authored.
- **Budget caps on generated plans** (≤5 steps, budget field): a learned planner gets a hard
  structural budget. Any v3 route that accepts model-generated plans should carry the same kind of
  declared cap (steps, fan-out N, spend) as part of the plan's contract, not as adapter courtesy.

**AVOID**

- **Ambient inter-workflow memory.** "Agents observe tool calling from previous workflows" is
  warm-continuity-by-leakage. v3's shape-6 answer (instance state + runtime_context, kernel-tracked;
  conversational warmth adapter-side) keeps the same capability with provenance.
- **Verification as training-time-only.** Post-hoc reward is fine for a benchmark product; an SDLC
  kernel needs the runtime `verify` gate. Do not read Fugu's benchmark numbers as evidence that
  runtime verification is dispensable.
- **Opacity as a product feature.** Fugu's one-endpoint magic is the anti-pattern for v3's domain:
  the customer cannot see which models ran, what they saw, or why. Everything v3 exists to make
  auditable is deliberately hidden here. Same mechanism family, opposite trust posture.

**ORTHOGONAL**

- The entire training stack (SFT on reward distributions, sep-CMA-ES, GRPO) — policy learning is
  above v3's abstraction line.
- Model-pool economics (single-rate pricing, vendor-dependency hedging, export-control positioning).
- Fugu-fast's logit routing — model selection below the workflow floor.

## 5. Reception and adoption (as of 2026-07-24)

Announced ~2026-06-21 (Fugu-Cyber added 2026-07-21). **Sentiment: high interest,
skepticism-dominant.** The HN launch thread (247 points, 127 comments,
<https://news.ycombinator.com/item?id=48624782>) was large but critical; the modal take across
HN/X is "a premium model router with a very good marketing story."

**What people say:**

- Most-cited hands-on critique (HN, cortesi): "For $200/month you get < 3 hours of use per week,
  the API is extremely slow, and the output quality in my tests is nowhere near Fable" — though
  the same tester found its code *reviews* "quite strong."
- The structural criticisms: "a black box in front of other black boxes" (HN); "isn't this just
  OpenRouter [Fusion]?" (the most-repeated dismissal — defenders answer that Fugu's coordinator is
  a *trained model deciding routing/topology up front*, not post-hoc fusion).
- The most substantive independent critique (<https://paddo.dev/blog/sakana-fugu-orchestration-model/>):
  the architecture is "genuinely on-thesis" and the tiny-coordinator idea is real innovation, but
  the launch claims are structurally **unfalsifiable** — proprietary undisclosed pool, per-query
  routing never revealed, comparisons excluding stronger models (Fable 5 scores 80.0 on SWE-Bench
  Pro vs Fugu Ultra's headline 73.7-beats-Opus framing; Fable was excluded as unavailable under
  export controls). Sakana's track record is also cited (the AI CUDA Engineer benchmark-sandbox
  exploit; AI Scientist's ~42% experiment failure rate per arXiv:2502.14297).

**Benchmark verification status: essentially unverified.** No third-party reproduction of any
Fugu number existed as of late July 2026 (multiple sources state this explicitly). The sharpest
case is **Fugu-Cyber: claimed 86.9% on CyberGym vs ~20% achieved by top model combinations in
CyberGym's own creators' ICLR 2026 results**, with no disclosed methodology — flagged in press as
one of the largest unexplained vendor-vs-independent gaps to date. The underlying research is
peer-reviewed (TRINITY and Conductor are both ICLR 2026), but no independent replications of
either paper were found.

**Adoption: listed everywhere, used lightly.**

- OpenRouter lists `sakana/fugu-ultra` (added 2026-06-24, $5/$30 per 1M tokens, 1M context) with
  ~3B tokens processed on the provider page — order-of-magnitude *small* (top OpenRouter models
  run hundreds of billions to trillions weekly).
- Vercel AI Gateway carries it officially; Codex has a documented one-line integration; Cursor has
  no native support (BYOK workaround only; staff: "no timeline"). No aider/Cline recipes found.
- The most concrete usage report (DevelopersIO/Classmethod, GA on the $20 tier,
  <https://dev.classmethod.jp/en/articles/sakana-fugu-ga-first-touch/>): fugu-ultra 11–269s
  responses; **~60% of billed tokens are hidden orchestration overhead** (measured 26,404-token
  example); 6 API calls ate 18% of a 5-hour quota; internal Worker-role text occasionally leaks
  into responses.

**Recurring practical concerns:** ceiling-of-pool pricing with orchestration tokens billed as
normal tokens (~$10/message reports); uncontrollable tail latency; pool swappable by Sakana
without user control or per-query attribution; EU/EEA unavailability; cheaper Fugu sometimes
matching Ultra's output.

*For this corpus the reception matters twice: (a) the coordination-overhead and latency numbers
are the real-world cost of runtime orchestration — a cost v3's declared-template execution largely
avoids paying per-request; (b) the "unfalsifiable black box" backlash is live market evidence that
auditability of orchestration — exactly v3's posture — is a felt gap, not a theoretical one.*

**Search-coverage caveats:** no direct Reddit threads surfaced (index limitation, not proof of
absence); the OpenRouter 3B-token figure has no labeled time window; organic X commentary was
reachable only via secondary roundups; YouTube not searched.

## 6. Caveats

- **No code.** Every mechanism claim traces to paper text (sections cited), not to executable
  artifacts; the shipped product may differ from the tech report.
- **All benchmark numbers are self-reported** by Sakana at capture time; see §5 for the
  independent-verification status.
- The product page's comparative claims (vs Opus 4.8, Fable 5) are marketing-adjacent; this study
  uses them only to establish that the system is taken seriously enough to matter as evidence.
