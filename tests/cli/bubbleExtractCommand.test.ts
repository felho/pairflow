import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  extractCommandDependencyDefaults,
  getBubbleExtractHelpText,
  parseBubbleExtractCommandOptions,
  renderBubbleExtractText
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
    if (args[0] === "cat-file" && args[1] === "-e") {
      return { stdout: "", stderr: "not found", exitCode: 1 };
    }
    if (args[0] === "cat-file" && args[1] === "-t") {
      return { stdout: "", stderr: "not found", exitCode: 1 };
    }
    throw new Error(`Unexpected git command: ${args.join(" ")}`);
  };
}

function successfulExtractCommitRunGit(input: {
  stagedStdout?: string;
  treeChangedStdout?: string;
  baseSha?: string;
  treeSha?: string;
  commitSha?: string;
} = {}): RunGitPort {
  const stagedStdout = input.stagedStdout ?? "docs/idea.md\0";
  const treeChangedStdout = input.treeChangedStdout ?? stagedStdout;
  const baseSha = input.baseSha ?? "base123";
  const treeSha = input.treeSha ?? "tree123";
  const commitSha = input.commitSha ?? "abc123";
  let revParseHeadCalls = 0;
  return async (args: string[]) => {
    if (args[0] === "add") {
      return { stdout: "", stderr: "", exitCode: 0 };
    }
    if (args.join(" ") === "diff --cached --name-only -z") {
      return { stdout: stagedStdout, stderr: "", exitCode: 0 };
    }
    if (args.join(" ") === "write-tree") {
      return { stdout: `${treeSha}\n`, stderr: "", exitCode: 0 };
    }
    if (args.join(" ") === `diff-tree --name-only -z -r ${baseSha} ${treeSha}`) {
      return { stdout: treeChangedStdout, stderr: "", exitCode: 0 };
    }
    if (args[0] === "commit-tree") {
      return { stdout: `${commitSha}\n`, stderr: "", exitCode: 0 };
    }
    if (args[0] === "update-ref") {
      return { stdout: "", stderr: "", exitCode: 0 };
    }
    if (args.join(" ") === "rev-parse HEAD") {
      revParseHeadCalls += 1;
      const stdout = revParseHeadCalls === 1 ? baseSha : commitSha;
      return { stdout: `${stdout}\n`, stderr: "", exitCode: 0 };
    }
    return cleanMainRunGit()(args, { cwd: "/repo", allowFailure: true });
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
  createDirectory?: (path: string) => Promise<void>;
  copyFile?: (sourcePath: string, targetPath: string) => Promise<void>;
} = {}): ExtractCommandDependencies {
  const createdDirectories = new Set<string>();
  const createDirectory = vi.fn(async (path: string) => {
    if (input.createDirectory !== undefined) {
      await input.createDirectory(path);
    }
    createdDirectories.add(path);
  });
  const fileInfo = vi.fn(async (path: string) => {
    if (input.fileInfo !== undefined) {
      const info = await input.fileInfo(path);
      if (info.exists || !createdDirectories.has(path)) {
        return info;
      }
    }
    if (createdDirectories.has(path)) {
      return { exists: true, isFile: false, isDirectory: true };
    }
    return defaultFileInfo(path);
  });

  return {
    copyFile: input.copyFile ?? vi.fn(async () => undefined),
    createDirectory,
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
    fileInfo
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
  it("keeps default copy exclusive when a target appears after validation", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "pairflow-extract-copy-"));
    const sourcePath = join(tempDir, "source.md");
    const targetPath = join(tempDir, "target.md");
    await writeFile(sourcePath, "new\n", "utf8");
    await writeFile(targetPath, "existing\n", "utf8");

    try {
      await expect(
        extractCommandDependencyDefaults.copyFile(sourcePath, targetPath)
      ).rejects.toMatchObject({ code: "EEXIST" });
      await expect(readFile(targetPath, "utf8")).resolves.toBe("existing\n");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("fails before transfer when selected paths duplicate by normalized path", async () => {
    const createDirectory = vi.fn(async () => undefined);
    const copyFile = vi.fn(async () => undefined);
    const result = await extractBubbleV11(
      {
        ...baseCommand,
        paths: ["docs/one.md", "docs/one.md", "plans/two.md"],
        commit: true
      },
      dependencies({ createDirectory, copyFile })
    );

    expect(result).toMatchObject({
      status: "failed",
      reasonCode: "EXTRACT_DUPLICATE_SELECTED_PATH",
      paths: ["docs/one.md", "docs/one.md", "plans/two.md"],
      commitRequested: true,
      diagnostics: {
        duplicatePaths: ["docs/one.md"],
        duplicateRawPaths: ["docs/one.md", "docs/one.md"]
      }
    });
    expect(createDirectory).not.toHaveBeenCalled();
    expect(copyFile).not.toHaveBeenCalled();
    expect(result).not.toHaveProperty("copiedPaths");
    expect(result).not.toHaveProperty("commitSha");
  });

  it("copies valid selected paths under each v1 scope in explicit order", async () => {
    const createDirectory = vi.fn(async () => undefined);
    const copyFile = vi.fn(async () => undefined);
    const result = await extractBubbleV11(
      {
        ...baseCommand,
        paths: [
          "plans/new-plan.md",
          "docs/reference.md",
          "progress/extract-note.md"
        ]
      },
      dependencies({ createDirectory, copyFile })
    );

    expect(result).toMatchObject({
      status: "success",
      selectedPaths: [
        { normalizedPath: "plans/new-plan.md" },
        { normalizedPath: "docs/reference.md" },
        { normalizedPath: "progress/extract-note.md" }
      ],
      copiedPaths: [
        "plans/new-plan.md",
        "docs/reference.md",
        "progress/extract-note.md"
      ]
    });
    expect(createDirectory).toHaveBeenCalledWith("/repo/plans");
    expect(createDirectory).toHaveBeenCalledWith("/repo/docs");
    expect(createDirectory).toHaveBeenCalledWith("/repo/progress");
    expect(copyFile).toHaveBeenNthCalledWith(
      1,
      "/worktrees/b_extract_01/plans/new-plan.md",
      "/repo/plans/new-plan.md"
    );
  });

  it("returns copy failure when target parent creation fails", async () => {
    const result = await extractBubbleV11(
      baseCommand,
      dependencies({
        createDirectory: async () => {
          throw new Error("locked");
        }
      })
    );

    expect(result).toMatchObject({
      status: "failed",
      reasonCode: "EXTRACT_COPY_FAILED",
      diagnostics: {
        normalizedPath: "docs/idea.md",
        filesystemStep: "create_parent_directory",
        stderr: "locked"
      }
    });
  });

  it("returns copy failure when selected file copy fails", async () => {
    const result = await extractBubbleV11(
      baseCommand,
      dependencies({
        copyFile: async () => {
          throw new Error("copy denied");
        }
      })
    );

    expect(result).toMatchObject({
      status: "failed",
      reasonCode: "EXTRACT_COPY_FAILED",
      diagnostics: {
        normalizedPath: "docs/idea.md",
        filesystemStep: "copy_file",
        stderr: "copy denied"
      }
    });
  });

  it("reports target exists when exclusive copy detects a concurrent target file", async () => {
    const error = new Error("file exists") as Error & { code: string };
    error.code = "EEXIST";
    const result = await extractBubbleV11(
      baseCommand,
      dependencies({
        copyFile: async () => {
          throw error;
        }
      })
    );

    expect(result).toMatchObject({
      status: "failed",
      reasonCode: "EXTRACT_TARGET_PATH_EXISTS",
      diagnostics: {
        targetPath: "/repo/docs/idea.md",
        filesystemStep: "copy_file",
        successorContract: "no_overwrite_target_conflict_check",
        stderr: "file exists"
      }
    });
  });

  it("revalidates target parents after directory creation before copying", async () => {
    let docsParentChecks = 0;
    const copyFile = vi.fn(async () => undefined);
    const result = await extractBubbleV11(
      baseCommand,
      dependencies({
        copyFile,
        fileInfo: async (path: string) => {
          if (path.startsWith("/worktrees/")) {
            return defaultFileInfo(path);
          }
          if (path === "/repo/docs") {
            docsParentChecks += 1;
            return docsParentChecks >= 3
              ? { exists: true, isFile: false, isDirectory: false }
              : {
                  exists: false,
                  isFile: false,
                  isDirectory: false,
                  errorCode: "ENOENT"
                };
          }
          return {
            exists: false,
            isFile: false,
            isDirectory: false,
            errorCode: "ENOENT"
          };
        }
      })
    );

    expect(result).toMatchObject({
      status: "failed",
      reasonCode: "EXTRACT_COPY_FAILED",
      diagnostics: {
        targetPath: "/repo/docs",
        filesystemStep: "create_parent_directory",
        stderr: "target parent directory verification failed"
      }
    });
    expect(copyFile).not.toHaveBeenCalled();
  });

  it("tolerates concurrent target parent directory creation", async () => {
    const error = new Error("file exists") as Error & { code: string };
    error.code = "EEXIST";
    const createDirectory = vi.fn(async () => {
      throw error;
    });
    let parentInfoCalls = 0;
    const fileInfo = vi.fn(async (path: string) => {
      if (path === "/repo/docs") {
        parentInfoCalls += 1;
        return parentInfoCalls <= 2
          ? {
              exists: false,
              isFile: false,
              isDirectory: false,
              errorCode: "ENOENT"
            }
          : {
              exists: true,
              isFile: false,
              isDirectory: true
            };
      }
      return defaultFileInfo(path);
    });
    const copyFile = vi.fn(async () => undefined);

    const result = await extractBubbleV11(
      baseCommand,
      dependencies({
        createDirectory,
        copyFile,
        fileInfo
      })
    );

    expect(result).toMatchObject({
      status: "success",
      copiedPaths: ["docs/idea.md"]
    });
    expect(createDirectory).toHaveBeenCalledWith("/repo/docs");
    expect(copyFile).toHaveBeenCalledWith(
      "/worktrees/b_extract_01/docs/idea.md",
      "/repo/docs/idea.md"
    );
  });

  it("stages and commits exactly the selected paths with an explicit message", async () => {
    const commands: string[] = [];
    const delegateRunGit = successfulExtractCommitRunGit();
    const runGit: RunGitPort = async (args: string[]) => {
      commands.push(args.join(" "));
      return delegateRunGit(args, { cwd: "/repo", allowFailure: true });
    };

    const result = await extractBubbleV11(
      {
        ...baseCommand,
        commit: true,
        message: "feat: extract idea"
      },
      dependencies({ runGit })
    );

    expect(result).toMatchObject({
      status: "success",
      copiedPaths: ["docs/idea.md"],
      stagedPaths: ["docs/idea.md"],
      commitSha: "abc123",
      commitMessage: "feat: extract idea"
    });
    expect(commands).toContain("add -f -- docs/idea.md");
    expect(commands).toContain("write-tree");
    expect(commands).toContain("diff-tree --name-only -z -r base123 tree123");
    expect(commands).toContain("commit-tree tree123 -p base123 -m feat: extract idea");
    expect(commands).toContain("update-ref -m feat: extract idea HEAD abc123 base123");
    expect(commands.some((command) => command.startsWith("commit -m "))).toBe(false);
  });

  it("preserves trailing spaces when comparing staged selected paths", async () => {
    const runGit = successfulExtractCommitRunGit({
      stagedStdout: "docs/idea.md \0",
      treeChangedStdout: "docs/idea.md \0"
    });

    const result = await extractBubbleV11(
      {
        ...baseCommand,
        paths: ["docs/idea.md "],
        commit: true
      },
      dependencies({
        runGit,
        fileInfo: async (path: string) =>
          path.startsWith("/worktrees/")
            ? {
                exists: true,
                isFile: path.endsWith(".md "),
                isDirectory: !path.endsWith(".md ")
              }
            : {
                exists: false,
                isFile: false,
                isDirectory: false,
                errorCode: "ENOENT"
              }
      })
    );

    expect(result).toMatchObject({
      status: "success",
      stagedPaths: ["docs/idea.md "],
      commitSha: "abc123"
    });
  });

  it("uses a deterministic default commit message when --commit has no message", async () => {
    const runGit = successfulExtractCommitRunGit({ commitSha: "def456" });

    const result = await extractBubbleV11(
      {
        ...baseCommand,
        commit: true
      },
      dependencies({ runGit })
    );

    expect(result).toMatchObject({
      status: "success",
      commitSha: "def456",
      commitMessage: "extract(b_extract_01): copy selected ideation artifacts"
    });
  });

  it("fails before commit when staged scope differs from selected paths", async () => {
    const commands: string[] = [];
    const runGit: RunGitPort = async (args: string[]) => {
      commands.push(args.join(" "));
      if (args[0] === "add") {
        return { stdout: "", stderr: "", exitCode: 0 };
      }
      if (args.join(" ") === "diff --cached --name-only -z") {
        return { stdout: "docs/idea.md\0progress/unrelated.md\0", stderr: "", exitCode: 0 };
      }
      return cleanMainRunGit()(args, { cwd: "/repo", allowFailure: true });
    };

    const result = await extractBubbleV11(
      {
        ...baseCommand,
        commit: true
      },
      dependencies({ runGit })
    );

    expect(result).toMatchObject({
      status: "failed",
      reasonCode: "EXTRACT_STAGED_SCOPE_MISMATCH",
      diagnostics: {
        stagedPaths: ["docs/idea.md", "progress/unrelated.md"],
        expectedStagedPaths: ["docs/idea.md"]
      }
    });
    expect(commands.some((command) => command.startsWith("commit "))).toBe(false);
  });

  it("returns stage failure when git add fails", async () => {
    const runGit: RunGitPort = async (args: string[]) => {
      if (args[0] === "add") {
        return { stdout: "", stderr: "add failed", exitCode: 1 };
      }
      if (args.join(" ") === "diff --cached --name-only -z") {
        return { stdout: "docs/idea.md\0", stderr: "", exitCode: 0 };
      }
      return cleanMainRunGit()(args, { cwd: "/repo", allowFailure: true });
    };

    const result = await extractBubbleV11(
      {
        ...baseCommand,
        commit: true
      },
      dependencies({ runGit })
    );

    expect(result).toMatchObject({
      status: "failed",
      reasonCode: "EXTRACT_STAGE_FAILED",
      diagnostics: {
        gitStep: "stage",
        stagedPaths: ["docs/idea.md"],
        stderr: "add failed"
      }
    });
  });

  it("force-adds explicitly selected ignored paths in commit mode", async () => {
    const commands: string[] = [];
    const delegateRunGit = successfulExtractCommitRunGit({
      stagedStdout: "docs/ignored.md\0",
      treeChangedStdout: "docs/ignored.md\0"
    });
    const runGit: RunGitPort = async (args: string[]) => {
      commands.push(args.join(" "));
      return delegateRunGit(args, { cwd: "/repo", allowFailure: true });
    };

    const result = await extractBubbleV11(
      {
        ...baseCommand,
        paths: ["docs/ignored.md"],
        commit: true
      },
      dependencies({ runGit })
    );

    expect(result).toMatchObject({
      status: "success",
      copiedPaths: ["docs/ignored.md"],
      stagedPaths: ["docs/ignored.md"],
      commitSha: "abc123"
    });
    expect(commands).toContain("add -f -- docs/ignored.md");
  });

  it("preserves newline-bearing staged paths through NUL-delimited git output", async () => {
    const selectedPath = "docs/idea\nnote.md";
    const runGit = successfulExtractCommitRunGit({
      stagedStdout: `${selectedPath}\0`,
      treeChangedStdout: `${selectedPath}\0`
    });

    const result = await extractBubbleV11(
      {
        ...baseCommand,
        paths: [selectedPath],
        commit: true
      },
      dependencies({
        runGit,
        fileInfo: async (path: string) =>
          path.startsWith("/worktrees/")
            ? {
                exists: true,
                isFile: path.endsWith("note.md"),
                isDirectory: !path.endsWith("note.md")
              }
            : {
                exists: false,
                isFile: false,
                isDirectory: false,
                errorCode: "ENOENT"
              }
      })
    );

    expect(result).toMatchObject({
      status: "success",
      stagedPaths: [selectedPath],
      commitSha: "abc123"
    });
  });

  it("returns structured stage failure when git add rejects", async () => {
    const runGit: RunGitPort = async (args: string[]) => {
      if (args[0] === "add") {
        throw new Error("spawn failed");
      }
      return cleanMainRunGit()(args, { cwd: "/repo", allowFailure: true });
    };

    const result = await extractBubbleV11(
      {
        ...baseCommand,
        commit: true
      },
      dependencies({ runGit })
    );

    expect(result).toMatchObject({
      status: "failed",
      reasonCode: "EXTRACT_STAGE_FAILED",
      diagnostics: {
        gitStep: "stage",
        stderr: "spawn failed"
      }
    });
  });

  it("returns structured stage failure when staged path read rejects", async () => {
    const runGit: RunGitPort = async (args: string[]) => {
      if (args[0] === "add") {
        return { stdout: "", stderr: "", exitCode: 0 };
      }
      if (args.join(" ") === "diff --cached --name-only -z") {
        throw new Error("diff failed");
      }
      return cleanMainRunGit()(args, { cwd: "/repo", allowFailure: true });
    };

    const result = await extractBubbleV11(
      {
        ...baseCommand,
        commit: true
      },
      dependencies({ runGit })
    );

    expect(result).toMatchObject({
      status: "failed",
      reasonCode: "EXTRACT_STAGE_FAILED",
      diagnostics: {
        gitStep: "read_staged_paths",
        stagedPaths: ["docs/idea.md"],
        stderr: "diff failed"
      }
    });
  });

  it("reports selected staged side effects when staged path read exits nonzero", async () => {
    const runGit: RunGitPort = async (args: string[]) => {
      if (args[0] === "add") {
        return { stdout: "", stderr: "", exitCode: 0 };
      }
      if (args.join(" ") === "diff --cached --name-only -z") {
        return { stdout: "", stderr: "diff failed", exitCode: 1 };
      }
      return cleanMainRunGit()(args, { cwd: "/repo", allowFailure: true });
    };

    const result = await extractBubbleV11(
      {
        ...baseCommand,
        commit: true
      },
      dependencies({ runGit })
    );

    expect(result).toMatchObject({
      status: "failed",
      reasonCode: "EXTRACT_STAGE_FAILED",
      diagnostics: {
        gitStep: "read_staged_paths",
        stagedPaths: ["docs/idea.md"],
        stderr: "diff failed"
      }
    });
    expect(renderBubbleExtractText(result)).toContain(
      "Partial side effects may remain: copied 1 selected path(s), staged 1 path(s)."
    );
  });

  it("fails before commit creation when commit tree scope differs from selected paths", async () => {
    const commands: string[] = [];
    const runGit: RunGitPort = async (args: string[]) => {
      commands.push(args.join(" "));
      return successfulExtractCommitRunGit({
        treeChangedStdout: "docs/idea.md\0progress/unrelated.md\0"
      })(args, { cwd: "/repo", allowFailure: true });
    };

    const result = await extractBubbleV11(
      {
        ...baseCommand,
        commit: true
      },
      dependencies({ runGit })
    );

    expect(result).toMatchObject({
      status: "failed",
      reasonCode: "EXTRACT_STAGED_SCOPE_MISMATCH",
      diagnostics: {
        gitStep: "verify_commit_tree_scope",
        stagedPaths: ["docs/idea.md", "progress/unrelated.md"],
        expectedStagedPaths: ["docs/idea.md"]
      }
    });
    expect(commands).toContain("write-tree");
    expect(commands).toContain("diff-tree --name-only -z -r base123 tree123");
    expect(commands.some((command) => command.startsWith("commit-tree "))).toBe(false);
    expect(commands.some((command) => command.startsWith("update-ref "))).toBe(false);
  });

  it("fails without moving HEAD when update-ref detects a concurrent HEAD update", async () => {
    const commands: string[] = [];
    const runGit: RunGitPort = async (args: string[]) => {
      commands.push(args.join(" "));
      if (args[0] === "update-ref") {
        return { stdout: "", stderr: "cannot lock ref HEAD", exitCode: 1 };
      }
      return successfulExtractCommitRunGit()(args, { cwd: "/repo", allowFailure: true });
    };

    const result = await extractBubbleV11(
      {
        ...baseCommand,
        commit: true
      },
      dependencies({ runGit })
    );

    expect(result).toMatchObject({
      status: "failed",
      reasonCode: "EXTRACT_COMMIT_FAILED",
      diagnostics: {
        gitStep: "update_head",
        commitSha: "abc123",
        stderr: "cannot lock ref HEAD"
      }
    });
    expect(commands).toContain("commit-tree tree123 -p base123 -m extract(b_extract_01): copy selected ideation artifacts");
    expect(commands).toContain("update-ref -m extract(b_extract_01): copy selected ideation artifacts HEAD abc123 base123");
  });

  it("returns commit failure when commit creation fails", async () => {
    const runGit: RunGitPort = async (args: string[]) => {
      if (args[0] === "commit-tree") {
        return { stdout: "", stderr: "commit failed", exitCode: 1 };
      }
      return successfulExtractCommitRunGit()(args, { cwd: "/repo", allowFailure: true });
    };

    const result = await extractBubbleV11(
      {
        ...baseCommand,
        commit: true
      },
      dependencies({ runGit })
    );

    expect(result).toMatchObject({
      status: "failed",
      reasonCode: "EXTRACT_COMMIT_FAILED",
      diagnostics: {
        gitStep: "create_commit",
        stderr: "commit failed"
      }
    });
    expect(result).not.toHaveProperty("commitSha");
  });

  it("returns structured commit failure when commit creation rejects", async () => {
    const runGit: RunGitPort = async (args: string[]) => {
      if (args[0] === "commit-tree") {
        throw new Error("commit spawn failed");
      }
      return successfulExtractCommitRunGit()(args, { cwd: "/repo", allowFailure: true });
    };

    const result = await extractBubbleV11(
      {
        ...baseCommand,
        commit: true
      },
      dependencies({ runGit })
    );

    expect(result).toMatchObject({
      status: "failed",
      reasonCode: "EXTRACT_COMMIT_FAILED",
      diagnostics: {
        gitStep: "create_commit",
        stderr: "commit spawn failed"
      }
    });
  });

  it("returns commit failure when post-commit SHA resolution fails", async () => {
    let revParseHeadCalls = 0;
    const delegateRunGit = successfulExtractCommitRunGit();
    const runGit: RunGitPort = async (args: string[]) => {
      if (args.join(" ") === "rev-parse HEAD") {
        revParseHeadCalls += 1;
        if (revParseHeadCalls === 1) {
          return { stdout: "base123\n", stderr: "", exitCode: 0 };
        }
        return { stdout: "", stderr: "no head", exitCode: 1 };
      }
      return delegateRunGit(args, { cwd: "/repo", allowFailure: true });
    };

    const result = await extractBubbleV11(
      {
        ...baseCommand,
        commit: true
      },
      dependencies({ runGit })
    );

    expect(result).toMatchObject({
      status: "failed",
      reasonCode: "EXTRACT_COMMIT_FAILED",
      diagnostics: {
        gitStep: "resolve_commit_sha",
        commitSha: "abc123",
        stderr: "no head"
      }
    });
    expect(result).not.toHaveProperty("commitSha");
  });

  it("fails when resolved HEAD differs from the created extract commit", async () => {
    let revParseHeadCalls = 0;
    const delegateRunGit = successfulExtractCommitRunGit();
    const runGit: RunGitPort = async (args: string[]) => {
      if (args.join(" ") === "rev-parse HEAD") {
        revParseHeadCalls += 1;
        return {
          stdout: `${revParseHeadCalls === 1 ? "base123" : "concurrent456"}\n`,
          stderr: "",
          exitCode: 0
        };
      }
      return delegateRunGit(args, { cwd: "/repo", allowFailure: true });
    };

    const result = await extractBubbleV11(
      {
        ...baseCommand,
        commit: true
      },
      dependencies({ runGit })
    );

    expect(result).toMatchObject({
      status: "failed",
      reasonCode: "EXTRACT_COMMIT_FAILED",
      diagnostics: {
        gitStep: "resolve_commit_sha",
        commitSha: "abc123",
        stdout: "concurrent456",
        stderr: "resolved HEAD does not match created extract commit"
      }
    });
    expect(result).not.toHaveProperty("commitSha");
  });

  it("returns structured commit failure when post-commit SHA resolution rejects", async () => {
    let revParseHeadCalls = 0;
    const delegateRunGit = successfulExtractCommitRunGit();
    const runGit: RunGitPort = async (args: string[]) => {
      if (args.join(" ") === "rev-parse HEAD") {
        revParseHeadCalls += 1;
        if (revParseHeadCalls === 1) {
          return { stdout: "base123\n", stderr: "", exitCode: 0 };
        }
        throw new Error("rev-parse spawn failed");
      }
      return delegateRunGit(args, { cwd: "/repo", allowFailure: true });
    };

    const result = await extractBubbleV11(
      {
        ...baseCommand,
        commit: true
      },
      dependencies({ runGit })
    );

    expect(result).toMatchObject({
      status: "failed",
      reasonCode: "EXTRACT_COMMIT_FAILED",
      diagnostics: {
        gitStep: "resolve_commit_sha",
        commitSha: "abc123",
        stderr: "rev-parse spawn failed"
      }
    });
  });

  it("renders failure output without denying retained side effects", () => {
    expect(
      renderBubbleExtractText({
        bubbleId: "b_extract_01",
        repoPath: "/repo",
        paths: ["docs/idea.md"],
        commitRequested: true,
        status: "failed",
        reasonCode: "EXTRACT_COMMIT_FAILED",
        diagnostics: {
          copiedPaths: ["docs/idea.md"],
          stagedPaths: ["docs/idea.md"],
          gitStep: "resolve_commit_sha"
        }
      })
    ).toContain(
      "Partial side effects may remain: copied 1 selected path(s), staged 1 path(s), a commit may already exist."
    );
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

  it("fails closed when the target path is tracked in HEAD but absent from the working tree", async () => {
    const runGit: RunGitPort = async (args: string[]) => {
      if (args.join(" ") === "cat-file -e HEAD:docs/tracked.md") {
        return { stdout: "", stderr: "", exitCode: 0 };
      }
      return cleanMainRunGit()(args, { cwd: "/repo", allowFailure: true });
    };
    const copyFile = vi.fn(async () => undefined);

    const result = await extractBubbleV11(
      {
        ...baseCommand,
        paths: ["docs/tracked.md"]
      },
      dependencies({
        runGit,
        copyFile,
        fileInfo: async (path: string) =>
          path.startsWith("/worktrees/")
            ? defaultFileInfo(path)
            : {
                exists: false,
                isFile: false,
                isDirectory: false,
                errorCode: "ENOENT"
              }
      })
    );

    expect(result).toMatchObject({
      status: "failed",
      reasonCode: "EXTRACT_TARGET_PATH_EXISTS",
      diagnostics: {
        normalizedPath: "docs/tracked.md",
        targetPath: "/repo/docs/tracked.md"
      }
    });
    expect(copyFile).not.toHaveBeenCalled();
  });

  it("fails closed when a target parent path is tracked as a file in HEAD but absent from the working tree", async () => {
    const runGit: RunGitPort = async (args: string[]) => {
      if (args.join(" ") === "cat-file -e HEAD:docs/file/new.md") {
        return { stdout: "", stderr: "not found", exitCode: 1 };
      }
      if (args.join(" ") === "cat-file -t HEAD:docs") {
        return { stdout: "tree\n", stderr: "", exitCode: 0 };
      }
      if (args.join(" ") === "cat-file -t HEAD:docs/file") {
        return { stdout: "blob\n", stderr: "", exitCode: 0 };
      }
      return cleanMainRunGit()(args, { cwd: "/repo", allowFailure: true });
    };
    const createDirectory = vi.fn(async () => undefined);
    const copyFile = vi.fn(async () => undefined);

    const result = await extractBubbleV11(
      {
        ...baseCommand,
        paths: ["docs/file/new.md"]
      },
      dependencies({
        runGit,
        createDirectory,
        copyFile,
        fileInfo: async (path: string) =>
          path.startsWith("/worktrees/")
            ? defaultFileInfo(path)
            : {
                exists: false,
                isFile: false,
                isDirectory: false,
                errorCode: "ENOENT"
              }
      })
    );

    expect(result).toMatchObject({
      status: "failed",
      reasonCode: "EXTRACT_TARGET_PATH_EXISTS",
      diagnostics: {
        normalizedPath: "docs/file/new.md",
        targetPath: "/repo/docs/file"
      }
    });
    expect(createDirectory).not.toHaveBeenCalled();
    expect(copyFile).not.toHaveBeenCalled();
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
