import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  parseApproveBody,
  parseCommitBody,
  parseDeleteBody,
  parseMergeBody,
  parseReviewPolicyBody,
  requireMessage
} from "../../src/v11/infrastructure/ui/routerHttpBody.js";

const repoRoot = process.cwd();

async function readSource(relativePath: string): Promise<string> {
  return readFile(join(repoRoot, relativePath), "utf8");
}

async function readTypeScriptSources(
  relativeDirectory: string
): Promise<Map<string, string>> {
  const root = join(repoRoot, relativeDirectory);
  const sources = new Map<string, string>();

  async function collect(absoluteDirectory: string, sourceDirectory: string): Promise<void> {
    const entries = await readdir(absoluteDirectory, { withFileTypes: true });
    for (const entry of entries) {
      const relativePath = `${sourceDirectory}/${entry.name}`;
      const absolutePath = join(absoluteDirectory, entry.name);
      if (entry.isDirectory()) {
        await collect(absolutePath, relativePath);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith(".ts")) {
        continue;
      }
      sources.set(relativePath, await readFile(absolutePath, "utf8"));
    }
  }

  await collect(root, relativeDirectory);
  return sources;
}

function expectOnlySourcePathsContaining(
  sources: Map<string, string>,
  marker: string,
  expectedPaths: string[]
): void {
  const matches = [...sources.entries()]
    .filter(([, source]) => source.includes(marker))
    .map(([relativePath]) => relativePath)
    .sort();
  expect(matches).toEqual([...expectedPaths].sort());
}

function expectNoTypeDeclaration(source: string, symbol: string): void {
  expect(source).not.toMatch(new RegExp(`interface\\s+${symbol}\\b`));
  expect(source).not.toMatch(new RegExp(`type\\s+${symbol}\\s*=`));
}

function expectTypeDeclaration(source: string, symbol: string): void {
  expect(source).toMatch(
    new RegExp(`(?:interface\\s+${symbol}\\b|type\\s+${symbol}\\s*=)`)
  );
}

function extractInterfaceBody(source: string, symbol: string): string {
  const match = new RegExp(`export interface ${symbol}\\b[^\\{]*\\{`, "u").exec(
    source
  );
  expect(match).not.toBeNull();
  if (match === null) {
    return "";
  }

  const bodyStart = match.index + match[0].length;
  let depth = 1;
  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source.charAt(index);
    if (character === "{") {
      depth += 1;
    }
    if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        const body = source.slice(bodyStart, index);
        expect(body).not.toBe("");
        return body;
      }
    }
  }

  expect(depth).toBe(0);
  return "";
}

const producerHelperExportPattern =
  /export\s+(?:(?:function\s+)|(?:const\s+))(present|map|normalize|resolve|read)\w*/u;

