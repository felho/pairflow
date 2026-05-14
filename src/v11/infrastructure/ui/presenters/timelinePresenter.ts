import { readFile } from "node:fs/promises";

import { resolveBubbleById } from "../../executor/workspace/bubbleLookup.js";
import { readRemotePointer } from "../../artifact/bubble/remoteExecutionArtifacts.js";
import { readTranscriptEnvelopes } from "../../artifact/transcript/transcriptStore.js";
import {
  resolveRemoteBubbleStatusTarget,
  runCommandDefault
} from "../../executor/ssh/sshBubbleStatus.js";
import type { ProtocolEnvelope } from "../../../shared/protocol/protocolEnvelopeContract.js";
import type { Finding } from "../../../../contracts/kernel/findings.js";
import {
  isFindingLayer,
  isFindingPriority,
  isFindingSeverity,
  isFindingTiming
} from "../../../../contracts/kernel/findings.js";
import {
  isApprovalDecision,
  isFindingsClaimSource,
  isFindingsClaimState,
  isPassIntent,
  isProtocolMessageType
} from "../../../../contracts/kernel/protocol.js";
import type {
  UiTimelineDisplayItem,
} from "../../../../contracts/ui/uiReadModel.js";
import {
  isInteger,
  isNonEmptyString,
  isRecord
} from "../../../shared/validation/primitives.js";
import {
  attachTimelineDisplay,
  type TimelineEntryWithDisplay,
  type TimelineEntryWithoutDisplay
} from "./timelineDisplayPresenter.js";
import type {
  PresentedTimelineEntry,
  TimelineEntryPayload,
  TimelineFinding
} from "./timelineEntryModel.js";
import { buildTimelineDisplayItems } from "./timelineDisplayItemsPresenter.js";
import { readRemoteTimelineText } from "./remoteTimelineReader.js";
import { normalizeBubbleReviewPolicy } from "../../../shared/reviewPolicy/reviewPolicyRuntime.js";

export interface ReadBubbleTimelineInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
}

export interface PresentTimelineOptions {
  cleanRunsRequired?: number | null | undefined;
}

interface ReadBubbleTimelineDependencies {
  resolveBubbleById?: typeof resolveBubbleById;
  readRemotePointer?: typeof readRemotePointer;
  resolveRemoteBubbleStatusTarget?: typeof resolveRemoteBubbleStatusTarget;
  runCommand?: typeof runCommandDefault;
}

export function presentTimelineEntries(envelopes: ProtocolEnvelope[]): PresentedTimelineEntry[] {
  return sanitizeTimelinePayloads(attachTimelineDisplay(envelopes.map((envelope) => ({
    id: envelope.id,
    ts: envelope.ts,
    round: envelope.round,
    type: envelope.type,
    sender: envelope.sender,
    recipient: envelope.recipient,
    payload: normalizePayloadForDisplay(envelope.payload),
    refs: envelope.refs
  }))));
}

export function presentTimeline(
  envelopes: ProtocolEnvelope[],
  options: PresentTimelineOptions = {}
): UiTimelineDisplayItem[] {
  return buildTimelineDisplayItems({
    entries: attachTimelineDisplay(envelopes.map((envelope) => ({
      id: envelope.id,
      ts: envelope.ts,
      round: envelope.round,
      type: envelope.type,
      sender: envelope.sender,
      recipient: envelope.recipient,
      payload: normalizePayloadForDisplay(envelope.payload),
      refs: envelope.refs
    }))),
    cleanRunsRequired: options.cleanRunsRequired
  });
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

function sanitizeFindingForUi(finding: Finding): TimelineFinding {
  const sanitized = {
    title: finding.title
  } as TimelineFinding;
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

function normalizePayloadForUi(raw: unknown): TimelineEntryPayload {
  if (!isRecord(raw)) {
    return {};
  }

  const payload: TimelineEntryPayload = {};
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
  const sanitizedFindings = hasFindingsInput
    ? rawFindings.filter(isFinding).map(sanitizeFindingForUi)
    : null;
  const contradictoryOpenEmptyClaim =
    isFindingsClaimState(raw.findings_claim_state)
    && isFindingsClaimSource(raw.findings_claim_source)
    && raw.findings_claim_state === "open_findings"
    && sanitizedFindings !== null
    && sanitizedFindings.length === 0;
  if (
    sanitizedFindings !== null
    && (
      sanitizedFindings.length > 0
      || (hasFindingsInput && rawFindings.length === 0 && !contradictoryOpenEmptyClaim)
    )
  ) {
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
  sanitizedFindings: TimelineFinding[] | null
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

function normalizePayloadForDisplay(raw: unknown): TimelineEntryPayload {
  const payload = normalizePayloadForUi(raw);
  if (isRecord(raw) && isRecord(raw.metadata)) {
    payload.metadata = raw.metadata;
  }
  return payload;
}

function sanitizeTimelinePayloads(
  entries: TimelineEntryWithDisplay[]
): PresentedTimelineEntry[] {
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
  transcriptPath: string,
  options: PresentTimelineOptions = {}
): Promise<UiTimelineDisplayItem[]> {
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

  return buildTimelineDisplayItems({
    entries: attachTimelineDisplay(entries),
    cleanRunsRequired: options.cleanRunsRequired
  });
}

export function readBubbleTimelineFromTranscriptText(
  raw: string,
  options: PresentTimelineOptions = {}
): UiTimelineDisplayItem[] {
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

  return buildTimelineDisplayItems({
    entries: attachTimelineDisplay(entries),
    cleanRunsRequired: options.cleanRunsRequired
  });
}

export async function readBubbleTimelineFromTranscriptPath(
  transcriptPath: string,
  options: PresentTimelineOptions = {}
): Promise<UiTimelineDisplayItem[]> {
  try {
    const envelopes = await readTranscriptEnvelopes(transcriptPath, {
      allowMissing: true,
      toleratePartialFinalLine: true
    });
    return presentTimeline(envelopes, options);
  } catch (error) {
    if (!shouldFallbackToLenientTimeline(error)) {
      throw error;
    }
    return readTimelineLenientFromTranscriptPath(transcriptPath, options);
  }
}

export async function readBubbleTimeline(
  input: ReadBubbleTimelineInput,
  dependencies: ReadBubbleTimelineDependencies = {}
): Promise<UiTimelineDisplayItem[]> {
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
  const cleanRunsRequired = normalizeBubbleReviewPolicy(
    resolved.bubbleConfig
  ).meta_review_consecutive_clean_runs_required;

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
    return readBubbleTimelineFromTranscriptText(raw, { cleanRunsRequired });
  }

  return readBubbleTimelineFromTranscriptPath(resolved.bubblePaths.transcriptPath, {
    cleanRunsRequired
  });
}
