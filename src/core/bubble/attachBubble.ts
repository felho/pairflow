import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { spawn } from "node:child_process";

import { isAttachLauncher, type AttachLauncher } from "../../types/bubble.js";
import { BubbleLookupError, resolveBubbleById } from "./bubbleLookup.js";
import { buildBubbleTmuxSessionName } from "../runtime/tmuxManager.js";
import { shellQuote } from "../util/shellQuote.js";

type ExplicitAttachLauncher = Exclude<AttachLauncher, "auto">;
type GuiAttachLauncher = Exclude<ExplicitAttachLauncher, "copy">;

const autoGuiLauncherOrder: readonly GuiAttachLauncher[] = [
  "iterm2",
  "ghostty",
  "warp",
  "terminal"
];

const launcherApplicationNames: Record<GuiAttachLauncher, string> = {
  warp: "Warp",
  iterm2: "iTerm2",
  terminal: "Terminal",
  ghostty: "Ghostty"
};
const itermApplicationNames = ["iTerm2", "iTerm"] as const;

export interface AttachBubbleInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
}

export interface AttachBubbleResult {
  bubbleId: string;
  tmuxSessionName: string;
  launcherRequested: AttachLauncher;
  launcherUsed: ExplicitAttachLauncher;
  attachCommand?: string;
}

export interface AttachCommandExecutionInput {
  command: string;
  cwd: string;
}

export interface AttachCommandExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export type AttachCommandExecutor = (
  input: AttachCommandExecutionInput
) => Promise<AttachCommandExecutionResult>;

export type TmuxSessionChecker = (sessionName: string) => Promise<boolean>;

export interface LauncherAvailabilityInput {
  launcher: GuiAttachLauncher;
  cwd: string;
}

export type LauncherAvailabilityChecker = (
  input: LauncherAvailabilityInput
) => Promise<boolean>;

export type AttachLauncherFailureClass =
  | "launcher_unavailable"
  | "launcher_launch_failed";

export interface AttachBubbleDependencies {
  executeAttachCommand?: AttachCommandExecutor;
  resolveBubbleById?: typeof resolveBubbleById;
  checkTmuxSessionExists?: TmuxSessionChecker;
  writeYamlFile?: (path: string, content: string) => Promise<void>;
  checkLauncherAvailability?: LauncherAvailabilityChecker;
}

interface AttachBubbleErrorOptions {
  launcher?: ExplicitAttachLauncher;
  failureClass?: AttachLauncherFailureClass;
  stdoutExcerpt?: string;
  stderrExcerpt?: string;
}

interface AttachLaunchContext {
  tmuxSessionName: string;
  repoPath: string;
  attachCommand: string;
  executeAttachCommand: AttachCommandExecutor;
  writeYamlFile: (path: string, content: string) => Promise<void>;
}

export class AttachBubbleError extends Error {
  public readonly launcher?: ExplicitAttachLauncher;
  public readonly failureClass?: AttachLauncherFailureClass;
  public readonly stdoutExcerpt?: string;
  public readonly stderrExcerpt?: string;

  public constructor(message: string, options: AttachBubbleErrorOptions = {}) {
    super(message);
    this.name = "AttachBubbleError";
    if (options.launcher !== undefined) {
      this.launcher = options.launcher;
    }
    if (options.failureClass !== undefined) {
      this.failureClass = options.failureClass;
    }
    if (options.stdoutExcerpt !== undefined) {
      this.stdoutExcerpt = options.stdoutExcerpt;
    }
    if (options.stderrExcerpt !== undefined) {
      this.stderrExcerpt = options.stderrExcerpt;
    }
  }
}

function escapeYamlDoubleQuotedString(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"");
}

function escapeAppleScriptString(value: string): string {
  let escaped = "";
  for (const char of value) {
    if (char === "\\") {
      escaped += "\\\\";
      continue;
    }
    if (char === "\"") {
      escaped += "\\\"";
      continue;
    }
    if (char === "\n") {
      escaped += "\\n";
      continue;
    }
    if (char === "\r") {
      escaped += "\\r";
      continue;
    }
    if (char === "\t") {
      escaped += "\\t";
      continue;
    }

    const codePoint = char.codePointAt(0);
    if (codePoint !== undefined && (codePoint < 0x20 || codePoint === 0x7f)) {
      escaped += " ";
      continue;
    }

    escaped += char;
  }

  return escaped;
}

