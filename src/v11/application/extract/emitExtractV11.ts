import type {
  ExtractCommandDependencies,
  ExtractCommandInput,
  ExtractCommandResult
} from "./extractCommandContract.js";
import { extractCommandDependencyDefaults } from "../../defaults/extract/extractCommandDefaults.js";
import { validateExtractCommandPreconditions } from "./extractCommandPreconditions.js";
import { validateExtractPathSelection } from "./extractPathSelection.js";

function findDuplicatePaths(paths: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const path of paths) {
    if (seen.has(path)) {
      duplicates.add(path);
      continue;
    }
    seen.add(path);
  }
  return [...duplicates];
}

export async function extractBubbleV11(
  input: ExtractCommandInput,
  dependencies: ExtractCommandDependencies = extractCommandDependencyDefaults
): Promise<ExtractCommandResult> {
  const preconditions = await validateExtractCommandPreconditions({
    command: input,
    dependencies
  });
  if (preconditions.status !== "preconditions_passed") {
    return preconditions;
  }

  const pathSelection = await validateExtractPathSelection({
    command: input,
    resolvedBubble: preconditions.resolvedBubble,
    targetRepoPath: preconditions.targetRepoPath,
    dependencies
  });
  if (pathSelection.status !== "path_selection_passed") {
    return pathSelection;
  }

  return {
    bubbleId: preconditions.resolvedBubble.bubbleId,
    repoPath: preconditions.targetRepoPath,
    paths: input.paths,
    commitRequested: input.commit,
    ...(input.message !== undefined ? { message: input.message } : {}),
    status: "implementation_deferred",
    reasonCode: "EXTRACT_TRANSFER_NOT_IMPLEMENTED",
    selectedPaths: pathSelection.selectedPaths,
    diagnostics: {
      resolvedBubbleRepoPath: preconditions.resolvedBubble.repoPath,
      targetRepoPath: preconditions.targetRepoPath,
      ...(findDuplicatePaths(input.paths).length > 0
        ? { duplicatePaths: findDuplicatePaths(input.paths) }
        : {}),
      successorContract: "no_overwrite_target_conflict_check"
    }
  };
}
