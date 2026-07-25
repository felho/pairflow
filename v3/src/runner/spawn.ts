import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";

/**
 * The ONE disciplined spawn seam (SD1; packet ch9-p3b, NEW — flag F1). ONE
 * place realizes C19's four decision items (explicit cwd; env FULL REPLACEMENT
 * to exactly the passed object, P3d; the seam-owned timeout with the
 * SIGTERM→grace→SIGKILL escalation, P3a/P6f; stdout/stderr captured, P3b), and
 * the seam NEVER classifies business outcomes (C21's spawn-side stance
 * mirrored): `exit` reports the child's conclusion FAITHFULLY (code or signal
 * verbatim, plus the own-timer flag), `infra` is the spawn-setup/ENOENT class
 * (P3c — a distinct lane, no exit code). Consumers: the actor adapter
 * (ch9-P3b), the worktree provider's git runner (SD2), the process-gate real
 * spawn and the tmux channel's client invocations (ch9-P4a).
 */

export type SpawnConclusion =
  | {
      readonly kind: "exit";
      /** Faithful child exit code, or null on a signal conclusion (P3a). */
      readonly code: number | null;
      /** The terminating signal, or null on a code conclusion. */
      readonly signal: string | null;
      /** The seam's OWN-timer attribution flag: set on every timer-fired
       * conclusion regardless of the exit shape, never set otherwise. The
       * downstream record decides attribution (CL1 — completed work is never
       * reclassified even when the timer callback outran the exit event, P6h). */
      readonly timedOut: boolean;
      readonly stdout: string;
      /** The RAW captured stdout bytes (GR4's hashing input, packet ch9-p4a
       * aftermath): `stdout` is the ONE-shot utf8 decode of exactly these
       * bytes at conclusion. ALWAYS present on the seam's own conclusions;
       * OPTIONAL in the type only so synthetic exit conclusions (the
       * session-grain classifier's, scripted test fixtures) stay
       * constructible. Byte consumers treat absence as measurement failure —
       * NEVER re-encode the decoded text. */
      readonly stdoutBytes?: Buffer;
      readonly stderr: string;
    }
  | { readonly kind: "infra"; readonly message: string };

export interface DisciplinedSpawnInput {
  readonly cmd: string;
  readonly args: readonly string[];
  readonly cwd: string;
  /** FULL env replacement (C19/P3d): the child sees ONLY this object. */
  readonly env: Readonly<Record<string, string>>;
  readonly timeoutMs: number;
  readonly graceMs: number;
  /**
   * GR2 (packet ch9-p4a, flag F2): OPTIONAL stdin contents. When PRESENT,
   * stdio[0] is `"pipe"` and the contents are written then ended at spawn;
   * when ABSENT, stdio[0] stays `"ignore"` and the seam's behavior is
   * BYTE-IDENTICAL to the pre-P4a form (the P3b/P2 suites are the pin). A
   * write error on the pipe (EPIPE from a fast-exiting child) is NOT an infra
   * conclusion — the write is best-effort input delivery; the child's own
   * exit decides.
   */
  readonly stdin?: string;
}

/** The promise-resolution drain deadline (SD1): after the child's EXIT the
 * captured streams are awaited up to this bound. On the normal path the
 * streams close with the process (output complete); on the orphan path
 * (P6e — a live grandchild holds the pass-through pipes) the tail truncates
 * here, explicit diagnostic-only loss (C23: the load-bearing handoff is
 * file-based). */
