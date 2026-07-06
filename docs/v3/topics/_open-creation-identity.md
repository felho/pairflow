# Creation Identity — Exactly-Once Instance Minting from External Triggers

Status: open design decision
Date: 2026-07-06
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

## Related

Series-grain creation has the same hole one level up (GAP-16 / future-topic L6
#6: overlapping reconciler runs double-insert timer series). The L9 R6
arrival-without-claim sweep (future-topic L9 #7) is the audit backstop, not the
prevention.
