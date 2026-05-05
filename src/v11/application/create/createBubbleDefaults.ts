import type * as CreateBubbleDefaultsModuleExports from "../../defaults/create/createBubbleDefaults.js";

type CreateBubbleDefaultsModule = typeof CreateBubbleDefaultsModuleExports;

let createBubbleDefaultsModulePromise:
  | Promise<CreateBubbleDefaultsModule>
  | undefined;

function getCreateBubbleDefaultsModulePath(): string {
  return ["..", "..", "defaults", "create", "createBubbleDefaults.js"].join("/");
}

async function loadCreateBubbleDefaultsModule():
  Promise<CreateBubbleDefaultsModule> {
  createBubbleDefaultsModulePromise ??=
    import(getCreateBubbleDefaultsModulePath()) as Promise<CreateBubbleDefaultsModule>;
  return createBubbleDefaultsModulePromise;
}

const { createBubbleDependencyDefaults } =
  await loadCreateBubbleDefaultsModule();

export const createBubbleDefaults = createBubbleDependencyDefaults;
