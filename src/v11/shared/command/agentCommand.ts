import { spawn } from "node:child_process";

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
  model?: string;
  bubbleId: string;
  workspacePath?: string;
  worktreePath?: string;
  pairflowCommandProfile?: PairflowCommandProfile;
  externalPairflowCommand?: string;
  remoteWorkspaceAuthority?: PairflowRemoteWorkspaceAuthority;
  codexMcpDisableArgs?: string[];
  startupPrompt?: string | undefined;
}

export interface ResolveCodexMcpDisableArgsInput {
  roleName: AgentRole;
  bubbleId: string;
  codexCommand?: string;
  timeoutMs?: number;
}

export class CodexMcpDisableArgsError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CodexMcpDisableArgsError";
  }
}

function buildAgentLaunchCommand(
  agentName: AgentName,
  model: string | undefined,
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

  if ((model?.trim().length ?? 0) > 0) {
    args.push("--model", model as string);
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

function toTomlString(value: string): string {
  return JSON.stringify(value);
}

function hasUnsupportedControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const charCode = value.charCodeAt(index);
    if (charCode <= 0x1f || charCode === 0x7f) {
      return true;
    }
  }
  return false;
}

function parseCodexMcpListOutput(input: {
  stdout: string;
}): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input.stdout);
  } catch (error) {
    throw new CodexMcpDisableArgsError(
      `codex mcp list --json returned malformed JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (!Array.isArray(parsed)) {
    throw new CodexMcpDisableArgsError(
      "codex mcp list --json must return a top-level array"
    );
  }

  const disabledServerEntries: string[] = [];
  for (const [index, entry] of parsed.entries()) {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      throw new CodexMcpDisableArgsError(
        `codex MCP entry ${index} must be an object`
      );
    }
    const mcpEntry = entry as Record<string, unknown>;
    if (typeof mcpEntry.enabled !== "boolean") {
      throw new CodexMcpDisableArgsError(
        `codex MCP entry ${index} has unsupported enabled value`
      );
    }
    if (mcpEntry.enabled !== true) {
      continue;
    }
    if (typeof mcpEntry.name !== "string" || mcpEntry.name.length === 0) {
      throw new CodexMcpDisableArgsError(
        `enabled codex MCP entry ${index} must have a non-empty string name`
      );
    }
    if (hasUnsupportedControlCharacter(mcpEntry.name)) {
      throw new CodexMcpDisableArgsError(
        `enabled codex MCP entry ${index} name contains unsupported control characters`
      );
    }
    disabledServerEntries.push(
      `${toTomlString(mcpEntry.name)}={command="node",args=["-e","process.exit(0)"],enabled=false}`
    );
  }

  if (disabledServerEntries.length === 0) {
    return [];
  }

  return ["-c", `mcp_servers={${disabledServerEntries.join(",")}}`];
}

export async function resolveCodexMcpDisableArgs(
  input: ResolveCodexMcpDisableArgsInput
): Promise<string[]> {
  const codexCommand = input.codexCommand ?? "codex";
  const timeoutMs = input.timeoutMs ?? 5000;

  return await new Promise<string[]>((resolvePromise, rejectPromise) => {
    const child = spawn(codexCommand, ["mcp", "list", "--json"], {
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    let settled = false;

    const fail = (message: string) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      if (!child.killed) {
        child.kill("SIGTERM");
      }
      rejectPromise(new CodexMcpDisableArgsError(message));
    };

    const timer = setTimeout(() => {
      fail(`codex mcp list --json timed out after ${timeoutMs}ms`);
    }, timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
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
        rejectPromise(new CodexMcpDisableArgsError(
          `codex mcp list --json failed for role ${input.roleName} in bubble ${input.bubbleId}: code=${code ?? "null"} signal=${signal ?? "null"} ${stderr.trim()}`
        ));
        return;
      }
      try {
        resolvePromise(parseCodexMcpListOutput({ stdout }));
      } catch (error) {
        rejectPromise(error instanceof Error ? error : new Error(String(error)));
      }
    });
  });
}

function buildCodexMcpDisablePreparation(input: {
  args: string[];
}): string[] {
  const quotedArgs = input.args.map((arg) => shellQuote(arg)).join(" ");
  return [
    `PAIRFLOW_ROLE_MCP_DISABLE_ARGS=(${quotedArgs})`
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
      ? buildCodexMcpDisablePreparation({
        args: input.codexMcpDisableArgs ?? (() => {
          throw new Error(
            `Codex MCP disable args must be resolved before building a disabled Codex agent command for role ${roleName} in bubble ${bubbleId}.`
          );
        })()
      })
      : [];
  const launchCommand = buildAgentLaunchCommand(
    agentName,
    input.model,
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
