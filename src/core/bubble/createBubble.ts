import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { renderBubbleConfigToml, assertValidBubbleConfig } from "../../config/bubbleConfig.js";
import {
  DEFAULT_DOC_CONTRACT_GATE_MODE,
  DEFAULT_DOC_CONTRACT_ROUND_GATE_APPLIES_AFTER,
  DEFAULT_MAX_ROUNDS,
  DEFAULT_QUALITY_MODE,
  DEFAULT_REVIEW_ARTIFACT_TYPE,
  DEFAULT_REVIEWER_CONTEXT_MODE,
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
  ReviewArtifactType
} from "../../types/bubble.js";

export interface BubbleCreateInput {
  id: string;
  repoPath: string;
  baseBranch: string;
  task?: string;
  taskFile?: string;
  reviewerBrief?: string;
  reviewerBriefFile?: string;
  accuracyCritical?: boolean;
  cwd?: string;
  now?: Date;
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
  reviewerBrief?: ResolvedTaskInput;
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
  reviewArtifactType: ReviewArtifactType;
  implementer?: AgentName;
  reviewer?: AgentName;
  testCommand?: string;
  typecheckCommand?: string;
  openCommand?: string;
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
    reviewer_context_mode: DEFAULT_REVIEWER_CONTEXT_MODE,
    watchdog_timeout_minutes: DEFAULT_WATCHDOG_TIMEOUT_MINUTES,
    max_rounds: DEFAULT_MAX_ROUNDS,
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
      test: input.testCommand ?? "pnpm test",
      typecheck: input.typecheckCommand ?? "pnpm typecheck"
    },
    notifications: {
      enabled: true
    },
    doc_contract_gates: {
      mode: DEFAULT_DOC_CONTRACT_GATE_MODE,
      round_gate_applies_after: DEFAULT_DOC_CONTRACT_ROUND_GATE_APPLIES_AFTER
    }
  });
}

function inferReviewArtifactType(task: ResolvedTaskInput): ReviewArtifactType {
  const text = task.content.toLowerCase();
  const sourcePath = task.sourcePath?.toLowerCase() ?? "";

  let documentScore = 0;
  let codeScore = 0;

  // Intentional bias: markdown/text task files default toward document review.
  // We still require a >=2 lead before forcing "document" or "code"; near-ties
  // fall back to "auto".
  if (sourcePath.endsWith(".md") || sourcePath.endsWith(".txt")) {
    documentScore += 1;
  }
  if (
    sourcePath.endsWith(".ts") ||
    sourcePath.endsWith(".tsx") ||
    sourcePath.endsWith(".js") ||
    sourcePath.endsWith(".py")
  ) {
    codeScore += 2;
  }

  const documentPatterns = [
    /\bprd\b/u,
    /\bdocument(?:ation)?\b/u,
    /\btask file\b/u,
    /\bmarkdown\b/u,
    /\bdocs?\//u,
    /\bdocument[- ]only\b/u
  ];
  const codePatterns = [
    /\bsrc\//u,
    /\btests\//u,
    /\btypescript\b/u,
    /\bimplement(?:ation)?\b/u,
    /\brefactor\b/u,
    /\bbug\b/u,
    /\bapi\b/u
  ];

  for (const pattern of documentPatterns) {
    if (pattern.test(text)) {
      documentScore += 1;
    }
  }
  for (const pattern of codePatterns) {
    if (pattern.test(text)) {
      codeScore += 1;
    }
  }

  if (documentScore >= codeScore + 2) {
    return "document";
  }
  if (codeScore >= documentScore + 2) {
    return "code";
  }

  return DEFAULT_REVIEW_ARTIFACT_TYPE;
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
  const createdAt = input.now ?? new Date();

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
    reviewArtifactType: inferReviewArtifactType(task)
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
      task_source: task.source
    },
    now: createdAt
  });

  return {
    bubbleId: input.id,
    paths,
    config,
    state,
    task,
    ...(reviewerBrief !== undefined ? { reviewerBrief } : {})
  };
}
