import { describe, expect, it } from "vitest";

import { buildReportChecks } from "../../../tools/fitness/checks/index.js";

describe("fitness check mode resolution", () => {
  it("uses explicit check mode", async () => {
    const checks = await buildReportChecks(
      {
        defaults: {
          mode: "report-only"
        },
        checks: [
          {
            id: "custom_check",
            metric: "x",
            mode: "soft-fail",
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

  it("falls back to policy default mode", async () => {
    const checks = await buildReportChecks(
      {
        defaults: {
          mode: "hard-fail"
        },
        checks: [
          {
            id: "custom_check",
            metric: "x",
            mode: undefined,
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

  it("routes internal module boundary check to its implementation", async () => {
    const checks = await buildReportChecks(
      {
        defaults: {
          mode: "hard-fail"
        },
        checks: [
          {
            id: "internal_module_boundary",
            metric: "internal module implementation privacy boundary",
            mode: "report-only",
            owner: "architecture/runtime",
            scope: ["src/v11/no-files-here/**"],
            exceptions: []
          }
        ]
      },
      process.cwd()
    );

    expect(checks).toHaveLength(1);
    expect(checks[0]?.id).toBe("internal_module_boundary");
    expect(checks[0]?.status).toBe("pass");
    expect(checks[0]?.summary).toContain("Internal module boundary check");
  });
});
