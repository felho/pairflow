interface ArchiveIndexErrorContext {
  archiveIndexPath?: string | undefined;
  archivePath?: string | undefined;
  bubbleId?: string | undefined;
  bubbleInstanceId?: string | undefined;
  entryIndex?: number | undefined;
  field?: string | undefined;
  lockPath?: string | undefined;
  reason?: string | undefined;
}

interface ArchiveIndexErrorOptions extends ErrorOptions {
  context?: ArchiveIndexErrorContext | undefined;
}

export class ArchiveIndexError extends Error {
  public readonly context?: ArchiveIndexErrorContext | undefined;

  public constructor(message: string, options?: ArchiveIndexErrorOptions) {
    super(message, options);
    this.name = "ArchiveIndexError";
    this.context = options?.context;
  }
}

export class ArchiveIndexLockError extends ArchiveIndexError {
  public constructor(message: string, options?: ArchiveIndexErrorOptions) {
    super(message, options);
    this.name = "ArchiveIndexLockError";
  }
}
