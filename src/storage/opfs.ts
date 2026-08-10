/**
 * The store projects live in.
 *
 * Origin-private storage: a file system the browser keeps for this app alone. Every current browser
 * has it, which is why projects are kept here rather than in a folder the user picks — that needs
 * an API only Chromium has.
 *
 * The trade is that these files are the app's, not the user's: they are not in Documents, they are
 * not backed up, and clearing site data removes them. Export is what produces a file the user
 * keeps, and {@link requestPersistence} asks the browser not to reclaim the rest under pressure.
 */

/** Whether this browser can keep projects at all. */
function canStoreProjects(): boolean {
  return typeof navigator !== "undefined"
      && typeof navigator.storage?.getDirectory === "function";
}

function root(): Promise<FileSystemDirectoryHandle> {
  return navigator.storage.getDirectory();
}

/**
 * Asks the browser to keep this app's storage rather than reclaiming it.
 *
 * Answered by the browser on its own terms — granted outright, refused, or decided by how much the
 * user has used the app — so the answer is reported rather than relied on.
 */
async function requestPersistence(): Promise<boolean> {
  try {
    return await navigator.storage?.persist?.() ?? false;
  } catch {
    return false;
  }
}

/** The named directory inside another, created if it is not there yet. */
function directoryIn(parent: FileSystemDirectoryHandle, name: string) {
  return parent.getDirectoryHandle(name, {create: true});
}

/** The named file inside a directory, created empty if it is not there yet. */
function fileIn(parent: FileSystemDirectoryHandle, name: string) {
  return parent.getFileHandle(name, {create: true});
}

async function readText(handle: FileSystemFileHandle): Promise<string> {
  return (await handle.getFile()).text();
}

async function writeText(handle: FileSystemFileHandle, text: string) {
  const writable = await handle.createWritable();
  await writable.write(text);
  await writable.close();
}

/** Every directory directly inside this one, by name. */
async function subdirectories(parent: FileSystemDirectoryHandle): Promise<FileSystemDirectoryHandle[]> {
  const found: FileSystemDirectoryHandle[] = [];

  for await (const entry of parent.values()) {
    if (entry.kind === "directory") {
      found.push(entry as FileSystemDirectoryHandle);
    }
  }

  return found;
}

export {
  canStoreProjects,
  directoryIn,
  fileIn,
  readText,
  requestPersistence,
  root,
  subdirectories,
  writeText,
};
