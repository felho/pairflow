import type { EmitConvergedDependencies } from "../../../../shared/converged/convergedCommandTypes.js";
import type {
  ResolveReviewVerificationInputFromRefsPort,
  WriteReviewVerificationArtifactAtomicPort
} from "../../../../ports/reviewVerificationArtifacts.js";
import type { ResolvePassValidationForPassDependencies } from "../verification/passValidationGate.js";
import type { PassDeliveryDependencies } from "../reviewerDelivery/reviewerDelivery.js";
import type { UpdateReviewerDocGateArtifactDependencies } from "../reviewerDelivery/reviewerDocGateArtifactUpdater.js";

export interface PassFlowRuntimeDependencies extends PassDeliveryDependencies {
  emitBubbleNotification?: EmitConvergedDependencies["emitBubbleNotification"];
  readDocContractGateArtifact?:
    UpdateReviewerDocGateArtifactDependencies["readDocContractGateArtifact"];
  resolveDocContractGateArtifactPath?:
    UpdateReviewerDocGateArtifactDependencies["resolveDocContractGateArtifactPath"];
  writeDocContractGateArtifact?:
    UpdateReviewerDocGateArtifactDependencies["writeDocContractGateArtifact"];
  writeReviewVerificationArtifactAtomic?:
    WriteReviewVerificationArtifactAtomicPort;
  resolveReviewVerificationInputFromRefs?:
    ResolveReviewVerificationInputFromRefsPort;
  resolvePassValidationPolicy?:
    ResolvePassValidationForPassDependencies["resolvePassValidationPolicy"];
  runPassValidationCommand?:
    ResolvePassValidationForPassDependencies["runPassValidationCommand"];
  buildPassValidationEvidenceArtifact?:
    ResolvePassValidationForPassDependencies["buildPassValidationEvidenceArtifact"];
  createPassValidationReviewerDirective?:
    ResolvePassValidationForPassDependencies["createPassValidationReviewerDirective"];
  resolvePassValidationArtifactPath?:
    ResolvePassValidationForPassDependencies["resolvePassValidationArtifactPath"];
  resolvePassValidationReviewerCompatibilityArtifactPath?:
    ResolvePassValidationForPassDependencies["resolvePassValidationReviewerCompatibilityArtifactPath"];
  isPassValidationRunnerExecutionError?:
    ResolvePassValidationForPassDependencies["isPassValidationRunnerExecutionError"];
  writePassValidationEvidenceArtifact?:
    ResolvePassValidationForPassDependencies["writePassValidationEvidenceArtifact"];
  writePassValidationReviewerCompatibilityArtifact?:
    ResolvePassValidationForPassDependencies["writePassValidationReviewerCompatibilityArtifact"];
}
