import { spawn } from "node:child_process";
import type { RunWorktreeBootstrapCommandInput } from "../../application/start/startCommandContract.js";
import { runTmux } from "../../infrastructure/channel/tmux/tmuxManager.js";
import { StartBubbleError } from "./startCommandRuntime.js";

function truncateCommandOutput(raw: string, maxChars: number = 1200): string {
  const normalized = raw.trim();
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, maxChars)}... [truncated]`;
}

export async function runWorktreeBootstrapCommandDefault(
  input: RunWorktreeBootstrapCommandInput
): Promise<void> {
  const command = input.command.trim();
  if (command.length === 0) {
    return;
  }

  const result = await new Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }>((resolvePromise, rejectPromise) => {
    const child = spawn("bash", ["-lc", command], {
      cwd: input.worktreePath,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", rejectPromise);
    child.on("close", (exitCode) => {
      resolvePromise({
        stdout,
        stderr,
        exitCode: exitCode ?? 1
      });
    });
  });

  if (result.exitCode === 0) {
    return;
  }

  const stderrSummary = truncateCommandOutput(result.stderr);
  const stdoutSummary = truncateCommandOutput(result.stdout);
  const errorContext = {
    bubble_id: input.bubbleId,
    command_name: "start",
    worktree_path: input.worktreePath,
    bootstrap_command: command,
    exit_code: result.exitCode
  };
  const details: string[] = [
    `Configured commands.bootstrap failed for bubble ${input.bubbleId} (exit ${result.exitCode}).`,
    `Command: ${command}`,
    `Worktree: ${input.worktreePath}`,
    `context: ${JSON.stringify(errorContext)}`
  ];
  if (stderrSummary.length > 0) {
    details.push(`stderr: ${stderrSummary}`);
  }
  if (stdoutSummary.length > 0) {
    details.push(`stdout: ${stdoutSummary}`);
  }
  details.push(
    `context bubble_id=${input.bubbleId} command_name=start worktree_path=${input.worktreePath}`
  );
  throw new StartBubbleError(details.join(" "));
}

export async function isTmuxSessionAliveDefault(sessionName: string): Promise<boolean> {
  try {
    const result = await runTmux(["has-session", "-t", sessionName], {
      allowFailure: true
    });
    return result.exitCode === 0;
  } catch {
    return false;
  }
}