function buildWarpLaunchYaml(sessionName: string, cwd: string): string {
  const safeSessionName = escapeYamlDoubleQuotedString(sessionName);
  const safeCwd = escapeYamlDoubleQuotedString(cwd);
  const safeAttachCommand = escapeYamlDoubleQuotedString(
    buildAttachCommandForLauncherExecution(sessionName)
  );

  return [
    "---",
    `name: "${safeSessionName}"`,
    "windows:",
    "  - tabs:",
    "      - layout:",
    `          cwd: "${safeCwd}"`,
    "          commands:",
    `            - exec: "${safeAttachCommand}"`,
    ""
  ].join("\n");
}

function buildAttachCommand(sessionName: string): string {
  return `tmux attach -t ${shellQuote(sessionName)}`;
}

function buildAttachCommandForLauncherExecution(sessionName: string): string {
  return buildAttachCommand(sessionName);
}

function buildShellAttachCommand(sessionName: string, repoPath: string): string {
  return `cd ${shellQuote(repoPath)} && ${buildAttachCommandForLauncherExecution(sessionName)}`;
}

function buildOsaScriptCommand(script: string): string {
  return `osascript -e ${shellQuote(script)}`;
}

function buildWarpUriSchemeProbeCommand(infoPlistPath: string): string {
  return [
    "plutil",
    "-extract",
    "CFBundleURLTypes",
    "json",
    "-o",
    "-",
    shellQuote(infoPlistPath),
    "|",
    "grep",
    "-qi",
    shellQuote("\"warp\"")
  ].join(" ");
}

function truncateExcerpt(value: string, maxLength: number = 400): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength - 3)}...`;
}

function inferFailureClassFromOutput(output: string): AttachLauncherFailureClass {
  const launcherUnavailablePatterns: readonly RegExp[] = [
    /unable to find application named/iu,
    /can't find application/iu,
    /no application knows how to open url/iu,
    /\bcommand not found\b/iu,
    /\bno such file(?: or directory)?\b/iu,
    /-10814\b/u
  ];
  if (
    launcherUnavailablePatterns.some((pattern) => pattern.test(output))
  ) {
    return "launcher_unavailable";
  }
  return "launcher_launch_failed";
}

function toLauncherFailureError(input: {
  launcher: ExplicitAttachLauncher;
  failureClass: AttachLauncherFailureClass;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  messagePrefix: string;
}): AttachBubbleError {
  const stdoutExcerpt = truncateExcerpt(input.stdout ?? "");
  const stderrExcerpt = truncateExcerpt(input.stderr ?? "");
  const reason = stderrExcerpt ?? stdoutExcerpt;
  const suffix =
    reason === undefined
      ? input.exitCode === undefined
        ? "."
        : ` (exit code ${input.exitCode}).`
      : `: ${reason}`;

  return new AttachBubbleError(`${input.messagePrefix}${suffix}`, {
    launcher: input.launcher,
    failureClass: input.failureClass,
    ...(stdoutExcerpt !== undefined ? { stdoutExcerpt } : {}),
    ...(stderrExcerpt !== undefined ? { stderrExcerpt } : {})
  });
}

function normalizeLauncherError(
  error: unknown,
  launcher: ExplicitAttachLauncher
): AttachBubbleError {
  if (
    error instanceof AttachBubbleError &&
    error.launcher !== undefined &&
    error.failureClass !== undefined
  ) {
    return error;
  }

  const reason = error instanceof Error ? error.message : String(error);
  return new AttachBubbleError(reason, {
    launcher,
    failureClass: "launcher_launch_failed"
  });
}

export const executeAttachCommand: AttachCommandExecutor = async (
  input: AttachCommandExecutionInput
): Promise<AttachCommandExecutionResult> =>
  new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("bash", ["-lc", input.command], {
      cwd: input.cwd,
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
      resolvePromise({
        exitCode: exitCode ?? 1,
        stdout,
        stderr
      });
    });
  });

async function checkTmuxSessionExistsDefault(sessionName: string): Promise<boolean> {
  return new Promise((resolvePromise) => {
    const child = spawn("tmux", ["has-session", "-t", sessionName], {
      stdio: ["ignore", "ignore", "ignore"]
    });

    child.on("error", () => {
      resolvePromise(false);
    });

    child.on("close", (exitCode) => {
      resolvePromise(exitCode === 0);
    });
  });
}

async function writeYamlFileDefault(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

async function checkApplicationAvailability(input: {
  runCommand: AttachCommandExecutor;
  cwd: string;
  applicationName: string;
}): Promise<boolean> {
  const appProbe = await input.runCommand({
    command: `open -Ra ${shellQuote(input.applicationName)}`,
    cwd: input.cwd
  });
  return appProbe.exitCode === 0;
}

function buildCheckLauncherAvailabilityDefault(
  runCommand: AttachCommandExecutor
): LauncherAvailabilityChecker {
  return async ({ launcher, cwd }) => {
    if (launcher === "iterm2") {
      for (const applicationName of itermApplicationNames) {
        const available = await checkApplicationAvailability({
          runCommand,
          cwd,
          applicationName
        });
        if (available) {
          return true;
        }
      }
      return false;
    }

    const appName = launcherApplicationNames[launcher];
    const appAvailable = await checkApplicationAvailability({
      runCommand,
      cwd,
      applicationName: appName
    });
    if (!appAvailable) {
      return false;
    }

    if (launcher !== "warp") {
      return true;
    }

    const warpAppPathProbe = await runCommand({
      command: buildOsaScriptCommand('POSIX path of (path to application "Warp")'),
      cwd
    });
    if (warpAppPathProbe.exitCode !== 0) {
      return false;
    }
    const warpAppPath = warpAppPathProbe.stdout.trim();
    if (warpAppPath.length === 0) {
      return false;
    }

    const warpUriSchemeProbe = await runCommand({
      command: buildWarpUriSchemeProbeCommand(
        join(warpAppPath, "Contents", "Info.plist")
      ),
      cwd
    });
    if (warpUriSchemeProbe.exitCode !== 0) {
      return false;
    }

    return true;
  };
}

function buildItermLaunchScript(shellAttachCommand: string): string {
  const escapedAttachCommand = escapeAppleScriptString(shellAttachCommand);
  const scriptApplicationName = "iTerm";

  return [
    `tell application "${scriptApplicationName}"`,
    "  activate",
    "  create window with default profile",
    `  tell current session of current window to write text "${escapedAttachCommand}"`,
    "end tell"
  ].join("\n");
}

async function launchWithIterm2(context: AttachLaunchContext): Promise<void> {
  const shellAttachCommand = buildShellAttachCommand(
    context.tmuxSessionName,
    context.repoPath
  );
  const script = buildItermLaunchScript(shellAttachCommand);

  await runLauncherCommand({
    launcher: "iterm2",
    command: buildOsaScriptCommand(script),
    cwd: context.repoPath,
    executeAttachCommand: context.executeAttachCommand
  });
}

async function launchWithWarp(context: AttachLaunchContext): Promise<void> {
  try {
    const yamlContent = buildWarpLaunchYaml(context.tmuxSessionName, context.repoPath);
    const yamlPath = join(
      homedir(),
      ".warp",
      "launch_configurations",
      `${context.tmuxSessionName}.yaml`
    );
    await context.writeYamlFile(yamlPath, yamlContent);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new AttachBubbleError(
      `Attach launcher 'warp' failed while preparing launch configuration: ${reason}`,
      {
        launcher: "warp",
        failureClass: "launcher_launch_failed"
      }
    );
  }

  const warpLaunchUri = `warp://launch/${context.tmuxSessionName}`;
  await runLauncherCommand({
    launcher: "warp",
    command: `open ${shellQuote(warpLaunchUri)}`,
    cwd: context.repoPath,
    executeAttachCommand: context.executeAttachCommand
  });
}

