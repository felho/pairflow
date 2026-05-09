import { describe, expect, it } from "vitest";

import {
  resolveConvergedRolloutBlockingReasonCodes as resolveMetaReviewRolloutBlockingReasonCodes
} from "../../../../src/v11/application/converged/internal/orchestration/metaReviewRolloutBlockingReasonCodes.js";
import { resolveConvergedRolloutBlockingReasonCodes } from "../../../../src/v11/application/converged/internal/orchestration/convergedRolloutBlockingReasonResolver.js";

describe("convergedRolloutBlockingReasonResolver", () => {
  it("delegates stale self_host command path to v11 resolver", () => {
    const input = {
      gateRoute: "human_gate_approve" as const,
      commandPathStatus: {
        status: "stale" as const,
        reasonCode: "PAIRFLOW_COMMAND_PATH_STALE" as const,
        profile: "self_host" as const,
        localEntrypoint: "/tmp/w/dist/cli/index.js",
        activeEntrypoint: "/usr/local/bin/pairflow",
        localEntrypointExists: true,
        externalPairflowAvailable: true,
        pinnedCommand: "node '/tmp/w/dist/cli/index.js'",
        message: "stale"
      }
    };

    expect(resolveConvergedRolloutBlockingReasonCodes(input)).toEqual(
      resolveMetaReviewRolloutBlockingReasonCodes(input)
    );
  });

  it("delegates external missing command path to v11 resolver", () => {
    const input = {
      gateRoute: "human_gate_approve" as const,
      commandPathStatus: {
        status: "missing" as const,
        reasonCode: "PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE" as const,
        profile: "external" as const,
        localEntrypoint: "/tmp/w/dist/cli/index.js",
        activeEntrypoint: null,
        localEntrypointExists: true,
        externalPairflowAvailable: false,
        pinnedCommand: "pairflow",
        message: "external unavailable"
      }
    };

    expect(resolveConvergedRolloutBlockingReasonCodes(input)).toEqual(
      resolveMetaReviewRolloutBlockingReasonCodes(input)
    );
  });
});
