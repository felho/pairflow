import { describe, expect, it, vi } from "vitest";

import {
  buildCreateBubbleInput,
  resolveBubbleCreateCommandDependencies
} from "../../../../src/v11/application/create/createCliRunHelpers.js";

describe("create CLI run helpers", () => {
  it("leaves repo registry wiring to the caller boundary", () => {
    const resolved = resolveBubbleCreateCommandDependencies({});

    expect(resolved.register).toBeUndefined();
  });

  it("keeps explicit dependency overrides intact", () => {
    const createBubble = vi.fn();
    const registerRepoInRegistry = vi.fn();

    const resolved = resolveBubbleCreateCommandDependencies({
      createBubble,
      registerRepoInRegistry
    });

    expect(resolved.create).toBe(createBubble);
    expect(resolved.register).toBe(registerRepoInRegistry);
  });

  it("propagates remote alias into the create input contract", () => {
    const result = buildCreateBubbleInput(
      {
        id: "b_create_remote_helper_01",
        repo: "../repo",
        base: "main",
        reviewArtifactType: "code",
        remote: "homelab",
        task: "Implement X"
      },
      "/tmp/workspace"
    );

    expect(result.input.remote).toBe("homelab");
  });
});
