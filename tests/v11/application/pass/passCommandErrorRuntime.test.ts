import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import { createPassCommandErrorRuntime } from "../../../../src/v11/application/pass/internal/normalPass/passCommandErrorRuntime.js";

class SyntheticPassCommandError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SyntheticPassCommandError";
  }
}

describe("passCommandErrorRuntime", () => {
  it("exposes createError via the provided factory", () => {
    const runtime = createPassCommandErrorRuntime({
      createPassCommandError: (message) => new SyntheticPassCommandError(toErrorMessage(message)),
      raiseDownstreamRejected: ({ reason, createError }) => {
        throw createError(`wrapped:${reason}`);
      }
    });

    const error = runtime.createError("boom");
    expect(error).toBeInstanceOf(SyntheticPassCommandError);
    expect(error.message).toBe("boom");
  });

  it("delegates downstream rejection with the shared createError callback", () => {
    let capturedReason: string | undefined;
    let capturedErrorMessage: string | undefined;

    const runtime = createPassCommandErrorRuntime({
      createPassCommandError: (message) => new SyntheticPassCommandError(toErrorMessage(message)),
      raiseDownstreamRejected: ({ reason, createError }) => {
        capturedReason = reason;
        capturedErrorMessage = createError("from-callback").message;
        throw createError(`wrapped:${reason}`);
      }
    });

    expect(() => runtime.onDownstreamRejected("downstream failed")).toThrow(
      "wrapped:downstream failed"
    );
    expect(capturedReason).toBe("downstream failed");
    expect(capturedErrorMessage).toBe("from-callback");
  });
});
