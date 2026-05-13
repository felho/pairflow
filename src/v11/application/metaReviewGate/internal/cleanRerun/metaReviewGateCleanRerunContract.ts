import type { MetaReviewResult } from "../../../../shared/metaReview/metaReviewTypes.js";
import type { FindingsParityMetadata } from "../../../../shared/metaReviewGate/findingsParityMetadataContract.js";
import type { FinalizeCurrentRunMetaReviewGateInput } from "../../../../shared/metaReviewGate/metaReviewGateCurrentRunTypes.js";

export type MetaReviewPaneWarningResult = Awaited<
  ReturnType<
    NonNullable<FinalizeCurrentRunMetaReviewGateInput["resolvePaneWarning"]>
  >
>;

export interface RouteCleanMetaReviewRerunInput {
  finalizeInput: FinalizeCurrentRunMetaReviewGateInput;
  runResultForRouting: MetaReviewResult;
  parityMetadata: FindingsParityMetadata | null;
  updatedStreak: number;
}

export type CleanRerunDeliveryCapableInput =
  FinalizeCurrentRunMetaReviewGateInput & {
    readState: NonNullable<FinalizeCurrentRunMetaReviewGateInput["readState"]>;
    readTranscript: NonNullable<FinalizeCurrentRunMetaReviewGateInput["readTranscript"]>;
    setMetaReviewerPane: NonNullable<
      FinalizeCurrentRunMetaReviewGateInput["setMetaReviewerPane"]
    >;
    resolvePaneWarning: NonNullable<
      FinalizeCurrentRunMetaReviewGateInput["resolvePaneWarning"]
    >;
    resolved: FinalizeCurrentRunMetaReviewGateInput["resolved"] & {
      bubblePaths: FinalizeCurrentRunMetaReviewGateInput["resolved"]["bubblePaths"] & {
        sessionsPath: string;
        taskArtifactPath: string;
      };
    };
  };

export function hasCleanRerunDeliveryCapabilities(
  input: FinalizeCurrentRunMetaReviewGateInput
): input is CleanRerunDeliveryCapableInput {
  return (
    input.readState !== undefined &&
    input.readTranscript !== undefined &&
    input.setMetaReviewerPane !== undefined &&
    input.resolvePaneWarning !== undefined &&
    input.resolved.bubblePaths.sessionsPath !== undefined &&
    input.resolved.bubblePaths.taskArtifactPath !== undefined
  );
}
