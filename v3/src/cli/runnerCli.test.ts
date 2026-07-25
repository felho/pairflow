import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

import { openDiagStore } from "../diag/index.js";
import { openStore } from "../store/index.js";
import type { StoreHandle } from "../store/index.js";
import { defaultSessionNamer, openErrandStore } from "../runner/index.js";
import type { ChannelConclusion, SpawnChannel } from "../runner/index.js";
import { createControlledClock } from "../testkit/index.js";
import type { CliErrorDoc } from "./contract.js";
import { CliError, EXIT, exitCodeFor, toErrorDoc } from "./contract.js";
import { runCli } from "./main.js";
import type { CliDeps } from "./runtime.js";
import type { VerbContext, VerbOptions } from "./common.js";
import {
  ATTACH_VERB_OPTIONS,
  deriveErrandDbPath,
  enrichDetailRunner,
  productionRunnerSeams,
  RUNNER_VERB_OPTIONS,
  verbAttach,
  verbRunner,
} from "./runnerVerbs.js";
import type { RunnerSeams } from "./runnerVerbs.js";

/**
 * ch9-p4b operator-surface unit lanes (RR/AT/RS/DT). Scripted seams (recorded
 * `runInteractive`, controlled clocks, a fake spawn channel, a scripted
 * liveness probe) drive the config/schema/exit lanes and the read discriminants
 * deterministically; the true delivery + real-tmux/gate lanes ride the J family
 * in `runnerJourney.test.ts`.
 */

const dirs: string[] = [];
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "v3-runner-cli-"));
  dirs.push(dir);
  return dir;
}
function tempDb(): string {
  return join(tempDir(), "store.db");
}
afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

const TEMPLATES = join(process.cwd(), "templates");

function mkDeps(overrides: Partial<CliDeps> = {}): CliDeps {
  let n = 0;
  const interactions: { cmd: string; args: readonly string[] }[] = [];
  const deps: CliDeps = {
    openStore: (path, time) => openStore(path, time),
    openDiagStore: (path, time) => openDiagStore(path, time),
    time: createControlledClock(1_000),
    instanceIdSource: () => `inst-${String((n += 1))}`,
    nonceSource: () => `nonce-${String((n += 1))}`,
    tailWait: () => () => Promise.resolve(),
    env: { PAIRFLOW_V3_TEMPLATES: TEMPLATES, PATH: process.env.PATH ?? "" },
    attemptIdSource: () => `attempt-${String((n += 1))}`,
    workerIdSource: () => `cli-worker-${String((n += 1))}`,
    runInteractive: (cmd, args) => {
      interactions.push({ cmd, args });
      return Promise.resolve(0);
    },
    ...overrides,
  };
  // Attach the recording ledger for assertions on the exec seam.
  (deps as unknown as Record<string, unknown>).interactions = interactions;
  return deps;
}

/** A fake spawn channel — never launched on the empty-ledger lanes; a
 * scripted session-conclusion otherwise. */
function fakeChannel(): SpawnChannel {
  return {
    launch: (): Promise<ChannelConclusion> =>
      Promise.resolve({ kind: "session-concluded", timedOut: false }),
  };
}

function fakeSeams(overrides: Partial<RunnerSeams> = {}): RunnerSeams {
  return {
    wait: () => Promise.reject(new Error("stop")),
    makeChannel: () => fakeChannel(),
    liveness: () => Promise.resolve("dead"),
    ...overrides,
  };
}

interface Run {
  code: number;
  stdout: string[];
  stderr: string[];
}

/** Drives a runner-plane handler with injected seams, mirroring `dispatch`'s
 * shell (strict parseArgs + the one-error-doc catch) so exit codes and error
 * docs are asserted exactly as the shipped CLI produces them. */
async function drive(
  handler: (ctx: VerbContext, seams: RunnerSeams) => Promise<number>,
  options: VerbOptions,
  args: readonly string[],
  deps: CliDeps,
  seams: RunnerSeams,
): Promise<Run> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  let code: number;
  try {
    let parsed: { values: VerbContext["values"]; positionals: string[] };
    try {
      parsed = parseArgs({ args: [...args], options, allowPositionals: true, strict: true });
    } catch (error) {
      throw new CliError("usage", "InvalidArguments", error instanceof Error ? error.message : String(error));
    }
    code = await handler(
      { positionals: parsed.positionals, values: parsed.values, deps, sinks: { out: (l) => stdout.push(l), err: (l) => stderr.push(l) } },
      seams,
    );
  } catch (error) {
    const cliError =
      error instanceof CliError
        ? error
        : new CliError("internal", error instanceof Error ? error.name : "UnknownError", error instanceof Error ? error.message : String(error));
    stderr.push(JSON.stringify(toErrorDoc(cliError)));
    code = exitCodeFor(cliError.errorClass);
  }
  return { code, stdout, stderr };
}

const runRunner = (args: readonly string[], deps: CliDeps, seams: RunnerSeams = fakeSeams()): Promise<Run> =>
  drive(verbRunner, RUNNER_VERB_OPTIONS, args, deps, seams);
const runAttach = (args: readonly string[], deps: CliDeps, seams: RunnerSeams = fakeSeams()): Promise<Run> =>
  drive(verbAttach, ATTACH_VERB_OPTIONS, args, deps, seams);

function errorDoc(result: Run): CliErrorDoc["error"] {
  expect(result.stderr).toHaveLength(1);
  return (JSON.parse(result.stderr[0] ?? "") as CliErrorDoc).error;
}

const ACTOR_CMD = JSON.stringify({ cmd: "true", args: [] });

