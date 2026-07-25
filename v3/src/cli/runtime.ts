import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

import type { DiagStoreHandle } from "../diag/index.js";
import { openDiagStore } from "../diag/index.js";
import type { NonceSource } from "../emit/index.js";
import { cryptoNonceSource } from "../emit/index.js";
import type { TailWait } from "../ports/tail.js";
import type { TimeSource } from "../ports/time.js";
import type { StoreHandle } from "../store/index.js";
import { openStore } from "../store/index.js";

/**
 * The CLI runtime seam (packet ch6-P4a). `runCli(argv, deps, sinks)`
 * is the unit-testable surface; `productionDeps()` is the ONE place
 * the shipped entrypoint binds real resources — wall clock, crypto id
 * and nonce sources, real poll timer, process env. Config resolution
 * (the runtime config matrix) lives in main.ts's resolver and is the
 * config owner; this module owns only the bindings.
 */
export interface CliDeps {
  readonly openStore: (path: string, time: TimeSource) => StoreHandle;
  /** The diag channel on the DERIVED path (packet ch7-P4, C1/V7): real
   * in production, scriptable in tests (C4's zero-call assert, the
   * scripted mid-stream handles). `openDiagStore` never throws (C2). */
  readonly openDiagStore: (path: string, time: TimeSource) => DiagStoreHandle;
  readonly time: TimeSource;
  /** Production instance-id minting (the StorePort contract's "lands
   * with the ch-6 CLI"): crypto in production, deterministic in tests.
   * Kernel and store stay randomness-free. */
  readonly instanceIdSource: () => string;
  /** ADR-004 operator family: one nonce per logical invocation. */
  readonly nonceSource: NonceSource;
  readonly tailWait: (pollMs: number) => TailWait;
  readonly env: Readonly<Record<string, string | undefined>>;
  /** T1 (packet ch9-p4b): the durable per-attempt id the delivery loop mints
   * (C16 — a collision-resistant crypto UUID in production, deterministic in
   * tests). Kernel and store stay randomness-free — the loop reads this seam. */
  readonly attemptIdSource: () => string;
  /** T1 (packet ch9-p4b): this worker's claim identity for a `runner run` /
   * `runner respawn` composition (claims are scheduling-only, L3). Production:
   * `"cli-" + <crypto UUID>`. */
  readonly workerIdSource: () => string;
  /** AT2 (packet ch9-p4b, flag F6): the interactive attach exec seam.
   * Production spawns the tmux client with `stdio: "inherit"` (the operator's
   * own tty IS the pane view — attach is C23's observe surface, nothing is
   * captured) and awaits its exit code; tests bind a recording fake. A signal
   * conclusion (code null) reports a nonzero exit (the AT1 internal lane). */
  readonly runInteractive: (cmd: string, args: readonly string[]) => Promise<number>;
}

export const wallClockTimeSource: TimeSource = {
  now: () => Date.now(),
};

/** The production TailWait binding — the P2 packet deferred it HERE. */
export function realTimerTailWait(pollMs: number): TailWait {
  return () =>
    new Promise((resolve) => {
      setTimeout(resolve, pollMs);
    });
}

/** AT2 production binding: spawn the tmux client attached to the operator's
 * own tty (`stdio: "inherit"`) and await its exit — pane bytes flow through
 * the inherited tty, no CLI document. A signal conclusion reports nonzero. */
export function realRunInteractive(cmd: string, args: readonly string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(cmd, [...args], { stdio: "inherit" });
    child.on("error", () => {
      resolve(1);
    });
    child.on("exit", (code) => {
      resolve(code ?? 1);
    });
  });
}

export function productionDeps(): CliDeps {
  return {
    openStore: (path, time) => openStore(path, time),
    openDiagStore: (path, time) => openDiagStore(path, time),
    time: wallClockTimeSource,
    instanceIdSource: () => randomUUID(),
    nonceSource: cryptoNonceSource,
    tailWait: realTimerTailWait,
    env: process.env,
    attemptIdSource: () => randomUUID(),
    workerIdSource: () => `cli-${randomUUID()}`,
    runInteractive: realRunInteractive,
  };
}
