import { constants as fsConstants } from "node:fs";
import { access } from "node:fs/promises";
import { spawn } from "node:child_process";

import type { BubbleConfig } from "../../types/bubble.js";

export type BubbleNotificationKind = "waiting-human" | "converged";

export interface BubbleNotificationResult {
  kind: BubbleNotificationKind;
  attempted: boolean;
  delivered: boolean;
  soundPath: string | null;
  reason:
    | null
    | "disabled"
    | "no_sound_configured"
    | "sound_missing"
    | "play_failed";
}

export type NotificationSoundPlayer = (soundPath: string) => Promise<void>;
export type NotificationPathExists = (path: string) => Promise<boolean>;

export interface BubbleNotificationDependencies {
  playSound?: NotificationSoundPlayer;
  pathExists?: NotificationPathExists;
}

async function defaultPathExists(path: string): Promise<boolean> {
  return access(path, fsConstants.F_OK)
    .then(() => true)
    .catch(() => false);
}

export const playSoundWithAfplay: NotificationSoundPlayer = async (
  soundPath: string
): Promise<void> =>
  new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("afplay", [soundPath], {
      stdio: ["ignore", "ignore", "ignore"]
    });

    child.on("error", (error) => {
      rejectPromise(error);
    });

    child.on("close", (exitCode) => {
      if ((exitCode ?? 1) !== 0) {
        rejectPromise(new Error(`afplay failed with exit code ${exitCode ?? 1}`));
        return;
      }
      resolvePromise();
    });
  });

function resolveSoundPath(
  config: BubbleConfig,
  kind: BubbleNotificationKind
): string | undefined {
  if (kind === "waiting-human") {
    return config.notifications.waiting_human_sound;
  }
  return config.notifications.converged_sound;
}

export async function emitBubbleNotification(
  config: BubbleConfig,
  kind: BubbleNotificationKind,
  dependencies: BubbleNotificationDependencies = {}
): Promise<BubbleNotificationResult> {
  if (!config.notifications.enabled) {
    return {
      kind,
      attempted: false,
      delivered: false,
      soundPath: null,
      reason: "disabled"
    };
  }

  const soundPath = resolveSoundPath(config, kind);
  if (soundPath === undefined) {
    return {
      kind,
      attempted: false,
      delivered: false,
      soundPath: null,
      reason: "no_sound_configured"
    };
  }

  const pathExists = dependencies.pathExists ?? defaultPathExists;
  const exists = await pathExists(soundPath);
  if (!exists) {
    return {
      kind,
      attempted: false,
      delivered: false,
      soundPath,
      reason: "sound_missing"
    };
  }

  const playSound = dependencies.playSound ?? playSoundWithAfplay;
  try {
    await playSound(soundPath);
    return {
      kind,
      attempted: true,
      delivered: true,
      soundPath,
      reason: null
    };
  } catch {
    return {
      kind,
      attempted: true,
      delivered: false,
      soundPath,
      reason: "play_failed"
    };
  }
}
