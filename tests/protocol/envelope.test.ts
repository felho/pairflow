import { describe, expect, it } from "vitest";

import {
  parseEnvelopeLine,
  serializeEnvelopeLine
} from "../../src/core/protocol/envelope.js";

describe("protocol NDJSON helpers", () => {
  it("serializes and parses a valid envelope line", () => {
    const line = serializeEnvelopeLine({
      id: "msg_100",
      ts: "2026-02-21T12:34:56.000Z",
      bubble_id: "b_test_01",
      sender: "orchestrator",
      recipient: "codex",
      type: "TASK",
      round: 0,
      payload: {
        summary: "Start work"
      },
      refs: []
    });

    expect(line.endsWith("\n")).toBe(true);
    const parsed = parseEnvelopeLine(line);
    expect(parsed.id).toBe("msg_100");
    expect(parsed.type).toBe("TASK");
  });

  it("throws on empty NDJSON line", () => {
    expect(() => parseEnvelopeLine("   ")).toThrow(
      /Cannot parse an empty NDJSON line/u
    );
  });
});
