import { readFile } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";

import ts from "typescript";

import { normalizePathToPosix, resolveFilesForScopePatterns } from "../scope.js";
import type { FitnessPolicyCheck, FitnessReportCheck } from "../types.js";

type ProtocolVocabularyViolationKind =
  | "payload_metadata_structured_fact"
  | "retired_payload_base"
  | "wide_payload_alias"
  | "structured_protocol_metadata_type";

interface ProtocolVocabularyViolation {
  path: string;
  line: number;
  kind: ProtocolVocabularyViolationKind;
  snippet: string;
  message: string;
}

interface ProtocolEnvelopeCastInventoryItem {
  path: string;
  line: number;
  snippet: string;
}

interface ProtocolSurfaceFanoutTarget {
  id: string;
  label: string;
  path: string;
  threshold: number;
}

interface ProtocolSurfaceFanoutItem {
  target: ProtocolSurfaceFanoutTarget;
  importers: string[];
}

const protocolSurfaceFanoutTargets: readonly ProtocolSurfaceFanoutTarget[] = [
  {
    id: "protocol_envelope_contract",
    label: "ProtocolEnvelope contract",
    path: "src/v11/shared/protocol/protocolEnvelopeContract.ts",
    threshold: 75
  },
  {
    id: "kernel_protocol_contract",
    label: "kernel protocol vocabulary",
    path: "src/contracts/kernel/protocol.ts",
    threshold: 75
  },
  {
    id: "kernel_findings_contract",
    label: "kernel findings vocabulary",
    path: "src/contracts/kernel/findings.ts",
    threshold: 75
  },
  {
    id: "findings_parity_metadata_contract",
    label: "findings parity metadata contract",
    path: "src/v11/shared/metaReviewGate/findingsParityMetadataContract.ts",
    threshold: 30
  }
];

const forbiddenPayloadMetadataFields = new Set([
  "findings_parity",
  "findings_claimed_open_total",
  "findings_artifact_open_total",
  "findings_blocking_open_total",
  "findings_advisory_open_total",
  "findings_artifact_status",
  "findings_digest_sha256",
  "findings_parity_status",
  "advisory_findings_open_total",
  "commit_sha",
  "commit_message",
  "staged_files"
]);

function propertyNameText(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name)) {
    return name.text;
  }
  return undefined;
}

function chainFromExpression(expression: ts.Expression): string[] | undefined {
  if (ts.isIdentifier(expression)) {
    return [expression.text];
  }
  if (ts.isPropertyAccessExpression(expression)) {
    const parent = chainFromExpression(expression.expression);
    return parent === undefined ? undefined : [...parent, expression.name.text];
  }
  if (
    ts.isElementAccessExpression(expression)
    && expression.argumentExpression !== undefined
    && ts.isStringLiteralLike(expression.argumentExpression)
  ) {
    const parent = chainFromExpression(expression.expression);
    return parent === undefined
      ? undefined
      : [...parent, expression.argumentExpression.text];
  }
  if (ts.isParenthesizedExpression(expression)) {
    return chainFromExpression(expression.expression);
  }
  return undefined;
}

function hasAdjacentPayloadMetadataField(chain: readonly string[]): boolean {
  for (let index = 0; index < chain.length - 2; index += 1) {
    if (
      chain[index] === "payload"
      && chain[index + 1] === "metadata"
      && forbiddenPayloadMetadataFields.has(chain[index + 2] ?? "")
    ) {
      return true;
    }
  }
  return false;
}

function isWidePayloadAliasName(name: string): boolean {
  return (
    name === "ProtocolEnvelopeReadablePayload"
    || name === "ProtocolEnvelopeWidePayload"
    || /(?:^|[A-Z])(ReadablePayload|WidePayload)$/u.test(name)
  );
}

function isProtocolEnvelopeMetadataReference(node: ts.TypeNode): boolean {
  return (
    ts.isTypeReferenceNode(node)
    && ts.isIdentifier(node.typeName)
    && node.typeName.text === "ProtocolEnvelopeMetadata"
  );
}

