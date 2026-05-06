import type { RegisterRepoInRegistryPort } from "../../shared/ports/repoRegistry.js";

interface RepoRegistryDefaultsModule {
  registerRepoInRegistry: RegisterRepoInRegistryPort;
}

let repoRegistryDefaultsModulePromise:
  | Promise<RepoRegistryDefaultsModule>
  | undefined;

function getRepoRegistryDefaultsModulePath(): string {
  return "../../defaults/repoRegistry/repoRegistryDefaults.js";
}

async function loadRepoRegistryDefaultsModule():
  Promise<RepoRegistryDefaultsModule> {
  repoRegistryDefaultsModulePromise ??= import(
    getRepoRegistryDefaultsModulePath()
  ) as Promise<RepoRegistryDefaultsModule>;
  return repoRegistryDefaultsModulePromise;
}

export const registerRepoInRegistry:
  RegisterRepoInRegistryPort = async (...args) => {
    const { registerRepoInRegistry: registerRepoInRegistryDefault } =
      await loadRepoRegistryDefaultsModule();
    return registerRepoInRegistryDefault(...args);
  };
