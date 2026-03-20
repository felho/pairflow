import { describe, expect, it } from "vitest";

import { buildReportChecks } from "../../../tools/fitness/checks/index.js";

describe("fitness check mode-by-milestone resolution", () => {
  it("promotes check mode according to current milestone overrides", async () => {
    const checks = await buildReportChecks(
      {
        defaults: {
          mode: "report-only",
          current_milestone: "M2"
        },
        checks: [
          {
            id: "custom_check",
            metric: "x",
            mode: "report-only",
            mode_by_milestone: {
              M2: "soft-fail",
              M3: "hard-fail"
            },
            exception_lifecycle_mode: undefined,
            owner: "architecture",
            scope: undefined,
            exceptions: undefined
          }
        ]
      },
      process.cwd()
    );

    expect(checks).toHaveLength(1);
    expect(checks[0]?.mode).toBe("soft-fail");
  });

  it("uses highest applicable milestone override", async () => {
    const checks = await buildReportChecks(
      {
        defaults: {
          mode: "report-only",
          current_milestone: "M4"
        },
        checks: [
          {
            id: "custom_check",
            metric: "x",
            mode: "report-only",
            mode_by_milestone: {
              M2: "soft-fail",
              M3: "hard-fail"
            },
            exception_lifecycle_mode: undefined,
            owner: "architecture",
            scope: undefined,
            exceptions: undefined
          }
        ]
      },
      process.cwd()
    );

    expect(checks).toHaveLength(1);
    expect(checks[0]?.mode).toBe("hard-fail");
  });

  it("keeps base mode when current milestone format is invalid", async () => {
    const checks = await buildReportChecks(
      {
        defaults: {
          mode: "report-only",
          current_milestone: "phase-2"
        },
        checks: [
          {
            id: "custom_check",
            metric: "x",
            mode: "soft-fail",
            mode_by_milestone: {
              M2: "hard-fail"
            },
            exception_lifecycle_mode: undefined,
            owner: "architecture",
            scope: undefined,
            exceptions: undefined
          }
        ]
      },
      process.cwd()
    );

    expect(checks).toHaveLength(1);
    expect(checks[0]?.mode).toBe("soft-fail");
  });
});