/** The minimal valid `runner run --once` argv over an empty ledger. */
function onceArgs(db: string, extra: readonly string[] = []): string[] {
  return ["run", "--db", db, "--templates-dir", TEMPLATES, "--actor-cmd", ACTOR_CMD, "--once", ...extra];
}

// ── Errand-ledger seeding (the committed testkit + the store's own API) ───────

interface SeedOptions {
  readonly state?: "pending" | "attempting" | "unconfirmed" | "confirmed" | "mooted";
  readonly sessionName?: string;
  readonly createdClock?: number;
  readonly expectedVersion?: number;
  readonly actorId?: string;
}
function seedErrand(db: string, instanceId: string, contextPacketId: string, opts: SeedOptions = {}): void {
  const clock = createControlledClock(opts.createdClock ?? 1_000);
  const handle = openErrandStore(deriveErrandDbPath(db), clock);
  try {
    const s = handle.store;
    s.createErrand({
      instanceId,
      contextPacketId,
      expectedVersion: opts.expectedVersion ?? 2,
      actorId: opts.actorId ?? "operator",
      budget: 3,
    });
    const state = opts.state ?? "pending";
    if (state === "pending") {
      return;
    }
    s.claim({ instanceId, contextPacketId, workerId: "seed", now: clock.now() });
    if (state === "confirmed") {
      s.concludeConfirmed({ instanceId, contextPacketId });
      return;
    }
    if (state === "mooted") {
      s.concludeMooted({ instanceId, contextPacketId });
      return;
    }
    const started = s.startBudgetedAttempt({
      instanceId,
      contextPacketId,
      workerId: "seed",
      now: clock.now(),
      attemptIdSource: () => `seed-attempt-${contextPacketId}`,
      sessionNamer: opts.sessionName !== undefined ? () => opts.sessionName! : defaultSessionNamer,
    });
    if (started.kind !== "started") {
      throw new Error("seed: attempt did not start");
    }
    if (state === "attempting") {
      return;
    }
    if (state === "unconfirmed") {
      s.concludeNoOutput({ instanceId, contextPacketId, attemptId: started.attemptId });
    }
  } finally {
    handle.close();
  }
}

function openKernel(db: string): StoreHandle {
  return openStore(db, createControlledClock(1_000));
}

// A kernel-store subprocess seed (real create→start→submit) for the CF3 /
// racing-resolution lanes.
async function seedKernelWithEvidence(db: string): Promise<{ id: string; version: number }> {
  const deps = mkDeps();
  const out: string[] = [];
  const sinks = { out: (l: string) => out.push(l), err: () => {} };
  await runCli(["create", "--db", db, "--task", "t"], deps, sinks);
  const id = (JSON.parse(out[0] ?? "") as { instanceId: string }).instanceId;
  out.length = 0;
  await runCli(["start", id, "--db", db], deps, sinks);
  out.length = 0;
  await runCli(
    ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "implementer", "--payload", '{"ref":"d"}'],
    deps,
    sinks,
  );
  return { id, version: 2 };
}

// ═══════════════════════════════════════════════════════════════════════════
// CW — the composition swaps (source-grain wiring pins)
// ═══════════════════════════════════════════════════════════════════════════

