import { readFile } from "node:fs/promises";

import { renderBubbleConfigToml } from "../../../config/bubbleConfig.js";
import { resolveDocContractGateArtifactPath } from "../../shared/gates/docContractGateArtifactDefaults.js";
import type { RemoteStartControlFile } from "./startCommandContract.js";
import type { StartExecutionContext } from "./startCommandContext.js";
import {
  StartBubbleError,
  createStartBubbleError
} from "./startCommandRuntime.js";

interface RemoteControlArtifactSpec {
  relativePath: string;
  sourcePath: string;
  artifactKind:
    | "state"
    | "transcript"
    | "inbox"
    | "task"
    | "reviewer_focus"
    | "reviewer_policy_snapshot"
    | "reviewer_brief"
    | "doc_contract_gates";
  required: boolean;
}

async function readArtifactContent(input: {
  sourcePath: string;
  required: boolean;
}): Promise<string | undefined> {
  return readFile(input.sourcePath, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (!input.required && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  });
}

async function readRemoteControlArtifact(input: {
  context: StartExecutionContext;
  remoteClonePath: string;
  artifact: RemoteControlArtifactSpec;
}): Promise<string | undefined> {
  try {
    return await readArtifactContent({
      sourcePath: input.artifact.sourcePath,
      required: input.artifact.required
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw createStartBubbleError({
      reasonCode: "START_REMOTE_CONTROL_FILES_UNAVAILABLE",
      message:
        `Bubble ${input.context.resolved.bubbleId} remote start could not read `
        + `${input.artifact.required ? "required" : "optional"} local control artifact `
        + `${input.artifact.relativePath}: ${reason}`,
      context: {
        bubble_id: input.context.resolved.bubbleId,
        repo_path: input.context.resolved.repoPath,
        remote_clone_path: input.remoteClonePath,
        artifact_relative_path: input.artifact.relativePath,
        artifact_source_path: input.artifact.sourcePath,
        artifact_kind: input.artifact.artifactKind,
        artifact_requirement: input.artifact.required ? "required" : "optional"
      },
      cause: error
    });
  }
}

function buildRequiredArtifactSpecs(
  context: StartExecutionContext
): RemoteControlArtifactSpec[] {
  return [
    {
      relativePath: `.pairflow/bubbles/${context.resolved.bubbleId}/state.json`,
      sourcePath: context.resolved.bubblePaths.statePath,
      artifactKind: "state",
      required: true
    },
    {
      relativePath: `.pairflow/bubbles/${context.resolved.bubbleId}/transcript.ndjson`,
      sourcePath: context.resolved.bubblePaths.transcriptPath,
      artifactKind: "transcript",
      required: true
    },
    {
      relativePath: `.pairflow/bubbles/${context.resolved.bubbleId}/inbox.ndjson`,
      sourcePath: context.resolved.bubblePaths.inboxPath,
      artifactKind: "inbox",
      required: true
    },
    {
      relativePath: `.pairflow/bubbles/${context.resolved.bubbleId}/artifacts/task.md`,
      sourcePath: context.resolved.bubblePaths.taskArtifactPath,
      artifactKind: "task",
      required: true
    }
  ];
}

function buildOptionalArtifactSpecs(
  context: StartExecutionContext
): RemoteControlArtifactSpec[] {
  return [
    {
      relativePath: `.pairflow/bubbles/${context.resolved.bubbleId}/artifacts/reviewer-focus.json`,
      sourcePath: context.resolved.bubblePaths.reviewerFocusArtifactPath,
      artifactKind: "reviewer_focus",
      required: false
    },
    {
      relativePath: `.pairflow/bubbles/${context.resolved.bubbleId}/artifacts/reviewer-policy-snapshot.md`,
      sourcePath: context.policySnapshotPathAbs,
      artifactKind: "reviewer_policy_snapshot",
      required: false
    },
    {
      relativePath: `.pairflow/bubbles/${context.resolved.bubbleId}/artifacts/reviewer-brief.md`,
      sourcePath: context.resolved.bubblePaths.reviewerBriefArtifactPath,
      artifactKind: "reviewer_brief",
      required: false
    },
    {
      relativePath: `.pairflow/bubbles/${context.resolved.bubbleId}/artifacts/doc-contract-gates.json`,
      sourcePath: resolveDocContractGateArtifactPath(context.resolved.bubblePaths.artifactsDir),
      artifactKind: "doc_contract_gates",
      required: false
    }
  ];
}

async function readArtifactFiles(input: {
  context: StartExecutionContext;
  remoteClonePath: string;
  artifacts: RemoteControlArtifactSpec[];
}): Promise<Array<RemoteStartControlFile | undefined>> {
  return Promise.all(input.artifacts.map(async (artifact) => {
    const content = await readRemoteControlArtifact({
      context: input.context,
      remoteClonePath: input.remoteClonePath,
      artifact
    });
    if (content === undefined) {
      return undefined;
    }
    return {
      relativePath: artifact.relativePath,
      content
    };
  }));
}

export async function buildRemoteControlFiles(input: {
  context: StartExecutionContext;
  remoteClonePath: string;
}): Promise<RemoteStartControlFile[]> {
  try {
    const bubbleTomlPath = `.pairflow/bubbles/${input.context.resolved.bubbleId}/bubble.toml`;
    const remoteBubbleToml = renderBubbleConfigToml({
      ...input.context.resolved.bubbleConfig,
      repo_path: input.remoteClonePath
    });

    const requiredFiles = await readArtifactFiles({
      context: input.context,
      remoteClonePath: input.remoteClonePath,
      artifacts: buildRequiredArtifactSpecs(input.context)
    });
    const optionalFiles = await readArtifactFiles({
      context: input.context,
      remoteClonePath: input.remoteClonePath,
      artifacts: buildOptionalArtifactSpecs(input.context)
    });

    return [
      {
        relativePath: bubbleTomlPath,
        content: `${remoteBubbleToml}\n`
      },
      ...requiredFiles.filter((value): value is RemoteStartControlFile => value !== undefined),
      ...optionalFiles.filter((value): value is RemoteStartControlFile => value !== undefined)
    ];
  } catch (error) {
    if (error instanceof StartBubbleError) {
      throw error;
    }
    const reason = error instanceof Error ? error.message : String(error);
    throw createStartBubbleError({
      reasonCode: "START_REMOTE_CONTROL_FILES_UNAVAILABLE",
      message:
        `Bubble ${input.context.resolved.bubbleId} remote start could not read local control artifacts before remote activation: ${reason}`,
      context: {
        bubble_id: input.context.resolved.bubbleId,
        repo_path: input.context.resolved.repoPath,
        remote_clone_path: input.remoteClonePath
      },
      cause: error
    });
  }
}
