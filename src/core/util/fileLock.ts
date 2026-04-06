// Temporary bridge to the v11 canonical file lock owner.
export type { WithFileLockOptions } from "../../v11/infrastructure/foundation/fs/fileLock.js";
export {
  clearStaleRecoveryMisconfigurationWarnings,
  FileLockTimeoutError,
  withFileLock
} from "../../v11/infrastructure/foundation/fs/fileLock.js";
