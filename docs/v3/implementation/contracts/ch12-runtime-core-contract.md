# ch12 — runtime-core contract

```json
{"contract_draft": {"chapter": "ch12", "surface": "runtime-core", "status": "draft"}}
```

## Context (non-normative by declaration)

**Sources.** Plan §12 (ratified 2026-07-18 @ `142699a0`); the model
units `l0c-pseudocode/*` + `l0d-pseudocode/*` + `l0e-pseudocode/*`,
the section prose (`model-src/sections/03-l0c.html` / `04-l0d.html` /
`05-l0e.html` — the domain field lists and the naming guards), the
golden-trace Config views (`code/l0c-template-config.new.txt`,
`code/l0d-template-config.new.txt`, `code/l0e-template-config.new.txt`),
and their ledger slices (§2 invariants — 3 l0c + 6 l0d + 6 l0e; §3
rejections — `not_active`, `task_required`,
`runtime_context_provider_unavailable`, all already registry members;
§4 domain registry); the ch8 `template-format` contract (the base
format the runtime keys EXTEND — its C7 forward declaration is the
growth mechanism, its C13/C14/C15 keyset rows the base state); the
ch11 `gate-format` contract (C18/C19 + C21's two runtime-context
lane texts + C30's runtimeContext growth item — rows this chapter's
ratification act REOPENS, as is ch8-C14; C20 single-authority
admission; C21 container preconditions; C36 the workspace-emptiness
backstop; the C13/C16/C37 camelCase rename culture); the ch6-P4a/P4b CLI canonical
matrices (channel/error/exit contract the new verbs inherit).

