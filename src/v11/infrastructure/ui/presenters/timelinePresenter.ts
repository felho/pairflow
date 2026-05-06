import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { resolveBubbleById } from "../../executor/workspace/bubbleLookup.js";
import { readRemotePointer } from "../../artifact/bubble/remoteExecutionArtifacts.js";
import { readTranscriptEnvelopes } from "../../artifact/transcript/transcriptStore.js";
import {
  resolveRemoteBubbleStatusTarget,
  runCommandDefault
} from "../../executor/ssh/sshBubbleStatus.js";
import type {
  ProtocolEnvelope,
  ProtocolEnvelopePayload
} from "../../../../types/protocol.js";
import type { Finding } from "../../../../types/findings.js";
import {
  isFindingLayer,
  isFindingPriority,
  isFindingSeverity,
  isFindingTiming
} from "../../../../types/findings.js";
import {
  isApprovalDecision,
  isFindingsClaimSource,
  isFindingsClaimState,
  isPassIntent,
  isProtocolMessageType
} from "../../../../types/protocol.js";
import type {
  UiTimelineEntry,
  UiTimelineEntryPayload,
  UiTimelineFinding
} from "../../../../contracts/ui/uiReadModel.js";
import {
  isInteger,
  isNonEmptyString,
  isRecord
} from "../../../shared/validation/primitives.js";
import { shellQuote } from "../../../shared/foundation/shellQuote.js";
import {
  attachTimelineDisplay,
  type TimelineEntryWithoutDisplay
} from "./timelineDisplayPresenter.js";

export interface ReadBubbleTimelineInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
}

interface ReadBubbleTimelineDependencies {
  resolveBubbleById?: typeof resolveBubbleById;
  readRemotePointer?: typeof readRemotePointer;
  resolveRemoteBubbleStatusTarget?: typeof resolveRemoteBubbleStatusTarget;
  runCommand?: typeof runCommandDefault;
}

const remoteTimelineCommandTimeoutMs = 10_000;

const sshTransportOptions = [
  ["BatchMode", "yes"],
  ["StrictHostKeyChecking", "yes"],
  ["ConnectTimeout", "10"],
  ["ConnectionAttempts", "1"]
] as const;

type RemoteTimelineReadErrorCode =
  | "REMOTE_TIMELINE_TRANSPORT_FAILED"
  | "REMOTE_TIMELINE_TIMEOUT";

interface RemoteTimelineReadErrorContext {
  bubble_id: string;
  remote_alias: string;
  remote_host: string;
  remote_clone_path: string;
  operation: "transport" | "timeout";
  exit_code?: number;
}

class RemoteTimelineReadError extends Error {
  public readonly code: RemoteTimelineReadErrorCode;
  public readonly context: RemoteTimelineReadErrorContext;

  public constructor(input: {
    code: RemoteTimelineReadErrorCode;
    message: string;
    context: RemoteTimelineReadErrorContext;
    cause?: unknown;
  }) {
    super(input.message, input.cause === undefined ? undefined : { cause: input.cause });
    this.name = "RemoteTimelineReadError";
    this.code = input.code;
    this.context = input.context;
  }
}

export function presentTimeline(envelopes: ProtocolEnvelope[]): UiTimelineEntry[] {
  return sanitizeTimelinePayloads(attachTimelineDisplay(envelopes.map((envelope) => ({
    id: envelope.id,
    ts: envelope.ts,
    round: envelope.round,
    type: envelope.type,
    sender: envelope.sender,
    recipient: envelope.recipient,
    payload: envelope.payload,
    refs: envelope.refs
  }))));
}

function isFinding(value: unknown): value is Finding {
  if (!isRecord(value) || !isNonEmptyString(value.title)) {
    return false;
  }
  if (!hasRenderableFindingPriority(value)) {
    return false;
  }
  if (value.priority !== undefined && !isFindingPriority(value.priority)) {
    return false;
  }
  if (value.severity !== undefined && !isFindingSeverity(value.severity)) {
    return false;
  }
  return hasValidFindingMetadata(value);
}

