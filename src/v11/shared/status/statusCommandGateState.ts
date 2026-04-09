import type { ReviewVerificationState } from "../../../v11/shared/reviewer/reviewVerification.js";
import {
  collectFailingGatesFromArtifact,
  isDocContractGateScopeActive
} from "../../../v11/shared/gates/docContractGates.js";
import {
  statusCommandDependencyDefaults
} from "./statusCommandDependencyDefaults.js";
import type { BubbleFailingGate } from "../../../types/bubble.js";
import type {
  BubbleStatusState,
  ResolvedBubbleStatusContext,
  StatusGateState
} from "./statusCommandTypes.js";

function defaultGateState(round: number): StatusGateState {
  return {
    failingGates: [],
    specLockState: {
      state: "IMPLEMENTABLE",
      open_blocker_count: 0,
      open_required_now_count: 0
    },
    roundGateState: {
      applies: false,
      violated: false,
      round
    }
  };
}

function toStatusSerializationWarning(reason: string): BubbleFailingGate {
  return {
    gate_id: "status.serialization",
    reason_code: "STATUS_GATE_SERIALIZATION_WARNING",
    message: `Status gate artifact parse failed; using fallback defaults. ${reason}`,
    priority: "P2",
    timing: "later-hardening",
    layer: "L1",
    signal_level: "warning"
  };
}

export function withAccuracyCriticalVerificationGate(
  failingGates: BubbleFailingGate[],
  accuracyCritical: boolean,
  verificationStatus: ReviewVerificationState
): BubbleFailingGate[] {
  if (!accuracyCritical || verificationStatus === "pass") {
    return failingGates;
  }
  return [
    ...failingGates,
    {
      gate_id: "accuracy_critical.review_verification",
      reason_code: `ACCURACY_CRITICAL_REVIEW_VERIFICATION_${verificationStatus.toUpperCase()}`,
      message: `Accuracy-critical review verification status is ${verificationStatus}.`,
      priority: "P1",
      timing: "required-now",
      layer: "L1",
      signal_level: "warning"
    }
  ];
}

export async function resolveReviewVerificationState(
  resolved: ResolvedBubbleStatusContext,
  state: BubbleStatusState,
  accuracyCritical: boolean
): Promise<ReviewVerificationState> {
  if (!accuracyCritical) {
    return "missing";
  }
  const verification = await statusCommandDependencyDefaults.readReviewVerificationArtifactStatus(
    resolved.bubblePaths.reviewVerificationArtifactPath,
    {
      expectedRound: state.round,
      expectedReviewer: resolved.bubbleConfig.agents.reviewer
    }
  );
  return verification.status;
}

export async function resolveStatusGateState(
  resolved: ResolvedBubbleStatusContext,
  round: number
): Promise<StatusGateState> {
  const defaults = defaultGateState(round);
  const docGateScopeActive = isDocContractGateScopeActive({
    reviewArtifactType: resolved.bubbleConfig.review_artifact_type
  });
  if (!docGateScopeActive) {
    return defaults;
  }

  try {
    const gateArtifact = await statusCommandDependencyDefaults.readDocContractGateArtifact(
      statusCommandDependencyDefaults.resolveDocContractGateArtifactPath(
        resolved.bubblePaths.artifactsDir
      )
    );
    if (gateArtifact === undefined) {
      return defaults;
    }
    return {
      failingGates: collectFailingGatesFromArtifact(gateArtifact),
      specLockState: gateArtifact.spec_lock_state,
      roundGateState: gateArtifact.round_gate_state
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      ...defaults,
      failingGates: [toStatusSerializationWarning(reason)]
    };
  }
}
