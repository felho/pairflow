export interface VerifyRemoteCloneStartAuthorityInput {
  bubbleId: string;
  remoteWorkspaceRoot: string;
  remotePointerPath: string;
}

export type VerifyRemoteCloneStartAuthorityPort = (
  input: VerifyRemoteCloneStartAuthorityInput
) => Promise<void>;
