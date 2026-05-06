import type { BubbleRemotePointer } from "../../../types/bubble.js";
import type { ResolveRemoteBubbleStatusTargetPort } from "../../shared/remote/commitRemoteExecution.js";

type ReadRemotePointerPort = (
  path: string
) => Promise<BubbleRemotePointer | null>;

interface StatusCommandDependencyDefaultsModule {
  listCommandDefaults: {
    readRemotePointer: ReadRemotePointerPort;
    resolveRemoteBubbleStatusTarget: ResolveRemoteBubbleStatusTargetPort;
  };
}

let statusCommandDependencyDefaultsModulePromise:
  | Promise<StatusCommandDependencyDefaultsModule>
  | undefined;

function getStatusCommandDependencyDefaultsModulePath(): string {
  return "../../defaults/list/listCommandDefaults.js";
}

async function loadStatusCommandDependencyDefaultsModule():
  Promise<StatusCommandDependencyDefaultsModule> {
  statusCommandDependencyDefaultsModulePromise ??= import(
    getStatusCommandDependencyDefaultsModulePath()
  ) as Promise<StatusCommandDependencyDefaultsModule>;
  return statusCommandDependencyDefaultsModulePromise;
}

const readRemotePointer: ReadRemotePointerPort = async (...args) => {
  const { listCommandDefaults } =
    await loadStatusCommandDependencyDefaultsModule();
  return listCommandDefaults.readRemotePointer(...args);
};

const resolveRemoteBubbleStatusTarget:
  ResolveRemoteBubbleStatusTargetPort = async (...args) => {
    const { listCommandDefaults } =
      await loadStatusCommandDependencyDefaultsModule();
    return listCommandDefaults.resolveRemoteBubbleStatusTarget(...args);
  };

export const statusCommandDependencyDefaults = {
  readRemotePointer,
  resolveRemoteBubbleStatusTarget
} as const;
