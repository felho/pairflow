import { execFile } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
// REAL-SUBSTRATE waits ONLY (the CHK-D-TESTCLOCK boundary): this file drives
// a REAL tmux server, whose session death/option state a controlled clock
// cannot advance — the imported promise timer paces the polling of the live
// substrate, exactly like the real child processes the P3b spawn suites await.
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { afterAll, afterEach, describe, expect, it } from "vitest";

import type { ContextPacket, DispatchIntent, Outcome } from "../domain/index.js";
import type { DiagnosticEventBody } from "../ports/diagnostics.js";
import type { TimeSource } from "../ports/time.js";
import { createControlledClock } from "../testkit/index.js";
import {
  classifySessionConclusion,
  createActorAdapter,
  PAIRFLOW_EMIT,
  PAIRFLOW_PACKET,
  parseResult,
} from "./actorAdapter.js";
import type { DisciplinedSpawnInput, SpawnConclusion } from "./spawn.js";
import { disciplinedSpawn, TimerKnobError } from "./spawn.js";
import { createTmuxSpawnChannel } from "./tmuxChannel.js";
import type { TmuxChannelDeps } from "./tmuxChannel.js";

/**
 * The tmux spawn channel (packet ch9-p4a, TX2–TX7) — driven against REAL tmux
 * sessions (tmux is a declared test-environment requirement beside git; this
 * file joins the Stryker subprocess exclude). Session names are prefixed
 * `p4atest-` and killed in afterEach; every tmux client (the channel's AND the
 * raw helpers') rides a PRIVATE per-run server socket (`-L`), never the user's
 * default server. The scripted `clientSpawn` interceptor stages the
 * client-fault lanes the real substrate cannot produce on demand.
 */

const NODE = process.execPath;
const WRAPPER_PATH = fileURLToPath(new URL("./attemptWrapper.mjs", import.meta.url));
const roots: string[] = [];
const sessions: string[] = [];

// ── The private per-run tmux server (wedge containment) ────────────────────
// All tmux clients here address a DEDICATED socket (`-L`), unique per test
// process. Three properties this buys, each observed missing in a real
// incident (2026-08-11, full-suite runs intermittently hung):
//   • the user's default tmux server is never touched — no shared fate, and
//     teardown may be as brutal as it likes;
//   • a wedged server (a new-session client observed spinning >10 min while
//     every later client queued behind the single-threaded server) wedges only
//     THIS run's private server, not every tmux user on the host;
//   • afterAll can `kill-server` unconditionally — on a private socket that is
//     hygiene, on the default socket it would be sabotage.
const SOCKET = `p4a-${String(process.pid)}`;

/** Raw tmux client for setup/teardown/assertions — same private socket as the
 * channel's clients, and HARD-BOUNDED: an execFile timeout with SIGKILL, so a
 * wedged server turns teardown into a loud bounded failure, never an unbounded
 * hang (the channel's own clients are already seam-bounded; this closes the
 * one unbounded path this file had). */
function tmuxRaw(...args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile(
      "tmux",
      ["-L", SOCKET, ...args],
      { timeout: 10_000, killSignal: "SIGKILL" },
      (error, stdout, stderr) => {
        const code =
          error === null ? 0 : typeof error.code === "number" ? error.code : 1;
        resolve({ code, stdout, stderr });
      },
    );
  });
}

/** The channel-side client seam bound to the SAME private socket: the `-L`
 * flag is injected at SPAWN time (below any interception), so the channel's
 * argv-grain construction — and the interceptors' verb detection on
 * `args[0]` — see the exact production argv shape, unprefixed. */
function socketSpawn(input: DisciplinedSpawnInput): Promise<SpawnConclusion> {
  return disciplinedSpawn({ ...input, args: ["-L", SOCKET, ...input.args] });
}

afterEach(async () => {
  for (const name of sessions.splice(0)) {
    await tmuxRaw("kill-session", "-t", name);
  }
  for (const dir of roots.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

afterAll(async () => {
  // The private server dies with the run — sessions, panes, whatever a wedge
  // left behind. Nonzero (server already gone) is the normal case.
  await tmuxRaw("kill-server");
  // tmux leaves the socket FILE behind after kill-server; unlink it so
  // per-run sockets don't accumulate in the socket dir (the tmux man page's
  // socket path: $TMUX_TMPDIR || /tmp, subdir tmux-<uid>, our named socket).
  const uid = process.getuid?.();
  if (uid !== undefined) {
    rmSync(join(process.env.TMUX_TMPDIR ?? "/tmp", `tmux-${String(uid)}`, SOCKET), { force: true });
  }
});

function tempRoot(): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "v3-tmux-")));
  roots.push(root);
  return root;
}

function sessionName(): string {
  const name = `p4atest-${randomBytes(6).toString("hex")}`;
  sessions.push(name);
  return name;
}

