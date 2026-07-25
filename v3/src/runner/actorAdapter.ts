import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { DispatchIntent, Outcome } from "../domain/index.js";
import { canonicalize, deriveActorEmitOpId, isCanonicalizable } from "../emit/index.js";
import type { Ingress } from "../ingress/index.js";
import type { AttemptExecutor, AttemptExecutorInput, AttemptResult } from "../ports/delivery.js";
import type { DiagnosticsSink, SpawnOutcome } from "../ports/diagnostics.js";
import { enc } from "./enc.js";
import type { SpawnConclusion } from "./spawn.js";
import { validateTimerKnobs } from "./spawn.js";
import type { SpawnChannel } from "./spawnChannel.js";
import { createDirectSpawnChannel } from "./spawnChannel.js";

/**
 * The REAL actor adapter (packet ch9-p3b; the AttemptExecutor behind the P3a
 * seam). It maps C17–C23's spawn/handoff/result mechanics onto the closed K1
 * result vocabulary: ATTEMPT-SCOPED handoff (H), argv mapping (AV), the durable
 * result seam over the wrapper asset (RS), the total fail-closed conclusion
 * precedence (CL), emit capture + normal-ingress submission (EM), and one
 * best-effort spawn_outcome diagnostic per conclusion (DG). It writes NO kernel
 * state outside `ingress.submit` and NO errand state at all — commit ≠ deliver.
 */

/**
 * AV2 (flag F4): the actor locates its exchange files through these two
 * adapter-injected env vars (absolute paths of the attempt's `packet.json` /
 * `emit.json`). ONE exported constant pair — every in-repo producer/fixture/
 * test references the constants, never a raw string literal, so an in-repo
 * rename stays a one-line change.
 */
export const PAIRFLOW_PACKET = "PAIRFLOW_PACKET";
export const PAIRFLOW_EMIT = "PAIRFLOW_EMIT";

/** The composition-injected config → argv mapper (AV1; C18). `null` (no
 * template for the config) AND a throwing mapper both conclude
 * `infra_failure(spawn_infra)` — never a kernel rejection. */
export type ArgvMapper = (
  effectiveAgentConfig: Readonly<Record<string, unknown>>,
) => { readonly cmd: string; readonly args: readonly string[] } | null;

export interface ActorAdapterDeps {
  readonly ingress: Pick<Ingress, "submit">;
  readonly argvMapper: ArgvMapper;
  readonly diag: DiagnosticsSink;
  /**
   * TX1 (packet ch9-p4a, flag F1): the composition-injected spawn channel —
   * the spawn/observe stage behind the seam. DEFAULT: the direct channel
   * (the P3b behavior byte-preserved); the production tmux binding is
   * ch9-P4b's `runner run` composition. Handoff, argv mapping, result parse,
   * emit, and diag stages are byte-shared across channels.
   */
  readonly channel?: SpawnChannel;
}

export interface ActorAdapterOptions {
  /** C17's composition-configured `default_cwd` (REQUIRED — no default). */
  readonly defaultCwd: string;
  /** The fail-closed ENV ALLOWLIST handed to the child (C19). Default
   * `{ PATH }` — a floor for tests, not a production recommendation. */
  readonly envAllowlist?: Readonly<Record<string, string>>;
  /** The delivery timeout (default 1 800 000 ms = 30 min — sized to real
   * LLM-actor runs). The COMPOSITION pairs the loop's leaseMs a margin above. */
  readonly timeoutMs?: number;
  /** The wrapper's actor-grace before its own SIGKILL (default 10 000 ms). */
  readonly graceMs?: number;
  /** SD3's two-tier margin: the seam's wrapper-spawn grace = graceMs + this
   * (default 5 000 ms), provably later than the inner escalation. */
  readonly backstopMarginMs?: number;
}

const STDERR_TAIL_CAP = 2000;
function stderrTail(source: string): string | undefined {
  if (source.length === 0) {
    return undefined;
  }
  return source.length > STDERR_TAIL_CAP ? source.slice(-STDERR_TAIL_CAP) : source;
}

/** RS1's atomic write discipline (tmp + rename, same directory) — the handoff
 * mirror of the wrapper's result write. */
function atomicWrite(path: string, contents: string): void {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, contents);
  renameSync(tmp, path);
}

