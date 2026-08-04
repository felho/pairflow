# ch13 re-derivation — P1 arm record

Verification record for phase P1 of
[`../../ch13-rederivation-plan.md`](../../ch13-rederivation-plan.md).
The plan's §6 bounds this loop at **3 rounds**; a 4th opens only
through the user, and the question put to them is "is the criterion
right?", never "may we continue?".

## How to count the rounds — read this before deriving the trajectory line

```
ls v3/implementation/ch13-rederivation-arm/p1/arm-*-out.txt | wc -l
```

Non-recursive, and that is the point. **Only a run that produced a
VERDICT counts as a round.** An infra failure — timeout, transport
kill, pin mismatch, guard trip — is not a content verdict
(`ReviewPacket` §6 item 8), so its transcript lives under
[`infra/`](infra/) where the counter cannot see it. Item 8 allows ONE
retry per infra failure; a second consecutive one is an unavailable
arm and a STOP.

The round counter is re-based to zero on the 2026-08-04 overbuild
reset (the `cb7ba9fe` watchdog rule: anchor = the reset, reason = the
process-log entry of that date). The seven rounds of the deleted line
are NOT here — they live on the snapshot branch
`ch13-p1-overbuilt-line`, and they do not count against this budget.

## Contents

| File | Pin | Result |
|---|---|---|
| `arm-round1.md` / `arm-round1-out.txt` | gpt-5.6-sol / high | VERDICT, 805s, guards clean — 9 IN-SCOPE, 1 CARRIED-SCOPE, 0 UNRUN |
| `infra/arm-round1-timeout.md` / `infra/arm-round1-timeout-out.txt` | gpt-5.6-sol / high | INFRA — 1200s timeout during write-up, guards clean, no verdict. Retried per item 8. |

The timed-out session completed its investigation and was killed while
composing the report. Its transcript is preserved as infra evidence
and is **not** mined for findings: a killed run is an invalid verdict,
and treating its unwritten conclusions as verified would be the same
unrun-measured defect family this phase exists to avoid. The retry's
charter fixes the cause structurally — findings are written out as
they are confirmed, never batched to the end.
