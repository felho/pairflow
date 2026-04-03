import { readFile, writeFile } from "node:fs/promises";

import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes
} from "../../../core/protocol/transcriptStore.js";
import { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import { setMetaReviewerPaneBinding } from "../../../core/runtime/sessionsRegistry.js";
import {
  readStateSnapshot,
  writeStateSnapshot,
  type LoadedStateSnapshot
} from "../../../core/state/stateStore.js";
import { writeRecoveredMetaReviewArtifacts } from "./metaReviewGateRunResultArtifacts.js";
import {
  MetaReviewGateError,
  type MetaReviewGateResult,
  type RecoverMetaReviewGateFromSnapshotDependencies
} from "./metaReviewGateTypes.js";
import { isMetaReviewExecutionContextActiveState } from "../../../core/bubble/metaReviewExecutionContext.js";

export interface ResolvedRecoveryContextDependencies {
  resolveBubble: typeof resolveBubbleById;
  readState: typeof readStateSnapshot;
  writeState: typeof writeStateSnapshot;
  appendEnvelope: typeof appendProtocolEnvelope;
  readTranscript: typeof readTranscriptEnvelopes;
  setMetaReviewerPane: typeof setMetaReviewerPaneBinding;
  readFileFn: typeof readFile;
  writeFileFn: typeof writeFile;
}

export function resolveRecoveryContextDependencies(
  dependencies: RecoverMetaReviewGateFromSnapshotDependencies
): ResolvedRecoveryContextDependencies {
  return {
    resolveBubble: dependencies.resolveBubbleById ?? resolveBubbleById,
    readState: dependencies.readStateSnapshot ?? readStateSnapshot,
    writeState: dependencies.writeStateSnapshot ?? writeStateSnapshot,
    appendEnvelope: dependencies.appendProtocolEnvelope ?? appendProtocolEnvelope,
    readTranscript: dependencies.readTranscriptEnvelopes ?? readTranscriptEnvelopes,
    setMetaReviewerPane:
      dependencies.setMetaReviewerPaneBinding ?? setMetaReviewerPaneBinding,
    readFileFn: dependencies.readFile ?? readFile,
    writeFileFn: dependencies.writeFile ?? writeFile
  };
}

export function buildDeactivateMetaReviewerPane(input: {
  setMetaReviewerPane: typeof setMetaReviewerPaneBinding;
  sessionsPath: string;
  bubbleId: string;
  now: Date;
}): () => Promise<string | null> {
  return async (): Promise<string | null> => {
    try {
      await input.setMetaReviewerPane({
        sessionsPath: input.sessionsPath,
        bubbleId: input.bubbleId,
        active: false,
        now: input.now
      });
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  };
}

export function buildFinishWithPaneDeactivation(input: {
  bubbleId: string;
  nowIso: string;
  writeFileFn: typeof writeFile;
  artifactsPaths: {
    metaReviewLastJsonArtifactPath: string;
  };
  deactivateMetaReviewerPane: () => Promise<string | null>;
}): (result: MetaReviewGateResult) => Promise<MetaReviewGateResult> {
  return async (result: MetaReviewGateResult): Promise<MetaReviewGateResult> => {
    let finalizedResult = result;
    if (result.metaReviewRun !== undefined) {
      const artifactWrite = await writeRecoveredMetaReviewArtifacts({
        bubbleId: input.bubbleId,
        round: result.state.round,
        nowIso: input.nowIso,
        runResult: result.metaReviewRun,
        paths: input.artifactsPaths,
        writeFileFn: input.writeFileFn
      });
      if (artifactWrite.warnings.length > 0) {
        finalizedResult = {
          ...result,
          metaReviewRun: {
            ...result.metaReviewRun,
            warnings: [
              ...result.metaReviewRun.warnings,
              ...artifactWrite.warnings
            ]
          }
        };
      }
    }
    await input.deactivateMetaReviewerPane();
    return finalizedResult;
  };
}

export function assertRecoverableMetaReviewState(
  loaded: LoadedStateSnapshot
): void {
  if (!isMetaReviewExecutionContextActiveState(loaded.state)) {
    // reason_code=META_REVIEW_GATE_TRANSITION_INVALID expected_state current_state
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_TRANSITION_INVALID",
      `META_REVIEW_GATE_TRANSITION_INVALID: meta-review gate recovery requires RUNNING state with active meta-review authority (current: ${loaded.state.state}).`,
      {
        stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
      }
    );
  }
}
