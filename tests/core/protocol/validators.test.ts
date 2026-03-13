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
        findings_claim_state: "open_findings",
        findings_claim_source: "payload_findings_count",
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

  it("accepts PASS envelope when blocker finding has no finding refs and envelope refs are empty", () => {
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

    expect(result.ok).toBe(true);
  });

  it("preserves provided severity alias value when canonical priority is also present", () => {
    const result = validateProtocolEnvelope({
      id: "msg_001_priority_severity_distinction",
      ts: "2026-02-21T12:34:56.000Z",
      bubble_id: "b_test_01",
      sender: "claude",
      recipient: "codex",
      type: "PASS",
      round: 1,
      payload: {
        summary: "Priority/severity distinction check",
        findings: [
          {
            priority: "P1",
            severity: "P2",
            title: "Canonical priority wins; alias preserved"
          }
        ]
      },
      refs: []
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.payload.findings).toEqual([
      {
        priority: "P1",
        severity: "P2",
        title: "Canonical priority wins; alias preserved"
      }
    ]);
  });

  it("preserves effective_priority when provided as a valid priority", () => {
    const result = validateProtocolEnvelope({
      id: "msg_001_effective_priority",
      ts: "2026-02-21T12:34:56.000Z",
      bubble_id: "b_test_01",
      sender: "claude",
      recipient: "codex",
      type: "PASS",
      round: 1,
      payload: {
        summary: "Effective priority preservation check",
        findings: [
          {
            priority: "P1",
            effective_priority: "P2",
            timing: "required-now",
            layer: "L1",
            title: "Downgraded blocker signal"
          }
        ]
      },
      refs: []
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.payload.findings).toEqual([
      {
        priority: "P1",
        effective_priority: "P2",
        timing: "required-now",
        layer: "L1",
        title: "Downgraded blocker signal"
      }
    ]);
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

  it("accepts PASS envelope when blocker finding omits finding refs even if envelope refs exist", () => {
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

    expect(result.ok).toBe(true);
  });

  it("accepts PASS envelope when one blocker finding misses refs and no envelope refs exist", () => {
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

    expect(result.ok).toBe(true);
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

  it("reports finding title validation error even without blocker refs enforcement", () => {
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

  it("rejects findings that omit canonical priority and severity alias", () => {
    const result = validateProtocolEnvelope({
      id: "msg_001_missing_priority",
      ts: "2026-02-21T12:34:56.000Z",
      bubble_id: "b_test_01",
      sender: "claude",
      recipient: "codex",
      type: "PASS",
      round: 1,
      payload: {
        summary: "Missing canonical priority",
        findings: [
          {
            title: "Priority missing"
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
      result.errors.some((error) => error.path === "payload.findings[0].priority")
    ).toBe(true);
  });

  it("rejects invalid timing/layer/evidence/effective_priority finding fields", () => {
    const result = validateProtocolEnvelope({
      id: "msg_001_invalid_extended_fields",
      ts: "2026-02-21T12:34:56.000Z",
      bubble_id: "b_test_01",
      sender: "claude",
      recipient: "codex",
      type: "PASS",
      round: 1,
      payload: {
        summary: "Invalid finding extension fields",
        findings: [
          {
            priority: "P2",
            effective_priority: "P4",
            timing: "urgent",
            layer: "L9",
            evidence: [""],
            title: "Invalid extension fields"
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
      result.errors.some((error) => error.path === "payload.findings[0].effective_priority")
    ).toBe(true);
    expect(
      result.errors.some((error) => error.path === "payload.findings[0].timing")
    ).toBe(true);
    expect(
      result.errors.some((error) => error.path === "payload.findings[0].layer")
    ).toBe(true);
    expect(
      result.errors.some((error) => error.path === "payload.findings[0].evidence")
    ).toBe(true);
  });

  it("rejects PASS envelope when findings_claim_state is present without findings_claim_source", () => {
    const result = validateProtocolEnvelope({
      id: "msg_001_claim_state_without_source",
      ts: "2026-02-21T12:34:56.000Z",
      bubble_id: "b_test_01",
      sender: "claude",
      recipient: "codex",
      type: "PASS",
      round: 1,
      payload: {
        summary: "Structured state declared without source.",
        findings_claim_state: "clean",
        findings: []
      },
      refs: []
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(
      result.errors.some(
        (error) =>
          error.path === "payload.findings_claim_source" &&
          error.message.includes("Required when payload.findings_claim_state is provided")
      )
    ).toBe(true);
  });

  it("rejects PASS envelope when findings_claim_source is present without findings_claim_state", () => {
    const result = validateProtocolEnvelope({
      id: "msg_001_claim_source_without_state",
      ts: "2026-02-21T12:34:56.000Z",
      bubble_id: "b_test_01",
      sender: "claude",
      recipient: "codex",
      type: "PASS",
      round: 1,
      payload: {
        summary: "Structured source declared without state.",
        findings_claim_source: "payload_flags",
        findings: []
      },
      refs: []
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(
      result.errors.some(
        (error) =>
          error.path === "payload.findings_claim_state" &&
          error.message.includes("Required when payload.findings_claim_source is provided")
      )
    ).toBe(true);
  });

  it("rejects PASS envelope when findings_claim_state uses invalid enum value", () => {
    const result = validateProtocolEnvelope({
      id: "msg_001_invalid_claim_state_enum",
      ts: "2026-02-21T12:34:56.000Z",
      bubble_id: "b_test_01",
      sender: "claude",
      recipient: "codex",
      type: "PASS",
      round: 1,
      payload: {
        summary: "Invalid claim state enum.",
        findings_claim_state: "opened",
        findings_claim_source: "payload_flags",
        findings: []
      },
      refs: []
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(
      result.errors.some(
        (error) =>
          error.path === "payload.findings_claim_state" &&
          error.message.includes("Must be one of: clean, open_findings, unknown")
      )
    ).toBe(true);
  });

  it("rejects PASS envelope when findings_claim_source uses invalid enum value", () => {
    const result = validateProtocolEnvelope({
      id: "msg_001_invalid_claim_source_enum",
      ts: "2026-02-21T12:34:56.000Z",
      bubble_id: "b_test_01",
      sender: "claude",
      recipient: "codex",
      type: "PASS",
      round: 1,
      payload: {
        summary: "Invalid claim source enum.",
        findings_claim_state: "clean",
        findings_claim_source: "parser_guess",
        findings: []
      },
      refs: []
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(
      result.errors.some(
        (error) =>
          error.path === "payload.findings_claim_source" &&
          error.message.includes("Must be one of: payload_flags")
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