describe("CW — the operator gate-runner swap + the dev-plane slot retention", () => {
  const count = (haystack: string, needle: string): number => haystack.split(needle).length - 1;

  it("CW1: BOTH operator wiring sites construct the REAL ProcessGateRunner; NO operator site keeps the fail-closed slot", () => {
    const src = readFileSync(join(process.cwd(), "src", "cli", "main.ts"), "utf8");
    // RED if ONE operator site is swapped back to the slot (the real count drops
    // to 1 and a fail-closed-slot construction appears) — the J-GATE journey
    // proves the RUNNER-composition site; this pins the two main.ts sites the
    // journey does not exercise (withKernel + verbSubmit).
    expect(count(src, "createProcessGateRunner(")).toBe(2);
    expect(count(src, "createFailClosedProcessGateRunner(")).toBe(0);
  });

  it("CW2: the dev plane KEEPS the fail-closed slot at BOTH its sites (replay must never spawn)", () => {
    const src = readFileSync(join(process.cwd(), "src", "cli", "dev", "main.ts"), "utf8");
    // RED if a dev site is "finished" onto the real runner — replay re-drives
    // committed history and MUST NOT re-execute gate side effects (CW2).
    expect(count(src, "createFailClosedProcessGateRunner(")).toBe(2);
    expect(count(src, "createProcessGateRunner(")).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// RR — runner run: config lanes, run modes, the composition boundary
// ═══════════════════════════════════════════════════════════════════════════

describe("RR — runner run config + run modes", () => {
  it("unknown / missing subverb → usage/2 naming the expected set", async () => {
    const deps = mkDeps();
    for (const sub of [[], ["frobnicate"]]) {
      const r = await runRunner([...sub, "--db", tempDb()], deps);
      expect(r.code).toBe(EXIT.usage);
      expect(errorDoc(r).name).toBe("UnknownRunnerSubverb");
      expect(errorDoc(r).message).toContain("run, respawn");
    }
  });

  it("--actor-cmd shapes → usage/2 (absent / non-JSON / wrong keyset / non-string members)", async () => {
    const db = tempDb();
    const base = ["run", "--db", db, "--templates-dir", TEMPLATES];
    const absent = await runRunner([...base, "--once"], mkDeps());
    expect(absent.code).toBe(EXIT.usage);
    expect(errorDoc(absent).name).toBe("MissingActorCmd");
    for (const bad of ["not json", JSON.stringify({ cmd: "x" }), JSON.stringify({ cmd: 1, args: [] }), JSON.stringify({ cmd: "x", args: [1] })]) {
      const r = await runRunner([...base, "--actor-cmd", bad, "--once"], mkDeps());
      expect(r.code).toBe(EXIT.usage);
      expect(errorDoc(r).name).toBe("InvalidActorCmd");
    }
  });

  it("--env-allow: an unset host var → usage/2; a set-but-EMPTY var is copied verbatim (reaches compose)", async () => {
    const db = tempDb();
    const unset = await runRunner(onceArgs(db, ["--env-allow", "NOPE_UNSET_VAR"]), mkDeps());
    expect(unset.code).toBe(EXIT.usage);
    expect(errorDoc(unset).name).toBe("UnsetEnvAllow");
    // RED if a present-but-empty value were treated as unset: an empty-string
    // host var exists and must be copied — the run composes and exits 0.
    const emptyDeps = mkDeps({ env: { PAIRFLOW_V3_TEMPLATES: TEMPLATES, PATH: process.env.PATH ?? "", EMPTY_VAR: "" } });
    const empty = await runRunner(onceArgs(db, ["--env-allow", "EMPTY_VAR"]), emptyDeps);
    expect(empty.code).toBe(EXIT.ok);
  });

  it("the pairing rule: a lease below the envelope → usage/2 naming both values; the DERIVED default passes", async () => {
    const db = tempDb();
    // A tiny explicit lease below timeout+grace+backstop+poll.
    const bad = await runRunner(onceArgs(db, ["--lease-ms", "1000"]), mkDeps());
    expect(bad.code).toBe(EXIT.usage);
    const doc = errorDoc(bad);
    expect(doc.name).toBe("LeaseBelowEnvelope");
    expect(doc.details).toMatchObject({ leaseMs: 1000 });
    expect(typeof (doc.details as { bound: number }).bound).toBe("number");
    // Flag-free defaults satisfy the rule by the derived arithmetic.
    const ok = await runRunner(onceArgs(db), mkDeps());
    expect(ok.code).toBe(EXIT.ok);

    // The bound is EXACTLY the four-term sum (timeout+grace+backstop+poll). With
    // CUSTOM knobs: a lease AT the bound passes, one BELOW it fails naming the
    // computed bound, and the DERIVED default (no --lease-ms) satisfies it.
    const knobs = [
      "--timeout-ms", "1200000",
      "--grace-ms", "20000",
      "--backstop-margin-ms", "8000",
      "--poll-ms", "2000",
    ];
    const bound = 1_200_000 + 20_000 + 8_000 + 2_000; // 1_230_000
    const atBound = await runRunner(onceArgs(db, [...knobs, "--lease-ms", String(bound)]), mkDeps());
    expect(atBound.code).toBe(EXIT.ok);
    const belowBound = await runRunner(onceArgs(db, [...knobs, "--lease-ms", String(bound - 1)]), mkDeps());
    expect(belowBound.code).toBe(EXIT.usage);
    expect((errorDoc(belowBound).details as { bound: number }).bound).toBe(bound);
    const derived = await runRunner(onceArgs(db, knobs), mkDeps());
    expect(derived.code).toBe(EXIT.ok);
  });

  it("config-time timer validation runs over EVERY timer flag (poll included) BEFORE any store open", async () => {
    const db = tempDb();
    // A ≥2^31 poll → usage at config (the P6i collapse driven out); the errand
    // ledger is NEVER minted (no store open before validation).
    const big = await runRunner(onceArgs(db, ["--poll-ms", "2147483648"]), mkDeps());
    expect(big.code).toBe(EXIT.usage);
    expect(errorDoc(big).name).toBe("InvalidTimerKnob");
    expect(existsSync(deriveErrandDbPath(db))).toBe(false);
    // A below-floor timeout → usage too.
    const low = await runRunner(onceArgs(db, ["--timeout-ms", "10"]), mkDeps());
    expect(low.code).toBe(EXIT.usage);
    expect(errorDoc(low).name).toBe("InvalidTimerKnob");
    // EVERY timer-bearing flag rides the shared validator — grace, backstop, and
    // the (default-derived) lease each below their named floor → usage/2. A
    // below-floor lease must ALSO satisfy the pairing bound; use a large enough
    // envelope so the timer floor (not the pairing rule) is the rejecting lane.
    for (const [flag, value] of [
      ["--grace-ms", "10"],
      ["--backstop-margin-ms", "10"],
    ] as const) {
      const r = await runRunner(onceArgs(db, [flag, value]), mkDeps());
      expect(r.code).toBe(EXIT.usage);
      expect(errorDoc(r).name).toBe("InvalidTimerKnob");
    }
    // A ≥2^31 lease → the shared validator rejects at config (usage/2), NOT the
    // pairing rule (which it satisfies) — the lease flag is timer-validated too.
    const bigLease = await runRunner(onceArgs(db, ["--lease-ms", "2147483648"]), mkDeps());
    expect(bigLease.code).toBe(EXIT.usage);
    expect(errorDoc(bigLease).name).toBe("InvalidTimerKnob");
  });

  it("a numeric flag's lexical violation → the shared usage lane", async () => {
    const db = tempDb();
    const r = await runRunner(onceArgs(db, ["--attempts", "1e3"]), mkDeps());
    expect(r.code).toBe(EXIT.usage);
    expect(errorDoc(r).name).toBe("InvalidFlagValue");
  });

  it("a relative --default-cwd is ABSOLUTIZED at config time (the adapter's construction throw driven unreachable)", async () => {
    const db = tempDb();
    // RED if not absolutized: the adapter throws on a relative defaultCwd → the
    // run would exit internal(1). Absolutized → composes and exits 0.
    const r = await runRunner(onceArgs(db, ["--default-cwd", "relative/subdir"]), mkDeps());
    expect(r.code).toBe(EXIT.ok);
  });

  it("--once emits ONE data doc (the reader-facade errand list), exit 0; a seeded row surfaces", async () => {
    const db = tempDb();
    // Empty ledger → { errands: [] }.
    const empty = await runRunner(onceArgs(db), mkDeps());
    expect(empty.code).toBe(EXIT.ok);
    expect(empty.stdout).toHaveLength(1);
    expect(JSON.parse(empty.stdout[0] ?? "")).toEqual({ errands: [] });
    // A confirmed row (untouched by a poll over an empty kernel) surfaces.
    seedErrand(db, "inst-x", "inst-x@v2", { state: "confirmed" });
    const populated = await runRunner(onceArgs(db), mkDeps());
    expect(populated.code).toBe(EXIT.ok);
    const list = (JSON.parse(populated.stdout[0] ?? "") as { errands: { instanceId: string; state: string }[] }).errands;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ instanceId: "inst-x", state: "confirmed" });
  });

  it("foreground mode emits ZERO stdout docs and runs until the injected wait signals stop", async () => {
    const db = tempDb();
    let waits = 0;
    const seams = fakeSeams({
      wait: () => {
        waits += 1;
        return Promise.reject(new Error("stop"));
      },
    });
    const r = await runRunner(["run", "--db", db, "--templates-dir", TEMPLATES, "--actor-cmd", ACTOR_CMD], mkDeps(), seams);
    expect(r.code).toBe(EXIT.ok);
    expect(r.stdout).toEqual([]); // the quiet-stdout negative
    expect(waits).toBeGreaterThanOrEqual(1); // run() ticked until wait signalled stop
  });

  it("open failures on the WRITE surfaces → internal exit 1 (fail-closed loud)", async () => {
    // A --db under a nonexistent directory: the kernel store open fails closed.
    const bad = join(tempDir(), "no-such-dir", "store.db");
    const r = await runRunner(onceArgs(bad), mkDeps());
    expect(r.code).toBe(EXIT.internal);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AT — attach
// ═══════════════════════════════════════════════════════════════════════════

describe("AT — attach resolution, exec, exit mapping", () => {
  it("the resolution walk → the not-running domain lane (exit 3): no ledger / no errand / no live attempt, each named DISTINCTLY (AT1)", async () => {
    const db = tempDb();
    // (a) no ledger file — the no-mint check; named for the ACTUAL absence.
    const noLedger = await runAttach(["inst-a", "--db", db], mkDeps());
    expect(noLedger.code).toBe(EXIT.notFound);
    expect(errorDoc(noLedger).name).toBe("NoRunnerLedger");
    expect(existsSync(deriveErrandDbPath(db))).toBe(false); // read verb minted nothing
    // (b) ledger exists, no errand for the instance → NoErrand (never conflated
    // with the no-live-attempt name — the build's misnaming, corrected).
    seedErrand(db, "other", "other@v2", { state: "attempting", sessionName: "s-other" });
    openKernel(db).close();
    const noErrand = await runAttach(["inst-a", "--db", db], mkDeps());
    expect(noErrand.code).toBe(EXIT.notFound);
    expect(errorDoc(noErrand).name).toBe("NoErrand");
    // (c) errand exists but no live attempt (unconfirmed → activeAttemptId null).
    seedErrand(db, "inst-a", "inst-a@v2", { state: "unconfirmed" });
    const noLive = await runAttach(["inst-a", "--db", db], mkDeps());
    expect(noLive.code).toBe(EXIT.notFound);
    expect(errorDoc(noLive).name).toBe("NoLiveAttempt");
  });

  it("a live recorded session → the exec seam invoked with `attach-session -r -t <LEDGER name>` VERBATIM (never derived)", async () => {
    const db = tempDb();
    openKernel(db).close();
    // A recorded name that DIFFERS from defaultSessionNamer's output — the
    // ledger-not-derived negative.
    seedErrand(db, "inst-a", "inst-a@v2", { state: "attempting", sessionName: "custom-not-derived-name" });
    const deps = mkDeps();
    const interactions = (deps as unknown as { interactions: { cmd: string; args: string[] }[] }).interactions;
    const r = await runAttach(["inst-a", "--db", db], deps, fakeSeams({ liveness: () => Promise.resolve("alive") }));
    expect(r.code).toBe(EXIT.ok);
    expect(r.stdout).toEqual([]); // interactive: no CLI document
    expect(interactions).toEqual([{ cmd: "tmux", args: ["attach-session", "-r", "-t", "custom-not-derived-name"] }]);
  });

  it("--takeover drops `-r` (observe is the default) — RED if inverted", async () => {
    const db = tempDb();
    openKernel(db).close();
    seedErrand(db, "inst-a", "inst-a@v2", { state: "attempting", sessionName: "sess-1" });
    const deps = mkDeps();
    const interactions = (deps as unknown as { interactions: { cmd: string; args: string[] }[] }).interactions;
    const r = await runAttach(["inst-a", "--db", db, "--takeover"], deps, fakeSeams({ liveness: () => Promise.resolve("alive") }));
    expect(r.code).toBe(EXIT.ok);
    expect(interactions[0]?.args).toEqual(["attach-session", "-t", "sess-1"]);
  });

  it("the exit mapping: clean-dead → 3 with NO exec; a probe ANOMALY → internal 1 (fail-closed, distinct from dead); clean detach → 0; nonzero interactive exit → 1", async () => {
    const db = tempDb();
    openKernel(db).close();
    seedErrand(db, "inst-a", "inst-a@v2", { state: "attempting", sessionName: "sess-1" });

    // CLEAN-DEAD at probe → exit 3 (domain not-running), the exec seam NEVER
    // invoked (probe-classified).
    const deadDeps = mkDeps();
    const deadInteractions = (deadDeps as unknown as { interactions: unknown[] }).interactions;
    const dead = await runAttach(["inst-a", "--db", db], deadDeps, fakeSeams({ liveness: () => Promise.resolve("dead") }));
    expect(dead.code).toBe(EXIT.notFound);
    expect(errorDoc(dead).name).toBe("SessionDead");
    expect(deadInteractions).toEqual([]);

    // a probe ANOMALY (neither alive nor clean-dead — tmux infra/weird exit) →
    // INTERNAL exit 1, fail-closed, NEVER conflated with the clean-dead lane; no
    // exec. RED if a probe anomaly is folded back into the exit-3 dead lane.
    const probeDeps = mkDeps();
    const probe = await runAttach(["inst-a", "--db", db], probeDeps, fakeSeams({ liveness: () => Promise.resolve("probe-failed") }));
    expect(probe.code).toBe(EXIT.internal);
    expect(errorDoc(probe).name).toBe("AttachProbeFailed");
    expect((probeDeps as unknown as { interactions: unknown[] }).interactions).toEqual([]);

    // live + clean detach (rc 0) → 0.
    const ok = await runAttach(["inst-a", "--db", db], mkDeps(), fakeSeams({ liveness: () => Promise.resolve("alive") }));
    expect(ok.code).toBe(EXIT.ok);

    // live + nonzero interactive exit → internal 1.
    const nonzero = await runAttach(["inst-a", "--db", db], mkDeps({ runInteractive: () => Promise.resolve(1) }), fakeSeams({ liveness: () => Promise.resolve("alive") }));
    expect(nonzero.code).toBe(EXIT.internal);
    expect(errorDoc(nonzero).name).toBe("AttachExitNonzero");
  });

  it("no-write pin: a live-attempt attach leaves the ledger row byte-unchanged (CF3 inert on the live row)", async () => {
    const db = tempDb();
    openKernel(db).close();
    seedErrand(db, "inst-a", "inst-a@v2", { state: "attempting", sessionName: "sess-1" });
    const before = readErrand(db, "inst-a", "inst-a@v2");
    await runAttach(["inst-a", "--db", db], mkDeps(), fakeSeams({ liveness: () => Promise.resolve("alive") }));
    const after = readErrand(db, "inst-a", "inst-a@v2");
    expect(after).toEqual(before);
  });
});

function readErrand(db: string, instanceId: string, contextPacketId: string): unknown {
  const handle = openErrandStore(deriveErrandDbPath(db), createControlledClock(9_000));
  try {
    return handle.store.getErrand(instanceId, contextPacketId);
  } finally {
    handle.close();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RS — runner respawn
// ═══════════════════════════════════════════════════════════════════════════

describe("RS — runner respawn precondition + exit asymmetry", () => {
  it("the forbidden-flag partition: --poll-ms/--attempts/--lease-ms/--once → usage/2 naming the flag", async () => {
    const db = tempDb();
    for (const [flag, value] of [["poll-ms", "1000"], ["attempts", "3"], ["lease-ms", "999999"], ["once", undefined]] as const) {
      const extra = value === undefined ? [`--${flag}`] : [`--${flag}`, value];
      const r = await runRunner(["respawn", "inst-a", "--db", db, "--templates-dir", TEMPLATES, "--actor-cmd", ACTOR_CMD, ...extra], mkDeps());
      expect(r.code).toBe(EXIT.usage);
      expect(errorDoc(r).name).toBe("ForbiddenRespawnFlag");
      expect(errorDoc(r).message).toContain(flag);
    }
  });

  it("the precondition walk → exit 3 (no errand / non-unconfirmed naming the found state); duplicate unconfirmed → exit 1", async () => {
    const respawnArgs = (db: string, id: string): string[] => ["respawn", id, "--db", db, "--templates-dir", TEMPLATES, "--actor-cmd", ACTOR_CMD];

    // no errand LEDGER at all: respawn is a WRITE surface (RR2 create-or-opens),
    // so no-mint does not apply — the freshly-opened empty ledger yields the
    // same NoErrand lane (exit 3), never a mint-then-crash.
    const dbFresh = tempDb();
    openKernel(dbFresh).close();
    expect(existsSync(deriveErrandDbPath(dbFresh))).toBe(false);
    const noLedger = await runRunner(respawnArgs(dbFresh, "inst-z"), mkDeps());
    expect(noLedger.code).toBe(EXIT.notFound);
    expect(errorDoc(noLedger).name).toBe("NoErrand");

    // no errand for the instance (ledger exists, holds another instance).
    const dbA = tempDb();
    openKernel(dbA).close();
    seedErrand(dbA, "other", "other@v2", { state: "unconfirmed" });
    const noErrand = await runRunner(respawnArgs(dbA, "inst-a"), mkDeps());
    expect(noErrand.code).toBe(EXIT.notFound);
    expect(errorDoc(noErrand).name).toBe("NoErrand");

    // a non-unconfirmed state → exit 3 naming the state (confirmed).
    const dbB = tempDb();
    openKernel(dbB).close();
    seedErrand(dbB, "inst-b", "inst-b@v2", { state: "confirmed" });
    const notUnc = await runRunner(respawnArgs(dbB, "inst-b"), mkDeps());
    expect(notUnc.code).toBe(EXIT.notFound);
    expect(errorDoc(notUnc).name).toBe("NotUnconfirmed");
    expect(errorDoc(notUnc).message).toContain("confirmed");

    // a SECOND non-unconfirmed state → exit 3 naming THAT state (attempting —
    // a live attempt is not a respawn precondition).
    const dbAtt = tempDb();
    openKernel(dbAtt).close();
    seedErrand(dbAtt, "inst-att", "inst-att@v2", { state: "attempting", sessionName: "s-att" });
    const attempting = await runRunner(respawnArgs(dbAtt, "inst-att"), mkDeps());
    expect(attempting.code).toBe(EXIT.notFound);
    expect(errorDoc(attempting).name).toBe("NotUnconfirmed");
    expect(errorDoc(attempting).message).toContain("attempting");

    // two unconfirmed errands for one instance → internal exit 1.
    const dbC = tempDb();
    openKernel(dbC).close();
    seedErrand(dbC, "inst-c", "inst-c@v2", { state: "unconfirmed" });
    seedErrand(dbC, "inst-c", "inst-c@v3", { state: "unconfirmed", expectedVersion: 3 });
    const dup = await runRunner(respawnArgs(dbC, "inst-c"), mkDeps());
    expect(dup.code).toBe(EXIT.internal);
    expect(errorDoc(dup).name).toBe("DuplicateUnconfirmed");
  });

  it("exit-0 reports the POST-CALL state as data — the silent-no-op / racing-resolution lane", async () => {
    // A real TERMINAL (cancelled) kernel run: loop.respawn moots the unconfirmed
    // errand (no evidence) → the post-call read reports 'mooted' as exit-0 DATA.
    const db = tempDb();
    const deps = mkDeps();
    const out: string[] = [];
    const sinks = { out: (l: string) => out.push(l), err: () => {} };
    await runCli(["create", "--db", db, "--task", "t"], deps, sinks);
    const id = (JSON.parse(out[0] ?? "") as { instanceId: string }).instanceId;
    out.length = 0;
    await runCli(["start", id, "--db", db], deps, sinks);
    await runCli(["cancel", id, "--db", db], deps, sinks); // → TERMINAL(cancelled)
    seedErrand(db, id, `${id}@v2`, { state: "unconfirmed" });

    const r = await runRunner(["respawn", id, "--db", db, "--templates-dir", TEMPLATES, "--actor-cmd", ACTOR_CMD], mkDeps());
    expect(r.code).toBe(EXIT.ok);
    const doc = JSON.parse(r.stdout[0] ?? "") as { instanceId: string; state: string };
    // The edge RAN (exit 0); the doc's state carries the resolved truth. RED if
    // the verb fabricated an outcome or reported the pre-call state as 3.
    expect(doc.instanceId).toBe(id);
    expect(doc.state).toBe("mooted");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// DT — the detail runner section
// ═══════════════════════════════════════════════════════════════════════════

/** Build a VerbContext for a direct enrichment call. */
function detailCtx(db: string, deps: CliDeps = mkDeps()): VerbContext {
  return { positionals: [], values: { db }, deps, sinks: { out: () => {}, err: () => {} } };
}
type ReadyInstance = Parameters<typeof enrichDetailRunner>[2];
function noneInstance(instanceId: string): ReadyInstance {
  return {
    instanceId,
    templateRef: { id: "local-pair-v0", version: 1 },
    task: "t",
    binding: {},
    currentStep: "implement",
    round: 1,
    kernelStatus: "ACTIVE",
    terminalDisposition: null,
    activationMode: "immediate",
    wait: null,
    runtimeContext: { state: "none" },
    failureReason: null,
    runOverrides: {},
    version: 2,
  };
}
function readyInstance(instanceId: string, ref: unknown, templateRef = { id: "local-pair-v0", version: 1 }): ReadyInstance {
  return { ...noneInstance(instanceId), templateRef, runtimeContext: { state: "ready", ref } } as ReadyInstance;
}

const WORKTREE_REF = { kind: "worktree", locator: { path: "/wt/path", branch: "feat", repo: "/repo", base_commit: "abc" } };

function writeWorktreeTemplate(dir: string, provider = "pairflow.worktree"): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "local-pair-v0@1.yaml"),
    [
      "ref:",
      "  id: local-pair-v0",
      "  version: 1",
      "start: implement",
      "steps:",
      "  implement:",
      "    role: implementer",
      "    instruction: build it",
      "    transitions:",
      "      CONVERGED: done",
      "terminal:",
      "  - done",
      "roles:",
      "  implementer:",
      "    defaultActor: codex",
      "runtimeContext:",
      "  kind: worktree",
      `  provider: ${provider}`,
      "  config:",
      "    repo: /repo",
      "",
    ].join("\n"),
  );
}

describe("DT — detail runner section", () => {
  it("the closed keyset + the no-mint negative + no-runner-ledger discriminants", async () => {
    const db = tempDb();
    openKernel(db).close();
    const kernel = openKernel(db);
    try {
      const section = await enrichDetailRunner(detailCtx(db), kernel.store, noneInstance("inst-x"));
      expect(Object.keys(section).sort()).toEqual(["attach", "errand", "runtimeContextSummary"]);
      expect(section.errand).toEqual({ unavailable: "no-runner-ledger" });
      expect(section.attach).toEqual({ available: false, reason: "no-live-attempt" });
      expect(section.runtimeContextSummary).toEqual({ unavailable: "no-runtime-context" });
    } finally {
      kernel.close();
    }
    // No-mint: the read created NO errand ledger file.
    expect(existsSync(deriveErrandDbPath(db))).toBe(false);
  });

  it("the detail verb via runCli: the `runner` sibling key sits beside byte-preserved kernel-detail keys", async () => {
    const db = tempDb();
    const { id } = await seedKernelWithEvidence(db);
    const out: string[] = [];
    await runCli(["detail", id, "--db", db], mkDeps(), { out: (l) => out.push(l), err: () => {} });
    const doc = JSON.parse(out[0] ?? "") as { instance: unknown; transcript: unknown; runner: unknown };
    expect(doc.instance).toBeDefined();
    expect(doc.transcript).toBeDefined();
    expect(doc.runner).toBeDefined();
  });

  it("the errand member: present → projected keyset; multi-errand → the MOST RECENT (createdAt, contextPacketId tiebreak)", async () => {
    const db = tempDb();
    openKernel(db).close();
    // Two rows: an OLDER one and a NEWER one (later createdAt).
    seedErrand(db, "inst-x", "inst-x@v2", { state: "unconfirmed", createdClock: 1_000 });
    seedErrand(db, "inst-x", "inst-x@v3", { state: "confirmed", expectedVersion: 3, createdClock: 5_000 });
    const kernel = openKernel(db);
    try {
      const section = await enrichDetailRunner(detailCtx(db), kernel.store, noneInstance("inst-x"));
      expect("state" in section.errand ? section.errand : {}).toMatchObject({ state: "confirmed", contextPacketId: "inst-x@v3" });
      expect(Object.keys(section.errand).sort()).toEqual(
        ["activeAttemptId", "contextPacketId", "liveSessionName", "recordedAdmitOutcome", "remainingBudget", "state"],
      );
    } finally {
      kernel.close();
    }
  });

  it("the errand member: equal createdAt → the contextPacketId TIEBREAK decides (RED under a wrong-order pick)", async () => {
    const db = tempDb();
    openKernel(db).close();
    // Two rows with EQUAL createdAt — the selection rule's tiebreak is the ONLY
    // discriminator: the LARGER contextPacketId (`inst-x@v3` > `inst-x@v2`) wins.
    seedErrand(db, "inst-x", "inst-x@v2", { state: "unconfirmed", createdClock: 3_000 });
    seedErrand(db, "inst-x", "inst-x@v3", { state: "confirmed", expectedVersion: 3, createdClock: 3_000 });
    const kernel = openKernel(db);
    try {
      const section = await enrichDetailRunner(detailCtx(db), kernel.store, noneInstance("inst-x"), fakeSeams());
      // RED if the tiebreak were reversed/absent (it would surface `inst-x@v2`).
      expect("state" in section.errand ? section.errand : {}).toMatchObject({
        state: "confirmed",
        contextPacketId: "inst-x@v3",
      });
    } finally {
      kernel.close();
    }
  });

  it("the errand member: all SIX projected fields carry the row's VALUES exactly", async () => {
    const db = tempDb();
    openKernel(db).close();
    // An `attempting` errand: budget decremented once (3 → 2), a live attempt id
    // + recorded session, no admit outcome yet.
    seedErrand(db, "inst-x", "inst-x@v2", { state: "attempting", sessionName: "sess-six" });
    const kernel = openKernel(db);
    try {
      const section = await enrichDetailRunner(detailCtx(db), kernel.store, noneInstance("inst-x"), fakeSeams());
      expect(section.errand).toEqual({
        state: "attempting",
        remainingBudget: 2,
        contextPacketId: "inst-x@v2",
        activeAttemptId: "seed-attempt-inst-x@v2",
        liveSessionName: "sess-six",
        recordedAdmitOutcome: null,
      });
    } finally {
      kernel.close();
    }
  });

  it("the attach member: a ledgered errand with NO live attempt → { available: false, reason: 'no-live-attempt' }", async () => {
    const db = tempDb();
    openKernel(db).close();
    // A confirmed errand: present in the ledger, but activeAttemptId is null.
    seedErrand(db, "inst-x", "inst-x@v2", { state: "confirmed" });
    const kernel = openKernel(db);
    try {
      const section = await enrichDetailRunner(detailCtx(db), kernel.store, noneInstance("inst-x"), fakeSeams());
      expect("state" in section.errand ? section.errand.state : "").toBe("confirmed");
      expect(section.attach).toEqual({ available: false, reason: "no-live-attempt" });
    } finally {
      kernel.close();
    }
  });

  it("ledger exists but no row for the instance → { unavailable: 'no-errand' }", async () => {
    const db = tempDb();
    openKernel(db).close();
    seedErrand(db, "other", "other@v2", { state: "confirmed" });
    const kernel = openKernel(db);
    try {
      const section = await enrichDetailRunner(detailCtx(db), kernel.store, noneInstance("inst-x"));
      expect(section.errand).toEqual({ unavailable: "no-errand" });
    } finally {
      kernel.close();
    }
  });

  it("the attach availability walk: live / recorded-but-dead / no-live-attempt / probe-failed (dead ≠ probe-failed)", async () => {
    const db = tempDb();
    openKernel(db).close();
    seedErrand(db, "inst-x", "inst-x@v2", { state: "attempting", sessionName: "sess-1" });
    const kernel = openKernel(db);
    try {
      const live = await enrichDetailRunner(detailCtx(db), kernel.store, noneInstance("inst-x"), fakeSeams({ liveness: () => Promise.resolve("alive") }));
      expect(live.attach).toEqual({ available: true, sessionName: "sess-1" });
      const deadS = await enrichDetailRunner(detailCtx(db), kernel.store, noneInstance("inst-x"), fakeSeams({ liveness: () => Promise.resolve("dead") }));
      expect(deadS.attach).toEqual({ available: false, reason: "session-dead" });
      const probe = await enrichDetailRunner(detailCtx(db), kernel.store, noneInstance("inst-x"), fakeSeams({ liveness: () => Promise.resolve("probe-failed") }));
      expect(probe.attach).toEqual({ available: false, reason: "probe-failed" });
    } finally {
      kernel.close();
    }
  });

  it("the projection walk: ready + template → C10's projection VERBATIM; the four degrade discriminants", async () => {
    const db = tempDb();
    openKernel(db).close();
    const kernel = openKernel(db);
    try {
      // ready + templates dir + worktree provider → the projection verbatim.
      const tdir = join(tempDir(), "tmpl-ok");
      writeWorktreeTemplate(tdir);
      const ctxOk = detailCtx(db, mkDeps({ env: { PATH: process.env.PATH ?? "" } }));
      const okSection = await enrichDetailRunner(
        { ...ctxOk, values: { db, "templates-dir": tdir } },
        kernel.store,
        readyInstance("inst-x", WORKTREE_REF),
      );
      expect(okSection.runtimeContextSummary).toEqual({ kind: "worktree", path: "/wt/path", branch: "feat" });

      // no-runtime-context: a `none` runtime context.
      const noneSection = await enrichDetailRunner({ ...ctxOk, values: { db, "templates-dir": tdir } }, kernel.store, noneInstance("inst-x"));
      expect(noneSection.runtimeContextSummary).toEqual({ unavailable: "no-runtime-context" });

      // templates-unavailable: ready ref but NO templates dir configured.
      const noTmplCtx = detailCtx(db, mkDeps({ env: { PATH: process.env.PATH ?? "" } }));
      const noTmpl = await enrichDetailRunner({ ...noTmplCtx, values: { db } }, kernel.store, readyInstance("inst-x", WORKTREE_REF));
      expect(noTmpl.runtimeContextSummary).toEqual({ unavailable: "templates-unavailable" });

      // template-unavailable: dir configured but the pinned template absent.
      const emptyDir = join(tempDir(), "tmpl-empty");
      mkdirSync(emptyDir, { recursive: true });
      const absent = await enrichDetailRunner({ ...ctxOk, values: { db, "templates-dir": emptyDir } }, kernel.store, readyInstance("inst-x", WORKTREE_REF));
      expect(absent.runtimeContextSummary).toEqual({ unavailable: "template-unavailable" });

      // template-unavailable (MALFORMED): the pinned file EXISTS but is not
      // loadable YAML — absent and malformed alike land on template-unavailable
      // (DT2's letter), distinct from the provider-unresolvable member below.
      const malformedDir = join(tempDir(), "tmpl-malformed");
      mkdirSync(malformedDir, { recursive: true });
      writeFileSync(join(malformedDir, "local-pair-v0@1.yaml"), "ref: {{{ this is: not valid yaml\n  steps broken");
      const malformed = await enrichDetailRunner(
        { ...ctxOk, values: { db, "templates-dir": malformedDir } },
        kernel.store,
        readyInstance("inst-x", WORKTREE_REF),
      );
      expect(malformed.runtimeContextSummary).toEqual({ unavailable: "template-unavailable" });

      // provider-unresolvable (REGISTRY MISS): the template names a provider the
      // registry lacks → registry.resolve returns null.
      const ghostDir = join(tempDir(), "tmpl-ghost");
      writeWorktreeTemplate(ghostDir, "ghost.provider");
      const ghost = await enrichDetailRunner({ ...ctxOk, values: { db, "templates-dir": ghostDir } }, kernel.store, readyInstance("inst-x", WORKTREE_REF));
      expect(ghost.runtimeContextSummary).toEqual({ unavailable: "provider-unresolvable" });

      // provider-unresolvable (THROWING PROJECTION): the provider RESOLVES but
      // projectForActor THROWS on a malformed ref — the throw is caught into the
      // same discriminant, never propagated (a read verb degrades in-doc).
      const throwing = await enrichDetailRunner(
        { ...ctxOk, values: { db, "templates-dir": tdir } },
        kernel.store,
        readyInstance("inst-x", { kind: "worktree", locator: "not-an-object" }),
      );
      expect(throwing.runtimeContextSummary).toEqual({ unavailable: "provider-unresolvable" });
    } finally {
      kernel.close();
    }
  });

  it("the substrate-loud member: a corrupt EXISTING ledger on a read verb → internal exit 1 (never a discriminant)", async () => {
    const db = tempDb();
    const { id } = await seedKernelWithEvidence(db);
    // Poison the errand ledger: tables but no prototype/schema marker → ES5
    // fail-loud on open.
    const raw = new DatabaseSync(deriveErrandDbPath(db));
    raw.exec("CREATE TABLE errands (x INTEGER)");
    raw.close();
    const out: string[] = [];
    const err: string[] = [];
    const code = await runCli(["detail", id, "--db", db], mkDeps(), { out: (l) => out.push(l), err: (l) => err.push(l) });
    expect(code).toBe(EXIT.internal);
  });

  it("the CF3 pin: a resting unconfirmed errand with late evidence flips confirmed through the facade on a detail read", async () => {
    const db = tempDb();
    const { id } = await seedKernelWithEvidence(db); // a committed transition at v2, actor 'operator'
    // A resting unconfirmed errand whose (expectedVersion, actorId) MATCH the
    // committed evidence.
    seedErrand(db, id, `${id}@v2`, { state: "unconfirmed", expectedVersion: 2, actorId: "operator" });
    const kernel = openKernel(db);
    try {
      const section = await enrichDetailRunner(detailCtx(db), kernel.store, noneInstance(id));
      // The facade re-check flipped it — RED if the resting row surfaced unconfirmed.
      expect("state" in section.errand ? section.errand.state : "").toBe("confirmed");
    } finally {
      kernel.close();
    }
  });
});

// A trivial guard the production seam bundle is well-formed (no accidental
// undefined seam) — the shipped default surface exists.
describe("productionRunnerSeams", () => {
  it("exposes the three composition seams", () => {
    const seams = productionRunnerSeams();
    expect(typeof seams.wait).toBe("function");
    expect(typeof seams.makeChannel).toBe("function");
    expect(typeof seams.liveness).toBe("function");
  });
});