function hasValidFindingMetadata(finding: Record<string, unknown>): boolean {
  if (finding.timing !== undefined && !isFindingTiming(finding.timing)) {
    return false;
  }
  if (finding.layer !== undefined && !isFindingLayer(finding.layer)) {
    return false;
  }
  if (
    finding.evidence !== undefined
    && !(
      isNonEmptyString(finding.evidence)
      || (
        Array.isArray(finding.evidence)
        && finding.evidence.every((entry) => isNonEmptyString(entry))
      )
    )
  ) {
    return false;
  }
  if (finding.refs !== undefined) {
    if (!Array.isArray(finding.refs) || !finding.refs.every((entry) => isNonEmptyString(entry))) {
      return false;
    }
  }
  if (finding.effective_priority !== undefined && !isFindingPriority(finding.effective_priority)) {
    return false;
  }
  return true;
}

function hasRenderableFindingPriority(finding: Record<string, unknown>): boolean {
  return (
    isFindingPriority(finding.effective_priority) ||
    isFindingPriority(finding.priority) ||
    isFindingSeverity(finding.severity)
  );
}

function sanitizeFindingForUi(finding: Finding): UiTimelineFinding {
  const sanitized = {
    title: finding.title
  } as UiTimelineFinding;
  if (finding.priority !== undefined) sanitized.priority = finding.priority;
  if (finding.severity !== undefined) sanitized.severity = finding.severity;
  if (finding.timing !== undefined) sanitized.timing = finding.timing;
  if (finding.layer !== undefined) sanitized.layer = finding.layer;
  if (finding.evidence !== undefined) sanitized.evidence = finding.evidence;
  if (typeof finding.detail === "string") sanitized.detail = finding.detail;
  if (typeof finding.code === "string") sanitized.code = finding.code;
  if (finding.refs !== undefined) sanitized.refs = finding.refs;
  if (finding.effective_priority !== undefined) {
    sanitized.effective_priority = finding.effective_priority;
  }
  return sanitized;
}

function normalizePayloadForUi(raw: unknown): UiTimelineEntryPayload {
  if (!isRecord(raw)) {
    return {};
  }

  const payload: UiTimelineEntryPayload = {};
  if (isNonEmptyString(raw.summary)) {
    payload.summary = raw.summary;
  }
  if (isNonEmptyString(raw.question)) {
    payload.question = raw.question;
  }
  if (isNonEmptyString(raw.message)) {
    payload.message = raw.message;
  }
  if (isApprovalDecision(raw.decision)) {
    payload.decision = raw.decision;
  }
  if (isPassIntent(raw.pass_intent)) {
    payload.pass_intent = raw.pass_intent;
  }
  const rawFindings = raw.findings;
  const hasFindingsInput = Array.isArray(rawFindings);
  const sanitizedFindings = hasFindingsInput && rawFindings.every((value) => isFinding(value))
    ? rawFindings.map(sanitizeFindingForUi)
    : null;
  if (sanitizedFindings !== null) {
    payload.findings = sanitizedFindings;
  }
  if (
    shouldPreserveFindingsClaim(raw, sanitizedFindings)
  ) {
    payload.findings_claim_state = raw.findings_claim_state as "clean" | "open_findings" | "unknown";
    payload.findings_claim_source =
      raw.findings_claim_source as "payload_flags" | "payload_findings_count" | "legacy_summary_parser" | "meta_review_artifact";
  }
  return payload;
}

function shouldPreserveFindingsClaim(
  raw: Record<string, unknown>,
  sanitizedFindings: UiTimelineFinding[] | null
): boolean {
  if (!isFindingsClaimState(raw.findings_claim_state) || !isFindingsClaimSource(raw.findings_claim_source)) {
    return false;
  }
  if (raw.findings_claim_state === "open_findings") {
    return sanitizedFindings !== null && sanitizedFindings.length > 0;
  }
  if (raw.findings_claim_state === "clean" && sanitizedFindings !== null && sanitizedFindings.length > 0) {
    return false;
  }
  return !Object.hasOwn(raw, "findings") || sanitizedFindings !== null;
}

