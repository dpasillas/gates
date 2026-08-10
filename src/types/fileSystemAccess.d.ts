/**
 * The part of the File System API that TypeScript's DOM library only declares under a lib this
 * project does not include.
 *
 * Iterating a directory is the one thing origin-private storage needs that is not already there.
 */

interface FileSystemDirectoryHandle {
  values(): AsyncIterableIterator<FileSystemFileHandle | FileSystemDirectoryHandle>;
}
