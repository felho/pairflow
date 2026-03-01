import { applyStateTransition } from "../state/machine.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";
import { BubbleLookupError, resolveBubbleById } from "./bubbleLookup.js";
import { shellQuote } from "../util/shellQuote.js";
import { buildAgentCommand } from "../runtime/agentCommand.js";
import { join } from "node:path";
import {
  buildResumeTranscriptSummary,
  buildResumeTranscriptSummaryFallback
} from "../protocol/resumeSummary.js";
import {
  bootstrapWorktreeWorkspace,
  cleanupWorktreeWorkspace,
  WorkspaceBootstrapError
} from "../workspace/worktreeManager.js";
import {
  buildBubbleTmuxSessionName,
  launchBubbleTmuxSession,
  runTmux,
  terminateBubbleTmuxSession,
  TmuxCommandError,
  TmuxSessionExistsError
} from "../runtime/tmuxManager.js";
import {
  claimRuntimeSession,
  removeRuntimeSession,
  RuntimeSessionsRegistryError,
  RuntimeSessionsRegistryLockError
} from "../runtime/sessionsRegistry.js";
import { buildReviewerAgentSelectionGuidance } from "../runtime/reviewerGuidance.js";
import { buildReviewerSeverityOntologyReminder } from "../runtime/reviewerSeverityOntology.js";
import {
  buildReviewerPassOutputContractGuidance,
  buildReviewerScoutExpansionWorkflowGuidance
} from "../runtime/reviewerScoutExpansionGuidance.js";
import { ensureBubbleInstanceIdForMutation } from "./bubbleInstanceId.js";
import { emitBubbleLifecycleEventBestEffort } from "../metrics/bubbleEvents.js";
import {
  buildReviewerDecisionMatrixReminder,
  formatReviewerTestExecutionDirective,
  resolveReviewerTestEvidenceArtifactPath,
  resolveReviewerTestExecutionDirective
} from "../reviewer/testEvidence.js";
import type { BubbleStateSnapshot, ReviewArtifactType } from "../../types/bubble.js";

export interface StartBubbleInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
}

export interface StartBubbleResult {
  bubbleId: string;
  state: BubbleStateSnapshot;
  tmuxSessionName: string;
  worktreePath: string;
}

export interface StartBubbleDependencies {
  bootstrapWorktreeWorkspace?: typeof bootstrapWorktreeWorkspace;
  cleanupWorktreeWorkspace?: typeof cleanupWorktreeWorkspace;
  launchBubbleTmuxSession?: typeof launchBubbleTmuxSession;
  terminateBubbleTmuxSession?: typeof terminateBubbleTmuxSession;
  isTmuxSessionAlive?: ((sessionName: string) => Promise<boolean>) | undefined;
  claimRuntimeSession?: typeof claimRuntimeSession;
  removeRuntimeSession?: typeof removeRuntimeSession;
  buildResumeTranscriptSummary?: typeof buildResumeTranscriptSummary;
}

export class StartBubbleError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "StartBubbleError";
  }
}

