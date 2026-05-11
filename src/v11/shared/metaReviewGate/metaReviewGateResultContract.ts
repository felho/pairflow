import type { PersistedBubbleStateSnapshot } from "../../domain/state/snapshot/persistedBubbleStateSnapshot.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type { MetaReviewResult } from "../metaReview/metaReviewTypes.js";
import type { MetaReviewGateRoute } from "./metaReviewGateRouteContract.js";

export interface MetaReviewGateResult {
  bubbleId: string;
  route: MetaReviewGateRoute;
  gateSequence: number;
  gateEnvelope: ProtocolEnvelope;
  state: PersistedBubbleStateSnapshot;
  metaReviewRun?: MetaReviewResult;
  warnings?: string[];
  diagnostics?: string[];
}
