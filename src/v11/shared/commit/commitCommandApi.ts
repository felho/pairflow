import { resolve } from "node:path";

import { readStateSnapshot } from "../../infrastructure/state/stateStore.js";
import { normalizeStringList } from "../../../core/util/normalize.js";
import { resolveBubbleById } from "../../infrastructure/executor/workspace/bubbleLookup.js";
import { ensureBubbleInstanceIdForMutation } from "../../../core/bubble/bubbleInstanceId.js";
import type {
  CommitBubbleInput,
  CommitBubbleResult
} from "../../application/commit/commitCommandContract.js";
import {
  BubbleCommitError,
  throwAsBubbleCommitError
} from "./commitCommandRuntime.js";
import {
  appendDonePackageEnvelope,
  emitCommitLifecycleEvent,
  persistCommittedThenDoneState
} from "./commitCommandFinalization.js";
import {
  readOrCreateDonePackage
} from "./commitDonePackage.js";
import type {
  CommitRuntimeContext
} from "./commitCommandApiContract.js";
import { runCommitGitStep } from "./commitCommandGitStep.js";
export { BubbleCommitError } from "./commitCommandRuntime.js";

async function prepareCommitRuntimeContext(input: {
  command: CommitBubbleInput;
  now: Date;
  nowIso: string;
  auto: boolean;
}): Promise<CommitRuntimeContext> {
  const resolved = await resolveBubbleById({
    bubbleId: input.command.bubbleId,
    ...(input.command.repoPath !== undefined ? { repoPath: input.command.repoPath } : {}),
    ...(input.command.cwd !== undefined ? { cwd: input.command.cwd } : {})
  });
  const bubbleIdentity = await ensureBubbleInstanceIdForMutation({
    bubbleId: resolved.bubbleId,
    repoPath: resolved.repoPath,
    bubblePaths: resolved.bubblePaths,
    bubbleConfig: resolved.bubbleConfig,
    now: input.now
  });
  resolved.bubbleConfig = bubbleIdentity.bubbleConfig;
  const loadedState = await readStateSnapshot(resolved.bubblePaths.statePath);
  const state = loadedState.state;

  if (state.state !== "APPROVED_FOR_COMMIT") {
    throw new BubbleCommitError(
      `bubble commit can only be used while state is APPROVED_FOR_COMMIT (current: ${state.state}).`
    );
  }

  const donePackagePath = resolve(resolved.bubblePaths.artifactsDir, "done-package.md");
  const donePackageContent = await readOrCreateDonePackage({
    donePackagePath,
    transcriptPath: resolved.bubblePaths.transcriptPath,
    bubbleId: resolved.bubbleId,
    round: state.round,
    nowIso: input.nowIso,
    autoGenerate: input.auto,
    implementer: resolved.bubbleConfig.agents.implementer,
    reviewer: resolved.bubbleConfig.agents.reviewer
  });

  return {
    resolved,
    bubbleIdentity,
    loadedState,
    state,
    donePackagePath,
    donePackageContent
  };
}

export async function commitBubble(
  input: CommitBubbleInput
): Promise<CommitBubbleResult> {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const auto = input.auto ?? false;
  const refs = normalizeStringList(input.refs ?? []);

  const context = await prepareCommitRuntimeContext({
    command: input,
    now,
    nowIso,
    auto
  });

  const { stagedFiles, commitMessage, commitSha } = await runCommitGitStep({
    command: input,
    context,
    auto
  });

  const appended = await appendDonePackageEnvelope({
    context,
    refs,
    now,
    stagedFiles,
    commitMessage,
    commitSha
  });

  const written = await persistCommittedThenDoneState({
    context,
    nowIso,
    appended,
    commitSha
  });

  await emitCommitLifecycleEvent({
    context,
    commitSha,
    commitMessage,
    stagedFiles,
    refs,
    now,
    auto
  });

  return {
    bubbleId: context.resolved.bubbleId,
    sequence: appended.sequence,
    envelope: appended.envelope,
    state: written.state,
    commitSha,
    commitMessage,
    stagedFiles,
    donePackagePath: context.donePackagePath
  };
}

export function asBubbleCommitError(error: unknown): never {
  return throwAsBubbleCommitError(error);
}
