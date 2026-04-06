import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  emitConvergedFromWorkspace,
  type EmitConvergedDependencies,
  type EmitConvergedInput,
  type EmitConvergedResult
} from "../../../src/core/agent/converged.js";
import { applyMetaReviewGateOnConvergence } from "../../../src/core/bubble/metaReviewGate.js";
import { resolveConvergedSummaryFindingsContradiction } from "../../../src/v11/domain/convergence/policy.js";
import { emitConvergedFromWorkspaceV11 } from "../../../src/v11/application/converged/emitConvergedV11.js";
import { applyMetaReviewGateOnConvergenceV11 } from "../../../src/v11/application/metaReviewGate/emitMetaReviewGateV11.js";
import {
  isConvergedStructuredFindingSeverity,
  type ConvergedStructuredFinding
} from "../../../src/v11/shared/converged/convergedCommandTypes.js";
import { seedConvergedCandidate } from "../../v11/application/converged/convergedSeedFixture.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";
import { deliveryTargetRoleMetadataKey } from "../../../src/types/protocol.js";
import type { ContractCase, ContractCaseExpected } from "./schema.js";
import type { RuntimeSessionRecord } from "../../../src/core/runtime/sessionsRegistry.js";

type DeliveryRefKind = "external" | "none" | "transcript";

interface CapturedConvergedDelivery {
  recipient: string;
  targetRole: string | null;
  refKind: DeliveryRefKind;
}

export interface ConvergedContractOutput {
  status: "ok";
  reasonCode: "CONVERGED_EMITTED";
  convergenceSequence: number;
  convergenceEnvelopeType: string;
  convergenceEnvelopeRecipient: string;
  approvalRequestSequence: number;
  approvalRequestEnvelopeType: string;
  approvalRequestRecipient: string;
  approvalRequestSender: string;
  gateRoute: string;
  stateSubset: {
    state: string;
  };
  deliveryCount: number;
  deliveryRecipients: string[];
  deliveryTargetRoles: string[];
  deliveryRefKinds: DeliveryRefKind[];
}

export interface ConvergedContractRunResult {
  mode: ContractCase["mode"];
  baseline?: ConvergedContractOutput;
  v11?: ConvergedContractOutput;
}

type ReviewerRoutingForbiddenPattern =
  | "summary_only_finding_claim_without_structured_finding"
  | "clean_summary_with_structured_findings";

const REVIEWER_ROUTING_FORBIDDEN_PATTERNS: readonly ReviewerRoutingForbiddenPattern[] = [
  "summary_only_finding_claim_without_structured_finding",
  "clean_summary_with_structured_findings"
];

interface ParsedConvergedCaseInput {
  convergedInput: Omit<EmitConvergedInput, "cwd">;
  reviewArtifactType?: "code" | "document";
  scenario: "default" | "delivery_partial_failure";
  reviewerRoutingContract?: {
    expectedRoute?: "converged_with_advisory_findings" | "converged_clean";
    allowedConvergedFindingSeverities?: Array<"P2" | "P3">;
    requiresNoStructuredFindings?: boolean;
    forbiddenPatterns?: ReviewerRoutingForbiddenPattern[];
  };
  rolloutContract?: {
    kickoffContractVersion?: "baseline_inflight" | "advisory_v1";
    inflightPolicy?: "kickoff_pinned_until_close";
    gracePeriodGate?: "required_for_new_rollout_signoff" | "baseline_only_within_window";
  };
}

