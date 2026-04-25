import type {
  ImportRemoteBubbleCommitContinuityInput,
  ImportRemoteBubbleCommitContinuityResult
} from "../../../application/commit/commitRemotePorts.js";
import { shellQuote } from "../../../shared/foundation/shellQuote.js";
import { parseEnvelopeLine } from "../../../shared/protocol/envelope.js";
import {
  assertSingleTokenPairflowCommand,
  buildSshCommandArgs
} from "./sshBubbleStart.js";
import {
  extractRemoteCommitMarkerPayload,
  RemoteBubbleCommitCommandError,
  summarizeRemoteCommitTransportOutput,
  validateRemoteCommitCompletionPayload
} from "./sshBubbleCommitCommand.js";
import { runCommandDefault } from "./sshBubbleStatus.js";

const remoteCommitImportStateStartMarker =
  "__PAIRFLOW_REMOTE_COMMIT_IMPORT_STATE_START__";
const remoteCommitImportStateEndMarker =
  "__PAIRFLOW_REMOTE_COMMIT_IMPORT_STATE_END__";
const remoteCommitImportTranscriptStartMarker =
  "__PAIRFLOW_REMOTE_COMMIT_IMPORT_TRANSCRIPT_START__";
const remoteCommitImportTranscriptEndMarker =
  "__PAIRFLOW_REMOTE_COMMIT_IMPORT_TRANSCRIPT_END__";
const remoteCommitImportHeadShaStartMarker =
  "__PAIRFLOW_REMOTE_COMMIT_IMPORT_HEAD_SHA_START__";
const remoteCommitImportHeadShaEndMarker =
  "__PAIRFLOW_REMOTE_COMMIT_IMPORT_HEAD_SHA_END__";
const remoteCommitImportHeadMessageStartMarker =
  "__PAIRFLOW_REMOTE_COMMIT_IMPORT_HEAD_MESSAGE_START__";
const remoteCommitImportHeadMessageEndMarker =
  "__PAIRFLOW_REMOTE_COMMIT_IMPORT_HEAD_MESSAGE_END__";
const remoteCommitImportStagedFilesStartMarker =
  "__PAIRFLOW_REMOTE_COMMIT_IMPORT_STAGED_FILES_START__";
const remoteCommitImportStagedFilesEndMarker =
  "__PAIRFLOW_REMOTE_COMMIT_IMPORT_STAGED_FILES_END__";

export interface RemoteBubbleCommitContinuityImportDependencies {
  runCommand?: (
    command: string,
    args: string[]
  ) => Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }>;
}

export function buildRemoteBubbleCommitContinuityImportScript(
  input: ImportRemoteBubbleCommitContinuityInput
): string {
  assertSingleTokenPairflowCommand(input.remoteTarget.pairflowCommand);
  const bubbleDir = `${input.remoteClonePath}/.pairflow/bubbles/${input.bubbleId}`;
  const statePath = `${bubbleDir}/state.json`;
  const transcriptPath = `${bubbleDir}/transcript.ndjson`;
  const readTranscriptCommitShaScript =
    "const fs=require('fs');"
    + "const path=process.argv[1];"
    + "if(!fs.existsSync(path))process.exit(0);"
    + "const lines=fs.readFileSync(path,'utf8').trim().split(/\\r?\\n/u).filter(Boolean);"
    + "if(lines.length===0)process.exit(0);"
    + "try{"
    + "const envelope=JSON.parse(lines.at(-1));"
    + "const sha=envelope?.payload?.metadata?.commit_sha;"
    + "if(typeof sha==='string'&&sha.length>0)process.stdout.write(sha);"
    + "}catch{}";

  return [
    "set -euo pipefail",
    `cd ${shellQuote(input.remoteClonePath)}`,
    `export PAIRFLOW_WORKTREE_ROOT=${shellQuote(input.remoteClonePath)}`,
    `printf '%s\\n' ${shellQuote(remoteCommitImportStateStartMarker)}`,
    `if [ -e ${shellQuote(statePath)} ]; then cat ${shellQuote(statePath)}; fi`,
    `printf '%s\\n' ${shellQuote(remoteCommitImportStateEndMarker)}`,
    `printf '%s\\n' ${shellQuote(remoteCommitImportTranscriptStartMarker)}`,
    `if [ -e ${shellQuote(transcriptPath)} ]; then cat ${shellQuote(transcriptPath)}; fi`,
    `printf '%s\\n' ${shellQuote(remoteCommitImportTranscriptEndMarker)}`,
    `commit_sha_for_facts=$(node -e ${shellQuote(readTranscriptCommitShaScript)} ${shellQuote(transcriptPath)})`,
    `printf '%s\\n' ${shellQuote(remoteCommitImportHeadShaStartMarker)}`,
    `if [ -n "$commit_sha_for_facts" ]; then git rev-parse "$commit_sha_for_facts^{commit}"; fi`,
    `printf '%s\\n' ${shellQuote(remoteCommitImportHeadShaEndMarker)}`,
    `printf '%s\\n' ${shellQuote(remoteCommitImportHeadMessageStartMarker)}`,
    `if [ -n "$commit_sha_for_facts" ]; then git log -1 --pretty=%s "$commit_sha_for_facts"; fi`,
    `printf '%s\\n' ${shellQuote(remoteCommitImportHeadMessageEndMarker)}`,
    `printf '%s\\n' ${shellQuote(remoteCommitImportStagedFilesStartMarker)}`,
    `if [ -n "$commit_sha_for_facts" ]; then git diff-tree --no-commit-id --name-only -r "$commit_sha_for_facts"; fi`,
    `printf '%s\\n' ${shellQuote(remoteCommitImportStagedFilesEndMarker)}`
  ].join("\n");
}

