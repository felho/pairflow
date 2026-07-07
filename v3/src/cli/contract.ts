/**
 * The CLI output contract (packet ch6-P4a — the canonical matrices).
 *
 * Channel rule: stdout carries ONLY data documents — one JSON document
 * per verb (tail: NDJSON rows). Every failure is exactly ONE error
 * document on stderr plus the class exit code; on a tail failure the
 * rows already emitted stay parseable and stdout ends cleanly.
 *
 * Exit classes: 0 = success (the effect holds or already held —
 * committed / started / duplicate / read hit); 2 = usage/config
 * (argument, payload-JSON, cursor-domain, config resolution); 3 =
 * kernel-negative / not-found (stale / rejected protocol answers —
 * printed as DATA on stdout — and unknown instance / template);
 * 1 = integrity/internal (store open fail-closed, TailIntegrityError,
 * unexpected errors).
 */
export const EXIT = {
  ok: 0,
  internal: 1,
  usage: 2,
  notFound: 3,
} as const;

export type ErrorClass = "usage" | "not_found" | "internal";

/** The canonical error document (keyset-tested per exit class). */
export interface CliErrorDoc {
  readonly error: {
    readonly class: ErrorClass;
    readonly name: string;
    readonly message: string;
    readonly details?: Readonly<Record<string, unknown>>;
  };
}

export class CliError extends Error {
  readonly errorClass: ErrorClass;
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(
    errorClass: ErrorClass,
    name: string,
    message: string,
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = name;
    this.errorClass = errorClass;
    if (details !== undefined) {
      this.details = details;
    }
  }
}

export function exitCodeFor(errorClass: ErrorClass): number {
  switch (errorClass) {
    case "usage":
      return EXIT.usage;
    case "not_found":
      return EXIT.notFound;
    case "internal":
      return EXIT.internal;
  }
}

export function toErrorDoc(error: CliError): CliErrorDoc {
  return {
    error: {
      class: error.errorClass,
      name: error.name,
      message: error.message,
      ...(error.details !== undefined ? { details: error.details } : {}),
    },
  };
}
