import { isNamedError } from "../../../../shared/errors/namedError.js";
import type { ResolvedMergeCommandDependencies } from "../../mergeCommandDependencyResolution.js";
import type { RunMergeCommandPipelineInput } from "../../mergeCommandContract.js";

const MERGE_CONFLICT_REQUIRES_MANUAL_RESOLUTION =
  "MERGE_CONFLICT_REQUIRES_MANUAL_RESOLUTION";

export async function mergeRevisionIntoLocalBase(input: {
  repoPath: string;
  baseBranch: string;
  mergeRevision: string;
  bubbleBranch: string;
  runGit: ResolvedMergeCommandDependencies["runGit"];
  createError: RunMergeCommandPipelineInput["createError"];
}): Promise<string> {
  await input.runGit(["checkout", input.baseBranch], {
    cwd: input.repoPath
  });

  try {
    await input.runGit(["merge", "--no-ff", "--no-edit", input.mergeRevision], {
      cwd: input.repoPath
    });
  } catch (error) {
    await input.runGit(["merge", "--abort"], {
      cwd: input.repoPath,
      allowFailure: true
    }).catch(() => undefined);
    if (isNamedError(error, "GitCommandError")) {
      throw input.createError({
        reasonCode: MERGE_CONFLICT_REQUIRES_MANUAL_RESOLUTION,
        message:
          `Merge failed for ${input.bubbleBranch} -> ${input.baseBranch}. Resolve conflicts manually.`,
        context: {
          command_name: "merge",
          bubble_branch: input.bubbleBranch,
          base_branch: input.baseBranch
        },
        cause: error
      });
    }
    throw error;
  }

  return (
    await input.runGit(["rev-parse", "HEAD"], {
      cwd: input.repoPath
    })
  ).stdout.trim();
}
