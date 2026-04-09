const listCommandDefaultsPromise = import(
  "../../../core/bubble/listCommandDefaults.js"
).then(({ listCommandDefaults }) => listCommandDefaults);

export const listCommandDefaults = await listCommandDefaultsPromise;
