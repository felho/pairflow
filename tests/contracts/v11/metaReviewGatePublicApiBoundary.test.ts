import { readFile, readdir } from "node:fs/promises";
import { relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  metaReviewGateRoutes,
  metaReviewGateThresholdIsMet,
  readLatestSameRoundReviewerSnapshotFromTranscript,
  resolveFindingsParityMetadataFromReportJson,
  resolveMetaReviewGateThresholdAuthority,
  resolveReworkFindingsParityInput,
  validateFindingsArtifactParity
} from "../../../src/v11/shared/metaReviewGate/index.js";
import {
  finalizeCurrentRunMetaReviewGate
} from "../../../src/v11/shared/metaReviewGate/metaReviewGateCurrentRunApi.js";

const allowedSharedMetaReviewGateImports = new Set([
  "../metaReviewGate/index.js",
  "../metaReviewGate/metaReviewGateCurrentRunApi.js"
]);

async function listTypeScriptFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, {
    withFileTypes: true,
    recursive: true
  });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) => resolve(entry.parentPath, entry.name))
    .sort();
}

function collectMetaReviewGateImports(content: string): string[] {
  const pattern =
    /(?:^|\n)\s*(?:import|export)\b[\s\S]*?\bfrom\s+["']([^"']*metaReviewGate[^"']+)["']/gu;

  return Array.from(content.matchAll(pattern))
    .map((match) => match[1])
    .filter((specifier): specifier is string => specifier !== undefined)
    .sort();
}

describe("meta-review gate public API boundary", () => {
  it("keeps external meta-review submit consumers on public gate APIs", async () => {
    const metaReviewRoot = resolve(process.cwd(), "src/v11/shared/metaReview");
    const files = await listTypeScriptFiles(metaReviewRoot);

    const violations: string[] = [];
    for (const filePath of files) {
      const content = await readFile(filePath, "utf8");
      for (const specifier of collectMetaReviewGateImports(content)) {
        if (
          specifier.startsWith("../metaReviewGate/") &&
          !allowedSharedMetaReviewGateImports.has(specifier)
        ) {
          violations.push(
            `${relative(process.cwd(), filePath)} imports ${specifier}`
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("exports meta-review gate policy/read helpers from the aggregate index", () => {
    expect(metaReviewGateRoutes).toContain("human_gate_approve");
    expect(metaReviewGateThresholdIsMet).toBeTypeOf("function");
    expect(resolveMetaReviewGateThresholdAuthority).toBeTypeOf("function");
    expect(resolveReworkFindingsParityInput).toBeTypeOf("function");
    expect(validateFindingsArtifactParity).toBeTypeOf("function");
    expect(resolveFindingsParityMetadataFromReportJson).toBeTypeOf("function");
    expect(readLatestSameRoundReviewerSnapshotFromTranscript).toBeTypeOf(
      "function"
    );
  });

  it("keeps current-run finalization on its narrow public API", () => {
    expect(finalizeCurrentRunMetaReviewGate).toBeTypeOf("function");
  });
});