async function waitForRealDeath(name: string): Promise<void> {
  for (let i = 0; i < 400; i += 1) {
    const r = await tmuxRaw("has-session", "-t", name);
    if (r.code !== 0) return;
    await delay(25);
  }
  throw new Error(`session ${name} never died`);
}

async function isReallyAlive(name: string): Promise<boolean> {
  return (await tmuxRaw("has-session", "-t", name)).code === 0;
}

/** The adapter-shaped wrapper argv (RS1's spawn form). */
function wrapperArgv(opts: {
  graceMs: number;
  resultPath: string;
  attemptId: string;
  actorArgv: readonly string[];
}): readonly string[] {
  return [
    NODE,
    WRAPPER_PATH,
    String(opts.graceMs),
    opts.resultPath,
    opts.attemptId,
    ...opts.actorArgv,
  ];
}

/** A scripted client interceptor: per-verb override, everything else real.
 * Records every invocation's verb for count assertions. */
function interceptClient(
  overrides: Partial<
    Record<
      string,
      (input: DisciplinedSpawnInput, real: () => Promise<SpawnConclusion>) => Promise<SpawnConclusion>
    >
  >,
): { clientSpawn: (input: DisciplinedSpawnInput) => Promise<SpawnConclusion>; verbs: string[] } {
  const verbs: string[] = [];
  return {
    verbs,
    clientSpawn(input: DisciplinedSpawnInput): Promise<SpawnConclusion> {
      const verb = input.args[0] ?? "";
      verbs.push(verb);
      const override = overrides[verb];
      // The REAL path rides the private-socket spawn — interception sees the
      // production argv (verb-first), the socket flag lands below it.
      const real = (): Promise<SpawnConclusion> => socketSpawn(input);
      return override !== undefined ? override(input, real) : real();
    },
  };
}

const FAKE_FAIL: SpawnConclusion = {
  kind: "exit",
  code: 1,
  signal: null,
  timedOut: false,
  stdout: "",
  stderr: "scripted client fault",
};

/** A scripted clean/nonzero client conclusion (the seam's exit shape). */
function exitConclusion(code: number, stdout = "", stderr = ""): SpawnConclusion {
  return { kind: "exit", code, signal: null, timedOut: false, stdout, stderr };
}

/** The REAL-substrate binding of the channel's injected TimeSource: this file
 * drives a real tmux server, so the wall clock IS the substrate's clock (the
 * CHK-D-TESTCLOCK boundary — same rationale as the real `delay` pacing above).
 * The scripted wall-clock-window lane binds the controlled clock instead. */
const wallClock: TimeSource = {
  // The real-tmux lanes' declared substrate-clock exception (the file-top
  // CHK-D-TESTCLOCK note): a real session's death cannot be advanced by a
  // controlled clock; the scripted wall-clock-window lane binds
  // createControlledClock instead.
  // eslint-disable-next-line no-restricted-properties
  now: () => Date.now(),
};

function channelWith(deps: Partial<TmuxChannelDeps> = {}) {
  // clientSpawn defaults to the private-socket spawn; scripted lanes override
  // it (and route their real() legs through the same socket, above).
  return createTmuxSpawnChannel({ time: wallClock, pollIntervalMs: 25, clientSpawn: socketSpawn, ...deps });
}

interface LaunchOpts {
  readonly actorArgv: readonly string[];
  readonly name: string;
  readonly cwd?: string;
  readonly env?: Record<string, string>;
  readonly timeoutMs?: number;
  readonly graceMs?: number;
  readonly backstopMarginMs?: number;
  readonly deps?: Partial<TmuxChannelDeps>;
  readonly attemptId?: string;
  readonly resultPath?: string;
}

function launch(opts: LaunchOpts) {
  const cwd = opts.cwd ?? tempRoot();
  const resultPath = opts.resultPath ?? join(cwd, "result.json");
  const graceMs = opts.graceMs ?? 1_000;
  return {
    resultPath,
    conclusion: channelWith(opts.deps ?? {}).launch({
      wrapperArgv: wrapperArgv({
        graceMs,
        resultPath,
        attemptId: opts.attemptId ?? "att-1",
        actorArgv: opts.actorArgv,
      }),
      cwd,
      env: opts.env ?? { PATH: process.env.PATH ?? "" },
      sessionName: opts.name,
      timeoutMs: opts.timeoutMs ?? 30_000,
      graceMs,
      backstopMarginMs: opts.backstopMarginMs ?? 500,
    }),
  };
}

