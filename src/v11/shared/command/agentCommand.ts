import type { AgentName } from "../../../contracts/kernel/agentIdentity.js";
import type { AgentRole } from "../../../contracts/kernel/agentIdentity.js";
import type {
  PairflowCommandProfile,
  RoleMcpPolicy
} from "../config/bubbleConfigVocabulary.js";
import { shellQuote } from "../foundation/shellQuote.js";
import {
  buildPairflowCommandBootstrap,
  type PairflowRemoteWorkspaceAuthority
} from "./pairflowCommandBootstrap.js";

export interface BuildAgentCommandInput {
  agentName: AgentName;
  roleName?: AgentRole;
  roleMcpPolicy?: RoleMcpPolicy;
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
  startupPrompt: string | undefined,
  roleMcpPolicy: RoleMcpPolicy
): string {
  const args: string[] = [agentName];

  if (agentName === "codex") {
    if (roleMcpPolicy === "disabled") {
      args.push("\"${PAIRFLOW_ROLE_MCP_DISABLE_ARGS[@]}\"");
    }
    args.push("--dangerously-bypass-approvals-and-sandbox");
  } else if (agentName === "claude") {
    args.push("--dangerously-skip-permissions", "--permission-mode", "bypassPermissions");
    if (roleMcpPolicy === "disabled") {
      args.push("--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}');
    }
  }

  if ((startupPrompt?.trim().length ?? 0) > 0) {
    if (agentName === "claude" && roleMcpPolicy === "disabled") {
      args.push("--");
    }
    args.push(startupPrompt as string);
  }

  return args
    .map((arg) =>
      arg === "\"${PAIRFLOW_ROLE_MCP_DISABLE_ARGS[@]}\"" ? arg : shellQuote(arg)
    )
    .join(" ");
}

function buildCodexMcpDisablePreparation(input: {
  roleName: AgentRole;
  bubbleId: string;
}): string[] {
  const diagnostic =
    "PAIRFLOW_ROLE_MCP_DISABLE_UNAVAILABLE: failed to build Codex MCP disable arguments";
  const nodeScript = String.raw`
const { spawn } = require("node:child_process");

const roleName = process.env.PAIRFLOW_ROLE_MCP_ROLE_NAME ?? "unknown";
const bubbleId = process.env.PAIRFLOW_ROLE_MCP_BUBBLE_ID ?? "unknown";
const child = spawn("codex", ["mcp", "list", "--json"], {
  stdio: ["ignore", "pipe", "pipe"]
});
let stdout = "";
let stderr = "";
let settled = false;

const fail = (message) => {
  if (settled) {
    return;
  }
  settled = true;
  clearTimeout(timer);
  if (!child.killed) {
    child.kill("SIGTERM");
  }
  console.error(message);
  process.exit(1);
};

const timer = setTimeout(() => {
  fail("codex mcp list --json timed out after 5000ms");
}, 5000);

child.stdout.setEncoding("utf8");
child.stderr.setEncoding("utf8");
child.stdout.on("data", (chunk) => {
  stdout += chunk;
});
child.stderr.on("data", (chunk) => {
  stderr += chunk;
});
child.on("error", (error) => {
  fail(error.message);
});
child.on("close", (code, signal) => {
  if (settled) {
    return;
  }
  settled = true;
  clearTimeout(timer);
  if (code !== 0 || signal !== null) {
    console.error("codex mcp list --json failed for role " + roleName + " in bubble " + bubbleId + ": code=" + (code ?? "null") + " signal=" + (signal ?? "null") + " " + stderr.trim());
    process.exit(1);
  }
  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch (error) {
    console.error("codex mcp list --json returned malformed JSON: " + error.message);
    process.exit(1);
  }
  if (!Array.isArray(parsed)) {
    console.error("codex mcp list --json must return a top-level array");
    process.exit(1);
  }
  const tomlString = (value) => JSON.stringify(value);
  const disabledServerEntries = [];
  const args = [];
  for (const [index, entry] of parsed.entries()) {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      console.error("codex MCP entry " + index + " must be an object");
      process.exit(1);
    }
    if (typeof entry.enabled !== "boolean") {
      console.error("codex MCP entry " + index + " has unsupported enabled value");
      process.exit(1);
    }
    if (entry.enabled !== true) {
      continue;
    }
    if (typeof entry.name !== "string" || entry.name.length === 0) {
      console.error("enabled codex MCP entry " + index + " must have a non-empty string name");
      process.exit(1);
    }
    if (/[\u0000-\u001f\u007f]/u.test(entry.name)) {
      console.error("enabled codex MCP entry " + index + " name contains unsupported control characters");
      process.exit(1);
    }
    disabledServerEntries.push(tomlString(entry.name) + "={command=\"node\",args=[\"-e\",\"process.exit(0)\"],enabled=false}");
  }
  if (disabledServerEntries.length > 0) {
    args.push("-c", "mcp_servers={" + disabledServerEntries.join(",") + "}");
  }
  process.stdout.write(args.join("\n"));
});
`;
  return [
    "PAIRFLOW_ROLE_MCP_DISABLE_ARGS=()",
    `export PAIRFLOW_ROLE_MCP_ROLE_NAME=${shellQuote(input.roleName)}`,
    `export PAIRFLOW_ROLE_MCP_BUBBLE_ID=${shellQuote(input.bubbleId)}`,
    "if ! command -v node >/dev/null 2>&1; then",
    `  printf '%s\\n' ${shellQuote(`${diagnostic}: node CLI not found in PATH for role ${input.roleName}.`)}`,
    "  exec bash -i",
    "fi",
    `PAIRFLOW_ROLE_MCP_DISABLE_OUTPUT=$(node -e ${shellQuote(nodeScript.trim())})`,
    "PAIRFLOW_ROLE_MCP_DISABLE_STATUS=$?",
    "if [ \"$PAIRFLOW_ROLE_MCP_DISABLE_STATUS\" -ne 0 ]; then",
    `  printf '%s\\n' ${shellQuote(`${diagnostic} for role ${input.roleName} agent codex in bubble ${input.bubbleId}.`)}`,
    "  exec bash -i",
    "fi",
    "if [ -n \"$PAIRFLOW_ROLE_MCP_DISABLE_OUTPUT\" ]; then",
    "  while IFS= read -r PAIRFLOW_ROLE_MCP_DISABLE_ARG; do",
    "    PAIRFLOW_ROLE_MCP_DISABLE_ARGS+=(\"$PAIRFLOW_ROLE_MCP_DISABLE_ARG\")",
    "  done <<< \"$PAIRFLOW_ROLE_MCP_DISABLE_OUTPUT\"",
    "fi"
  ];
}

export function buildAgentCommand(input: BuildAgentCommandInput): string {
  const agentName = input.agentName;
  const roleName = input.roleName ?? "implementer";
  const roleMcpPolicy = input.roleMcpPolicy ?? "disabled";
  const bubbleId = input.bubbleId;
  const workspacePath = (input.workspacePath ?? input.worktreePath ?? "").trim();
  if (workspacePath.length === 0) {
    throw new Error(`Workspace path is required to build agent command for bubble ${bubbleId}.`);
  }
  const missingBinaryMessage = `${agentName} CLI not found in PATH for bubble ${bubbleId}. Install it or configure agent command mapping.`;
  const worktreePinningMessage = `Failed to pin agent root to workspace ${workspacePath} for bubble ${bubbleId}.`;
  const mcpPreparation =
    agentName === "codex" && roleMcpPolicy === "disabled"
      ? buildCodexMcpDisablePreparation({ roleName, bubbleId })
      : [];
  const launchCommand = buildAgentLaunchCommand(
    agentName,
    input.startupPrompt,
    roleMcpPolicy
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
    ...mcpPreparation,
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
