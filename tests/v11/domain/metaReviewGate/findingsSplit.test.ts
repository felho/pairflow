import { describe, expect, it } from "vitest";

import {
  deriveFindingsOpenSplit,
  resolveAdvisoryFindingsFromFindings,
  resolveAdvisoryFindingsFromReportJson,
  resolveFindingsOpenSplitFromFindings,
  resolveFindingsOpenSplitFromReportJson
} from "../../../../src/v11/domain/metaReviewGate/findingsSplit.js";

describe("deriveFindingsOpenSplit", () => {
  it("derives blocking and advisory totals from mixed findings", () => {
    const split = deriveFindingsOpenSplit([
      { severity: "P0", title: "blocking-0" },
      { priority: "P1", title: "blocking-1" },
      { severity: "blocking", title: "blocking-alias" },
      { severity: "advisory", title: "advisory-alias" },
      { severity: "P2", title: "advisory-2" },
      { priority: "P3", title: "advisory-3" },
      { title: "invalid-missing-priority" }
    ]);

    expect(split).toEqual({
      blockingOpenTotal: 3,
      advisoryOpenTotal: 3
    });
  });

  it("returns null for non-array input", () => {
    const split = deriveFindingsOpenSplit({
      severity: "P2",
      title: "not-array"
    });

    expect(split).toBeNull();
  });
});

describe("resolveFindingsOpenSplitFromFindings", () => {
  it("derives blocking and advisory totals from mixed findings", () => {
    expect(
      resolveFindingsOpenSplitFromFindings([
        { severity: "P1", title: "blocking-a" },
        { severity: "P2", title: "advisory-a" },
        { severity: "P3", title: "advisory-b" }
      ])
    ).toEqual({
      findings_blocking_open_total: 1,
      findings_advisory_open_total: 2
    });
  });

  it("returns null for non-array input", () => {
    expect(
      resolveFindingsOpenSplitFromFindings({
        severity: "P2",
        title: "not-array"
      })
    ).toBeNull();
  });
});

describe("resolveFindingsOpenSplitFromReportJson", () => {
  it("prefers explicit advisory/blocking split totals when present", () => {
    const split = resolveFindingsOpenSplitFromReportJson({
      findings_blocking_open_total: 1,
      findings_advisory_open_total: 3,
      findings: [{ severity: "P2", title: "advisory-a" }]
    });

    expect(split).toEqual({
      findings_blocking_open_total: 1,
      findings_advisory_open_total: 3
    });
  });

  it("fails closed when explicit split fields are present but invalid", () => {
    const split = resolveFindingsOpenSplitFromReportJson({
      findings_blocking_open_total: -1,
      findings_advisory_open_total: 2,
      findings: [
        { severity: "P1", title: "blocking-a" },
        { severity: "P2", title: "advisory-a" }
      ]
    });

    expect(split).toEqual({
      findings_blocking_open_total: null,
      findings_advisory_open_total: null
    });
  });

  it("derives missing blocking split field when advisory split field is explicitly valid", () => {
    const split = resolveFindingsOpenSplitFromReportJson({
      findings_advisory_open_total: 2,
      findings: [
        { severity: "P1", title: "blocking-a" },
        { severity: "P2", title: "advisory-a" },
        { severity: "P3", title: "advisory-b" }
      ]
    });

    expect(split).toEqual({
      findings_blocking_open_total: 1,
      findings_advisory_open_total: 2
    });
  });
});

describe("resolveAdvisoryFindingsFromFindings", () => {
  it("returns advisory findings only with normalized title and optional refs", () => {
    const findings = resolveAdvisoryFindingsFromFindings([
      { severity: "P2", title: "  advisory-a  ", refs: ["artifact://a", " "] },
      { priority: "P3", title: "advisory-b" },
      { severity: "P1", title: "blocking-ignored" },
      { severity: "P2", title: "" },
      "invalid"
    ]);

    expect(findings).toEqual([
      {
        severity: "P2",
        title: "advisory-a",
        refs: ["artifact://a"]
      },
      {
        severity: "P3",
        title: "advisory-b"
      }
    ]);
  });

  it("returns undefined when findings contain only blocking entries", () => {
    expect(
      resolveAdvisoryFindingsFromFindings([
        { severity: "P1", title: "blocking-only" }
      ])
    ).toBeUndefined();
  });

  it("preserves explicit empty advisory payloads", () => {
    expect(resolveAdvisoryFindingsFromFindings([])).toEqual([]);
  });
});

describe("resolveAdvisoryFindingsFromReportJson", () => {
  it("returns undefined when report json is undefined and when findings contain only blocking entries", () => {
    expect(resolveAdvisoryFindingsFromReportJson(undefined)).toBeUndefined();
    expect(
      resolveAdvisoryFindingsFromReportJson({
        findings: [{ severity: "P1", title: "blocking-only" }]
      })
    ).toBeUndefined();
  });

  it("returns undefined when findings is missing or not an array", () => {
    expect(resolveAdvisoryFindingsFromReportJson({})).toBeUndefined();
    expect(
      resolveAdvisoryFindingsFromReportJson({
        findings: { severity: "P2", title: "not-an-array" }
      } as unknown as Record<string, unknown>)
    ).toBeUndefined();
  });
});
