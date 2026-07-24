import { describe, expect, it } from "vitest";

import type { DispatchIntent } from "../domain/index.js";
import type { AttemptExecutorInput } from "../ports/delivery.js";
import { createScriptedAttemptExecutor } from "./scriptedAttemptExecutor.js";

// K3 selftest (packet ch9-p3a): the scripted delivery executor — script order,
// input recording, the mid-attempt observe hook, exhaustion.

function intentFor(actor: string): DispatchIntent {
  return {
    actor,
    packet: {
      instanceId: "inst-1",
      expectedVersion: 2,
      task: "t",
      role: "implementer",
      instruction: "build it",
      availableOps: ["PASS"],
      effectiveAgentConfig: {},
      runtimeContext: "none",
    },
  };
}

function inputFor(actor: string, attemptId: string, sessionName: string): AttemptExecutorInput {
  return { intent: intentFor(actor), attemptId, sessionName };
}

describe("scriptedAttemptExecutor (K3)", () => {
  it("plays results in order and records every input", async () => {
    const exec = createScriptedAttemptExecutor([
      { kind: "no_output" },
      { kind: "name_collision" },
      { kind: "infra_failure", class: "nonzero_exit" },
    ]);
    expect(await exec.execute(inputFor("codex", "a1", "s1"))).toEqual({ kind: "no_output" });
    expect(await exec.execute(inputFor("claude", "a2", "s2"))).toEqual({ kind: "name_collision" });
    expect(await exec.execute(inputFor("codex", "a3", "s3"))).toEqual({
      kind: "infra_failure",
      class: "nonzero_exit",
    });
    expect(exec.calls.map((c) => [c.input.attemptId, c.input.sessionName, c.input.intent.actor])).toEqual([
      ["a1", "s1", "codex"],
      ["a2", "s2", "claude"],
      ["a3", "s3", "codex"],
    ]);
  });

  it("a scripted rejection rejects the promise (the K2 lane driver)", async () => {
    const exec = createScriptedAttemptExecutor([{ reject: "spawn boom" }]);
    await expect(exec.execute(inputFor("codex", "a1", "s1"))).rejects.toThrow("spawn boom");
  });

  it("the observe hook fires SYNCHRONOUSLY before the result (B1 ordering)", async () => {
    const seen: string[] = [];
    const exec = createScriptedAttemptExecutor([{ kind: "no_output" }], {
      observe: (input) => seen.push(`observed:${input.attemptId}`),
    });
    const promise = exec.execute(inputFor("codex", "mid", "s"));
    expect(seen).toEqual(["observed:mid"]); // ran already, before the await
    await promise;
  });

  it("exhausting the script rejects loudly (deterministic, never a hang)", async () => {
    const exec = createScriptedAttemptExecutor([{ kind: "no_output" }]);
    await exec.execute(inputFor("codex", "a1", "s1"));
    await expect(exec.execute(inputFor("codex", "a2", "s2"))).rejects.toThrow("script exhausted");
  });
});
