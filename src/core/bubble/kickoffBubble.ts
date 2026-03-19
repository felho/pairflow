import type { readFile, writeFile } from "node:fs/promises";

import type { appendProtocolEnvelope } from "../protocol/transcriptStore.js";
import type { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";
import type { resolveBubbleById } from "./bubbleLookup.js";
import { resolveKickoffDependencies } from "../../v11/shared/kickoff/kickoffDependencyResolution.js";
import { runKickoffFlow, type RunKickoffFlowResult } from "../../v11/application/kickoff/runKickoffFlow.js";

export interface KickoffBubbleInput {
  bubbleId: string;
  repoPath?: string;
  task?: string;
  taskFile?: string;
  cwd?: string;
  now?: Date;
}

export type KickoffBubbleResult = RunKickoffFlowResult;

export interface KickoffBubbleDependencies {
  resolveBubbleById?: typeof resolveBubbleById;
  readStateSnapshot?: typeof readStateSnapshot;
  writeStateSnapshot?: typeof writeStateSnapshot;
  readFile?: typeof readFile;
  writeFile?: typeof writeFile;
  appendProtocolEnvelope?: typeof appendProtocolEnvelope;
}

export async function kickoffBubble(
  input: KickoffBubbleInput,
  dependencies: KickoffBubbleDependencies = {}
): Promise<KickoffBubbleResult> {
  const now = input.now ?? new Date();
  return runKickoffFlow({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.task !== undefined ? { task: input.task } : {}),
    ...(input.taskFile !== undefined ? { taskFile: input.taskFile } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {}),
    now,
    nowIso: now.toISOString()
  }, resolveKickoffDependencies(dependencies));
}
