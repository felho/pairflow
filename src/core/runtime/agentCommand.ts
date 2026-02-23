import type { AgentName } from "../../types/bubble.js";
import { shellQuote } from "../util/shellQuote.js";

export interface BuildAgentCommandInput {
  agentName: AgentName;
  bubbleId: string;
  startupPrompt?: string | undefined;
}

function buildAgentLaunchCommand(
  agentName: AgentName,
  startupPrompt: string | undefined
): string {
  const args: string[] = [agentName];

  if (agentName === "codex") {
    args.push("--dangerously-bypass-approvals-and-sandbox");
  } else if (agentName === "claude") {
    args.push("--dangerously-skip-permissions", "--permission-mode", "bypassPermissions");
  }

  if ((startupPrompt?.trim().length ?? 0) > 0) {
    args.push(startupPrompt as string);
  }

  return args.map((arg) => shellQuote(arg)).join(" ");
}

export function buildAgentCommand(input: BuildAgentCommandInput): string {
  const agentName = input.agentName;
  const bubbleId = input.bubbleId;
  const missingBinaryMessage = `${agentName} CLI not found in PATH for bubble ${bubbleId}. Install it or configure agent command mapping.`;
  const launchCommand = buildAgentLaunchCommand(agentName, input.startupPrompt);
  const script = [
    "set +e",
    `if command -v ${agentName} >/dev/null 2>&1; then`,
    `  ${launchCommand}`,
    "  agent_exit_code=$?",
    `  printf '%s\\n' "${agentName} exited (code $agent_exit_code). Dropping to interactive shell."`,
    "  exec bash -i",
    "fi",
    `printf '%s\\n' ${shellQuote(missingBinaryMessage)}`,
    "exec bash -i"
  ].join("\n");
  return `bash -lc ${shellQuote(script)}`;
}