async function launchWithTerminal(context: AttachLaunchContext): Promise<void> {
  const shellAttachCommand = buildShellAttachCommand(
    context.tmuxSessionName,
    context.repoPath
  );
  const script = [
    'tell application "Terminal"',
    `  do script "${escapeAppleScriptString(shellAttachCommand)}"`,
    "  activate",
    "end tell"
  ].join("\n");

  await runLauncherCommand({
    launcher: "terminal",
    command: buildOsaScriptCommand(script),
    cwd: context.repoPath,
    executeAttachCommand: context.executeAttachCommand
  });
}

async function launchWithGhostty(context: AttachLaunchContext): Promise<void> {
  const shellAttachCommand = buildShellAttachCommand(
    context.tmuxSessionName,
    context.repoPath
  );
  const command = [
    "open",
    "-na",
    "Ghostty",
    "--args",
    "-e",
    "bash",
    "-lc",
    shellAttachCommand
  ]
    .map((token) => shellQuote(token))
    .join(" ");

  await runLauncherCommand({
    launcher: "ghostty",
    command,
    cwd: context.repoPath,
    executeAttachCommand: context.executeAttachCommand
  });
}

async function launchGuiLauncher(
  launcher: GuiAttachLauncher,
  context: AttachLaunchContext
): Promise<void> {
  switch (launcher) {
    case "warp":
      await launchWithWarp(context);
      return;
    case "iterm2":
      await launchWithIterm2(context);
      return;
    case "terminal":
      await launchWithTerminal(context);
      return;
    case "ghostty":
      await launchWithGhostty(context);
      return;
  }
}

