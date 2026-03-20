export type CommandMigrationState = "legacy" | "parity" | "v11";

export interface ContractCaseExpected {
  status: string;
  reasonCode?: string;
  commandReason?: string;
  gateRoute?: string;
  stateSubset?: Record<string, unknown>;
  envelopeType?: string;
  deliveryCount?: number;
  deliveryRecipients?: string[];
  deliveryTargetRoles?: string[];
  deliveryRefKinds?: string[];
  convergenceRecipient?: string;
  approvalRequestEnvelopeType?: string;
  approvalRequestRecipient?: string;
  approvalRequestSender?: string;
  envelopePayloadSubset?: Record<string, unknown>;
}

export interface ContractCase {
  id: string;
  command: string;
  mode: CommandMigrationState;
  description: string;
  input: Record<string, unknown>;
  expected: ContractCaseExpected;
  tags?: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function assertContractCaseShape(value: unknown): asserts value is ContractCase {
  if (!isRecord(value)) {
    throw new Error("Contract case must be an object.");
  }
  if (typeof value.id !== "string" || value.id.length === 0) {
    throw new Error("Contract case id must be a non-empty string.");
  }
  if (typeof value.command !== "string" || value.command.length === 0) {
    throw new Error("Contract case command must be a non-empty string.");
  }
  if (value.mode !== "legacy" && value.mode !== "parity" && value.mode !== "v11") {
    throw new Error("Contract case mode must be one of: legacy, parity, v11.");
  }
  if (typeof value.description !== "string" || value.description.length === 0) {
    throw new Error("Contract case description must be a non-empty string.");
  }
  if (!isRecord(value.input)) {
    throw new Error("Contract case input must be an object.");
  }
  if (!isRecord(value.expected)) {
    throw new Error("Contract case expected must be an object.");
  }
  if (
    typeof value.expected.status !== "string" ||
    value.expected.status.length === 0
  ) {
    throw new Error("Contract case expected.status must be a non-empty string.");
  }
  if (
    "commandReason" in value.expected &&
    value.expected.commandReason !== undefined &&
    (
      typeof value.expected.commandReason !== "string" ||
      value.expected.commandReason.length === 0
    )
  ) {
    throw new Error(
      "Contract case expected.commandReason must be a non-empty string when provided."
    );
  }
  if (
    "gateRoute" in value.expected &&
    value.expected.gateRoute !== undefined &&
    (
      typeof value.expected.gateRoute !== "string" ||
      value.expected.gateRoute.length === 0
    )
  ) {
    throw new Error(
      "Contract case expected.gateRoute must be a non-empty string when provided."
    );
  }
  if (
    "convergenceRecipient" in value.expected &&
    value.expected.convergenceRecipient !== undefined &&
    (
      typeof value.expected.convergenceRecipient !== "string" ||
      value.expected.convergenceRecipient.length === 0
    )
  ) {
    throw new Error(
      "Contract case expected.convergenceRecipient must be a non-empty string when provided."
    );
  }
  if (
    "approvalRequestEnvelopeType" in value.expected &&
    value.expected.approvalRequestEnvelopeType !== undefined &&
    (
      typeof value.expected.approvalRequestEnvelopeType !== "string" ||
      value.expected.approvalRequestEnvelopeType.length === 0
    )
  ) {
    throw new Error(
      "Contract case expected.approvalRequestEnvelopeType must be a non-empty string when provided."
    );
  }
  if (
    "approvalRequestRecipient" in value.expected &&
    value.expected.approvalRequestRecipient !== undefined &&
    (
      typeof value.expected.approvalRequestRecipient !== "string" ||
      value.expected.approvalRequestRecipient.length === 0
    )
  ) {
    throw new Error(
      "Contract case expected.approvalRequestRecipient must be a non-empty string when provided."
    );
  }
  if (
    "approvalRequestSender" in value.expected &&
    value.expected.approvalRequestSender !== undefined &&
    (
      typeof value.expected.approvalRequestSender !== "string" ||
      value.expected.approvalRequestSender.length === 0
    )
  ) {
    throw new Error(
      "Contract case expected.approvalRequestSender must be a non-empty string when provided."
    );
  }
  if (
    "deliveryCount" in value.expected &&
    value.expected.deliveryCount !== undefined &&
    (
      typeof value.expected.deliveryCount !== "number" ||
      !Number.isInteger(value.expected.deliveryCount) ||
      value.expected.deliveryCount < 0
    )
  ) {
    throw new Error(
      "Contract case expected.deliveryCount must be a non-negative integer when provided."
    );
  }
  if (
    "deliveryRecipients" in value.expected &&
    value.expected.deliveryRecipients !== undefined &&
    !isStringArray(value.expected.deliveryRecipients)
  ) {
    throw new Error(
      "Contract case expected.deliveryRecipients must be a string array when provided."
    );
  }
  if (
    "deliveryTargetRoles" in value.expected &&
    value.expected.deliveryTargetRoles !== undefined &&
    !isStringArray(value.expected.deliveryTargetRoles)
  ) {
    throw new Error(
      "Contract case expected.deliveryTargetRoles must be a string array when provided."
    );
  }
  if (
    "deliveryRefKinds" in value.expected &&
    value.expected.deliveryRefKinds !== undefined &&
    !isStringArray(value.expected.deliveryRefKinds)
  ) {
    throw new Error(
      "Contract case expected.deliveryRefKinds must be a string array when provided."
    );
  }
  if (
    "tags" in value &&
    value.tags !== undefined &&
    !isStringArray(value.tags)
  ) {
    throw new Error("Contract case tags must be a string array when provided.");
  }
}
