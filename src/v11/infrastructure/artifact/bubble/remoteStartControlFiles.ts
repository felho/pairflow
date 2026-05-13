import { readFile } from "node:fs/promises";

import { renderBubbleConfigToml } from "../../../../config/bubbleConfig.js";
import type {
  PrepareRemoteStartControlFilesInput,
  RemoteStartControlFile
} from "../../../ports/remoteStartControlFiles.js";
import {
  RemoteStartControlFilesError
} from "../../../ports/remoteStartControlFiles.js";
import { reviewerPolicySnapshotFileName } from "../../../shared/reviewer/reviewerPolicySnapshot.js";

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
  request: PrepareRemoteStartControlFilesInput;
  artifact: RemoteControlArtifactSpec;
}): Promise<string | undefined> {
  try {
    return await readArtifactContent({
      sourcePath: input.artifact.sourcePath,
      required: input.artifact.required
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new RemoteStartControlFilesError({
      message:
        `Bubble ${input.request.bubbleId} remote start could not read `
        + `${input.artifact.required ? "required" : "optional"} local control artifact `
        + `${input.artifact.relativePath}: ${reason}`,
      details: {
        bubbleId: input.request.bubbleId,
        repoPath: input.request.repoPath,
        remoteClonePath: input.request.remoteClonePath,
        artifactRelativePath: input.artifact.relativePath,
        artifactSourcePath: input.artifact.sourcePath,
        artifactKind: input.artifact.artifactKind,
        artifactRequirement: input.artifact.required ? "required" : "optional"
      },
      cause: error
    });
  }
}

function buildRequiredArtifactSpecs(
  input: PrepareRemoteStartControlFilesInput
): RemoteControlArtifactSpec[] {
  return [
    {
      relativePath: `.pairflow/bubbles/${input.bubbleId}/state.json`,
      sourcePath: input.bubblePaths.statePath,
      artifactKind: "state",
      required: true
    },
    {
      relativePath: `.pairflow/bubbles/${input.bubbleId}/transcript.ndjson`,
      sourcePath: input.bubblePaths.transcriptPath,
      artifactKind: "transcript",
      required: true
    },
    {
      relativePath: `.pairflow/bubbles/${input.bubbleId}/inbox.ndjson`,
      sourcePath: input.bubblePaths.inboxPath,
      artifactKind: "inbox",
      required: true
    },
    {
      relativePath: `.pairflow/bubbles/${input.bubbleId}/artifacts/task.md`,
      sourcePath: input.bubblePaths.taskArtifactPath,
      artifactKind: "task",
      required: true
    }
  ];
}

function buildOptionalArtifactSpecs(
  input: PrepareRemoteStartControlFilesInput
): RemoteControlArtifactSpec[] {
  return [
    {
      relativePath: `.pairflow/bubbles/${input.bubbleId}/artifacts/reviewer-focus.json`,
      sourcePath: input.bubblePaths.reviewerFocusArtifactPath,
      artifactKind: "reviewer_focus",
      required: false
    },
    {
      relativePath: `.pairflow/bubbles/${input.bubbleId}/artifacts/${reviewerPolicySnapshotFileName}`,
      sourcePath: input.policySnapshotPathAbs,
      artifactKind: "reviewer_policy_snapshot",
      required: false
    },
    {
      relativePath: `.pairflow/bubbles/${input.bubbleId}/artifacts/reviewer-brief.md`,
      sourcePath: input.bubblePaths.reviewerBriefArtifactPath,
      artifactKind: "reviewer_brief",
      required: false
    },
    {
      relativePath: `.pairflow/bubbles/${input.bubbleId}/artifacts/doc-contract-gates.json`,
      sourcePath: input.docContractGateArtifactPath,
      artifactKind: "doc_contract_gates",
      required: false
    }
  ];
}

async function readArtifactFiles(input: {
  request: PrepareRemoteStartControlFilesInput;
  artifacts: RemoteControlArtifactSpec[];
}): Promise<Array<RemoteStartControlFile | undefined>> {
  return Promise.all(input.artifacts.map(async (artifact) => {
    const content = await readRemoteControlArtifact({
      request: input.request,
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

export async function prepareRemoteStartControlFiles(
  input: PrepareRemoteStartControlFilesInput
): Promise<RemoteStartControlFile[]> {
  try {
    const bubbleTomlPath = `.pairflow/bubbles/${input.bubbleId}/bubble.toml`;
    const remoteBubbleToml = renderBubbleConfigToml({
      ...input.bubbleConfig,
      repo_path: input.remoteClonePath
    });

    const requiredFiles = await readArtifactFiles({
      request: input,
      artifacts: buildRequiredArtifactSpecs(input)
    });
    const optionalFiles = await readArtifactFiles({
      request: input,
      artifacts: buildOptionalArtifactSpecs(input)
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
    if (error instanceof RemoteStartControlFilesError) {
      throw error;
    }
    const reason = error instanceof Error ? error.message : String(error);
    throw new RemoteStartControlFilesError({
      message:
        `Bubble ${input.bubbleId} remote start could not read local control artifacts before remote activation: ${reason}`,
      details: {
        bubbleId: input.bubbleId,
        repoPath: input.repoPath,
        remoteClonePath: input.remoteClonePath
      },
      cause: error
    });
  }
}
