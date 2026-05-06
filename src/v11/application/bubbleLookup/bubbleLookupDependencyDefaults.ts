import type { ResolveBubbleByIdPort } from "../../shared/ports/bubbleLookup.js";

interface BubbleLookupDefaultsModule {
  resolveBubbleById: ResolveBubbleByIdPort;
}

let bubbleLookupDefaultsModulePromise:
  | Promise<BubbleLookupDefaultsModule>
  | undefined;

function getBubbleLookupDefaultsModulePath(): string {
  return "../../defaults/bubbleLookup/bubbleLookupDefaults.js";
}

async function loadBubbleLookupDefaultsModule():
  Promise<BubbleLookupDefaultsModule> {
  bubbleLookupDefaultsModulePromise ??= import(
    getBubbleLookupDefaultsModulePath()
  ) as Promise<BubbleLookupDefaultsModule>;
  return bubbleLookupDefaultsModulePromise;
}

export const resolveBubbleById: ResolveBubbleByIdPort = async (...args) => {
  const { resolveBubbleById: resolveBubbleByIdDefault } =
    await loadBubbleLookupDefaultsModule();
  return resolveBubbleByIdDefault(...args);
};
