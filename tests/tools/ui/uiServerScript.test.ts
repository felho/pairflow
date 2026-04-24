import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

interface CommandResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

const tempDirs: string[] = [];
const scriptPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../scripts/ui-server.sh"
);
const uiEntryPath = resolve(dirname(scriptPath), "../dist/cli/index.js");

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-ui-server-script-"));
  tempDirs.push(root);
  return root;
}

async function runCommand(input: {
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
}): Promise<CommandResult> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(input.command, input.args, {
      cwd: input.cwd,
      env: input.env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });
    child.on("error", rejectPromise);
    child.on("close", (exitCode) => {
      resolvePromise({
        exitCode,
        stdout,
        stderr
      });
    });
  });
}

async function writeExecutable(
  dir: string,
  name: string,
  lines: string[]
): Promise<void> {
  await writeFile(join(dir, name), `${lines.join("\n")}\n`, {
    encoding: "utf8",
    mode: 0o755
  });
}

function createBaseEnv(input: {
  fakeBinDir: string;
  tmuxStatePath: string;
  tmuxLogPath: string;
  port: string;
  logPath: string;
  sessionExistsInitially?: boolean;
}): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: `${input.fakeBinDir}:${process.env.PATH ?? ""}`,
    PAIRFLOW_FAKE_TMUX_STATE: input.tmuxStatePath,
    PAIRFLOW_FAKE_TMUX_LOG: input.tmuxLogPath,
    PAIRFLOW_UI_LOG_PATH: input.logPath,
    PAIRFLOW_UI_PORT: input.port,
    PAIRFLOW_TEST_UI_PORT: input.port,
    ...(input.sessionExistsInitially === true
      ? { PAIRFLOW_FAKE_TMUX_SESSION_EXISTS: "1" }
      : {})
  };
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true }))
  );
});

