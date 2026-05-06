import type { MetaReviewResult } from "../../../shared/metaReview/metaReviewTypes.js";
import type {
  AppendProtocolEnvelopePort
} from "../../../shared/ports/transcript.js";
import type { LoadedStateSnapshot } from "../../../shared/ports/stateSnapshots.js";
import type { AgentName } from "../../../../types/bubble.js";
import type { Finding } from "../../../../types/findings.js";
import {
  deliveryTargetRoleMetadataKey,
  resolveFindingsParityMetadataForEnvelope,
  type FindingsParityMetadata
} from "../../../../types/protocol.js";
import { buildGateLockPath } from "./metaReviewGateShared.js";

export async function appendAutoReworkDecision(input: {
  finalizeInput: {
    resolved: {
      bubbleId: string;
      bubbleConfig: {
        agents: {
          implementer: AgentName;
          meta_reviewer: AgentName;
        };
      };
      bubblePaths: {
        inboxPath: string;
        locksDir: string;
        transcriptPath: string;
      };
    };
    now: Date;
    refs: string[];
    appendEnvelope: AppendProtocolEnvelopePort;
  };
  resumedWritten: LoadedStateSnapshot;
  runResultForRouting: MetaReviewResult;
  parityMetadata: FindingsParityMetadata | null;
  findingsForPayload: Finding[] | undefined;
  reworkMessage: string;
}): Promise<Awaited<ReturnType<AppendProtocolEnvelopePort>>> {
  return await input.finalizeInput.appendEnvelope({
    transcriptPath: input.finalizeInput.resolved.bubblePaths.transcriptPath,
    mirrorPaths: [input.finalizeInput.resolved.bubblePaths.inboxPath],
    lockPath: buildGateLockPath({
      locksDir: input.finalizeInput.resolved.bubblePaths.locksDir,
      bubbleId: input.finalizeInput.resolved.bubbleId
    }),
    now: input.finalizeInput.now,
    envelope: {
      bubble_id: input.finalizeInput.resolved.bubbleId,
      sender: "orchestrator",
      recipient: input.finalizeInput.resolved.bubbleConfig.agents.implementer,
      type: "APPROVAL_DECISION",
      // The resumed RUNNING state is already persisted on the next round,
      // so transcript authority must use that same round for later observation reconciliation.
      round: input.resumedWritten.state.round,
      payload: {
        decision: "rework",
        message: input.reworkMessage,
        ...(input.findingsForPayload !== undefined
          ? { findings: input.findingsForPayload }
          : {}),
        metadata: {
          [deliveryTargetRoleMetadataKey]: "implementer",
          actor: "meta-reviewer",
          actor_agent:
            input.finalizeInput.resolved.bubbleConfig.agents.meta_reviewer,
          recommendation: input.runResultForRouting.recommendation,
          ...(input.runResultForRouting.run_id !== undefined
            ? { run_id: input.runResultForRouting.run_id }
            : {}),
          ...resolveFindingsParityMetadataForEnvelope(input.parityMetadata)
        }
      },
      refs: input.finalizeInput.refs
    }
  });
}
