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
