import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";

import type { AgentRole } from "../../../types/bubble.js";
import type { Finding } from "../../../types/findings.js";
import {
  actorOutputKinds,
  isActorOutputKind,
  isPassIntent,
  type ActorEmitInput,
  type ActorOutputKind,
  type PassIntent
} from "../../../types/protocol.js";
import type { ConvergedStructuredFinding } from "../../../v11/shared/converged/convergedCommandTypes.js";
import {
  isConvergedStructuredFindingSeverity
} from "../../../v11/shared/converged/convergedCommandTypes.js";
import {
  parseOptionalReworkTarget,
  parseRequiredSubmitReportJson,
  parseSubmitRecommendation,
  parseSubmitRound
} from "../../../v11/application/metaReview/metaReviewCliOptionValueReader.js";
import {
  buildMetaReviewSubmitUsageLine
} from "../../../v11/shared/metaReview/metaReviewSubmitGuidance.js";
import { emitActorProtocolFromWorkspaceV11 } from "../../../v11/application/actorProtocol/emitActorProtocolV11.js";
import {
  resolveActorEmitContextByBubbleId
} from "../../../v11/defaults/actorProtocol/actorEmitContextDefaults.js";
import {
  metaReviewDefaults
} from "../../../v11/defaults/metaReview/metaReviewDefaults.js";
import {
  PassValidationRunnerExecutionError,
  passValidationDefaults
} from "../../../v11/defaults/pass/passValidationCommandDefaults.js";
import {
  notifyMetaReviewerSubmissionRequestV11
} from "../../../v11/defaults/metaReviewGate/metaReviewGateApi.js";
import {
  metaReviewGateDependencyDefaults
} from "../../../v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.js";
import {
  reviewerDeliveryDefaults
} from "../../../v11/defaults/reviewer/reviewerDeliveryDefaults.js";
import {
  askHumanFinalizationDefaults
} from "../../../v11/defaults/askHuman/askHumanFinalizationDefaults.js";
import {
  emitBubbleLifecycleEventBestEffort
} from "../../../v11/defaults/metrics/bubbleEvents.js";
import {
  resolveDeliveryMessageRef
} from "../../../v11/infrastructure/channel/tmux/tmuxDelivery.js";
import {
  resolveMetaReviewerPaneWarning
} from "../../../v11/application/metaReviewGate/metaReviewGatePaneBinding.js";
import {
  resolveReviewerTestExecutionDirective
} from "../../../v11/infrastructure/artifact/reviewer/testEvidenceRuntime.js";
import { CliFindingParseError, parseCliFinding } from "./shared/findingParser.js";

export interface AgentEmitHelpCommandOptions {
  help: true;
}

export interface AgentEmitCommandOptions {
  help: false;
  input: ActorEmitInput;
}

export type ParsedAgentEmitCommandOptions =
  | AgentEmitHelpCommandOptions
  | AgentEmitCommandOptions;

const agentEmitOptionsInvalidReasonCode = "ACTOR_EMIT_OPTIONS_INVALID";
const agentEmitFindingsInvalidReasonCode = "ACTOR_EMIT_FINDINGS_INVALID";
const agentEmitInputExecutionIdMissingReasonCode =
  "ACTOR_EMIT_INPUT_EXECUTION_ID_MISSING";
const agentEmitForbiddenExecutionIdDerivationReasonCode =
  "ACTOR_EMIT_FORBIDDEN_EXECUTION_ID_DERIVATION";

const agentEmitParseOptions = {
  kind: {
    type: "string"
  },
  repo: {
    type: "string"
  },
  "bubble-id": {
    type: "string"
  },
  "handoff-id": {
    type: "string"
  },
  "execution-id": {
    type: "string"
  },
  "expected-role": {
    type: "string"
  },
  "expected-round": {
    type: "string"
  },
  "expected-state-fingerprint": {
    type: "string"
  },
  summary: {
    type: "string"
  },
  question: {
    type: "string"
  },
  intent: {
    type: "string"
  },
  finding: {
    type: "string",
    multiple: true
  },
  "no-findings": {
    type: "boolean"
  },
  round: {
    type: "string"
  },
  recommendation: {
    type: "string"
  },
  "rework-target-message": {
    type: "string"
  },
  "report-json": {
    type: "string"
  },
  ref: {
    type: "string",
    multiple: true
  },
  help: {
    type: "boolean",
    short: "h"
  }
} as const;

function invalidAgentEmitOptions(message: string): never {
  throw new Error(`${agentEmitOptionsInvalidReasonCode}: ${message}`);
}

