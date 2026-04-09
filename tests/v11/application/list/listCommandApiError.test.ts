import { describe, expect, it } from "vitest";

import { RepoResolutionError } from "../../../../src/v11/infrastructure/executor/workspace/repoResolution.js";
import {
  asBubbleListError,
  BubbleListError
} from "../../../../src/v11/application/list/listCommandApi.js";

describe("listCommandApi error normalization", () => {
  it("preserves repo resolution context", () => {
    const input = new RepoResolutionError("repo missing");

    try {
      asBubbleListError(input, {
        repoPathProvided: true,
        cwdProvided: true
      });
      throw new Error("Expected BubbleListError");
    } catch (error) {
      expect(error).toBeInstanceOf(BubbleListError);
      expect(error).toMatchObject({
        message: "repo missing",
        context: {
          source: "repo_resolution",
          repoPathProvided: true,
          cwdProvided: true,
          causeName: "RepoResolutionError"
        }
      });
    }
  });

  it("marks unexpected failures separately", () => {
    const input = new Error("boom");

    try {
      asBubbleListError(input, {
        repoPathProvided: false,
        cwdProvided: true
      });
      throw new Error("Expected BubbleListError");
    } catch (error) {
      expect(error).toBeInstanceOf(BubbleListError);
      expect(error).toMatchObject({
        message: "boom",
        context: {
          source: "unexpected_error",
          repoPathProvided: false,
          cwdProvided: true,
          causeName: "Error"
        }
      });
    }
  });
});
