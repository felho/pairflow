import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { readContractCase } from "./runner.js";

describe("v11 metaReviewGate contract harness skeleton", () => {
  it("loads seed contract case metadata", async () => {
    const casePath = resolve(
      process.cwd(),
      "tests/contracts/v11/cases/meta-review-gate/meta-review-gate-recover-basic.case.json"
    );
    const caseDef = await readContractCase(casePath);
    expect(caseDef.command).toBe("metaReviewGate");
    expect(caseDef.mode).toBe("legacy");
    expect(caseDef.expected.status).toBe("ok");
  });

  it.skip("executes legacy and v11 parity assertions via shared runner", () => {
    // TODO (M3): wire meta-review gate command-level runner and parity diff assertions.
  });
});

