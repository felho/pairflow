export interface SkillsInstallPathStatus {
  exists: boolean;
  type?: "directory" | "file" | "symlink" | "other";
  identity?: string;
}

export interface SkillsInstallFileSystem {
  pathStatus(path: string): Promise<SkillsInstallPathStatus>;
  realPathIfExists(path: string): Promise<string | null>;
  ensureDirectory(path: string): Promise<void>;
  removePath(path: string): Promise<void>;
  copyDirectory(source: string, destination: string): Promise<void>;
  createSymlink(target: string, linkPath: string): Promise<void>;
  replaceDirectoryFromSource(input: {
    source: string;
    destination: string;
    expectedDestination: SkillsInstallPathStatus;
  }): Promise<void>;
  replaceSymlink(input: {
    target: string;
    linkPath: string;
    expectedLinkPath: SkillsInstallPathStatus;
  }): Promise<void>;
}
