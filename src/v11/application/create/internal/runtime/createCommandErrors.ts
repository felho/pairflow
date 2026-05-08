export function formatCreateError(message: string): string {
  return `${message} context: command_name=create.`;
}

export function formatCreateErrorWithReason(
  message: string,
  reasonCode: string
): string {
  return `${message} context: command_name=create reason_code=${reasonCode}.`;
}

export function toCreateCommandError(message: string): Error {
  return new Error(formatCreateError(message));
}

export function toCreateCommandReasonCodeError(
  message: string,
  reasonCode: string
): Error {
  return new Error(formatCreateErrorWithReason(message, reasonCode));
}