**Seed-row disposition** (plan §12.3's indicative set → rows; no seed
item is undisposed): `agent_config` grammar (role default + step
override keys, inline field set, `*_refs` value classes vs the ch-8 id
grammar) → C6/C7/C8; `activation` key (mode enum, absent default) →
C1; `runtime_context` requirement grammar VIA the named reopen set
(ownership move + the bare `required` compat decision; the set as
aligned: ch11 C18/C19 + C21's two lane texts + C30's growth item +
ch8-C14) → C2/C3/C4/C5 + C26 (+ the prepared reopen texts below); run-override
start-input surface → C9 (+ C20's `create` schema); provider-contract
wire shapes (provision inputs, ready event, projection) →
C15/C17/C18; per-chapter registry composition → C16; lifecycle CLI
verb schemas + exit lanes → C19/C20 (+ C21 floor); store schema
columns + wait/runtime-context encodings → C11/C12; module-home ADR →
C22 (ADR-014).

**Control-Model answers (round-0 skeleton).**

- *Business invariant:* a run's macro-lifecycle is a stored axis with
  exactly one terminal disposition, written once; readiness gates the
  first dispatch (a created-but-unactivated instance never
  dispatches); every lifecycle mutation commits atomically under
  `instance.version` with the same `(instance_id, op_id)` idempotency
  as actor commits (uniform commit discipline).
- *Control model:* the kernel owns the lifecycle machinery, the
  admission ladder, and the provider CONTRACT; a provider owns the
  provisioning mechanics (ch 9 ships the real one); the config
  cascade is a pure kernel resolver over immutable sources; the CLI
  verbs are thin ingress writers (the ch6 write-entrypoint rule — no
  direct `StorePort` writes).
- *Read-path:* the floor (`list` / `detail` / `timeline` / `tail`)
  extended with the lifecycle axis and the runtime-context state
  (C21); the packet carries the actor-facing projection or an
  explicit `none`, never the raw ref.
- *Forbidden fallback:* an unknown provider never provisions
  (`runtime_context_provider_unavailable`, pre-commit); a
  wrong-kind readiness ref never becomes `ready` (kind boundary); an
  actor emit outside ACTIVE never commits (`not_active`); a terminal
  instance accepts no further lifecycle mutation (terminal is a
  sink); nothing on this surface is fail-open.
- *Allowed resolution:* the effective agent config is RESOLVED (never
  stored) from role default ⊕ step override ⊕ run override; an absent
  `activation` key resolves to `immediate` at admission; an absent
  `runtimeContext` key resolves to the requirement `none`.
- *Missing-data:* `create` in immediate mode without a task is
  `Rejected(task_required)`; a deferred run's task arrives at
  KICKOFF; a context-free run is trivially `ready(∅)` — nothing to
  provision; an unknown step key in `runOverrides` is INERT by the
  model's `get`-semantics (C9 — stated, not accidental).

**Substrate probe record** (yaml@2.9.0 — the v3 package's pinned
dependency, version verified in-session; `scratchpad/runtime-probe/probe.mjs`,
2026-07-18):

| Probe | Question | Result |
|---|---|---|
| RP1 | is the authored scalar `none` a string under 1.2 core? | yes — `none` (and `"none"`) resolve to the STRING `none`; `null` / `~` / an empty value resolve to JS `null` — the present-null form is a DISTINCT node class, never the string (C4's lane split is real at the parser) |
| RP2 | do the illegal value classes parse clean? | yes — the bare string `required`, a list value, and present-null all parse with zero diagnostics: every value-domain rule is validator-owned (the ch8 GP5 culture) |
| RP3 | does the spec-map block form parse clean with a raw `config` sub-map? | yes — `{kind, provider, config{…}}` yields the natural object graph; a QUOTED brace-bearing string (`"bubble/{instance_id}"`) rides through intact |
| RP4 | unquoted braces in plain scalars? | mid-scalar braces are LEGAL (`bubble/{instance_id}` unquoted → that exact string); a LEADING brace opens a flow map and errors (`UNEXPECTED_TOKEN`) — fail-closed via the ch8-C2 promotion; an authoring hazard note, not a lane |
| RP5 | flow-map `agentConfig` forms with list values? | parse clean — `{ mode: builder, promptProfileRefs: [engineer-defaults] }` yields object + array, zero diagnostics |
| RP6 | hostile spec-map forms (the round-1 substrate lens's re-run extensions — the ch11-GP6 pattern)? | a merge key `<<` inside the spec map is a LITERAL key named `<<` under 1.2 core (double fail-closed under C3: unknown key + missing `kind`); anchor/alias spec maps resolve to plain object graphs (no bypass); explicit `!!str none` → the string `none`; capitalized `None` → the string `None` (NOT the requirement — C2's container lane); `NULL`/`Null` join the present-null family; a duplicate `kind` key is a document-wide `DUPLICATE_KEY` error (ch8-C4); the drive-in-tests obligation for these forms is C25's |

**The prepared reopen texts** (the payload of row C26; applied to
`ch11-gate-format-contract.md` — C18/C19/C21/C30 — and to
`ch8-template-format-contract.md` — C14 — by the reopen commits; the
ratification act that ratifies THIS draft resolves them, per plan
§12.1 item 3 as aligned: C21 because two lane texts hard-code the
retired value domain, C30 because its additive-only promise binds
that domain, ch8-C14 because the C7 narrowing must leave ONE owner on
every page; pointer form throughout):

- C18 (reopened): *The template top level's OPTIONAL `runtimeContext`
  key (ch8-C7 additive growth). Its value domain and grammar are
  OWNED by `contract:ch12-runtime-core#C2–#C4` (ownership moved by
  the ch12 ratification act, 2026-07-18 — the consuming chapter this
  row named). The bare string `required` is RETIRED by that same act:
  the removed form fails LOUD with its migration text (the §8.2
  rule 3 mechanic, the act itself the authority) — the recorded
  exception to this row's original "existing files keep their exact
  meaning" promise, legal only as this explicit human
  re-ratification.*
- C19 (reopened): *The process↔workspace lane: a template declaring
  ANY `external.process` gate whose `runtimeContext` requirement
  RESOLVES to `none` (authored `none` or absent key) yields the
  `runtime_context_required_for_process_gate` ADMISSION issue — the
  trigger's grammar is owned by `contract:ch12-runtime-core#C5`; an
  ILLEGAL `runtimeContext` value yields ONLY its own container
  finding, this lane suppressed as its dependent (the C21
  container-precondition rule). The model's HANDLE `ready(∅)` runtime
  backstop (C36) is unchanged.*
- C21 (reopened — the two `runtimeContext` lane texts ONLY, the rest
  of the matrix untouched): *the lane "`runtimeContext` illegal
  value" reads "the `runtimeContext` value violates its ratified
  grammar — owned by `contract:ch12-runtime-core#C2–#C4`; ONE
  container finding, dependent lanes suppressed"; the lane "process
  gate without `runtimeContext: required`" reads "process gate with a
  requirement resolving to `none` → code
  `runtime_context_required_for_process_gate` (C19, grammar
  `contract:ch12-runtime-core#C5`; suppressed under an illegal-value
  container finding)". A packet deriving its lane checklist from C21
  thereby derives the POST-reopen value domain.*
- C30 (reopened — the `runtimeContext` item of its growth list ONLY):
  *the list item "the `runtimeContext` value domain (C18)" reads "the
  `runtimeContext` value domain — ownership and growth stance moved
  to `contract:ch12-runtime-core#C2–#C4/#C23` by the ch12
  ratification act (2026-07-18; the same act retired the bare
  `required` form — this row's additive-only promise no longer binds
  that domain)"; every other keyset of the row grows only additively
  per plan §8.2, unchanged.*
- ch8-C14 (reopened — the ch8 draft's first reopen, same
  realized-reopen choreography): *"`agentConfig` is exempt from C13's
  unknown-key rule and the shape rows; at the VALIDATE stage the
  value passes through raw, subject to the document-wide C1–C6 gates
  and C5's acyclicity. Its VALUE DOMAIN is OWNED by
  `contract:ch12-runtime-core#C7` (map-only + canonical-JSON-safe —
  moved by the ch12 ratification act, 2026-07-18; this row's original
  any-value pass-through named itself "the L0c pass-through", and
  L0c's realizing chapter now owns the domain)."*

**Reopen choreography note (for the ratifying act):** BOTH affected
drafts (ch11, ch8) are `realized` (chapter-closed) — the template's
own lifecycle calls a post-close change a STOP, and plan §12.1 item 3
IS that STOP's pre-resolved mandate; these are the FIRST
realized-chapter reopens (ch11's own 2026-07-12 reopen ran from
`ratified`), so the act consciously blesses the escape-hatch use, not
a lifecycle arrow. Mechanics keeping every commit lint-green, PER
DRAFT: reopen commit 1 = the row edits (ch11: C18/C19/C21/C30; ch8:
C14) + the `realized_map` block REMOVED + status → `reopened` (map
presence requires `realized`); re-ratification commit 2 = the new
ratification block (recording commit 1) + the map RESTORED + status →
`realized`. The restored map entries record the REOPEN ITSELF — the
historical landing kept, plus "reopened at the ch12 ratification —
successor <per-row>" with the PER-ROW successors (C18 → `#C2–#C4`;
C19 → `#C5`; C21 → both; C30 → `#C23`; ch8-C14 → `#C7`) — never a
forward promise of unbuilt ch12 landings. Each commit 2's new
ratification block carries its own template-§5 metrics line, and
commit 2 also updates the affected draft's POST-CLOSE metrics
reopenings line (ch11 Close-metrics 1 → 2; ch8 Close-metrics 0 → 1 —
never the frozen ratification-time snapshot).
The PREPARED template §4 patch (applied to
`contract-draft-template.md` §4 by the ratifying act, the ch11-C38
amendment-rides-the-act pattern — a THREE-part patch so no
contradictory pair of normative sentences survives):
(i) the lifecycle DIAGRAM's reopen loop gains the realized leg —
`reopened ◀── ratified/realized` annotated *"(from ratified; from
realized only as a resolved STOP)"*; (ii) the EXISTING reopen bullet is
REPLACED IN FULL by the bifurcated form — *"Reopen (from `ratified`
directly; from `realized` ONLY as a human-resolved STOP — the
post-close escape hatch below): from `ratified`: commit 1 edits the
C-rows and flips status to `reopened` (equality suspended — green);
commit 2 appends the new block recording commit 1 and flips back to
`ratified`. Re-ratification is permanently human, exactly like
ratification. The `realized` path follows the post-close bullet's
mechanics EXCLUSIVELY — its commit 2 returns to `realized`, never
`ratified`."* (the ratified-path two-commit mechanics preserved
verbatim; the realized path fully delegated — no contradictory pair
survives); (iii) a new bullet: *"Post-close
(realized) reopen: a post-close change remains a STOP; when the human
resolves it by ordering a reopen (first exercise: the ch12
ratification's mandated reopen set — ch11 C18/C19/C21/C30 +
ch8-C14), the draft passes
realized → reopened → realized — commit 1 removes the `realized_map`
with the row edits and the `reopened` flip, commit 2 restores the
updated map with the new block and the `realized` flip; every commit
lint-green; the resolution is never inferred."*

