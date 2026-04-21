import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { MetaReviewResult } from "../../../../src/v11/shared/metaReview/metaReviewTypes.js";
import {
  resolveMetaReviewGateThresholdAuthority
} from "../../../../src/v11/shared/metaReviewGate/metaReviewGateThresholdAuthority.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true }))
  );
});

async function createArtifactFixture(content: Record<string, unknown>): Promise<{
  bubbleDir: string;
  artifactsDir: string;
  artifactRef: string;
  digest: string;
}> {
  const bubbleDir = await mkdtemp(join(tmpdir(), "pairflow-threshold-authority-"));
  tempDirs.push(bubbleDir);
  const artifactsDir = join(bubbleDir, "artifacts");
  await mkdir(artifactsDir, { recursive: true });
  const artifactRef = "artifacts/findings.json";
  const artifactPath = join(bubbleDir, artifactRef);
  await writeFile(artifactPath, `${JSON.stringify(content, null, 2)}\n`, "utf8");
  const raw = await readFile(artifactPath, "utf8");

  return {
    bubbleDir,
    artifactsDir,
    artifactRef,
    digest: createHash("sha256").update(raw, "utf8").digest("hex")
  };
}

function createRunResult(input: {
  runId?: string;
  artifactRef?: string;
  digest?: string;
  findingsCount?: number;
}): MetaReviewResult {
  return {
    bubble_id: "b_threshold_authority_test_01",
    recommendation: "rework",
    status: "success",
    summary: "Threshold authority fixture",
    rework_target_message: "Please rework.",
    updated_at: "2026-04-21T12:00:00.000Z",
    warnings: [],
    ...(input.runId !== undefined ? { run_id: input.runId } : {}),
    report_json: {
      findings_count: input.findingsCount ?? 2,
      findings_artifact_ref: input.artifactRef,
      findings_artifact_status: "present",
      findings_digest_sha256: input.digest,
      meta_review_run_id: input.runId
    }
  };
}

