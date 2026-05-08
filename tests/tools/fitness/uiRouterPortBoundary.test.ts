import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildUiRouterPortBoundaryCheckReport } from "../../../tools/fitness/checks/ui-router-port-boundary.js";
import type { FitnessPolicyException } from "../../../tools/fitness/types.js";

const tempDirs: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-fitness-ui-router-port-"));
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

function defaultCheck(input: {
  scope: string[];
  exceptions?: FitnessPolicyException[];
}) {
  return {
    id: "ui_router_port_boundary",
    metric: "UI router port full-composite and command-owned import leakage",
    mode: "hard-fail",
    owner: "architecture/ui-router",
    scope: input.scope,
    exceptions: input.exceptions ?? []
  };
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("UI router port boundary fitness check", () => {
  it("fails on broad UiRouterDependencies use in router leaf modules", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/infrastructure/ui/routerLeaf.ts",
      [
        "import type { UiRouterDependencies } from './routerContracts.js';",
        "interface RouterLeafEnvironment {",
        "  dependencies: UiRouterDependencies;",
        "}"
      ].join("\n")
    );

    const report = await buildUiRouterPortBoundaryCheckReport({
      check: defaultCheck({ scope: ["src/v11/infrastructure/ui/*.ts"] }),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(report.details).toContainEqual(
      expect.stringContaining("FULL_UI_ROUTER_DEPENDENCY_BAG_USAGE")
    );
    expect(report.details).toContainEqual(
      expect.stringContaining(
        "src/v11/infrastructure/ui/routerLeaf.ts#UiRouterDependencies"
      )
    );
  });

  it("allows composition and wiring UiRouterDependencies use without exceptions", async () => {
    const repoRoot = await createTempRoot();
    for (const path of [
      "src/v11/infrastructure/ui/router.ts",
      "src/v11/infrastructure/ui/routerContracts.ts",
      "src/v11/infrastructure/ui/routerDependencies.ts"
    ]) {
      await writeRepoFile(
        repoRoot,
        path,
        [
          "import type { UiRouterDependencies } from '../../../src/v11/ports/uiRouter.js';",
          "export interface Allowed { dependencies: UiRouterDependencies; }"
        ].join("\n")
      );
    }

    const report = await buildUiRouterPortBoundaryCheckReport({
      check: defaultCheck({ scope: ["src/v11/infrastructure/ui/*.ts"] }),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("pass");
  });

  it("fails on aggregate-derived leaf aliases", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/ports/uiRouter.ts",
      [
        "export interface UiRouterDependencies {",
        "  listBubbles: () => void;",
        "  startBubble: () => void;",
        "}",
        "type LocalRouterDependencies = UiRouterDependencies;",
        "type LocalListDependencies = Pick<LocalRouterDependencies, 'listBubbles'>;",
        "export type UiBubbleListDependencies = Pick<UiRouterDependencies, 'listBubbles'>;",
        "export interface UiBubbleActionDependencies extends Pick<UiRouterDependencies, 'startBubble'> {}",
        "export interface UiBubbleDetailDependencies extends UiRouterDependencies {}",
        "export type UiBubbleLocalAliasDependencies = LocalListDependencies;"
      ].join("\n")
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/infrastructure/ui/routerLeafAlias.ts",
      [
        "import type { UiRouterDependencies } from '../../../src/v11/ports/uiRouter.js';",
        "type LocalRouterDependencies = UiRouterDependencies;",
        "export type UiBubbleInfrastructureAliasDependencies = Pick<LocalRouterDependencies, 'listBubbles'>;"
      ].join("\n")
    );

    const report = await buildUiRouterPortBoundaryCheckReport({
      check: defaultCheck({
        scope: [
          "src/v11/ports/*.ts",
          "src/v11/infrastructure/ui/*.ts"
        ]
      }),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(report.details).toContainEqual(
      expect.stringContaining("AGGREGATE_DERIVED_UI_ROUTER_SLICE_ALIAS")
    );
    expect(report.details).toContainEqual(
      expect.stringContaining("src/v11/ports/uiRouter.ts#UiBubbleListDependencies")
    );
    expect(report.details).toContainEqual(
      expect.stringContaining(
        "src/v11/ports/uiRouter.ts#UiBubbleActionDependencies"
      )
    );
    expect(report.details).toContainEqual(
      expect.stringContaining(
        "src/v11/ports/uiRouter.ts#UiBubbleDetailDependencies"
      )
    );
    expect(report.details).toContainEqual(
      expect.stringContaining(
        "src/v11/ports/uiRouter.ts#UiBubbleLocalAliasDependencies"
      )
    );
    expect(report.details).toContainEqual(
      expect.stringContaining(
        "src/v11/infrastructure/ui/routerLeafAlias.ts#UiBubbleInfrastructureAliasDependencies"
      )
    );
  });

  it("fails on command-owned imports from any shared port file", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/workflow/workflowCommandContract.ts",
      "export interface WorkflowCommandContract { id: string; }\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/ports/futureUiPort.ts",
      "import type { WorkflowCommandContract } from '../shared/workflow/workflowCommandContract.js';\nexport type Future = WorkflowCommandContract;\n"
    );

    const report = await buildUiRouterPortBoundaryCheckReport({
      check: defaultCheck({ scope: ["src/v11/ports/*.ts"] }),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(report.details).toContainEqual(
      expect.stringContaining("COMMAND_OWNED_UI_PORT_IMPORT")
    );
    expect(report.details).toContainEqual(
      expect.stringContaining("src/v11/ports/futureUiPort.ts")
    );
  });

  it("fails on command-owned imports with standalone ownership markers and trailing versions", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/read/ListV2.ts",
      "export interface ListV2 { id: string; }\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/read/Inbox.ts",
      "export interface Inbox { id: string; }\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/ports/futureUiPort.ts",
      [
        "import type { ListV2 } from '../shared/read/ListV2.js';",
        "import type { Inbox } from '../shared/read/Inbox.js';",
        "export type Future = ListV2 | Inbox;"
      ].join("\n")
    );

    const report = await buildUiRouterPortBoundaryCheckReport({
      check: defaultCheck({ scope: ["src/v11/ports/*.ts"] }),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(
      report.details?.filter((detail) =>
        detail.includes("COMMAND_OWNED_UI_PORT_IMPORT")
      )
    ).toHaveLength(2);
    expect(report.details).toContainEqual(
      expect.stringContaining("src/v11/shared/read/ListV2.ts")
    );
    expect(report.details).toContainEqual(
      expect.stringContaining("src/v11/shared/read/Inbox.ts")
    );
  });

  it("passes with exact transitional exceptions and reports reason-code IDs", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/infrastructure/ui/routerActionDispatch.ts",
      [
        "import type { UiRouterEnvironment } from './routerContracts.js';",
        "export async function dispatch(input: { environment: UiRouterEnvironment }) {",
        "  return input.environment.dependencies.startBubble();",
        "}"
      ].join("\n")
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/workflow/workflowCommandContract.ts",
      "export interface WorkflowCommandContract { id: string; }\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/ports/uiRouter.ts",
      "import type { WorkflowCommandContract } from '../shared/workflow/workflowCommandContract.js';\nexport type View = WorkflowCommandContract;\n"
    );

    const report = await buildUiRouterPortBoundaryCheckReport({
      check: defaultCheck({
        scope: [
          "src/v11/infrastructure/ui/*.ts",
          "src/v11/ports/*.ts"
        ],
        exceptions: [
          {
            id: "router-port-deps-task2-router-action-dispatch-001",
            kind: "allow-full-dependency-bag",
            owner: "architecture/ui-router",
            reason: "temporary broad dependency bag use",
            paths: [
              "src/v11/infrastructure/ui/routerActionDispatch.ts#UiRouterDependencies"
            ],
            from: undefined,
            to: undefined
          },
          {
            id: "router-port-command-task4-workflow-001",
            kind: "allow-command-owned-ui-port-import",
            owner: "architecture/ui-contracts",
            reason: "temporary command-owned import",
            from: "src/v11/ports/uiRouter.ts",
            to: "src/v11/shared/workflow/workflowCommandContract.ts",
            paths: undefined
          }
        ]
      }),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("pass");
    expect(report.details).toContainEqual(expect.stringContaining("exceptions_applied=2"));
    expect(report.details).toContainEqual(
      expect.stringContaining("TRANSITIONAL_EXCEPTION_APPLIED")
    );
    expect(report.details).toContainEqual(
      expect.stringContaining(
        "router-port-deps-task2-router-action-dispatch-001"
      )
    );
    expect(report.details).toContainEqual(
      expect.stringContaining("router-port-command-task4-workflow-001")
    );
  });

  it("fails on malformed router-port exceptions", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/infrastructure/ui/routerLeaf.ts",
      "export const ok = true;\n"
    );

    const report = await buildUiRouterPortBoundaryCheckReport({
      check: defaultCheck({
        scope: ["src/v11/infrastructure/ui/*.ts"],
        exceptions: [
          {
            id: "router-port-broad-exception",
            kind: "allow-full-dependency-bag",
            owner: "architecture/ui-router",
            reason: "invalid broad exception",
            paths: ["src/v11/infrastructure/ui/*.ts#UiRouterDependencies"],
            from: undefined,
            to: undefined
          },
          {
            id: "router-port-mixed-exception",
            kind: "allow-full-dependency-bag",
            owner: "architecture/ui-router",
            reason: "invalid mixed exception",
            paths: ["src/v11/infrastructure/ui/routerLeaf.ts#UiRouterDependencies"],
            from: "src/v11/infrastructure/ui/routerLeaf.ts",
            to: undefined
          },
          {
            id: "router-port-mixed-exception",
            kind: "allow-command-owned-ui-port-import",
            owner: "architecture/ui-router",
            reason: "duplicate exception id",
            from: "src/v11/ports/uiRouter.ts",
            to: "src/v11/shared/workflow/workflowCommandContract.ts",
            paths: undefined
          },
          {
            id: "",
            kind: "allow-command-owned-ui-port-import",
            owner: "",
            reason: "",
            from: "src/v11/ports/uiRouter.ts",
            to: "src/v11/shared/workflow/workflowCommandContract.ts",
            paths: undefined
          }
        ]
      }),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(report.details).toContainEqual(expect.stringContaining("exceptions_invalid=4"));
    expect(report.details).toContainEqual(
      expect.stringContaining("INVALID_ROUTER_PORT_EXCEPTION")
    );
  });

  it("invalidates all entries that share a duplicate exception ID", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/workflow/workflowCommandContract.ts",
      "export interface WorkflowCommandContract { id: string; }\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/ports/uiRouter.ts",
      "import type { WorkflowCommandContract } from '../shared/workflow/workflowCommandContract.js';\nexport type View = WorkflowCommandContract;\n"
    );

    const report = await buildUiRouterPortBoundaryCheckReport({
      check: defaultCheck({
        scope: ["src/v11/ports/*.ts"],
        exceptions: [
          {
            id: "router-port-duplicate-command",
            kind: "allow-command-owned-ui-port-import",
            owner: "architecture/ui-contracts",
            reason: "would otherwise match",
            from: "src/v11/ports/uiRouter.ts",
            to: "src/v11/shared/workflow/workflowCommandContract.ts",
            paths: undefined
          },
          {
            id: "router-port-duplicate-command",
            kind: "allow-command-owned-ui-port-import",
            owner: "architecture/ui-contracts",
            reason: "duplicate",
            from: "src/v11/ports/uiRouter.ts",
            to: "src/v11/shared/workflow/workflowCommandContract.ts",
            paths: undefined
          }
        ]
      }),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(report.details).toContainEqual(expect.stringContaining("exceptions_invalid=2"));
    expect(report.details).toContainEqual(
      expect.stringContaining("COMMAND_OWNED_UI_PORT_IMPORT")
    );
    expect(report.details).not.toContainEqual(
      expect.stringContaining("TRANSITIONAL_EXCEPTION_APPLIED")
    );
  });

  it("rejects command import exceptions that do not point to exact .ts files", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/ports/uiRouter.ts",
      "export const ok = true;\n"
    );

    const report = await buildUiRouterPortBoundaryCheckReport({
      check: defaultCheck({
        scope: ["src/v11/ports/*.ts"],
        exceptions: [
          {
            id: "router-port-js-exception",
            kind: "allow-command-owned-ui-port-import",
            owner: "architecture/ui-contracts",
            reason: "invalid non-source exception",
            from: "src/v11/ports/uiRouter.js",
            to: "src/v11/shared/workflow/workflowCommandContract.ts",
            paths: undefined
          }
        ]
      }),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(report.details).toContainEqual(expect.stringContaining("exceptions_invalid=1"));
    expect(report.details).toContainEqual(
      expect.stringContaining("from/to must resolve to exact .ts source files")
    );
    expect(report.details).not.toContainEqual(
      expect.stringContaining("UNUSED_ROUTER_PORT_EXCEPTION")
    );
  });

  it("rejects command import exceptions whose exact source paths are missing", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/ports/uiRouter.ts",
      "export const ok = true;\n"
    );

    const report = await buildUiRouterPortBoundaryCheckReport({
      check: defaultCheck({
        scope: ["src/v11/ports/*.ts"],
        exceptions: [
          {
            id: "router-port-missing-target",
            kind: "allow-command-owned-ui-port-import",
            owner: "architecture/ui-contracts",
            reason: "invalid missing source file",
            from: "src/v11/ports/uiRouter.ts",
            to: "src/v11/shared/workflow/missingWorkflowCommandContract.ts",
            paths: undefined
          }
        ]
      }),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(report.details).toContainEqual(expect.stringContaining("exceptions_invalid=1"));
    expect(report.details).toContainEqual(
      expect.stringContaining(
        "allow-command-owned-ui-port-import from/to must exist: src/v11/shared/workflow/missingWorkflowCommandContract.ts"
      )
    );
  });

  it("rejects command import exceptions that try to encode ambiguous .js resolution", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/ports/uiRouter.ts",
      "export const ok = true;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/workflow/workflowCommandContract.ts",
      "export interface WorkflowCommandContract { id: string; }\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/workflow/workflowCommandContract.tsx",
      "export interface WorkflowCommandContractView { id: string; }\n"
    );

    const report = await buildUiRouterPortBoundaryCheckReport({
      check: defaultCheck({
        scope: ["src/v11/ports/*.ts"],
        exceptions: [
          {
            id: "router-port-ambiguous-js-target",
            kind: "allow-command-owned-ui-port-import",
            owner: "architecture/ui-contracts",
            reason: "invalid ambiguous source import encoding",
            from: "src/v11/ports/uiRouter.ts",
            to: "src/v11/shared/workflow/workflowCommandContract.js",
            paths: undefined
          }
        ]
      }),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(report.details).toContainEqual(expect.stringContaining("exceptions_invalid=1"));
    expect(report.details).toContainEqual(
      expect.stringContaining("from/to must resolve to exact .ts source files")
    );
  });

  it("rejects null-valued router-port exception fields", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/ports/uiRouter.ts",
      "export const ok = true;\n"
    );

    const report = await buildUiRouterPortBoundaryCheckReport({
      check: defaultCheck({
        scope: ["src/v11/ports/*.ts"],
        exceptions: [
          {
            id: "router-port-null-command",
            kind: "allow-command-owned-ui-port-import",
            owner: "architecture/ui-contracts",
            reason: "invalid null fields",
            from: null,
            to: "src/v11/shared/workflow/workflowCommandContract.ts",
            paths: undefined
          } as unknown as FitnessPolicyException,
          {
            id: "router-port-null-path",
            kind: "allow-full-dependency-bag",
            owner: "architecture/ui-router",
            reason: "invalid null path",
            paths: [null],
            from: undefined,
            to: undefined
          } as unknown as FitnessPolicyException
        ]
      }),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(report.details).toContainEqual(expect.stringContaining("exceptions_invalid=2"));
    expect(report.details).toContainEqual(
      expect.stringContaining("allow-command-owned-ui-port-import requires from/to")
    );
    expect(report.details).toContainEqual(
      expect.stringContaining("allow-full-dependency-bag paths[0] must be a string")
    );
  });

  it("reports when invalid exception details are truncated", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/ports/uiRouter.ts",
      "export const ok = true;\n"
    );

    const report = await buildUiRouterPortBoundaryCheckReport({
      check: defaultCheck({
        scope: ["src/v11/ports/*.ts"],
        exceptions: Array.from({ length: 12 }, (_, index) => ({
          id: `router-port-null-command-${String(index + 1)}`,
          kind: "allow-command-owned-ui-port-import",
          owner: "architecture/ui-contracts",
          reason: "invalid null fields",
          from: null,
          to: "src/v11/shared/workflow/workflowCommandContract.ts",
          paths: undefined
        })) as unknown as FitnessPolicyException[]
      }),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(report.details).toContainEqual(expect.stringContaining("exceptions_invalid=12"));
    expect(report.details).toContainEqual(
      expect.stringContaining("exceptions_invalid_truncated=2")
    );
  });

  it("fails on stale exact exceptions for direct and wrapper broad-bag forms", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/infrastructure/ui/routerLeaf.ts",
      "export const ok = true;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/infrastructure/ui/routerWrapper.ts",
      "export const ok = true;\n"
    );

    const report = await buildUiRouterPortBoundaryCheckReport({
      check: defaultCheck({
        scope: ["src/v11/infrastructure/ui/*.ts"],
        exceptions: [
          {
            id: "router-port-stale-direct",
            kind: "allow-full-dependency-bag",
            owner: "architecture/ui-router",
            reason: "temporary direct broad dependency bag use",
            paths: ["src/v11/infrastructure/ui/routerLeaf.ts#UiRouterDependencies"],
            from: undefined,
            to: undefined
          },
          {
            id: "router-port-stale-wrapper",
            kind: "allow-full-dependency-bag",
            owner: "architecture/ui-router",
            reason: "temporary wrapper broad dependency bag use",
            paths: ["src/v11/infrastructure/ui/routerWrapper.ts#UiRouterDependencies"],
            from: undefined,
            to: undefined
          }
        ]
      }),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(report.details).toContainEqual(
      expect.stringContaining("UNUSED_ROUTER_PORT_EXCEPTION")
    );
    expect(report.details).toContainEqual(
      expect.stringContaining("router-port-stale-direct, router-port-stale-wrapper")
    );
  });

  it("allows local peer port imports after .js-to-.ts source resolution", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/ports/localCommandContract.ts",
      "export interface LocalCommandContract { id: string; }\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/ports/uiRouter.ts",
      "import type { LocalCommandContract } from './localCommandContract.js';\nexport type View = LocalCommandContract;\n"
    );

    const report = await buildUiRouterPortBoundaryCheckReport({
      check: defaultCheck({
        scope: ["src/v11/ports/*.ts"]
      }),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("pass");
  });

  it("applies exact command import exceptions for cross-directory edges while allowing local peer ports", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/ports/localCommandContract.ts",
      "export interface LocalCommandContract { id: string; }\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/workflow/workflowCommandContract.ts",
      "export interface WorkflowCommandContract { id: string; }\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/ports/uiRouter.ts",
      [
        "import type { LocalCommandContract } from './localCommandContract.js';",
        "import type { WorkflowCommandContract } from '../shared/workflow/workflowCommandContract.js';",
        "export type LocalView = LocalCommandContract;",
        "export type ListView = WorkflowCommandContract;"
      ].join("\n")
    );

    const report = await buildUiRouterPortBoundaryCheckReport({
      check: defaultCheck({
        scope: ["src/v11/ports/*.ts"],
        exceptions: [
          {
            id: "router-port-workflow-command",
            kind: "allow-command-owned-ui-port-import",
            owner: "architecture/ui-contracts",
            reason: "temporary cross-directory command-owned import",
            from: "src/v11/ports/uiRouter.ts",
            to: "src/v11/shared/workflow/workflowCommandContract.ts",
            paths: undefined
          }
        ]
      }),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("pass");
    expect(report.details).toContainEqual(expect.stringContaining("exceptions_applied=1"));
    expect(report.details).toContainEqual(
      expect.stringContaining("router-port-workflow-command")
    );
  });

  it("does not accept method-count budget exceptions as broad-bag proof", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/infrastructure/ui/routerLeaf.ts",
      "import type { UiRouterDependencies } from './routerContracts.js';\nexport interface Leaf { dependencies: UiRouterDependencies; }\n"
    );

    const report = await buildUiRouterPortBoundaryCheckReport({
      check: defaultCheck({
        scope: ["src/v11/infrastructure/ui/*.ts"],
        exceptions: [
          {
            id: "method-count-budget",
            kind: "method-count-budget",
            owner: "architecture/ui-router",
            reason: "invalid method count budget",
            paths: ["src/v11/infrastructure/ui/routerLeaf.ts"],
            from: undefined,
            to: undefined
          }
        ]
      }),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(report.details).toContainEqual(
      expect.stringContaining("FULL_UI_ROUTER_DEPENDENCY_BAG_USAGE")
    );
    expect(report.details).toContainEqual(
      expect.stringContaining("INVALID_ROUTER_PORT_EXCEPTION")
    );
  });

  it("fails on wrapper broad-bag access without literal UiRouterDependencies", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/infrastructure/ui/routerActionDispatch.ts",
      [
        "import type { UiRouterEnvironment } from './routerContracts.js';",
        "export async function dispatch(input: { environment: UiRouterEnvironment }) {",
        "  const deps = input.environment.dependencies;",
        "  return deps.startBubble();",
        "}"
      ].join("\n")
    );

    const report = await buildUiRouterPortBoundaryCheckReport({
      check: defaultCheck({ scope: ["src/v11/infrastructure/ui/*.ts"] }),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(report.details).toContainEqual(
      expect.stringContaining(
        "src/v11/infrastructure/ui/routerActionDispatch.ts#UiRouterDependencies"
      )
    );
  });

  it("fails closed on unsupported command-owned import resolution", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/ports/uiRouter.ts",
      "import type { WorkflowCommandContract } from '../shared/workflow/workflowCommandContract';\nexport type View = WorkflowCommandContract;\n"
    );

    const report = await buildUiRouterPortBoundaryCheckReport({
      check: defaultCheck({ scope: ["src/v11/ports/*.ts"] }),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(report.details).toContainEqual(
      expect.stringContaining("COMMAND_OWNED_UI_PORT_IMPORT")
    );
    expect(report.details).toContainEqual(expect.stringContaining("resolver_detail="));
  });

  it("can apply an exact exception to an unsupported command-owned import edge", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/workflow/workflowCommandContract.ts",
      "export interface WorkflowCommandContract { id: string; }\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/ports/uiRouter.ts",
      "import type { WorkflowCommandContract } from '../shared/workflow/workflowCommandContract';\nexport type View = WorkflowCommandContract;\n"
    );

    const report = await buildUiRouterPortBoundaryCheckReport({
      check: defaultCheck({
        scope: ["src/v11/ports/*.ts"],
        exceptions: [
          {
            id: "router-port-command-extensionless",
            kind: "allow-command-owned-ui-port-import",
            owner: "architecture/ui-contracts",
            reason: "temporary command-owned import",
            from: "src/v11/ports/uiRouter.ts",
            to: "src/v11/shared/workflow/workflowCommandContract.ts",
            paths: undefined
          }
        ]
      }),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("pass");
    expect(report.details).toContainEqual(
      expect.stringContaining("router-port-command-extensionless")
    );
  });

  it("does not flag unrelated List, Status, or Inbox substrings as command-owned", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/util/playlistHelpers.ts",
      "export interface PlaylistHelper { id: string; }\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/ports/uiRouter.ts",
      "import type { PlaylistHelper } from '../util/playlistHelpers.js';\nexport type View = PlaylistHelper;\n"
    );

    const report = await buildUiRouterPortBoundaryCheckReport({
      check: defaultCheck({ scope: ["src/v11/ports/*.ts"] }),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("pass");
  });

  it("does not treat narrow structural environment dependencies as full-bag use", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/infrastructure/ui/routerLeaf.ts",
      [
        "export async function handle(input: { environment: { dependencies: { readOne: () => void } } }) {",
        "  return input.environment.dependencies.readOne();",
        "}"
      ].join("\n")
    );

    const report = await buildUiRouterPortBoundaryCheckReport({
      check: defaultCheck({ scope: ["src/v11/infrastructure/ui/*.ts"] }),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("pass");
  });

  it("does not treat unrelated UiRouterEnvironment symbols as proof for narrow wrapper access", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/infrastructure/ui/routerLeaf.ts",
      [
        "import type { UiRouterEnvironment } from './routerContracts.js';",
        "export async function handle(input: { environment: { dependencies: { readOne: () => void } } }) {",
        "  const typed: UiRouterEnvironment = input.environment as UiRouterEnvironment;",
        "  void typed;",
        "  return input.environment.dependencies.readOne();",
        "}"
      ].join("\n")
    );

    const report = await buildUiRouterPortBoundaryCheckReport({
      check: defaultCheck({ scope: ["src/v11/infrastructure/ui/*.ts"] }),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("pass");
  });

  it("detects broad-bag wrapper access through interface-typed payloads", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/infrastructure/ui/routerActionDispatch.ts",
      [
        "import type { UiRouterEnvironment } from './routerContracts.js';",
        "interface DispatchInput {",
        "  environment: UiRouterEnvironment;",
        "}",
        "export async function dispatch(payload: DispatchInput) {",
        "  return payload.environment.dependencies.startBubble({ bubbleId: 'b', repoPath: 'r' });",
        "}"
      ].join("\n")
    );

    const report = await buildUiRouterPortBoundaryCheckReport({
      check: defaultCheck({ scope: ["src/v11/infrastructure/ui/*.ts"] }),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(report.details).toContainEqual(
      expect.stringContaining(
        "src/v11/infrastructure/ui/routerActionDispatch.ts#UiRouterDependencies"
      )
    );
  });

  it("detects broad-bag wrapper access when the interface is declared after use", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/infrastructure/ui/routerActionDispatch.ts",
      [
        "import type { UiRouterEnvironment } from './routerContracts.js';",
        "export async function dispatch(payload: DispatchInput) {",
        "  return payload.environment.dependencies.startBubble({ bubbleId: 'b', repoPath: 'r' });",
        "}",
        "interface DispatchInput {",
        "  environment: UiRouterEnvironment;",
        "}"
      ].join("\n")
    );

    const report = await buildUiRouterPortBoundaryCheckReport({
      check: defaultCheck({ scope: ["src/v11/infrastructure/ui/*.ts"] }),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(report.details).toContainEqual(
      expect.stringContaining(
        "src/v11/infrastructure/ui/routerActionDispatch.ts#UiRouterDependencies"
      )
    );
  });

  it("detects wrapper broad-bag access before a later UiRouterEnvironment type reference", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/infrastructure/ui/routerActionDispatch.ts",
      [
        "import type { UiRouterEnvironment } from './routerContracts.js';",
        "export async function dispatch(input: { environment: UiRouterEnvironment }) {",
        "  const deps = input.environment.dependencies;",
        "  type Later = UiRouterEnvironment;",
        "  const marker: Later = input.environment;",
        "  void marker;",
        "  return deps.startBubble({ bubbleId: 'b', repoPath: 'r' });",
        "}"
      ].join("\n")
    );

    const report = await buildUiRouterPortBoundaryCheckReport({
      check: defaultCheck({ scope: ["src/v11/infrastructure/ui/*.ts"] }),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(report.details).toContainEqual(
      expect.stringContaining(
        "src/v11/infrastructure/ui/routerActionDispatch.ts#UiRouterDependencies"
      )
    );
  });

  it("detects destructuring dependencies directly from a UiRouterEnvironment value", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/infrastructure/ui/routerActionDispatch.ts",
      [
        "import type { UiRouterEnvironment } from './routerContracts.js';",
        "export async function dispatch(environment: UiRouterEnvironment) {",
        "  const { dependencies } = environment;",
        "  return dependencies.startBubble({ bubbleId: 'b', repoPath: 'r' });",
        "}"
      ].join("\n")
    );

    const report = await buildUiRouterPortBoundaryCheckReport({
      check: defaultCheck({ scope: ["src/v11/infrastructure/ui/*.ts"] }),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(report.details).toContainEqual(
      expect.stringContaining(
        "src/v11/infrastructure/ui/routerActionDispatch.ts#UiRouterDependencies"
      )
    );
  });

  it("fails closed when an exact scan input is missing", async () => {
    const repoRoot = await createTempRoot();

    const report = await buildUiRouterPortBoundaryCheckReport({
      check: defaultCheck({
        scope: ["src/v11/infrastructure/ui/missing.ts"]
      }),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(report.details).toContainEqual(
      expect.stringContaining("ROUTER_PORT_SCAN_READ_FAILED")
    );
  });

  it("fails closed when a scanned file cannot be read", async () => {
    const repoRoot = await createTempRoot();
    const path = "src/v11/infrastructure/ui/unreadable.ts";
    await writeRepoFile(repoRoot, path, "export const ok = true;\n");
    await chmod(join(repoRoot, path), 0o000);

    try {
      const report = await buildUiRouterPortBoundaryCheckReport({
        check: defaultCheck({ scope: [path] }),
        repoRoot,
        fallbackMode: "hard-fail"
      });

      expect(report.status).toBe("fail");
      expect(report.details).toContainEqual(
        expect.stringContaining("ROUTER_PORT_SCAN_READ_FAILED")
      );
    } finally {
      await chmod(join(repoRoot, path), 0o600);
    }
  });

  it("fails closed when a scanned file cannot be parsed", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/infrastructure/ui/invalid.ts",
      "export const broken = ;\n"
    );

    const report = await buildUiRouterPortBoundaryCheckReport({
      check: defaultCheck({
        scope: ["src/v11/infrastructure/ui/invalid.ts"]
      }),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(report.details).toContainEqual(
      expect.stringContaining("ROUTER_PORT_SCAN_READ_FAILED")
    );
    expect(report.details).toContainEqual(
      expect.stringContaining("TypeScript parse diagnostics=")
    );
  });

  it("normalizes re-exported full-bag use to the leaf identity", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/infrastructure/ui/routerLeaf.ts",
      [
        "import type { UiRouterDependencies } from './routerContracts.js';",
        "export interface Leaf { dependencies: UiRouterDependencies; }"
      ].join("\n")
    );

    const report = await buildUiRouterPortBoundaryCheckReport({
      check: defaultCheck({ scope: ["src/v11/infrastructure/ui/*.ts"] }),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(report.details).toContainEqual(
      expect.stringContaining(
        "src/v11/infrastructure/ui/routerLeaf.ts#UiRouterDependencies"
      )
    );
  });

  it("reports the first direct UiRouterDependencies reference line", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/infrastructure/ui/routerLeaf.ts",
      [
        "import type { UiRouterDependencies } from './routerContracts.js';",
        "export interface First { dependencies: UiRouterDependencies; }",
        "export const spacer = true;",
        "export interface Second { dependencies: UiRouterDependencies; }"
      ].join("\n")
    );

    const report = await buildUiRouterPortBoundaryCheckReport({
      check: defaultCheck({ scope: ["src/v11/infrastructure/ui/*.ts"] }),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(report.details).toContainEqual(
      expect.stringContaining(
        "FULL_UI_ROUTER_DEPENDENCY_BAG_USAGE src/v11/infrastructure/ui/routerLeaf.ts:2"
      )
    );
    expect(report.details).not.toContainEqual(
      expect.stringContaining("src/v11/infrastructure/ui/routerLeaf.ts:4")
    );
  });
});
