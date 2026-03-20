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
