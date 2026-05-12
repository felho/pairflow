import type { MetaReviewArtifactReadPort } from "../../../../shared/metaReview/metaReviewArtifactIo.js";
import type { ResolveBubbleByIdPort } from "../../../../ports/bubbleLookup.js";
import type {
  ReadDomainStateSnapshotPort,
  WriteDomainStateSnapshotPort
} from "../../../../ports/stateSnapshots.js";
import type {
  AppendProtocolEnvelopePort,
  ReadTranscriptEnvelopesPort
} from "../../../../ports/transcript.js";
import type { SetMetaReviewerPaneBindingPort } from "../../../../ports/runtimeSessions.js";
import type { ApplyMetaReviewGateOnConvergenceDependencies } from "../../../../shared/metaReviewGate/metaReviewGateRuntimeCapabilities.js";
import { MetaReviewGateError } from "../../../../shared/metaReviewGate/metaReviewGateRouteContract.js";

export function requireApplyResolveBubbleById(
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies,
  bubbleId: string
): ResolveBubbleByIdPort {
  if (dependencies.resolveBubbleById !== undefined) {
    return dependencies.resolveBubbleById;
  }
  return buildMissingApplyCapabilityError(
    bubbleId,
    "meta-review gate bubble resolution capability is unavailable."
  );
}

export function requireApplyReadStateSnapshot(
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies,
  bubbleId: string
): ReadDomainStateSnapshotPort {
  if (dependencies.readStateSnapshot !== undefined) {
    return dependencies.readStateSnapshot;
  }
  return buildMissingApplyCapabilityError(
    bubbleId,
    "meta-review gate state read capability is unavailable."
  );
}

export function requireApplyWriteStateSnapshot(
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies,
  bubbleId: string
): WriteDomainStateSnapshotPort {
  if (dependencies.writeStateSnapshot !== undefined) {
    return dependencies.writeStateSnapshot;
  }
  return buildMissingApplyCapabilityError(
    bubbleId,
    "meta-review gate state write capability is unavailable."
  );
}

export function requireApplyAppendProtocolEnvelope(
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies,
  bubbleId: string
): AppendProtocolEnvelopePort {
  if (dependencies.appendProtocolEnvelope !== undefined) {
    return dependencies.appendProtocolEnvelope;
  }
  return buildMissingApplyCapabilityError(
    bubbleId,
    "meta-review gate transcript append capability is unavailable."
  );
}

export function requireApplyReadTranscriptEnvelopes(
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies,
  bubbleId: string
): ReadTranscriptEnvelopesPort {
  if (dependencies.readTranscriptEnvelopes !== undefined) {
    return dependencies.readTranscriptEnvelopes;
  }
  return buildMissingApplyCapabilityError(
    bubbleId,
    "meta-review gate transcript read capability is unavailable."
  );
}

export function requireApplySetMetaReviewerPaneBinding(
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies,
  bubbleId: string
): SetMetaReviewerPaneBindingPort {
  if (dependencies.setMetaReviewerPaneBinding !== undefined) {
    return dependencies.setMetaReviewerPaneBinding;
  }
  return buildMissingApplyCapabilityError(
    bubbleId,
    "meta-review gate pane binding capability is unavailable."
  );
}

export function requireApplyPaneWarningResolver(
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies,
  bubbleId: string
): NonNullable<ApplyMetaReviewGateOnConvergenceDependencies["resolveMetaReviewerPaneWarning"]> {
  if (dependencies.resolveMetaReviewerPaneWarning !== undefined) {
    return dependencies.resolveMetaReviewerPaneWarning;
  }
  return buildMissingApplyCapabilityError(
    bubbleId,
    "meta-review gate pane-binding capability is unavailable."
  );
}

export function requireApplyArtifactReadPort(
  dependencies: ApplyMetaReviewGateOnConvergenceDependencies,
  bubbleId: string
): MetaReviewArtifactReadPort {
  if (dependencies.readFile !== undefined) {
    return dependencies.readFile;
  }
  return buildMissingApplyCapabilityError(
    bubbleId,
    "meta-review gate artifact read capability is unavailable."
  );
}

function buildMissingApplyCapabilityError(
  bubbleId: string,
  message: string
): never {
  throw new MetaReviewGateError(
    "META_REVIEW_GATE_TRANSITION_INVALID",
    `META_REVIEW_GATE_TRANSITION_INVALID: ${message}`,
    {
      bubbleId,
      stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
    }
  );
}
