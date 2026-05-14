import type { BubbleConfig } from "../shared/config/bubbleConfigTypes.js";
import type { BubblePaths } from "../shared/bubble/bubblePaths.js";
import type { RemoteStartControlFile } from "./remoteStartControlFiles.js";

export type { RemoteStartControlFile };

export interface PrepareRemoteStartActivationPackageInput {
  bubbleId: string;
  repoPath: string;
  bubblePaths: BubblePaths;
  bubbleConfig: BubbleConfig;
  remoteClonePath: string;
  policySnapshotPathAbs: string;
}

export interface RemoteStartActivationPackage {
  controlFiles: RemoteStartControlFile[];
}

export interface RemoteStartActivationPackageFailure {
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
  reason: string;
  cause?: unknown;
}

export type PrepareRemoteStartActivationPackageResult =
  | {
      ok: true;
      package: RemoteStartActivationPackage;
    }
  | {
      ok: false;
      failure: RemoteStartActivationPackageFailure;
    };

export type PrepareRemoteStartActivationPackagePort = (
  input: PrepareRemoteStartActivationPackageInput
) => Promise<PrepareRemoteStartActivationPackageResult>;
