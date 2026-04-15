import { readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  BUBBLE_EXECUTOR_INVALID,
  assertCreateReviewArtifactType,
  assertValidBubbleConfig
} from "../../../config/bubbleConfig.js";
import type { PairflowGlobalConfig } from "../../../config/pairflowConfig.js";
import { PAIRFLOW_REMOTE_CONFIG_INVALID } from "../../../config/pairflowConfig.js";
import {
  DEFAULT_DOC_CONTRACT_ROUND_GATE_APPLIES_AFTER,
  DEFAULT_MAX_ROUNDS,
  DEFAULT_PAIRFLOW_COMMAND_PROFILE,
  DEFAULT_QUALITY_MODE,
  DEFAULT_REVIEWER_CONTEXT_MODE,
  DEFAULT_SEVERITY_GATE_ROUND,
  DEFAULT_WATCHDOG_TIMEOUT_MINUTES,
  DEFAULT_WORK_MODE
} from "../../../config/defaults.js";
import type {
  AgentName,
  BubbleConfig,
  BubbleRemotePointerCreated,
  CreateReviewArtifactType,
  PairflowCommandProfile
} from "../../../types/bubble.js";
import { GitRepositoryError } from "../../shared/ports/gitRepository.js";
import type { AssertGitRepositoryPort } from "../../shared/ports/gitRepository.js";
import {
  isNonEmptyString,
  SchemaValidationError
} from "../../shared/validation/primitives.js";
import type { ResolvedTaskInput } from "./createCommandContract.js";
import {
  parseCreateRemoteAlias
} from "./createRemoteAlias.js";

export class BubbleCreateError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "BubbleCreateError";
  }
}

function toBubbleCreateError(input: {
  message: string;
  context: Record<string, unknown>;
}): BubbleCreateError {
  void input.context;
  return new BubbleCreateError(input.message);
}

export interface CreateBubbleConfigInput {
  id: string;
  bubbleInstanceId: string;
  repoPath: string;
  baseBranch: string;
  bubbleBranch: string;
  accuracyCritical: boolean;
  reviewArtifactType: CreateReviewArtifactType;
  ideationMode?: boolean;
  ideationStartedAt?: string;
  implementer?: AgentName;
  reviewer?: AgentName;
  testCommand?: string;
  typecheckCommand?: string;
  bootstrapCommand?: string;
  openCommand?: string;
  pairflowCommandProfile?: PairflowCommandProfile;
  executorRemote?: string;
}

export interface ResolvedCreateBubbleRemoteExecution {
  remoteAlias: string;
  remotePointer: BubbleRemotePointerCreated;
}

export function validateBubbleId(id: string): void {
  if (!/^[a-z][a-z0-9_-]{2,39}$/u.test(id)) {
    throw toBubbleCreateError({
      message:
        "Invalid bubble id. Maximum length is 40 characters. Use 3-40 chars, starting with a lowercase letter, then lowercase letters, digits, '_' or '-'.",
      context: { id }
    });
  }
}

export async function ensureRepoPathIsGitRepo(
  repoPath: string,
  assertGitRepository: AssertGitRepositoryPort
): Promise<void> {
  try {
    await assertGitRepository(repoPath);
  } catch (error) {
    const typedError = error as NodeJS.ErrnoException;
    if (typedError.code === "ENOENT") {
      throw toBubbleCreateError({
        message: `Repository path does not exist: ${repoPath}`,
        context: { repoPath, reason: "ENOENT" }
      });
    }
    if (typedError.code === "ENOTDIR") {
      throw toBubbleCreateError({
        message: `Repository path is not a directory: ${repoPath}`,
        context: { repoPath, reason: "ENOTDIR" }
      });
    }
    if (error instanceof GitRepositoryError) {
      throw toBubbleCreateError({
        message: `Repository path does not look like a git repository: ${repoPath}`,
        context: { repoPath, reason: "GitRepositoryError" }
      });
    }
    throw error;
  }
}

