import { describe, expect, it } from "vitest";

import {
  BUBBLE_EXECUTOR_INVALID,
  assertValidBubbleConfigRemoteReferences,
  assertCreateReviewArtifactType,
  assertPairflowCommandProfile,
  INVALID_REVIEW_ARTIFACT_TYPE_OPTION,
  MISSING_REVIEW_ARTIFACT_TYPE_OPTION,
  PAIRFLOW_COMMAND_PROFILE_INVALID,
  parseBubbleConfigToml,
  parseToml,
  REVIEW_ARTIFACT_TYPE_AUTO_REMOVED,
  renderBubbleConfigToml,
  validateBubbleConfigRemoteReferences,
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
    expect(config.review_artifact_type).toBe("code");
    expect(config.pairflow_command_profile).toBe("external");
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

  it("parses and renders pass validation command policy fields", () => {
    const config = parseBubbleConfigToml(
      `${baseToml}lint = "pnpm lint"\nvalidation_required = ["lint", "typecheck", "test"]\nvalidation_required_explicit = false\n`
    );
    expect(config.commands.lint).toBe("pnpm lint");
    expect(config.commands.validation_required).toEqual([
      "lint",
      "typecheck",
      "test"
    ]);
    expect(config.commands.validation_required_explicit).toBe(false);

    const rendered = renderBubbleConfigToml(config);
    expect(rendered).toContain('lint = "pnpm lint"');
    expect(rendered).toContain('validation_required = ["lint", "typecheck", "test"]');
    expect(rendered).toContain("validation_required_explicit = false");
  });

  it("parses and roundtrips optional [executor] metadata", () => {
    const config = parseBubbleConfigToml(`${baseToml}
[executor]
type = "ssh"
remote = "homelab"
`);

    expect(config.executor).toEqual({
      type: "ssh",
      remote: "homelab"
    });

    const rendered = renderBubbleConfigToml(config);
    expect(rendered).toContain("[executor]");
    expect(rendered).toContain('type = "ssh"');
    expect(rendered).toContain('remote = "homelab"');

    const reparsed = parseBubbleConfigToml(rendered);
    expect(reparsed.executor).toEqual({
      type: "ssh",
      remote: "homelab"
    });
  });

  it("applies doc_contract_gates defaults when sections are omitted", () => {
    const config = parseBubbleConfigToml(baseToml);
    expect(config.doc_contract_gates).toEqual({
      round_gate_applies_after: 2
    });
  });

  it("ignores legacy enforcement_mode values and keeps doc gate defaults", () => {
    const config = parseBubbleConfigToml(`${baseToml}
[enforcement_mode]
all_gate = "blocking"

[doc_contract_gates]
round_gate_applies_after = -1
`);

    expect(config.doc_contract_gates.round_gate_applies_after).toBe(2);
    expect(config.doc_contract_gates.parse_warning).toContain("round_gate_applies_after");
  });

  it("serializes and restores doc gate parse_warning through TOML roundtrip", () => {
    const rendered = renderBubbleConfigToml({
      id: "b_test_parse_warning_roundtrip_01",
      repo_path: "/tmp/repo",
      base_branch: "main",
      bubble_branch: "bubble/b_test_parse_warning_roundtrip_01",
      work_mode: "worktree",
      quality_mode: "strict",
      review_artifact_type: "code",
      pairflow_command_profile: "external",
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
        round_gate_applies_after: 2,
        parse_warning: "doc_contract_gates.round_gate_applies_after invalid; fallback applied."
      }
    });

    expect(rendered).toContain("parse_warning = ");
    const reparsed = parseBubbleConfigToml(rendered);
    expect(reparsed.doc_contract_gates.parse_warning).toContain(
      "doc_contract_gates.round_gate_applies_after invalid"
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
        round_gate_applies_after: 2
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors.some((error) => error.path === "quality_mode")).toBe(true);
  });

  it("rejects unsupported executor metadata and inline remote duplication", () => {
    const result = validateBubbleConfig({
      id: "b_test_01",
      repo_path: "/tmp/repo",
      base_branch: "main",
      bubble_branch: "bubble/b_test_01",
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
      executor: {
        type: "docker",
        remote: "homelab",
        host: "ssh-host"
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(
      result.errors.some(
        (error) =>
          error.path === "executor.type"
          && error.message.includes(BUBBLE_EXECUTOR_INVALID)
      )
    ).toBe(true);
    expect(
      result.errors.some(
        (error) =>
          error.path === "executor.host"
          && error.message.includes("Inline remote host details are not allowed")
      )
    ).toBe(true);
  });

  it("rejects unknown extra fields in [executor]", () => {
    const result = validateBubbleConfig({
      id: "b_test_01",
      repo_path: "/tmp/repo",
      base_branch: "main",
      bubble_branch: "bubble/b_test_01",
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
      executor: {
        type: "ssh",
        remote: "homelab",
        profile: "remote-dev"
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(
      result.errors.some(
        (error) =>
          error.path === "executor.profile"
          && error.message.includes("Unknown executor field")
      )
    ).toBe(true);
  });

  it("cross-validates executor.remote against the global remotes map", () => {
    const bubbleConfig = parseBubbleConfigToml(`${baseToml}
[executor]
type = "ssh"
remote = "homelab"
`);

    const result = validateBubbleConfigRemoteReferences({
      bubbleConfig,
      globalConfig: {
        remotes: {
          workstation: {
            host: "office-ws",
            repo_base: "/data/repos"
          }
        }
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors).toEqual([
      {
        path: "executor.remote",
        message:
          `${BUBBLE_EXECUTOR_INVALID}: Remote "homelab" is not defined in the global [remotes.<name>] config`
      }
    ]);
  });

  it("fails remote cross-validation when the global remotes map is absent", () => {
    const bubbleConfig = parseBubbleConfigToml(`${baseToml}
[executor]
type = "ssh"
remote = "homelab"
`);

    const result = validateBubbleConfigRemoteReferences({
      bubbleConfig,
      globalConfig: {}
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors).toEqual([
      {
        path: "executor.remote",
        message:
          `${BUBBLE_EXECUTOR_INVALID}: Remote "homelab" is not defined in the global [remotes.<name>] config`
      }
    ]);
  });

  it("accepts executor.remote when the global remotes map contains the alias", () => {
    const bubbleConfig = parseBubbleConfigToml(`${baseToml}
[executor]
type = "ssh"
remote = "homelab"
`);

    expect(
      assertValidBubbleConfigRemoteReferences({
        bubbleConfig,
        globalConfig: {
          remotes: {
            homelab: {
              host: "homelab",
              repo_base: "~/repos"
            }
          }
        }
      })
    ).toEqual(bubbleConfig);
  });

  it("cross-validates executor.remote through parseBubbleConfigToml when globalConfig is supplied", () => {
    expect(
      parseBubbleConfigToml(`${baseToml}
[executor]
type = "ssh"
remote = "homelab"
`, {
        globalConfig: {
          remotes: {
            homelab: {
              host: "homelab",
              repo_base: "~/repos"
            }
          }
        }
      })
    ).toMatchObject({
      executor: {
        type: "ssh",
        remote: "homelab"
      }
    });
  });

  it("fails parseBubbleConfigToml when supplied globalConfig is missing executor.remote", () => {
    try {
      parseBubbleConfigToml(`${baseToml}
[executor]
type = "ssh"
remote = "homelab"
`, {
        globalConfig: {}
      });
      throw new Error("Expected parseBubbleConfigToml to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("Invalid bubble config remote references");
    }
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
      review_artifact_type: "code",
      pairflow_command_profile: "external",
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
        review_artifact_type: "code",
      pairflow_command_profile: "external",
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
      review_artifact_type: "code",
      pairflow_command_profile: "external",
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
      review_artifact_type: "code",
      pairflow_command_profile: "external",
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
      review_artifact_type: "code",
      pairflow_command_profile: "external",
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
      review_artifact_type: "code",
      pairflow_command_profile: "external",
      reviewer_context_mode: "fresh",
      watchdog_timeout_minutes: 5,
      max_rounds: 8,
      severity_gate_round: 4,
      commit_requires_approval: true,
      attach_launcher: "ghostty",
      open_command: "cursor {{worktree_path}}",
      open_remote_command:
        'code --folder-uri "vscode-remote://ssh-remote+{{remote_authority}}{{remote_clone_path}}"',
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
    expect(reparsed.open_remote_command).toBe(
      'code --folder-uri "vscode-remote://ssh-remote+{{remote_authority}}{{remote_clone_path}}"'
    );
    expect(reparsed.local_overlay?.mode).toBe("copy");
    expect(reparsed.local_overlay?.entries).toEqual([".claude", ".env.local"]);
  });

  it("renders and re-parses bubble TOML with self_host profile", () => {
    const rendered = renderBubbleConfigToml({
      id: "b_test_self_host_roundtrip_01",
      repo_path: "/tmp/repo",
      base_branch: "main",
      bubble_branch: "bubble/b_test_self_host_roundtrip_01",
      work_mode: "worktree",
      quality_mode: "strict",
      review_artifact_type: "code",
      pairflow_command_profile: "self_host",
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
        round_gate_applies_after: 2
      },
      local_overlay: {
        enabled: true,
        mode: "symlink",
        entries: [".claude"]
      }
    });

    expect(rendered).toContain('pairflow_command_profile = "self_host"');
    const reparsed = parseBubbleConfigToml(rendered);
    expect(reparsed.pairflow_command_profile).toBe("self_host");
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

  it("parses explicit open_remote_command from TOML input", () => {
    const parsed = parseBubbleConfigToml(`
id = "b_test_open_remote_command"
repo_path = "/tmp/repo"
base_branch = "main"
bubble_branch = "bubble/b_test_open_remote_command"
open_remote_command = "code --folder-uri \\"vscode-remote://ssh-remote+{{remote_authority}}{{remote_clone_path}}\\""

[agents]
implementer = "codex"
reviewer = "claude"

[commands]
test = "pnpm test"
typecheck = "pnpm typecheck"
`);

    expect(parsed.open_remote_command).toBe(
      'code --folder-uri "vscode-remote://ssh-remote+{{remote_authority}}{{remote_clone_path}}"'
    );
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

  it("rejects empty or whitespace open_remote_command when explicitly set", () => {
    const result = validateBubbleConfig({
      id: "b_test_open_remote_command_invalid",
      repo_path: "/tmp/repo",
      base_branch: "main",
      bubble_branch: "bubble/b_test_open_remote_command_invalid",
      open_remote_command: "   ",
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
    expect(
      result.errors.some((error) => error.path === "open_remote_command")
    ).toBe(true);
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
      review_artifact_type: "code",
      pairflow_command_profile: "external",
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
      review_artifact_type: "code",
      pairflow_command_profile: "external",
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
      review_artifact_type: "code",
      pairflow_command_profile: "external",
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

describe("assertPairflowCommandProfile", () => {
  it("accepts external and self_host values", () => {
    expect(assertPairflowCommandProfile("external")).toBe("external");
    expect(assertPairflowCommandProfile("self_host")).toBe("self_host");
  });

  it("rejects empty and whitespace-only values", () => {
    expect(() => assertPairflowCommandProfile("")).toThrow(
      new RegExp(`^${PAIRFLOW_COMMAND_PROFILE_INVALID}:`, "u")
    );
    expect(() => assertPairflowCommandProfile("   ")).toThrow(
      new RegExp(`^${PAIRFLOW_COMMAND_PROFILE_INVALID}:`, "u")
    );
  });

  it("rejects invalid values with deterministic reason code", () => {
    expect(() => assertPairflowCommandProfile("hosted")).toThrow(
      new RegExp(`^${PAIRFLOW_COMMAND_PROFILE_INVALID}:`, "u")
    );
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