// REAL-TMUX LOAD ROBUSTNESS (ch9-p4b build-close, orchestrator edit): the
// real-tmux lanes race OS scheduling under FULL-SUITE parallel load (the
// p4b suite grew the subprocess population; two different lanes flaked on
// different full runs while every isolated run stayed green). The
// load-sensitive describes carry { retry: 2 } — vitest REPORTS retried
// tests as flaky (visible, never silent), and a genuine semantic break
// still fails all three attempts, so lane sensitivity is preserved.
describe("tmuxChannel — TX2/TX3 session creation, confinement basis, collision", { retry: 2 }, () => {
  it("a natural exit concludes via SESSION DEATH and the wrapper's result file carries the attempt echo (the P3b result seam preserved inside the session)", async () => {
    const name = sessionName();
    const { conclusion, resultPath } = launch({
      actorArgv: [NODE, "-e", "process.exit(0)"],
      name,
    });
    const c = await conclusion;
    expect(c).toEqual({ kind: "session-concluded", timedOut: false });
    const record = JSON.parse(readFileSync(resultPath, "utf8")) as Record<string, unknown>;
    expect(record).toEqual({ attemptId: "att-1", exitCode: 0, signal: null, termForwarded: false });
    expect(await isReallyAlive(name)).toBe(false);
  });

  it("TX3 collision: a pre-created same-name session → name_collision BEFORE any spawn side effect (the wrapped command NEVER ran)", async () => {
    const name = sessionName();
    const dir = tempRoot();
    const pre = await tmuxRaw("new-session", "-d", "-s", name, "sleep", "30");
    expect(pre.code).toBe(0);
    const sideEffect = join(dir, "side-effect");
    const { conclusion } = launch({
      actorArgv: [NODE, "-e", `require('node:fs').writeFileSync(${JSON.stringify(sideEffect)}, 'ran')`],
      name,
      cwd: dir,
    });
    expect(await conclusion).toEqual({ kind: "name_collision" });
    // The colliding create started NOTHING (P7d).
    await delay(200);
    expect(existsSync(sideEffect)).toBe(false);
  });

  it("TX3: any OTHER create failure (tmux binary absent → the seam's ENOENT infra lane) → infra, never a guessed collision", async () => {
    const name = sessionName();
    const { conclusion } = launch({
      actorArgv: [NODE, "-e", "process.exit(0)"],
      name,
      deps: { tmuxBin: join(tempRoot(), "no-such-tmux") },
    });
    const c = await conclusion;
    expect(c.kind).toBe("infra");
  });

  it("TX3: a NON-duplicate NONZERO create failure (an unreachable server socket) → infra, NEVER a guessed collision", async () => {
    const name = sessionName();
    const intercepted = interceptClient({
      "new-session": () =>
        Promise.resolve(
          exitConclusion(
            1,
            "",
            "error connecting to /private/tmp/tmux-0/no-such-socket (No such file or directory)\n",
          ),
        ),
    });
    const { conclusion } = launch({
      actorArgv: [NODE, "-e", "process.exit(0)"],
      name,
      deps: { clientSpawn: intercepted.clientSpawn },
    });
    const c = await conclusion;
    // Nonzero WITHOUT the duplicate-session stderr prefix: the fail-closed
    // infra lane (→ spawn_infra at the adapter), never name_collision.
    expect(c.kind).toBe("infra");
  });

  it("TX6: the ephemerality pin is a SEPARATE invocation and lands per-session (remain-on-exit off confirmed on the LIVE session); a foreign session kill is observed as death", async () => {
    const name = sessionName();
    const { conclusion } = launch({
      actorArgv: [NODE, "-e", "setInterval(() => {}, 1000)"],
      name,
      timeoutMs: 30_000,
    });
    // Wait for the live session, then confirm the pinned option.
    for (let i = 0; i < 200 && !(await isReallyAlive(name)); i += 1) {
      await delay(25);
    }
    expect(await isReallyAlive(name)).toBe(true);
    const opt = await tmuxRaw("show-options", "-t", name, "remain-on-exit");
    expect(opt.stdout).toContain("remain-on-exit off");
    // A FOREIGN kill of the session: the poll observes death and concludes.
    await tmuxRaw("kill-session", "-t", name);
    expect(await conclusion).toEqual({ kind: "session-concluded", timedOut: false });
  });
});

