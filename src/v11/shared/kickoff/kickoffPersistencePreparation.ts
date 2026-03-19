import { parseBubbleConfigToml, renderBubbleConfigToml } from "../../../config/bubbleConfig.js";
import { buildKickoffIdeationConfig } from "./kickoffIdeationConfig.js";

export interface PrepareKickoffPersistenceInput {
  taskArtifactPath: string;
  bubbleTomlPath: string;
  nowIso: string;
  readFile: (path: string, encoding: "utf8") => Promise<string>;
}

export interface PreparedKickoffPersistence {
  previousTaskArtifact: string;
  previousBubbleToml: string;
  nextBubbleToml: string;
}

async function readKickoffPreviousArtifacts(input: {
  taskArtifactPath: string;
  bubbleTomlPath: string;
  readFile: (path: string, encoding: "utf8") => Promise<string>;
}): Promise<{
  previousTaskArtifact: string;
  previousBubbleToml: string;
}> {
  const [previousTaskArtifact, previousBubbleToml] = await Promise.all([
    input.readFile(input.taskArtifactPath, "utf8"),
    input.readFile(input.bubbleTomlPath, "utf8")
  ]);
  return {
    previousTaskArtifact,
    previousBubbleToml
  };
}

function buildKickoffNextBubbleToml(input: {
  previousBubbleToml: string;
  nowIso: string;
}): string {
  const latestConfig = parseBubbleConfigToml(input.previousBubbleToml);
  const updatedConfig = buildKickoffIdeationConfig({
    bubbleConfig: latestConfig,
    nowIso: input.nowIso
  });
  return renderBubbleConfigToml(updatedConfig);
}

export async function prepareKickoffPersistence(
  input: PrepareKickoffPersistenceInput
): Promise<PreparedKickoffPersistence> {
  const previousArtifacts = await readKickoffPreviousArtifacts({
    taskArtifactPath: input.taskArtifactPath,
    bubbleTomlPath: input.bubbleTomlPath,
    readFile: input.readFile
  });

  return {
    previousTaskArtifact: previousArtifacts.previousTaskArtifact,
    previousBubbleToml: previousArtifacts.previousBubbleToml,
    nextBubbleToml: buildKickoffNextBubbleToml({
      previousBubbleToml: previousArtifacts.previousBubbleToml,
      nowIso: input.nowIso
    })
  };
}
