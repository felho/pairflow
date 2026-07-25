import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { createFileDefinitionStore } from "../definition/index.js";
import type { RuntimeContextProjection, WorkflowInstance } from "../domain/index.js";
import { resolveRuntimeContextRequirement } from "../domain/index.js";
import { deriveEmitDigest } from "../emit/index.js";
import { noopDiagnosticsSink } from "../diag/index.js";
import { createGateRegistry } from "../gates/index.js";
import { createIngress } from "../ingress/index.js";
import { createKernel } from "../kernel/index.js";
import type { Kernel } from "../kernel/index.js";
import type { DiagStoreHandle } from "../diag/index.js";
import type { DeliveryReadSeam } from "../runner/deliveryLoop.js";
import type { ErrandState } from "../ports/diagnostics.js";
import type { TimeSource } from "../ports/time.js";
import {
  createActorAdapter,
  createDeliveryLoop,
  createErrandReader,
  createProcessGateRunner,
  createTmuxSpawnChannel,
  defaultSessionNamer,
  disciplinedSpawn,
  openErrandStore,
  TimerKnobError,
  validateTimerKnobs,
} from "../runner/index.js";
import type {
  ArgvMapper,
  DeliveryLoop,
  DeliveryWait,
  ErrandReader,
  ErrandRow,
  ErrandStoreHandle,
  ProcessGateRunnerHandle,
  SpawnChannel,
} from "../runner/index.js";
import type { VerbContext, VerbOptions } from "./common.js";
import {
  deriveDiagDbPath,
  flagString,
  notFound,
  openStoreOrInternal,
  parseNonNegativeSafeInt,
  resolveDbPath,
  resolveTemplatesDir,
  usage,
} from "./common.js";
import { CliError, EXIT } from "./contract.js";
import { deriveProcessEvidenceDbPath } from "./failClosedProcessGateRunner.js";
import { bindProductionCompletionSink, createProductionProviderRegistry } from "./main.js";

/**
 * The operator runner plane (packet ch9-p4b, T1). Homes `runner run` /
 * `runner respawn` (subverb dispatch), the top-level `attach` verb, the
 * `detail` runner-section enrichment, and the third textual-derivation sibling
 * `deriveErrandDbPath`. The kernel/store/loop/adapter/channel modules are
 * consumed BYTE-UNTOUCHED; this file is the composition + presentation seam.
 *
 * Every fallible read degrades CLASSIFIED (member discriminants) on ABSENCE
 * and crashes LOUD (the internal lane) on SUBSTRATE corruption — DT2's
 * member-vs-substrate line. The write/composition surfaces keep the usage /
 * internal lanes.
 */

/** RR2 (flag F2): the errand ledger path — the third textual-derivation
 * sibling beside `.diag.sqlite` and `.process-evidence.sqlite`. No new flag,
 * no new env var; one runner plane per kernel DB path by construction. */
export function deriveErrandDbPath(dbPath: string): string {
  return `${dbPath}.errands.sqlite`;
}

// ── Injectable seams (production defaults; the unit suite scripts them) ──────

/** The runner-plane composition seams. Production binds real timers, the tmux
 * channel, and the `has-session` probe through the C19 seam; the unit suite
 * scripts them so foreground pacing, channel conclusions, and probe faults are
 * driven deterministically without a real tmux server. `CliDeps` stays at its
 * three declared ch9-p4b additions (T1); these seams are the composition face
 * the CLI's own suites drive, never a `CliDeps` growth. */
export interface RunnerSeams {
  /** The `loop.run()` cadence pacing (DeliveryWait) — a real timer in
   * production, a scripted-exhaustion wait in tests. */
  readonly wait: DeliveryWait;
  /** The delivery channel factory — the tmux channel over the injected clock
   * in production (CW3), a fake channel in tests. */
  readonly makeChannel: (time: TimeSource) => SpawnChannel;
  /** The liveness probe (AT1/DT2): ONE `tmux has-session` client invocation
   * through the C19 seam. `probe-failed` covers infra + anomalous exits,
   * EXPLICIT (never silently mapped to `dead`). */
  readonly liveness: (sessionName: string) => Promise<Liveness>;
}

