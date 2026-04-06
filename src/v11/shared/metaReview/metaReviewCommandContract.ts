import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type { MetaReviewGateRoute } from "../metaReviewGate/metaReviewGateTypes.js";
import type { MetaReviewRunResult } from "./metaReviewTypes.js";

export type {
  MetaReviewDepth,
  MetaReviewLastReportView,
  MetaReviewResult,
  MetaReviewRunResult,
  MetaReviewRunWarning,
  MetaReviewStatusView
} from "./metaReviewTypes.js";

export type MetaReviewSubmitResult = Omit<
  MetaReviewRunResult,
  "depth" | "report_json"
> & {
  report_json: Record<string, unknown>;
  gate_route: MetaReviewGateRoute;
  gate_sequence: number;
  gate_envelope_type: ProtocolEnvelope["type"];
};
