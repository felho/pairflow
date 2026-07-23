import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { classifyProcessResult } from "../kernel/processGate.js";
import type { EffectiveProcessConfig } from "../domain/index.js";
import type { ProcessGateEvidence } from "../ports/index.js";
import {
  createFailClosedProcessGateRunner,
  deriveProcessEvidenceDbPath,
  FAIL_CLOSED_GIT_STATUS_HASH,
  FAIL_CLOSED_HEAD_SHA,
  FAIL_CLOSED_UNAVAILABLE_LOG,
} from "./failClosedProcessGateRunner.js";

/** The COMPLETE C26 record the fail-closed slot mints — exact field set, no
 * extras (the deep-equality drive surface for both run-time and re-open). */
const EXPECTED_RECORD: ProcessGateEvidence = {
  log: FAIL_CLOSED_UNAVAILABLE_LOG,
  kind: "runner_error",
  durationMs: 0,
  headSha: FAIL_CLOSED_HEAD_SHA,
  gitStatusHash: FAIL_CLOSED_GIT_STATUS_HASH,
};

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
    // The WHOLE record deep-equals the expected C26 shape — exact field set, no
    // extras (a stray or renamed field turns this red).
    expect(runner.resolve(result.logRef)).toEqual(EXPECTED_RECORD);
    runner.close();
  });

  it("classification of the returned result blocks (gate_blocked(sys:runner_error))", async () => {
    const runner = createFailClosedProcessGateRunner(":memory:");
    const result = await runner.run("cmd", OPTS);
    const effective: EffectiveProcessConfig = {
      command: "cmd",
      timeoutMs: 1000,
      output: { mode: "exitCode" },
      onExit: { zero: "allow", nonzero: "block" },
      onRunnerError: "blockTransition",
      onTimeout: "blockTransition",
      reason: { zero: "sys:exit_zero", nonzero: "test_failed" },
    };
    expect(classifyProcessResult(result, effective)).toEqual({
      verdict: "block",
      reason: "sys:runner_error",
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
    // The REOPENED record deep-equals the ORIGINAL whole record (not just kind)
    // — durability is faithful across the process boundary, field-for-field.
    expect(second.resolve(result.logRef)).toEqual(EXPECTED_RECORD);
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
