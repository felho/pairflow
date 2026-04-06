import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  assertCreateReviewArtifactType,
  assertValidBubbleConfig,
  renderBubbleConfigToml
} from "../../config/bubbleConfig.js";
import {
  DEFAULT_DOC_CONTRACT_ROUND_GATE_APPLIES_AFTER,
  DEFAULT_MAX_ROUNDS,
  DEFAULT_PAIRFLOW_COMMAND_PROFILE,
  DEFAULT_QUALITY_MODE,
  DEFAULT_REVIEWER_CONTEXT_MODE,
  DEFAULT_SEVERITY_GATE_ROUND,
  DEFAULT_WATCHDOG_TIMEOUT_MINUTES,
  DEFAULT_WORK_MODE
} from "../../config/defaults.js";
import { getBubblePaths, type BubblePaths } from "./paths.js";
import { createInitialBubbleState } from "../state/initialState.js";
import { assertValidBubbleStateSnapshot } from "../state/stateSchema.js";
import { appendProtocolEnvelope } from "../protocol/transcriptStore.js";
import { isNonEmptyString } from "../validation.js";
import { GitRepositoryError, assertGitRepository } from "../workspace/git.js";
import { generateBubbleInstanceId } from "./bubbleInstanceId.js";
import { emitBubbleLifecycleEventBestEffort } from "../metrics/bubbleEvents.js";
import {
  createDocContractGateArtifact,
  isDocContractGateScopeActive,
  resolveDocContractGateArtifactPath,
  writeDocContractGateArtifact
} from "../gates/docContractGates.js";
import type {
  AgentName,
  BubbleConfig,
  BubbleStateSnapshot,
  CreateReviewArtifactType,
  PairflowCommandProfile
} from "../../types/bubble.js";
import type {
  BubbleCreateDependencies,
  BubbleCreateInput,
  BubbleCreateResult,
  ResolvedTaskInput
} from "../../v11/application/create/createCommandContract.js";
import { extractReviewerFocus } from "../../v11/application/create/createReviewerFocus.js";
export type {
  BubbleCreateDependencies,
  BubbleCreateInput,
  BubbleCreateResult,
  ResolvedTaskInput
} from "../../v11/application/create/createCommandContract.js";
export { extractReviewerFocus } from "../../v11/application/create/createReviewerFocus.js";

export class BubbleCreateError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "BubbleCreateError";
  }
}

