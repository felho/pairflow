import { describe, expect, it } from "vitest";

import type {
  DeleteBubbleArtifacts,
  DeleteBubbleResult
} from "../../src/contracts/deleteBubble.js";
import type {
  BubbleDeleteArtifacts,
  BubbleDeleteResult
} from "../../ui/src/lib/types.js";

type AssertAssignable<Source, Target extends Source> = true;

const backendArtifactsAssignableToUi: AssertAssignable<
  DeleteBubbleArtifacts,
  BubbleDeleteArtifacts
> = true;
const uiArtifactsAssignableToBackend: AssertAssignable<
  BubbleDeleteArtifacts,
  DeleteBubbleArtifacts
> = true;
const backendResultAssignableToUi: AssertAssignable<
  DeleteBubbleResult,
  BubbleDeleteResult
> = true;
const uiResultAssignableToBackend: AssertAssignable<
  BubbleDeleteResult,
  DeleteBubbleResult
> = true;

describe("delete bubble contract type parity", () => {
  it("keeps backend and UI delete result contracts bidirectionally assignable", () => {
    expect(backendArtifactsAssignableToUi).toBe(true);
    expect(uiArtifactsAssignableToBackend).toBe(true);
    expect(backendResultAssignableToUi).toBe(true);
    expect(uiResultAssignableToBackend).toBe(true);
  });
});
