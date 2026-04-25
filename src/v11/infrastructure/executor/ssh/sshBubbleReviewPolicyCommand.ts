import { shellQuote } from "../../../shared/foundation/shellQuote.js";
import type {
  BubbleReviewAutoReworkSeverity,
  BubbleReviewLoopMode,
  BubbleReviewPolicyRuntimeView
} from "../../../../types/bubble.js";
import type { RemoteBubbleStatusTarget } from "./sshBubbleStatus.js";
import { runCommandDefault } from "./sshBubbleStatus.js";
import {
  buildSshCommandArgs,
  buildSshTarget
} from "./sshBubbleStartShared.js";

const remoteReviewPolicyResultStartMarker =
  "__PAIRFLOW_REMOTE_REVIEW_POLICY_RESULT_START__";
const remoteReviewPolicyResultEndMarker =
  "__PAIRFLOW_REMOTE_REVIEW_POLICY_RESULT_END__";

export interface ExecuteRemoteBubbleReviewPolicyCommandInput {
  bubbleId: string;
  remoteClonePath: string;
  remoteTarget: RemoteBubbleStatusTarget;
  reviewLoopMode: BubbleReviewLoopMode;
  metaReviewAutoReworkMinSeverity?: BubbleReviewAutoReworkSeverity;
}

export interface RemoteBubbleReviewPolicyUpdatedResult {
  kind: "review_policy_updated";
  bubbleId: string;
  reviewPolicy: BubbleReviewPolicyRuntimeView;
  previousRequestedLoopMode: BubbleReviewLoopMode;
  nextRequestedLoopMode: BubbleReviewLoopMode;
  activationChange: "none";
  bubbleToml: string;
}

export interface RemoteBubbleReviewPolicyConflictResult {
  kind: "conflict";
  reasonCode: string;
  currentBubbleToml?: string;
  currentReviewPolicy?: BubbleReviewPolicyRuntimeView;
  currentState?: string;
}

export type ExecuteRemoteBubbleReviewPolicyCommandResult =
  | RemoteBubbleReviewPolicyUpdatedResult
  | RemoteBubbleReviewPolicyConflictResult;

export interface RemoteBubbleReviewPolicyCommandDependencies {
  runCommand?: (
    command: string,
    args: string[]
  ) => Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }>;
}

export class RemoteBubbleReviewPolicyCommandError extends Error {
  public readonly code:
    | "REMOTE_REVIEW_POLICY_TRANSPORT_FAILED"
    | "REMOTE_REVIEW_POLICY_PAYLOAD_INVALID";
  public readonly reasonCode?: string;

  public constructor(input: {
    code:
      | "REMOTE_REVIEW_POLICY_TRANSPORT_FAILED"
      | "REMOTE_REVIEW_POLICY_PAYLOAD_INVALID";
    message: string;
    cause?: unknown;
    reasonCode?: string;
  }) {
    super(input.message, input.cause === undefined ? undefined : { cause: input.cause });
    this.name = "RemoteBubbleReviewPolicyCommandError";
    this.code = input.code;
    if (input.reasonCode !== undefined) {
      this.reasonCode = input.reasonCode;
    }
  }
}

function summarizeTransportOutput(output: string): string {
  const normalized = output.replace(/\s+/gu, " ").trim();
  if (normalized.length === 0) {
    return "<empty>";
  }
  return normalized.slice(0, 200);
}

function extractMarkerPayload(input: {
  stdout: string;
  startMarker: string;
  endMarker: string;
}): string {
  const startIndex = input.stdout.indexOf(input.startMarker);
  const endIndex = input.stdout.indexOf(input.endMarker);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new RemoteBubbleReviewPolicyCommandError({
      code: "REMOTE_REVIEW_POLICY_PAYLOAD_INVALID",
      reasonCode: "REMOTE_REVIEW_POLICY_MARKERS_MISSING",
      message: "Remote review-policy update did not return a marked result payload."
    });
  }
  return input.stdout
    .slice(startIndex + input.startMarker.length, endIndex)
    .trim();
}

