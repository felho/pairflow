import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildDependencyCheckReport } from "../../../tools/fitness/checks/dependency.js";

const tempDirs: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-fitness-dependency-"));
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

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("dependency fitness check", () => {
  it("fails on forbidden layer import direction", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/handler.ts",
      "export const handler = 1;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/domain/rule.ts",
      "import { handler } from '../application/handler.js';\nexport const rule = handler;\n"
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only",
    });

    expect(report.status).toBe("fail");
    expect(
      report.details?.some((detail) => detail.includes("forbidden layer import"))
    ).toBe(true);
  });

  it("fails on forbidden layer import hidden behind a dynamic path helper", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/infrastructure/artifact/bubble/remoteExecutionArtifacts.ts",
      "export const readRemotePointer = () => undefined;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/open/openBubbleDefaults.ts",
      [
        "function getRemoteExecutionArtifactsModulePath(): string {",
        "  return ['..', '..', 'infrastructure', 'artifact', 'bubble', 'remoteExecutionArtifacts.js'].join('/');",
        "}",
        "export async function load() {",
        "  return import(getRemoteExecutionArtifactsModulePath());",
        "}"
      ].join("\n")
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only",
    });

    expect(report.status).toBe("fail");
    expect(
      report.details?.some((detail) =>
        detail.includes("forbidden layer import application -> infrastructure")
      )
    ).toBe(true);
  });

  it("fails on import cycle", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/domain/a.ts",
      "import { b } from './b.js';\nexport const a = b;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/domain/b.ts",
      "import { a } from './a.js';\nexport const b = a;\n"
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only",
    });

    expect(report.status).toBe("fail");
    expect(report.details?.some((detail) => detail.includes("import cycle detected"))).toBe(
      true
    );
  });

  it("passes for clean dependency graph", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/types.ts",
      "export type Id = string;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/domain/rule.ts",
      "import type { Id } from '../shared/types.js';\nexport const rule = (id: Id): Id => id;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/use-case.ts",
      "import { rule } from '../domain/rule.js';\nexport const run = (id: string): string => rule(id);\n"
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only",
    });

    expect(report.status).toBe("pass");
    expect(report.details?.some((detail) => detail.startsWith("import_edges="))).toBe(true);
  });

  it("passes on application to application imports within the same layer", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/feature-a.ts",
      "export const featureA = 1;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/feature-b.ts",
      "import { featureA } from './feature-a.js';\nexport const featureB = featureA;\n"
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only",
    });

    expect(report.status).toBe("pass");
    expect(
      report.details?.some((detail) =>
        detail.includes("forbidden layer import application -> application")
      )
    ).toBe(false);
  });

  it("passes on application to ports imports", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/ports/repoRegistry.ts",
      "export interface RepoRegistryPort { register(name: string): Promise<void>; }\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/create/use-case.ts",
      "import type { RepoRegistryPort } from '../../ports/repoRegistry.js';\nexport type Deps = { repoRegistry: RepoRegistryPort };\n"
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only",
    });

    expect(report.status).toBe("pass");
    expect(
      report.details?.some((detail) =>
        detail.includes("forbidden layer import application -> ports")
      )
    ).toBe(false);
  });

  it("fails when protocol envelope contract imports the transitional findings facade", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/types/findings.ts",
      "export interface Finding { title: string; }\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/protocol/protocolEnvelopeContract.ts",
      [
        "import type { Finding } from '../../../types/findings.js';",
        "export interface ProtocolEnvelopePayload { findings?: Finding[]; }"
      ].join("\n")
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only",
    });

    expect(report.status).toBe("fail");
    expect(
      report.details?.some((detail) =>
        detail.includes("protocol envelope contract must import findings from the kernel owner")
      )
    ).toBe(true);
  });

  it("fails when v11 production code imports the transitional findings facade", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/types/findings.ts",
      "export interface Finding { title: string; }\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/domain/pass/findingPolicy.ts",
      [
        "import type { Finding } from '../../../types/findings.js';",
        "export type PolicyFinding = Finding;"
      ].join("\n")
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only",
    });

    expect(report.status).toBe("fail");
    expect(
      report.details?.some((detail) =>
        detail.includes("v11 production code must import findings from src/contracts/kernel/findings.ts")
      )
    ).toBe(true);
  });

  it("passes on shared to ports imports", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/ports/transcript.ts",
      "export type AppendTranscriptPort = (path: string) => Promise<void>;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/metaReview/metaReviewCommandContract.ts",
      "import type { AppendTranscriptPort } from '../../ports/transcript.js';\nexport interface Deps { appendTranscript?: AppendTranscriptPort; }\n"
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only",
    });

    expect(report.status).toBe("pass");
    expect(
      report.details?.some((detail) =>
        detail.includes("forbidden layer import shared -> ports")
      )
    ).toBe(false);
  });

  it("fails on ports to infrastructure import", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/infrastructure/executor/workspace/repoRegistry.ts",
      "export const registerRepo = async (): Promise<void> => {};\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/ports/repoRegistry.ts",
      "import { registerRepo } from '../infrastructure/executor/workspace/repoRegistry.js';\nexport const register = registerRepo;\n"
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only",
    });

    expect(report.status).toBe("fail");
    expect(
      report.details?.some((detail) =>
        detail.includes("forbidden layer import ports -> infrastructure")
      )
    ).toBe(true);
  });

  it("passes on infrastructure to ports import", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/ports/repoRegistry.ts",
      "export interface RepoRegistryPort { register(name: string): Promise<void>; }\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/infrastructure/executor/workspace/repoRegistry.ts",
      "import type { RepoRegistryPort } from '../../../ports/repoRegistry.js';\nexport const repoRegistry: RepoRegistryPort = { register: async () => {} };\n"
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only",
    });

    expect(report.status).toBe("pass");
    expect(
      report.details?.some((detail) =>
        detail.includes("forbidden layer import infrastructure -> ports")
      )
    ).toBe(false);
  });

  it("fails on process runtime imports under application", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/start/startCliRunner.ts",
      [
        "import { spawn } from 'node:child_process';",
        "export const run = (): void => {",
        "  spawn('pairflow', []);",
        "};",
        ""
      ].join("\n")
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only",
    });

    expect(report.status).toBe("fail");
    expect(
      report.details?.some((detail) =>
        detail.includes(
          "forbidden process runtime import node:child_process"
        )
      )
    ).toBe(true);
  });

  it("fails on process runtime imports under defaults", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/defaults/planWatch/agentRunnerBridgeDefaults.ts",
      [
        "const workerThreads = await import('node:worker_threads');",
        "export const workerCount = Object.keys(workerThreads).length;",
        ""
      ].join("\n")
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only",
    });

    expect(report.status).toBe("fail");
    expect(
      report.details?.some((detail) =>
        detail.includes(
          "forbidden process runtime import node:worker_threads"
        )
      )
    ).toBe(true);
  });

  it("allows process runtime imports under infrastructure", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/infrastructure/executor/process/spawnProcess.ts",
      [
        "import { spawn } from 'node:child_process';",
        "export const spawnProcess = spawn;",
        ""
      ].join("\n")
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only",
    });

    expect(report.status).toBe("pass");
    expect(
      report.details?.some((detail) =>
        detail.includes("forbidden process runtime import")
      )
    ).toBe(false);
  });

  it("warns when a shared command directory is consumed by one application lane only", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/inbox/inboxCommandApi.ts",
      "export const normalizeInboxInput = (value: string): string => value.trim();\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/inbox/inboxCommand.ts",
      [
        "import { normalizeInboxInput } from '../../shared/inbox/inboxCommandApi.js';",
        "export const emit = (value: string): string => normalizeInboxInput(value);",
        ""
      ].join("\n")
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only",
    });

    expect(report.status).toBe("warn");
    expect(
      report.details?.some((detail) =>
        detail.includes(
          "src/v11/shared/inbox: shared-promotion warning: command-shaped shared directory imported only by application lane inbox"
        )
      )
    ).toBe(true);
  });

  it("does not warn when a command-neutral shared directory has one application consumer", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/read-model/list/listReadModel.ts",
      "export const listReadModel = 'read-model';\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/list/listCommandApi.ts",
      [
        "import { listReadModel } from '../../shared/read-model/list/listReadModel.js';",
        "export const list = listReadModel;",
        ""
      ].join("\n")
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only",
    });

    expect(report.status).toBe("pass");
    expect(
      report.details?.some((detail) =>
        detail.includes("shared-promotion warning")
      )
    ).toBe(false);
  });

  it("does not warn when a shared directory is consumed by multiple application lanes", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/approval/approvalSchema.ts",
      "export const approvalSchema = 'approval';\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/approval/approvalCommandApi.ts",
      "import { approvalSchema } from '../../shared/approval/approvalSchema.js';\nexport const approval = approvalSchema;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/pass/passWorkspaceContextDefaults.ts",
      "import { approvalSchema } from '../../shared/approval/approvalSchema.js';\nexport const pass = approvalSchema;\n"
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only",
    });

    expect(report.status).toBe("pass");
    expect(
      report.details?.some((detail) =>
        detail.includes("shared-promotion warning")
      )
    ).toBe(false);
  });

  it("does not warn when a shared directory has an infrastructure consumer", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/approval/approvalSchema.ts",
      "export const approvalSchema = 'approval';\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/approval/approvalCommandApi.ts",
      "import { approvalSchema } from '../../shared/approval/approvalSchema.js';\nexport const approval = approvalSchema;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/infrastructure/approval/approvalStore.ts",
      "import { approvalSchema } from '../../shared/approval/approvalSchema.js';\nexport const store = approvalSchema;\n"
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only",
    });

    expect(report.status).toBe("pass");
    expect(
      report.details?.some((detail) =>
        detail.includes("shared-promotion warning")
      )
    ).toBe(false);
  });

  it("warns when non-port shared modules own lifecycle state transition policy", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/domain/state/machine.ts",
      "export function applyStateTransition(): string { return 'next'; }\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/watchdog/watchdogEscalationMutation.ts",
      [
        "import { applyStateTransition } from '../../domain/state/machine.js';",
        "export function escalate(): string {",
        "  return applyStateTransition();",
        "}",
        ""
      ].join("\n")
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only",
    });

    expect(report.status).toBe("warn");
    expect(
      report.details?.some((detail) =>
        detail.includes(
          "src/v11/shared/watchdog/watchdogEscalationMutation.ts: shared-lifecycle-policy warning"
        )
      )
    ).toBe(true);
    expect(
      report.details?.some((detail) =>
        detail.includes("domain-state-transition-policy")
      )
    ).toBe(true);
  });

  it("warns when non-port shared modules combine transcript and state persistence workflow calls", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/state/startStateMutation.ts",
      [
        "export async function mutate(input: {",
        "  appendProtocolEnvelope: () => Promise<void>;",
        "  writeStateSnapshot: () => Promise<void>;",
        "}): Promise<void> {",
        "  await input.appendProtocolEnvelope();",
        "  await input.writeStateSnapshot();",
        "}",
        ""
      ].join("\n")
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only",
    });

    expect(report.status).toBe("warn");
    expect(
      report.details?.some((detail) =>
        detail.includes("transcript-state-persistence-ordering")
      )
    ).toBe(true);
  });

  it("does not warn for shared port contract shapes that mention state and transcript capabilities without orchestrating them", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/metaReviewGate/metaReviewGateRuntimeCapabilities.ts",
      [
        "export interface RuntimeCapabilities {",
        "  writeStateSnapshot?: unknown;",
        "  appendProtocolEnvelope?: unknown;",
        "}",
        ""
      ].join("\n")
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only",
    });

    expect(report.status).toBe("pass");
    expect(
      report.details?.some((detail) =>
        detail.includes("shared-lifecycle-policy warning")
      )
    ).toBe(false);
  });

  it("fails on shared direct infrastructure re-export camouflage", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/infrastructure/foundation/fs/pathExists.ts",
      "export const pathExists = async (): Promise<boolean> => true;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/fs/pathExists.ts",
      "export { pathExists } from '../../infrastructure/foundation/fs/pathExists.js';\n"
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only",
    });

    expect(report.status).toBe("fail");
    expect(
      report.details?.some((detail) =>
        detail.includes("anti-circumvention: shared re-exports infrastructure module")
      )
    ).toBe(true);
  });

  it("fails on ports thin forwarding wrapper over infrastructure", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/infrastructure/executor/workspace/repoRegistry.ts",
      "export const registerRepo = async (name: string): Promise<string> => name;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/ports/repoRegistry.ts",
      [
        "import { registerRepo } from '../infrastructure/executor/workspace/repoRegistry.js';",
        "export const register = registerRepo;",
        ""
      ].join("\n")
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only",
    });

    expect(report.status).toBe("fail");
    expect(
      report.details?.some((detail) =>
        detail.includes("anti-circumvention: ports acts as a thin forwarding wrapper")
      )
    ).toBe(true);
  });

  it("does not warn on shared modules that only probe paths via node:fs", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/fs/pathExists.ts",
      [
        "import { access } from 'node:fs/promises';",
        "export const pathExists = async (path: string): Promise<boolean> => {",
        "  await access(path);",
        "  return true;",
        "};",
        ""
      ].join("\n")
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only",
    });

    expect(report.status).toBe("pass");
    expect(
      report.details?.some((detail) =>
        detail.includes("ownership-signal warning: shared module shows strong infrastructure signals (filesystem-persistence)")
      )
    ).toBe(false);
  });

  it("still warns on shared modules that read artifact content via node:fs", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/fs/readArtifact.ts",
      [
        "import { readFile } from 'node:fs/promises';",
        "export const readArtifact = async (path: string): Promise<string> => {",
        "  return readFile(path, 'utf8');",
        "};",
        ""
      ].join("\n")
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only",
    });

    expect(report.status).toBe("warn");
    expect(
      report.details?.some((detail) =>
        detail.includes("ownership-signal warning: shared module shows strong infrastructure signals (filesystem-persistence)")
      )
    ).toBe(true);
  });

  it("allows documented ownership-signal warnings by exact path", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/command/agentCommand.ts",
      [
        "import { spawn } from 'node:child_process';",
        "export const discover = (): void => {",
        "  spawn('codex', ['mcp', 'list', '--json']);",
        "};",
        ""
      ].join("\n")
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: [
          {
            id: "agent-command-codex-mcp-discovery",
            kind: "allow-ownership-signal",
            owner: "architecture/runtime",
            reason: "Bounded command discovery is intentionally shared.",
            from: "src/v11/shared/command/agentCommand.ts",
            to: undefined,
            paths: undefined
          }
        ]
      },
      repoRoot,
      fallbackMode: "report-only",
    });

    expect(report.status).toBe("pass");
    expect(report.details).toContain("exceptions_applied=1");
    expect(report.details).toContain(
      "exceptions_applied_ids=agent-command-codex-mcp-discovery"
    );
  });

  it("warns on state/transcript persistence signal under ports", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/ports/transcript.ts",
      [
        "import { appendProtocolEnvelope } from '../../../core/protocol/transcriptStore.js';",
        "export const append = async (): Promise<void> => {",
        "  await appendProtocolEnvelope({});",
        "};",
        ""
      ].join("\n")
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only",
    });

    expect(report.status).toBe("warn");
    expect(
      report.details?.some((detail) =>
        detail.includes("ownership-signal warning: ports module shows strong infrastructure signals (transcript-persistence)")
      )
    ).toBe(true);
  });

  it("warns on shared helpers that orchestrate injected transcript and state capabilities", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/reply/replyMutationExecution.ts",
      [
        "export async function execute(input: {",
        "  appendProtocolEnvelope: (value: unknown) => Promise<void>;",
        "  writeStateSnapshot: (value: unknown) => Promise<void>;",
        "}): Promise<void> {",
        "  await input.appendProtocolEnvelope({});",
        "  await input.writeStateSnapshot({});",
        "}",
        ""
        ].join("\n")
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only",
    });

    expect(report.status).toBe("warn");
    expect(
      report.details?.some((detail) =>
        detail.includes("ownership-signal warning")
      )
    ).toBe(false);
    expect(
      report.details?.some((detail) =>
        detail.includes("transcript-state-persistence-ordering")
      )
    ).toBe(true);
  });

  it("does not warn on generic tmux wording under shared", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/restart/restartCommandCliOptions.ts",
      [
        "export function getHelp(): string {",
        "  return 'Restarts bubble runtime by terminating the existing tmux session/runtime ownership.';",
        "}",
        ""
      ].join("\n")
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only",
    });

    expect(report.status).toBe("pass");
    expect(
      report.details?.some((detail) =>
        detail.includes("ownership-signal warning: shared module shows strong infrastructure signals (tmux-runtime)")
      )
    ).toBe(false);
  });

  it("still warns on concrete delivery runtime capability under shared", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/askHuman/emit.ts",
      [
        "import type { DeliveryAck } from '../../../core/runtime/tmuxDelivery.js';",
        "export function fallback(): DeliveryAck {",
        "  return { status: 'rejected', message: '', reason: 'command_failed', reason_code: 'DELIVERY_ACK_REJECTED' };",
        "}",
        ""
      ].join("\n")
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only",
    });

    expect(report.status).toBe("warn");
    expect(
      report.details?.some((detail) =>
        detail.includes("ownership-signal warning: shared module shows strong infrastructure signals (tmux-runtime)")
      )
    ).toBe(true);
  });

  it("does not warn on canonical delivery port types under ports", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/ports/tmuxDelivery.ts",
      "export type EmitDeliveryNotificationAckPort = (input: { bubbleId: string }) => Promise<{ status: 'accepted' | 'rejected' }>;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/ports/askHumanDelivery.ts",
      [
        "import type { EmitDeliveryNotificationAckPort } from './tmuxDelivery.js';",
        "export interface Deps { emit: EmitDeliveryNotificationAckPort; }",
        ""
      ].join("\n")
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only",
    });

    expect(report.status).toBe("pass");
    expect(
      report.details?.some((detail) =>
        detail.includes("ownership-signal warning: shared module shows strong infrastructure signals (tmux-runtime)")
      )
    ).toBe(false);
  });

  it("applies allow-edge exception for forbidden layer import", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/handler.ts",
      "export const handler = 1;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/domain/rule.ts",
      "import { handler } from '../application/handler.js';\nexport const rule = handler;\n"
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: [
          {
            id: "dep-allow-edge-001",
            kind: "allow-edge",
            owner: "architecture",
            reason: "temporary migration bridge",
            from: "src/v11/domain/rule.ts",
            to: "src/v11/application/handler.ts",
            paths: undefined
          }
        ]
      },
      repoRoot,
      fallbackMode: "report-only",
    });

    expect(report.status).toBe("pass");
    expect(report.details?.some((detail) => detail === "exceptions_applied=1")).toBe(true);
    expect(
      report.details?.some((detail) =>
        detail.includes("exceptions_applied_ids=dep-allow-edge-001")
      )
    ).toBe(true);
  });

  it("applies allow-cycle exception for cycle violation", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/domain/a.ts",
      "import { b } from './b.js';\nexport const a = b;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/domain/b.ts",
      "import { a } from './a.js';\nexport const b = a;\n"
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: [
          {
            id: "dep-allow-cycle-001",
            kind: "allow-cycle",
            owner: "architecture",
            reason: "temporary migration cycle",
            from: undefined,
            to: undefined,
            paths: ["src/v11/domain/a.ts", "src/v11/domain/b.ts"]
          }
        ]
      },
      repoRoot,
      fallbackMode: "report-only",
    });

    expect(report.status).toBe("pass");
    expect(report.details?.some((detail) => detail === "exceptions_applied=1")).toBe(true);
    expect(
      report.details?.some((detail) =>
        detail.includes("exceptions_applied_ids=dep-allow-cycle-001")
      )
    ).toBe(true);
  });

});
