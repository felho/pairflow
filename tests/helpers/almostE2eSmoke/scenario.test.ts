import { describe, expect, it } from "vitest";
import {
  SmokeScenarioValidationError,
  normalizeSmokeScenario,
  smokeStep
} from "./scenario.js";

describe("almost e2e smoke scenario contract", () => {
  it("normalizes typed builder steps through the same validator", () => {
    const scenario = normalizeSmokeScenario({
      id: "scenario-1",
      steps: [
        smokeStep.pass({
          summary: "done",
          refs: ["logs/pass.log"],
          noFindings: true
        }),
        smokeStep.humanQuestion({
          question: "Need input?"
        }),
        smokeStep.convergence({
          summary: "ready",
          findings: [
            {
              severity: "P2",
              title: "Follow-up",
              refs: ["review.md"]
            }
          ]
        }),
        smokeStep.metaReviewResult({
          round: 1,
          recommendation: "approve",
          summary: "approved",
          reportJson: {
            findings_claimed_open_total: 0
          }
        })
      ]
    });

    expect(scenario.steps.map((step) => step.kind)).toEqual([
      "pass",
      "human_question",
      "convergence",
      "meta_review_result"
    ]);
  });

  it("rejects unknown fields and duplicate logical aliases", () => {
    expect(() =>
      normalizeSmokeScenario({
        id: "scenario-1",
        steps: [
          {
            kind: "pass",
            summary: "done",
            surprise: true
          }
        ]
      })
    ).toThrow(SmokeScenarioValidationError);

    expect(() =>
      normalizeSmokeScenario({
        id: "scenario-1",
        steps: [
          {
            kind: "pass",
            summary: "done",
            noFindings: true,
            no_findings: true
          }
        ]
      })
    ).toThrow(/duplicate logical field 'noFindings'/);
  });

  it("rejects malformed required values before command construction", () => {
    expect(() =>
      normalizeSmokeScenario({
        id: "scenario-1",
        steps: [
          {
            kind: "human_question",
            question: "  "
          }
        ]
      })
    ).toThrow(/question must be a non-empty string/);

    expect(() =>
      normalizeSmokeScenario({
        id: "scenario-1",
        steps: [
          {
            kind: "meta_review_result",
            round: 0,
            recommendation: "approve",
            summary: "ok",
            reportJson: {}
          }
        ]
      })
    ).toThrow(/round must be a positive integer/);
  });

  it("accepts supported authority guards and rejects invalid finding encodings", () => {
    expect(
      normalizeSmokeScenario({
        id: "scenario-1",
        steps: [
          {
            kind: "pass",
            summary: "done",
            expectedStateFingerprint: "abc"
          }
        ]
      }).steps[0]
    ).toMatchObject({
      expectedStateFingerprint: "abc"
    });
    expect(() =>
      normalizeSmokeScenario({
        id: "scenario-1",
        steps: [
          {
            kind: "pass",
            summary: "done",
            findings: [
              {
                severity: "P2",
                title: "bad | title"
              }
            ]
          }
        ]
      })
    ).toThrow(/must not contain '\|'/);
  });

  it("normalizes null meta-review rework target to omitted CLI payload intent", () => {
    expect(
      smokeStep.metaReviewResult({
        round: 1,
        recommendation: "approve",
        summary: "approved",
        reworkTargetMessage: null,
        reportJson: {}
      })
    ).not.toHaveProperty("reworkTargetMessage");
  });

  it("clones meta-review reportJson during normalization", () => {
    const reportJson = {
      nested: {
        ok: true
      }
    };
    const scenario = normalizeSmokeScenario({
      id: "scenario-1",
      steps: [
        {
          kind: "meta_review_result",
          round: 1,
          recommendation: "approve",
          summary: "approved",
          reportJson
        }
      ]
    });
    reportJson.nested.ok = false;

    expect(scenario.steps[0]).toMatchObject({
      kind: "meta_review_result",
      reportJson: {
        nested: {
          ok: true
        }
      }
    });
  });

  it("rejects meta-review reportJson that cannot be serialized for CLI emit", () => {
    const reportJson: Record<string, unknown> = {};
    reportJson.self = reportJson;

    expect(() =>
      normalizeSmokeScenario({
        id: "scenario-1",
        steps: [
          {
            kind: "meta_review_result",
            round: 1,
            recommendation: "approve",
            summary: "approved",
            reportJson
          }
        ]
      })
    ).toThrow(/reportJson\.self must not contain circular references/);
  });

  it("rejects meta-review reportJson values that JSON would drop or rewrite", () => {
    for (const reportJson of [
      { omitted: undefined },
      { callback: () => "dropped" },
      { score: Number.NaN },
      { score: Number.POSITIVE_INFINITY },
      { createdAt: new Date("2026-05-09T00:00:00.000Z") }
    ]) {
      expect(() =>
        normalizeSmokeScenario({
          id: "scenario-1",
          steps: [
            {
              kind: "meta_review_result",
              round: 1,
              recommendation: "approve",
              summary: "approved",
              reportJson
            }
          ]
        })
      ).toThrow(SmokeScenarioValidationError);
    }
  });

  it("rejects contradictory pass findings and noFindings", () => {
    expect(() =>
      normalizeSmokeScenario({
        id: "scenario-1",
        steps: [
          {
            kind: "pass",
            summary: "done",
            noFindings: true,
            findings: [
              {
                severity: "P3",
                title: "Open issue"
              }
            ]
          }
        ]
      })
    ).toThrow(/cannot combine findings with noFindings/);
  });

  it("rejects finding fields that cannot be represented by CLI emit", () => {
    expect(() =>
      normalizeSmokeScenario({
        id: "scenario-1",
        steps: [
          {
            kind: "pass",
            summary: "done",
            findings: [
              {
                severity: "P2",
                title: "Qualified finding",
                timing: "required-now"
              }
            ]
          }
        ]
      })
    ).toThrow(/unknown field 'timing'/);

    expect(() =>
      normalizeSmokeScenario({
        id: "scenario-1",
        steps: [
          {
            kind: "convergence",
            summary: "ready",
            findings: [
              {
                severity: "P2",
                title: "Qualified convergence finding",
                layer: "L1"
              }
            ]
          }
        ]
      })
    ).toThrow(/unknown field 'layer'/);
  });

  it("rejects empty ref arrays when refs are provided", () => {
    expect(() =>
      normalizeSmokeScenario({
        id: "scenario-1",
        steps: [
          {
            kind: "pass",
            summary: "done",
            refs: []
          }
        ]
      })
    ).toThrow(/refs must contain at least one ref/);

    expect(() =>
      normalizeSmokeScenario({
        id: "scenario-1",
        steps: [
          {
            kind: "pass",
            summary: "done",
            findings: [
              {
                severity: "P2",
                title: "Open issue",
                refs: []
              }
            ]
          }
        ]
      })
    ).toThrow(/findings\[0\]\.refs must contain at least one ref/);
  });

  it("keeps finding ref validation aligned with canonical emit parsing", () => {
    expect(
      normalizeSmokeScenario({
        id: "scenario-1",
        steps: [
          {
            kind: "pass",
            summary: "done",
            findings: [
              {
                severity: "P2",
                title: "Single unstructured ref stays compatible",
                refs: ["notes-token"]
              }
            ]
          }
        ]
      }).steps[0]
    ).toMatchObject({
      kind: "pass"
    });

    expect(() =>
      normalizeSmokeScenario({
        id: "scenario-1",
        steps: [
          {
            kind: "pass",
            summary: "done",
            findings: [
              {
                severity: "P2",
                title: "Ambiguous multi ref",
                refs: ["artifact://review/a.md", "notes-token"]
              }
            ]
          }
        ]
      })
    ).toThrow(/path-like or URI-like refs/);

    expect(() =>
      normalizeSmokeScenario({
        id: "scenario-1",
        steps: [
          {
            kind: "convergence",
            summary: "ready",
            findings: [
              {
                severity: "P2",
                title: "Ambiguous convergence multi ref",
                refs: ["artifact://review/a.md", "notes-token"]
              }
            ]
          }
        ]
      })
    ).toThrow(/path-like or URI-like refs/);
  });

  it("rejects duplicate scenario labels", () => {
    expect(() =>
      normalizeSmokeScenario({
        id: "scenario-1",
        steps: [
          {
            kind: "pass",
            label: "same",
            summary: "first"
          },
          {
            kind: "pass",
            label: "same",
            summary: "second"
          }
        ]
      })
    ).toThrow(/duplicates an earlier scenario step label/);
  });
});
