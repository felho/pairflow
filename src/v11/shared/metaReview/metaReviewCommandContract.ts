import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type { MetaReviewGateRoute } from "../metaReviewGate/metaReviewGateTypes.js";
import type { MetaReviewResult } from "./metaReviewTypes.js";

export type {
  MetaReviewDepth,
  MetaReviewLastReportView,
  MetaReviewResult,
  MetaReviewRunWarning,
  MetaReviewStatusView
} from "./metaReviewTypes.js";

export type MetaReviewSubmitResult = Omit<
  MetaReviewResult,
  "bubble_id" | "report_json"
> & {
  bubbleId: string;
  lifecycle_state: BubbleStateSnapshot["state"];
  report_json: Record<string, unknown>;
  gate_route: MetaReviewGateRoute;
  gate_sequence: number;
  gate_envelope_type: ProtocolEnvelope["type"];
};
