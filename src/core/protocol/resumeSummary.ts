import { readTranscriptEnvelopes } from "./transcriptStore.js";
import type { Finding } from "../../types/findings.js";
import { resolveFindingPriority } from "../../types/findings.js";
import {
  isFindingsClaimSource,
  isFindingsClaimState,
  type ProtocolEnvelope
} from "../../types/protocol.js";

const MAX_SUMMARY_CHARS = 3_800;
const MAX_SUMMARY_LINES = 42;
const MAX_PASS_EVENTS = 6;
const MAX_FLOW_EVENTS = 6;
const MAX_EVENT_TEXT_CHARS = 180;
const MAX_ERROR_TEXT_CHARS = 320;
const MAX_FINDINGS_PER_PASS = 3;

export interface BuildResumeTranscriptSummaryInput {
  transcriptPath: string;
}

export interface BuildResumeTranscriptSummaryDependencies {
  readTranscriptEnvelopes?: typeof readTranscriptEnvelopes;
}

function compactWhitespace(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

function truncateText(value: string, maxChars: number): string {
  if (value.length <= maxChars) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxChars - 3))}...`;
}

function clampSummary(text: string): string {
  const limitedLines = text
    .split("\n")
    .slice(0, MAX_SUMMARY_LINES)
    .join("\n")
    .trim();
  return truncateText(limitedLines, MAX_SUMMARY_CHARS);
}

function extractFindingsParityDiagnosticFromMetadata(
  metadata: Record<string, unknown> | undefined
): string | null {
  if (metadata === undefined) {
    return null;
  }
  const claimed = metadata.findings_claimed_open_total;
  const artifact = metadata.findings_artifact_open_total;
  const status = metadata.findings_parity_status;
  const hasClaimed = typeof claimed === "number" && Number.isInteger(claimed);
  const hasArtifact = typeof artifact === "number" && Number.isInteger(artifact);
  const hasStatus = typeof status === "string" && status.trim().length > 0;
  if (!hasClaimed && !hasArtifact && !hasStatus) {
    return null;
  }
  const claimedText = hasClaimed ? String(claimed) : "?";
  const artifactText = hasArtifact ? String(artifact) : "?";
  const statusText = hasStatus ? status.trim() : "unknown";
  return `parity=${claimedText}/${artifactText}@${statusText}`;
}

function extractPayloadExcerpt(envelope: ProtocolEnvelope): string {
  const payload = envelope.payload;
  const fields: string[] = [];

  if (typeof payload.summary === "string") {
    fields.push(`summary="${truncateText(compactWhitespace(payload.summary), 120)}"`);
  }
  if (typeof payload.question === "string") {
    fields.push(`question="${truncateText(compactWhitespace(payload.question), 120)}"`);
  }
  if (typeof payload.message === "string") {
    fields.push(`message="${truncateText(compactWhitespace(payload.message), 120)}"`);
  }
  if (typeof payload.decision === "string") {
    fields.push(`decision=${payload.decision}`);
  }
  if (typeof payload.pass_intent === "string") {
    fields.push(`intent=${payload.pass_intent}`);
  }
  if (Array.isArray(payload.findings)) {
    fields.push(`findings=${payload.findings.length}`);
  }
  if (
    isFindingsClaimState(payload.findings_claim_state) &&
    isFindingsClaimSource(payload.findings_claim_source)
  ) {
    fields.push(
      `findings_claim=${payload.findings_claim_state}@${payload.findings_claim_source}`
    );
  }
  if (
    typeof payload.metadata === "object" &&
    payload.metadata !== null
  ) {
    const parityDiagnostic = extractFindingsParityDiagnosticFromMetadata(
      payload.metadata as Record<string, unknown>
    );
    if (parityDiagnostic !== null) {
      fields.push(parityDiagnostic);
    }
  }

  if (fields.length === 0) {
    return "payload=(none)";
  }

  return truncateText(fields.join(", "), MAX_EVENT_TEXT_CHARS);
}

function formatFinding(finding: Finding): string {
  return `${resolveFindingPriority(finding) ?? "P2"}:${truncateText(compactWhitespace(finding.title), 64)}`;
}

function formatPassEvent(envelope: ProtocolEnvelope): string {
  const summary = truncateText(
    compactWhitespace(envelope.payload.summary ?? "(no summary)"),
    MAX_EVENT_TEXT_CHARS
  );
  const findings = Array.isArray(envelope.payload.findings)
    ? envelope.payload.findings
        .slice(0, MAX_FINDINGS_PER_PASS)
        .map((finding) => formatFinding(finding))
    : [];
  const findingsText =
    findings.length > 0
      ? ` findings=[${findings.join(" | ")}${envelope.payload.findings!.length > MAX_FINDINGS_PER_PASS ? " | ..." : ""}]`
      : "";
  const claimText =
    isFindingsClaimState(envelope.payload.findings_claim_state) &&
      isFindingsClaimSource(envelope.payload.findings_claim_source)
      ? ` claim=${envelope.payload.findings_claim_state}@${envelope.payload.findings_claim_source}`
      : "";
  return `- PASS r${envelope.round} ${envelope.sender}->${envelope.recipient}: ${summary}${claimText}${findingsText}`;
}

function formatFlowEvent(envelope: ProtocolEnvelope): string {
  const textSource =
    envelope.payload.question ??
    envelope.payload.message ??
    envelope.payload.summary ??
    "(no text)";
  const text = truncateText(compactWhitespace(textSource), MAX_EVENT_TEXT_CHARS);
  let paritySuffix = "";
  if (
    envelope.type === "APPROVAL_REQUEST" &&
    typeof envelope.payload.metadata === "object" &&
    envelope.payload.metadata !== null
  ) {
    const parityDiagnostic = extractFindingsParityDiagnosticFromMetadata(
      envelope.payload.metadata as Record<string, unknown>
    );
    if (parityDiagnostic !== null) {
      paritySuffix = ` (${parityDiagnostic})`;
    }
  }
  return `- ${envelope.type} r${envelope.round} ${envelope.sender}->${envelope.recipient}: ${text}${paritySuffix}`;
}

function summarizeTranscript(envelopes: readonly ProtocolEnvelope[]): string {
  const maxRound = envelopes.reduce(
    (max, envelope) => Math.max(max, envelope.round),
    0
  );

  const passEvents = envelopes.filter((entry) => entry.type === "PASS");
  const humanFlow = envelopes.filter(
    (entry) => entry.type === "HUMAN_QUESTION" || entry.type === "HUMAN_REPLY"
  );

  let humanQuestions = 0;
  let humanReplies = 0;
  let approvalRequests = 0;
  let approvalDecisions = 0;
  for (const envelope of envelopes) {
    if (envelope.type === "HUMAN_QUESTION") {
      humanQuestions += 1;
    } else if (envelope.type === "HUMAN_REPLY") {
      humanReplies += 1;
    } else if (envelope.type === "APPROVAL_REQUEST") {
      approvalRequests += 1;
    } else if (envelope.type === "APPROVAL_DECISION") {
      approvalDecisions += 1;
    }
  }

  const unresolvedHumanQuestions = Math.max(0, humanQuestions - humanReplies);
  const unresolvedApprovalRequests = Math.max(0, approvalRequests - approvalDecisions);

  const latest = envelopes.at(-1);

  const lines: string[] = [
    "Resume transcript summary:",
    `- messages=${envelopes.length}, max_round=${maxRound}, pass_events=${passEvents.length}`,
    `- unresolved_human_questions=${unresolvedHumanQuestions}, unresolved_approval_requests=${unresolvedApprovalRequests}`
  ];

  const latestPasses = passEvents.slice(-MAX_PASS_EVENTS);
  if (latestPasses.length === 0) {
    lines.push("- PASS highlights: none.");
  } else {
    lines.push("- PASS highlights:");
    for (const envelope of latestPasses) {
      lines.push(formatPassEvent(envelope));
    }
  }

  const recentFlow = humanFlow.slice(-MAX_FLOW_EVENTS);
  if (recentFlow.length === 0) {
    lines.push("- HUMAN flow: none.");
  } else {
    lines.push("- HUMAN flow:");
    for (const envelope of recentFlow) {
      lines.push(formatFlowEvent(envelope));
    }
  }

  if (latest === undefined) {
    lines.push("- latest_message: none.");
  } else {
    lines.push(
      `- latest_message: type=${latest.type} sender=${latest.sender} recipient=${latest.recipient} ${extractPayloadExcerpt(latest)}`
    );
  }

  return clampSummary(lines.join("\n"));
}

export function buildResumeTranscriptSummaryFallback(error: unknown): string {
  const message =
    error instanceof Error
      ? compactWhitespace(error.message)
      : compactWhitespace(String(error));
  return clampSummary(
    [
      "Resume transcript summary unavailable.",
      `- reason=${truncateText(message, MAX_ERROR_TEXT_CHARS)}`,
      "- fallback=state-only context; inspect transcript.ndjson if needed."
    ].join("\n")
  );
}

export async function buildResumeTranscriptSummary(
  input: BuildResumeTranscriptSummaryInput,
  dependencies: BuildResumeTranscriptSummaryDependencies = {}
): Promise<string> {
  const readEnvelopes =
    dependencies.readTranscriptEnvelopes ?? readTranscriptEnvelopes;

  try {
    const envelopes = await readEnvelopes(input.transcriptPath, {
      allowMissing: true,
      toleratePartialFinalLine: true
    });
    return summarizeTranscript(envelopes);
  } catch (error) {
    return buildResumeTranscriptSummaryFallback(error);
  }
}
