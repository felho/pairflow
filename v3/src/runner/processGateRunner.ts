import { createHash, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

import type { ProcessGateEvidence, ProcessGateRunner, ProcessResult } from "../ports/gate.js";
import type { TimeSource } from "../ports/time.js";
import { disciplinedSpawn, TIMER_MAX_MS, validateTimerKnobs } from "./spawn.js";

/**
 * The REAL process-gate runner (packet ch9-p4a, GR1–GR5/GR8; contract:
 * ch9-runner#C21 under C19's discipline, evidence per ch11-gate-format#C26).
 * Every `run()` spawns ONE POSIX shell line (`/bin/sh -c <command>`, ch11-C13)
 * through the C19 seam — explicit cwd, env FULL REPLACEMENT to the
 * composition allowlist, the clamped seam timer with the SIGTERM→grace→SIGKILL
 * escalation, captured stdio, the invocation document on stdin (GR2's seam
 * capability; no argv payload).
 *
 * THE SPAWN SIDE NEVER CLASSIFIES (C21): kind production is TOTAL over seam
 * conclusions and records PROCESS EXECUTION only — nonzero exits are kind
 * `ok`; the kernel's mode-dependent classification (ch11-C15/C17/C25) is the
 * ONLY consumer of exitCode/stdout. Workspace facts are MEASURED after the
 * gate child concludes (GR4), the COMPLETE per-kind C26 evidence record is
 * durably persisted BEFORE `run()` resolves (GR5 — the W2 sibling-DB
 * substrate reused, one evidence home per db path), and a persistence failure
 * THROWS instead of returning (never a returned-but-unresolvable logRef).
 *
 * ACTIVATION DEFERRAL (GR7): module-public and fully driven by its own suite,
 * but NO shipped composition binds it — the fail-closed slot stays composed;
 * the swap is ch9-P4b's named content.
 */

/** The ABSOLUTE shell path (GR1): the spawn must not depend on PATH
 * resolution inside a replaced env. */
const SHELL = "/bin/sh";

/** GR4: the measurement spawns are seam spawns too, each under its OWN short
 * timeout (internal constants — not composition knobs). */
const MEASUREMENT_TIMEOUT_MS = 10_000;
const MEASUREMENT_GRACE_MS = 1_000;

/**
 * GR4 (flag F4a): the ONE workspace-fact sentinel — declared on BOTH facts
 * whenever EITHER measurement command concludes nonzero/infra (P8b: a
 * non-repo cwd exits 128). A DECLARED workspace fact per ch11-C26's letter,
 * never a fabricated value; the spelling follows the slot's `unavailable-*`
 * family. Measurement failure NEVER changes the gate result's kind.
 */
export const MEASUREMENT_FAILED_SENTINEL = "unavailable-measurement-failed";

export interface ProcessGateRunnerDeps {
  /** IC-D: `duration_ms` — and nothing else — reads time, through this
   * injected source (never Date.now()). */
  readonly time: TimeSource;
}

export interface ProcessGateRunnerOptions {
  /**
   * GR1: the C19 composition-declared env allowlist (FULL REPLACEMENT). The
   * default `{ PATH: <host PATH> }` is a floor for tests; a composition
   * widens by PASSING a larger map — the option value REPLACES the default,
   * one full map, never merged. The `/bin/sh` layer itself injects its POSIX
   * built-ins `PWD`/`SHLVL`/`_` — the DECLARED gate-lane substrate residual
   * (F6c); confinement is pinned by CANARY ABSENCE, never env set-equality.
   */
  readonly envAllowlist?: Readonly<Record<string, string>>;
  /** C19's bounded grace before the seam's SIGKILL (default 10 000 ms — the
   * ratified default); validated at construction via the shared validator. */
  readonly graceMs?: number;
}

/** The runner interface mirrors the fail-closed slot's: `run` + the evidence
 * `resolve` affordance (the C26 contract's test surface) + `close`. */
export interface ProcessGateRunnerHandle extends ProcessGateRunner {
  resolve(logRef: string): ProcessGateEvidence | undefined;
  close(): void;
}

interface WorkspaceFacts {
  readonly headSha: string;
  readonly gitStatusHash: string;
}

export function createProcessGateRunner(
  evidenceDbPath: string,
  deps: ProcessGateRunnerDeps,
  options: ProcessGateRunnerOptions = {},
): ProcessGateRunnerHandle {
  const envAllowlist = options.envAllowlist ?? { PATH: process.env.PATH ?? "" };
  const graceMs = options.graceMs ?? 10_000;
  // GR1/GR8: fail-closed knob validation at construction through the SHARED
  // validator (the P3b-T2 rule). `timeoutMs` is PER-CALL and admission-owned —
  // the runner clamps it (GR8) and never rejects on magnitude.
  validateTimerKnobs([{ label: "graceMs", value: graceMs }]);

  // GR5: the W2 sibling-DB substrate reused byte-compatibly — the slot's
  // `resolve` reads the same rows; one evidence home per db path.
  const db = new DatabaseSync(evidenceDbPath);
  db.exec(
    `CREATE TABLE IF NOT EXISTS process_evidence (
       log_ref TEXT PRIMARY KEY,
       record  TEXT NOT NULL
     ) STRICT;`,
  );

  /**
   * GR4: measure the workspace facts IN the gate's cwd through the C19 seam,
   * AFTER the gate child concluded (the facts describe the workspace the gate
   * saw, at conclusion grain). `headSha` = trimmed `git rev-parse HEAD`
   * stdout; `gitStatusHash` = sha256 hex over the raw captured bytes of
   * `git status --porcelain=v1 -z`. ANY non-(clean exit 0) conclusion on
   * EITHER command → BOTH facts take the ONE sentinel.
   */
  async function measure(cwd: string): Promise<WorkspaceFacts> {
    const head = await disciplinedSpawn({
      cmd: "git",
      args: ["rev-parse", "HEAD"],
      cwd,
      env: envAllowlist,
      timeoutMs: MEASUREMENT_TIMEOUT_MS,
      graceMs: MEASUREMENT_GRACE_MS,
    });
    const status = await disciplinedSpawn({
      cmd: "git",
      args: ["status", "--porcelain=v1", "-z"],
      cwd,
      env: envAllowlist,
      timeoutMs: MEASUREMENT_TIMEOUT_MS,
      graceMs: MEASUREMENT_GRACE_MS,
    });
    const headOk = head.kind === "exit" && head.code === 0 && !head.timedOut;
    const statusOk = status.kind === "exit" && status.code === 0 && !status.timedOut;
    if (
      !headOk ||
      !statusOk ||
      head.kind !== "exit" ||
      status.kind !== "exit" ||
      // A bytes-less exit conclusion is unreachable from the real seam; if it
      // ever appears, the DECLARED sentinel — never a re-encoding fallback.
      status.stdoutBytes === undefined
    ) {
      return { headSha: MEASUREMENT_FAILED_SENTINEL, gitStatusHash: MEASUREMENT_FAILED_SENTINEL };
    }
    return {
      headSha: head.stdout.trim(),
      // GR4's letter: sha256 over the RAW captured stdout BYTES — the seam's
      // Buffer capture, NEVER a re-encoding of the decoded text (a chunk-split
      // multibyte sequence would otherwise corrupt the hashed bytes).
      gitStatusHash: createHash("sha256").update(status.stdoutBytes).digest("hex"),
    };
  }

  return {
    async run(
      command: string,
      runOptions: { readonly cwd: string; readonly stdin: string; readonly timeoutMs: number },
    ): Promise<ProcessResult> {
      const { cwd, stdin, timeoutMs } = runOptions;
      // GR8: the per-call clamp — admission admits timeoutMs with NO upper
      // bound while a raw setTimeout above 2^31−1 silently collapses to ~1 ms
      // (P6i). The clamped ceiling keeps the grace sum under the bound by
      // construction; a clamped run stays observable through the evidence.
      const effectiveTimeoutMs = Math.min(timeoutMs, TIMER_MAX_MS - graceMs);
      // IC-D: the injected time delta AROUND the gate child's execution.
      const startedAt = deps.time.now();
      const conclusion = await disciplinedSpawn({
        cmd: SHELL,
        args: ["-c", command],
        cwd,
        env: envAllowlist,
        timeoutMs: effectiveTimeoutMs,
        graceMs,
        stdin,
      });
      const endedAt = deps.time.now();
      const durationMs = Math.max(0, Math.trunc(endedAt - startedAt));

      // GR3: kind production, TOTAL over seam conclusions. The DELIBERATE
      // asymmetry with the delivery path's CL1 is flagged (F3): ANY
      // timedOut-flagged conclusion — signal AND code shapes alike, the P6h
      // delayed-exit race included — is kind `timeout` (the deadline elapsing
      // IS the runner's own timeout engaging; the race direction is
      // allow→block, never the reverse).
      let kind: ProcessGateEvidence["kind"];
      let exitCode: number | undefined;
      let stdout = "";
      let log: string;
      if (conclusion.kind === "infra") {
        kind = "runner_error";
        log = conclusion.message;
      } else {
        log = conclusion.stdout + conclusion.stderr;
        if (conclusion.timedOut) {
          kind = "timeout";
        } else if (conclusion.code === null) {
          // An UNFLAGGED signal conclusion — C21's foreign-kill class.
          kind = "runner_error";
        } else {
          // An UNFLAGGED code conclusion — nonzero INCLUDED (the kernel
          // classifies, mode-dependently).
          kind = "ok";
          exitCode = conclusion.code;
          stdout = conclusion.stdout;
        }
      }

      // GR4: measurement AFTER the gate child concludes; failure yields the
      // sentinel and NEVER changes the kind.
      const facts = await measure(cwd);

      // GR5: the COMPLETE per-kind C26 record is durably persisted BEFORE
      // run() resolves — every kind evidenced equally. An INSERT failure
      // THROWS out of run() (the W2 lane): never a returned-but-unresolvable
      // ref; the throw propagates to the kernel's pre-commit internal-failure
      // path, fail-closed.
      const logRef = randomUUID();
      const record: ProcessGateEvidence =
        kind === "ok"
          ? { log, kind, exitCode: exitCode as number, durationMs, ...facts }
          : { log, kind, durationMs, ...facts };
      db.prepare("INSERT INTO process_evidence (log_ref, record) VALUES (?, ?)").run(
        logRef,
        JSON.stringify(record),
      );

      return kind === "ok"
        ? { kind, exitCode: exitCode as number, stdout, logRef, durationMs }
        : { kind, logRef, durationMs };
    },
    resolve(logRef: string): ProcessGateEvidence | undefined {
      const row = db
        .prepare("SELECT record FROM process_evidence WHERE log_ref = ?")
        .get(logRef) as { record: string } | undefined;
      return row === undefined ? undefined : (JSON.parse(row.record) as ProcessGateEvidence);
    },
    close(): void {
      db.close();
    },
  };
}