function parseConvergedCaseInput(input: ContractCase["input"]): ParsedConvergedCaseInput {
  const summaryRaw = input.summary;
  if (typeof summaryRaw !== "string" || summaryRaw.trim().length === 0) {
    throw new Error("converged contract input.summary must be a non-empty string.");
  }

  const refsRaw = input.refs;
  let refs: string[] | undefined;
  if (refsRaw !== undefined) {
    if (
      !Array.isArray(refsRaw) ||
      !refsRaw.every((value) => typeof value === "string")
    ) {
      throw new Error("converged contract input.refs must be a string array.");
    }
    refs = refsRaw;
  }

  const reviewArtifactTypeRaw = input.reviewArtifactType;
  let reviewArtifactType: "code" | "document" | undefined;
  if (reviewArtifactTypeRaw !== undefined) {
    if (reviewArtifactTypeRaw !== "code" && reviewArtifactTypeRaw !== "document") {
      throw new Error(
        "converged contract input.reviewArtifactType must be one of: code, document."
      );
    }
    reviewArtifactType = reviewArtifactTypeRaw;
  }

  const findingsRaw = input.findings;
  let findings: ConvergedStructuredFinding[] | undefined;
  if (findingsRaw !== undefined) {
    if (!Array.isArray(findingsRaw)) {
      throw new Error(
        "converged contract input.findings must be an array when provided."
      );
    }
    findings = findingsRaw.map((entry, index) => {
      if (typeof entry !== "object" || entry === null) {
        throw new Error(
          `converged contract input.findings[${index}] must be an object.`
        );
      }
      const record = entry as Record<string, unknown>;
      const severityRaw = record.severity;
      if (!isConvergedStructuredFindingSeverity(severityRaw)) {
        throw new Error(
          `converged contract input.findings[${index}].severity must be P2 or P3.`
        );
      }
      const titleRaw = record.title;
      if (typeof titleRaw !== "string" || titleRaw.trim().length === 0) {
        throw new Error(
          `converged contract input.findings[${index}].title must be a non-empty string.`
        );
      }
      const refsRaw = record.refs;
      if (
        refsRaw !== undefined
        && (
          !Array.isArray(refsRaw)
          || !refsRaw.every((value) => typeof value === "string")
        )
      ) {
        throw new Error(
          `converged contract input.findings[${index}].refs must be a string array when provided.`
        );
      }
      return {
        severity: severityRaw,
        title: titleRaw.trim(),
        ...(refsRaw !== undefined ? { refs: refsRaw } : {})
      };
    });
  }

  const fixtureRaw = input.fixture;
  let scenario: ParsedConvergedCaseInput["scenario"] = "default";
  let reviewerRoutingContract: ParsedConvergedCaseInput["reviewerRoutingContract"];
  let rolloutContract: ParsedConvergedCaseInput["rolloutContract"];
  if (fixtureRaw !== undefined) {
    if (typeof fixtureRaw !== "object" || fixtureRaw === null) {
      throw new Error("converged contract input.fixture must be an object when provided.");
    }
    const scenarioRaw = (fixtureRaw as Record<string, unknown>).scenario;
    if (
      scenarioRaw !== undefined &&
      scenarioRaw !== "default" &&
      scenarioRaw !== "delivery_partial_failure"
    ) {
      throw new Error(
        "converged contract input.fixture.scenario must be one of: default, delivery_partial_failure."
      );
    }
    scenario = scenarioRaw ?? "default";

    const reviewerRoutingRaw = (fixtureRaw as Record<string, unknown>).reviewer_routing_contract;
    if (reviewerRoutingRaw !== undefined) {
      if (typeof reviewerRoutingRaw !== "object" || reviewerRoutingRaw === null) {
        throw new Error(
          "converged contract input.fixture.reviewer_routing_contract must be an object when provided."
        );
      }
      const reviewerRoutingRecord = reviewerRoutingRaw as Record<string, unknown>;
      const expectedRouteRaw = reviewerRoutingRecord.expected_route;
      let expectedRoute:
        | "converged_with_advisory_findings"
        | "converged_clean"
        | undefined;
      if (expectedRouteRaw !== undefined) {
        if (
          expectedRouteRaw !== "converged_with_advisory_findings"
          && expectedRouteRaw !== "converged_clean"
        ) {
          throw new Error(
            "converged contract fixture reviewer_routing_contract.expected_route must be converged_with_advisory_findings or converged_clean."
          );
        }
        expectedRoute = expectedRouteRaw;
      }
      const allowedSeveritiesRaw =
        reviewerRoutingRecord.allowed_converged_finding_severities;
      let allowedConvergedFindingSeverities: Array<"P2" | "P3"> | undefined;
      if (allowedSeveritiesRaw !== undefined) {
        if (
          !Array.isArray(allowedSeveritiesRaw)
          || !allowedSeveritiesRaw.every(
            (value) => value === "P2" || value === "P3"
          )
        ) {
          throw new Error(
            "converged contract fixture reviewer_routing_contract.allowed_converged_finding_severities must be a P2/P3 string array."
          );
        }
        allowedConvergedFindingSeverities =
          allowedSeveritiesRaw as Array<"P2" | "P3">;
      }
      const requiresNoStructuredFindingsRaw =
        reviewerRoutingRecord.requires_no_structured_findings;
      if (
        requiresNoStructuredFindingsRaw !== undefined
        && typeof requiresNoStructuredFindingsRaw !== "boolean"
      ) {
        throw new Error(
          "converged contract fixture reviewer_routing_contract.requires_no_structured_findings must be boolean when provided."
        );
      }
      const forbiddenPatternsRaw = reviewerRoutingRecord.forbidden_patterns;
      let forbiddenPatterns: ReviewerRoutingForbiddenPattern[] | undefined;
      if (forbiddenPatternsRaw !== undefined) {
        if (!Array.isArray(forbiddenPatternsRaw)) {
          throw new Error(
            "converged contract fixture reviewer_routing_contract.forbidden_patterns must be a string array when provided."
          );
        }
        const forbiddenPatternValues = forbiddenPatternsRaw as unknown[];
        if (!forbiddenPatternValues.every((value) => typeof value === "string")) {
          throw new Error(
            "converged contract fixture reviewer_routing_contract.forbidden_patterns must be a string array when provided."
          );
        }
        const invalidPattern = forbiddenPatternValues.find(
          (value) =>
            !REVIEWER_ROUTING_FORBIDDEN_PATTERNS.some(
              (allowedPattern) => allowedPattern === value
            )
        );
        if (invalidPattern !== undefined) {
          throw new Error(
            `converged contract fixture reviewer_routing_contract.forbidden_patterns contains unsupported value=${String(invalidPattern)}. Allowed: ${REVIEWER_ROUTING_FORBIDDEN_PATTERNS.join(", ")}.`
          );
        }
        forbiddenPatterns =
          forbiddenPatternValues as ReviewerRoutingForbiddenPattern[];
      }
      reviewerRoutingContract = {
        ...(expectedRoute !== undefined ? { expectedRoute } : {}),
        ...(allowedConvergedFindingSeverities !== undefined
          ? { allowedConvergedFindingSeverities }
          : {}),
        ...(requiresNoStructuredFindingsRaw !== undefined
          ? { requiresNoStructuredFindings: requiresNoStructuredFindingsRaw }
          : {}),
        ...(forbiddenPatterns !== undefined ? { forbiddenPatterns } : {})
      };
    }

    const rolloutRaw = (fixtureRaw as Record<string, unknown>).rollout_contract;
    if (rolloutRaw !== undefined) {
      if (typeof rolloutRaw !== "object" || rolloutRaw === null) {
        throw new Error(
          "converged contract input.fixture.rollout_contract must be an object when provided."
        );
      }
      const rolloutRecord = rolloutRaw as Record<string, unknown>;
      const kickoffContractVersionRaw = rolloutRecord.kickoff_contract_version;
      let kickoffContractVersion: "baseline_inflight" | "advisory_v1" | undefined;
      if (
        kickoffContractVersionRaw !== undefined
        && kickoffContractVersionRaw !== "baseline_inflight"
        && kickoffContractVersionRaw !== "advisory_v1"
      ) {
        throw new Error(
          "converged contract fixture rollout_contract.kickoff_contract_version must be baseline_inflight or advisory_v1 when provided."
        );
      }
      if (kickoffContractVersionRaw !== undefined) {
        kickoffContractVersion = kickoffContractVersionRaw;
      }
      const inflightPolicyRaw = rolloutRecord.inflight_policy;
      let inflightPolicy: "kickoff_pinned_until_close" | undefined;
      if (
        inflightPolicyRaw !== undefined
        && inflightPolicyRaw !== "kickoff_pinned_until_close"
      ) {
        throw new Error(
          "converged contract fixture rollout_contract.inflight_policy must be kickoff_pinned_until_close when provided."
        );
      }
      if (inflightPolicyRaw !== undefined) {
        inflightPolicy = inflightPolicyRaw;
      }
      const gracePeriodGateRaw = rolloutRecord.grace_period_gate;
      let gracePeriodGate:
        | "required_for_new_rollout_signoff"
        | "baseline_only_within_window"
        | undefined;
      if (
        gracePeriodGateRaw !== undefined
        && gracePeriodGateRaw !== "required_for_new_rollout_signoff"
        && gracePeriodGateRaw !== "baseline_only_within_window"
      ) {
        throw new Error(
          "converged contract fixture rollout_contract.grace_period_gate must be required_for_new_rollout_signoff or baseline_only_within_window when provided."
        );
      }
      if (gracePeriodGateRaw !== undefined) {
        gracePeriodGate = gracePeriodGateRaw;
      }
      rolloutContract = {
        ...(kickoffContractVersion !== undefined ? { kickoffContractVersion } : {}),
        ...(inflightPolicy !== undefined ? { inflightPolicy } : {}),
        ...(gracePeriodGate !== undefined ? { gracePeriodGate } : {})
      };
    }
  }

  return {
    convergedInput: {
      summary: summaryRaw.trim(),
      ...(refs !== undefined ? { refs } : {}),
      ...(findings !== undefined ? { findings } : {})
    },
    scenario,
    ...(reviewerRoutingContract !== undefined ? { reviewerRoutingContract } : {}),
    ...(rolloutContract !== undefined ? { rolloutContract } : {}),
    ...(reviewArtifactType !== undefined ? { reviewArtifactType } : {})
  };
}

