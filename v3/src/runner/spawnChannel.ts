import type { SpawnConclusion } from "./spawn.js";
import { disciplinedSpawn } from "./spawn.js";

/**
 * The SpawnChannel seam (packet ch9-p4a, TX1 — NEW, flag F1): the actor
 * adapter's spawn/observe stage goes behind this injected seam so the SAME
 * handoff/argv/result/emit/diag stages serve BOTH the direct spawn (P3b's
 * behavior, byte-preserved) and the tmux session wrap (`tmuxChannel.ts`,
 * TX2–TX6). The channel changes WHERE an attempt's conclusion is OBSERVED —
 * never what concludes it: the adapter derives every conclusion from the
 * closed union below through the same fail-closed precedence (TX7).
 */

/**
 * TX1: the CLOSED channel-conclusion union.
 *   - `direct-exit` — the direct channel's pass-through of the seam's own
 *     conclusion (flows through CL1 UNCHANGED).
 *   - `session-concluded` — the tmux channel observed session death (TX4/TX5);
 *     `timedOut` is the CHANNEL's own-timer flag. The result file then decides
 *     (TX7 — the adapter's session-grain precedence).
 *   - `name_collision` — the create's session name was already occupied in the
 *     host namespace, reported BEFORE any spawn side effect (TX3; C16's
 *     host-tmux collision half). UNREACHABLE on the direct channel (RS4(a)'s
 *     scoped exclusion carried).
 *   - `infra` — a channel-level infrastructure fault (create failure other
 *     than collision; the liveness poll's own anomalous conclusion — TX4).
 */
export type ChannelConclusion =
  | { readonly kind: "direct-exit"; readonly conclusion: SpawnConclusion }
  | { readonly kind: "session-concluded"; readonly timedOut: boolean }
  | { readonly kind: "name_collision" }
  | { readonly kind: "infra"; readonly message: string };

/**
 * TX1: the launch input. `wrapperArgv` is the COMPLETE wrapper argv (the
 * executable first — the adapter builds `[node, attemptWrapper.mjs, graceMs,
 * resultPath, attemptId, cmd, args…]`); `env` is the adapter-composed child
 * env (allowlist + the PAIRFLOW_* pair) handed through UNCHANGED; `sessionName`
 * is the ledger-recorded value (C23's resolution source — channels never
 * derive names; unused by the direct channel). The timer knobs carry the
 * adapter's P3b-T2 validated values — the ADAPTER validates them at its
 * construction; channels validate only their OWN knobs.
 */
export interface SpawnChannelInput {
  readonly wrapperArgv: readonly string[];
  readonly cwd: string;
  readonly env: Readonly<Record<string, string>>;
  readonly sessionName: string;
  readonly timeoutMs: number;
  readonly graceMs: number;
  readonly backstopMarginMs: number;
}

export interface SpawnChannel {
  launch(input: SpawnChannelInput): Promise<ChannelConclusion>;
}

/**
 * TX1: the direct channel — `disciplinedSpawn` wrapped, the P3b behavior
 * byte-preserved: the seam timer at `timeoutMs`, the seam's wrapper-spawn
 * grace at `graceMs + backstopMarginMs` (SD3's two-tier margin — provably
 * later than the wrapper's own inner actor-grace), the conclusion passed
 * through as `direct-exit`. The adapter's DEFAULT channel (flag F1's staging
 * clause: the production tmux binding is ch9-P4b's composition).
 */
export function createDirectSpawnChannel(): SpawnChannel {
  return {
    async launch(input: SpawnChannelInput): Promise<ChannelConclusion> {
      const [cmd, ...args] = input.wrapperArgv;
      if (cmd === undefined) {
        // A zero-length argv is a caller programming error surfaced on the
        // channel's own infra lane (fail-closed, never a throw mid-loop).
        return { kind: "infra", message: "direct channel: empty wrapperArgv" };
      }
      const conclusion = await disciplinedSpawn({
        cmd,
        args,
        cwd: input.cwd,
        env: input.env,
        timeoutMs: input.timeoutMs,
        graceMs: input.graceMs + input.backstopMarginMs,
      });
      return { kind: "direct-exit", conclusion };
    },
  };
}
