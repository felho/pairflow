import { describe, expect, it, vi } from "vitest";

import {
  extractCommandDependencyDefaults,
  getBubbleExtractHelpText,
  parseBubbleExtractCommandOptions
} from "../../src/index.js";
import { extractBubbleV11 } from "../../src/v11/application/extract/emitExtractV11.js";
import {
  checkTargetCheckoutPreconditions,
  validateExtractCommandPreconditions
} from "../../src/v11/application/extract/extractCommandPreconditions.js";
import type {
  ExtractCommandDependencies,
  ExtractCommandInput
} from "../../src/v11/application/extract/extractCommandContract.js";
import type { ResolvedBubbleById } from "../../src/v11/shared/ports/bubbleLookup.js";
import type { RunGitPort } from "../../src/v11/shared/ports/git.js";
import type { ResolveRepoPathInput } from "../../src/v11/shared/ports/repoResolution.js";

function resolvedBubble(input: {
  bubbleId?: string;
  repoPath?: string;
  ideation?: { mode?: boolean; task_pending?: boolean; parse_warning?: string };
} = {}): ResolvedBubbleById {
  const bubbleId = input.bubbleId ?? "b_extract_01";
  const repoPath = input.repoPath ?? "/repo";
  return {
    bubbleId,
    bubbleConfig: {
      id: bubbleId,
      repo_path: repoPath,
      base_branch: "main",
      bubble_branch: `bubble/${bubbleId}`,
      worktree_path: `/worktrees/${bubbleId}`,
      ...(input.ideation !== undefined ? { ideation: input.ideation } : {})
    },
    bubblePaths: {},
    repoPath
  } as unknown as ResolvedBubbleById;
}

function cleanMainRunGit(): RunGitPort {
  return async (args: string[]) => {
    if (args.join(" ") === "rev-parse --is-inside-work-tree") {
      return { stdout: "true\n", stderr: "", exitCode: 0 };
    }
    if (args.join(" ") === "rev-parse --abbrev-ref HEAD") {
      return { stdout: "main\n", stderr: "", exitCode: 0 };
    }
    if (args.join(" ") === "status --porcelain") {
      return { stdout: "", stderr: "", exitCode: 0 };
    }
    if (args[0] === "rev-parse" && args[1] === "--git-path") {
      return { stdout: `.git/${args[2]}\n`, stderr: "", exitCode: 0 };
    }
    throw new Error(`Unexpected git command: ${args.join(" ")}`);
  };
}

function dependencies(input: {
  bubble?: ResolvedBubbleById;
  bubbleError?: Error;
  repoPath?: string;
  repoError?: Error;
  runGit?: RunGitPort;
  fileExists?: (path: string) => Promise<boolean>;
} = {}): ExtractCommandDependencies {
  return {
    resolveBubbleById: vi.fn(async () => {
      if (input.bubbleError !== undefined) {
        throw input.bubbleError;
      }
      return input.bubble ?? resolvedBubble({ ideation: { mode: true } });
    }),
    resolveRepoPath: vi.fn(async (resolveInput?: ResolveRepoPathInput) => {
      if (input.repoError !== undefined) {
        throw input.repoError;
      }
      if (resolveInput?.repoPath !== undefined) {
        return resolveInput.repoPath;
      }
      return input.repoPath ?? "/repo";
    }),
    runGit: input.runGit ?? cleanMainRunGit(),
    fileExists: input.fileExists ?? vi.fn(async () => false)
  };
}

const baseCommand: ExtractCommandInput = {
  id: "b_extract_01",
  paths: ["docs/idea.md"],
  commit: false,
  json: false,
  cwd: "/repo"
};