**Ratification decision points** (the digest's spine — INDEPENDENT
human decisions, PRESENTED STEPWISE at the act per README §6's
one-decision-per-message discipline; this block is their record):

1. **The cross-contract reopen set + the bare-`required` retirement**
   (C26/C2: ch11 C18/C19/C21/C30 + ch8 C14 reopened to pointer forms
   — plan §12.1 item 3's mandated act as aligned; every affected
   value domain keeps ONE owner on every page; reality checks below —
   no startable file breaks on either retirement).
2. **The ch8-C14 narrowing at the step position** (C7: `agentConfig`
   becomes map-only + canonical-JSON-safe where it was any-value —
   the §8.2 rule 3 MECHANIC, the act itself the authority; ch8-C14 is
   REOPENED by the same act to its pointer form, so NO stale anchor
   survives on any page; tree sweep: zero authoring files, paper-only
   break).
3. **The READY terminal-sink model fix — EXECUTED, `76e34413`** (the
   panel surfaced that the ratified `RUNTIME_CONTEXT_READY` units
   carried no terminal-sink rung — a post-CANCEL late READY would
   have resurrected a cancelled run against `terminal-is-a-sink`; the
   user ordered fix-first at the draft STOP, and the l0d + l0e READY
   units now carry the `kernel_status ≠ TERMINAL` state expectation,
   mirroring FAIL — registry-neutral (ledger byte-identical), no new
   rejection name (bare-REQUIRE guard); C15 binds the post-fix
   semantics.)