function normalizeConvergedResult(
  result: EmitConvergedResult,
  deliveries: CapturedConvergedDelivery[]
): ConvergedContractOutput {
  return {
    status: "ok",
    reasonCode: "CONVERGED_EMITTED",
    convergenceSequence: result.convergenceSequence,
    convergenceEnvelopeType: result.convergenceEnvelope.type,
    convergenceEnvelopeRecipient: result.convergenceEnvelope.recipient,
    approvalRequestSequence: result.approvalRequestSequence,
    approvalRequestEnvelopeType: result.approvalRequestEnvelope.type,
    approvalRequestRecipient: result.approvalRequestEnvelope.recipient,
    approvalRequestSender: result.approvalRequestEnvelope.sender,
    gateRoute: result.gateRoute,
    stateSubset: {
      state: result.state.state
    },
    deliveryCount: deliveries.length,
    deliveryRecipients: deliveries.map((delivery) => delivery.recipient),
    deliveryTargetRoles: deliveries
      .map((delivery) => delivery.targetRole)
      .filter((role): role is string => role !== null),
    deliveryRefKinds: deliveries.map((delivery) => delivery.refKind)
  };
}

function classifyDeliveryRefKind(messageRef: string | undefined): DeliveryRefKind {
  if (messageRef === undefined) {
    return "none";
  }
  return messageRef.includes("transcript.ndjson#") ? "transcript" : "external";
}

