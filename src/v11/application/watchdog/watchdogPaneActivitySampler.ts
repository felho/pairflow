import { createHash } from "node:crypto";
import type { AgentRole } from "../../../contracts/kernel/agentIdentity.js";
import type { BubbleConfig } from "../../shared/config/bubbleConfigTypes.js";
import type {
  ReadRuntimeSessionsRegistryPort
} from "../../ports/runtimeSessions.js";
import type { TmuxRunner } from "../../ports/tmuxSessions.js";
import type { PaneActivitySampleResult } from "./watchdogCommandContract.js";
import {
  resolveWatchdogTargetPaneIndex
} from "../../shared/watchdog/watchdogPaneTargeting.js";

export const WATCHDOG_PANE_ACTIVITY_SAMPLE_INTERVAL_MS = 60_000;
export const WATCHDOG_PANE_QUIET_WINDOW_MS = 10 * 60_000;
export const WATCHDOG_PANE_ACTIVITY_CAPTURE_START_LINE = "-20";

export async function sampleWatchdogPaneActivity(input: {
  bubbleId: string;
  bubbleConfig: BubbleConfig;
  sessionsPath: string;
  activeRole: AgentRole;
  readSessionsRegistry: ReadRuntimeSessionsRegistryPort;
  runner: TmuxRunner;
  priorPaneHash?: string;
  now?: Date;
}): Promise<PaneActivitySampleResult> {
  const sampledAt = (input.now ?? new Date()).toISOString();

  let sessionName: string | undefined;
  try {
    const sessions = await input.readSessionsRegistry(input.sessionsPath, {
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
  const capture = await input.runner(
    [
      "capture-pane",
      "-pt",
      targetPane,
      "-S",
      WATCHDOG_PANE_ACTIVITY_CAPTURE_START_LINE
    ],
    {
      allowFailure: true
    }
  );
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
