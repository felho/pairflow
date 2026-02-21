export const projectName = "pairflow";

export function healthcheck(): string {
  return `${projectName}:ok`;
}

export {
  DEFAULT_COMMIT_REQUIRES_APPROVAL,
  DEFAULT_MAX_ROUNDS,
  DEFAULT_QUALITY_MODE,
  DEFAULT_WATCHDOG_TIMEOUT_MINUTES,
  DEFAULT_WORK_MODE
} from "./config/defaults.js";
export {
  TOML_PARSER_LIMITATIONS,
  assertValidBubbleConfig,
  parseBubbleConfigToml,
  parseToml,
  parseWatchdogTimeoutMinutes,
  validateBubbleConfig
} from "./config/bubbleConfig.js";
export {
  SchemaValidationError,
  assertValidation,
  isInteger,
  isIsoTimestamp,
  isNonEmptyString,
  isRecord,
  validationFail,
  validationOk
} from "./core/validation.js";
export {
  assertValidBubbleStateSnapshot,
  validateBubbleStateSnapshot
} from "./core/state/stateSchema.js";
export {
  assertValidProtocolEnvelope,
  validateProtocolEnvelope
} from "./core/protocol/validators.js";
export { parseEnvelopeLine, serializeEnvelopeLine } from "./core/protocol/envelope.js";
export {
  agentNames,
  agentRoles,
  bubbleLifecycleStates,
  isAgentName,
  isAgentRole,
  isBubbleLifecycleState,
  isQualityMode,
  isWorkMode,
  qualityModes,
  workModes
} from "./types/bubble.js";
export { findingSeverities, isFindingSeverity } from "./types/findings.js";
export {
  approvalDecisions,
  isApprovalDecision,
  isPassIntent,
  isProtocolMessageType,
  isProtocolParticipant,
  passIntents,
  protocolMessageTypes,
  protocolParticipants
} from "./types/protocol.js";
export type {
  BubbleAgentsConfig,
  BubbleCommandsConfig,
  BubbleConfig,
  BubbleLifecycleState,
  BubbleNotificationsConfig,
  BubbleStateSnapshot,
  AgentName,
  AgentRole,
  QualityMode,
  RoundRoleHistoryEntry,
  WorkMode
} from "./types/bubble.js";
export type { Finding, FindingSeverity } from "./types/findings.js";
export type {
  ApprovalDecision,
  PassIntent,
  ProtocolEnvelope,
  ProtocolEnvelopePayload,
  ProtocolMessageType,
  ProtocolParticipant
} from "./types/protocol.js";
export type {
  ValidationError,
  ValidationFail,
  ValidationOk,
  ValidationResult
} from "./core/validation.js";
