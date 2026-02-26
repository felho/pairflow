import { describe, expect, it } from "vitest";

import {
  emitBubbleNotification,
  type BubbleNotificationKind
} from "../../../src/core/runtime/notifications.js";
import type { BubbleConfig } from "../../../src/types/bubble.js";

function createConfig(overrides: Partial<BubbleConfig> = {}): BubbleConfig {
  return {
    id: "b_notify_01",
    repo_path: "/tmp/repo",
    base_branch: "main",
    bubble_branch: "bubble/b_notify_01",
    work_mode: "worktree",
    quality_mode: "strict",
    review_artifact_type: "auto",
    reviewer_context_mode: "fresh",
    watchdog_timeout_minutes: 5,
    max_rounds: 8,
    commit_requires_approval: true,
    agents: {
      implementer: "codex",
      reviewer: "claude"
    },
    commands: {
      test: "pnpm test",
      typecheck: "pnpm typecheck"
    },
    notifications: {
      enabled: true,
      waiting_human_sound: "/tmp/sounds/waiting.aiff",
      converged_sound: "/tmp/sounds/converged.aiff"
    },
    ...overrides
  };
}

async function runNotification(
  config: BubbleConfig,
  kind: BubbleNotificationKind,
  callbacks: {
    pathExistsResult?: boolean;
    playSoundThrows?: boolean;
  } = {}
) {
  let playedPath: string | undefined;
  const result = await emitBubbleNotification(config, kind, {
    pathExists: () => Promise.resolve(callbacks.pathExistsResult ?? true),
    playSound: (path) => {
      playedPath = path;
      if (callbacks.playSoundThrows ?? false) {
        return Promise.reject(new Error("play failed"));
      }
      return Promise.resolve();
    }
  });
  return {
    result,
    playedPath
  };
}

describe("emitBubbleNotification", () => {
  it("skips when notifications are disabled", async () => {
    const config = createConfig({
      notifications: {
        enabled: false
      }
    });

    const { result, playedPath } = await runNotification(config, "waiting-human");
    expect(result.reason).toBe("disabled");
    expect(result.delivered).toBe(false);
    expect(playedPath).toBeUndefined();
  });

  it("skips when sound path is not configured", async () => {
    const config = createConfig({
      notifications: {
        enabled: true
      }
    });

    const { result, playedPath } = await runNotification(config, "converged");
    expect(result.reason).toBe("no_sound_configured");
    expect(result.delivered).toBe(false);
    expect(playedPath).toBeUndefined();
  });

  it("skips when sound file is missing", async () => {
    const config = createConfig();

    const { result, playedPath } = await runNotification(config, "waiting-human", {
      pathExistsResult: false
    });
    expect(result.reason).toBe("sound_missing");
    expect(result.delivered).toBe(false);
    expect(playedPath).toBeUndefined();
  });

  it("reports successful delivery", async () => {
    const config = createConfig();

    const { result, playedPath } = await runNotification(config, "converged");
    expect(result.reason).toBeNull();
    expect(result.delivered).toBe(true);
    expect(playedPath).toBe("/tmp/sounds/converged.aiff");
  });

  it("suppresses player failures and reports play_failed", async () => {
    const config = createConfig();

    const { result, playedPath } = await runNotification(config, "waiting-human", {
      playSoundThrows: true
    });
    expect(result.reason).toBe("play_failed");
    expect(result.delivered).toBe(false);
    expect(playedPath).toBe("/tmp/sounds/waiting.aiff");
  });
});
