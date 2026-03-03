import { afterEach, describe, expect, it, vi } from "vitest";

import { copyToClipboard } from "./clipboard";

const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(
  navigator,
  "clipboard"
);

describe("copyToClipboard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    if (originalClipboardDescriptor === undefined) {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: undefined
      });
      return;
    }
    Object.defineProperty(navigator, "clipboard", originalClipboardDescriptor);
  });

  it("writes text through navigator.clipboard.writeText when available", async () => {
    const writeText = vi
      .fn<(text: string) => Promise<void>>()
      .mockResolvedValue(undefined);

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText } as Pick<Clipboard, "writeText">
    });

    await copyToClipboard("bubble-123");

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith("bubble-123");
  });

  it("throws a clear error when clipboard API is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined
    });

    await expect(copyToClipboard("bubble-123")).rejects.toThrow(
      "Clipboard API is not available in this environment."
    );
  });
});
