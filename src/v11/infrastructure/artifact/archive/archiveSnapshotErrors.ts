interface ArchiveSnapshotErrorContext {
  archivePath?: string | undefined;
  archiveRelativePath?: string | undefined;
  archiveRootPath?: string | undefined;
  bubbleDir?: string | undefined;
  bubbleId?: string | undefined;
  bubbleInstanceId?: string | undefined;
  field?: string | undefined;
  lockPath?: string | undefined;
  manifestPath?: string | undefined;
  reason?: string | undefined;
  required?: boolean | undefined;
  sourcePath?: string | undefined;
}

interface ArchiveSnapshotErrorOptions extends ErrorOptions {
  context?: ArchiveSnapshotErrorContext | undefined;
}

export class ArchiveSnapshotError extends Error {
  public readonly context?: ArchiveSnapshotErrorContext | undefined;

  public constructor(message: string, options?: ArchiveSnapshotErrorOptions) {
    super(message, options);
    this.name = "ArchiveSnapshotError";
    this.context = options?.context;
  }
}

export class ArchiveSnapshotLockError extends ArchiveSnapshotError {
  public constructor(message: string, options?: ArchiveSnapshotErrorOptions) {
    super(message, options);
    this.name = "ArchiveSnapshotLockError";
  }
}

export class ArchivePathCollisionError extends ArchiveSnapshotError {
  public constructor(message: string, options?: ArchiveSnapshotErrorOptions) {
    super(message, options);
    this.name = "ArchivePathCollisionError";
  }
}
