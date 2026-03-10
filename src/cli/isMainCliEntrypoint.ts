import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

function toCanonicalPath(pathValue: string): string {
  const absolutePath = resolve(pathValue);
  try {
    return realpathSync.native(absolutePath);
  } catch {
    return absolutePath;
  }
}

export function isMainCliEntrypoint(
  importMetaUrl: string,
  argvEntry: string | undefined
): boolean {
  if (argvEntry === undefined || argvEntry.trim().length === 0) {
    return false;
  }

  let modulePath: string;
  try {
    modulePath = fileURLToPath(importMetaUrl);
  } catch {
    return false;
  }

  return toCanonicalPath(modulePath) === toCanonicalPath(argvEntry);
}
