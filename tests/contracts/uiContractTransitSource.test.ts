import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import ts from "typescript";
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

async function readUiBrowserSources(): Promise<Map<string, string>> {
  const root = join(repoRoot, "ui/src");
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
      if (
        !entry.isFile()
        || (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx"))
        || entry.name.includes(".test.")
        || relativePath.startsWith("ui/src/test/")
      ) {
        continue;
      }
      sources.set(relativePath, await readFile(absolutePath, "utf8"));
    }
  }

  await collect(root, "ui/src");
  return sources;
}

const protocolMirrorLiterals = new Set([
  "TASK",
  "PASS",
  "HUMAN_QUESTION",
  "HUMAN_REPLY",
  "CONVERGENCE",
  "APPROVAL_REQUEST",
  "APPROVAL_DECISION",
  "COMMIT_RESULT"
]);

function collectUiProtocolLeakViolations(
  sources: Map<string, string>
): string[] {
  const violations: string[] = [];

  for (const [relativePath, source] of sources) {
    const sourceFile = ts.createSourceFile(
      relativePath,
      source,
      ts.ScriptTarget.Latest,
      true,
      relativePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    const lineFor = (node: ts.Node): number =>
      sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

    const moduleSpecifierText = (node: ts.Node): string | undefined => {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
        && node.moduleSpecifier !== undefined
        && ts.isStringLiteral(node.moduleSpecifier)
      ) {
        return node.moduleSpecifier.text;
      }
      if (ts.isImportTypeNode(node)) {
        const argument = node.argument;
        if (
          ts.isLiteralTypeNode(argument)
          && ts.isStringLiteral(argument.literal)
        ) {
          return argument.literal.text;
        }
      }
      if (
        ts.isImportEqualsDeclaration(node)
        && ts.isExternalModuleReference(node.moduleReference)
        && ts.isStringLiteral(node.moduleReference.expression)
      ) {
        return node.moduleReference.expression.text;
      }
      return undefined;
    };

    const collectProtocolLiterals = (node: ts.Node): Set<string> => {
      const literals = new Set<string>();
      const visitLiteral = (child: ts.Node): void => {
        if (
          (ts.isStringLiteral(child) || ts.isNoSubstitutionTemplateLiteral(child))
          && protocolMirrorLiterals.has(child.text)
        ) {
          literals.add(child.text);
        }
        if (
          (ts.isPropertyAssignment(child)
            || ts.isShorthandPropertyAssignment(child)
            || ts.isPropertySignature(child)
            || ts.isMethodDeclaration(child)
            || ts.isMethodSignature(child))
          && ts.isIdentifier(child.name)
          && protocolMirrorLiterals.has(child.name.text)
        ) {
          literals.add(child.name.text);
        }
        child.forEachChild(visitLiteral);
      };
      visitLiteral(node);
      return literals;
    };

    const visit = (node: ts.Node): void => {
      const specifier = moduleSpecifierText(node);
      if (
        specifier !== undefined
        && /(?:^|\/)src\/types\/protocol(?:\.js|\.ts)?$/u.test(specifier)
      ) {
        violations.push(
          `${relativePath}:${String(lineFor(node))} imports runtime protocol types directly`
        );
      }

      if (
        ts.isInterfaceDeclaration(node)
        || ts.isTypeAliasDeclaration(node)
        || ts.isEnumDeclaration(node)
      ) {
        if (node.name.text === "ProtocolMessageType") {
          violations.push(
            `${relativePath}:${String(lineFor(node))} declares ProtocolMessageType locally`
          );
        }
        const mirroredLiterals = collectProtocolLiterals(node);
        if (mirroredLiterals.size >= 2) {
          violations.push(
            `${relativePath}:${String(lineFor(node))} mirrors protocol message literals locally`
          );
        }
      } else if (ts.isVariableStatement(node)) {
        const mirroredLiterals = collectProtocolLiterals(node);
        if (mirroredLiterals.size >= 2) {
          violations.push(
            `${relativePath}:${String(lineFor(node))} mirrors protocol message literals locally`
          );
        }
      }

      node.forEachChild(visit);
    };

    visit(sourceFile);
  }

  return violations;
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

function expectExportTypeBlockContains(
  source: string,
  input: {
    symbol: string;
    moduleSpecifier?: string;
  }
): void {
  const moduleClause =
    input.moduleSpecifier === undefined
      ? "\\s*;"
      : `\\s+from\\s+["']${input.moduleSpecifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']\\s*;`;
  expect(source).toMatch(
    new RegExp(
      `export\\s+type\\s+\\{[^}]*\\b${input.symbol}\\b[^}]*\\}${moduleClause}`,
      "u"
    )
  );
}

function expectModuleSpecifierCount(
  source: string,
  moduleSpecifier: string,
  expectedCount: number
): void {
  const escapedModuleSpecifier = moduleSpecifier.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
  const matches = source.match(
    new RegExp(`from\\s+["']${escapedModuleSpecifier}["']`, "gu")
  );
  expect(matches ?? []).toHaveLength(expectedCount);
}

function expectUiContractEntrypointImport(source: string): void {
  expect(source).toContain("from \"@pairflow/ui-contracts\"");
  expect(source).not.toMatch(
    /from\s+["'][^"']*src\/contracts\/ui(?:\/|["'])/u
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
    expectUiContractEntrypointImport(uiCompat);
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
    const stateSnapshots = await readSource("src/v11/ports/stateSnapshots.ts");

    expect(canonical).toMatch(
      /export interface ContractValidationError\s*{\s*path:\s*string;\s*message:\s*string;\s*}/
    );
    expect(canonical).toMatch(
      /export interface StateValidationDiagnostics\s*{\s*message:\s*string;\s*errors:\s*ContractValidationError\[\];\s*}/
    );
    expect(canonical).not.toContain("v11/");
    expect(canonical).not.toContain("validation/primitives");
    expect(backendCompat).toContain("from \"../../contracts/ui/stateValidation.js\"");
    expectUiContractEntrypointImport(uiCompat);
    expect(stateSnapshots).toContain(
      "from \"../../contracts/ui/stateValidation.js\""
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

  it("keeps lifecycle literals owned by the browser-safe contract kernel", async () => {
    const kernel = await readSource("src/contracts/kernel/lifecycle.ts");
    const canonical = await readSource("src/contracts/ui/bubbleLifecycle.ts");
    const uiCompat = await readSource("ui/src/lib/contracts/bubbleLifecycle.ts");
    const stateSnapshots = await readSource("src/v11/ports/stateSnapshots.ts");

    expect(kernel.match(/export const bubbleLifecycleStates = \[/g)).toHaveLength(
      1
    );
    expect(canonical).toContain("from \"../kernel/lifecycle.js\"");
    expect(canonical).not.toMatch(/bubbleLifecycleStates\s*=\s*\[/);
    expect(canonical).not.toContain("../v11");
    expect(canonical).not.toContain("src/v11");
    expectUiContractEntrypointImport(uiCompat);
    expect(stateSnapshots).toContain(
      "from \"../../contracts/kernel/lifecycle.js\""
    );
    expect(stateSnapshots).not.toMatch(/bubbleLifecycleStates\s*=\s*\[/);
    expect(stateSnapshots).not.toMatch(/type\s+BubbleLifecycleState\s*=/);
    expect(stateSnapshots).not.toMatch(/interface\s+BubbleLifecycleState/);
    expect(uiCompat).not.toMatch(/bubbleLifecycleStates\s*=\s*\[/);
    expect([kernel, canonical, uiCompat, stateSnapshots].join("\n")).not.toMatch(
      /mirror|mirrored|keep.*sync/i
    );
  });

  it("does not keep compatibility bridges for kernel-owned vocabulary", async () => {
    const agentIdentity = await readSource(
      "src/v11/domain/agentIdentity/agentIdentity.ts"
    );
    const uiActions = await readSource("src/contracts/ui/uiActions.ts");

    await expect(readSource("src/types/protocol.ts")).rejects.toThrow();
    await expect(
      readSource("src/v11/domain/state/lifecycleTypes.ts")
    ).rejects.toThrow();
    await expect(
      readSource("src/shared/contracts/bubbleLifecycle.ts")
    ).rejects.toThrow();

    expect(agentIdentity).not.toMatch(/\bexport\s+(?:type|interface)\s+(?:AgentName|AgentRole|BubbleAgentsConfig)\b/u);
    expect(agentIdentity).not.toMatch(/\bexport\s+const\s+agent(?:Names|Roles)\b/u);
    expect(uiActions).toContain("from \"../kernel/index.js\"");
    expect(uiActions).not.toMatch(/AgentName\s*=\s*["']/u);
    expect(uiActions).not.toMatch(/ProtocolMessageType\s*=\s*["']/u);
    expect(uiActions).not.toMatch(/ApprovalDecision\s*=\s*["']/u);
    expect(uiActions).not.toMatch(/PassIntent\s*=\s*["']/u);
    expect(uiActions).not.toMatch(
      /\bexport\s+type\s+(?:AgentName|AgentRole|ProtocolParticipant|ProtocolMessageType|ApprovalDecision|PassIntent|FindingsClaimState|FindingsClaimSource)\s*=/u
    );
  });

  it("keeps delete-bubble UI names as aliases of the canonical contract", async () => {
    const canonical = await readSource("src/contracts/ui/deleteBubble.ts");
    const backendCompat = await readSource("src/contracts/deleteBubble.ts");
    const uiTypes = await readSource("ui/src/lib/types.ts");

    expect(canonical).toContain("export interface DeleteBubbleArtifacts");
    expect(canonical).toContain("export interface DeleteBubbleResult");
    expect(backendCompat).toContain("from \"./ui/deleteBubble.js\"");
    expectUiContractEntrypointImport(uiTypes);
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
    const uiBarrel = await readSource("src/contracts/ui/index.ts");
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

    expect(canonical).not.toContain("ProtocolEnvelopePayload");
    for (const symbol of [
      "UiTimelineEntry",
      "UiTimelineEntryDisplay",
      "UiTimelineEntryPayload",
      "UiTimelineFinding"
    ]) {
      expectNoTypeDeclaration(canonical, symbol);
      expect(uiBarrel).not.toContain(symbol);
      expect(uiCompat).not.toContain(symbol);
      expect(uiTypes).not.toContain(symbol);
    }
    expectExportTypeBlockContains(canonical, {
      symbol: "ProtocolMessageType"
    });
    expectModuleSpecifierCount(canonical, "../kernel/protocol.js", 1);
    expectExportTypeBlockContains(uiBarrel, {
      symbol: "ProtocolMessageType",
      moduleSpecifier: "../kernel/index.js"
    });
    expect(canonical).not.toContain("src/v11");
    expect(canonical).not.toContain("../v11");
    expect(canonical).not.toContain("node:");
    expect(canonical).not.toMatch(producerHelperExportPattern);
    expect(backendCompat).toContain("from \"../contracts/ui/uiReadModel.js\"");
    expectUiContractEntrypointImport(uiCompat);
    expectUiContractEntrypointImport(uiTypes);
    expect(uiTypes).not.toContain("from \"./contracts/uiReadModel.js\"");
    expect(uiTypes).not.toContain("from \"../../../src/types/protocol.js\"");
    expectNoTypeDeclaration(uiTypes, "ProtocolMessageType");
    expect(uiTypes).not.toContain("UiTimelineEntry[\"type\"]");
    expect(presenter).toContain("from \"../../../../contracts/ui/uiReadModel.js\"");
    expect(timelinePresenter).toContain(
      "from \"../../../../contracts/ui/uiReadModel.js\""
    );
    expect(uiTypes).not.toContain("src/v11/");
  });

  it("rejects browser-source ProtocolMessageType leaks and local protocol mirrors", async () => {
    const liveViolations = collectUiProtocolLeakViolations(
      await readUiBrowserSources()
    );

    expect(liveViolations).toStrictEqual([]);
    expect(
      collectUiProtocolLeakViolations(
        new Map([
          [
            "ui/src/lib/directProtocol.ts",
            "import type { ProtocolMessageType } from '../../../src/types/protocol.js';\nexport type Local = ProtocolMessageType;\n"
          ],
          [
            "ui/src/lib/importTypeProtocol.ts",
            "export type Local = import('../../../src/types/protocol.js').ProtocolMessageType;\n"
          ],
          [
            "ui/src/lib/importEqualsProtocol.ts",
            "import type Protocol = require('../../../src/types/protocol.js');\nexport type Local = Protocol.ProtocolMessageType;\n"
          ],
          [
            "ui/src/lib/localProtocol.ts",
            "type ProtocolMessageType = 'TASK' | 'PASS';\ntype LocalMessageType = 'TASK' | 'PASS' | 'HUMAN_QUESTION';\nconst protocolMessageTypes = ['TASK', 'PASS'] as const;\n"
          ],
          [
            "ui/src/lib/templateProtocol.ts",
            "type LocalMessageType = `TASK` | `PASS` | `HUMAN_QUESTION`;\n"
          ],
          [
            "ui/src/lib/objectProtocol.ts",
            "const protocolMessageTypes = { TASK: true, PASS: true, HUMAN_QUESTION: true } as const;\ntype LocalMessageType = keyof typeof protocolMessageTypes;\n"
          ],
          [
            "ui/src/lib/localProtocolEnum.ts",
            "enum ProtocolMessageType { Task = 'TASK', Pass = 'PASS' }\n"
          ]
        ])
      )
    ).toEqual([
      "ui/src/lib/directProtocol.ts:1 imports runtime protocol types directly",
      "ui/src/lib/importTypeProtocol.ts:1 imports runtime protocol types directly",
      "ui/src/lib/importEqualsProtocol.ts:1 imports runtime protocol types directly",
      "ui/src/lib/localProtocol.ts:1 declares ProtocolMessageType locally",
      "ui/src/lib/localProtocol.ts:1 mirrors protocol message literals locally",
      "ui/src/lib/localProtocol.ts:2 mirrors protocol message literals locally",
      "ui/src/lib/localProtocol.ts:3 mirrors protocol message literals locally",
      "ui/src/lib/templateProtocol.ts:1 mirrors protocol message literals locally",
      "ui/src/lib/objectProtocol.ts:1 mirrors protocol message literals locally",
      "ui/src/lib/localProtocolEnum.ts:1 declares ProtocolMessageType locally",
      "ui/src/lib/localProtocolEnum.ts:1 mirrors protocol message literals locally"
    ]);
  });

  it("keeps UI router read-model ownership out of command modules", async () => {
    const canonical = await readSource("src/contracts/ui/uiReadModel.ts");
    const uiBarrel = await readSource("src/contracts/ui/index.ts");
    const routerPort = await readSource("src/v11/ports/uiRouter.ts");
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
    const routerDependencies = await readSource(
      "src/v11/infrastructure/ui/routerDependencies.ts"
    );
    const routerDefaults = await readSource("src/v11/defaults/ui/routerDefaults.ts");
    const eventsScanTest = await readSource("tests/core/ui/eventsScan.test.ts");
    const eventsFingerprintTest = await readSource(
      "tests/core/ui/eventsFingerprint.test.ts"
    );
    const backendCompat = await readSource("src/types/ui.ts");
    const uiTypes = await readSource("ui/src/lib/types.ts");
    const uiCompat = await readSource("ui/src/lib/contracts/uiReadModel.ts");
    const forbiddenMarkers = [
      "read-model/list/listReadModelContract",
      "inbox/inboxCommandApi",
      "status/statusCommandApi",
      "src/v11/shared/read-model/list",
      "src/v11/shared/inbox",
      "src/v11/shared/status"
    ];
    const forbiddenCommandOwnedMarkers = [
      "listReadModelContract",
      "inboxCommandApi",
      "statusCommandApi",
      "src/v11/shared/read-model/list",
      "src/v11/shared/inbox",
      "src/v11/shared/status",
      "../read-model/list/listReadModelContract",
      "../inbox/inboxCommandApi",
      "../status/statusCommandApi",
      "../../shared/read-model/list/listReadModelContract",
      "../../shared/inbox/inboxCommandApi",
      "../../shared/status/statusCommandApi",
      "../../application/status/statusCommandApi",
      "../../../shared/read-model/list/listReadModelContract",
      "../../../shared/inbox/inboxCommandApi",
      "../../../shared/status/statusCommandApi",
      "../../../application/status/statusCommandApi"
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
      routerBubbleDetail,
      routerDependencies
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

    expect(routerPort).toContain("from \"../../contracts/ui/uiReadModel.js\"");
    expect(routerPort).not.toContain("from \"../read-model/list/listReadModelContract.js\"");
    expect(routerPort).not.toContain("from \"../inbox/inboxCommandApi.js\"");
    expect(routerPort).not.toContain("from \"../status/statusCommandApi.js\"");
    expect(routerDefaults).toContain(
      "from \"../../application/inbox/bubbleInboxReadModel.js\""
    );
    expect(routerDefaults).toContain(
      "from \"../process/processSpawnDefaults.js\""
    );
    expect(routerDefaults).toContain("processSpawn: processSpawnDefault");
    expect(routerDependencies).not.toContain(
      "from \"../../shared/inbox/inboxCommandApi.js\""
    );
    expect(eventsScan).toContain("from \"../../../contracts/ui/uiReadModel.js\"");
    expect(eventsFingerprint).toContain(
      "from \"../../../contracts/ui/uiReadModel.js\""
    );
    expect(routerBubbleDetail).toContain(
      "from \"../../../contracts/ui/uiReadModel.js\""
    );
    expect(eventsScan).not.toContain("ports/uiRouter");
    expect(eventsFingerprint).not.toContain("ports/uiRouter");
    expect(eventsScan).not.toContain("listReadModelContract");
    expect(eventsFingerprint).not.toContain("listReadModelContract");
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
    const routerPort = await readSource("src/v11/ports/uiRouter.ts");
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
      "AgentName",
      "AgentRole",
      "ApprovalDecision",
      "FindingsClaimSource",
      "FindingsClaimState",
      "PassIntent",
      "ProtocolMessageType",
      "ProtocolParticipant"
    ]) {
      expectExportTypeBlockContains(canonical, {
        symbol,
        moduleSpecifier: "../kernel/index.js"
      });
      expectNoTypeDeclaration(canonical, symbol);
      expectNoTypeDeclaration(backendCompat, symbol);
      expectNoTypeDeclaration(uiTypes, symbol);
      expectNoTypeDeclaration(uiCompat, symbol);
    }

    for (const symbol of [
      "UiActionBubbleState",
      "UiActionEvent",
      "UiActionExecutionContextRef",
      "UiActionPendingReworkIntent",
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
      "AgentName",
      "AgentRole",
      "ApprovalDecision",
      "UiActionBubbleState",
      "UiActionEvent",
      "UiActionExecutionContextRef",
      "FindingsClaimSource",
      "FindingsClaimState",
      "PassIntent",
      "UiActionPendingReworkIntent",
      "ProtocolMessageType",
      "ProtocolParticipant"
    ]) {
      expect(uiCompat).toContain(symbol);
    }

    expect(canonical).not.toContain("src/v11");
    expect(canonical).not.toContain("../v11");
    expect(canonical).not.toContain("PersistedBubbleStateSnapshot");
    expect(canonical).not.toContain("ProtocolEnvelope");
    expect(canonical).not.toMatch(/\bstate:\s*PersistedBubbleStateSnapshot\b/u);
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
    expectUiContractEntrypointImport(uiCompat);
    expectUiContractEntrypointImport(uiTypes);
    expect(backendCompat).not.toContain("from \"../contracts/ui/uiActions.js\"");
    expect(routerPort).toContain("from \"../../contracts/ui/uiActions.js\"");
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
    expectUiContractEntrypointImport(uiCompat);
    expectUiContractEntrypointImport(uiTypes);
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
    expectUiContractEntrypointImport(uiCompat);
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
