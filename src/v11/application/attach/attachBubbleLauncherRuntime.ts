import type { AttachLauncher } from "../../../types/bubble.js";
import { shellQuote } from "../../shared/foundation/shellQuote.js";
import type {
  ExplicitAttachLauncher,
  GuiAttachLauncher,
  LauncherAvailabilityChecker
} from "./attachBubbleContract.js";
import { AttachBubbleError as AttachBubbleErrorClass } from "./attachBubbleContract.js";
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

export function buildAttachCommand(sessionName: string): string {
  return `tmux attach -t ${shellQuote(sessionName)}`;
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