function lineOf(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function collectPayloadMetadataObjectLiteralViolations(input: {
  payloadObject: ts.ObjectLiteralExpression;
  sourceFile: ts.SourceFile;
  lines: readonly string[];
  relativePath: string;
  violations: ProtocolVocabularyViolation[];
}): void {
  for (const payloadProperty of input.payloadObject.properties) {
    if (!ts.isPropertyAssignment(payloadProperty)) {
      continue;
    }
    if (propertyNameText(payloadProperty.name) !== "metadata") {
      continue;
    }
    if (!ts.isObjectLiteralExpression(payloadProperty.initializer)) {
      continue;
    }
    for (const metadataProperty of payloadProperty.initializer.properties) {
      if (!ts.isPropertyAssignment(metadataProperty) && !ts.isShorthandPropertyAssignment(metadataProperty)) {
        continue;
      }
      const fieldName = propertyNameText(metadataProperty.name);
      if (fieldName === undefined || !forbiddenPayloadMetadataFields.has(fieldName)) {
        continue;
      }
      const line = lineOf(input.sourceFile, metadataProperty.name);
      input.violations.push({
        path: input.relativePath,
        line,
        kind: "payload_metadata_structured_fact",
        snippet: (input.lines[line - 1] ?? "").trim(),
        message: `protocol payload metadata must not carry structured field "${fieldName}"`
      });
    }
  }
}

function collectProtocolVocabularyViolations(
  relativePath: string,
  sourceText: string
): ProtocolVocabularyViolation[] {
  const sourceFile = ts.createSourceFile(
    relativePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true
  );
  const lines = sourceText.split(/\r?\n/u);
  const violations: ProtocolVocabularyViolation[] = [];

  const pushViolation = (
    node: ts.Node,
    kind: ProtocolVocabularyViolationKind,
    message: string
  ): void => {
    const line = lineOf(sourceFile, node);
    violations.push({
      path: relativePath,
      line,
      kind,
      snippet: (lines[line - 1] ?? "").trim(),
      message
    });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && node.text === "ProtocolEnvelopePayloadBase") {
      pushViolation(
        node,
        "retired_payload_base",
        "ProtocolEnvelopePayloadBase is retired and must not be referenced"
      );
    }

    if (
      (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node))
      && isWidePayloadAliasName(node.name.text)
    ) {
      pushViolation(
        node.name,
        "wide_payload_alias",
        "wide/readable protocol payload aliases must not replace strict per-message payload contracts"
      );
    }

    if (
      ts.isInterfaceDeclaration(node)
      && node.name.text === "ProtocolEnvelopeMetadata"
      && node.heritageClauses !== undefined
    ) {
      pushViolation(
        node.name,
        "structured_protocol_metadata_type",
        "ProtocolEnvelopeMetadata must remain an unstructured metadata bag and must not extend another type"
      );
    }

    if (ts.isIntersectionTypeNode(node)) {
      const includesProtocolMetadata = node.types.some(isProtocolEnvelopeMetadataReference);
      const includesStructuredType = node.types.some((typeNode) =>
        ts.isTypeLiteralNode(typeNode)
      );
      if (includesProtocolMetadata && includesStructuredType) {
        pushViolation(
          node,
          "structured_protocol_metadata_type",
          "ProtocolEnvelopeMetadata must not be intersected with structured protocol fields"
        );
      }
    }

    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      const chain = chainFromExpression(node);
      if (chain !== undefined && hasAdjacentPayloadMetadataField(chain)) {
        pushViolation(
          node,
          "payload_metadata_structured_fact",
          "structured protocol facts must use explicit payload fields, not payload.metadata"
        );
      }
    }

    if (
      ts.isPropertyAssignment(node)
      && propertyNameText(node.name) === "payload"
      && ts.isObjectLiteralExpression(node.initializer)
    ) {
      collectPayloadMetadataObjectLiteralViolations({
        payloadObject: node.initializer,
        sourceFile,
        lines,
        relativePath,
        violations
      });
    }

    node.forEachChild(visit);
  };

  visit(sourceFile);
  return violations;
}

function isProtocolEnvelopeTypeReference(typeNode: ts.TypeNode): boolean {
  return (
    ts.isTypeReferenceNode(typeNode)
    && ts.isIdentifier(typeNode.typeName)
    && typeNode.typeName.text === "ProtocolEnvelope"
    && typeNode.typeArguments !== undefined
    && typeNode.typeArguments.length > 0
  );
}

