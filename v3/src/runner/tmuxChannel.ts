import type { TimeSource } from "../ports/time.js";
import type { DisciplinedSpawnInput, SpawnConclusion } from "./spawn.js";
import { disciplinedSpawn, validateTimerKnobs } from "./spawn.js";
import type { ChannelConclusion, SpawnChannel, SpawnChannelInput } from "./spawnChannel.js";

/**
 * The tmux spawn channel (packet ch9-p4a, TX2–TX6; contract:ch9-runner#C23's
 * session clauses over the P7a–P7f probed substrate). The session WRAPS the
 * C19-disciplined wrapper command (ADR-017's "tmux above the seam"): the
 * wrapper asset is the PANE PROCESS, the P3b result seam runs INSIDE the
 * session byte-preserved, and the channel changes ONLY where the attempt's
 * conclusion is OBSERVED — session death (the has-session poll is the SOLE
 * liveness authority) plus the result file the ADAPTER then reads (TX7).
 *
 * Every tmux client invocation (create, set-option, list-panes, has-session,
 * kill-session) rides the C19 seam with its own short timeout. The channel
 * NEVER classifies: it concludes `session-concluded` with its own timedOut
 * flag, `name_collision` on the create's duplicate-session lane (TX3, before
 * any spawn side effect), or `infra` on a create failure / the poll's own
 * anomalous conclusion (TX4's reservation).
 */

/** The ABSOLUTE env binary (P7b): the `env -i` full-replacement embedding is
 * the confinement channel — tmux's `-e` ADDS onto the server env (P7a's leak)
 * and cannot realize C19's replacement. */
const ENV_BIN = "/usr/bin/env";

export interface TmuxChannelDeps {
  /** IC-D at channel grain (TX5, aftermath fix): EVERY window the channel owns
   * (the timeout firing, the grace escalation, the backstop, the kill-session
   * retry window) is measured against THIS injected source's `now()` deltas
   * from its anchor — never `Date.now()`, never poll-count accounting (which
   * would let slow client invocations stretch the windows unboundedly).
   * REQUIRED: production binds the caller's wall clock; scripted tests bind
   * the controlled clock. */
  readonly time: TimeSource;
  /** The C19 client-invocation seam (default: `disciplinedSpawn`) — injectable
   * so tests can stage per-invocation client faults. */
  readonly clientSpawn?: (input: DisciplinedSpawnInput) => Promise<SpawnConclusion>;
  /** The poll/backstop wait PACING seam (the TailWait pattern — a real timer
   * in production, controllable in tests). Pacing only: the deadline
   * authority is `time`. */
  readonly wait?: (ms: number) => Promise<void>;
  /** The pane-signal seam (default: `process.kill` with the already-dead
   * ESRCH swallowed — death is observed by the next poll). */
  readonly kill?: (pid: number, signal: "SIGTERM" | "SIGKILL") => void;
  /** The tmux client binary (default `"tmux"`, resolved via `clientEnv`'s
   * PATH inside the replaced client env). */
  readonly tmuxBin?: string;
  /** The client invocations' OWN env (C19 full replacement; default
   * `{ PATH: <host PATH> }` — the client must resolve tmux and reach the
   * user's server socket). */
  readonly clientEnv?: Readonly<Record<string, string>>;
  /** TX4: the liveness poll interval — the channel's OWN knob (default 250 ms;
   * floor 10 — a poll cadence, not an escalation timer). */
  readonly pollIntervalMs?: number;
  /** Each client invocation's own seam timeout (default 10 000 ms). */
  readonly clientTimeoutMs?: number;
  /** Each client invocation's seam grace (default 1 000 ms). */
  readonly clientGraceMs?: number;
}

/** The liveness poll's trichotomy (TX4): has-session exit 0 = alive, exit 1 =
 * dead; a seam infra, a flagged conclusion, or an exit outside the 0/1 domain
 * is the poll's own anomalous conclusion — the RESERVED infra lane. */
type Liveness = "alive" | "dead" | { readonly anomaly: string };

function defaultWait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function defaultKill(pid: number, signal: "SIGTERM" | "SIGKILL"): void {
  try {
    process.kill(pid, signal);
  } catch {
    // Already dead (ESRCH) or undeliverable — death is observed by the next
    // poll; the escalation ladder stays the bound (TX5).
  }
}

