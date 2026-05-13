import type { AttachLauncher } from "../../../../shared/bubbleAttachment/attachLauncherTypes.js";
import { shellQuote } from "../../../../shared/foundation/shellQuote.js";
import type {
  ExplicitAttachLauncher,
  GuiAttachLauncher,
  LauncherAvailabilityChecker
} from "../../attachBubbleContract.js";
import { AttachBubbleError as AttachBubbleErrorClass } from "../../attachBubbleContract.js";
import {
  launchGuiLauncher,
  normalizeLauncherError,
  type AttachLaunchContext
} from "./attachBubbleGuiLaunchers.js";

const autoGuiLauncherOrder: readonly GuiAttachLauncher[] = [
  "iterm2",
  "ghostty",
  "warp",
  "terminal"
];

interface AttachLauncherResolution {
  launcherUsed: ExplicitAttachLauncher;
  attachCommand?: string;
}

const sshTransportOptions = [
  ["BatchMode", "yes"],
  ["StrictHostKeyChecking", "yes"],
  ["ConnectTimeout", "10"],
  ["ConnectionAttempts", "1"]
] as const;

export function buildAttachCommand(sessionName: string): string {
  return `tmux attach -t ${shellQuote(sessionName)}`;
}

function normalizePortForwards(ports: readonly number[] | undefined): number[] {
  if (ports === undefined) {
    return [];
  }

  return [...new Set(ports)]
    .filter((port) => Number.isInteger(port) && port >= 1 && port <= 65_535)
    .sort((left, right) => left - right);
}

export function buildRemoteAttachCommand(input: {
  host: string;
  user?: string;
  remoteClonePath: string;
  tmuxSessionName: string;
  portForwards?: readonly number[];
}): string {
  const sshTarget =
    input.user !== undefined ? `${input.user}@${input.host}` : input.host;
  const remoteShellCommand = [
    `cd ${shellQuote(input.remoteClonePath)}`,
    buildAttachCommand(input.tmuxSessionName)
  ].join(" && ");
  const commandParts = [
    "ssh",
    ...sshTransportOptions.flatMap(([key, value]) => ["-o", `${key}=${value}`]),
    ...normalizePortForwards(input.portForwards).flatMap((port) => [
      "-L",
      `127.0.0.1:${port}:127.0.0.1:${port}`
    ]),
    "-t",
    sshTarget,
    "bash",
    "-lc",
    remoteShellCommand
  ];

  return commandParts.map((part) => shellQuote(part)).join(" ");
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
}
