export interface RepoRegistryEntry {
  repoPath: string;
  addedAt: string;
  label?: string | undefined;
}

export interface RegisterRepoInput {
  repoPath: string;
  label?: string | undefined;
  now?: Date | undefined;
  registryPath?: string | undefined;
  lockTimeoutMs?: number | undefined;
}

export interface RegisterRepoResult {
  added: boolean;
  entry: RepoRegistryEntry;
  registryPath: string;
}

export type RegisterRepoInRegistryPort = (
  input: RegisterRepoInput
) => Promise<RegisterRepoResult>;
