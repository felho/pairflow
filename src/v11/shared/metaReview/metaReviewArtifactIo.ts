export type MetaReviewArtifactReadPort = (
  artifactPath: string,
  encoding: "utf8"
) => Promise<string>;
