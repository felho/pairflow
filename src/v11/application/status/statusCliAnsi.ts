import { stripVTControlCharacters } from "node:util";

function style(input: string, ...ansiCodes: number[]): string {
  if (!process.stdout.isTTY) {
    return input;
  }
  if (process.env.NO_COLOR !== undefined) {
    return input;
  }
  return `\u001b[${ansiCodes.join(";")}m${input}\u001b[0m`;
}

export function green(input: string): string {
  return style(input, 32);
}

export function yellow(input: string): string {
  return style(input, 33);
}

export function red(input: string): string {
  return style(input, 31);
}

export function cyan(input: string): string {
  return style(input, 36);
}

export function blue(input: string): string {
  return style(input, 34);
}

export function white(input: string): string {
  return style(input, 37);
}

export function bold(input: string): string {
  return style(input, 1);
}

export function dim(input: string): string {
  return style(input, 2);
}

function stripAnsi(input: string): string {
  return stripVTControlCharacters(input);
}

export function visibleLength(input: string): number {
  return stripAnsi(input).length;
}

export function padRightVisible(input: string, targetLength: number): string {
  const missing = targetLength - visibleLength(input);
  if (missing <= 0) {
    return input;
  }
  return `${input}${" ".repeat(missing)}`;
}

function readAnsiSequence(
  input: string,
  startIndex: number
): { sequence: string; nextIndex: number } | null {
  if (input[startIndex] !== "\u001b" || input[startIndex + 1] !== "[") {
    return null;
  }

  let cursor = startIndex + 2;
  while (cursor < input.length) {
    const codePoint = input.charCodeAt(cursor);
    if (codePoint >= 0x40 && codePoint <= 0x7e) {
      return {
        sequence: input.slice(startIndex, cursor + 1),
        nextIndex: cursor + 1
      };
    }
    cursor += 1;
  }

  return {
    sequence: input.slice(startIndex),
    nextIndex: input.length
  };
}

export function truncateVisible(input: string, targetLength: number): string {
  if (targetLength <= 0) {
    return "";
  }

  const totalVisibleLength = visibleLength(input);
  if (totalVisibleLength <= targetLength) {
    return input;
  }

  let visibleCount = 0;
  let cursor = 0;
  let output = "";
  let sawAnsi = false;

  while (cursor < input.length && visibleCount < targetLength) {
    const ansiSequence = readAnsiSequence(input, cursor);
    if (ansiSequence !== null) {
      output += ansiSequence.sequence;
      cursor = ansiSequence.nextIndex;
      sawAnsi = true;
      continue;
    }

    output += input[cursor] as string;
    visibleCount += 1;
    cursor += 1;
  }

  if (sawAnsi) {
    output += "\u001b[0m";
  }

  return output;
}

export function fitToVisibleWidth(input: string, targetLength: number): string {
  if (targetLength <= 0) {
    return "";
  }

  const inputLength = visibleLength(input);
  if (inputLength >= targetLength) {
    return truncateVisible(input, targetLength);
  }

  return padRightVisible(input, targetLength);
}