function assertContractExpectedSubset(input: {
  output: ConvergedContractOutput;
  expected: ContractCaseExpected;
  label: string;
}): void {
  if (input.output.status !== input.expected.status) {
    throw new Error(
      `${input.label}: status mismatch (expected=${input.expected.status}, actual=${input.output.status})`
    );
  }
  if (input.output.convergenceSequence >= input.output.approvalRequestSequence) {
    throw new Error(
      `${input.label}: sequence invariant failed (convergenceSequence=${input.output.convergenceSequence}, approvalRequestSequence=${input.output.approvalRequestSequence})`
    );
  }
  if (input.output.approvalRequestSequence !== input.output.convergenceSequence + 1) {
    throw new Error(
      `${input.label}: sequence adjacency invariant failed (convergenceSequence=${input.output.convergenceSequence}, approvalRequestSequence=${input.output.approvalRequestSequence})`
    );
  }
  if (
    input.expected.reasonCode !== undefined &&
    input.output.reasonCode !== input.expected.reasonCode
  ) {
    throw new Error(
      `${input.label}: reasonCode mismatch (expected=${input.expected.reasonCode}, actual=${input.output.reasonCode})`
    );
  }
  if (
    input.expected.gateRoute !== undefined &&
    input.output.gateRoute !== input.expected.gateRoute
  ) {
    throw new Error(
      `${input.label}: gateRoute mismatch (expected=${input.expected.gateRoute}, actual=${input.output.gateRoute})`
    );
  }
  if (
    input.expected.envelopeType !== undefined &&
    input.output.convergenceEnvelopeType !== input.expected.envelopeType
  ) {
    throw new Error(
      `${input.label}: envelopeType mismatch (expected=${input.expected.envelopeType}, actual=${input.output.convergenceEnvelopeType})`
    );
  }
  if (
    input.expected.convergenceRecipient !== undefined &&
    input.output.convergenceEnvelopeRecipient !== input.expected.convergenceRecipient
  ) {
    throw new Error(
      `${input.label}: convergenceRecipient mismatch (expected=${input.expected.convergenceRecipient}, actual=${input.output.convergenceEnvelopeRecipient})`
    );
  }
  if (
    input.expected.approvalRequestEnvelopeType !== undefined &&
    input.output.approvalRequestEnvelopeType !== input.expected.approvalRequestEnvelopeType
  ) {
    throw new Error(
      `${input.label}: approvalRequestEnvelopeType mismatch (expected=${input.expected.approvalRequestEnvelopeType}, actual=${input.output.approvalRequestEnvelopeType})`
    );
  }
  if (
    input.expected.approvalRequestRecipient !== undefined &&
    input.output.approvalRequestRecipient !== input.expected.approvalRequestRecipient
  ) {
    throw new Error(
      `${input.label}: approvalRequestRecipient mismatch (expected=${input.expected.approvalRequestRecipient}, actual=${input.output.approvalRequestRecipient})`
    );
  }
  if (
    input.expected.approvalRequestSender !== undefined &&
    input.output.approvalRequestSender !== input.expected.approvalRequestSender
  ) {
    throw new Error(
      `${input.label}: approvalRequestSender mismatch (expected=${input.expected.approvalRequestSender}, actual=${input.output.approvalRequestSender})`
    );
  }
  const expectedState = input.expected.stateSubset?.state;
  if (
    typeof expectedState === "string" &&
    input.output.stateSubset.state !== expectedState
  ) {
    throw new Error(
      `${input.label}: stateSubset.state mismatch (expected=${expectedState}, actual=${input.output.stateSubset.state})`
    );
  }
  if (
    input.expected.deliveryCount !== undefined &&
    input.output.deliveryCount !== input.expected.deliveryCount
  ) {
    throw new Error(
      `${input.label}: deliveryCount mismatch (expected=${input.expected.deliveryCount}, actual=${input.output.deliveryCount})`
    );
  }
  if (
    input.expected.deliveryRecipients !== undefined &&
    JSON.stringify(input.output.deliveryRecipients)
      !== JSON.stringify(input.expected.deliveryRecipients)
  ) {
    throw new Error(
      `${input.label}: deliveryRecipients mismatch (expected=${JSON.stringify(input.expected.deliveryRecipients)}, actual=${JSON.stringify(input.output.deliveryRecipients)})`
    );
  }
  if (
    input.expected.deliveryTargetRoles !== undefined &&
    JSON.stringify(input.output.deliveryTargetRoles)
      !== JSON.stringify(input.expected.deliveryTargetRoles)
  ) {
    throw new Error(
      `${input.label}: deliveryTargetRoles mismatch (expected=${JSON.stringify(input.expected.deliveryTargetRoles)}, actual=${JSON.stringify(input.output.deliveryTargetRoles)})`
    );
  }
  if (
    input.expected.deliveryRefKinds !== undefined &&
    JSON.stringify(input.output.deliveryRefKinds)
      !== JSON.stringify(input.expected.deliveryRefKinds)
  ) {
    throw new Error(
      `${input.label}: deliveryRefKinds mismatch (expected=${JSON.stringify(input.expected.deliveryRefKinds)}, actual=${JSON.stringify(input.output.deliveryRefKinds)})`
    );
  }
}

