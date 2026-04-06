export {
  readRepoRegistry,
  registerRepoInRegistry,
  removeRepoFromRegistry,
  resolveRepoRegistryPath,
  RepoRegistryError,
  RepoRegistryLockError
} from "../../v11/infrastructure/executor/workspace/repoRegistry.js";
export type {
  ReadRepoRegistryInput,
  ReadRepoRegistryResult,
  RegisterRepoInput,
  RegisterRepoResult,
  RemoveRepoInput,
  RemoveRepoResult,
  RepoRegistryEntry
} from "../../v11/infrastructure/executor/workspace/repoRegistry.js";
