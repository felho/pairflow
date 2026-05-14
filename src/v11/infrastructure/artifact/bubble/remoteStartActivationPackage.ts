import type {
  PrepareRemoteStartActivationPackageInput,
  PrepareRemoteStartActivationPackageResult
} from "../../../ports/remoteStartActivationPackage.js";
import {
  RemoteStartControlFilesError
} from "../../../ports/remoteStartControlFiles.js";
import {
  resolveDocContractGateArtifactPath
} from "../gates/docContractGateArtifacts.js";
import { prepareRemoteStartControlFiles } from "./remoteStartControlFiles.js";

export async function prepareRemoteStartActivationPackage(
  input: PrepareRemoteStartActivationPackageInput
): Promise<PrepareRemoteStartActivationPackageResult> {
  try {
    const controlFiles = await prepareRemoteStartControlFiles({
      ...input,
      docContractGateArtifactPath: resolveDocContractGateArtifactPath(
        input.bubblePaths.artifactsDir
      )
    });

    return {
      ok: true,
      package: {
        controlFiles
      }
    };
  } catch (error) {
    if (error instanceof RemoteStartControlFilesError) {
      return {
        ok: false,
        failure: {
          bubbleId: input.bubbleId,
          repoPath: input.repoPath,
          remoteClonePath: input.remoteClonePath,
          ...(error.details.artifactRelativePath !== undefined
            ? { artifactRelativePath: error.details.artifactRelativePath }
            : {}),
          ...(error.details.artifactSourcePath !== undefined
            ? { artifactSourcePath: error.details.artifactSourcePath }
            : {}),
          ...(error.details.artifactKind !== undefined
            ? { artifactKind: error.details.artifactKind }
            : {}),
          ...(error.details.artifactRequirement !== undefined
            ? { artifactRequirement: error.details.artifactRequirement }
            : {}),
          reason: error.message,
          cause: error
        }
      };
    }

    return {
      ok: false,
      failure: {
        bubbleId: input.bubbleId,
        repoPath: input.repoPath,
        remoteClonePath: input.remoteClonePath,
        reason: error instanceof Error ? error.message : String(error),
        cause: error
      }
    };
  }
}
