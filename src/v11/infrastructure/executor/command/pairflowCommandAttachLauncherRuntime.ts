import { homedir } from "node:os";
import { join } from "node:path";

import type { AttachLauncher } from "../../../../types/bubble.js";
import { shellQuote } from "../../../shared/foundation/shellQuote.js";
import {
  AttachBubbleError as AttachBubbleErrorClass,
  type AttachBubbleReasonCode,
  type AttachCommandExecutor,
  type AttachLauncherFailureClass,
  type ExplicitAttachLauncher,
  type GuiAttachLauncher,
  type LauncherAvailabilityChecker
} from "./pairflowCommandAttachContract.js";

const autoGuiLauncherOrder: readonly GuiAttachLauncher[] = [
  "iterm2",
  "ghostty",
  "warp",
  "terminal"
];

interface AttachLaunchContext {
  tmuxSessionName: string;
  repoPath: string;
  attachCommand: string;
  executeAttachCommand: AttachCommandExecutor;
  writeYamlFile: (path: string, content: string) => Promise<void>;
}

interface AttachLauncherResolution {
  launcherUsed: AttachLauncher;
  attachCommand?: string;
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

export function buildAttachCommand(sessionName: string): string {
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
  if (launcherUnavailablePatterns.some((pattern) => pattern.test(output))) {
    return "launcher_unavailable";
  }
  return "launcher_launch_failed";
}

function reasonCodeFromFailureClass(
  failureClass: AttachLauncherFailureClass
): AttachBubbleReasonCode {
  return failureClass === "launcher_unavailable"
    ? "ATTACH_LAUNCHER_UNAVAILABLE"
    : "ATTACH_LAUNCHER_LAUNCH_FAILED";
}

function toLauncherFailureError(input: {
  launcher: ExplicitAttachLauncher;
  failureClass: AttachLauncherFailureClass;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  messagePrefix: string;
}): AttachBubbleErrorClass {
  const stdoutExcerpt = truncateExcerpt(input.stdout ?? "");
  const stderrExcerpt = truncateExcerpt(input.stderr ?? "");
  const reason = stderrExcerpt ?? stdoutExcerpt;
  const suffix =
    reason === undefined
      ? input.exitCode === undefined
        ? "."
        : ` (exit code ${input.exitCode}).`
      : `: ${reason}`;

  return new AttachBubbleErrorClass(`${input.messagePrefix}${suffix}`, {
    launcher: input.launcher,
    failureClass: input.failureClass,
    reasonCode: reasonCodeFromFailureClass(input.failureClass),
    ...(stdoutExcerpt !== undefined ? { stdoutExcerpt } : {}),
    ...(stderrExcerpt !== undefined ? { stderrExcerpt } : {})
  });
}

function normalizeLauncherError(
  error: unknown,
  launcher: ExplicitAttachLauncher
): AttachBubbleErrorClass {
  if (
    error instanceof AttachBubbleErrorClass &&
    error.launcher !== undefined &&
    error.failureClass !== undefined
  ) {
    return error;
  }

  const reason = error instanceof Error ? error.message : String(error);
  return new AttachBubbleErrorClass(reason, {
    launcher,
    failureClass: "launcher_launch_failed",
    reasonCode: "ATTACH_LAUNCHER_LAUNCH_FAILED"
  });
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
    throw new AttachBubbleErrorClass(
      `Attach launcher 'warp' failed while preparing launch configuration: ${reason}`,
      {
        launcher: "warp",
        failureClass: "launcher_launch_failed",
        reasonCode: "ATTACH_LAUNCHER_PREPARE_FAILED"
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

export async function resolveAttachLauncher(input: {
  launcherRequested: AttachLauncher;
  context: AttachLaunchContext;
  checkLauncherAvailability: LauncherAvailabilityChecker;
}): Promise<AttachLauncherResolution> {
  if (input.launcherRequested === "copy") {
    return {
      launcherUsed: "copy",
      attachCommand: input.context.attachCommand
    };
  }

  if (input.launcherRequested !== "auto") {
    const available = await input.checkLauncherAvailability({
      launcher: input.launcherRequested,
      cwd: input.context.repoPath
    });
    if (!available) {
      throw new AttachBubbleErrorClass(
        `Attach launcher '${input.launcherRequested}' is unavailable on this host.`,
        {
          launcher: input.launcherRequested,
          failureClass: "launcher_unavailable",
          reasonCode: "ATTACH_LAUNCHER_UNAVAILABLE"
        }
      );
    }

    try {
      await launchGuiLauncher(input.launcherRequested, input.context);
    } catch (error) {
      throw normalizeLauncherError(error, input.launcherRequested);
    }

    return {
      launcherUsed: input.launcherRequested
    };
  }

  return (async () => {
    for (const launcher of autoGuiLauncherOrder) {
      const available = await input.checkLauncherAvailability({
        launcher,
        cwd: input.context.repoPath
      });
      if (!available) {
        continue;
      }

      try {
        await launchGuiLauncher(launcher, input.context);
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
      attachCommand: input.context.attachCommand
    };
  })();
}
