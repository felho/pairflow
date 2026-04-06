// Temporary bridge: v11/shared/approval owns canonical pending approval signal
// semantics. Keep this shim until legacy core imports are removed.
export {
  buildCanonicalPendingApprovalSignal,
  isHumanApprovalState,
  resolveCanonicalPendingApprovalSignal,
  resolveLatestPendingApprovalRequest
} from "../../v11/shared/approval/pendingApprovalSignal.js";
export type {
  BuildCanonicalPendingApprovalSignalInput,
  PendingApprovalSignal,
  ResolveCanonicalPendingApprovalSignalInput
} from "../../v11/shared/approval/pendingApprovalSignal.js";
