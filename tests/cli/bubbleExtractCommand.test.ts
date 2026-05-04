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
  ExtractFileInfo,
  ExtractCommandInput
} from "../../src/v11/application/extract/extractCommandContract.js";
import type { ResolvedBubbleById } from "../../src/v11/shared/ports/bubbleLookup.js";
import type { RunGitPort } from "../../src/v11/shared/ports/git.js";
import type { ResolveRepoPathInput } from "../../src/v11/shared/ports/repoResolution.js";

function defaultFileInfo(path: string): ExtractFileInfo {
  if (path.startsWith("/worktrees/")) {
    return path.endsWith(".md")
      ? { exists: true, isFile: true, isDirectory: false }
      : { exists: true, isFile: false, isDirectory: true };
  }

  return { exists: false, isFile: false, isDirectory: false, errorCode: "ENOENT" };
}

function resolvedBubble(input: {
  bubbleId?: string;
  repoPath?: string;
  worktreePath?: string;
  ideation?: { mode?: boolean; task_pending?: boolean; parse_warning?: string };
} = {}): ResolvedBubbleById {
  const bubbleId = input.bubbleId ?? "b_extract_01";
  const repoPath = input.repoPath ?? "/repo";
  const worktreePath = input.worktreePath ?? `/worktrees/${bubbleId}`;
  return {
    bubbleId,
    bubbleConfig: {
      id: bubbleId,
      repo_path: repoPath,
      base_branch: "main",
      bubble_branch: `bubble/${bubbleId}`,
      worktree_path: worktreePath,
      ...(input.ideation !== undefined ? { ideation: input.ideation } : {})
    },
    bubblePaths: { worktreePath },
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
  fileInfo?: (path: string) => Promise<ExtractFileInfo>;
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
    fileExists: input.fileExists ?? vi.fn(async () => false),
    fileInfo: input.fileInfo ?? vi.fn(async (path: string) => defaultFileInfo(path))
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
  it("returns implementation-deferred after valid path selection and no copied-file fields", async () => {
    const result = await extractBubbleV11(
      {
        ...baseCommand,
        paths: ["docs/one.md", "docs/one.md", "plans/two.md"],
        commit: true
      },
      dependencies()
    );

    expect(result).toMatchObject({
      status: "implementation_deferred",
      reasonCode: "EXTRACT_TRANSFER_NOT_IMPLEMENTED",
      paths: ["docs/one.md", "docs/one.md", "plans/two.md"],
      commitRequested: true,
      selectedPaths: [
        {
          rawPath: "docs/one.md",
          normalizedPath: "docs/one.md",
          sourcePath: "/worktrees/b_extract_01/docs/one.md",
          targetPath: "/repo/docs/one.md"
        },
        {
          rawPath: "docs/one.md",
          normalizedPath: "docs/one.md",
          sourcePath: "/worktrees/b_extract_01/docs/one.md",
          targetPath: "/repo/docs/one.md"
        },
        {
          rawPath: "plans/two.md",
          normalizedPath: "plans/two.md",
          sourcePath: "/worktrees/b_extract_01/plans/two.md",
          targetPath: "/repo/plans/two.md"
        }
      ],
      diagnostics: {
        duplicatePaths: ["docs/one.md"],
        successorContract: "no_overwrite_target_conflict_check"
      }
    });
    expect(result).not.toHaveProperty("copiedFiles");
    expect(result).not.toHaveProperty("stagedFiles");
    expect(result).not.toHaveProperty("commitSha");
  });

  it("accepts valid selected paths under each v1 scope in explicit order", async () => {
    const result = await extractBubbleV11(
      {
        ...baseCommand,
        paths: [
          "plans/new-plan.md",
          "docs/reference.md",
          "progress/extract-note.md"
        ]
      },
      dependencies()
    );

    expect(result).toMatchObject({
      status: "implementation_deferred",
      selectedPaths: [
        { normalizedPath: "plans/new-plan.md" },
        { normalizedPath: "docs/reference.md" },
        { normalizedPath: "progress/extract-note.md" }
      ]
    });
  });

  it.each([
    ["/tmp/idea.md", "EXTRACT_PATH_UNSAFE"],
    ["../plans/idea.md", "EXTRACT_PATH_UNSAFE"],
    ["plans/../docs/idea.md", "EXTRACT_PATH_UNSAFE"],
    ["plans\\idea.md", "EXTRACT_PATH_UNSAFE"],
    ["docs//idea.md", "EXTRACT_PATH_UNSAFE"],
    ["docs/idea.md/", "EXTRACT_PATH_UNSAFE"],
    ["", "EXTRACT_PATH_UNSAFE"],
    [".", "EXTRACT_PATH_UNSAFE"]
  ])("fails closed for unsafe selected path %s", async (path, reasonCode) => {
    const result = await extractBubbleV11(
      {
        ...baseCommand,
        paths: [path]
      },
      dependencies()
    );

    expect(result).toMatchObject({
      status: "failed",
      reasonCode,
      diagnostics: {
        path
      }
    });
  });

  it("fails closed for glob-like selected paths", async () => {
    const result = await extractBubbleV11(
      {
        ...baseCommand,
        paths: ["plans/*.md"]
      },
      dependencies()
    );

    expect(result).toMatchObject({
      status: "failed",
      reasonCode: "EXTRACT_PATH_GLOB_UNSUPPORTED",
      diagnostics: {
        path: "plans/*.md"
      }
    });
  });

  it("fails closed for paths outside the v1 extraction scope", async () => {
    const result = await extractBubbleV11(
      {
        ...baseCommand,
        paths: ["src/foo.ts"]
      },
      dependencies()
    );

    expect(result).toMatchObject({
      status: "failed",
      reasonCode: "EXTRACT_PATH_SCOPE_FORBIDDEN",
      diagnostics: {
        path: "src/foo.ts",
        normalizedPath: "src/foo.ts"
      }
    });
  });

  it("fails closed when the selected source file is missing", async () => {
    const result = await extractBubbleV11(
      {
        ...baseCommand,
        paths: ["docs/missing.md"]
      },
      dependencies({
        fileInfo: async () => ({ exists: false, isFile: false, isDirectory: false })
      })
    );

    expect(result).toMatchObject({
      status: "failed",
      reasonCode: "EXTRACT_SOURCE_PATH_MISSING",
      diagnostics: {
        normalizedPath: "docs/missing.md",
        sourcePath: "/worktrees/b_extract_01/docs/missing.md",
        targetPath: "/repo/docs/missing.md"
      }
    });
  });

  it("fails closed when the selected source is a directory", async () => {
    const result = await extractBubbleV11(
      {
        ...baseCommand,
        paths: ["docs/ideas"]
      },
      dependencies({
        fileInfo: async () => ({ exists: true, isFile: false, isDirectory: true })
      })
    );

    expect(result).toMatchObject({
      status: "failed",
      reasonCode: "EXTRACT_SOURCE_PATH_NOT_FILE",
      diagnostics: {
        normalizedPath: "docs/ideas"
      }
    });
  });

  it("fails closed when the target path already exists", async () => {
    const result = await extractBubbleV11(
      {
        ...baseCommand,
        paths: ["docs/existing.md"]
      },
      dependencies({
        fileInfo: async (path: string) =>
          path.startsWith("/worktrees/")
            ? defaultFileInfo(path)
            : {
                exists: path === "/repo/docs/existing.md",
                isFile: path === "/repo/docs/existing.md",
                isDirectory: false,
                ...(path === "/repo/docs/existing.md" ? {} : { errorCode: "ENOENT" })
              }
      })
    );

    expect(result).toMatchObject({
      status: "failed",
      reasonCode: "EXTRACT_TARGET_PATH_EXISTS",
      diagnostics: {
        normalizedPath: "docs/existing.md",
        sourcePath: "/worktrees/b_extract_01/docs/existing.md",
        targetPath: "/repo/docs/existing.md"
      }
    });
  });

  it("fails closed when the target path is occupied by a dangling symlink", async () => {
    const result = await extractBubbleV11(
      {
        ...baseCommand,
        paths: ["docs/dangling.md"]
      },
      dependencies({
        fileInfo: async (path: string) =>
          path.startsWith("/worktrees/")
            ? defaultFileInfo(path)
            : {
                exists: path === "/repo/docs/dangling.md",
                isFile: false,
                isDirectory: false,
                ...(path === "/repo/docs/dangling.md" ? {} : { errorCode: "ENOENT" })
              }
      })
    );

    expect(result).toMatchObject({
      status: "failed",
      reasonCode: "EXTRACT_TARGET_PATH_EXISTS",
      diagnostics: {
        normalizedPath: "docs/dangling.md",
        targetPath: "/repo/docs/dangling.md"
      }
    });
  });

  it("fails closed when a source parent path is a symlink or non-directory", async () => {
    const result = await extractBubbleV11(
      {
        ...baseCommand,
        paths: ["docs/idea.md"]
      },
      dependencies({
        fileInfo: async (path: string) => {
          if (path === "/worktrees/b_extract_01/docs") {
            return { exists: true, isFile: false, isDirectory: false };
          }
          return defaultFileInfo(path);
        }
      })
    );

    expect(result).toMatchObject({
      status: "failed",
      reasonCode: "EXTRACT_SOURCE_PATH_NOT_FILE",
      diagnostics: {
        normalizedPath: "docs/idea.md",
        sourcePath: "/worktrees/b_extract_01/docs"
      }
    });
  });

  it("fails closed when target path metadata cannot be verified", async () => {
    const result = await extractBubbleV11(
      {
        ...baseCommand,
        paths: ["docs/locked.md"]
      },
      dependencies({
        fileInfo: async (path: string) =>
          path.startsWith("/worktrees/")
            ? defaultFileInfo(path)
            : {
                exists: false,
                isFile: false,
                isDirectory: false,
                errorCode: path === "/repo/docs/locked.md" ? "EACCES" : "ENOENT"
              }
      })
    );

    expect(result).toMatchObject({
      status: "failed",
      reasonCode: "EXTRACT_TARGET_PATH_EXISTS",
      diagnostics: {
        normalizedPath: "docs/locked.md",
        targetPath: "/repo/docs/locked.md"
      }
    });
  });

  it("fails closed when a target parent path is an existing file", async () => {
    const result = await extractBubbleV11(
      {
        ...baseCommand,
        paths: ["docs/idea/note.md"]
      },
      dependencies({
        fileInfo: async (path: string) => {
          if (path.startsWith("/worktrees/")) {
            return defaultFileInfo(path);
          }
          if (path === "/repo/docs") {
            return { exists: true, isFile: false, isDirectory: true };
          }
          if (path === "/repo/docs/idea") {
            return { exists: true, isFile: true, isDirectory: false };
          }
          return { exists: false, isFile: false, isDirectory: false, errorCode: "ENOENT" };
        }
      })
    );

    expect(result).toMatchObject({
      status: "failed",
      reasonCode: "EXTRACT_TARGET_PATH_EXISTS",
      diagnostics: {
        normalizedPath: "docs/idea/note.md",
        targetPath: "/repo/docs/idea"
      }
    });
  });

  it("exports default dependencies from the public API", () => {
    expect(typeof extractCommandDependencyDefaults.fileExists).toBe("function");
    expect(typeof extractCommandDependencyDefaults.fileInfo).toBe("function");
    expect(typeof extractCommandDependencyDefaults.resolveBubbleById).toBe("function");
    expect(typeof extractCommandDependencyDefaults.resolveRepoPath).toBe("function");
    expect(typeof extractCommandDependencyDefaults.runGit).toBe("function");
  });
});
