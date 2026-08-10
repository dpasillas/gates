/**
 * Names that have to survive being written to disk.
 *
 * A board is stored as a file named after it, so its name is bound by whatever the strictest file
 * system in play allows. The rules here are the union of the three: a project written on one
 * machine has to open on the others, so a name is refused everywhere if it would be refused
 * anywhere.
 */

/** Longest a single path component may be, in characters. */
const MAX_LENGTH = 255;

/**
 * Characters no name may contain.
 *
 * The separators are refused by every file system; the rest are Windows rules, several of which
 * carry meaning in a shell elsewhere anyway.
 */
const FORBIDDEN = /[<>:"/\\|?*]/g;

/** Names Windows reserves for devices, whatever extension is put after them. */
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

/** Why a name cannot be written to disk, if it cannot. */
interface FileNameCheck {
  readonly error?: string;
}

/** Whether a name holds a control character, which no file system accepts in one. */
function hasControlCharacter(name: string): boolean {
  return [...name].some(character => character.charCodeAt(0) < 0x20);
}

/** Whether a name can be a file's. */
function checkFileName(name: string): FileNameCheck {
  if (!name) {
    return {error: "A name is required."};
  }
  if (name !== name.trim()) {
    return {error: "A name cannot begin or end with a space."};
  }
  // Reset because the pattern is global, and a global pattern carries an index between calls.
  FORBIDDEN.lastIndex = 0;
  if (FORBIDDEN.test(name) || hasControlCharacter(name)) {
    return {error: 'A name cannot contain < > : " / \\ | ? *'};
  }
  // Checked ahead of the trailing dot below, which these would otherwise answer for.
  if (name === "." || name === "..") {
    return {error: "That name is reserved."};
  }
  // Windows drops a trailing dot silently rather than refusing it, which would leave the name on
  // disk different from the name shown.
  if (name.endsWith(".")) {
    return {error: "A name cannot end with a dot."};
  }
  if (RESERVED.test(name)) {
    return {error: `${name} is a reserved device name on Windows.`};
  }
  if (name.length > MAX_LENGTH) {
    return {error: `A name can be at most ${MAX_LENGTH} characters.`};
  }

  return {};
}

/**
 * The nearest legal file name to the one given.
 *
 * For names the user did not type as a file name — a project's title, say — where refusing is not
 * an option because something has to be written regardless.
 */
function sanitizeFileName(name: string, fallback: string = "untitled"): string {
  const cleaned = [...name]
      .filter(character => character.charCodeAt(0) >= 0x20)
      .join("")
      .replace(FORBIDDEN, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\.+$/, "")
      .trim()
      .slice(0, MAX_LENGTH)
      .trim();

  return checkFileName(cleaned).error ? fallback : cleaned;
}

export {checkFileName, sanitizeFileName, MAX_LENGTH};
export type {FileNameCheck};
