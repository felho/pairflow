import type * as CoreMetaReviewGateDefaults from "../../../core/bubble/metaReviewGateDefaults.js";

let metaReviewGateDependencyDefaultsPromise:
  | Promise<typeof CoreMetaReviewGateDefaults.metaReviewGateDependencyDefaults>
  | undefined;

async function loadMetaReviewGateDependencyDefaults(): Promise<
  typeof CoreMetaReviewGateDefaults.metaReviewGateDependencyDefaults
> {
  metaReviewGateDependencyDefaultsPromise ??= import(
    "../../../core/bubble/metaReviewGateDefaults.js"
  ).then(({ metaReviewGateDependencyDefaults }) => metaReviewGateDependencyDefaults);
  return metaReviewGateDependencyDefaultsPromise;
}

export async function resolveMetaReviewGateDependencyDefaults(): Promise<
  typeof CoreMetaReviewGateDefaults.metaReviewGateDependencyDefaults
> {
  return loadMetaReviewGateDependencyDefaults();
}
