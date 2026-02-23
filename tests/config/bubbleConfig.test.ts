import { describe, expect, it } from "vitest";

import {
  parseBubbleConfigToml,
  parseToml,
  renderBubbleConfigToml,
  validateBubbleConfig
} from "../../src/config/bubbleConfig.js";

const baseToml = `
id = "b_test_01"
repo_path = "/tmp/repo"
base_branch = "main"
bubble_branch = "bubble/b_test_01"

[agents]
implementer = "codex"
reviewer = "claude"

[commands]
test = "pnpm test"
typecheck = "pnpm typecheck"
`;

describe("bubble config schema", () => {
  it("parses valid TOML and applies defaults", () => {
    const config = parseBubbleConfigToml(baseToml);
    expect(config.quality_mode).toBe("strict");
    expect(config.reviewer_context_mode).toBe("fresh");
    expect(config.watchdog_timeout_minutes).toBe(5);
    expect(config.work_mode).toBe("worktree");
    expect(config.notifications.enabled).toBe(true);
    expect(config.local_overlay?.enabled).toBe(true);
    expect(config.local_overlay?.mode).toBe("symlink");
    expect(config.local_overlay?.entries).toEqual([
      ".claude",
      ".mcp.json",
      ".env.local",
      ".env.production"
    ]);
  });

  it("rejects unsupported quality mode", () => {
    const result = validateBubbleConfig({
      id: "b_test_01",
      repo_path: "/tmp/repo",
      base_branch: "main",
      bubble_branch: "bubble/b_test_01",
      work_mode: "worktree",
      quality_mode: "balanced",
      watchdog_timeout_minutes: 5,
      max_rounds: 8,
      commit_requires_approval: true,
      agents: {
        implementer: "codex",
        reviewer: "claude"
      },
      commands: {
        test: "pnpm test",
        typecheck: "pnpm typecheck"
      },
      notifications: {
        enabled: true
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors.some((error) => error.path === "quality_mode")).toBe(true);
  });

  it("rejects unsupported reviewer context mode", () => {
    const result = validateBubbleConfig({
      id: "b_test_01",
      repo_path: "/tmp/repo",
      base_branch: "main",
      bubble_branch: "bubble/b_test_01",
      work_mode: "worktree",
      quality_mode: "strict",
      reviewer_context_mode: "sticky",
      watchdog_timeout_minutes: 5,
      max_rounds: 8,
      commit_requires_approval: true,
      agents: {
        implementer: "codex",
        reviewer: "claude"
      },
      commands: {
        test: "pnpm test",
        typecheck: "pnpm typecheck"
      },
      notifications: {
        enabled: true
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(
      result.errors.some((error) => error.path === "reviewer_context_mode")
    ).toBe(true);
  });

  it("rejects unsupported local overlay mode", () => {
    const result = validateBubbleConfig({
      id: "b_test_01",
      repo_path: "/tmp/repo",
      base_branch: "main",
      bubble_branch: "bubble/b_test_01",
      work_mode: "worktree",
      quality_mode: "strict",
      reviewer_context_mode: "fresh",
      watchdog_timeout_minutes: 5,
      max_rounds: 8,
      commit_requires_approval: true,
      agents: {
        implementer: "codex",
        reviewer: "claude"
      },
      commands: {
        test: "pnpm test",
        typecheck: "pnpm typecheck"
      },
      notifications: {
        enabled: true
      },
      local_overlay: {
        enabled: true,
        mode: "hardlink",
        entries: [".claude"]
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors.some((error) => error.path === "local_overlay.mode")).toBe(true);
  });

  it("rejects unsafe local overlay entries", () => {
    const result = validateBubbleConfig({
      id: "b_test_01",
      repo_path: "/tmp/repo",
      base_branch: "main",
      bubble_branch: "bubble/b_test_01",
      work_mode: "worktree",
      quality_mode: "strict",
      reviewer_context_mode: "fresh",
      watchdog_timeout_minutes: 5,
      max_rounds: 8,
      commit_requires_approval: true,
      agents: {
        implementer: "codex",
        reviewer: "claude"
      },
      commands: {
        test: "pnpm test",
        typecheck: "pnpm typecheck"
      },
      notifications: {
        enabled: true
      },
      local_overlay: {
        enabled: true,
        mode: "symlink",
        entries: ["../.env.local"]
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(
      result.errors.some((error) => error.path === "local_overlay.entries")
    ).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = validateBubbleConfig({
      id: "b_test_01"
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors.some((error) => error.path === "repo_path")).toBe(true);
    expect(result.errors.some((error) => error.path === "agents")).toBe(true);
  });

  it("rejects same implementer and reviewer", () => {
    const result = validateBubbleConfig({
      id: "b_test_01",
      repo_path: "/tmp/repo",
      base_branch: "main",
      bubble_branch: "bubble/b_test_01",
      work_mode: "worktree",
      quality_mode: "strict",
      reviewer_context_mode: "fresh",
      watchdog_timeout_minutes: 5,
      max_rounds: 8,
      commit_requires_approval: true,
      agents: {
        implementer: "codex",
        reviewer: "codex"
      },
      commands: {
        test: "pnpm test",
        typecheck: "pnpm typecheck"
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors.some((error) => error.path === "agents")).toBe(true);
  });

  it("renders and re-parses bubble TOML", () => {
    const rendered = renderBubbleConfigToml({
      id: "b_test_01",
      repo_path: "/tmp/repo",
      base_branch: "main",
      bubble_branch: "bubble/b_test_01",
      work_mode: "worktree",
      quality_mode: "strict",
      reviewer_context_mode: "fresh",
      watchdog_timeout_minutes: 5,
      max_rounds: 8,
      commit_requires_approval: true,
      open_command: "cursor {{worktree_path}}",
      agents: {
        implementer: "codex",
        reviewer: "claude"
      },
      commands: {
        test: "pnpm test",
        typecheck: "pnpm typecheck"
      },
      notifications: {
        enabled: true
      },
      local_overlay: {
        enabled: true,
        mode: "copy",
        entries: [".claude", ".env.local"]
      }
    });

    const reparsed = parseBubbleConfigToml(rendered);
    expect(reparsed.id).toBe("b_test_01");
    expect(reparsed.commands.typecheck).toBe("pnpm typecheck");
    expect(reparsed.local_overlay?.mode).toBe("copy");
    expect(reparsed.local_overlay?.entries).toEqual([".claude", ".env.local"]);
  });

  it("does not emit duplicate blank lines when open_command is omitted", () => {
    const rendered = renderBubbleConfigToml({
      id: "b_test_01",
      repo_path: "/tmp/repo",
      base_branch: "main",
      bubble_branch: "bubble/b_test_01",
      work_mode: "worktree",
      quality_mode: "strict",
      reviewer_context_mode: "fresh",
      watchdog_timeout_minutes: 5,
      max_rounds: 8,
      commit_requires_approval: true,
      agents: {
        implementer: "codex",
        reviewer: "claude"
      },
      commands: {
        test: "pnpm test",
        typecheck: "pnpm typecheck"
      },
      notifications: {
        enabled: true
      }
    });

    expect(rendered.includes("\n\n\n")).toBe(false);
  });
});

describe("custom TOML parser", () => {
  it("supports inline comments and single-quoted strings", () => {
    const parsed = parseToml(`
id = "b_test_01" # inline comment
repo_path = '/tmp/repo'
`);

    expect(parsed.id).toBe("b_test_01");
    expect(parsed.repo_path).toBe("/tmp/repo");
  });

  it("supports array values", () => {
    const parsed = parseToml(`refs = ["a", "b", "c"]`);
    expect(parsed.refs).toEqual(["a", "b", "c"]);
  });

  it("throws on duplicate keys", () => {
    expect(() =>
      parseToml(`
id = "a"
id = "b"
`)
    ).toThrow(/Duplicate TOML key/u);
  });

  it("throws on unsupported array-of-tables", () => {
    expect(() =>
      parseToml(`
[[agents]]
name = "codex"
`)
    ).toThrow(/Array-of-tables/u);
  });

  it("throws on unsupported dotted keys", () => {
    expect(() => parseToml(`a.b = "c"`)).toThrow(/Dotted TOML keys/u);
  });

  it("throws on unsupported multiline strings", () => {
    expect(() =>
      parseToml('summary = """line1\nline2"""')
    ).toThrow(/Multiline TOML strings/u);
  });
});