export type Liveness = "alive" | "dead" | "probe-failed";

function realWait(ms: number): Promise<void> {
  return new Promise((r) => {
    setTimeout(r, ms);
  });
}

/** The production liveness probe: ONE has-session client invocation through
 * disciplinedSpawn (the C19 seam), allowlist `{ PATH }`, the channel's client
 * timeout discipline — exit 0 alive, exit 1 dead, anything else probe-failed. */
async function realLiveness(sessionName: string): Promise<Liveness> {
  const c = await disciplinedSpawn({
    cmd: "tmux",
    args: ["has-session", "-t", sessionName],
    cwd: process.cwd(),
    env: { PATH: process.env.PATH ?? "" },
    timeoutMs: 10_000,
    graceMs: 1_000,
  });
  if (c.kind === "infra") {
    return "probe-failed";
  }
  if (!c.timedOut && c.code === 0) {
    return "alive";
  }
  if (!c.timedOut && c.code === 1) {
    return "dead";
  }
  return "probe-failed";
}

export function productionRunnerSeams(): RunnerSeams {
  return {
    wait: realWait,
    makeChannel: (time) => createTmuxSpawnChannel({ time }),
    liveness: realLiveness,
  };
}

// ── Verb option tables (RR1's union-options rule) ────────────────────────────

/** RR1: `VERB_OPTIONS["runner"]` is the UNION of `run` + `respawn` flag sets
 * (`run`'s is the superset). The shared dispatch shell strict-parses ONCE per
 * top-level verb; each subverb handler enforces its own partition. */
export const RUNNER_VERB_OPTIONS: VerbOptions = {
  db: { type: "string" },
  "templates-dir": { type: "string" },
  "actor-cmd": { type: "string" },
  "default-cwd": { type: "string" },
  "env-allow": { type: "string", multiple: true },
  "poll-ms": { type: "string" },
  attempts: { type: "string" },
  "timeout-ms": { type: "string" },
  "grace-ms": { type: "string" },
  "backstop-margin-ms": { type: "string" },
  "lease-ms": { type: "string" },
  "worker-id": { type: "string" },
  once: { type: "boolean" },
};

/** AT1: `attach <instance> [--takeover] [--db]`. */
export const ATTACH_VERB_OPTIONS: VerbOptions = {
  db: { type: "string" },
  takeover: { type: "boolean" },
};

// ── Config parsing (all fail-closed at the config boundary, BEFORE any open) ──

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** RR1 (flag F4): `--actor-cmd <json>` — a JSON `{ cmd: string, args: string[] }`
 * command template, strictly validated. The DEGENERATE (config-independent)
 * form of C18's config → argv mapping: every invocation maps to the SAME argv;
 * per-config adaptation lives actor-side at MVP. */
