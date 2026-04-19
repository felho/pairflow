import {
  loadMetaReviewGateDependencyDefaults
} from "./metaReviewGateCommandDefaults.js";
import type {
  MetaReviewGateDependencyDefaults
} from "../../defaults/metaReviewGate/metaReviewGateCommandDefaults.js";

export async function resolveMetaReviewGateDependencyDefaults(): Promise<
  MetaReviewGateDependencyDefaults
> {
  return loadMetaReviewGateDependencyDefaults();
}