function normalizePayloadForDisplay(raw: unknown): ProtocolEnvelopePayload {
  const payload: ProtocolEnvelopePayload = normalizePayloadForUi(raw);
  if (isRecord(raw) && isRecord(raw.metadata)) {
    payload.metadata = raw.metadata;
  }
  return payload;
}

function sanitizeTimelinePayloads(
  entries: Array<TimelineEntryWithoutDisplay & Pick<UiTimelineEntry, "display">>
): UiTimelineEntry[] {
  return entries.map((entry) => ({
    ...entry,
    payload: normalizePayloadForUi(entry.payload)
  }));
}

function presentTimelineEntryLenient(input: unknown): TimelineEntryWithoutDisplay | null {
  if (!isRecord(input)) {
    return null;
  }
  if (!isNonEmptyString(input.id) || !isNonEmptyString(input.ts)) {
    return null;
  }
  if (!isInteger(input.round) || !isProtocolMessageType(input.type)) {
    return null;
  }
  if (!isNonEmptyString(input.sender) || !isNonEmptyString(input.recipient)) {
    return null;
  }

  const refs =
    Array.isArray(input.refs) && input.refs.every((value) => isNonEmptyString(value))
      ? input.refs
      : [];

  return {
    id: input.id,
    ts: input.ts,
    round: input.round,
    type: input.type,
    sender: input.sender,
    recipient: input.recipient,
    payload: normalizePayloadForDisplay(input.payload),
    refs
  };
}

function shouldFallbackToLenientTimeline(error: unknown): boolean {
  return (
    error instanceof Error &&
    /Invalid protocol envelope/u.test(error.message)
  );
}

async function readTimelineLenientFromTranscriptPath(
  transcriptPath: string
): Promise<UiTimelineEntry[]> {
  const raw = await readFile(transcriptPath, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") {
      return "";
    }
    throw error;
  });

  const entries: TimelineEntryWithoutDisplay[] = [];
  for (const line of raw.split(/\r?\n/u)) {
    if (line.trim().length === 0) {
      continue;
    }
    try {
      const parsed: unknown = JSON.parse(line);
      const presented = presentTimelineEntryLenient(parsed);
      if (presented !== null) {
        entries.push(presented);
      }
    } catch {
      // Best-effort fallback: invalid lines are ignored.
    }
  }

  return sanitizeTimelinePayloads(attachTimelineDisplay(entries));
}

export function readBubbleTimelineFromTranscriptText(
  raw: string
): UiTimelineEntry[] {
  const entries: TimelineEntryWithoutDisplay[] = [];
  for (const line of raw.split(/\r?\n/u)) {
    if (line.trim().length === 0) {
      continue;
    }
    try {
      const parsed: unknown = JSON.parse(line);
      const presented = presentTimelineEntryLenient(parsed);
      if (presented !== null) {
        entries.push(presented);
      }
    } catch {
      // Best-effort fallback: invalid lines are ignored.
    }
  }

  return sanitizeTimelinePayloads(attachTimelineDisplay(entries));
}

export async function readBubbleTimelineFromTranscriptPath(
  transcriptPath: string
): Promise<UiTimelineEntry[]> {
  try {
    const envelopes = await readTranscriptEnvelopes(transcriptPath, {
      allowMissing: true,
      toleratePartialFinalLine: true
    });
    return presentTimeline(envelopes);
  } catch (error) {
    if (!shouldFallbackToLenientTimeline(error)) {
      throw error;
    }
    return readTimelineLenientFromTranscriptPath(transcriptPath);
  }
}

function buildSshTarget(input: { host: string; user?: string }): string {
  return input.user !== undefined ? `${input.user}@${input.host}` : input.host;
}

function buildSshCommandArgs(input: {
  target: string;
  script: string;
}): string[] {
  return [
    ...sshTransportOptions.flatMap(([key, value]) => ["-o", `${key}=${value}`]),
    input.target,
    input.script
  ];
}

