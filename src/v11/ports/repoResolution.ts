export interface ResolveRepoPathInput {
  repoPath?: string | undefined;
  cwd?: string | undefined;
}

export type ResolveRepoPathPort = (
  input?: ResolveRepoPathInput
) => Promise<string>;