describe("tmuxChannel — TX5 session-timeout escalation (pane-grain TERM → inner grace → backstop)", { retry: 2 }, () => {
  it("a TERM-compliant actor: the wrapper receives the pane TERM, forwards it, and records termForwarded (own_timeout's basis)", async () => {
    const name = sessionName();
    const { conclusion, resultPath } = launch({
      actorArgv: [NODE, "-e", "setInterval(() => {}, 1000)"],
      name,
      timeoutMs: 400,
      graceMs: 3_000,
      backstopMarginMs: 500,
    });
    const c = await conclusion;
    expect(c).toEqual({ kind: "session-concluded", timedOut: true });
    const record = JSON.parse(readFileSync(resultPath, "utf8")) as Record<string, unknown>;
    expect(record.termForwarded).toBe(true);
    expect(record.signal).toBe("SIGTERM");
    expect(await isReallyAlive(name)).toBe(false);
  }, 20_000);

  it("a TERM-IGNORING actor: the WRAPPER's inner grace SIGKILL concludes it (RS1 unchanged; the outer backstop never needed)", async () => {
    const name = sessionName();
    const { conclusion, resultPath } = launch({
      actorArgv: [NODE, "-e", "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000)"],
      name,
      timeoutMs: 400,
      graceMs: 700,
      // The margin must dwarf the wrapper's inner path (grace timer +
      // SIGKILL + atomic result write) under FULL-SUITE parallel load —
      // at 2 000 ms the outer backstop killed a CPU-starved wrapper
      // before its result write, flaking this lane (observed when the
      // ch9-p4b suite grew the parallel subprocess load).
      backstopMarginMs: 8_000,
    });
    const c = await conclusion;
    expect(c).toEqual({ kind: "session-concluded", timedOut: true });
    const record = JSON.parse(readFileSync(resultPath, "utf8")) as Record<string, unknown>;
    expect(record.termForwarded).toBe(true);
    expect(record.signal).toBe("SIGKILL");
  }, 20_000);

  it("the kill-session LAST RESORT: undeliverable pane signals (a no-op kill seam) → bounded conclusion through the flag, no result, NO HANG", async () => {
    const name = sessionName();
    const { conclusion, resultPath } = launch({
      actorArgv: [NODE, "-e", "setInterval(() => {}, 1000)"],
      name,
      timeoutMs: 300,
      graceMs: 1_000,
      backstopMarginMs: 500,
      deps: { kill: () => {} },
    });
    const c = await conclusion;
    expect(c).toEqual({ kind: "session-concluded", timedOut: true });
    // The wrapper never received TERM → no result was written (the adapter's
    // TX7 lands own_timeout via the flag).
    expect(existsSync(resultPath)).toBe(false);
    expect(await isReallyAlive(name)).toBe(false);
  }, 20_000);

  it("the kill-session FAILURE lane (flagged path): ONE poll-coupled retry, then the BOUNDED own-label conclusion with the F6(d) orphan residual (the session may remain)", async () => {
    const name = sessionName();
    const intercepted = interceptClient({
      "kill-session": () => Promise.resolve(FAKE_FAIL),
    });
    const { conclusion } = launch({
      actorArgv: [NODE, "-e", "setInterval(() => {}, 1000)"],
      name,
      timeoutMs: 300,
      graceMs: 700,
      backstopMarginMs: 300,
      deps: { kill: () => {}, clientSpawn: intercepted.clientSpawn },
    });
    const c = await conclusion;
    // Bounded under the path's OWN label (the flag) — never an unbounded wait.
    expect(c).toEqual({ kind: "session-concluded", timedOut: true });
    // EXACTLY one retry: two kill-session invocations, no more.
    expect(intercepted.verbs.filter((v) => v === "kill-session")).toHaveLength(2);
    // The declared orphan residual: the session is STILL alive (found by its
    // name; teardown is the named Absent) — afterEach reaps it.
    expect(await isReallyAlive(name)).toBe(true);
  }, 20_000);
});

describe("tmuxChannel — TX5 wall-clock windows (the injected TimeSource is the deadline authority)", () => {
  it("slow client invocations CONSUME the timeout window instead of stretching it: the escalation fires at the first observation at/after the configured deadline (RED under poll-count accounting)", async () => {
    // FULLY SCRIPTED (no real tmux): the controlled clock is the only time.
    const clock = createControlledClock(0);
    let killSessionIssued = false;
    const kills: { signal: string; at: number }[] = [];
    const intercepted = interceptClient({
      "new-session": () => Promise.resolve(exitConclusion(0)),
      "set-option": () => Promise.resolve(exitConclusion(0)),
      "list-panes": () => Promise.resolve(exitConclusion(0, "4242\n")),
      "has-session": () => {
        // EACH liveness poll's client invocation consumes a LARGE chunk of
        // injected time — the slow-tmux-client sensitivity input.
        clock.advance(7_000);
        return Promise.resolve(exitConclusion(killSessionIssued ? 1 : 0));
      },
      "kill-session": () => {
        killSessionIssued = true;
        return Promise.resolve(exitConclusion(0));
      },
    });
    const channel = createTmuxSpawnChannel({
      time: clock,
      pollIntervalMs: 1_000,
      clientSpawn: intercepted.clientSpawn,
      wait: (ms) => {
        clock.advance(ms);
        return Promise.resolve();
      },
      kill: (_pid, signal) => {
        kills.push({ signal, at: clock.now() });
      },
    });
    const conclusion = await channel.launch({
      wrapperArgv: [NODE, "-e", "process.exit(0)"], // never spawned — all client verbs scripted
      cwd: tempRoot(),
      env: { PATH: process.env.PATH ?? "" },
      sessionName: "p4atest-scripted-clock",
      timeoutMs: 30_000,
      graceMs: 1_000,
      backstopMarginMs: 1_000,
    });
    expect(conclusion).toEqual({ kind: "session-concluded", timedOut: true });
    // The deadline authority is the injected TimeSource: the pane TERM fires
    // at the FIRST observation at/after 30 000 injected ms. Under the old
    // poll-count accounting (pollIntervalMs per cycle, client time EXCLUDED)
    // it would need 30 cycles ≈ 240 000 injected ms — RED here.
    expect(kills[0]?.signal).toBe("SIGTERM");
    expect(kills[0]?.at).toBeGreaterThanOrEqual(30_000);
    expect(kills[0]?.at).toBeLessThanOrEqual(30_000 + 8_000); // one observation grain
    // The escalation stayed ordered and bounded on the same clock.
    expect(kills[1]?.signal).toBe("SIGKILL");
    expect(kills[1]?.at).toBeGreaterThanOrEqual((kills[0]?.at ?? 0) + 2_000);
  });
});

