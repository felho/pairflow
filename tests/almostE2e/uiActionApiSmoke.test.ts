import { access, realpath, rm } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { createUiRouter } from "../../src/v11/infrastructure/ui/router.js";
import { createBubble } from "../../src/v11/defaults/create/createBubbleApi.js";
import { openBubble } from "../../src/v11/application/open/openBubble.js";
import { openBubbleDefaults } from "../../src/v11/defaults/open/openBubbleDefaults.js";
import { startBubble } from "../../src/v11/application/start/startCommandApi.js";
import { restartBubble } from "../../src/v11/application/restart/restartCommandApi.js";
import { restartBubbleDependencyDefaults } from "../../src/v11/defaults/restart/restartCommandDefaults.js";
import { deleteBubble } from "../../src/v11/application/delete/deleteBubble.js";
import { deleteBubbleDependencyDefaults } from "../../src/v11/defaults/delete/deleteBubbleDefaults.js";
import { stopBubbleCommandOrchestration } from "../../src/v11/application/stop/stopCommandOrchestration.js";
import { stopBubbleDependencyDefaults } from "../../src/v11/defaults/stop/stopCommandDefaults.js";
import { defaultUiRouterDependencies } from "../../src/v11/defaults/ui/routerDependencyDefaults.js";
import {
  projectBubbleStateToUiActionState
} from "../../src/v11/defaults/ui/routerDefaults.js";
import type {
  UiDeleteBubbleResult,
  UiOpenBubbleResult,
  UiRestartBubbleResult
} from "../../src/contracts/ui/uiActions.js";
import {
  createAlmostE2eSmokeFixtureRepo,
  createFakeExternalAdapters,
  createNoopSmokeUiEventsBroker,
  invokeSmokeUiRouter
} from "../helpers/almostE2eSmoke/index.js";

interface UiActionPayload<TResult> {
  result: TResult;
}

function expectedSmokeWorktreePath(fixtureRoot: string, bubbleId: string): string {
  return join(dirname(fixtureRoot), ".pairflow-worktrees", basename(fixtureRoot), bubbleId);
}

function isSafeSmokeWorktreeCleanupTarget(
  fixtureRoot: string,
  bubbleId: string,
  candidatePath: string
): boolean {
  const smokeWorktreesRoot = resolve(dirname(fixtureRoot), ".pairflow-worktrees");
  const resolvedCandidate = resolve(candidatePath);
  return (
    dirname(dirname(resolvedCandidate)) === smokeWorktreesRoot
    && basename(dirname(resolvedCandidate)) === basename(fixtureRoot)
    && basename(resolvedCandidate) === bubbleId
  );
}

