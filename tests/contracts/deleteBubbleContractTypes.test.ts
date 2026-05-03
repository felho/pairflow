/* eslint-disable @typescript-eslint/no-unused-vars */

import { describe, expect, it } from "vitest";

import type {
  DeleteBubbleArtifacts as BackendDeleteBubbleArtifacts,
  DeleteBubbleResult as BackendDeleteBubbleResult
} from "../../src/contracts/deleteBubble.js";
import type {
  DeleteBubbleArtifacts as CanonicalDeleteBubbleArtifacts,
  DeleteBubbleResult as CanonicalDeleteBubbleResult
} from "../../src/contracts/ui/deleteBubble.js";
import type {
  BubbleDeleteArtifacts,
  BubbleDeleteResult
} from "../../ui/src/lib/types.js";

type Assert<T extends true> = T;

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends
    (<T>() => T extends B ? 1 : 2)
    ? (<T>() => T extends B ? 1 : 2) extends
        (<T>() => T extends A ? 1 : 2)
        ? true
        : false
    : false;

type _backendArtifactsUiParity =
  Assert<Equal<BackendDeleteBubbleArtifacts, BubbleDeleteArtifacts>>;
type _backendResultUiParity =
  Assert<Equal<BackendDeleteBubbleResult, BubbleDeleteResult>>;
type _canonicalArtifactsBackendParity =
  Assert<Equal<CanonicalDeleteBubbleArtifacts, BackendDeleteBubbleArtifacts>>;
type _canonicalResultBackendParity =
  Assert<Equal<CanonicalDeleteBubbleResult, BackendDeleteBubbleResult>>;

const deleteResultSample: CanonicalDeleteBubbleResult = {
  bubbleId: "bubble-a",
  deleted: true,
  requiresConfirmation: false,
  artifacts: {
    worktree: {
      exists: false,
      path: "/tmp/worktree"
    },
    tmux: {
      exists: false,
      sessionName: "pf-bubble-a"
    },
    runtimeSession: {
      exists: false,
      sessionName: null
    },
    branch: {
      exists: false,
      name: "bubble/bubble-a"
    }
  },
  tmuxSessionTerminated: true,
  runtimeSessionRemoved: true,
  removedWorktree: true,
  removedBubbleBranch: true
};

function acceptBackendDeleteResult(
  result: BackendDeleteBubbleResult
): BackendDeleteBubbleResult {
  return result;
}

function acceptUiDeleteResult(result: BubbleDeleteResult): BubbleDeleteResult {
  return result;
}

function acceptCanonicalDeleteResult(
  result: CanonicalDeleteBubbleResult
): CanonicalDeleteBubbleResult {
  return result;
}

describe("delete bubble contract type parity", () => {
  it("keeps backend and UI delete result contracts equal to canonical shape", () => {
    const backendResult = acceptBackendDeleteResult(deleteResultSample);
    const uiResult = acceptUiDeleteResult(deleteResultSample);
    const canonicalResult = acceptCanonicalDeleteResult(uiResult);

    expect(backendResult.artifacts.runtimeSession.sessionName).toBeNull();
    expect(canonicalResult).toEqual(deleteResultSample);
  });
});
