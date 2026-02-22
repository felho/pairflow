import { applyStateTransition } from "../state/machine.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";
import { BubbleLookupError, resolveBubbleById } from "./bubbleLookup.js";
import {
  bootstrapWorktreeWorkspace,
  cleanupWorktreeWorkspace,
  WorkspaceBootstrapError
} from "../workspace/worktreeManager.js";
import { launchBubbleTmuxSession, TmuxCommandError, TmuxSessionExistsError } from "../runtime/tmuxManager.js";
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
}

export class StartBubbleError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "StartBubbleError";
  }
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/gu, "'\\''")}'`;
}

function buildStatusPaneCommand(bubbleId: string, repoPath: string): string {
  const statusCommand = `pairflow bubble status --id ${shellQuote(bubbleId)} --repo ${shellQuote(repoPath)} --json`;
  const loopScript = `while true; do clear; ${statusCommand}; sleep 2; done`;
  return `bash -lc ${shellQuote(loopScript)}`;
}

function buildAgentCommand(agentName: "codex" | "claude", bubbleId: string): string {
  const missingBinaryMessage = `${agentName} CLI not found in PATH for bubble ${bubbleId}. Install it or configure agent command mapping.`;
  const script = [
    `if command -v ${agentName} >/dev/null 2>&1; then`,
    `  exec ${agentName}`,
    "fi",
    `printf '%s\\n' ${shellQuote(missingBinaryMessage)}`,
    "exec bash"
  ].join("; ");
  return `bash -lc ${shellQuote(script)}`;
}

export async function startBubble(
  input: StartBubbleInput,
  dependencies: StartBubbleDependencies = {}
): Promise<StartBubbleResult> {
  const bootstrap = dependencies.bootstrapWorktreeWorkspace ?? bootstrapWorktreeWorkspace;
  const cleanup = dependencies.cleanupWorktreeWorkspace ?? cleanupWorktreeWorkspace;
  const launchTmux = dependencies.launchBubbleTmuxSession ?? launchBubbleTmuxSession;

  const resolved = await resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();

  const loadedState = await readStateSnapshot(resolved.bubblePaths.statePath);
  if (loadedState.state.state !== "CREATED") {
    throw new StartBubbleError(
      `bubble start requires state CREATED (current: ${loadedState.state.state}).`
    );
  }

  const preparing = applyStateTransition(loadedState.state, {
    to: "PREPARING_WORKSPACE",
    lastCommandAt: nowIso
  });
  const preparingWritten = await writeStateSnapshot(
    resolved.bubblePaths.statePath,
    preparing,
    {
      expectedFingerprint: loadedState.fingerprint,
      expectedState: "CREATED"
    }
  );

  let workspaceBootstrapped = false;
  try {
    await bootstrap({
      repoPath: resolved.repoPath,
      baseBranch: resolved.bubbleConfig.base_branch,
      bubbleBranch: resolved.bubbleConfig.bubble_branch,
      worktreePath: resolved.bubblePaths.worktreePath
    });
    workspaceBootstrapped = true;

    const tmux = await launchTmux({
      bubbleId: resolved.bubbleId,
      worktreePath: resolved.bubblePaths.worktreePath,
      statusCommand: buildStatusPaneCommand(resolved.bubbleId, resolved.repoPath),
      implementerCommand: buildAgentCommand(
        resolved.bubbleConfig.agents.implementer,
        resolved.bubbleId
      ),
      reviewerCommand: buildAgentCommand(
        resolved.bubbleConfig.agents.reviewer,
        resolved.bubbleId
      )
    });

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

    const written = await writeStateSnapshot(resolved.bubblePaths.statePath, running, {
      expectedFingerprint: preparingWritten.fingerprint,
      expectedState: "PREPARING_WORKSPACE"
    });

    return {
      bubbleId: resolved.bubbleId,
      state: written.state,
      tmuxSessionName: tmux.sessionName,
      worktreePath: resolved.bubblePaths.worktreePath
    };
  } catch (error) {
    if (workspaceBootstrapped) {
      await cleanup({
        repoPath: resolved.repoPath,
        bubbleBranch: resolved.bubbleConfig.bubble_branch,
        worktreePath: resolved.bubblePaths.worktreePath
      }).catch(() => undefined);
    }

    const failed = applyStateTransition(preparing, {
      to: "FAILED",
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt: nowIso
    });
    await writeStateSnapshot(resolved.bubblePaths.statePath, failed, {
      expectedState: "PREPARING_WORKSPACE"
    }).catch(() => undefined);

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
  if (error instanceof Error) {
    throw new StartBubbleError(error.message);
  }
  throw error;
}
