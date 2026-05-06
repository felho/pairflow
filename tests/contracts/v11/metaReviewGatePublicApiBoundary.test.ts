import { readFile, readdir } from "node:fs/promises";
import { relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import * as metaReviewGatePublicApi from "../../../src/v11/shared/metaReviewGate/index.js";
import {
  metaReviewGateRoutes
} from "../../../src/v11/shared/metaReviewGate/index.js";
import {
  applyMetaReviewGateOnConvergence,
  toMetaReviewGateError
} from "../../../src/v11/application/metaReviewGate/metaReviewGateCommandApi.js";
import {
  resolveReworkFindingsParityInput,
  validateFindingsArtifactParity
} from "../../../src/v11/shared/metaReviewGate/metaReviewGateFindingsParityApi.js";
import {
  readLatestSameRoundReviewerSnapshotFromTranscript
} from "../../../src/v11/shared/metaReviewGate/metaReviewGateReviewerSnapshotApi.js";
import {
  resolveMetaReviewGateThresholdAuthority
} from "../../../src/v11/shared/metaReviewGate/metaReviewGateThresholdAuthorityApi.js";
import {
  finalizeCurrentRunMetaReviewGate
} from "../../../src/v11/application/metaReviewGate/metaReviewGateCurrentRunApi.js";

const allowedSharedMetaReviewGateImports = new Set([
  "../metaReviewGate/index.js",
  "../metaReviewGate/metaReviewGateFindingsParityApi.js",
  "../metaReviewGate/metaReviewGateReviewerSnapshotApi.js",
  "../metaReviewGate/metaReviewGateThresholdAuthorityApi.js",
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

  it("exports orchestration contracts without domain-only policy helpers", () => {
    expect(metaReviewGateRoutes).toContain("human_gate_approve");
    expect(resolveMetaReviewGateThresholdAuthority).toBeTypeOf("function");
    expect(resolveReworkFindingsParityInput).toBeTypeOf("function");
    expect(validateFindingsArtifactParity).toBeTypeOf("function");
    expect(readLatestSameRoundReviewerSnapshotFromTranscript).toBeTypeOf(
      "function"
    );
    expect(metaReviewGatePublicApi).not.toHaveProperty(
      "metaReviewGateThresholdIsMet"
    );
    expect(metaReviewGatePublicApi).not.toHaveProperty(
      "resolveFindingsParityMetadataFromReportJson"
    );
    expect(metaReviewGatePublicApi).not.toHaveProperty(
      "isAdvisoryOnlyReviewerSnapshot"
    );
    expect(metaReviewGatePublicApi).not.toHaveProperty(
      "resolveReworkFindingsParityInput"
    );
    expect(metaReviewGatePublicApi).not.toHaveProperty(
      "validateFindingsArtifactParity"
    );
    expect(metaReviewGatePublicApi).not.toHaveProperty(
      "resolveMetaReviewGateThresholdAuthority"
    );
    expect(metaReviewGatePublicApi).not.toHaveProperty(
      "readLatestSameRoundReviewerSnapshotFromTranscript"
    );
    expect(metaReviewGatePublicApi).not.toHaveProperty(
      "applyMetaReviewGateOnConvergence"
    );
    expect(metaReviewGatePublicApi).not.toHaveProperty(
      "toMetaReviewGateError"
    );
    expect(metaReviewGatePublicApi).not.toHaveProperty(
      "resolveMetaReviewGateNotifyTmuxCapabilities"
    );
    expect(metaReviewGatePublicApi).not.toHaveProperty(
      "resolveMetaReviewGatePaneBindingTmuxCapabilities"
    );
  });

  it("keeps command runtime on its narrow public API", () => {
    expect(applyMetaReviewGateOnConvergence).toBeTypeOf("function");
    expect(toMetaReviewGateError).toBeTypeOf("function");
  });

  it("keeps findings artifact parity on its narrow public API", () => {
    expect(resolveReworkFindingsParityInput).toBeTypeOf("function");
    expect(validateFindingsArtifactParity).toBeTypeOf("function");
  });

  it("keeps threshold authority resolution on its narrow public API", () => {
    expect(resolveMetaReviewGateThresholdAuthority).toBeTypeOf("function");
  });

  it("keeps reviewer snapshot lookup on its narrow public API", () => {
    expect(readLatestSameRoundReviewerSnapshotFromTranscript).toBeTypeOf(
      "function"
    );
  });

  it("keeps current-run finalization on its narrow public API", () => {
    expect(finalizeCurrentRunMetaReviewGate).toBeTypeOf("function");
  });
});
