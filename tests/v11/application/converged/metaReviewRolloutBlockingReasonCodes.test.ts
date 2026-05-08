import { describe, expect, it } from "vitest";

import { resolveConvergedRolloutBlockingReasonCodes } from "../../../../src/v11/application/converged/metaReviewRolloutBlockingReasonCodes.js";

describe("resolveConvergedRolloutBlockingReasonCodes", () => {
  it("includes rollout-blocking gate and command-path codes", () => {
    const codes = resolveConvergedRolloutBlockingReasonCodes({
      gateRoute: "human_gate_run_failed",
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
      "PAIRFLOW_COMMAND_PATH_STALE"
    ]);
  });

  it("ignores stale code for external profile when command path is a non-blocking mismatch diagnostic", () => {
    const codes = resolveConvergedRolloutBlockingReasonCodes({
      gateRoute: "human_gate_approve",
      commandPathStatus: {
        status: "external",
        profile: "external",
        localEntrypoint: "/tmp/w/dist/cli/index.js",
        activeEntrypoint: "/usr/local/lib/node_modules/pairflow/dist/cli/index.js",
        localEntrypointExists: true,
        externalPairflowAvailable: true,
        pinnedCommand: "pairflow",
        entrypointConsistency: "inconsistent",
        message: "external mismatch diagnostic"
      }
    });

    expect(codes).not.toContain("PAIRFLOW_COMMAND_PATH_STALE");
  });

  it("includes external-unavailable code only for external profile", () => {
    const externalCodes = resolveConvergedRolloutBlockingReasonCodes({
      gateRoute: "human_gate_approve",
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

    const selfHostCodes = resolveConvergedRolloutBlockingReasonCodes({
      gateRoute: "human_gate_approve",
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

  it("includes rework-dispatch-failed blocking code for the dispatch-failed gate route", () => {
    const codes = resolveConvergedRolloutBlockingReasonCodes({
      gateRoute: "human_gate_dispatch_failed",
      commandPathStatus: {
        status: "external",
        profile: "external",
        localEntrypoint: "/tmp/w/dist/cli/index.js",
        activeEntrypoint: "/usr/local/lib/node_modules/pairflow/dist/cli/index.js",
        localEntrypointExists: true,
        externalPairflowAvailable: true,
        pinnedCommand: "pairflow",
        entrypointConsistency: "consistent",
        message: "external"
      }
    });

    expect(codes).toContain("META_REVIEW_GATE_REWORK_DISPATCH_FAILED");
  });
});
