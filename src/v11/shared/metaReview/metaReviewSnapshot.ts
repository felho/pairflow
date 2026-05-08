export type {
  ActiveMetaReviewRuntimeDeliveryView,
  MetaReviewRuntimeDeliveryCorrelation
} from "./internal/snapshot/metaReviewSnapshot.js";
export {
  buildMetaReviewRuntimeDeliveryCorrelation,
  clearLiveMetaReviewSnapshot,
  normalizeMetaReviewRuntimeDeliveryCorrelation,
  normalizeMetaReviewSnapshot,
  projectActiveMetaReviewRuntimeDelivery,
  resolveActiveMetaReviewRuntimeDelivery
} from "./internal/snapshot/metaReviewSnapshot.js";
