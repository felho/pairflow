import { join } from "node:path";

import { shellQuote } from "../../../../shared/foundation/shellQuote.js";
import type {
  AttachCommandExecutor,
  GuiAttachLauncher,
  LauncherAvailabilityChecker
} from "../../attachBubbleContract.js";

const launcherApplicationNames: Record<GuiAttachLauncher, string> = {
  warp: "Warp",
  iterm2: "iTerm2",
  terminal: "Terminal",
  ghostty: "Ghostty"
};

const itermApplicationNames = ["iTerm2", "iTerm"] as const;

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

export function buildCheckLauncherAvailabilityDefault(
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
