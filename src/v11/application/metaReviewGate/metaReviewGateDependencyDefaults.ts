type MetaReviewGateDependencyDefaults =
  typeof import("../../../core/bubble/metaReviewGateDefaults.js").metaReviewGateDependencyDefaults;

let metaReviewGateDependencyDefaultsPromise:
  | Promise<MetaReviewGateDependencyDefaults>
  | undefined;

async function loadMetaReviewGateDependencyDefaults(): Promise<MetaReviewGateDependencyDefaults> {
  metaReviewGateDependencyDefaultsPromise ??= import(
    "../../../core/bubble/metaReviewGateDefaults.js"
  ).then(({ metaReviewGateDependencyDefaults }) => metaReviewGateDependencyDefaults);
  return metaReviewGateDependencyDefaultsPromise;
}

export async function resolveMetaReviewGateDependencyDefaults(): Promise<MetaReviewGateDependencyDefaults> {
  return loadMetaReviewGateDependencyDefaults();
}