function parseAgentRole(value: string | undefined): AgentRole | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (
    value === "implementer"
    || value === "reviewer"
    || value === "meta_reviewer"
  ) {
    return value;
  }
  return invalidAgentEmitOptions(
    "Invalid --expected-role value. Use one of: implementer, reviewer, meta_reviewer."
  );
}

function parseOptionalPositiveInteger(
  value: string | undefined,
  optionName: string
): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return invalidAgentEmitOptions(`${optionName} must be a positive integer.`);
  }
  return parsed;
}

function parsePassFindings(rawFindings: string[]): Finding[] {
  return rawFindings.map((rawFinding) => {
    try {
      const parsedFinding = parseCliFinding(rawFinding);
      return {
        priority: parsedFinding.severity,
        severity: parsedFinding.severity,
        title: parsedFinding.title,
        timing: "later-hardening",
        layer: "L1",
        ...(parsedFinding.refs !== undefined ? { refs: parsedFinding.refs } : {})
      };
    } catch (error) {
      if (error instanceof CliFindingParseError) {
        throw new Error(`${agentEmitFindingsInvalidReasonCode}: ${error.message}`);
      }
      throw error;
    }
  });
}

function parseConvergedFindings(
  rawFindings: string[]
): ConvergedStructuredFinding[] {
  return rawFindings.map((rawFinding) => {
    try {
      const parsedFinding = parseCliFinding(rawFinding);
      if (!isConvergedStructuredFindingSeverity(parsedFinding.severity)) {
        throw new Error("Convergence findings support only P2/P3 severities.");
      }
      return {
        severity: parsedFinding.severity,
        title: parsedFinding.title,
        ...(parsedFinding.refs !== undefined ? { refs: parsedFinding.refs } : {})
      };
    } catch (error) {
      if (error instanceof CliFindingParseError) {
        throw new Error(`${agentEmitFindingsInvalidReasonCode}: ${error.message}`);
      }
      if (error instanceof Error) {
        throw new Error(`${agentEmitFindingsInvalidReasonCode}: ${error.message}`);
      }
      throw error;
    }
  });
}

function parseRequiredString(
  value: string | undefined,
  optionName: string
): string {
  if (value === undefined || value.trim().length === 0) {
    return invalidAgentEmitOptions(`Missing required option: ${optionName}`);
  }
  return value.trim();
}

function parseKind(value: string | undefined): ActorOutputKind {
  const kind = parseRequiredString(value, "--kind");
  if (!isActorOutputKind(kind)) {
    return invalidAgentEmitOptions(
      `Invalid --kind value. Use one of: ${actorOutputKinds.join(", ")}.`
    );
  }
  return kind;
}

function buildCommonInput(values: Record<string, unknown>): Omit<
  ActorEmitInput,
  | "kind"
  | "summary"
  | "question"
  | "intent"
  | "findings"
  | "no_findings"
  | "round"
  | "recommendation"
  | "rework_target_message"
  | "report_json"
> {
  const repo = parseRequiredString(values.repo as string | undefined, "--repo");
  const bubbleId = parseRequiredString(
    values["bubble-id"] as string | undefined,
    "--bubble-id"
  );
  const handoffId = parseRequiredString(
    values["handoff-id"] as string | undefined,
    "--handoff-id"
  );
  const executionId = parseRequiredExecutionId(values, handoffId);
  const expectedRole = parseAgentRole(values["expected-role"] as string | undefined);
  const expectedRound = parseOptionalPositiveInteger(
    values["expected-round"] as string | undefined,
    "--expected-round"
  );
  const expectedStateFingerprint =
    values["expected-state-fingerprint"] as string | undefined;
  const refs = (values.ref as string[] | undefined) ?? [];

  return {
    repo,
    bubble_id: bubbleId,
    handoff_id: handoffId,
    execution_id: executionId,
    refs,
    ...(expectedRole !== undefined ? { expected_role: expectedRole } : {}),
    ...(expectedRound !== undefined ? { expected_round: expectedRound } : {}),
    ...(expectedStateFingerprint !== undefined
      ? { expected_state_fingerprint: expectedStateFingerprint }
      : {})
  };
}

function parseRequiredExecutionId(
  values: Record<string, unknown>,
  handoffId: string
): string {
  const executionId = values["execution-id"] as string | undefined;
  if (executionId === undefined) {
    throw new Error(
      `${agentEmitInputExecutionIdMissingReasonCode}: Missing required option: --execution-id (handoff_id cannot be used to derive execution_id).`
    );
  }
  const normalizedExecutionId = executionId.trim();
  if (normalizedExecutionId.length === 0) {
    throw new Error(
      `${agentEmitForbiddenExecutionIdDerivationReasonCode}: --execution-id must be a non-empty explicit execution authority token; handoff_id cannot be used as a substitute.`
    );
  }
  if (normalizedExecutionId === handoffId) {
    throw new Error(
      `${agentEmitForbiddenExecutionIdDerivationReasonCode}: --execution-id must not equal --handoff-id; inferred execution authority is forbidden.`
    );
  }
  return normalizedExecutionId;
}