function assertParityEquivalent(input: {
  baseline: ConvergedContractOutput;
  v11: ConvergedContractOutput;
  caseId: string;
}): void {
  if (JSON.stringify(input.baseline) !== JSON.stringify(input.v11)) {
    throw new Error(
      `converged parity mismatch for case=${input.caseId}: baseline=${JSON.stringify(input.baseline)} v11=${JSON.stringify(input.v11)}`
    );
  }
}

function assertConvergedScenarioInvariant(input: {
  result: EmitConvergedResult;
  scenario: ParsedConvergedCaseInput["scenario"];
  caseId: string;
}): void {
  if (input.scenario !== "delivery_partial_failure") {
    return;
  }
  if (input.result.delivery?.delivered !== false) {
    throw new Error(
      `converged contract case=${input.caseId}: delivery_partial_failure expected delivery.delivered=false.`
    );
  }
  if (input.result.delivery.reason !== "delivery_unconfirmed") {
    throw new Error(
      `converged contract case=${input.caseId}: delivery_partial_failure expected reason=delivery_unconfirmed (actual=${input.result.delivery.reason ?? "none"}).`
    );
  }
}

function extractConvergenceEnvelopeFindings(input: {
  result: EmitConvergedResult;
  caseId: string;
}): ConvergedStructuredFinding[] {
  const payload = input.result.convergenceEnvelope.payload;
  if (typeof payload !== "object" || payload === null) {
    throw new Error(
      `converged contract case=${input.caseId}: convergence payload must be an object.`
    );
  }
  const findingsRaw = (payload as Record<string, unknown>).findings;
  if (findingsRaw === undefined) {
    return [];
  }
  if (!Array.isArray(findingsRaw)) {
    throw new Error(
      `converged contract case=${input.caseId}: convergence payload findings must be an array when provided.`
    );
  }
  return findingsRaw.map((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      throw new Error(
        `converged contract case=${input.caseId}: convergence payload findings[${index}] must be an object.`
      );
    }
    const record = entry as Record<string, unknown>;
    const severityRaw = record.severity;
    if (!isConvergedStructuredFindingSeverity(severityRaw)) {
      throw new Error(
        `converged contract case=${input.caseId}: convergence payload findings[${index}].severity must be P2 or P3.`
      );
    }
    const titleRaw = record.title;
    if (typeof titleRaw !== "string" || titleRaw.trim().length === 0) {
      throw new Error(
        `converged contract case=${input.caseId}: convergence payload findings[${index}].title must be a non-empty string.`
      );
    }
    const refsRaw = record.refs;
    if (
      refsRaw !== undefined
      && (
        !Array.isArray(refsRaw)
        || !refsRaw.every((value) => typeof value === "string")
      )
    ) {
      throw new Error(
        `converged contract case=${input.caseId}: convergence payload findings[${index}].refs must be a string array when provided.`
      );
    }
    return {
      severity: severityRaw,
      title: titleRaw.trim(),
      ...(refsRaw !== undefined ? { refs: refsRaw } : {})
    };
  });
}

