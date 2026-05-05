const listReadModelDefaultsPromise = import(
  "../../../defaults/list/listCommandDefaults.js"
).then(({ listCommandDefaults }) => listCommandDefaults);

export const listReadModelDefaults = await listReadModelDefaultsPromise;