describe("parseBubbleExtractCommandOptions", () => {
  it("parses repeated paths in provided order", () => {
    const parsed = parseBubbleExtractCommandOptions([
      "--id",
      "b_extract_01",
      "--path",
      "one.md",
      "--path",
      "two.md",
      "--repo",
      "/repo",
      "--json"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected parsed extract options");
    }
    expect(parsed.id).toBe("b_extract_01");
    expect(parsed.paths).toEqual(["one.md", "two.md"]);
    expect(parsed.repo).toBe("/repo");
    expect(parsed.json).toBe(true);
  });

  it("requires id and path", () => {
    expect(() => parseBubbleExtractCommandOptions(["--path", "idea.md"]))
      .toThrow(/EXTRACT_ID_REQUIRED/u);
    expect(() => parseBubbleExtractCommandOptions(["--id", "b_extract_01"]))
      .toThrow(/EXTRACT_PATH_REQUIRED/u);
  });

  it("records commit intent and requires commit for message intent", () => {
    const parsed = parseBubbleExtractCommandOptions([
      "--id",
      "b_extract_01",
      "--path",
      "idea.md",
      "--commit",
      "--message",
      "feat: extract idea"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected parsed extract options");
    }
    expect(parsed.commit).toBe(true);
    expect(parsed.message).toBe("feat: extract idea");
    expect(() =>
      parseBubbleExtractCommandOptions([
        "--id",
        "b_extract_01",
        "--path",
        "idea.md",
        "--message",
        "feat: extract idea"
      ])
    ).toThrow(/EXTRACT_MESSAGE_REQUIRES_COMMIT/u);
  });

  it("documents the contract without cleanup or inferred path flags", () => {
    const help = getBubbleExtractHelpText();

    expect(parseBubbleExtractCommandOptions(["--help"]).help).toBe(true);
    expect(help).toContain("pairflow bubble extract");
    expect(help).toContain("--id <id>");
    expect(help).toContain("--path <path>");
    expect(help).toContain("--repo <path>");
    expect(help).toContain("--commit");
    expect(help).toContain("--message <text>");
    expect(help).toContain("--json");
    expect(help).not.toContain("--delete-bubble");
    expect(help).not.toMatch(/glob|all changed files|overwrite/u);
  });
});

describe("validateExtractCommandPreconditions", () => {
  it("fails closed when bubble lookup fails or target repo cannot resolve", async () => {
    await expect(
      validateExtractCommandPreconditions({
        command: baseCommand,
        dependencies: dependencies({ bubbleError: new Error("missing") })
      })
    ).resolves.toMatchObject({
      status: "failed",
      reasonCode: "EXTRACT_BUBBLE_NOT_FOUND"
    });

    await expect(
      validateExtractCommandPreconditions({
        command: baseCommand,
        dependencies: dependencies({ repoError: new Error("no repo") })
      })
    ).resolves.toMatchObject({
      status: "failed",
      reasonCode: "EXTRACT_TARGET_REPO_UNRESOLVED"
    });
  });

  it("uses ideation.mode for eligibility without requiring task_pending", async () => {
    const result = await validateExtractCommandPreconditions({
      command: baseCommand,
      dependencies: dependencies({
        bubble: resolvedBubble({
          ideation: { mode: true, task_pending: false }
        })
      })
    });

    expect(result.status).toBe("preconditions_passed");
  });

  it("fails closed for non-ideation and invalid ideation metadata", async () => {
    await expect(
      validateExtractCommandPreconditions({
        command: baseCommand,
        dependencies: dependencies({
          bubble: resolvedBubble({ ideation: { mode: false } })
        })
      })
    ).resolves.toMatchObject({
      status: "failed",
      reasonCode: "EXTRACT_IDEATION_REQUIRED"
    });

    await expect(
      validateExtractCommandPreconditions({
        command: baseCommand,
        dependencies: dependencies({
          bubble: resolvedBubble({
            ideation: { mode: true, parse_warning: "bad ideation table" }
          })
        })
      })
    ).resolves.toMatchObject({
      status: "failed",
      reasonCode: "EXTRACT_IDEATION_METADATA_INVALID"
    });
  });

  it("fails closed on repo mismatch before transfer", async () => {
    const result = await validateExtractCommandPreconditions({
      command: baseCommand,
      dependencies: dependencies({
        bubble: resolvedBubble({ repoPath: "/repo", ideation: { mode: true } }),
        repoPath: "/other"
      })
    });

    expect(result).toMatchObject({
      status: "failed",
      reasonCode: "EXTRACT_REPO_MISMATCH"
    });
  });

  it("passes explicit repo to bubble lookup instead of relying on cwd ancestry", async () => {
    const deps = dependencies();
    await validateExtractCommandPreconditions({
      command: {
        ...baseCommand,
        repo: "/repo",
        cwd: "/outside"
      },
      dependencies: deps
    });

    expect(deps.resolveBubbleById).toHaveBeenCalledWith({
      bubbleId: "b_extract_01",
      repoPath: "/repo"
    });
    expect(deps.resolveRepoPath).toHaveBeenCalledWith({
      repoPath: "/repo"
    });
  });

  it("fails closed on invalid target checkout", async () => {
    const runGit: RunGitPort = async (args: string[]) => {
      if (args.join(" ") === "rev-parse --is-inside-work-tree") {
        return { stdout: "true\n", stderr: "", exitCode: 0 };
      }
      if (args.join(" ") === "rev-parse --abbrev-ref HEAD") {
        return { stdout: "feature\n", stderr: "", exitCode: 0 };
      }
      return { stdout: "", stderr: "", exitCode: 0 };
    };

    const result = await validateExtractCommandPreconditions({
      command: baseCommand,
      dependencies: dependencies({ runGit })
    });

    expect(result).toMatchObject({
      status: "failed",
      reasonCode: "EXTRACT_TARGET_CHECKOUT_INVALID",
      diagnostics: {
        checkoutFailureReason: "non_main_branch"
      }
    });
  });
});

describe("checkTargetCheckoutPreconditions", () => {
  it("names in-progress merge/rebase/cherry-pick checkout guards", async () => {
    await expect(
      checkTargetCheckoutPreconditions("/repo", {
        runGit: cleanMainRunGit(),
        fileExists: async (path: string) => path.endsWith("MERGE_HEAD")
      })
    ).resolves.toMatchObject({ ok: false, reason: "merge_in_progress" });

    await expect(
      checkTargetCheckoutPreconditions("/repo", {
        runGit: cleanMainRunGit(),
        fileExists: async (path: string) => path.endsWith("rebase-merge")
      })
    ).resolves.toMatchObject({ ok: false, reason: "rebase_in_progress" });

    await expect(
      checkTargetCheckoutPreconditions("/repo", {
        runGit: cleanMainRunGit(),
        fileExists: async (path: string) => path.endsWith("CHERRY_PICK_HEAD")
      })
    ).resolves.toMatchObject({ ok: false, reason: "cherry_pick_in_progress" });
  });
});

describe("extractBubbleV11", () => {
  it("returns implementation-deferred after valid preconditions and no copied-file fields", async () => {
    const result = await extractBubbleV11(
      {
        ...baseCommand,
        paths: ["one.md", "one.md", "two.md"],
        commit: true
      },
      dependencies()
    );

    expect(result).toMatchObject({
      status: "implementation_deferred",
      reasonCode: "EXTRACT_TRANSFER_NOT_IMPLEMENTED",
      paths: ["one.md", "one.md", "two.md"],
      commitRequested: true,
      diagnostics: {
        duplicatePaths: ["one.md"],
        successorContract: "no_overwrite_target_conflict_check"
      }
    });
    expect(result).not.toHaveProperty("copiedFiles");
    expect(result).not.toHaveProperty("commitSha");
  });

  it("exports default dependencies from the public API", () => {
    expect(typeof extractCommandDependencyDefaults.fileExists).toBe("function");
    expect(typeof extractCommandDependencyDefaults.resolveBubbleById).toBe("function");
    expect(typeof extractCommandDependencyDefaults.resolveRepoPath).toBe("function");
    expect(typeof extractCommandDependencyDefaults.runGit).toBe("function");
  });
});
