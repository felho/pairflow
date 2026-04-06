export const projectName = "pairflow";

export function healthcheck(): string {
  return `${projectName}:ok`;
}

export {
  asAskHumanCommandErrorV11 as asAskHumanCommandError,
  emitAskHumanFromWorkspaceV11 as emitAskHumanFromWorkspace,
  AskHumanCommandErrorV11 as AskHumanCommandError
} from "./v11/application/askHuman/emitAskHumanV11.js";
export {
  emitActorProtocolFromWorkspaceV11 as emitActorProtocolFromWorkspace
} from "./v11/application/actorProtocol/emitActorProtocolV11.js";
export {
  asConvergedCommandErrorV11 as asConvergedCommandError,
  emitConvergedFromWorkspaceV11 as emitConvergedFromWorkspace,
  ConvergedCommandErrorV11 as ConvergedCommandError
} from "./v11/application/converged/emitConvergedV11.js";
export {
  asPassCommandErrorV11 as asPassCommandError,
  emitPassFromWorkspaceV11 as emitPassFromWorkspace,
  inferPassIntentV11 as inferPassIntent,
  PassCommandErrorV11 as PassCommandError
} from "./v11/application/pass/emitPassV11.js";
export {
  BubbleLookupError,
  resolveBubbleById
} from "./core/bubble/bubbleLookup.js";
export {
  asBubbleInboxError,
  BubbleInboxError,
  getBubbleInbox
} from "./core/bubble/inboxBubble.js";
export {
  asBubbleCommitErrorV11 as asBubbleCommitError,
  BubbleCommitErrorV11 as BubbleCommitError,
  commitBubbleV11 as commitBubble
} from "./v11/application/commit/emitCommitV11.js";
export {
  asBubbleMergeErrorV11 as asBubbleMergeError,
  BubbleMergeErrorV11 as BubbleMergeError,
  mergeBubbleV11 as mergeBubble
} from "./v11/application/merge/emitMergeV11.js";
export {
  asOpenBubbleError,
  executeOpenCommand,
  openBubble,
  OpenBubbleError
} from "./core/bubble/openBubble.js";
export {
  asResumeBubbleErrorV11 as asResumeBubbleError,
  DEFAULT_RESUME_MESSAGE,
  ResumeBubbleErrorV11 as ResumeBubbleError,
  resumeBubbleV11 as resumeBubble
} from "./v11/application/resume/emitResumeV11.js";
export {
  asRestartBubbleError,
  RestartBubbleError,
  restartBubble
} from "./core/bubble/restartBubble.js";
export {
  BubbleCreateError,
  createBubble
} from "./v11/application/create/createCommandApi.js";
export {
  asStartBubbleErrorV11 as asStartBubbleError,
  StartBubbleErrorV11 as StartBubbleError,
  startBubbleV11 as startBubble
} from "./v11/application/start/emitStartV11.js";
export {
  asBubbleListErrorV11 as asBubbleListError,
  BubbleListErrorV11 as BubbleListError,
  listBubblesV11 as listBubbles
} from "./v11/application/list/emitListV11.js";
export {
  asStartupReconcilerError,
  reconcileRuntimeSessions,
  StartupReconcilerError
} from "./core/runtime/startupReconciler.js";
export {
  asStopBubbleErrorV11 as asStopBubbleError,
  StopBubbleErrorV11 as StopBubbleError,
  stopBubbleV11 as stopBubble
} from "./v11/application/stop/emitStopV11.js";
export {
  asDeleteBubbleError,
  DeleteBubbleError,
  deleteBubble
} from "./v11/application/delete/deleteBubble.js";
export {
  asBubbleStatusError,
  BubbleStatusError,
  getBubbleStatus
} from "./core/bubble/statusBubble.js";
export {
  asBubbleWatchdogErrorV11 as asBubbleWatchdogError,
  BubbleWatchdogErrorV11 as BubbleWatchdogError,
  runBubbleWatchdogV11 as runBubbleWatchdog
} from "./v11/application/watchdog/emitWatchdogV11.js";
export {
  resolveBubbleFromWorkspaceCwd,
  WorkspaceResolutionError
} from "./core/bubble/workspaceResolution.js";
export { getBubblePaths } from "./core/bubble/paths.js";
export { createInitialBubbleState } from "./core/state/initialState.js";
export { runCli } from "./cli/index.js";
export { getOrchestraHelpText, runOrchestraCli } from "./cli/orchestra.js";
export {
  DEFAULT_COMMIT_REQUIRES_APPROVAL,
  DEFAULT_MAX_ROUNDS,
  DEFAULT_QUALITY_MODE,
  DEFAULT_WATCHDOG_TIMEOUT_MINUTES,
  DEFAULT_WORK_MODE
} from "./config/defaults.js";
export {
  asApprovalCommandErrorV11 as asApprovalCommandError,
  ApprovalCommandErrorV11 as ApprovalCommandError,
  emitApprovalDecisionV11 as emitApprovalDecision,
  emitApproveV11 as emitApprove,
  emitRequestReworkV11 as emitRequestRework
} from "./v11/application/approval/emitApprovalV11.js";
export {
  asHumanReplyCommandErrorV11 as asHumanReplyCommandError,
  emitHumanReplyV11 as emitHumanReply,
  HumanReplyCommandErrorV11 as HumanReplyCommandError
} from "./v11/application/reply/emitReplyV11.js";
export {
  getAskHumanHelpText,
  parseAskHumanCommandOptions,
  runAskHumanCommand
} from "./cli/commands/agent/askHuman.js";
export {
  getConvergedHelpText,
  parseConvergedCommandOptions,
  runConvergedCommand
} from "./cli/commands/agent/converged.js";
export {
  getBubbleApproveHelpText,
  parseBubbleApproveCommandOptions,
  runBubbleApproveCommand
} from "./cli/commands/bubble/approve.js";
export {
  getBubbleCommitHelpText,
  parseBubbleCommitCommandOptions,
  runBubbleCommitCommand
} from "./cli/commands/bubble/commit.js";
export {
  getBubbleMergeHelpText,
  parseBubbleMergeCommandOptions,
  runBubbleMergeCommand
} from "./cli/commands/bubble/merge.js";
export {
  getBubbleInboxHelpText,
  parseBubbleInboxCommandOptions,
  renderBubbleInboxText,
  runBubbleInboxCommand
} from "./cli/commands/bubble/inbox.js";
export {
  getBubbleCreateHelpText,
  parseBubbleCreateCommandOptions,
  runBubbleCreateCommand
} from "./cli/commands/bubble/create.js";
export {
  getBubbleOpenHelpText,
  parseBubbleOpenCommandOptions,
  runBubbleOpenCommand
} from "./cli/commands/bubble/open.js";
export {
  getBubbleResumeHelpText,
  parseBubbleResumeCommandOptions,
  runBubbleResumeCommand
} from "./cli/commands/bubble/resume.js";
export {
  getBubbleRestartHelpText,
  parseBubbleRestartCommandOptions,
  runBubbleRestartCommand
} from "./v11/application/restart/restartCliCommand.js";
export {
  getBubbleReplyHelpText,
  parseBubbleReplyCommandOptions,
  runBubbleReplyCommand
} from "./cli/commands/bubble/reply.js";
export {
  getBubbleStartHelpText,
  parseBubbleStartCommandOptions,
  runBubbleStartCommand
} from "./cli/commands/bubble/start.js";
export {
  getBubbleListHelpText,
  parseBubbleListCommandOptions,
  renderBubbleListText,
  runBubbleListCommand
} from "./cli/commands/bubble/list.js";
export {
  getBubbleReconcileHelpText,
  parseBubbleReconcileCommandOptions,
  renderBubbleReconcileText,
  runBubbleReconcileCommand
} from "./cli/commands/bubble/reconcile.js";
export {
  getBubbleStopHelpText,
  parseBubbleStopCommandOptions,
  runBubbleStopCommand
} from "./cli/commands/bubble/stop.js";
export {
  getBubbleDeleteHelpText,
  parseBubbleDeleteCommandOptions,
  runBubbleDeleteCommand
} from "./cli/commands/bubble/delete.js";
export {
  getBubbleStatusHelpText,
  parseBubbleStatusCommandOptions,
  renderBubbleStatusText,
  runBubbleStatusCommand
} from "./cli/commands/bubble/status.js";
export {
  getBubbleWatchdogHelpText,
  parseBubbleWatchdogCommandOptions,
  renderBubbleWatchdogText,
  runBubbleWatchdogCommand
} from "./cli/commands/bubble/watchdog.js";
export {
  getBubbleRequestReworkHelpText,
  parseBubbleRequestReworkCommandOptions,
  runBubbleRequestReworkCommand
} from "./cli/commands/bubble/requestRework.js";
export {
  getPassHelpText,
  parsePassCommandOptions,
  runPassCommand
} from "./cli/commands/agent/pass.js";
export {
  getUiServerHelpText,
  parseUiServerCommandOptions,
  runUiServerCommand
} from "./cli/commands/ui/server.js";
export {
  getRepoAddHelpText,
  parseRepoAddCommandOptions,
  runRepoAddCommand
} from "./cli/commands/repo/add.js";
export {
  getRepoListHelpText,
  parseRepoListCommandOptions,
  renderRepoListText,
  runRepoListCommand
} from "./cli/commands/repo/list.js";
export {
  getRepoRemoveHelpText,
  parseRepoRemoveCommandOptions,
  runRepoRemoveCommand
} from "./cli/commands/repo/remove.js";
export {
  TOML_PARSER_LIMITATIONS,
  renderBubbleConfigToml,
  assertValidBubbleConfig,
  parseBubbleConfigToml,
  parseToml,
  parseWatchdogTimeoutMinutes,
  validateBubbleConfig
} from "./config/bubbleConfig.js";
export {
  assertValidPairflowGlobalConfig,
  loadPairflowGlobalConfig,
  parsePairflowGlobalConfigToml,
  resolvePairflowGlobalConfigPath,
  validatePairflowGlobalConfig
} from "./config/pairflowConfig.js";
export {
  assertValidPairflowRepoConfig,
  loadPairflowRepoConfig,
  parsePairflowRepoConfigToml,
  resolvePairflowRepoConfigPath,
  validatePairflowRepoConfig
} from "./config/repoConfig.js";
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
export type {
  UiApiErrorBody,
  UiBubbleDetail,
  UiBubbleSummary,
  UiEvent,
  UiRepoSummary,
  UiTimelineEntry
} from "./types/ui.js";
export {
  StateStoreConflictError,
  createStateSnapshot,
  readStateSnapshot,
  writeStateSnapshot
} from "./core/state/stateStore.js";
export { applyStateTransition } from "./core/state/machine.js";
export {
  assertTransitionAllowed,
  canTransition,
  getAllowedTransitions,
  isActiveState,
  isFinalState
} from "./core/state/transitions.js";
export {
  GitCommandError,
  WorkspaceCleanupError,
  WorkspaceBootstrapError,
  WorkspaceError,
  bootstrapWorktreeWorkspace,
  cleanupWorktreeWorkspace
} from "./core/workspace/worktreeManager.js";
export {
  allocateNextProtocolSequence,
  formatProtocolEnvelopeId,
  TranscriptSequenceError
} from "./v11/shared/protocol/sequenceAllocator.js";
export { startUiServer } from "./core/ui/server.js";
export {
  appendProtocolEnvelopes,
  appendProtocolEnvelope,
  ProtocolTranscriptError,
  ProtocolTranscriptLockError,
  ProtocolTranscriptValidationError,
  readTranscriptEnvelopesOrThrow,
  readTranscriptEnvelopes
} from "./v11/infrastructure/artifact/transcript/transcriptStore.js";
export {
  validateConvergencePolicy
} from "./core/convergence/policy.js";
export {
  buildBubbleTmuxSessionName,
  launchBubbleTmuxSession,
  runTmux,
  terminateBubbleTmuxSession,
  TmuxCommandError,
  TmuxSessionExistsError
} from "./core/runtime/tmuxManager.js";
export {
  claimRuntimeSession,
  readRuntimeSessionsRegistry,
  removeRuntimeSession,
  removeRuntimeSessions,
  RuntimeSessionsRegistryError,
  RuntimeSessionsRegistryLockError,
  upsertRuntimeSession
} from "./core/runtime/sessionsRegistry.js";
export {
  emitBubbleNotification,
  playSoundWithAfplay
} from "./core/runtime/notifications.js";
export {
  emitTmuxDeliveryNotification
} from "./core/runtime/tmuxDelivery.js";
export {
  readRepoRegistry,
  registerRepoInRegistry,
  removeRepoFromRegistry,
  resolveRepoRegistryPath,
  RepoRegistryError,
  RepoRegistryLockError
} from "./core/repo/registry.js";
export {
  computeWatchdogStatus
} from "./core/runtime/watchdog.js";
export {
  assertValidProtocolEnvelope,
  validateProtocolEnvelope
} from "./v11/shared/protocol/validators.js";
export { parseEnvelopeLine, serializeEnvelopeLine } from "./v11/shared/protocol/envelope.js";
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
  EmitAskHumanV11Input as EmitAskHumanInput,
  EmitAskHumanV11Result as EmitAskHumanResult
} from "./v11/application/askHuman/emitAskHumanV11.js";
export type {
  EmitConvergedV11Input as EmitConvergedInput,
  EmitConvergedV11Result as EmitConvergedResult
} from "./v11/application/converged/emitConvergedV11.js";
export type {
  EmitPassInput,
  EmitPassResult
} from "./v11/application/pass/passCommandContract.js";
export type {
  BubbleInboxInput,
  BubbleInboxView,
  PendingInboxItem,
  PendingInboxItemType
} from "./core/bubble/inboxBubble.js";
export type {
  CommitBubbleV11Input as CommitBubbleInput,
  CommitBubbleV11Result as CommitBubbleResult
} from "./v11/application/commit/emitCommitV11.js";
export type {
  MergeBubbleV11Input as MergeBubbleInput,
  MergeBubbleV11Result as MergeBubbleResult
} from "./v11/application/merge/emitMergeV11.js";
export type {
  ResolvedBubbleById
} from "./core/bubble/bubbleLookup.js";
export type {
  OpenBubbleDependencies,
  OpenBubbleInput,
  OpenBubbleResult,
  OpenCommandExecutionInput,
  OpenCommandExecutionResult,
  OpenCommandExecutor
} from "./core/bubble/openBubble.js";
export type {
  ResumeBubbleV11Dependencies as ResumeBubbleDependencies,
  ResumeBubbleV11Input as ResumeBubbleInput,
  ResumeBubbleV11Result as ResumeBubbleResult
} from "./v11/application/resume/emitResumeV11.js";
export type {
  RestartBubbleDependencies,
  RestartBubbleInput,
  RestartBubbleResult
} from "./core/bubble/restartBubble.js";
export type {
  StartBubbleV11Dependencies as StartBubbleDependencies,
  StartBubbleV11Input as StartBubbleInput,
  StartBubbleV11Result as StartBubbleResult
} from "./v11/application/start/emitStartV11.js";
export type {
  StopBubbleV11Dependencies as StopBubbleDependencies,
  StopBubbleV11Input as StopBubbleInput,
  StopBubbleV11Result as StopBubbleResult
} from "./v11/application/stop/emitStopV11.js";
export type {
  BubbleListV11Input as BubbleListInput,
  BubbleListV11Entry as BubbleListEntry,
  BubbleListV11StateCounts as BubbleListStateCounts,
  BubbleListV11View as BubbleListView
} from "./v11/application/list/emitListV11.js";
export type {
  ReconcileRuntimeSessionsAction,
  ReconcileRuntimeSessionsInput,
  ReconcileRuntimeSessionsReport,
  RuntimeSessionStaleReason
} from "./core/runtime/startupReconciler.js";
export type {
  BubbleStatusInput,
  BubbleStatusView
} from "./core/bubble/statusBubble.js";
export type {
  BubbleWatchdogV11Input as BubbleWatchdogInput,
  BubbleWatchdogV11NoopReason as BubbleWatchdogNoopReason,
  BubbleWatchdogV11Result as BubbleWatchdogResult
} from "./v11/application/watchdog/emitWatchdogV11.js";
export type {
  ResolvedBubbleWorkspace
} from "./core/bubble/workspaceResolution.js";
export type {
  BubbleCreateInput,
  BubbleCreateResult,
  ResolvedTaskInput
} from "./v11/application/create/createCommandContract.js";
export type { BubblePaths } from "./core/bubble/paths.js";
export type {
  AskHumanCommandOptions,
  AskHumanHelpCommandOptions,
  ParsedAskHumanCommandOptions
} from "./cli/commands/agent/askHuman.js";
export type {
  ConvergedCommandOptions,
  ConvergedHelpCommandOptions,
  ParsedConvergedCommandOptions
} from "./cli/commands/agent/converged.js";
export type {
  ParsedPassCommandOptions,
  PassHelpCommandOptions,
  PassCommandOptions
} from "./cli/commands/agent/pass.js";
export type {
  BubbleApproveCommandOptions,
  BubbleApproveHelpCommandOptions,
  ParsedBubbleApproveCommandOptions
} from "./cli/commands/bubble/approve.js";
export type {
  BubbleCommitCommandOptions,
  BubbleCommitHelpCommandOptions,
  ParsedBubbleCommitCommandOptions
} from "./cli/commands/bubble/commit.js";
export type {
  BubbleMergeCommandOptions,
  BubbleMergeHelpCommandOptions,
  ParsedBubbleMergeCommandOptions
} from "./cli/commands/bubble/merge.js";
export type {
  BubbleOpenCommandOptions,
  BubbleOpenHelpCommandOptions,
  ParsedBubbleOpenCommandOptions
} from "./cli/commands/bubble/open.js";
export type {
  BubbleResumeCommandOptions,
  BubbleResumeHelpCommandOptions,
  ParsedBubbleResumeCommandOptions
} from "./cli/commands/bubble/resume.js";
export type {
  BubbleRestartCommandOptions,
  BubbleRestartHelpCommandOptions,
  ParsedBubbleRestartCommandOptions
} from "./v11/application/restart/restartCliCommand.js";
export type {
  BubbleInboxCommandOptions,
  BubbleInboxHelpCommandOptions,
  ParsedBubbleInboxCommandOptions
} from "./cli/commands/bubble/inbox.js";
export type {
  BubbleReplyCommandOptions,
  BubbleReplyHelpCommandOptions,
  ParsedBubbleReplyCommandOptions
} from "./cli/commands/bubble/reply.js";
export type {
  BubbleStartCommandOptions,
  BubbleStartHelpCommandOptions,
  ParsedBubbleStartCommandOptions
} from "./cli/commands/bubble/start.js";
export type {
  BubbleStopCommandOptions,
  BubbleStopHelpCommandOptions,
  ParsedBubbleStopCommandOptions
} from "./cli/commands/bubble/stop.js";
export type {
  BubbleListCommandOptions,
  BubbleListHelpCommandOptions,
  ParsedBubbleListCommandOptions
} from "./cli/commands/bubble/list.js";
export type {
  BubbleReconcileCommandOptions,
  BubbleReconcileHelpCommandOptions,
  ParsedBubbleReconcileCommandOptions
} from "./cli/commands/bubble/reconcile.js";
export type {
  BubbleStatusCommandOptions,
  BubbleStatusHelpCommandOptions,
  ParsedBubbleStatusCommandOptions
} from "./cli/commands/bubble/status.js";
export type {
  BubbleWatchdogCommandOptions,
  BubbleWatchdogHelpCommandOptions,
  ParsedBubbleWatchdogCommandOptions
} from "./cli/commands/bubble/watchdog.js";
export type {
  BubbleRequestReworkCommandOptions,
  BubbleRequestReworkHelpCommandOptions,
  ParsedBubbleRequestReworkCommandOptions
} from "./cli/commands/bubble/requestRework.js";
export type {
  BubbleCreateCommandOptions
} from "./cli/commands/bubble/create.js";
export type {
  BubbleAgentsConfig,
  BubbleCommandsConfig,
  BubbleConfig,
  BubbleLifecycleState,
  BubbleNotificationsConfig,
  BubbleReworkIntentRecord,
  BubbleStateSnapshot,
  AgentName,
  AgentRole,
  QualityMode,
  ReworkIntentStatus,
  RoundRoleHistoryEntry,
  WorkMode
} from "./types/bubble.js";
export type { StateTransitionInput } from "./core/state/machine.js";
export type {
  LoadedStateSnapshot,
  WriteStateSnapshotOptions
} from "./core/state/stateStore.js";
export type {
  WorktreeCleanupInput,
  WorktreeCleanupResult,
  WorktreeBootstrapInput,
  WorktreeBootstrapResult
} from "./core/workspace/worktreeManager.js";
export type { Finding, FindingSeverity } from "./types/findings.js";
export type {
  ProtocolSequenceAllocationOptions,
  ProtocolSequenceAllocation
} from "./v11/shared/protocol/sequenceAllocator.js";
export type {
  LaunchBubbleTmuxSessionInput,
  LaunchBubbleTmuxSessionResult,
  TerminateBubbleTmuxSessionInput,
  TerminateBubbleTmuxSessionResult,
  TmuxRunOptions,
  TmuxRunResult,
  TmuxRunner
} from "./core/runtime/tmuxManager.js";
export type {
  ClaimRuntimeSessionInput,
  ClaimRuntimeSessionResult,
  ReadRuntimeSessionsOptions,
  RemoveRuntimeSessionsInput,
  RemoveRuntimeSessionsResult,
  RemoveRuntimeSessionInput,
  RuntimeSessionRecord,
  RuntimeSessionsRegistry,
  UpsertRuntimeSessionInput
} from "./core/runtime/sessionsRegistry.js";
export type {
  BubbleNotificationDependencies,
  BubbleNotificationKind,
  BubbleNotificationResult,
  NotificationPathExists,
  NotificationSoundPlayer
} from "./core/runtime/notifications.js";
export type {
  ReadRepoRegistryInput,
  ReadRepoRegistryResult,
  RegisterRepoInput,
  RegisterRepoResult,
  RemoveRepoInput,
  RemoveRepoResult,
  RepoRegistryEntry
} from "./core/repo/registry.js";
export type {
  EmitTmuxDeliveryNotificationInput,
  EmitTmuxDeliveryNotificationResult,
  TmuxDeliveryFailureReason
} from "./core/runtime/tmuxDelivery.js";
export type {
  WatchdogStatus
} from "./core/runtime/watchdog.js";
export type {
  ConvergencePolicyInput,
  ConvergencePolicyResult
} from "./core/convergence/policy.js";
export type {
  AppendProtocolEnvelopeBatchEntry,
  AppendProtocolEnvelopeInput,
  AppendProtocolEnvelopeResult,
  AppendProtocolEnvelopesInput,
  AppendProtocolEnvelopesResult,
  ProtocolMirrorWriteFailure,
  ReadTranscriptOptions,
  ProtocolEnvelopeDraft
} from "./v11/infrastructure/artifact/transcript/transcriptStore.js";
export type {
  EmitApprovalDecisionV11Input as EmitApprovalDecisionInput,
  EmitApprovalDecisionV11Result as EmitApprovalDecisionResult,
  EmitApproveV11Input as EmitApproveInput,
  EmitRequestReworkV11Input as EmitRequestReworkInput,
  EmitRequestReworkImmediateV11Result as EmitRequestReworkImmediateResult,
  EmitRequestReworkQueuedV11Result as EmitRequestReworkQueuedResult,
  EmitRequestReworkV11Result as EmitRequestReworkResult
} from "./v11/application/approval/emitApprovalV11.js";
export type {
  EmitHumanReplyV11Input as EmitHumanReplyInput,
  EmitHumanReplyV11Result as EmitHumanReplyResult
} from "./v11/application/reply/emitReplyV11.js";
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
