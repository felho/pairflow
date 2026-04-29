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
});
