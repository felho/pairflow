import { describe, expect, it } from "vitest";

import {
  getAvailableActionsForState,
  isActionAvailableForState
} from "./actionAvailability";
import { bubbleActionKinds, bubbleLifecycleStates, type BubbleActionKind, type BubbleLifecycleState } from "./types";

const expectedMatrix: Record<BubbleLifecycleState, readonly BubbleActionKind[]> = {
  CREATED: ["start", "stop"],
  PREPARING_WORKSPACE: ["stop"],
  RUNNING: ["open", "stop"],
  WAITING_HUMAN: ["reply", "resume", "open", "stop"],
  READY_FOR_APPROVAL: ["approve", "request-rework", "open", "stop"],
  APPROVED_FOR_COMMIT: ["commit", "open", "stop"],
  COMMITTED: ["open", "stop"],
  DONE: ["merge", "open"],
  FAILED: ["open"],
  CANCELLED: ["open"]
};

describe("actionAvailability", () => {
  for (const state of bubbleLifecycleStates) {
    it(`matches matrix for ${state}`, () => {
      expect(getAvailableActionsForState(state)).toEqual(expectedMatrix[state]);

      for (const action of bubbleActionKinds) {
        const expected = expectedMatrix[state].includes(action);
        expect(isActionAvailableForState(state, action)).toBe(expected);
      }
    });
  }

  it("keeps disallowed actions absent in final and terminal states", () => {
    expect(getAvailableActionsForState("COMMITTED")).toEqual(["open", "stop"]);
    expect(getAvailableActionsForState("DONE")).toEqual(["merge", "open"]);
    expect(getAvailableActionsForState("FAILED")).toEqual(["open"]);
    expect(getAvailableActionsForState("CANCELLED")).toEqual(["open"]);
  });
});
