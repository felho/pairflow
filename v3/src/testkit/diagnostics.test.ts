import { describe, expect, it } from "vitest";

import { createRecordingDiagnosticsSink } from "./diagnostics.js";

describe("recording diagnostics sink (packet ch7-P1)", () => {
  it("records bodies VERBATIM — no stamping, no reshaping", () => {
    const rec = createRecordingDiagnosticsSink();
    const body = {
      source: "kernel",
      kind: "duplicate",
      instanceId: "i-1",
      opId: "o-1",
      actorId: "a",
      type: "PASS",
      payloadDigest: "d",
    } as const;
    rec.sink.emit(body);
    expect(rec.events).toEqual([body]);
    expect(rec.events[0]).toBe(body);
    expect(Object.keys(rec.events[0] ?? {})).not.toContain("at");
    expect(Object.keys(rec.events[0] ?? {})).not.toContain("ordinal");
  });

  it("emit returns void and never throws (the port contract, trivially)", () => {
    const rec = createRecordingDiagnosticsSink();
    expect(
      rec.sink.emit({ source: "ingress", kind: "rejected", reason: "invalid_shape" }),
    ).toBeUndefined();
    expect(rec.events).toHaveLength(1);
  });
});
