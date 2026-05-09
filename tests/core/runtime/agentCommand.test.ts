import { spawn } from "node:child_process";
import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildAgentCommand,
  resolveCodexMcpDisableArgs
} from "../../../src/v11/shared/command/agentCommand.js";
import { shellQuote } from "../../../src/v11/shared/foundation/shellQuote.js";

async function assertBashParses(command: string): Promise<void> {
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn("bash", ["-n", "-c", command], {
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      rejectPromise(error);
    });
    child.on("close", (code) => {
      if ((code ?? 1) !== 0) {
        rejectPromise(new Error(`bash could not parse command: ${stderr.trim()}`));
        return;
      }
      resolvePromise();
    });
  });
}

function extractBashLcScript(command: string): string {
  const prefix = "bash -lc ";
  expect(command.startsWith(prefix)).toBe(true);
  const quotedScript = command.slice(prefix.length);
  expect(quotedScript.startsWith("'")).toBe(true);
  expect(quotedScript.endsWith("'")).toBe(true);
  return quotedScript.slice(1, -1).replace(/'\\''/gu, "'");
}

async function resolveArgsWithFakeCodex(input: {
  codexJson?: unknown;
  codexStdout?: string;
  codexStderr?: string;
  codexExitCode?: number;
}): Promise<string[]> {
  const tempDir = await mkdtemp(path.join(tmpdir(), "pairflow-agent-command-"));
  const fakeCodexPath = path.join(tempDir, "codex");
  const codexStdout =
    input.codexStdout ?? JSON.stringify(input.codexJson ?? []);
  const codexStderr = input.codexStderr ?? "";
  const codexExitCode = input.codexExitCode ?? 0;
  await writeFile(
    fakeCodexPath,
    [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      "if [ \"$1 $2\" != \"mcp list\" ]; then",
      "  printf '%s\\n' \"unexpected codex invocation: $*\" >&2",
      "  exit 64",
      "fi",
      ...(codexStderr.length > 0
        ? [`printf '%s\\n' ${shellQuote(codexStderr)} >&2`]
        : []),
      `printf '%s\\n' ${shellQuote(codexStdout)}`,
      `exit ${codexExitCode}`
    ].join("\n")
  );
  await chmod(fakeCodexPath, 0o755);

  return await resolveCodexMcpDisableArgs({
    roleName: "reviewer",
    bubbleId: "b_agent_cmd_fake_codex",
    codexCommand: fakeCodexPath
  });
}

describe("buildAgentCommand", () => {
  it("builds external profile bootstrap for codex by default", async () => {
    const worktreePath = "/tmp/pairflow worktree/it's-here";
    const command = buildAgentCommand({
      agentName: "codex",
      bubbleId: "b_agent_cmd_codex_01",
      worktreePath,
      codexMcpDisableArgs: [
        "-c",
        'mcp_servers={"codescene"={command="node",args=["-e","process.exit(0)"],enabled=false}}'
      ],
      startupPrompt: "Prompt with `ticks` and $HOME literal."
    });
    const script = extractBashLcScript(command);

    expect(script).toContain(`if ! cd ${shellQuote(worktreePath)}; then`);
    expect(script).toContain("PAIRFLOW_EXTERNAL_COMMAND");
    expect(script).toContain("PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE");
    expect(script).toContain('PAIRFLOW_WRAPPER_DIR');
    expect(script).toContain('cat > "$PAIRFLOW_WRAPPER_DIR/pairflow"');
    expect(script).toContain('exec "$PAIRFLOW_EXTERNAL_COMMAND" "$@"');
    expect(script).not.toContain('exec node "$PAIRFLOW_LOCAL_ENTRYPOINT" "$@"');
    expect(command).toContain("--dangerously-bypass-approvals-and-sandbox");
    expect(command).not.toContain("codex mcp list");
    expect(command).not.toContain("setTimeout");
    expect(command).not.toContain("command -v node");
    expect(command).toContain("mcp_servers={");
    expect(command).not.toContain("JSON.stringify");
    expect(command).not.toContain("unsupported control characters");
    expect(command).not.toContain("export PAIRFLOW_ROLE_MCP_ROLE_NAME");
    expect(command).not.toContain("export PAIRFLOW_ROLE_MCP_BUBBLE_ID");
    expect(command).not.toContain("PAIRFLOW_ROLE_MCP_DISABLE_UNAVAILABLE");
    expect(command).toContain("Prompt with `ticks` and $HOME literal.");
    await assertBashParses(command);
  });

  it("omits Codex MCP discovery and disable overrides when the role opts in", async () => {
    const command = buildAgentCommand({
      agentName: "codex",
      roleName: "reviewer",
      roleMcpPolicy: "enabled",
      bubbleId: "b_agent_cmd_codex_enabled_01",
      worktreePath: "/tmp/pairflow-worktree/codex-enabled"
    });

    expect(command).toContain("--dangerously-bypass-approvals-and-sandbox");
    expect(command).not.toContain("codex mcp list");
    expect(command).not.toContain("PAIRFLOW_ROLE_MCP_DISABLE_ARGS");
    await assertBashParses(command);
  });

  it("builds Codex MCP disable overrides for quoted TOML server names", async () => {
    const codexMcpDisableArgs = await resolveArgsWithFakeCodex({
      codexJson: [
        { name: "foo.bar", enabled: true },
        { name: "quote\"back\\slash", enabled: true },
        { name: "already_disabled", enabled: false }
      ]
    });
    const command = buildAgentCommand({
      agentName: "codex",
      roleName: "reviewer",
      roleMcpPolicy: "disabled",
      bubbleId: "b_agent_cmd_quoted_mcp_names_01",
      worktreePath: "/tmp/pairflow-worktree/quoted-mcp",
      codexMcpDisableArgs
    });
    const script = extractBashLcScript(command);

    expect(codexMcpDisableArgs).toEqual([
      "-c",
      'mcp_servers={"foo.bar"={command="node",args=["-e","process.exit(0)"],enabled=false},"quote\\"back\\\\slash"={command="node",args=["-e","process.exit(0)"],enabled=false}}'
    ]);
    expect(script).toContain("PAIRFLOW_ROLE_MCP_DISABLE_ARGS=(");
    expect(script).toContain("foo.bar");
    expect(script).toContain('quote\\"back\\\\slash');
    expect(script).not.toContain("already_disabled");
    await assertBashParses(command);
  });

  it("fails closed when Codex MCP discovery exits non-zero", async () => {
    await expect(resolveArgsWithFakeCodex({
      codexStdout: "",
      codexStderr: "boom",
      codexExitCode: 7
    })).rejects.toThrow(
      "codex mcp list --json failed for role reviewer in bubble b_agent_cmd_fake_codex"
    );
    await expect(resolveArgsWithFakeCodex({
      codexStdout: "",
      codexStderr: "boom",
      codexExitCode: 7
    })).rejects.toThrow("code=7");
    await expect(resolveArgsWithFakeCodex({
      codexStdout: "",
      codexStderr: "boom",
      codexExitCode: 7
    })).rejects.toThrow("boom");
  });

  it("fails closed when Codex MCP discovery returns malformed JSON", async () => {
    await expect(resolveArgsWithFakeCodex({
      codexStdout: "{not-json"
    })).rejects.toThrow("codex mcp list --json returned malformed JSON");
  });

  it("fails closed when Codex MCP discovery returns invalid schema", async () => {
    await expect(resolveArgsWithFakeCodex({
      codexJson: { name: "not-array" }
    })).rejects.toThrow("codex mcp list --json must return a top-level array");
    await expect(resolveArgsWithFakeCodex({
      codexJson: [{ name: "missing-enabled" }]
    })).rejects.toThrow("codex MCP entry 0 has unsupported enabled value");
    await expect(resolveArgsWithFakeCodex({
      codexJson: [{ name: "", enabled: true }]
    })).rejects.toThrow(
      "enabled codex MCP entry 0 must have a non-empty string name"
    );
  });

  it("fails closed when an enabled Codex MCP server name contains control characters", async () => {
    await expect(resolveArgsWithFakeCodex({
      codexJson: [{ name: "bad\nname", enabled: true }]
    })).rejects.toThrow(
      "enabled codex MCP entry 0 name contains unsupported control characters"
    );
  });

  it("passes strict empty MCP config for Claude disabled roles", async () => {
    const command = buildAgentCommand({
      agentName: "claude",
      roleName: "reviewer",
      roleMcpPolicy: "disabled",
      bubbleId: "b_agent_cmd_claude_disabled_01",
      worktreePath: "/tmp/pairflow-worktree/claude-disabled",
      startupPrompt: "review this handoff"
    });
    const script = extractBashLcScript(command);

    expect(command).toContain("--dangerously-skip-permissions");
    expect(command).toContain("--permission-mode");
    expect(command).toContain("bypassPermissions");
    expect(command).toContain("--strict-mcp-config");
    expect(command).toContain("--mcp-config");
    expect(command).toContain('{"mcpServers":{}}');
    expect(script).toContain(
      "'--mcp-config' '{\"mcpServers\":{}}' '--' 'review this handoff'"
    );
    await assertBashParses(command);
  });

  it("preserves Claude baseline launch when the role opts in to MCP", async () => {
    const command = buildAgentCommand({
      agentName: "claude",
      roleName: "meta_reviewer",
      roleMcpPolicy: "enabled",
      bubbleId: "b_agent_cmd_claude_enabled_01",
      worktreePath: "/tmp/pairflow-worktree/claude-enabled"
    });

    expect(command).toContain("--dangerously-skip-permissions");
    expect(command).not.toContain("--strict-mcp-config");
    expect(command).not.toContain("--mcp-config");
    await assertBashParses(command);
  });

  it("embeds precomputed Codex MCP disable args without discovery script", async () => {
    const command = buildAgentCommand({
      agentName: "codex",
      roleName: "implementer",
      roleMcpPolicy: "disabled",
      bubbleId: "b_agent_cmd_bash3_compat_01",
      worktreePath: "/tmp/pairflow-worktree/bash3",
      codexMcpDisableArgs: ["-c", "mcp_servers={}"]
    });
    const script = extractBashLcScript(command);

    expect(command).not.toContain("mapfile");
    expect(command).not.toContain("while IFS= read -r PAIRFLOW_ROLE_MCP_DISABLE_ARG");
    expect(command).not.toContain("PAIRFLOW_ROLE_MCP_DISABLE_OUTPUT=");
    expect(script).toContain("PAIRFLOW_ROLE_MCP_DISABLE_ARGS=('-c' 'mcp_servers={}')");
    await assertBashParses(command);
  });

  it("uses role policy instead of agent policy for same-agent roles", async () => {
    const disabledReviewer = buildAgentCommand({
      agentName: "codex",
      roleName: "reviewer",
      roleMcpPolicy: "disabled",
      bubbleId: "b_agent_cmd_same_agent_reviewer_01",
      worktreePath: "/tmp/pairflow-worktree/same-agent-reviewer",
      codexMcpDisableArgs: ["-c", "mcp_servers={}"]
    });
    const enabledMetaReviewer = buildAgentCommand({
      agentName: "codex",
      roleName: "meta_reviewer",
      roleMcpPolicy: "enabled",
      bubbleId: "b_agent_cmd_same_agent_meta_01",
      worktreePath: "/tmp/pairflow-worktree/same-agent-meta"
    });

    expect(disabledReviewer).toContain("PAIRFLOW_ROLE_MCP_DISABLE_ARGS");
    expect(enabledMetaReviewer).not.toContain("PAIRFLOW_ROLE_MCP_DISABLE_ARGS");
    await assertBashParses(disabledReviewer);
    await assertBashParses(enabledMetaReviewer);
  });

  it("prefers workspacePath as the canonical agent root when provided", async () => {
    const workspacePath = "/tmp/pairflow-workspace/canonical";
    const command = buildAgentCommand({
      agentName: "codex",
      bubbleId: "b_agent_cmd_workspace_01",
      workspacePath,
      worktreePath: "/tmp/pairflow-workspace/legacy",
      codexMcpDisableArgs: [],
      startupPrompt: "Prompt"
    });
    const script = extractBashLcScript(command);

    expect(script).toContain(`if ! cd ${shellQuote(workspacePath)}; then`);
    expect(script).toContain(`export PAIRFLOW_WORKTREE_ROOT=${shellQuote(workspacePath)}`);
    expect(script).not.toContain("/tmp/pairflow-workspace/legacy");
    await assertBashParses(command);
  });

  it("pins the external pairflow authority when explicitly provided", async () => {
    const workspacePath = "/tmp/pairflow-remote-workspace/canonical";
    const command = buildAgentCommand({
      agentName: "codex",
      bubbleId: "b_agent_cmd_remote_external_01",
      workspacePath,
      externalPairflowCommand: "/home/dev/.local/share/pnpm/pairflow",
      codexMcpDisableArgs: [],
      startupPrompt: "Prompt"
    });
    const script = extractBashLcScript(command);

    expect(script).toContain(
      "export PAIRFLOW_EXTERNAL_COMMAND='/home/dev/.local/share/pnpm/pairflow'"
    );
    await assertBashParses(command);
  });

  it("exports remote workspace authority for remote external panes", async () => {
    const workspacePath = "/remote/repos/pairflow--bubble-01";
    const command = buildAgentCommand({
      agentName: "codex",
      bubbleId: "b_agent_cmd_remote_authority_01",
      workspacePath,
      externalPairflowCommand: "/home/dev/.local/share/pnpm/pairflow",
      remoteWorkspaceAuthority: {
        workspaceRoot: workspacePath,
        externalPairflowCommand: "/home/dev/.local/share/pnpm/pairflow"
      },
      codexMcpDisableArgs: [],
      startupPrompt: "Prompt"
    });
    const script = extractBashLcScript(command);

    expect(script).toContain(
      "export PAIRFLOW_REMOTE_START_MODE='inner_remote_activation'"
    );
    expect(script).toContain(
      "export PAIRFLOW_REMOTE_START_WORKSPACE_ROOT='/remote/repos/pairflow--bubble-01'"
    );
    expect(script).toContain(
      "export PAIRFLOW_REMOTE_START_EXTERNAL_PAIRFLOW_COMMAND='/home/dev/.local/share/pnpm/pairflow'"
    );
    await assertBashParses(command);
  });

  it("builds self_host profile bootstrap when explicitly selected", async () => {
    const worktreePath = "/tmp/pairflow-worktree/claude";
    const command = buildAgentCommand({
      agentName: "claude",
      bubbleId: "b_agent_cmd_claude_01",
      worktreePath,
      pairflowCommandProfile: "self_host",
      startupPrompt: "Reviewer startup prompt."
    });
    const script = extractBashLcScript(command);

    expect(script).toContain(`if ! cd ${shellQuote(worktreePath)}; then`);
    expect(script).toContain("PAIRFLOW_LOCAL_ENTRYPOINT");
    expect(script).toContain("PAIRFLOW_COMMAND_PATH_STALE");
    expect(script).toContain('export PATH="$PAIRFLOW_WRAPPER_DIR:$PATH"');
    expect(command).toContain("--dangerously-skip-permissions");
    expect(command).toContain("--permission-mode");
    expect(command).toContain("bypassPermissions");
    await assertBashParses(command);
  });

  it("passes an explicit model to the selected agent CLI", async () => {
    const command = buildAgentCommand({
      agentName: "claude",
      model: "claude-sonnet-4-5",
      bubbleId: "b_agent_cmd_model_01",
      workspacePath: "/tmp/pairflow-worktree/model"
    });

    expect(command).toContain("--model");
    expect(command).toContain("claude-sonnet-4-5");
    await assertBashParses(command);
  });

  it("fails closed when worktree path is empty", () => {
    expect(() =>
      buildAgentCommand({
        agentName: "codex",
        bubbleId: "b_agent_cmd_invalid_01",
        worktreePath: "   "
      })
    ).toThrow("Workspace path is required");
  });
});
