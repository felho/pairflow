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

export async function prepareKickoffPersistence(
  input: PrepareKickoffPersistenceInput
): Promise<PreparedKickoffPersistence> {
  const [previousTaskArtifact, previousBubbleToml] = await Promise.all([
    input.readFile(input.taskArtifactPath, "utf8"),
    input.readFile(input.bubbleTomlPath, "utf8")
  ]);
  const latestConfig = parseBubbleConfigToml(previousBubbleToml);
  const updatedConfig = buildKickoffIdeationConfig({
    bubbleConfig: latestConfig,
    nowIso: input.nowIso
  });

  return {
    previousTaskArtifact,
    previousBubbleToml,
    nextBubbleToml: renderBubbleConfigToml(updatedConfig)
  };
}
