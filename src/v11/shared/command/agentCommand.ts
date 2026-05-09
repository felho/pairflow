import type { AgentName } from "../../../contracts/kernel/agentIdentity.js";
import type {
  PairflowCommandProfile
} from "../config/bubbleConfigVocabulary.js";
import { shellQuote } from "../foundation/shellQuote.js";
import {
  buildPairflowCommandBootstrap,
  type PairflowRemoteWorkspaceAuthority
} from "./pairflowCommandBootstrap.js";

export interface BuildAgentCommandInput {
  agentName: AgentName;
  model?: string;
  bubbleId: string;
  workspacePath?: string;
  worktreePath?: string;
  pairflowCommandProfile?: PairflowCommandProfile;
  externalPairflowCommand?: string;
  remoteWorkspaceAuthority?: PairflowRemoteWorkspaceAuthority;
  startupPrompt?: string | undefined;
}

function buildAgentLaunchCommand(
  agentName: AgentName,
  model: string | undefined,
  startupPrompt: string | undefined
): string {
  const args: string[] = [agentName];

  if (agentName === "codex") {
    args.push("--dangerously-bypass-approvals-and-sandbox");
  } else if (agentName === "claude") {
    args.push("--dangerously-skip-permissions", "--permission-mode", "bypassPermissions");
  }

  if ((model?.trim().length ?? 0) > 0) {
    args.push("--model", model as string);
  }

  if ((startupPrompt?.trim().length ?? 0) > 0) {
    args.push(startupPrompt as string);
  }

  return args.map((arg) => shellQuote(arg)).join(" ");
}

export function buildAgentCommand(input: BuildAgentCommandInput): string {
  const agentName = input.agentName;
  const bubbleId = input.bubbleId;
  const workspacePath = (input.workspacePath ?? input.worktreePath ?? "").trim();
  if (workspacePath.length === 0) {
    throw new Error(`Workspace path is required to build agent command for bubble ${bubbleId}.`);
  }
  const missingBinaryMessage = `${agentName} CLI not found in PATH for bubble ${bubbleId}. Install it or configure agent command mapping.`;
  const worktreePinningMessage = `Failed to pin agent root to workspace ${workspacePath} for bubble ${bubbleId}.`;
  const launchCommand = buildAgentLaunchCommand(
    agentName,
    input.model,
    input.startupPrompt
  );
  const pairflowBootstrap = buildPairflowCommandBootstrap(
    workspacePath,
    input.pairflowCommandProfile ?? "external",
    input.externalPairflowCommand,
    input.remoteWorkspaceAuthority
  );
  const agentExitedMessage =
    `${agentName} exited (code $agent_exit_code). Dropping to interactive shell.`;
  const script = [
    "set +e",
    `if ! cd ${shellQuote(workspacePath)}; then`,
    `  printf '%s\\n' ${shellQuote(worktreePinningMessage)}`,
    "  exec bash -i",
    "fi",
    ...pairflowBootstrap,
    `if command -v ${agentName} >/dev/null 2>&1; then`,
    `  ${launchCommand}`,
    "  agent_exit_code=$?",
    `  printf '%s\\n' ${shellQuote(agentExitedMessage)}`,
    "  exec bash -i",
    "fi",
    `printf '%s\\n' ${shellQuote(missingBinaryMessage)}`,
    "exec bash -i"
  ].join("\n");
  return `bash -lc ${shellQuote(script)}`;
}