function extractAdvisoryFindingsOpenTotal(input: {
  result: EmitConvergedResult;
  caseId: string;
}): number {
  const payload = input.result.convergenceEnvelope.payload;
  if (typeof payload !== "object" || payload === null) {
    throw new Error(
      `converged contract case=${input.caseId}: convergence payload must be an object.`
    );
  }
  const metadataRaw = (payload as Record<string, unknown>).metadata;
  if (typeof metadataRaw !== "object" || metadataRaw === null) {
    throw new Error(
      `converged contract case=${input.caseId}: convergence payload metadata must be an object.`
    );
  }
  const value = (metadataRaw as Record<string, unknown>).advisory_findings_open_total;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(
      `converged contract case=${input.caseId}: convergence payload metadata.advisory_findings_open_total must be a non-negative integer.`
    );
  }
  return value;
}

function assertFixtureRuntimeBinding(input: {
  parsedInput: ParsedConvergedCaseInput;
  result: EmitConvergedResult;
  caseId: string;
}): void {
  const emittedFindings = extractConvergenceEnvelopeFindings({
    result: input.result,
    caseId: input.caseId
  });
  const advisoryOpenTotal = extractAdvisoryFindingsOpenTotal({
    result: input.result,
    caseId: input.caseId
  });
  if (advisoryOpenTotal !== emittedFindings.length) {
    throw new Error(
      `converged contract case=${input.caseId}: advisory_findings_open_total (${advisoryOpenTotal}) must match emitted structured findings count (${emittedFindings.length}).`
    );
  }

  const routing = input.parsedInput.reviewerRoutingContract;
  if (routing !== undefined) {
    const contradiction = resolveConvergedSummaryFindingsContradiction({
      summary: input.parsedInput.convergedInput.summary,
      hasFindings: emittedFindings.length > 0
    });
    for (const pattern of routing.forbiddenPatterns ?? []) {
      switch (pattern) {
        case "summary_only_finding_claim_without_structured_finding": {
          if (contradiction === "summary_open_without_findings") {
            throw new Error(
              `converged contract case=${input.caseId}: forbidden pattern triggered at runtime (${pattern}).`
            );
          }
          break;
        }
        case "clean_summary_with_structured_findings": {
          if (contradiction === "summary_clean_with_findings") {
            throw new Error(
              `converged contract case=${input.caseId}: forbidden pattern triggered at runtime (${pattern}).`
            );
          }
          break;
        }
      }
    }
    if (
      routing.expectedRoute === "converged_with_advisory_findings"
      && emittedFindings.length === 0
    ) {
      throw new Error(
        `converged contract case=${input.caseId}: expected_route=converged_with_advisory_findings requires runtime structured findings.`
      );
    }
    if (
      routing.expectedRoute === "converged_clean"
      && emittedFindings.length > 0
    ) {
      throw new Error(
        `converged contract case=${input.caseId}: expected_route=converged_clean requires runtime clean findings payload.`
      );
    }
    if (
      routing.requiresNoStructuredFindings === true
      && emittedFindings.length > 0
    ) {
      throw new Error(
        `converged contract case=${input.caseId}: requires_no_structured_findings=true violated by runtime findings payload.`
      );
    }
    if (routing.allowedConvergedFindingSeverities !== undefined) {
      for (const finding of emittedFindings) {
        if (!routing.allowedConvergedFindingSeverities.includes(finding.severity)) {
          throw new Error(
            `converged contract case=${input.caseId}: runtime finding severity ${finding.severity} is outside allowed_converged_finding_severities=${routing.allowedConvergedFindingSeverities.join(",")}.`
          );
        }
      }
    }
  }

  const rollout = input.parsedInput.rolloutContract;
  if (rollout !== undefined) {
    // Route strictness (clean vs advisory findings payload) is enforced only by
    // reviewer_routing_contract fixture fields. rollout_contract version fields
    // model rollout policy context and must not force findings-count routing.
    if (
      rollout.gracePeriodGate === "required_for_new_rollout_signoff"
      && rollout.kickoffContractVersion !== "advisory_v1"
    ) {
      throw new Error(
        `converged contract case=${input.caseId}: grace_period_gate=required_for_new_rollout_signoff requires kickoff_contract_version=advisory_v1.`
      );
    }
    if (
      rollout.gracePeriodGate === "baseline_only_within_window"
      && rollout.kickoffContractVersion !== "baseline_inflight"
    ) {
      throw new Error(
        `converged contract case=${input.caseId}: grace_period_gate=baseline_only_within_window requires kickoff_contract_version=baseline_inflight.`
      );
    }
  }
}