const DRAIN_DEADLINE_MS = 2000;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function disciplinedSpawn(input: DisciplinedSpawnInput): Promise<SpawnConclusion> {
  return new Promise<SpawnConclusion>((resolve) => {
    let child: ChildProcess;
    try {
      child = spawn(input.cmd, [...input.args], {
        cwd: input.cwd,
        env: input.env,
        // GR2: fd 0 is piped ONLY when stdin contents are passed; absent
        // stdin keeps the pre-P4a "ignore" byte-identical.
        stdio: [input.stdin !== undefined ? "pipe" : "ignore", "pipe", "pipe"],
      });
    } catch (error) {
      // A synchronous spawn-setup throw — the infra lane (P3c).
      resolve({ kind: "infra", message: errorMessage(error) });
      return;
    }

    if (input.stdin !== undefined) {
      // GR2: best-effort input delivery — an EPIPE against a fast-exiting
      // child is swallowed HERE (the stream error, not the child `error`
      // event); the child's own exit decides the conclusion.
      child.stdin?.on("error", () => {});
      child.stdin?.end(input.stdin);
    }

    let settled = false; // the EXIT/INFRA settle (attribution decided ONCE)
    let timedOut = false;
    // Raw Buffer accumulation, decoded ONCE at conclusion: a multibyte
    // sequence split across chunks would corrupt (U+FFFD) under per-chunk
    // decoding, and hash consumers (GR4's gitStatusHash) need the RAW bytes —
    // never a re-encoding of decoded text.
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let graceTimer: ReturnType<typeof setTimeout> | undefined;

    child.stdout?.on("data", (chunk: Buffer) => {
      stdoutChunks.push(chunk);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });

    // The seam-owned timer: SIGTERM at the deadline, then the bounded-grace
    // SIGKILL escalation (a SIGTERM-ignoring child is killed at the grace).
    const killTimer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      graceTimer = setTimeout(() => {
        child.kill("SIGKILL");
      }, input.graceMs);
      graceTimer.unref();
    }, input.timeoutMs);
    killTimer.unref();

    const clearTimers = (): void => {
      clearTimeout(killTimer);
      if (graceTimer !== undefined) {
        clearTimeout(graceTimer);
      }
    };

    child.on("error", (error: Error) => {
      // ENOENT (missing binary) and kin — the distinct infra lane (P3c). No
      // exit code is produced.
      if (settled) {
        return;
      }
      settled = true;
      clearTimers();
      resolve({ kind: "infra", message: error.message });
    });

    child.on("exit", (code, signal) => {
      // Settle on PROCESS DEATH — NEVER the stdio `close` event: with
      // pass-through stdio a live orphan holds the pipes open past the child's
      // death (P6e), and a close-triggered settle would stall unboundedly.
      if (settled) {
        return;
      }
      settled = true;
      clearTimers();
      let resolved = false;
      const finish = (): void => {
        if (resolved) {
          return;
        }
        resolved = true;
        clearTimeout(drainTimer);
        const stdoutBytes = Buffer.concat(stdoutChunks);
        resolve({
          kind: "exit",
          code: code ?? null,
          signal: signal ?? null,
          timedOut,
          stdout: stdoutBytes.toString("utf8"),
          stdoutBytes,
          stderr: Buffer.concat(stderrChunks).toString("utf8"),
        });
      };
      // The resolution awaits stream close bounded by the drain deadline.
      const drainTimer = setTimeout(finish, DRAIN_DEADLINE_MS);
      drainTimer.unref();
      child.on("close", finish);
    });
  });
}

// ── The shared timer-knob validator (T2 — SD1's export) ───────────────────
// Every consumer factory of the seam validates its timer knobs FAIL-CLOSED at
// construction (R-NUMERIC-LADDER at the config boundary): each knob a FINITE
// SAFE INTEGER at or above its NAMED floor, and every derived timer value
// (`graceMs + backstopMarginMs` included) below Node's 2^31 timer bound — a
// NaN, Infinity, or overflowing delay silently COLLAPSES to 1 ms on the
// substrate (P6i), which would let an outer backstop outrun an inner
// escalation.

/** Node's setTimeout upper bound: a delay above this collapses to 1 ms (P6i). */
export const TIMER_MAX_MS = 2_147_483_647;

/** The named floor for every direct timer knob (T2). */
export const TIMER_FLOOR_MS = 1_000;

export class TimerKnobError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimerKnobError";
  }
}

export interface TimerKnob {
  readonly label: string;
  readonly value: number;
  /** Defaults to TIMER_FLOOR_MS. */
  readonly floor?: number;
}

/** A derived timer value (a sum of knobs) — floor-free, but still bounded by
 * the 2^31 substrate collapse. */
export interface DerivedTimer {
  readonly label: string;
  readonly value: number;
}

/**
 * Validate the seam's timer knobs at a consumer factory's construction. Throws
 * a `TimerKnobError` on any violation (config-integrity, fail-closed): a knob
 * that is not a finite safe integer, or below its floor, or at/above the 2^31
 * bound; or a derived timer at/above the 2^31 bound. Called at BOTH current
 * consumers (`createActorAdapter` AND the worktree provider factory), so SD3's
 * orphan-freedom guarantee rests on validated arithmetic, never on luck.
 */
export function validateTimerKnobs(
  knobs: readonly TimerKnob[],
  derived: readonly DerivedTimer[] = [],
): void {
  for (const knob of knobs) {
    const floor = knob.floor ?? TIMER_FLOOR_MS;
    if (!Number.isSafeInteger(knob.value)) {
      throw new TimerKnobError(
        `timer-knob config: '${knob.label}' must be a finite safe integer (got ${String(knob.value)})`,
      );
    }
    if (knob.value < floor) {
      throw new TimerKnobError(
        `timer-knob config: '${knob.label}' must be >= ${String(floor)} ms (got ${String(knob.value)})`,
      );
    }
    if (knob.value > TIMER_MAX_MS) {
      throw new TimerKnobError(
        `timer-knob config: '${knob.label}' must be below Node's 2^31 timer bound ${String(TIMER_MAX_MS)} (got ${String(knob.value)})`,
      );
    }
  }
  for (const d of derived) {
    if (!Number.isSafeInteger(d.value) || d.value > TIMER_MAX_MS) {
      throw new TimerKnobError(
        `timer-knob config: derived timer '${d.label}' must be a safe integer below Node's 2^31 timer bound ${String(TIMER_MAX_MS)} (got ${String(d.value)})`,
      );
    }
  }
}