/** The RS2 fail-closed result record (the wrapper's closed keyset). */
export interface ResultRecord {
  readonly attemptId: string;
  readonly exitCode: number | null;
  readonly signal: string | null;
  readonly termForwarded: boolean;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * RS2: parse `result.json` FAIL-CLOSED — strict JSON, the closed keyset with
 * per-field grain, and a strict `attemptId` echo. Returns the record, or null
 * for a missing/unparseable/keyset-violating/foreign-attemptId file (all of
 * which route to C23's failed-attempt lane).
 */
export function parseResult(path: string, expectedAttemptId: string): ResultRecord | null {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return null; // missing / unreadable
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null; // unparseable
  }
  if (!isPlainObject(parsed)) {
    return null;
  }
  const keys = Object.keys(parsed);
  if (keys.length !== 4) {
    return null;
  }
  for (const k of ["attemptId", "exitCode", "signal", "termForwarded"]) {
    if (!Object.prototype.hasOwnProperty.call(parsed, k)) {
      return null;
    }
  }
  const { attemptId, exitCode, signal, termForwarded } = parsed;
  if (attemptId !== expectedAttemptId) {
    return null; // foreign or missing echo — fail-closed (never an actor outcome)
  }
  // exitCode: an INTEGER or null (a non-integer, non-finite, or -0 is a
  // keyset violation — Object.is discriminates -0, R-NUMERIC-LADDER).
  const exitCodeOk =
    exitCode === null ||
    (typeof exitCode === "number" && Number.isInteger(exitCode) && !Object.is(exitCode, -0));
  if (!exitCodeOk) {
    return null;
  }
  if (signal !== null && typeof signal !== "string") {
    return null;
  }
  if (typeof termForwarded !== "boolean") {
    return null;
  }
  // EXACTLY ONE of exitCode/signal non-null (keeps CL1 row 4 total by parse).
  const exitNonNull = exitCode !== null;
  const signalNonNull = signal !== null;
  if (exitNonNull === signalNonNull) {
    return null; // both-null or both-non-null
  }
  return { attemptId, exitCode, signal, termForwarded };
}

/**
 * CL1: the TOTAL fail-closed conclusion PRECEDENCE as a PURE function — every
 * (SpawnConclusion × result record) input maps to exactly one decision. Split
 * out of `execute()` so the whole precedence is unit-drivable ROW-BY-ROW (the
 * flag×record combinations the trivial real wrapper cannot reach — a flagged
 * natural exit-0, a flagged nonzero, a flagged foreign kill — and so the
 * classifier's mutants fall under Stryker via a NON-subprocess test file).
 *
 * `record` is the parsed `result.json` (RS2). It is CONSULTED ONLY on the
 * exit-0 lane (CL1 row 4); on the infra / signal / nonzero lanes the caller
 * passes null (the record is not read — CL1 rows 1-3). Returns `{ kind: "emit" }`
 * when the actor exited 0 (the EM lanes decide submitted/no_output next);
 * otherwise the terminal `AttemptResult`.
 */
export type ClassifyDecision =
  | { readonly kind: "result"; readonly result: AttemptResult }
  | { readonly kind: "emit" };

export function classifyConclusion(
  conclusion: SpawnConclusion,
  record: ResultRecord | null,
): ClassifyDecision {
  // Row 1: the seam reports infra (wrapper spawn setup / ENOENT).
  if (conclusion.kind === "infra") {
    return { kind: "result", result: { kind: "infra_failure", class: "spawn_infra" } };
  }
  const timedOut = conclusion.timedOut;
  // Row 2: the wrapper concluded by SIGNAL (result normally absent, not consulted).
  if (conclusion.code === null) {
    return {
      kind: "result",
      result: { kind: "infra_failure", class: timedOut ? "own_timeout" : "foreign_kill" },
    };
  }
  // Row 3: the wrapper exited NONZERO (its contract is exit 0 after the write).
  if (conclusion.code !== 0) {
    return {
      kind: "result",
      result: { kind: "infra_failure", class: timedOut ? "own_timeout" : "spawn_infra" },
    };
  }
  // Row 4: the wrapper exited 0 → the parsed result record (RS2/RS3) decides.
  if (record === null) {
    // Invalid / missing / foreign result — fail-closed both ways.
    return {
      kind: "result",
      result: { kind: "infra_failure", class: timedOut ? "own_timeout" : "spawn_infra" },
    };
  }
  if (record.signal !== null) {
    // (timedOut AND termForwarded) → own_timeout (C23's forwarded-kill letter);
    // else foreign_kill (C21's class). `termForwarded` discriminates ONLY under
    // a fired own timer.
    return {
      kind: "result",
      result: {
        kind: "infra_failure",
        class: timedOut && record.termForwarded ? "own_timeout" : "foreign_kill",
      },
    };
  }
  if (record.exitCode !== 0) {
    // A nonzero exit is the actor's OWN conclusion, never a kill record — even
    // under a fired timer.
    return { kind: "result", result: { kind: "infra_failure", class: "nonzero_exit" } };
  }
  // Actor exit 0 → the EM lanes. COMPLETED WORK IS NEVER RECLASSIFIED by a late
  // timer (the P6h delayed-exit race — even with `timedOut` set).
  return { kind: "emit" };
}

/**
 * TX7 (packet ch9-p4a): the SESSION-GRAIN conclusion derivation — on a tmux
 * channel's `session-concluded` the parsed result record (RS2, unchanged)
 * decides under the CHANNEL's own `timedOut` flag: absent/invalid/foreign →
 * `timedOut ? own_timeout : spawn_infra` (C23's dead-session/no-result lane at
 * session grain); a valid signal record → `timedOut && termForwarded ?
 * own_timeout : foreign_kill`; valid nonzero → `nonzero_exit`; valid 0 → the
 * EM lanes. COMPLETED WORK IS NEVER RECLASSIFIED. Realized as the CL1 row-4
 * core REUSED verbatim (a synthetic clean-exit conclusion carrying the
 * channel flag) — one precedence authority, no fork.
 */
export function classifySessionConclusion(
  timedOut: boolean,
  record: ResultRecord | null,
): ClassifyDecision {
  return classifyConclusion(
    { kind: "exit", code: 0, signal: null, timedOut, stdout: "", stderr: "" },
    record,
  );
}

/** The validated emit envelope contents (EM1's closed keyset). */
interface EmitRecord {
  readonly type: string;
  readonly payload: unknown;
}

/**
 * EM1: read + validate `emit.json` FAIL-CLOSED. Returns the record, or null for
 * ANY rejection shape (missing/unreadable/invalid JSON/non-object/unknown key/
 * missing-or-empty type/missing payload/non-canonicalizable payload) — every
 * one is the C15 `no_output` lane, never a throw, never a partial submit.
 */
export function parseEmit(path: string): EmitRecord | null {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isPlainObject(parsed)) {
    return null;
  }
  const keys = Object.keys(parsed);
  if (keys.length !== 2 || !keys.includes("type") || !keys.includes("payload")) {
    return null;
  }
  const type = parsed.type;
  if (typeof type !== "string" || type.length === 0) {
    return null;
  }
  if (!Object.prototype.hasOwnProperty.call(parsed, "payload")) {
    return null;
  }
  const payload = parsed.payload;
  // The isCanonicalizable PRE-CHECK makes EM2's derive-throw unreachable.
  if (!isCanonicalizable(payload)) {
    return null;
  }
  return { type, payload };
}

