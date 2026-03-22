import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import {
  buildAskHumanExecutionStepInput,
  buildAskHumanFinalizationStepInput
} from "../../../../src/v11/shared/askHuman/askHumanFlowStepInputBuilders.js";

describe("askHumanFlowStepInputBuilders", () => {
  it("builds execution step input payload", () => {
    const now = new Date("2026-02-21T12:10:00.000Z");
    const routing = {
      question: "Need migration decision?"
    } as never;
    const createError = (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message));

    expect(
      buildAskHumanExecutionStepInput({
        now,
        routing,
        createError
      })
    ).toEqual({
      now,
      routing,
      createError
    });
  });

  it("builds finalization step input payload", () => {
    const now = new Date("2026-02-21T12:10:00.000Z");
    const routing = {
      question: "Need migration decision?"
    } as never;
    const appended = {
      envelope: {
        id: "msg_20260221_001"
      },
      sequence: 3
    } as never;
    const written = {
      state: {
        state: "WAITING_HUMAN"
      }
    } as never;

    expect(
      buildAskHumanFinalizationStepInput({
        now,
        routing,
        appended,
        written
      })
    ).toEqual({
      now,
      routing,
      appended,
      written
    });
  });
});
