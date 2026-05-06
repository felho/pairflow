import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type { MetaReviewResult } from "../metaReview/metaReviewTypes.js";
import type { MetaReviewGateRoute } from "../../domain/metaReviewGate/gateRoutingTypes.js";

export interface MetaReviewGateResult {
  bubbleId: string;
  route: MetaReviewGateRoute;
  gateSequence: number;
  gateEnvelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  metaReviewRun?: MetaReviewResult;
  warnings?: string[];
  diagnostics?: string[];
}
