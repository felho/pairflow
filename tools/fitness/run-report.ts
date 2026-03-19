#!/usr/bin/env node

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface CliArgs {
  policy: string | undefined;
  out: string | undefined;
}

interface FitnessPolicyCheck {
  id: string;
  metric: string;
  mode: string | undefined;
  owner: string | undefined;
  scope: string[] | undefined;
  exceptions: string[] | undefined;
}

interface FitnessPolicy {
  defaults:
    | {
        mode: string | undefined;
      }
    | undefined;
  checks: FitnessPolicyCheck[];
}

interface FitnessReportCheck {
  id: string;
  owner: string;
  mode: string;
  status: "not_implemented" | "pass" | "warn" | "fail";
  summary: string;
  metric: string;
  details: string[] | undefined;
}

export interface FitnessReport {
  version: number;
  created_at: string;
  policy_path: string;
  checks: FitnessReportCheck[];
}

function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = {
    policy: undefined,
    out: undefined
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--policy") {
      args.policy = argv[index + 1];
      index += 1;
      continue;
    }
    if (token === "--out") {
      args.out = argv[index + 1];
      index += 1;
      continue;
    }
  }
  return args;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const values: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") {
      return undefined;
    }
    values.push(entry);
  }
  return values;
}

export async function readPolicy(policyPath: string): Promise<FitnessPolicy> {
  const raw = await readFile(policyPath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!isRecord(parsed)) {
    throw new Error("Invalid fitness policy format.");
  }
  const checksRaw = parsed.checks;
  if (!Array.isArray(checksRaw)) {
    throw new Error("Invalid fitness policy format.");
  }
  const checks: FitnessPolicyCheck[] = checksRaw.map((check) => {
    if (!isRecord(check)) {
      throw new Error("Invalid fitness policy check entry.");
    }
    const id = asString(check.id);
    const metric = asString(check.metric);
    if (id === undefined || metric === undefined) {
      throw new Error("Fitness policy check must define string id and metric.");
    }
    return {
      id,
      metric,
      mode: asString(check.mode),
      owner: asString(check.owner),
      scope: asStringArray(check.scope),
      exceptions: asStringArray(check.exceptions)
    };
  });
  const defaults = isRecord(parsed.defaults)
    ? {
        mode: asString(parsed.defaults.mode)
      }
    : undefined;
  return {
    checks,
    defaults
  };
}

export function buildReport(
  policy: FitnessPolicy,
  policyPath: string,
  checks: FitnessReportCheck[]
): FitnessReport {
  const createdAt = new Date().toISOString();
  return {
    version: 1,
    created_at: createdAt,
    policy_path: policyPath,
    checks
  };
}

function normalizePathToPosix(path: string): string {
  return path.replaceAll("\\", "/");
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function globToRegExp(pattern: string): RegExp {
  let regex = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (char === undefined) {
      continue;
    }
    if (char === "*") {
      if (pattern[index + 1] === "*") {
        regex += ".*";
        index += 1;
      } else {
        regex += "[^/]*";
      }
      continue;
    }
    regex += escapeRegExp(char);
  }
  regex += "$";
  return new RegExp(regex);
}

async function walkFilesRecursive(directoryPath: string): Promise<string[]> {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules") {
      continue;
    }
    const fullPath = resolve(directoryPath, entry.name);
    if (entry.isDirectory()) {
      const nested = await walkFilesRecursive(fullPath);
      files.push(...nested);
      continue;
    }
    if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function scopeRootsFromPatterns(patterns: readonly string[]): string[] {
  const roots = new Set<string>();
  for (const pattern of patterns) {
    const normalized = normalizePathToPosix(pattern).replace(/^\/+/u, "");
    const root = normalized.split("/")[0];
    if (root !== undefined && root.length > 0) {
      roots.add(root);
    }
  }
  return [...roots];
}

async function resolveFilesForScopePatterns(
  repoRoot: string,
  scopePatterns: readonly string[]
): Promise<string[]> {
  const scopeRegexes = scopePatterns.map((pattern) =>
    globToRegExp(normalizePathToPosix(pattern))
  );
  const roots = scopeRootsFromPatterns(scopePatterns);
  const matched = new Set<string>();
  for (const root of roots) {
    const rootPath = resolve(repoRoot, root);
    let filesUnderRoot: string[] = [];
    try {
      filesUnderRoot = await walkFilesRecursive(rootPath);
    } catch {
      // Missing scope root is tolerated; it just means no files currently match.
      filesUnderRoot = [];
    }
    for (const absolutePath of filesUnderRoot) {
      const relativePath = normalizePathToPosix(relative(repoRoot, absolutePath));
      if (scopeRegexes.some((regex) => regex.test(relativePath))) {
        matched.add(absolutePath);
      }
    }
  }
  return [...matched].sort((left, right) => left.localeCompare(right));
}

function createNotImplementedCheckReport(
  check: FitnessPolicyCheck,
  fallbackMode: string
): FitnessReportCheck {
  return {
    id: check.id,
    owner: check.owner ?? "unknown",
    mode: check.mode ?? fallbackMode,
    status: "not_implemented",
    summary: "Skeleton report item; metric runner is not wired yet.",
    metric: check.metric,
    details: undefined
  };
}