export async function resolveTaskInput(input: {
  task?: string;
  taskFile?: string;
  cwd: string;
}): Promise<ResolvedTaskInput> {
  const hasTaskText = isNonEmptyString(input.task);
  const hasTaskFile = isNonEmptyString(input.taskFile);
  if (hasTaskText && hasTaskFile) {
    throw toBubbleCreateError({
      message: "Provide either task text or task file path, not both.",
      context: { task: input.task, taskFile: input.taskFile, cwd: input.cwd }
    });
  }
  if (!hasTaskText && !hasTaskFile) {
    throw toBubbleCreateError({
      message: "Provide task text or task file path.",
      context: { task: input.task, taskFile: input.taskFile, cwd: input.cwd }
    });
  }

  if (hasTaskFile) {
    const candidatePath = resolve(input.cwd, input.taskFile as string);
    const taskStats = await stat(candidatePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        throw toBubbleCreateError({
          message: `Task file does not exist: ${candidatePath}`,
          context: { candidatePath, cwd: input.cwd, taskFile: input.taskFile }
        });
      }
      throw error;
    });
    if (!taskStats.isFile()) {
      throw toBubbleCreateError({
        message: `Task path is not a file: ${candidatePath}`,
        context: { candidatePath, cwd: input.cwd, taskFile: input.taskFile }
      });
    }

    const content = await readFile(candidatePath, "utf8");
    if (content.trim().length === 0) {
      throw toBubbleCreateError({
        message: `Task file is empty: ${candidatePath}`,
        context: { candidatePath, cwd: input.cwd, taskFile: input.taskFile }
      });
    }

    return {
      content: content.trimEnd(),
      source: "file",
      sourcePath: candidatePath
    };
  }

  const taskText = (input.task as string).trim();
  if (taskText.length === 0) {
    throw toBubbleCreateError({
      message: "Task cannot be empty.",
      context: { task: input.task, cwd: input.cwd }
    });
  }

  return {
    content: taskText,
    source: "inline"
  };
}

export async function resolveReviewerBriefInput(input: {
  reviewerBrief?: string;
  reviewerBriefFile?: string;
  accuracyCritical: boolean;
  cwd: string;
}): Promise<ResolvedTaskInput | undefined> {
  const hasReviewerBriefText = isNonEmptyString(input.reviewerBrief);
  const hasReviewerBriefFile = isNonEmptyString(input.reviewerBriefFile);
  if (hasReviewerBriefText && hasReviewerBriefFile) {
    throw toBubbleCreateError({
      message:
        "Provide either reviewer brief text or reviewer brief file path, not both.",
      context: {
        reviewerBrief: input.reviewerBrief,
        reviewerBriefFile: input.reviewerBriefFile,
        cwd: input.cwd
      }
    });
  }

  if (input.accuracyCritical && !hasReviewerBriefText && !hasReviewerBriefFile) {
    throw toBubbleCreateError({
      message:
        "accuracy-critical bubbles require reviewer brief input (--reviewer-brief or --reviewer-brief-file).",
      context: { accuracyCritical: input.accuracyCritical, cwd: input.cwd }
    });
  }

  if (!hasReviewerBriefText && !hasReviewerBriefFile) {
    return undefined;
  }

  if (hasReviewerBriefFile) {
    const candidatePath = resolve(input.cwd, input.reviewerBriefFile as string);
    const briefStats = await stat(candidatePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        throw toBubbleCreateError({
          message: `Reviewer brief file does not exist: ${candidatePath}`,
          context: {
            candidatePath,
            cwd: input.cwd,
            reviewerBriefFile: input.reviewerBriefFile
          }
        });
      }
      throw error;
    });
    if (!briefStats.isFile()) {
      throw toBubbleCreateError({
        message: `Reviewer brief path is not a file: ${candidatePath}`,
        context: {
          candidatePath,
          cwd: input.cwd,
          reviewerBriefFile: input.reviewerBriefFile
        }
      });
    }

    const content = await readFile(candidatePath, "utf8");
    if (content.trim().length === 0) {
      throw toBubbleCreateError({
        message: `Reviewer brief file is empty: ${candidatePath}`,
        context: {
          candidatePath,
          cwd: input.cwd,
          reviewerBriefFile: input.reviewerBriefFile
        }
      });
    }

    return {
      content: content.trimEnd(),
      source: "file",
      sourcePath: candidatePath
    };
  }

  const reviewerBriefText = (input.reviewerBrief as string).trim();
  if (reviewerBriefText.length === 0) {
    throw toBubbleCreateError({
      message: "Reviewer brief cannot be empty.",
      context: { reviewerBrief: input.reviewerBrief, cwd: input.cwd }
    });
  }

  return {
    content: reviewerBriefText,
    source: "inline"
  };
}

