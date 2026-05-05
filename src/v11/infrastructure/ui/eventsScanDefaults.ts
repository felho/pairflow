const eventsScanDefaultsPromise = import(
  "../../shared/read-model/list/listReadModelApi.js"
).then(({ listBubbles }) => listBubbles);

export const listBubbles = await eventsScanDefaultsPromise;
