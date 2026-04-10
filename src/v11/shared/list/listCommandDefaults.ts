const listCommandDefaultsPromise = import(
  "../../defaults/list/listCommandDefaults.js"
).then(({ listCommandDefaults }) => listCommandDefaults);

export const listCommandDefaults = await listCommandDefaultsPromise;