export function buildBubbleConfig(input: CreateBubbleConfigInput): BubbleConfig {
  return assertValidBubbleConfig({
    id: input.id,
    bubble_instance_id: input.bubbleInstanceId,
    repo_path: input.repoPath,
    base_branch: input.baseBranch,
    bubble_branch: input.bubbleBranch,
    work_mode: DEFAULT_WORK_MODE,
    quality_mode: DEFAULT_QUALITY_MODE,
    review_artifact_type: input.reviewArtifactType,
    pairflow_command_profile:
      input.pairflowCommandProfile ?? DEFAULT_PAIRFLOW_COMMAND_PROFILE,
    reviewer_context_mode: DEFAULT_REVIEWER_CONTEXT_MODE,
    watchdog_timeout_minutes: DEFAULT_WATCHDOG_TIMEOUT_MINUTES,
    max_rounds: DEFAULT_MAX_ROUNDS,
    severity_gate_round: DEFAULT_SEVERITY_GATE_ROUND,
    commit_requires_approval: true,
    accuracy_critical: input.accuracyCritical,
    ...(input.openCommand !== undefined
      ? { open_command: input.openCommand }
      : {}),
    agents: {
      implementer: input.implementer ?? "codex",
      reviewer: input.reviewer ?? "claude"
    },
    commands: {
      ...(input.bootstrapCommand !== undefined
        ? { bootstrap: input.bootstrapCommand }
        : {}),
      test: input.testCommand ?? "pnpm test",
      typecheck: input.typecheckCommand ?? "pnpm typecheck"
    },
    notifications: {
      enabled: true
    },
    doc_contract_gates: {
      round_gate_applies_after: DEFAULT_DOC_CONTRACT_ROUND_GATE_APPLIES_AFTER
    },
    ...(input.ideationMode === true
      ? {
          ideation: {
            mode: true,
            task_pending: true,
            ...(input.ideationStartedAt !== undefined
              ? { started_at: input.ideationStartedAt }
              : {})
          }
        }
      : {}),
    ...(input.executorRemote !== undefined
      ? {
          executor: {
            type: "ssh",
            remote: input.executorRemote
          }
        }
      : {})
  });
}

export async function resolveCreateBubbleRemoteExecution(input: {
  remote?: string;
  loadPairflowGlobalConfig: () => Promise<PairflowGlobalConfig>;
}): Promise<ResolvedCreateBubbleRemoteExecution | undefined> {
  const { remoteAlias, errorMessage } = parseCreateRemoteAlias(input.remote);
  if (remoteAlias === undefined) {
    if (errorMessage !== undefined) {
      throw toBubbleCreateError({
        message: errorMessage,
        context: { remote: input.remote }
      });
    }
    return undefined;
  }

  let globalConfig: PairflowGlobalConfig;
  try {
    globalConfig = await input.loadPairflowGlobalConfig();
  } catch (error) {
    if (error instanceof SchemaValidationError) {
      const configErrorMessage = error.message.startsWith(
        `${PAIRFLOW_REMOTE_CONFIG_INVALID}:`
      )
        ? error.message
        : `${PAIRFLOW_REMOTE_CONFIG_INVALID}: ${error.message}`;
      throw toBubbleCreateError({
        message: configErrorMessage,
        context: {
          remote: remoteAlias,
          reason: "invalid_global_config"
        }
      });
    }

    const reason = error instanceof Error ? error.message : String(error);
    throw toBubbleCreateError({
      message:
        `Failed to load global Pairflow config for remote bubble create: ${reason}`,
      context: {
        remote: remoteAlias,
        reason: "load_global_config_failed"
      }
    });
  }

  const remoteConfig = globalConfig.remotes?.[remoteAlias];
  if (remoteConfig === undefined) {
    throw toBubbleCreateError({
      message:
        `${BUBBLE_EXECUTOR_INVALID}: Remote "${remoteAlias}" is not defined in the global [remotes.<name>] config.`,
      context: { remote: remoteAlias }
    });
  }

  return {
    remoteAlias,
    remotePointer: {
      kind: "created",
      host: remoteConfig.host,
      ...(remoteConfig.default_port_forwards !== undefined
        ? { portForwards: remoteConfig.default_port_forwards }
        : {})
    }
  };
}

export function resolveCreateReviewArtifactType(
  value: unknown
): CreateReviewArtifactType {
  try {
    return assertCreateReviewArtifactType(value);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw toBubbleCreateError({
      message: reason,
      context: { value }
    });
  }
}

export function renderTaskArtifact(task: ResolvedTaskInput): string {
  const sourceLine =
    task.source === "file"
      ? `Source: file (${task.sourcePath})`
      : task.source === "ideation_placeholder"
      ? "Source: ideation placeholder (kickoff required before implementation)"
      : "Source: inline text";

  return `# Bubble Task\n\n${sourceLine}\n\n${task.content}\n`;
}

export function buildIdeationPlaceholderTaskContent(bubbleId: string): string {
  return [
    "## Ideation Placeholder",
    "",
    "This bubble was created with `--ideation`; there is no active implementation task yet.",
    "Run kickoff before implementation handoff:",
    `- pairflow bubble kickoff --id ${bubbleId} --task "<task text>"`,
    `- pairflow bubble kickoff --id ${bubbleId} --task-file <path>`,
    "",
    "metadata_source: ideation_placeholder"
  ].join("\n");
}

export async function ensureBubbleDoesNotExist(bubbleDir: string): Promise<void> {
  try {
    await stat(bubbleDir);
    throw toBubbleCreateError({
      message: `Bubble already exists: ${bubbleDir}`,
      context: { bubbleDir }
    });
  } catch (error) {
    const typedError = error as NodeJS.ErrnoException;
    if (typedError.code !== "ENOENT") {
      throw error;
    }
  }
}

export async function ensureRuntimeSessionFile(
  sessionsPath: string
): Promise<void> {
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
