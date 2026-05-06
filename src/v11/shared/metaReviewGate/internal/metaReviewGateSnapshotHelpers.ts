import type { BubbleAgentsConfig } from "../../../../types/bubble.js";
import { resolveConfiguredAgentForRole } from "../../../../types/bubble.js";
import {
  resolveFindingsParityMetadataForEnvelope as resolveFindingsParityMetadataForEnvelopeFromProtocol,
  type FindingsParityMetadata
} from "../../../../types/protocol.js";

export function resolveMetaReviewerAgent(agents: BubbleAgentsConfig) {
  return resolveConfiguredAgentForRole({
    agents,
    role: "meta_reviewer"
  });
}

export function resolveFindingsParityMetadataForEnvelope(
  metadata: FindingsParityMetadata | null | undefined
): Record<string, unknown> {
  return resolveFindingsParityMetadataForEnvelopeFromProtocol(metadata);
}
