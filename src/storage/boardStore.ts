import {downloadBytes, uploadFile} from "./files";
import {loadBoard, parseBoardFile, serializeBoard} from "../logic/boardFile";
import {LogicBoard} from "../logic/LogicBoard";
import {snapshotPng} from "../util/boardSnapshot";
import {isPng, readChunk, withChunk, BOARD_CHUNK} from "../util/png";
import {sanitizeFileName} from "../util/fileName";

/**
 * A board on its own, outside a project.
 *
 * Exported as a picture of itself with its data carried inside: the file previews as the circuit it
 * holds wherever images preview, and opens as that circuit here. Since projects live in storage the
 * user cannot see, this is also how a board leaves the browser at all.
 */

/**
 * What an exported board is called.
 *
 * The kind is in the name as well as in the file, purely so that a folder of exports can be read at
 * a glance — nothing here relies on it, and a renamed file still opens.
 */
const BOARD_SUFFIX = ".gtsb.png";

/** What the file dialog offers when something exported is being brought back in. */
const IMPORT_ACCEPT = "image/png,.png,application/json,.json";

function boardText(board: LogicBoard): string {
  return `${JSON.stringify(serializeBoard(board), undefined, 2)}\n`;
}

/** The name an exported file is offered under. */
function exportFileName(board: LogicBoard): string {
  return `${sanitizeFileName(board.name, "board")}${BOARD_SUFFIX}`;
}

/**
 * Hands the user a picture of the board with the board inside it.
 *
 * Returns the name it was offered under. The browser decides where a download lands, so there is no
 * location to remember and nothing to save back to afterwards.
 */
async function exportBoard(board: LogicBoard): Promise<string> {
  const image = await snapshotPng(board);
  const data = new TextEncoder().encode(boardText(board));
  const name = exportFileName(board);

  downloadBytes(name, withChunk(image, BOARD_CHUNK, data), "image/png");

  return name;
}

/** What a file is carrying, whether it is a picture holding it or the plain data. */
function carriedText(bytes: Uint8Array): string {
  if (!isPng(bytes)) {
    return new TextDecoder().decode(bytes);
  }

  const carried = readChunk(bytes, BOARD_CHUNK);
  if (!carried) {
    throw new Error("This image does not have anything from Gates in it.");
  }

  return new TextDecoder().decode(carried);
}

/**
 * Reads a board out of a file the user chooses.
 *
 * Returns the board, or nothing if they changed their mind. A file that is not a board throws
 * rather than producing half of one.
 */
async function importBoard(): Promise<LogicBoard | undefined> {
  const picked = await uploadFile(IMPORT_ACCEPT);
  if (!picked) {
    return undefined;
  }

  const board = new LogicBoard();
  loadBoard(board, parseBoardFile(carriedText(picked.bytes)));

  return board;
}

export {boardText, carriedText, exportBoard, importBoard, IMPORT_ACCEPT};
