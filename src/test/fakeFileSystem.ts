/**
 * A file system held in memory, standing in for the one the browser gives out handles to.
 *
 * The File System Access API does not exist under the test runner, and the parts of the app that
 * matter here — what gets written where, and whether it reads back — do not depend on the files
 * being real. Only the members the app actually calls are implemented.
 */

function missing(name: string): DOMException {
  return new DOMException(`${name} was not found.`, "NotFoundError");
}

class FakeFile {
  readonly kind = "file" as const;

  constructor(readonly name: string, public contents: string = "") {}

  async getFile(): Promise<File> {
    return new File([this.contents], this.name);
  }

  async createWritable() {
    let written = "";

    return {
      write: async (data: string) => {written += data},
      close: async () => {this.contents = written},
    };
  }

  async queryPermission() {
    return "granted" as PermissionState;
  }

  async requestPermission() {
    return "granted" as PermissionState;
  }
}

class FakeDirectory {
  readonly kind = "directory" as const;
  readonly entries = new Map<string, FakeFile | FakeDirectory>();

  constructor(readonly name: string = "") {}

  async getDirectoryHandle(name: string, options?: {create?: boolean}): Promise<FakeDirectory> {
    const found = this.entries.get(name);
    if (found instanceof FakeDirectory) {
      return found;
    }
    if (found || !options?.create) {
      throw missing(name);
    }

    const made = new FakeDirectory(name);
    this.entries.set(name, made);

    return made;
  }

  async getFileHandle(name: string, options?: {create?: boolean}): Promise<FakeFile> {
    const found = this.entries.get(name);
    if (found instanceof FakeFile) {
      return found;
    }
    if (found || !options?.create) {
      throw missing(name);
    }

    const made = new FakeFile(name);
    this.entries.set(name, made);

    return made;
  }

  async removeEntry(name: string) {
    this.entries.delete(name);
  }

  async* values(): AsyncGenerator<FakeFile | FakeDirectory> {
    for (const entry of [...this.entries.values()]) {
      yield entry;
    }
  }

  async queryPermission() {
    return "granted" as PermissionState;
  }

  async requestPermission() {
    return "granted" as PermissionState;
  }

  /** The contents of a file at a path within this directory, for asserting on what was written. */
  read(path: string): string | undefined {
    const parts = path.split("/");
    const name = parts.pop()!;

    let directory: FakeDirectory = this;
    for (const part of parts) {
      const next = directory.entries.get(part);
      if (!(next instanceof FakeDirectory)) {
        return undefined;
      }
      directory = next;
    }

    const file = directory.entries.get(name);

    return file instanceof FakeFile ? file.contents : undefined;
  }

  /** Every path in this directory, for asserting on what a save left behind. */
  paths(prefix: string = ""): string[] {
    return [...this.entries.values()].flatMap(entry => entry instanceof FakeDirectory
        ? entry.paths(`${prefix}${entry.name}/`)
        : [`${prefix}${entry.name}`]);
  }
}

/** The fake seen as the handle type the app expects. */
function asDirectoryHandle(directory: FakeDirectory): FileSystemDirectoryHandle {
  return directory as unknown as FileSystemDirectoryHandle;
}

export {asDirectoryHandle, FakeDirectory};
