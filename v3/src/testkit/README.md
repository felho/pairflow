# Test kit (PI-1)

Test-only support module (ADR-005): the far side of the port seams. It
IMPLEMENTS adapters and the clock; tests — not the kit — drive the kernel.

## Fixture convention

- **No wall-clock time.** The controlled clock is the only `TimeSource` a
  test binds (IC-D / CHK-D-TESTCLOCK); a test that needs a real sleep is a
  bug. Lint-enforced.
- **No randomness.** Fixtures and tests never call `Math.random` /
  `crypto.randomUUID`; anything nonce-shaped is injected deterministically
  (the emit-lib takes a nonce source for exactly this reason).
  Lint-enforced.
- **Scripted, exhaustible, loud.** Fixtures play scripted
  verdicts/results in order and FAIL when the script is exhausted — a
  fixture never invents an outcome.
- **Import rule** (lint-enforced, ADR-005): the kit imports `ports/`,
  `domain/`, `emit/` at most — never `kernel/` or `store/`; production
  modules never import the kit.

## Contents

- `controlledClock` — `now()` + `advance()`/`set()`, monotonic (IC-D named
  deliverable).
- `fakeEgress` — records every call WITH its idempotency key
  (CHK-A2-IDEMKEY's runtime witness); scripted acks incl. `no_ack`
  (IC-A2's distinct non-terminal outcome).
- `scriptedActor` — plays an ingress-op sequence against an injected
  deliver seam; the ch-5 golden-trace engine.
- `scriptedProcessGateRunner` — the ch11-P3a kit runner: faithful
  queued `ProcessResult` playback over the six-outcome mapping,
  scripted-result validation at play, persist-before-return evidence
  records with `resolve(logRef)` lookup.