function summarizeTransportOutput(output: string): string {
  const normalized = output.replace(/\s+/gu, " ").trim();
  if (normalized.length === 0) {
    return "<empty>";
  }
  return normalized.slice(0, 200);
}

async function readRemoteTimelineText(input: {
  bubbleId: string;
  remoteClonePath: string;
  remoteAlias: string;
  expectedHost: string;
  resolveRemoteBubbleStatusTargetFn: typeof resolveRemoteBubbleStatusTarget;
  runCommand: typeof runCommandDefault;
}): Promise<string> {
  const remoteTarget = await input.resolveRemoteBubbleStatusTargetFn({
    bubbleId: input.bubbleId,
    remoteAlias: input.remoteAlias,
    expectedHost: input.expectedHost
  });
  const transcriptPath = join(
    input.remoteClonePath,
    ".pairflow",
    "bubbles",
    input.bubbleId,
    "transcript.ndjson"
  );
  const abortController = new AbortController();
  const timeout = setTimeout(() => {
    abortController.abort();
  }, remoteTimelineCommandTimeoutMs);
  timeout.unref?.();

  try {
    const result = await input.runCommand(
      "ssh",
      buildSshCommandArgs({
        target: buildSshTarget({
          host: remoteTarget.host,
          ...(remoteTarget.user !== undefined ? { user: remoteTarget.user } : {})
        }),
        script: `if [ -f ${shellQuote(transcriptPath)} ]; then cat ${shellQuote(transcriptPath)}; fi`
      }),
      {
        signal: abortController.signal
      }
    );
    if (result.exitCode !== 0) {
      const detailSource = result.stderr.trim().length > 0 ? result.stderr : result.stdout;
      throw new RemoteTimelineReadError({
        code: "REMOTE_TIMELINE_TRANSPORT_FAILED",
        message:
          `Remote timeline read transport failed (exit ${result.exitCode}): ${summarizeTransportOutput(detailSource)}`,
        context: {
          bubble_id: input.bubbleId,
          remote_alias: input.remoteAlias,
          remote_host: remoteTarget.host,
          remote_clone_path: input.remoteClonePath,
          operation: "transport",
          exit_code: result.exitCode
        }
      });
    }
    return result.stdout;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new RemoteTimelineReadError({
        code: "REMOTE_TIMELINE_TIMEOUT",
        message:
          `Remote timeline read timed out after ${remoteTimelineCommandTimeoutMs}ms for ${input.bubbleId}.`,
        context: {
          bubble_id: input.bubbleId,
          remote_alias: input.remoteAlias,
          remote_host: remoteTarget.host,
          remote_clone_path: input.remoteClonePath,
          operation: "timeout"
        },
        cause: error
      });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function readBubbleTimeline(
  input: ReadBubbleTimelineInput,
  dependencies: ReadBubbleTimelineDependencies = {}
): Promise<UiTimelineEntry[]> {
  const resolveBubbleByIdFn = dependencies.resolveBubbleById ?? resolveBubbleById;
  const readRemotePointerFn = dependencies.readRemotePointer ?? readRemotePointer;
  const resolveRemoteBubbleStatusTargetFn =
    dependencies.resolveRemoteBubbleStatusTarget ?? resolveRemoteBubbleStatusTarget;
  const runCommand = dependencies.runCommand ?? runCommandDefault;
  const resolved = await resolveBubbleByIdFn({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });

  const remotePointer = await readRemotePointerFn(resolved.bubblePaths.remotePointerPath);
  if (
    remotePointer?.kind === "started"
    && resolved.bubbleConfig.executor?.type === "ssh"
  ) {
    const raw = await readRemoteTimelineText({
      bubbleId: input.bubbleId,
      remoteClonePath: remotePointer.remoteClonePath,
      remoteAlias: resolved.bubbleConfig.executor.remote,
      expectedHost: remotePointer.host,
      resolveRemoteBubbleStatusTargetFn,
      runCommand
    });
    return readBubbleTimelineFromTranscriptText(raw);
  }

  return readBubbleTimelineFromTranscriptPath(resolved.bubblePaths.transcriptPath);
}