function parseOutputLines(stdout: string): string[] {
  return stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function parseRequiredLine(input: {
  raw: string;
  bubbleId: string;
  label: string;
}): string {
  const trimmed = input.raw.trim();
  if (trimmed.length === 0) {
    throw new RemoteBubbleCommitCommandError({
      code: "REMOTE_COMMIT_PAYLOAD_INVALID",
      message:
        `Remote commit continuity import returned an empty ${input.label} payload for bubble ${input.bubbleId}.`
    });
  }
  return trimmed;
}

function transcriptTailType(raw: string): string | undefined {
  const tail = raw
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .at(-1);
  if (tail === undefined) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(tail) as { type?: unknown };
    if (parsed.type === "DONE_PACKAGE") {
      return parsed.type;
    }
  } catch {
    // Fall through to validated envelope parsing to preserve invalid-line detection.
  }
  try {
    return parseEnvelopeLine(tail).type;
  } catch {
    return "invalid";
  }
}

function readStateName(raw: string): string | undefined {
  if (raw.trim().length === 0) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw) as { state?: unknown };
    return typeof parsed.state === "string" ? parsed.state : "invalid";
  } catch {
    return "invalid";
  }
}

function classifyRemoteContinuityPayload(input: {
  bubbleId: string;
  stateContent: string;
  transcriptContent: string;
  commitShaContent: string;
  commitMessageContent: string;
  stagedFilesContent: string;
}): ImportRemoteBubbleCommitContinuityResult {
  const stateName = readStateName(input.stateContent);
  if (stateName === "DONE") {
    const tailType = transcriptTailType(input.transcriptContent);
    if (tailType === "DONE_PACKAGE") {
      throw new RemoteBubbleCommitCommandError({
        code: "REMOTE_COMMIT_PAYLOAD_INVALID",
        message:
          `Remote commit continuity import found legacy DONE_PACKAGE transcript tail for DONE bubble ${input.bubbleId}.`
      });
    }
    const commitSha = parseRequiredLine({
      raw: input.commitShaContent,
      bubbleId: input.bubbleId,
      label: "commit sha"
    });
    const commitMessage = parseRequiredLine({
      raw: input.commitMessageContent,
      bubbleId: input.bubbleId,
      label: "commit message"
    });
    const stagedFiles = parseOutputLines(input.stagedFilesContent);
    return {
      classification: "imported_remote_completion",
      ...validateRemoteCommitCompletionPayload({
        bubbleId: input.bubbleId,
        stateContent: input.stateContent,
        transcriptContent: input.transcriptContent,
        commitSha,
        commitMessage,
        stagedFiles
      })
    };
  }

  if (stateName === "invalid") {
    throw new RemoteBubbleCommitCommandError({
      code: "REMOTE_COMMIT_PAYLOAD_INVALID",
      message:
        `Remote commit continuity import found invalid state payload for bubble ${input.bubbleId}.`
    });
  }

  const tailType = transcriptTailType(input.transcriptContent);
  if (tailType === "COMMIT_RESULT" || tailType === "DONE_PACKAGE") {
    throw new RemoteBubbleCommitCommandError({
      code: "REMOTE_COMMIT_PAYLOAD_INVALID",
      message:
        `Remote commit continuity import found ${tailType} transcript tail while remote state is ${
          stateName ?? "missing"
        } for bubble ${input.bubbleId}.`
    });
  }

  return {
    classification: "no_remote_completion_evidence",
    reason:
      stateName === undefined
        ? "remote continuity state is missing"
        : `remote continuity state is ${stateName}`
  };
}

