import { describe, expect, it } from "vitest";

import type { Finding } from "../../../../src/types/findings.js";
import { buildFindingCounts } from "../../../../src/v11/domain/pass/findingCounts.js";

describe("buildFindingCounts", () => {
  it("counts canonical priorities from priority/severity fields", () => {
    const findings: Finding[] = [
      { title: "p0", priority: "P0" },
      { title: "p1", severity: "P1" },
      { title: "p2", priority: "P2" },
      { title: "p3", severity: "P3" }
    ];

    expect(buildFindingCounts(findings)).toEqual({
      p0: 1,
      p1: 1,
      p2: 1,
      p3: 1
    });
  });

  it("prefers effective_priority over priority/severity", () => {
    const findings: Finding[] = [
      {
        title: "effective overrides",
        priority: "P1",
        severity: "P0",
        effective_priority: "P3"
      }
    ];

    expect(buildFindingCounts(findings)).toEqual({
      p0: 0,
      p1: 0,
      p2: 0,
      p3: 1
    });
  });

  it("ignores findings without resolvable priority", () => {
    const findings: Finding[] = [
      { title: "missing-priority" },
      { title: "has-priority", priority: "P2" }
    ];

    expect(buildFindingCounts(findings)).toEqual({
      p0: 0,
      p1: 0,
      p2: 1,
      p3: 0
    });
  });
});
