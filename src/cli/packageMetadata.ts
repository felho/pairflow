import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface PairflowPackageMetadata {
  version: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parsePackageMetadataJson(
  content: string,
  sourcePath: string
): PairflowPackageMetadata {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `PACKAGE_METADATA_INVALID: could not parse Pairflow package metadata at ${sourcePath}: ${message}`
    );
  }

  if (!isRecord(parsed) || typeof parsed.version !== "string" || parsed.version.length === 0) {
    throw new Error(
      `PACKAGE_METADATA_INVALID: Pairflow package metadata at ${sourcePath} must include a non-empty string version.`
    );
  }

  return {
    version: parsed.version
  };
}

export async function readPackageMetadataFromPath(
  packageJsonPath: string
): Promise<PairflowPackageMetadata> {
  let content: string;
  try {
    content = await readFile(packageJsonPath, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `PACKAGE_METADATA_UNAVAILABLE: Pairflow package metadata is missing or unreadable at ${packageJsonPath}: ${message}`
    );
  }

  return parsePackageMetadataJson(content, packageJsonPath);
}

export function packageJsonPathFromCliModuleUrl(moduleUrl: string): string {
  const modulePath = fileURLToPath(moduleUrl);
  return resolve(dirname(modulePath), "../../package.json");
}

export async function readInstalledPackageMetadata(): Promise<PairflowPackageMetadata> {
  return readPackageMetadataFromPath(packageJsonPathFromCliModuleUrl(import.meta.url));
}