export function getAgentEmitHelpText(): string {
  return [
    "Usage:",
    '  pairflow agent emit --kind pass --repo <path> --bubble-id <id> --handoff-id <id> --execution-id <id> --summary "<text>" [--ref <artifact-path>]... [--intent <task|review|fix_request>] [--finding <P0|P1|P2|P3:Title[|ref1,ref2]>]... [--no-findings]',
    '  pairflow agent emit --kind human_question --repo <path> --bubble-id <id> --handoff-id <id> --execution-id <id> --question "<text>" [--ref <artifact-path>]...',
    '  pairflow agent emit --kind convergence --repo <path> --bubble-id <id> --handoff-id <id> --execution-id <id> --summary "<text>" [--ref <artifact-path>]... [--finding <P2|P3:Title[|ref1,ref2]>]...',
    `  ${buildMetaReviewSubmitUsageLine()}`,
    "",
    "Common options:",
    "  --kind <value>                 Required actor output kind",
    "  --repo <path>                  Required repository path",
    "  --bubble-id <id>               Required bubble id",
    "  --handoff-id <id>              Required canonical handoff id",
    "  --execution-id <id>            Required canonical execution-scoped id",
    "  --ref <path>                   Optional artifact reference (repeatable)",
    "  --expected-role <value>        Optional guard: implementer|reviewer|meta_reviewer",
    "  --expected-round <n>           Optional guard: active round",
    "  --expected-state-fingerprint <value>  Optional guard: active state fingerprint",
    "  -h, --help                     Show this help",
    "",
    "Phase 5 note:",
    "  `pairflow pass`, `pairflow ask-human`, `pairflow converged`, and `orchestra` actor aliases were removed. Use `pairflow agent emit` only."
  ].join("\n");
}

export function parseAgentEmitCommandOptions(
  args: string[]
): ParsedAgentEmitCommandOptions {
  const parsed = parseAgentEmitArgs(args);
  if ((parsed.values.help ?? false) === true) {
    return { help: true };
  }

  const kind = parseKind(parsed.values.kind);
  const commonInput = buildCommonInput(parsed.values);

  if (kind === "pass") {
    const summary = parseRequiredString(
      parsed.values.summary,
      "--summary"
    );
    const intentRaw = parsed.values.intent;
    let intent: PassIntent | undefined;
    if (intentRaw !== undefined) {
      if (!isPassIntent(intentRaw)) {
        return invalidAgentEmitOptions(
          "Invalid --intent value. Use one of: task, review, fix_request."
        );
      }
      intent = intentRaw;
    }
    const findings = parsePassFindings(parsed.values.finding ?? []);
    const noFindings = parsed.values["no-findings"] ?? false;

    return {
      help: false,
      input: {
        kind,
        ...commonInput,
        summary,
        ...(intent !== undefined ? { intent } : {}),
        ...(findings.length > 0 ? { findings } : {}),
        ...(noFindings ? { no_findings: true } : {})
      }
    };
  }

  if (kind === "human_question") {
    return {
      help: false,
      input: {
        kind,
        ...commonInput,
        question: parseRequiredString(
          parsed.values.question,
          "--question"
        )
      }
    };
  }

  if (kind === "convergence") {
    const findings = parseConvergedFindings(parsed.values.finding ?? []);
    return {
      help: false,
      input: {
        kind,
        ...commonInput,
        summary: parseRequiredString(
          parsed.values.summary,
          "--summary"
        ),
        ...(findings.length > 0 ? { findings } : {})
      }
    };
  }

  return {
    help: false,
    input: {
      kind,
      ...commonInput,
      round: parseSubmitRound(parsed.values.round),
      recommendation: parseSubmitRecommendation(parsed.values.recommendation),
      summary: parseRequiredString(
        parsed.values.summary,
        "--summary"
      ),
      rework_target_message: parseOptionalReworkTarget(parsed.values["rework-target-message"]),
      report_json: parseRequiredSubmitReportJson(parsed.values["report-json"])
    }
  };
}

function parseAgentEmitArgs(args: string[]) {
  try {
    return parseArgs({
      args,
      options: agentEmitParseOptions,
      strict: true,
      allowPositionals: false
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`${agentEmitOptionsInvalidReasonCode}: ${error.message}`);
    }
    throw error;
  }
}

