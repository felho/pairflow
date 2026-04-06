import type { appendProtocolEnvelope } from "../../../v11/infrastructure/artifact/transcript/transcriptStore.js";
import type {
  writeStateSnapshot,
  WriteStateSnapshotOptions
} from "../../infrastructure/state/stateStore.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import { buildAskHumanEnvelope } from "./askHumanExecutionArtifacts.js";
import type { ExecuteAskHumanExecutionInput } from "./askHumanFlowContract.js";

export function buildAskHumanAppendEnvelopeInput(
  input: ExecuteAskHumanExecutionInput,
  lockPath: string
): Parameters<typeof appendProtocolEnvelope>[0] {
  return {
    transcriptPath: input.routing.resolved.bubblePaths.transcriptPath,
    mirrorPaths: [input.routing.resolved.bubblePaths.inboxPath],
    lockPath,
    now: input.now,
    envelope: buildAskHumanEnvelope(input)
  };
}

export interface AskHumanWriteSnapshotCallInput {
  statePath: Parameters<typeof writeStateSnapshot>[0];
  state: BubbleStateSnapshot;
  options: WriteStateSnapshotOptions;
}

export function buildAskHumanWriteSnapshotCallInput(
  input: ExecuteAskHumanExecutionInput,
  nextState: BubbleStateSnapshot
): AskHumanWriteSnapshotCallInput {
  return {
    statePath: input.routing.resolved.bubblePaths.statePath,
    state: nextState,
    options: {
      expectedFingerprint: input.routing.loadedState.fingerprint,
      expectedState: "RUNNING"
    }
  };
}