describe("metaReviewGateThresholdAuthority", () => {
  it("resolves highest open severity from the findings artifact chain", async () => {
    const artifact = await createArtifactFixture({
      findings: [
        { severity: "P2", title: "advisory" },
        { severity: "P1", title: "blocking" }
      ],
      summary: {
        open_total: 2
      }
    });
    const runResult = createRunResult({
      runId: "run_threshold_authority_01",
      artifactRef: artifact.artifactRef,
      digest: artifact.digest
    });

    const resolution = await resolveMetaReviewGateThresholdAuthority({
      runResult,
      bubbleDir: artifact.bubbleDir,
      artifactsDir: artifact.artifactsDir,
      readFileFn: (path, encoding) => readFile(path, encoding)
    });

    expect(resolution).toMatchObject({
      status: "resolved",
      highestOpenSeverity: "P1",
      artifactRef: "artifacts/findings.json",
      metaReviewRunId: "run_threshold_authority_01",
      findingsBlockingOpenTotal: 1,
      findingsAdvisoryOpenTotal: 1
    });
  });

  it("prefers the verified artifact split over claimed report-json split totals", async () => {
    const artifact = await createArtifactFixture({
      findings: [
        { severity: "P2", title: "advisory" },
        { severity: "P1", title: "blocking" }
      ],
      summary: {
        open_total: 2
      }
    });
    const runResult = createRunResult({
      runId: "run_threshold_authority_verified_split_01",
      artifactRef: artifact.artifactRef,
      digest: artifact.digest
    });
    if (runResult.report_json === undefined) {
      throw new Error("expected report_json fixture");
    }
    Object.assign(runResult.report_json, {
      findings_blocking_open_total: 0,
      findings_advisory_open_total: 2
    });

    const resolution = await resolveMetaReviewGateThresholdAuthority({
      runResult,
      bubbleDir: artifact.bubbleDir,
      artifactsDir: artifact.artifactsDir,
      readFileFn: (path, encoding) => readFile(path, encoding)
    });

    expect(resolution).toMatchObject({
      status: "resolved",
      findingsBlockingOpenTotal: 1,
      findingsAdvisoryOpenTotal: 1
    });
  });

  it("reads the findings artifact only once on the resolved path", async () => {
    const artifact = await createArtifactFixture({
      findings: [
        { severity: "P2", title: "advisory" },
        { severity: "P1", title: "blocking" }
      ],
      summary: {
        open_total: 2
      }
    });
    const reads: string[] = [];

    const resolution = await resolveMetaReviewGateThresholdAuthority({
      runResult: createRunResult({
        runId: "run_threshold_authority_single_read_01",
        artifactRef: artifact.artifactRef,
        digest: artifact.digest
      }),
      bubbleDir: artifact.bubbleDir,
      artifactsDir: artifact.artifactsDir,
      readFileFn: async (path, encoding) => {
        reads.push(path);
        return readFile(path, encoding);
      }
    });

    expect(resolution.status).toBe("resolved");
    expect(reads).toEqual([join(artifact.bubbleDir, artifact.artifactRef)]);
  });

  it("fails closed as unresolved when the artifact link cannot be resolved", async () => {
    const resolution = await resolveMetaReviewGateThresholdAuthority({
      runResult: createRunResult({
        runId: "run_threshold_authority_02",
        artifactRef: "reviewer_snapshot.json",
        digest: "a".repeat(64)
      }),
      bubbleDir: "/tmp/bubble",
      artifactsDir: "/tmp/bubble/artifacts",
      readFileFn: (path, encoding) => readFile(path, encoding)
    });

    expect(resolution.status).toBe("unresolved");
    expect(resolution.highestOpenSeverity).toBeNull();
    expect(resolution.diagnostics[0]).toContain(
      "REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED"
    );
  });

  it("does not synthesize artifactRef when the canonical report_json field is missing", async () => {
    const resolution = await resolveMetaReviewGateThresholdAuthority({
      runResult: createRunResult({
        runId: "run_threshold_authority_04",
        digest: "b".repeat(64)
      }),
      bubbleDir: "/tmp/bubble",
      artifactsDir: "/tmp/bubble/artifacts",
      readFileFn: (path, encoding) => readFile(path, encoding)
    });

    expect(resolution.status).toBe("unresolved");
    expect(resolution.artifactRef).toBeNull();
    expect(resolution.diagnostics[0]).toContain(
      "REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED"
    );
  });

  it("does not treat reviewer snapshot or approval-like metadata as threshold authority", async () => {
    const runResult = createRunResult({
      runId: "run_threshold_authority_05",
      digest: "c".repeat(64)
    });
    if (runResult.report_json === undefined) {
      throw new Error("expected report_json fixture");
    }
    Object.assign(runResult.report_json, {
      reviewer_snapshot: {
        findings_open_total: 0,
        findings_blocking_open_total: 0,
        findings_advisory_open_total: 0
      },
      approval_request_metadata: {
        findings_parity_status: "ok",
        findings_blocking_open_total: 0,
        findings_advisory_open_total: 0
      }
    });

    const resolution = await resolveMetaReviewGateThresholdAuthority({
      runResult,
      bubbleDir: "/tmp/bubble",
      artifactsDir: "/tmp/bubble/artifacts",
      readFileFn: (path, encoding) => readFile(path, encoding)
    });

    expect(resolution.status).toBe("unresolved");
    expect(resolution.highestOpenSeverity).toBeNull();
    expect(resolution.artifactRef).toBeNull();
    expect(resolution.diagnostics[0]).toContain(
      "REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED"
    );
  });

  it("returns incomplete when parity succeeds but severity cannot be derived", async () => {
    const artifact = await createArtifactFixture({
      findings: [{ title: "missing severity" }],
      summary: {
        open_total: 1
      }
    });
    const resolution = await resolveMetaReviewGateThresholdAuthority({
      runResult: createRunResult({
        runId: "run_threshold_authority_03",
        artifactRef: artifact.artifactRef,
        digest: artifact.digest,
        findingsCount: 1
      }),
      bubbleDir: artifact.bubbleDir,
      artifactsDir: artifact.artifactsDir,
      readFileFn: (path, encoding) => readFile(path, encoding)
    });

    expect(resolution.status).toBe("incomplete");
    expect(resolution.highestOpenSeverity).toBeNull();
    expect(resolution.diagnostics[0]).toContain(
      "REVIEW_POLICY_THRESHOLD_CONTEXT_INCOMPLETE"
    );
  });
});
