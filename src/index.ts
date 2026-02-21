export const projectName = "pairflow";

export function healthcheck(): string {
  return `${projectName}:ok`;
}