describe("tmuxChannel — TX6 the pin-failure branches (dead-benign / live-abort)", { retry: 2 }, () => {
  it("a pin failing on an ALREADY-DEAD session (the fast-exit race) is BENIGN: observation proceeds and the present result is honored", async () => {
    const name = sessionName();
    const intercepted = interceptClient({
      "set-option": async (_input, real) => {
        await waitForRealDeath(name); // force the race: the pin runs against the dead session
        return real();
      },
    });
    const { conclusion, resultPath } = launch({
      actorArgv: [NODE, "-e", "process.exit(0)"],
      name,
      deps: { clientSpawn: intercepted.clientSpawn },
    });
    const c = await conclusion;
    expect(c).toEqual({ kind: "session-concluded", timedOut: false });
    const record = JSON.parse(readFileSync(resultPath, "utf8")) as Record<string, unknown>;
    expect(record.exitCode).toBe(0);
  }, 20_000);

  it("a pin failing on a LIVE session ABORTS: the pane escalation runs, the conclusion is UNFLAGGED, and the session NEVER survives the failed pin", async () => {
    const name = sessionName();
    const intercepted = interceptClient({
      "set-option": () => Promise.resolve(FAKE_FAIL),
    });
    const { conclusion, resultPath } = launch({
      actorArgv: [NODE, "-e", "setInterval(() => {}, 1000)"],
      name,
      timeoutMs: 30_000,
      graceMs: 700,
      backstopMarginMs: 300,
      deps: { kill: () => {}, clientSpawn: intercepted.clientSpawn },
    });
    const c = await conclusion;
    // UNFLAGGED (the channel's timer did not fire): the adapter's TX7 lands
    // spawn_infra on the absent result.
    expect(c).toEqual({ kind: "session-concluded", timedOut: false });
    expect(existsSync(resultPath)).toBe(false);
    expect(await isReallyAlive(name)).toBe(false);
  }, 20_000);

  it("the abort-plus-backstop-failure member: the kill-session fault on the UNFLAGGED abort path → bounded UNFLAGGED conclusion with the F6(d) residual (label-symmetric)", async () => {
    const name = sessionName();
    const intercepted = interceptClient({
      "set-option": () => Promise.resolve(FAKE_FAIL),
      "kill-session": () => Promise.resolve(FAKE_FAIL),
    });
    const { conclusion } = launch({
      actorArgv: [NODE, "-e", "setInterval(() => {}, 1000)"],
      name,
      timeoutMs: 30_000,
      graceMs: 700,
      backstopMarginMs: 300,
      deps: { kill: () => {}, clientSpawn: intercepted.clientSpawn },
    });
    const c = await conclusion;
    // The path's OWN label: unflagged — RED if the residual attached only to
    // the own_timeout label or the walk were unbounded.
    expect(c).toEqual({ kind: "session-concluded", timedOut: false });
    expect(intercepted.verbs.filter((v) => v === "kill-session")).toHaveLength(2);
    expect(await isReallyAlive(name)).toBe(true); // the declared orphan residual
  }, 20_000);

  it("the live-abort with DELIVERABLE signals: the escalation TERM reaches the wrapper, its signal record is WRITTEN, and the UNFLAGGED conclusion lands foreign_kill through TX7's shared precedence", async () => {
    const name = sessionName();
    const cwd = tempRoot();
    const ready = join(cwd, "actor-ready");
    const intercepted = interceptClient({
      // The pin fault returns only once the ACTOR is running — the wrapper's
      // TERM handler is installed before it spawns the actor, so the abort
      // TERM is guaranteed deliverable-and-handled (no boot race).
      "set-option": async () => {
        for (let i = 0; i < 400 && !existsSync(ready); i += 1) {
          await delay(25);
        }
        return FAKE_FAIL;
      },
    });
    // REAL kill seam (the default): the abort TERM actually delivers to the pane.
    const { conclusion, resultPath } = launch({
      actorArgv: [
        NODE,
        "-e",
        `require('node:fs').writeFileSync(${JSON.stringify(ready)}, '1'); setInterval(() => {}, 1000);`,
      ],
      name,
      cwd,
      timeoutMs: 30_000,
      graceMs: 1_000,
      backstopMarginMs: 500,
      deps: { clientSpawn: intercepted.clientSpawn },
    });
    const c = await conclusion;
    expect(c).toEqual({ kind: "session-concluded", timedOut: false });
    expect(await isReallyAlive(name)).toBe(false);
    // The wrapper RECEIVED the abort TERM, forwarded it, and wrote its record.
    const record = parseResult(resultPath, "att-1");
    expect(record).toMatchObject({ signal: "SIGTERM", termForwarded: true });
    // TX7 unflagged (the channel's timer did not fire): a signal record under
    // NO fired timer is C21's foreign_kill class — the documented
    // shared-precedence outcome, never spawn_infra.
    expect(classifySessionConclusion(false, record)).toEqual({
      kind: "result",
      result: { kind: "infra_failure", class: "foreign_kill" },
    });
  }, 20_000);

  it("a result ALREADY WRITTEN at the abort is HONORED: the recorded outcome rides TX7's precedence — never spawn_infra", async () => {
    const name = sessionName();
    const cwd = tempRoot();
    const resultPath = join(cwd, "result.json");
    // The pre-abort-WRITTEN result: a valid record exists before the pin
    // fault aborts the attempt.
    writeFileSync(
      resultPath,
      JSON.stringify({ attemptId: "att-1", exitCode: 4, signal: null, termForwarded: false }),
    );
    const intercepted = interceptClient({
      "set-option": () => Promise.resolve(FAKE_FAIL),
    });
    // Undeliverable pane signals (noop kill): the wrapper never concludes and
    // never overwrites the record; the kill-session backstop bounds the walk.
    const { conclusion } = launch({
      actorArgv: [NODE, "-e", "setInterval(() => {}, 1000)"],
      name,
      cwd,
      resultPath,
      timeoutMs: 30_000,
      graceMs: 700,
      backstopMarginMs: 300,
      deps: { kill: () => {}, clientSpawn: intercepted.clientSpawn },
    });
    const c = await conclusion;
    expect(c).toEqual({ kind: "session-concluded", timedOut: false });
    expect(await isReallyAlive(name)).toBe(false);
    // TX7 over the surviving pre-abort record: the recorded nonzero outcome
    // is honored (completed work is never reclassified) — never spawn_infra.
    const record = parseResult(resultPath, "att-1");
    expect(record).toMatchObject({ attemptId: "att-1", exitCode: 4 });
    expect(classifySessionConclusion(false, record)).toEqual({
      kind: "result",
      result: { kind: "infra_failure", class: "nonzero_exit" },
    });
  }, 20_000);
});