describe("ui-server.sh", () => {
  it("launches the UI node process with neutral tmux authority on start", async () => {
    const root = await createTempRoot();
    const fakeBinDir = join(root, "bin");
    const tmuxStatePath = join(root, "tmux-state");
    const tmuxLogPath = join(root, "tmux-log.txt");
    const uiLogPath = join(root, "ui.log");
    const port = "4317";

    await mkdir(fakeBinDir, { recursive: true });
    await writeExecutable(fakeBinDir, "tmux", [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      'state_file="${PAIRFLOW_FAKE_TMUX_STATE:?}"',
      'log_file="${PAIRFLOW_FAKE_TMUX_LOG:?}"',
      'if [ ! -f "$state_file" ]; then',
      '  printf "%s" "${PAIRFLOW_FAKE_TMUX_SESSION_EXISTS:-0}" > "$state_file"',
      "fi",
      'printf "%s\\n" "$*" >> "$log_file"',
      'command_name="${3:-}"',
      'state="$(cat "$state_file")"',
      'if [ "$command_name" = "has-session" ]; then',
      '  if [ "$state" = "1" ]; then',
      "    exit 0",
      "  fi",
      "  exit 1",
      "fi",
      'if [ "$command_name" = "new-session" ]; then',
      '  printf "1" > "$state_file"',
      "  exit 0",
      "fi",
      'if [ "$command_name" = "kill-session" ]; then',
      '  printf "0" > "$state_file"',
      "  exit 0",
      "fi",
      'if [ "$command_name" = "list-sessions" ]; then',
      '  if [ "$state" = "1" ]; then',
      '    printf "pf-ui-server: 1 windows\\n"',
      "    exit 0",
      "  fi",
      "  exit 1",
      "fi",
      'echo "unexpected tmux invocation: $*" >&2',
      "exit 99"
    ]);
    await writeExecutable(fakeBinDir, "lsof", [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      'port="${PAIRFLOW_TEST_UI_PORT:?}"',
      'printf "%s\\n" "node 12345 test 10u IPv4 0t0 TCP 127.0.0.1:${port} (LISTEN)"',
      "exit 0"
    ]);
    await writeExecutable(fakeBinDir, "pgrep", [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      "exit 1"
    ]);

    const result = await runCommand({
      command: "bash",
      args: [scriptPath, "start"],
      cwd: root,
      env: createBaseEnv({
        fakeBinDir,
        tmuxStatePath,
        tmuxLogPath,
        port,
        logPath: uiLogPath
      })
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Started UI tmux session: pf-ui-server");
    expect(result.stdout).toContain(`UI server is listening on http://127.0.0.1:${port}`);

    const tmuxLog = (await readFile(tmuxLogPath, "utf8")).trim().split("\n");
    const newSessionCommand = tmuxLog.find((line) => line.includes(" new-session "));
    expect(newSessionCommand).toBeDefined();
    expect(newSessionCommand).toContain("-L pairflow-ui-pf-ui-server");
    expect(newSessionCommand).toContain("new-session -d -s pf-ui-server");
    expect(newSessionCommand).toContain(
      `exec env -u TMUX -u TMUX_PANE node ${uiEntryPath}`
    );
  });

  it("restarts by killing the prior session and relaunching with neutral tmux authority", async () => {
    const root = await createTempRoot();
    const fakeBinDir = join(root, "bin");
    const tmuxStatePath = join(root, "tmux-state");
    const tmuxLogPath = join(root, "tmux-log.txt");
    const uiLogPath = join(root, "ui.log");
    const port = "4321";

    await mkdir(fakeBinDir, { recursive: true });
    await writeExecutable(fakeBinDir, "tmux", [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      'state_file="${PAIRFLOW_FAKE_TMUX_STATE:?}"',
      'log_file="${PAIRFLOW_FAKE_TMUX_LOG:?}"',
      'if [ ! -f "$state_file" ]; then',
      '  printf "%s" "${PAIRFLOW_FAKE_TMUX_SESSION_EXISTS:-0}" > "$state_file"',
      "fi",
      'printf "%s\\n" "$*" >> "$log_file"',
      'command_name="${3:-}"',
      'state="$(cat "$state_file")"',
      'if [ "$command_name" = "has-session" ]; then',
      '  if [ "$state" = "1" ]; then',
      "    exit 0",
      "  fi",
      "  exit 1",
      "fi",
      'if [ "$command_name" = "new-session" ]; then',
      '  printf "1" > "$state_file"',
      "  exit 0",
      "fi",
      'if [ "$command_name" = "kill-session" ]; then',
      '  printf "0" > "$state_file"',
      "  exit 0",
      "fi",
      'echo "unexpected tmux invocation: $*" >&2',
      "exit 99"
    ]);
    await writeExecutable(fakeBinDir, "lsof", [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      'port="${PAIRFLOW_TEST_UI_PORT:?}"',
      'state_file="${PAIRFLOW_FAKE_TMUX_STATE:?}"',
      'state="$(cat "$state_file" 2>/dev/null || printf "0")"',
      'if [ "$state" = "1" ]; then',
      '  printf "%s\\n" "node 12345 test 10u IPv4 0t0 TCP 127.0.0.1:${port} (LISTEN)"',
      "  exit 0",
      "fi",
      "exit 1"
    ]);
    await writeExecutable(fakeBinDir, "pgrep", [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      "exit 1"
    ]);

    const result = await runCommand({
      command: "bash",
      args: [scriptPath, "restart"],
      cwd: root,
      env: createBaseEnv({
        fakeBinDir,
        tmuxStatePath,
        tmuxLogPath,
        port,
        logPath: uiLogPath,
        sessionExistsInitially: true
      })
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Stopped UI tmux session: pf-ui-server");
    expect(result.stdout).toContain("Started UI tmux session: pf-ui-server");
    expect(result.stdout).toContain(`UI server is listening on http://127.0.0.1:${port}`);

    const tmuxLog = (await readFile(tmuxLogPath, "utf8")).trim().split("\n");
    expect(tmuxLog.some((line) => line.includes(" has-session "))).toBe(true);
    expect(tmuxLog.some((line) => line.includes(" kill-session -t pf-ui-server"))).toBe(
      true
    );
    const newSessionCommand = tmuxLog.find((line) => line.includes(" new-session "));
    expect(newSessionCommand).toBeDefined();
    expect(newSessionCommand).toContain(
      `exec env -u TMUX -u TMUX_PANE node ${uiEntryPath}`
    );
  });
});
