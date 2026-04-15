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

  it("forwards remote alias into the create input", () => {
    const built = buildCreateBubbleInput(
      {
        id: "b_create_remote_helper_01",
        repo: "/tmp/repo",
        base: "main",
        reviewArtifactType: "code",
        task: "Implement remote create",
        remote: "homelab"
      },
      "/tmp"
    );

    expect(built.input.remote).toBe("homelab");
  });
});
