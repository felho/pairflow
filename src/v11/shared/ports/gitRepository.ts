export class GitRepositoryError extends Error {
  public readonly repoPath: string;

  public constructor(repoPath: string) {
    super(`Not a git repository or bare repository: ${repoPath}`);
    this.name = "GitRepositoryError";
    this.repoPath = repoPath;
  }
}

export type AssertGitRepositoryPort = (
  repoPath: string
) => Promise<void>;
