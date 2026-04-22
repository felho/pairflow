import type {
  RuntimeSessionRecord
} from "../../shared/ports/runtimeSessions.js";
import type {
  ResolveMetaReviewerPaneWarning
} from "../../shared/metaReviewGate/metaReviewGateTypes.js";
import type { PairflowCommandProfile } from "../../../types/bubble.js";
import {
  resolveMetaReviewGateNotifyTmuxCapabilities,
  resolveMetaReviewGatePaneBindingTmuxCapabilities
} from "../../shared/metaReviewGate/metaReviewGateTypes.js";
import {
  resolveRuntimeSessionWorkspaceAuthority
} from "../../shared/runtimeSessionWorkspaceAuthority.js";
import { buildMetaReviewerStartupPrompt } from "../start/startCommandPrompts.js";

function resolveMetaReviewerWorkspaceAuthority(input: {
  bubbleId: string;
  runtimeSessionRecord: RuntimeSessionRecord;
}):
  | {
    status: "resolved";
    workspacePath: string;
  }
  | {
    status: "failed";
    message: string;
  } {
  const resolution = resolveRuntimeSessionWorkspaceAuthority({
    runtimeSessionRecord: input.runtimeSessionRecord
  });
  if (resolution.status === "resolved") {
    return {
      status: "resolved",
      workspacePath: resolution.authority.workspacePath
    };
  }

  return {
    status: "failed",
    message:
      `Bubble ${input.bubbleId} cannot bind meta-review pane because runtime workspace authority is empty.`
  };
}

function buildMetaReviewerPaneFailure(input: {
  reasonCode:
    | "META_REVIEWER_PANE_RUNTIME_UNAVAILABLE"
    | "META_REVIEWER_PANE_UNAVAILABLE"
    | "META_REVIEWER_PANE_RESPAWN_FAILED";
  message: string;
  shouldDeactivate: boolean;
}) {
  return {
    delivery: {
      status: "failed" as const,
      reasonCode: input.reasonCode,
      message: input.message
    },
    shouldDeactivate: input.shouldDeactivate
  };
}

function isDurableHandoffOnlyBindingResult(
  value: Awaited<ReturnType<typeof activateMetaReviewerPane>>
): value is { updated: true; reason: "durable_handoff_only"; record?: undefined } {
  return value.updated
    && value.reason === "durable_handoff_only"
    && value.record === undefined;
}

async function activateMetaReviewerPane(input: Parameters<
  ResolveMetaReviewerPaneWarning
>[0]) {
  return input.setMetaReviewerPane({
    sessionsPath: input.sessionsPath,
    bubbleId: input.bubbleId,
    active: true,
    now: input.now
  }).catch((error: unknown) => {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      updated: false,
      reason: "no_runtime_session" as const,
      errorMessage: reason
    };
  });
}

type MetaReviewGateCommandBuilder = NonNullable<
  NonNullable<
    NonNullable<Parameters<ResolveMetaReviewerPaneWarning>[0]["runtime"]>["paneBinding"]
  >["buildAgentCommand"]
>;

type MetaReviewGatePaneBindingRuntime = NonNullable<
  NonNullable<Parameters<ResolveMetaReviewerPaneWarning>[0]["runtime"]>["paneBinding"]
>;

type MetaReviewGatePaneBindingTmux = NonNullable<
  ReturnType<typeof resolveMetaReviewGatePaneBindingTmuxCapabilities>
>;

function buildMetaReviewerCommand(input: {
  buildAgentCommand: MetaReviewGateCommandBuilder;
  bubbleId: string;
  workspacePath: string;
  repoPath: string;
  taskArtifactPath: string;
  pairflowCommandProfile: PairflowCommandProfile;
}): string {
  return input.buildAgentCommand({
    agentName: "codex",
    bubbleId: input.bubbleId,
    workspacePath: input.workspacePath,
    pairflowCommandProfile: input.pairflowCommandProfile,
    startupPrompt: buildMetaReviewerStartupPrompt({
      bubbleId: input.bubbleId,
      repoPath: input.repoPath,
      workspacePath: input.workspacePath,
      taskArtifactPath: input.taskArtifactPath,
      pairflowCommandProfile: input.pairflowCommandProfile
    })
  });
}

function resolveNotifyRuntimeForPaneBinding(input: {
  notifyRuntime: Parameters<ResolveMetaReviewerPaneWarning>[0]["runtime"];
  paneBindingRuntime: NonNullable<
    NonNullable<Parameters<ResolveMetaReviewerPaneWarning>[0]["runtime"]>["paneBinding"]
  >;
}) {
  const notifyTmux = resolveMetaReviewGateNotifyTmuxCapabilities(
    input.notifyRuntime?.notify
  );
  const paneBindingTmux = resolveMetaReviewGatePaneBindingTmuxCapabilities(
    input.paneBindingRuntime
  );
  const tmux = (
    notifyTmux !== undefined || paneBindingTmux?.runner !== undefined
      ? {
          ...(notifyTmux ?? {}),
          // Pane-binding only shares runner authority; submit helpers stay notify-owned.
          ...(notifyTmux?.runner !== undefined || paneBindingTmux?.runner === undefined
            ? {}
            : { runner: paneBindingTmux.runner })
        }
      : undefined
  );
  return {
    ...(tmux !== undefined ? { tmux } : {})
  };
}