const WRAPPER_PATH = fileURLToPath(new URL("./attemptWrapper.mjs", import.meta.url));

export function createActorAdapter(
  deps: ActorAdapterDeps,
  options: ActorAdapterOptions,
): AttemptExecutor {
  const defaultCwd = options.defaultCwd;
  // Config-integrity (AV2): a RELATIVE `defaultCwd` yields a relative none-lane
  // `cwd`, hence RELATIVE `PAIRFLOW_PACKET`/`PAIRFLOW_EMIT` paths — which the
  // spawned child would resolve from its OWN (changed) cwd, not the adapter's,
  // so the actor reads/writes the wrong location (an AV2 breach). Fail-closed
  // LOUD at construction, alongside the timer-knob validation.
  if (!isAbsolute(defaultCwd)) {
    throw new Error(
      `actor-adapter config: 'defaultCwd' must be an ABSOLUTE path (got ${JSON.stringify(
        defaultCwd,
      )}) — a relative defaultCwd yields relative PAIRFLOW_* paths the child would resolve from its own cwd (AV2 breach)`,
    );
  }
  const envAllowlist = options.envAllowlist ?? { PATH: process.env.PATH ?? "" };
  const timeoutMs = options.timeoutMs ?? 1_800_000;
  const graceMs = options.graceMs ?? 10_000;
  const backstopMarginMs = options.backstopMarginMs ?? 5_000;
  // TX1: the injected spawn channel; the DEFAULT stays direct (flag F1's
  // staging clause — the production tmux binding is ch9-P4b's composition).
  const channel = deps.channel ?? createDirectSpawnChannel();
  // T2: fail-closed knob validation at construction through the SHARED
  // validator — every knob a finite safe integer ≥ its floor, and every
  // derived timer (graceMs + backstopMarginMs) below Node's 2^31 bound, so
  // SD3's orphan-freedom rests on validated arithmetic.
  validateTimerKnobs(
    [
      { label: "timeoutMs", value: timeoutMs },
      { label: "graceMs", value: graceMs },
      { label: "backstopMarginMs", value: backstopMarginMs },
    ],
    [{ label: "graceMs + backstopMarginMs", value: graceMs + backstopMarginMs }],
  );

  async function execute(input: AttemptExecutorInput): Promise<AttemptResult> {
    const intent: DispatchIntent = input.intent;
    const packet = intent.packet;
    const attemptId = input.attemptId;
    // H3: re-derive context_packet_id from the packet's own fields — by
    // construction the errand key AND ADR-004's op-id input.
    const contextPacketId = `${packet.instanceId}@v${String(packet.expectedVersion)}`;
    let detailTail: string | undefined;

    const emitSpawnOutcome = (spawnOutcome: SpawnOutcome): void => {
      // DG1: exactly ONE best-effort event per conclusion — emitted BARE
      // (REV-DIAG-FAILOPEN). A sink failure changes no conclusion.
      deps.diag.emit({
        source: "runner",
        kind: "spawn_outcome",
        instanceId: packet.instanceId,
        contextPacketId,
        attemptId,
        spawnOutcome,
        ...(detailTail !== undefined ? { spawnDetail: detailTail } : {}),
      });
    };

    let result: AttemptResult;
    try {
      result = await produce();
    } catch (err) {
      // EM3: a submit-time kernel-integrity throw is NOT an outcome — it falls
      // to the loop's K2 crash path. Emit one spawn_outcome (spawn_infra, the
      // K2 landing's class) BEFORE the rejection propagates.
      emitSpawnOutcome("spawn_infra");
      throw err;
    }
    emitSpawnOutcome(classToken(result));
    return result;

    async function produce(): Promise<AttemptResult> {
      // ── SETUP (every fault → infra_failure(spawn_infra)) ────────────────
      let attemptDir: string;
      let cwd: string;
      let mapped: { readonly cmd: string; readonly args: readonly string[] };
      try {
        // H1: the context lane uses the loop-resolved cwd; the none lane
        // derives C17's per-run subdirectory (adapter-owned scratch).
        cwd =
          input.cwd ??
          join(defaultCwd, `${enc(packet.instanceId)}--${enc(contextPacketId)}`);
        // AV1: the composition-injected mapper. `null` and a throw both →
        // spawn_infra (C18's unresolvable-mapping lane).
        const maybeMapped = deps.argvMapper(packet.effectiveAgentConfig);
        if (maybeMapped === null) {
          return { kind: "infra_failure", class: "spawn_infra" };
        }
        mapped = maybeMapped;
        // H2/H4: the ATTEMPT-scoped handoff directory (created recursively —
        // creates the none-lane cwd chain too).
        attemptDir = join(cwd, ".pairflow", enc(attemptId));
        mkdirSync(attemptDir, { recursive: true });
        // H2: materialize the ContextPacket as CANONICAL packet.json via the
        // ONE canonicalization authority (atomic write). Canonicalizable by
        // construction; a throw is defensively consumed here.
        atomicWrite(join(attemptDir, "packet.json"), canonicalize(packet));
      } catch {
        return { kind: "infra_failure", class: "spawn_infra" };
      }

      const packetPath = join(attemptDir, "packet.json");
      const emitPath = join(attemptDir, "emit.json");
      const resultPath = join(attemptDir, "result.json");

      // ── SPAWN through the injected CHANNEL (TX1) ────────────────────────
      // AV2: the actor locates its files through the injected env vars, added
      // to the composition allowlist; the mapped argv is spawned verbatim.
      // The adapter composes the child env and the COMPLETE wrapper argv and
      // hands both to the channel UNCHANGED; the sessionName is the
      // ledger-recorded value (C23's resolution source — never derived here).
      const childEnv: Record<string, string> = {
        ...envAllowlist,
        [PAIRFLOW_PACKET]: packetPath,
        [PAIRFLOW_EMIT]: emitPath,
      };
      const channelConclusion = await channel.launch({
        wrapperArgv: [
          process.execPath,
          WRAPPER_PATH,
          String(graceMs),
          resultPath,
          attemptId,
          mapped.cmd,
          ...mapped.args,
        ],
        cwd,
        env: childEnv,
        sessionName: input.sessionName,
        timeoutMs,
        graceMs,
        backstopMarginMs,
      });

      // ── CONCLUDE (TX7): each channel conclusion maps through the same
      //    fail-closed precedence onto the same closed K1 vocabulary ────────
      switch (channelConclusion.kind) {
        case "direct-exit": {
          // CL1's total fail-closed precedence, via the pure classifier —
          // the P3b flow byte-preserved.
          const conclusion = channelConclusion.conclusion;
          if (conclusion.kind === "exit") {
            detailTail = stderrTail(conclusion.stderr);
          }
          // RS2/RS3: the result record is CONSULTED ONLY on the exit-0 lane
          // (CL1 row 4); on the infra/signal/nonzero lanes it is not read.
          const record =
            conclusion.kind === "exit" && conclusion.code === 0
              ? parseResult(resultPath, attemptId)
              : null;
          const decision = classifyConclusion(conclusion, record);
          if (decision.kind === "emit") {
            // Actor exit 0 → the EM lanes (submitted / no_output).
            return submitEmit(emitPath);
          }
          return decision.result;
        }
        case "session-concluded": {
          // TX7: the session-grain derivation — the result file decides under
          // the CHANNEL's own flag. `spawnDetail` stays ABSENT on tmux
          // conclusions (F6(b): the pane pty holds the actor's stdio; pane
          // capture is no row's proof).
          const record = parseResult(resultPath, attemptId);
          const decision = classifySessionConclusion(channelConclusion.timedOut, record);
          if (decision.kind === "emit") {
            return submitEmit(emitPath);
          }
          return decision.result;
        }
        case "name_collision":
          // TX3: reported BEFORE any spawn side effect — B6's non-consuming
          // in-place remint lane (the loop's consumption, byte-untouched).
          return { kind: "name_collision" };
        case "infra":
          // A channel-level fault — fail-closed CONSUMED, budget-bounded.
          return { kind: "infra_failure", class: "spawn_infra" };
      }
    }

    async function submitEmit(emitPath: string): Promise<AttemptResult> {
      const emit = parseEmit(emitPath);
      if (emit === null) {
        return { kind: "no_output" };
      }
      // EM2: compose the envelope ON the actor's behalf and submit through
      // NORMAL ingress. A submit throw/reject PROPAGATES (EM3) — never
      // converted to no_output.
      const opId = deriveActorEmitOpId({
        instanceId: packet.instanceId,
        contextPacketId,
        opType: emit.type,
        payload: emit.payload,
      }).opId;
      const envelope = {
        instanceId: packet.instanceId,
        opId,
        type: emit.type,
        actorId: intent.actor,
        expectedVersion: packet.expectedVersion,
        expectedRole: packet.role,
        payload: emit.payload,
      };
      const outcome: Outcome = await deps.ingress.submit(envelope);
      return { kind: "submitted", outcome };
    }
  }

  return { execute };
}

function classToken(result: AttemptResult): SpawnOutcome {
  switch (result.kind) {
    case "submitted":
      return "submitted";
    case "no_output":
      return "no_output";
    case "infra_failure":
      return result.class;
    case "name_collision":
      // DG3 (packet ch9-p4a): the token joined the domain with the tmux
      // channel's TX3 collision lane (unreachable on the direct channel).
      return "name_collision";
  }
}
