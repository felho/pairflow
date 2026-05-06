import type { EnsureBubbleInstanceIdForMutationPort } from "../../shared/ports/bubbleIdentity.js";

interface BubbleIdentityDefaultsModule {
  ensureBubbleInstanceIdForMutation: EnsureBubbleInstanceIdForMutationPort;
}

let bubbleIdentityDefaultsModulePromise:
  | Promise<BubbleIdentityDefaultsModule>
  | undefined;

function getBubbleIdentityDefaultsModulePath(): string {
  return "../../defaults/bubbleIdentity/bubbleIdentityDefaults.js";
}

async function loadBubbleIdentityDefaultsModule():
  Promise<BubbleIdentityDefaultsModule> {
  bubbleIdentityDefaultsModulePromise ??= import(
    getBubbleIdentityDefaultsModulePath()
  ) as Promise<BubbleIdentityDefaultsModule>;
  return bubbleIdentityDefaultsModulePromise;
}

export const ensureBubbleInstanceIdForMutation:
  EnsureBubbleInstanceIdForMutationPort = async (...args) => {
    const {
      ensureBubbleInstanceIdForMutation: ensureBubbleInstanceIdForMutationDefault
    } = await loadBubbleIdentityDefaultsModule();
    return ensureBubbleInstanceIdForMutationDefault(...args);
  };
