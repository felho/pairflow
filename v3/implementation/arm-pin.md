# External-arm pin (ReviewPacket §6 — the chapter-pinned policy)

The arm invocation pins model + reasoning effort EXPLICITLY — the
machine's current `~/.codex/config.toml` default is never trusted (an
operator's config-in-flux must not silently swap the reviewer).
Revisable at chapter boundaries only; ReviewPacket §6 consumes the
CURRENT (last) row — it never hardcodes a pin. An invocation whose
output header disagrees with the current pin is an INVALID verdict and
counts as an infra failure (§6 item 8's retry ladder).

| Pinned at | Model | Reasoning effort | Note |
|---|---|---|---|
| ch8 boundary (2026-07-11) | gpt-5.6-sol | high | first pin (the user's decision). ch8 itself ran current-default — gate 1 gpt-5.5/xhigh, gate 2 gpt-5.6-sol/high — a config drift, not an experiment; yield comparable only within a pin |

## Operational notes (read before EVERY arm invocation — added 2026-08-08, ending the hand-carried-kickoff era)

These three are measured workarounds for known instrument defects,
not process rules. Each stays here until its underlying fix lands
(all three are carried items with owners).

- **Charter vocabulary:** write charters in neutral QA language
  (conformance check, counterexample search, sensitivity probe) —
  never security-flavored wording (defeat/bypass/exploit). FOUR runs
  died mid-flight in the provider's content filter on such wording;
  neutral phrasing has run clean ever since.
- **Prompt and output files live under /tmp**, copied into the repo
  only AFTER the run: the runner's own byte guard trips on its own
  output file when it sits inside the repo, killing the run before
  pin validation (measured; the guard fix itself is a carried infra
  item — do not fix it as a side effect).
- **Regression suites run SERIALLY and ALONE** — concurrent full-suite
  runs poison the reviewer's regression lens (measured: five
  concurrent runs produced false journey timeouts). The tmux half of
  the old hazard is fixed — the lanes ride a private per-run server
  and reap orphans since `a91c08dc`/`a9bbd399` — the lens-poisoning
  half stands.
- **Transport (user ruling, 2026-08-10, first exercised at ch13-p1a
  arm gate 2):** arm runs go PRIMARILY through the `gptsol` agent
  (Agent tool; model and effort are pinned in the agent definition —
  the call must NOT pass a model parameter: a `model:` override
  caused one invalidated pin-mismatch run, recorded in the p5
  record). `arm_run.sh` stays as the portability fallback; its
  20-minute cap killed four actively-working runs (the recalibration
  is a boundary item). Reproduce the guards by hand on this
  transport: basis-hash check before and after the run, provenance
  (transport · model · effort · timestamps) in the verdict header.
  The pin table gains a transport column at the boundary review.
