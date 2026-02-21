import { describe, expect, it } from "vitest";

import { validateProtocolEnvelope } from "../../../src/core/protocol/validators.js";

describe("protocol envelope schema", () => {
  it("accepts PASS envelope with optional intent and findings", () => {
    const result = validateProtocolEnvelope({
      id: "msg_001",
      ts: "2026-02-21T12:34:56.000Z",
      bubble_id: "b_test_01",
      sender: "codex",
      recipient: "claude",
      type: "PASS",
      round: 1,
      payload: {
        summary: "Implemented schema module",
        pass_intent: "task",
        findings: [
          {
            severity: "P2",
            title: "Edge case not covered"
          }
        ],
        metadata: {
          source: "review-loop"
        }
      },
      refs: ["artifact://diff/round-1.patch"]
    });

    expect(result.ok).toBe(true);
  });

  it("rejects PASS envelope with invalid severity in findings", () => {
    const result = validateProtocolEnvelope({
      id: "msg_001",
      ts: "2026-02-21T12:34:56.000Z",
      bubble_id: "b_test_01",
      sender: "codex",
      recipient: "claude",
      type: "PASS",
      round: 1,
      payload: {
        summary: "Implemented schema module",
        findings: [
          {
            severity: "P5",
            title: "Invalid severity"
          }
        ]
      },
      refs: ["artifact://diff/round-1.patch"]
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(
      result.errors.some((error) =>
        error.path.includes("payload.findings[0].severity")
      )
    ).toBe(true);
  });

  it("rejects unknown payload keys", () => {
    const result = validateProtocolEnvelope({
      id: "msg_002",
      ts: "2026-02-21T12:34:56.000Z",
      bubble_id: "b_test_01",
      sender: "codex",
      recipient: "claude",
      type: "PASS",
      round: 1,
      payload: {
        summary: "Implemented schema module",
        extra_field: "unexpected"
      },
      refs: ["artifact://diff/round-1.patch"]
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors.some((error) => error.path === "payload.extra_field")).toBe(
      true
    );
  });
});
