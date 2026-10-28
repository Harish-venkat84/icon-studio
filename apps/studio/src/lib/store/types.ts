export interface FileChange {
  path: string
  /** New file contents (text or binary), or null to delete the file. */
  content: string | Uint8Array | null
}

export interface RepoFile {
  path: string
  content: string
}

export interface IconRepository {
  readonly kind: 'fs' | 'github'
  /** Human readable location, shown in the studio header. */
  readonly location: string
  /** Text files directly inside `directory`; `include` limits which files are downloaded. */
  listFiles(directory: string, include?: (path: string) => boolean): Promise<RepoFile[]>
  readFile(path: string): Promise<string | null>
  readBinary(path: string): Promise<Uint8Array | null>
  /**
   * Applies all changes as one commit. `precondition` runs against the file
   * list the commit is based on, so checks like slug uniqueness hold even when
   * another commit lands in between.
   */
  commit(
    message: string,
    changes: FileChange[],
    precondition?: (paths: Set<string>) => void
  ): Promise<void>
  /** Files changed in `directories` since `ref`, or null when the ref does not exist or this is unsupported. */
  changesSince(ref: string, directories: string[]): Promise<RepoDiff | null>
  /** A text file as it was at commit `sha`, or null when it did not exist then. */
  readFileAt(sha: string, path: string): Promise<string | null>
}

export interface RepoDiff {
  /** Commit the changes are measured from (the merge base with `ref`). */
  base: string
  /** Commit the changes are measured to (the branch head). */
  head: string
  /** Changed paths; a rename lists both the old and the new path. */
  paths: string[]
}
