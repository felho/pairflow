# ADR-017: one spawn discipline — cwd confinement, env allowlist, timeout kill

Status: accepted
Date: 2026-07-23
Links: supersedes — · amends — · depends-on — · related ADR-014, ADR-016

## Context

Chapter 9 introduces the v3 plane's FIRST real child-process spawns:
the actor adapter (a real agent process in a worktree) and the
process-gate runner (the ch11 contract's spawn half). A spawned child
is host-side effect surface — what directory it can act in, what
environment secrets it can see, and whether it can run forever are
safety properties, not conveniences. The rationale is invisible in
code (an env allowlist reads as arbitrary config), and any future
spawning component would silently inherit whatever the first one did —
a K4 (safety class) + K2 (rationale-not-in-code) ADR lift per the
README §6 decision-home triage.

## Decision

ONE spawn discipline serves every runner-plane spawn (actor adapter +
process-gate runner + any future spawning component):

1. **Explicit `cwd`, always** — the run's provisioned worktree when
   `runtime_context = ready(ref)`, else the composition-configured
   `default_cwd`; never the spawning process's own cwd.
2. **Env allowlist, fail-closed** — the child receives ONLY the
   composition-declared allowlist plus adapter-injected pairflow
   variables; the full host environment is NEVER inherited (secrets
   in the operator's shell must not leak into actor/gate processes).
3. **Composition-configured timeout: SIGTERM, then a bounded-grace
   SIGKILL escalation** (grace composition-configured, default
   10 s) — the normal observable is `code: null, signal: "SIGTERM"`
   (probe P3a); a SIGTERM-ignoring child is SIGKILLed at grace
   expiry, so no spawn is unbounded — short of an
   uninterruptible-I/O wedge (D-state), which even SIGKILL cannot
   clear: that residual belongs to the store substrate's
   mount-loss class, not this seam.
4. **Captured stdio** — stdout/stderr captured, never inherited; a
   missing binary is a DISTINCT infra lane (probe P3c: `error` event
   `ENOENT`; no exit code is produced). Env replacement is full by
   substrate (probe P3d: a child spawned with an explicit `env`
   object sees ONLY the passed variables).

The discipline is a shared seam (one implementation, two consumers),
so a hardening lands everywhere at once.

## Alternatives Considered

- **Env passthrough with a denylist** — rejected: fail-open; a new
  secret variable leaks by default. Allowlist is the only shape whose
  failure mode is a missing variable (loud) rather than a leak
  (silent).
- **Per-consumer spawn code** (adapter and gate runner each spawn
  their own way) — rejected: the confinement properties would drift
  apart; K4 decisions must have one enforcement point.
- **OS-level sandboxing (containers, sandbox-exec)** — deferred, not
  rejected: the MVP is local-first trusted-host; a stronger isolation
  substrate is a later provider/runtime concern behind the same
  discipline seam.

## IC-N Screen (mandatory)

No. Process spawning touches no kernel state shape at all; the
discipline constrains host-side effects only. This screen does not
bypass the model↔code divergence stop.

## Consequences

- Positive: no host-env secret leak into actors/gates by
  construction; no unbounded child; uniform failure lanes
  (timeout/ENOENT/nonzero) every consumer classifies identically.
- Negative: legitimate env needs must be declared (allowlist
  friction); the SIGKILL escalation forfeits graceful-shutdown work a
  slow-but-honest child was doing (the grace window is the dial).
- Neutral: tmux wrapping (the attach channel) sits ABOVE this seam —
  the session wraps the spawned command, the discipline is unchanged.
  The attach channel's `takeover` verb (writable access to a live
  actor terminal) is the sanctioned interactive breach of the
  observe boundary under the same trusted-local-host stance:
  per-runtime-context, operator-invoked, read-only (`observe`) as
  the default.

## Verification

Claim-derived negatives in the ch9 packets: an env probe child proves
only allowlisted variables are visible; a cwd probe child proves the
working directory; a sleeping child proves the SIGTERM timeout lane
(`code null / signal SIGTERM`); an ENOENT spawn proves the distinct
infra lane. The ch11 l2a trace re-drives the gate-runner mapping over
the real spawn.

## Related

ch9 contract rows C17, C19, C21, C23, C24; ADR-016 (the attempt
lifecycle these spawns run inside); the ch11 gate-format contract
(the kernel half of the process-gate seam).
