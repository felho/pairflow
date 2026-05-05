import type {
  ExtractCommandDependencies,
  ExtractCommandInput,
  ExtractCommandResult
} from "./extractCommandContract.js";
import { extractCommandDependencyDefaults } from "../../defaults/extract/extractCommandDefaults.js";
import { validateExtractCommandPreconditions } from "./extractCommandPreconditions.js";
import { validateExtractPathSelection } from "./extractPathSelection.js";
import { transferExtractSelectedPaths } from "./extractTransfer.js";

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

  return transferExtractSelectedPaths({
    command: input,
    bubbleId: preconditions.resolvedBubble.bubbleId,
    targetRepoPath: preconditions.targetRepoPath,
    resolvedBubbleRepoPath: preconditions.resolvedBubble.repoPath,
    selectedPaths: pathSelection.selectedPaths,
    dependencies
  });
}
