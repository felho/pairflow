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

  it("rejects PASS envelope when blocker finding has no finding refs and envelope refs are empty", () => {
    const result = validateProtocolEnvelope({
      id: "msg_001b",
      ts: "2026-02-21T12:34:56.000Z",
      bubble_id: "b_test_01",
      sender: "claude",
      recipient: "codex",
      type: "PASS",
      round: 1,
      payload: {
        summary: "Found blocker",
        findings: [
          {
            severity: "P1",
            title: "Race condition"
          }
        ]
      },
      refs: []
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(
      result.errors.some((error) => error.path === "payload.findings[0].refs")
    ).toBe(true);
  });

  it("accepts PASS envelope when blocker finding uses explicit finding refs", () => {
    const result = validateProtocolEnvelope({
      id: "msg_001c",
      ts: "2026-02-21T12:34:56.000Z",
      bubble_id: "b_test_01",
      sender: "claude",
      recipient: "codex",
      type: "PASS",
      round: 1,
      payload: {
        summary: "Found blocker",
        findings: [
          {
            severity: "P1",
            title: "Race condition",
            refs: ["artifact://review/race-proof.md"]
          }
        ]
      },
      refs: []
    });

    expect(result.ok).toBe(true);
  });

  it("rejects PASS envelope when blocker finding omits finding refs even if envelope refs exist", () => {
    const result = validateProtocolEnvelope({
      id: "msg_001d",
      ts: "2026-02-21T12:34:56.000Z",
      bubble_id: "b_test_01",
      sender: "claude",
      recipient: "codex",
      type: "PASS",
      round: 1,
      payload: {
        summary: "Found blocker",
        findings: [
          {
            severity: "P0",
            title: "Data loss risk"
          }
        ]
      },
      refs: ["artifact://review/blocker-proof.md"]
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(
      result.errors.some((error) => error.path === "payload.findings[0].refs")
    ).toBe(true);
  });

  it("rejects PASS envelope mismatch when one blocker finding misses refs and no envelope refs exist", () => {
    const result = validateProtocolEnvelope({
      id: "msg_001e",
      ts: "2026-02-21T12:34:56.000Z",
      bubble_id: "b_test_01",
      sender: "claude",
      recipient: "codex",
      type: "PASS",
      round: 1,
      payload: {
        summary: "Mixed blocker evidence",
        findings: [
          {
            severity: "P1",
            title: "Race condition",
            refs: ["artifact://review/race-proof.md"]
          },
          {
            severity: "P0",
            title: "Data loss risk"
          }
        ]
      },
      refs: []
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(
      result.errors.some((error) => error.path === "payload.findings[1].refs")
    ).toBe(true);
  });

  it("does not duplicate blocker refs errors when finding refs already fail schema validation", () => {
    const result = validateProtocolEnvelope({
      id: "msg_001f",
      ts: "2026-02-21T12:34:56.000Z",
      bubble_id: "b_test_01",
      sender: "claude",
      recipient: "codex",
      type: "PASS",
      round: 1,
      payload: {
        summary: "Found blocker",
        findings: [
          {
            severity: "P1",
            title: "Race condition",
            refs: [""]
          }
        ]
      },
      refs: []
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    const refsErrors = result.errors.filter(
      (error) => error.path === "payload.findings[0].refs"
    );
    expect(refsErrors).toHaveLength(1);
  });

  it("rejects non-array refs for blocker findings with a single refs schema error", () => {
    const result = validateProtocolEnvelope({
      id: "msg_001f_string_refs",
      ts: "2026-02-21T12:34:56.000Z",
      bubble_id: "b_test_01",
      sender: "claude",
      recipient: "codex",
      type: "PASS",
      round: 1,
      payload: {
        summary: "Found blocker",
        findings: [
          {
            severity: "P0",
            title: "Data loss risk",
            refs: "artifact://review/proof.md"
          }
        ]
      },
      refs: []
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    const refsErrors = result.errors.filter(
      (error) => error.path === "payload.findings[0].refs"
    );
    expect(refsErrors).toHaveLength(1);
    expect(refsErrors[0]?.message).toMatch(/array of non-empty strings/u);
  });

  it("still enforces blocker refs when finding title is invalid", () => {
    const result = validateProtocolEnvelope({
      id: "msg_001g",
      ts: "2026-02-21T12:34:56.000Z",
      bubble_id: "b_test_01",
      sender: "claude",
      recipient: "codex",
      type: "PASS",
      round: 1,
      payload: {
        summary: "Found blocker",
        findings: [
          {
            severity: "P1",
            title: ""
          }
        ]
      },
      refs: []
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(
      result.errors.some((error) => error.path === "payload.findings[0].title")
    ).toBe(true);
    expect(
      result.errors.some((error) => error.path === "payload.findings[0].refs")
    ).toBe(true);
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