export async function importRemoteBubbleCommitContinuity(
  input: ImportRemoteBubbleCommitContinuityInput,
  dependencies: RemoteBubbleCommitContinuityImportDependencies = {}
): Promise<ImportRemoteBubbleCommitContinuityResult> {
  const runCommand = dependencies.runCommand ?? runCommandDefault;
  const target =
    input.remoteTarget.user !== undefined
      ? `${input.remoteTarget.user}@${input.remoteTarget.host}`
      : input.remoteTarget.host;
  const script = buildRemoteBubbleCommitContinuityImportScript(input);

  let result: Awaited<ReturnType<NonNullable<typeof dependencies.runCommand>>>;
  try {
    result = await runCommand(
      "ssh",
      buildSshCommandArgs({ target, script })
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new RemoteBubbleCommitCommandError({
      code: "REMOTE_COMMIT_TRANSPORT_FAILED",
      message:
        `Remote commit continuity import failed before completion: ${summarizeRemoteCommitTransportOutput(reason)}`,
      context: {
        bubble_id: input.bubbleId,
        command_name: "commit",
        remote_host: input.remoteTarget.host
      },
      cause: error
    });
  }

  if (result.exitCode !== 0) {
    const detailSource = result.stderr.trim().length > 0
      ? result.stderr
      : result.stdout;
    throw new RemoteBubbleCommitCommandError({
      code: "REMOTE_COMMIT_TRANSPORT_FAILED",
      message:
        `Remote commit continuity import ssh transport failed (exit ${result.exitCode}): ${summarizeRemoteCommitTransportOutput(detailSource)}`,
      context: {
        bubble_id: input.bubbleId,
        command_name: "commit",
        remote_host: input.remoteTarget.host,
        exit_code: result.exitCode
      }
    });
  }

  const stateContent = extractRemoteCommitMarkerPayload({
    stdout: result.stdout,
    startMarker: remoteCommitImportStateStartMarker,
    endMarker: remoteCommitImportStateEndMarker,
    label: "state"
  });
  const transcriptContent = extractRemoteCommitMarkerPayload({
    stdout: result.stdout,
    startMarker: remoteCommitImportTranscriptStartMarker,
    endMarker: remoteCommitImportTranscriptEndMarker,
    label: "transcript"
  });
  const commitShaContent = extractRemoteCommitMarkerPayload({
    stdout: result.stdout,
    startMarker: remoteCommitImportHeadShaStartMarker,
    endMarker: remoteCommitImportHeadShaEndMarker,
    label: "commit-sha"
  });
  const commitMessageContent = extractRemoteCommitMarkerPayload({
    stdout: result.stdout,
    startMarker: remoteCommitImportHeadMessageStartMarker,
    endMarker: remoteCommitImportHeadMessageEndMarker,
    label: "commit-message"
  });
  const stagedFilesContent = extractRemoteCommitMarkerPayload({
    stdout: result.stdout,
    startMarker: remoteCommitImportStagedFilesStartMarker,
    endMarker: remoteCommitImportStagedFilesEndMarker,
    label: "staged-files"
  });

  return classifyRemoteContinuityPayload({
    bubbleId: input.bubbleId,
    stateContent,
    transcriptContent,
    commitShaContent,
    commitMessageContent,
    stagedFilesContent
  });
}
