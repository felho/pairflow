const kickoffDefaultsPromise = import(
  "../../../core/bubble/kickoffDefaults.js"
).then(({ kickoffDefaults }) => kickoffDefaults);

export const kickoffDefaults = await kickoffDefaultsPromise;
