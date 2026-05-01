import { describe, expect, it } from "vitest";

import {
  buildRemoteBubbleReviewPolicyScript,
  executeRemoteBubbleReviewPolicyCommand,
  type RemoteBubbleReviewPolicyCommandError
} from "../../../../../src/v11/infrastructure/executor/ssh/sshBubbleReviewPolicyCommand.js";

describe("sshBubbleReviewPolicyCommand", () => {
  it("builds a remote script that updates review policy inside the remote clone", () => {
    const script = buildRemoteBubbleReviewPolicyScript({
      bubbleId: "b_remote_policy_01",
      remoteClonePath: "/srv/pairflow/b_remote_policy_01",
      remoteTarget: {
        alias: "lab",
        host: "remote.example",
        pairflowCommand: "pairflow"
      },
      reviewLoopMode: "meta_only",
      reviewBlockingMinSeverity: "P2",
      expectedBubbleToml: "[review_policy]\nreview_loop_mode = \"full\"\n"
    });

    expect(script).toContain("cd '/srv/pairflow/b_remote_policy_01'");
    expect(script).toContain("dist/v11/shared/reviewPolicy/updateBubbleReviewPolicy.js");
    expect(script).toContain("dist/v11/infrastructure/artifact/reviewPolicy/updateBubbleReviewPolicy.js");
    expect(script).toContain("dist/v11/infrastructure/state/stateStore.js");
    expect(script).toContain("reviewLoopMode = \"meta_only\"");
    expect(script).toContain("reviewBlockingMinSeverity = \"P2\"");
    expect(script).toContain("const expectedBubbleToml = ");
    expect(script).toContain("review_loop_mode = \\\"full\\\"");
    expect(script).toContain("expectedContent: expectedBubbleToml");
  });

  it("builds the omission-preserve branch with reviewBlockingMinSeverity set to undefined", () => {
    const script = buildRemoteBubbleReviewPolicyScript({
      bubbleId: "b_remote_policy_undefined_01",
      remoteClonePath: "/srv/pairflow/b_remote_policy_undefined_01",
      remoteTarget: {
        alias: "lab",
        host: "remote.example",
        pairflowCommand: "pairflow"
      },
      reviewLoopMode: "full"
    });

    expect(script).toContain("const reviewBlockingMinSeverity = undefined;");
    expect(script).toContain("...(reviewBlockingMinSeverity === undefined");
    expect(script).not.toContain("reviewBlockingMinSeverity = \"P");
  });

  it("executes over ssh and parses the marked update result", async () => {
    const result = await executeRemoteBubbleReviewPolicyCommand(
      {
        bubbleId: "b_remote_policy_02",
        remoteClonePath: "/srv/pairflow/b_remote_policy_02",
        remoteTarget: {
          alias: "lab",
          host: "remote.example",
          pairflowCommand: "pairflow"
        },
        reviewLoopMode: "meta_only"
      },
      {
        runCommand: async (command, args) => {
          expect(command).toBe("ssh");
          expect(args).toContain("remote.example");
          return {
            exitCode: 0,
            stderr: "",
            stdout: [
              "__PAIRFLOW_REMOTE_REVIEW_POLICY_RESULT_START__",
              JSON.stringify({
                kind: "review_policy_updated",
                bubbleId: "b_remote_policy_02",
                reviewPolicy: {
                  requested_loop_mode: "meta_only",
                  effective_loop_mode: "full",
                  support_status: "guarded",
                  reviewer_blocking_min_severity: "P3",
                  meta_review_auto_rework_min_severity: "P3",
                  meta_review_consecutive_clean_runs_required: 1,
                },
                previousRequestedLoopMode: "full",
                nextRequestedLoopMode: "meta_only",
                activationChange: "none",
                bubbleToml: "updated"
              }),
              "__PAIRFLOW_REMOTE_REVIEW_POLICY_RESULT_END__"
            ].join("\n")
          };
        }
      }
    );

    expect(result).toMatchObject({
      kind: "review_policy_updated",
      bubbleId: "b_remote_policy_02",
      nextRequestedLoopMode: "meta_only",
      bubbleToml: "updated"
    });
  });

  it("classifies missing marked payloads as invalid remote payloads", async () => {
    const promise = executeRemoteBubbleReviewPolicyCommand(
      {
        bubbleId: "b_remote_policy_03",
        remoteClonePath: "/srv/pairflow/b_remote_policy_03",
        remoteTarget: {
          alias: "lab",
          host: "remote.example",
          pairflowCommand: "pairflow"
        },
        reviewLoopMode: "full"
      },
      {
        runCommand: async () => ({
          exitCode: 0,
          stderr: "",
          stdout: "{}"
        })
      }
    );

    await expect(promise).rejects.toMatchObject({
      name: "RemoteBubbleReviewPolicyCommandError",
      code: "REMOTE_REVIEW_POLICY_PAYLOAD_INVALID",
      reasonCode: "REMOTE_REVIEW_POLICY_MARKERS_MISSING"
    } satisfies Partial<RemoteBubbleReviewPolicyCommandError>);
  });
});
