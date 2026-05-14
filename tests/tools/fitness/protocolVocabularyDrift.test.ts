import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  buildProtocolEnvelopeCastInventoryCheckReport,
  buildProtocolSurfaceFanoutInventoryCheckReport,
  buildProtocolVocabularyDriftCheckReport
} from "../../../tools/fitness/checks/protocol-vocabulary-drift.js";

const tempDirs: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-fitness-protocol-vocabulary-"));
  tempDirs.push(root);
  return root;
}

async function writeRepoFile(
  repoRoot: string,
  relativePath: string,
  content: string
): Promise<void> {
  const absolutePath = join(repoRoot, relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
}

function driftCheckInput(mode: string = "hard-fail") {
  return {
    id: "protocol_vocabulary_drift",
    metric:
      "protocol payload vocabulary must not drift back to wide payloads or structured metadata bags",
    mode,
    owner: "architecture/protocol",
    scope: ["src/v11/**/*.ts"],
    exceptions: []
  };
}

function castInventoryCheckInput(mode: string = "report-only") {
  return {
    id: "protocol_envelope_cast_inventory",
    metric: "ProtocolEnvelope concrete casts should remain visible until proven safe to hard-fail",
    mode,
    owner: "architecture/protocol",
    scope: ["src/v11/**/*.ts", "tests/**/*.ts"],
    exceptions: []
  };
}

function fanoutInventoryCheckInput(mode: string = "report-only") {
  return {
    id: "protocol_surface_fanout_inventory",
    metric:
      "Protocol and finding contract fan-out should remain visible while broad vocabulary is being narrowed",
    mode,
    owner: "architecture/protocol",
    scope: ["src/**/*.ts", "tests/**/*.ts"],
    exceptions: []
  };
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("protocol vocabulary drift fitness check", () => {
  it("fails when protocol payload metadata carries findings facts", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/protocol/leakyEnvelope.ts",
      [
        "export const envelope = {",
        "  payload: {",
        "    metadata: { findings_parity: { findings_parity_status: 'ok' } }",
        "  }",
        "};"
      ].join("\n")
    );

    const report = await buildProtocolVocabularyDriftCheckReport({
      check: driftCheckInput(),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(
      report.details?.some((detail) =>
        detail.includes("protocol payload metadata must not carry structured field")
      )
    ).toBe(true);
  });

  it("fails when protocol payload metadata carries commit facts", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/commit/leakyCommit.ts",
      [
        "export const commitResult = {",
        "  payload: {",
        "    metadata: { commit_sha: 'abc123', commit_message: 'msg', staged_files: ['a.ts'] }",
        "  }",
        "};"
      ].join("\n")
    );

    const report = await buildProtocolVocabularyDriftCheckReport({
      check: driftCheckInput(),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(
      report.details?.some((detail) => detail.includes("commit_sha"))
    ).toBe(true);
  });

  it("fails when code reads structured facts through payload.metadata", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/converged/leakyReader.ts",
      [
        "export function read(input: { payload: { metadata?: Record<string, unknown> } }) {",
        "  return input.payload.metadata?.advisory_findings_open_total;",
        "}"
      ].join("\n")
    );

    const report = await buildProtocolVocabularyDriftCheckReport({
      check: driftCheckInput(),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(
      report.details?.some((detail) =>
        detail.includes("structured protocol facts must use explicit payload fields")
      )
    ).toBe(true);
  });

  it("fails on retired base and wide payload aliases", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/protocol/protocolEnvelopeContract.ts",
      [
        "interface ProtocolEnvelopeReadablePayload {}",
        "interface HumanQuestionPayload extends ProtocolEnvelopePayloadBase {}"
      ].join("\n")
    );

    const report = await buildProtocolVocabularyDriftCheckReport({
      check: driftCheckInput(),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(
      report.details?.some((detail) => detail.includes("wide/readable protocol payload aliases"))
    ).toBe(true);
    expect(
      report.details?.some((detail) => detail.includes("ProtocolEnvelopePayloadBase is retired"))
    ).toBe(true);
  });

  it("fails when ProtocolEnvelopeMetadata becomes structured", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/protocol/protocolEnvelopeContract.ts",
      [
        "interface FindingsParityMetadata {}",
        "interface ProtocolEnvelopeMetadata extends FindingsParityMetadata {}",
        "type CommitMetadata = ProtocolEnvelopeMetadata & { commit_sha: string };"
      ].join("\n")
    );

    const report = await buildProtocolVocabularyDriftCheckReport({
      check: driftCheckInput(),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(
      report.details?.filter((detail) =>
        detail.includes("ProtocolEnvelopeMetadata")
      ).length
    ).toBeGreaterThanOrEqual(2);
  });

  it("allows domain metadata and top-level protocol fields", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/domain/metaReviewGate/domainMetadata.ts",
      [
        "export function read(input: { metadata: { findings_parity_status?: string } }) {",
        "  return input.metadata.findings_parity_status;",
        "}",
        "export const envelope = {",
        "  payload: {",
        "    findings_parity: { findings_parity_status: 'ok' },",
        "    advisory_findings_open_total: 1,",
        "    commit_sha: 'abc123',",
        "    commit_message: 'msg',",
        "    staged_files: ['a.ts'],",
        "    metadata: { producer_note: 'ok' }",
        "  }",
        "};"
      ].join("\n")
    );

    const report = await buildProtocolVocabularyDriftCheckReport({
      check: driftCheckInput(),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("pass");
  });

  it("reports ProtocolEnvelope casts without blocking as a hard-fail violation", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/converged/castBoundary.ts",
      [
        "import type { ProtocolEnvelope } from '../../shared/protocol/protocolEnvelopeContract.js';",
        "export function cast<TType extends string>(value: unknown) {",
        "  return value as ProtocolEnvelope<TType>;",
        "}"
      ].join("\n")
    );

    const report = await buildProtocolEnvelopeCastInventoryCheckReport({
      check: castInventoryCheckInput(),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.mode).toBe("report-only");
    expect(report.status).toBe("warn");
    expect(report.summary).toContain("cast site");
    expect(
      report.details?.some((detail) => detail.includes("castBoundary.ts"))
    ).toBe(true);
  });

  it("reports broad protocol surface fan-out without blocking", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/protocol/protocolEnvelopeContract.ts",
      "export interface ProtocolEnvelope { id: string; }\n"
    );
    for (let index = 0; index < 76; index += 1) {
      await writeRepoFile(
        repoRoot,
        `src/v11/application/lane${String(index)}/consumer.ts`,
        [
          "import type { ProtocolEnvelope } from '../../shared/protocol/protocolEnvelopeContract.js';",
          "export type ConsumerEnvelope = ProtocolEnvelope;"
        ].join("\n")
      );
    }

    const report = await buildProtocolSurfaceFanoutInventoryCheckReport({
      check: fanoutInventoryCheckInput(),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.mode).toBe("report-only");
    expect(report.status).toBe("warn");
    expect(report.summary).toContain("above report-only threshold");
    expect(
      report.details?.some((detail) =>
        detail.includes("src/v11/shared/protocol/protocolEnvelopeContract.ts: 76 importer(s)")
      )
    ).toBe(true);
  });
});