function collectProtocolEnvelopeCastInventory(
  relativePath: string,
  sourceText: string
): ProtocolEnvelopeCastInventoryItem[] {
  const sourceFile = ts.createSourceFile(
    relativePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true
  );
  const lines = sourceText.split(/\r?\n/u);
  const casts: ProtocolEnvelopeCastInventoryItem[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isAsExpression(node) && isProtocolEnvelopeTypeReference(node.type)) {
      const line = lineOf(sourceFile, node.type);
      casts.push({
        path: relativePath,
        line,
        snippet: (lines[line - 1] ?? "").trim()
      });
    }
    node.forEachChild(visit);
  };

  visit(sourceFile);
  return casts;
}

function formatProtocolVocabularyViolation(
  violation: ProtocolVocabularyViolation
): string {
  return `${violation.path}:${String(violation.line)} ${violation.kind}: ${violation.message} -> ${violation.snippet}`;
}

function formatCastInventoryItem(item: ProtocolEnvelopeCastInventoryItem): string {
  return `${item.path}:${String(item.line)} ProtocolEnvelope cast inventory -> ${item.snippet}`;
}

function resolveImportSpecifierToRepoPath(input: {
  importerPath: string;
  repoRoot: string;
  specifier: string;
}): string | undefined {
  if (!input.specifier.startsWith(".")) {
    return undefined;
  }

  const resolvedPath = resolve(dirname(input.importerPath), input.specifier);
  const resolvedExt = extname(resolvedPath);
  const candidate =
    resolvedExt === ".js" || resolvedExt === ".mjs" || resolvedExt === ".cjs"
      ? `${resolvedPath.slice(0, -resolvedExt.length)}.ts`
      : resolvedPath;
  return normalizePathToPosix(relative(input.repoRoot, candidate));
}

function collectProtocolSurfaceFanout(input: {
  files: readonly string[];
  repoRoot: string;
}): Promise<ProtocolSurfaceFanoutItem[]> {
  return Promise.all(
    protocolSurfaceFanoutTargets.map(async (target) => {
      const importers: string[] = [];
      for (const absolutePath of input.files) {
        const relativePath = normalizePathToPosix(relative(input.repoRoot, absolutePath));
        const sourceText = await readFile(absolutePath, "utf8");
        const sourceFile = ts.createSourceFile(
          relativePath,
          sourceText,
          ts.ScriptTarget.Latest,
          true
        );
        let importsTarget = false;
        const visit = (node: ts.Node): void => {
          if (
            importsTarget
            || !ts.isImportDeclaration(node)
            || !ts.isStringLiteralLike(node.moduleSpecifier)
          ) {
            node.forEachChild(visit);
            return;
          }
          const importedPath = resolveImportSpecifierToRepoPath({
            importerPath: absolutePath,
            repoRoot: input.repoRoot,
            specifier: node.moduleSpecifier.text
          });
          if (importedPath === target.path) {
            importsTarget = true;
          }
          node.forEachChild(visit);
        };
        visit(sourceFile);
        if (importsTarget) {
          importers.push(relativePath);
        }
      }
      return {
        target,
        importers: importers.sort((left, right) => left.localeCompare(right))
      };
    })
  );
}

function formatFanoutItem(item: ProtocolSurfaceFanoutItem): string {
  const sample = item.importers.slice(0, 8).join(", ");
  return `${item.target.path}: ${String(item.importers.length)} importer(s), threshold=${String(item.target.threshold)}, label=${item.target.label}${sample.length > 0 ? `, sample=${sample}` : ""}`;
}

