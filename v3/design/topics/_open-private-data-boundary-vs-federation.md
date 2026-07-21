# Private-Data Boundary vs Kernel Federation

Status: open research note
Date: 2026-06-27

## Question

The early v3 braindump used "kernel federation" to describe the long-term shape where
personal, organization, and eventually cross-organization kernels cooperate. After
reviewing the original workflow set and comparing Omnigent / BitSafe-style systems,
the sharper question is whether federation is a load-bearing requirement or an early
solution idea.

## Current conclusion

The original scenarios require a controlled private-data contribution boundary, not
necessarily full kernel federation.

The load-bearing requirement is that private or externally-owned sources can contribute
declared, auditable facts to a workflow without handing the workflow raw source access
or credentials. Keep the model federation-ready through `EventEnvelope`, `op_id`,
grant/vault, provenance, trust-domain, and contribution-envelope invariants, but do
not treat personal<->org kernel federation as an MVP requirement.

## What the original scenarios actually need

WF-1 is the strongest motivating case. Person B's mailbox contains information that
can unblock an org workflow, but the org workflow must not read B's mailbox.

That requires:

- durable shared workflow state: instance #42 is waiting for data from B;
- wait/event correlation: a private inbound event can be matched to the open wait;
- owner UX: B can approve, deny, redact, or scope what crosses;
- contribution envelope: only the approved extracted data enters the workflow;
- grant/vault enforcement: B's credential never travels to the org workflow;
- provenance: the workflow can audit why this contribution was accepted.

None of those requirements by itself forces a second kernel. They can be implemented
as a gatekeeper boundary inside one org substrate, as a separate gatekeeper component,
or eventually as full personal<->org kernel federation.

## Three implementation shapes

### 1. Central org substrate with per-user private connectors

This is closest to the BitSafe / NanoClaw lesson. A central org substrate owns the
workflow and durable state. Private connectors run with per-user grants and only emit
approved contributions.

This may be enough for many small-company workflows. It is simpler than federation and
keeps one operational namespace.

### 2. Central org kernel plus gatekeeper component

The gatekeeper is a named boundary with three layers: connector runtime, matcher, and
owner UX. It is stronger than an ordinary connector because it owns policy decisions
about what may cross, but it is not yet a full personal kernel.

This is the likely pragmatic L10 shape.

### 3. Full kernel federation

A personal kernel and an org kernel are separate authority domains. The org kernel can
assign work or request a contribution, and the personal kernel runs local workflows,
protects local memory/sources, and reports back a bounded result.

This remains a valid future topology, especially for personal<->org or org<->org
boundaries, but it should not be implied by every private-data workflow.

## Implication for v3 language

Prefer "private-data contribution boundary" or "gatekeeper boundary" for the near-term
requirement.

Use "kernel federation" for the keep-open topology where there are truly separate
authority domains with separate kernels. The v3 core should preserve the invariants
that make that topology possible later, but the local/WF-7 MVP and many org-internal
workflows should not depend on it.

## Relation to references

Omnigent is a useful reference for a single coordination server with remote hosts,
runners, attach surfaces, and dynamic child sessions. It is distributed execution, not
kernel federation.

BitSafe / NanoClaw is a useful counterweight: it centralizes the company substrate in
Notion and runs a governed agent fleet around it. It shows that many org workflows can
be solved by a strong shared substrate, schema discipline, credential boundaries, and
approved write paths rather than by federating kernels.