export function createTmuxSpawnChannel(deps: TmuxChannelDeps): SpawnChannel {
  const time = deps.time;
  const clientSpawn = deps.clientSpawn ?? disciplinedSpawn;
  const wait = deps.wait ?? defaultWait;
  const kill = deps.kill ?? defaultKill;
  const tmuxBin = deps.tmuxBin ?? "tmux";
  const clientEnv = deps.clientEnv ?? { PATH: process.env.PATH ?? "" };
  const pollIntervalMs = deps.pollIntervalMs ?? 250;
  const clientTimeoutMs = deps.clientTimeoutMs ?? 10_000;
  const clientGraceMs = deps.clientGraceMs ?? 1_000;
  // TX5: ALL channel timer knobs validated at construction via the seam's
  // SHARED validator (the P3b-T2 rule). The launch-passed knobs (timeoutMs /
  // graceMs / backstopMarginMs) are the ADAPTER's, validated at ITS
  // construction. The poll interval is a cadence, not an escalation timer —
  // its floor is 10 ms, not the escalation floor.
  validateTimerKnobs(
    [
      { label: "clientTimeoutMs", value: clientTimeoutMs },
      { label: "clientGraceMs", value: clientGraceMs },
      { label: "pollIntervalMs", value: pollIntervalMs, floor: 10 },
    ],
    [{ label: "clientTimeoutMs + clientGraceMs", value: clientTimeoutMs + clientGraceMs }],
  );

  return {
    async launch(input: SpawnChannelInput): Promise<ChannelConclusion> {
      // Session names come EXCLUSIVELY from the input (the ledger-recorded
      // value — C23's resolution-source letter; the channel never derives).
      const name = input.sessionName;

      const client = (args: readonly string[]): Promise<SpawnConclusion> =>
        clientSpawn({
          cmd: tmuxBin,
          args,
          cwd: input.cwd,
          env: clientEnv,
          timeoutMs: clientTimeoutMs,
          graceMs: clientGraceMs,
        });

      async function pollLiveness(): Promise<Liveness> {
        const c = await client(["has-session", "-t", name]);
        if (c.kind === "infra") {
          return { anomaly: `has-session seam infra: ${c.message}` };
        }
        if (!c.timedOut && c.code === 0) {
          return "alive";
        }
        if (!c.timedOut && c.code === 1) {
          return "dead";
        }
        return {
          anomaly: `has-session concluded outside the 0/1 domain (code ${String(c.code)}, signal ${String(c.signal)}, timedOut ${String(c.timedOut)})`,
        };
      }

      /** TX4: ANY list-panes non-success leaves pane_pid UNRESOLVED — NEVER an
       * infra conclusion (the has-session poll is the sole liveness authority;
       * a fast-exited wrapper proceeds straight to conclusion, pid unneeded). */
      async function resolvePanePid(): Promise<number | undefined> {
        const c = await client(["list-panes", "-t", name, "-F", "#{pane_pid}"]);
        if (c.kind === "exit" && c.code === 0 && !c.timedOut) {
          const pid = Number.parseInt(c.stdout.trim(), 10);
          if (Number.isSafeInteger(pid) && pid > 0) {
            return pid;
          }
        }
        return undefined;
      }

      /** Poll until death/anomaly or the WALL-CLOCK window elapsed: the window
       * closes when `time.now() − anchor ≥ windowMs`, checked after every
       * liveness observation — so time spent awaiting the client invocations
       * CONSUMES the window instead of stretching it (TX5's aftermath fix; the
       * deadline fires at the FIRST observation point at/after it — poll-grain
       * firing is inherent). Death always wins an observation over the
       * deadline check. Returns "alive" when the window closed with the
       * session still up. */
      async function pollWindow(windowMs: number, anchor: number): Promise<Liveness> {
        for (;;) {
          const liveness = await pollLiveness();
          if (liveness !== "alive") {
            return liveness;
          }
          if (time.now() - anchor >= windowMs) {
            return "alive";
          }
          await wait(pollIntervalMs);
        }
      }

      /**
       * TX5's LAST RESORT (label-symmetric — it binds on the flagged timeout
       * path AND TX6's unflagged abort path alike): kill-session, ONE
       * poll-coupled retry, then the BOUNDED conclusion under the path's own
       * label. A still-alive session after the retry is the F6(d) ORPHAN
       * RESIDUAL (a tmux server refusing signals AND kill-session is the
       * trusted-local substrate-fault class): the conclusion stays bounded,
       * the orphan stays findable by its session name — never an unbounded
       * wait, never an undeclared orphan on any conclusion label.
       */
      async function lastResort(flagged: boolean): Promise<ChannelConclusion> {
        for (let attempt = 0; attempt < 2; attempt += 1) {
          // The retry window is wall-clock too: a kill-session client that
          // itself consumed the poll interval proceeds straight to the poll.
          const retryAnchor = time.now();
          await client(["kill-session", "-t", name]);
          if (time.now() - retryAnchor < pollIntervalMs) {
            await wait(pollIntervalMs);
          }
          const liveness = await pollLiveness();
          if (liveness === "dead") {
            return { kind: "session-concluded", timedOut: flagged };
          }
          if (liveness !== "alive") {
            return { kind: "infra", message: liveness.anomaly };
          }
        }
        // Bounded under the path's OWN label with the orphan residual declared.
        return { kind: "session-concluded", timedOut: flagged };
      }

      /**
       * TX5: the pane-grain escalation — TERM to pane_pid (the wrapper
       * forwards and arms its own inner grace, so the result file gets
       * written; kill-session-first would forfeit the record), the outer
       * backstop KILL at graceMs + backstopMarginMs, the kill-session last
       * resort one poll later. If pane_pid was never obtained no signal is
       * sent — death is the observable, and the same schedule still bounds
       * through the last resort.
       */
      async function escalate(
        flagged: boolean,
        panePid: number | undefined,
      ): Promise<ChannelConclusion> {
        // The escalation anchor: the grace + backstop window is measured from
        // HERE against the injected clock (TX5's wall-clock accounting).
        const graceAnchor = time.now();
        if (panePid !== undefined) {
          kill(panePid, "SIGTERM");
        }
        const afterGrace = await pollWindow(input.graceMs + input.backstopMarginMs, graceAnchor);
        if (afterGrace === "dead") {
          return { kind: "session-concluded", timedOut: flagged };
        }
        if (afterGrace !== "alive") {
          return { kind: "infra", message: afterGrace.anomaly };
        }
        const killAnchor = time.now();
        if (panePid !== undefined) {
          kill(panePid, "SIGKILL");
        }
        const afterKill = await pollWindow(pollIntervalMs, killAnchor);
        if (afterKill === "dead") {
          return { kind: "session-concluded", timedOut: flagged };
        }
        if (afterKill !== "alive") {
          return { kind: "infra", message: afterKill.anomaly };
        }
        return lastResort(flagged);
      }

      // ── TX2: the CREATE — ONE new-session client invocation at argv grain,
      //    the env -i FULL-REPLACEMENT embedding (P7b closes P7a's server-env
      //    leak; the darwin __CF_USER_TEXT_ENCODING is the declared residual),
      //    -c carrying C17's cwd. The ephemerality pin is a SEPARATE second
      //    invocation (TX6) — NEVER chained: a chained aggregate exit would
      //    fuse two failure domains.
      const envPairs = Object.entries(input.env).map(([key, value]) => `${key}=${value}`);
      const create = await client([
        "new-session",
        "-d",
        "-s",
        name,
        "-c",
        input.cwd,
        ENV_BIN,
        "-i",
        ...envPairs,
        ...input.wrapperArgv,
      ]);
      if (create.kind === "infra") {
        // tmux absent (ENOENT) and kin — fail-closed, never a guessed collision.
        return { kind: "infra", message: `tmux create: ${create.message}` };
      }
      if (create.code !== 0) {
        // TX3: the collision detection binds to the CREATE ALONE — nonzero
        // with the duplicate-session stderr prefix (P7d: the second command
        // never ran; the atomic form — a pre-check has-session would be
        // TOCTOU-racy against a concurrent worker).
        if (create.code !== null && create.stderr.startsWith("duplicate session")) {
          return { kind: "name_collision" };
        }
        return {
          kind: "infra",
          message: `tmux create concluded abnormally (code ${String(create.code)}, signal ${String(create.signal)})`,
        };
      }

      // ── TX6: the SEPARATE ephemerality pin. A pin failure is NEVER a
      //    conclusion by itself — it branches on session state, and a LIVE
      //    session never continues past a failed pin.
      const pin = await client(["set-option", "-t", name, "remain-on-exit", "off"]);
      const pinOk = pin.kind === "exit" && pin.code === 0 && !pin.timedOut;
      if (!pinOk) {
        const liveness = await pollLiveness();
        if (liveness === "dead") {
          // (a) the fast-exit race: the session already died — BENIGN;
          // observation proceeds and a present result is honored (TX7).
          return { kind: "session-concluded", timedOut: false };
        }
        if (liveness !== "alive") {
          return { kind: "infra", message: liveness.anomaly };
        }
        // (b) a LIVE session → ABORT, UNFLAGGED (the channel's timer did not
        // fire): resolve pane_pid if unread (a list-panes non-success here →
        // straight to the kill-session backstop), run the TX5 escalation, and
        // conclude through TX7's precedence — a pre-abort result is honored,
        // absence lands spawn_infra (a pin-establishment fault is a
        // spawn-infra class; re-delivery is kernel-safe, C14/C16).
        const abortPid = await resolvePanePid();
        if (abortPid === undefined) {
          return lastResort(false);
        }
        return escalate(false, abortPid);
      }

      // ── TX4: observe pane_pid (never a conclusion), then poll liveness
      //    until death or the channel's own timer fires (TX5). The timeout
      //    window is anchored HERE — the observed attempt's start (the create
      //    and pin invocations are each seam-bounded already); every client
      //    invocation from this point (list-panes included) consumes the
      //    window on the injected clock.
      const observeAnchor = time.now();
      const panePid = await resolvePanePid();
      const preTimeout = await pollWindow(input.timeoutMs, observeAnchor);
      if (preTimeout === "dead") {
        return { kind: "session-concluded", timedOut: false };
      }
      if (preTimeout !== "alive") {
        return { kind: "infra", message: preTimeout.anomaly };
      }
      // The channel's timer fired: the session-level escalation, flagged.
      return escalate(true, panePid);
    },
  };
}
