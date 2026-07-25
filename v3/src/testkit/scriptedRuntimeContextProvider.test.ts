import { describe, expect, it } from "vitest";

import type { InstanceId, RuntimeContextCompletion, RuntimeContextRef } from "../domain/index.js";
import { createScriptedRuntimeContextProvider } from "./scriptedRuntimeContextProvider.js";

/**
 * The scripted runtime-context provider's own contract (packet ch12-p3, PR3):
 * records provision calls, plays configured behavior (detach / fire / hostile
 * / breach), and gates its projection return canonical-JSON-safe.
 */

const SPEC = { kind: "worktree", provider: "pairflow.worktree" } as const;
const REF: RuntimeContextRef = { kind: "worktree", locator: "/ws/x" };

describe("scriptedRuntimeContextProvider (PR3)", () => {
  it("RECORDS provision calls in order (instanceId, requestId, spec), detaching by default", async () => {
    const provider = createScriptedRuntimeContextProvider();
    await provider.provision("i1", "r1", SPEC);
    await provider.provision("i2", "r2", SPEC);
    expect(provider.provisionCalls).toEqual([
      { instanceId: "i1", requestId: "r1", spec: SPEC },
      { instanceId: "i2", requestId: "r2", spec: SPEC },
    ]);
  });

  it("fireOnProvision fires the configured READY completion through the bound sink", async () => {
    const delivered: { instanceId: InstanceId; requestId: string; completion: RuntimeContextCompletion }[] =
      [];
    const provider = createScriptedRuntimeContextProvider({ script: [{ fireOnProvision: REF }] });
    provider.bindCompletionSink((instanceId, requestId, completion) => {
      delivered.push({ instanceId, requestId, completion });
    });
    await provider.provision("i1", "r1", SPEC);
    expect(delivered).toEqual([
      { instanceId: "i1", requestId: "r1", completion: { kind: "ready", ref: REF } },
    ]);
  });

  it("fireOnProvision without a bound sink throws (a wiring error)", () => {
    const provider = createScriptedRuntimeContextProvider({ script: [{ fireOnProvision: REF }] });
    expect(() => void provider.provision("i1", "r1", SPEC)).toThrow(/bound completion sink/);
  });

  it("K1: failOnProvision fires a FAILED completion through the sink AFTER the record", async () => {
    const delivered: RuntimeContextCompletion[] = [];
    const provider = createScriptedRuntimeContextProvider({
      script: [{ failOnProvision: { reason: "sys:provision_failed", detail: "git exit 128" } }],
    });
    provider.bindCompletionSink((_i, _r, completion) => {
      delivered.push(completion);
    });
    await provider.provision("i1", "r1", SPEC);
    // Record-before-outcome: the call is recorded regardless of the fire.
    expect(provider.provisionCalls).toEqual([{ instanceId: "i1", requestId: "r1", spec: SPEC }]);
    expect(delivered).toEqual([
      { kind: "failed", reason: "sys:provision_failed", detail: "git exit 128" },
    ]);
  });

  it("K1: record-before-outcome is observable AT FIRE TIME — the FAILED sink sees its own provision call already recorded", async () => {
    // The blindness this closes: asserting provisionCalls AFTER the await cannot
    // distinguish record-before-fire from record-after-fire. Read the record
    // length INSIDE the sink callback (at the synchronous fire point) instead.
    let recordedAtFire: number | null = null;
    const provider = createScriptedRuntimeContextProvider({
      script: [{ failOnProvision: { reason: "sys:provision_failed" } }],
    });
    provider.bindCompletionSink(() => {
      recordedAtFire = provider.provisionCalls.length;
    });
    await provider.provision("i1", "r1", SPEC);
    // The call was ALREADY recorded when the FAILED completion fired.
    expect(recordedAtFire).toBe(1);
  });

  it("K1: the WIDE reason type passes a HOSTILE (out-of-domain) token through UNALTERED", async () => {
    const delivered: RuntimeContextCompletion[] = [];
    const provider = createScriptedRuntimeContextProvider({
      // A bare un-prefixed token — the player never classifies; the kernel gate does.
      script: [{ failOnProvision: { reason: "provision_failed" } }],
    });
    provider.bindCompletionSink((_i, _r, completion) => {
      delivered.push(completion);
    });
    await provider.provision("i1", "r1", SPEC);
    // No `detail` when the script omits it (exactOptionalPropertyTypes: absent, not undefined).
    expect(delivered).toEqual([{ kind: "failed", reason: "provision_failed" }]);
  });

  it("K2: a READY-then-FAILED combination script fires in the DECLARED field order (ready first)", async () => {
    const delivered: RuntimeContextCompletion[] = [];
    const provider = createScriptedRuntimeContextProvider({
      script: [{ fireOnProvision: REF, failOnProvision: { reason: "sys:provision_rejected" } }],
    });
    provider.bindCompletionSink((_i, _r, completion) => {
      delivered.push(completion);
    });
    await provider.provision("i1", "r1", SPEC);
    expect(delivered).toEqual([
      { kind: "ready", ref: REF },
      { kind: "failed", reason: "sys:provision_rejected" },
    ]);
  });

  it("failOnProvision without a bound sink throws (a wiring error, the fireOnProvision culture)", () => {
    const provider = createScriptedRuntimeContextProvider({
      script: [{ failOnProvision: { reason: "sys:provision_failed" } }],
    });
    expect(() => void provider.provision("i1", "r1", SPEC)).toThrow(/bound completion sink/);
  });

  it("throwOnProvision is a SYNCHRONOUS throw (S4 port breach)", () => {
    const provider = createScriptedRuntimeContextProvider({ script: [{ throwOnProvision: true }] });
    expect(() => void provider.provision("i1", "r1", SPEC)).toThrow(/port breach/i);
    // The call was still RECORDED (record-before-outcome).
    expect(provider.provisionCalls).toHaveLength(1);
  });

  it("rejectAck rejects the detach acknowledgment (S4 port breach)", async () => {
    const provider = createScriptedRuntimeContextProvider({ script: [{ rejectAck: true }] });
    await expect(provider.provision("i1", "r1", SPEC)).rejects.toThrow(/port breach/i);
    expect(provider.provisionCalls).toHaveLength(1);
  });

  it("projectForActor returns the configured projection (opaque, canonical-JSON-safe)", () => {
    const provider = createScriptedRuntimeContextProvider({
      projection: { workspace: "/ws/x", branch: "b" },
    });
    expect(provider.projectForActor(REF)).toEqual({ workspace: "/ws/x", branch: "b" });
  });

  it("projectForActor GATES its return canonical-JSON-safe (PR4) — a lossy value throws", () => {
    const provider = createScriptedRuntimeContextProvider({
      projection: { bad: Number.POSITIVE_INFINITY },
    });
    expect(() => provider.projectForActor(REF)).toThrow(/canonical-JSON-safe/);
  });

  it("the default projection is a deterministic { workspace, kind } view of the ref", () => {
    const provider = createScriptedRuntimeContextProvider();
    expect(provider.projectForActor(REF)).toEqual({ workspace: "/ws/x", kind: "worktree" });
  });

  // ── TK1 (packet ch9-p4a): the LocalExecutionCapability facet ──────────────
  it("TK1: resolveLocalWorkingDirectory returns the ref's STRING locator VERBATIM (the scripted world's own minted shape)", () => {
    const provider = createScriptedRuntimeContextProvider();
    expect(provider.resolveLocalWorkingDirectory(REF)).toBe("/ws/x");
    // Verbatim — untrimmed, un-normalized (the E2 confinement culture).
    const hostile: RuntimeContextRef = { kind: "worktree", locator: "  ../x  " };
    expect(provider.resolveLocalWorkingDirectory(hostile)).toBe("  ../x  ");
  });

  it("TK1: a NON-STRING locator in the scripted world is a fixture-integrity THROW", () => {
    const provider = createScriptedRuntimeContextProvider();
    const objectRef: RuntimeContextRef = {
      kind: "worktree",
      locator: { path: "/ws/x", branch: "b", repo: "r", base_commit: "c" },
    };
    expect(() => provider.resolveLocalWorkingDirectory(objectRef)).toThrow(/string locator/i);
  });
});
