export interface MetaReviewGateTmuxRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface MetaReviewGateTmuxRunOptions {
  cwd?: string;
  allowFailure?: boolean;
}

export type MetaReviewGateTmuxRunner = (
  args: string[],
  options?: MetaReviewGateTmuxRunOptions
) => Promise<MetaReviewGateTmuxRunResult>;
