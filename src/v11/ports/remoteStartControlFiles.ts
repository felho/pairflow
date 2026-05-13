import type { BubbleConfig } from "../shared/config/bubbleConfigTypes.js";
import type { BubblePaths } from "../shared/bubble/bubblePaths.js";

export interface RemoteStartControlFile {
  relativePath: string;
  content: string;
}

export interface PrepareRemoteStartControlFilesInput {
  bubbleId: string;
  repoPath: string;
  bubblePaths: BubblePaths;
  bubbleConfig: BubbleConfig;
  remoteClonePath: string;
  policySnapshotPathAbs: string;
  docContractGateArtifactPath: string;
}

export type PrepareRemoteStartControlFilesPort = (
  input: PrepareRemoteStartControlFilesInput
) => Promise<RemoteStartControlFile[]>;

export class RemoteStartControlFilesError extends Error {
  readonly code = "REMOTE_START_CONTROL_FILES_UNAVAILABLE";
  readonly details: {
    bubbleId: string;
    repoPath: string;
    remoteClonePath: string;
    artifactRelativePath?: string;
    artifactSourcePath?: string;
    artifactKind?:
      | "state"
      | "transcript"
      | "inbox"
      | "task"
      | "reviewer_focus"
      | "reviewer_policy_snapshot"
      | "reviewer_brief"
      | "doc_contract_gates";
    artifactRequirement?: "required" | "optional";
  };

  constructor(input: {
    message: string;
    details: RemoteStartControlFilesError["details"];
    cause?: unknown;
  }) {
    super(input.message, { cause: input.cause });
    this.name = "RemoteStartControlFilesError";
    this.details = input.details;
  }
}
