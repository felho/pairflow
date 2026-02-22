import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { renderBubbleConfigToml, assertValidBubbleConfig } from "../../config/bubbleConfig.js";
import {
  DEFAULT_MAX_ROUNDS,
  DEFAULT_QUALITY_MODE,
  DEFAULT_WATCHDOG_TIMEOUT_MINUTES,
  DEFAULT_WORK_MODE
} from "../../config/defaults.js";
import { getBubblePaths, type BubblePaths } from "./paths.js";
import { createInitialBubbleState } from "../state/initialState.js";
import { assertValidBubbleStateSnapshot } from "../state/stateSchema.js";
import { appendProtocolEnvelope } from "../protocol/transcriptStore.js";
import { isNonEmptyString } from "../validation.js";
import { GitRepositoryError, assertGitRepository } from "../workspace/git.js";
import type { AgentName, BubbleConfig, BubbleStateSnapshot } from "../../types/bubble.js";

export interface BubbleCreateInput {
  id: string;
  repoPath: string;
  baseBranch: string;
  task?: string;
  taskFile?: string;
  cwd?: string;
  implementer?: AgentName;
  reviewer?: AgentName;
  testCommand?: string;
  typecheckCommand?: string;
  openCommand?: string;
}

export interface ResolvedTaskInput {
  content: string;
  source: "inline" | "file";
  sourcePath?: string;
}

export interface BubbleCreateResult {
  bubbleId: string;
  paths: BubblePaths;
  config: BubbleConfig;
  state: BubbleStateSnapshot;
  task: ResolvedTaskInput;
}

export class BubbleCreateError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "BubbleCreateError";
  }
}

function validateBubbleId(id: string): void {
  if (!/^[a-z][a-z0-9_-]{2,63}$/u.test(id)) {
    throw new BubbleCreateError(
      "Invalid bubble id. Use 3-64 chars, starting with a lowercase letter, then lowercase letters, digits, '_' or '-'."
    );
  }
}

async function ensureRepoPathIsGitRepo(repoPath: string): Promise<void> {
  try {
    await assertGitRepository(repoPath);
  } catch (error) {
    const typedError = error as NodeJS.ErrnoException;
    if (typedError.code === "ENOENT") {
      throw new BubbleCreateError(
        `Repository path does not exist: ${repoPath}`
      );
    }
    if (typedError.code === "ENOTDIR") {
      throw new BubbleCreateError(
        `Repository path is not a directory: ${repoPath}`
      );
    }
    if (error instanceof GitRepositoryError) {
      throw new BubbleCreateError(
        `Repository path does not look like a git repository: ${repoPath}`
      );
    }
    throw error;
  }
}

async function resolveTaskInput(input: {
  task?: string;
  taskFile?: string;
  cwd: string;
}): Promise<ResolvedTaskInput> {
  const hasTaskText = isNonEmptyString(input.task);
  const hasTaskFile = isNonEmptyString(input.taskFile);
  if (hasTaskText && hasTaskFile) {
    throw new BubbleCreateError(
      "Provide either task text or task file path, not both."
    );
  }
  if (!hasTaskText && !hasTaskFile) {
    throw new BubbleCreateError(
      "Provide task text or task file path."
    );
  }

  if (hasTaskFile) {
    const candidatePath = resolve(input.cwd, input.taskFile as string);
    const taskStats = await stat(candidatePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        throw new BubbleCreateError(`Task file does not exist: ${candidatePath}`);
      }
      throw error;
    });
    if (!taskStats.isFile()) {
      throw new BubbleCreateError(`Task path is not a file: ${candidatePath}`);
    }

    const content = await readFile(candidatePath, "utf8");
    if (content.trim().length === 0) {
      throw new BubbleCreateError(`Task file is empty: ${candidatePath}`);
    }

    return {
      content: content.trimEnd(),
      source: "file",
      sourcePath: candidatePath
    };
  }

  const taskText = (input.task as string).trim();
  if (taskText.length === 0) {
    throw new BubbleCreateError("Task cannot be empty.");
  }

  return {
    content: taskText,
    source: "inline"
  };
}

function buildBubbleConfig(input: {
  id: string;
  repoPath: string;
  baseBranch: string;
  bubbleBranch: string;
  implementer?: AgentName;
  reviewer?: AgentName;
  testCommand?: string;
  typecheckCommand?: string;
  openCommand?: string;
}): BubbleConfig {
  return assertValidBubbleConfig({
    id: input.id,
    repo_path: input.repoPath,
    base_branch: input.baseBranch,
    bubble_branch: input.bubbleBranch,
    work_mode: DEFAULT_WORK_MODE,
    quality_mode: DEFAULT_QUALITY_MODE,
    watchdog_timeout_minutes: DEFAULT_WATCHDOG_TIMEOUT_MINUTES,
    max_rounds: DEFAULT_MAX_ROUNDS,
    commit_requires_approval: true,
    open_command: input.openCommand ?? "cursor {{worktree_path}}",
    agents: {
      implementer: input.implementer ?? "codex",
      reviewer: input.reviewer ?? "claude"
    },
    commands: {
      test: input.testCommand ?? "pnpm test",
      typecheck: input.typecheckCommand ?? "pnpm typecheck"
    },
    notifications: {
      enabled: true
    }
  });
}