export function buildRemoteBubbleReviewPolicyScript(
  input: ExecuteRemoteBubbleReviewPolicyCommandInput
): string {
  const metaSeverity =
    input.metaReviewAutoReworkMinSeverity === undefined
      ? "undefined"
      : JSON.stringify(input.metaReviewAutoReworkMinSeverity);

  const nodeScript = `
import { pathToFileURL } from "node:url";

const bubbleId = ${JSON.stringify(input.bubbleId)};
const repoPath = ${JSON.stringify(input.remoteClonePath)};
const reviewLoopMode = ${JSON.stringify(input.reviewLoopMode)};
const metaReviewAutoReworkMinSeverity = ${metaSeverity};
const baseUrl = pathToFileURL(repoPath.endsWith("/") ? repoPath : repoPath + "/");
const { updateBubbleReviewPolicy } = await import(new URL("dist/v11/shared/reviewPolicy/updateBubbleReviewPolicy.js", baseUrl).href);
const { buildBubbleReviewPolicyRuntimeView } = await import(new URL("dist/v11/shared/reviewPolicy/reviewPolicyRuntime.js", baseUrl).href);
const { isReviewPolicyMutableState } = await import(new URL("dist/v11/shared/reviewPolicy/reviewPolicyMutationEligibility.js", baseUrl).href);
const { readStateSnapshot, withStateWriteLock } = await import(new URL("dist/v11/infrastructure/state/stateStore.js", baseUrl).href);

const bubbleDir = repoPath + "/.pairflow/bubbles/" + bubbleId;
const statePath = bubbleDir + "/state.json";
const bubbleTomlPath = bubbleDir + "/bubble.toml";

const result = await withStateWriteLock(statePath, 5000, async () => {
  const loadedState = await readStateSnapshot(statePath);
  if (!isReviewPolicyMutableState(loadedState.state.state)) {
    return {
      kind: "conflict",
      reasonCode: "REVIEW_POLICY_STATE_CONFLICT",
      currentState: loadedState.state.state
    };
  }

  const updated = await updateBubbleReviewPolicy({
    bubbleTomlPath,
    patch: {
      review_loop_mode: reviewLoopMode,
      ...(metaReviewAutoReworkMinSeverity === undefined
        ? {}
        : { meta_review_auto_rework_min_severity: metaReviewAutoReworkMinSeverity })
    }
  });

  if (updated.kind === "conflict") {
    return {
      kind: "conflict",
      reasonCode: updated.reasonCode,
      currentBubbleToml: updated.currentBubbleToml,
      currentReviewPolicy: buildBubbleReviewPolicyRuntimeView(updated.currentConfig)
    };
  }

  const previousPolicy = buildBubbleReviewPolicyRuntimeView(updated.previousConfig);
  const nextPolicy = buildBubbleReviewPolicyRuntimeView(updated.nextConfig);
  return {
    kind: "review_policy_updated",
    bubbleId,
    reviewPolicy: nextPolicy,
    previousRequestedLoopMode: previousPolicy.requested_loop_mode,
    nextRequestedLoopMode: nextPolicy.requested_loop_mode,
    activationChange: "none",
    bubbleToml: updated.nextBubbleToml
  };
});

console.log(${JSON.stringify(remoteReviewPolicyResultStartMarker)});
console.log(JSON.stringify(result));
console.log(${JSON.stringify(remoteReviewPolicyResultEndMarker)});
`;

  return [
    "set -euo pipefail",
    `cd ${shellQuote(input.remoteClonePath)}`,
    "node --input-type=module <<'PAIRFLOW_REMOTE_REVIEW_POLICY_NODE'",
    nodeScript,
    "PAIRFLOW_REMOTE_REVIEW_POLICY_NODE"
  ].join("\n");
}

function parseRemoteBubbleReviewPolicyResult(
  stdout: string
): ExecuteRemoteBubbleReviewPolicyCommandResult {
  const payload = extractMarkerPayload({
    stdout,
    startMarker: remoteReviewPolicyResultStartMarker,
    endMarker: remoteReviewPolicyResultEndMarker
  });
  try {
    const parsed = JSON.parse(payload) as ExecuteRemoteBubbleReviewPolicyCommandResult;
    if (parsed.kind === "review_policy_updated" || parsed.kind === "conflict") {
      return parsed;
    }
  } catch (error) {
    throw new RemoteBubbleReviewPolicyCommandError({
      code: "REMOTE_REVIEW_POLICY_PAYLOAD_INVALID",
      reasonCode: "REMOTE_REVIEW_POLICY_JSON_INVALID",
      message: "Remote review-policy update returned invalid JSON.",
      cause: error
    });
  }
  throw new RemoteBubbleReviewPolicyCommandError({
    code: "REMOTE_REVIEW_POLICY_PAYLOAD_INVALID",
    reasonCode: "REMOTE_REVIEW_POLICY_KIND_INVALID",
    message: "Remote review-policy update returned an unsupported result kind."
  });
}

export async function executeRemoteBubbleReviewPolicyCommand(
  input: ExecuteRemoteBubbleReviewPolicyCommandInput,
  dependencies: RemoteBubbleReviewPolicyCommandDependencies = {}
): Promise<ExecuteRemoteBubbleReviewPolicyCommandResult> {
  const runCommand = dependencies.runCommand ?? runCommandDefault;
  const script = buildRemoteBubbleReviewPolicyScript(input);
  let result;
  try {
    result = await runCommand(
      "ssh",
      buildSshCommandArgs({
        target: buildSshTarget(input.remoteTarget),
        script
      })
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new RemoteBubbleReviewPolicyCommandError({
      code: "REMOTE_REVIEW_POLICY_TRANSPORT_FAILED",
      reasonCode: "REMOTE_REVIEW_POLICY_TRANSPORT_INVOKE_FAILED",
      message:
        `ssh transport failed before completion: ${summarizeTransportOutput(reason)}`,
      cause: error
    });
  }

  if (result.exitCode !== 0) {
    const detailSource =
      result.stderr.trim().length > 0 ? result.stderr : result.stdout;
    throw new RemoteBubbleReviewPolicyCommandError({
      code: "REMOTE_REVIEW_POLICY_TRANSPORT_FAILED",
      reasonCode: "REMOTE_REVIEW_POLICY_TRANSPORT_EXIT_FAILED",
      message:
        `ssh transport failed (exit ${result.exitCode}): `
        + summarizeTransportOutput(detailSource)
    });
  }

  return parseRemoteBubbleReviewPolicyResult(result.stdout);
}
