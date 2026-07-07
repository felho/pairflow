import { randomUUID } from "node:crypto";

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
  readonly time: TimeSource;
  /** Production instance-id minting (the StorePort contract's "lands
   * with the ch-6 CLI"): crypto in production, deterministic in tests.
   * Kernel and store stay randomness-free. */
  readonly instanceIdSource: () => string;
  /** ADR-004 operator family: one nonce per logical invocation. */
  readonly nonceSource: NonceSource;
  readonly tailWait: (pollMs: number) => TailWait;
  readonly env: Readonly<Record<string, string | undefined>>;
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

export function productionDeps(): CliDeps {
  return {
    openStore: (path, time) => openStore(path, time),
    time: wallClockTimeSource,
    instanceIdSource: () => randomUUID(),
    nonceSource: cryptoNonceSource,
    tailWait: realTimerTailWait,
    env: process.env,
  };
}
