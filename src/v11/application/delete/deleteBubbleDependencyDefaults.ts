type DeleteBubbleDefaultsModule = typeof import(
  "../../defaults/delete/deleteBubbleDefaults.js"
);

let deleteBubbleDefaultsModulePromise:
  | Promise<DeleteBubbleDefaultsModule>
  | undefined;

function getDeleteBubbleDefaultsModulePath(): string {
  return ["..", "..", "defaults", "delete", "deleteBubbleDefaults.js"].join("/");
}

async function loadDeleteBubbleDefaultsModule():
  Promise<DeleteBubbleDefaultsModule> {
  deleteBubbleDefaultsModulePromise ??=
    import(getDeleteBubbleDefaultsModulePath()) as Promise<DeleteBubbleDefaultsModule>;
  return deleteBubbleDefaultsModulePromise;
}

const { deleteBubbleDependencyDefaults } =
  await loadDeleteBubbleDefaultsModule();

export { deleteBubbleDependencyDefaults };
