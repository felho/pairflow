import { readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  assertCreateReviewArtifactType,
  assertValidBubbleConfig
} from "../../../config/bubbleConfig.js";
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
  CreateReviewArtifactType,
  PairflowCommandProfile
} from "../../../types/bubble.js";
import { GitRepositoryError } from "../../shared/ports/gitRepository.js";
import type { AssertGitRepositoryPort } from "../../shared/ports/gitRepository.js";
import { isNonEmptyString } from "../../shared/validation/primitives.js";
import type { ResolvedTaskInput } from "./createCommandContract.js";

export class BubbleCreateError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "BubbleCreateError";
  }
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
}

export function validateBubbleId(id: string): void {
  if (!/^[a-z][a-z0-9_-]{2,39}$/u.test(id)) {
    throw new BubbleCreateError(
      "Invalid bubble id. Maximum length is 40 characters. Use 3-40 chars, starting with a lowercase letter, then lowercase letters, digits, '_' or '-'."
    );
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

export async function resolveTaskInput(input: {
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

export async function resolveReviewerBriefInput(input: {
  reviewerBrief?: string;
  reviewerBriefFile?: string;
  accuracyCritical: boolean;
  cwd: string;
}): Promise<ResolvedTaskInput | undefined> {
  const hasReviewerBriefText = isNonEmptyString(input.reviewerBrief);
  const hasReviewerBriefFile = isNonEmptyString(input.reviewerBriefFile);
  if (hasReviewerBriefText && hasReviewerBriefFile) {
    throw new BubbleCreateError(
      "Provide either reviewer brief text or reviewer brief file path, not both."
    );
  }

  if (input.accuracyCritical && !hasReviewerBriefText && !hasReviewerBriefFile) {
    throw new BubbleCreateError(
      "accuracy-critical bubbles require reviewer brief input (--reviewer-brief or --reviewer-brief-file)."
    );
  }

  if (!hasReviewerBriefText && !hasReviewerBriefFile) {
    return undefined;
  }

  if (hasReviewerBriefFile) {
    const candidatePath = resolve(input.cwd, input.reviewerBriefFile as string);
    const briefStats = await stat(candidatePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        throw new BubbleCreateError(
          `Reviewer brief file does not exist: ${candidatePath}`
        );
      }
      throw error;
    });
    if (!briefStats.isFile()) {
      throw new BubbleCreateError(
        `Reviewer brief path is not a file: ${candidatePath}`
      );
    }

    const content = await readFile(candidatePath, "utf8");
    if (content.trim().length === 0) {
      throw new BubbleCreateError(`Reviewer brief file is empty: ${candidatePath}`);
    }

    return {
      content: content.trimEnd(),
      source: "file",
      sourcePath: candidatePath
    };
  }

  const reviewerBriefText = (input.reviewerBrief as string).trim();
  if (reviewerBriefText.length === 0) {
    throw new BubbleCreateError("Reviewer brief cannot be empty.");
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
      : {})
  });
}

export function resolveCreateReviewArtifactType(
  value: unknown
): CreateReviewArtifactType {
  try {
    return assertCreateReviewArtifactType(value);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new BubbleCreateError(reason);
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
    throw new BubbleCreateError(`Bubble already exists: ${bubbleDir}`);
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
