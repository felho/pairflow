import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { classifyProcessResult } from "../kernel/processGate.js";
import type { EffectiveProcessConfig } from "../domain/index.js";
import {
  createFailClosedProcessGateRunner,
  deriveProcessEvidenceDbPath,
  FAIL_CLOSED_GIT_STATUS_HASH,
  FAIL_CLOSED_HEAD_SHA,
} from "./failClosedProcessGateRunner.js";

/**
 * The fail-closed composition slot (packet ch11-P3b, W2): never spawns, never
 * allows; every run() durably persists a COMPLETE C26 record BEFORE resolving,
 * and a persistence failure THROWS rather than minting a dead ref.
 */

const OPTS = { cwd: "/ws", stdin: "{}", timeoutMs: 1000 };
const dirs: string[] = [];
function tempPath(): string {
  const dir = mkdtempSync(join(tmpdir(), "v3-failclosed-"));
  dirs.push(dir);
  return join(dir, "store.db");
}
afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("failClosedProcessGateRunner — the W2 durable slot", () => {
  it("run() returns a runner_error result (durationMs 0) whose ref resolves to a COMPLETE C26 record", async () => {
    const runner = createFailClosedProcessGateRunner(":memory:");
    const result = await runner.run("cmd", OPTS);
    expect(result.kind).toBe("runner_error");
    expect(result.durationMs).toBe(0);
    const record = runner.resolve(result.logRef);
    expect(record?.kind).toBe("runner_error");
    expect(record?.durationMs).toBe(0);
    expect(record?.headSha).toBe(FAIL_CLOSED_HEAD_SHA);
    expect(record?.gitStatusHash).toBe(FAIL_CLOSED_GIT_STATUS_HASH);
    expect(record?.log).toContain("unavailable");
    runner.close();
  });

  it("classification of the returned result blocks (gate_blocked(runner_error))", async () => {
    const runner = createFailClosedProcessGateRunner(":memory:");
    const result = await runner.run("cmd", OPTS);
    const effective: EffectiveProcessConfig = {
      command: "cmd",
      timeoutMs: 1000,
      output: { mode: "exitCode" },
      onExit: { zero: "allow", nonzero: "block" },
      onRunnerError: "blockTransition",
      onTimeout: "blockTransition",
      reason: { zero: "exit_zero", nonzero: "test_failed" },
    };
    expect(classifyProcessResult(result, effective)).toEqual({
      verdict: "block",
      reason: "runner_error",
      evidenceRefs: [result.logRef],
    });
    runner.close();
  });

  it("the record RESOLVES across a re-open of the same durable path (persisted BEYOND the process)", async () => {
    const path = tempPath();
    const evidencePath = deriveProcessEvidenceDbPath(path);
    const first = createFailClosedProcessGateRunner(evidencePath);
    const result = await first.run("cmd", OPTS);
    first.close();

    const second = createFailClosedProcessGateRunner(evidencePath);
    const record = second.resolve(result.logRef);
    expect(record?.kind).toBe("runner_error");
    second.close();
  });

  it("a persistence failure THROWS (never a returned-but-unresolvable ref)", () => {
    const runner = createFailClosedProcessGateRunner(":memory:");
    runner.close(); // the substrate is now unwritable
    expect(() => runner.run("cmd", OPTS)).toThrow();
  });

  it("deriveProcessEvidenceDbPath is a textual sibling of the store DB", () => {
    expect(deriveProcessEvidenceDbPath("/x/store.db")).toBe("/x/store.db.process-evidence.sqlite");
  });
});
