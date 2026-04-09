import { describe, expect, it, vi } from "vitest";

import { createCliDependencyDefaults } from "../../../../src/core/repo/createCliDefaults.js";
import {
  resolveBubbleCreateCommandDependencies
} from "../../../../src/v11/application/create/createCliRunHelpers.js";

describe("create CLI run helpers", () => {
  it("uses the core perimeter repo registry default when no override is provided", () => {
    const resolved = resolveBubbleCreateCommandDependencies({});

    expect(resolved.register).toBe(
      createCliDependencyDefaults.registerRepoInRegistry
    );
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
});