export async function buildProtocolVocabularyDriftCheckReport({
  check,
  repoRoot,
  fallbackMode
}: {
  check: FitnessPolicyCheck;
  repoRoot: string;
  fallbackMode: string;
}): Promise<FitnessReportCheck> {
  const mode = check.mode ?? fallbackMode;
  const scope = check.scope ?? [];
  if (scope.length === 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "warn",
      summary: "Protocol vocabulary drift check has no configured scope.",
      metric: check.metric,
      details: [
        "Set scope patterns in tools/fitness/policy.json for protocol_vocabulary_drift check."
      ]
    };
  }

  const files = await resolveFilesForScopePatterns(repoRoot, scope);
  const violations: ProtocolVocabularyViolation[] = [];
  for (const absolutePath of files) {
    const relativePath = normalizePathToPosix(relative(repoRoot, absolutePath));
    const sourceText = await readFile(absolutePath, "utf8");
    violations.push(...collectProtocolVocabularyViolations(relativePath, sourceText));
  }

  if (violations.length > 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "fail",
      summary: `Protocol vocabulary drift check failed: ${String(violations.length)} violation(s) in ${String(files.length)} scanned file(s).`,
      metric: check.metric,
      details: violations.slice(0, 50).map(formatProtocolVocabularyViolation)
    };
  }

  return {
    id: check.id,
    owner: check.owner ?? "unknown",
    mode,
    status: "pass",
    summary: `Protocol vocabulary drift check passed: ${String(files.length)} scoped file(s) scanned, no protocol vocabulary drift detected.`,
    metric: check.metric,
    details: [`scope=${scope.join(", ")}`, `files_scanned=${String(files.length)}`]
  };
}

export async function buildProtocolSurfaceFanoutInventoryCheckReport({
  check,
  repoRoot,
  fallbackMode
}: {
  check: FitnessPolicyCheck;
  repoRoot: string;
  fallbackMode: string;
}): Promise<FitnessReportCheck> {
  const mode = check.mode ?? fallbackMode;
  const scope = check.scope ?? [];
  if (scope.length === 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "warn",
      summary: "Protocol surface fan-out inventory check has no configured scope.",
      metric: check.metric,
      details: [
        "Set scope patterns in tools/fitness/policy.json for protocol_surface_fanout_inventory check."
      ]
    };
  }

  const files = await resolveFilesForScopePatterns(repoRoot, scope);
  const fanout = await collectProtocolSurfaceFanout({ files, repoRoot });
  const exceeded = fanout.filter((item) =>
    item.importers.length > item.target.threshold
  );

  if (exceeded.length > 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "warn",
      summary: `Protocol surface fan-out inventory found ${String(exceeded.length)} surface(s) above report-only threshold in ${String(files.length)} scanned file(s).`,
      metric: check.metric,
      details: fanout.map(formatFanoutItem)
    };
  }

  return {
    id: check.id,
    owner: check.owner ?? "unknown",
    mode,
    status: "pass",
    summary: `Protocol surface fan-out inventory passed: ${String(files.length)} scoped file(s) scanned, no tracked surface exceeded its report-only threshold.`,
    metric: check.metric,
    details: fanout.map(formatFanoutItem)
  };
}

export async function buildProtocolEnvelopeCastInventoryCheckReport({
  check,
  repoRoot,
  fallbackMode
}: {
  check: FitnessPolicyCheck;
  repoRoot: string;
  fallbackMode: string;
}): Promise<FitnessReportCheck> {
  const mode = check.mode ?? fallbackMode;
  const scope = check.scope ?? [];
  if (scope.length === 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "warn",
      summary: "ProtocolEnvelope cast inventory check has no configured scope.",
      metric: check.metric,
      details: [
        "Set scope patterns in tools/fitness/policy.json for protocol_envelope_cast_inventory check."
      ]
    };
  }

  const files = await resolveFilesForScopePatterns(repoRoot, scope);
  const casts: ProtocolEnvelopeCastInventoryItem[] = [];
  for (const absolutePath of files) {
    const relativePath = normalizePathToPosix(relative(repoRoot, absolutePath));
    const sourceText = await readFile(absolutePath, "utf8");
    casts.push(...collectProtocolEnvelopeCastInventory(relativePath, sourceText));
  }

  if (casts.length > 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "warn",
      summary: `ProtocolEnvelope cast inventory found ${String(casts.length)} cast site(s) in ${String(files.length)} scanned file(s).`,
      metric: check.metric,
      details: casts.slice(0, 50).map(formatCastInventoryItem)
    };
  }

  return {
    id: check.id,
    owner: check.owner ?? "unknown",
    mode,
    status: "pass",
    summary: `ProtocolEnvelope cast inventory check passed: ${String(files.length)} scoped file(s) scanned, no ProtocolEnvelope casts found.`,
    metric: check.metric,
    details: [`scope=${scope.join(", ")}`, `files_scanned=${String(files.length)}`]
  };
}
