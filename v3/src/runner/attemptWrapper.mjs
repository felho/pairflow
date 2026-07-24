#!/usr/bin/env node
/**
 * The RESULT WRAPPER asset (RS1; packet ch9-p3b) — a plain `.mjs` spawned by
 * the actor adapter as `process.execPath <thisFile> <graceMs> <resultPath>
 * <attemptId> <cmd> <args...>` (no TS loader dependency). Deliberately TRIVIAL:
 * spawn the mapped actor argv, forward SIGTERM, arm an own bounded-grace
 * SIGKILL, ATOMICALLY write one result file, exit 0. Every feature added here
 * enlarges the wrapper-integrity surface RS2 must fail-closed against — do NOT
 * add logic.
 *
 * The actor inherits the wrapper's ALREADY-CONFINED environment with ZERO
 * additions (the transitive-confinement pin: the seam replaced the wrapper's
 * env, the wrapper passes exactly that through) and the wrapper's cwd (C17's
 * value, set by the seam). stdio is pass-through, so the actor's output flows
 * into the seam's capture (diagnostic-only for actors — the load-bearing
 * handoff is file-based, C23).
 */
import { spawn } from "node:child_process";
import { renameSync, writeFileSync } from "node:fs";

const graceMs = Number(process.argv[2]);
const resultPath = process.argv[3];
const attemptId = process.argv[4];
const cmd = process.argv[5];
const args = process.argv.slice(6);

let termForwarded = false;
let graceTimer;
let concluded = false;

const child = spawn(cmd, args, {
  cwd: process.cwd(),
  env: process.env, // ZERO additions — the seam already confined this env
  stdio: "inherit",
});

function conclude(exitCode, signal) {
  if (concluded) {
    return;
  }
  concluded = true;
  if (graceTimer !== undefined) {
    clearTimeout(graceTimer);
  }
  // ATOMIC write (tmp + rename, same directory): the result appears at its
  // final path in one filesystem operation, never a torn read.
  const record = JSON.stringify({ attemptId, exitCode, signal, termForwarded });
  const tmp = `${resultPath}.tmp`;
  writeFileSync(tmp, record);
  renameSync(tmp, resultPath);
  process.exit(0);
}

process.on("SIGTERM", () => {
  // Forward TERM to the actor (a KILL delivered to us could never be
  // forwarded), then arm our OWN grace SIGKILL — a TERM-ignoring actor is
  // killed at the grace (SD3; the seam's outer backstop fires only later).
  termForwarded = true;
  child.kill("SIGTERM");
  graceTimer = setTimeout(() => {
    child.kill("SIGKILL");
  }, graceMs);
});

child.on("error", () => {
  // The actor binary failed to spawn — leave NO result file and exit cleanly
  // (the adapter reads a clean-exit-no-result wrapper as spawn_infra).
  if (concluded) {
    return;
  }
  concluded = true;
  if (graceTimer !== undefined) {
    clearTimeout(graceTimer);
  }
  process.exit(0);
});

child.on("exit", (code, signal) => {
  conclude(code ?? null, signal ?? null);
});
