import { applyStateTransition } from "../state/machine.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";
import { BubbleLookupError, resolveBubbleById } from "./bubbleLookup.js";
import { shellQuote } from "../util/shellQuote.js";
import { buildAgentCommand } from "../runtime/agentCommand.js";
import { join } from "node:path";
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
import type { BubbleStateSnapshot } from "../../types/bubble.js";

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

function buildStatusPaneCommand(bubbleId: string, repoPath: string): string {
  const watchdogCommand = `pairflow bubble watchdog --id ${shellQuote(bubbleId)} --repo ${shellQuote(repoPath)} >/dev/null 2>&1 || true`;
  const statusCommand = `pairflow bubble status --id ${shellQuote(bubbleId)} --repo ${shellQuote(repoPath)}`;
  const loopScript = `while true; do clear; ${watchdogCommand}; ${statusCommand}; sleep 2; done`;
  return `bash -lc ${shellQuote(loopScript)}`;
}

function buildImplementerStartupPrompt(input: {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  taskArtifactPath: string;
  donePackagePath: string;
}): string {
  return [
    `Pairflow implementer start for bubble ${input.bubbleId}.`,
    `Read task: ${input.taskArtifactPath}.`,
    "Implement in this worktree and run relevant tests/typecheck before handoff.",
    `Keep done package updated at: ${input.donePackagePath}.`,
    "Done package should summarize changes + validation results for final commit handoff.",
    `Repository: ${input.repoPath}. Worktree: ${input.worktreePath}.`,
    "When done, run `pairflow pass --summary \"<what changed + validation>\"`.",
    "Use `pairflow ask-human --question \"...\"` only for blockers."
  ].join(" ");
}

function buildReviewerStartupPrompt(input: {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  taskArtifactPath: string;
}): string {
  return [
    `Pairflow reviewer start for bubble ${input.bubbleId}.`,
    "Stand by first. Do not start reviewing until implementer handoff (`PASS`) arrives.",
    "When PASS arrives, run a fresh review.",
    "IMPORTANT: If a `feature-dev:code-reviewer` agent is available (check with /help or Task tool), use it for the review — it provides higher-quality, structured code review than manual inspection.",
    "If the agent is not available, fall back to manual review (`/review` in Claude Code).",
    "If findings remain, run `pairflow pass --summary ... --finding P1:...` (repeatable).",
    "If clean, run `pairflow pass --summary ... --no-findings` then `pairflow converged --summary`.",
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
    "When done with tests/typecheck, hand off with `pairflow pass --summary \"<what changed + validation>\"`."
  ].join(" ");
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

  const resolved = await resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();

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
        statusCommand: buildStatusPaneCommand(resolved.bubbleId, resolved.repoPath),
        implementerCommand: buildAgentCommand({
          agentName: resolved.bubbleConfig.agents.implementer,
          bubbleId: resolved.bubbleId,
          startupPrompt: buildImplementerStartupPrompt({
            bubbleId: resolved.bubbleId,
            repoPath: resolved.repoPath,
            worktreePath: resolved.bubblePaths.worktreePath,
            taskArtifactPath: resolved.bubblePaths.taskArtifactPath,
            donePackagePath: join(resolved.bubblePaths.artifactsDir, "done-package.md")
          })
        }),
        reviewerCommand: buildAgentCommand({
          agentName: resolved.bubbleConfig.agents.reviewer,
          bubbleId: resolved.bubbleId,
          startupPrompt: buildReviewerStartupPrompt({
            bubbleId: resolved.bubbleId,
            repoPath: resolved.repoPath,
            worktreePath: resolved.bubblePaths.worktreePath,
            taskArtifactPath: resolved.bubblePaths.taskArtifactPath
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
      const tmux = await launchTmux({
        bubbleId: resolved.bubbleId,
        worktreePath: resolved.bubblePaths.worktreePath,
        statusCommand: buildStatusPaneCommand(resolved.bubbleId, resolved.repoPath),
        implementerCommand: buildAgentCommand({
          agentName: resolved.bubbleConfig.agents.implementer,
          bubbleId: resolved.bubbleId
        }),
        reviewerCommand: buildAgentCommand({
          agentName: resolved.bubbleConfig.agents.reviewer,
          bubbleId: resolved.bubbleId
        })
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

    return {
      bubbleId: resolved.bubbleId,
      state: written.state,
      tmuxSessionName: tmuxSessionName ?? expectedTmuxSessionName,
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
