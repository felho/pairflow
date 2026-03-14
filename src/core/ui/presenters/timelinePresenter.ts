import { readFile } from "node:fs/promises";

import { resolveBubbleById } from "../../bubble/bubbleLookup.js";
import { readTranscriptEnvelopes } from "../../protocol/transcriptStore.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type { Finding } from "../../../types/findings.js";
import {
  isFindingLayer,
  isFindingPriority,
  isFindingSeverity,
  isFindingTiming
} from "../../../types/findings.js";
import {
  isApprovalDecision,
  isFindingsClaimSource,
  isFindingsClaimState,
  isPassIntent,
  isProtocolMessageType
} from "../../../types/protocol.js";
import type { UiTimelineEntry } from "../../../types/ui.js";
import { isInteger, isNonEmptyString, isRecord } from "../../validation.js";

export interface ReadBubbleTimelineInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
}

export function presentTimeline(envelopes: ProtocolEnvelope[]): UiTimelineEntry[] {
  return envelopes.map((envelope) => ({
    id: envelope.id,
    ts: envelope.ts,
    round: envelope.round,
    type: envelope.type,
    sender: envelope.sender,
    recipient: envelope.recipient,
    payload: envelope.payload,
    refs: envelope.refs
  }));
}

function isFinding(value: unknown): value is Finding {
  if (!isRecord(value) || !isNonEmptyString(value.title)) {
    return false;
  }
  if (value.priority !== undefined && !isFindingPriority(value.priority)) {
    return false;
  }
  if (value.severity !== undefined && !isFindingSeverity(value.severity)) {
    return false;
  }
  if (value.timing !== undefined && !isFindingTiming(value.timing)) {
    return false;
  }
  if (value.layer !== undefined && !isFindingLayer(value.layer)) {
    return false;
  }
  if (
    value.evidence !== undefined
    && !(
      isNonEmptyString(value.evidence)
      || (
        Array.isArray(value.evidence)
        && value.evidence.every((entry) => isNonEmptyString(entry))
      )
    )
  ) {
    return false;
  }
  if (value.refs !== undefined) {
    if (!Array.isArray(value.refs) || !value.refs.every((entry) => isNonEmptyString(entry))) {
      return false;
    }
  }
  if (value.effective_priority !== undefined && !isFindingPriority(value.effective_priority)) {
    return false;
  }
  return true;
}

function normalizePayloadForUi(raw: unknown): UiTimelineEntry["payload"] {
  if (!isRecord(raw)) {
    return {};
  }

  const payload: UiTimelineEntry["payload"] = {};
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
  if (isFindingsClaimState(raw.findings_claim_state)) {
    payload.findings_claim_state = raw.findings_claim_state;
  }
  if (isFindingsClaimSource(raw.findings_claim_source)) {
    payload.findings_claim_source = raw.findings_claim_source;
  }
  if (Array.isArray(raw.findings) && raw.findings.every((value) => isFinding(value))) {
    payload.findings = raw.findings;
  }
  if (isRecord(raw.metadata)) {
    payload.metadata = raw.metadata;
  }
  return payload;
}

function presentTimelineEntryLenient(input: unknown): UiTimelineEntry | null {
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
    payload: normalizePayloadForUi(input.payload),
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

  const entries: UiTimelineEntry[] = [];
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

  return entries;
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

export async function readBubbleTimeline(
  input: ReadBubbleTimelineInput
): Promise<UiTimelineEntry[]> {
  const resolved = await resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });

  return readBubbleTimelineFromTranscriptPath(resolved.bubblePaths.transcriptPath);
}
