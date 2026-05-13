import {
  appendProtocolEnvelope
} from "../../../start/startCommandDependencyDefaults.js";
import type {
  RepeatCleanAutoconvergeReasonCode,
  RepeatCleanAutoconvergeReasonDetail
} from "../../../../domain/convergence/repeatCleanAutoconverge.js";
import type { Finding } from "../../../../../contracts/kernel/findings.js";
import type { PassIntent } from "../../../../../contracts/kernel/protocol.js";
import type { ProtocolEnvelope } from "../../../../shared/protocol/protocolEnvelopeContract.js";
import { buildPassEnvelopeDraft } from "../../../../domain/pass/passEnvelopeDraft.js";
import type { ResolvedPassHandoff } from "../../../../domain/pass/handoff.js";
import type {
  ReviewerFindingsClaim,
  ReviewerFindingsClaimParserMetadata
} from "../../../../domain/pass/reviewerFindingsClaim.js";
import type {
  AppendProtocolEnvelopePort,
  AppendProtocolEnvelopeResult
} from "../../../../ports/transcript.js";

export interface ExecuteNormalPassAppendInput {
  transcriptPath: string;
  lockPath: string;
  now: Date;
  bubbleId: string;
  handoff: Pick<
    ResolvedPassHandoff,
    "senderAgent" | "recipientAgent" | "senderRole" | "recipientRole" | "envelopeRound"
  >;
  summary: string;
  passIntent: PassIntent;
  refs: string[];
  hasFindings: boolean;
  findingsForPayload: Finding[];
  reviewerFindingsClaim?: ReviewerFindingsClaim;
  reviewerFindingsClaimParserMetadata?: ReviewerFindingsClaimParserMetadata;
  repeatCleanReasonCode: RepeatCleanAutoconvergeReasonCode;
  repeatCleanReasonDetail: RepeatCleanAutoconvergeReasonDetail;
  repeatCleanTrigger: boolean;
  mostRecentPreviousReviewerCleanPassEnvelope: boolean;
}

export interface ExecuteNormalPassAppendDependencies {
  appendProtocolEnvelope?: AppendProtocolEnvelopePort;
  buildPassEnvelopeDraft?: typeof buildPassEnvelopeDraft;
}

export interface ExecuteNormalPassAppendResult {
  sequence: number;
  envelope: ProtocolEnvelope;
}

function mapAppendResult(
  result: AppendProtocolEnvelopeResult
): ExecuteNormalPassAppendResult {
  return {
    sequence: result.sequence,
    envelope: result.envelope
  };
}

export async function executeNormalPassAppend(
  input: ExecuteNormalPassAppendInput,
  dependencies: ExecuteNormalPassAppendDependencies = {}
): Promise<ExecuteNormalPassAppendResult> {
  const appendEnvelope =
    dependencies.appendProtocolEnvelope ?? appendProtocolEnvelope;
  const buildEnvelopeDraft =
    dependencies.buildPassEnvelopeDraft ?? buildPassEnvelopeDraft;

  const appendResult = await appendEnvelope({
    transcriptPath: input.transcriptPath,
    lockPath: input.lockPath,
    now: input.now,
    envelope: buildEnvelopeDraft({
      bubbleId: input.bubbleId,
      handoff: input.handoff,
      summary: input.summary,
      passIntent: input.passIntent,
      refs: input.refs,
      hasFindings: input.hasFindings,
      findingsForPayload: input.findingsForPayload,
      ...(input.reviewerFindingsClaim !== undefined
        ? { reviewerFindingsClaim: input.reviewerFindingsClaim }
        : {}),
      ...(input.reviewerFindingsClaimParserMetadata !== undefined
        ? {
            reviewerFindingsClaimParserMetadata:
              input.reviewerFindingsClaimParserMetadata
          }
        : {}),
      transitionDecision: "normal_pass",
      repeatCleanReasonCode: input.repeatCleanReasonCode,
      repeatCleanReasonDetail: input.repeatCleanReasonDetail,
      repeatCleanTrigger: input.repeatCleanTrigger,
      mostRecentPreviousReviewerCleanPassEnvelope:
        input.mostRecentPreviousReviewerCleanPassEnvelope
    })
  });

  return mapAppendResult(appendResult);
}