interface BoundaryViolation {
  path: string;
  line: number;
  kind: "state_write" | "transcript_write";
  snippet: string;
}

const boundaryForbiddenPatterns: readonly {
  kind: BoundaryViolation["kind"];
  matcher: RegExp;
}[] = [
  {
    kind: "state_write",
    matcher: /\bwriteStateSnapshot\s*\(/u
  },
  {
    kind: "transcript_write",
    matcher: /\bappendProtocolEnvelope\s*\(/u
  }
] as const;

function collectBoundaryViolations(
  filePath: string,
  fileContent: string
): BoundaryViolation[] {
  const violations: BoundaryViolation[] = [];
  const lines = fileContent.split(/\r?\n/u);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();
    if (trimmed.startsWith("//")) {
      continue;
    }
    for (const pattern of boundaryForbiddenPatterns) {
      if (pattern.matcher.test(line)) {
        violations.push({
          path: filePath,
          line: index + 1,
          kind: pattern.kind,
          snippet: trimmed
        });
      }
    }
  }
  return violations;
}

function summarizeBoundaryViolations(violations: readonly BoundaryViolation[]): string[] {
  return violations.slice(0, 50).map((violation) => {
    const kindLabel =
      violation.kind === "state_write"
        ? "direct state write"
        : "direct transcript write";
    return `${violation.path}:${violation.line} ${kindLabel} -> ${violation.snippet}`;
  });
}

async function buildBoundaryCheckReport(
  check: FitnessPolicyCheck,
  repoRoot: string,
  fallbackMode: string
): Promise<FitnessReportCheck> {
  const mode = check.mode ?? fallbackMode;
  const scope = check.scope ?? [];
  if (scope.length === 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "warn",
      summary: "Boundary check has no configured scope.",
      metric: check.metric,
      details: ["Set scope patterns in tools/fitness/policy.json for boundary check."]
    };
  }

  const files = await resolveFilesForScopePatterns(repoRoot, scope);
  if (files.length === 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "pass",
      summary: "Boundary check passed: no files matched current scope.",
      metric: check.metric,
      details: [`scope=${scope.join(", ")}`]
    };
  }

  const allViolations: BoundaryViolation[] = [];
  for (const absolutePath of files) {
    const raw = await readFile(absolutePath, "utf8");
    const relativePath = normalizePathToPosix(relative(repoRoot, absolutePath));
    allViolations.push(...collectBoundaryViolations(relativePath, raw));
  }

  if (allViolations.length === 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "pass",
      summary: `Boundary check passed: ${files.length} scoped files scanned, no direct write violations.`,
      metric: check.metric,
      details: [`scope=${scope.join(", ")}`, `files_scanned=${String(files.length)}`]
    };
  }

  return {
    id: check.id,
    owner: check.owner ?? "unknown",
    mode,
    status: "fail",
    summary: `Boundary check failed: ${String(allViolations.length)} direct write violation(s) in ${String(files.length)} scoped files.`,
    metric: check.metric,
    details: summarizeBoundaryViolations(allViolations)
  };
}

async function buildCheckReport(
  check: FitnessPolicyCheck,
  repoRoot: string,
  fallbackMode: string
): Promise<FitnessReportCheck> {
  if (check.id === "boundary") {
    return buildBoundaryCheckReport(check, repoRoot, fallbackMode);
  }
  return createNotImplementedCheckReport(check, fallbackMode);
}

export async function buildReportChecks(
  policy: FitnessPolicy,
  repoRoot: string
): Promise<FitnessReportCheck[]> {
  const fallbackMode = policy.defaults?.mode ?? "report-only";
  const checks = await Promise.all(
    policy.checks.map((check) => buildCheckReport(check, repoRoot, fallbackMode))
  );
  return checks;
}

export async function runReport({
  policyPath,
  outPath,
  repoRoot
}: {
  policyPath: string;
  outPath: string | undefined;
  repoRoot?: string;
}): Promise<FitnessReport> {
  const resolvedRepoRoot = repoRoot ?? process.cwd();
  const policy = await readPolicy(policyPath);
  const checks = await buildReportChecks(policy, resolvedRepoRoot);
  const report = buildReport(policy, policyPath, checks);
  const reportText = JSON.stringify(report, null, 2);
  if (outPath !== undefined) {
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, reportText + "\n", "utf8");
  }
  process.stdout.write(reportText + "\n");
  return report;
}

async function main() {
  const scriptDir = resolve(dirname(fileURLToPath(import.meta.url)));
  const repoRoot = resolve(scriptDir, "../..");
  const args = parseArgs(process.argv.slice(2));
  const policyPath = resolve(
    repoRoot,
    args.policy ?? "tools/fitness/policy.json"
  );
  const outPath =
    args.out === undefined ? undefined : resolve(repoRoot, args.out);

  await runReport({
    policyPath,
    outPath,
    repoRoot
  });
}

const isMainModule =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`fitness:report failed: ${message}\n`);
    process.exitCode = 1;
  });
}
