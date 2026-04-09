import type { ResolvedBubbleById } from "../../shared/ports/bubbleLookup.js";
import {
  IDEATION_KICKOFF_NOT_ALLOWED,
  IDEATION_KICKOFF_TASK_INVALID,
  IDEATION_METADATA_PARSE_WARNING
} from "../../shared/ideation/ideationReasonCodes.js";
import {
  hasIdeationMetadataParseWarning
} from "../../domain/ideation/ideationMetadata.js";
import {
  kickoffBubbleV11 as kickoffBubble,
  type KickoffBubbleV11Result as KickoffBubbleResult
} from "./emitKickoffV11.js";
import { kickoffDefaults } from "../../../core/bubble/kickoffDefaults.js";
import { parseBubbleKickoffCommandOptions } from "./kickoffCliOptions.js";

export interface BubbleKickoffCommandDependencies {
  resolveBubbleById?: (input: {
    bubbleId: string;
    repoPath?: string;
    cwd?: string;
  }) => Promise<ResolvedBubbleById>;
  kickoffBubble?: typeof kickoffBubble;
  writeStderr?: (message: string) => void;
}

export async function runBubbleKickoffCommand(
  args: string[],
  cwd: string = process.cwd(),
  dependencies: BubbleKickoffCommandDependencies = {}
): Promise<KickoffBubbleResult | null> {
  const options = parseBubbleKickoffCommandOptions(args);
  if (options.help) {
    return null;
  }

  const resolveBubbleByIdCommand =
    dependencies.resolveBubbleById ?? kickoffDefaults.resolveBubbleById;
  const kickoffBubbleCommand = dependencies.kickoffBubble ?? kickoffBubble;
  const writeStderr = dependencies.writeStderr ?? ((message: string) => {
    process.stderr.write(message);
  });

  const resolved = await resolveBubbleByIdCommand({
    bubbleId: options.id,
    ...(options.repo !== undefined ? { repoPath: options.repo } : {}),
    cwd
  });
  if (hasIdeationMetadataParseWarning(resolved.bubbleConfig)) {
    writeStderr(
      `${IDEATION_METADATA_PARSE_WARNING}: bubble ${options.id} has invalid ideation metadata; kickoff is disabled.\n`
    );
    throw new Error(
      `${IDEATION_KICKOFF_NOT_ALLOWED}: bubble kickoff rejected for ${options.id}.`
    );
  }

  const result = await kickoffBubbleCommand({
    bubbleId: options.id,
    ...(options.repo !== undefined ? { repoPath: options.repo } : {}),
    ...(options.task !== undefined ? { task: options.task } : {}),
    ...(options.taskFile !== undefined ? { taskFile: options.taskFile } : {}),
    cwd
  });

  if (!result.ok) {
    throw new Error(
      `${result.reason_code ?? IDEATION_KICKOFF_TASK_INVALID}: bubble kickoff rejected for ${result.bubble_id}.`
    );
  }
  return result;
}