describe("tmuxChannel — TX4 liveness authority (list-panes never infra; poll anomalies fail closed)", () => {
  it("fast death PRE-observation: a wrapper dying before list-panes → pane_pid unresolved, the conclusion proceeds, NEVER infra", async () => {
    const name = sessionName();
    const intercepted = interceptClient({
      "list-panes": async (_input, real) => {
        await waitForRealDeath(name); // the session is gone when list-panes runs
        return real();
      },
    });
    const { conclusion, resultPath } = launch({
      actorArgv: [NODE, "-e", "process.exit(0)"],
      name,
      deps: { clientSpawn: intercepted.clientSpawn },
    });
    const c = await conclusion;
    expect(c).toEqual({ kind: "session-concluded", timedOut: false });
    const record = JSON.parse(readFileSync(resultPath, "utf8")) as Record<string, unknown>;
    expect(record.exitCode).toBe(0);
  }, 20_000);

  it("a LIVE-session list-panes fault: pane_pid unresolved, observation continues via the poll, and the timeout path STILL BOUNDS (straight to kill-session)", async () => {
    const name = sessionName();
    const intercepted = interceptClient({
      "list-panes": () => Promise.resolve(FAKE_FAIL),
    });
    const { conclusion } = launch({
      actorArgv: [NODE, "-e", "setInterval(() => {}, 1000)"],
      name,
      timeoutMs: 300,
      graceMs: 700,
      backstopMarginMs: 300,
      deps: { clientSpawn: intercepted.clientSpawn },
    });
    const c = await conclusion;
    expect(c).toEqual({ kind: "session-concluded", timedOut: true });
    expect(await isReallyAlive(name)).toBe(false);
  }, 20_000);

  it("the poll-anomaly member: a has-session conclusion OUTSIDE the 0/1 domain → channel infra, fail-closed", async () => {
    const name = sessionName();
    const intercepted = interceptClient({
      "has-session": () =>
        Promise.resolve({
          kind: "exit",
          code: 2,
          signal: null,
          timedOut: false,
          stdout: "",
          stderr: "server anomaly",
        }),
    });
    const { conclusion } = launch({
      actorArgv: [NODE, "-e", "setInterval(() => {}, 1000)"],
      name,
      deps: { clientSpawn: intercepted.clientSpawn },
    });
    const c = await conclusion;
    expect(c.kind).toBe("infra");
  }, 20_000);

  it("a seam INFRA on the poll → channel infra (the observation-infra reservation's other member)", async () => {
    const name = sessionName();
    const intercepted = interceptClient({
      "has-session": () => Promise.resolve({ kind: "infra", message: "client seam fault" }),
    });
    const { conclusion } = launch({
      actorArgv: [NODE, "-e", "setInterval(() => {}, 1000)"],
      name,
      deps: { clientSpawn: intercepted.clientSpawn },
    });
    const c = await conclusion;
    expect(c.kind).toBe("infra");
  }, 20_000);
});