async function resolveAttachLauncher(
  launcherRequested: AttachLauncher,
  context: AttachLaunchContext,
  checkLauncherAvailability: LauncherAvailabilityChecker
): Promise<Pick<AttachBubbleResult, "launcherUsed" | "attachCommand">> {
  if (launcherRequested === "copy") {
    return {
      launcherUsed: "copy",
      attachCommand: context.attachCommand
    };
  }

  if (launcherRequested !== "auto") {
    const available = await checkLauncherAvailability({
      launcher: launcherRequested,
      cwd: context.repoPath
    });
    if (!available) {
      throw new AttachBubbleError(
        `Attach launcher '${launcherRequested}' is unavailable on this host.`,
        {
          launcher: launcherRequested,
          failureClass: "launcher_unavailable"
        }
      );
    }

    try {
      await launchGuiLauncher(launcherRequested, context);
    } catch (error) {
      throw normalizeLauncherError(error, launcherRequested);
    }

    return {
      launcherUsed: launcherRequested
    };
  }

  for (const launcher of autoGuiLauncherOrder) {
    const available = await checkLauncherAvailability({
      launcher,
      cwd: context.repoPath
    });
    if (!available) {
      continue;
    }

    try {
      await launchGuiLauncher(launcher, context);
      return {
        launcherUsed: launcher
      };
    } catch (error) {
      const normalized = normalizeLauncherError(error, launcher);
      if (normalized.failureClass === "launcher_unavailable") {
        continue;
      }
      throw normalized;
    }
  }

  return {
    launcherUsed: "copy",
    attachCommand: context.attachCommand
  };
}

async function runLauncherCommand(input: {
  launcher: GuiAttachLauncher;
  command: string;
  cwd: string;
  executeAttachCommand: AttachCommandExecutor;
}): Promise<void> {
  const executed = await input.executeAttachCommand({
    command: input.command,
    cwd: input.cwd
  });

  if (executed.exitCode === 0) {
    return;
  }

  const combinedOutput = `${executed.stderr}\n${executed.stdout}`;
  const failureClass = inferFailureClassFromOutput(combinedOutput);
  throw toLauncherFailureError({
    launcher: input.launcher,
    failureClass,
    exitCode: executed.exitCode,
    stdout: executed.stdout,
    stderr: executed.stderr,
    messagePrefix: `Attach launcher '${input.launcher}' failed with ${failureClass}`
  });
}

export async function attachBubble(
  input: AttachBubbleInput,
  dependencies: AttachBubbleDependencies = {}
): Promise<AttachBubbleResult> {
  const resolveBubble = dependencies.resolveBubbleById ?? resolveBubbleById;
  const checkSession =
    dependencies.checkTmuxSessionExists ?? checkTmuxSessionExistsDefault;
  const writeYaml = dependencies.writeYamlFile ?? writeYamlFileDefault;
  const runCommand = dependencies.executeAttachCommand ?? executeAttachCommand;
  const checkLauncherAvailability =
    dependencies.checkLauncherAvailability ??
    buildCheckLauncherAvailabilityDefault(runCommand);

  const resolved = await resolveBubble({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });

  const tmuxSessionName = buildBubbleTmuxSessionName(resolved.bubbleId);
  const sessionExists = await checkSession(tmuxSessionName);
  if (!sessionExists) {
    throw new AttachBubbleError(
      `Tmux session "${tmuxSessionName}" does not exist. Start the bubble runtime first.`
    );
  }

  const launcherCandidate: unknown = resolved.bubbleConfig.attach_launcher;
  if (!isAttachLauncher(launcherCandidate)) {
    throw new AttachBubbleError(
      `Invalid attach_launcher value in bubble config for '${resolved.bubbleId}'.`
    );
  }

  const launcherRequested = launcherCandidate;
  const attachCommand = buildAttachCommand(tmuxSessionName);
  const launcherResolution = await resolveAttachLauncher(
    launcherRequested,
    {
      tmuxSessionName,
      repoPath: resolved.repoPath,
      attachCommand,
      executeAttachCommand: runCommand,
      writeYamlFile: writeYaml
    },
    checkLauncherAvailability
  );

  return {
    bubbleId: resolved.bubbleId,
    tmuxSessionName,
    launcherRequested,
    launcherUsed: launcherResolution.launcherUsed,
    ...(launcherResolution.attachCommand !== undefined
      ? { attachCommand: launcherResolution.attachCommand }
      : {})
  };
}

export function asAttachBubbleError(error: unknown): never {
  if (error instanceof AttachBubbleError) {
    throw error;
  }
  if (error instanceof BubbleLookupError) {
    throw new AttachBubbleError(error.message);
  }
  if (error instanceof Error) {
    throw new AttachBubbleError(error.message);
  }
  throw error;
}
