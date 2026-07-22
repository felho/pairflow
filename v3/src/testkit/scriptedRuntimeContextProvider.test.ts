import { describe, expect, it } from "vitest";

import type { InstanceId, RuntimeContextRef } from "../domain/index.js";
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

  it("fireOnProvision fires the configured READY through the bound completion sink", async () => {
    const delivered: { instanceId: InstanceId; requestId: string; ref: RuntimeContextRef }[] = [];
    const provider = createScriptedRuntimeContextProvider({ script: [{ fireOnProvision: REF }] });
    provider.bindCompletionSink((instanceId, requestId, ref) => {
      delivered.push({ instanceId, requestId, ref });
    });
    await provider.provision("i1", "r1", SPEC);
    expect(delivered).toEqual([{ instanceId: "i1", requestId: "r1", ref: REF }]);
  });

  it("fireOnProvision without a bound sink throws (a wiring error)", () => {
    const provider = createScriptedRuntimeContextProvider({ script: [{ fireOnProvision: REF }] });
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
});
