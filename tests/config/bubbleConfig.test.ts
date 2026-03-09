import { describe, expect, it } from "vitest";

import {
  assertCreateReviewArtifactType,
  INVALID_REVIEW_ARTIFACT_TYPE_OPTION,
  MISSING_REVIEW_ARTIFACT_TYPE_OPTION,
  parseBubbleConfigToml,
  parseToml,
  REVIEW_ARTIFACT_TYPE_AUTO_REMOVED,
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
    expect(config.review_artifact_type).toBe("auto");
    expect(config.reviewer_context_mode).toBe("fresh");
    expect(config.watchdog_timeout_minutes).toBe(30);
    expect(config.work_mode).toBe("worktree");
    expect(config.severity_gate_round).toBe(4);
    expect(config.attach_launcher).toBeUndefined();
    expect(config.notifications.enabled).toBe(true);
    expect(config.accuracy_critical).toBe(false);
    expect(config.local_overlay?.enabled).toBe(true);
    expect(config.local_overlay?.mode).toBe("symlink");
    expect(config.local_overlay?.entries).toEqual([
      ".claude",
      ".mcp.json",
      ".env.local",
      ".env.production"
    ]);
    expect(config.doc_contract_gates.mode).toBe("advisory-for-all-gates");
    expect(config.doc_contract_gates.round_gate_applies_after).toBe(2);
  });

  it("roundtrips explicit severity_gate_round above default", () => {
    const config = parseBubbleConfigToml(
      baseToml.replace("\n\n[agents]", "\nseverity_gate_round = 8\n\n[agents]")
    );
    expect(config.severity_gate_round).toBe(8);

    const rendered = renderBubbleConfigToml(config);
    const reparsed = parseBubbleConfigToml(rendered);
    expect(reparsed.severity_gate_round).toBe(8);
  });

  it("parses and renders optional commands.bootstrap", () => {
    const config = parseBubbleConfigToml(
      `${baseToml}bootstrap = "pnpm install --frozen-lockfile && pnpm build"\n`
    );
    expect(config.commands.bootstrap).toBe(
      "pnpm install --frozen-lockfile && pnpm build"
    );

    const rendered = renderBubbleConfigToml(config);
    expect(rendered).toContain(
      'bootstrap = "pnpm install --frozen-lockfile && pnpm build"'
    );
    const reparsed = parseBubbleConfigToml(rendered);
    expect(reparsed.commands.bootstrap).toBe(
      "pnpm install --frozen-lockfile && pnpm build"
    );
  });

  it("applies doc_contract_gates defaults when section is omitted", () => {
    const config = parseBubbleConfigToml(baseToml);
    expect(config.doc_contract_gates).toEqual({
      mode: "advisory-for-all-gates",
      round_gate_applies_after: 2
    });
  });

  it("accepts explicit required doc gate modes", () => {
    const requiredForDocs = parseBubbleConfigToml(`${baseToml}
[doc_contract_gates]
mode = "required-for-doc-gates"
`);
    expect(requiredForDocs.doc_contract_gates.mode).toBe("required-for-doc-gates");

    const requiredForAll = parseBubbleConfigToml(`${baseToml}
[doc_contract_gates]
mode = "required-for-all-gates"
`);
    expect(requiredForAll.doc_contract_gates.mode).toBe("required-for-all-gates");
  });

  it("keeps deterministic defaults and emits parse_warning for invalid doc_contract_gates values", () => {
    const config = parseBubbleConfigToml(`${baseToml}
[doc_contract_gates]
mode = "blocking"
round_gate_applies_after = -1
`);

    expect(config.doc_contract_gates.mode).toBe("advisory-for-all-gates");
    expect(config.doc_contract_gates.round_gate_applies_after).toBe(2);
    expect(config.doc_contract_gates.parse_warning).toContain("doc_contract_gates.mode");
    expect(config.doc_contract_gates.parse_warning).toContain("round_gate_applies_after");
  });

  it("serializes and restores doc_contract_gates.parse_warning through TOML roundtrip", () => {
    const rendered = renderBubbleConfigToml({
      id: "b_test_parse_warning_roundtrip_01",
      repo_path: "/tmp/repo",
      base_branch: "main",
      bubble_branch: "bubble/b_test_parse_warning_roundtrip_01",
      work_mode: "worktree",
      quality_mode: "strict",
      review_artifact_type: "auto",
      reviewer_context_mode: "fresh",
      watchdog_timeout_minutes: 20,
      max_rounds: 8,
      severity_gate_round: 4,
      commit_requires_approval: true,
      accuracy_critical: false,
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
        entries: [".claude"]
      },
      doc_contract_gates: {
        mode: "advisory-for-all-gates",
        round_gate_applies_after: 2,
        parse_warning: "doc_contract_gates.mode invalid; fallback applied."
      }
    });

    expect(rendered).toContain("parse_warning = ");
    const reparsed = parseBubbleConfigToml(rendered);
    expect(reparsed.doc_contract_gates.parse_warning).toContain(
      "doc_contract_gates.mode invalid"
    );
  });

  it("rejects severity_gate_round below minimum floor", () => {
    const result = validateBubbleConfig({
      id: "b_test_01",
      repo_path: "/tmp/repo",
      base_branch: "main",
      bubble_branch: "bubble/b_test_01",
      severity_gate_round: 3,
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
      result.errors.some(
        (error) =>
          error.path === "severity_gate_round"
          && error.message.includes("SEVERITY_GATE_ROUND_INVALID")
      )
    ).toBe(true);
  });

  it("rejects non-integer severity_gate_round", () => {
    const result = validateBubbleConfig({
      id: "b_test_01",
      repo_path: "/tmp/repo",
      base_branch: "main",
      bubble_branch: "bubble/b_test_01",
      severity_gate_round: 4.5,
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
      result.errors.some(
        (error) =>
          error.path === "severity_gate_round"
          && error.message.includes("SEVERITY_GATE_ROUND_INVALID")
      )
    ).toBe(true);
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
      attach_launcher: "auto",
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
      doc_contract_gates: {
        mode: "advisory-for-all-gates",
        round_gate_applies_after: 2
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
      },
      doc_contract_gates: {
        mode: "advisory-for-all-gates",
        round_gate_applies_after: 2
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

  it("rejects unsupported review artifact type", () => {
    const result = validateBubbleConfig({
      id: "b_test_01",
      repo_path: "/tmp/repo",
      base_branch: "main",
      bubble_branch: "bubble/b_test_01",
      work_mode: "worktree",
      quality_mode: "strict",
      review_artifact_type: "slides",
      reviewer_context_mode: "fresh",
      watchdog_timeout_minutes: 5,
      max_rounds: 8,
      severity_gate_round: 4,
      commit_requires_approval: true,
      attach_launcher: "auto",
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
      doc_contract_gates: {
        mode: "advisory-for-all-gates",
        round_gate_applies_after: 2
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(
      result.errors.some((error) => error.path === "review_artifact_type")
    ).toBe(true);
  });

  it("accepts strict create review artifact type values", () => {
    expect(assertCreateReviewArtifactType("document")).toBe("document");
    expect(assertCreateReviewArtifactType("code")).toBe("code");
  });

  it("rejects missing strict create review artifact type values", () => {
    expect(() => assertCreateReviewArtifactType(undefined)).toThrow(
      new RegExp(`^${MISSING_REVIEW_ARTIFACT_TYPE_OPTION}:`, "u")
    );
  });

  it("rejects auto strict create review artifact type values", () => {
    expect(() => assertCreateReviewArtifactType("auto")).toThrow(
      new RegExp(`^${REVIEW_ARTIFACT_TYPE_AUTO_REMOVED}:`, "u")
    );
  });

  it("rejects invalid strict create review artifact type values", () => {
    expect(() => assertCreateReviewArtifactType("slides")).toThrow(
      new RegExp(`^${INVALID_REVIEW_ARTIFACT_TYPE_OPTION}:`, "u")
    );
  });

  it("rejects unsupported local overlay mode", () => {
    const result = validateBubbleConfig({
      id: "b_test_01",
      repo_path: "/tmp/repo",
      base_branch: "main",
      bubble_branch: "bubble/b_test_01",
      work_mode: "worktree",
      quality_mode: "strict",
      review_artifact_type: "auto",
      reviewer_context_mode: "fresh",
      watchdog_timeout_minutes: 5,
      max_rounds: 8,
      severity_gate_round: 4,
      commit_requires_approval: true,
      attach_launcher: "auto",
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

  it("accepts supported attach launcher values", () => {
    const supportedValues = [
      "auto",
      "warp",
      "iterm2",
      "terminal",
      "ghostty",
      "copy"
    ];

    for (const value of supportedValues) {
      const result = validateBubbleConfig({
        id: "b_test_01",
        repo_path: "/tmp/repo",
        base_branch: "main",
        bubble_branch: "bubble/b_test_01",
        work_mode: "worktree",
        quality_mode: "strict",
        review_artifact_type: "auto",
        reviewer_context_mode: "fresh",
        watchdog_timeout_minutes: 5,
        max_rounds: 8,
        commit_requires_approval: true,
        attach_launcher: value,
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

      expect(result.ok).toBe(true);
      if (!result.ok) {
        continue;
      }
      expect(result.value.attach_launcher).toBe(value);
    }
  });

  it("rejects unsupported attach launcher values", () => {
    const result = validateBubbleConfig({
      id: "b_test_01",
      repo_path: "/tmp/repo",
      base_branch: "main",
      bubble_branch: "bubble/b_test_01",
      work_mode: "worktree",
      quality_mode: "strict",
      review_artifact_type: "auto",
      reviewer_context_mode: "fresh",
      watchdog_timeout_minutes: 5,
      max_rounds: 8,
      severity_gate_round: 4,
      commit_requires_approval: true,
      attach_launcher: "wezterm",
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
    expect(result.errors.some((error) => error.path === "attach_launcher")).toBe(
      true
    );
  });

  it("parses and renders accuracy_critical=true", () => {
    const config = parseBubbleConfigToml(`
id = "b_test_critical_01"
repo_path = "/tmp/repo"
base_branch = "main"
bubble_branch = "bubble/b_test_critical_01"
accuracy_critical = true

[agents]
implementer = "codex"
reviewer = "claude"

[commands]
test = "pnpm test"
typecheck = "pnpm typecheck"
`);

    expect(config.accuracy_critical).toBe(true);
    const rendered = renderBubbleConfigToml(config);
    expect(rendered).toContain("accuracy_critical = true");
  });

  it("rejects unsafe local overlay entries", () => {
    const result = validateBubbleConfig({
      id: "b_test_01",
      repo_path: "/tmp/repo",
      base_branch: "main",
      bubble_branch: "bubble/b_test_01",
      work_mode: "worktree",
      quality_mode: "strict",
      review_artifact_type: "auto",
      reviewer_context_mode: "fresh",
      watchdog_timeout_minutes: 5,
      max_rounds: 8,
      severity_gate_round: 4,
      commit_requires_approval: true,
      attach_launcher: "auto",
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
      review_artifact_type: "auto",
      reviewer_context_mode: "fresh",
      watchdog_timeout_minutes: 5,
      max_rounds: 8,
      severity_gate_round: 4,
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
      bubble_instance_id: "bi_00m8f7w14k_2f03e8b8e4f24d17ac12",
      repo_path: "/tmp/repo",
      base_branch: "main",
      bubble_branch: "bubble/b_test_01",
      work_mode: "worktree",
      quality_mode: "strict",
      review_artifact_type: "auto",
      reviewer_context_mode: "fresh",
      watchdog_timeout_minutes: 5,
      max_rounds: 8,
      severity_gate_round: 4,
      commit_requires_approval: true,
      attach_launcher: "ghostty",
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
      doc_contract_gates: {
        mode: "advisory-for-all-gates",
        round_gate_applies_after: 2
      },
      local_overlay: {
        enabled: true,
        mode: "copy",
        entries: [".claude", ".env.local"]
      }
    });

    const reparsed = parseBubbleConfigToml(rendered);
    expect(reparsed.id).toBe("b_test_01");
    expect(reparsed.bubble_instance_id).toBe(
      "bi_00m8f7w14k_2f03e8b8e4f24d17ac12"
    );
    expect(reparsed.commands.typecheck).toBe("pnpm typecheck");
    expect(reparsed.attach_launcher).toBe("ghostty");
    expect(reparsed.local_overlay?.mode).toBe("copy");
    expect(reparsed.local_overlay?.entries).toEqual([".claude", ".env.local"]);
  });

  it("parses explicit open_command from TOML input", () => {
    const parsed = parseBubbleConfigToml(`
id = "b_test_open_command"
repo_path = "/tmp/repo"
base_branch = "main"
bubble_branch = "bubble/b_test_open_command"
open_command = "cursor --reuse-window {{worktree_path}}"

[agents]
implementer = "codex"
reviewer = "claude"

[commands]
test = "pnpm test"
typecheck = "pnpm typecheck"
`);

    expect(parsed.open_command).toBe("cursor --reuse-window {{worktree_path}}");
  });

  it("rejects empty or whitespace open_command when explicitly set", () => {
    const result = validateBubbleConfig({
      id: "b_test_open_command_invalid",
      repo_path: "/tmp/repo",
      base_branch: "main",
      bubble_branch: "bubble/b_test_open_command_invalid",
      open_command: "   ",
      agents: {
        implementer: "codex",
        reviewer: "claude"
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
    expect(result.errors.some((error) => error.path === "open_command")).toBe(
      true
    );
  });

  it("rejects invalid bubble_instance_id format", () => {
    const result = validateBubbleConfig({
      id: "b_test_01",
      bubble_instance_id: "x",
      repo_path: "/tmp/repo",
      base_branch: "main",
      bubble_branch: "bubble/b_test_01",
      work_mode: "worktree",
      quality_mode: "strict",
      review_artifact_type: "auto",
      reviewer_context_mode: "fresh",
      watchdog_timeout_minutes: 5,
      max_rounds: 8,
      severity_gate_round: 4,
      commit_requires_approval: true,
      attach_launcher: "auto",
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
      doc_contract_gates: {
        mode: "advisory-for-all-gates",
        round_gate_applies_after: 2
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(
      result.errors.some((error) => error.path === "bubble_instance_id")
    ).toBe(true);
  });

  it("does not emit duplicate blank lines when open_command is omitted", () => {
    const rendered = renderBubbleConfigToml({
      id: "b_test_01",
      repo_path: "/tmp/repo",
      base_branch: "main",
      bubble_branch: "bubble/b_test_01",
      work_mode: "worktree",
      quality_mode: "strict",
      review_artifact_type: "auto",
      reviewer_context_mode: "fresh",
      watchdog_timeout_minutes: 5,
      max_rounds: 8,
      severity_gate_round: 4,
      commit_requires_approval: true,
      attach_launcher: "auto",
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
      doc_contract_gates: {
        mode: "advisory-for-all-gates",
        round_gate_applies_after: 2
      }
    });

    expect(rendered.includes("\n\n\n")).toBe(false);
  });

  it("omits attach_launcher when no bubble override is configured", () => {
    const rendered = renderBubbleConfigToml({
      id: "b_test_01",
      repo_path: "/tmp/repo",
      base_branch: "main",
      bubble_branch: "bubble/b_test_01",
      work_mode: "worktree",
      quality_mode: "strict",
      review_artifact_type: "auto",
      reviewer_context_mode: "fresh",
      watchdog_timeout_minutes: 5,
      max_rounds: 8,
      severity_gate_round: 4,
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
      doc_contract_gates: {
        mode: "advisory-for-all-gates",
        round_gate_applies_after: 2
      }
    });

    expect(rendered).not.toContain("attach_launcher =");
    expect(rendered).toContain(
      '# attach_launcher unset; attach uses ~/.pairflow/config.toml, then "auto"'
    );
    const reparsed = parseBubbleConfigToml(rendered);
    expect(reparsed.attach_launcher).toBeUndefined();
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
