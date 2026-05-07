import {
  asBubbleStatusError,
  BubbleStatusError,
  getBubbleStatus
} from "./statusCommandApi.js";
import type {
  BubbleStatusInput,
  BubbleStatusDependencies,
  BubbleStatusView
} from "./statusCommandApi.js";
export type {
  BubbleStatusInput as BubbleStatusV11Input,
  BubbleStatusView as BubbleStatusV11View
} from "./statusCommandContract.js";

interface StatusCommandDependencyDefaultsModule {
  statusCommandDependencyDefaults: BubbleStatusDependencies;
}

let statusCommandDependencyDefaultsModulePromise:
  | Promise<StatusCommandDependencyDefaultsModule>
  | undefined;

function getStatusCommandDependencyDefaultsModulePath(): string {
  return "../../defaults/status/statusCommandDependencyDefaults.js";
}

async function loadStatusCommandDependencyDefaultsModule():
  Promise<StatusCommandDependencyDefaultsModule> {
  statusCommandDependencyDefaultsModulePromise ??= import(
    getStatusCommandDependencyDefaultsModulePath()
  ) as Promise<StatusCommandDependencyDefaultsModule>;
  return statusCommandDependencyDefaultsModulePromise;
}

export async function getBubbleStatusV11(
  input: BubbleStatusInput
): Promise<BubbleStatusView> {
  const { statusCommandDependencyDefaults } =
    await loadStatusCommandDependencyDefaultsModule();
  return getBubbleStatus(input, statusCommandDependencyDefaults);
}

export {
  asBubbleStatusError as asBubbleStatusErrorV11,
  BubbleStatusError as BubbleStatusErrorV11
};
