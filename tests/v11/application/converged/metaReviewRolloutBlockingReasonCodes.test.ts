import { describe, expect, it } from "vitest";

import { resolveMetaReviewRolloutBlockingReasonCodesV11 } from "../../../../src/v11/application/converged/metaReviewRolloutBlockingReasonCodes.js";

describe("resolveMetaReviewRolloutBlockingReasonCodesV11", () => {
  it("includes self_host stale and meta-review warning codes", () => {
    const codes = resolveMetaReviewRolloutBlockingReasonCodesV11({
      gateRoute: "human_gate_run_failed",
      metaReviewWarnings: [{ reason_code: "META_REVIEW_RUNNER_ERROR" }],
      commandPathStatus: {
        status: "stale",
        reasonCode: "PAIRFLOW_COMMAND_PATH_STALE",
        profile: "self_host",
        localEntrypoint: "/tmp/w/dist/cli/index.js",
        activeEntrypoint: "/usr/local/bin/pairflow",
        localEntrypointExists: true,
        externalPairflowAvailable: true,
        pinnedCommand: "node '/tmp/w/dist/cli/index.js'",
        message: "stale"
      }
    });

    expect(codes).toEqual([
      "META_REVIEW_GATE_RUN_FAILED",
      "META_REVIEW_RUNNER_ERROR",
      "PAIRFLOW_COMMAND_PATH_STALE"
    ]);
  });

  it("includes external-unavailable code only for external profile", () => {
    const externalCodes = resolveMetaReviewRolloutBlockingReasonCodesV11({
      gateRoute: "human_gate_approve",
      metaReviewWarnings: [],
      commandPathStatus: {
        status: "missing",
        reasonCode: "PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE",
        profile: "external",
        localEntrypoint: "/tmp/w/dist/cli/index.js",
        activeEntrypoint: null,
        localEntrypointExists: true,
        externalPairflowAvailable: false,
        pinnedCommand: "pairflow",
        message: "missing"
      }
    });
    expect(externalCodes).toContain("PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE");

    const selfHostCodes = resolveMetaReviewRolloutBlockingReasonCodesV11({
      gateRoute: "human_gate_approve",
      metaReviewWarnings: [],
      commandPathStatus: {
        status: "missing",
        reasonCode: "PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE",
        profile: "self_host",
        localEntrypoint: "/tmp/w/dist/cli/index.js",
        activeEntrypoint: null,
        localEntrypointExists: true,
        externalPairflowAvailable: false,
        pinnedCommand: "node '/tmp/w/dist/cli/index.js'",
        message: "missing"
      }
    });
    expect(selfHostCodes).not.toContain("PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE");
  });
});
