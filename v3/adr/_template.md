# ADR-NNN: Title

Status: proposed | accepted | deprecated | superseded by ADR-XXX
Date: YYYY-MM-DD
Links: supersedes — · amends — · depends-on — · related —

## Context

What problem or tension forced the decision?

## Decision

What did we decide?

## Alternatives Considered

What real options were rejected, and why?

## IC-N Screen (mandatory)

Does this decision touch any banned kernel shape (deterministic replay for
actor/LLM work · leader-per-shard coordination · full event-sourcing as the
source of truth · reconciler/outbox for the kernel's own state)?

Answer `no`, or `yes` — in which case this ADR must cite and overturn IC-N
explicitly. Either way: this screen does NOT bypass the model↔code
divergence stop. A decision that changes model meaning goes back to the
model plane (`v3/implementation/README.md` §6); an ADR records only
deviations the model contract itself permits.

## Consequences

Positive, negative, and neutral.

## Verification

What test, check, scenario, or contract proves this remains true?

## Related

Levels, docs, code, or prior ADRs.
