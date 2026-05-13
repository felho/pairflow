import type { BubbleStateSnapshot } from "../../domain/state/snapshot/bubbleStateSnapshot.js";
import type {
  ProtocolEnvelope
} from "../protocol/protocolEnvelopeContract.js";
import type { MetaReviewResult } from "../metaReview/metaReviewTypes.js";
import type { MetaReviewGateRoute } from "./metaReviewGateRouteContract.js";

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