function renderTaskArtifact(task: ResolvedTaskInput): string {
  const sourceLine =
    task.source === "file"
      ? `Source: file (${task.sourcePath})`
      : "Source: inline text";

  return `# Bubble Task\n\n${sourceLine}\n\n${task.content}\n`;
}

async function ensureBubbleDoesNotExist(bubbleDir: string): Promise<void> {
  try {
    await stat(bubbleDir);
    throw new BubbleCreateError(`Bubble already exists: ${bubbleDir}`);
  } catch (error) {
    const typedError = error as NodeJS.ErrnoException;
    if (typedError.code !== "ENOENT") {
      throw error;
    }
  }
}

async function ensureRuntimeSessionFile(sessionsPath: string): Promise<void> {
  try {
    await writeFile(sessionsPath, "{}\n", {
      encoding: "utf8",
      flag: "wx"
    });
  } catch (error) {
    const typedError = error as NodeJS.ErrnoException;
    if (typedError.code !== "EEXIST") {
      throw error;
    }
  }
}

export async function createBubble(input: BubbleCreateInput): Promise<BubbleCreateResult> {
  validateBubbleId(input.id);

  const repoPath = resolve(input.repoPath);
  await ensureRepoPathIsGitRepo(repoPath);

  const baseBranch = input.baseBranch.trim();
  if (baseBranch.length === 0) {
    throw new BubbleCreateError("Base branch cannot be empty.");
  }

  const paths = getBubblePaths(repoPath, input.id);
  await ensureBubbleDoesNotExist(paths.bubbleDir);

  const bubbleBranch = `bubble/${input.id}`;
  const taskResolveInput: { cwd: string; task?: string; taskFile?: string } = {
    cwd: input.cwd ?? process.cwd()
  };
  if (input.task !== undefined) {
    taskResolveInput.task = input.task;
  }
  if (input.taskFile !== undefined) {
    taskResolveInput.taskFile = input.taskFile;
  }
  const task = await resolveTaskInput(taskResolveInput);

  const bubbleConfigInput: Parameters<typeof buildBubbleConfig>[0] = {
    id: input.id,
    repoPath,
    baseBranch,
    bubbleBranch
  };
  if (input.implementer !== undefined) {
    bubbleConfigInput.implementer = input.implementer;
  }
  if (input.reviewer !== undefined) {
    bubbleConfigInput.reviewer = input.reviewer;
  }
  if (input.testCommand !== undefined) {
    bubbleConfigInput.testCommand = input.testCommand;
  }
  if (input.typecheckCommand !== undefined) {
    bubbleConfigInput.typecheckCommand = input.typecheckCommand;
  }
  if (input.openCommand !== undefined) {
    bubbleConfigInput.openCommand = input.openCommand;
  }

  const config = buildBubbleConfig(bubbleConfigInput);

  const state = assertValidBubbleStateSnapshot(createInitialBubbleState(input.id));

  await mkdir(paths.messageArtifactsDir, { recursive: true });
  await mkdir(paths.locksDir, { recursive: true });
  await mkdir(paths.runtimeDir, { recursive: true });

  await writeFile(paths.bubbleTomlPath, renderBubbleConfigToml(config), {
    encoding: "utf8",
    flag: "wx"
  });
  await writeFile(paths.statePath, `${JSON.stringify(state, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx"
  });
  await writeFile(paths.transcriptPath, "", {
    encoding: "utf8",
    flag: "wx"
  });
  await writeFile(paths.inboxPath, "", {
    encoding: "utf8",
    flag: "wx"
  });
  await writeFile(paths.taskArtifactPath, renderTaskArtifact(task), {
    encoding: "utf8",
    flag: "wx"
  });
  await ensureRuntimeSessionFile(paths.sessionsPath);

  try {
    await appendProtocolEnvelope({
      transcriptPath: paths.transcriptPath,
      lockPath: join(paths.locksDir, `${input.id}.lock`),
      envelope: {
        bubble_id: input.id,
        sender: "orchestrator",
        recipient: config.agents.implementer,
        type: "TASK",
        round: state.round,
        payload: {
          summary: task.content,
          metadata: {
            source: task.source,
            ...(task.sourcePath !== undefined
              ? { source_path: task.sourcePath }
              : {})
          }
        },
        refs: [paths.taskArtifactPath]
      }
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new BubbleCreateError(
      `Failed to append initial TASK envelope for bubble ${input.id}. Root error: ${reason}`
    );
  }

  return {
    bubbleId: input.id,
    paths,
    config,
    state,
    task
  };
}
