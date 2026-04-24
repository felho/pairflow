import { spawn } from "node:child_process";

import type {
  TmuxRunOptions,
  TmuxRunResult,
  TmuxRunner
} from "../../../shared/ports/tmuxSessions.js";

export class TmuxCommandError extends Error {
  public readonly args: string[];
  public readonly exitCode: number;
  public readonly stderr: string;

  public constructor(args: string[], exitCode: number, stderr: string) {
    super(
      `tmux command failed (exit ${exitCode}): tmux ${args.join(" ")}\n${stderr.trim()}`
    );
    this.name = "TmuxCommandError";
    this.args = args;
    this.exitCode = exitCode;
    this.stderr = stderr;
  }
}

function buildTmuxSpawnEnvironment(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.CLAUDECODE;
  delete env.TMUX;
  return env;
}

export const runTmux: TmuxRunner = async (
  args: string[],
  options: TmuxRunOptions = {}
): Promise<TmuxRunResult> =>
  new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("tmux", args, {
      cwd: options.cwd,
      env: buildTmuxSpawnEnvironment(),
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

    child.on("error", (error) => {
      rejectPromise(error);
    });

    child.on("close", (exitCode) => {
      const code = exitCode ?? 1;
      if (code !== 0 && !options.allowFailure) {
        rejectPromise(new TmuxCommandError(args, code, stderr));
        return;
      }

      resolvePromise({
        stdout,
        stderr,
        exitCode: code
      });
    });
  });