async function executeConvergedCase(input: {
  caseDef: ContractCase;
  executor: typeof emitConvergedFromWorkspace;
  applyMetaReviewGateExecutor?: EmitConvergedDependencies["applyMetaReviewGateOnConvergence"];
}): Promise<ConvergedContractOutput> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-converged-contract-"));
  try {
    await initGitRepository(repoPath);
    const parsedInput = parseConvergedCaseInput(input.caseDef.input);
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: `b_contract_${input.caseDef.id}`,
      task: input.caseDef.description,
      ...(parsedInput.reviewArtifactType !== undefined
        ? { reviewArtifactType: parsedInput.reviewArtifactType }
        : {})
    });
    await seedConvergedCandidate(bubble.paths.worktreePath);
    const deliveries: CapturedConvergedDelivery[] = [];
    const nowIso = "2026-02-22T09:05:00.000Z";
    const activeMetaReviewerRecord: RuntimeSessionRecord = {
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      tmuxSessionName: "pf-converged-contract",
      updatedAt: nowIso,
      metaReviewerPane: {
        role: "meta-reviewer",
        paneIndex: 3,
        active: true,
        updatedAt: nowIso
      }
    };
    const emitDelivery: NonNullable<
      EmitConvergedDependencies["emitTmuxDeliveryNotification"]
    > = (deliveryInput) => {
      const targetRoleRaw =
        deliveryInput.envelope.payload.metadata?.[deliveryTargetRoleMetadataKey];
      deliveries.push({
        recipient: deliveryInput.envelope.recipient,
        targetRole: typeof targetRoleRaw === "string" ? targetRoleRaw : null,
        refKind: classifyDeliveryRefKind(deliveryInput.messageRef)
      });
      if (parsedInput.scenario === "delivery_partial_failure" && deliveries.length === 1) {
        return Promise.resolve({
          delivered: false,
          message: "delivery failed",
          reason: "delivery_unconfirmed"
        });
      }
      return Promise.resolve({
        delivered: true,
        message: "ok"
      });
    };
    const applyMetaReviewGateOnConvergence: NonNullable<
      EmitConvergedDependencies["applyMetaReviewGateOnConvergence"]
    > = (gateInput) =>
      (input.applyMetaReviewGateExecutor ?? (() => {
        throw new Error("missing applyMetaReviewGateOnConvergence executor");
      }))(gateInput, {
        setMetaReviewerPaneBinding: () =>
          Promise.resolve({
            updated: true as const,
            record: activeMetaReviewerRecord
          }),
        notifyMetaReviewerSubmissionRequest: () =>
          Promise.resolve({
            status: "confirmed" as const,
            reasonCode: null,
            message: "ok"
          })
      });

    const result = await input.executor({
      ...parsedInput.convergedInput,
      cwd: bubble.paths.worktreePath,
      now: new Date(nowIso)
    }, {
      emitTmuxDeliveryNotification: emitDelivery,
      applyMetaReviewGateOnConvergence
    });
    assertConvergedScenarioInvariant({
      result,
      scenario: parsedInput.scenario,
      caseId: input.caseDef.id
    });
    assertFixtureRuntimeBinding({
      parsedInput,
      result,
      caseId: input.caseDef.id
    });
    return normalizeConvergedResult(result, deliveries);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
}

