import { describe, expect, it, vi } from "vitest";

import {
  DEPENDENCY_FAIL_REPO_REGISTRY_REGISTER,
  INVALID_REVIEW_ARTIFACT_TYPE_OPTION,
  MISSING_REVIEW_ARTIFACT_TYPE_OPTION,
  PAIRFLOW_COMMAND_PROFILE_INVALID,
  REVIEW_ARTIFACT_TYPE_AUTO_REMOVED
} from "../../src/config/bubbleConfig.js";
import { CREATE_REMOTE_ALIAS_INVALID } from "../../src/cli/commands/bubble/createCliOptionValidation.js";
import {
  IDEATION_TASK_INPUT_CONFLICT,
  IDEATION_TASK_REQUIRED
} from "../../src/v11/shared/ideation/ideationReasonCodes.js";
import {
  type BubbleCreateCommandDependencies,
  getBubbleCreateHelpText,
  parseBubbleCreateCommandOptions,
  runBubbleCreateCommand
} from "../../src/cli/commands/bubble/create.js";
import type { BubbleCreateResult } from "../../src/v11/application/create/createCommandContract.js";

describe("parseBubbleCreateCommandOptions", () => {
  it("parses required flags", () => {
    const parsed = parseBubbleCreateCommandOptions([
      "--id",
      "b_create_01",
      "--repo",
      "/tmp/repo",
      "--base",
      "main",
      "--review-artifact-type",
      "code",
      "--task",
      "Implement X"
    ]);

    expect(parsed.id).toBe("b_create_01");
    expect(parsed.repo).toBe("/tmp/repo");
    expect(parsed.base).toBe("main");
    expect(parsed.reviewArtifactType).toBe("code");
    expect(parsed.task).toBe("Implement X");
    expect(parsed.pairflowCommandProfile).toBeUndefined();
    expect(parsed.help).toBe(false);
  });

  it("parses --flag=value form", () => {
    const parsed = parseBubbleCreateCommandOptions([
      "--id=b_create_01",
      "--repo=/tmp/repo",
      "--base=main",
      "--review-artifact-type=code",
      "--task=Implement X"
    ]);

    expect(parsed.id).toBe("b_create_01");
    expect(parsed.repo).toBe("/tmp/repo");
    expect(parsed.base).toBe("main");
    expect(parsed.reviewArtifactType).toBe("code");
    expect(parsed.task).toBe("Implement X");
  });

  it("parses explicit task file input", () => {
    const parsed = parseBubbleCreateCommandOptions([
      "--id",
      "b_create_01",
      "--repo",
      "/tmp/repo",
      "--base",
      "main",
      "--review-artifact-type",
      "document",
      "--task-file",
      "/tmp/task.md"
    ]);

    expect(parsed.taskFile).toBe("/tmp/task.md");
    expect(parsed.reviewArtifactType).toBe("document");
  });

  it("parses ideation mode without task payload", () => {
    const parsed = parseBubbleCreateCommandOptions([
      "--id",
      "b_create_ideation_01",
      "--repo",
      "/tmp/repo",
      "--base",
      "main",
      "--review-artifact-type",
      "code",
      "--ideation"
    ]);

    expect(parsed.ideation).toBe(true);
    expect(parsed.task).toBeUndefined();
    expect(parsed.taskFile).toBeUndefined();
  });

  it("parses reviewer brief and accuracy-critical flags", () => {
    const parsed = parseBubbleCreateCommandOptions([
      "--id",
      "b_create_01",
      "--repo",
      "/tmp/repo",
      "--base",
      "main",
      "--review-artifact-type",
      "code",
      "--task",
      "Implement X",
      "--reviewer-brief",
      "Verify all claims against source",
      "--accuracy-critical"
    ]);

    expect(parsed.reviewerBrief).toBe("Verify all claims against source");
    expect(parsed.accuracyCritical).toBe(true);
  });

  it("parses optional bootstrap command", () => {
    const parsed = parseBubbleCreateCommandOptions([
      "--id",
      "b_create_01",
      "--repo",
      "/tmp/repo",
      "--base",
      "main",
      "--review-artifact-type",
      "code",
      "--task",
      "Implement X",
      "--bootstrap-command",
      "pnpm install --frozen-lockfile && pnpm build"
    ]);

    expect(parsed.bootstrapCommand).toBe(
      "pnpm install --frozen-lockfile && pnpm build"
    );
  });

  it("parses optional validation target", () => {
    const parsed = parseBubbleCreateCommandOptions([
      "--id",
      "b_create_01",
      "--repo",
      "/tmp/repo",
      "--base",
      "main",
      "--review-artifact-type",
      "code",
      "--task",
      "Implement X",
      "--validation-target",
      "web"
    ]);

    expect(parsed.validationTarget).toBe("web");
  });

  it("rejects structurally invalid validation target ids before create resolution", () => {
    expect(() =>
      parseBubbleCreateCommandOptions([
        "--id",
        "b_create_01",
        "--repo",
        "/tmp/repo",
        "--base",
        "main",
        "--review-artifact-type",
        "code",
        "--task",
        "Implement X",
        "--validation-target",
        "../web"
      ])
    ).toThrow(/^VALIDATION_TARGET_ID_INVALID:/u);
  });

  it("rejects reserved validation target ids before create resolution", () => {
    expect(() =>
      parseBubbleCreateCommandOptions([
        "--id",
        "b_create_01",
        "--repo",
        "/tmp/repo",
        "--base",
        "main",
        "--review-artifact-type",
        "code",
        "--task",
        "Implement X",
        "--validation-target",
        "test"
      ])
    ).toThrow(/^VALIDATION_TARGET_ID_INVALID:/u);
  });

  it("parses optional pairflow command profile", () => {
    const parsed = parseBubbleCreateCommandOptions([
      "--id",
      "b_create_profile_01",
      "--repo",
      "/tmp/repo",
      "--base",
      "main",
      "--review-artifact-type",
      "code",
      "--task",
      "Implement X",
      "--pairflow-command-profile",
      "self_host"
    ]);

    expect(parsed.pairflowCommandProfile).toBe("self_host");
  });

  it("parses optional remote alias", () => {
    const parsed = parseBubbleCreateCommandOptions([
      "--id",
      "b_create_remote_01",
      "--repo",
      "/tmp/repo",
      "--base",
      "main",
      "--review-artifact-type",
      "code",
      "--task",
      "Implement X",
      "--remote",
      "homelab"
    ]);

    expect(parsed.remote).toBe("homelab");
  });

  it("normalizes surrounding whitespace for remote alias at the CLI boundary", () => {
    const parsed = parseBubbleCreateCommandOptions([
      "--id",
      "b_create_remote_trimmed_01",
      "--repo",
      "/tmp/repo",
      "--base",
      "main",
      "--review-artifact-type",
      "code",
      "--task",
      "Implement X",
      "--remote",
      "  homelab  "
    ]);

    expect(parsed.remote).toBe("homelab");
  });

  it("rejects empty or whitespace-only remote alias at the CLI boundary", () => {
    expect(() =>
      parseBubbleCreateCommandOptions([
        "--id",
        "b_create_remote_empty_01",
        "--repo",
        "/tmp/repo",
        "--base",
        "main",
        "--review-artifact-type",
        "code",
        "--task",
        "Implement X",
        "--remote",
        "   "
      ])
    ).toThrow(new RegExp(`^${CREATE_REMOTE_ALIAS_INVALID}:`, "u"));
  });

  it("prioritizes missing review-artifact-type over secondary remote validation errors", () => {
    expect(() =>
      parseBubbleCreateCommandOptions([
        "--id",
        "b_create_remote_mixed_invalid_01",
        "--repo",
        "/tmp/repo",
        "--base",
        "main",
        "--task",
        "Implement X",
        "--remote",
        "   "
      ])
    ).toThrow(new RegExp(`^${MISSING_REVIEW_ARTIFACT_TYPE_OPTION}:`, "u"));
  });

  it("intentionally keeps remote alias shape validation out of the CLI boundary", () => {
    const parsed = parseBubbleCreateCommandOptions([
      "--id",
      "b_create_remote_shape_policy_01",
      "--repo",
      "/tmp/repo",
      "--base",
      "main",
      "--review-artifact-type",
      "code",
      "--task",
      "Implement X",
      "--remote",
      "  home lab  "
    ]);

    expect(parsed.remote).toBe("home lab");
  });

  it("supports help flag", () => {
    const parsed = parseBubbleCreateCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getBubbleCreateHelpText()).toContain("pairflow bubble create");
    expect(getBubbleCreateHelpText()).toContain("Bubble id (max 40 chars");
    expect(getBubbleCreateHelpText()).toContain("--review-artifact-type <document|code>");
    expect(getBubbleCreateHelpText()).toContain("--remote <alias>");
    expect(getBubbleCreateHelpText()).not.toContain("<auto|");
  });

  it("accepts --help even when pairflow command profile is invalid", () => {
    const parsed = parseBubbleCreateCommandOptions([
      "--help",
      "--pairflow-command-profile",
      "hosted"
    ]);
    expect(parsed.help).toBe(true);
    expect(parsed.pairflowCommandProfile).toBeUndefined();
  });

  it("allows --base to be omitted for repo default resolution", () => {
    const parsed = parseBubbleCreateCommandOptions([
      "--id",
      "b_create_01",
      "--repo",
      "/tmp/repo",
      "--review-artifact-type",
      "code",
      "--task",
      "Implement X"
    ]);

    expect(parsed.base).toBeUndefined();
  });

  it("rejects an explicitly empty --base value", () => {
    expect(() =>
      parseBubbleCreateCommandOptions([
        "--id",
        "b_create_01",
        "--repo",
        "/tmp/repo",
        "--base",
        "   ",
        "--review-artifact-type",
        "code",
        "--task",
        "Implement X"
      ])
    ).toThrow(/--base=<non-empty branch>/u);
  });

  it("trims an explicitly provided --base value", () => {
    const parsed = parseBubbleCreateCommandOptions([
      "--id",
      "b_create_01",
      "--repo",
      "/tmp/repo",
      "--base",
      "  main  ",
      "--review-artifact-type",
      "code",
      "--task",
      "Implement X"
    ]);

    expect(parsed.base).toBe("main");
  });

  it("throws when review-artifact-type option is missing", () => {
    expect(() =>
      parseBubbleCreateCommandOptions([
        "--id",
        "b_create_01",
        "--repo",
        "/tmp/repo",
        "--base",
        "main",
        "--task",
        "Implement X"
      ])
    ).toThrow(new RegExp(`^${MISSING_REVIEW_ARTIFACT_TYPE_OPTION}:`, "u"));
  });

  it("keeps missing-option aggregation context when review-artifact-type is missing", () => {
    expect(() =>
      parseBubbleCreateCommandOptions([
        "--id",
        "b_create_01",
        "--repo",
        "/tmp/repo",
        "--task",
        "Implement X"
      ])
    ).toThrow(
      new RegExp(
        `^${MISSING_REVIEW_ARTIFACT_TYPE_OPTION}:`,
        "u"
      )
    );
  });

  it("throws dedicated reason code when auto value is provided", () => {
    expect(() =>
      parseBubbleCreateCommandOptions([
        "--id",
        "b_create_01",
        "--repo",
        "/tmp/repo",
        "--base",
        "main",
        "--review-artifact-type",
        "auto",
        "--task",
        "Implement X"
      ])
    ).toThrow(new RegExp(`^${REVIEW_ARTIFACT_TYPE_AUTO_REMOVED}:`, "u"));
  });

  it("keeps missing-option context when auto value is provided with other missing flags", () => {
    expect(() =>
      parseBubbleCreateCommandOptions([
        "--id",
        "b_create_01",
        "--repo",
        "/tmp/repo",
        "--review-artifact-type",
        "auto",
        "--task",
        "Implement X"
      ])
    ).toThrow(
      new RegExp(
        `^${REVIEW_ARTIFACT_TYPE_AUTO_REMOVED}:`,
        "u"
      )
    );
  });

  it("throws dedicated reason code when invalid value is provided", () => {
    expect(() =>
      parseBubbleCreateCommandOptions([
        "--id",
        "b_create_01",
        "--repo",
        "/tmp/repo",
        "--base",
        "main",
        "--review-artifact-type",
        "slides",
        "--task",
        "Implement X"
      ])
    ).toThrow(new RegExp(`^${INVALID_REVIEW_ARTIFACT_TYPE_OPTION}:`, "u"));
  });

  it("keeps missing-option context when invalid value is provided with other missing flags", () => {
    expect(() =>
      parseBubbleCreateCommandOptions([
        "--id",
        "b_create_01",
        "--repo",
        "/tmp/repo",
        "--review-artifact-type",
        "slides",
        "--task",
        "Implement X"
      ])
    ).toThrow(
      new RegExp(
        `^${INVALID_REVIEW_ARTIFACT_TYPE_OPTION}:`,
        "u"
      )
    );
  });

  it("throws when task input is missing", () => {
    expect(() =>
      parseBubbleCreateCommandOptions([
        "--id",
        "b_create_01",
        "--repo",
        "/tmp/repo",
        "--base",
        "main",
        "--review-artifact-type",
        "code"
      ])
    ).toThrow(new RegExp(`^${IDEATION_TASK_REQUIRED}:`, "u"));
  });

  it("rejects ideation mode mixed with inline task", () => {
    expect(() =>
      parseBubbleCreateCommandOptions([
        "--id",
        "b_create_ideation_conflict_01",
        "--repo",
        "/tmp/repo",
        "--base",
        "main",
        "--review-artifact-type",
        "code",
        "--ideation",
        "--task",
        "inline task"
      ])
    ).toThrow(new RegExp(`^${IDEATION_TASK_INPUT_CONFLICT}:`, "u"));
  });

  it("rejects ideation mode mixed with task-file", () => {
    expect(() =>
      parseBubbleCreateCommandOptions([
        "--id",
        "b_create_ideation_conflict_02",
        "--repo",
        "/tmp/repo",
        "--base",
        "main",
        "--review-artifact-type",
        "code",
        "--ideation",
        "--task-file",
        "/tmp/task.md"
      ])
    ).toThrow(new RegExp(`^${IDEATION_TASK_INPUT_CONFLICT}:`, "u"));
  });

  it("throws when pairflow command profile is invalid", () => {
    expect(() =>
      parseBubbleCreateCommandOptions([
        "--id",
        "b_create_invalid_profile_01",
        "--repo",
        "/tmp/repo",
        "--base",
        "main",
        "--review-artifact-type",
        "code",
        "--task",
        "Implement X",
        "--pairflow-command-profile",
        "hosted"
      ])
    ).toThrow(new RegExp(`^${PAIRFLOW_COMMAND_PROFILE_INVALID}:`, "u"));
  });

  it("keeps missing-option context when pairflow command profile is invalid", () => {
    expect(() =>
      parseBubbleCreateCommandOptions([
        "--id",
        "b_create_invalid_profile_02",
        "--repo",
        "/tmp/repo",
        "--review-artifact-type",
        "code",
        "--task",
        "Implement X",
        "--pairflow-command-profile",
        "hosted"
      ])
    ).toThrow(
      new RegExp(`^${PAIRFLOW_COMMAND_PROFILE_INVALID}:`, "u")
    );
  });

  it("throws when both task input forms are provided", () => {
    expect(() =>
      parseBubbleCreateCommandOptions([
        "--id",
        "b_create_01",
        "--repo",
        "/tmp/repo",
        "--base",
      "main",
      "--review-artifact-type",
      "code",
        "--task",
        "Implement X",
        "--task-file",
        "/tmp/task.md"
      ])
    ).toThrow(/Use only one task input/u);
  });

  it("throws when both reviewer brief input forms are provided", () => {
    expect(() =>
      parseBubbleCreateCommandOptions([
        "--id",
        "b_create_01",
        "--repo",
        "/tmp/repo",
        "--base",
      "main",
      "--review-artifact-type",
      "code",
        "--task",
        "Implement X",
        "--reviewer-brief",
        "inline",
        "--reviewer-brief-file",
        "/tmp/reviewer-brief.md"
      ])
    ).toThrow(/Use only one reviewer brief input/u);
  });

  it("throws when accuracy-critical is set without reviewer brief", () => {
    expect(() =>
      parseBubbleCreateCommandOptions([
        "--id",
        "b_create_01",
        "--repo",
        "/tmp/repo",
        "--base",
      "main",
      "--review-artifact-type",
      "code",
        "--task",
        "Implement X",
        "--accuracy-critical"
      ])
    ).toThrow(/requires reviewer brief input/u);
  });

  it("auto-registers repo after creating bubble", async () => {
    const callOrder: string[] = [];
    const registerRepoInRegistry = vi.fn(() =>
      {
        callOrder.push("register");
        return Promise.resolve({
          added: true,
          entry: {
            repoPath: "/tmp/repo",
            addedAt: "2026-02-25T20:00:00.000Z"
          },
          registryPath: "/tmp/registry.json"
        });
      }
    );
    const createBubbleResult = {
      bubbleId: "b_create_01"
    } as unknown as BubbleCreateResult;
    const createBubbleMock: NonNullable<
      BubbleCreateCommandDependencies["createBubble"]
    > = vi.fn(() => {
      callOrder.push("create");
      return Promise.resolve({
        ...createBubbleResult
      });
    });

    await runBubbleCreateCommand(
      [
        "--id",
        "b_create_01",
        "--repo",
        "/tmp/repo",
        "--base",
      "main",
      "--review-artifact-type",
      "code",
        "--task",
        "Implement X"
      ],
      "/tmp",
      {
        createBubble: createBubbleMock,
        registerRepoInRegistry
      }
    );

    expect(registerRepoInRegistry).toHaveBeenCalledWith({
      repoPath: "/tmp/repo"
    });
    expect(createBubbleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewArtifactType: "code"
      })
    );
    expect(createBubbleMock).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual(["create", "register"]);
  });

  it("forwards bootstrap command to bubble creation", async () => {
    const createBubbleResult = {
      bubbleId: "b_create_bootstrap_01"
    } as unknown as BubbleCreateResult;
    const createBubbleMock: NonNullable<
      BubbleCreateCommandDependencies["createBubble"]
    > = vi.fn(() => Promise.resolve(createBubbleResult));

    await runBubbleCreateCommand(
      [
        "--id",
        "b_create_bootstrap_01",
        "--repo",
        "/tmp/repo",
        "--base",
        "main",
        "--review-artifact-type",
        "code",
        "--task",
        "Implement X",
        "--bootstrap-command",
        "pnpm install --frozen-lockfile && pnpm build"
      ],
      "/tmp",
      {
        createBubble: createBubbleMock
      }
    );

    expect(createBubbleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        bootstrapCommand: "pnpm install --frozen-lockfile && pnpm build"
      })
    );
  });

  it("forwards remote alias to bubble creation", async () => {
    const createBubbleResult = {
      bubbleId: "b_create_remote_forward_01"
    } as unknown as BubbleCreateResult;
    const createBubbleMock: NonNullable<
      BubbleCreateCommandDependencies["createBubble"]
    > = vi.fn(() => Promise.resolve(createBubbleResult));

    await runBubbleCreateCommand(
      [
        "--id",
        "b_create_remote_forward_01",
        "--repo",
        "/tmp/repo",
        "--base",
        "main",
        "--review-artifact-type",
        "code",
        "--task",
        "Implement X",
        "--remote",
        "homelab"
      ],
      "/tmp",
      {
        createBubble: createBubbleMock
      }
    );

    expect(createBubbleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        remote: "homelab"
      })
    );
  });

  it("forwards mixed-shape remote alias unchanged after trim to the create boundary", async () => {
    const createBubbleResult = {
      bubbleId: "b_create_remote_shape_forward_01"
    } as unknown as BubbleCreateResult;
    const createBubbleMock: NonNullable<
      BubbleCreateCommandDependencies["createBubble"]
    > = vi.fn(() => Promise.resolve(createBubbleResult));

    await runBubbleCreateCommand(
      [
        "--id",
        "b_create_remote_shape_forward_01",
        "--repo",
        "/tmp/repo",
        "--base",
        "main",
        "--review-artifact-type",
        "code",
        "--task",
        "Implement X",
        "--remote",
        "  home lab  "
      ],
      "/tmp",
      {
        createBubble: createBubbleMock
      }
    );

    expect(createBubbleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        remote: "home lab"
      })
    );
  });

  it("forwards pairflow command profile to bubble creation", async () => {
    const createBubbleResult = {
      bubbleId: "b_create_profile_02"
    } as unknown as BubbleCreateResult;
    const createBubbleMock: NonNullable<
      BubbleCreateCommandDependencies["createBubble"]
    > = vi.fn(() => Promise.resolve(createBubbleResult));

    await runBubbleCreateCommand(
      [
        "--id",
        "b_create_profile_02",
        "--repo",
        "/tmp/repo",
        "--base",
        "main",
        "--review-artifact-type",
        "code",
        "--task",
        "Implement X",
        "--pairflow-command-profile",
        "self_host"
      ],
      "/tmp",
      {
        createBubble: createBubbleMock
      }
    );

    expect(createBubbleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pairflowCommandProfile: "self_host"
      })
    );
  });

  it("forwards ideation mode to bubble creation", async () => {
    const createBubbleResult = {
      bubbleId: "b_create_ideation_forward_01"
    } as unknown as BubbleCreateResult;
    const createBubbleMock: NonNullable<
      BubbleCreateCommandDependencies["createBubble"]
    > = vi.fn(() => Promise.resolve(createBubbleResult));

    await runBubbleCreateCommand(
      [
        "--id",
        "b_create_ideation_forward_01",
        "--repo",
        "/tmp/repo",
        "--base",
        "main",
        "--review-artifact-type",
        "code",
        "--ideation"
      ],
      "/tmp",
      {
        createBubble: createBubbleMock
      }
    );

    expect(createBubbleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ideation: true
      })
    );
  });

  it("continues create when auto-registration fails", async () => {
    const warnings: string[] = [];
    const registerRepoInRegistry = vi.fn(() =>
      Promise.reject(new Error("registry lock timeout"))
    );
    const createBubbleResult = {
      bubbleId: "b_create_09"
    } as unknown as BubbleCreateResult;
    const createBubbleMock: NonNullable<
      BubbleCreateCommandDependencies["createBubble"]
    > = vi.fn(() => Promise.resolve(createBubbleResult));

    const result = await runBubbleCreateCommand(
      [
        "--id",
        "b_create_09",
        "--repo",
        "/tmp/repo",
        "--base",
      "main",
      "--review-artifact-type",
      "code",
        "--task",
        "Implement resilient registration"
      ],
      "/tmp",
      {
        createBubble: createBubbleMock,
        registerRepoInRegistry,
        reportRegistryRegistrationWarning: (message) => {
          warnings.push(message);
        }
      }
    );

    expect(result?.bubbleId).toBe("b_create_09");
    expect(createBubbleMock).toHaveBeenCalledTimes(1);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain(DEPENDENCY_FAIL_REPO_REGISTRY_REGISTER);
    expect(warnings[0]).toContain("failed to auto-register repository");
  });

  it("does not auto-register repo when bubble creation fails", async () => {
    const registerRepoInRegistry = vi.fn(() =>
      Promise.resolve({
        added: true,
        entry: {
          repoPath: "/tmp/repo",
          addedAt: "2026-02-25T21:00:00.000Z"
        },
        registryPath: "/tmp/registry.json"
      })
    );
    const createBubbleMock: NonNullable<
      BubbleCreateCommandDependencies["createBubble"]
    > = vi.fn(() => Promise.reject(new Error("create failed")));

    await expect(
      runBubbleCreateCommand(
        [
          "--id",
          "b_create_11",
          "--repo",
          "/tmp/repo",
          "--base",
      "main",
      "--review-artifact-type",
      "code",
          "--task",
          "Fail before registry write"
        ],
        "/tmp",
        {
          createBubble: createBubbleMock,
          registerRepoInRegistry
        }
      )
    ).rejects.toThrow("create failed");
    expect(registerRepoInRegistry).not.toHaveBeenCalled();
  });

  it("writes warning to stderr when auto-registration fails without override reporter", async () => {
    const registerRepoInRegistry = vi.fn(() =>
      Promise.reject(new Error("registry lock timeout"))
    );
    const createBubbleResult = {
      bubbleId: "b_create_10"
    } as unknown as BubbleCreateResult;
    const createBubbleMock: NonNullable<
      BubbleCreateCommandDependencies["createBubble"]
    > = vi.fn(() => Promise.resolve(createBubbleResult));

    const stderrSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    try {
      const result = await runBubbleCreateCommand(
        [
          "--id",
          "b_create_10",
          "--repo",
          "/tmp/repo",
          "--base",
      "main",
      "--review-artifact-type",
      "code",
          "--task",
          "Validate stderr warning path"
        ],
        "/tmp",
        {
          createBubble: createBubbleMock,
          registerRepoInRegistry
        }
      );

      expect(result?.bubbleId).toBe("b_create_10");
      expect(createBubbleMock).toHaveBeenCalledTimes(1);
      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "failed to auto-register repository for bubble create"
        )
      );
    } finally {
      stderrSpy.mockRestore();
    }
  });
});
