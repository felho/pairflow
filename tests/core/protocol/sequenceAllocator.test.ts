import { describe, expect, it } from "vitest";

import {
  allocateNextProtocolSequence,
  TranscriptSequenceError
} from "../../../src/core/protocol/sequenceAllocator.js";
import type { ProtocolEnvelope } from "../../../src/types/protocol.js";

function buildEnvelope(id: string): ProtocolEnvelope {
  return {
    id,
    ts: "2026-02-21T12:00:00.000Z",
    bubble_id: "b_protocol_01",
    sender: "codex",
    recipient: "claude",
    type: "PASS",
    round: 1,
    payload: {
      summary: "handoff"
    },
    refs: []
  };
}

describe("allocateNextProtocolSequence", () => {
  it("allocates sequence 1 for empty transcript", () => {
    const now = new Date("2026-02-21T12:34:56.000Z");

    const allocation = allocateNextProtocolSequence([], now);

    expect(allocation.sequence).toBe(1);
    expect(allocation.messageId).toBe("msg_20260221_001");
  });

  it("allocates next sequence based on strict transcript continuity", () => {
    const now = new Date("2026-02-22T00:00:00.000Z");

    const allocation = allocateNextProtocolSequence(
      [
        buildEnvelope("msg_20260221_001"),
        buildEnvelope("msg_20260221_002"),
        buildEnvelope("msg_20260221_003")
      ],
      now
    );

    expect(allocation.sequence).toBe(4);
    expect(allocation.messageId).toBe("msg_20260222_004");
  });

  it("rejects invalid id format", () => {
    expect(() =>
      allocateNextProtocolSequence([buildEnvelope("custom-id")])
    ).toThrow(TranscriptSequenceError);
  });

  it("rejects sequence gaps", () => {
    expect(() =>
      allocateNextProtocolSequence([
        buildEnvelope("msg_20260221_001"),
        buildEnvelope("msg_20260221_003")
      ], new Date("2026-02-21T12:00:00.000Z"), { strictAudit: true })
    ).toThrow(/gap detected/u);
  });

  it("rejects duplicate sequence numbers", () => {
    expect(() =>
      allocateNextProtocolSequence([
        buildEnvelope("msg_20260221_001"),
        buildEnvelope("msg_20260222_001")
      ], new Date("2026-02-21T12:00:00.000Z"), { strictAudit: true })
    ).toThrow(/Duplicate envelope sequence/u);
  });

  it("uses fast-path allocation from last envelope by default", () => {
    const allocation = allocateNextProtocolSequence(
      [
        buildEnvelope("msg_20260221_001"),
        buildEnvelope("msg_20260221_003")
      ],
      new Date("2026-02-21T12:00:00.000Z")
    );

    expect(allocation.sequence).toBe(4);
    expect(allocation.messageId).toBe("msg_20260221_004");
  });
});
