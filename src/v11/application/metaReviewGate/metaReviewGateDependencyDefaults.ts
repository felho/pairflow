import {
  loadMetaReviewGateDependencyDefaults
} from "./metaReviewGateCommandDefaults.js";
import type {
  MetaReviewGateDependencyDefaults
} from "./metaReviewGateCommandDefaults.js";

export async function resolveMetaReviewGateDependencyDefaults(): Promise<
  MetaReviewGateDependencyDefaults
> {
  return loadMetaReviewGateDependencyDefaults();
}
