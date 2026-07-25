# Dogfooding runbook — ch9 runner plane (the ch9 DoD checkpoint)

The hand-driven operator run that closes the ch9 chapter DoD (plan §9.5).
It exercises the SHIPPED operator surface end-to-end against **real tmux**,
**real git worktrees**, and **real gate spawns** — the one proof tier the CI
journeys deliberately exclude (an interactive `tmux attach` needs an operator
tty; the CI lane drives the exec seam at unit grain — packet ch9-p4b, AT2/F6).

Everything below is the shipped CLI (`pnpm v3:cli <verb> …`) with production
bindings. No test seams. Invocation notes (dogfooded 2026-07-25): current
pnpm forwards a `--` separator AS the verb — use the bare `pnpm v3:cli
<verb> …` form; when piping the JSON (`| jq`), use `pnpm --silent` so the
pnpm banner stays off stdout. Run `create`/`start` BEFORE a `runner run
--once` tick — a tick that polls earlier legitimately sees nothing (the
next tick converges).

## Prerequisites

- `tmux` on `PATH` (`tmux -V`).
- `git` on `PATH`.
- A throwaway host git repo with at least one commit (the worktree provider
  branches from its `HEAD`).
- A scratch DB path, e.g. `export DB=/tmp/pairflow-dogfood/store.db`.
- A templates dir holding a worktree-declaring template (see below).

## Fixtures

A single-step worktree template (`local-pair-v0@1.yaml`) whose `config.repo`
points at your throwaway host repo. For the gate leg (step 5), replace the
commented `gates:` block with the READY-MADE form below (hand-uncommenting
invites an indentation slip — live repro at the 2026-07-25 checkpoint; the
`gates:` key is a step-level sibling of `transitions:` at four spaces):

```yaml
    gates:
      CONVERGED:
        - uses: external.process
          config: { command: "true", timeoutMs: 5000, output: { mode: exitCode }, onExit: { zero: allow, nonzero: block } }
```

The base template:

```yaml
ref: { id: local-pair-v0, version: 1 }
start: implement
steps:
  implement:
    role: implementer
    instruction: build it
    transitions:
      CONVERGED: done
    # gates:
    #   CONVERGED:
    #     - uses: external.process
    #       config: { command: "true", timeoutMs: 5000, output: { mode: exitCode }, onExit: { zero: allow, nonzero: block } }
terminal: [done]
roles:
  implementer: { defaultActor: codex }
runtimeContext:
  kind: worktree
  provider: pairflow.worktree
  config: { repo: /abs/path/to/host-repo }
```

A deterministic stub actor (`emit.mjs`) — the runner hands it the attempt via
the `PAIRFLOW_PACKET` / `PAIRFLOW_EMIT` env pair:

```js
import { writeFileSync } from "node:fs";
writeFileSync(process.env.PAIRFLOW_EMIT, JSON.stringify({ type: "CONVERGED", payload: {} }));
```

The `--actor-cmd` binding is one JSON template:
`--actor-cmd '{"cmd":"/abs/path/to/node","args":["/abs/path/to/emit.mjs"]}'`.

## The run

1. **Create + start** (genesis, then the real single-op START that provisions a
   live worktree):

   ```
   pnpm v3:cli create --db "$DB" --task dogfood --templates-dir "$TDIR"
   #   → { "kind": "created", "instanceId": "<id>", "version": 1 }
   pnpm v3:cli start "<id>" --db "$DB" --templates-dir "$TDIR"
   #   → { "kind": "accepted" }   (the required-context START rides the async READY path)
   ```

2. **Confirm the worktree is live** (the detail runner section — a labeled
   read projection; every member carries a value or a named discriminant):

   ```
   pnpm v3:cli detail "<id>" --db "$DB" --templates-dir "$TDIR"
   #   → …, "runner": { "errand": { "unavailable": "no-runner-ledger" },
   #                    "attach": { "available": false, "reason": "no-live-attempt" },
   #                    "runtimeContextSummary": { "kind": "worktree", "path": …, "branch": … } }
   ```

3. **Run the runner plane** (the single foreground entry — delivery loop +
   provider registry + real adapter over the TMUX channel + the real gate
   runner). Start bounded with `--once` to watch one tick, or run in the
   foreground and observe through `attach` / `detail` / `tail --diag`:

   ```
   pnpm v3:cli runner run --db "$DB" --templates-dir "$TDIR" \
     --actor-cmd '{"cmd":"'"$(command -v node)"'","args":["'"$TDIR"'/emit.mjs"]}' --once
   #   → { "errands": [ { "instanceId": "<id>", "state": "confirmed", … } ] }
   ```

   The delivered attempt ran INSIDE its ledger-recorded `pairflow-…` tmux
   session, in the worktree cwd; its emitted `CONVERGED` op landed COMMITTED
   through normal ingress, and the errand converged `confirmed`.

4. **Attach to a live attempt** (the one tier CI cannot cover — needs your tty).
   Start a long-running actor (or a foreground `runner run` in another terminal),
   then, while an attempt is live:

   ```
   pnpm v3:cli attach "<id>" --db "$DB"            # observe (read-only, tmux -r)
   pnpm v3:cli attach "<id>" --db "$DB" --takeover # writable takeover
   ```

   A non-attachable state is a clean `not_found` / exit-3 lane
   (`{"error":{"class":"not_found","name":"NoRunnerLedger",…}}` before any
   `runner run` ever ran against this db — `NoErrand`/`NoLiveAttempt` on the
   later paths), never a crash.

5. **The gate leg** (uncomment the `gates:` block in the template). Re-run from
   step 1: the delivered `CONVERGED` submit drives the REAL process gate — the
   command spawns in the worktree cwd, the kernel classifies its faithful
   result, and the run reaches `TERMINAL(done)`. Confirm the evidence landed on
   the derived sibling path:

   ```
   pnpm v3:cli detail "<id>" --db "$DB"   # instance.kernelStatus == "TERMINAL", terminalDisposition == "done"
   # the durable evidence: "$DB".process-evidence.sqlite carries a kind:"ok"
   # record whose headSha is the worktree HEAD (never the fail-closed sentinel).
   ```

6. **Respawn a stuck attempt** (C14's exactly-one unconfirmed exit). If an
   attempt exited without an emit, the errand rests `unconfirmed`:

   ```
   pnpm v3:cli runner respawn "<id>" --db "$DB" --templates-dir "$TDIR" \
     --actor-cmd '{"cmd":"'"$(command -v node)"'","args":["'"$TDIR"'/emit.mjs"]}'
   #   → the post-call errand row as data (state "confirmed" on a successful
   #     re-spawn); the respawn attempt is UNBUDGETED (remaining budget unchanged).
   # SCRIPTING RULE (ratified design, ch9 boundary): the exit code is 0
   # whenever the respawn RAN (3 only when it could not start) — script on
   # the doc's `.state` field, never on the exit code alone.
   ```

## Watchpoints to price (W1 — boundary-review)

- **Gate-lane env allowlist:** the gate children run under `{ PATH }` only
  (CW1's defaulted options). A real gate command needing `HOME` or auth-bearing
  vars has NO widening surface yet — the actor lane's `--env-allow` does not
  reach the gate lane. Note what the real gate commands need for the
  teardown/health chapter's scope.
- **Interactive attach ergonomics:** confirm observe vs takeover read the way an
  operator expects; note any pane-layout friction (pane-layout config stays
  none-in-v1, C24).
