import { isNamedError } from "../../../../shared/errors/namedError.js";
import type { BubbleRemoteStateCache } from "../../../../shared/remote/remoteStateCacheTypes.js";
import type { ListReadModelDependencies } from "../../listReadModelDependencies.js";

export async function readRemoteStateCacheSafe(
  path: string,
  dependencies: ListReadModelDependencies
): Promise<{
  cache: BubbleRemoteStateCache | null;
  cacheStatus: "present" | "missing" | "invalid";
}> {
  try {
    const cache = await dependencies.readRemoteStateCache(path);
    return {
      cache,
      cacheStatus: cache === null ? "missing" : "present"
    };
  } catch (error) {
    if (isNamedError(error, "SchemaValidationError")) {
      return {
        cache: null,
        cacheStatus: "invalid"
      };
    }
    throw error;
  }
}
