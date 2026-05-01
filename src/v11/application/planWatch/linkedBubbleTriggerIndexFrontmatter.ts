export interface PlanTrackerRow {
  taskId: string;
  taskPath: string | null;
}

interface FrontmatterDocument {
  lines: readonly string[];
}

export function extractFrontmatter(content: string): FrontmatterDocument | undefined {
  const lines = content.split(/\r?\n/u);
  const firstContentLineIndex = lines.findIndex((line) => line.trim().length > 0);
  if (firstContentLineIndex === -1 || lines[firstContentLineIndex]?.trim() !== "---") {
    return undefined;
  }

  const endOffset = lines
    .slice(firstContentLineIndex + 1)
    .findIndex((line) => line.trim() === "---");
  if (endOffset === -1) {
    return undefined;
  }

  const endIndex = firstContentLineIndex + 1 + endOffset;
  return {
    lines: lines.slice(firstContentLineIndex + 1, endIndex)
  };
}

export function parseTaskTracker(
  lines: readonly string[]
): PlanTrackerRow[] | undefined {
  const block = collectIndentedListBlock(lines, "task_tracker");
  if (block === undefined) {
    return undefined;
  }

  const rows: PlanTrackerRow[] = [];
  let current: Partial<PlanTrackerRow> | undefined;
  for (const line of block) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }

    const firstProperty = /^-\s+([A-Za-z0-9_-]+)\s*:\s*(.*)$/u.exec(trimmed);
    if (firstProperty !== null) {
      if (current !== undefined) {
        const row = finalizeTrackerRow(current);
        if (row === undefined) {
          return undefined;
        }
        rows.push(row);
      }
      current = {};
      assignTrackerProperty(current, firstProperty[1] ?? "", firstProperty[2] ?? "");
      continue;
    }

    const property = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/u.exec(trimmed);
    if (property !== null && current !== undefined) {
      assignTrackerProperty(current, property[1] ?? "", property[2] ?? "");
      continue;
    }

    return undefined;
  }

  if (current !== undefined) {
    const row = finalizeTrackerRow(current);
    if (row === undefined) {
      return undefined;
    }
    rows.push(row);
  }

  return rows;
}

export function parseScalarList(
  lines: readonly string[],
  key: string
): string[] | undefined {
  const block = collectIndentedListBlock(lines, key);
  if (block === undefined) {
    return undefined;
  }

  const values: string[] = [];
  for (const line of block) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }
    const match = /^-\s+(.+)$/u.exec(trimmed);
    if (match === null) {
      return undefined;
    }
    const value = parseScalarValue(match[1] ?? "");
    if (value === undefined) {
      return undefined;
    }
    values.push(value);
  }
  return values;
}

export function parseTopLevelScalar(
  lines: readonly string[],
  key: string
): string | undefined {
  for (const line of lines) {
    if (/^\s/u.test(line)) {
      continue;
    }
    const match = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/u.exec(line.trim());
    if (match === null || match[1] !== key) {
      continue;
    }
    return parseScalarValue(match[2] ?? "");
  }
  return undefined;
}

export function parseOptionalScalar(
  lines: readonly string[],
  key: string
): string | undefined {
  return parseTopLevelScalar(lines, key);
}

function assignTrackerProperty(
  current: Partial<PlanTrackerRow>,
  key: string,
  rawValue: string
): void {
  if (key === "task_id") {
    current.taskId = parseScalarValue(rawValue) ?? "";
  }
  if (key === "task_path") {
    current.taskPath = parseNullableScalarValue(rawValue);
  }
}

function finalizeTrackerRow(row: Partial<PlanTrackerRow>): PlanTrackerRow | undefined {
  if (row.taskId === undefined || row.taskId.trim().length === 0) {
    return undefined;
  }
  return {
    taskId: row.taskId,
    taskPath: row.taskPath ?? null
  };
}

function collectIndentedListBlock(
  lines: readonly string[],
  key: string
): string[] | undefined {
  const startIndex = lines.findIndex(
    (line) => line.trim() === `${key}:` && !/^\s/u.test(line)
  );
  if (startIndex === -1) {
    return undefined;
  }

  const block: string[] = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (line.trim().length === 0) {
      block.push(line);
      continue;
    }
    if (!/^\s/u.test(line)) {
      break;
    }
    block.push(line);
  }
  return block;
}

function parseNullableScalarValue(value: string): string | null {
  const parsed = parseScalarValue(value);
  return parsed ?? null;
}

function parseScalarValue(value: string): string | undefined {
  const trimmed = stripInlineComment(value).trim();
  if (trimmed.length === 0 || trimmed === "null" || trimmed === "~") {
    return undefined;
  }
  const unquoted = stripMatchingQuotes(trimmed).trim();
  return unquoted.length === 0 ? undefined : unquoted;
}

function stripInlineComment(value: string): string {
  const commentIndex = value.indexOf(" #");
  return commentIndex === -1 ? value : value.slice(0, commentIndex);
}

function stripMatchingQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
