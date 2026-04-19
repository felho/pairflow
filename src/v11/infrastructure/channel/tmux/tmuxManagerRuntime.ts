import { buildBubbleTmuxSessionName } from "../../../shared/bubble/tmuxSessionName.js";
import type {
  TerminateBubbleTmuxSessionInput,
  TerminateBubbleTmuxSessionPort,
  TerminateBubbleTmuxSessionResult,
  TmuxRunner
} from "../../../shared/ports/tmuxSessions.js";
import { runTmux, TmuxCommandError } from "./tmuxRunner.js";

export interface RespawnTmuxPaneCommandInput {
  sessionName: string;
  paneIndex: number;
  cwd: string;
  command: string;
  runner?: TmuxRunner;
}

function isTmuxMissingSessionError(output: string): boolean {
  const normalized = output.toLowerCase();
  return (
    normalized.includes("can't find session") ||
    normalized.includes("no server running") ||
    normalized.includes("no current target")
  );
}

export const terminateBubbleTmuxSession: TerminateBubbleTmuxSessionPort = async (
  input: TerminateBubbleTmuxSessionInput
): Promise<TerminateBubbleTmuxSessionResult> => {
  const runner = input.runner ?? runTmux;
  const sessionName =
    input.sessionName ?? (input.bubbleId !== undefined
      ? buildBubbleTmuxSessionName(input.bubbleId)
      : undefined);

  if (sessionName === undefined) {
    throw new Error(
      "TMUX_TERMINATE_SESSION_INPUT_REQUIRED: context operation_id=terminate_bubble_tmux_session requires sessionName or bubbleId."
    );
  }

  const result = await runner(["kill-session", "-t", sessionName], {
    allowFailure: true
  });

  if (result.exitCode === 0) {
    return {
      sessionName,
      existed: true
    };
  }

  const combinedOutput = `${result.stderr}\n${result.stdout}`;
  if (isTmuxMissingSessionError(combinedOutput)) {
    return {
      sessionName,
      existed: false
    };
  }

  throw new TmuxCommandError(
    ["kill-session", "-t", sessionName],
    result.exitCode,
    result.stderr
  );
};

export async function respawnTmuxPaneCommand(
  input: RespawnTmuxPaneCommandInput
): Promise<void> {
  const runner = input.runner ?? runTmux;
  const targetPane = `${input.sessionName}:0.${input.paneIndex}`;
  await runner([
    "respawn-pane",
    "-k",
    "-t",
    targetPane,
    "-c",
    input.cwd,
    input.command
  ]);
}
