import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { parseBubbleConfigToml, renderBubbleConfigToml } from "../../config/bubbleConfig.js";
import type { BubbleConfig } from "../../types/bubble.js";
import type { BubblePaths } from "./paths.js";
import { emitBubbleLifecycleEventBestEffort } from "../metrics/bubbleEvents.js";
import { FileLockTimeoutError, withFileLock } from "../util/fileLock.js";

const bubbleInstanceIdPattern =
  /^[A-Za-z0-9][A-Za-z0-9_-]{9,127}$/u;

export interface EnsureBubbleInstanceIdForMutationInput {
  bubbleId: string;
  repoPath: string;
  bubblePaths: BubblePaths;
  bubbleConfig: BubbleConfig;
  now?: Date;
}

export interface EnsureBubbleInstanceIdForMutationResult {
  bubbleInstanceId: string;
  bubbleConfig: BubbleConfig;
  backfilled: boolean;
}

export class BubbleInstanceIdError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "BubbleInstanceIdError";
  }
}

export function isBubbleInstanceId(value: unknown): value is string {
  return typeof value === "string" && bubbleInstanceIdPattern.test(value);
}

export function generateBubbleInstanceId(now: Date = new Date()): string {
  // Time-prefixed opaque identifier for stable cross-lifecycle analytics joins.
  const timestamp = now.getTime().toString(36).padStart(10, "0");
  const entropy = randomBytes(10).toString("hex");
  return `bi_${timestamp}_${entropy}`;
}

export async function ensureBubbleInstanceIdForMutation(
  input: EnsureBubbleInstanceIdForMutationInput
): Promise<EnsureBubbleInstanceIdForMutationResult> {
  const existing = input.bubbleConfig.bubble_instance_id;
  if (isBubbleInstanceId(existing)) {
    return {
      bubbleInstanceId: existing,
      bubbleConfig: input.bubbleConfig,
      backfilled: false
    };
  }

  const lockPath = join(input.bubblePaths.locksDir, `${input.bubbleId}.lock`);

  let result: EnsureBubbleInstanceIdForMutationResult;
  try {
    result = await withFileLock(
      {
        lockPath,
        timeoutMs: 5_000,
        ensureParentDir: true
      },
      async () => {
        const rawBubbleConfig = await readFile(input.bubblePaths.bubbleTomlPath, "utf8");
        const parsed = parseBubbleConfigToml(rawBubbleConfig);

        if (parsed.id !== input.bubbleId) {
          throw new BubbleInstanceIdError(
            `Bubble config id mismatch while ensuring bubble_instance_id: expected ${input.bubbleId}, found ${parsed.id}`
          );
        }

        if (isBubbleInstanceId(parsed.bubble_instance_id)) {
          return {
            bubbleInstanceId: parsed.bubble_instance_id,
            bubbleConfig: parsed,
            backfilled: false
          };
        }

        const bubbleInstanceId = generateBubbleInstanceId(input.now);
        const updatedConfig: BubbleConfig = {
          ...parsed,
          bubble_instance_id: bubbleInstanceId
        };

        await writeFile(
          input.bubblePaths.bubbleTomlPath,
          renderBubbleConfigToml(updatedConfig),
          {
            encoding: "utf8"
          }
        );

        return {
          bubbleInstanceId,
          bubbleConfig: updatedConfig,
          backfilled: true
        };
      }
    );
  } catch (error) {
    if (error instanceof FileLockTimeoutError) {
      throw new BubbleInstanceIdError(
        `Could not acquire bubble lock while ensuring bubble_instance_id: ${lockPath}`
      );
    }

    if (error instanceof BubbleInstanceIdError) {
      throw error;
    }

    const reason = error instanceof Error ? error.message : String(error);
    throw new BubbleInstanceIdError(
      `Failed to ensure bubble_instance_id for bubble ${input.bubbleId}: ${reason}`
    );
  }

  if (result.backfilled) {
    await emitBubbleLifecycleEventBestEffort({
      repoPath: input.repoPath,
      bubbleId: input.bubbleId,
      bubbleInstanceId: result.bubbleInstanceId,
      eventType: "bubble_instance_backfilled",
      round: null,
      actorRole: "orchestrator",
      metadata: {
        migration: "bubble_instance_id_backfill",
        source: "legacy_bubble_toml_without_bubble_instance_id"
      },
      ...(input.now !== undefined ? { now: input.now } : {})
    });
  }

  return result;
}