describe("UI contract transit source guards", () => {
  it("keeps remote execution transit surfaces as canonical re-exports", async () => {
    const transit = await readSource("src/types/uiRemoteExecution.ts");
    const backendCompat = await readSource("src/shared/contracts/uiRemoteExecution.ts");
    const uiCompat = await readSource("ui/src/lib/contracts/uiRemoteExecution.ts");

    expect(transit).toContain("from \"../contracts/ui/uiRemoteExecution.js\"");
    expect(backendCompat).toContain("from \"../../contracts/ui/uiRemoteExecution.js\"");
    expect(uiCompat).toContain(
      "from \"../../../../src/contracts/ui/uiRemoteExecution.js\""
    );
    expect(transit).not.toMatch(/interface\s+UiBubble/);
    expect(transit).not.toMatch(/type\s+UiBubble\w+\s*=/);
    expect(backendCompat).not.toMatch(/interface\s+UiBubble/);
    expect(backendCompat).not.toMatch(/type\s+UiBubble\w+\s*=/);
    expect(uiCompat).not.toMatch(/interface\s+UiBubble/);
    expect(uiCompat).not.toMatch(/type\s+UiBubble\w+\s*=/);
    expect([transit, backendCompat, uiCompat].join("\n")).not.toMatch(
      /mirror|mirrored|keep.*sync/i
    );
  });

  it("keeps state validation diagnostics browser-safe and canonical", async () => {
    const canonical = await readSource("src/contracts/ui/stateValidation.ts");
    const backendCompat = await readSource("src/shared/contracts/stateValidation.ts");
    const uiCompat = await readSource("ui/src/lib/contracts/stateValidation.ts");
    const stateSnapshots = await readSource("src/v11/shared/ports/stateSnapshots.ts");

    expect(canonical).toMatch(
      /export interface ContractValidationError\s*{\s*path:\s*string;\s*message:\s*string;\s*}/
    );
    expect(canonical).toMatch(
      /export interface StateValidationDiagnostics\s*{\s*message:\s*string;\s*errors:\s*ContractValidationError\[\];\s*}/
    );
    expect(canonical).not.toContain("v11/");
    expect(canonical).not.toContain("validation/primitives");
    expect(backendCompat).toContain("from \"../../contracts/ui/stateValidation.js\"");
    expect(uiCompat).toContain(
      "from \"../../../../src/contracts/ui/stateValidation.js\""
    );
    expect(stateSnapshots).toContain(
      "from \"../../../contracts/ui/stateValidation.js\""
    );
    expect(stateSnapshots).not.toContain("shared/contracts/stateValidation");
    expect(stateSnapshots).not.toContain("validation/primitives");
    expect(stateSnapshots).not.toMatch(
      /interface\s+(ContractValidationError|StateValidationDiagnostics)/
    );
    expect(stateSnapshots).not.toMatch(
      /type\s+(ContractValidationError|StateValidationDiagnostics)\s*=/
    );
    expect(backendCompat).not.toMatch(
      /interface\s+(ContractValidationError|StateValidationDiagnostics)/
    );
    expect(uiCompat).not.toMatch(
      /interface\s+(ContractValidationError|StateValidationDiagnostics)/
    );
    expect(backendCompat).not.toMatch(
      /type\s+(ContractValidationError|StateValidationDiagnostics)\s*=/
    );
    expect(uiCompat).not.toMatch(
      /type\s+(ContractValidationError|StateValidationDiagnostics)\s*=/
    );
    expect([backendCompat, uiCompat, stateSnapshots].join("\n")).not.toMatch(
      /mirror|mirrored|keep.*sync/i
    );
  });

  it("keeps lifecycle literals in src/types/bubble and re-exports them canonically", async () => {
    const runtime = await readSource("src/types/bubble.ts");
    const canonical = await readSource("src/contracts/ui/bubbleLifecycle.ts");
    const backendCompat = await readSource("src/shared/contracts/bubbleLifecycle.ts");
    const uiCompat = await readSource("ui/src/lib/contracts/bubbleLifecycle.ts");
    const stateSnapshots = await readSource("src/v11/shared/ports/stateSnapshots.ts");

    expect(runtime.match(/export const bubbleLifecycleStates = \[/g)).toHaveLength(
      1
    );
    expect(canonical).toContain("from \"../../types/bubble.js\"");
    expect(canonical).not.toMatch(/bubbleLifecycleStates\s*=\s*\[/);
    expect(backendCompat).toContain("from \"../../contracts/ui/bubbleLifecycle.js\"");
    expect(backendCompat).not.toMatch(/bubbleLifecycleStates\s*=\s*\[/);
    expect(uiCompat).toContain(
      "from \"../../../../src/contracts/ui/bubbleLifecycle.js\""
    );
    expect(stateSnapshots).toContain(
      "from \"../../../contracts/ui/bubbleLifecycle.js\""
    );
    expect(stateSnapshots).not.toMatch(/bubbleLifecycleStates\s*=\s*\[/);
    expect(stateSnapshots).not.toMatch(/type\s+BubbleLifecycleState\s*=/);
    expect(stateSnapshots).not.toMatch(/interface\s+BubbleLifecycleState/);
    expect(uiCompat).not.toMatch(/bubbleLifecycleStates\s*=\s*\[/);
    expect([canonical, backendCompat, uiCompat, stateSnapshots].join("\n")).not.toMatch(
      /mirror|mirrored|keep.*sync/i
    );
  });

  it("keeps delete-bubble UI names as aliases of the canonical contract", async () => {
    const canonical = await readSource("src/contracts/ui/deleteBubble.ts");
    const backendCompat = await readSource("src/contracts/deleteBubble.ts");
    const uiTypes = await readSource("ui/src/lib/types.ts");

    expect(canonical).toContain("export interface DeleteBubbleArtifacts");
    expect(canonical).toContain("export interface DeleteBubbleResult");
    expect(backendCompat).toContain("from \"./ui/deleteBubble.js\"");
    expect(uiTypes).toContain("from \"../../../src/contracts/ui/deleteBubble.js\"");
    expect(uiTypes).toContain(
      "DeleteBubbleArtifacts as BubbleDeleteArtifacts"
    );
    expect(uiTypes).toContain("DeleteBubbleResult as BubbleDeleteResult");
    expect(backendCompat).not.toMatch(/interface\s+DeleteBubbleArtifacts/);
    expect(backendCompat).not.toMatch(/interface\s+DeleteBubbleResult/);
    expect(backendCompat).not.toMatch(/type\s+DeleteBubbleArtifacts\s*=/);
    expect(backendCompat).not.toMatch(/type\s+DeleteBubbleResult\s*=/);
    expect(uiTypes).not.toMatch(/interface\s+BubbleDeleteArtifacts/);
    expect(uiTypes).not.toMatch(/interface\s+BubbleDeleteResult/);
    expect(uiTypes).not.toMatch(/interface\s+DeleteBubbleArtifacts/);
    expect(uiTypes).not.toMatch(/interface\s+DeleteBubbleResult/);
    expect(uiTypes).not.toMatch(/type\s+BubbleDeleteArtifacts\s*=/);
    expect(uiTypes).not.toMatch(/type\s+BubbleDeleteResult\s*=/);
    expect(uiTypes).not.toMatch(/type\s+DeleteBubbleArtifacts\s*=/);
    expect(uiTypes).not.toMatch(/type\s+DeleteBubbleResult\s*=/);
    expect([backendCompat, uiTypes].join("\n")).not.toMatch(
      /mirror|mirrored|keep.*sync/i
    );
  });

  it("keeps broad read-model DTOs in the canonical UI read-model contract", async () => {
    const canonical = await readSource("src/contracts/ui/uiReadModel.ts");
    const backendCompat = await readSource("src/types/ui.ts");
    const uiTypes = await readSource("ui/src/lib/types.ts");
    const uiCompat = await readSource("ui/src/lib/contracts/uiReadModel.ts");
    const presenter = await readSource(
      "src/v11/infrastructure/ui/presenters/bubblePresenter.ts"
    );
    const timelinePresenter = await readSource(
      "src/v11/infrastructure/ui/presenters/timelinePresenter.ts"
    );

    for (const symbol of [
      "UiBubbleSummary",
      "UiBubbleDetail",
      "UiBubbleListEntry",
      "UiBubbleListView",
      "UiBubbleStatusInput",
      "UiBubbleStatusView",
      "UiBubbleInboxInput",
      "UiBubbleInboxView",
      "UiRepoSummary",
      "UiTimelineEntry",
      "UiRuntimeSessionRecord",
      "UiBubbleReviewPolicy",
      "UiBubbleWatchdog",
      "UiPendingInboxItemSource"
    ]) {
      expectTypeDeclaration(canonical, symbol);
      expectNoTypeDeclaration(backendCompat, symbol);
      expectNoTypeDeclaration(uiTypes, symbol);
      expectNoTypeDeclaration(uiCompat, symbol);
    }

    expect(canonical).toContain("ProtocolEnvelopePayload");
    expect(canonical).not.toContain("src/v11");
    expect(canonical).not.toContain("../v11");
    expect(canonical).not.toContain("node:");
    expect(canonical).not.toMatch(producerHelperExportPattern);
    expect(backendCompat).toContain("from \"../contracts/ui/uiReadModel.js\"");
    expect(uiCompat).toContain(
      "from \"../../../../src/contracts/ui/uiReadModel.js\""
    );
    expect(uiTypes).toContain("from \"../../../src/contracts/ui/uiReadModel.js\"");
    expect(uiTypes).not.toContain("from \"./contracts/uiReadModel.js\"");
    expect(uiTypes).toContain("from \"../../../src/types/protocol.js\"");
    expect(uiTypes).not.toContain("UiTimelineEntry[\"type\"]");
    expect(presenter).toContain("from \"../../../../contracts/ui/uiReadModel.js\"");
    expect(timelinePresenter).toContain(
      "from \"../../../../contracts/ui/uiReadModel.js\""
    );
    expect(uiTypes).not.toContain("src/v11/");
  });

  it("keeps UI router read-model ownership out of command modules", async () => {
    const canonical = await readSource("src/contracts/ui/uiReadModel.ts");
    const uiBarrel = await readSource("src/contracts/ui/index.ts");
    const routerPort = await readSource("src/v11/shared/ports/uiRouter.ts");
    const eventsScan = await readSource("src/v11/infrastructure/ui/eventsScan.ts");
    const eventsFingerprint = await readSource(
      "src/v11/infrastructure/ui/eventsFingerprint.ts"
    );
    const presenter = await readSource(
      "src/v11/infrastructure/ui/presenters/bubblePresenter.ts"
    );
    const routerBubbleDetail = await readSource(
      "src/v11/infrastructure/ui/routerBubbleDetail.ts"
    );
    const eventsScanTest = await readSource("tests/core/ui/eventsScan.test.ts");
    const eventsFingerprintTest = await readSource(
      "tests/core/ui/eventsFingerprint.test.ts"
    );
    const backendCompat = await readSource("src/types/ui.ts");
    const uiTypes = await readSource("ui/src/lib/types.ts");
    const uiCompat = await readSource("ui/src/lib/contracts/uiReadModel.ts");
    const forbiddenMarkers = [
      "list/listCommandContract",
      "inbox/inboxCommandApi",
      "status/statusCommandApi",
      "src/v11/shared/list",
      "src/v11/shared/inbox",
      "src/v11/shared/status"
    ];
    const forbiddenCommandOwnedMarkers = [
      "listCommandContract",
      "inboxCommandApi",
      "statusCommandApi",
      "src/v11/shared/list",
      "src/v11/shared/inbox",
      "src/v11/shared/status",
      "../list/listCommandContract",
      "../inbox/inboxCommandApi",
      "../status/statusCommandApi",
      "../../shared/list/listCommandContract",
      "../../shared/inbox/inboxCommandApi",
      "../../shared/status/statusCommandApi",
      "../../../shared/list/listCommandContract",
      "../../../shared/inbox/inboxCommandApi",
      "../../../shared/status/statusCommandApi"
    ];

    for (const source of [canonical, uiBarrel, routerPort]) {
      for (const marker of forbiddenMarkers) {
        expect(source).not.toContain(marker);
      }
    }
    for (const source of [
      backendCompat,
      uiTypes,
      uiCompat,
      eventsScan,
      eventsFingerprint,
      eventsScanTest,
      eventsFingerprintTest,
      presenter,
      routerBubbleDetail
    ]) {
      for (const marker of forbiddenCommandOwnedMarkers) {
        expect(source).not.toContain(marker);
      }
    }

    for (const symbol of [
      "UiBubbleListEntry",
      "UiBubbleListView",
      "UiBubbleStatusInput",
      "UiBubbleStatusView",
      "UiBubbleInboxInput",
      "UiBubbleInboxView"
    ]) {
      expectTypeDeclaration(canonical, symbol);
    }

    expect(routerPort).toContain("from \"../../../contracts/ui/uiReadModel.js\"");
    expect(routerPort).not.toContain("from \"../list/listCommandContract.js\"");
    expect(routerPort).not.toContain("from \"../inbox/inboxCommandApi.js\"");
    expect(routerPort).not.toContain("from \"../status/statusCommandApi.js\"");
    expect(eventsScan).toContain("from \"../../../contracts/ui/uiReadModel.js\"");
    expect(eventsFingerprint).toContain(
      "from \"../../../contracts/ui/uiReadModel.js\""
    );
    expect(routerBubbleDetail).toContain(
      "from \"../../../contracts/ui/uiReadModel.js\""
    );
    expect(eventsScan).not.toContain("shared/ports/uiRouter");
    expect(eventsFingerprint).not.toContain("shared/ports/uiRouter");
    expect(eventsScan).not.toContain("listCommandContract");
    expect(eventsFingerprint).not.toContain("listCommandContract");
    expect(eventsScanTest).toContain("from \"../../../src/contracts/ui/uiReadModel.js\"");
    expect(eventsFingerprintTest).toContain(
      "from \"../../../src/contracts/ui/uiReadModel.js\""
    );
    expect(presenter).toContain("from \"../../../../contracts/ui/uiReadModel.js\"");
  });

  it("keeps UI action contracts canonical and parser behavior source-owned", async () => {
    const canonical = await readSource("src/contracts/ui/uiActions.ts");
    const backendCompat = await readSource("src/types/ui.ts");
    const uiTypes = await readSource("ui/src/lib/types.ts");
    const uiCompat = await readSource("ui/src/lib/contracts/uiActions.ts");
    const routerPort = await readSource("src/v11/shared/ports/uiRouter.ts");
    const routerHttpBody = await readSource(
      "src/v11/infrastructure/ui/routerHttpBody.ts"
    );
    const uiApi = await readSource("ui/src/lib/api.ts");
    const uiDefaultsSources = await readTypeScriptSources("src/v11/defaults/ui");
    const uiInfrastructureSources = await readTypeScriptSources(
      "src/v11/infrastructure/ui"
    );
    const uiProjectionSources = new Map([
      ...uiDefaultsSources,
      ...uiInfrastructureSources
    ]);
    const actionEventContract = extractInterfaceBody(canonical, "UiActionEvent");
    const actionStateContract = extractInterfaceBody(
      canonical,
      "UiActionBubbleState"
    );
    const pendingReworkIntentContract = extractInterfaceBody(
      canonical,
      "UiActionPendingReworkIntent"
    );
    const affectedResultContracts = [
      "UiEmitApprovalDecisionResult",
      "UiEmitRequestReworkImmediateResult",
      "UiEmitRequestReworkQueuedResult",
      "UiEmitHumanReplyResult",
      "UiCommitBubbleResult",
      "UiStartBubbleResult",
      "UiStopBubbleResult",
      "UiRestartBubbleResult"
    ]
      .map(
        (symbol) => extractInterfaceBody(canonical, symbol)
      )
      .join("\n");
    expect(affectedResultContracts).not.toBe("");
    const inputContracts = [
      "UiBubbleMutationInput",
      "UiEmitApproveInput",
      "UiEmitRequestReworkInput",
      "UiEmitHumanReplyInput",
      "UiCommitBubbleInput",
      "UiMergeBubbleInput",
      "UiAttachBubbleInput",
      "UiUpdateBubbleReviewPolicyInput",
      "UiDeleteBubbleInput"
    ]
      .map(
        (symbol) => extractInterfaceBody(canonical, symbol)
      )
      .join("\n");
    expect(inputContracts).not.toBe("");

    for (const symbol of [
      "UiActionAgentName",
      "UiActionAgentRole",
      "UiActionApprovalDecision",
      "UiActionBubbleState",
      "UiActionEvent",
      "UiActionExecutionContextRef",
      "UiActionFindingsClaimSource",
      "UiActionFindingsClaimState",
      "UiActionPassIntent",
      "UiActionPendingReworkIntent",
      "UiActionProtocolMessageType",
      "UiActionProtocolParticipant",
      "UiBubbleMutationInput",
      "UiEmitApproveInput",
      "UiEmitRequestReworkInput",
      "UiEmitHumanReplyInput",
      "UiCommitBubbleInput",
      "UiMergeBubbleInput",
      "UiAttachBubbleInput",
      "UiUpdateBubbleReviewPolicyInput",
      "UiDeleteBubbleInput",
      "UiApprovalDecisionDeliverySignal",
      "UiApprovalDecisionDeliverySignals",
      "UiDeliveryFailureReason",
      "UiDeliveryTargetReasonCode",
      "UiDeliveryAckReasonCode",
      "UiPassValidationRecoveryMarkerPersistWarning",
      "UiEmitApprovalDecisionResult",
      "UiEmitRequestReworkResult",
      "UiEmitRequestReworkQueuedResult",
      "UiEmitRequestReworkImmediateResult",
      "UiEmitHumanReplyResult",
      "UiCommitBubbleResult",
      "UiStartBubbleResult",
      "UiStopBubbleResult",
      "UiRestartBubbleResult",
      "UiMergeBubbleResult",
      "UiOpenBubbleResult",
      "UiAttachBubbleResult",
      "UiUpdateBubbleReviewPolicyResult"
    ]) {
      expectTypeDeclaration(canonical, symbol);
      expectNoTypeDeclaration(backendCompat, symbol);
      expectNoTypeDeclaration(uiTypes, symbol);
      expectNoTypeDeclaration(uiCompat, symbol);
    }

    for (const symbol of [
      "UiActionAgentName",
      "UiActionAgentRole",
      "UiActionApprovalDecision",
      "UiActionBubbleState",
      "UiActionEvent",
      "UiActionExecutionContextRef",
      "UiActionFindingsClaimSource",
      "UiActionFindingsClaimState",
      "UiActionPassIntent",
      "UiActionPendingReworkIntent",
      "UiActionProtocolMessageType",
      "UiActionProtocolParticipant"
    ]) {
      expect(uiTypes).not.toContain(symbol);
      expect(uiCompat).toContain(symbol);
    }

    expect(canonical).not.toContain("src/v11");
    expect(canonical).not.toContain("../v11");
    expect(canonical).not.toContain("BubbleStateSnapshot");
    expect(canonical).not.toContain("ProtocolEnvelope");
    expect(canonical).not.toMatch(/\bstate:\s*BubbleStateSnapshot\b/u);
    expect(canonical).not.toMatch(/\benvelope:\s*ProtocolEnvelope\b/u);
    expect(canonical).toContain("actionState: UiActionBubbleState");
    expect(canonical).toContain("event: UiActionEvent");
    expect(canonical).toContain("queuedIntent: UiActionPendingReworkIntent | null");
    expect(canonical).toMatch(
      /export interface UiEmitHumanReplyInput extends UiBubbleMutationInput \{/u
    );
    expect(uiCompat).toContain("UiEmitHumanReplyInput");
    expect(canonical).not.toMatch(
      /export interface UiEmitHumanReplyInput \{\s*bubbleId:/u
    );
    expect(pendingReworkIntentContract).toMatch(/^\s*requestedBy:\s*string;/mu);
    expect(pendingReworkIntentContract).toMatch(/^\s*requestedAt:\s*string;/mu);
    expect(pendingReworkIntentContract).not.toMatch(
      /^\s*requested(?:By|At)\?:/mu
    );
    expect(canonical).toContain("now?: string | undefined");
    expect(inputContracts).not.toMatch(/\bDate\b/u);
    expect(inputContracts).not.toMatch(/\bFunction\b/u);
    expect(inputContracts).not.toMatch(/\bclass\b/u);
    expect(inputContracts).not.toMatch(/\bnew\s+/u);
    expect(inputContracts).not.toMatch(/=>/u);
    expect(canonical).toContain("export interface UiActionBubbleState");
    expect(canonical).toContain("export interface UiActionEvent");
    expect(canonical).toContain("executionContext: UiActionExecutionContextRef | null");
    expect(canonical).not.toContain("round_role_history");
    expect(canonical).not.toMatch(/\bmeta_review[?:]/u);
    expect(actionStateContract).not.toContain("roundRoleHistory");
    expect(actionStateContract).not.toContain("metaReview");
    expect(actionStateContract).not.toMatch(/\battempt\b/u);
    expect(actionStateContract).not.toMatch(/\bdeadlineAt\b/u);
    expect(actionEventContract).not.toMatch(/\bpayload\b/u);
    expect(actionEventContract).not.toMatch(/\bmetadata\b/u);
    expect(actionEventContract).not.toMatch(/\bfindings\b/u);
    expect(affectedResultContracts).not.toMatch(/^\s*state[?:]:/mu);
    expect(affectedResultContracts).not.toMatch(/^\s*envelope[?:]:/mu);
    expect(uiCompat).toContain(
      "from \"../../../../src/contracts/ui/uiActions.js\""
    );
    expect(uiTypes).toContain("from \"../../../src/contracts/ui/uiActions.js\"");
    expect(backendCompat).not.toContain("from \"../contracts/ui/uiActions.js\"");
    expect(routerPort).toContain("from \"../../../contracts/ui/uiActions.js\"");
    expect(routerPort).toContain("UiDeleteBubbleResult");
    expect(routerPort).not.toContain("contracts/ui/deleteBubble");
    expect(uiApi).toContain("UiCommitBubbleResult");
    expect(routerHttpBody).toContain("Object.hasOwn(typedBody, \"auto\")");
    expect(routerHttpBody).toContain("legacy `auto`");
    expect(routerHttpBody).toContain("metaReviewAutoReworkMinSeverity");
    expect(routerHttpBody).toContain("parseOptionalRefs(body)");
    expect(routerHttpBody).toContain("Commit request requires boolean field `stageAll`.");
    expect(routerHttpBody).toContain("Merge request body must be a JSON object when provided.");
    expect(routerHttpBody).toContain("Delete request body must be a JSON object when provided.");
    expectOnlySourcePathsContaining(
      uiProjectionSources,
      "projectBubbleStateToUiActionState",
      ["src/v11/defaults/ui/routerDefaults.ts"]
    );
    expectOnlySourcePathsContaining(
      uiProjectionSources,
      "projectProtocolEnvelopeToUiActionEvent",
      ["src/v11/defaults/ui/routerDefaults.ts"]
    );
    expectOnlySourcePathsContaining(
      uiProjectionSources,
      "projectPendingReworkIntentToUiActionPendingIntent",
      ["src/v11/defaults/ui/routerDefaults.ts"]
    );
    expectOnlySourcePathsContaining(
      uiProjectionSources,
      "projectApprovalDecisionDeliverySignalToUiDeliverySignal",
      ["src/v11/defaults/ui/routerDefaults.ts"]
    );
    expectOnlySourcePathsContaining(
      uiProjectionSources,
      "projectApprovalDecisionDeliverySignalsToUiDeliverySignals",
      ["src/v11/defaults/ui/routerDefaults.ts"]
    );
    expect(parseApproveBody({
      refs: ["artifact://review.md"],
      ignored: true
    })).toEqual({
      refs: ["artifact://review.md"],
      overrideNonApprove: false
    });
    expect(parseCommitBody({
      stageAll: true,
      message: "commit",
      refs: ["artifact://review.md"],
      ignored: true
    })).toEqual({
      stageAll: true,
      message: "commit",
      refs: ["artifact://review.md"]
    });
    expect(() => parseCommitBody({
      auto: true,
      stageAll: true
    })).toThrow(/cannot include both `stageAll` and legacy `auto`/);
    expect(() => parseCommitBody({
      auto: true
    })).toThrow(/field `auto` is no longer supported/);
    expect(parseMergeBody({
      push: true,
      deleteRemote: false,
      ignored: true
    })).toEqual({
      push: true,
      deleteRemote: false
    });
    expect(parseMergeBody(undefined)).toEqual({});
    expect(parseDeleteBody({
      force: true,
      ignored: true
    })).toEqual({
      force: true
    });
    expect(parseDeleteBody(undefined)).toEqual({});
    expect(parseReviewPolicyBody({
      reviewLoopMode: "meta_only",
      reviewBlockingMinSeverity: "P3",
      ignored: true
    })).toEqual({
      reviewLoopMode: "meta_only",
      reviewBlockingMinSeverity: "P3"
    });
    expect(() => parseReviewPolicyBody({
      reviewLoopMode: "full",
      metaReviewAutoReworkMinSeverity: "P3"
    })).toThrow(
      /Field `metaReviewAutoReworkMinSeverity` is no longer supported/
    );
    expect(() => parseCommitBody({
      message: "missing stageAll"
    })).toThrow(/requires boolean field `stageAll`/);
    expect(() => parseReviewPolicyBody({})).toThrow(/Field `reviewLoopMode`/);
    expect(() => requireMessage({}, "message")).toThrow(
      /Field `message` is required/
    );
  });

  it("keeps UI event contracts canonical with the fixed SSE allowlist", async () => {
    const canonical = await readSource("src/contracts/ui/uiEvents.ts");
    const backendCompat = await readSource("src/types/ui.ts");
    const uiTypes = await readSource("ui/src/lib/types.ts");
    const uiCompat = await readSource("ui/src/lib/contracts/uiEvents.ts");
    const routerEvents = await readSource("src/v11/infrastructure/ui/routerEvents.ts");
    const eventsLog = await readSource("src/v11/infrastructure/ui/eventsLog.ts");
    const eventsSnapshot = await readSource(
      "src/v11/infrastructure/ui/eventsSnapshot.ts"
    );
    const uiEvents = await readSource("ui/src/lib/events.ts");
    const infrastructureUiSources = await readTypeScriptSources(
      "src/v11/infrastructure/ui"
    );

    for (const eventName of [
      "connected",
      "snapshot",
      "bubble.updated",
      "bubble.removed",
      "repo.updated",
      "repo.removed",
      "heartbeat"
    ]) {
      expect(canonical).toContain(`"${eventName}"`);
    }
    for (const symbol of [
      "UiEventsConnectedPayload",
      "UiBubbleUpdatedEvent",
      "UiBubbleRemovedEvent",
      "UiRepoUpdatedEvent",
      "UiRepoRemovedEvent",
      "UiSnapshotEvent"
    ]) {
      expect(canonical).toMatch(new RegExp(`export interface ${symbol}\\b`));
      expectNoTypeDeclaration(backendCompat, symbol);
      expectNoTypeDeclaration(uiTypes, symbol);
      expectNoTypeDeclaration(uiCompat, symbol);
    }

    expect(canonical).not.toContain("src/v11");
    expect(canonical).not.toContain("../v11");
    expect(uiCompat).toContain(
      "from \"../../../../src/contracts/ui/uiEvents.js\""
    );
    expect(uiTypes).toContain("from \"../../../src/contracts/ui/uiEvents.js\"");
    expect(backendCompat).toContain("from \"../contracts/ui/uiEvents.js\"");
    expect(routerEvents).toContain("event: connected");
    expect(routerEvents).toContain("event: snapshot");
    expect(routerEvents).toContain("event: ${event.type}");
    expect(routerEvents).toContain("event: heartbeat");
    expect(eventsLog).toContain("nextRepoRemovedEvent");
    expect(eventsLog).toContain("from \"../../../contracts/ui/uiEvents.js\"");
    expect(eventsSnapshot).toContain("): UiSnapshotEvent");
    expect(eventsSnapshot).toContain("buildUiEventsSnapshot");
    expect(uiEvents).toContain("case \"repo.removed\"");
    expect(uiEvents).toContain("addListener(\"repo.removed\"");
    for (const factoryName of [
      "nextBubbleUpdatedEvent",
      "nextBubbleRemovedEvent",
      "nextRepoEvent",
      "nextRepoRemovedEvent"
    ]) {
      expectOnlySourcePathsContaining(
        infrastructureUiSources,
        `public ${factoryName}`,
        ["src/v11/infrastructure/ui/eventsLog.ts"]
      );
    }
    expectOnlySourcePathsContaining(
      infrastructureUiSources,
      "export function buildUiEventsSnapshot",
      ["src/v11/infrastructure/ui/eventsSnapshot.ts"]
    );
    for (const sseMarker of [
      "event: connected",
      "event: snapshot",
      "event: ${event.type}",
      "event: heartbeat"
    ]) {
      expectOnlySourcePathsContaining(infrastructureUiSources, sseMarker, [
        "src/v11/infrastructure/ui/routerEvents.ts"
      ]);
    }
  });

  it("keeps UI API error body canonical", async () => {
    const canonical = await readSource("src/contracts/ui/uiErrors.ts");
    const backendCompat = await readSource("src/types/ui.ts");
    const uiTypes = await readSource("ui/src/lib/types.ts");
    const uiCompat = await readSource("ui/src/lib/contracts/uiErrors.ts");
    const routerContracts = await readSource(
      "src/v11/infrastructure/ui/routerContracts.ts"
    );
    const routerHttpErrors = await readSource(
      "src/v11/infrastructure/ui/routerHttpErrors.ts"
    );
    const routerHttp = await readSource("src/v11/infrastructure/ui/routerHttp.ts");
    const uiApi = await readSource("ui/src/lib/api.ts");

    expect(canonical).toContain("export interface UiApiErrorBody");
    for (const code of ["bad_request", "not_found", "conflict", "internal_error"]) {
      expect(canonical).toContain(`"${code}"`);
      expect(routerHttpErrors).toContain(`code: "${code}"`);
    }
    expectNoTypeDeclaration(backendCompat, "UiApiErrorBody");
    expectNoTypeDeclaration(uiTypes, "UiApiErrorBody");
    expectNoTypeDeclaration(uiCompat, "UiApiErrorBody");
    expect(backendCompat).toContain("from \"../contracts/ui/uiErrors.js\"");
    expect(routerContracts).toContain("from \"../../../contracts/ui/uiErrors.js\"");
    expect(routerHttp).toContain("from \"../../../contracts/ui/uiErrors.js\"");
    expect(uiApi).toContain("UiApiErrorBody");
    expect(uiCompat).toContain(
      "from \"../../../../src/contracts/ui/uiErrors.js\""
    );
  });

  it("keeps backend compatibility free of UI-only view-state exports", async () => {
    const backendCompat = await readSource("src/types/ui.ts");
    const uiTypes = await readSource("ui/src/lib/types.ts");

    for (const symbol of [
      "ConnectionStatus",
      "BubbleCardModel",
      "BubblePosition"
    ]) {
      expectNoTypeDeclaration(backendCompat, symbol);
      expect(backendCompat).not.toMatch(new RegExp(`export\\s+type\\s+\\{[^}]*${symbol}`));
      expectTypeDeclaration(uiTypes, symbol);
    }
  });

});
