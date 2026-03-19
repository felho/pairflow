import { describe, expect, it } from "vitest";

import { normalizeReviewerFindingsPayload } from "../../../../src/v11/domain/pass/reviewerFindingsPayload.js";

describe("normalizeReviewerFindingsPayload", () => {
  it("returns clean empty normalization for undefined input", () => {
    expect(normalizeReviewerFindingsPayload(undefined)).toEqual({
      findings: [],
      invalid: false
    });
  });

  it("marks non-array input as invalid", () => {
    expect(normalizeReviewerFindingsPayload({})).toEqual({
      findings: [],
      invalid: true
    });
  });

  it("normalizes valid findings and keeps only valid fields", () => {
    const normalized = normalizeReviewerFindingsPayload([
      {
        title: "  Blocking regression  ",
        severity: "P1",
        timing: "required-now",
        layer: "L1",
        refs: [" src/a.ts:10 ", "", "src/b.ts:20"],
        evidence: ["  log://lint  ", "  "],
        detail: "details",
        code: "RULE_X",
        effective_priority: "P0"
      }
    ]);

    expect(normalized.invalid).toBe(false);
    expect(normalized.findings).toEqual([
      {
        title: "Blocking regression",
        priority: "P1",
        severity: "P1",
        timing: "required-now",
        layer: "L1",
        refs: ["src/a.ts:10", "src/b.ts:20"],
        evidence: ["log://lint"],
        detail: "details",
        code: "RULE_X",
        effective_priority: "P0"
      }
    ]);
  });

  it("flags malformed entries as invalid but keeps valid entries", () => {
    const normalized = normalizeReviewerFindingsPayload([
      "bad-entry",
      { title: "No severity" },
      {
        title: "Valid",
        severity: "P2"
      }
    ]);

    expect(normalized.invalid).toBe(true);
    expect(normalized.findings).toEqual([
      {
        title: "Valid",
        priority: "P2",
        severity: "P2"
      }
    ]);
  });

  it("treats non-array refs as invalid and drops finding", () => {
    const normalized = normalizeReviewerFindingsPayload([
      {
        title: "Invalid refs",
        severity: "P1",
        refs: "src/a.ts:10"
      }
    ]);

    expect(normalized).toEqual({
      findings: [],
      invalid: true
    });
  });

  it("treats refs list that normalizes to empty as invalid", () => {
    const normalized = normalizeReviewerFindingsPayload([
      {
        title: "Empty refs after trim",
        severity: "P1",
        refs: ["  ", ""]
      }
    ]);

    expect(normalized).toEqual({
      findings: [],
      invalid: true
    });
  });
});
