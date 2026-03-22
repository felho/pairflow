import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import type { PassIntent } from "../../../../src/types/protocol.js";
import { resolvePassIntent } from "../../../../src/v11/application/pass/passIntentResolution.js";

describe("resolvePassIntent", () => {
  it("infers implementer intent from default resolver when input intent is missing", () => {
    const result = resolvePassIntent(
      {
        senderRole: "implementer",
        noFindings: false,
        hasFindings: false,
        createError: (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message))
      },
      {
        inferDefaultPassIntent: () => "review"
      }
    );

    expect(result).toEqual({
      intent: "review",
      inferredIntent: true
    });
  });

  it("uses inferred reviewer intent and runs reviewer override consistency guard", () => {
    let guardCalled = false;

    const result = resolvePassIntent(
      {
        senderRole: "reviewer",
        inferredReviewerIntent: "fix_request",
        noFindings: false,
        hasFindings: true,
        createError: (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message))
      },
      {
        assertReviewerIntentOverrideConsistency: (input) => {
          guardCalled = true;
          expect(input.intent).toBe("fix_request");
          expect(input.noFindings).toBe(false);
          expect(input.hasFindings).toBe(true);
        }
      }
    );

    expect(result).toEqual({
      intent: "fix_request",
      inferredIntent: true
    });
    expect(guardCalled).toBe(true);
  });

  it("throws when reviewer inferred intent is missing and no explicit intent is provided", () => {
    expect(() =>
      resolvePassIntent({
        senderRole: "reviewer",
        noFindings: false,
        hasFindings: true,
        createError: (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message))
      })
    ).toThrow("Reviewer PASS intent inference is missing before intent resolution.");
  });

  it("throws when intent candidate fails pass-intent validation", () => {
    expect(() =>
      resolvePassIntent(
        {
          senderRole: "implementer",
          inputIntent: "review" as PassIntent,
          noFindings: false,
          hasFindings: false,
          createError: (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message))
        },
        {
          isPassIntent: (_value): _value is PassIntent => false
        }
      )
    ).toThrow("Invalid pass intent: review");
  });
});
