import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildReportChecks } from "../../../tools/fitness/checks/index.js";
import { buildUiContractBoundaryCheckReport } from "../../../tools/fitness/checks/ui-contract-boundary.js";
import type { FitnessPolicy } from "../../../tools/fitness/types.js";

const tempDirs: string[] = [];
const repoRoot = process.cwd();
const staleUiContractBoundaryExceptionId =
  "ui-contract-boundary-known-meta-review-drift-001";

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-fitness-ui-contract-"));
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

describe("UI contract boundary fitness check", () => {
  it("guards expanded timeline rendering against legacy protocol display reads", async () => {
    const source = await readFile(
      join(repoRoot, "ui/src/components/expanded/BubbleTimeline.tsx"),
      "utf8"
    );
    const forbiddenPatterns = [
      /\bentry\.payload\b/u,
      /\bpayloadSummary\b/u,
      /\bextractMetaReviewHandoffAttempt\b/u,
      /\bbuildSyntheticMetaApprovalEntry\b/u,
      /\bbuildDisplayTimelineItems\b/u,
      /\blatest_recommendation\b/u,
      /\bmeta_review_handoff_id\b/u,
      /\bdelivery_target_role\b/u,
      /\bactor_agent\b/u
    ];

    expect(
      forbiddenPatterns.filter((pattern) => pattern.test(source)).map(String)
    ).toEqual([]);
  });

  it("fails on UI direct imports from src/v11", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "ui/src/lib/file.ts",
      "import type { RuntimeType } from \"../../../src/v11/shared/runtime.js\";\nexport type Local = RuntimeType;\n"
    );

    const report = await buildUiContractBoundaryCheckReport({
      check: {
        id: "ui_contract_boundary",
        metric: "UI/backend contract boundary import direction",
        mode: "hard-fail",
        owner: "architecture/ui-contracts",
        scope: ["ui/src/**", "src/contracts/ui/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(report.details?.some((detail) => detail.includes("ui/src/lib/file.ts:1"))).toBe(
      true
    );
    expect(report.details?.some((detail) => detail.includes("src/v11"))).toBe(
      true
    );
  });

  it("fails on browser-unsafe imports from src/contracts/ui", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/contracts/ui/file.ts",
      [
        "import { readFile } from \"node:fs/promises\";",
        "import { run } from \"../../v11/application/run.js\";",
        "export const value = { readFile, run };"
      ].join("\n")
    );

    const report = await buildUiContractBoundaryCheckReport({
      check: {
        id: "ui_contract_boundary",
        metric: "UI/backend contract boundary import direction",
        mode: "hard-fail",
        owner: "architecture/ui-contracts",
        scope: ["ui/src/**", "src/contracts/ui/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(report.details?.some((detail) => detail.includes("node:fs"))).toBe(
      true
    );
    expect(report.details?.some((detail) => detail.includes("src/v11"))).toBe(
      true
    );
  });

  it("fails on bare internal imports from src/contracts/ui", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/contracts/ui/file.ts",
      [
        "import { app } from \"application/service\";",
        "import { defaults } from \"defaults/config\";",
        "import { infra } from \"infrastructure/http\";",
        "export const value = { app, defaults, infra };"
      ].join("\n")
    );

    const report = await buildUiContractBoundaryCheckReport({
      check: {
        id: "ui_contract_boundary",
        metric: "UI/backend contract boundary import direction",
        mode: "hard-fail",
        owner: "architecture/ui-contracts",
        scope: ["ui/src/**", "src/contracts/ui/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(
      report.details?.some((detail) => detail.includes("application/service"))
    ).toBe(true);
    expect(report.details?.some((detail) => detail.includes("defaults/config"))).toBe(
      true
    );
    expect(
      report.details?.some((detail) => detail.includes("infrastructure/http"))
    ).toBe(true);
  });

  it("fails on relative UI imports from canonical UI contracts", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/contracts/ui/boundary.ts",
      "export interface Marker { readonly boundary: 'ui'; }\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/contracts/ui/index.ts",
      "export type { Marker } from './boundary.js';\n"
    );
    await writeRepoFile(
      repoRoot,
      "ui/src/lib/file.ts",
      "import type { Marker } from '../../../src/contracts/ui/index.js';\nexport type Local = Marker;\n"
    );

    const report = await buildUiContractBoundaryCheckReport({
      check: {
        id: "ui_contract_boundary",
        metric: "UI/backend contract boundary import direction",
        mode: "hard-fail",
        owner: "architecture/ui-contracts",
        scope: ["ui/src/**", "src/contracts/ui/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(report.details?.some((detail) => detail.includes("ui/src/lib/file.ts:1"))).toBe(
      true
    );
    expect(
      report.details?.some((detail) =>
        detail.includes("@pairflow/ui-contracts")
      )
    ).toBe(true);
  });

  it("fails on relative UI re-exports from canonical UI contracts", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/contracts/ui/boundary.ts",
      "export interface Marker { readonly boundary: 'ui'; }\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/contracts/ui/index.ts",
      "export type { Marker } from './boundary.js';\n"
    );
    await writeRepoFile(
      repoRoot,
      "ui/src/lib/file.ts",
      "export type { Marker } from '../../../src/contracts/ui/index.js';\n"
    );

    const report = await buildUiContractBoundaryCheckReport({
      check: {
        id: "ui_contract_boundary",
        metric: "UI/backend contract boundary import direction",
        mode: "hard-fail",
        owner: "architecture/ui-contracts",
        scope: ["ui/src/**", "src/contracts/ui/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(report.details?.some((detail) => detail.includes("ui/src/lib/file.ts:1"))).toBe(
      true
    );
    expect(
      report.details?.some((detail) =>
        detail.includes("@pairflow/ui-contracts")
      )
    ).toBe(true);
  });

  it("fails on UI direct imports from src/types", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "ui/src/lib/file.ts",
      "import type { ProtocolMessageType } from '../../../src/types/protocol.js';\nexport type Local = ProtocolMessageType;\n"
    );

    const report = await buildUiContractBoundaryCheckReport({
      check: {
        id: "ui_contract_boundary",
        metric: "UI/backend contract boundary import direction",
        mode: "hard-fail",
        owner: "architecture/ui-contracts",
        scope: ["ui/src/**", "src/contracts/ui/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(report.details?.some((detail) => detail.includes("ui/src/lib/file.ts:1"))).toBe(
      true
    );
    expect(report.details?.some((detail) => detail.includes("src/types"))).toBe(
      true
    );
  });

  it("fails on UI import-type references to src/types", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "ui/src/lib/file.ts",
      "export type Local = import('../../../src/types/protocol.js').ProtocolMessageType;\n"
    );

    const report = await buildUiContractBoundaryCheckReport({
      check: {
        id: "ui_contract_boundary",
        metric: "UI/backend contract boundary import direction",
        mode: "hard-fail",
        owner: "architecture/ui-contracts",
        scope: ["ui/src/**", "src/contracts/ui/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(report.details?.some((detail) => detail.includes("ui/src/lib/file.ts:1"))).toBe(
      true
    );
    expect(report.details?.some((detail) => detail.includes("src/types"))).toBe(
      true
    );
  });

  it("fails on UI import-equals references to src/types", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "ui/src/lib/file.ts",
      "import type Protocol = require('../../../src/types/protocol.js');\nexport type Local = Protocol.ProtocolMessageType;\n"
    );

    const report = await buildUiContractBoundaryCheckReport({
      check: {
        id: "ui_contract_boundary",
        metric: "UI/backend contract boundary import direction",
        mode: "hard-fail",
        owner: "architecture/ui-contracts",
        scope: ["ui/src/**", "src/contracts/ui/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(report.details?.some((detail) => detail.includes("ui/src/lib/file.ts:1"))).toBe(
      true
    );
    expect(report.details?.some((detail) => detail.includes("src/types"))).toBe(
      true
    );
  });

  it("fails on UI dynamic imports with options from src/types", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "ui/src/lib/file.ts",
      "export async function loadProtocol() {\n  return import('../../../src/types/protocol.js', { with: {} });\n}\n"
    );

    const report = await buildUiContractBoundaryCheckReport({
      check: {
        id: "ui_contract_boundary",
        metric: "UI/backend contract boundary import direction",
        mode: "hard-fail",
        owner: "architecture/ui-contracts",
        scope: ["ui/src/**", "src/contracts/ui/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(report.details?.some((detail) => detail.includes("ui/src/lib/file.ts:2"))).toBe(
      true
    );
    expect(report.details?.some((detail) => detail.includes("src/types"))).toBe(
      true
    );
  });

  it("fails on UI dynamic template imports from src/types", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "ui/src/lib/file.ts",
      "export async function loadProtocol() {\n  return import(`../../../src/types/protocol.js`);\n}\n"
    );

    const report = await buildUiContractBoundaryCheckReport({
      check: {
        id: "ui_contract_boundary",
        metric: "UI/backend contract boundary import direction",
        mode: "hard-fail",
        owner: "architecture/ui-contracts",
        scope: ["ui/src/**", "src/contracts/ui/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(report.details?.some((detail) => detail.includes("ui/src/lib/file.ts:2"))).toBe(
      true
    );
    expect(report.details?.some((detail) => detail.includes("src/types"))).toBe(
      true
    );
  });

  it("passes the public UI contracts entrypoint in browser source", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "ui/src/lib/file.ts",
      "import type { Marker } from '@pairflow/ui-contracts';\nexport type Local = Marker;\n"
    );

    const report = await buildUiContractBoundaryCheckReport({
      check: {
        id: "ui_contract_boundary",
        metric: "UI/backend contract boundary import direction",
        mode: "hard-fail",
        owner: "architecture/ui-contracts",
        scope: ["ui/src/**", "src/contracts/ui/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("pass");
  });

  it("fails on bare UI imports from canonical UI contracts", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "ui/src/lib/file.ts",
      "import type { Marker } from 'src/contracts/ui/index.js';\nexport type Local = Marker;\n"
    );

    const report = await buildUiContractBoundaryCheckReport({
      check: {
        id: "ui_contract_boundary",
        metric: "UI/backend contract boundary import direction",
        mode: "hard-fail",
        owner: "architecture/ui-contracts",
        scope: ["ui/src/**", "src/contracts/ui/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(report.details?.some((detail) => detail.includes("ui/src/lib/file.ts:1"))).toBe(
      true
    );
    expect(
      report.details?.some((detail) =>
        detail.includes("@pairflow/ui-contracts")
      )
    ).toBe(true);
  });

  it("applies explicit import exceptions", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "ui/src/lib/file.ts",
      "import type { RuntimeType } from \"../../../src/v11/shared/runtime.js\";\nexport type Local = RuntimeType;\n"
    );

    const report = await buildUiContractBoundaryCheckReport({
      check: {
        id: "ui_contract_boundary",
        metric: "UI/backend contract boundary import direction",
        mode: "hard-fail",
        owner: "architecture/ui-contracts",
        scope: ["ui/src/**", "src/contracts/ui/**"],
        exceptions: [
          {
            id: "fixture-allow-import-neutral",
            kind: "allow-import",
            owner: "architecture/ui-contracts",
            reason: "temporary known drift",
            from: "ui/src/lib/file.ts",
            to: "src/v11/shared/runtime.ts",
            paths: undefined
          }
        ]
      },
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("pass");
    expect(
      report.details?.some((detail) => detail.includes("exceptions_applied=1"))
    ).toBe(true);
    expect(
      report.details?.some((detail) =>
        detail.includes("exceptions_applied_ids=fixture-allow-import-neutral")
      )
    ).toBe(true);
  });

  it("matches explicit import exceptions for extensionless relative imports", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "ui/src/lib/file.ts",
      "import type { RuntimeType } from \"../../../src/v11/shared/runtime\";\nexport type Local = RuntimeType;\n"
    );

    const report = await buildUiContractBoundaryCheckReport({
      check: {
        id: "ui_contract_boundary",
        metric: "UI/backend contract boundary import direction",
        mode: "hard-fail",
        owner: "architecture/ui-contracts",
        scope: ["ui/src/**", "src/contracts/ui/**"],
        exceptions: [
          {
            id: "fixture-allow-import-extensionless-neutral",
            kind: "allow-import",
            owner: "architecture/ui-contracts",
            reason: "temporary known drift",
            from: "ui/src/lib/file.ts",
            to: "src/v11/shared/runtime.ts",
            paths: undefined
          }
        ]
      },
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("pass");
    expect(
      report.details?.some((detail) =>
        detail.includes(
          "exceptions_applied_ids=fixture-allow-import-extensionless-neutral"
        )
      )
    ).toBe(true);
  });

  it("rejects exception paths outside the repo root", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "ui/src/lib/file.ts",
      "import type { RuntimeType } from \"../../../src/v11/shared/runtime.js\";\nexport type Local = RuntimeType;\n"
    );

    const report = await buildUiContractBoundaryCheckReport({
      check: {
        id: "ui_contract_boundary",
        metric: "UI/backend contract boundary import direction",
        mode: "hard-fail",
        owner: "architecture/ui-contracts",
        scope: ["ui/src/**", "src/contracts/ui/**"],
        exceptions: [
          {
            id: "bad-path",
            kind: "allow-import",
            owner: "architecture/ui-contracts",
            reason: "invalid relative path",
            from: "../ui/src/lib/file.ts",
            to: "src/v11/shared/runtime.ts",
            paths: undefined
          }
        ]
      },
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(
      report.details?.some((detail) => detail.includes("exceptions_invalid=1"))
    ).toBe(true);
    expect(
      report.details?.some((detail) => detail.includes("path escapes repo root"))
    ).toBe(true);
  });

  it("fails when exception configuration is invalid without import violations", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/contracts/ui/index.ts",
      "export interface Marker { readonly boundary: 'ui'; }\n"
    );

    const report = await buildUiContractBoundaryCheckReport({
      check: {
        id: "ui_contract_boundary",
        metric: "UI/backend contract boundary import direction",
        mode: "hard-fail",
        owner: "architecture/ui-contracts",
        scope: ["ui/src/**", "src/contracts/ui/**"],
        exceptions: [
          {
            id: "unsupported-exception",
            kind: "allow-edge",
            owner: "architecture/ui-contracts",
            reason: "wrong exception type",
            from: "src/contracts/ui/index.ts",
            to: "src/contracts/ui/boundary.ts",
            paths: undefined
          }
        ]
      },
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(
      report.details?.some((detail) => detail.includes("exceptions_invalid=1"))
    ).toBe(true);
    expect(
      report.summary.includes("1 invalid exception entry")
    ).toBe(true);
  });

  it("dispatches ui_contract_boundary through the normal report builder", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/contracts/ui/index.ts",
      "export interface Marker { readonly boundary: 'ui'; }\n"
    );

    const checks = await buildReportChecks(
      {
        defaults: { mode: "hard-fail" },
        checks: [
          {
            id: "ui_contract_boundary",
            metric: "UI/backend contract boundary import direction",
            mode: undefined,
            owner: "architecture/ui-contracts",
            scope: ["ui/src/**", "src/contracts/ui/**"],
            exceptions: []
          }
        ]
      },
      repoRoot
    );

    expect(checks).toHaveLength(1);
    expect(checks[0]?.id).toBe("ui_contract_boundary");
    expect(checks[0]?.status).toBe("pass");
    expect(checks[0]?.mode).toBe("hard-fail");
  });

  it("keeps the live policy free of stale ui_contract_boundary exceptions and reports none applied", async () => {
    const policy = JSON.parse(
      await readFile(resolve(repoRoot, "tools/fitness/policy.json"), "utf8")
    ) as FitnessPolicy;
    const liveCheck = policy.checks.find(
      (check) => check.id === "ui_contract_boundary"
    );

    expect(liveCheck).toBeDefined();
    expect(liveCheck?.mode).toBe("hard-fail");
    expect(liveCheck?.exceptions ?? []).toStrictEqual([]);
    expect(
      JSON.stringify(liveCheck).includes(staleUiContractBoundaryExceptionId)
    ).toBe(false);
    if (liveCheck === undefined) {
      throw new Error("Expected live ui_contract_boundary policy check.");
    }

    const report = await buildUiContractBoundaryCheckReport({
      check: liveCheck,
      repoRoot,
      fallbackMode: policy.defaults?.mode ?? "hard-fail"
    });

    expect(report.status).toBe("pass");
    expect(report.details).toContain("exceptions_configured=0");
    expect(report.details).toContain("exceptions_applied=0");
  });
});
