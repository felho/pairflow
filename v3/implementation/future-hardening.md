# Future hardening — deferred implementation-plane enhancements

Impl-plane hardening items that are NOT model Absents (the model
already ratifies the relevant premise) and NOT scoped into any current
chapter. Each item records a real-system robustness gap consciously
deferred at a human decision point, with its provenance and a proposed
(not yet ratified) landing. Revisit: at a chapter boundary or when a
consuming chapter makes the item cheap/necessary. Nothing here is a
commitment — it is a durable record so the deferral is never silently
lost.

## FH-1 — physical enforcement of pinned-template immutability

**Provenance:** ch12-P2 (`ch12-p2-run-profile.md`, FLAG-1), external
arm gate-1 (2026-07-22), raised P1 twice; human-ratified `declined
(accept-now) + later-hardening` on 2026-07-22.

**The premise (ratified, standing, system-wide):** a pinned template
`id@version` refers to an IMMUTABLE definition — C8 ("immutable
sources (pinned template)"), ledger §4 ("the definition — immutable at
runtime"), l0f (`template-pinned-at-resolution`). The
`deterministic-provenance` invariant deliberately relies on this
("else provenance would need a persisted dispatch record"). Every
template load since ch4/ch8 rests on it.

**The gap (real, deferred):** the production `fileDefinitionStore`
(`v3/src/definition/fileDefinitionStore.ts`) re-reads a MUTABLE file
per load and does not PHYSICALLY enforce pinned-version immutability —
it is a publish-convention (make a new version; do not edit a
published one), not content-addressing. An in-place edit of a pinned
`id@version.yaml` BETWEEN a dispatch (config A issued into the packet)
and the subsequent commit (config recomputed for `issued_agent_config`)
would record a config that never matched what was dispatched,
falsifying the determinism the invariant asserts. In practice a file
under active authoring changes often BEFORE any run pins it; the risk
is only an edit DURING a run (between dispatch and commit of the same
pinned version) — accepted as low for now.

**Proposed hardening (NOT ratified, NOT scheduled):** at load, compute
and store a content FINGERPRINT (hash) of the admitted template bytes
alongside the instance's `template_ref` at CREATE; on each subsequent
load for that instance, verify the re-read bytes' fingerprint matches
the stored one — a mismatch is a definition-store integrity failure
(a pinned version was edited in place), fail-closed rather than
silently recording drifted provenance. This turns the convention into
an enforced invariant without persisting a full dispatch record (the
fingerprint is O(1) state, the invariant's original objection). Home:
a later definition-store / runtime chapter; cheap to add when instance
creation or the store schema is next touched.