function resolvePaneBindingPrerequisites(input: {
  runtime: Parameters<ResolveMetaReviewerPaneWarning>[0]["runtime"];
}):
  | {
    ok: true;
    paneBindingRuntime: MetaReviewGatePaneBindingRuntime;
    paneBindingTmux: MetaReviewGatePaneBindingTmux;
    buildAgentCommand: MetaReviewGateCommandBuilder;
    respawnPaneCommand: NonNullable<MetaReviewGatePaneBindingTmux["respawnPaneCommand"]>;
  }
  | {
    ok: false;
    failure: ReturnType<typeof buildMetaReviewerPaneFailure>;
  } {
  const paneBindingRuntime = input.runtime?.paneBinding;
  const paneBindingTmux = resolveMetaReviewGatePaneBindingTmuxCapabilities(
    paneBindingRuntime
  );

  if (paneBindingRuntime?.buildAgentCommand === undefined) {
    return {
      ok: false as const,
      failure: buildMetaReviewerPaneFailure({
        reasonCode: "META_REVIEWER_PANE_RUNTIME_UNAVAILABLE",
        message: "meta-review gate pane binding is missing agent command builder.",
        shouldDeactivate: false
      })
    };
  }
  if (paneBindingTmux?.respawnPaneCommand === undefined) {
    return {
      ok: false as const,
      failure: buildMetaReviewerPaneFailure({
        reasonCode: "META_REVIEWER_PANE_RUNTIME_UNAVAILABLE",
        message: "meta-review gate pane binding is missing respawn capability.",
        shouldDeactivate: false
      })
    };
  }

  return {
    ok: true as const,
    paneBindingRuntime,
    paneBindingTmux,
    buildAgentCommand: paneBindingRuntime.buildAgentCommand,
    respawnPaneCommand: paneBindingTmux.respawnPaneCommand
  };
}

export const resolveMetaReviewerPaneWarning: ResolveMetaReviewerPaneWarning = async (
  input
) => {
  const prerequisites = resolvePaneBindingPrerequisites({
    runtime: input.runtime
  });
  if (!prerequisites.ok) {
    return prerequisites.failure;
  }
  const {
    paneBindingRuntime,
    paneBindingTmux,
    buildAgentCommand,
    respawnPaneCommand
  } = prerequisites;

  const bindStart = await activateMetaReviewerPane(input);
  if (!bindStart.updated) {
    const bindReason = "errorMessage" in bindStart
      ? bindStart.errorMessage
      : bindStart.reason ?? "unknown";
    return buildMetaReviewerPaneFailure({
      reasonCode: "META_REVIEWER_PANE_UNAVAILABLE",
      message: `META_REVIEWER_PANE_UNAVAILABLE: ${bindReason}`,
      shouldDeactivate: false
    });
  }
  if (isDurableHandoffOnlyBindingResult(bindStart)) {
    return {
      delivery: {
        status: "confirmed",
        reasonCode: null,
        message: "meta-review submit request uses durable handoff only; no pane binding update required."
      },
      shouldDeactivate: false
    };
  }
  if (!("record" in bindStart) || bindStart.record === undefined) {
    return buildMetaReviewerPaneFailure({
      reasonCode: "META_REVIEWER_PANE_RUNTIME_UNAVAILABLE",
      message:
        "meta-review gate pane binding updated without runtime session record authority.",
      shouldDeactivate: false
    });
  }

  const shouldDeactivate = true;
  const paneIndex = bindStart.record.metaReviewerPane?.paneIndex ?? 3;
  const targetPane = `${bindStart.record.tmuxSessionName}:0.${paneIndex}`;
  const workspaceAuthority = resolveMetaReviewerWorkspaceAuthority({
    bubbleId: input.bubbleId,
    runtimeSessionRecord: bindStart.record
  });
  if (workspaceAuthority.status !== "resolved") {
    return buildMetaReviewerPaneFailure({
      reasonCode: "META_REVIEWER_PANE_UNAVAILABLE",
      message: `META_REVIEWER_PANE_UNAVAILABLE: ${workspaceAuthority.message}`,
      shouldDeactivate
    });
  }
  const workspacePath = workspaceAuthority.workspacePath;
  const metaReviewerCommand = buildMetaReviewerCommand({
    buildAgentCommand,
    bubbleId: input.bubbleId,
    workspacePath,
    repoPath: bindStart.record.repoPath,
    taskArtifactPath: input.taskArtifactPath,
    pairflowCommandProfile: input.pairflowCommandProfile
  });
  try {
    await respawnPaneCommand({
      sessionName: bindStart.record.tmuxSessionName,
      paneIndex,
      cwd: workspacePath,
      command: metaReviewerCommand,
      ...(paneBindingTmux.runner !== undefined
        ? { runner: paneBindingTmux.runner }
        : {})
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return buildMetaReviewerPaneFailure({
      reasonCode: "META_REVIEWER_PANE_RESPAWN_FAILED",
      message: `META_REVIEWER_PANE_RESPAWN_FAILED: ${reason}`,
      shouldDeactivate
    });
  }
  if (input.notifySubmissionRequest === undefined) {
    return {
      delivery: {
        status: "failed",
        reasonCode: "META_REVIEW_REQUEST_DELIVERY_RUNTIME_UNAVAILABLE",
        message: "meta-review gate notify capability is unavailable."
      },
      shouldDeactivate
    };
  }
  const delivery = await input.notifySubmissionRequest(
    {
      bubbleId: input.bubbleId,
      round: input.round,
      targetPane
    },
    {
      runtime: {
        ...resolveNotifyRuntimeForPaneBinding({
          notifyRuntime: input.runtime,
          paneBindingRuntime
        })
      }
    }
  ).catch((error: unknown) => ({
    status: "failed" as const,
    reasonCode: "META_REVIEW_REQUEST_DELIVERY_FAILED",
    message: error instanceof Error ? error.message : String(error)
  }));
  return { delivery, shouldDeactivate };
};
