import { readTranscriptEnvelopes } from "../../startCommandDependencyDefaults.js";
import type { Finding } from "../../../../../contracts/kernel/findings.js";
import { resolveFindingPriority } from "../../../../../contracts/kernel/findings.js";
import {
  isFindingsClaimSource,
  isFindingsClaimState
} from "../../../../../contracts/kernel/protocol.js";
import type { ProtocolEnvelope } from "../../../../shared/protocol/protocolEnvelopeContract.js";
import type { FindingsParityMetadata } from "../../../../shared/metaReviewGate/findingsParityMetadataContract.js";

const MAX_SUMMARY_CHARS = 900;
const MAX_SUMMARY_LINES = 16;
const MAX_PASS_EVENTS = 3;
const MAX_FLOW_EVENTS = 3;
const MAX_EVENT_TEXT_CHARS = 120;
const MAX_ERROR_TEXT_CHARS = 200;
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

function extractFindingsParityDiagnostic(
  metadata: FindingsParityMetadata | undefined
): string | null {
  if (metadata === undefined) {
    return null;
  }
  const claimed = metadata.findings_claimed_open_total;
  const artifact = metadata.findings_artifact_open_total;
  const blocking = metadata.findings_blocking_open_total;
  const advisory = metadata.findings_advisory_open_total;
  const status = metadata.findings_parity_status;
  const hasClaimed = typeof claimed === "number" && Number.isInteger(claimed);
  const hasArtifact = typeof artifact === "number" && Number.isInteger(artifact);
  const hasBlocking = typeof blocking === "number" && Number.isInteger(blocking);
  const hasAdvisory = typeof advisory === "number" && Number.isInteger(advisory);
  const hasStatus = typeof status === "string" && status.trim().length > 0;
  if (!hasClaimed && !hasArtifact && !hasStatus && !hasBlocking && !hasAdvisory) {
    return null;
  }
  const claimedText = hasClaimed ? String(claimed) : "?";
  const artifactText = hasArtifact ? String(artifact) : "?";
  const blockingText = hasBlocking ? String(blocking) : "?";
  const advisoryText = hasAdvisory ? String(advisory) : "?";
  const statusText = hasStatus ? status.trim() : "unknown";
  const splitSuffix =
    hasBlocking || hasAdvisory
      ? `, split=${blockingText}/${advisoryText}`
      : "";
  return `parity=${claimedText}/${artifactText}@${statusText}${splitSuffix}`;
}

function appendPrimaryPayloadExcerpt(
  fields: string[],
  envelope: ProtocolEnvelope
): void {
  switch (envelope.type) {
    case "TASK":
    case "PASS":
    case "CONVERGENCE":
    case "APPROVAL_REQUEST":
      if (typeof envelope.payload.summary === "string") {
        fields.push(
          `summary="${truncateText(compactWhitespace(envelope.payload.summary), 120)}"`
        );
      }
      break;
    case "COMMIT_RESULT":
      fields.push(`commit=${envelope.payload.commit_sha}`);
      break;
    case "HUMAN_QUESTION":
      fields.push(
        `question="${truncateText(compactWhitespace(envelope.payload.question), 120)}"`
      );
      break;
    case "HUMAN_REPLY":
      fields.push(
        `message="${truncateText(compactWhitespace(envelope.payload.message), 120)}"`
      );
      break;
    case "APPROVAL_DECISION":
      fields.push(`decision=${envelope.payload.decision}`);
      if (typeof envelope.payload.message === "string") {
        fields.push(
          `message="${truncateText(compactWhitespace(envelope.payload.message), 120)}"`
        );
      }
      break;
  }
}

function appendPassPayloadExcerpt(
  fields: string[],
  envelope: ProtocolEnvelope<"PASS">
): void {
  if (typeof envelope.payload.pass_intent === "string") {
    fields.push(`intent=${envelope.payload.pass_intent}`);
  }
  if (
    isFindingsClaimState(envelope.payload.findings_claim_state) &&
    isFindingsClaimSource(envelope.payload.findings_claim_source)
  ) {
    fields.push(
      `findings_claim=${envelope.payload.findings_claim_state}@${envelope.payload.findings_claim_source}`
    );
  }
}

function appendFindingsPayloadExcerpt(
  fields: string[],
  envelope: ProtocolEnvelope<"PASS" | "CONVERGENCE" | "APPROVAL_REQUEST" | "APPROVAL_DECISION">
): void {
  if (Array.isArray(envelope.payload.findings)) {
    fields.push(`findings=${envelope.payload.findings.length}`);
  }
}

function appendParityPayloadExcerpt(
  fields: string[],
  envelope: ProtocolEnvelope<"APPROVAL_REQUEST" | "APPROVAL_DECISION">
): void {
  if (envelope.payload.findings_parity === undefined) {
    return;
  }
  const parityDiagnostic =
    extractFindingsParityDiagnostic(envelope.payload.findings_parity);
  if (parityDiagnostic !== null) {
    fields.push(parityDiagnostic);
  }
}

function extractPayloadExcerpt(envelope: ProtocolEnvelope): string {
  const fields: string[] = [];

  appendPrimaryPayloadExcerpt(fields, envelope);
  if (envelope.type === "PASS") {
    appendPassPayloadExcerpt(fields, envelope);
  }
  if (
    envelope.type === "PASS" ||
    envelope.type === "CONVERGENCE" ||
    envelope.type === "APPROVAL_REQUEST" ||
    envelope.type === "APPROVAL_DECISION"
  ) {
    appendFindingsPayloadExcerpt(fields, envelope);
  }
  if (
    envelope.type === "APPROVAL_REQUEST" ||
    envelope.type === "APPROVAL_DECISION"
  ) {
    appendParityPayloadExcerpt(fields, envelope);
  }

  if (fields.length === 0) {
    return "payload=(none)";
  }

  return truncateText(fields.join(", "), MAX_EVENT_TEXT_CHARS);
}

function formatFinding(finding: Finding): string {
  return `${resolveFindingPriority(finding) ?? "P2"}:${truncateText(compactWhitespace(finding.title), 64)}`;
}

function formatPassEvent(envelope: ProtocolEnvelope<"PASS">): string {
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

function formatFlowEvent(
  envelope:
    | ProtocolEnvelope<"HUMAN_QUESTION">
    | ProtocolEnvelope<"HUMAN_REPLY">
): string {
  const textSource =
    envelope.type === "HUMAN_QUESTION"
      ? envelope.payload.question
      : envelope.payload.message;
  const text = truncateText(compactWhitespace(textSource), MAX_EVENT_TEXT_CHARS);
  return `- ${envelope.type} r${envelope.round} ${envelope.sender}->${envelope.recipient}: ${text}`;
}

function summarizeTranscript(envelopes: readonly ProtocolEnvelope[]): string {
  const maxRound = envelopes.reduce(
    (max, envelope) => Math.max(max, envelope.round),
    0
  );

  const passEvents = envelopes.filter(
    (entry): entry is ProtocolEnvelope<"PASS"> => entry.type === "PASS"
  );
  const humanFlow = envelopes.filter(
    (
      entry
    ): entry is
      | ProtocolEnvelope<"HUMAN_QUESTION">
      | ProtocolEnvelope<"HUMAN_REPLY"> =>
      entry.type === "HUMAN_QUESTION" ||
      entry.type === "HUMAN_REPLY"
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