describe("tmuxChannel — construction knob validation (the shared validator)", () => {
  it("throws FAIL-CLOSED on invalid channel knobs", () => {
    expect(() => createTmuxSpawnChannel({ time: wallClock, clientTimeoutMs: 500 })).toThrow(
      TimerKnobError,
    );
    expect(() => createTmuxSpawnChannel({ time: wallClock, clientGraceMs: Number.NaN })).toThrow(
      TimerKnobError,
    );
    expect(() => createTmuxSpawnChannel({ time: wallClock, pollIntervalMs: 0 })).toThrow(
      TimerKnobError,
    );
    expect(() => createTmuxSpawnChannel({ time: wallClock })).not.toThrow();
    expect(() => createTmuxSpawnChannel({ time: wallClock, pollIntervalMs: 250 })).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// The ADAPTER over the tmux channel — the TX wrap round trip (RS1–RS3
// preserved end-to-end), env confinement THROUGH the session, cwd honored.
// ═══════════════════════════════════════════════════════════════════════════
const INSTANCE = "inst-1";
const VERSION = 2;

function makeIntent(): DispatchIntent {
  const packet: ContextPacket = {
    instanceId: INSTANCE,
    expectedVersion: VERSION,
    task: "build the thing",
    role: "implementer",
    instruction: "do the work",
    availableOps: ["PASS"],
    effectiveAgentConfig: { profile: "stub" },
    contextBlocks: [],
    runtimeContext: "none",
  };
  return { actor: "codex", packet };
}

function recordingDiag(): { sink: { emit(b: DiagnosticEventBody): void }; events: DiagnosticEventBody[] } {
  const events: DiagnosticEventBody[] = [];
  return { events, sink: { emit: (b) => events.push(b) } };
}

function adapterRun(opts: {
  root: string;
  actorArgv: readonly string[];
  ingressOutcome?: Outcome;
  envAllowlist?: Record<string, string>;
  cwd?: string;
  diag?: { emit(b: DiagnosticEventBody): void };
}): Promise<unknown> {
  const name = sessionName();
  const adapter = createActorAdapter(
    {
      ingress: {
        submit: () =>
          Promise.resolve(opts.ingressOutcome ?? { kind: "committed", version: 3, intent: null }),
      },
      argvMapper: () => ({ cmd: opts.actorArgv[0] ?? "", args: opts.actorArgv.slice(1) }),
      diag: opts.diag ?? recordingDiag().sink,
      channel: channelWith({}),
    },
    {
      defaultCwd: opts.root,
      ...(opts.envAllowlist !== undefined ? { envAllowlist: opts.envAllowlist } : {}),
      timeoutMs: 60_000,
      graceMs: 1_000,
      backstopMarginMs: 1_000,
    },
  );
  return adapter.execute({
    intent: makeIntent(),
    attemptId: "att-1",
    sessionName: name,
    ...(opts.cwd !== undefined ? { cwd: opts.cwd } : {}),
  });
}

describe("tmuxChannel × actorAdapter — the TX wrap round trip (RS1–RS3 end-to-end)", { retry: 2 }, () => {
  it("a real actor inside a real session: handoff read, emit written, result read after session death → submitted", async () => {
    const root = tempRoot();
    const stub = join(root, "stub.js");
    writeFileSync(
      stub,
      [
        'const fs = require("node:fs");',
        `const packet = JSON.parse(fs.readFileSync(process.env.${PAIRFLOW_PACKET}, "utf8"));`,
        `fs.writeFileSync(process.env.${PAIRFLOW_EMIT}, JSON.stringify({ type: "PASS", payload: { got: packet.instanceId } }));`,
        "process.exit(0);",
      ].join("\n"),
    );
    const result = await adapterRun({ root, actorArgv: [NODE, stub] });
    expect(result).toEqual({
      kind: "submitted",
      outcome: { kind: "committed", version: 3, intent: null },
    });
  }, 30_000);

  it("env confinement THROUGH the session: the pane actor observes ONLY allowlist + PAIRFLOW_* (+ the declared darwin residual) — the host canary ABSENT (P7b's embedding closes P7a's leak)", async () => {
    const root = tempRoot();
    const dump = join(root, "env-dump.json");
    const stub = join(root, "stub.js");
    writeFileSync(
      stub,
      [
        'const fs = require("node:fs");',
        `fs.writeFileSync(${JSON.stringify(dump)}, JSON.stringify({ env: process.env, cwd: process.cwd() }));`,
        `fs.writeFileSync(process.env.${PAIRFLOW_EMIT}, JSON.stringify({ type: "PASS", payload: {} }));`,
        "process.exit(0);",
      ].join("\n"),
    );
    const PATH = process.env.PATH ?? "";
    await adapterRun({ root, actorArgv: [NODE, stub], envAllowlist: { PATH, TMUX_LANE_OK: "1" } });
    const dumped = JSON.parse(readFileSync(dump, "utf8")) as {
      env: Record<string, string>;
      cwd: string;
    };
    // CANARY ABSENCE (never set-equality): the host canary must not leak.
    expect(dumped.env.HOME).toBeUndefined();
    expect(dumped.env.TMPDIR).toBeUndefined();
    // The allowlist + the adapter pair ARE present.
    expect(dumped.env.PATH).toBe(PATH);
    expect(dumped.env.TMUX_LANE_OK).toBe("1");
    expect(dumped.env[PAIRFLOW_PACKET]).toBeDefined();
    expect(dumped.env[PAIRFLOW_EMIT]).toBeDefined();
    // The COMPLETE remaining keyset once the exact declared residuals are
    // removed (F6(a): the darwin-injected __CF_USER_TEXT_ENCODING; tmux itself
    // is absent from the pane env under the env -i embedding).
    const rest = Object.keys(dumped.env)
      .filter((k) => k !== "__CF_USER_TEXT_ENCODING")
      .sort();
    expect(rest).toEqual([PAIRFLOW_EMIT, PAIRFLOW_PACKET, "PATH", "TMUX_LANE_OK"].sort());
  }, 30_000);

  it("cwd honored (-c carries C17's value): the pane actor runs in the context cwd", async () => {
    const root = tempRoot();
    const ctxCwd = tempRoot();
    const dump = join(root, "cwd-dump.txt");
    const stub = join(root, "stub.js");
    writeFileSync(
      stub,
      [
        'const fs = require("node:fs");',
        `fs.writeFileSync(${JSON.stringify(dump)}, process.cwd());`,
        `fs.writeFileSync(process.env.${PAIRFLOW_EMIT}, JSON.stringify({ type: "PASS", payload: {} }));`,
        "process.exit(0);",
      ].join("\n"),
    );
    await adapterRun({ root, actorArgv: [NODE, stub], cwd: ctxCwd });
    expect(realpathSync(readFileSync(dump, "utf8"))).toBe(ctxCwd);
  }, 30_000);

  it("the tmux own-timeout round trip: TERM-compliant actor → own_timeout at the adapter, and the spawn_outcome event carries NO spawnDetail (F6(b))", async () => {
    const root = tempRoot();
    const stub = join(root, "stub.js");
    writeFileSync(stub, "setInterval(() => {}, 1000);\n");
    const name = sessionName();
    const diag = recordingDiag();
    const adapter = createActorAdapter(
      {
        ingress: { submit: () => Promise.reject(new Error("must not submit")) },
        argvMapper: () => ({ cmd: NODE, args: [stub] }),
        diag: diag.sink,
        channel: channelWith({}),
      },
      { defaultCwd: root, timeoutMs: 1_000, graceMs: 1_000, backstopMarginMs: 1_000 },
    );
    const result = await adapter.execute({
      intent: makeIntent(),
      attemptId: "att-1",
      sessionName: name,
    });
    expect(result).toEqual({ kind: "infra_failure", class: "own_timeout" });
    expect(diag.events).toHaveLength(1);
    expect(diag.events[0]).toMatchObject({ kind: "spawn_outcome", spawnOutcome: "own_timeout" });
    expect(diag.events[0]).not.toHaveProperty("spawnDetail");
  }, 30_000);

  it("the collision round trip: a pre-created same-name session → the K1 name_collision member + the DG3 token (the loop's remint basis)", async () => {
    const root = tempRoot();
    const stub = join(root, "stub.js");
    writeFileSync(stub, "process.exit(0);\n");
    const name = sessionName();
    expect((await tmuxRaw("new-session", "-d", "-s", name, "sleep", "30")).code).toBe(0);
    const diag = recordingDiag();
    const adapter = createActorAdapter(
      {
        ingress: { submit: () => Promise.reject(new Error("must not submit")) },
        argvMapper: () => ({ cmd: NODE, args: [stub] }),
        diag: diag.sink,
        channel: channelWith({}),
      },
      { defaultCwd: root, timeoutMs: 60_000, graceMs: 1_000, backstopMarginMs: 1_000 },
    );
    const result = await adapter.execute({
      intent: makeIntent(),
      attemptId: "att-1",
      sessionName: name,
    });
    expect(result).toEqual({ kind: "name_collision" });
    expect(diag.events.map((e) => e.spawnOutcome)).toEqual(["name_collision"]);
  }, 30_000);
});
