export interface GitRunOptions {
  cwd: string;
  allowFailure?: boolean;
}

export interface GitRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export type RunGitPort = (
  args: string[],
  options: GitRunOptions
) => Promise<GitRunResult>;
