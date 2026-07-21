# Creation Identity — Exactly-Once Instance Minting from External Triggers

Status: **settled direction (2026-07-07)** — fork branch 1 (kernel-edge construct); see "Settled direction" below. The binding form lands later as an F-W1-2-style small-spec touch on `CREATE_INSTANCE`.
Date: 2026-07-06 · Settled: 2026-07-07
Source: the BitSafe workflow simulation (`research/bitsafe-workflow-simulation.md`, GAP-1 — surfaced by 16 of 17 simulated workflows)

## Question

`CREATE_INSTANCE` carries no idempotency or external-identity key, and the
kernel's `UNIQUE(instance_id, op_id)` ledger is per-instance scope — so nothing
binds an external trigger identity (a webhook delivery, a claimed L6 timer
fire, a queue row, a chat message) to exactly one instance. A redelivered event
or a re-claimed fire mints twins; a creation deferred past a capacity check
mints nothing. Where should creation-grain identity live?

## Why this is Tier 1

Two documented production incidents at BitSafe are the **dual failure faces of
this one hole**, and v3-as-built would reproduce both:

- **Too many instances:** one ARQ row accumulated 26 duplicate findings pages
  because the dispatcher kept re-picking a row whose external status was stuck
  — read-check-act over world state with no claim (S9, capture 1404).
- **Zero instances:** 16 production threads went silently unanswered because a
  deferred arrival never wrote its durable claim — arrival and claim were
  separate acts, and the claim rode the wrong side of a capacity gate (S17,
  capture 1480).

A mint-or-return-existing oracle kills both ends with one mechanism: the
arrival IS the claim. Beyond the incidents, creation identity turned out to be
the kernel's only native duplicate-work exclusion at task grain (S9, S12) — it
carries weight well past dedup.

## What exists

- **L8 §1 (planned)** covers the *channel-borne* path as written: the
  store-enforced exact correlation oracle — `UNIQUE(channel_type, platform_id,
  instance)`, "auto-create over hijack" — makes redelivered messages find the
  existing instance.
- **L6 §2 (planned)** CAS-claims the *fire*, but no contract states how a
  claimed fire mints `CREATE_INSTANCE` idempotently — the scheduler crashing
  between the create commit and the fire-row advance re-mints on re-claim.
- **The bare operator/API ingress path has no story at all** — today the
  harness is the dedup owner by unstated convention.

## The design fork

1. **Kernel-edge construct:** an external-identity key (or a creation oracle:
   mint-or-return-existing keyed on a caller-supplied identity) on the
   `CREATE_INSTANCE` ingress itself — one mechanism, every path covered,
   including bare ingress. Precedent: the F-W1-2 ingress touch gave the
   lifecycle operations their `op_id`; this is the same hardening one level
   earlier, at creation grain.
2. **Split residence:** leave identity to L8's correlation store (channel
   paths) and an L6 fire→create seam contract (scheduled paths), and document
   the bare path as harness-owned. Cheaper for the kernel; leaves the
   incident-proven bare path on convention.

Sub-questions either way: the key's shape (opaque caller identity vs typed
{source, external_id, generation}); active-uniqueness vs forever-uniqueness
(S9 needed a triage-advanced generation dimension so terminal blocks re-work
until re-triage; `park_for_child`'s terminal-doesn't-block precedent points the
other way); and whether the oracle returns the existing instance's identity
(mint-or-return) or a `Duplicate`-style reject.

## Settled direction (2026-07-07, ratified)

**Fork branch 1 — the kernel-edge construct.** `CREATE_INSTANCE` gains an
optional `creation_key` with mint-or-return-existing semantics, backed by a
kernel-owned key registry (store-enforced UNIQUE).

Why branch 1 over the split (recorded from the decision discussion):

- Both documented incidents happened on the bare/API path — exactly the path
  the split leaves on convention.
- One mechanism instead of three: the channel layer (L8) and the scheduler
  (L6) become *clients* of the kernel contract (message id / series+occurrence
  as the key) rather than each owning its own dedup story; the L6 fire→create
  seam dissolves into "the fire's occurrence identity is the key". GAP-16's
  series-grain case inherits the same pattern.
- It applies the corpus's own close-at-source idempotency principle and is
  the direct continuation of the F-W1-2 ingress touch: **`creation_key` is to
  CREATE what `op_id` is to everything after it.**
- It is also the kernel's only native duplicate-work exclusion at task grain
  (S9/S12) — the capability `_open-kernel-floor.md` §2 leans on.

Sub-decisions, all ratified:

1. **Key shape:** caller-supplied, namespaced opaque pair `{namespace,
   external_id}` (e.g. `{arq, row-4711}`, `{timer, series#occurrence}`).
   Re-work generations are encoded *in* the key by the caller
   (`row-4711@2`) — the kernel knows no generation mechanism.
2. **Semantics:** mint-or-return-existing, never a reject — the second caller
   receives the existing instance's identity (+ a `found_existing` signal), so
   a retried create-then-kickoff chain is replay-safe end to end, and the
   zero-instances failure face is served too (the caller always learns who
   owns the work). Same-key-different-template is a caller bug made visible by
   the returned instance (whether it earns a distinct signal is a spec detail).
3. **Key lifetime:** forever — the registry row survives the instance
   (LC4-tombstone precedent, T1-family), so there is no kernel-side
   active-uniqueness state machine; deliberate re-runs use a new key.
4. **Optionality, three-layer:** optional at the kernel edge (an interactive
   one-shot start has no stable external identity — a synthesized per-call key
   would protect nothing); **required by contract on the machine ingress
   paths** (the L6 scheduler and L8 connector contracts must supply keys);
   and **template-declarable as required** (a definition known to be
   machine-fed can declare keyed creation, making a bare CREATE against it a
   reject — fail-closed exactly where the failure class lives).

## Related

Series-grain creation has the same hole one level up (GAP-16 / future-topic L6
#6: overlapping reconciler runs double-insert timer series). The L9 R6
arrival-without-claim sweep (future-topic L9 #7) is the audit backstop, not the
prevention.
