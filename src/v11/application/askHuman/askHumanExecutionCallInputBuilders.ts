import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import { buildAskHumanEnvelope } from "./askHumanExecutionArtifacts.js";
import type { ExecuteAskHumanExecutionInput } from "./askHumanFlowContract.js";
import type { AppendProtocolEnvelopeInput } from "../../ports/transcript.js";
import type {
  WriteStateSnapshotOptions,
  WriteStateSnapshotPort
} from "../../ports/stateSnapshots.js";

export function buildAskHumanAppendEnvelopeInput(
  input: ExecuteAskHumanExecutionInput,
  lockPath: string
): AppendProtocolEnvelopeInput {
  return {
    transcriptPath: input.routing.resolved.bubblePaths.transcriptPath,
    mirrorPaths: [input.routing.resolved.bubblePaths.inboxPath],
    lockPath,
    now: input.now,
    envelope: buildAskHumanEnvelope(input)
  };
}

export interface AskHumanWriteSnapshotCallInput {
  statePath: Parameters<WriteStateSnapshotPort>[0];
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
