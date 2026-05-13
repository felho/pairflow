import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export interface SurveyLaneRow {
  lane: string;
  top: number;
  hasInternal: boolean;
  internalSubAreaCount: number | null;
  hasDefaults: boolean;
}

export interface ActualLaneShape {
  lane: string;
  top: number;
  hasInternal: boolean;
  internalSubAreaCount: number | null;
  hasDefaults: boolean;
}

export interface SurveyDriftIssue {
  lane: string;
  field: "lane" | "top" | "internal" | "sub" | "defaults";
  expected: string;
  actual: string;
}

export interface SurveyDriftReport {
  status: "pass" | "fail";
  checkedLanes: number;
  issues: SurveyDriftIssue[];
}

const defaultSurveyPath = "docs/refactoring/application-command-shapes-survey.md";

// The survey's CLI column is intentionally descriptive: it captures whether a
// lane is CLI-fronted or has lane-side CLI integration, not a filesystem fact.
// This checker only verifies fields that can be derived mechanically.

function parseBooleanCell(value: string): boolean {
  return value.trim() === "yes";
}

function parseSubCell(value: string): number | null {
  const normalized = value.trim();
  if (normalized === "—" || normalized === "-") {
    return null;
  }
  const parsed = Number(normalized);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Invalid survey Sub cell: ${value}`);
  }
  return parsed;
}

function parseTopCell(value: string): number {
  const parsed = Number(value.trim());
  if (!Number.isInteger(parsed)) {
    throw new Error(`Invalid survey Top cell: ${value}`);
  }
  return parsed;
}

export function parseSurveyLaneRows(markdown: string): SurveyLaneRow[] {
  const rows: SurveyLaneRow[] = [];
  let inInventoryTable = false;

  for (const line of markdown.split(/\r?\n/u)) {
    if (line.startsWith("| Lane | Top | Int | Sub | Defaults | CLI | Score | Status |")) {
      inInventoryTable = true;
      continue;
    }
    if (!inInventoryTable) {
      continue;
    }
    if (line.startsWith("|------")) {
      continue;
    }
    if (!line.startsWith("|")) {
      break;
    }

    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length !== 8) {
      throw new Error(`Invalid survey inventory row: ${line}`);
    }
    const lane = cells[0];
    if (lane === undefined || lane.length === 0) {
      throw new Error(`Invalid survey lane cell: ${line}`);
    }
    rows.push({
      lane,
      top: parseTopCell(cells[1] ?? ""),
      hasInternal: parseBooleanCell(cells[2] ?? ""),
      internalSubAreaCount: parseSubCell(cells[3] ?? ""),
      hasDefaults: parseBooleanCell(cells[4] ?? "")
    });
  }

  if (rows.length === 0) {
    throw new Error("Application command survey lane inventory table was not found.");
  }
  return rows;
}

function safeReadDir(path: string): string[] {
  try {
    return readdirSync(path);
  } catch {
    return [];
  }
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function countDirectTypeScriptFiles(path: string): number {
  return safeReadDir(path).filter((entry) => {
    if (!entry.endsWith(".ts") || entry.endsWith(".d.ts")) {
      return false;
    }
    return !isDirectory(join(path, entry));
  }).length;
}

function countDirectSubdirectories(path: string): number {
  return safeReadDir(path).filter((entry) => isDirectory(join(path, entry))).length;
}

export function collectActualLaneShapes(repoRoot: string): ActualLaneShape[] {
  const applicationRoot = join(repoRoot, "src", "v11", "application");
  const defaultsRoot = join(repoRoot, "src", "v11", "defaults");

  return safeReadDir(applicationRoot)
    .filter((entry) => isDirectory(join(applicationRoot, entry)))
    .sort((left, right) => left.localeCompare(right))
    .map((lane) => {
      const laneRoot = join(applicationRoot, lane);
      const internalRoot = join(laneRoot, "internal");
      const hasInternal = isDirectory(internalRoot);
      return {
        lane,
        top: countDirectTypeScriptFiles(laneRoot),
        hasInternal,
        internalSubAreaCount: hasInternal
          ? countDirectSubdirectories(internalRoot)
          : null,
        hasDefaults: isDirectory(join(defaultsRoot, lane))
      };
    });
}

function formatValue(value: string | number | boolean | null): string {
  if (value === null) {
    return "—";
  }
  if (typeof value === "boolean") {
    return value ? "yes" : "—";
  }
  return String(value);
}

function addFieldIssue(
  issues: SurveyDriftIssue[],
  input: {
    lane: string;
    field: SurveyDriftIssue["field"];
    expected: string | number | boolean | null;
    actual: string | number | boolean | null;
  }
): void {
  if (input.expected === input.actual) {
    return;
  }
  issues.push({
    lane: input.lane,
    field: input.field,
    expected: formatValue(input.expected),
    actual: formatValue(input.actual)
  });
}

export async function checkApplicationCommandSurveyDrift(input: {
  repoRoot: string;
  surveyPath?: string;
}): Promise<SurveyDriftReport> {
  const surveyPath = resolve(input.repoRoot, input.surveyPath ?? defaultSurveyPath);
  const surveyRows = parseSurveyLaneRows(await readFile(surveyPath, "utf8"));
  const actualShapes = collectActualLaneShapes(input.repoRoot);
  const actualByLane = new Map(actualShapes.map((shape) => [shape.lane, shape]));
  const surveyByLane = new Map(surveyRows.map((row) => [row.lane, row]));
  const issues: SurveyDriftIssue[] = [];

  for (const row of surveyRows) {
    const actual = actualByLane.get(row.lane);
    if (actual === undefined) {
      issues.push({
        lane: row.lane,
        field: "lane",
        expected: "present",
        actual: "missing"
      });
      continue;
    }
    addFieldIssue(issues, {
      lane: row.lane,
      field: "top",
      expected: row.top,
      actual: actual.top
    });
    addFieldIssue(issues, {
      lane: row.lane,
      field: "internal",
      expected: row.hasInternal,
      actual: actual.hasInternal
    });
    addFieldIssue(issues, {
      lane: row.lane,
      field: "sub",
      expected: row.internalSubAreaCount,
      actual: actual.internalSubAreaCount
    });
    addFieldIssue(issues, {
      lane: row.lane,
      field: "defaults",
      expected: row.hasDefaults,
      actual: actual.hasDefaults
    });
  }

  for (const actual of actualShapes) {
    if (!surveyByLane.has(actual.lane)) {
      issues.push({
        lane: actual.lane,
        field: "lane",
        expected: "absent",
        actual: "present"
      });
    }
  }

  return {
    status: issues.length === 0 ? "pass" : "fail",
    checkedLanes: actualShapes.length,
    issues
  };
}

function renderReport(report: SurveyDriftReport): string {
  if (report.status === "pass") {
    return `application-command survey check passed: ${report.checkedLanes} lane(s) match the documented snapshot inventory.`;
  }
  return [
    `application-command survey check failed: ${report.issues.length} snapshot drift issue(s).`,
    ...report.issues.map((issue) =>
      `${issue.lane}: ${issue.field} expected=${issue.expected} actual=${issue.actual}`
    )
  ].join("\n");
}

async function main(): Promise<void> {
  const repoRoot = process.cwd();
  const report = await checkApplicationCommandSurveyDrift({ repoRoot });
  console.log(renderReport(report));
  if (report.status === "fail") {
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