function parseActorCmd(raw: string | undefined): ArgvMapper {
  if (raw === undefined) {
    throw usage(
      "MissingActorCmd",
      '--actor-cmd <json> is required (a JSON object { "cmd": string, "args": string[] })',
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw usage("InvalidActorCmd", `--actor-cmd is not valid JSON: '${raw}'`);
  }
  if (!isPlainRecord(parsed)) {
    throw usage("InvalidActorCmd", "--actor-cmd must be a JSON object { cmd, args }");
  }
  const keys = Object.keys(parsed).sort();
  if (keys.length !== 2 || keys[0] !== "args" || keys[1] !== "cmd") {
    throw usage("InvalidActorCmd", "--actor-cmd must have exactly the keys { cmd, args }");
  }
  const { cmd, args } = parsed;
  if (typeof cmd !== "string") {
    throw usage("InvalidActorCmd", "--actor-cmd 'cmd' must be a string");
  }
  if (!Array.isArray(args) || !args.every((a): a is string => typeof a === "string")) {
    throw usage("InvalidActorCmd", "--actor-cmd 'args' must be an array of strings");
  }
  const mapping = { cmd, args };
  return () => mapping;
}

/** RR1: `--env-allow <NAME>` (repeatable) — each named HOST env var copied into
 * the ACTOR allowlist ON TOP of `{ PATH }`. A named-but-UNSET host var is
 * usage/2 (fail-closed, never a silent empty entry); a set-but-empty-string
 * value is copied verbatim (it exists). The GATE lane stays `{ PATH }` (CW1). */
function resolveActorEnvAllowlist(ctx: VerbContext): Record<string, string> {
  const allow: Record<string, string> = { PATH: ctx.deps.env["PATH"] ?? "" };
  const raw = ctx.values["env-allow"];
  const names = Array.isArray(raw) ? raw.filter((v): v is string => typeof v === "string") : [];
  for (const name of names) {
    const value = ctx.deps.env[name];
    if (value === undefined) {
      throw usage(
        "UnsetEnvAllow",
        `--env-allow '${name}' names a host environment variable that is not set`,
      );
    }
    allow[name] = value;
  }
  return allow;
}

/** RR1: the shared timer-flag validation via the seam's `validateTimerKnobs`
 * (P3b T2's shared validator) — a `TimerKnobError` becomes a usage/2 lane, so
 * the factories' own construction throws are UNREACHABLE from this surface. */
function validateTimers(knobs: readonly { readonly label: string; readonly value: number }[]): void {
  try {
    validateTimerKnobs(knobs.map((k) => ({ label: k.label, value: k.value })));
  } catch (error) {
    if (error instanceof TimerKnobError) {
      throw usage("InvalidTimerKnob", error.message);
    }
    throw error;
  }
}

interface CompositionKnobs {
  readonly db: string;
  readonly dir: string;
  readonly argvMapper: ArgvMapper;
  readonly actorEnvAllowlist: Record<string, string>;
  readonly defaultCwd: string;
  readonly timeoutMs: number;
  readonly graceMs: number;
  readonly backstopMarginMs: number;
  readonly workerId: string;
}

/** The shared composition knobs of `runner run` and `runner respawn` (RR1). */
function parseCompositionKnobs(ctx: VerbContext): CompositionKnobs {
  const db = resolveDbPath(flagString(ctx, "db"), ctx.deps);
  const dir = resolveTemplatesDir(flagString(ctx, "templates-dir"), ctx.deps);
  const argvMapper = parseActorCmd(flagString(ctx, "actor-cmd"));
  const actorEnvAllowlist = resolveActorEnvAllowlist(ctx);
  const timeoutMs = parseNonNegativeSafeInt(flagString(ctx, "timeout-ms") ?? "1800000", "--timeout-ms");
  const graceMs = parseNonNegativeSafeInt(flagString(ctx, "grace-ms") ?? "10000", "--grace-ms");
  const backstopMarginMs = parseNonNegativeSafeInt(
    flagString(ctx, "backstop-margin-ms") ?? "5000",
    "--backstop-margin-ms",
  );
  // RR1: the adapter REQUIRES an absolute defaultCwd — resolve it at config
  // time (against the process cwd) so the adapter's construction throw stays
  // UNREACHABLE from this surface. Default: the `<db>.runs` sibling.
  const defaultCwd = resolve(flagString(ctx, "default-cwd") ?? `${db}.runs`);
  const workerId = flagString(ctx, "worker-id") ?? ctx.deps.workerIdSource();
  return { db, dir, argvMapper, actorEnvAllowlist, defaultCwd, timeoutMs, graceMs, backstopMarginMs, workerId };
}

interface RunConfig extends CompositionKnobs {
  readonly pollMs: number;
  readonly attempts: number;
  readonly leaseMs: number;
  readonly once: boolean;
}

function parseRunConfig(ctx: VerbContext): RunConfig {
  const base = parseCompositionKnobs(ctx);
  const pollMs = parseNonNegativeSafeInt(flagString(ctx, "poll-ms") ?? "1000", "--poll-ms");
  const attempts = parseNonNegativeSafeInt(flagString(ctx, "attempts") ?? "3", "--attempts");
  const leaseFlag = flagString(ctx, "lease-ms");
  // RR3: the envelope-complete DERIVED default — the bound's own terms plus
  // C14's 15-minute margin. A formula carrying every term the bound carries
  // can never violate the pairing rule, whatever the flags set.
  const leaseMs =
    leaseFlag !== undefined
      ? parseNonNegativeSafeInt(leaseFlag, "--lease-ms")
      : base.timeoutMs + base.graceMs + base.backstopMarginMs + pollMs + 900_000;
  const once = ctx.values["once"] === true;
  // RR1: config-time timer validation over EVERY timer-bearing flag (poll
  // included — the loop factory never validates its own pollMs), BEFORE any
  // factory or store open.
  validateTimers([
    { label: "timeoutMs", value: base.timeoutMs },
    { label: "graceMs", value: base.graceMs },
    { label: "backstopMarginMs", value: base.backstopMarginMs },
    { label: "leaseMs", value: leaseMs },
    { label: "pollMs", value: pollMs },
  ]);
  // RR3: the pairing rule (the P3b F8 obligation) — the lease must outlive one
  // full attempt's escalation envelope plus a poll, else a sibling worker
  // routinely reclaims a still-live attempt.
  const bound = base.timeoutMs + base.graceMs + base.backstopMarginMs + pollMs;
  if (leaseMs < bound) {
    throw usage(
      "LeaseBelowEnvelope",
      `--lease-ms (${String(leaseMs)}) must be >= timeoutMs + graceMs + backstopMarginMs + pollMs (${String(
        bound,
      )}) — else a sibling worker reclaims a still-live attempt`,
      { leaseMs, bound },
    );
  }
  return { ...base, pollMs, attempts, leaseMs, once };
}

function parseRespawnConfig(ctx: VerbContext): CompositionKnobs {
  const base = parseCompositionKnobs(ctx);
  // RS1: a respawn runs ONE unbudgeted edge, not a cadence — only the
  // escalation timers are live (no poll/lease). Validate them at config time.
  validateTimers([
    { label: "timeoutMs", value: base.timeoutMs },
    { label: "graceMs", value: base.graceMs },
    { label: "backstopMarginMs", value: base.backstopMarginMs },
  ]);
  return base;
}

// ── The RR4 composition ──────────────────────────────────────────────────────

interface Composition {
  readonly loop: DeliveryLoop;
  readonly reader: ErrandReader;
  readonly kernel: Kernel;
  close(): void;
}

interface CompositionInput extends CompositionKnobs {
  readonly loopOptions?: {
    readonly pollMs: number;
    readonly leaseMs: number;
    readonly attemptsPerErrand: number;
  };
}

/**
 * RR4: the production kernel exactly as the lifecycle verbs build it (real gate
 * runner per CW1, production provider registry + DG4-wrapped completion sink,
 * the same gate catalog) → ingress → the real adapter over the tmux channel
 * (CW3) → the delivery loop. Teardown closes errand store, gate runner, diag,
 * and store in `finally` (partial-open failures close what opened).
 */
function buildComposition(ctx: VerbContext, input: CompositionInput, seams: RunnerSeams): Composition {
  const handle = openStoreOrInternal(input.db, ctx.deps);
  let diag: DiagStoreHandle | undefined;
  let processRunner: ProcessGateRunnerHandle | undefined;
  let errandHandle: ErrandStoreHandle | undefined;
  try {
    diag = ctx.deps.openDiagStore(deriveDiagDbPath(input.db), ctx.deps.time);
    // CW1: the REAL process-gate runner on the derived evidence sibling.
    processRunner = createProcessGateRunner(
      deriveProcessEvidenceDbPath(input.db),
      { time: ctx.deps.time },
      {},
    );
    // RR2: create-or-open the errand ledger (the WRITE surface).
    errandHandle = openErrandStore(deriveErrandDbPath(input.db), ctx.deps.time);
    const gates = createGateRegistry();
    const definitions = createFileDefinitionStore(input.dir, gates);
    const { registry, provider } = createProductionProviderRegistry();
    const kernel = createKernel({
      store: handle.store,
      definitions,
      time: ctx.deps.time,
      digest: deriveEmitDigest,
      diag: diag.sink,
      gates,
      processRunner,
      providerRegistry: registry,
    });
    bindProductionCompletionSink(provider, kernel, diag.sink);
    const ingress = createIngress({ kernel, diag: diag.sink });
    const adapter = createActorAdapter(
      { ingress, argvMapper: input.argvMapper, diag: diag.sink, channel: seams.makeChannel(ctx.deps.time) },
      {
        defaultCwd: input.defaultCwd,
        envAllowlist: input.actorEnvAllowlist,
        timeoutMs: input.timeoutMs,
        graceMs: input.graceMs,
        backstopMarginMs: input.backstopMarginMs,
      },
    );
    const reader = createErrandReader(errandHandle.store, handle.store, diag.sink);
    const loop = createDeliveryLoop(
      {
        errandStore: errandHandle.store,
        readSeam: handle.store,
        definitions,
        providerRegistry: registry,
        executor: adapter,
        time: ctx.deps.time,
        wait: seams.wait,
        attemptIdSource: ctx.deps.attemptIdSource,
        sessionNamer: defaultSessionNamer,
        diag: diag.sink,
        workerId: input.workerId,
      },
      input.loopOptions,
    );
    const boundDiag = diag;
    const boundRunner = processRunner;
    const boundErrand = errandHandle;
    return {
      loop,
      reader,
      kernel,
      close(): void {
        // RR4 teardown order: errand store, gate runner, diag, store.
        boundErrand.close();
        boundRunner.close();
        boundDiag.close();
        handle.close();
      },
    };
  } catch (error) {
    errandHandle?.close();
    processRunner?.close();
    diag?.close();
    handle.close();
    throw error;
  }
}

// ── runner run (RR5) ─────────────────────────────────────────────────────────

async function runnerRun(ctx: VerbContext, seams: RunnerSeams): Promise<number> {
  const cfg = parseRunConfig(ctx);
  const comp = buildComposition(
    ctx,
    { ...cfg, loopOptions: { pollMs: cfg.pollMs, leaseMs: cfg.leaseMs, attemptsPerErrand: cfg.attempts } },
    seams,
  );
  try {
    if (cfg.once) {
      // RR5: `--once` runs exactly ONE tick() and emits ONE data document —
      // the reader-facade errand list (CF3 re-checked) — exit 0.
      await comp.loop.tick();
      const errands = await comp.reader.listErrands();
      ctx.sinks.out(JSON.stringify({ errands }));
    } else {
      // RR5: the foreground mode runs loop.run() with a real timer wait and
      // emits ZERO documents (the observation surface is tail --diag / detail
      // / attach — C26's channel, not a second stdout protocol).
      await comp.loop.run();
    }
    // RR4: the R2 belt — drain in-flight post-conclusion deliveries before close.
    await comp.kernel.settleRuntimeContextDeliveries();
    return EXIT.ok;
  } finally {
    comp.close();
  }
}

// ── runner respawn (RS1) ─────────────────────────────────────────────────────

async function runnerRespawn(ctx: VerbContext, seams: RunnerSeams): Promise<number> {
  const instanceId = ctx.positionals[1];
  if (instanceId === undefined || instanceId === "") {
    throw usage("MissingInstanceId", "runner respawn requires an <instance> positional argument");
  }
  // RS1: the handler-grain partition — the cadence/budget/lease flags are
  // rejected here (the shell admits them syntactically under the union rule).
  for (const flag of ["poll-ms", "attempts", "lease-ms", "once"]) {
    if (ctx.values[flag] !== undefined) {
      throw usage(
        "ForbiddenRespawnFlag",
        `--${flag} is not valid for 'runner respawn' (a respawn is one unbudgeted edge, not a cadence)`,
      );
    }
  }
  const cfg = parseRespawnConfig(ctx);
  // No loopOptions: the respawn never runs the cadence (run/poll/tick are not
  // invoked), so the loop's lease/poll/budget knobs are inert here.
  const comp = buildComposition(ctx, { ...cfg }, seams);
  try {
    // RS1: the precondition read runs FIRST (the loop's respawn silently no-ops
    // on an absent/non-unconfirmed errand, so the verb owns its own read).
    const mine = (await comp.reader.listErrands()).filter((e) => e.instanceId === instanceId);
    if (mine.length === 0) {
      throw notFound("NoErrand", `instance '${instanceId}' has no errand in the runner ledger`);
    }
    const unconfirmed = mine.filter((e) => e.state === "unconfirmed");
    if (unconfirmed.length > 1) {
      // A ledger-integrity surprise — fail-closed, never a pick.
      throw new CliError(
        "internal",
        "DuplicateUnconfirmed",
        `instance '${instanceId}' has ${String(unconfirmed.length)} unconfirmed errands (ledger integrity)`,
      );
    }
    if (unconfirmed.length === 0) {
      const found = mostRecent(mine);
      throw notFound(
        "NotUnconfirmed",
        `instance '${instanceId}' errand is '${found.state}', not 'unconfirmed' (nothing to respawn)`,
      );
    }
    const errand = unconfirmed[0]!;
    // RS1: the edge runs under C14's frozen-budget rules through the loop's own
    // API; the OUTCOME is data read AFTER the call (the exit classifies the
    // invocation — it RAN — while the doc's `state` carries the truth).
    await comp.loop.respawn(instanceId, errand.contextPacketId);
    const post = await comp.reader.getErrand(instanceId, errand.contextPacketId);
    ctx.sinks.out(JSON.stringify(post ?? errand));
    return EXIT.ok;
  } finally {
    comp.close();
  }
}

/** RR1: subverb dispatch on `positionals[0]` — `run` | `respawn`; anything
 * else (missing included) is usage/2 naming the expected set. */
export async function verbRunner(
  ctx: VerbContext,
  seams: RunnerSeams = productionRunnerSeams(),
): Promise<number> {
  const sub = ctx.positionals[0];
  if (sub === "run") {
    return runnerRun(ctx, seams);
  }
  if (sub === "respawn") {
    return runnerRespawn(ctx, seams);
  }
  throw usage(
    "UnknownRunnerSubverb",
    `unknown 'runner' subverb '${sub ?? ""}' — expected one of: run, respawn`,
  );
}

// ── attach (AT1/AT2) ─────────────────────────────────────────────────────────

/** The most-recent errand row (DT2's selection rule): sort by `createdAt` with
 * `contextPacketId` as the deterministic tiebreak; the largest is chosen. */
function mostRecent(rows: readonly ErrandRow[]): ErrandRow {
  return [...rows].sort((a, b) =>
    a.createdAt !== b.createdAt
      ? a.createdAt - b.createdAt
      : a.contextPacketId < b.contextPacketId
        ? -1
        : a.contextPacketId > b.contextPacketId
          ? 1
          : 0,
  )[rows.length - 1]!;
}

/** The instance's live attempt (AT1/DT1): among rows carrying a non-null
 * activeAttemptId AND liveSessionName, the most-recent by the selection rule. */
function resolveLiveAttempt(rows: readonly ErrandRow[]): { readonly sessionName: string } | null {
  const live = rows.filter((e) => e.activeAttemptId !== null && e.liveSessionName !== null);
  if (live.length === 0) {
    return null;
  }
  const chosen = mostRecent(live);
  return { sessionName: chosen.liveSessionName! };
}

export async function verbAttach(
  ctx: VerbContext,
  seams: RunnerSeams = productionRunnerSeams(),
): Promise<number> {
  const id = ctx.positionals[0];
  if (id === undefined || id === "") {
    throw usage("MissingInstanceId", "attach requires an <instance> positional argument");
  }
  const takeover = ctx.values["takeover"] === true;
  const db = resolveDbPath(flagString(ctx, "db"), ctx.deps);
  const errandPath = deriveErrandDbPath(db);
  // AT1: existence-check first — a read verb mints no ledger (the no-mint rule).
  // Each absence is named for the ACTUAL absence per AT1's letter: no ledger vs
  // no errand vs no live attempt are THREE distinct names, never conflated.
  if (!existsSync(errandPath)) {
    throw notFound("NoRunnerLedger", `instance '${id}' is not running (no runner ledger)`);
  }
  // AT1: resolution is a runner-LEDGER read THROUGH the reader facade — the
  // session name is the ROW's recorded `liveSessionName` VERBATIM. The facade
  // rides the NOOP diag sink: attach reads a LIVE-attempt row, provably outside
  // the CF3 flip's resting set (the recheck is inert here — no diag file mint,
  // preserving the committed-only-reads-never-open-diag invariant, C3).
  const handle = openStoreOrInternal(db, ctx.deps);
  const errandHandle = openErrandStore(errandPath, ctx.deps.time);
  let sessionName: string;
  try {
    const reader = createErrandReader(errandHandle.store, handle.store, noopDiagnosticsSink);
    const mine = (await reader.listErrands()).filter((e) => e.instanceId === id);
    if (mine.length === 0) {
      // A ledger exists but holds no row for this instance — a DISTINCT absence
      // from "no live attempt" (the build conflated the two under one null).
      throw notFound("NoErrand", `instance '${id}' has no errand in the runner ledger`);
    }
    const live = resolveLiveAttempt(mine);
    if (live === null) {
      throw notFound("NoLiveAttempt", `instance '${id}' is not running (no live attempt)`);
    }
    sessionName = live.sessionName;
  } finally {
    errandHandle.close();
    handle.close();
  }
  // AT1: the liveness classification PRECEDES the exec — the interactive exit
  // alone cannot discriminate (a real `tmux attach` exits 1 for BOTH a missing
  // session and a missing tty). A CLEAN-DEAD session is the not-running domain
  // lane (exit 3) with NO exec; a probe ANOMALY (neither alive nor clean-dead —
  // tmux infra, an anomalous client conclusion) is INTERNAL (exit 1),
  // fail-closed, NEVER conflated with the dead lane (the DETAIL surface keeps
  // its own `probe-failed` discriminant; here, at the exec boundary, an
  // undiscriminated probe cannot license an exec — it fails loud).
  const liveness = await seams.liveness(sessionName);
  if (liveness === "dead") {
    throw notFound("SessionDead", `instance '${id}' session '${sessionName}' is not running`);
  }
  if (liveness === "probe-failed") {
    throw new CliError(
      "internal",
      "AttachProbeFailed",
      `instance '${id}' session '${sessionName}' liveness probe failed (tmux infra or an anomalous client exit) — attach cannot proceed`,
    );
  }
  // AT2: EXEC through the injected interactive seam — observe (`-r`) by default,
  // takeover drops `-r`. Pane bytes flow through the inherited tty (no CLI
  // document); a clean detach maps to 0, ANY nonzero exit to internal (1).
  const args = takeover
    ? ["attach-session", "-t", sessionName]
    : ["attach-session", "-r", "-t", sessionName];
  const code = await ctx.deps.runInteractive("tmux", args);
  if (code === 0) {
    return EXIT.ok;
  }
  throw new CliError(
    "internal",
    "AttachExitNonzero",
    `tmux attach exited ${String(code)} for session '${sessionName}'`,
  );
}

// ── detail enrichment (DT1/DT2) ──────────────────────────────────────────────

type SummaryReason =
  | "no-runtime-context"
  | "templates-unavailable"
  | "template-unavailable"
  | "provider-unresolvable";

type ErrandMember =
  | { readonly unavailable: "no-runner-ledger" | "no-errand" }
  | {
      readonly state: ErrandState;
      readonly remainingBudget: number;
      readonly contextPacketId: string;
      readonly activeAttemptId: string | null;
      readonly liveSessionName: string | null;
      readonly recordedAdmitOutcome: string | null;
    };

type AttachMember =
  | { readonly available: true; readonly sessionName: string }
  | { readonly available: false; readonly reason: "no-live-attempt" | "session-dead" | "probe-failed" };

type SummaryMember = RuntimeContextProjection | { readonly unavailable: SummaryReason };

export interface RunnerSection {
  readonly errand: ErrandMember;
  readonly attach: AttachMember;
  readonly runtimeContextSummary: SummaryMember;
}

/** DT2: the templates dir if configured (flag-first, env second) — WITHOUT the
 * write verbs' usage-lane demand. `null` iff no dir is configured (the
 * `templates-unavailable` degrade); a configured-but-bad dir surfaces later as
 * `template-unavailable` at load. */
function optionalTemplatesDir(ctx: VerbContext): string | null {
  const dir = flagString(ctx, "templates-dir") ?? ctx.deps.env["PAIRFLOW_V3_TEMPLATES"];
  return dir === undefined || dir === "" ? null : dir;
}

/** DT1/DT2: the `runtimeContextSummary` member — the provider's actor
 * projection VERBATIM (C10) iff the run's runtime context is ready with a ref,
 * else a named unavailability discriminant from the closed summary domain. */
async function resolveSummary(ctx: VerbContext, instance: WorkflowInstance): Promise<SummaryMember> {
  const rc = instance.runtimeContext;
  if (rc.state !== "ready" || rc.ref === null) {
    return { unavailable: "no-runtime-context" };
  }
  const dir = optionalTemplatesDir(ctx);
  if (dir === null) {
    return { unavailable: "templates-unavailable" };
  }
  const gates = createGateRegistry();
  const definitions = createFileDefinitionStore(dir, gates);
  let template;
  try {
    template = await definitions.load(instance.templateRef);
  } catch {
    // A configured dir that cannot load the pinned template (absent/malformed).
    return { unavailable: "template-unavailable" };
  }
  if (template === null) {
    return { unavailable: "template-unavailable" };
  }
  const requirement = resolveRuntimeContextRequirement(template.runtimeContext);
  if (requirement.state !== "required") {
    return { unavailable: "no-runtime-context" };
  }
  const { registry } = createProductionProviderRegistry();
  const provider = registry.resolve(requirement.spec.provider);
  if (provider === null) {
    return { unavailable: "provider-unresolvable" };
  }
  try {
    return provider.projectForActor(rc.ref);
  } catch {
    return { unavailable: "provider-unresolvable" };
  }
}

/**
 * DT1/DT2: the `runner` detail section — a CLOSED keyset, every member ALWAYS
 * present with a value or a named unavailability discriminant. The errand
 * ledger is opened ONLY after an existence check (the no-mint rule); substrate
 * faults (a corrupt existing ledger) stay ES5-fail-loud (they propagate to the
 * internal lane). The reader facade's CF3 flip is the section's one permitted
 * write.
 */
export async function enrichDetailRunner(
  ctx: VerbContext,
  kernelStore: DeliveryReadSeam,
  instance: WorkflowInstance,
  seams: RunnerSeams = productionRunnerSeams(),
): Promise<RunnerSection> {
  const db = resolveDbPath(flagString(ctx, "db"), ctx.deps);
  const errandPath = deriveErrandDbPath(db);
  let errand: ErrandMember;
  let attach: AttachMember;
  if (!existsSync(errandPath)) {
    // The no-mint negative: a detail read against a ledgerless run creates NO
    // file and leaves ZERO probes.
    errand = { unavailable: "no-runner-ledger" };
    attach = { available: false, reason: "no-live-attempt" };
  } else {
    const errandHandle = openErrandStore(errandPath, ctx.deps.time);
    try {
      // The facade rides the NOOP diag sink so a committed-only detail read
      // never opens/creates the diag file (C3); the CF3 flip still WRITES the
      // confirmed state to the errand ledger — only its best-effort diagnostic
      // event is dropped (the fail-open diag contract, REV-DIAG-FAILOPEN).
      const reader = createErrandReader(errandHandle.store, kernelStore, noopDiagnosticsSink);
      const mine = (await reader.listErrands()).filter((e) => e.instanceId === instance.instanceId);
      if (mine.length === 0) {
        errand = { unavailable: "no-errand" };
        attach = { available: false, reason: "no-live-attempt" };
      } else {
        const row = mostRecent(mine);
        errand = {
          state: row.state,
          remainingBudget: row.remainingBudget,
          contextPacketId: row.contextPacketId,
          activeAttemptId: row.activeAttemptId,
          liveSessionName: row.liveSessionName,
          recordedAdmitOutcome: row.recordedAdmitOutcome,
        };
        const live = resolveLiveAttempt(mine);
        if (live === null) {
          attach = { available: false, reason: "no-live-attempt" };
        } else {
          const liveness = await seams.liveness(live.sessionName);
          attach =
            liveness === "alive"
              ? { available: true, sessionName: live.sessionName }
              : { available: false, reason: liveness === "dead" ? "session-dead" : "probe-failed" };
        }
      }
    } finally {
      errandHandle.close();
    }
  }
  const runtimeContextSummary = await resolveSummary(ctx, instance);
  return { errand, attach, runtimeContextSummary };
}