async function isTmuxSessionAliveDefault(sessionName: string): Promise<boolean> {
  try {
    const result = await runTmux(["has-session", "-t", sessionName], {
      allowFailure: true
    });
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

function buildStatusPaneCommand(bubbleId: string, repoPath: string, worktreePath: string): string {
  const watchdogCommand = `pairflow bubble watchdog --id ${shellQuote(bubbleId)} --repo ${shellQuote(repoPath)} >/dev/null 2>&1 || true`;
  const statusCommand = `pairflow bubble status --id ${shellQuote(bubbleId)} --repo ${shellQuote(repoPath)}`;
  const echoWorktree = `echo ${shellQuote(worktreePath)}`;
  const loopScript = `while true; do clear; ${watchdogCommand}; ${statusCommand}; ${echoWorktree}; sleep 2; done`;
  return `bash -lc ${shellQuote(loopScript)}`;
}

function buildImplementerStartupPrompt(input: {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  taskArtifactPath: string;
  donePackagePath: string;
}): string {
  const evidenceHandoffGuidance = buildImplementerEvidenceHandoffGuidance();
  return [
    `Pairflow implementer start for bubble ${input.bubbleId}.`,
    `Read task: ${input.taskArtifactPath}.`,
    "Implement in this worktree and run relevant validation before handoff.",
    evidenceHandoffGuidance,
    `Keep done package updated at: ${input.donePackagePath}.`,
    "Done package should summarize changes + validation results for final commit handoff.",
    `Repository: ${input.repoPath}. Worktree: ${input.worktreePath}.`,
    "When done, run `pairflow pass --summary \"<what changed + validation>\"` with available evidence `--ref` attachments.",
    "Use `pairflow ask-human --question \"...\"` only for blockers."
  ].join(" ");
}

function buildReviewerStartupPrompt(input: {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  taskArtifactPath: string;
  reviewArtifactType: ReviewArtifactType;
}): string {
  return [
    `Pairflow reviewer start for bubble ${input.bubbleId}.`,
    "Stand by first. Do not start reviewing until implementer handoff (`PASS`) arrives.",
    "When PASS arrives, run a fresh review.",
    "When PASS arrives, follow the orchestrator test-evidence skip/run directive for test execution.",
    buildReviewerSeverityOntologyReminder({ includeFullOntology: true }),
    buildReviewerDecisionMatrixReminder(),
    buildReviewerAgentSelectionGuidance(input.reviewArtifactType),
    buildReviewerScoutExpansionWorkflowGuidance(),
    buildReviewerPassOutputContractGuidance(),
    "If findings remain, run `pairflow pass --summary ... --finding 'P1:...|artifact://...'` (repeatable; for P0/P1 include finding-level refs).",
    "Round 1 guardrail: do not run `pairflow converged` in round 1. In round 1, always hand off with `pairflow pass` and explicit findings declaration (`--finding` or `--no-findings`).",
    "From round 2 onward, if clean, run `pairflow converged --summary` directly (do not run `pairflow pass --no-findings` first).",
    "Execute pairflow commands directly from this worktree (do not ask for confirmation first).",
    "Never edit transcript/inbox/state files manually.",
    `Repo: ${input.repoPath}. Worktree: ${input.worktreePath}. Task: ${input.taskArtifactPath}.`
  ].join(" ");
}

function buildImplementerKickoffMessage(input: {
  bubbleId: string;
  taskArtifactPath: string;
}): string {
  return [
    `# [pairflow] bubble=${input.bubbleId} kickoff.`,
    `Read task file now: ${input.taskArtifactPath}.`,
    "Start implementation immediately in this worktree.",
    buildImplementerEvidenceHandoffGuidance(),
    "When done with validation, hand off with `pairflow pass --summary \"<what changed + validation>\"` and include available evidence `--ref` log paths."
  ].join(" ");
}

function buildImplementerEvidenceHandoffGuidance(): string {
  return [
    "Run validation via `pnpm lint`, `pnpm typecheck`, `pnpm test`, or `pnpm check` so evidence logs are written to `.pairflow/evidence/`.",
    "If evidence logs exist, include them as `--ref` when running `pairflow pass`.",
    "If only a subset of validation commands ran, attach refs for the commands that actually ran and state what was intentionally not executed.",
    "Missing expected evidence logs should be treated as incomplete validation packaging."
  ].join(" ");
}

function formatResumeStateValue(value: string | number | null): string {
  return value === null ? "none" : String(value);
}

function buildResumeContextLine(state: BubbleStateSnapshot): string {
  return [
    `state=${state.state}`,
    `round=${state.round}`,
    `active_agent=${formatResumeStateValue(state.active_agent)}`,
    `active_role=${formatResumeStateValue(state.active_role)}`
  ].join(", ");
}

function buildResumeImplementerStartupPrompt(input: {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  taskArtifactPath: string;
  donePackagePath: string;
  state: BubbleStateSnapshot;
  transcriptSummary: string;
  kickoffDiagnostic?: string;
}): string {
  const evidenceHandoffGuidance = buildImplementerEvidenceHandoffGuidance();
  const roleInstruction =
    input.state.state === "RUNNING" && input.state.active_role === "implementer"
      ? "You are currently active. Continue implementation now."
      : "Continue implementation when you become active; otherwise stand by.";
  const lines = [
    `Pairflow implementer resume for bubble ${input.bubbleId}.`,
    `Task: ${input.taskArtifactPath}.`,
    `Done package: ${input.donePackagePath}.`,
    `Repository: ${input.repoPath}. Worktree: ${input.worktreePath}.`,
    `State snapshot: ${buildResumeContextLine(input.state)}.`,
    `Transcript context: ${input.transcriptSummary}`,
    evidenceHandoffGuidance,
    roleInstruction
  ];
  if ((input.kickoffDiagnostic?.trim().length ?? 0) > 0) {
    lines.push(`Kickoff diagnostic: ${input.kickoffDiagnostic}`);
  }
  return lines.join(" ");
}

function buildResumeReviewerStartupPrompt(input: {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  taskArtifactPath: string;
  state: BubbleStateSnapshot;
  transcriptSummary: string;
  kickoffDiagnostic?: string;
  reviewArtifactType: ReviewArtifactType;
  reviewerTestDirectiveLine?: string;
}): string {
  const roleInstruction =
    input.state.state === "RUNNING" && input.state.active_role === "reviewer"
      ? "You are currently active. Continue review now."
      : "Stand by unless you are active or receive a handoff.";
  const lines = [
    `Pairflow reviewer resume for bubble ${input.bubbleId}.`,
    `Task: ${input.taskArtifactPath}.`,
    `Repository: ${input.repoPath}. Worktree: ${input.worktreePath}.`,
    `State snapshot: ${buildResumeContextLine(input.state)}.`,
    `Transcript context: ${input.transcriptSummary}`,
    "Follow orchestrator test-evidence skip/run directive for test execution.",
    buildReviewerSeverityOntologyReminder({ includeFullOntology: true }),
    buildReviewerDecisionMatrixReminder(),
    ...(input.reviewerTestDirectiveLine !== undefined
      ? [`Current directive: ${input.reviewerTestDirectiveLine}`]
      : []),
    buildReviewerAgentSelectionGuidance(input.reviewArtifactType),
    buildReviewerScoutExpansionWorkflowGuidance(),
    buildReviewerPassOutputContractGuidance(),
    "Round 1 guardrail: do not run `pairflow converged` in round 1. In round 1, always hand off with `pairflow pass` and explicit findings declaration (`--finding` or `--no-findings`).",
    "From round 2 onward, if clean, run `pairflow converged --summary` directly (do not run `pairflow pass --no-findings` first).",
    roleInstruction
  ];
  if ((input.kickoffDiagnostic?.trim().length ?? 0) > 0) {
    lines.push(`Kickoff diagnostic: ${input.kickoffDiagnostic}`);
  }
  return lines.join(" ");
}

function buildResumeImplementerKickoffMessage(input: {
  bubbleId: string;
  taskArtifactPath: string;
  round: number;
}): string {
  return [
    `# [pairflow] bubble=${input.bubbleId} resume kickoff (implementer).`,
    `State is RUNNING at round ${input.round}.`,
    `Re-open task context: ${input.taskArtifactPath}.`,
    buildImplementerEvidenceHandoffGuidance(),
    "Continue active implementation and hand off with `pairflow pass --summary \"<what changed + validation>\"` plus available evidence `--ref` logs when ready."
  ].join(" ");
}

function buildResumeReviewerKickoffMessage(input: {
  bubbleId: string;
  round: number;
  reviewerTestDirectiveLine?: string;
}): string {
  const roundActionLine =
    input.round <= 1
      ? "Round 1 guardrail: do not run `pairflow converged`. If clean, hand off with `pairflow pass --summary ... --no-findings`; if findings remain, use `pairflow pass --summary ... --finding ...`."
      : "Continue active review. If findings remain, run `pairflow pass --summary ... --finding ...`; if clean, run `pairflow converged --summary` directly (do not run `pairflow pass --no-findings` first).";
  return [
    `# [pairflow] bubble=${input.bubbleId} resume kickoff (reviewer).`,
    `State is RUNNING at round ${input.round}.`,
    ...(input.reviewerTestDirectiveLine !== undefined
      ? [`Test directive: ${input.reviewerTestDirectiveLine}`]
      : []),
    roundActionLine
  ].join(" ");
}

function resolveResumeKickoffMessages(input: {
  bubbleId: string;
  taskArtifactPath: string;
  state: BubbleStateSnapshot;
  implementerAgent: string;
  reviewerAgent: string;
  reviewerTestDirectiveLine?: string;
}): {
  implementerKickoffMessage?: string;
  reviewerKickoffMessage?: string;
  kickoffDiagnostic?: string;
} {
  if (input.state.state !== "RUNNING") {
    return {};
  }

  if (
    input.state.active_role === "implementer" &&
    input.state.active_agent === input.implementerAgent
  ) {
    return {
      implementerKickoffMessage: buildResumeImplementerKickoffMessage({
        bubbleId: input.bubbleId,
        taskArtifactPath: input.taskArtifactPath,
        round: input.state.round
      })
    };
  }

  if (
    input.state.active_role === "reviewer" &&
    input.state.active_agent === input.reviewerAgent
  ) {
    return {
      reviewerKickoffMessage: buildResumeReviewerKickoffMessage({
        bubbleId: input.bubbleId,
        round: input.state.round,
        ...(input.reviewerTestDirectiveLine !== undefined
          ? { reviewerTestDirectiveLine: input.reviewerTestDirectiveLine }
          : {})
      })
    };
  }

  return {
    kickoffDiagnostic: [
      "RUNNING state active context is inconsistent;",
      `active_role=${formatResumeStateValue(input.state.active_role)},`,
      `active_agent=${formatResumeStateValue(input.state.active_agent)}.`,
      "No kickoff was sent; continue using status pane + transcript/state context."
    ].join(" ")
  };
}

const resumableRuntimeStates = new Set([
  "RUNNING",
  "WAITING_HUMAN",
  "READY_FOR_APPROVAL",
  "APPROVED_FOR_COMMIT",
  "COMMITTED"
]);

export async function startBubble(
  input: StartBubbleInput,
  dependencies: StartBubbleDependencies = {}
): Promise<StartBubbleResult> {
  const bootstrap = dependencies.bootstrapWorktreeWorkspace ?? bootstrapWorktreeWorkspace;
  const cleanup = dependencies.cleanupWorktreeWorkspace ?? cleanupWorktreeWorkspace;
  const launchTmux = dependencies.launchBubbleTmuxSession ?? launchBubbleTmuxSession;
  const terminateTmux =
    dependencies.terminateBubbleTmuxSession ?? terminateBubbleTmuxSession;
  const isTmuxSessionAlive =
    dependencies.isTmuxSessionAlive ?? isTmuxSessionAliveDefault;
  const claimSession = dependencies.claimRuntimeSession ?? claimRuntimeSession;
  const removeSession = dependencies.removeRuntimeSession ?? removeRuntimeSession;
  const buildResumeSummary =
    dependencies.buildResumeTranscriptSummary ?? buildResumeTranscriptSummary;

  const resolved = await resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const bubbleIdentity = await ensureBubbleInstanceIdForMutation({
    bubbleId: resolved.bubbleId,
    repoPath: resolved.repoPath,
    bubblePaths: resolved.bubblePaths,
    bubbleConfig: resolved.bubbleConfig,
    now
  });
  resolved.bubbleConfig = bubbleIdentity.bubbleConfig;

  const loadedState = await readStateSnapshot(resolved.bubblePaths.statePath);
  const currentState = loadedState.state.state;
  const startMode =
    currentState === "CREATED"
      ? "fresh"
      : resumableRuntimeStates.has(currentState)
      ? "resume"
      : null;
  if (startMode === null) {
    throw new StartBubbleError(
      `bubble start requires state CREATED or resumable runtime state (current: ${currentState}).`
    );
  }

  const expectedTmuxSessionName = buildBubbleTmuxSessionName(resolved.bubbleId);
  const donePackagePath = join(resolved.bubblePaths.artifactsDir, "done-package.md");
  let ownershipClaimed = false;
  try {
    const firstClaim = await claimSession({
      sessionsPath: resolved.bubblePaths.sessionsPath,
      bubbleId: resolved.bubbleId,
      repoPath: resolved.repoPath,
      worktreePath: resolved.bubblePaths.worktreePath,
      tmuxSessionName: expectedTmuxSessionName,
      now
    });
    ownershipClaimed = firstClaim.claimed;
    if (!ownershipClaimed) {
      const sessionAlive = await isTmuxSessionAlive(firstClaim.record.tmuxSessionName);
      if (!sessionAlive) {
        await removeSession({
          sessionsPath: resolved.bubblePaths.sessionsPath,
          bubbleId: resolved.bubbleId
        });
        const retryClaim = await claimSession({
          sessionsPath: resolved.bubblePaths.sessionsPath,
          bubbleId: resolved.bubbleId,
          repoPath: resolved.repoPath,
          worktreePath: resolved.bubblePaths.worktreePath,
          tmuxSessionName: expectedTmuxSessionName,
          now
        });
        ownershipClaimed = retryClaim.claimed;
      }

      if (!ownershipClaimed) {
        throw new StartBubbleError(
          `Runtime session already registered for bubble ${resolved.bubbleId}: ${firstClaim.record.tmuxSessionName}. Run bubble reconcile or clean up the stale session before starting again.`
        );
      }
    }
  } catch (error) {
    if (error instanceof StartBubbleError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new StartBubbleError(
      `Failed to acquire runtime session ownership for bubble ${resolved.bubbleId}: ${message}`
    );
  }

  let workspaceBootstrapped = false;
  let tmuxSessionName: string | null = null;
  let preparingState: BubbleStateSnapshot | null = null;
  try {
    let written;
    if (startMode === "fresh") {
      const preparing = applyStateTransition(loadedState.state, {
        to: "PREPARING_WORKSPACE",
        lastCommandAt: nowIso
      });
      preparingState = preparing;
      const preparingWritten = await writeStateSnapshot(
        resolved.bubblePaths.statePath,
        preparing,
        {
          expectedFingerprint: loadedState.fingerprint,
          expectedState: "CREATED"
        }
      );

      await bootstrap({
        repoPath: resolved.repoPath,
        baseBranch: resolved.bubbleConfig.base_branch,
        bubbleBranch: resolved.bubbleConfig.bubble_branch,
        worktreePath: resolved.bubblePaths.worktreePath,
        localOverlay: resolved.bubbleConfig.local_overlay
      });
      workspaceBootstrapped = true;

      const tmux = await launchTmux({
        bubbleId: resolved.bubbleId,
        worktreePath: resolved.bubblePaths.worktreePath,
        statusCommand: buildStatusPaneCommand(resolved.bubbleId, resolved.repoPath, resolved.bubblePaths.worktreePath),
        implementerCommand: buildAgentCommand({
          agentName: resolved.bubbleConfig.agents.implementer,
          bubbleId: resolved.bubbleId,
          startupPrompt: buildImplementerStartupPrompt({
            bubbleId: resolved.bubbleId,
            repoPath: resolved.repoPath,
            worktreePath: resolved.bubblePaths.worktreePath,
            taskArtifactPath: resolved.bubblePaths.taskArtifactPath,
            donePackagePath
          })
        }),
        reviewerCommand: buildAgentCommand({
          agentName: resolved.bubbleConfig.agents.reviewer,
          bubbleId: resolved.bubbleId,
          startupPrompt: buildReviewerStartupPrompt({
            bubbleId: resolved.bubbleId,
            repoPath: resolved.repoPath,
            worktreePath: resolved.bubblePaths.worktreePath,
            taskArtifactPath: resolved.bubblePaths.taskArtifactPath,
            reviewArtifactType: resolved.bubbleConfig.review_artifact_type
          })
        }),
        implementerKickoffMessage: buildImplementerKickoffMessage({
          bubbleId: resolved.bubbleId,
          taskArtifactPath: resolved.bubblePaths.taskArtifactPath
        })
      });
      tmuxSessionName = tmux.sessionName;

      const running = applyStateTransition(preparing, {
        to: "RUNNING",
        round: 1,
        activeAgent: resolved.bubbleConfig.agents.implementer,
        activeRole: "implementer",
        activeSince: nowIso,
        lastCommandAt: nowIso,
        appendRoundRoleEntry: {
          round: 1,
          implementer: resolved.bubbleConfig.agents.implementer,
          reviewer: resolved.bubbleConfig.agents.reviewer,
          switched_at: nowIso
        }
      });

      written = await writeStateSnapshot(resolved.bubblePaths.statePath, running, {
        expectedFingerprint: preparingWritten.fingerprint,
        expectedState: "PREPARING_WORKSPACE"
      });
    } else {
      let transcriptSummary: string;
      try {
        transcriptSummary = await buildResumeSummary({
          transcriptPath: resolved.bubblePaths.transcriptPath
        });
      } catch (error) {
        transcriptSummary = buildResumeTranscriptSummaryFallback(error);
      }

      const shouldInjectReviewerDirective =
        loadedState.state.state === "RUNNING" &&
        loadedState.state.active_role === "reviewer" &&
        loadedState.state.active_agent === resolved.bubbleConfig.agents.reviewer;

      const reviewerTestDirectiveLine = shouldInjectReviewerDirective
        ? await resolveReviewerTestExecutionDirective({
            artifactPath: resolveReviewerTestEvidenceArtifactPath(
              resolved.bubblePaths.artifactsDir
            ),
            worktreePath: resolved.bubblePaths.worktreePath
          })
            .then((directive) => formatReviewerTestExecutionDirective(directive))
            .catch(() => undefined)
        : undefined;

      const resumeKickoffResolution = resolveResumeKickoffMessages({
        bubbleId: resolved.bubbleId,
        taskArtifactPath: resolved.bubblePaths.taskArtifactPath,
        state: loadedState.state,
        implementerAgent: resolved.bubbleConfig.agents.implementer,
        reviewerAgent: resolved.bubbleConfig.agents.reviewer,
        ...(reviewerTestDirectiveLine !== undefined
          ? { reviewerTestDirectiveLine }
          : {})
      });
      const { kickoffDiagnostic, ...resumeKickoffMessages } = resumeKickoffResolution;

      const tmux = await launchTmux({
        bubbleId: resolved.bubbleId,
        worktreePath: resolved.bubblePaths.worktreePath,
        statusCommand: buildStatusPaneCommand(resolved.bubbleId, resolved.repoPath, resolved.bubblePaths.worktreePath),
        implementerCommand: buildAgentCommand({
          agentName: resolved.bubbleConfig.agents.implementer,
          bubbleId: resolved.bubbleId,
          startupPrompt: buildResumeImplementerStartupPrompt({
            bubbleId: resolved.bubbleId,
            repoPath: resolved.repoPath,
            worktreePath: resolved.bubblePaths.worktreePath,
            taskArtifactPath: resolved.bubblePaths.taskArtifactPath,
            donePackagePath,
            state: loadedState.state,
            transcriptSummary,
            ...(kickoffDiagnostic !== undefined ? { kickoffDiagnostic } : {})
          })
        }),
        reviewerCommand: buildAgentCommand({
          agentName: resolved.bubbleConfig.agents.reviewer,
          bubbleId: resolved.bubbleId,
          startupPrompt: buildResumeReviewerStartupPrompt({
            bubbleId: resolved.bubbleId,
            repoPath: resolved.repoPath,
            worktreePath: resolved.bubblePaths.worktreePath,
            taskArtifactPath: resolved.bubblePaths.taskArtifactPath,
            state: loadedState.state,
            transcriptSummary,
            reviewArtifactType: resolved.bubbleConfig.review_artifact_type,
            ...(reviewerTestDirectiveLine !== undefined
              ? { reviewerTestDirectiveLine }
              : {}),
            ...(kickoffDiagnostic !== undefined ? { kickoffDiagnostic } : {})
          })
        }),
        ...resumeKickoffMessages
      });
      tmuxSessionName = tmux.sessionName;

      const resumed = {
        ...loadedState.state,
        last_command_at: nowIso
      };
      written = await writeStateSnapshot(resolved.bubblePaths.statePath, resumed, {
        expectedFingerprint: loadedState.fingerprint,
        expectedState: loadedState.state.state
      });
    }

    const resolvedTmuxSessionName = tmuxSessionName ?? expectedTmuxSessionName;
    await emitBubbleLifecycleEventBestEffort({
      repoPath: resolved.repoPath,
      bubbleId: resolved.bubbleId,
      bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
      eventType: "bubble_started",
      round: written.state.round > 0 ? written.state.round : null,
      actorRole: "orchestrator",
      metadata: {
        start_mode: startMode,
        state: written.state.state,
        tmux_session_name: resolvedTmuxSessionName,
        worktree_path: resolved.bubblePaths.worktreePath
      },
      now
    });

    return {
      bubbleId: resolved.bubbleId,
      state: written.state,
      tmuxSessionName: resolvedTmuxSessionName,
      worktreePath: resolved.bubblePaths.worktreePath
    };
  } catch (error) {
    if (tmuxSessionName !== null) {
      await terminateTmux({
        sessionName: tmuxSessionName
      }).catch(() => undefined);
    }
    if (ownershipClaimed) {
      await removeSession({
        sessionsPath: resolved.bubblePaths.sessionsPath,
        bubbleId: resolved.bubbleId
      }).catch(() => undefined);
    }

    if (startMode === "fresh" && workspaceBootstrapped) {
      await cleanup({
        repoPath: resolved.repoPath,
        bubbleBranch: resolved.bubbleConfig.bubble_branch,
        worktreePath: resolved.bubblePaths.worktreePath
      }).catch(() => undefined);
    }

    if (startMode === "fresh" && preparingState !== null) {
      const failed = applyStateTransition(preparingState, {
        to: "FAILED",
        activeAgent: null,
        activeRole: null,
        activeSince: null,
        lastCommandAt: nowIso
      });
      await writeStateSnapshot(resolved.bubblePaths.statePath, failed, {
        expectedState: "PREPARING_WORKSPACE"
      }).catch(() => undefined);
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new StartBubbleError(`Failed to start bubble ${resolved.bubbleId}: ${message}`);
  }
}

export function asStartBubbleError(error: unknown): never {
  if (error instanceof StartBubbleError) {
    throw error;
  }
  if (error instanceof BubbleLookupError) {
    throw new StartBubbleError(error.message);
  }
  if (error instanceof WorkspaceBootstrapError) {
    throw new StartBubbleError(error.message);
  }
  if (error instanceof TmuxCommandError || error instanceof TmuxSessionExistsError) {
    throw new StartBubbleError(error.message);
  }
  if (
    error instanceof RuntimeSessionsRegistryError ||
    error instanceof RuntimeSessionsRegistryLockError
  ) {
    throw new StartBubbleError(error.message);
  }
  if (error instanceof Error) {
    throw new StartBubbleError(error.message);
  }
  throw error;
}