describe("UI action API smoke", () => {
  it("routes Open, Restart, and forced Delete through the in-process UI action API", async () => {
    const fixture = await createAlmostE2eSmokeFixtureRepo({
      prefix: "ui-action-api-smoke"
    });
    const repoPath = await realpath(fixture.root);
    const bubbleId = "smoke-ui-action-api";
    const expectedWorktreePath = expectedSmokeWorktreePath(repoPath, bubbleId);
    const adapters = createFakeExternalAdapters({
      sessionName: "pairflow-smoke-ui-action-api"
    });
    const now = new Date("2026-05-10T12:00:00.000Z");
    let observedWorktreePath: string | undefined;
    let bubbleDeleted = false;

    const startWithFakeRuntime: typeof startBubble = (input, dependencies = {}) =>
      startBubble(input, {
        ...dependencies,
        processSpawn: adapters.processSpawn,
        launchBubbleSessionAck: adapters.launchBubbleSessionAck,
        terminateBubbleTmuxSession: adapters.terminateBubbleTmuxSession,
        resolveCodexMcpDisableArgs: () => Promise.resolve([])
      });

    const fakeTmuxRunner = async (args: string[]) => {
      await adapters.openTerminal("tmux", args, repoPath);
      return {
        stdout: "",
        stderr: "",
        exitCode: 0
      };
    };

    const stopWithFakeRuntime: typeof stopBubbleCommandOrchestration = (
      input,
      dependencies = {}
    ) =>
      stopBubbleCommandOrchestration(input, {
        ...stopBubbleDependencyDefaults,
        ...dependencies,
        terminateBubbleTmuxSession: adapters.terminateBubbleTmuxSession
      });

    const router = createUiRouter({
      cwd: repoPath,
      repoScope: {
        repos: [repoPath],
        has: (value: string) => Promise.resolve(value === repoPath)
      },
      events: createNoopSmokeUiEventsBroker(),
      dependencyDefaults: defaultUiRouterDependencies,
      dependencies: {
        openBubble: (input) =>
          openBubble(input, {
            ...openBubbleDefaults,
            executeOpenCommand: adapters.executeOpenCommand
          }),
        restartBubble: async (input) => {
          const result = await restartBubble(
            {
              bubbleId: input.bubbleId,
              ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
              ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
            },
            {
              ...restartBubbleDependencyDefaults,
              terminateBubbleTmuxSession: adapters.terminateBubbleTmuxSession,
              startBubble: startWithFakeRuntime
            }
          );
          return {
            bubbleId: result.bubbleId,
            actionState: projectBubbleStateToUiActionState(result.state),
            tmuxSessionName: result.tmuxSessionName,
            worktreePath: result.worktreePath,
            previousTmuxSessionExisted: result.previousTmuxSessionExisted,
            previousRuntimeSessionRemoved: result.previousRuntimeSessionRemoved,
            ...(result.warnings !== undefined ? { warnings: result.warnings } : {})
          };
        },
        deleteBubble: (input) =>
          deleteBubble(
            {
              bubbleId: input.bubbleId,
              ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
              ...(input.cwd !== undefined ? { cwd: input.cwd } : {}),
              ...(input.force !== undefined ? { force: input.force } : {})
            },
            {
              ...deleteBubbleDependencyDefaults,
              runTmux: fakeTmuxRunner,
              stopBubble: stopWithFakeRuntime,
              terminateBubbleTmuxSession: adapters.terminateBubbleTmuxSession
            }
          )
      }
    });

    try {
      const created = await createBubble({
        id: bubbleId,
        repoPath,
        baseBranch: "main",
        reviewArtifactType: "code",
        task: "UI action API smoke",
        openCommand: "pairflow-smoke-open {{worktree_path}}",
        cwd: repoPath,
        now
      });

      const started = await startWithFakeRuntime({
        bubbleId,
        repoPath,
        cwd: repoPath,
        now
      });
      observedWorktreePath = started.worktreePath;
      expect(created.paths.worktreePath).toBe(expectedWorktreePath);
      expect(started.bubbleId).toBe(bubbleId);
      expect(started.state.state).toBe("RUNNING");
      expect(started.worktreePath).toBe(expectedWorktreePath);
      await expect(access(started.worktreePath)).resolves.toBeUndefined();

      const openPath =
        `/api/bubbles/${bubbleId}/open?repo=${encodeURIComponent(repoPath)}`;
      const openResponse = await invokeSmokeUiRouter<UiActionPayload<UiOpenBubbleResult>>(
        router,
        {
          method: "POST",
          path: openPath
        }
      );

      expect(openResponse.handled).toBe(true);
      expect(openResponse.status, openResponse.rawBody).toBe(200);
      expect(openResponse.request).toEqual({
        method: "POST",
        path: openPath
      });
      expect(openResponse.body.result).toEqual({
        bubbleId,
        workspaceKind: "local_worktree",
        workspacePath: started.worktreePath,
        worktreePath: started.worktreePath,
        command: `pairflow-smoke-open '${started.worktreePath}'`
      });
      expect(Object.keys(openResponse.body.result).sort()).toEqual([
        "bubbleId",
        "command",
        "workspaceKind",
        "workspacePath",
        "worktreePath"
      ]);
      const sideEffectsAfterOpen = adapters.snapshot();
      expect(sideEffectsAfterOpen.editorOpens).toEqual([
        {
          path: `pairflow-smoke-open '${started.worktreePath}'`,
          cwd: repoPath
        }
      ]);

      const restartPath =
        `/api/bubbles/${bubbleId}/restart?repo=${encodeURIComponent(repoPath)}`;
      const restartResponse =
        await invokeSmokeUiRouter<UiActionPayload<UiRestartBubbleResult>>(
          router,
          {
            method: "POST",
            path: restartPath
          }
        );

      expect(restartResponse.status).toBe(200);
      expect(restartResponse.request).toEqual({
        method: "POST",
        path: restartPath
      });
      expect(restartResponse.body.result.bubbleId).toBe(bubbleId);
      expect(restartResponse.body.result.worktreePath).toBe(started.worktreePath);
      expect(restartResponse.body.result.actionState).toMatchObject({
        bubbleId,
        lifecycleState: "RUNNING",
        round: 1,
        activeRole: "implementer"
      });
      expect(restartResponse.body.result.previousTmuxSessionExisted).toBe(true);
      expect(restartResponse.body.result.previousRuntimeSessionRemoved).toBe(true);
      const sideEffectsAfterRestart = adapters.snapshot();
      expect(sideEffectsAfterRestart.terminateTmux).toHaveLength(1);
      expect(sideEffectsAfterRestart.terminateTmux[0]!.input).toEqual({
        bubbleId
      });
      expect(sideEffectsAfterRestart.launchAcks).toHaveLength(2);
      expect(sideEffectsAfterRestart.launchAcks.at(-1)!.input).toMatchObject({
        bubbleId,
        workspacePath: started.worktreePath
      });

      const deletePath =
        `/api/bubbles/${bubbleId}/delete?repo=${encodeURIComponent(repoPath)}`;
      const deleteResponse =
        await invokeSmokeUiRouter<UiActionPayload<UiDeleteBubbleResult>>(
          router,
          {
            method: "POST",
            path: deletePath,
            body: {
              force: true
            }
          }
        );

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.request).toEqual({
        method: "POST",
        path: deletePath,
        body: {
          force: true
        }
      });
      expect(deleteResponse.body.result).toMatchObject({
        bubbleId,
        deleted: true,
        requiresConfirmation: false,
        tmuxSessionTerminated: true,
        runtimeSessionRemoved: true,
        removedWorktree: true
      });
      expect(deleteResponse.body.result.artifacts.worktree).toEqual({
        exists: true,
        path: started.worktreePath
      });
      expect(deleteResponse.body.result.artifacts.tmux.exists).toBe(true);
      expect(deleteResponse.body.result.artifacts.tmux.sessionName).toBe(
        `pf-${bubbleId}`
      );
      expect(deleteResponse.body.result.artifacts.runtimeSession.exists).toBe(true);
      await expect(
        access(join(repoPath, ".pairflow", "bubbles", bubbleId))
      ).rejects.toThrow();
      await expect(access(started.worktreePath)).rejects.toThrow();
      bubbleDeleted = true;

      const sideEffectsAfterDelete = adapters.snapshot();
      expect(sideEffectsAfterDelete.terminalOpens).toEqual([
        {
          command: "tmux",
          args: [
            "has-session",
            "-t",
            `pf-${bubbleId}`
          ],
          cwd: repoPath
        }
      ]);
      expect(sideEffectsAfterDelete.terminateTmux).toHaveLength(2);
      expect(sideEffectsAfterDelete.terminateTmux.at(-1)!.input).toEqual({
        bubbleId
      });
      expect(sideEffectsAfterDelete.processSpawns.map((call) => call.command)).not.toContain(
        "tmux"
      );
    } finally {
      if (!bubbleDeleted) {
        await deleteBubble(
          {
            bubbleId,
            repoPath,
            cwd: repoPath,
            force: true
          },
          {
            ...deleteBubbleDependencyDefaults,
            runTmux: fakeTmuxRunner,
            stopBubble: stopWithFakeRuntime,
            terminateBubbleTmuxSession: adapters.terminateBubbleTmuxSession
          }
        ).then(
          () => {
            bubbleDeleted = true;
          },
          () => undefined
        );
      }
      if (
        !bubbleDeleted
        && observedWorktreePath !== undefined
        && isSafeSmokeWorktreeCleanupTarget(repoPath, bubbleId, observedWorktreePath)
      ) {
        await rm(observedWorktreePath, { recursive: true, force: true });
      }
      if (!bubbleDeleted) {
        await rm(expectedWorktreePath, { recursive: true, force: true });
      }
      await fixture.cleanup();
    }
  }, 180_000);
});
