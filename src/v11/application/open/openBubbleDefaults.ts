import type { ResolveBubbleByIdPort } from "../../shared/ports/bubbleLookup.js";

let bubbleLookupModulePromise:
  | Promise<{ resolveBubbleById: ResolveBubbleByIdPort }>
  | undefined;

async function loadBubbleLookupModule(): Promise<{
  resolveBubbleById: ResolveBubbleByIdPort;
}> {
  bubbleLookupModulePromise ??= import(
    "../../../core/bubble/bubbleLookup.js"
  );
  return bubbleLookupModulePromise;
}

export const openBubbleDefaults = {
  async resolveBubbleById(
    ...args: Parameters<ResolveBubbleByIdPort>
  ): Promise<Awaited<ReturnType<ResolveBubbleByIdPort>>> {
    const { resolveBubbleById } = await loadBubbleLookupModule();
    return resolveBubbleById(...args);
  }
} as const;
