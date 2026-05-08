import type { ProcessSpawnPort } from "../../ports/processSpawn.js";
import type { RunWorktreeBootstrapCommandInput } from "./startCommandContract.js";
import { runTmux } from "./startCommandDependencyDefaults.js";
import { StartBubbleError } from "./startCommandRuntime.js";

function truncateCommandOutput(raw: string, maxChars: number = 1200): string {
  const normalized = raw.trim();
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, maxChars)}... [truncated]`;
}

export function createRunWorktreeBootstrapCommandDefault(
  processSpawn: ProcessSpawnPort
): (input: RunWorktreeBootstrapCommandInput) => Promise<void> {
  return async (input: RunWorktreeBootstrapCommandInput): Promise<void> => {
  const command = input.command.trim();
  if (command.length === 0) {
    return;
  }

  const result = await new Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }>((resolvePromise, rejectPromise) => {
    const child = processSpawn("bash", ["-lc", command], {
      cwd: input.workspacePath,
      stdio: ["ignore", "pipe", "pipe"]
    });

    if (child.stdout === null || child.stderr === null) {
      rejectPromise(new Error("spawned bootstrap command did not expose pipe streams"));
      return;
    }

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
    workspace_path: input.workspacePath,
    worktree_path: input.worktreePath,
    bootstrap_command: command,
    exit_code: result.exitCode
  };
  const details: string[] = [
    `Configured commands.bootstrap failed for bubble ${input.bubbleId} (exit ${result.exitCode}).`,
    `Command: ${command}`,
    `Workspace: ${input.workspacePath}`,
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
    `context bubble_id=${input.bubbleId} command_name=start workspace_path=${input.workspacePath} worktree_path=${input.worktreePath}`
  );
  throw new StartBubbleError(details.join(" "));
  };
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
