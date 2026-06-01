import { describe, expect, it } from "vitest";

import {
  classifyCommitMessage,
  type CommitMessagePolicyResult
} from "../../tools/commit-policy/commitMessagePolicy.js";

function expectResult(
  message: string,
  expected: Pick<CommitMessagePolicyResult, "status" | "class" | "reason_code">
): void {
  expect(classifyCommitMessage(message)).toMatchObject(expected);
}

describe("commit message policy", () => {
  it("accepts the closed conventional content type allowlist", () => {
    for (const type of [
      "feat",
      "fix",
      "perf",
      "refactor",
      "docs",
      "test",
      "build",
      "ci",
      "chore"
    ]) {
      expectResult(`${type}(cli): add validator`, {
        status: "accepted",
        class: "conventional_content",
        reason_code: "accepted_conventional"
      });
    }
  });

  it("accepts conventional breaking markers", () => {
    expectResult("feat(cli)!: change validator contract", {
      status: "accepted",
      class: "breaking_conventional_content",
      reason_code: "accepted_breaking_conventional"
    });
  });

  it("rejects conventional-looking headers outside the type allowlist", () => {
    expectResult("style(cli): format validator", {
      status: "rejected",
      class: "ambiguous_prose",
      reason_code: "rejected_ambiguous"
    });
  });

  it("accepts only exact merge artifact prefixes", () => {
    expectResult("Merge branch 'bubble/x'", {
      status: "accepted",
      class: "merge_artifact",
      reason_code: "accepted_merge_artifact"
    });
    expectResult("Merge remote-tracking branch 'origin/main'", {
      status: "accepted",
      class: "merge_artifact",
      reason_code: "accepted_merge_artifact"
    });
    expectResult("Merge pull request #1", {
      status: "rejected",
      class: "ambiguous_prose",
      reason_code: "rejected_ambiguous"
    });
  });

  it("accepts standard and conventional revert recovery headers", () => {
    expectResult('Revert "feat(cli): add validator"', {
      status: "accepted",
      class: "revert_recovery",
      reason_code: "accepted_revert_recovery"
    });
    expectResult("revert(cli): remove validator", {
      status: "accepted",
      class: "revert_recovery",
      reason_code: "accepted_revert_recovery"
    });
  });

  it("rejects finalize, empty, ambiguous, and body-only candidates", () => {
    expectResult("bubble(2a-commit-policy): finalize", {
      status: "rejected",
      class: "historical_finalize",
      reason_code: "rejected_finalize"
    });
    expectResult("   \n\n", {
      status: "rejected",
      class: "empty_message",
      reason_code: "rejected_empty"
    });
    expectResult("update stuff", {
      status: "rejected",
      class: "ambiguous_prose",
      reason_code: "rejected_ambiguous"
    });
    expectResult("update stuff\n\nfeat(cli): add validator", {
      status: "rejected",
      class: "body_only_conventional_candidate",
      reason_code: "rejected_body_only_conventional"
    });
  });
});
