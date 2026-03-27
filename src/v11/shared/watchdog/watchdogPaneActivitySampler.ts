import { createHash } from "node:crypto";

import {
  readRuntimeSessionsRegistry
} from "../../../core/runtime/sessionsRegistry.js";
import {
  runTmux,
  runtimePaneIndices,
  type TmuxRunner
} from "../../../core/runtime/tmuxManager.js";
import type { AgentRole, BubbleConfig } from "../../../types/bubble.js";
import { createBubbleWatchdogError } from "./watchdogCommandRuntime.js";

export const WATCHDOG_PANE_ACTIVITY_SAMPLE_INTERVAL_MS = 60_000;
export const WATCHDOG_PANE_QUIET_WINDOW_MS = 10 * 60_000;
const watchdogActiveRoleInvalidReasonCode = "WATCHDOG_ACTIVE_ROLE_INVALID";

export type PaneActivitySampleResult =
  | {
      status: "sampled";
      sampled_at: string;
      pane_hash: string;
      changed: boolean;
      session_name: string;
      target_pane: string;
    }
  | {
      status: "no_session";
      sampled_at: string;
      error: string;
    }
  | {
      status: "pane_unreadable";
      sampled_at: string;
      error: string;
      session_name: string;
      target_pane: string;
    };

function resolveWatchdogTargetPaneIndex(
  activeRole: AgentRole
): number {
  switch (activeRole) {
    case "implementer":
      return runtimePaneIndices.implementer;
    case "reviewer":
      return runtimePaneIndices.reviewer;
    case "meta_reviewer":
      return runtimePaneIndices.metaReviewer;
    default:
      return assertUnreachable(activeRole);
  }
}

function assertUnreachable(value: never): never {
  throw createBubbleWatchdogError({
    reasonCode: watchdogActiveRoleInvalidReasonCode,
    message: `Unhandled watchdog agent role: ${String(value)}.`,
    context: {
      subsystem: "watchdog_pane_activity_sampler",
      function_name: "resolveWatchdogTargetPaneIndex",
      active_role: String(value)
    }
  });
}

export async function sampleWatchdogPaneActivity(input: {
  bubbleId: string;
  bubbleConfig: BubbleConfig;
  sessionsPath: string;
  activeRole: AgentRole;
  priorPaneHash?: string;
  now?: Date;
  runner?: TmuxRunner;
  readSessionsRegistry?: typeof readRuntimeSessionsRegistry;
}): Promise<PaneActivitySampleResult> {
  const sampledAt = (input.now ?? new Date()).toISOString();
  const readSessions = input.readSessionsRegistry ?? readRuntimeSessionsRegistry;

  let sessionName: string | undefined;
  try {
    const sessions = await readSessions(input.sessionsPath, {
      allowMissing: true
    });
    sessionName = sessions[input.bubbleId]?.tmuxSessionName;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      status: "no_session",
      sampled_at: sampledAt,
      error: `runtime session lookup failed: ${reason}`
    };
  }

  if (sessionName === undefined) {
    return {
      status: "no_session",
      sampled_at: sampledAt,
      error: `runtime session missing for bubble ${input.bubbleId}`
    };
  }

  const paneIndex = resolveWatchdogTargetPaneIndex(
    input.activeRole
  );
  const targetPane = `${sessionName}:0.${paneIndex}`;
  const runner = input.runner ?? runTmux;
  const capture = await runner(["capture-pane", "-pt", targetPane], {
    allowFailure: true
  });
  if (capture.exitCode !== 0) {
    const stderr = capture.stderr.trim();
    return {
      status: "pane_unreadable",
      sampled_at: sampledAt,
      error:
        stderr.length > 0
          ? stderr
          : `tmux capture-pane exited with code ${capture.exitCode}`,
      session_name: sessionName,
      target_pane: targetPane
    };
  }

  const paneHash = createHash("sha1").update(capture.stdout).digest("hex");
  return {
    status: "sampled",
    sampled_at: sampledAt,
    pane_hash: paneHash,
    changed: input.priorPaneHash === undefined || input.priorPaneHash !== paneHash,
    session_name: sessionName,
    target_pane: targetPane
  };
}
