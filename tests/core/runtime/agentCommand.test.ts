import { spawn } from "node:child_process";

import { describe, expect, it } from "vitest";

import { buildAgentCommand } from "../../../src/core/runtime/agentCommand.js";
import { shellQuote } from "../../../src/core/util/shellQuote.js";

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

describe("buildAgentCommand", () => {
  it("builds external profile bootstrap for codex by default", async () => {
    const worktreePath = "/tmp/pairflow worktree/it's-here";
    const command = buildAgentCommand({
      agentName: "codex",
      bubbleId: "b_agent_cmd_codex_01",
      worktreePath,
      startupPrompt: "Prompt with `ticks` and $HOME literal."
    });
    const script = extractBashLcScript(command);

    expect(script).toContain(`if ! cd ${shellQuote(worktreePath)}; then`);
    expect(script).toContain("PAIRFLOW_EXTERNAL_COMMAND");
    expect(script).toContain("PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE");
    expect(script).toContain('PAIRFLOW_WRAPPER_DIR');
    expect(script).toContain('cat > "$PAIRFLOW_WRAPPER_DIR/pairflow"');
    expect(command).toContain("--dangerously-bypass-approvals-and-sandbox");
    expect(command).toContain("Prompt with `ticks` and $HOME literal.");
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

  it("fails closed when worktree path is empty", () => {
    expect(() =>
      buildAgentCommand({
        agentName: "codex",
        bubbleId: "b_agent_cmd_invalid_01",
        worktreePath: "   "
      })
    ).toThrow("Worktree path is required");
  });
});