export async function runAgentEmitCommand(
  args: string[]
): Promise<ReturnType<typeof emitActorProtocolFromWorkspaceV11> | null> {
  const parsed = parseAgentEmitCommandOptions(args);
  if (parsed.help) {
    return null;
  }
  const authoritativeContext = await resolveActorEmitContextByBubbleId({
    bubbleId: parsed.input.bubble_id,
    repoPath: parsed.input.repo
  });
  const dependencies = {
    askHuman: {
      emitDeliveryNotificationAck:
        askHumanFinalizationDefaults.emitDeliveryNotificationAck,
      emitBubbleNotification:
        askHumanFinalizationDefaults.emitBubbleNotification,
      resolveDeliveryMessageRef,
      emitBubbleLifecycleEventBestEffort
    },
    pass: {
      emitDeliveryNotificationAck:
        reviewerDeliveryDefaults.emitDeliveryNotificationAck,
      refreshReviewerContext: reviewerDeliveryDefaults.refreshReviewerContext,
      readReviewerBriefArtifact:
        reviewerDeliveryDefaults.readReviewerBriefArtifact,
      readReviewerFocusArtifact:
        reviewerDeliveryDefaults.readReviewerFocusArtifact,
      resolveDeliveryMessageRef:
        reviewerDeliveryDefaults.resolveDeliveryMessageRef,
      verifyImplementerTestEvidence:
        reviewerDeliveryDefaults.verifyImplementerTestEvidence,
      writeReviewerTestEvidenceArtifact:
        reviewerDeliveryDefaults.writeReviewerTestEvidenceArtifact,
      resolveReviewerTestExecutionDirectiveFromArtifact:
        reviewerDeliveryDefaults.resolveReviewerTestExecutionDirectiveFromArtifact,
      readDocContractGateArtifact:
        passValidationDefaults.readDocContractGateArtifact,
      resolveDocContractGateArtifactPath:
        passValidationDefaults.resolveDocContractGateArtifactPath,
      writeDocContractGateArtifact:
        passValidationDefaults.writeDocContractGateArtifact,
      writeReviewVerificationArtifactAtomic:
        passValidationDefaults.writeReviewVerificationArtifactAtomic,
      resolveReviewVerificationInputFromRefs:
        passValidationDefaults.resolveReviewVerificationInputFromRefs,
      resolvePassValidationPolicy:
        passValidationDefaults.resolvePassValidationPolicy,
      runPassValidationCommand:
        passValidationDefaults.runPassValidationCommand,
      buildPassValidationEvidenceArtifact:
        passValidationDefaults.buildPassValidationEvidenceArtifact,
      createPassValidationReviewerDirective:
        passValidationDefaults.createPassValidationReviewerDirective,
      resolvePassValidationArtifactPath:
        passValidationDefaults.resolvePassValidationArtifactPath,
      resolvePassValidationReviewerCompatibilityArtifactPath:
        passValidationDefaults.resolvePassValidationReviewerCompatibilityArtifactPath,
      isPassValidationRunnerExecutionError: (
        error: unknown
      ): error is PassValidationRunnerExecutionError =>
        error instanceof PassValidationRunnerExecutionError,
      writePassValidationEvidenceArtifact:
        passValidationDefaults.writePassValidationEvidenceArtifact,
      writePassValidationReviewerCompatibilityArtifact:
        passValidationDefaults.writePassValidationReviewerCompatibilityArtifact
    },
    convergence: {
      resolveReviewerTestExecutionDirective
    },
    metaReview: {
      readFile,
      emitDeliveryNotification: metaReviewDefaults.emitDeliveryNotificationAck,
      buildDeliveryMessageRef: metaReviewDefaults.resolveDeliveryMessageRef,
      readRuntimeSessionsRegistry: metaReviewDefaults.readRuntimeSessionsRegistry,
      readTranscriptEnvelopes:
        metaReviewGateDependencyDefaults.readTranscriptEnvelopes,
      setMetaReviewerPaneBinding:
        metaReviewGateDependencyDefaults.setMetaReviewerPaneBinding,
      notifyMetaReviewerSubmissionRequest:
        notifyMetaReviewerSubmissionRequestV11,
      resolveMetaReviewerPaneWarning,
      runMetaReviewApproveValidationCommand:
        metaReviewDefaults.runPassValidationCommand,
      runtime: metaReviewGateDependencyDefaults.runtime
    }
  } as const;
  return emitActorProtocolFromWorkspaceV11(
    {
      input: parsed.input,
      authoritativeContext
    },
    dependencies
  );
}