4. **Silently-contestable stances riding flag-free otherwise** (the
   panel's digest nominations): C3 (the INVENTED `kind` grammar — the
   model gives none — and the provider-grammar reuse foreclosing
   single-token ids), C13/C1 (the `activation_mode` relocation from
   the model's operator parameter to the template key — forecloses
   per-invocation choice), C8 (authored `null` OVERWRITES — no
   deletion semantics), C9 (unknown `runOverrides` step key INERT —
   model-faithful, no covering registry name), C15 (provisioning
   failure has NO port channel at ch12 — the model prose's
   failure→FAIL routing deferred WITH its Absent; a never-ready run's
   recourse is floor visibility + CANCEL — AND the ordered-after-commit
   hold/release seam, a designed safety beyond the model's comment),
   C18 (the must-detach port obligation + the pre-commit port-breach
   integrity throw — the model constrains neither), C16 (EMPTY production
   registry — spec-declaring templates honestly unstartable through
   the shipped CLI until ch 9), C19 (no CREATE+START convenience verb
   at ch12), C25 (the P1-window in-handler CREATE→START bridge on the
   shipped `start` verb — interim, replaced at P4), C11/C21 (the
   `status` read-doc retirement — breaking floor-output change).

**Bare-`required` reality check (recorded for the ratifier):** the
only live consumers of the bare form are test fixtures and the ch11
realization itself; the shipped CLI already REFUSES to start a
`runtimeContext: "required"` template (`cli/main.ts` — the explicit
unstartable guard), and the canonical `local-pair-v0@1.yaml` does not
author the key — the retirement breaks no startable file. The packet
sweep (C24) retires the guard together with the seam.

**Packet-time watchpoints (non-normative — flagged by the panel,
deliberately NOT contract rows):**

- The l0e golden-trace Config view authors
  `provider: pairflow.worktree` while the ch12 PRODUCTION registry is
  empty (C16): the trace's TEST registry registers the scripted
  provider under that name (registry names are test-chosen data,
  C16) — the builder reconciles this deliberately, never by silently
  renaming the trace.
- The C7 migration-reality measurement (zero `agentConfig` authors)
  and the bare-`required` reality check below are POINT-IN-TIME tree
  sweeps: the owning packets re-run them at build (R-UNTRUNCATED-SWEEP).
- The trace realignment concentrates BOTH golden traces (l0d + l0e)
  at P3 on top of the full provider machinery — the P3 build's
  template-§2 step-0 sizing measurement re-checks the packet's load
  (the plan flags only P1 as the declared split candidate).

**Draft metrics** (template §5 — recorded at ratification): —

## Contract rows (every normative statement is a C-row)

| ID | Rule |
|---|---|
| C1 | The template top level gains the OPTIONAL `activation` key (ch8-C7 additive growth; the root keyset becomes the ch8 five + the ratified optional keys `runtimeContext`, `round`, and this — ch11-C37's aggregate note described the pre-ch12 state; the growth mechanism is ch8-C7's and no ch11 row is modified by this row). Its value is a FIXED-KEYSET map with the single key `mode`, which is REQUIRED when the key is authored (an empty `activation: {}` map is a finding on the missing-`mode` lane); `mode`'s value ∈ { `immediate`, `deferredKickoff` } (authored camelCase ↔ the model's `deferred_kickoff` — the ch11-C16 rename culture, stated so neither side silently forks); a non-string or non-member `mode` value is its lane's finding. A PRESENT `activation` value that is not a map — present-null, a scalar, a list — is a container-precondition finding at path `activation` (ONE finding, dependent lanes suppressed — C25's channel); unknown keys in the map are ADMISSION issues (ch8-C13 fail-closed culture). An ABSENT `activation` key ⇒ `immediate`, MATERIALIZED once at admission into the admitted template (behavior-preserving: every pre-key file ran the immediate one-shot path). |
| C2 | The `runtimeContext` top-level key's value domain (the C18 successor form, owned HERE by the reopen — Context carries the prepared reopen texts): the string `none`, or a SPEC MAP (C3). `none` declares a context-free workflow (the model's authored `runtime_context: none`); the spec map declares `required(spec)`. The bare string `required` is RETIRED at this ratification (no third value; the removal fails LOUD with the migration text "author the spec map `{kind, provider, config?}`" — the §8.2 rule 3 MECHANIC applied to a value form; rule 3's letter is key-scoped, so the AUTHORITY is the ratifier's explicit act on the named reopened rows) — DECIDED HERE, resolved by the same human act that reopens ch11-C18/C19/C21. Any other value — present-null, a list, any other scalar (probes RP1/RP2: all parse clean) — is a container-precondition ADMISSION finding at path `runtimeContext` (ONE finding, dependent lanes suppressed, ch8-C21). |
| C3 | The spec map is FIXED-KEYSET: `kind` (required), `provider` (required), `config` (OPTIONAL map — DECIDED HERE: the model exhibits only the present form; a provider may need no config, so absence is legal). `kind` is a nonempty string matching `^[a-z][a-z0-9_]*$` — DECIDED HERE: the model exhibits only token values (`worktree`; `mailbox`/`browser_session` in prose) and gives no grammar; a single lowercase token is chosen because `kind` names a ref/projection FAMILY (never a path segment, so ch8-C10's dot-ban rationale does not bind — the grammar is a deliberate pick, not an entailment). `provider` REUSES the ch11-C6 dotted evaluator-id grammar (`^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$` — `pairflow.worktree` and the testkit player names conform; provider ids are VALUES, never error-path segments, exactly the C6 relation to ch8-C10) — DECIDED HERE: the reuse forecloses single-token provider ids, deliberately (a provider name carries a namespace, the registry-composition culture). `config` is RAW PASS-THROUGH, provider-owned (the ch8-C14 stance at this position: it must survive the document-wide ch8 C1–C6 gates and C5's acyclicity, and is otherwise uninterpreted — the kernel and admission never read inside it; probe RP3). Unknown keys in the spec map are ADMISSION issues. |
| C4 | ABSENT `runtimeContext` key ≡ the requirement `none` (behavior-preserving; a context-free workflow needs no provider at all — the model's `RuntimeContextRequirement` default). The requirement is MATERIALIZED once at admission (the admitted template carries `none` or the normalized spec — no absent state downstream, the ch11-C14/C17 culture). The authored STRING `none` and the ABSENT key are the SAME requirement; the present-null form is NOT a legal spelling of either (probe RP1 — the null family is a distinct node class and lands on C2's container lane). |
| C5 | The process↔workspace ADMISSION lane (the C19 successor, trigger re-grammared): a template declaring ANY `external.process` gate whose requirement is `none` (authored or absent) yields the `runtime_context_required_for_process_gate` ADMISSION issue — a process gate needs a PROVISIONABLE workspace, and only a spec map provisions. Driven by the process registration's `requires_runtime_context` flag read by `admit_definition` (unchanged mechanism, template-grain single finding). This lane is a DEPENDENT of a LEGAL requirement: an ILLEGAL `runtimeContext` value fires ONLY C2's container-precondition finding — this lane is suppressed under it (ch8-C21's rule), never a second coded finding. The HANDLE `ready(∅)` runtime backstop keeps the SAME name as a rejection (ch11-C36, untouched — it now reads the real lifecycle field per C14). |
| C6 | A roles entry gains the OPTIONAL `defaultAgentConfig` key (camelCase of the model's `default_agent_config`; ch8-C15's keyset grows additively under the ch8-C7 mechanism — the ch11-C1 precedent of growing a ch8 keyset by successor row, no ch8 row modified: the roles-entry keyset becomes `defaultActor?` + `defaultAgentConfig?`). Its value is the agent-config value class (C7). |
| C7 | The agent-config VALUE CLASS (binds `roles.<r>.defaultAgentConfig`, `steps.<s>.agentConfig`, and every `runOverrides` entry): a MAP, otherwise raw and format-OPEN — NO field of it is format-enforced or kernel-interpreted. The model's field vocabulary (inline: `mode`, `approach`, persona/profile, execution hints; refs: `modelRef`/`modelHint`, `promptProfileRefs`, `promptConcernRefs`, `skillRefs`, `toolRefs`, `toolPolicyRef` — the l0c domain list in full) is DOMAIN vocabulary, not format grammar: the refs' value classes and their relation to the ch-8 id grammar arrive ADDITIVELY with their consuming chapter (the ch-9 ActorAdapter / L2b ContextAssembly), per the no-speculative-keys rule — DECIDED HERE: the kernel merges and records config; it never consumes a field, so typing now would enforce grammar no component reads. ENFORCEMENT is per position: the two TEMPLATE positions ride admission — inside the document they must survive the ch8 C1–C6 gates and C5's acyclicity (document-wide rules, unchanged), and a non-map value is a container-precondition finding (C25's channel); the `runOverrides` position arrives on the CREATE input channel (CLI JSON, never YAML — no document gate applies) and its structure is C20's CLI-side check, the kernel treating each entry opaquely (C9). Beside the map requirement, every position's RESOLVED values must lie in the CANONICAL-JSON-SAFE domain (the emit-lib strictness C10 serializes under: finite numbers — the YAML `.nan`/`.inf` forms resolve to non-finite doubles and are REJECTED here — plain maps/lists/scalars, no non-plain objects), a VALUE-LEVEL lane: C10's canonical provenance serialization must NEVER meet a non-serializable value — the violation fails closed at admission (template positions) or the CREATE input check (runOverrides), never as a commit-time serialization crash. The MAP requirement at the EXISTING `steps.<s>.agentConfig` position is an explicit NARROWING of realized ch8-C14's any-value domain — DECIDED HERE as the ratifier's explicit act, using the §8.2 rule 3 MECHANIC (a removed form fails LOUD with the migration text "agentConfig is a map — author the config fields as a map"; rule 3's letter is key-scoped, so the AUTHORITY is the ratification act itself, the mechanic borrowed), decided by the same ratification act that REOPENS ch8-C14 to its pointer form (C26; the prepared text in Context) — the value domain thereby has ONE owner on EVERY page: ch8-C14 keeps only its VALIDATE-stage statement (raw pass-through under the document gates) and delegates the value domain HERE. Migration reality: an untruncated tree sweep found ZERO files authoring `agentConfig` — the narrowing breaks no existing file. The two NEW positions are born map-only (no narrowing — no prior domain existed). |
| C8 | The cascade `resolve_agent_config(template, step, instance)` = `role.defaultAgentConfig ⊕ step.agentConfig ⊕ instance.run_overrides[step.id]` — LEFT-to-RIGHT precedence, each layer defaulting to the empty map. The merge is SHALLOW and RIGHT-BIASED at TOP-LEVEL-KEY grain: for every key present in the overriding layer, the overriding VALUE replaces the base value WHOLESALE — scalars overwrite; arrays and maps REPLACE, never deep-merge (the model's own comment, fixed here at one depth so no implementer invents recursion); an explicitly authored `null` is a VALUE that overwrites (no deletion semantics exist — DECIDED HERE). The resolver is PURE and DETERMINISTIC over immutable sources (pinned template + the create-snapshotted overrides, C9): `effective_agent_config` is computed at dispatch and RECOMPUTED at commit into the transcript's `issued_agent_config` — NEVER stored as instance state (the l0c invariants; `issued ≠ proven runtime` stays a review-disposition truth). |
| C9 | `runOverrides` (the run-override start surface): an OPTIONAL map of step-id → agent-config-class map (C7), supplied at CREATE (the CLI JSON key `runOverrides`, C20) and SNAPSHOTTED onto the instance's `run_overrides` state (C11's column — the one authored↔stored rename seam on this surface beside C1's, stated so neither side silently forks; frozen for the run). A key not in `keys(steps)` is INERT — the model's `get(step.id, empty_config)` semantics, model-faithful and DECIDED HERE against the dead-config-fail-closed culture: kernel CREATE validates instance inputs against registry-named rejections only, and no ledger name covers this shape (inventing one is the divergence stop); the shape is RECORDED as an authoring hazard, and an admission-side or CLI-side detection lane is a NAMED later additive decision, deliberately not taken here. |
| C10 | `issued_agent_config` provenance: every committed ACTOR transition's transcript entry carries the commit-time recomputation (the l0d HANDLE unit — resolved only for a committing envelope, never for a rejected one); lifecycle FACT entries (C12) carry NONE — absent by entry class, not known-empty. The stored form is canonical JSON (the emit-lib canonical-serialization culture — sorted keys, strict), so the deterministic-provenance invariant is byte-testable; `getInstanceDetail`/`getTimeline` expose it on transition entries (C12's entry shape on C21's read surface). |
| C11 | THE schema bump (ADR-003 fenced wipe; the prototype schema marker increments): the instances table gains `kernel_status` (TEXT, token ∈ `CREATED\|ACTIVE\|WAITING\|TERMINAL`), `terminal_disposition` (TEXT nullable, token ∈ `done\|failed\|cancelled`, WRITTEN EXACTLY ONCE — the single-write rule the `l0d/terminal-is-a-sink` checker owns), `activation_mode` (TEXT, token ∈ `immediate\|deferred_kickoff` — the STORED tokens are the MODEL's, like every stored token in this row; the authored↔model mapping is C1's), `wait` (TEXT nullable — canonical JSON `{kind, requested_by, resume_events}`; only `kickoff_pending` at ch12; NORMATIVE: `wait` is non-null IFF `kernel_status = WAITING` — every transition leaving WAITING clears it in the SAME atomic move, so no stale wait ever coexists with ACTIVE or TERMINAL — the model's "wait? (when WAITING)" domain statement made binding), `failure_reason` (TEXT nullable), `runtime_context` (TEXT — canonical JSON of the discriminated state `none \| requested{request_id} \| ready{ref}`; a provisioned ready stores the opaque `ref{kind, locator}`, and the context-free `ready(∅)` stores `ready` with `ref: null` — the ∅ encoding, DECIDED HERE), `run_overrides` (TEXT — canonical JSON map of step-id → agent-config map, the create-snapshotted C9 surface; an absent input stores `{}`). `task` becomes NULLABLE (absent until kickoff in deferred mode); `current_step` becomes NULLABLE (position is meaningless until ACTIVE); the ch-4 `status` column (`LifecycleStatus`) is RETIRED — `kernel_status` + `terminal_disposition` are the named replacement (DONE ≡ TERMINAL(done)). Creation initializes `version: 1`, `round: 0`, `current_step: NULL`, `kernel_status: CREATED`; ACTIVATION sets `current_step: template.start` and `round: 1` (the model's fixed lifecycle, ch11-C38's stated basis — the ch-4 round-1-at-start init moves accordingly). |
| C12 | Transcript entry classes: the table's rows split into ACTOR TRANSITION entries (the existing shape — envelope + `issued_agent_config` + `gateDecisions`) and LIFECYCLE FACT entries (`STARTED` / `CANCELLED` / `TASK_SUPPLIED`), discriminated by an entry-kind field. BOTH classes consume the ONE `(instance_id, op_id)` uniqueness (uniform commit discipline — a replayed lifecycle op is `Duplicate`); a fact entry commits in the SAME atomic move as its state change (the model's op_id-fact rule: a rejected attempt never consumes the key). Fact entries carry NO `issued_agent_config` and NO `gateDecisions` (absent by class, C10); `getTimeline` — committed-rows-only, unchanged rule — returns BOTH classes with their kind visible. |
| C13 | Ingress source routing (the model's RECEIVE): the ingress gains the operator-intent write family beside the actor-envelope path — `CREATE` (caller-minted instance id, the ch4-P1 rule unchanged; a duplicate id is the store's creation-uniqueness integrity failure, never a `Duplicate` outcome — creation-grain idempotency stays the named `creation_key` Absent), `START` `{instance_id, op_id}`, `KICKOFF` `{instance_id, op_id, task}` (task REQUIRED — the model's intent shape; its NONEMPTY-string grammar is this draft's, the ch4 task-string culture; it overwrites a create-time task), `CANCEL` `{instance_id, op_id}` — the THREE op-carrying intents' (START/KICKOFF/CANCEL) `op_id` minted by the REQUEST-SCOPED NONCE family (ADR-004's operator side, the ch6 nonce-consumer culture; CREATE carries NO `op_id` — creation is genesis, not a mutation), each shape validated strictly fail-closed at ingress (unknown keys reject — the ch4 CHK-C culture). The model's `CREATE_INSTANCE(…, activation_mode, …)` parameter is SUPPLIED BY the admitted template (C1's key) — DECIDED HERE: the model signature carries it as an operator input beside task/binding, and relocating it to the authoring surface forecloses per-invocation operator choice, deliberately (one source of truth; no CLI flag exists, C20; a named relocation, C24) — and CREATE snapshots it onto the instance (C11's column). KERNEL EVENTS (`RUNTIME_CONTEXT_READY`, `FAIL`) have NO external ingress endpoint at ch12: they fire in-process (the provider completion seam and kernel internals; tests drive them directly) — an external event channel is L8-era surface, deliberately absent. |
| C14 | The ch11-P3b start-input runtime-context seam is RECONCILED as a NAMED REPLACEMENT, never a parallel seam: `StartInstanceInput.runtimeContextRef` + the `resolveRuntimeContext` start-lane table + the instance's `runtimeContext: string \| null` minimal field + the CLI's `runtimeContext: "required"` unstartable guard are ALL retired; the real lifecycle state (`none \| requested(request_id) \| ready(ref)`) replaces them, and the ch11-C36 workspace-emptiness backstop re-reads the REAL field (`ready(∅)` = the context-free run's trivially-ready state — a process gate reached there still rejects `runtime_context_required_for_process_gate`). The packet's ripple sweep enumerates the retired value's CONSUMERS by name (R-ABSENCE-CONSUMERS is the packet obligation; this row names the seam). |
| C15 | The `RuntimeContextProvider` PORT contract (model-verbatim members): `provision(instance_id, request_id, spec)` — async, fire-and-forget from the kernel's view; its completion fires `RUNTIME_CONTEXT_READY(instance_id, request_id, ref)` through the in-process event seam (C13) — and `project_for_actor(ref) → RuntimeContextProjection`. The completion seam is ORDERED-AFTER-COMMIT — DECIDED HERE: the model's "async → later fires" comment is STRENGTHENED into a binding composition-seam rule (a designed safety absorbing the synchronous scripted player, not a model entailment): the composition delivers a READY completion into RECEIVE only AFTER the provisioning START's atomic commit has landed — a provider completing synchronously inside `provision()` (the scripted player may) is HELD by the seam, never lost to the pre-commit correlation window (`runtime_context` still `none` would reject it). The hold's RELEASE rule: a held completion releases when the initiating START attempt CONCLUDES — either its commit landed (delivery proceeds, correlation matches) or the attempt failed or was superseded (delivery still proceeds and the correlation rung rejects it, inert); a held completion is never dropped silently and never delivered mid-attempt. The ref and the projection are CANONICAL-JSON-SAFE VALUES BY PORT CONTRACT (finite, acyclic, plain data — C11 stores the ref, C17 carries the projection into the packet); a provider return violating that domain is a kernel/config INTEGRITY throw, fail-closed — never stored or projected lossily. Correlation is the SAFETY, not provider discipline: a duplicate, unsolicited, or already-resolved READY event fails the admission correlation rung (`runtime_context = requested(request_id)` no longer holds) and mutates NOTHING — a bare-REQUIRE guard rejection, no state change; and a READY reaching a TERMINAL instance is rejected on the terminal-sink STATE rung — the l0d/l0e READY units' `kernel_status ≠ TERMINAL` expectation (the ratified model fix `76e34413`, mirroring FAIL's guard; ratification decision point 3 records its provenance). Provisioning FAILURE has NO port channel at ch12 — DECIDED HERE, the named Absent's honest surface: READY is the port's ONLY completion; a failed provision simply never fires it, the run stays `CREATED` + `requested` — VISIBLE on the floor (C21) and cancellable via CANCEL (the operator recourse); the model prose's failure→`FAIL` routing arrives WITH the provisioning-failure-handling Absent (its wire shape, correlation, and reason domain are that later chapter's rows), and nothing at ch12 fires `FAIL` for a provider — no retry, no health machinery. |
| C16 | `ProviderRegistry` composition is STATIC, INJECTED at the composition root, and PER-CHAPTER: the PRODUCTION registry is EMPTY at ch12 — DECIDED HERE (the alternative, wiring the testkit player into production, would breach ADR-005's boundary and fake a capability the chapter does not ship) — a spec-declaring template is honestly unstartable through the shipped CLI (`Rejected(runtime_context_provider_unavailable)` at `start`, replacing the retired CLI-side guard with the kernel's own lane) — and `pairflow.worktree` JOINS at ch 9; the testkit ships the SCRIPTED provider player (C22) whose registry name is test-chosen data under C3's provider grammar. Resolution timing is START-ONLY (the `provider-resolved-at-start` invariant — a deliberate asymmetry with the gate registry's admission-time resolution, model-verbatim: admission validates the spec map's SHAPE, never resolves the name); `dispatch_intent`'s re-resolve of the SAME pinned provider is a kernel/config INVARIANT throw when it fails (`registry-stable-for-the-run`), never a business rejection. |
| C17 | The packet's `runtime_context` field: the ContextPacket gains it as EITHER the provider's `project_for_actor` projection (kind-specific, provider-owned shape — the kernel passes it OPAQUELY; the model's worktree example `{workspace: {path, branch, repo}}` is the ch-9 provider's business) OR the EXPLICIT value `none` for a context-free run — the actor sees the projection or an explicit `none`, NEVER the raw ref and never an absent field (`projection-never-the-ref`; the ch6 known-empty culture at the packet). |
| C18 | START's provider lanes (model-verbatim, fixed here as contract): requirement `none` → `runtime_context ← ready(∅)`, no provider touched, and START continues INTO `activate_or_hold` — the OUTCOME forks: none + `immediate` returns `Activated(dispatch_intent)` SYNCHRONOUSLY (no READY event exists on this path; the first dispatch leaves START), none + `deferred_kickoff` enters `WAITING(kickoff_pending)` and returns `Accepted`; spec form → registry resolve, and an UNRESOLVED provider name is `Rejected(runtime_context_provider_unavailable)` PRE-COMMIT — the `op_id` is NOT consumed (C12's rule at this lane), a corrected retry may reuse it; a resolved provider → `provision(...)` FIRST (the model's order — an external async call, necessarily OUTSIDE any store transaction), then the `requested(request_id)` marker + the `STARTED` fact committed in ONE atomic move, returning `Accepted` (the dispatch arrives on the async readiness path). The `provision` CALL's failure surface splits at the commit boundary — DECIDED HERE (the model's async fire-and-forget comment strengthened to a binding must-detach obligation, and the breach consequence is this draft's): `provision` MUST detach without throwing — a SYNCHRONOUS throw, or the AWAITED detach acknowledgment settling REJECTED before the commit ("immediately-surfaced" means exactly this — the kernel awaits the detach acknowledgment, never the completion), is a PORT BREACH, aborting the START attempt PRE-COMMIT as a kernel/config integrity throw (fail-loud, NO state change, the `op_id` unconsumed — a corrected composition may retry); a failure AFTER detach is the post-commit no-channel Absent (C15: the run stays `CREATED` + `requested`, floor-visible + cancellable); a CAS-conflicted commit restarts from load, where the single-shot state guard re-admits only if the marker never committed — a re-run then provisions AGAIN under a FRESH request_id, the superseded request's READY failing correlation (inert): duplicate provisioning across that crash/retry window is the DELIBERATE provider-side cost (teardown is the named Absent), never a kernel-state hazard; and an EARLY completion cannot be lost — the seam delivers READY only after the marker commit (C15's ordered-after-commit rule). On readiness the kernel's admission is C15's rung set (correlation + the terminal-sink state rung), and the ONLY validation on the REF ITSELF is the kind boundary (`ref.kind = spec.kind`) — a kind MISMATCH is a bare-REQUIRE guard rejection, no state change, the ref NOT accepted (the C22 scripted player's hostile-kind case drives it); the LOCATOR is provider-defined and NEVER validated or interpreted by the kernel (kind-boundary-only — the ref stays opaque kernel-side state). An ACCEPTED readiness commits `runtime_context ← ready(ref)` and continues into the SAME `activate_or_hold` fork as the none path: spec + `immediate` → `activate`, the first dispatch leaving the READY commit; spec + `deferred_kickoff` → `WAITING(kickoff_pending)` (the model's shared post-readiness decision — all four requirement × mode cells are thereby stated). |
| C19 | CLI verb surface: the write family gains `create`, `start`, `kickoff`, `cancel` as THIN INGRESS WRITERS (the ch6 write-entrypoint matrix extends — no CLI handler ever writes through `StorePort` directly). The shipped one-shot `start` SEMANTICS RETIRE (the verb name stays; its meaning becomes the model's START op — a BREAKING surface change, the ch8-C29 class: the packet sweeps EVERY call site — tests, smoke flows, docs, the journey suites). NO convenience CREATE+START composition ships at ch12 — DECIDED HERE (the model permits one; deferred additively — dogfooding runs `create` then `start`; the P1-window in-handler bridge is C25's — interim wiring, never this verb surface). NO new dev verbs; dev `replay` (hermetic, testkit-backed) is where the provisioned path is drivable pre-ch9, via the scripted provider. |
| C20 | Verb schemas + lanes (each verb inherits the ch6-P4a canonical channel/error/exit matrices UNCHANGED — stdout one data document, stderr one error doc, exit classes 0 ok / 2 usage / 3 not-found·kernel-negative / 1 internal; kernel outcomes incl. `Rejected`/`Stale`/`Duplicate` are DATA documents in their ch6 outcome classes): `create` takes the pinned template ref (ch8-C30 grammar), the caller-minted instance id (the existing rule), optional `--task`, the existing binding-override surface, and optional `--run-overrides` (a JSON map of step-id → agent-config map, C9 — shape-validated at the CLI as structure only, semantics kernel-side); the activation MODE comes from the ADMITTED template (C1), never a CLI flag. `start <instance-id>`, `cancel <instance-id>` carry no payload; `kickoff <instance-id> --task <task>` requires the task. `start`/`kickoff`/`cancel` mint their nonce `op_id` (C13; `create` mints the instance id only) and every verb surfaces the kernel outcome as data. |
| C21 | Floor extension: `listInstances` rows and `getInstanceDetail` gain `kernel_status`, `terminal_disposition`, `activation_mode`, the typed `wait`, and the runtime-context STATE — `detail` exposes the full stored state INCLUDING the opaque ref (an operator/debug read surface; the `projection-never-the-ref` invariant binds the ACTOR PACKET, not the kernel-side floor — stated so the asymmetry is deliberate), `list` a compact state discriminant. `getTimeline` shows both entry classes (C12). The ch-4 `status` field disappears from the floor read docs with its column (C11's named replacement — a BREAKING read-doc change swept with C19's call-site sweep). |
| C22 | Module home (ADR-014, riding this draft: `proposed` with the content commit, `accepted` by the ratification act; amends ADR-001): NO new production module — the lifecycle handlers (RECEIVE routing, CREATE/START/KICKOFF/CANCEL/FAIL, `activate`, the admission ladder) live in `kernel/` (they ARE the kernel); the provider seam lives in `ports/` (`RuntimeContextProvider`, the registry type, the projection/ref value shapes in `domain/`); the composition root injects the registry into the KERNEL only (admission never resolves providers, C16 — the definition compiler's catalog injection does NOT gain a provider leg); the testkit ships `scriptedRuntimeContextProvider` (the scripted-player culture: records `provision` calls, plays configured READY events incl. hostile kind-mismatch, duplicate-READY, and never-ready holds; testkit imports ports/domain/emit at most — ADR-005 unchanged); a `src/providers/` module is born WITH the first real provider (ch 9), not speculatively. |
| C23 | Growth stance (plan §8.2 discipline): the `activation` keyset and mode enum (C1), the spec-map keyset and grammars (C3), the wait-kind set (`kickoff_pending` ONLY — `human_decision`/`child_workflow`/`timeout` ride the same machinery in their own chapters), the transcript entry-class set (C12), the operator-intent wire keysets (C13), and the registry membership (C16) grow ONLY additively, each in its realizing chapter; existing defaults (`immediate`, requirement `none`) are STABLE per §8.2 rule 5. The deferred provider surface — teardown, health, provisioning-failure handling, run-override cascade for the context, conditional per-step context — stays the named ledger Absents: NO speculative key or port member exists for any of them. |
| C24 | Named replacements inventory (every CONSUMER-BEARING retirement is a named replacement with a packet-owned consumer sweep, R-ABSENCE-CONSUMERS; the C7 `agentConfig` narrowing — a ZERO-consumer form removal — is deliberately outside this list: its build-time duty is the R-UNTRUNCATED-SWEEP re-measurement of the zero-author reality, C7): `kernel.startInstance` (the ch-4 one-shot) → the CREATE/START/`activate` split (the l0d model's own statement — record + coverage at CREATE, provisioning at START, first dispatch at activation); `LifecycleStatus`/`status` → `kernel_status` + `terminal_disposition` (C11); the CLI one-shot `start` semantics → the START op verb (C19; its template-ref attachment migrates to `create` — C20; ch8-C30's ref GRAMMAR is unchanged, its verb attachment superseded; the P1-window bridge carrying the transition is C25's); the ch11-P3b start-input seam → the real lifecycle (C14); the bare `runtimeContext: required` authored VALUE → the spec map (C2 — its migration text is the replacement); the model `CREATE_INSTANCE` signature's `activation_mode` operator parameter → the template's `activation.mode` key (C13/C1). No retired surface survives as a parallel path — the sweeps enumerate consumers by the retired VALUE's name, never only the new token. |
| C25 | The runtime-key ADMISSION lane channel + STAGING (the ONE channel — ch8-C21's `{path, message}` form; the ch11-C21 pattern without a restated matrix: each grammar row of THIS draft — C1, C2, C3, C4, C5, C6, C7's template positions — IS its lane inventory, the ch8 validator-lane-note pattern, and the containers this surface introduces — the `activation` map, the `runtimeContext` value, the spec map, its `config` map, the two template agent-config maps — JOIN ch8-C21's container-precondition rule: a missing-where-required or wrong-kind container yields ITS OWN finding and suppresses its dependent lanes; the ONE named code lane is `runtime_context_required_for_process_gate`, C5). STAGING (the ch11-C39/C40 realization-split discipline, stated here so no packet re-derives it): the VALUE-LEVEL semantics — the admitted-template forms, the defaults' materialization (`activation` absent → `immediate`, `runtimeContext` absent → `none`, spec normalization), the cascade's map inputs, the C5 cross-rule — land WITH their consuming packets (P1 lifecycle, P2 cascade, P3 provider) on the DIRECT construction channel: the chapter's golden traces direct-construct templates THROUGH the same admission. The YAML SOURCE-FORM lanes — the authored keys, the container/keyset/token grammars, the path-addressed validator findings, the CLI `validate` extension — land at P4 with the format walk; the packet's admission tests pin the RP6 hostile forms (merge-key/alias) so the fail-closed behavior is DRIVEN, not incidental. The authoring WINDOW (P1–P3): the two genuinely NEW keys — `activation`, `defaultAgentConfig` — cannot be authored in a loadable file (the ch8 unknown-key rejection stands for them); the two EXISTING keys keep their PRE-ch12 file semantics for the window — `runtimeContext` under the REALIZED ch11 `required`-only FILE domain (the shipped walk/admission code state: the reopened C18 TEXT delegates the grammar at ratification; the SOURCE-FORM walk changes only at P4, while C2's VALUE-LEVEL refusal of the residual `required` form — the LOUD migration error — lands at P3 WITH the requirement machinery, per this row's own staging discipline, CO-LANDING with the C14 guard retirement: a `required`-declaring template is thereby UNSTARTABLE at every point of the window — the ch11 guard through P2, the migration refusal from P3) and `steps.<s>.agentConfig` under ch8-C14's any-value domain ONLY until P2: C7's map + canonical-JSON-safe lanes are VALUE-LEVEL and land at P2 on EVERY admission channel (file included) — before P2 no cascade exists (the ch-4 raw pass-through semantics stand, nothing consumes the value), from P2 on a non-map or non-finite `agentConfig` file fails admission LOUD; only the `defaultAgentConfig` KEY's source-form walk (the roles-entry keyset + path grammar) waits for P4. The window's safety is therefore the VALUE-LEVEL materialization riding the consuming packets — a file-loaded run is immediate (activation unauthorable) and context-free-or-unstartable for the window. The shipped CLI across the window — DECIDED HERE: P1 rewires the `start` verb's `kernel.startInstance` call sites (the normal AND dev entrypoints) to an IN-HANDLER CREATE→START sequence, an interim bridge keeping the verb green through the window; the bridge is NOT the deferred shipped convenience verb (C19's stance binds the FINAL post-P4 surface; naming the bridge here is what keeps C19 and C24 unbent) — P4 lands the four-verb surface and its retirement sweep, replacing the bridge. The bridge's outcome surface: the window's only file-reachable business path is context-free + immediate, where BOTH legs succeed and the verb emits the START leg's `Activated` outcome (the CREATE leg's `Created` is interior); a CREATE-committed/START-rejected residue is UNREACHABLE on the window's business paths (task and binding failures reject AT CREATE; `required` templates never reach CREATE), and any non-business residue is an ordinary CREATED instance, resumable by a fresh START. TRACE staging (the plan §12.4 P1/P3 rows carry the aligned landing): the l0d GOLDEN trace's `requested(r1)`/READY legs presuppose the provider machinery — the trace LANDS AT P3 (beside the l0e trace, the scripted player playing the provider; the trace's operator `mode: deferred_kickoff` input realizes as the direct-constructed template's `activation.mode` per C13's relocation); P1's lifecycle acceptance rides a CONTEXT-FREE deferred-hold JOURNEY instead (CREATE deferred → START `ready(∅)` → `WAITING(kickoff_pending)` → a `not_active` probe → KICKOFF → CANCEL — the full hold/kickoff/cancel machinery with no provider leg). The shipped canonical `local-pair-v0@1.yaml` gains NO new keys (its behavior IS the defaults': immediate, context-free), under the ch8-P2 equality pin. |
| C26 | The ratification act's CROSS-CONTRACT EDIT OBLIGATIONS (normative; the VERBATIM prepared texts live in the Context reopen block as THIS row's payload): the act REOPENS `ch11-gate-format` C18, C19, C21 (its two runtime-context lane texts), and C30 (its runtimeContext growth item), and `ch8-template-format` C14, each to its prepared POINTER form — per-row successors: C18 → `#C2–#C4`, C19 → `#C5`, C21 → both, C30 → `#C23`, ch8-C14 → `#C7` — under the realized-reopen choreography (per affected draft: commit 1 = row edits + `realized_map` removed + `reopened`; commit 2 = new ratification block + updated map restored + `realized`; the metrics duties: ch11 Close-metrics reopenings 1 → 2, ch8 Close-metrics reopenings 0 → 1 — the POST-CLOSE cumulative counters, never the frozen ratification-time snapshots; every commit lint-green). The ratifying commit ALSO refreshes plan §12.4's "pending ratification" prediction-basis qualifiers (ordinary ratification business, stated so the exhaustive list stays exhaustive). ZERO reopened drafts stand at any ch12 packet approve (`--forbid-reopened` — the reopen windows close INSIDE the act). |
| C27 | The `contract-draft-template.md` §4 THREE-PART PATCH (the verbatim payload lives in the Context choreography note) is APPLIED BY the ratifying act — the amendment-rides-the-act carrier (the ch11-C38/§8.2-deviation-clause pattern: process authority amended by the same explicit human act that first exercises it); until applied, the realized-reopen path exists ONLY as this act's resolved STOP, never as standing lifecycle. |

## Ratification history (empty at `draft` — blocks are appended by the lifecycle acts)

## Realized map (empty until chapter close)