export async function runConvergedContractCase(
  caseDef: ContractCase
): Promise<ConvergedContractRunResult> {
  if (caseDef.command !== "converged") {
    throw new Error(
      `Unsupported command for converged contract runner: ${caseDef.command}`
    );
  }

  if (caseDef.mode === "baseline") {
    const baseline = await executeConvergedCase({
      caseDef,
      executor: emitConvergedFromWorkspace,
      applyMetaReviewGateExecutor: applyMetaReviewGateOnConvergence
    });
    assertContractExpectedSubset({
      output: baseline,
      expected: caseDef.expected,
      label: "baseline"
    });
    return {
      mode: caseDef.mode,
      baseline
    };
  }

  if (caseDef.mode === "v11") {
    const v11 = await executeConvergedCase({
      caseDef,
      executor: emitConvergedFromWorkspaceV11,
      applyMetaReviewGateExecutor: applyMetaReviewGateOnConvergenceV11
    });
    assertContractExpectedSubset({
      output: v11,
      expected: caseDef.expected,
      label: "v11"
    });
    return {
      mode: caseDef.mode,
      v11
    };
  }

  const baseline = await executeConvergedCase({
    caseDef,
    executor: emitConvergedFromWorkspace,
    applyMetaReviewGateExecutor: applyMetaReviewGateOnConvergence
  });
  const v11 = await executeConvergedCase({
    caseDef,
    executor: emitConvergedFromWorkspaceV11,
    applyMetaReviewGateExecutor: applyMetaReviewGateOnConvergenceV11
  });
  assertContractExpectedSubset({
    output: baseline,
    expected: caseDef.expected,
    label: "parity/baseline"
  });
  assertContractExpectedSubset({
    output: v11,
    expected: caseDef.expected,
    label: "parity/v11"
  });
  assertParityEquivalent({
    baseline,
    v11,
    caseId: caseDef.id
  });
  return {
    mode: caseDef.mode,
    baseline,
    v11
  };
}
