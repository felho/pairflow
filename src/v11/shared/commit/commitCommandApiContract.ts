import type { appendProtocolEnvelope } from "../../../core/protocol/transcriptStore.js";
import type { readStateSnapshot, writeStateSnapshot } from "../../../core/state/stateStore.js";
import type { ensureBubbleInstanceIdForMutation } from "../../../core/bubble/bubbleInstanceId.js";
import type { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";

export type ResolvedBubbleContext = Awaited<ReturnType<typeof resolveBubbleById>>;
export type BubbleIdentity = Awaited<ReturnType<typeof ensureBubbleInstanceIdForMutation>>;
export type LoadedState = Awaited<ReturnType<typeof readStateSnapshot>>;
export type AppendedEnvelope = Awaited<ReturnType<typeof appendProtocolEnvelope>>;
export type WrittenState = Awaited<ReturnType<typeof writeStateSnapshot>>;

export interface CommitRuntimeContext {
  resolved: ResolvedBubbleContext;
  bubbleIdentity: BubbleIdentity;
  loadedState: LoadedState;
  state: LoadedState["state"];
  donePackagePath: string;
  donePackageContent: string;
}

export interface CommitGitResult {
  stagedFiles: string[];
  commitMessage: string;
  commitSha: string;
}