function validateBubbleId(id: string): void {
  if (!/^[a-z][a-z0-9_-]{2,39}$/u.test(id)) {
    throw new BubbleCreateError(
      "Invalid bubble id. Maximum length is 40 characters. Use 3-40 chars, starting with a lowercase letter, then lowercase letters, digits, '_' or '-'."
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

async function resolveReviewerBriefInput(input: {
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

function buildBubbleConfig(input: {
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
}): BubbleConfig {
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

function resolveCreateReviewArtifactType(
  value: unknown
): CreateReviewArtifactType {
  try {
    return assertCreateReviewArtifactType(value);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new BubbleCreateError(reason);
  }
}

function renderTaskArtifact(task: ResolvedTaskInput): string {
  const sourceLine =
    task.source === "file"
      ? `Source: file (${task.sourcePath})`
      : task.source === "ideation_placeholder"
      ? "Source: ideation placeholder (kickoff required before implementation)"
      : "Source: inline text";

  return `# Bubble Task\n\n${sourceLine}\n\n${task.content}\n`;
}

function buildIdeationPlaceholderTaskContent(bubbleId: string): string {
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

export async function createBubble(
  input: BubbleCreateInput,
  dependencies: BubbleCreateDependencies = {}
): Promise<BubbleCreateResult> {
  validateBubbleId(input.id);
  const createdAt = input.now ?? new Date();
  const reviewArtifactType = resolveCreateReviewArtifactType(input.reviewArtifactType);

  const repoPath = resolve(input.repoPath);
  await ensureRepoPathIsGitRepo(repoPath);

  const baseBranch = input.baseBranch.trim();
  if (baseBranch.length === 0) {
    throw new BubbleCreateError("Base branch cannot be empty.");
  }

  const paths = getBubblePaths(repoPath, input.id);
  await ensureBubbleDoesNotExist(paths.bubbleDir);

  const bubbleBranch = `bubble/${input.id}`;
  const ideationMode = input.ideation === true;
  const task = ideationMode
    ? {
        content: buildIdeationPlaceholderTaskContent(input.id),
        source: "ideation_placeholder" as const
      }
    : await resolveTaskInput({
        cwd: input.cwd ?? process.cwd(),
        ...(input.task !== undefined ? { task: input.task } : {}),
        ...(input.taskFile !== undefined ? { taskFile: input.taskFile } : {})
      });
  const reviewerFocus = extractReviewerFocus(task.content);
  const accuracyCritical = input.accuracyCritical === true;
  const reviewerBrief = await resolveReviewerBriefInput({
    ...(input.reviewerBrief !== undefined
      ? { reviewerBrief: input.reviewerBrief }
      : {}),
    ...(input.reviewerBriefFile !== undefined
      ? { reviewerBriefFile: input.reviewerBriefFile }
      : {}),
    accuracyCritical,
    cwd: input.cwd ?? process.cwd()
  });

  const bubbleConfigInput: Parameters<typeof buildBubbleConfig>[0] = {
    id: input.id,
    bubbleInstanceId: generateBubbleInstanceId(createdAt),
    repoPath,
    baseBranch,
    bubbleBranch,
    accuracyCritical,
    reviewArtifactType,
    ...(ideationMode
      ? {
          ideationMode: true,
          ideationStartedAt: createdAt.toISOString()
        }
      : {})
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
  if (input.bootstrapCommand !== undefined) {
    bubbleConfigInput.bootstrapCommand = input.bootstrapCommand;
  }
  if (input.openCommand !== undefined) {
    bubbleConfigInput.openCommand = input.openCommand;
  }
  if (input.pairflowCommandProfile !== undefined) {
    bubbleConfigInput.pairflowCommandProfile = input.pairflowCommandProfile;
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
  let reviewerFocusArtifactWriteStatus: "written" | "write_failed" = "written";
  let reviewerFocusArtifactWriteErrorCode: string | undefined;
  const writeReviewerFocusArtifact =
    dependencies.writeReviewerFocusArtifact ?? writeFile;
  await writeReviewerFocusArtifact(
    paths.reviewerFocusArtifactPath,
    `${JSON.stringify(reviewerFocus, null, 2)}\n`,
    {
      encoding: "utf8",
      flag: "wx"
    }
  ).catch((error: NodeJS.ErrnoException) => {
    reviewerFocusArtifactWriteStatus = "write_failed";
    reviewerFocusArtifactWriteErrorCode =
      error.code ?? error.name ?? "unknown_write_failure";
  });
  if (
    isDocContractGateScopeActive({
      reviewArtifactType: config.review_artifact_type
    })
  ) {
    await writeDocContractGateArtifact(
      resolveDocContractGateArtifactPath(paths.artifactsDir),
      createDocContractGateArtifact({
        now: createdAt,
        bubbleConfig: config,
        taskContent: task.content
      })
    ).catch(() => undefined);
  }
  if (reviewerBrief !== undefined) {
    await writeFile(paths.reviewerBriefArtifactPath, `${reviewerBrief.content}\n`, {
      encoding: "utf8",
      flag: "wx"
    });
  }
  await ensureRuntimeSessionFile(paths.sessionsPath);

  if (!ideationMode) {
    try {
      await appendProtocolEnvelope({
        transcriptPath: paths.transcriptPath,
        lockPath: join(paths.locksDir, `${input.id}.lock`),
        now: createdAt,
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
  }

  await emitBubbleLifecycleEventBestEffort({
    repoPath,
    bubbleId: input.id,
    bubbleInstanceId: bubbleConfigInput.bubbleInstanceId,
    eventType: "bubble_created",
    round: null,
    actorRole: "orchestrator",
    metadata: {
      base_branch: config.base_branch,
      bubble_branch: config.bubble_branch,
      review_artifact_type: config.review_artifact_type,
      task_source: task.source,
      ideation_mode: ideationMode,
      ideation_task_pending: ideationMode,
      reviewer_focus_status: reviewerFocus.status,
      reviewer_focus_artifact_write: reviewerFocusArtifactWriteStatus,
      ...(reviewerFocusArtifactWriteErrorCode !== undefined
        ? { reviewer_focus_artifact_write_error_code: reviewerFocusArtifactWriteErrorCode }
        : {})
    },
    now: createdAt
  });

  return {
    bubbleId: input.id,
    paths,
    config,
    state,
    task,
    reviewerFocus,
    reviewerFocusArtifactPersist: {
      status: reviewerFocusArtifactWriteStatus,
      artifactPath: paths.reviewerFocusArtifactPath,
      ...(reviewerFocusArtifactWriteErrorCode !== undefined
        ? { errorCode: reviewerFocusArtifactWriteErrorCode }
        : {})
    },
    ...(reviewerBrief !== undefined ? { reviewerBrief } : {})
  };
}
