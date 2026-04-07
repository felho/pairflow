export type MetaReviewArtifactReadPort = (
  artifactPath: string,
  encoding: "utf8"
) => Promise<string>;

export type MetaReviewArtifactWritePort = (
  artifactPath: string,
  contents: string,
  encoding: "utf8"
) => Promise<void>;
