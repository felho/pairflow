import type { AgentName } from "../../types/bubble.js";
import { shellQuote } from "../util/shellQuote.js";

export function buildAgentCommand(agentName: AgentName, bubbleId: string): string {
  const missingBinaryMessage = `${agentName} CLI not found in PATH for bubble ${bubbleId}. Install it or configure agent command mapping.`;
  const script = [
    "set +e",
    `if command -v ${agentName} >/dev/null 2>&1; then`,
    `  ${agentName}`,
    "  agent_exit_code=$?",
    `  printf '%s\\n' "${agentName} exited (code $agent_exit_code). Dropping to interactive shell."`,
    "  exec bash -i",
    "fi",
    `printf '%s\\n' ${shellQuote(missingBinaryMessage)}`,
    "exec bash -i"
  ].join("\n");
  return `bash -lc ${shellQuote(script)}`;
}
