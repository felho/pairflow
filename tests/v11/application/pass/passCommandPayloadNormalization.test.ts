import { describe, expect, it } from "vitest";

import { normalizePassCommandPayload } from "../../../../src/v11/application/pass/passCommandPayloadNormalization.js";

describe("passCommandPayloadNormalization", () => {
  it("returns empty payload defaults when findings are omitted", () => {
    const normalized = normalizePassCommandPayload({
      findings: undefined
    });

    expect(normalized.findings).toEqual([]);
    expect(normalized.hasFindings).toBe(false);
    expect(normalized.noFindings).toBe(false);
    expect(normalized.findingsPayloadInvalid).toBe(false);
  });

  it("normalizes valid findings and marks hasFindings true", () => {
    const normalized = normalizePassCommandPayload({
      findings: [{ title: "Needs follow-up", severity: "P2" }]
    });

    expect(normalized.findings).toEqual([
      {
        title: "Needs follow-up",
        severity: "P2",
        priority: "P2"
      }
    ]);
    expect(normalized.hasFindings).toBe(true);
    expect(normalized.findingsPayloadInvalid).toBe(false);
  });

  it("marks payload invalid when findings contain invalid entries", () => {
    const normalized = normalizePassCommandPayload({
      findings: [{ title: "Valid finding", severity: "P2" }, "bad-finding-entry"]
    });

    expect(normalized.findings).toEqual([
      {
        title: "Valid finding",
        severity: "P2",
        priority: "P2"
      }
    ]);
    expect(normalized.hasFindings).toBe(true);
    expect(normalized.findingsPayloadInvalid).toBe(true);
  });

  it("preserves explicit noFindings=true flag", () => {
    const normalized = normalizePassCommandPayload({
      findings: undefined,
      noFindings: true
    });

    expect(normalized.noFindings).toBe(true);
  });
});
